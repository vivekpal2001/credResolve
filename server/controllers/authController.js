const authService = require("../services/authService")

const register = async (req, res) => {
  try {
    const { email, name, password } = req.body

    if (!email || !name || !password) {
      return res.status(400).json({ error: "All fields are required" })
    }

    const result = await authService.register(email, name, password)
    res.status(201).json(result)
  } catch (error) {
    if (error.message === "User already exists") {
      return res.status(400).json({ error: error.message })
    }
    res.status(500).json({ error: "Registration failed" })
  }
}

const login = async (req, res) => {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" })
    }

    const result = await authService.login(email, password)
    res.json(result)
  } catch (error) {
    if (error.message === "Invalid credentials") {
      return res.status(401).json({ error: error.message })
    }
    res.status(500).json({ error: "Login failed" })
  }
}

const getCurrentUser = async (req, res) => {
  try {
    const user = await authService.getUserById(req.userId)
    res.json(user)
  } catch (error) {
    res.status(404).json({ error: "User not found" })
  }
}

module.exports = { register, login, getCurrentUser }
