const { PrismaClient } = require("@prisma/client")

const prisma = new PrismaClient()

const getUserBalances = async (userId) => {
  // Get all groups the user is part of
  const groups = await prisma.group.findMany({
    where: {
      members: {
        some: { userId: userId },
      },
    },
    include: {
      expenses: {
        include: {
          paidBy: {
            select: { id: true, name: true },
          },
          splits: {
            include: {
              user: {
                select: { id: true, name: true },
              },
            },
          },
        },
      },
      settlements: {
        where: { status: "COMPLETED" },
      },
      members: {
        include: {
          user: {
            select: { id: true, name: true, email: true, isGuest: true },
          },
        },
      },
    },
  })

  const userDebts = new Map() // userId -> amount (positive = they owe you, negative = you owe them)

  for (const group of groups) {
    // Calculate debts from expenses
    for (const expense of group.expenses) {
      const payerId = expense.paidById

      for (const split of expense.splits) {
        if (split.userId === payerId) continue // Skip if payer is also in the split

        if (payerId === userId) {
          // I paid, they owe me
          const currentDebt = userDebts.get(split.userId) || 0
          userDebts.set(split.userId, currentDebt + split.amount)
        } else if (split.userId === userId) {
          // They paid, I owe them
          const currentDebt = userDebts.get(payerId) || 0
          userDebts.set(payerId, currentDebt - split.amount)
        }
      }
    }

    // Subtract completed settlements
    for (const settlement of group.settlements) {
      if (settlement.fromUserId === userId) {
        // I paid someone - I owe them less (negative becomes more negative or positive becomes less positive)
        const currentDebt = userDebts.get(settlement.toUserId) || 0
        userDebts.set(settlement.toUserId, currentDebt - settlement.amount)
      } else if (settlement.toUserId === userId) {
        // Someone paid me - they owe me less (positive becomes less positive)
        const currentDebt = userDebts.get(settlement.fromUserId) || 0
        userDebts.set(settlement.fromUserId, currentDebt - settlement.amount)
      }
    }
  }

  // Build response
  const youOwe = []
  const youAreOwed = []
  let totalOwing = 0
  let totalOwed = 0

  // Get user info
  const userIds = Array.from(userDebts.keys())
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, name: true, email: true, isGuest: true },
  })

  const userMap = new Map(users.map((u) => [u.id, u]))

  for (const [otherUserId, amount] of userDebts.entries()) {
    if (Math.abs(amount) < 0.01) continue // Skip negligible amounts

    const user = userMap.get(otherUserId)
    if (!user) continue

    const roundedAmount = Math.round(Math.abs(amount) * 100) / 100

    if (amount < 0) {
      // I owe them
      youOwe.push({ user, amount: roundedAmount })
      totalOwing += roundedAmount
    } else {
      // They owe me
      youAreOwed.push({ user, amount: roundedAmount })
      totalOwed += roundedAmount
    }
  }

  return {
    youOwe,
    youAreOwed,
    totalOwing: Math.round(totalOwing * 100) / 100,
    totalOwed: Math.round(totalOwed * 100) / 100,
    netBalance: Math.round((totalOwed - totalOwing) * 100) / 100,
  }
}

const getGroupBalances = async (userId, groupId) => {
  // Verify user is a member of the group
  const isMember = await prisma.groupMember.findFirst({
    where: { groupId, userId },
  })

  if (!isMember) {
    throw new Error("Access denied: You are not a member of this group")
  }

  // Get group with expenses and settlements
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    include: {
      expenses: {
        include: {
          paidBy: {
            select: { id: true, name: true, email: true },
          },
          splits: {
            include: {
              user: {
                select: { id: true, name: true, email: true },
              },
            },
          },
        },
      },
      settlements: {
        where: { status: "COMPLETED" },
      },
      members: {
        include: {
          user: {
            select: { id: true, name: true, email: true, isGuest: true },
          },
        },
      },
    },
  })

  // Calculate all pairwise debts
  const debts = new Map() // "fromId:toId" -> amount

  for (const expense of group.expenses) {
    const payerId = expense.paidById

    for (const split of expense.splits) {
      if (split.userId === payerId) continue

      const key = `${split.userId}:${payerId}`
      debts.set(key, (debts.get(key) || 0) + split.amount)
    }
  }

  // Subtract completed settlements
  for (const settlement of group.settlements) {
    const key = `${settlement.fromUserId}:${settlement.toUserId}`
    debts.set(key, (debts.get(key) || 0) - settlement.amount)
  }

  // Simplify debts (net out bidirectional debts)
  const simplifiedDebts = []
  const processed = new Set()

  for (const [key, amount] of debts.entries()) {
    if (processed.has(key)) continue

    const [fromId, toId] = key.split(":")
    const reverseKey = `${toId}:${fromId}`
    const reverseAmount = debts.get(reverseKey) || 0

    processed.add(key)
    processed.add(reverseKey)

    const netAmount = amount - reverseAmount

    if (Math.abs(netAmount) < 0.01) continue

    if (netAmount > 0) {
      simplifiedDebts.push({
        from: group.members.find((m) => m.user.id === fromId)?.user,
        to: group.members.find((m) => m.user.id === toId)?.user,
        amount: Math.round(netAmount * 100) / 100,
      })
    } else {
      simplifiedDebts.push({
        from: group.members.find((m) => m.user.id === toId)?.user,
        to: group.members.find((m) => m.user.id === fromId)?.user,
        amount: Math.round(Math.abs(netAmount) * 100) / 100,
      })
    }
  }

  // Calculate user-specific balances
  const youOwe = []
  const youAreOwed = []

  for (const debt of simplifiedDebts) {
    if (debt.from?.id === userId) {
      youOwe.push({ user: debt.to, amount: debt.amount })
    } else if (debt.to?.id === userId) {
      youAreOwed.push({ user: debt.from, amount: debt.amount })
    }
  }

  return {
    groupId: group.id,
    groupName: group.name,
    youOwe,
    youAreOwed,
    allDebts: simplifiedDebts.filter((d) => d.from && d.to),
  }
}

module.exports = { getUserBalances, getGroupBalances }
