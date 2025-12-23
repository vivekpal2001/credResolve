const { PrismaClient } = require("@prisma/client")
const bcrypt = require("bcryptjs")

const prisma = new PrismaClient()

// ============================================================================
// PUBLIC API FUNCTIONS
// ============================================================================

/**
 * Get all groups for a user
 * @param {string} userId - User ID
 * @param {number} page - Page number (optional, default 1)
 * @param {number} limit - Items per page (optional, default 10)
 * @returns {Object} Object containing groups array, pagination info, and total count
 */
const getUserGroups = async (userId, page = 1, limit = 10) => {
  const skip = (page - 1) * limit

  const [groups, totalCount] = await Promise.all([
    prisma.group.findMany({
      where: {
        members: {
          some: {
            userId: userId,
          },
        },
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
          },
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                isGuest: true,
              },
            },
          },
        },
        _count: {
          select: {
            expenses: true,
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
      skip,
      take: limit,
    }),
    prisma.group.count({
      where: {
        members: {
          some: {
            userId: userId,
          },
        },
      },
    }),
  ])

  return {
    groups,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(totalCount / limit),
      totalCount,
      limit,
    },
  }
}

/**
 * Create a new group
 * @param {string} creatorUserId - ID of user creating the group
 * @param {string} name - Group name
 * @returns {Object} Created group
 */
const createGroup = async (creatorUserId, name) => {
  const group = await prisma.group.create({
    data: {
      name,
      creatorId: creatorUserId,
      members: {
        create: {
          userId: creatorUserId,
        },
      },
    },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              isGuest: true,
            },
          },
        },
      },
    },
  })

  return group
}

/**
 * Get detailed information about a specific group
 * @param {string} userId - Requesting user ID
 * @param {string} groupId - Group ID
 * @param {number} expensePage - Page number for expenses (optional)
 * @param {number} expenseLimit - Items per page for expenses (optional)
 * @param {number} settlementPage - Page number for settlements (optional)
 * @param {number} settlementLimit - Items per page for settlements (optional)
 * @returns {Object} Group details with members, paginated expenses, and paginated settlements
 */
const getGroupDetails = async (userId, groupId, expensePage, expenseLimit, settlementPage, settlementLimit) => {
  // Check if user has access to the group
  const group = await prisma.group.findFirst({
    where: {
      id: groupId,
      members: {
        some: {
          userId: userId,
        },
      },
    },
    include: {
      creator: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      members: {
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              isGuest: true,
            },
          },
        },
      },
    },
  })

  if (!group) {
    throw new Error("Group not found or access denied")
  }

  // If pagination params provided, fetch paginated data
  if (expensePage && expenseLimit) {
    const expenseSkip = (expensePage - 1) * expenseLimit
    const [expenses, expenseCount] = await Promise.all([
      prisma.expense.findMany({
        where: { groupId },
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
        skip: expenseSkip,
        take: expenseLimit,
      }),
      prisma.expense.count({
        where: { groupId },
      }),
    ])

    group.expenses = expenses
    group.expensePagination = {
      currentPage: expensePage,
      totalPages: Math.ceil(expenseCount / expenseLimit),
      totalCount: expenseCount,
      limit: expenseLimit,
    }
  } else {
    // Fetch all expenses (existing behavior)
    group.expenses = await prisma.expense.findMany({
      where: { groupId },
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
  }

  if (settlementPage && settlementLimit) {
    const settlementSkip = (settlementPage - 1) * settlementLimit
    const [settlements, settlementCount] = await Promise.all([
      prisma.settlement.findMany({
        where: { groupId },
        include: {
          fromUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          toUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: settlementSkip,
        take: settlementLimit,
      }),
      prisma.settlement.count({
        where: { groupId },
      }),
    ])

    group.settlements = settlements
    group.settlementPagination = {
      currentPage: settlementPage,
      totalPages: Math.ceil(settlementCount / settlementLimit),
      totalCount: settlementCount,
      limit: settlementLimit,
    }
  } else {
    // Fetch all settlements (existing behavior)
    group.settlements = await prisma.settlement.findMany({
      where: { groupId },
      include: {
        fromUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        toUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    })
  }

  if (!group) {
    throw new Error("Group not found or access denied")
  }

  return group
}

const addMember = async (requestingUserId, groupId, memberName, memberEmail) => {
  // Check if requesting user is a member of the group
  const isMember = await prisma.groupMember.findFirst({
    where: {
      groupId: groupId,
      userId: requestingUserId,
    },
  })

  if (!isMember) {
    throw new Error("Access denied: You are not a member of this group")
  }

  // Check if user exists
  let user = await prisma.user.findUnique({
    where: { email: memberEmail },
  })

  // If user doesn't exist, create a guest user
  if (!user) {
    const randomPassword = Math.random().toString(36).slice(-8)
    const hashedPassword = await bcrypt.hash(randomPassword, 10)

    user = await prisma.user.create({
      data: {
        email: memberEmail,
        name: memberName,
        password: hashedPassword,
        isGuest: true,
      },
    })
  }

  // Check if user is already a member
  const existingMember = await prisma.groupMember.findUnique({
    where: {
      userId_groupId: {
        userId: user.id,
        groupId: groupId,
      },
    },
  })

  if (existingMember) {
    throw new Error("User is already a member of this group")
  }

  // Add member
  const newMember = await prisma.groupMember.create({
    data: {
      groupId: groupId,
      userId: user.id,
    },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          isGuest: true,
        },
      },
    },
  })

  return newMember
}

const deleteGroup = async (userId, groupId) => {
  // Get group with creator info
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { 
      creatorId: true,
      members: true
    },
  })

  if (!group) {
    throw new Error("Group not found")
  }

  // Check if user is a member
  const isMember = group.members.some(m => m.userId === userId)
  if (!isMember) {
    throw new Error("Access denied: You are not a member of this group")
  }

  // Only creator can delete the group
  if (group.creatorId !== userId) {
    throw new Error("Only the group creator can delete this group")
  }

  // Delete the group (cascade will handle expenses, splits, settlements, members)
  await prisma.group.delete({
    where: { id: groupId },
  })

  return { message: "Group deleted successfully" }
}

const removeMember = async (requestingUserId, groupId, memberIdToRemove) => {
  // Get group with creator info
  const group = await prisma.group.findUnique({
    where: { id: groupId },
    select: { 
      creatorId: true,
      members: true
    },
  })

  if (!group) {
    throw new Error("Group not found")
  }

  // Check if requesting user is a member
  const isRequesterMember = group.members.some(m => m.userId === requestingUserId)
  if (!isRequesterMember) {
    throw new Error("Access denied: You are not a member of this group")
  }

  // Check if member to remove exists in group
  const memberToRemove = group.members.find(m => m.userId === memberIdToRemove)
  if (!memberToRemove) {
    throw new Error("Member not found in this group")
  }

  // Check if this is the last member
  if (group.members.length === 1) {
    throw new Error("Cannot remove the last member. Delete the group instead.")
  }

  // Case 1: User is removing themselves (leaving the group)
  if (requestingUserId === memberIdToRemove) {
    // If they're the creator, they need to transfer ownership or delete group
    if (group.creatorId === requestingUserId) {
      throw new Error(
        "As the group creator, please delete the group or have another member create a new group before leaving."
      )
    }
    // Regular member can leave if no outstanding balance
    // Continue to balance check below
  } 
  // Case 2: User is removing someone else
  else {
    // Only creator can remove other members
    if (group.creatorId !== requestingUserId) {
      throw new Error("Only the group creator can remove other members")
    }
  }

  // Check if member has any unsettled balances
  const expenses = await prisma.expense.findMany({
    where: { groupId: groupId },
    include: {
      splits: true,
    },
  })

  const settlements = await prisma.settlement.findMany({
    where: {
      groupId: groupId,
      status: "COMPLETED",
    },
  })

  // Calculate if member has outstanding balance
  let memberBalance = 0

  for (const expense of expenses) {
    if (expense.paidById === memberIdToRemove) {
      // They paid, others owe them
      for (const split of expense.splits) {
        if (split.userId !== memberIdToRemove) {
          memberBalance += split.amount
        }
      }
    } else {
      // Check if they owe for this expense
      const theirSplit = expense.splits.find((s) => s.userId === memberIdToRemove)
      if (theirSplit) {
        memberBalance -= theirSplit.amount
      }
    }
  }

  // Subtract settlements
  for (const settlement of settlements) {
    if (settlement.fromUserId === memberIdToRemove) {
      memberBalance += settlement.amount
    } else if (settlement.toUserId === memberIdToRemove) {
      memberBalance -= settlement.amount
    }
  }

  if (Math.abs(memberBalance) > 0.01) {
    throw new Error(
      `Cannot remove member with unsettled balance of $${Math.abs(memberBalance).toFixed(2)}. Please settle up first.`
    )
  }

  // Remove member and all their expense splits
  await prisma.$transaction(async (tx) => {
    // Delete their expense splits
    await tx.expenseSplit.deleteMany({
      where: {
        userId: memberIdToRemove,
        expense: {
          groupId: groupId,
        },
      },
    })

    // Delete expenses where they were the only one (paid and split for themselves)
    const expensesToCheck = await tx.expense.findMany({
      where: {
        groupId: groupId,
        paidById: memberIdToRemove,
      },
      include: {
        splits: true,
      },
    })

    for (const expense of expensesToCheck) {
      if (expense.splits.length === 0) {
        await tx.expense.delete({
          where: { id: expense.id },
        })
      }
    }

    // Remove member from group
    await tx.groupMember.delete({
      where: {
        userId_groupId: {
          userId: memberIdToRemove,
          groupId: groupId,
        },
      },
    })
  })

  return { message: "Member removed successfully" }
}

module.exports = { getUserGroups, createGroup, getGroupDetails, addMember, deleteGroup, removeMember }
