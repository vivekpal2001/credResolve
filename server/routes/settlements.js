const express = require("express")
const router = express.Router()
const { authMiddleware } = require("../middleware/auth")
const settlementController = require("../controllers/settlementController")

router.use(authMiddleware)

router.post("/", settlementController.createSettlement)
router.get("/pending", settlementController.getUserPendingSettlements)
router.get("/group/:groupId", settlementController.getGroupSettlements)
router.post("/:settlementId/confirm", settlementController.confirmSettlement)

module.exports = router
