import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowRight, AlertCircle, Clock, User, Eye, Printer, PauseCircle, PlayCircle,
  CheckCircle, Filter, Search
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Badge } from '../components/ui/badge'
import { StatusBadge, PriorityBadge } from '../components/ui/status-badge'
import { Avatar } from '../components/ui/avatar'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { formatDate, getDeadlineStatus, deadlineStyles, budgetStatusLabels } from '../lib/utils'
import { productionService } from '../services/production'
import { ordersService } from '../services/orders'

function KanbanCard({ order, onAdvance, onPause, onResume, onFinish, isAdvancing, onDragStart, onDragOver, onDrop }) {
  const deadline = getDeadlineStatus(order.delivery_date)
  const navigate = useNavigate()
  const isPaused = order.status === 'pausada'
  const isFinished = ['finalizada', 'entregue'].includes(order.status)

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, order)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, order.id)}
      className="rounded-xl border border-border bg-card-bg p-4 shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-200 group cursor-grab active:cursor-grabbing"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-bold text-text-primary">{order.order_number}</span>
        <div className="flex items-center gap-1.5">
          {isPaused && <Badge variant="default" className="text-xs">Pausada</Badge>}
          <PriorityBadge priority={order.priority} />
        </div>
      </div>

      <div className="space-y-2 mb-3">
        <div>
          <p className="text-xs text-text-muted">Cliente</p>
          <p className="text-sm font-medium text-text-primary truncate">{order.clients?.name || '—'}</p>
        </div>
        <div>
          <p className="text-xs text-text-muted">Produto</p>
          <p className="text-sm text-text-secondary truncate">{order.products?.name || '—'} • {order.quantity}un</p>
        </div>
        {order.budget_status && (
          <div>
            <p className="text-xs text-text-muted">Orçamento</p>
            <Badge variant={
              order.budget_status === 'approved' ? 'success' :
              order.budget_status === 'rejected' ? 'danger' : 'warning'
            } className="text-xs mt-0.5">
              {budgetStatusLabels[order.budget_status]}
            </Badge>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-border-light">
        <div className="flex items-center gap-2">
          <Avatar name="RS" size="sm" />
          <span className="text-xs text-text-muted">{(order.seller?.name || '').split(' ')[0] || '—'}</span>
        </div>
        <div className="flex items-center gap-1.5">
          {deadline !== 'normal' && (
            <AlertCircle size={12} className={deadlineStyles[deadline]} />
          )}
          <span className={`text-xs font-medium ${deadlineStyles[deadline]}`}>
            {formatDate(order.delivery_date)}
          </span>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-1">
        <button
          onClick={() => navigate(`/orders/${order.id}`)}
          className="flex-1 flex items-center justify-center gap-1 rounded-lg border border-border bg-gray-50 px-2 py-1.5 text-xs font-medium text-text-secondary hover:bg-primary hover:text-white hover:border-primary transition-all cursor-pointer"
          title="Ver detalhes"
        >
          <Eye size={12} /> Detalhes
        </button>
        <button
          onClick={() => navigate(`/orders/${order.id}/print`)}
          className="flex items-center justify-center rounded-lg border border-border bg-gray-50 p-1.5 text-text-secondary hover:bg-primary hover:text-white hover:border-primary transition-all cursor-pointer"
          title="Imprimir OS"
        >
          <Printer size={12} />
        </button>
        {isPaused ? (
          <button
            onClick={() => onResume(order.id)}
            className="flex items-center justify-center rounded-lg border border-border bg-gray-50 p-1.5 text-text-secondary hover:bg-success hover:text-white hover:border-success transition-all cursor-pointer"
            title="Retomar"
          >
            <PlayCircle size={12} />
          </button>
        ) : !isFinished ? (
          <>
            <button
              onClick={() => onPause(order.id)}
              className="flex items-center justify-center rounded-lg border border-border bg-gray-50 p-1.5 text-text-secondary hover:bg-warning hover:text-white hover:border-warning transition-all cursor-pointer"
              title="Pausar"
            >
              <PauseCircle size={12} />
            </button>
            <button
              onClick={() => onAdvance(order.id)}
              disabled={isAdvancing === order.id}
              className="flex items-center justify-center rounded-lg border border-border bg-gray-50 p-1.5 text-text-secondary hover:bg-primary hover:text-white hover:border-primary transition-all cursor-pointer disabled:opacity-50"
              title="Avançar fase"
            >
              {isAdvancing === order.id ? (
                <svg className="animate-spin h-3 w-3" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              ) : (
                <ArrowRight size={12} />
              )}
            </button>
          </>
        ) : null}
      </div>
    </div>
  )
}

export function Kanban() {
  const [stages, setStages] = useState([])
  const [loading, setLoading] = useState(true)
  const [advancing, setAdvancing] = useState(null)
  const [filterDeadline, setFilterDeadline] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [draggedOrder, setDraggedOrder] = useState(null)
  const navigate = useNavigate()

  const loadKanban = useCallback(async () => {
    try {
      const filters = {}
      if (searchTerm) filters.search = searchTerm
      const data = await productionService.getOrdersByStage(filters)
      setStages(data)
    } catch (err) {
      console.error(err)
      toast.error('Erro ao carregar Kanban')
    } finally {
      setLoading(false)
    }
  }, [searchTerm])

  useEffect(() => { loadKanban() }, [loadKanban])

  const handleAdvance = async (orderId) => {
    setAdvancing(orderId)
    try {
      await ordersService.moveToNextStage(orderId)
      toast.success('Fase avançada!')
      await loadKanban()
    } catch (err) {
      toast.error(`Erro: ${err.message}`)
    } finally {
      setAdvancing(null)
    }
  }

  const handlePause = async (orderId) => {
    try {
      await ordersService.pause(orderId)
      toast.success('OS pausada')
      await loadKanban()
    } catch (err) {
      toast.error(`Erro: ${err.message}`)
    }
  }

  const handleResume = async (orderId) => {
    try {
      await ordersService.resume(orderId)
      toast.success('OS retomada!')
      await loadKanban()
    } catch (err) {
      toast.error(`Erro: ${err.message}`)
    }
  }

  const onDragStart = (e, order) => {
    setDraggedOrder(order)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', order.id)
  }

  const onDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const onDrop = async (e, targetOrderId) => {
    e.preventDefault()
    if (!draggedOrder || draggedOrder.id === targetOrderId) return

    const targetStage = stages.find(s => s.orders.some(o => o.id === targetOrderId))
    if (!targetStage) return

    const targetStageInfo = targetStage.stage
    const targetStageName = targetStageInfo.name
    const targetStageId = targetStageInfo.id

    if (targetStageName === 'Finalizado') {
      if (!confirm(`Mover ${draggedOrder.order_number} para Finalizado?`)) return
    }

    try {
      await ordersService.moveToStage(draggedOrder.id, targetStageName, targetStageId)
      toast.success(`${draggedOrder.order_number} movida para ${targetStageName}`)
      await loadKanban()
    } catch (err) {
      toast.error(`Erro: ${err.message}`)
    }
    setDraggedOrder(null)
  }

  const filteredStages = stages.map(({ stage, orders }) => ({
    stage,
    orders: filterDeadline
      ? orders.filter(o => getDeadlineStatus(o.delivery_date) === filterDeadline)
      : orders,
  }))

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

  return (
    <div className="flex-1 flex flex-col space-y-4 min-h-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Produção</h1>
          <p className="text-sm text-text-muted mt-1">Kanban de produção — arraste ou avance as ordens entre as fases</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
            <Input
              type="text"
              placeholder="Buscar..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 w-48"
            />
          </div>
          <div className="flex items-center gap-2 text-sm text-text-muted">
            <Filter size={14} />
            <span>Filtrar:</span>
          </div>
          {[
            { value: '', label: 'Todos' },
            { value: 'overdue', label: 'Atrasados' },
            { value: 'warning', label: 'Próximos' },
            { value: 'normal', label: 'No prazo' },
          ].map((f) => (
            <button
              key={f.value}
              onClick={() => setFilterDeadline(f.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                filterDeadline === f.value
                  ? 'bg-primary text-white shadow-sm'
                  : 'bg-gray-100 text-text-secondary hover:bg-gray-200'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-auto -mx-6 lg:-mx-8 px-6 lg:px-8 pb-4 min-h-0">
        <div className="flex gap-4 h-full">
          {filteredStages.map(({ stage, orders }) => (
            <div
              key={stage.id}
              className="flex-shrink-0 w-72 h-full flex flex-col"
              onDragOver={onDragOver}
              onDrop={async (e) => {
                e.preventDefault()
                if (!draggedOrder) return
                if (stage.name === 'Finalizado') {
                  if (!confirm(`Mover ${draggedOrder.order_number} para Finalizado?`)) return
                }
                try {
                  await ordersService.moveToStage(draggedOrder.id, stage.name, stage.id)
                  toast.success(`${draggedOrder.order_number} movida para ${stage.name}`)
                  await loadKanban()
                } catch (err) {
                  toast.error(`Erro: ${err.message}`)
                }
                setDraggedOrder(null)
              }}
            >
              <div className="flex items-center justify-between mb-4 shrink-0">
                <div className="flex items-center gap-2">
                  <div className={`h-3 w-3 rounded-full ${
                    stage.name === 'Finalizado' ? 'bg-success' :
                    stage.name === 'Aprovação de Orçamento' ? 'bg-purple-500' :
                    stage.name === 'Desenho' ? 'bg-primary' :
                    stage.name === 'Impressão' ? 'bg-info' :
                    stage.name === 'Calandra' ? 'bg-warning' :
                    stage.name === 'Corte' ? 'bg-danger' :
                    stage.name === 'Costura' ? 'bg-purple-500' : 'bg-gray-500'
                  }`} />
                  <h3 className="text-sm font-semibold text-text-primary">{stage.name}</h3>
                </div>
                <span className="inline-flex items-center justify-center h-7 min-w-[28px] rounded-lg bg-gray-100 px-2 text-xs font-medium text-text-secondary">
                  {orders.length}
                </span>
              </div>
              <div className="flex-1 space-y-3 overflow-y-auto min-h-0 pb-4">
                {orders.length > 0 ? (
                  orders.map((order) => (
                    <KanbanCard
                      key={order.id}
                      order={order}
                      onAdvance={handleAdvance}
                      onPause={handlePause}
                      onResume={handleResume}
                      onFinish={() => {}}
                      isAdvancing={advancing}
                      onDragStart={onDragStart}
                      onDragOver={onDragOver}
                      onDrop={onDrop}
                    />
                  ))
                ) : (
                  <div className="flex items-center justify-center h-32 rounded-xl border-2 border-dashed border-border-light">
                    <p className="text-xs text-text-muted">Nenhuma OS</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
