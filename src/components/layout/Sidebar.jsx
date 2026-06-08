import { useState } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  LayoutDashboard, ClipboardList, KanbanSquare, Users, Package,
  BarChart3, Settings, LogOut, Shirt, ChevronLeft, ChevronDown
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { supabase } from '../../lib/supabase'

const navItems = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  {
    key: 'orders',
    icon: ClipboardList,
    label: 'Ordens de Serviço',
    children: [
      { to: '/orders', label: 'Lista' },
      { to: '/kanban', label: 'Produção', icon: KanbanSquare },
    ],
  },
  { to: '/clients', icon: Users, label: 'Clientes' },
  { to: '/products', icon: Package, label: 'Produtos' },
  {
    key: 'settings',
    icon: Settings,
    label: 'Configurações',
    children: [
      { to: '/reports', label: 'Relatórios', icon: BarChart3 },
      { to: '/settings', label: 'Configurações' },
      { to: '/settings/company', label: 'Minha Empresa' },
    ],
  },
]

export function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }) {
  const navigate = useNavigate()
  const location = useLocation()

  const [expandedGroups, setExpandedGroups] = useState(() => {
    const groups = {}
    navItems.forEach(item => {
      if (item.children) {
        groups[item.key] = item.children.some(child =>
          location.pathname.startsWith(child.to)
        )
      }
    })
    return groups
  })

  const toggleGroup = (key) => {
    setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }))
  }

  const isChildActive = (children) =>
    children.some(child => location.pathname.startsWith(child.to))

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate('/login')
  }

  const sidebarContent = (
    <div className="flex h-full flex-col">
      <div className={cn('flex items-center gap-3 px-5 py-6 border-b border-sidebar-hover', collapsed && 'justify-center')}>
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary">
          <Shirt size={20} className="text-white" />
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <h1 className="text-sm font-bold text-white tracking-tight">CONFECOS</h1>
            <p className="text-[10px] text-sidebar-text tracking-wider uppercase">Controle de Produção</p>
          </div>
        )}
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          if (item.children) {
            const active = isChildActive(item.children)
            return (
              <div key={item.key}>
                <button
                  onClick={() => {
                    if (collapsed) {
                      navigate(item.children[0].to)
                    } else {
                      toggleGroup(item.key)
                    }
                    if (mobileOpen) onMobileClose?.()
                  }}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 w-full cursor-pointer',
                    active
                      ? 'bg-sidebar-active-bg text-sidebar-active-text shadow-sm'
                      : 'text-sidebar-text hover:bg-sidebar-hover hover:text-white',
                    collapsed && 'justify-center px-2'
                  )}
                >
                  <item.icon size={20} className="shrink-0" />
                  {!collapsed && (
                    <>
                      <span className="flex-1 truncate text-left">{item.label}</span>
                      <ChevronDown
                        size={16}
                        className={cn(
                          'shrink-0 transition-transform duration-200',
                          expandedGroups[item.key] && 'rotate-180'
                        )}
                      />
                    </>
                  )}
                </button>
                {!collapsed && expandedGroups[item.key] && (
                  <div className="mt-1 space-y-0.5 ml-3 pl-3 border-l border-sidebar-hover">
                    {item.children.map((child) => (
                      <NavLink
                        key={child.to}
                        to={child.to}
                        onClick={() => mobileOpen && onMobileClose?.()}
                        className={({ isActive }) =>
                          cn(
                            'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200',
                            isActive
                              ? 'bg-sidebar-active-bg/20 text-white shadow-sm'
                              : 'text-sidebar-text hover:bg-sidebar-hover hover:text-white'
                          )
                        }
                      >
                        {child.icon ? (
                          <child.icon size={16} className="shrink-0 opacity-70" />
                        ) : (
                          <div className="h-1 w-1 rounded-full bg-sidebar-text shrink-0 opacity-50" />
                        )}
                        <span className="truncate">{child.label}</span>
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            )
          }

          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => mobileOpen && onMobileClose?.()}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-sidebar-active-bg text-sidebar-active-text shadow-sm'
                    : 'text-sidebar-text hover:bg-sidebar-hover hover:text-white',
                  collapsed && 'justify-center px-2'
                )
              }
            >
              <item.icon size={20} className="shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </NavLink>
          )
        })}
      </nav>

      <div className={cn('px-3 py-4 border-t border-sidebar-hover', collapsed && 'flex justify-center')}>
        <button
          onClick={handleLogout}
          className={cn(
            'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-sidebar-text hover:bg-sidebar-hover hover:text-white transition-all duration-200 cursor-pointer',
            collapsed ? 'justify-center w-10 h-10 p-0' : 'w-full'
          )}
        >
          <LogOut size={20} className="shrink-0" />
          {!collapsed && <span>Sair</span>}
        </button>
      </div>
    </div>
  )

  return (
    <>
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen bg-sidebar hidden lg:flex flex-col transition-all duration-300',
          collapsed ? 'w-20' : 'w-60'
        )}
      >
        <button
          onClick={onToggle}
          className="absolute -right-3 top-16 z-50 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card-bg shadow-sm text-text-muted hover:text-text-primary transition-colors cursor-pointer"
        >
          <ChevronLeft size={14} className={cn('transition-transform duration-300', collapsed && 'rotate-180')} />
        </button>
        {sidebarContent}
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-black/40" onClick={onMobileClose} />
          <aside className="fixed left-0 top-0 bottom-0 z-50 w-60 bg-sidebar shadow-2xl overflow-y-auto">
            {sidebarContent}
          </aside>
        </div>
      )}

    </>
  )
}
