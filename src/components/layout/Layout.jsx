import { useState, useEffect } from 'react'
import { Outlet, Navigate, useLocation } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { cn } from '../../lib/utils'

const pageTitles = {
  '/dashboard': 'Dashboard',
  '/orders': 'Ordens de Serviço',
  '/orders/new': 'Nova Ordem de Serviço',
  '/kanban': 'Produção',
  '/clients': 'Clientes',
  '/products': 'Produtos',
  '/reports': 'Relatórios',
  '/settings': 'Configurações',
  '/settings/company': 'Minha Empresa',
  '/settings/users': 'Usuários',
}

export function Layout() {
  const [loading, setLoading] = useState(true)
  const [authenticated, setAuthenticated] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const location = useLocation()

  const basePath = '/' + location.pathname.split('/')[1]
  const title = pageTitles[basePath] || 'ConfecOS'

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setAuthenticated(!!session)
        setLoading(false)
      })
      .catch(() => setLoading(false))

    const { data: authData } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthenticated(!!session)
    })

    return () => authData?.subscription?.unsubscribe()
  }, [])

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-bg-main">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
            <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
          <p className="text-sm text-text-muted">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!authenticated) return <Navigate to="/login" state={{ from: location.pathname + location.search }} replace />

  return (
    <div className="flex min-h-screen bg-bg-main">
      <Sidebar
        collapsed={collapsed}
        onToggle={() => setCollapsed(!collapsed)}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        onMobileOpen={() => setMobileOpen(true)}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <Header title={title} onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 flex flex-col p-4 lg:p-8 bg-bg-main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
