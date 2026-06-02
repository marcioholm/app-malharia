import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, PlayCircle, CheckCircle2, AlertCircle, TrendingUp, Plus } from 'lucide-react'
import { MetricCard } from '../components/ui/metric-card'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card'
import { StatusBadge, PriorityBadge } from '../components/ui/status-badge'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { formatDate } from '../lib/utils'
import { dashboardService } from '../services/dashboard'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts'

export function Dashboard() {
  const [metrics, setMetrics] = useState({ open: 0, inProduction: 0, finished: 0, delayed: 0 })
  const [productionByStage, setProductionByStage] = useState([])
  const [latestOrders, setLatestOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const load = async () => {
      try {
        const [m, p, l] = await Promise.all([
          dashboardService.getMetrics(),
          dashboardService.getProductionByStage(),
          dashboardService.getLatestOrders(),
        ])
        setMetrics(m)
        setProductionByStage(p)
        setLatestOrders(l)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

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
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-primary">ConfecOS</p>
          <h1 className="text-2xl font-bold text-text-primary mt-0.5">Dashboard</h1>
          <p className="text-sm text-text-muted mt-1">Visão geral da produção</p>
        </div>
        <Button onClick={() => navigate('/orders/new')}>
          <Plus size={18} /> Nova Ordem de Serviço
        </Button>
      </div>

      <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="OS em Produção" value={metrics.inProduction} icon={PlayCircle} trend={12} />
        <MetricCard title="OS Atrasadas" value={metrics.delayed} icon={AlertCircle} trend={-8} className="border-danger/20" />
        <MetricCard title="OS Finalizadas" value={metrics.finished} icon={CheckCircle2} trend={24} />
        <MetricCard title="Produção do Mês" value={metrics.open + metrics.inProduction} icon={TrendingUp} subtitle={`${metrics.finished} concluídas`} />
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-7">
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Produção por Fase</CardTitle>
          </CardHeader>
          <CardContent>
            {productionByStage.length > 0 ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={productionByStage} barCategoryGap="20%">
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    />
                    <Bar dataKey="value" fill="#2563EB" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-72">
                <p className="text-sm text-text-muted">Nenhuma OS em produção</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Últimas Ordens</CardTitle>
          </CardHeader>
          <CardContent>
            {latestOrders.length > 0 ? (
              <div className="space-y-3">
                {latestOrders.map((order) => (
                  <button
                    key={order.id}
                    onClick={() => navigate(`/orders/${order.id}`)}
                    className="w-full text-left rounded-xl border border-border p-4 hover:border-primary/30 hover:shadow-sm transition-all duration-200 cursor-pointer group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-text-primary group-hover:text-primary transition-colors">
                          {order.order_number} - {order.clients?.name || 'Sem cliente'}
                        </p>
                        <p className="text-xs text-text-muted mt-1">
                          {order.products?.name || 'Sem produto'} • {order.quantity} un
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <PriorityBadge priority={order.priority} />
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-border-light">
                      <span className="text-xs text-text-muted">Prazo: {formatDate(order.delivery_date)}</span>
                      <StatusBadge status={order.status} />
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-72">
                <div className="text-center">
                  <div className="h-12 w-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                    <FileText size={24} className="text-text-muted" />
                  </div>
                  <p className="text-sm text-text-muted">Nenhuma OS criada</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
