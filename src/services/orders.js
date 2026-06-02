import { supabase } from '../lib/supabase'
import { notificationService } from './notifications'

export const ordersService = {
  async list(filters = {}) {
    let query = supabase
      .from('production_orders')
      .select('*, clients(name), products(name), production_order_stages(*)')

    if (filters.status) query = query.eq('status', filters.status)
    if (filters.client_id) query = query.eq('client_id', filters.client_id)
    if (filters.priority) query = query.eq('priority', filters.priority)

    query = query.order('created_at', { ascending: false })

    const { data, error } = await query
    if (error) throw error
    return data
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('production_orders')
      .select('*, clients(*), products(*), production_order_stages(*, production_stages(*)), order_items(*)')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  async create(order, items = []) {
    const { data: { user } } = await supabase.auth.getUser()
    const { data, error } = await supabase
      .from('production_orders')
      .insert({ ...order, created_by: user.id })
      .select()
      .single()
    if (error) throw error

    await ordersService.createStages(data.id)

    if (items.length > 0) {
      const orderItems = items
        .filter(i => i.model)
        .map(i => ({
          order_id: data.id,
          model: i.model,
          custom_name: i.custom_name || null,
          size: i.size || null,
          quantity: Number(i.quantity) || 1,
          unit_price: Number(i.unit_price) || 0,
          total_price: (Number(i.quantity) || 0) * (Number(i.unit_price) || 0),
        }))
      if (orderItems.length > 0) {
        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItems)
        if (itemsError) throw itemsError
      }
    }

    notificationService.create({
      type: 'nova_os',
      title: `Nova OS criada: ${data.order_number}`,
      message: `OS ${data.order_number} foi criada e iniciada em Desenho`,
      link: `/orders/${data.id}`,
    })

    return data
  },

  async createStages(orderId) {
    const { data: { user } } = await supabase.auth.getUser()
    const { data: stages } = await supabase
      .from('production_stages')
      .select('*')
      .order('position')

    if (stages) {
      const stageRecords = stages.map((stage, index) => ({
        order_id: orderId,
        stage_id: stage.id,
        status: index === 0 ? 'em_andamento' : 'pendente',
        position: stage.position,
      }))

      const { error } = await supabase
        .from('production_order_stages')
        .insert(stageRecords)
      if (error) throw error
    }
  },

  async update(id, data) {
    const { error } = await supabase
      .from('production_orders')
      .update(data)
      .eq('id', id)
    if (error) throw error
  },

  async deleteItems(orderId) {
    const { error } = await supabase
      .from('order_items')
      .delete()
      .eq('order_id', orderId)
    if (error) throw error
  },

  async saveItems(orderId, items) {
    const validItems = items.filter(i => i.model)
    if (validItems.length === 0) return
    const orderItems = validItems.map(i => ({
      order_id: orderId,
      model: i.model,
      custom_name: i.custom_name || null,
      size: i.size || null,
      quantity: Number(i.quantity) || 1,
      unit_price: Number(i.unit_price) || 0,
      total_price: (Number(i.quantity) || 0) * (Number(i.unit_price) || 0),
    }))
    const { error } = await supabase
      .from('order_items')
      .insert(orderItems)
    if (error) throw error
  },

  async finish(id) {
    const { data: order } = await supabase
      .from('production_orders')
      .select('order_number')
      .eq('id', id)
      .single()

    const { error } = await supabase
      .from('production_orders')
      .update({ status: 'finalizada', current_stage: 'Finalizado' })
      .eq('id', id)
    if (error) throw error

    await ordersService.addHistory(id, 'OS finalizada')

    notificationService.create({
      type: 'finalizada',
      title: `OS finalizada: ${order?.order_number}`,
      message: `A OS ${order?.order_number} foi concluída`,
      link: `/orders/${id}`,
    })
  },

  async cancel(id) {
    const { data: order } = await supabase
      .from('production_orders')
      .select('order_number')
      .eq('id', id)
      .single()

    const { error } = await supabase
      .from('production_orders')
      .update({ status: 'cancelada' })
      .eq('id', id)
    if (error) throw error

    await ordersService.addHistory(id, 'OS cancelada')
  },

  async pause(id) {
    const { data: order } = await supabase
      .from('production_orders')
      .select('order_number')
      .eq('id', id)
      .single()

    const { error } = await supabase
      .from('production_orders')
      .update({ status: 'pausada' })
      .eq('id', id)
    if (error) throw error

    await ordersService.addHistory(id, 'OS pausada')

    notificationService.create({
      type: 'pausada',
      title: `OS pausada: ${order?.order_number}`,
      message: `A OS ${order?.order_number} foi pausada na produção`,
      link: `/orders/${id}`,
    })
  },

  async resume(id) {
    const { data: order } = await supabase
      .from('production_orders')
      .select('order_number')
      .eq('id', id)
      .single()

    const { error } = await supabase
      .from('production_orders')
      .update({ status: 'em_producao' })
      .eq('id', id)
    if (error) throw error

    await ordersService.addHistory(id, 'OS retomada')
  },

  async moveToNextStage(orderId) {
    const { data: order } = await supabase
      .from('production_orders')
      .select('*, production_order_stages(*, production_stages(*))')
      .eq('id', orderId)
      .single()

    if (!order) throw new Error('Ordem não encontrada')

    const stages = order.production_order_stages
      .filter(s => s.production_stages)
      .sort((a, b) => a.production_stages.position - b.production_stages.position)

    const currentIndex = stages.findIndex(s => s.status === 'em_andamento')
    if (currentIndex === -1) return

    const currentStage = stages[currentIndex]
    const nextStage = stages[currentIndex + 1]

    const now = new Date().toISOString()

    await supabase
      .from('production_order_stages')
      .update({ status: 'concluida', completed_at: now })
      .eq('id', currentStage.id)

    if (nextStage) {
      await supabase
        .from('production_order_stages')
        .update({ status: 'em_andamento', started_at: now })
        .eq('id', nextStage.id)

      await supabase
        .from('production_orders')
        .update({ current_stage: nextStage.production_stages?.name || null, status: 'em_producao' })
        .eq('id', orderId)
    } else {
      await supabase
        .from('production_orders')
        .update({ status: 'finalizada', current_stage: 'Finalizado' })
        .eq('id', orderId)

      notificationService.create({
        type: 'finalizada',
        title: `OS finalizada: ${order.order_number}`,
        message: `A OS ${order.order_number} concluiu todas as fases`,
        link: `/orders/${orderId}`,
      })
    }

    await ordersService.addHistory(orderId, `Fase concluída: ${currentStage.production_stages?.name}`)
  },

  async moveToPreviousStage(orderId) {
    const { data: order } = await supabase
      .from('production_orders')
      .select('*, production_order_stages(*, production_stages(*))')
      .eq('id', orderId)
      .single()

    if (!order) throw new Error('Ordem não encontrada')

    const stages = order.production_order_stages
      .filter(s => s.production_stages)
      .sort((a, b) => a.production_stages.position - b.production_stages.position)

    const currentIndex = stages.findIndex(s => s.status === 'em_andamento')
    if (currentIndex <= 0) return

    const currentStage = stages[currentIndex]
    const prevStage = stages[currentIndex - 1]

    await supabase
      .from('production_order_stages')
      .update({ status: 'pendente', started_at: null, completed_at: null })
      .eq('id', currentStage.id)

    await supabase
      .from('production_order_stages')
      .update({ status: 'em_andamento', completed_at: null })
      .eq('id', prevStage.id)

    await supabase
      .from('production_orders')
      .update({ current_stage: prevStage.production_stages?.name || null, status: 'em_producao' })
      .eq('id', orderId)

    await ordersService.addHistory(orderId, `Fase revertida: ${currentStage.production_stages?.name}`)
  },

  async moveToStage(orderId, stageName, stageId) {
    const { data: order } = await supabase
      .from('production_orders')
      .select('*, production_order_stages(*, production_stages(*))')
      .eq('id', orderId)
      .single()

    if (!order) return

    const stages = order.production_order_stages
      .filter(s => s.production_stages)
      .sort((a, b) => a.production_stages.position - b.production_stages.position)

    const targetStage = stages.find(s => s.stage_id === stageId)
    if (!targetStage || targetStage.status === 'em_andamento') return

    for (const stage of stages) {
      const updateData = {}
      if (stage.position < targetStage.position) {
        updateData.status = 'concluida'
      } else if (stage.id === targetStage.id) {
        updateData.status = 'em_andamento'
        updateData.started_at = new Date().toISOString()
      } else {
        updateData.status = 'pendente'
        updateData.started_at = null
        updateData.completed_at = null
      }
      await supabase
        .from('production_order_stages')
        .update(updateData)
        .eq('id', stage.id)
    }

    await supabase
      .from('production_orders')
      .update({ current_stage: stageName, status: 'em_producao' })
      .eq('id', orderId)

    await ordersService.addHistory(orderId, `Movida para: ${stageName}`)
  },

  async addHistory(orderId, description) {
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase
      .from('production_history')
      .insert({ order_id: orderId, user_id: user.id, action: 'movimentacao', description })
    if (error) throw error
  },

  async getHistory(orderId) {
    const { data, error } = await supabase
      .from('production_history')
      .select('*, profiles(name)')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  },
}
