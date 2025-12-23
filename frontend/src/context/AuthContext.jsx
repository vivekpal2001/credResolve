"use client"

import { createContext, useContext, useState, useEffect } from "react"
import { setToken as saveToken, removeToken, isAuthenticated } from "../lib/auth"
import api from "../lib/api"

const AuthContext = createContext(undefined)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadUser = async () => {
      if (isAuthenticated()) {
        try {
          const { data } = await api.get("/auth/me")
          setUser(data)
        } catch (error) {
          removeToken()
        }
      }
      setIsLoading(false)
    }
    loadUser()
  }, [])

  const login = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password })
    saveToken(data.token)
    setUser(data.user)
  }

  const register = async (email, name, password) => {
    const { data } = await api.post("/auth/register", { email, name, password })
    saveToken(data.token)
    setUser(data.user)
  }

  const logout = () => {
    removeToken()
    setUser(null)
  }

  return <AuthContext.Provider value={{ user, login, register, logout, isLoading }}>{children}</AuthContext.Provider>
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return context
}
