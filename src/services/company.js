import { supabase } from '../lib/supabase'

async function getProfile() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('profiles')
    .select('company_id, role')
    .eq('id', user.id)
    .single()
  return data
}

export const companyService = {
  async getSettings() {
    const profile = await getProfile()
    if (!profile) return null

    let query = supabase
      .from('company_settings')
      .select('*')

    if (profile.role !== 'super_admin') {
      query = query.eq('company_id', profile.company_id)
    }

    const { data, error } = await query.limit(1).maybeSingle()
    if (error) throw error
    return data
  },

  async saveSettings(settings) {
    const profile = await getProfile()
    if (!profile) throw new Error('Usuário não autenticado')

    const existing = await companyService.getSettings()
    let result

    const dataToSave = { ...settings, company_id: profile.company_id }

    if (existing) {
      const { data, error } = await supabase
        .from('company_settings')
        .update(dataToSave)
        .eq('id', existing.id)
        .select()
        .single()
      if (error) throw error
      result = data
    } else {
      const { data, error } = await supabase
        .from('company_settings')
        .insert(dataToSave)
        .select()
        .single()
      if (error) throw error
      result = data
    }

    // Also update companies table
    if (settings.trade_name || settings.company_name || settings.cnpj) {
      const companyUpdate = {}
      if (settings.trade_name) companyUpdate.trade_name = settings.trade_name
      if (settings.company_name) companyUpdate.legal_name = settings.company_name
      if (settings.cnpj) companyUpdate.cnpj = settings.cnpj

      if (Object.keys(companyUpdate).length > 0) {
        await supabase
          .from('companies')
          .update(companyUpdate)
          .eq('id', profile.company_id)
      }
    }

    return result
  },

  async uploadLogo(file) {
    const ext = file.name.split('.').pop()
    const filePath = `logo-empresa.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('logos')
      .upload(filePath, file, {
        upsert: true,
        contentType: file.type,
      })
    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage
      .from('logos')
      .getPublicUrl(filePath)

    // Save logo URL to company_settings
    const settings = await companyService.getSettings()
    if (settings) {
      await supabase
        .from('company_settings')
        .update({ logo_url: publicUrl })
        .eq('id', settings.id)
    }

    // Also update companies table
    const profile = await getProfile()
    if (profile) {
      await supabase
        .from('companies')
        .update({ logo_url: publicUrl })
        .eq('id', profile.company_id)
    }

    return publicUrl
  },

  async removeLogo(logoUrl) {
    if (!logoUrl) return
    try {
      const url = new URL(logoUrl)
      const path = url.pathname.split('/').pop()
      if (!path) return
      const { error } = await supabase.storage.from('logos').remove([path])
      if (error && error.statusCode !== '404' && !error.message?.includes('not found')) {
        console.error('Erro ao remover logo:', error)
      }
    } catch (err) {
      console.error('Erro ao processar URL da logo:', err)
    }
  },

  async listAll() {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .order('name')
    if (error) throw error
    return data
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  async create(company) {
    const { data, error } = await supabase
      .from('companies')
      .insert(company)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async update(id, company) {
    const { data, error } = await supabase
      .from('companies')
      .update(company)
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },

  async toggleActive(id, isActive) {
    const { data, error } = await supabase
      .from('companies')
      .update({ is_active: isActive })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  },
}
