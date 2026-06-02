import { supabase } from '../lib/supabase'

export const companyService = {
  async getSettings() {
    const { data, error } = await supabase
      .from('company_settings')
      .select('*')
      .limit(1)
      .maybeSingle()
    if (error) throw error
    return data
  },

  async saveSettings(settings) {
    const existing = await companyService.getSettings()
    let result
    if (existing) {
      const { data, error } = await supabase
        .from('company_settings')
        .update(settings)
        .eq('id', existing.id)
        .select()
        .single()
      if (error) throw error
      result = data
    } else {
      const { data, error } = await supabase
        .from('company_settings')
        .insert(settings)
        .select()
        .single()
      if (error) throw error
      result = data
    }
    return result
  },

  async uploadLogo(file) {
    const ext = file.name.split('.').pop()
    const filePath = `logo-${Date.now()}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('logos')
      .upload(filePath, file, { upsert: true })
    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage
      .from('logos')
      .getPublicUrl(filePath)

    return publicUrl
  },

  async removeLogo(filePath) {
    const path = filePath?.split('/logos/').pop()
    if (!path) return
    await supabase.storage.from('logos').remove([path])
  },
}
