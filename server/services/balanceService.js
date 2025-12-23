const { PrismaClient } = require("@prisma/client")

const prisma = new PrismaClient()

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate net balance for each user based on expenses and settlements
 * @param {Array} expenses - List of expense records
 * @param {Array} settlements - List of completed settlements
 * @param {Array} members - List of group members
 * @returns {Map} Map of userId to net balance (positive = owed to them, negative = they owe)
 */
const calculateNetBalances = (expenses, settlements, members) => {
  const balances = new Map()

  // Initialize all members with 0
  members.forEach((member) => {
    balances.set(member.user.id, 0)
  })

  // Add expenses
  for (const expense of expenses) {
    const payerId = expense.paidById

    // Payer gets positive balance (they paid)
    balances.set(payerId, balances.get(payerId) + expense.amount)

    // Each split person gets negative balance (they owe)
    for (const split of expense.splits) {
      balances.set(split.userId, balances.get(split.userId) - split.amount)
    }
  }

  // Subtract completed settlements
  for (const settlement of settlements) {
    // Person who paid gets positive (reduced their debt or increased credit)
    balances.set(settlement.fromUserId, balances.get(settlement.fromUserId) + settlement.amount)
    // Person who received gets negative (reduced their credit or increased debt)
    balances.set(settlement.toUserId, balances.get(settlement.toUserId) - settlement.amount)
  }

  return balances
}

/**
 * Simplify debts using the Simple Net Balance Method (Greedy Algorithm)
 * Reduces the number of transactions by matching largest creditors with largest debtors
 * @param {Map} netBalances - Map of userId to net balance
 * @param {Map} userMap - Map of userId to user object
 * @returns {Array} Array of simplified transactions {from, to, amount}
 */
const simplifyDebts = (netBalances, userMap) => {
  // Separate creditors (positive balance) and debtors (negative balance)
  const creditors = []
  const debtors = []

  for (const [userId, balance] of netBalances.entries()) {
    if (balance > 0.01) {
      creditors.push({ userId, amount: balance })
    } else if (balance < -0.01) {
      debtors.push({ userId, amount: -balance }) // Store as positive
    }
  }

  // Sort both arrays in descending order (largest first)
  creditors.sort((a, b) => b.amount - a.amount)
  debtors.sort((a, b) => b.amount - a.amount)

  // Greedy matching algorithm
  const transactions = []
  let i = 0 // creditor index
  let j = 0 // debtor index

  while (i < creditors.length && j < debtors.length) {
    const creditor = creditors[i]
    const debtor = debtors[j]

    // Take minimum of what creditor is owed and what debtor owes
    const amount = Math.min(creditor.amount, debtor.amount)

    transactions.push({
      from: userMap.get(debtor.userId),
      to: userMap.get(creditor.userId),
      amount: Math.round(amount * 100) / 100,
    })

    // Update remaining amounts
    creditor.amount -= amount
    debtor.amount -= amount

    // Move to next if settled
    if (creditor.amount < 0.01) i++
    if (debtor.amount < 0.01) j++
  }

  return transactions
}

// ============================================================================
// PUBLIC API FUNCTIONS
// ============================================================================

/**
 * Get balance summary for a user across all their groups
 * @param {string} userId - The user's ID
 * @returns {Object} Balance summary with youOwe, youAreOwed, totals, and netBalance
 */
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

  // Combine all expenses and settlements across groups
  const allExpenses = []
  const allSettlements = []
  const allMembers = []
  const userIds = new Set()

  for (const group of groups) {
    allExpenses.push(...group.expenses)
    allSettlements.push(...group.settlements)
    group.members.forEach((member) => {
      if (!userIds.has(member.user.id)) {
        allMembers.push(member)
        userIds.add(member.user.id)
      }
    })
  }

  // Calculate net balances
  const netBalances = calculateNetBalances(allExpenses, allSettlements, allMembers)

  // Create user map
  const userMap = new Map(allMembers.map((m) => [m.user.id, m.user]))

  // Simplify debts using net balance method
  const simplifiedDebts = simplifyDebts(netBalances, userMap)

  // Build response for current user
  const youOwe = []
  const youAreOwed = []
  let totalOwing = 0
  let totalOwed = 0

  for (const debt of simplifiedDebts) {
    if (debt.from.id === userId) {
      youOwe.push({ user: debt.to, amount: debt.amount })
      totalOwing += debt.amount
    } else if (debt.to.id === userId) {
      youAreOwed.push({ user: debt.from, amount: debt.amount })
      totalOwed += debt.amount
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

/**
 * Get balance details for a specific group
 * @param {string} userId - The requesting user's ID
 * @param {string} groupId - The group ID
 * @returns {Object} Group balance details with youOwe, youAreOwed, and allDebts
 */
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

  // Calculate net balances using the new method
  const netBalances = calculateNetBalances(group.expenses, group.settlements, group.members)

  // Create user map
  const userMap = new Map(group.members.map((m) => [m.user.id, m.user]))

  // Simplify debts using net balance method
  const simplifiedDebts = simplifyDebts(netBalances, userMap)

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
