const { PrismaClient } = require("@prisma/client")

const prisma = new PrismaClient()

// Create a new settlement
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

// Confirm a cash settlement (mark as paid)
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

// Get settlements for a group
const getGroupSettlements = async (userId, groupId) => {
  // Verify user is a member of the group
  const isMember = await prisma.groupMember.findFirst({
    where: { groupId, userId },
  })

  if (!isMember) {
    throw new Error("Access denied: You are not a member of this group")
  }

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
