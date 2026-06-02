import { useEffect, useState, useCallback } from 'react'
import {
  LayoutDashboard, GitBranch, AlertTriangle, CalendarClock,
  Users, Package, Shirt, DollarSign, UserCheck, History,
  Download, FileText, Table
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card'
import { Button } from '../components/ui/button'
import { Badge } from '../components/ui/badge'
import { MetricCard } from '../components/ui/metric-card'

import { cn, formatDate } from '../lib/utils'
import { reportsService } from '../services/reports'

const tabs = [
  { id: 'dashboard', label: 'Dashboard Executivo', icon: LayoutDashboard },
  { id: 'stages', label: 'Produção por Fase', icon: GitBranch },
  { id: 'bottlenecks', label: 'Gargalos', icon: AlertTriangle },
  { id: 'deadlines', label: 'Prazos', icon: CalendarClock },
  { id: 'clients', label: 'Clientes', icon: Users },
  { id: 'products', label: 'Produtos', icon: Package },
  { id: 'sizes', label: 'Tamanhos', icon: Shirt },
  { id: 'financial', label: 'Financeiro', icon: DollarSign },
  { id: 'team', label: 'Responsáveis', icon: UserCheck },
  { id: 'history', label: 'Histórico', icon: History },
]

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

function exportPrint() {
  window.print()
}

function formatCurrency(v) {
  return Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function formatNumber(v) {
  return Number(v).toLocaleString('pt-BR')
}

function StageProgressBar({ value, max, label, color }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-text-primary font-medium">{label}</span>
        <span className="text-text-muted">{value} {max > 0 && `(${pct}%)`}</span>
      </div>
      <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-500 ${color || 'bg-primary'}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

const sectionColors = {
  Desenho: 'bg-blue-500',
  Impressao: 'bg-purple-500',
  Calandra: 'bg-orange-500',
  Corte: 'bg-cyan-500',
  Costura: 'bg-rose-500',
  Acabamento: 'bg-emerald-500',
}

export function Reports() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [loading, setLoading] = useState(false)
  const [period, setPeriod] = useState('month')
  const [data, setData] = useState({})

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fetchData = useCallback(async (tab) => {
    setLoading(true)
    try {
      let result
      switch (tab) {
        case 'dashboard':
          result = await reportsService.getExecutiveDashboard(period)
          break
        case 'stages':
          result = await reportsService.getProductionByStage()
          break
        case 'bottlenecks':
          result = await reportsService.getBottlenecks()
          break
        case 'deadlines':
          result = await reportsService.getDeadlineReport()
          break
        case 'clients':
          result = await reportsService.getClientRanking()
          break
        case 'products':
          result = await reportsService.getProductRanking()
          break
        case 'sizes':
          result = await reportsService.getSizeDistribution()
          break
        case 'financial':
          result = await reportsService.getFinancialReport()
          break
        case 'team':
          result = await reportsService.getTeamPerformance()
          break
        case 'history':
          result = await reportsService.getFullHistory()
          break
        default:
          result = null
      }
      setData(prev => ({ ...prev, [tab]: result }))
    } catch (err) {
      toast.error(`Erro ao carregar: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => {
    fetchData(activeTab)
  }, [activeTab, fetchData])

  const d = data[activeTab]

  const renderDashboard = () => {
    if (!d) return null
    return (
      <div className="space-y-6">
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <MetricCard title="OS Abertas" value={d.totalOpen} icon={LayoutDashboard} />
          <MetricCard title="OS em Produção" value={d.totalInProduction} icon={GitBranch} />
          <MetricCard title="OS Finalizadas" value={d.totalFinished} icon={FileText} />
          <MetricCard title="OS Atrasadas" value={d.totalDelayed} icon={AlertTriangle} />
        </div>
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <MetricCard title="Produção do Mês" value={d.monthProduction} icon={CalendarClock} />
          <MetricCard title="Valor em Produção" value={d.inProductionValue} icon={DollarSign} format="currency" />
          <MetricCard title="Valor Produzido" value={d.periodValue} icon={DollarSign} format="currency" />
          <MetricCard title="Ticket Médio" value={d.avgTicket} icon={DollarSign} format="currency" />
        </div>
      </div>
    )
  }

  const renderStages = () => {
    if (!d) return null
    const maxOs = d.reduce((m, s) => Math.max(m, s.osCount), 0)
    const maxPecas = d.reduce((m, s) => Math.max(m, s.totalPecas), 0)
    return (
      <div className="space-y-4">
        {d.map(stage => {
          const color = sectionColors[stage.name] || 'bg-primary'
          return (
            <Card key={stage.name}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-3 h-3 rounded-full ${color}`} />
                  <h3 className="font-semibold text-text-primary">{stage.name}</h3>
                  <Badge variant="outline">{stage.osCount} OS</Badge>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-text-muted">Peças</p>
                    <p className="text-lg font-bold text-text-primary">{formatNumber(stage.totalPecas)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-text-muted">Valor</p>
                    <p className="text-lg font-bold text-text-primary">{formatCurrency(stage.totalValue)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-text-muted">Tempo médio</p>
                    <p className="text-lg font-bold text-text-primary">{stage.avgTimeDays}d</p>
                  </div>
                </div>
                <StageProgressBar value={stage.osCount} max={maxOs || 1} label="OS na fase" color={color} />
              </CardContent>
            </Card>
          )
        })}
      </div>
    )
  }

  const renderBottlenecks = () => {
    if (!d) return null
    const { stages, bottleneckQueue, bottleneckTime, pausedCount } = d
    const maxTime = stages.reduce((m, s) => Math.max(m, s.avgTimeDays), 0)
    return (
      <div className="space-y-6">
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-xs text-text-muted mb-1">Fase com maior fila</p>
              <p className="text-xl font-bold text-text-primary">{bottleneckQueue?.name || '—'}</p>
              <p className="text-sm text-danger">{bottleneckQueue?.osCount || 0} OS aguardando</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-xs text-text-muted mb-1">Fase mais lenta</p>
              <p className="text-xl font-bold text-text-primary">{bottleneckTime?.name || '—'}</p>
              <p className="text-sm text-warning">{bottleneckTime?.avgTimeDays || 0} dias em média</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-xs text-text-muted mb-1">OS paradas</p>
              <p className="text-xl font-bold text-text-primary">{pausedCount}</p>
              <p className="text-sm text-text-muted">Pausadas</p>
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Tempo médio por fase</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {stages.map(s => (
              <div key={s.name}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="font-medium text-text-primary">{s.name}</span>
                  <span className={cn(
                    'text-sm font-semibold',
                    s.avgTimeDays > 3 ? 'text-danger' : s.avgTimeDays > 1 ? 'text-warning' : 'text-success'
                  )}>
                    {s.avgTimeDays}d
                  </span>
                </div>
                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                  <div
                    className={cn(
                      'h-full rounded-full transition-all duration-500',
                      s.avgTimeDays > 3 ? 'bg-danger' : s.avgTimeDays > 1 ? 'bg-warning' : 'bg-success'
                    )}
                    style={{ width: `${maxTime > 0 ? (s.avgTimeDays / maxTime) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderDeadlines = () => {
    if (!d) return null
    return (
      <div className="space-y-6">
        <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-text-muted mb-1">Entregues no prazo</p>
              <p className="text-3xl font-bold text-success">{d.onTime}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-text-muted mb-1">Entregues com atraso</p>
              <p className="text-3xl font-bold text-danger">{d.lateDelivered}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-text-muted mb-1">Atrasadas agora</p>
              <p className="text-3xl font-bold text-danger">{d.currentlyLate}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 text-center">
              <p className="text-sm text-text-muted mb-1">Próximas do vencimento</p>
              <p className="text-3xl font-bold text-warning">{d.nearDeadline}</p>
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Taxa de entrega no prazo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-6">
              <div className="relative h-32 w-32">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  <circle cx="18" cy="18" r="15.5" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="15.5" fill="none"
                    stroke={d.deliveryRate >= 80 ? '#16a34a' : d.deliveryRate >= 50 ? '#d97706' : '#dc2626'}
                    strokeWidth="3"
                    strokeDasharray={`${d.deliveryRate} ${100 - d.deliveryRate}`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-text-primary">{d.deliveryRate}%</span>
                </div>
              </div>
              <div className="space-y-2 text-sm">
                <p className="text-text-muted">
                  <span className="font-semibold text-text-primary">{d.onTime + d.lateDelivered}</span> OS concluídas no total
                </p>
                <p className="text-text-muted">
                  <span className="font-semibold text-success">{d.onTime}</span> no prazo
                  {' · '}
                  <span className="font-semibold text-danger">{d.lateDelivered}</span> com atraso
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  const renderClients = () => {
    if (!d || d.length === 0) return <p className="text-sm text-text-muted py-8 text-center">Nenhum cliente com OS registrada.</p>
    const maxValue = d.reduce((m, c) => Math.max(m, c.totalValue), 0)
    return (
      <div className="space-y-3">
        {d.map((client, i) => (
          <Card key={client.clientId}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-primary-bg text-primary font-bold text-sm">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-semibold text-text-primary">{client.name}</p>
                    <p className="text-xs text-text-muted">{client.osCount} OS · {formatNumber(client.totalPecas)} peças</p>
                  </div>
                </div>
                <p className="text-lg font-bold text-text-primary">{formatCurrency(client.totalValue)}</p>
              </div>
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(client.totalValue / maxValue) * 100}%` }} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const renderProducts = () => {
    if (!d || d.length === 0) return <p className="text-sm text-text-muted py-8 text-center">Nenhum produto produzido.</p>
    const maxQty = d.reduce((m, p) => Math.max(m, p.quantity), 0)
    return (
      <div className="space-y-3">
        {d.map((p, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="flex items-center justify-center w-8 h-8 rounded-xl bg-primary-bg text-primary font-bold text-sm">
                    {i + 1}
                  </span>
                  <p className="font-semibold text-text-primary">{p.name}</p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-text-primary">{formatNumber(p.quantity)} peças</p>
                  <p className="text-xs text-text-muted">{formatCurrency(p.totalValue)}</p>
                </div>
              </div>
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(p.quantity / maxQty) * 100}%` }} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const renderSizes = () => {
    if (!d || d.length === 0) return <p className="text-sm text-text-muted py-8 text-center">Nenhum item com tamanho registrado.</p>
    const maxQty = d.reduce((m, s) => Math.max(m, s.quantity), 0)
    return (
      <Card>
        <CardHeader>
          <CardTitle>Distribuição de Produção por Tamanho</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {d.map(s => (
            <StageProgressBar
              key={s.name}
              label={s.name}
              value={s.quantity}
              max={maxQty}
            />
          ))}
        </CardContent>
      </Card>
    )
  }

  const renderFinancial = () => {
    if (!d) return null
    return (
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <MetricCard title="Valor Produzido" value={d.totalValue} icon={DollarSign} format="currency" />
        <MetricCard title="Quantidade de Peças" value={d.totalPecas} icon={Package} />
        <MetricCard title="OS no Período" value={d.totalOs} icon={FileText} />
        <MetricCard title="Ticket Médio" value={d.avgTicket} icon={DollarSign} format="currency" />
      </div>
    )
  }

  const renderTeam = () => {
    if (!d || d.length === 0) return <p className="text-sm text-text-muted py-8 text-center">Nenhum dado de equipe disponível.</p>
    const maxCompleted = d.reduce((m, t) => Math.max(m, t.stagesCompleted), 0)
    return (
      <div className="space-y-3">
        {d.map((t, i) => (
          <Card key={i}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center justify-center w-8 h-8 rounded-xl bg-primary-bg text-primary font-bold text-sm">
                    {i + 1}
                  </div>
                  <p className="font-semibold text-text-primary">{t.name}</p>
                </div>
                <div className="flex gap-6 text-sm">
                  <div className="text-center">
                    <p className="font-bold text-text-primary">{t.stagesCompleted}</p>
                    <p className="text-xs text-text-muted">Fases</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-text-primary">{t.osMoved}</p>
                    <p className="text-xs text-text-muted">Mov.</p>
                  </div>
                  <div className="text-center">
                    <p className="font-bold text-text-primary">{t.avgTimeDays}d</p>
                    <p className="text-xs text-text-muted">Médio</p>
                  </div>
                </div>
              </div>
              <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${maxCompleted > 0 ? (t.stagesCompleted / maxCompleted) * 100 : 0}%` }} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const renderHistory = () => {
    if (!d || d.length === 0) return <p className="text-sm text-text-muted py-8 text-center">Nenhum histórico disponível.</p>
    return (
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
              {d.map(h => (
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
    )
  }

  const handleExportCSV = () => {
    let csvData, headers, filename
    switch (activeTab) {
      case 'stages':
        csvData = d
        headers = [
          { label: 'Fase', accessor: r => r.name },
          { label: 'OS', accessor: r => r.osCount },
          { label: 'Peças', accessor: r => r.totalPecas },
          { label: 'Valor', accessor: r => r.totalValue },
          { label: 'Tempo Médio (dias)', accessor: r => r.avgTimeDays },
        ]
        filename = 'producao-por-fase'
        break
      case 'clients':
        csvData = d
        headers = [
          { label: 'Cliente', accessor: r => r.name },
          { label: 'OS', accessor: r => r.osCount },
          { label: 'Peças', accessor: r => r.totalPecas },
          { label: 'Valor Total', accessor: r => r.totalValue },
        ]
        filename = 'ranking-clientes'
        break
      case 'products':
        csvData = d
        headers = [
          { label: 'Produto', accessor: r => r.name },
          { label: 'Quantidade', accessor: r => r.quantity },
          { label: 'Valor Produzido', accessor: r => r.totalValue },
        ]
        filename = 'produtos-mais-produzidos'
        break
      case 'sizes':
        csvData = d
        headers = [
          { label: 'Tamanho', accessor: r => r.name },
          { label: 'Quantidade', accessor: r => r.quantity },
        ]
        filename = 'distribuicao-tamanhos'
        break
      case 'team':
        csvData = d
        headers = [
          { label: 'Responsável', accessor: r => r.name },
          { label: 'Fases Concluídas', accessor: r => r.stagesCompleted },
          { label: 'OS Movimentadas', accessor: r => r.osMoved },
          { label: 'Tempo Médio (dias)', accessor: r => r.avgTimeDays },
        ]
        filename = 'desempenho-equipe'
        break
      case 'history':
        csvData = d
        headers = [
          { label: 'Data', accessor: r => formatDate(r.created_at) },
          { label: 'OS', accessor: r => r.production_orders?.order_number || '' },
          { label: 'Usuário', accessor: r => r.profiles?.name || '' },
          { label: 'Ação', accessor: r => r.action },
          { label: 'Descrição', accessor: r => r.description || '' },
        ]
        filename = 'historico-completo'
        break
      default:
        return
    }
    exportCSV(csvData, headers, filename)
  }

  const tabContent = {
    dashboard: { render: renderDashboard, hasExport: false },
    stages: { render: renderStages, hasExport: true },
    bottlenecks: { render: renderBottlenecks, hasExport: false },
    deadlines: { render: renderDeadlines, hasExport: false },
    clients: { render: renderClients, hasExport: true },
    products: { render: renderProducts, hasExport: true },
    sizes: { render: renderSizes, hasExport: true },
    financial: { render: renderFinancial, hasExport: false },
    team: { render: renderTeam, hasExport: true },
    history: { render: renderHistory, hasExport: true },
  }

  const current = tabContent[activeTab]

  return (
    <div className="flex gap-6">
      <aside className="hidden lg:flex flex-col w-56 shrink-0">
        <nav className="space-y-1 sticky top-24">
          {tabs.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-sm font-medium transition-all text-left',
                  activeTab === tab.id
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-text-secondary hover:bg-gray-100 hover:text-text-primary'
                )}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </aside>

      <div className="flex-1 min-w-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-text-primary">{tabs.find(t => t.id === activeTab)?.label}</h1>
            <p className="text-sm text-text-muted mt-1">Relatórios e análises da produção</p>
          </div>
          <div className="flex items-center gap-2">
            {activeTab === 'financial' && (
              <select
                value={period}
                onChange={e => setPeriod(e.target.value)}
                className="h-9 rounded-xl border border-border bg-white px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                <option value="today">Hoje</option>
                <option value="week">Semana</option>
                <option value="month">Mês</option>
                <option value="year">Ano</option>
              </select>
            )}
            <Button variant="outline" size="sm" onClick={exportPrint}>
              <FileText size={16} /> PDF
            </Button>
            {current.hasExport && (
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <Table size={16} /> CSV
              </Button>
            )}
          </div>
        </div>

        {/* Mobile tab bar */}
        <div className="flex lg:hidden gap-2 overflow-x-auto pb-2 mb-6 scrollbar-none">
          {tabs.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all',
                  activeTab === tab.id
                    ? 'bg-primary text-white shadow-sm'
                    : 'bg-gray-100 text-text-secondary hover:bg-gray-200'
                )}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            )
          })}
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
              <p className="text-sm text-text-muted">Carregando relatório...</p>
            </div>
          </div>
        ) : (
          current.render()
        )}
      </div>
    </div>
  )
}
