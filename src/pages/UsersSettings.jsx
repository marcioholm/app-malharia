import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { UserPlus, Shield, ChevronLeft, ChevronDown, ChevronUp, User, Mail, Key, Check, X, Loader2, Info } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { supabase } from '../lib/supabase'
import { authService, normalizeRole } from '../services/auth'
import { roleLabels } from '../lib/utils'

const roleOptions = [
  { value: 'admin_empresa', label: 'Admin Empresa', color: 'bg-purple-100 text-purple-700' },
  { value: 'gerente', label: 'Gerente', color: 'bg-blue-100 text-blue-700' },
  { value: 'vendedor', label: 'Vendedor', color: 'bg-green-100 text-green-700' },
  { value: 'producao', label: 'Produção', color: 'bg-amber-100 text-amber-700' },
  { value: 'visualizador', label: 'Visualizador', color: 'bg-gray-100 text-gray-700' },
]

const rolePermissions = [
  {
    role: 'admin_empresa',
    label: 'Admin Empresa',
    color: 'bg-purple-100 text-purple-700 border-purple-200',
    icon: 'bg-purple-500',
    permissions: [
      'Criar, editar e excluir OS',
      'Gerenciar clientes e produtos',
      'Gerenciar usuários e permissões',
      'Acessar relatórios financeiros',
      'Configurar dados da empresa',
    ],
  },
  {
    role: 'gerente',
    label: 'Gerente',
    color: 'bg-blue-100 text-blue-700 border-blue-200',
    icon: 'bg-blue-500',
    permissions: [
      'Criar e editar OS',
      'Gerenciar produção (avançar/voltar fases)',
      'Visualizar relatórios',
    ],
  },
  {
    role: 'vendedor',
    label: 'Vendedor',
    color: 'bg-green-100 text-green-700 border-green-200',
    icon: 'bg-green-500',
    permissions: [
      'Criar OS',
      'Definir valores financeiros (entrada, forma pagamento)',
      'Visualizar próprias vendas',
    ],
  },
  {
    role: 'producao',
    label: 'Produção',
    color: 'bg-amber-100 text-amber-700 border-amber-200',
    icon: 'bg-amber-500',
    permissions: [
      'Avançar/voltar fases da produção',
      'Atualizar status das OS',
    ],
  },
  {
    role: 'visualizador',
    label: 'Visualizador',
    color: 'bg-gray-100 text-gray-700 border-gray-200',
    icon: 'bg-gray-500',
    permissions: [
      'Visualizar OS, clientes e produtos',
      'Sem permissão para criar ou editar',
    ],
  },
]

export function UsersSettings() {
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [showRoleInfo, setShowRoleInfo] = useState(false)
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'visualizador' })
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: prof } = await supabase
        .from('profiles')
        .select('*, companies(name)')
        .eq('id', user.id)
        .single()
      setProfile(prof)

      if (prof) {
        const { data } = await supabase
          .from('profiles')
          .select('id, name, email, role, status')
          .eq('company_id', prof.company_id)
          .order('name')
        setUsers(data || [])
      }
      setLoading(false)
    }
    load()
  }, [])

  const userRole = normalizeRole(profile?.role)
  const canManage = userRole === 'super_admin' || userRole === 'admin_empresa'
  const availableRoles = userRole === 'super_admin'
    ? roleOptions
    : roleOptions.filter(r => r.value !== 'admin_empresa')

  const handleRoleChange = async (userId, newRole) => {
    setSaving(userId)
    try {
      await supabase.from('profiles').update({ role: newRole }).eq('id', userId)
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
      toast.success('Função atualizada')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(null)
    }
  }

  const handleStatusToggle = async (userId, currentStatus) => {
    setSaving(userId)
    const newStatus = currentStatus === 'ativo' ? 'inativo' : 'ativo'
    try {
      await supabase.from('profiles').update({ status: newStatus }).eq('id', userId)
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus } : u))
      toast.success(newStatus === 'ativo' ? 'Usuário ativado' : 'Usuário desativado')
    } catch (err) {
      toast.error(err.message)
    } finally {
      setSaving(null)
    }
  }

  const handleCreate = async (e) => {
    e.preventDefault()
    if (!form.name || !form.email || !form.password) {
      toast.error('Preencha todos os campos')
      return
    }
    if (form.password.length < 6) {
      toast.error('Senha deve ter no mínimo 6 caracteres')
      return
    }
    setCreating(true)
    try {
      await authService.createUser(form.email, form.password, form.name, form.role)
      toast.success('Usuário criado com sucesso!')
      setShowForm(false)
      setForm({ name: '', email: '', password: '', role: 'visualizador' })
      const { data } = await supabase
        .from('profiles')
        .select('id, name, email, role, status')
        .eq('company_id', profile.company_id)
        .order('name')
      setUsers(data || [])
    } catch (err) {
      toast.error(err.message)
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><Loader2 size={24} className="animate-spin text-text-muted" /></div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <button onClick={() => navigate('/settings')} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl hover:bg-gray-100 transition-colors cursor-pointer">
          <ChevronLeft size={18} className="text-text-secondary" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Usuários</h1>
          <p className="text-sm text-text-muted mt-1">Gerenciar usuários e permissões da empresa</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card-bg overflow-hidden">
        <button
          onClick={() => setShowRoleInfo(!showRoleInfo)}
          className="flex w-full items-center justify-between p-4 text-left hover:bg-gray-50 transition-colors cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Info size={16} className="text-primary" />
            <span className="text-sm font-medium text-text-primary">Níveis de acesso por função</span>
          </div>
          {showRoleInfo ? <ChevronUp size={16} className="text-text-muted" /> : <ChevronDown size={16} className="text-text-muted" />}
        </button>
        {showRoleInfo && (
          <div className="px-4 pb-4 grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {rolePermissions.filter(r => {
              if (userRole === 'super_admin') return true
              return r.role !== 'admin_empresa'
            }).map(r => (
              <div key={r.role} className={`rounded-xl border p-3 ${r.color}`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-2.5 h-2.5 rounded-full ${r.icon}`} />
                  <span className="text-xs font-bold">{r.label}</span>
                </div>
                <ul className="space-y-1">
                  {r.permissions.map((p, i) => (
                    <li key={i} className="text-xs flex items-start gap-1.5">
                      <span className="mt-0.5">•</span>
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <User size={16} className="text-primary" />
              {users.length} {users.length === 1 ? 'usuário' : 'usuários'}
            </CardTitle>
            {canManage && (
              <Button onClick={() => setShowForm(!showForm)} disabled={showForm}>
                <UserPlus size={16} /> Novo Usuário
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {showForm && (
            <form onSubmit={handleCreate} className="mb-6 p-4 rounded-2xl bg-gray-50 border border-border space-y-4">
              <h3 className="text-sm font-semibold text-text-primary">Criar Novo Usuário</h3>
              <div className="grid gap-4 grid-cols-1 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="user-name" className="text-xs font-medium text-text-muted flex items-center gap-1.5"><User size={12} /> Nome</label>
                  <Input id="user-name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Nome completo" />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="user-email" className="text-xs font-medium text-text-muted flex items-center gap-1.5"><Mail size={12} /> Email</label>
                  <Input id="user-email" type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="email@exemplo.com" />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="user-password" className="text-xs font-medium text-text-muted flex items-center gap-1.5"><Key size={12} /> Senha</label>
                  <Input id="user-password" type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} placeholder="Mínimo 6 caracteres" />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="user-role" className="text-xs font-medium text-text-muted flex items-center gap-1.5"><Shield size={12} /> Função</label>
                  <select id="user-role" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} className="flex h-10 w-full rounded-xl border border-border bg-white px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors">
                    {availableRoles.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={creating}>
                  {creating ? <Loader2 size={16} className="animate-spin" /> : <UserPlus size={16} />}
                  {creating ? 'Criando...' : 'Criar Usuário'}
                </Button>
                <Button type="button" variant="outline" onClick={() => { setShowForm(false); setForm({ name: '', email: '', password: '', role: 'visualizador' }) }}>
                  Cancelar
                </Button>
              </div>
            </form>
          )}

          {users.length === 0 ? (
            <p className="text-sm text-text-muted py-8 text-center">Nenhum usuário encontrado</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left text-xs font-medium text-text-muted pb-3 pr-4">Usuário</th>
                    <th className="text-left text-xs font-medium text-text-muted pb-3 pr-4">Email</th>
                    <th className="text-left text-xs font-medium text-text-muted pb-3 pr-4">Função</th>
                    <th className="text-left text-xs font-medium text-text-muted pb-3 pr-4">Status</th>
                    {canManage && <th className="text-right text-xs font-medium text-text-muted pb-3">Ações</th>}
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} className="border-b border-border-light hover:bg-gray-50/50 transition-colors">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-bg text-primary text-sm font-semibold">
                            {u.name?.charAt(0).toUpperCase() || '?'}
                          </div>
                          <span className="text-sm font-medium text-text-primary">{u.name}</span>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-sm text-text-muted">{u.email}</td>
                      <td className="py-3 pr-4">
                        {canManage ? (
                          <select
                            value={u.role}
                            onChange={e => handleRoleChange(u.id, e.target.value)}
                            disabled={saving === u.id}
                            className="text-xs rounded-lg border border-border bg-white px-2 py-1 outline-none focus:border-primary cursor-pointer"
                          >
                            {availableRoles.map(r => (
                              <option key={r.value} value={r.value} disabled={r.value === 'admin_empresa' && profile?.id !== u.id}>{r.label}</option>
                            ))}
                          </select>
                        ) : (
                          <Badge variant="primary" className="text-xs">
                            <Shield size={10} className="mr-1" />
                            {roleLabels[u.role] || u.role}
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 pr-4">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                          u.status === 'ativo' ? 'bg-success-bg text-success' : 'bg-danger-bg text-danger'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${u.status === 'ativo' ? 'bg-success' : 'bg-danger'}`} />
                          {u.status === 'ativo' ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      {canManage && (
                        <td className="py-3 text-right">
                          <button
                            onClick={() => handleStatusToggle(u.id, u.status)}
                            disabled={saving === u.id || profile?.id === u.id}
                            className={`inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                              u.status === 'ativo'
                                ? 'text-danger hover:bg-danger-bg'
                                : 'text-success hover:bg-success-bg'
                            } disabled:opacity-40 disabled:cursor-not-allowed`}
                            title={u.status === 'ativo' ? 'Desativar usuário' : 'Ativar usuário'}
                          >
                            {saving === u.id ? <Loader2 size={12} className="animate-spin" /> : u.status === 'ativo' ? <X size={12} /> : <Check size={12} />}
                            {u.status === 'ativo' ? 'Desativar' : 'Ativar'}
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
