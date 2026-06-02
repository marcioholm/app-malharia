import { supabase } from '../lib/supabase'

export const notificationService = {
  async list() {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    if (error) throw error
    return data
  },

  async getUnreadCount() {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('read', false)
    if (error) throw error
    return count || 0
  },

  async markAsRead(id) {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id)
    if (error) throw error
  },

  async markAllAsRead() {
    const { error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('read', false)
    if (error) throw error
  },

  async create(notification) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error } = await supabase
      .from('notifications')
      .insert({ ...notification, user_id: user.id })
    if (error) console.error('Erro ao criar notificação:', error)
  },
}
