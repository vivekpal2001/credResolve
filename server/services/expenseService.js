const { PrismaClient } = require("@prisma/client")

const prisma = new PrismaClient()

const createExpense = async (paidById, description, amount, groupId, splitType, splits) => {
  // Verify user is a member of the group
  const isMember = await prisma.groupMember.findFirst({
    where: {
      groupId: groupId,
      userId: paidById,
    },
  })

  if (!isMember) {
    throw new Error("Access denied: You are not a member of this group")
  }

  // Get all group members
  const groupMembers = await prisma.groupMember.findMany({
    where: { groupId: groupId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  })

  // Convert splits to exact amounts
  const exactSplits = calculateExactSplits(amount, splitType, splits, groupMembers)

  // Validate total splits equal expense amount (allow small floating point differences)
  const totalSplits = exactSplits.reduce((sum, split) => sum + split.amount, 0)
  
  if (Math.abs(totalSplits - amount) > 0.02) {
    throw new Error(`Invalid split: Total splits ($${totalSplits.toFixed(2)}) must equal expense amount ($${amount.toFixed(2)})`)
  }

  // Create expense with splits in a transaction
  const expense = await prisma.$transaction(async (tx) => {
    const newExpense = await tx.expense.create({
      data: {
        description,
        amount,
        groupId,
        paidById,
      },
    })

    await tx.expenseSplit.createMany({
      data: exactSplits.map((split) => ({
        expenseId: newExpense.id,
        userId: split.userId,
        amount: split.amount,
      })),
    })

    return await tx.expense.findUnique({
      where: { id: newExpense.id },
      include: {
        paidBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        splits: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    })
  })

  return expense
}

const calculateExactSplits = (totalAmount, splitType, splits, groupMembers) => {
  switch (splitType) {
    case "EQUAL": {
      // Equal split among all specified users
      const userIds = splits.map((s) => s.userId)
      const amountPerPerson = totalAmount / userIds.length
      const roundedAmount = Number.parseFloat(amountPerPerson.toFixed(2))

      const result = userIds.map((userId) => ({
        userId,
        amount: roundedAmount,
      }))

      // Adjust last split to account for rounding errors
      const totalSplits = roundedAmount * userIds.length
      const difference = totalAmount - totalSplits
      if (Math.abs(difference) > 0.001) {
        result[result.length - 1].amount = Number.parseFloat((roundedAmount + difference).toFixed(2))
      }

      return result
    }

    case "EXACT": {
      // Exact amounts specified for each user
      return splits.map((split) => ({
        userId: split.userId,
        amount: Number.parseFloat(split.amount),
      }))
    }

    case "PERCENTAGE": {
      // Percentage-based split
      const totalPercentage = splits.reduce((sum, s) => sum + s.percentage, 0)

      if (Math.abs(totalPercentage - 100) > 0.01) {
        throw new Error("Invalid split: Percentages must sum to 100")
      }

      const result = splits.map((split) => ({
        userId: split.userId,
        amount: Number.parseFloat(((totalAmount * split.percentage) / 100).toFixed(2)),
      }))

      // Adjust last split to account for rounding errors
      const totalSplits = result.reduce((sum, s) => sum + s.amount, 0)
      const difference = totalAmount - totalSplits
      if (Math.abs(difference) > 0.001) {
        result[result.length - 1].amount = Number.parseFloat((result[result.length - 1].amount + difference).toFixed(2))
      }

      return result
    }

    default:
      throw new Error("Invalid split type")
  }
}

const getGroupExpenses = async (userId, groupId) => {
  // Verify user is a member of the group
  const isMember = await prisma.groupMember.findFirst({
    where: {
      groupId: groupId,
      userId: userId,
    },
  })

  if (!isMember) {
    throw new Error("Access denied: You are not a member of this group")
  }

  const expenses = await prisma.expense.findMany({
    where: { groupId: groupId },
    include: {
      paidBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      splits: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  })

  return expenses
}

const deleteExpense = async (userId, expenseId) => {
  // Get expense with group info
  const expense = await prisma.expense.findUnique({
    where: { id: expenseId },
    include: {
      group: {
        include: {
          members: true,
        },
      },
    },
  })

  if (!expense) {
    throw new Error("Expense not found")
  }

  // Check if user is the one who paid (creator of expense)
  if (expense.paidById !== userId) {
    throw new Error("Only the person who created this expense can delete it")
  }

  // Check if user is still a member of the group
  const isMember = expense.group.members.some((m) => m.userId === userId)
  if (!isMember) {
    throw new Error("You are no longer a member of this group")
  }

  // Delete expense (cascade will delete splits automatically)
  await prisma.expense.delete({
    where: { id: expenseId },
  })

  return {
    message: "Expense deleted successfully",
    groupId: expense.groupId,
  }
}

module.exports = { createExpense, getGroupExpenses, deleteExpense }
