import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Building2, User, Settings as SettingsIcon, ChevronRight, Shield, Users } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { supabase } from '../lib/supabase'
import { roleLabels, normalizeRole } from '../lib/utils'

export function Settings() {
  const [profile, setProfile] = useState(null)
  const navigate = useNavigate()

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { data } = await supabase
          .from('profiles')
          .select('*, companies(name)')
          .eq('id', user.id)
          .single()
        setProfile(data)
      }
    }
    load()
  }, [])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Configurações</h1>
        <p className="text-sm text-text-muted mt-1">Informações da empresa e do usuário</p>
      </div>

      <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
        <button
          onClick={() => navigate('/settings/company')}
          className="text-left rounded-2xl border border-border bg-card-bg p-6 shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-200 cursor-pointer group"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-bg mb-3">
                <Building2 size={24} className="text-primary" />
              </div>
              <h3 className="text-base font-semibold text-text-primary group-hover:text-primary transition-colors">Minha Empresa</h3>
              <p className="text-sm text-text-muted">Dados institucionais, logo, endereço e contato</p>
            </div>
            <ChevronRight size={18} className="text-text-muted group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </div>
          {profile?.companies && (
            <p className="text-xs text-text-muted mt-4 pt-4 border-t border-border-light">{profile.companies.name}</p>
          )}
        </button>

        <button
          onClick={() => navigate('/settings/users')}
          className="text-left rounded-2xl border border-border bg-card-bg p-6 shadow-sm hover:shadow-md hover:border-primary/30 transition-all duration-200 cursor-pointer group"
        >
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-primary-bg mb-3">
                <Users size={24} className="text-primary" />
              </div>
              <h3 className="text-base font-semibold text-text-primary group-hover:text-primary transition-colors">Usuários</h3>
              <p className="text-sm text-text-muted">Gerenciar usuários, funções e permissões</p>
            </div>
            <ChevronRight size={18} className="text-text-muted group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
          </div>
          {profile?.companies && (
            <p className="text-xs text-text-muted mt-4 pt-4 border-t border-border-light">{profile.companies.name}</p>
          )}
        </button>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User size={16} className="text-primary" />
              Meu Perfil
            </CardTitle>
          </CardHeader>
          <CardContent>
            {profile ? (
              <div className="space-y-3 text-sm">
                <div>
                  <p className="text-text-muted">Nome</p>
                  <p className="font-medium text-text-primary">{profile.name}</p>
                </div>
                <div>
                  <p className="text-text-muted">Email</p>
                  <p className="font-medium text-text-primary">{profile.email}</p>
                </div>
                <div>
                  <p className="text-text-muted">Função</p>
                  <p className="font-medium text-text-primary">
                    <Badge variant="primary">
                      <Shield size={12} className="mr-1" />
                      {roleLabels[profile.role] || roleLabels[normalizeRole(profile.role)] || profile.role || '—'}
                    </Badge>
                  </p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-text-muted">Carregando...</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
