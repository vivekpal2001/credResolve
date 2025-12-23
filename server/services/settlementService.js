const { PrismaClient } = require("@prisma/client")

const prisma = new PrismaClient()

// ============================================================================
// PUBLIC API FUNCTIONS
// ============================================================================

/**
 * Create a new settlement between two users
 * @param {string} fromUserId - ID of user who is paying
 * @param {string} toUserId - ID of user receiving payment
 * @param {string} groupId - Group ID
 * @param {number} amount - Settlement amount
 * @param {string} method - Payment method (CASH, ONLINE)
 * @param {string} note - Optional note
 * @returns {Object} Created settlement
 */
const createSettlement = async (fromUserId, toUserId, groupId, amount, method, note) => {
  // Verify both users are members of the group
  const fromMember = await prisma.groupMember.findFirst({
    where: { groupId, userId: fromUserId },
  })

  const toMember = await prisma.groupMember.findFirst({
    where: { groupId, userId: toUserId },
  })

  if (!fromMember || !toMember) {
    throw new Error("Both users must be members of the group")
  }

  const settlement = await prisma.settlement.create({
    data: {
      groupId,
      fromUserId,
      toUserId,
      amount,
      method,
      note,
      status: "COMPLETED", // All settlements are marked as completed immediately
    },
    include: {
      fromUser: {
        select: { id: true, name: true, email: true },
      },
      toUser: {
        select: { id: true, name: true, email: true },
      },
    },
  })

  return settlement
}

/**
 * Confirm a settlement (legacy - settlements are now auto-confirmed)
 * @param {string} settlementId - Settlement ID
 * @param {string} userId - User ID confirming
 * @returns {Object} Updated settlement
 */
const confirmSettlement = async (settlementId, userId) => {
  const settlement = await prisma.settlement.findUnique({
    where: { id: settlementId },
    include: {
      fromUser: true,
      toUser: true,
    },
  })

  if (!settlement) {
    throw new Error("Settlement not found")
  }

  // Only the receiver can confirm the settlement
  if (settlement.toUserId !== userId) {
    throw new Error("Only the receiver can confirm the settlement")
  }

  const updatedSettlement = await prisma.settlement.update({
    where: { id: settlementId },
    data: { status: "COMPLETED" },
    include: {
      fromUser: {
        select: { id: true, name: true, email: true },
      },
      toUser: {
        select: { id: true, name: true, email: true },
      },
    },
  })

  return updatedSettlement
}

// Get settlements for a group with optional pagination
const getGroupSettlements = async (userId, groupId, page, limit) => {
  // Verify user is a member of the group
  const isMember = await prisma.groupMember.findFirst({
    where: { groupId, userId },
  })

  if (!isMember) {
    throw new Error("Access denied: You are not a member of this group")
  }

  // If pagination params provided
  if (page && limit) {
    const skip = (page - 1) * limit
    const [settlements, totalCount] = await Promise.all([
      prisma.settlement.findMany({
        where: { groupId },
        include: {
          fromUser: {
            select: { id: true, name: true, email: true },
          },
          toUser: {
            select: { id: true, name: true, email: true },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.settlement.count({
        where: { groupId },
      }),
    ])

    return {
      settlements,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalCount / limit),
        totalCount,
        limit,
      },
    }
  }

  // Return all settlements (existing behavior)
  const settlements = await prisma.settlement.findMany({
    where: { groupId },
    include: {
      fromUser: {
        select: { id: true, name: true, email: true },
      },
      toUser: {
        select: { id: true, name: true, email: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return settlements
}

// Get user's pending settlements
const getUserPendingSettlements = async (userId) => {
  const settlements = await prisma.settlement.findMany({
    where: {
      OR: [{ fromUserId: userId }, { toUserId: userId }],
      status: { in: ["PENDING", "PENDING_ONLINE"] },
    },
    include: {
      fromUser: {
        select: { id: true, name: true, email: true },
      },
      toUser: {
        select: { id: true, name: true, email: true },
      },
      group: {
        select: { id: true, name: true },
      },
    },
    orderBy: { createdAt: "desc" },
  })

  return settlements
}

module.exports = {
  createSettlement,
  confirmSettlement,
  getGroupSettlements,
  getUserPendingSettlements,
}
