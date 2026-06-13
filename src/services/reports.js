import { supabase } from '../lib/supabase'

async function getUserCompanyId() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('profiles')
    .select('company_id, role')
    .eq('id', user.id)
    .single()
  return data
}

const stageOrder = ['Desenho', 'Impressao', 'Calandra', 'Corte', 'Costura', 'Acabamento']

export const reportsService = {
  // ─── EXISTENTES (com company_id filter) ──────────────────

  async getExecutiveDashboard(period = 'month') {
    const now = new Date()
    const startDate = getPeriodStart(now, period)
    const { company_id, role } = await getUserCompanyId()

    let query = supabase.from('production_orders').select('id, status, total_price, entry_amount, remaining_amount, payment_status, quantity, delivery_date, entry_date, created_at, seller_id')
    if (company_id && role !== 'super_admin') query = query.eq('company_id', company_id)

    const { data: orders } = await query
    if (!orders) return { totalOpen: 0, totalInProduction: 0, totalFinished: 0, totalDelayed: 0, monthProduction: 0, inProductionValue: 0, periodValue: 0, avgTicket: 0, totalReceived: 0, totalPending: 0 }

    const finished = orders.filter(o => ['finalizada', 'entregue'].includes(o.status))
    const inProduction = orders.filter(o => o.status === 'em_producao')
    const open = orders.filter(o => o.status === 'aberta')
    const delayed = orders.filter(o =>
      !['finalizada', 'entregue', 'cancelada'].includes(o.status) &&
      o.delivery_date && new Date(o.delivery_date) < now
    )
    const periodOrders = orders.filter(o => new Date(o.created_at) >= startDate)
    const finishedPeriod = finished.filter(o => new Date(o.created_at) >= startDate)
    const inProdValue = inProduction.reduce((s, o) => s + Number(o.total_price || 0), 0)
    const periodValue = periodOrders.reduce((s, o) => s + Number(o.total_price || 0), 0)
    const finishedValue = finishedPeriod.reduce((s, o) => s + Number(o.total_price || 0), 0)
    const avgTicket = periodOrders.length > 0 ? periodValue / periodOrders.length : 0
    const totalReceived = orders.reduce((s, o) => s + Number(o.entry_amount || 0), 0)
    const totalPending = orders.filter(o => o.payment_status !== 'pago').reduce((s, o) => s + Number(o.remaining_amount || 0), 0)

    return {
      totalOpen: open.length,
      totalInProduction: inProduction.length,
      totalFinished: finished.length,
      totalDelayed: delayed.length,
      monthProduction: periodOrders.length,
      inProductionValue: inProdValue,
      periodValue: finishedValue,
      avgTicket,
      totalReceived,
      totalPending,
    }
  },

  async getProductionByStage() {
    const { company_id, role } = await getUserCompanyId()

    const { data: stages } = await supabase
      .from('production_stages')
      .select('*')
      .order('position')
    if (!stages) return []

    let query = supabase.from('production_orders').select('id, current_stage, status, total_price')
    if (company_id && role !== 'super_admin') query = query.eq('company_id', company_id)

    const { data: orders } = await query
      .in('status', ['aberta', 'em_producao', 'pausada'])
    if (!orders) return []

    const { data: stageRecords } = await supabase
      .from('production_order_stages')
      .select('stage_id, order_id, status, started_at, completed_at')
    if (!stageRecords) return []

    const { data: items } = await supabase
      .from('order_items')
      .select('order_id, quantity')

    return stages.map(stage => {
      const osInStage = orders.filter(o => o.current_stage === stage.name)
      const stageRecordsForStage = stageRecords.filter(sr =>
        sr.stage_id === stage.id && osInStage.some(o => o.id === sr.order_id)
      )
      const completedStages = stageRecords.filter(sr =>
        sr.stage_id === stage.id && sr.status === 'concluida' && sr.started_at && sr.completed_at
      )

      let totalPecas = 0
      const orderIdsInStage = new Set(osInStage.map(o => o.id))
      if (items) {
        items.forEach(item => {
          if (orderIdsInStage.has(item.order_id)) {
            totalPecas += Number(item.quantity || 0)
          }
        })
      }

      const avgTimeMs = completedStages.length > 0
        ? completedStages.reduce((s, sr) => s + (new Date(sr.completed_at) - new Date(sr.started_at)), 0) / completedStages.length
        : 0

      return {
        name: stage.name,
        osCount: osInStage.length,
        totalPecas,
        totalValue: osInStage.reduce((s, o) => s + Number(o.total_price || 0), 0),
        avgTimeDays: Math.round(avgTimeMs / (1000 * 60 * 60 * 24) * 10) / 10,
      }
    })
  },

  async getBottlenecks() {
    const stages = await this.getProductionByStage()
    const maxQueue = stages.reduce((best, s) => s.osCount > (best?.osCount || 0) ? s : best, stages[0])
    const maxTime = stages.reduce((best, s) => s.avgTimeDays > (best?.avgTimeDays || 0) ? s : best, stages[0])

    const { company_id, role } = await getUserCompanyId()
    let query = supabase.from('production_orders').select('id', { count: 'exact', head: true }).eq('status', 'pausada')
    if (company_id && role !== 'super_admin') query = query.eq('company_id', company_id)
    const { count: pausedCount } = await query

    return {
      stages,
      bottleneckQueue: maxQueue,
      bottleneckTime: maxTime,
      pausedCount: pausedCount || 0,
    }
  },

  async getDeadlineReport() {
    const now = new Date()
    const sevenDaysLater = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    const { company_id, role } = await getUserCompanyId()

    let query = supabase.from('production_orders').select('id, status, delivery_date, total_price')
    if (company_id && role !== 'super_admin') query = query.eq('company_id', company_id)
    const { data: orders } = await query
    if (!orders) return { onTime: 0, late: 0, currentlyLate: 0, nearDeadline: 0, deliveryRate: 0 }

    const finished = orders.filter(o => ['finalizada', 'entregue'].includes(o.status))
    const onTime = finished.filter(o => !o.delivery_date || new Date(o.delivery_date) >= new Date(o.updated_at || o.created_at))
    const lateDelivered = finished.filter(o => o.delivery_date && new Date(o.delivery_date) < new Date(o.updated_at || o.created_at))
    const currentlyLate = orders.filter(o =>
      !['finalizada', 'entregue', 'cancelada'].includes(o.status) &&
      o.delivery_date && new Date(o.delivery_date) < now
    )
    const nearDeadline = orders.filter(o =>
      !['finalizada', 'entregue', 'cancelada'].includes(o.status) &&
      o.delivery_date && new Date(o.delivery_date) >= now && new Date(o.delivery_date) <= sevenDaysLater
    )

    return {
      onTime: onTime.length,
      lateDelivered: lateDelivered.length,
      currentlyLate: currentlyLate.length,
      nearDeadline: nearDeadline.length,
      deliveryRate: finished.length > 0 ? Math.round((onTime.length / finished.length) * 100) : 100,
    }
  },

  async getClientRanking() {
    const { company_id, role } = await getUserCompanyId()
    let query = supabase.from('production_orders').select('id, client_id, total_price, quantity, clients!inner(name)')
    if (company_id && role !== 'super_admin') query = query.eq('company_id', company_id)

    const { data: orders } = await query
    if (!orders) return []

    const map = {}
    orders.forEach(o => {
      if (!o.client_id) return
      if (!map[o.client_id]) {
        map[o.client_id] = { clientId: o.client_id, name: o.clients?.name || 'Sem nome', osCount: 0, totalPecas: 0, totalValue: 0 }
      }
      map[o.client_id].osCount++
      map[o.client_id].totalPecas += Number(o.quantity || 0)
      map[o.client_id].totalValue += Number(o.total_price || 0)
    })

    return Object.values(map).sort((a, b) => b.totalValue - a.totalValue)
  },

  async getProductRanking() {
    const { data: items } = await supabase
      .from('order_items')
      .select('product_id, quantity, total_price, total_price, model, products!inner(name)')
    if (!items) return []

    const map = {}
    items.forEach(i => {
      const key = i.product_id || i.model
      if (!key) return
      if (!map[key]) {
        map[key] = { name: i.products?.name || i.model || 'Sem nome', quantity: 0, totalValue: 0 }
      }
      map[key].quantity += Number(i.quantity || 0)
      map[key].totalValue += Number(i.total_price || 0)
    })

    return Object.values(map).sort((a, b) => b.quantity - a.quantity)
  },

  async getSizeDistribution() {
    const knownSizes = ['PP', 'P', 'M', 'G', 'GG', 'XGG', 'EG', 'XG', 'XEG']
    const { data: items } = await supabase
      .from('order_items')
      .select('size, quantity')
    if (!items) return []

    const map = {}
    items.forEach(i => {
      const size = i.size || 'Sem tamanho'
      map[size] = (map[size] || 0) + Number(i.quantity || 0)
    })

    const sorted = Object.entries(map)
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => {
        const ia = knownSizes.indexOf(a.name)
        const ib = knownSizes.indexOf(b.name)
        if (ia !== -1 && ib !== -1) return ia - ib
        if (ia !== -1) return -1
        if (ib !== -1) return 1
        return a.name.localeCompare(b.name)
      })

    return sorted
  },

  async getFinancialReport(startDate, endDate) {
    const s = startDate || new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()
    const e = endDate || new Date().toISOString()
    const { company_id, role } = await getUserCompanyId()

    let query = supabase
      .from('production_orders')
      .select('id, status, total_price, entry_amount, remaining_amount, payment_status, quantity, created_at')
      .gte('created_at', s)
      .lte('created_at', e)
    if (company_id && role !== 'super_admin') query = query.eq('company_id', company_id)

    const { data: orders } = await query
    if (!orders) return { totalValue: 0, totalPecas: 0, totalOs: 0, avgTicket: 0, totalReceived: 0, totalPending: 0 }

    const totalValue = orders.reduce((s, o) => s + Number(o.total_price || 0), 0)
    const totalPecas = orders.reduce((s, o) => s + Number(o.quantity || 0), 0)
    const totalOs = orders.length
    const totalReceived = orders.reduce((s, o) => s + Number(o.entry_amount || 0), 0)
    const totalPending = orders.filter(o => o.payment_status !== 'pago').reduce((s, o) => s + Number(o.remaining_amount || 0), 0)

    return {
      totalValue,
      totalPecas,
      totalOs,
      avgTicket: totalOs > 0 ? totalValue / totalOs : 0,
      totalReceived,
      totalPending,
    }
  },

  // ─── NOVOS RELATÓRIOS ────────────────────────────────────

  async getSalesBySeller(period = 'month') {
    const now = new Date()
    const startDate = getPeriodStart(now, period)
    const { company_id, role } = await getUserCompanyId()

    let query = supabase
      .from('production_orders')
      .select('id, seller_id, total_price, quantity, status, created_at, seller:profiles!seller_id(name)')
      .not('seller_id', 'is', null)
    if (company_id && role !== 'super_admin') query = query.eq('company_id', company_id)

    const { data: orders } = await query
    if (!orders) return []

    const periodOrders = orders.filter(o => new Date(o.created_at) >= startDate)
    const map = {}

    periodOrders.forEach(o => {
      if (!o.seller_id) return
      if (!map[o.seller_id]) {
        map[o.seller_id] = {
          sellerId: o.seller_id,
          name: o.seller?.name || 'Desconhecido',
          osCount: 0,
          totalValue: 0,
          finishedCount: 0,
        }
      }
      map[o.seller_id].osCount++
      map[o.seller_id].totalValue += Number(o.total_price || 0)
      if (['finalizada', 'entregue'].includes(o.status)) {
        map[o.seller_id].finishedCount++
      }
    })

    const result = Object.values(map).map(s => ({
      ...s,
      avgTicket: s.osCount > 0 ? s.totalValue / s.osCount : 0,
    }))

    return result.sort((a, b) => b.totalValue - a.totalValue)
  },

  async getFinancialSummary(period = 'month') {
    const now = new Date()
    const startDate = getPeriodStart(now, period)
    const { company_id, role } = await getUserCompanyId()

    let query = supabase
      .from('production_orders')
      .select('id, total_price, entry_amount, remaining_amount, payment_status, status, created_at')
    if (company_id && role !== 'super_admin') query = query.eq('company_id', company_id)

    const { data: orders } = await query
    if (!orders) return { totalSold: 0, totalReceived: 0, totalPending: 0, totalOpen: 0, osCount: 0, paymentMethods: {} }

    const periodOrders = orders.filter(o => new Date(o.created_at) >= startDate)
    const activeOrders = periodOrders.filter(o => !['cancelada'].includes(o.status))

    const totalSold = activeOrders.reduce((s, o) => s + Number(o.total_price || 0), 0)
    const totalReceived = activeOrders.reduce((s, o) => s + Number(o.entry_amount || 0), 0)
    const totalPending = activeOrders.filter(o => o.payment_status !== 'pago').reduce((s, o) => s + Number(o.remaining_amount || 0), 0)
    const totalOpen = activeOrders.filter(o => o.payment_status === 'pendente' || o.payment_status === 'sem_entrada').length

    return {
      totalSold,
      totalReceived,
      totalPending,
      totalOpen,
      osCount: activeOrders.length,
    }
  },

  async getTeamPerformance() {
    const { company_id, role } = await getUserCompanyId()

    let stageQuery = supabase.from('production_order_stages').select('responsible_id, status, started_at, completed_at')
    if (company_id && role !== 'super_admin') stageQuery = stageQuery.eq('company_id', company_id)

    const { data: stages } = await stageQuery
    if (!stages) return []

    const { data: history } = await supabase
      .from('production_history')
      .select('user_id')

    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, name')

    if (!profiles) return []

    const profileMap = {}
    profiles.forEach(p => { profileMap[p.id] = p.name })

    const userStageCount = {}
    stages.forEach(s => {
      if (!s.responsible_id) return
      if (!userStageCount[s.responsible_id]) {
        userStageCount[s.responsible_id] = { stagesCompleted: 0, totalTimeMs: 0, stagesWithTime: 0 }
      }
      if (s.status === 'concluida') {
        userStageCount[s.responsible_id].stagesCompleted++
        if (s.started_at && s.completed_at) {
          userStageCount[s.responsible_id].totalTimeMs += new Date(s.completed_at) - new Date(s.started_at)
          userStageCount[s.responsible_id].stagesWithTime++
        }
      }
    })

    const userMovedCount = {}
    if (history) {
      history.forEach(h => {
        if (!h.user_id) return
        userMovedCount[h.user_id] = (userMovedCount[h.user_id] || 0) + 1
      })
    }

    const userIds = new Set([...Object.keys(userStageCount), ...Object.keys(userMovedCount)])
    return Array.from(userIds).map(id => ({
      name: profileMap[id] || 'Desconhecido',
      stagesCompleted: userStageCount[id]?.stagesCompleted || 0,
      osMoved: userMovedCount[id] || 0,
      avgTimeDays: userStageCount[id]?.stagesWithTime > 0
        ? Math.round((userStageCount[id].totalTimeMs / userStageCount[id].stagesWithTime) / (1000 * 60 * 60 * 24) * 10) / 10
        : 0,
    })).sort((a, b) => b.stagesCompleted - a.stagesCompleted)
  },

  async getCommissionSummary() {
    const { company_id, role } = await getUserCompanyId()

    let query = supabase
      .from('production_orders')
      .select('id, commission_percentage, commission_value, commission_blocked, total_price, seller_id, seller:profiles!seller_id(name)')
      .not('commission_percentage', 'is', null)
      .not('commission_blocked', 'eq', true)
      .in('status', ['em_producao', 'finalizada', 'entregue'])
    if (company_id && role !== 'super_admin') query = query.eq('company_id', company_id)

    const { data: orders } = await query
    if (!orders) return { totalCommission: 0, paidCommission: 0, pendingCommission: 0, bySeller: [] }

    const totalCommission = orders.reduce((s, o) => s + Number(o.commission_value || 0), 0)
    const pendingOrders = orders.filter(o => {
      if (o.commission_blocked) return false
      if (o.commission_percentage === null) return false
      return o.status !== 'finalizada' && o.status !== 'entregue'
    })
    const pendingCommission = pendingOrders.reduce((s, o) => s + Number(o.commission_value || 0), 0)
    const paidCommission = totalCommission - pendingCommission

    const sellerMap = {}
    orders.forEach(o => {
      if (!o.seller_id) return
      if (!sellerMap[o.seller_id]) {
        sellerMap[o.seller_id] = {
          sellerId: o.seller_id,
          name: o.seller?.name || 'Desconhecido',
          totalCommission: 0,
          osCount: 0,
        }
      }
      sellerMap[o.seller_id].totalCommission += Number(o.commission_value || 0)
      sellerMap[o.seller_id].osCount++
    })

    const bySeller = Object.values(sellerMap).sort((a, b) => b.totalCommission - a.totalCommission)

    return { totalCommission, paidCommission, pendingCommission, bySeller }
  },

  async getFullHistory(limit = 100) {
    const { company_id, role } = await getUserCompanyId()

    let query = supabase
      .from('production_history')
      .select('*, profiles(name), production_orders(order_number)')
      .order('created_at', { ascending: false })
      .limit(limit)
    if (company_id && role !== 'super_admin') query = query.eq('company_id', company_id)

    const { data, error } = await query
    if (error) throw error
    return data || []
  },
}

function getPeriodStart(now, period) {
  if (period === 'today') return new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (period === 'week') return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  if (period === 'month') return new Date(now.getFullYear(), now.getMonth(), 1)
  if (period === 'year') return new Date(now.getFullYear(), 0, 1)
  if (period && period.start) return new Date(period.start)
  return new Date(now.getFullYear(), now.getMonth(), 1)
}
