import { supabase } from '../lib/supabase'

async function getCurrentProfile() {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data } = await supabase
    .from('profiles')
    .select('id, company_id, role')
    .eq('id', user.id)
    .single()
  return data
}

export const ordersService = {
  async list(filters = {}) {
    let query = supabase
      .from('production_orders')
      .select('*, clients(name), products(name), production_order_stages(*), seller:profiles!seller_id(name)')

    if (filters.status) query = query.eq('status', filters.status)
    if (filters.client_id) query = query.eq('client_id', filters.client_id)
    if (filters.priority) query = query.eq('priority', filters.priority)
    if (filters.seller_id) query = query.eq('seller_id', filters.seller_id)
    if (filters.payment_status) query = query.eq('payment_status', filters.payment_status)
    if (filters.budget_status) query = query.eq('budget_status', filters.budget_status)
    if (filters.stage) query = query.eq('current_stage', filters.stage)

    if (filters.search) {
      query = query.or(
        `order_number.ilike.%${filters.search}%,` +
        `clients.name.ilike.%${filters.search}%,` +
        `products.name.ilike.%${filters.search}%`
      )
    }

    query = query.order('created_at', { ascending: false })

    const { data, error } = await query
    if (error) throw error
    return data
  },

  async getById(id) {
    const { data, error } = await supabase
      .from('production_orders')
      .select('*, clients(*), products(*), production_order_stages(*, production_stages(*)), order_items(*), production_order_images(*), seller:profiles!seller_id(name, email)')
      .eq('id', id)
      .single()
    if (error) throw error
    return data
  },

  async create(order, items = []) {
    const profile = await getCurrentProfile()
    const orderData = {
      ...order,
      created_by: profile.id,
      remaining_amount: (Number(order.total_price) || 0) - (Number(order.entry_amount) || 0),
    }
    const { data, error } = await supabase
      .from('production_orders')
      .insert(orderData)
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
          item_number: i.item_number || null,
          size: i.size || null,
          quantity: Number(i.quantity) || 1,
          unit_price: Number(i.unit_price) || 0,
          total_price: (Number(i.quantity) || 0) * (Number(i.unit_price) || 0),
          notes: i.notes || null,
        }))
      if (orderItems.length > 0) {
        const { error: itemsError } = await supabase
          .from('order_items')
          .insert(orderItems)
        if (itemsError) throw itemsError
      }
    }

    await ordersService.addTimeline(data.id, 'order_created', `Pedido #${data.order_number} foi criado`)
    await ordersService.addAudit(data.id, 'criacao', null, orderData, 'OS criada')

    return data
  },

  async createStages(orderId) {
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

  async update(id, data, changedFields = {}) {
    const profile = await getCurrentProfile()
    const updateData = {
      ...data,
      edited_by: profile.id,
      edited_at: new Date().toISOString(),
    }

    if (data.total_price !== undefined || data.entry_amount !== undefined) {
      const { data: current } = await supabase
        .from('production_orders')
        .select('total_price, entry_amount')
        .eq('id', id)
        .single()

      const total = data.total_price !== undefined ? Number(data.total_price) : Number(current?.total_price || 0)
      const entry = data.entry_amount !== undefined ? Number(data.entry_amount) : Number(current?.entry_amount || 0)
      updateData.remaining_amount = total - entry
    }

    if (data.commission_percentage !== undefined && data.commission_value !== undefined) {
      const total = Number(data.total_price ?? 0)
      updateData.commission_value = (total * Number(data.commission_percentage)) / 100
    }

    const { data: oldData } = await supabase
      .from('production_orders')
      .select('*')
      .eq('id', id)
      .single()

    const { error } = await supabase
      .from('production_orders')
      .update(updateData)
      .eq('id', id)
    if (error) throw error

    if (Object.keys(changedFields).length > 0) {
      const descriptions = Object.entries(changedFields)
        .map(([field, values]) => `${field}: ${values.old} → ${values.new}`)
        .join(', ')
      await ordersService.addTimeline(id, 'order_edited', `OS #${oldData?.order_number} foi editada: ${descriptions}`)
      await ordersService.addAudit(id, 'edicao', oldData, updateData, descriptions)
    } else {
      await ordersService.addTimeline(id, 'order_edited', `OS #${oldData?.order_number} foi atualizada`)
      await ordersService.addAudit(id, 'edicao', oldData, updateData, 'OS atualizada')
    }

    return updateData
  },

  async delete(id) {
    const { error } = await supabase
      .from('production_orders')
      .delete()
      .eq('id', id)
    if (error) throw error
  },

  // ─── ITEMS ────────────────────────────────────────────────

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
      item_number: i.item_number || null,
      size: i.size || null,
      quantity: Number(i.quantity) || 1,
      unit_price: Number(i.unit_price) || 0,
      total_price: (Number(i.quantity) || 0) * (Number(i.unit_price) || 0),
      notes: i.notes || null,
    }))
    const { error } = await supabase
      .from('order_items')
      .insert(orderItems)
    if (error) throw error
  },

  async updateItem(itemId, data) {
    const { error } = await supabase
      .from('order_items')
      .update(data)
      .eq('id', itemId)
    if (error) throw error
  },

  async deleteItem(itemId) {
    const { error } = await supabase
      .from('order_items')
      .delete()
      .eq('id', itemId)
    if (error) throw error
  },

  // ─── STATUS CHANGES ───────────────────────────────────────

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
    await ordersService.addAudit(id, 'finalizacao', { status: order?.status }, { status: 'finalizada' }, 'OS finalizada')
    await ordersService.addTimeline(id, 'order_completed', `Pedido #${order?.order_number} foi finalizado`)
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
    await ordersService.addAudit(id, 'cancelamento', null, { status: 'cancelada' }, 'OS cancelada')
    await ordersService.addTimeline(id, 'order_cancelled', `Pedido #${order?.order_number} foi cancelado`)
  },

  async reopen(id) {
    const { data: order } = await supabase
      .from('production_orders')
      .select('order_number')
      .eq('id', id)
      .single()

    const { error } = await supabase
      .from('production_orders')
      .update({ status: 'aberta' })
      .eq('id', id)
    if (error) throw error

    await ordersService.addHistory(id, 'OS reaberta')
    await ordersService.addAudit(id, 'reabertura', { status: 'cancelada' }, { status: 'aberta' }, 'OS reaberta')
    await ordersService.addTimeline(id, 'order_reopened', `Pedido #${order?.order_number} foi reaberto`)
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
    await ordersService.addTimeline(id, 'order_paused', `Pedido #${order?.order_number} foi pausado`)
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
    await ordersService.addTimeline(id, 'order_resumed', `Pedido #${order?.order_number} foi retomado`)
  },

  // ─── STAGE MANAGEMENT ────────────────────────────────────

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

      await ordersService.addTimeline(orderId, 'stage_changed',
        `Pedido #${order.order_number} avançou para ${nextStage.production_stages?.name}`)
    } else {
      await supabase
        .from('production_orders')
        .update({ status: 'finalizada', current_stage: 'Finalizado' })
        .eq('id', orderId)

      await ordersService.addTimeline(orderId, 'order_completed',
        `Pedido #${order.order_number} concluiu todas as fases`)
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
    await ordersService.addTimeline(orderId, 'stage_reverted',
      `Pedido #${order.order_number} voltou para ${prevStage.production_stages?.name}`)
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
    await ordersService.addTimeline(orderId, 'stage_changed',
      `Pedido #${order.order_number} movido para ${stageName}`)
  },

  // ─── BUDGET MANAGEMENT ────────────────────────────────────

  async generateBudgetToken(orderId) {
    const token = Array.from({ length: 64 }, () =>
      'abcdef0123456789'.charAt(Math.floor(Math.random() * 16))
    ).join('')

    const { data, error } = await supabase
      .from('production_orders')
      .update({
        public_budget_token: token,
        budget_status: 'pending',
        budget_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      })
      .eq('id', orderId)
      .select('public_budget_token')
      .single()

    if (error) throw error

    await ordersService.addTimeline(orderId, 'budget_sent',
      `Orçamento enviado para aprovação do cliente`)

    return data.public_budget_token
  },

  async approveBudgetInternal(orderId) {
    const profile = await getCurrentProfile()
    const { data: order } = await supabase
      .from('production_orders')
      .select('order_number')
      .eq('id', orderId)
      .single()

    const { error } = await supabase
      .from('production_orders')
      .update({
        budget_status: 'approved',
        budget_approved: true,
        budget_approved_by: profile.id,
        budget_approved_at: new Date().toISOString(),
      })
      .eq('id', orderId)
    if (error) throw error

    await ordersService.addTimeline(orderId, 'budget_approved',
      `Orçamento do pedido #${order?.order_number} foi aprovado por ${profile.id}`)
    await ordersService.addAudit(orderId, 'aprovacao_orcamento',
      { budget_status: 'pending' }, { budget_status: 'approved' }, 'Orçamento aprovado internamente')
  },

  async rejectBudgetInternal(orderId, reason) {
    const profile = await getCurrentProfile()
    const { data: order } = await supabase
      .from('production_orders')
      .select('order_number')
      .eq('id', orderId)
      .single()

    const { error } = await supabase
      .from('production_orders')
      .update({
        budget_status: 'rejected',
        budget_customer_message: reason,
      })
      .eq('id', orderId)
    if (error) throw error

    await ordersService.addTimeline(orderId, 'budget_rejected',
      `Orçamento do pedido #${order?.order_number} foi recusado`)
  },

  async getBudgetPublicUrl(orderId) {
    const { data, error } = await supabase
      .from('production_orders')
      .select('public_budget_token')
      .eq('id', orderId)
      .single()
    if (error) return null
    if (!data?.public_budget_token) return null
    return `${window.location.origin}/orcamento/${data.public_budget_token}`
  },

  // ─── COMMISSION ──────────────────────────────────────────

  async updateCommission(orderId, percentage) {
    const profile = await getCurrentProfile()
    const { data: order } = await supabase
      .from('production_orders')
      .select('total_price, commission_percentage, order_number')
      .eq('id', orderId)
      .single()

    if (!order) throw new Error('Ordem não encontrada')

    const commissionValue = (Number(order.total_price || 0) * Number(percentage)) / 100

    const { error } = await supabase
      .from('production_orders')
      .update({
        commission_percentage: percentage,
        commission_value: commissionValue,
      })
      .eq('id', orderId)
    if (error) throw error

    await ordersService.addAudit(orderId, 'comissao_alterada',
      { commission_percentage: order.commission_percentage },
      { commission_percentage: percentage, commission_value: commissionValue },
      `Comissão alterada de ${order.commission_percentage || 0}% para ${percentage}%`)
  },

  // ─── HISTORY ─────────────────────────────────────────────

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

  // ─── TIMELINE ────────────────────────────────────────────

  async addTimeline(orderId, action, description) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.rpc('register_activity', {
        p_order_id: orderId,
        p_action: action,
        p_description: description,
        p_metadata: null,
      })
    } catch (err) {
      console.error('Erro ao registrar timeline:', err)
    }
  },

  async getTimeline(orderId) {
    const { data, error } = await supabase
      .from('activity_timeline')
      .select('*, profiles(name)')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  },

  async getRecentTimeline(limit = 20) {
    const profile = await getCurrentProfile()
    if (!profile) return []

    let query = supabase
      .from('activity_timeline')
      .select('*, profiles(name), production_orders(order_number, status)')
      .order('created_at', { ascending: false })
      .limit(limit)

    if (profile.role !== 'super_admin') {
      query = query.eq('company_id', profile.company_id)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  },

  // ─── AUDIT ────────────────────────────────────────────────

  async addAudit(orderId, action, oldData, newData, description) {
    const { data: { user } } = await supabase.auth.getUser()
    const { error } = await supabase
      .from('production_order_audit')
      .insert({
        order_id: orderId,
        user_id: user.id,
        action,
        old_data: oldData ? JSON.stringify(oldData) : null,
        new_data: newData ? JSON.stringify(newData) : null,
        description,
      })
    if (error) console.error('Erro ao adicionar auditoria:', error)
  },

  async getAudit(orderId) {
    const { data, error } = await supabase
      .from('production_order_audit')
      .select('*, profiles(name)')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data
  },

  // ─── IMAGES ───────────────────────────────────────────────

  async uploadImage(orderId, file) {
    const ext = file.name.split('.').pop()
    const timestamp = Date.now()
    const filePath = `${orderId}/${timestamp}.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('order-images')
      .upload(filePath, file, {
        upsert: false,
        contentType: file.type,
      })
    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage
      .from('order-images')
      .getPublicUrl(filePath)

    const { data: { user } } = await supabase.auth.getUser()

    const { data: maxPos } = await supabase
      .from('production_order_images')
      .select('position')
      .eq('order_id', orderId)
      .order('position', { ascending: false })
      .limit(1)

    const nextPosition = maxPos && maxPos.length > 0 ? maxPos[0].position + 1 : 0

    const { data, error } = await supabase
      .from('production_order_images')
      .insert({
        order_id: orderId,
        image_url: publicUrl,
        file_path: filePath,
        file_name: file.name,
        file_size: file.size,
        mime_type: file.type,
        position: nextPosition,
        created_by: user.id,
      })
      .select()
      .single()

    if (error) throw error
    return data
  },

  async removeImage(imageId) {
    const { data: image } = await supabase
      .from('production_order_images')
      .select('*')
      .eq('id', imageId)
      .single()

    if (!image) return

    if (image.file_path) {
      await supabase.storage.from('order-images').remove([image.file_path])
    }

    const { error } = await supabase
      .from('production_order_images')
      .delete()
      .eq('id', imageId)

    if (error) throw error
  },

  async reorderImages(orderId, imageIds) {
    for (let i = 0; i < imageIds.length; i++) {
      await supabase
        .from('production_order_images')
        .update({ position: i })
        .eq('id', imageIds[i])
        .eq('order_id', orderId)
    }
  },

  async getImages(orderId) {
    const { data, error } = await supabase
      .from('production_order_images')
      .select('*')
      .eq('order_id', orderId)
      .order('position', { ascending: true })

    if (error) throw error
    return data
  },
}
