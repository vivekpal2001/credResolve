const { PrismaClient } = require("@prisma/client")
const bcrypt = require("bcryptjs")

const prisma = new PrismaClient()

const getUserGroups = async (userId) => {
  const groups = await prisma.group.findMany({
    where: {
      members: {
        some: {
          userId: userId,
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
      _count: {
        select: {
          expenses: true,
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  })

  return groups
}

const createGroup = async (creatorUserId, name) => {
  const group = await prisma.group.create({
    data: {
      name,
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

const getGroupDetails = async (userId, groupId) => {
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
      expenses: {
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
      },
      settlements: {
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
      },
    },
  })

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

module.exports = { getUserGroups, createGroup, getGroupDetails, addMember }
