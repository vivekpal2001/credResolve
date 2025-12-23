import { createContext, useContext, useEffect, useState } from "react"

// ============================================================================
// THEME CONTEXT
// Manages dark/light theme state across the application
// ============================================================================

const ThemeContext = createContext()

/**
 * Hook to access theme context
 * @returns {Object} { theme, toggleTheme }
 */
export const useTheme = () => {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error("useTheme must be used within ThemeProvider")
  }
  return context
}

/**
 * Theme Provider Component
 * Wraps the app and provides theme context to all children
 * @param {Object} props - Component props
 * @param {ReactNode} props.children - Child components
 */
export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem("theme")
    return saved || "light"
  })

  useEffect(() => {
    const root = window.document.documentElement
    if (theme === "dark") {
      root.classList.add("dark")
    } else {
      root.classList.remove("dark")
    }
    localStorage.setItem("theme", theme)
  }, [theme])

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"))
  }

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  )
}
