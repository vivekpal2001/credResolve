"use client"

import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import api from "../lib/api"
import { useAuth } from "../context/AuthContext"
import LoadingSpinner from "./LoadingSpinner"

export default function AddExpenseModal({ isOpen, onClose, groupId, members }) {
  const { user } = useAuth()
  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [splitType, setSplitType] = useState("EQUAL")
  const [selectedMembers, setSelectedMembers] = useState([])
  const [exactAmounts, setExactAmounts] = useState({})
  const [percentages, setPercentages] = useState({})
  const [error, setError] = useState("")
  const queryClient = useQueryClient()

  const createExpenseMutation = useMutation({
    mutationFn: async (expenseData) => {
      const { data } = await api.post("/expenses", expenseData)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group", groupId] })
      queryClient.invalidateQueries({ queryKey: ["group-balances", groupId] })
      queryClient.invalidateQueries({ queryKey: ["user-balances"] })
      resetForm()
      onClose()
    },
    onError: (err) => {
      setError(err.response?.data?.error || "Failed to create expense")
    },
  })

  const resetForm = () => {
    setDescription("")
    setAmount("")
    setSplitType("EQUAL")
    setSelectedMembers([])
    setExactAmounts({})
    setPercentages({})
    setError("")
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    setError("")

    if (!description.trim() || !amount || selectedMembers.length === 0) {
      setError("Please fill all required fields and select at least one member")
      return
    }

    const amountNum = Number.parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Please enter a valid amount")
      return
    }

    let splits = []

    if (splitType === "EQUAL") {
      splits = selectedMembers.map((userId) => ({ userId }))
    } else if (splitType === "EXACT") {
      splits = selectedMembers.map((userId) => ({
        userId,
        amount: Number.parseFloat(exactAmounts[userId] || "0"),
      }))
      const total = splits.reduce((sum, s) => sum + s.amount, 0)
      if (Math.abs(total - amountNum) > 0.01) {
        setError(`Split amounts must equal total expense. Current total: $${total.toFixed(2)}`)
        return
      }
    } else if (splitType === "PERCENTAGE") {
      splits = selectedMembers.map((userId) => ({
        userId,
        percentage: Number.parseFloat(percentages[userId] || "0"),
      }))
      const total = splits.reduce((sum, s) => sum + s.percentage, 0)
      if (Math.abs(total - 100) > 0.01) {
        setError(`Percentages must add up to 100%. Current total: ${total.toFixed(2)}%`)
        return
      }
    }

    createExpenseMutation.mutate({
      description,
      amount: amountNum,
      groupId,
      splits,
      splitType,
    })
  }

  const toggleMember = (memberId) => {
    if (selectedMembers.includes(memberId)) {
      setSelectedMembers(selectedMembers.filter((id) => id !== memberId))
    } else {
      setSelectedMembers([...selectedMembers, memberId])
    }
  }

  if (!isOpen) return null

  return (
    <div className="modal-overlay">
      <div className="modal-content p-6 my-8 shadow-xl">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Add Expense</h2>
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 px-3 py-2 rounded mb-4 text-sm">{error}</div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input w-full"
                placeholder="e.g., Dinner at restaurant"
                disabled={createExpenseMutation.isPending}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Amount ($)</label>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="input w-full"
                placeholder="0.00"
                disabled={createExpenseMutation.isPending}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Split Type</label>
              <div className="flex gap-2">
                {["EQUAL", "EXACT", "PERCENTAGE"].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setSplitType(type)}
                    disabled={createExpenseMutation.isPending}
                    className={`flex-1 py-2 px-4 rounded-lg border transition-colors ${
                      splitType === type
                        ? "bg-primary-600 text-white border-primary-600"
                        : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                    }`}
                  >
                    {type.charAt(0) + type.slice(1).toLowerCase()}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Split Between</label>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {members.map((member) => (
                  <div key={member.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <input
                      type="checkbox"
                      checked={selectedMembers.includes(member.id)}
                      onChange={() => toggleMember(member.id)}
                      disabled={createExpenseMutation.isPending}
                      className="w-4 h-4"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{member.name}</div>
                      <div className="text-xs text-gray-600">{member.email}</div>
                    </div>
                    {selectedMembers.includes(member.id) && splitType === "EXACT" && (
                      <input
                        type="number"
                        step="0.01"
                        value={exactAmounts[member.id] || ""}
                        onChange={(e) => setExactAmounts({ ...exactAmounts, [member.id]: e.target.value })}
                        disabled={createExpenseMutation.isPending}
                        className="w-24 px-2 py-1 border border-gray-300 rounded text-sm"
                        placeholder="0.00"
                      />
                    )}
                    {selectedMembers.includes(member.id) && splitType === "PERCENTAGE" && (
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          step="0.01"
                          value={percentages[member.id] || ""}
                          onChange={(e) => setPercentages({ ...percentages, [member.id]: e.target.value })}
                          disabled={createExpenseMutation.isPending}
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                          placeholder="0"
                        />
                        <span className="text-sm text-gray-600">%</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-3 justify-end mt-6">
            <button
              type="button"
              onClick={() => {
                resetForm()
                onClose()
              }}
              className="btn btn-secondary"
              disabled={createExpenseMutation.isPending}
            >
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={createExpenseMutation.isPending}>
              {createExpenseMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <LoadingSpinner size="small" className="border-white" />
                  Adding...
                </span>
              ) : (
                "Add Expense"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
