import { useEffect, useState, useCallback } from 'react'
import {
  History, FileText, Table, DollarSign, TrendingUp, BarChart3, Users,
  AlertCircle, Clock, CheckCircle2, ShoppingBag, Percent
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { MetricCard } from '../components/ui/metric-card'
import { cn, formatDate, formatCurrency, paymentStatusLabels } from '../lib/utils'
import { reportsService } from '../services/reports'

function exportCSV(data, headers, filename) {
  const headerRow = headers.map(h => `"${h.label}"`).join(',')
  const rows = data.map(row =>
    headers.map(h => `"${String(h.accessor(row) ?? '')}"`).join(',')
  )
  const csv = [headerRow, ...rows].join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export function Reports() {
  const [activeTab, setActiveTab] = useState('history')
  const [loading, setLoading] = useState(false)
  const [financial, setFinancial] = useState(null)
  const [salesBySeller, setSalesBySeller] = useState([])
  const [historyData, setHistoryData] = useState([])
  const [bottlenecks, setBottlenecks] = useState(null)
  const [deadlineReport, setDeadlineReport] = useState(null)
  const [clientRanking, setClientRanking] = useState([])
  const [productRanking, setProductRanking] = useState([])
  const [teamPerformance, setTeamPerformance] = useState([])
  const [commissionData, setCommissionData] = useState(null)
  const [commissionLoading, setCommissionLoading] = useState(false)
  const [period, setPeriod] = useState('month')

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const results = await Promise.allSettled([
        reportsService.getFinancialSummary(period),
        reportsService.getSalesBySeller(period),
        reportsService.getFullHistory(100),
        reportsService.getBottlenecks(),
        reportsService.getDeadlineReport(),
        reportsService.getClientRanking(),
        reportsService.getProductRanking(),
        reportsService.getTeamPerformance(),
        reportsService.getCommissionSummary(),
      ])
      if (results[0].status === 'fulfilled') setFinancial(results[0].value)
      if (results[1].status === 'fulfilled') setSalesBySeller(results[1].value)
      if (results[2].status === 'fulfilled') setHistoryData(results[2].value)
      if (results[3].status === 'fulfilled') setBottlenecks(results[3].value)
      if (results[4].status === 'fulfilled') setDeadlineReport(results[4].value)
      if (results[5].status === 'fulfilled') setClientRanking(results[5].value)
      if (results[6].status === 'fulfilled') setProductRanking(results[6].value)
      if (results[7].status === 'fulfilled') setTeamPerformance(results[7].value)
      if (results[8].status === 'fulfilled') setCommissionData(results[8].value)
    } catch (err) {
      toast.error(`Erro ao carregar relatórios: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => { loadAll() }, [loadAll])

  const tabs = [
    { id: 'financial', label: 'Financeiro', icon: DollarSign },
    { id: 'commercial', label: 'Comercial', icon: TrendingUp },
    { id: 'production', label: 'Produção', icon: BarChart3 },
    { id: 'history', label: 'Histórico', icon: History },
  ]

  const handleExportCSV = () => {
    const headers = [
      { label: 'Data', accessor: r => formatDate(r.created_at) },
      { label: 'OS', accessor: r => r.production_orders?.order_number || '' },
      { label: 'Usuário', accessor: r => r.profiles?.name || '' },
      { label: 'Ação', accessor: r => r.action },
      { label: 'Descrição', accessor: r => r.description || '' },
    ]
    exportCSV(historyData, headers, 'historico-completo')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Relatórios</h1>
          <p className="text-sm text-text-muted mt-1">Análises financeiras, comerciais e de produção</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            className="flex h-9 rounded-xl border border-border bg-white px-3 py-1.5 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
          >
            <option value="month">Este Mês</option>
            <option value="week">Últimos 7 Dias</option>
            <option value="year">Este Ano</option>
            <option value="today">Hoje</option>
          </select>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg transition-all cursor-pointer',
              activeTab === tab.id
                ? 'bg-primary text-white shadow-sm'
                : 'text-text-secondary hover:bg-gray-100'
            )}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
              <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
            <p className="text-sm text-text-muted">Carregando relatórios...</p>
          </div>
        </div>
      ) : (
        <>
          {/* ─── FINANCIAL TAB ─── */}
          {activeTab === 'financial' && financial && (
            <div className="space-y-6">
              <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                <MetricCard title="Total Vendido" value={formatCurrency(financial.totalSold)} icon={DollarSign} />
                <MetricCard title="Total Recebido" value={formatCurrency(financial.totalReceived)} icon={CheckCircle2} />
                <MetricCard title="Total Pendente" value={formatCurrency(financial.totalPending)} icon={AlertCircle} />
                <MetricCard title="OS no Período" value={financial.osCount} icon={ShoppingBag} />
              </div>
            </div>
          )}

          {/* ─── COMMERCIAL TAB ─── */}
          {activeTab === 'commercial' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users size={16} className="text-primary" />
                    Vendas por Vendedor
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {salesBySeller.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-3 px-2 font-medium text-text-muted">Vendedor</th>
                            <th className="text-right py-3 px-2 font-medium text-text-muted">OS</th>
                            <th className="text-right py-3 px-2 font-medium text-text-muted">Total Vendido</th>
                            <th className="text-right py-3 px-2 font-medium text-text-muted">Ticket Médio</th>
                            <th className="text-right py-3 px-2 font-medium text-text-muted">Concluídas</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-light">
                          {salesBySeller.map(s => (
                            <tr key={s.sellerId} className="hover:bg-gray-50">
                              <td className="py-3 px-2 font-medium text-text-primary">{s.name}</td>
                              <td className="py-3 px-2 text-right text-text-secondary">{s.osCount}</td>
                              <td className="py-3 px-2 text-right font-medium">{formatCurrency(s.totalValue)}</td>
                              <td className="py-3 px-2 text-right text-text-secondary">{formatCurrency(s.avgTicket)}</td>
                              <td className="py-3 px-2 text-right text-text-secondary">{s.finishedCount}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-text-muted text-center py-8">Nenhuma venda encontrada no período</p>
                  )}
                </CardContent>
              </Card>

              {/* Comissões */}
              {commissionData && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Percent size={16} className="text-primary" />
                      Comissões
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 grid-cols-1 sm:grid-cols-3 mb-6">
                      <div className="rounded-xl border border-border p-4">
                        <p className="text-xs font-medium text-text-muted uppercase tracking-wider">Total</p>
                        <p className="text-2xl font-bold text-text-primary mt-1">{formatCurrency(commissionData.totalCommission)}</p>
                      </div>
                      <div className="rounded-xl border border-border p-4">
                        <p className="text-xs font-medium text-text-muted uppercase tracking-wider">Pendente</p>
                        <p className="text-2xl font-bold text-warning mt-1">{formatCurrency(commissionData.pendingCommission)}</p>
                      </div>
                      <div className="rounded-xl border border-border p-4">
                        <p className="text-xs font-medium text-text-muted uppercase tracking-wider">Pago</p>
                        <p className="text-2xl font-bold text-success mt-1">{formatCurrency(commissionData.paidCommission)}</p>
                      </div>
                    </div>
                    {commissionData.bySeller.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b border-border">
                              <th className="text-left py-3 px-2 font-medium text-text-muted">Vendedor</th>
                              <th className="text-right py-3 px-2 font-medium text-text-muted">OS</th>
                              <th className="text-right py-3 px-2 font-medium text-text-muted">Comissão Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border-light">
                            {commissionData.bySeller.map(s => (
                              <tr key={s.sellerId} className="hover:bg-gray-50">
                                <td className="py-3 px-2 font-medium text-text-primary">{s.name}</td>
                                <td className="py-3 px-2 text-right text-text-secondary">{s.osCount}</td>
                                <td className="py-3 px-2 text-right font-medium">{formatCurrency(s.totalCommission)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-sm text-text-muted text-center py-4">Nenhuma comissão registrada</p>
                    )}
                  </CardContent>
                </Card>
              )}

              <div className="grid gap-5 grid-cols-1 lg:grid-cols-2">
                {/* Client Ranking */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users size={16} className="text-primary" />
                      Ranking de Clientes
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {clientRanking.length > 0 ? (
                      <div className="space-y-2">
                        {clientRanking.slice(0, 10).map((c, i) => (
                          <div key={c.clientId} className="flex items-center justify-between py-2 border-b border-border-light last:border-0">
                            <div className="flex items-center gap-3">
                              <span className="w-5 h-5 rounded-full bg-primary-bg text-primary text-xs font-bold flex items-center justify-center">
                                {i + 1}
                              </span>
                              <span className="text-sm font-medium text-text-primary">{c.name}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-bold text-text-primary">{formatCurrency(c.totalValue)}</span>
                              <span className="text-xs text-text-muted ml-2">({c.osCount} OS)</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-text-muted text-center py-8">Nenhum dado disponível</p>
                    )}
                  </CardContent>
                </Card>

                {/* Product Ranking */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <ShoppingBag size={16} className="text-primary" />
                      Ranking de Produtos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {productRanking.length > 0 ? (
                      <div className="space-y-2">
                        {productRanking.slice(0, 10).map((p, i) => (
                          <div key={p.name} className="flex items-center justify-between py-2 border-b border-border-light last:border-0">
                            <div className="flex items-center gap-3">
                              <span className="w-5 h-5 rounded-full bg-primary-bg text-primary text-xs font-bold flex items-center justify-center">
                                {i + 1}
                              </span>
                              <span className="text-sm font-medium text-text-primary">{p.name}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-bold text-text-primary">{p.quantity} un</span>
                              <span className="text-xs text-text-muted ml-2">{formatCurrency(p.totalValue)}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-text-muted text-center py-8">Nenhum dado disponível</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* ─── PRODUCTION TAB ─── */}
          {activeTab === 'production' && (
            <div className="space-y-6">
              {deadlineReport && (
                <div className="grid gap-5 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
                  <MetricCard title="No Prazo" value={deadlineReport.onTime} icon={CheckCircle2} />
                  <MetricCard title="Entregues com Atraso" value={deadlineReport.lateDelivered} icon={AlertCircle} />
                  <MetricCard title="Atualmente Atrasadas" value={deadlineReport.currentlyLate} icon={AlertCircle} />
                  <MetricCard title="Próximas do Vencimento" value={deadlineReport.nearDeadline} icon={Clock} />
                </div>
              )}

              {bottlenecks && (
                <div className="grid gap-5 grid-cols-1 lg:grid-cols-2">
                  <Card>
                    <CardHeader>
                      <CardTitle>Gargalos - Maior Fila</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold text-primary">{bottlenecks.bottleneckQueue?.name || 'N/D'}</p>
                      <p className="text-sm text-text-muted mt-1">{bottlenecks.bottleneckQueue?.osCount || 0} OS aguardando</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader>
                      <CardTitle>Gargalos - Maior Tempo</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-3xl font-bold text-warning">{bottlenecks.bottleneckTime?.name || 'N/D'}</p>
                      <p className="text-sm text-text-muted mt-1">{bottlenecks.bottleneckTime?.avgTimeDays || 0} dias em média</p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Team Performance */}
              {teamPerformance.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Desempenho da Equipe</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-border">
                            <th className="text-left py-3 px-2 font-medium text-text-muted">Nome</th>
                            <th className="text-right py-3 px-2 font-medium text-text-muted">Fases Concluídas</th>
                            <th className="text-right py-3 px-2 font-medium text-text-muted">OS Movimentadas</th>
                            <th className="text-right py-3 px-2 font-medium text-text-muted">Tempo Médio (dias)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border-light">
                          {teamPerformance.map(m => (
                            <tr key={m.name} className="hover:bg-gray-50">
                              <td className="py-3 px-2 font-medium text-text-primary">{m.name}</td>
                              <td className="py-3 px-2 text-right text-text-secondary">{m.stagesCompleted}</td>
                              <td className="py-3 px-2 text-right text-text-secondary">{m.osMoved}</td>
                              <td className="py-3 px-2 text-right text-text-secondary">{m.avgTimeDays}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* ─── HISTORY TAB ─── */}
          {activeTab === 'history' && (
            <div>
              <div className="flex justify-end mb-4">
                <Button variant="outline" size="sm" onClick={handleExportCSV}>
                  <Table size={16} /> CSV
                </Button>
              </div>
              {historyData.length > 0 ? (
                <Card>
                  <CardContent className="pt-6 overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-2 font-medium text-text-muted">Data</th>
                          <th className="text-left py-3 px-2 font-medium text-text-muted">OS</th>
                          <th className="text-left py-3 px-2 font-medium text-text-muted">Usuário</th>
                          <th className="text-left py-3 px-2 font-medium text-text-muted">Ação</th>
                          <th className="text-left py-3 px-2 font-medium text-text-muted">Descrição</th>
                        </tr>
                      </thead>
                      <tbody>
                        {historyData.map(h => (
                          <tr key={h.id} className="border-b border-border hover:bg-gray-50 transition-colors">
                            <td className="py-3 px-2 text-text-secondary whitespace-nowrap">{formatDate(h.created_at)}</td>
                            <td className="py-3 px-2 text-text-primary font-medium">{h.production_orders?.order_number || '—'}</td>
                            <td className="py-3 px-2 text-text-primary">{h.profiles?.name || '—'}</td>
                            <td className="py-3 px-2">
                              <Badge variant="outline">{h.action}</Badge>
                            </td>
                            <td className="py-3 px-2 text-text-secondary max-w-xs truncate">{h.description || '—'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </CardContent>
                </Card>
              ) : (
                <p className="text-sm text-text-muted py-8 text-center">Nenhum histórico disponível.</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
