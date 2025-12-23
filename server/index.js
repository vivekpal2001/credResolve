const express = require("express")
const cors = require("cors")
require("dotenv").config()

const authRoutes = require("./routes/auth")
const groupRoutes = require("./routes/groups")
const expenseRoutes = require("./routes/expenses")
const balanceRoutes = require("./routes/balances")
const settlementRoutes = require("./routes/settlements")

const app = express()

app.use(cors())
app.use(express.json())

// Routes
app.use("/auth", authRoutes)
app.use("/groups", groupRoutes)
app.use("/expenses", expenseRoutes)
app.use("/balances", balanceRoutes)
app.use("/settlements", settlementRoutes)

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok" })
})

const PORT = process.env.PORT || 3000

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
