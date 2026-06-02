import { useEffect, useState } from 'react'
import { Bell, ChevronDown, LogOut, User, Settings, CheckCheck, ExternalLink } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { Avatar } from '../ui/avatar'
import { DropdownMenu, DropdownTrigger, DropdownContent, DropdownItem, DropdownSeparator } from '../ui/dropdown-menu'
import { notificationService } from '../../services/notifications'
import { formatDate } from '../../lib/utils'

export function Header({ title }) {
  const [userName, setUserName] = useState('')
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
          .select('name')
          .eq('id', user.id)
          .single()
        if (data) setUserName(data.name)
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

  const typeColors = {
    nova_os: 'bg-primary-bg border-primary/20',
    movimentacao: 'bg-info-bg border-info/20',
    proximo_prazo: 'bg-warning-bg border-warning/20',
    atrasada: 'bg-danger-bg border-danger/20',
    finalizada: 'bg-success-bg border-success/20',
    pausada: 'bg-gray-100 border-border',
    info: 'bg-primary-bg border-primary/20',
  }

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card-bg px-6 lg:px-8">
      <div className="lg:hidden" />
      <h1 className="text-xl font-bold text-text-primary hidden lg:block">{title || 'Dashboard'}</h1>

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
              <div className="absolute right-0 top-full mt-2 z-50 w-80 sm:w-96 rounded-2xl border border-border bg-card-bg shadow-xl">
                <div className="flex items-center justify-between p-4 border-b border-border">
                  <h3 className="text-sm font-semibold text-text-primary">Notificações</h3>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      className="flex items-center gap-1 text-xs text-primary hover:text-primary-dark font-medium cursor-pointer"
                    >
                      <CheckCheck size={14} /> Marcar todas como lidas
                    </button>
                  )}
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.slice(0, 20).map((n) => (
                      <button
                        key={n.id}
                        onClick={() => {
                          handleMarkRead(n.id)
                          if (n.link) navigate(n.link)
                          setNotifOpen(false)
                        }}
                        className={`w-full text-left p-4 border-b border-border-light hover:bg-gray-50 transition-colors cursor-pointer ${!n.read ? 'bg-primary-bg/30' : ''}`}
                      >
                        <div className="flex items-start gap-3">
                          <span className="text-lg shrink-0 mt-0.5">{typeIcons[n.type] || 'ℹ️'}</span>
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm ${!n.read ? 'font-semibold text-text-primary' : 'text-text-secondary'}`}>
                              {n.title}
                            </p>
                            {n.message && (
                              <p className="text-xs text-text-muted mt-0.5 line-clamp-2">{n.message}</p>
                            )}
                            <p className="text-xs text-text-muted mt-1">{formatDate(n.created_at)}</p>
                          </div>
                          {!n.read && (
                            <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-2" />
                          )}
                        </div>
                      </button>
                    ))
                  ) : (
                    <div className="py-8 text-center">
                      <div className="h-12 w-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                        <Bell size={20} className="text-text-muted" />
                      </div>
                      <p className="text-sm text-text-muted">Nenhuma notificação</p>
                    </div>
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
                  <p className="text-xs text-text-muted">Admin</p>
                </div>
                <ChevronDown size={14} className="text-text-muted hidden sm:block" />
              </DropdownTrigger>
              <DropdownContent open={open}>
                <div className="px-4 py-3 border-b border-border">
                  <p className="text-sm font-medium text-text-primary">{userName || 'Usuário'}</p>
                  <p className="text-xs text-text-muted">admin@confeccao.com</p>
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
