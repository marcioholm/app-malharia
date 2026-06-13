import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Eye, ClipboardList, DollarSign, User as UserIcon, Search } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card'
import { StatusBadge, PriorityBadge } from '../components/ui/status-badge'
import { Input } from '../components/ui/input'
import { Badge } from '../components/ui/badge'
import { formatDate, formatCurrency, paymentStatusLabels, paymentMethodLabels, budgetStatusLabels } from '../lib/utils'
import { ordersService } from '../services/orders'

export function Orders() {
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [searchTimeout, setSearchTimeout] = useState(null)
  const navigate = useNavigate()

  const loadOrders = useCallback(async () => {
    try {
      const filters = {}
      if (statusFilter) filters.status = statusFilter
      if (searchTerm) filters.search = searchTerm
      const data = await ordersService.list(filters)
      setOrders(data)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }, [statusFilter, searchTerm])

  useEffect(() => {
    if (searchTimeout) clearTimeout(searchTimeout)
    const timeout = setTimeout(() => {
      loadOrders()
    }, 300)
    setSearchTimeout(timeout)
    return () => clearTimeout(timeout)
  }, [statusFilter, searchTerm, loadOrders])

  const getDeadlineVariant = (deliveryDate) => {
    if (!deliveryDate) return 'default'
    const diff = Math.ceil((new Date(deliveryDate) - new Date()) / (1000 * 60 * 60 * 24))
    if (diff < 0) return 'danger'
    if (diff <= 3) return 'warning'
    return 'success'
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Ordens de Serviço</h1>
          <p className="text-sm text-text-muted mt-1">Gerencie as ordens de produção da fábrica</p>
        </div>
        <Button onClick={() => navigate('/orders/new')}>
          <Plus size={18} /> Nova Ordem de Serviço
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
              <Input
                type="text"
                placeholder="Buscar por cliente, OS, produto..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <span className="text-sm font-medium text-text-secondary">Status:</span>
            <div className="flex flex-wrap gap-2">
              {['', 'aberta', 'em_producao', 'finalizada', 'entregue', 'cancelada'].map((s) => (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    statusFilter === s
                      ? 'bg-primary text-white shadow-sm'
                      : 'bg-gray-100 text-text-secondary hover:bg-gray-200'
                  }`}
                >
                  {s === '' ? 'Todos' : 
                    s === 'aberta' ? 'Aberta' :
                    s === 'em_producao' ? 'Em Produção' :
                    s === 'finalizada' ? 'Finalizada' :
                    s === 'entregue' ? 'Entregue' : 'Cancelada'}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <div className="h-8 w-8 rounded-xl bg-primary flex items-center justify-center">
                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            </div>
          ) : orders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-xs font-medium text-text-muted uppercase tracking-wider">OS</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-text-muted uppercase tracking-wider">Cliente</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-text-muted uppercase tracking-wider">Produto</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-text-muted uppercase tracking-wider">Vendedor</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-text-muted uppercase tracking-wider">Valor</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-text-muted uppercase tracking-wider">Financeiro</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-text-muted uppercase tracking-wider">Orçamento</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-text-muted uppercase tracking-wider">Prazo</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-text-muted uppercase tracking-wider">Fase</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-text-muted uppercase tracking-wider">Status</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-text-muted uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-light">
                  {orders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 font-medium text-text-primary">{order.order_number}</td>
                      <td className="py-3 px-4 text-text-secondary">{order.clients?.name || '—'}</td>
                      <td className="py-3 px-4 text-text-secondary">{order.products?.name || '—'}</td>
                      <td className="py-3 px-4">
                        <span className="text-text-secondary text-xs flex items-center gap-1">
                          <UserIcon size={12} className="text-text-muted" />
                          {order.seller?.name || '—'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-text-secondary font-medium">
                        {formatCurrency(order.total_price)}
                      </td>
                      <td className="py-3 px-4">
                        {order.payment_status ? (
                          <Badge variant={
                            order.payment_status === 'pago' ? 'success' :
                            order.payment_status === 'entrada_parcial' ? 'warning' :
                            order.payment_status === 'sem_entrada' ? 'danger' : 'default'
                          }>
                            {paymentStatusLabels[order.payment_status]}
                          </Badge>
                        ) : '—'}
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={
                          order.budget_status === 'approved' ? 'success' :
                          order.budget_status === 'rejected' ? 'danger' : 
                          order.budget_status === 'pending' ? 'warning' : 'default'
                        }>
                          {budgetStatusLabels[order.budget_status] || '—'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge variant={getDeadlineVariant(order.delivery_date)}>
                          {formatDate(order.delivery_date)}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-sm text-text-secondary">{order.current_stage || '—'}</span>
                      </td>
                      <td className="py-3 px-4"><StatusBadge status={order.status} /></td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => navigate(`/orders/${order.id}`)}
                          className="inline-flex items-center gap-1 text-primary hover:text-primary-dark text-sm font-medium transition-colors cursor-pointer"
                        >
                          <Eye size={16} /> Detalhes
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="flex justify-center mb-4">
                <div className="h-16 w-16 rounded-2xl bg-gray-100 flex items-center justify-center">
                  <ClipboardList size={32} className="text-text-muted" />
                </div>
              </div>
              <p className="text-text-muted text-sm">Nenhuma ordem de serviço encontrada</p>
              <Button variant="outline" className="mt-4" onClick={() => navigate('/orders/new')}>
                <Plus size={16} /> Criar primeira OS
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
