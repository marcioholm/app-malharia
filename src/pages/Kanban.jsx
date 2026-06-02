import { useEffect, useState } from 'react'
import { ArrowRight, AlertCircle, Clock, User } from 'lucide-react'
import { Badge } from '../components/ui/badge'
import { StatusBadge, PriorityBadge } from '../components/ui/status-badge'
import { Avatar } from '../components/ui/avatar'
import { formatDate, getDeadlineStatus, deadlineStyles, deadlineLabels } from '../lib/utils'
import { productionService } from '../services/production'
import { ordersService } from '../services/orders'

function KanbanCard({ order, onAdvance, isAdvancing }) {
  const deadline = getDeadlineStatus(order.delivery_date)

  return (
    <div className="rounded-xl border border-border bg-card-bg p-4 shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-200 group">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-bold text-text-primary">{order.order_number}</span>
        <PriorityBadge priority={order.priority} />
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
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-border-light">
        <div className="flex items-center gap-2">
          <Avatar name="RS" size="sm" />
          <span className="text-xs text-text-muted">João</span>
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

      {order.status !== 'finalizada' && order.status !== 'entregue' && (
        <button
          onClick={() => onAdvance(order.id)}
          disabled={isAdvancing === order.id}
          className="mt-3 w-full flex items-center justify-center gap-1.5 rounded-lg border border-border bg-gray-50 px-3 py-2 text-xs font-medium text-text-secondary hover:bg-primary hover:text-white hover:border-primary transition-all duration-200 cursor-pointer disabled:opacity-50"
        >
          {isAdvancing === order.id ? 'Avançando...' : 'Avançar Fase'}
          <ArrowRight size={14} />
        </button>
      )}
    </div>
  )
}

export function Kanban() {
  const [stages, setStages] = useState([])
  const [loading, setLoading] = useState(true)
  const [advancing, setAdvancing] = useState(null)

  useEffect(() => {
    loadKanban()
  }, [])

  const loadKanban = async () => {
    try {
      const data = await productionService.getOrdersByStage()
      setStages(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleAdvance = async (orderId) => {
    setAdvancing(orderId)
    try {
      await ordersService.moveToNextStage(orderId)
      await loadKanban()
    } catch (err) {
      console.error(err)
    } finally {
      setAdvancing(null)
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Produção</h1>
        <p className="text-sm text-text-muted mt-1">Kanban de produção — arraste ou avance as ordens entre as fases</p>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-4 -mx-6 lg:-mx-8 px-6 lg:px-8">
        {stages.map(({ stage, orders }) => (
          <div key={stage.id} className="flex-shrink-0 w-72">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-text-primary">{stage.name}</h3>
              <span className="inline-flex items-center justify-center h-7 min-w-[28px] rounded-lg bg-gray-100 px-2 text-xs font-medium text-text-secondary">
                {orders.length}
              </span>
            </div>
            <div className="space-y-3 min-h-[300px]">
              {orders.length > 0 ? (
                orders.map((order) => (
                  <KanbanCard
                    key={order.id}
                    order={order}
                    onAdvance={handleAdvance}
                    isAdvancing={advancing}
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
  )
}
