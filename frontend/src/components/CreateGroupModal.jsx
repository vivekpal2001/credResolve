"use client"

import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import api from "../lib/api"
import LoadingSpinner from "./LoadingSpinner"

// ============================================================================
// CREATE GROUP MODAL COMPONENT
// ============================================================================

export default function CreateGroupModal({ isOpen, onClose }) {
  const [name, setName] = useState("")
  const [error, setError] = useState("")
  const queryClient = useQueryClient()

  const createGroupMutation = useMutation({
    mutationFn: async (groupData) => {
      const { data } = await api.post("/groups", groupData)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["groups"] })
      queryClient.invalidateQueries({ queryKey: ["user-balances"] })
      setName("")
      setError("")
      onClose()
    },
    onError: (err) => {
      setError(err.response?.data?.error || "Failed to create group")
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim()) {
      setError("Group name is required")
      return
    }
    createGroupMutation.mutate({ name })
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay">
      <div className="modal-content p-6 shadow-xl">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Create New Group</h2>
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-3 py-2 rounded mb-4 text-sm">{error}</div>
          )}
          <div className="mb-4">
            <label htmlFor="groupName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Group Name
            </label>
            <input
              id="groupName"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input w-full"
              placeholder="e.g., Weekend Trip, Roommates"
              disabled={createGroupMutation.isPending}
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Add Members
            </label>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              You can add members after creating the group using the "Add Member" button.
            </p>
          </div>
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={createGroupMutation.isPending}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={createGroupMutation.isPending}>
              {createGroupMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <LoadingSpinner size="small" className="border-white" />
                  Creating...
                </span>
              ) : (
                "Create Group"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
