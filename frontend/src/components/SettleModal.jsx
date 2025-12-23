"use client"

import { useState } from "react"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import api from "../lib/api"
import { useAuth } from "../context/AuthContext"
import LoadingSpinner from "./LoadingSpinner"

export default function SettleModal({ isOpen, onClose, groupId, fromUser, toUser, amount }) {
  const { user } = useAuth()
  const [method, setMethod] = useState("CASH")
  const [error, setError] = useState("")
  const queryClient = useQueryClient()

  const createSettlementMutation = useMutation({
    mutationFn: async (settlementData) => {
      const { data } = await api.post("/settlements", settlementData)
      return data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["group-balances", groupId] })
      queryClient.invalidateQueries({ queryKey: ["group-settlements", groupId] })
      queryClient.invalidateQueries({ queryKey: ["user-balances"] })
      onClose()
    },
    onError: (err) => {
      setError(err.response?.data?.error || "Failed to record settlement")
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    createSettlementMutation.mutate({
      groupId,
      fromUserId: fromUser.id,
      toUserId: toUser.id,
      amount,
      method,
    })
  }

  if (!isOpen) return null

  const isUserInvolved = user?.id === fromUser.id || user?.id === toUser.id

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-md w-full p-6 shadow-xl">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Settle Payment</h2>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 px-3 py-2 rounded mb-4 text-sm">{error}</div>
        )}

        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <div className="text-center">
            <div className="text-sm text-gray-600 mb-2">
              <span className="font-semibold">{fromUser.name}</span> pays{" "}
              <span className="font-semibold">{toUser.name}</span>
            </div>
            <div className="text-3xl font-bold text-primary-600">${amount.toFixed(2)}</div>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setMethod("CASH")}
                disabled={createSettlementMutation.isPending}
                className={`w-full p-3 rounded-lg border text-left transition-colors ${
                  method === "CASH"
                    ? "bg-primary-50 border-primary-600 text-primary-900"
                    : "bg-white border-gray-300 hover:bg-gray-50"
                }`}
              >
                <div className="font-semibold mb-1">Cash</div>
                <div className="text-xs text-gray-600">Payment recorded instantly</div>
              </button>
              <button
                type="button"
                onClick={() => setMethod("ONLINE")}
                disabled={createSettlementMutation.isPending}
                className={`w-full p-3 rounded-lg border text-left transition-colors ${
                  method === "ONLINE"
                    ? "bg-primary-50 border-primary-600 text-primary-900"
                    : "bg-white border-gray-300 hover:bg-gray-50"
                }`}
              >
                <div className="font-semibold mb-1">Online (UPI/Bank Transfer)</div>
                <div className="text-xs text-gray-600">Payment recorded instantly</div>
              </button>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={createSettlementMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={createSettlementMutation.isPending || !isUserInvolved}
            >
              {createSettlementMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <LoadingSpinner size="small" className="border-white" />
                  Recording...
                </span>
              ) : (
                "Record Payment"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
