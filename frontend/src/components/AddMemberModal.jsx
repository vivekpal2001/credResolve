"use client"

import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import api from "../lib/api"
import LoadingSpinner from "./LoadingSpinner"

// ============================================================================
// ADD MEMBER MODAL COMPONENT
// ============================================================================

export default function AddMemberModal({ isOpen, onClose, groupId }) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const queryClient = useQueryClient()

  const addMemberMutation = useMutation({
    mutationFn: async (memberData) => {
      const { data } = await api.post(`/groups/${groupId}/members`, memberData)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group", groupId] })
      setName("")
      setEmail("")
      setError("")
      onClose()
    },
    onError: (err) => {
      setError(err.response?.data?.error || "Failed to add member")
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name.trim() || !email.trim()) {
      setError("Name and email are required")
      return
    }
    addMemberMutation.mutate({ name, email })
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay">
      <div className="modal-content p-6 shadow-xl">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Add Member</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Add a member by name and email. If they're not registered, they'll be added as a guest.
        </p>
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-3 py-2 rounded mb-4 text-sm">{error}</div>
          )}
          <div className="space-y-4 mb-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Name
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input w-full"
                placeholder="John Doe"
                disabled={addMemberMutation.isPending}
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input w-full"
                placeholder="john@example.com"
                disabled={addMemberMutation.isPending}
              />
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={addMemberMutation.isPending}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={addMemberMutation.isPending}>
              {addMemberMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <LoadingSpinner size="small" className="border-white" />
                  Adding...
                </span>
              ) : (
                "Add Member"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
