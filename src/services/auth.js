import { supabase } from '../lib/supabase'

const roleMap = {
  admin: 'admin_empresa',
  manager: 'gerente',
  seller: 'vendedor',
  operator: 'producao',
  user: 'visualizador',
}

export function normalizeRole(role) {
  if (!role) return 'visualizador'
  return roleMap[role] || role
}

export const authService = {
  async login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    return data
  },

  async logout() {
    await supabase.auth.signOut()
  },

  async getCurrentUser() {
    const { data: { user } } = await supabase.auth.getUser()
    return user
  },

  async getProfile(userId) {
    const { data, error } = await supabase
      .from('profiles')
      .select('*, companies(name, trade_name, logo_url, cnpj, is_active)')
      .eq('id', userId)
      .single()
    if (error) throw error
    return data
  },

  async getCompanyUsers(companyId) {
    let query = supabase
      .from('profiles')
      .select('id, name, email, role, status')
      .order('name')

    if (companyId) {
      query = query.eq('company_id', companyId)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  },

  async getUsersByRole(roles) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!profile) return []

    const roleList = Array.isArray(roles) ? roles : [roles]
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, email, role')
      .eq('company_id', profile.company_id)
      .in('role', roleList)
      .eq('status', 'ativo')
      .order('name')

    if (error) throw error
    return data
  },

  async updateProfile(userId, updates) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async createUser(email, password, name, role = 'visualizador') {
    const { data, error } = await supabase.rpc('admin_create_user', {
      p_email: email,
      p_password: password,
      p_name: name,
      p_role: role,
    })
    if (error) throw error
    return data
  },

  async getAvailableRoles(userRole) {
    const hierarchy = {
      super_admin: ['super_admin', 'admin_empresa', 'gerente', 'vendedor', 'producao', 'visualizador'],
      admin_empresa: ['gerente', 'vendedor', 'producao', 'visualizador'],
    }
    return hierarchy[userRole] || []
  },

  async can(action, profile) {
    if (!profile) return false
    const role = normalizeRole(profile.role)
    if (role === 'super_admin') return true

    const permissions = {
      super_admin: ['*'],
      admin_empresa: [
        'create_os', 'edit_os', 'delete_os', 'manage_users', 'manage_clients',
        'manage_products', 'view_reports', 'manage_company', 'edit_commission',
        'approve_budget',
      ],
      gerente: ['create_os', 'edit_os', 'manage_production', 'view_reports'],
      vendedor: ['create_os', 'view_own_sales', 'set_financial'],
      producao: ['update_stage', 'update_status'],
      visualizador: ['view_only'],
    }

    const userPermissions = permissions[role] || []
    return userPermissions.includes('*') || userPermissions.includes(action)
  },
}
