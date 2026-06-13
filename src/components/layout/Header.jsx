import { useEffect, useState } from 'react'
import { Menu, Bell, ChevronDown, LogOut, User, Settings, CheckCheck, Shield } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Avatar } from '../ui/avatar'
import { Badge } from '../ui/badge'
import { DropdownMenu, DropdownTrigger, DropdownContent, DropdownItem, DropdownSeparator } from '../ui/dropdown-menu'
import { notificationService } from '../../services/notifications'
import { formatDate, roleLabels, normalizeRole } from '../../lib/utils'
import { clearDashboardCache } from '../../services/dashboard'

export function Header({ title, onMenuClick }) {
  const [userName, setUserName] = useState('')
  const [userRole, setUserRole] = useState('')
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifOpen, setNotifOpen] = useState(false)
  const navigate = useNavigate()

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('name, role')
          .eq('id', user.id)
          .single()
        if (data) {
          setUserName(data.name)
          const normalized = normalizeRole(data.role)
          setUserRole(roleLabels[normalized] || roleLabels[data.role] || data.role || '')
        }
      }
    }
    getUser()
    loadNotifications()
  }, [])

  const loadNotifications = async () => {
    try {
      const [list, count] = await Promise.all([
        notificationService.list(),
        notificationService.getUnreadCount(),
      ])
      setNotifications(list)
      setUnreadCount(count)
    } catch (err) {
      console.error(err)
    }
  }

  const handleMarkAllRead = async () => {
    await notificationService.markAllAsRead()
    setUnreadCount(0)
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const handleMarkRead = async (id) => {
    await notificationService.markAsRead(id)
    setUnreadCount(prev => Math.max(0, prev - 1))
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
  }

  const handleLogout = async () => {
    clearDashboardCache()
    await supabase.auth.signOut()
    navigate('/login')
  }

  const typeIcons = {
    nova_os: '📋',
    movimentacao: '➡️',
    proximo_prazo: '⏰',
    atrasada: '🔴',
    finalizada: '✅',
    pausada: '⏸️',
    info: 'ℹ️',
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card-bg px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-gray-100 transition-colors lg:hidden cursor-pointer"
        >
          <Menu size={18} className="text-text-secondary" />
        </button>
        <h1 className="text-lg lg:text-xl font-bold text-text-primary">{title || 'Dashboard'}</h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Notifications Dropdown */}
        <div className="relative">
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative flex h-9 w-9 items-center justify-center rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <Bell size={18} className="text-text-secondary" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-primary text-[9px] font-bold text-white px-1">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </button>

          {notifOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />
              <div className="absolute right-0 top-full mt-2 z-50 w-80 sm:w-96 rounded-xl border border-border bg-card-bg shadow-xl">
                <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                  <h3 className="text-sm font-semibold text-text-primary">Notificações</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors cursor-pointer"
                    >
                      <CheckCheck size={14} />
                      Marcar todas como lidas
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-text-muted">
                      <Bell size={24} className="mb-2 opacity-40" />
                      <p className="text-sm">Nenhuma notificação</p>
                    </div>
                  ) : (
                    notifications.map((notif) => (
                      <button
                        key={notif.id}
                        onClick={() => {
                          handleMarkRead(notif.id)
                          if (notif.link) navigate(notif.link)
                          setNotifOpen(false)
                        }}
                        className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors border-b border-border/50 last:border-none cursor-pointer ${!notif.read ? 'bg-primary/5' : ''}`}
                      >
                        <span className="mt-0.5 text-base flex-shrink-0">{typeIcons[notif.type] || typeIcons.info}</span>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${!notif.read ? 'font-semibold text-text-primary' : 'text-text-secondary'}`}>
                            {notif.title}
                          </p>
                          <p className="text-xs text-text-muted mt-0.5 line-clamp-2">{notif.message}</p>
                          <p className="text-[11px] text-text-muted/60 mt-1">{formatDate(notif.created_at)}</p>
                        </div>
                        {!notif.read && (
                          <span className="mt-1.5 h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                        )}
                      </button>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <DropdownMenu>
          {({ open, setOpen }) => (
            <>
              <DropdownTrigger open={open} setOpen={setOpen} className="flex items-center gap-3 rounded-xl hover:bg-gray-100 pl-2 pr-3 py-1.5 transition-colors">
                <Avatar name={userName || 'U'} size="sm" color="primary" />
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-text-primary leading-tight">{userName || 'Usuário'}</p>
                  <div className="flex items-center gap-1 text-xs text-text-muted">
                    <Shield size={10} />
                    {userRole}
                  </div>
                </div>
                <ChevronDown size={14} className="text-text-muted hidden sm:block" />
              </DropdownTrigger>
              <DropdownContent open={open}>
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-sm font-medium text-text-primary">{userName || 'Usuário'}</p>
                  <div className="flex items-center gap-1 text-xs text-text-muted mt-0.5">
                    <Shield size={10} />
                    {userRole}
                  </div>
                </div>
                <DropdownItem onClick={() => navigate('/settings')}>
                  <User size={16} /> Meu Perfil
                </DropdownItem>
                <DropdownItem onClick={() => navigate('/settings')}>
                  <Settings size={16} /> Configurações
                </DropdownItem>
                <DropdownSeparator />
                <DropdownItem onClick={handleLogout}>
                  <LogOut size={16} /> Sair
                </DropdownItem>
              </DropdownContent>
            </>
          )}
        </DropdownMenu>
      </div>
    </header>
  )
}
