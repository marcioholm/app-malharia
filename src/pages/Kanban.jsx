import { useEffect, useState } from 'react'
import { ArrowRight, AlertCircle } from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { StatusBadge, PriorityBadge } from '../components/ui/status-badge'
import { formatDate } from '../lib/utils'
import { productionService } from '../services/production'
import { ordersService } from '../services/orders'

function KanbanCard({ order, onAdvance }) {
  const isLate = order.delivery_date && new Date(order.delivery_date) < new Date() && !['finalizada', 'entregue', 'cancelada'].includes(order.status)

  return (
    <div className="rounded-lg border border-border-light bg-card-bg p-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-bold text-text-primary">#{order.order_number}</span>
        <PriorityBadge priority={order.priority} />
      </div>
      <p className="text-sm font-medium text-text-primary">{order.clients?.name}</p>
      <p className="text-xs text-text-muted mt-0.5">{order.products?.name} • {order.quantity} un</p>
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-1">
          {isLate && <AlertCircle size={14} className="text-danger" />}
          <span className={`text-xs ${isLate ? 'text-danger font-medium' : 'text-text-muted'}`}>
            {formatDate(order.delivery_date)}
          </span>
        </div>
        {order.status !== 'finalizada' && order.status !== 'entregue' && (
          <button
            onClick={() => onAdvance(order.id)}
            className="flex items-center gap-1 text-xs text-primary hover:text-primary-dark transition-colors cursor-pointer font-medium"
          >
            Avançar <ArrowRight size={14} />
          </button>
        )}
      </div>
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

  const stageColors = {
    'Desenho': 'border-t-blue-500',
    'Impressão': 'border-t-purple-500',
    'Calandra': 'border-t-orange-500',
    'Corte': 'border-t-yellow-500',
    'Costura': 'border-t-pink-500',
    'Acabamento': 'border-t-teal-500',
    'Finalizado': 'border-t-green-500',
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Kanban de Produção</h1>
        <p className="text-sm text-text-muted mt-1">Arraste ou avance as ordens entre as fases</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-7 gap-4">
        {stages.map(({ stage, orders }) => (
          <div key={stage.id} className={`rounded-xl border border-border-light bg-gray-50/50 border-t-4 ${stageColors[stage.name] || 'border-t-gray-300'}`}>
            <div className="p-4 border-b border-border-light">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text-primary">{stage.name}</h3>
                <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-gray-200 text-xs font-medium text-text-secondary">
                  {orders.length}
                </span>
              </div>
            </div>
            <div className="p-3 space-y-3 min-h-[200px]">
              {orders.length > 0 ? (
                orders.map((order) => (
                  <KanbanCard
                    key={order.id}
                    order={order}
                    onAdvance={handleAdvance}
                  />
                ))
              ) : (
                <p className="text-xs text-text-muted text-center py-6">Nenhuma OS</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
