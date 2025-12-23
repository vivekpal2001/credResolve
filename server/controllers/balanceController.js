const balanceService = require("../services/balanceService")

const getUserBalances = async (req, res) => {
  try {
    const balances = await balanceService.getUserBalances(req.userId)
    res.json(balances)
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch user balances" })
  }
}

const getGroupBalances = async (req, res) => {
  try {
    const { groupId } = req.params
    const balances = await balanceService.getGroupBalances(req.userId, groupId)
    res.json(balances)
  } catch (error) {
    if (error.message.includes("not found") || error.message.includes("denied")) {
      return res.status(404).json({ error: error.message })
    }
    res.status(500).json({ error: "Failed to fetch group balances" })
  }
}

module.exports = { getUserBalances, getGroupBalances }
