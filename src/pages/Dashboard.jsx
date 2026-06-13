import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { FileText, PlayCircle, CheckCircle2, AlertCircle, Plus, Clock, User, History } from 'lucide-react'
import toast from 'react-hot-toast'
import { MetricCard } from '../components/ui/metric-card'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card'
import { StatusBadge, PriorityBadge } from '../components/ui/status-badge'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { formatDate, formatCurrency, getDeadlineStatus, deadlineStyles } from '../lib/utils'
import { dashboardService } from '../services/dashboard'
import { ordersService } from '../services/orders'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip } from 'recharts'

export function Dashboard() {
  const [metrics, setMetrics] = useState({ open: 0, inProduction: 0, finished: 0, delayed: 0, monthValue: 0, totalReceived: 0, totalPending: 0 })
  const [productionByStage, setProductionByStage] = useState([])
  const [latestOrders, setLatestOrders] = useState([])
  const [upcoming, setUpcoming] = useState([])
  const [delayed, setDelayed] = useState([])
  const [timeline, setTimeline] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    const load = async () => {
      try {
        const [m, p, l, u, d, t] = await Promise.all([
          dashboardService.getMetrics(),
          dashboardService.getProductionByStage(),
          dashboardService.getLatestOrders(),
          dashboardService.getUpcomingDeadlines(),
          dashboardService.getDelayedOrders(),
          ordersService.getRecentTimeline(10),
        ])
        setMetrics(m)
        setProductionByStage(p)
        setLatestOrders(l)
        setUpcoming(u)
        setDelayed(d)
        setTimeline(t)
      } catch (err) {
        console.error(err)
        toast.error('Erro ao carregar dashboard')
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
        <MetricCard title="OS Abertas" value={metrics.open} icon={FileText} subtitle="Aguardando início" />
        <MetricCard title="OS em Produção" value={metrics.inProduction} icon={PlayCircle} subtitle="Em andamento" />
        <MetricCard title="OS Atrasadas" value={metrics.delayed} icon={AlertCircle} className="border-danger/20" subtitle="Fora do prazo" />
        <MetricCard title="OS Finalizadas" value={metrics.finished} icon={CheckCircle2} subtitle="Concluídas" />
      </div>

      <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Faturamento no Mês" value={formatCurrency(metrics.monthValue)} icon={FileText} subtitle="Valor total" />
        <MetricCard title="Recebido no Mês" value={formatCurrency(metrics.totalReceived)} icon={CheckCircle2} subtitle="Entradas" />
        <MetricCard title="Pendente" value={formatCurrency(metrics.totalPending)} icon={AlertCircle} subtitle="A receber" />
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
                  <Button variant="outline" size="sm" className="mt-3" onClick={() => navigate('/orders/new')}>
                    <Plus size={14} /> Criar primeira OS
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock size={16} className="text-warning" />
              Próximas do Vencimento
            </CardTitle>
          </CardHeader>
          <CardContent>
            {upcoming.length > 0 ? (
              <div className="space-y-2">
                {upcoming.map((order) => (
                  <button
                    key={order.id}
                    onClick={() => navigate(`/orders/${order.id}`)}
                    className="w-full flex items-center justify-between rounded-xl border border-warning/20 bg-warning-bg/50 p-3 hover:border-warning/40 transition-all cursor-pointer"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-text-primary">{order.order_number}</p>
                      <p className="text-xs text-text-muted">{order.clients?.name}</p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-sm font-medium text-warning">{formatDate(order.delivery_date)}</p>
                      <p className="text-xs text-text-muted">{order.quantity} un</p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-text-muted text-center py-8">Nenhuma OS próxima do prazo</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle size={16} className="text-danger" />
              OS Atrasadas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {delayed.length > 0 ? (
              <div className="space-y-2">
                {delayed.map((order) => (
                  <button
                    key={order.id}
                    onClick={() => navigate(`/orders/${order.id}`)}
                    className="w-full flex items-center justify-between rounded-xl border border-danger/20 bg-danger-bg/50 p-3 hover:border-danger/40 transition-all cursor-pointer"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-text-primary">{order.order_number}</p>
                      <p className="text-xs text-text-muted">{order.clients?.name}</p>
                    </div>
                    <div className="text-right shrink-0 ml-3">
                      <p className="text-sm font-medium text-danger">{formatDate(order.delivery_date)}</p>
                      <p className="text-xs text-text-muted">{order.current_stage}</p>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-success text-center py-8">Nenhuma OS atrasada</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History size={16} className="text-primary" />
            Atividades Recentes
          </CardTitle>
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
                        {entry.production_orders?.order_number && (
                          <button
                            onClick={() => navigate(`/orders/${entry.order_id}`)}
                            className="text-xs text-primary hover:underline"
                          >
                            #{entry.production_orders.order_number}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-sm text-text-muted text-center py-8">Nenhuma atividade recente</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
