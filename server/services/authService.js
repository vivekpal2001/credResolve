const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const { PrismaClient } = require("@prisma/client")
const { JWT_SECRET } = require("../middleware/auth")

const prisma = new PrismaClient()

const register = async (email, name, password) => {
  const existingUser = await prisma.user.findUnique({ where: { email } })

  if (existingUser) {
    throw new Error("User already exists")
  }

  const hashedPassword = await bcrypt.hash(password, 10)

  const user = await prisma.user.create({
    data: {
      email,
      name,
      password: hashedPassword,
    },
  })

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" })

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  }
}

const login = async (email, password) => {
  const user = await prisma.user.findUnique({ where: { email } })

  if (!user) {
    throw new Error("Invalid credentials")
  }

  const isValidPassword = await bcrypt.compare(password, user.password)

  if (!isValidPassword) {
    throw new Error("Invalid credentials")
  }

  const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "7d" })

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  }
}

const getUserById = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      isGuest: true,
    },
  })

  if (!user) {
    throw new Error("User not found")
  }

  return user
}

module.exports = { register, login, getUserById }
