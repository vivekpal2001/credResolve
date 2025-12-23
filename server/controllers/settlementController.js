const settlementService = require("../services/settlementService")

const createSettlement = async (req, res) => {
  try {
    const { fromUserId, toUserId, groupId, amount, method, note } = req.body

    if (!fromUserId || !toUserId || !groupId || !amount) {
      return res.status(400).json({ error: "fromUserId, toUserId, groupId, and amount are required" })
    }

    const settlement = await settlementService.createSettlement(
      fromUserId,
      toUserId,
      groupId,
      amount,
      method || "CASH",
      note,
    )
    res.status(201).json(settlement)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}

const confirmSettlement = async (req, res) => {
  try {
    const { settlementId } = req.params

    const settlement = await settlementService.confirmSettlement(settlementId, req.userId)
    res.json(settlement)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}

const getGroupSettlements = async (req, res) => {
  try {
    const { groupId } = req.params
    const page = parseInt(req.query.page)
    const limit = parseInt(req.query.limit)

    const result = await settlementService.getGroupSettlements(req.userId, groupId, page, limit)
    res.json(result)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}

const getUserPendingSettlements = async (req, res) => {
  try {
    const settlements = await settlementService.getUserPendingSettlements(req.userId)
    res.json(settlements)
  } catch (error) {
    res.status(400).json({ error: error.message })
  }
}

module.exports = {
  createSettlement,
  confirmSettlement,
  getGroupSettlements,
  getUserPendingSettlements,
}
