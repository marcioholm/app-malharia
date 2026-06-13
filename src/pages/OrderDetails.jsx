import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, CheckCircle, XCircle, User, Calendar, Hash, Package, Clock, AlertCircle,
  Printer, PauseCircle, PlayCircle, Undo2, Edit3, Save, ImageUp, X, DollarSign,
  CreditCard, History, RotateCcw, Link as LinkIcon, Shield, Copy, Percent
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Textarea } from '../components/ui/textarea'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { StatusBadge, PriorityBadge } from '../components/ui/status-badge'
import { StageProgress } from '../components/ui/progress'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '../components/ui/accordion'
import { formatDate, formatCurrency, paymentStatusLabels, paymentMethodLabels, roleLabels, normalizeRole, budgetStatusLabels, budgetStatusColors } from '../lib/utils'
import { ordersService } from '../services/orders'
import { authService } from '../services/auth'

const stageNames = [
  { name: 'Aprovação de Orçamento' },
  { name: 'Desenho' },
  { name: 'Impressão' },
  { name: 'Calandra' },
  { name: 'Corte' },
  { name: 'Costura' },
  { name: 'Acabamento' },
  { name: 'Finalizado' },
]

export function OrderDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [history, setHistory] = useState([])
  const [audit, setAudit] = useState([])
  const [timeline, setTimeline] = useState([])
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(null)
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [sellers, setSellers] = useState([])
  const [uploadingImage, setUploadingImage] = useState(false)
  const [editForm, setEditForm] = useState({})

  const load = async () => {
    try {
      const [o, h, a, t, prof] = await Promise.all([
        ordersService.getById(id),
        ordersService.getHistory(id),
        ordersService.getAudit(id),
        ordersService.getTimeline(id),
        authService.getCurrentUser().then(u => u ? authService.getProfile(u.id) : null),
      ])
      setOrder(o)
      setHistory(h)
      setAudit(a)
      setTimeline(t)
      setProfile(prof)
      setEditForm({
        client_id: o.client_id || '',
        product_id: o.product_id || '',
        quantity: o.quantity || 0,
        total_price: o.total_price || 0,
        entry_amount: o.entry_amount || 0,
        payment_method: o.payment_method || '',
        payment_status: o.payment_status || 'pendente',
        financial_notes: o.financial_notes || '',
        seller_id: o.seller_id || '',
        delivery_date: o.delivery_date?.split('T')[0] || '',
        priority: o.priority || 'normal',
        contact_person: o.contact_person || '',
        phone: o.phone || '',
        notes: o.notes || '',
        estimated_value: o.estimated_value || 0,
        discount_value: o.discount_value || 0,
        commission_percentage: o.commission_percentage || 0,
        commission_value: o.commission_value || 0,
      })

      const s = await authService.getUsersByRole(['vendedor', 'seller', 'gerente', 'manager', 'admin_empresa', 'admin'])
      setSellers(s)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao carregar OS')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [id])

  const userRole = normalizeRole(profile?.role)
  const isAdmin = userRole === 'super_admin' || userRole === 'admin_empresa'
  const isProduction = userRole === 'producao'
  const isViewer = userRole === 'visualizador'
  const canEdit = isAdmin || userRole === 'gerente' || userRole === 'vendedor'

  const doAction = async (action, fn, successMsg) => {
    setActionLoading(action)
    try {
      await fn()
      toast.success(successMsg)
      await load()
    } catch (err) {
      toast.error(`Erro: ${err.message}`)
    } finally {
      setActionLoading(null)
    }
  }

  const handleFinish = () => {
    if (!confirm('Finalizar esta OS?')) return
    doAction('finish', () => ordersService.finish(id), 'OS finalizada com sucesso!')
  }

  const handleCancel = () => {
    if (!confirm('Tem certeza que deseja cancelar esta OS?')) return
    doAction('cancel', () => ordersService.cancel(id), 'OS cancelada')
  }

  const handleReopen = () => {
    if (!confirm('Reabrir esta OS?')) return
    doAction('reopen', () => ordersService.reopen(id), 'OS reaberta com sucesso!')
  }

  const handlePause = () => {
    if (!confirm('Pausar esta OS?')) return
    doAction('pause', () => ordersService.pause(id), 'OS pausada')
  }

  const handleResume = () => {
    doAction('resume', () => ordersService.resume(id), 'OS retomada!')
  }

  const handleAdvance = () => {
    doAction('advance', () => ordersService.moveToNextStage(id), 'Fase avançada!')
  }

  const handleGoBack = () => {
    if (!confirm('Voltar para a fase anterior?')) return
    doAction('goback', () => ordersService.moveToPreviousStage(id), 'Fase revertida!')
  }

  const handleApproveBudget = () => {
    if (!confirm('Aprovar orçamento? A OS poderá avançar para Desenho.')) return
    doAction('approve_budget', () => ordersService.approveBudgetInternal(id), 'Orçamento aprovado!')
  }

  const handleGenerateBudgetLink = async () => {
    try {
      const token = await ordersService.generateBudgetToken(id)
      const url = await ordersService.getBudgetPublicUrl(id)
      if (url) {
        await navigator.clipboard.writeText(url)
        toast.success('Link de orçamento copiado!')
      }
    } catch (err) {
      toast.error(`Erro ao gerar link: ${err.message}`)
    }
  }

  const handleSaveEdit = async () => {
    setSaving(true)
    try {
      const changedFields = {}
      if (order) {
        Object.keys(editForm).forEach(key => {
          const oldVal = order[key]
          const newVal = editForm[key]
          if (String(oldVal || '') !== String(newVal || '')) {
            changedFields[key] = { old: oldVal, new: newVal }
          }
        })
      }

      const updateData = {}
      Object.keys(editForm).forEach(key => {
        if (editForm[key] !== undefined) {
          updateData[key] = editForm[key]
        }
      })

      if (updateData.total_price !== undefined || updateData.entry_amount !== undefined) {
        const total = Number(updateData.total_price ?? order?.total_price ?? 0)
        const entry = Number(updateData.entry_amount ?? order?.entry_amount ?? 0)
        updateData.remaining_amount = total - entry
        updateData.payment_status = entry <= 0 ? 'sem_entrada' : entry >= total ? 'pago' : 'entrada_parcial'
      }

      if (updateData.commission_percentage !== undefined && isAdmin) {
        const total = Number(updateData.total_price ?? order?.total_price ?? 0)
        updateData.commission_value = (total * Number(updateData.commission_percentage)) / 100
      }

      if (!isAdmin) {
        delete updateData.commission_percentage
        delete updateData.commission_value
      }

      await ordersService.update(id, updateData, changedFields)
      toast.success('OS atualizada com sucesso!')
      setEditing(false)
      await load()
    } catch (err) {
      toast.error(`Erro ao salvar: ${err.message}`)
    } finally {
      setSaving(false)
    }
  }

  const handleImageUpload = async (e) => {
    const files = Array.from(e.target.files || [])
    const existingImages = order?.production_order_images?.length || 0
    const slotsLeft = 5 - existingImages

    if (slotsLeft <= 0) {
      toast.error('Máximo de 5 imagens por OS')
      return
    }

    const toUpload = files.slice(0, slotsLeft)
    setUploadingImage(true)
    try {
      for (const file of toUpload) {
        await ordersService.uploadImage(id, file)
      }
      toast.success(`${toUpload.length} imagem(ns) salva(s)!`)
      await load()
    } catch (err) {
      toast.error(`Erro ao salvar imagem: ${err.message}`)
    } finally {
      setUploadingImage(false)
    }
  }

  const handleImageRemove = async (imageId) => {
    if (!confirm('Remover esta imagem?')) return
    try {
      await ordersService.removeImage(imageId)
      toast.success('Imagem removida')
      await load()
    } catch (err) {
      toast.error(`Erro ao remover imagem: ${err.message}`)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 rounded-xl bg-primary flex items-center justify-center">
          <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="text-center py-12">
        <p className="text-text-muted">OS não encontrada</p>
        <Button variant="outline" className="mt-4" onClick={() => navigate('/orders')}>Voltar</Button>
      </div>
    )
  }

  const deadline = getDeadlineStatus(order.delivery_date)
  const stages = order.production_order_stages || []
  const orderedStages = [...stages].sort(
    (a, b) => (a.production_stages?.position || 0) - (b.production_stages?.position || 0)
  )
  const isActive = !['finalizada', 'cancelada', 'entregue'].includes(order.status)
  const isPaused = order.status === 'pausada'
  const isCancelled = order.status === 'cancelada'
  const isFinished = ['finalizada', 'entregue'].includes(order.status)

  const items = order.order_items || []
  const totalItems = items.reduce((s, i) => s + i.quantity, 0)
  const totalValue = items.reduce((s, i) => s + Number(i.total_price || 0), 0)
  const images = order.production_order_images || []

  const budgetNotApproved = order.budget_status === 'pending' || order.budget_status === 'revision_requested'
  const canAdvanceFromBudget = order.budget_status === 'approved' || order.current_stage !== 'Aprovação de Orçamento'

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-start gap-4">
          <button
            onClick={() => navigate('/orders')}
            className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
          >
            <ArrowLeft size={18} className="text-text-secondary" />
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-text-primary">{order.order_number}</h1>
              <StatusBadge status={order.status} />
              <PriorityBadge priority={order.priority} />
              {order.payment_status && (
                <Badge variant={order.payment_status === 'pago' ? 'success' : 'warning'}>
                  {paymentStatusLabels[order.payment_status] || order.payment_status}
                </Badge>
              )}
              {order.budget_status && (
                <Badge variant={
                  order.budget_status === 'approved' ? 'success' :
                  order.budget_status === 'rejected' ? 'danger' : 'warning'
                }>
                  Orçamento: {budgetStatusLabels[order.budget_status]}
                </Badge>
              )}
            </div>
            <p className="text-sm text-text-muted mt-1">Criada em {formatDate(order.created_at)}</p>
            {order.edited_at && (
              <p className="text-xs text-text-muted mt-1">Última edição em {formatDate(order.edited_at)}</p>
            )}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {!isViewer && (
            <Button variant="outline" onClick={() => navigate(`/orders/${order.id}/print`)}>
              <Printer size={16} /> Imprimir OS
            </Button>
          )}
          {canEdit && !isFinished && (
            <Button variant="outline" onClick={() => setEditing(!editing)}>
              <Edit3 size={16} /> {editing ? 'Cancelar Edição' : 'Editar Ordem'}
            </Button>
          )}
          {isActive && !isViewer && (
            <>
              {isPaused ? (
                <Button variant="outline" onClick={handleResume} disabled={actionLoading === 'resume'}>
                  <PlayCircle size={16} /> {actionLoading === 'resume' ? 'Retomando...' : 'Retomar'}
                </Button>
              ) : (
                <>
                  {!isProduction && (
                    <Button variant="outline" onClick={handleGoBack} disabled={actionLoading === 'goback'}>
                      <Undo2 size={16} /> {actionLoading === 'goback' ? 'Voltando...' : 'Voltar Fase'}
                    </Button>
                  )}
                  <Button variant="outline" onClick={handleAdvance}
                    disabled={actionLoading === 'advance' || (order.current_stage === 'Aprovação de Orçamento' && !canAdvanceFromBudget)}>
                    {actionLoading === 'advance' ? 'Avançando...' : 'Avançar Fase'}
                  </Button>
                  {!isProduction && (
                    <Button variant="outline" onClick={handlePause} disabled={actionLoading === 'pause'}>
                      <PauseCircle size={16} /> {actionLoading === 'pause' ? 'Pausando...' : 'Pausar'}
                    </Button>
                  )}
                  {isAdmin && (
                    <>
                      {order.budget_status === 'pending' && order.current_stage === 'Aprovação de Orçamento' && (
                        <Button onClick={handleApproveBudget} disabled={actionLoading === 'approve_budget'}>
                          <CheckCircle size={16} /> Aprovar Orçamento
                        </Button>
                      )}
                      {!order.public_budget_token && (
                        <Button variant="outline" onClick={handleGenerateBudgetLink}>
                          <LinkIcon size={16} /> Gerar Link
                        </Button>
                      )}
                      {order.public_budget_token && (
                        <Button variant="outline" onClick={handleGenerateBudgetLink}>
                          <Copy size={16} /> Copiar Link
                        </Button>
                      )}
                    </>
                  )}
                  <Button onClick={handleFinish} disabled={actionLoading === 'finish'}>
                    <CheckCircle size={16} /> {actionLoading === 'finish' ? 'Finalizando...' : 'Finalizar'}
                  </Button>
                  {isAdmin && (
                    <Button variant="destructive" onClick={handleCancel} disabled={actionLoading === 'cancel'}>
                      <XCircle size={16} /> {actionLoading === 'cancel' ? 'Cancelando...' : 'Cancelar'}
                    </Button>
                  )}
                </>
              )}
            </>
          )}
          {isCancelled && isAdmin && (
            <Button onClick={handleReopen} disabled={actionLoading === 'reopen'}>
              <RotateCcw size={16} /> {actionLoading === 'reopen' ? 'Reabrindo...' : 'Reabrir'}
            </Button>
          )}
        </div>
      </div>

      {editing ? (
        <Card>
          <CardHeader>
            <CardTitle>Editando Ordem de Serviço</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-secondary">Vendedor</label>
                  <select
                    className="flex h-10 w-full rounded-xl border border-border bg-white px-4 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    value={editForm.seller_id}
                    onChange={(e) => setEditForm({ ...editForm, seller_id: e.target.value })}
                  >
                    <option value="">Selecione</option>
                    {sellers.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-secondary">Prazo de Entrega</label>
                  <Input
                    type="date"
                    value={editForm.delivery_date}
                    onChange={(e) => setEditForm({ ...editForm, delivery_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-secondary">Prioridade</label>
                  <select
                    className="flex h-10 w-full rounded-xl border border-border bg-white px-4 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    value={editForm.priority}
                    onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                  >
                    <option value="baixa">Baixa</option>
                    <option value="normal">Normal</option>
                    <option value="alta">Alta</option>
                    <option value="urgente">Urgente</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-secondary">Valor Total</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editForm.total_price}
                    onChange={(e) => setEditForm({ ...editForm, total_price: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-secondary">Valor de Entrada</label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={editForm.entry_amount}
                    onChange={(e) => setEditForm({ ...editForm, entry_amount: parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-secondary">Saldo Restante</label>
                  <div className="flex h-10 items-center rounded-xl border border-border bg-gray-50 px-4 text-sm font-bold">
                    {formatCurrency(Math.max(0, (Number(editForm.total_price) || 0) - (Number(editForm.entry_amount) || 0)))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-secondary">Status Financeiro</label>
                  <select
                    className="flex h-10 w-full rounded-xl border border-border bg-white px-4 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    value={editForm.payment_status}
                    onChange={(e) => setEditForm({ ...editForm, payment_status: e.target.value })}
                  >
                    <option value="pendente">Pendente</option>
                    <option value="sem_entrada">Sem Entrada</option>
                    <option value="entrada_parcial">Entrada Parcial</option>
                    <option value="pago">Pago</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-text-secondary">Forma de Pagamento</label>
                  <select
                    className="flex h-10 w-full rounded-xl border border-border bg-white px-4 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    value={editForm.payment_method}
                    onChange={(e) => setEditForm({ ...editForm, payment_method: e.target.value })}
                  >
                    <option value="">Selecione</option>
                    <option value="dinheiro">Dinheiro</option>
                    <option value="pix">Pix</option>
                    <option value="cartao_credito">Cartão de Crédito</option>
                    <option value="cartao_debito">Cartão de Débito</option>
                    <option value="boleto">Boleto</option>
                    <option value="transferencia">Transferência</option>
                    <option value="outros">Outros</option>
                  </select>
                </div>
                {isAdmin && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-text-secondary">Comissão (%)</label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={editForm.commission_percentage}
                      onChange={(e) => setEditForm({ ...editForm, commission_percentage: e.target.value })}
                    />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary">Observações Financeiras</label>
                <Textarea
                  value={editForm.financial_notes}
                  onChange={(e) => setEditForm({ ...editForm, financial_notes: e.target.value })}
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary">Observações de Produção</label>
                <Textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  rows={3}
                />
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setEditing(false)}>Cancelar</Button>
                <Button onClick={handleSaveEdit} disabled={saving}>
                  <Save size={16} /> {saving ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-5">
          <div className="lg:col-span-3 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Informações do Pedido</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <User size={16} className="text-text-muted mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-text-muted">Cliente</p>
                        <p className="text-sm font-medium text-text-primary">{order.clients?.name || '---'}</p>
                        {order.clients?.phone && <p className="text-xs text-text-muted">{order.clients.phone}</p>}
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Package size={16} className="text-text-muted mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-text-muted">Produto</p>
                        <p className="text-sm font-medium text-text-primary">{order.products?.name || '---'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <User size={16} className="text-text-muted mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-text-muted">Vendedor</p>
                        <p className="text-sm font-medium text-text-primary">{order.seller?.name || 'Não atribuído'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Hash size={16} className="text-text-muted mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-text-muted">Quantidade Total</p>
                        <p className="text-sm font-medium text-text-primary">{totalItems || order.quantity} unidades</p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <Calendar size={16} className="text-text-muted mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-text-muted">Data de Entrada</p>
                        <p className="text-sm font-medium text-text-primary">{formatDate(order.entry_date)}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <Clock size={16} className="text-text-muted mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs text-text-muted">Prazo de Entrega</p>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium">{formatDate(order.delivery_date)}</p>
                          {deadline !== 'normal' && (
                            <Badge variant={deadline === 'overdue' ? 'danger' : 'warning'}>
                              <AlertCircle size={10} className="mr-1" />
                              {deadline === 'overdue' ? 'Atrasado' : 'Próximo'}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    {order.contact_person && (
                      <div className="flex items-start gap-3">
                        <User size={16} className="text-text-muted mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs text-text-muted">Contato</p>
                          <p className="text-sm font-medium text-text-primary">{order.contact_person}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                {order.notes && (
                  <div className="mt-6 pt-6 border-t border-border-light">
                    <p className="text-xs text-text-muted mb-2">Observações de Produção</p>
                    <p className="text-sm text-text-secondary bg-gray-50 rounded-xl p-4">{order.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Budget Status Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield size={16} className="text-primary" />
                  Orçamento
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant={
                      order.budget_status === 'approved' ? 'success' :
                      order.budget_status === 'rejected' ? 'danger' : 'warning'
                    }>
                      {budgetStatusLabels[order.budget_status] || 'Pendente'}
                    </Badge>
                    {order.budget_approved_at && (
                      <span className="text-xs text-text-muted">
                        Aprovado em {formatDate(order.budget_approved_at)}
                      </span>
                    )}
                    {order.public_budget_approved_at && (
                      <span className="text-xs text-text-muted">
                        (pelo link público)
                      </span>
                    )}
                  </div>
                  {isAdmin && order.public_budget_token && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-text-muted">Link gerado</span>
                      <Button variant="outline" size="sm" onClick={handleGenerateBudgetLink}>
                        <Copy size={14} /> Copiar
                      </Button>
                    </div>
                  )}
                </div>
                {!isViewer && !isProduction && (
                  <div className="mt-4 flex items-center gap-3">
                    {isAdmin && order.current_stage === 'Aprovação de Orçamento' && order.budget_status === 'pending' && (
                      <Button size="sm" onClick={handleApproveBudget} disabled={actionLoading === 'approve_budget'}>
                        <CheckCircle size={14} /> Aprovar Orçamento
                      </Button>
                    )}
                    {isAdmin && !order.public_budget_token && (
                      <Button size="sm" variant="outline" onClick={handleGenerateBudgetLink}>
                        <LinkIcon size={14} /> Gerar Link Público
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Financial Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign size={16} className="text-primary" />
                  Informações Financeiras
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="rounded-xl border border-border p-4">
                    <p className="text-xs text-text-muted">Valor Total</p>
                    <p className="text-lg font-bold text-text-primary">{formatCurrency(order.total_price || totalValue)}</p>
                  </div>
                  <div className="rounded-xl border border-border p-4">
                    <p className="text-xs text-text-muted">Valor de Entrada</p>
                    <p className="text-lg font-bold text-success">{formatCurrency(order.entry_amount || 0)}</p>
                  </div>
                  <div className="rounded-xl border border-border p-4">
                    <p className="text-xs text-text-muted">Saldo Restante</p>
                    <p className={`text-lg font-bold ${Number(order.remaining_amount) > 0 ? 'text-danger' : 'text-success'}`}>
                      {formatCurrency(order.remaining_amount || 0)}
                    </p>
                  </div>
                  <div className="rounded-xl border border-border p-4">
                    <p className="text-xs text-text-muted">Status Financeiro</p>
                    <Badge variant={
                      order.payment_status === 'pago' ? 'success' :
                      order.payment_status === 'entrada_parcial' ? 'warning' : 'danger'
                    }>
                      {paymentStatusLabels[order.payment_status] || 'Pendente'}
                    </Badge>
                  </div>
                </div>
                {order.payment_method && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-text-secondary">
                    <CreditCard size={14} />
                    <span>Forma de pagamento: <strong>{paymentMethodLabels[order.payment_method] || order.payment_method}</strong></span>
                  </div>
                )}
                {/* Commission - only for admin roles */}
                {isAdmin && order.commission_percentage > 0 && (
                  <div className="mt-3 flex items-center gap-2 text-sm text-text-secondary">
                    <Percent size={14} />
                    <span>Comissão: <strong>{order.commission_percentage}%</strong> ({formatCurrency(order.commission_value)})</span>
                  </div>
                )}
                {order.financial_notes && (
                  <div className="mt-3 p-3 rounded-xl bg-gray-50 text-sm text-text-secondary">
                    {order.financial_notes}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Items */}
            {items.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Itens da OS</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border text-xs text-text-muted uppercase tracking-wider">
                          <th className="text-left py-2">Modelo</th>
                          <th className="text-left py-2">Nome</th>
                          <th className="text-center py-2">Tam</th>
                          <th className="text-center py-2">Qtd</th>
                          <th className="text-right py-2">Valor Unit.</th>
                          <th className="text-right py-2">Valor Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border-light">
                        {items.map((item) => (
                          <tr key={item.id}>
                            <td className="py-2 text-text-primary">{item.model}</td>
                            <td className="py-2 text-text-secondary">{item.custom_name || '—'}</td>
                            <td className="py-2 text-center text-text-secondary">{item.size || '—'}</td>
                            <td className="py-2 text-center font-medium">{item.quantity}</td>
                            <td className="py-2 text-right text-text-secondary">{formatCurrency(item.unit_price)}</td>
                            <td className="py-2 text-right font-medium">{formatCurrency(item.total_price)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t border-border font-bold">
                          <td colSpan={3} className="py-2 text-text-primary">Total</td>
                          <td className="py-2 text-center">{totalItems}</td>
                          <td />
                          <td className="py-2 text-right">{formatCurrency(totalValue)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Progresso da Produção</CardTitle>
              </CardHeader>
              <CardContent>
                <StageProgress stages={stageNames} currentStage={order.current_stage} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Fases da Produção</CardTitle>
              </CardHeader>
              <CardContent>
                {orderedStages.length > 0 ? (
                  <Accordion>
                    {orderedStages.map((stage) => (
                      <AccordionItem key={stage.id}>
                        {({ open, setOpen }) => (
                          <>
                            <AccordionTrigger open={open} setOpen={setOpen}>
                              <div className="flex items-center gap-3">
                                <div className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-medium ${
                                  stage.status === 'concluida' ? 'bg-success-bg text-success' :
                                  stage.status === 'em_andamento' ? 'bg-primary-bg text-primary ring-2 ring-primary/20' :
                                  'bg-gray-100 text-text-muted'
                                }`}>
                                  {stage.status === 'concluida' ? '✓' : stage.status === 'em_andamento' ? '●' : stage.production_stages?.position}
                                </div>
                                <span className="text-sm font-medium">{stage.production_stages?.name}</span>
                                <StatusBadge status={stage.status} />
                              </div>
                            </AccordionTrigger>
                            <AccordionContent open={open}>
                              <div className="space-y-3 pl-9">
                                <div className="flex items-center gap-2 text-sm">
                                  <User size={14} className="text-text-muted" />
                                  <span className="text-text-muted">Responsável:</span>
                                  <span className="text-text-primary">---</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                  <Calendar size={14} className="text-text-muted" />
                                  <span className="text-text-muted">Início:</span>
                                  <span className="text-text-primary">{stage.started_at ? formatDate(stage.started_at) : '---'}</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                  <CheckCircle size={14} className="text-text-muted" />
                                  <span className="text-text-muted">Conclusão:</span>
                                  <span className="text-text-primary">{stage.completed_at ? formatDate(stage.completed_at) : '---'}</span>
                                </div>
                              </div>
                            </AccordionContent>
                          </>
                        )}
                      </AccordionItem>
                    ))}
                  </Accordion>
                ) : (
                  <p className="text-sm text-text-muted text-center py-6">Nenhuma fase encontrada</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-2 space-y-6">
            {/* Images */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageUp size={16} className="text-primary" />
                  Imagens ({images.length}/5)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {images.length > 0 ? (
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {images.map((img) => (
                      <div key={img.id} className="relative group rounded-xl border border-border overflow-hidden bg-gray-50">
                        <img src={img.image_url} alt="" className="w-full h-32 object-cover" />
                        {!isViewer && (
                          <button
                            onClick={() => handleImageRemove(img.id)}
                            className="absolute top-1 right-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                          >
                            <X size={12} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                ) : order.reference_image_url ? (
                  <div className="mb-4">
                    <p className="text-xs text-text-muted mb-2">Imagem legada</p>
                    <div className="relative group rounded-xl border border-border overflow-hidden bg-gray-50">
                      <img src={order.reference_image_url} alt="" className="w-full h-32 object-cover" />
                    </div>
                  </div>
                ) : null}

                {!isViewer && images.length < 5 && (
                  <label className="flex flex-col items-center justify-center h-24 rounded-xl border-2 border-dashed border-border bg-gray-50 hover:border-primary/40 hover:bg-primary-bg/30 transition-all cursor-pointer">
                    <div className="flex flex-col items-center gap-1 text-text-muted">
                      <ImageUp size={20} />
                      <span className="text-sm">{uploadingImage ? 'Enviando...' : 'Adicionar imagens'}</span>
                      <span className="text-xs">JPG, PNG, WEBP — até 5MB</span>
                    </div>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handleImageUpload}
                      className="hidden"
                      disabled={uploadingImage}
                      multiple
                    />
                  </label>
                )}
              </CardContent>
            </Card>

            {/* Timeline */}
            <Card>
              <CardHeader>
                <CardTitle>Linha do Tempo</CardTitle>
              </CardHeader>
              <CardContent>
                {timeline.length > 0 ? (
                  <div className="relative">
                    <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-border" />
                    <div className="space-y-4">
                      {timeline.map((entry, i) => (
                        <div key={entry.id} className="relative flex gap-4">
                          <div className={`relative z-10 mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                            i === 0 ? 'border-primary bg-primary-bg' : 'border-border bg-card-bg'
                          }`}>
                            <div className={`h-2 w-2 rounded-full ${i === 0 ? 'bg-primary' : 'bg-border'}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm text-text-primary">{entry.description}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs text-text-muted">{formatDate(entry.created_at)}</span>
                              {entry.profiles?.name && (
                                <span className="flex items-center gap-1 text-xs text-text-muted">
                                  <User size={10} /> {entry.profiles.name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-sm text-text-muted">Nenhum evento registrado</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* History */}
            <Card>
              <CardHeader>
                <CardTitle>Histórico</CardTitle>
              </CardHeader>
              <CardContent>
                {history.length > 0 ? (
                  <div className="relative">
                    <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-border" />
                    <div className="space-y-4">
                      {history.map((h, i) => (
                        <div key={h.id} className="relative flex gap-4">
                          <div className={`relative z-10 mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 ${
                            i === 0 ? 'border-primary bg-primary-bg' : 'border-border bg-card-bg'
                          }`}>
                            <div className={`h-2 w-2 rounded-full ${i === 0 ? 'bg-primary' : 'bg-border'}`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-text-primary">{h.description}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <span className="text-xs text-text-muted">{formatDate(h.created_at)}</span>
                              {h.profiles?.name && (
                                <span className="flex items-center gap-1 text-xs text-text-muted">
                                  <User size={10} /> {h.profiles.name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-text-muted text-center py-8">Nenhum registro no histórico</p>
                )}
              </CardContent>
            </Card>

            {/* Audit */}
            {audit.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History size={16} className="text-primary" />
                    Auditoria
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {audit.slice(0, 10).map((entry) => (
                      <div key={entry.id} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 border border-border">
                        <div className="h-2 w-2 rounded-full bg-primary mt-1.5 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-text-primary">{entry.description}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-text-muted">{formatDate(entry.created_at)}</span>
                            {entry.profiles?.name && (
                              <span className="text-xs text-text-muted">por {entry.profiles.name}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function getDeadlineStatus(deliveryDate) {
  if (!deliveryDate) return 'normal'
  const daysDiff = Math.ceil((new Date(deliveryDate) - new Date()) / (1000 * 60 * 60 * 24))
  if (daysDiff < 0) return 'overdue'
  if (daysDiff <= 3) return 'warning'
  return 'normal'
}
