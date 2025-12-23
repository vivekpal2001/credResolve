"use client"

import { useState, useMemo } from "react"
import { useParams, useNavigate } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import Navbar from "../components/Navbar"
import AddExpenseModal from "../components/AddExpenseModal"
import AddMemberModal from "../components/AddMemberModal"
import SettleModal from "../components/SettleModal"
import LoadingSpinner from "../components/LoadingSpinner"
import Pagination from "../components/Pagination"
import api from "../lib/api"
import { useAuth } from "../context/AuthContext"

// ============================================================================
// GROUP DETAIL PAGE
// ============================================================================

export default function GroupDetail() {
  // Hooks and routing
  const { groupId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const queryClient = useQueryClient()

  // State management
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false)
  const [isMemberModalOpen, setIsMemberModalOpen] = useState(false)
  const [settleModalData, setSettleModalData] = useState(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [expensePage, setExpensePage] = useState(1)
  const [settlementPage, setSettlementPage] = useState(1)
  const itemsPerPage = 3

  // Data fetching
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

  // Mutations
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

  const deleteExpenseMutation = useMutation({
    mutationFn: async (expenseId) => {
      await api.delete(`/expenses/${expenseId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries(["group", groupId])
      queryClient.invalidateQueries(["group-balances", groupId])
    },
    onError: (error) => {
      alert(error.response?.data?.error || "Failed to delete expense")
    },
  })

  // Event handlers
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

  const handleDeleteExpense = (expenseId, description) => {
    if (window.confirm(`Are you sure you want to delete the expense "${description}"?`)) {
      deleteExpenseMutation.mutate(expenseId)
    }
  }

  // Computed values - MUST be before conditional returns to follow Rules of Hooks
  // Calculate user's net balance (what they're owed - what they owe)
  const totalOwed = balances?.youAreOwed?.reduce((sum, debt) => sum + debt.amount, 0) || 0
  const totalOwing = balances?.youOwe?.reduce((sum, debt) => sum + debt.amount, 0) || 0
  const userBalance = totalOwed - totalOwing

  // Check if current user is the group creator
  const isCreator = group?.creator?.id === user?.id

  // Pagination logic for expenses
  const paginatedExpenses = useMemo(() => {
    if (!group?.expenses) return []
    const startIndex = (expensePage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return group.expenses.slice(startIndex, endIndex)
  }, [group?.expenses, expensePage])

  const expenseTotalPages = useMemo(() => {
    if (!group?.expenses) return 0
    return Math.ceil(group.expenses.length / itemsPerPage)
  }, [group?.expenses])

  // Pagination logic for settlements
  const paginatedSettlements = useMemo(() => {
    if (!settlements) return []
    const startIndex = (settlementPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return settlements.slice(startIndex, endIndex)
  }, [settlements, settlementPage])

  const settlementTotalPages = useMemo(() => {
    if (!settlements) return 0
    return Math.ceil(settlements.length / itemsPerPage)
  }, [settlements])

  // Conditional returns - MUST be after all hooks
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
          <div className="text-lg text-gray-600 dark:text-gray-400 mb-4">Group not found</div>
          <button onClick={() => navigate("/dashboard")} className="btn btn-primary">
            Back to Dashboard
          </button>
        </div>
      </>
    )
  }

  return (
    <>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate("/dashboard")}
            className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 mb-4 flex items-center gap-2 transition-colors"
          >
            ← Back to Dashboard
          </button>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">{group.name}</h1>
              <p className="text-gray-600 dark:text-gray-400">{group.members.length} members</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button onClick={() => setIsMemberModalOpen(true)} className="btn btn-secondary">
                + Add Member
              </button>
              <button onClick={() => setIsExpenseModalOpen(true)} className="btn btn-primary">
                + Add Expense
              </button>
              {isCreator && (
                <button
                  onClick={handleDeleteGroup}
                  disabled={deleteGroupMutation.isPending}
                  className="btn bg-red-600 hover:bg-red-700 text-white"
                >
                  {deleteGroupMutation.isPending ? "Deleting..." : "Delete Group"}
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Expenses List */}
          <div className="lg:col-span-2">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Expenses</h2>
            {group.expenses && group.expenses.length > 0 ? (
              <>
                <div className="space-y-4">
                  {paginatedExpenses.map((expense) => (
                    <div key={expense.id} className="card p-4">
                      <div className="flex justify-between items-start mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white">{expense.description}</h3>
                          <p className="text-sm text-gray-600 dark:text-gray-400">Paid by {expense.paidBy?.name || "Unknown"}</p>
                        </div>
                        <div className="flex items-start gap-3">
                          <div className="text-right">
                            <div className="text-lg font-bold text-gray-900 dark:text-white">₹{expense.amount.toFixed(2)}</div>
                            <div className="text-sm text-gray-600 dark:text-gray-400">
                              {new Date(expense.createdAt).toLocaleDateString()}
                            </div>
                          </div>
                          {expense.paidBy?.id === user?.id && (
                            <button
                              onClick={() => handleDeleteExpense(expense.id, expense.description)}
                              disabled={deleteExpenseMutation.isPending}
                              className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 text-sm p-2 rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                              title="Delete expense"
                            >
                              🗑️
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                        <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">Split between:</div>
                        <div className="flex flex-wrap gap-2">
                        {expense.splits.map((split) => (
                          <div key={split.userId} className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded">
                            {split.user.name}: ₹{split.amount.toFixed(2)}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              {expenseTotalPages > 1 && (
                <div className="mt-6">
                  <Pagination 
                    currentPage={expensePage}
                    totalPages={expenseTotalPages}
                    onPageChange={setExpensePage}
                  />
                </div>
              )}
              </>
            ) : (
              <div className="text-center py-12 card">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full mb-4">
                  <span className="text-gray-400 text-2xl">💰</span>
                </div>
                <p className="text-gray-600 dark:text-gray-400 mb-4">No expenses yet</p>
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
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Your Balance</h3>
              <div
                className={`rounded-lg p-4 ${
                  userBalance > 0
                    ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                    : userBalance < 0
                      ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                      : "bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600"
                }`}
              >
                <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {userBalance > 0 ? "You are owed" : userBalance < 0 ? "You owe" : "Settled up"}
                </div>
                <div
                  className={`text-2xl font-bold ${
                    userBalance > 0 ? "text-green-700 dark:text-green-400" : userBalance < 0 ? "text-red-700 dark:text-red-400" : "text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {userBalance > 0 && "+"}₹{Math.abs(userBalance).toFixed(2)}
                </div>
              </div>
            </div>

            {/* Simplified Balances */}
            {balances && balances.allDebts && balances.allDebts.length > 0 && (
              <div className="card p-4">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Settle Up</h3>
                <div className="space-y-3">
                  {balances.allDebts.map((transaction, index) => (
                    <div key={index} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                      <div className="text-sm mb-2">
                        <span className="font-medium text-gray-900 dark:text-white">{transaction.from.name}</span>
                        <span className="text-gray-600 dark:text-gray-400"> owes </span>
                        <span className="font-medium text-gray-900 dark:text-white">{transaction.to.name}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-lg font-bold text-gray-900 dark:text-white">${transaction.amount.toFixed(2)}</div>
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
              <h3 className="font-semibold text-gray-900 mb-3">
                Members
                {group.creator && (
                  <span className="text-xs font-normal text-gray-500 ml-2">
                    (Creator: {group.creator.name})
                  </span>
                )}
              </h3>
              <div className="space-y-2">
                {group.members.map((member) => (
                  <div key={member.user.id} className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-primary-100 dark:bg-primary-900 rounded-full flex items-center justify-center text-primary-600 dark:text-primary-300 font-semibold text-sm">
                      {member.user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {member.user.name}
                        {member.user.id === group.creator?.id && (
                          <span className="ml-2 text-xs text-primary-600 dark:text-primary-400">👑 Creator</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">{member.user.email}</div>
                    </div>
                    {member.user.isGuest && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded">Guest</span>
                    )}
                    {isCreator && member.user.id !== user?.id && member.user.id !== group.creator?.id && (
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
                <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Recent Settlements</h3>
                <div className="space-y-2">
                  {paginatedSettlements.map((settlement) => (
                    <div key={settlement.id} className="text-sm p-2 bg-gray-50 dark:bg-gray-700 rounded">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-gray-900 dark:text-white">{settlement.fromUser.name}</span>
                        <span
                          className={`text-xs px-2 py-1 rounded ${
                            settlement.status === "COMPLETED"
                              ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                              : "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400"
                          }`}
                        >
                          {settlement.status}
                        </span>
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        paid {settlement.toUser.name} ${settlement.amount.toFixed(2)} via {settlement.method}
                      </div>
                    </div>
                  ))}
                </div>
                {settlementTotalPages > 1 && (
                  <div className="mt-4">
                    <Pagination 
                      currentPage={settlementPage}
                      totalPages={settlementTotalPages}
                      onPageChange={setSettlementPage}
                    />
                  </div>
                )}
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
