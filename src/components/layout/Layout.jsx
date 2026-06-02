import { Outlet, Navigate } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

export function Layout() {
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setAuthenticated(!!session)
        setLoading(false)
      })
      .catch((err) => {
        console.error('Erro ao verificar sessão:', err)
        setLoading(false)
      })

    const { data: authData } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthenticated(!!session)
    })

    return () => authData?.subscription?.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-light">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!authenticated) return <Navigate to="/login" replace />

  return (
    <div className="flex min-h-screen bg-bg-light">
      <Sidebar />
      <div className="ml-64 flex-1">
        <Header />
        <main className="p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
