const groupService = require("../services/groupService")

const getUserGroups = async (req, res) => {
  try {
    const groups = await groupService.getUserGroups(req.userId)
    res.json(groups)
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch groups" })
  }
}

const createGroup = async (req, res) => {
  try {
    const { name } = req.body

    if (!name) {
      return res.status(400).json({ error: "Group name is required" })
    }

    const group = await groupService.createGroup(req.userId, name)
    res.status(201).json(group)
  } catch (error) {
    if (error.message.includes("not found")) {
      return res.status(404).json({ error: error.message })
    }
    res.status(500).json({ error: "Failed to create group" })
  }
}

const getGroupDetails = async (req, res) => {
  try {
    const { groupId } = req.params
    const group = await groupService.getGroupDetails(req.userId, groupId)
    res.json(group)
  } catch (error) {
    if (error.message === "Group not found or access denied") {
      return res.status(404).json({ error: error.message })
    }
    res.status(500).json({ error: "Failed to fetch group details" })
  }
}

const addMember = async (req, res) => {
  try {
    const { groupId } = req.params
    const { name, email } = req.body

    if (!email) {
      return res.status(400).json({ error: "Email is required" })
    }

    if (!name) {
      return res.status(400).json({ error: "Name is required" })
    }

    const member = await groupService.addMember(req.userId, groupId, name, email)
    res.status(201).json(member)
  } catch (error) {
    if (error.message.includes("not found") || error.message.includes("denied")) {
      return res.status(404).json({ error: error.message })
    }
    if (error.message.includes("already")) {
      return res.status(400).json({ error: error.message })
    }
    res.status(500).json({ error: "Failed to add member" })
  }
}

module.exports = { getUserGroups, createGroup, getGroupDetails, addMember }
