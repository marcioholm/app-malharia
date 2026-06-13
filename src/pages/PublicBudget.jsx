import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { CheckCircle, XCircle, MessageSquare, Sparkles, Clock, DollarSign, Package, User } from 'lucide-react'
import toast from 'react-hot-toast'
import { supabase } from '../lib/supabase'
import { formatDate, formatCurrency } from '../lib/utils'

const stageNames = ['Aprovação de Orçamento', 'Desenho', 'Impressão', 'Calandra', 'Corte', 'Costura', 'Acabamento', 'Finalizado']

export function PublicBudget() {
  const { token } = useParams()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [message, setMessage] = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const { data: result, error: fnError } = await supabase.rpc('get_public_budget', { p_token: token })
        if (fnError) throw fnError
        if (result?.error) {
          setError(result.error)
        } else {
          setData(result)
        }
      } catch (err) {
        setError('Erro ao carregar orçamento. O link pode ser inválido ou ter expirado.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [token])

  const handleResponse = async (response) => {
    if (!confirm(
      response === 'approved' ? 'Confirmar aprovação do orçamento?' :
      response === 'revision_requested' ? 'Enviar solicitação de alteração?' :
      'Confirmar recusa do orçamento?'
    )) return

    setSubmitting(true)
    try {
      const { data: result, error: fnError } = await supabase.rpc('approve_public_budget', {
        p_token: token,
        p_response: response,
        p_message: message || null,
        p_ip: '',
        p_user_agent: navigator.userAgent,
      })
      if (fnError) throw fnError
      if (result?.success) {
        setSubmitted(true)
        toast.success(
          response === 'approved' ? 'Orçamento aprovado com sucesso!' :
          response === 'revision_requested' ? 'Solicitação de alteração enviada!' :
          'Orçamento recusado.'
        )
      } else {
        toast.error(result?.error || 'Erro ao processar resposta')
      }
    } catch (err) {
      toast.error(`Erro: ${err.message}`)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-10 w-10 rounded-xl bg-primary flex items-center justify-center">
            <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
          <p className="text-sm text-gray-500">Carregando orçamento...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-danger-bg flex items-center justify-center">
                <XCircle size={32} className="text-danger" />
              </div>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Orçamento não encontrado</h1>
            <p className="text-sm text-gray-500">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="flex justify-center mb-4">
              <div className="h-16 w-16 rounded-full bg-success-bg flex items-center justify-center">
                <CheckCircle size={32} className="text-success" />
              </div>
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Obrigado!</h1>
            <p className="text-sm text-gray-500">Sua resposta foi registrada com sucesso. A empresa será notificada.</p>
          </div>
        </div>
      </div>
    )
  }

  const items = data?.items || []
  const images = data?.images || []
  const totalItems = items.reduce((s, i) => s + (i.quantity || 0), 0)
  const totalPrice = items.reduce((s, i) => s + Number(i.total_price || 0), 0)

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Company Header */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex items-center gap-4">
            {data?.company_logo ? (
              <img src={data.company_logo} alt="" className="h-16 w-16 object-contain rounded-xl" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-primary/10">
                <Sparkles size={28} className="text-primary" />
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-gray-900">{data?.company_name || 'Empresa'}</h1>
              {data?.company_cnpj && <p className="text-sm text-gray-500">CNPJ: {data.company_cnpj}</p>}
              {data?.company_phone && <p className="text-sm text-gray-500">Tel: {data.company_phone}</p>}
            </div>
          </div>
        </div>

        {/* Budget Info */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{data?.order_number || 'Orçamento'}</h2>
              <p className="text-sm text-gray-500 mt-1">
                Olá, <strong>{data?.client_name || 'Cliente'}</strong>! Confira os detalhes do seu orçamento.
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Clock size={16} />
              <span>Previsão de entrega: {formatDate(data?.delivery_date)}</span>
            </div>
          </div>

          {/* Items */}
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <Package size={16} className="text-primary" />
              Itens do Pedido
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 text-xs text-gray-500 uppercase">
                    <th className="text-left py-2 pr-2">Modelo</th>
                    <th className="text-left py-2 px-2">Nome</th>
                    <th className="text-center py-2 px-2">Nº</th>
                    <th className="text-center py-2 px-2">Tam</th>
                    <th className="text-center py-2 px-2">Qtd</th>
                    <th className="text-right py-2 px-2">Valor Unit.</th>
                    <th className="text-right py-2 px-2">Valor Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {items.map((item, i) => (
                    <tr key={i}>
                      <td className="py-2 pr-2 font-medium text-gray-900">{item.model}</td>
                      <td className="py-2 px-2 text-gray-600">{item.custom_name || '—'}</td>
                      <td className="py-2 px-2 text-center text-gray-600">{item.item_number || '—'}</td>
                      <td className="py-2 px-2 text-center text-gray-600">{item.size || '—'}</td>
                      <td className="py-2 px-2 text-center font-medium">{item.quantity}</td>
                      <td className="py-2 px-2 text-right text-gray-600">{formatCurrency(item.unit_price)}</td>
                      <td className="py-2 px-2 text-right font-medium">{formatCurrency(item.total_price)}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-200 font-bold">
                    <td colSpan={4} className="py-2 text-gray-900">Total</td>
                    <td className="py-2 text-center">{totalItems}</td>
                    <td />
                    <td className="py-2 text-right">{formatCurrency(totalPrice)}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="rounded-xl border border-gray-200 p-4">
              <p className="text-xs text-gray-500">Valor Total</p>
              <p className="text-lg font-bold text-gray-900">{formatCurrency(totalPrice)}</p>
            </div>
            {data?.entry_amount > 0 && (
              <div className="rounded-xl border border-gray-200 p-4">
                <p className="text-xs text-gray-500">Entrada</p>
                <p className="text-lg font-bold text-success">{formatCurrency(data.entry_amount)}</p>
              </div>
            )}
            {data?.remaining_amount > 0 && (
              <div className="rounded-xl border border-gray-200 p-4">
                <p className="text-xs text-gray-500">Saldo Restante</p>
                <p className="text-lg font-bold text-danger">{formatCurrency(data.remaining_amount)}</p>
              </div>
            )}
            {data?.payment_method && (
              <div className="rounded-xl border border-gray-200 p-4">
                <p className="text-xs text-gray-500">Forma de Pagamento</p>
                <p className="text-lg font-bold text-gray-900">{data.payment_method}</p>
              </div>
            )}
          </div>

          {/* Images */}
          {images.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Imagens de Referência</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {images.map((img, i) => (
                  <div key={i} className="rounded-xl border border-gray-200 overflow-hidden">
                    <img src={img.image_url} alt="" className="w-full h-32 object-cover" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Notes */}
          {data?.financial_notes && (
            <div className="rounded-xl bg-gray-50 p-4 mb-6">
              <p className="text-xs text-gray-500 mb-1">Observações</p>
              <p className="text-sm text-gray-700">{data.financial_notes}</p>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
          <h3 className="text-base font-semibold text-gray-900 mb-2">Sua Resposta</h3>
          <p className="text-sm text-gray-500 mb-4">O que deseja fazer com este orçamento?</p>

          <div className="space-y-4">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Deixe uma mensagem (opcional)..."
              className="w-full rounded-xl border border-gray-200 p-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-all resize-none"
              rows={3}
            />

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => handleResponse('approved')}
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-success text-white px-6 py-3 text-sm font-semibold hover:bg-success-dark transition-all disabled:opacity-50 cursor-pointer"
              >
                <CheckCircle size={18} />
                {submitting ? 'Processando...' : 'Aprovar Orçamento'}
              </button>
              <button
                onClick={() => handleResponse('revision_requested')}
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-warning text-white px-6 py-3 text-sm font-semibold hover:bg-warning-dark transition-all disabled:opacity-50 cursor-pointer"
              >
                <MessageSquare size={18} />
                Solicitar Alteração
              </button>
              <button
                onClick={() => handleResponse('rejected')}
                disabled={submitting}
                className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-danger text-white px-6 py-3 text-sm font-semibold hover:bg-danger-dark transition-all disabled:opacity-50 cursor-pointer"
              >
                <XCircle size={18} />
                Recusar
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400">
          {data?.company_name || 'Empresa'} — Sistema de Ordem de Serviço
        </p>
      </div>
    </div>
  )
}
