const express = require("express")
const router = express.Router()
const { authMiddleware } = require("../middleware/auth")
const balanceController = require("../controllers/balanceController")

router.use(authMiddleware)

router.get("/user", balanceController.getUserBalances)
router.get("/group/:groupId", balanceController.getGroupBalances)

module.exports = router
