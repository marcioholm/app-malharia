import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatDate(date) {
  if (!date) return '—'
  return new Intl.DateTimeFormat('pt-BR').format(new Date(date))
}

export function formatDateInput(date) {
  if (!date) return ''
  return new Date(date).toISOString().split('T')[0]
}

export const statusLabels = {
  aberta: 'Aberta',
  em_producao: 'Em Produção',
  pausada: 'Pausada',
  finalizada: 'Finalizada',
  entregue: 'Entregue',
  cancelada: 'Cancelada',
  pendente: 'Pendente',
  em_andamento: 'Em Andamento',
  concluida: 'Concluída',
  pulada: 'Pulada',
}

export const statusColors = {
  aberta: 'bg-primary-bg text-primary',
  em_producao: 'bg-warning-bg text-warning',
  pausada: 'bg-gray-100 text-text-muted',
  finalizada: 'bg-success-bg text-success',
  entregue: 'bg-success-bg text-success',
  cancelada: 'bg-danger-bg text-danger',
  pendente: 'bg-gray-100 text-text-muted',
  em_andamento: 'bg-info-bg text-info',
  concluida: 'bg-success-bg text-success',
  pulada: 'bg-gray-100 text-text-muted',
}

export const priorityLabels = {
  baixa: 'Baixa',
  normal: 'Normal',
  alta: 'Alta',
  urgente: 'Urgente',
}

export const priorityColors = {
  baixa: 'bg-gray-100 text-text-muted',
  normal: 'bg-primary-bg text-primary',
  alta: 'bg-warning-bg text-warning',
  urgente: 'bg-danger-bg text-danger',
}

export function getDeadlineStatus(deliveryDate) {
  if (!deliveryDate) return 'normal'
  const daysDiff = Math.ceil((new Date(deliveryDate) - new Date()) / (1000 * 60 * 60 * 24))
  if (daysDiff < 0) return 'overdue'
  if (daysDiff <= 3) return 'warning'
  return 'normal'
}

export const deadlineStyles = {
  overdue: 'text-danger',
  warning: 'text-warning',
  normal: 'text-success',
}

export const deadlineLabels = {
  overdue: 'Atrasado',
  warning: 'Próximo ao vencimento',
  normal: 'No prazo',
}

export const paymentStatusLabels = {
  sem_entrada: 'Sem Entrada',
  entrada_parcial: 'Entrada Parcial',
  pago: 'Pago',
  pendente: 'Pendente',
}

export const paymentStatusColors = {
  sem_entrada: 'bg-gray-100 text-text-muted',
  entrada_parcial: 'bg-warning-bg text-warning',
  pago: 'bg-success-bg text-success',
  pendente: 'bg-danger-bg text-danger',
}

export const paymentMethodLabels = {
  dinheiro: 'Dinheiro',
  pix: 'Pix',
  cartao_credito: 'Cartão de Crédito',
  cartao_debito: 'Cartão de Débito',
  boleto: 'Boleto',
  transferencia: 'Transferência',
  outros: 'Outros',
}

export const roleLabels = {
  super_admin: 'Super Admin',
  admin_empresa: 'Admin',
  admin: 'Admin',
  gerente: 'Gerente',
  manager: 'Gerente',
  vendedor: 'Vendedor',
  seller: 'Vendedor',
  producao: 'Produção',
  operator: 'Produção',
  visualizador: 'Visualizador',
  user: 'Visualizador',
}

export function normalizeRole(role) {
  if (!role) return 'visualizador'
  const map = {
    admin: 'admin_empresa',
    manager: 'gerente',
    seller: 'vendedor',
    operator: 'producao',
    user: 'visualizador',
  }
  return map[role] || role
}

export function formatCurrency(value) {
  if (value === null || value === undefined) return 'R$ 0,00'
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export const budgetStatusLabels = {
  pending: 'Pendente',
  approved: 'Aprovado',
  rejected: 'Recusado',
  revision_requested: 'Revisão Solicitada',
  expired: 'Expirado',
}

export const budgetStatusColors = {
  pending: 'bg-warning-bg text-warning',
  approved: 'bg-success-bg text-success',
  rejected: 'bg-danger-bg text-danger',
  revision_requested: 'bg-info-bg text-info',
  expired: 'bg-gray-100 text-text-muted',
}

export const stageLabels = {
  'Aprovação de Orçamento': 'Aprovação de Orçamento',
  'Desenho': 'Desenho',
  'Impressão': 'Impressão',
  'Calandra': 'Calandra',
  'Corte': 'Corte',
  'Costura': 'Costura',
  'Acabamento': 'Acabamento',
  'Finalizado': 'Finalizado',
}
