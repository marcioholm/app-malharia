import { supabase } from '../lib/supabase'

export const dashboardService = {
  async getMetrics() {
    const now = new Date().toISOString()

    const [{ count: openCount }, { count: inProductionCount }, { count: finishedCount }, { count: delayedCount }] = await Promise.all([
      supabase.from('production_orders').select('*', { count: 'exact', head: true }).eq('status', 'aberta'),
      supabase.from('production_orders').select('*', { count: 'exact', head: true }).eq('status', 'em_producao'),
      supabase.from('production_orders').select('*', { count: 'exact', head: true }).in('status', ['finalizada', 'entregue']),
      supabase.from('production_orders').select('*', { count: 'exact', head: true }).lt('delivery_date', now).not('status', 'in', ['finalizada', 'entregue', 'cancelada']),
    ])

    const { data: monthOrders } = await supabase
      .from('production_orders')
      .select('total_price')
      .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())

    const totalMonthValue = monthOrders?.reduce((s, o) => s + Number(o.total_price || 0), 0) || 0

    return {
      open: openCount || 0,
      inProduction: inProductionCount || 0,
      finished: finishedCount || 0,
      delayed: delayedCount || 0,
      monthValue: totalMonthValue,
    }
  },

  async getProductionByStage() {
    const { data: stages } = await supabase
      .from('production_stages')
      .select('*')
      .order('position')

    if (!stages) return []

    const result = []
    for (const stage of stages) {
      const { count } = await supabase
        .from('production_orders')
        .select('*', { count: 'exact', head: true })
        .eq('current_stage', stage.name)
        .in('status', ['aberta', 'em_producao', 'pausada'])

      result.push({ name: stage.name, value: count || 0 })
    }

    return result
  },

  async getLatestOrders(limit = 5) {
    const { data, error } = await supabase
      .from('production_orders')
      .select('*, clients(name), products(name)')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return data
  },

  async getUpcomingDeadlines(limit = 5) {
    const now = new Date().toISOString()
    const threeDaysLater = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()

    const { data, error } = await supabase
      .from('production_orders')
      .select('*, clients(name), products(name)')
      .gte('delivery_date', now)
      .lte('delivery_date', threeDaysLater)
      .not('status', 'in', ['finalizada', 'entregue', 'cancelada'])
      .order('delivery_date', { ascending: true })
      .limit(limit)
    if (error) throw error
    return data
  },

  async getDelayedOrders(limit = 5) {
    const now = new Date().toISOString()

    const { data, error } = await supabase
      .from('production_orders')
      .select('*, clients(name), products(name)')
      .lt('delivery_date', now)
      .not('status', 'in', ['finalizada', 'entregue', 'cancelada'])
      .order('delivery_date', { ascending: true })
      .limit(limit)
    if (error) throw error
    return data
  },
}
