"use client"

import { useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import Navbar from "../components/Navbar"
import AddExpenseModal from "../components/AddExpenseModal"
import AddMemberModal from "../components/AddMemberModal"
import SettleModal from "../components/SettleModal"
import LoadingSpinner from "../components/LoadingSpinner"
import api from "../lib/api"
import { useAuth } from "../context/AuthContext"

export default function GroupDetail() {
  const { groupId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false)
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false)
  const [settleModalData, setSettleModalData] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const { data: group, isLoading: groupLoading } = useQuery({
    queryKey: ["group", groupId],
    queryFn: async () => {
      const { data } = await api.get(`/groups/${groupId}`)
      return data
    },
  })

  const { data: balances, isLoading: balancesLoading } = useQuery({
    queryKey: ["group-balances", groupId],
    queryFn: async () => {
      const { data } = await api.get(`/balances/group/${groupId}`)
      return data
    },
  })

  const { data: settlements, isLoading: settlementsLoading } = useQuery({
    queryKey: ["group-settlements", groupId],
    queryFn: async () => {
      const { data } = await api.get(`/settlements/group/${groupId}`)
      return data
    },
  })

  const deleteGroupMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/groups/${groupId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["groups"])
      navigate("/dashboard")
    },
    onError: (error) => {
      alert(error.response?.data?.error || "Failed to delete group")
    },
  })

  const removeMemberMutation = useMutation({
    mutationFn: async (memberId) => {
      await api.delete(`/groups/${groupId}/members/${memberId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["group", groupId])
      queryClient.invalidateQueries(["group-balances", groupId])
    },
    onError: (error) => {
      alert(error.response?.data?.error || "Failed to remove member")
    },
  })

  const handleDeleteGroup = () => {
    if (window.confirm("Are you sure you want to delete this group? This action cannot be undone.")) {
      deleteGroupMutation.mutate()
    }
  }

  const handleRemoveMember = (memberId, memberName) => {
    if (memberId === user?.id) {
      alert("You cannot remove yourself from the group. Use Leave Group instead.")
      return
    }
    if (window.confirm(`Are you sure you want to remove ${memberName} from this group?`)) {
      removeMemberMutation.mutate(memberId)
    }
  }

  const isLoading = groupLoading || balancesLoading || settlementsLoading

  if (isLoading) {
    return (
      <>
        <Navbar />
        <div className="flex items-center justify-center min-h-[calc(100vh-64px)]">
          <LoadingSpinner size="large" />
        </div>
      </>
    )
  }

  if (!group) {
    return (
      <>
        <Navbar />
        <div className="flex flex-col items-center justify-center min-h-[calc(100vh-64px)]">
          <div className="text-lg text-gray-600 mb-4">Group not found</div>
          <button onClick={() => navigate("/dashboard")} className="btn btn-primary">
            Back to Dashboard
          </button>
        </div>
      </>
    )
  }

  // Calculate user's net balance (what they're owed - what they owe)
  const totalOwed = balances?.youAreOwed?.reduce((sum, debt) => sum + debt.amount, 0) || 0
  const totalOwing = balances?.youOwe?.reduce((sum, debt) => sum + debt.amount, 0) || 0
  const userBalance = totalOwed - totalOwing

  return (
    <>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate("/dashboard")}
            className="text-primary-600 hover:text-primary-700 mb-4 flex items-center gap-2 transition-colors"
          >
            ← Back to Dashboard
          </button>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{group.name}</h1>
              <p className="text-gray-600">{group.members.length} members</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => setIsMemberModalOpen(true)} className="btn btn-secondary">
                + Add Member
              </button>
              <button onClick={() => setIsExpenseModalOpen(true)} className="btn btn-primary">
                + Add Expense
              </button>
              <button
                onClick={handleDeleteGroup}
                disabled={deleteGroupMutation.isPending}
                className="btn bg-red-600 hover:bg-red-700 text-white"
              >
                {deleteGroupMutation.isPending ? "Deleting..." : "Delete Group"}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Expenses List */}
          <div className="lg:col-span-2">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Expenses</h2>
            {group.expenses && group.expenses.length > 0 ? (
              <div className="space-y-4">
                {group.expenses.map((expense) => (
                  <div key={expense.id} className="card p-4">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h3 className="font-semibold text-gray-900">{expense.description}</h3>
                        <p className="text-sm text-gray-600">Paid by {expense.paidBy?.name || 'Unknown'}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-gray-900">${expense.amount.toFixed(2)}</div>
                        <div className="text-sm text-gray-600">{new Date(expense.createdAt).toLocaleDateString()}</div>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="text-sm text-gray-600 mb-2">Split between:</div>
                      <div className="flex flex-wrap gap-2">
                        {expense.splits.map((split) => (
                          <div key={split.userId} className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {split.user.name}: ${split.amount.toFixed(2)}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 card">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 rounded-full mb-4">
                  <span className="text-gray-400 text-2xl">💰</span>
                </div>
                <p className="text-gray-600 mb-4">No expenses yet</p>
                <button onClick={() => setIsExpenseModalOpen(true)} className="btn btn-primary">
                  Add your first expense
                </button>
              </div>
            )}
          </div>

          {/* Balances Sidebar */}
          <div className="space-y-6">
            {/* Your Balance */}
            <div className="card p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Your Balance</h3>
              <div
                className={`rounded-lg p-4 ${
                  userBalance > 0
                    ? "bg-green-50 border border-green-200"
                    : userBalance < 0
                      ? "bg-red-50 border border-red-200"
                      : "bg-gray-50 border border-gray-200"
                }`}
              >
                <div className="text-sm font-medium text-gray-700 mb-1">
                  {userBalance > 0 ? "You are owed" : userBalance < 0 ? "You owe" : "Settled up"}
                </div>
                <div
                  className={`text-2xl font-bold ${
                    userBalance > 0 ? "text-green-700" : userBalance < 0 ? "text-red-700" : "text-gray-700"
                  }`}
                >
                  {userBalance > 0 && "+"}${Math.abs(userBalance).toFixed(2)}
                </div>
              </div>
            </div>

            {/* Simplified Balances */}
            {balances && balances.allDebts && balances.allDebts.length > 0 && (
              <div className="card p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Settle Up</h3>
                <div className="space-y-3">
                  {balances.allDebts.map((transaction, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="text-sm mb-2">
                        <span className="font-medium">{transaction.from.name}</span>
                        <span className="text-gray-600"> owes </span>
                        <span className="font-medium">{transaction.to.name}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-lg font-bold text-gray-900">${transaction.amount.toFixed(2)}</div>
                        {(transaction.from.id === user?.id || transaction.to.id === user?.id) && (
                          <button
                            onClick={() =>
                              setSettleModalData({
                                fromUser: transaction.from,
                                toUser: transaction.to,
                                amount: transaction.amount,
                              })
                            }
                            className="btn btn-primary btn-sm"
                          >
                            Settle
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Members */}
            <div className="card p-4">
              <h3 className="font-semibold text-gray-900 mb-3">Members</h3>
              <div className="space-y-2">
                {group.members.map((member) => (
                  <div key={member.user.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center text-primary-600 font-semibold text-sm">
                      {member.user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">{member.user.name}</div>
                      <div className="text-xs text-gray-600">{member.user.email}</div>
                    </div>
                    {member.user.isGuest && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded">Guest</span>
                    )}
                    {member.user.id !== user?.id && group.members.length > 1 && (
                      <button
                        onClick={() => handleRemoveMember(member.user.id, member.user.name)}
                        disabled={removeMemberMutation.isPending}
                        className="text-red-600 hover:text-red-700 text-sm px-2 py-1 rounded hover:bg-red-50 transition-colors"
                        title="Remove member"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Settlements */}
            {settlements && settlements.length > 0 && (
              <div className="card p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Recent Settlements</h3>
                <div className="space-y-2">
                  {settlements.slice(0, 5).map((settlement) => (
                    <div key={settlement.id} className="text-sm p-2 bg-gray-50 rounded">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium">{settlement.fromUser.name}</span>
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            settlement.status === "COMPLETED"
                              ? "bg-green-100 text-green-700"
                              : "bg-amber-100 text-amber-700"
                          }`}
                        >
                          {settlement.status}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600">
                        paid {settlement.toUser.name} ${settlement.amount.toFixed(2)} via {settlement.method}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <AddExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        groupId={groupId}
        members={group.members.map((m) => m.user)}
      />

      <AddMemberModal isOpen={isMemberModalOpen} onClose={() => setIsMemberModalOpen(false)} groupId={groupId} />

      {settleModalData && (
        <SettleModal
          isOpen={true}
          onClose={() => setSettleModalData(null)}
          groupId={groupId}
          fromUser={settleModalData.fromUser}
          toUser={settleModalData.toUser}
          amount={settleModalData.amount}
        />
      )}
    </>
  )
}
