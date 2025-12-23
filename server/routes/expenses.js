const express = require("express")
const router = express.Router()
const { authMiddleware } = require("../middleware/auth")
const expenseController = require("../controllers/expenseController")

router.use(authMiddleware)

router.post("/", expenseController.createExpense)
router.get("/group/:groupId", expenseController.getGroupExpenses)

module.exports = router
