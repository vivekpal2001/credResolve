const expenseService = require("../services/expenseService")

const createExpense = async (req, res) => {
  try {
    const { description, amount, groupId, splitType, splits } = req.body

    if (!description || !amount || !groupId || !splitType || !splits) {
      return res.status(400).json({ error: "All fields are required" })
    }

    if (amount <= 0) {
      return res.status(400).json({ error: "Amount must be positive" })
    }

    const expense = await expenseService.createExpense(req.userId, description, amount, groupId, splitType, splits)

    res.status(201).json(expense)
  } catch (error) {
    if (error.message.includes("not found") || error.message.includes("denied")) {
      return res.status(404).json({ error: error.message })
    }
    if (error.message.includes("Invalid")) {
      return res.status(400).json({ error: error.message })
    }
    res.status(500).json({ error: "Failed to create expense" })
  }
}

const getGroupExpenses = async (req, res) => {
  try {
    const { groupId } = req.params
    const expenses = await expenseService.getGroupExpenses(req.userId, groupId)
    res.json(expenses)
  } catch (error) {
    if (error.message.includes("not found") || error.message.includes("denied")) {
      return res.status(404).json({ error: error.message })
    }
    res.status(500).json({ error: "Failed to fetch expenses" })
  }
}

module.exports = { createExpense, getGroupExpenses }
