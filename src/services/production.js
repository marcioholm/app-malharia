import { supabase } from '../lib/supabase'

export const productionService = {
  async getOrdersByStage(filters = {}) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return []

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single()

    const { data: stages } = await supabase
      .from('production_stages')
      .select('*')
      .order('position')

    if (!stages) return []

    const result = []
    for (const stage of stages) {
      let query = supabase
        .from('production_orders')
        .select('*, clients(name), products(name), production_order_stages(*, production_stages(*)), seller:profiles!seller_id(name)')
        .eq('current_stage', stage.name)
        .in('status', ['aberta', 'em_producao', 'pausada', 'finalizada', 'entregue'])
        .order('priority', { ascending: false })

      if (profile && profile.role !== 'super_admin') {
        query = query.eq('company_id', profile.company_id)
      }

      if (filters.search) {
        query = query.or(
          `order_number.ilike.%${filters.search}%,` +
          `clients.name.ilike.%${filters.search}%,` +
          `products.name.ilike.%${filters.search}%`
        )
      }

      const { data: orders } = await query
      result.push({
        stage,
        orders: orders || [],
      })
    }

    return result
  },

  async updateStageResponsible(stageId, responsibleId) {
    const { error } = await supabase
      .from('production_order_stages')
      .update({ responsible_id: responsibleId })
      .eq('id', stageId)
    if (error) throw error
  },

  async updateStageNotes(stageId, notes) {
    const { error } = await supabase
      .from('production_order_stages')
      .update({ notes })
      .eq('id', stageId)
    if (error) throw error
  },
}
