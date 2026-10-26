import React, { useEffect, useState } from 'react'
import { Navigate, useLocation, Link } from 'react-router-dom'
import { currentUser, subscribeToAuthState } from '../services/firebase'
import { ShieldAlert, Lock } from 'lucide-react'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: string // e.g. 'admin'
}

export default function ProtectedRoute({ children, requiredRole }: ProtectedRouteProps) {
  const location = useLocation()
  const [user, setUser] = useState(currentUser())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Listen to Firebase auth state restoration
    const unsubscribe = subscribeToAuthState((fbUser) => {
      const activeUser = currentUser()
      setUser(activeUser)
      setLoading(false)
    })

    const onAuthEvent = () => {
      setUser(currentUser())
    }
    window.addEventListener('ecochain-auth', onAuthEvent)

    return () => {
      unsubscribe()
      window.removeEventListener('ecochain-auth', onAuthEvent)
    }
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 p-6 rounded-xl bg-[#09140f] border border-[#173024]">
          <div className="w-8 h-8 rounded-full border-2 border-[#22c55e] border-t-transparent animate-spin" />
          <span className="text-xs text-[#8b9f94] font-mono">Verifying Security Credentials...</span>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (requiredRole && user.role !== requiredRole && user.role !== 'admin' && user.role !== 'commander') {
    return (
      <div className="max-w-md mx-auto my-16 p-8 text-center bg-[#0f1f18] border border-[#ef4444]/30 rounded-2xl shadow-xl space-y-4">
        <div className="w-12 h-12 rounded-full bg-[#ef4444]/15 text-[#ef4444] flex items-center justify-center mx-auto text-xl">
          <ShieldAlert size={24} />
        </div>
        <h1 className="text-lg font-bold text-[#f0fdf4]">Restricted Command Clearance</h1>
        <p className="text-xs text-[#8b9f94]">
          Your current security clearance ({user.role}) is insufficient for this administrative node. Required role: {requiredRole}.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#22c55e] text-[#070f0b] text-xs font-semibold hover:bg-[#16a34a] transition-colors"
        >
          Return to Command Center
        </Link>
      </div>
    )
  }

  return <>{children}</>
}
