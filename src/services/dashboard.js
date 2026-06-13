import { supabase } from '../lib/supabase'

let cachedFilter = null

async function getCompanyFilter() {
  if (cachedFilter) return cachedFilter
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id, role')
    .eq('id', user.id)
    .single()

  if (!profile) return null
  cachedFilter = profile.role === 'super_admin' ? null : profile.company_id
  return cachedFilter
}

export function clearDashboardCache() {
  cachedFilter = null
}

const stageNamePosition = [
  'Aprovação de Orçamento',
  'Desenho',
  'Impressão',
  'Calandra',
  'Corte',
  'Costura',
  'Acabamento',
  'Finalizado',
]

export const dashboardService = {
  async getMetrics() {
    const now = new Date().toISOString()
    const companyId = await getCompanyFilter()

    const buildQuery = (q) => {
      if (companyId) q = q.eq('company_id', companyId)
      return q
    }

    const [{ count: openCount }, { count: inProductionCount }, { count: finishedCount }] = await Promise.all([
      buildQuery(supabase.from('production_orders').select('*', { count: 'exact', head: true })).eq('status', 'aberta'),
      buildQuery(supabase.from('production_orders').select('*', { count: 'exact', head: true })).eq('status', 'em_producao'),
      buildQuery(supabase.from('production_orders').select('*', { count: 'exact', head: true })).in('status', ['finalizada', 'entregue']),
    ])

    let delayedQuery = supabase
      .from('production_orders')
      .select('*', { count: 'exact', head: true })
      .lt('delivery_date', now)
      .filter('status', 'not.in', '(finalizada,entregue,cancelada)')
    if (companyId) delayedQuery = delayedQuery.eq('company_id', companyId)
    const { count: delayedCount } = await delayedQuery

    let monthQuery = supabase
      .from('production_orders')
      .select('total_price, entry_amount, remaining_amount, payment_status')
      .gte('created_at', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())
    if (companyId) monthQuery = monthQuery.eq('company_id', companyId)
    const { data: monthOrders } = await monthQuery

    const totalMonthValue = monthOrders?.reduce((s, o) => s + Number(o.total_price || 0), 0) || 0
    const totalReceived = monthOrders?.reduce((s, o) => s + Number(o.entry_amount || 0), 0) || 0
    const totalPending = monthOrders?.filter(o => o.payment_status !== 'pago').reduce((s, o) => s + Number(o.remaining_amount || 0), 0) || 0

    return {
      open: openCount || 0,
      inProduction: inProductionCount || 0,
      finished: finishedCount || 0,
      delayed: delayedCount || 0,
      monthValue: totalMonthValue,
      totalReceived,
      totalPending,
    }
  },

  async getProductionByStage() {
    const companyId = await getCompanyFilter()

    let query = supabase
      .from('production_orders')
      .select('current_stage, status')
      .in('status', ['aberta', 'em_producao', 'pausada'])
    if (companyId) query = query.eq('company_id', companyId)

    const { data: orders } = await query
    if (!orders) return []

    const countMap = {}
    orders.forEach(o => {
      const stage = o.current_stage || 'Sem fase'
      countMap[stage] = (countMap[stage] || 0) + 1
    })

    return stageNamePosition
      .filter(name => countMap[name])
      .map(name => ({ name, value: countMap[name] || 0 }))
  },

  async getLatestOrders(limit = 5) {
    let query = supabase
      .from('production_orders')
      .select('*, clients(name), products(name)')
      .order('created_at', { ascending: false })
      .limit(limit)

    const companyId = await getCompanyFilter()
    if (companyId) query = query.eq('company_id', companyId)

    const { data, error } = await query
    if (error) throw error
    return data
  },

  async getUpcomingDeadlines(limit = 5) {
    const now = new Date().toISOString()
    const threeDaysLater = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString()

    let query = supabase
      .from('production_orders')
      .select('*, clients(name), products(name)')
      .gte('delivery_date', now)
      .lte('delivery_date', threeDaysLater)
      .filter('status', 'not.in', '(finalizada,entregue,cancelada)')
      .order('delivery_date', { ascending: true })
      .limit(limit)

    const companyId = await getCompanyFilter()
    if (companyId) query = query.eq('company_id', companyId)

    const { data, error } = await query
    if (error) throw error
    return data
  },

  async getDelayedOrders(limit = 5) {
    const now = new Date().toISOString()

    let query = supabase
      .from('production_orders')
      .select('*, clients(name), products(name)')
      .lt('delivery_date', now)
      .filter('status', 'not.in', '(finalizada,entregue,cancelada)')
      .order('delivery_date', { ascending: true })
      .limit(limit)

    const companyId = await getCompanyFilter()
    if (companyId) query = query.eq('company_id', companyId)

    const { data, error } = await query
    if (error) throw error
    return data
  },
}
