"use client"

import { useState, useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { useNavigate } from "react-router-dom"
import Navbar from "../components/Navbar"
import CreateGroupModal from "../components/CreateGroupModal"
import LoadingSpinner from "../components/LoadingSpinner"
import Pagination from "../components/Pagination"
import api from "../lib/api"

// ============================================================================
// DASHBOARD PAGE
// ============================================================================

export default function Dashboard() {
  // State management
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 6
  const navigate = useNavigate()

  // Data fetching
  const { data: groupsResponse, isLoading: groupsLoading } = useQuery({
    queryKey: ["groups"],
    queryFn: async () => {
      const { data } = await api.get("/groups")
      return data
    },
  })
  
  // Handle both paginated and non-paginated response formats
  const groups = groupsResponse?.groups || groupsResponse || []

  const { data: balances, isLoading: balancesLoading } = useQuery({
    queryKey: ["user-balances"],
    queryFn: async () => {
      const { data } = await api.get("/balances/user")
      return data
    },
  })

  const isLoading = groupsLoading || balancesLoading

  // Pagination logic for groups
  const paginatedGroups = useMemo(() => {
    if (!groups) return []
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return groups.slice(startIndex, endIndex)
  }, [groups, currentPage])

  const totalPages = useMemo(() => {
    if (!groups) return 0
    return Math.ceil(groups.length / itemsPerPage)
  }, [groups])

  // Render
  return (
    <>
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Balance Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card p-6 bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200 dark:border-red-800">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-red-600 dark:text-red-400 uppercase tracking-wide">You owe</div>
              <div className="w-8 h-8 bg-red-200 dark:bg-red-800 rounded-lg flex items-center justify-center">
                <span className="text-red-700 dark:text-red-300 text-lg">↑</span>
              </div>
            </div>
            {isLoading ? (
              <LoadingSpinner size="medium" className="border-red-600" />
            ) : (
              <div className="text-3xl font-bold text-red-700 dark:text-red-400">₹{balances?.totalOwing?.toFixed(2) || "0.00"}</div>
            )}
          </div>

          <div className="card p-6 bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200 dark:border-green-800">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-green-600 dark:text-green-400 uppercase tracking-wide">You are owed</div>
              <div className="w-8 h-8 bg-green-200 dark:bg-green-800 rounded-lg flex items-center justify-center">
                <span className="text-green-700 dark:text-green-300 text-lg">↓</span>
              </div>
            </div>
            {isLoading ? (
              <LoadingSpinner size="medium" className="border-green-600" />
            ) : (
              <div className="text-3xl font-bold text-green-700 dark:text-green-400">₹{balances?.totalOwed?.toFixed(2) || "0.00"}</div>
            )}
          </div>

          <div className="card p-6 bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 border-primary-200 dark:border-primary-800">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold text-primary-600 dark:text-primary-400 uppercase tracking-wide">Net balance</div>
              <div className="w-8 h-8 bg-primary-200 dark:bg-primary-800 rounded-lg flex items-center justify-center">
                <span className="text-primary-700 dark:text-primary-300 text-lg">=</span>
              </div>
            </div>
            {isLoading ? (
              <LoadingSpinner size="medium" className="border-primary-600" />
            ) : (
              <div
                className={`text-3xl font-bold ${
                  balances?.netBalance > 0
                    ? "text-green-700 dark:text-green-400"
                    : balances?.netBalance < 0
                      ? "text-red-700 dark:text-red-400"
                      : "text-gray-700 dark:text-gray-300"
                }`}
              >
                {balances?.netBalance > 0 && "+"}₹{balances?.netBalance?.toFixed(2) || "0.00"}
              </div>
            )}
          </div>
        </div>

        {/* Balances Details */}
        {!isLoading && balances && (balances.youOwe?.length > 0 || balances.youAreOwed?.length > 0) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            {balances.youOwe?.length > 0 && (
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">You owe</h3>
                <div className="space-y-3">
                  {balances.youOwe.map((debt) => (
                    <div
                      key={debt.user.id}
                      className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-100 dark:border-red-800"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-200 dark:bg-red-800 rounded-full flex items-center justify-center">
                          <span className="text-red-700 dark:text-red-300 font-semibold">{debt.user.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">{debt.user.name}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">{debt.user.email}</div>
                        </div>
                      </div>
                      <div className="text-lg font-bold text-red-700 dark:text-red-400">${debt.amount.toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {balances.youAreOwed?.length > 0 && (
              <div className="card p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">You are owed</h3>
                <div className="space-y-3">
                  {balances.youAreOwed.map((debt) => (
                    <div
                      key={debt.user.id}
                      className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-100 dark:border-green-800"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-200 dark:bg-green-800 rounded-full flex items-center justify-center">
                          <span className="text-green-700 dark:text-green-300 font-semibold">{debt.user.name.charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 dark:text-white">{debt.user.name}</div>
                          <div className="text-sm text-gray-600 dark:text-gray-400">{debt.user.email}</div>
                        </div>
                      </div>
                      <div className="text-lg font-bold text-green-700 dark:text-green-400">${debt.amount.toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Groups Section */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Your Groups</h2>
          <button onClick={() => setIsCreateModalOpen(true)} className="btn btn-primary flex items-center gap-2">
            <span className="text-xl">+</span>
            <span>Create Group</span>
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size="large" />
          </div>
        ) : groups && groups.length > 0 ? (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {paginatedGroups.map((group) => (
                <div
                  key={group.id}
                  onClick={() => navigate(`/group/${group.id}`)}
                  className="card p-6 cursor-pointer hover:scale-102 transition-transform"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">{group.name}</h3>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {group.members.length} member{group.members.length !== 1 ? "s" : ""}
                      </div>
                    </div>
                    <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900 rounded-xl flex items-center justify-center">
                      <span className="text-primary-700 dark:text-primary-300 font-bold text-xl">{group.name.charAt(0).toUpperCase()}</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <div className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      {group._count?.expenses || 0} expense{group._count?.expenses !== 1 ? "s" : ""}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {totalPages > 1 && (
              <div className="mt-8">
                <Pagination 
                  currentPage={currentPage}
                  totalPages={totalPages}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-12 card">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gray-100 dark:bg-gray-700 rounded-full mb-4">
              <span className="text-gray-400 text-2xl">📊</span>
            </div>
            <p className="text-gray-600 dark:text-gray-400 mb-4">You don't have any groups yet</p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="btn btn-primary inline-flex items-center gap-2"
            >
              <span className="text-xl">+</span>
              <span>Create your first group</span>
            </button>
          </div>
        )}
      </div>

      <CreateGroupModal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} />
    </>
  )
}
