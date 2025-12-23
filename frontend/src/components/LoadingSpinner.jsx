export default function LoadingSpinner({ size = "medium", className = "" }) {
  const sizeClasses = {
    small: "w-4 h-4 border-2",
    medium: "w-8 h-8 border-3",
    large: "w-12 h-12 border-4",
  }

  return (
    <div
      className={`inline-block border-primary-600 border-t-transparent rounded-full animate-spin ${sizeClasses[size]} ${className}`}
    />
  )
}
