import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, CheckCircle, XCircle, User, Calendar, Hash, Package, Clock, AlertCircle, Printer } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { StatusBadge, PriorityBadge } from '../components/ui/status-badge'
import { StageProgress } from '../components/ui/progress'
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '../components/ui/accordion'
import { Avatar } from '../components/ui/avatar'
import { formatDate, getDeadlineStatus, deadlineStyles } from '../lib/utils'
import { ordersService } from '../services/orders'

const stageNames = [
  { name: 'Desenho' },
  { name: 'Impressão' },
  { name: 'Calandra' },
  { name: 'Corte' },
  { name: 'Costura' },
  { name: 'Acabamento' },
]

export function OrderDetails() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const [o, h] = await Promise.all([
          ordersService.getById(id),
          ordersService.getHistory(id),
        ])
        setOrder(o)
        setHistory(h)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const handleFinish = async () => {
    if (!confirm('Finalizar esta OS?')) return
    await ordersService.finish(id)
    window.location.reload()
  }

  const handleCancel = async () => {
    if (!confirm('Cancelar esta OS?')) return
    await ordersService.cancel(id)
    window.location.reload()
  }

  const handleAdvance = async () => {
    await ordersService.moveToNextStage(id)
    window.location.reload()
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

  return (
    <div className="space-y-6">
      {/* Header */}
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
            </div>
            <p className="text-sm text-text-muted mt-1">Criada em {formatDate(order.created_at)}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => navigate(`/orders/${order.id}/print`)}>
            <Printer size={16} /> Imprimir OS
          </Button>
          {order.status !== 'finalizada' && order.status !== 'cancelada' && order.status !== 'entregue' && (
            <>
              <Button variant="outline" onClick={handleAdvance}>
                Avancar Fase
              </Button>
              <Button onClick={handleFinish}>
                <CheckCircle size={16} /> Finalizar
              </Button>
              <Button variant="destructive" onClick={handleCancel}>
                <XCircle size={16} /> Cancelar
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-5">
        {/* Left column - Info + Progress */}
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
                      <p className="text-sm font-medium text-text-primary">{order.clients?.name || '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Package size={16} className="text-text-muted mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-text-muted">Produto</p>
                      <p className="text-sm font-medium text-text-primary">{order.products?.name || '—'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <Hash size={16} className="text-text-muted mt-0.5 shrink-0" />
                    <div>
                      <p className="text-xs text-text-muted">Quantidade</p>
                      <p className="text-sm font-medium text-text-primary">{order.quantity} unidades</p>
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
                        <p className={`text-sm font-medium ${deadlineStyles[deadline]}`}>
                          {formatDate(order.delivery_date)}
                        </p>
                        {deadline !== 'normal' && (
                          <Badge variant={deadline === 'overdue' ? 'danger' : 'warning'}>
                            <AlertCircle size={10} className="mr-1" />
                            {deadline === 'overdue' ? 'Atrasado' : 'Próximo'}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {order.notes && (
                <div className="mt-6 pt-6 border-t border-border-light">
                  <p className="text-xs text-text-muted mb-2">Observações</p>
                  <p className="text-sm text-text-secondary bg-gray-50 rounded-xl p-4">{order.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

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
                                <span className="text-text-primary">—</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <Calendar size={14} className="text-text-muted" />
                                <span className="text-text-muted">Início:</span>
                                <span className="text-text-primary">{stage.started_at ? formatDate(stage.started_at) : '—'}</span>
                              </div>
                              <div className="flex items-center gap-2 text-sm">
                                <CheckCircle size={14} className="text-text-muted" />
                                <span className="text-text-muted">Conclusão:</span>
                                <span className="text-text-primary">{stage.completed_at ? formatDate(stage.completed_at) : '—'}</span>
                              </div>
                              {stage.notes && (
                                <div className="rounded-lg bg-gray-50 p-3 text-sm text-text-secondary">
                                  {stage.notes}
                                </div>
                              )}
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

        {/* Right column - History */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Histórico</CardTitle>
            </CardHeader>
            <CardContent>
              {history.length > 0 ? (
                <div className="relative">
                  <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-border" />
                  <div className="space-y-6">
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
                <div className="text-center py-8">
                  <div className="h-12 w-12 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-3">
                    <Clock size={24} className="text-text-muted" />
                  </div>
                  <p className="text-sm text-text-muted">Nenhum registro no histórico</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Responsáveis</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {orderedStages.slice(0, 4).map((stage) => (
                  <div key={stage.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`h-2 w-2 rounded-full ${
                        stage.status === 'concluida' ? 'bg-success' :
                        stage.status === 'em_andamento' ? 'bg-primary' : 'bg-border'
                      }`} />
                      <span className="text-sm text-text-secondary">{stage.production_stages?.name}</span>
                    </div>
                    <Avatar name="—" size="sm" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
