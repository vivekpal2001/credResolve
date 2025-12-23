const express = require("express")
const router = express.Router()
const { authMiddleware } = require("../middleware/auth")
const groupController = require("../controllers/groupController")

router.use(authMiddleware)

router.get("/", groupController.getUserGroups)
router.post("/", groupController.createGroup)
router.get("/:groupId", groupController.getGroupDetails)
router.post("/:groupId/members", groupController.addMember)
router.delete("/:groupId", groupController.deleteGroup)
router.delete("/:groupId/members/:memberId", groupController.removeMember)

module.exports = router
