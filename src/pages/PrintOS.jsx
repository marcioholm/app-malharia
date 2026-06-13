import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Printer, Download, ArrowLeft } from 'lucide-react'
import { Button } from '../components/ui/button'
import { formatDate, formatCurrency, statusLabels, priorityLabels, paymentStatusLabels, paymentMethodLabels } from '../lib/utils'
import { ordersService } from '../services/orders'
import { companyService } from '../services/company'

const stageNames = ['Aprovação de Orçamento', 'Desenho', 'Impressão', 'Calandra', 'Corte', 'Costura', 'Acabamento', 'Finalizado']

function QRCodeSVG({ url }) {
  const [svg, setSvg] = useState('')

  useEffect(() => {
    let cancelled = false
    import('qrcode').then((QRCode) => {
      QRCode.toString(url, { type: 'svg', margin: 1, width: 120, color: { dark: '#000', light: '#fff' } })
        .then((s) => { if (!cancelled) setSvg(s) })
        .catch(() => {})
    })
    return () => { cancelled = true }
  }, [url])

  if (!svg) return <div className="w-[120px] h-[120px] bg-gray-100 rounded" />
  return <div dangerouslySetInnerHTML={{ __html: svg }} />
}

function PrintOS() {
  const { id } = useParams()
  const navigate = useNavigate()
  const printRef = useRef(null)
  const [order, setOrder] = useState(null)
  const [company, setCompany] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      ordersService.getById(id),
      companyService.getSettings(),
    ])
      .then(([o, c]) => { setOrder(o); setCompany(c) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  const handlePrint = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    const content = printRef.current?.innerHTML || ''
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${order?.order_number || 'OS'}</title>
        <style>
          @page { size: A4; margin: 0; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Inter', Arial, sans-serif; font-size: 10px; line-height: 1.4; color: #000; padding: 15mm 20mm; }
          table { width: 100%; border-collapse: collapse; }
          td, th { padding: 4px 6px; text-align: left; font-size: 10px; }
          .border { border: 1px solid #ddd; }
          .border-b { border-bottom: 1px solid #ddd; }
          .border-t { border-top: 1px solid #ddd; }
          .text-center { text-align: center; }
          .text-right { text-align: right; }
          .font-bold { font-weight: 700; }
          .text-lg { font-size: 14px; }
          .text-xl { font-size: 18px; }
          .text-xs { font-size: 8px; }
          .text-sm { font-size: 9px; }
          .text-base { font-size: 11px; }
          .text-gray-500 { color: #6b7280; }
          .text-gray-900 { color: #111827; }
          .bg-gray-50 { background: #f9fafb; }
          .bg-gray-100 { background: #f3f4f6; }
          .rounded { border-radius: 4px; }
          .rounded-lg { border-radius: 8px; }
          .p-3 { padding: 12px; }
          .p-4 { padding: 16px; }
          .p-5 { padding: 20px; }
          .mb-2 { margin-bottom: 8px; }
          .mb-3 { margin-bottom: 12px; }
          .mb-4 { margin-bottom: 16px; }
          .mb-5 { margin-bottom: 20px; }
          .mt-2 { margin-top: 8px; }
          .mt-4 { margin-top: 16px; }
          .mt-8 { margin-top: 32px; }
          .flex { display: flex; }
          .flex-1 { flex: 1; }
          .items-start { align-items: flex-start; }
          .items-center { align-items: center; }
          .justify-between { justify-content: space-between; }
          .gap-2 { gap: 8px; }
          .gap-4 { gap: 16px; }
          .gap-6 { gap: 24px; }
          .gap-8 { gap: 32px; }
          .w-1\\/2 { width: 50%; }
          .leading-relaxed { line-height: 1.6; }
          .uppercase { text-transform: uppercase; }
          .tracking-wider { letter-spacing: 0.05em; }
          .page-break { page-break-after: always; }
          .img-grid { display: flex; flex-wrap: wrap; gap: 8px; }
          .img-grid img { width: calc(33.333% - 6px); max-height: 200px; object-fit: contain; border: 1px solid #ddd; border-radius: 4px; }
        </style>
      </head>
      <body>
        ${content}
        <script>
          var imgs = Array.prototype.slice.call(document.images);
          var len = imgs.length;
          var loaded = 0;
          var printed = false;
          function triggerPrint() {
            if (printed) return;
            printed = true;
            window.onafterprint = function() { window.close(); };
            window.print();
          }
          if (len === 0) { triggerPrint(); }
          else {
            imgs.forEach(function(img) {
              if (img.complete) { loaded++; if (loaded >= len) triggerPrint(); }
              else {
                img.addEventListener('load', function() { loaded++; if (loaded >= len) triggerPrint(); });
                img.addEventListener('error', function() { loaded++; if (loaded >= len) triggerPrint(); });
              }
            });
            setTimeout(triggerPrint, 3000);
          }
        </script>
      </body>
      </html>
    `)
    printWindow.document.close()
  }

  const handleDownload = () => {
    const content = printRef.current?.innerHTML || ''
    const blob = new Blob([`
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${order?.order_number || 'OS'}</title>
        <style>
          @page { size: A4; margin: 15mm 20mm; }
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Inter', Arial, sans-serif; font-size: 10px; line-height: 1.4; color: #000; }
          table { width: 100%; border-collapse: collapse; }
          td, th { padding: 4px 6px; text-align: left; font-size: 10px; border: 1px solid #ddd; }
          th { background: #f3f4f6; font-weight: 600; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .font-bold { font-weight: 700; }
          .text-lg { font-size: 14px; }
          .text-xl { font-size: 18px; }
          .text-gray-500 { color: #6b7280; }
          .text-gray-900 { color: #111827; }
          .bg-gray-50 { background: #f9fafb; }
          .bg-gray-100 { background: #f3f4f6; }
          .mb-3 { margin-bottom: 12px; }
          .mb-4 { margin-bottom: 16px; }
          .mb-5 { margin-bottom: 20px; }
          .mt-4 { margin-top: 16px; }
          .mt-8 { margin-top: 32px; }
          .p-3 { padding: 12px; }
          .p-5 { padding: 20px; }
          .flex { display: flex; }
          .flex-1 { flex: 1; }
          .items-center { align-items: center; }
          .justify-between { justify-content: space-between; }
          .gap-8 { gap: 32px; }
          .w-1\\/2 { width: 50%; }
          .border-b { border-bottom: 1px solid #ddd; }
          .page-break { page-break-after: always; }
          .img-grid { display: flex; flex-wrap: wrap; gap: 8px; }
          .img-grid img { width: calc(33.333% - 6px); max-height: 200px; object-fit: contain; border: 1px solid #ddd; border-radius: 4px; }
        </style>
      </head>
      <body>${content}</body>
      </html>
    `], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${order?.order_number || 'os'}.html`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-sm text-gray-400">Carregando...</div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-white gap-4">
        <p className="text-gray-400">OS não encontrada</p>
        <Button variant="outline" onClick={() => navigate('/orders')}>Voltar</Button>
      </div>
    )
  }

  const items = order.order_items || []
  const sizeSummary = items.reduce((acc, item) => {
    if (item.size) {
      acc[item.size] = (acc[item.size] || 0) + item.quantity
    }
    return acc
  }, {})
  const sizeKeys = ['PP', 'P', 'M', 'G', 'GG', 'XGG', 'EG', 'XG', 'XEG']

  const totalQty = items.reduce((s, i) => s + i.quantity, 0)
  const totalValue = items.reduce((s, i) => s + Number(i.total_price || 0), 0)
  const avgPrice = totalQty > 0 ? (totalValue / totalQty) : 0
  const images = order.production_order_images || []

  const orderUrl = `${window.location.origin}/orders/${order.id}`

  const cl = order.clients || {}
  const cmp = company || {}

  const paymentStatusColor = order.payment_status === 'pago' ? 'text-green-600' :
    order.payment_status === 'entrada_parcial' ? 'text-yellow-600' : 'text-red-600'

  return (
    <div className="min-h-screen bg-gray-100">
      <div className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-[210mm] mx-auto px-6 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate(`/orders/${order.id}`)}
            className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 cursor-pointer"
          >
            <ArrowLeft size={16} /> Voltar
          </button>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDownload}>
              <Download size={14} /> HTML
            </Button>
            <Button size="sm" onClick={handlePrint}>
              <Printer size={14} /> Imprimir / PDF
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-[210mm] mx-auto bg-white shadow-lg my-8" style={{ minHeight: '297mm' }}>
        <div ref={printRef} className="p-[15mm_20mm]">
          <div className="flex justify-between items-start mb-6 pb-4 border-b-2 border-gray-900">
            <div>
              {cmp.logo_url ? (
                <img src={cmp.logo_url} alt="Logo" className="h-16 object-contain mb-1" />
              ) : (
                <div className="flex items-center gap-3 mb-1">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
                    <span className="text-xl font-bold text-white">C</span>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-gray-900">{cmp.trade_name || cmp.company_name || 'CONFECÇÃO'}</div>
                  </div>
                </div>
              )}
              <div className="text-xs text-gray-500 leading-relaxed mt-1">
                {cmp.company_name && <div>{cmp.company_name}</div>}
                {cmp.cnpj && <div>CNPJ: {cmp.cnpj}</div>}
                {cmp.phone && <div>Tel: {cmp.phone}</div>}
                {cmp.address && <div>{cmp.address}{cmp.number ? `, ${cmp.number}` : ''}</div>}
                {cmp.city && cmp.state && <div>{cmp.city} - {cmp.state}</div>}
              </div>
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-gray-900">{order.order_number}</div>
              <table className="mt-2 text-xs">
                <tbody>
                  <tr><td className="text-gray-500 pr-3 py-0.5">Data do Pedido:</td><td className="font-medium py-0.5">{formatDate(order.entry_date)}</td></tr>
                  <tr><td className="text-gray-500 pr-3 py-0.5">Previsão de Entrega:</td><td className="font-medium py-0.5">{formatDate(order.delivery_date)}</td></tr>
                  <tr><td className="text-gray-500 pr-3 py-0.5">Status:</td><td className="py-0.5"><span className={`font-bold ${order.status === 'cancelada' ? 'text-red-600' : order.status === 'finalizada' || order.status === 'entregue' ? 'text-green-600' : 'text-blue-600'}`}>{statusLabels[order.status] || order.status}</span></td></tr>
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded p-3 mb-4">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Dados do Cliente</div>
            <div className="flex gap-8 flex-wrap">
              <div>
                <div className="text-xs text-gray-500">Cliente</div>
                <div className="text-sm font-bold">{cl.name || '---'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Contato</div>
                <div className="text-sm">{order.contact_person || '---'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Telefone</div>
                <div className="text-sm">{cl.whatsapp || cl.phone || '---'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Cidade</div>
                <div className="text-sm">{cl.city || '---'}</div>
              </div>
              <div>
                <div className="text-xs text-gray-500">Vendedor</div>
                <div className="text-sm font-medium">{order.seller?.name || '---'}</div>
              </div>
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg p-5 mb-5 bg-gray-50">
            <div className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-3 pb-2 border-b border-gray-200">Dados do Pedido</div>
            <div className="flex gap-8 flex-wrap">
              <div className="flex-1 min-w-[120px]">
                <div className="text-xs text-gray-500 mb-1">Produto</div>
                <div className="text-lg font-bold text-gray-900">{order.products?.name || '---'}</div>
              </div>
              <div className="flex-1 min-w-[120px]">
                <div className="text-xs text-gray-500 mb-1">Categoria</div>
                <div className="text-lg font-bold text-gray-900">{order.products?.category || '---'}</div>
              </div>
              <div className="flex-1 min-w-[120px]">
                <div className="text-xs text-gray-500 mb-1">Quantidade Total</div>
                <div className="text-lg font-bold text-gray-900">{totalQty} peças</div>
              </div>
              <div className="flex-1 min-w-[120px]">
                <div className="text-xs text-gray-500 mb-1">Prioridade</div>
                <div className="text-lg font-bold text-gray-900">{priorityLabels[order.priority] || order.priority}</div>
              </div>
            </div>
          </div>

          <div className="mb-4">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Itens da Produção</div>
            <table className="w-full border border-gray-300">
              <thead>
                <tr className="bg-gray-100 text-xs">
                  <th className="border border-gray-300 p-2 text-center w-8">Nº</th>
                  <th className="border border-gray-300 p-2">Modelo</th>
                  <th className="border border-gray-300 p-2">Nome Personalizado</th>
                  <th className="border border-gray-300 p-2 text-center w-14">Tam</th>
                  <th className="border border-gray-300 p-2 text-center w-14">Qtd</th>
                  <th className="border border-gray-300 p-2 text-right w-20">Valor Unit.</th>
                  <th className="border border-gray-300 p-2 text-right w-20">Valor Total</th>
                </tr>
              </thead>
              <tbody>
                {items.length > 0 ? items.map((item, i) => (
                  <tr key={item.id} className="text-xs">
                    <td className="border border-gray-300 p-2 text-center">{String(i + 1).padStart(3, '0')}</td>
                    <td className="border border-gray-300 p-2">{item.model}</td>
                    <td className="border border-gray-300 p-2">{item.custom_name || '—'}</td>
                    <td className="border border-gray-300 p-2 text-center">{item.size || '—'}</td>
                    <td className="border border-gray-300 p-2 text-center font-medium">{item.quantity}</td>
                    <td className="border border-gray-300 p-2 text-right">{formatCurrency(item.unit_price)}</td>
                    <td className="border border-gray-300 p-2 text-right font-medium">{formatCurrency(item.total_price)}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={7} className="border border-gray-300 p-4 text-center text-xs text-gray-400">Nenhum item cadastrado</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="flex gap-4 mb-4">
            <div className="w-1/2 border border-gray-200 rounded p-3">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Resumo por Tamanho</div>
              <table className="w-full">
                <thead>
                  <tr className="text-xs text-gray-500 border-b border-gray-200">
                    <th className="text-left py-1">Tamanho</th>
                    <th className="text-right py-1">Quantidade</th>
                  </tr>
                </thead>
                <tbody>
                  {sizeKeys.filter(s => sizeSummary[s]).map(s => (
                    <tr key={s} className="text-xs border-b border-gray-100">
                      <td className="py-1 font-medium">{s}</td>
                      <td className="py-1 text-right">{sizeSummary[s]}</td>
                    </tr>
                  ))}
                  {Object.keys(sizeSummary).filter(s => !sizeKeys.includes(s)).map(s => (
                    <tr key={s} className="text-xs border-b border-gray-100">
                      <td className="py-1 font-medium">{s}</td>
                      <td className="py-1 text-right">{sizeSummary[s]}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="w-1/2 border border-gray-200 rounded p-3">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Resumo Financeiro</div>
              <table className="w-full">
                <tbody>
                  <tr className="text-xs border-b border-gray-100">
                    <td className="py-1 text-gray-500">Quantidade Total</td>
                    <td className="py-1 text-right font-medium">{totalQty} peças</td>
                  </tr>
                  <tr className="text-xs border-b border-gray-100">
                    <td className="py-1 text-gray-500">Valor Total</td>
                    <td className="py-1 text-right font-bold">{formatCurrency(totalValue)}</td>
                  </tr>
                  {order.payment_status && (
                    <tr className="text-xs border-b border-gray-100">
                      <td className="py-1 text-gray-500">Status Financeiro</td>
                      <td className={`py-1 text-right font-medium ${paymentStatusColor}`}>
                        {paymentStatusLabels[order.payment_status]}
                      </td>
                    </tr>
                  )}
                  {order.entry_amount > 0 && (
                    <tr className="text-xs border-b border-gray-100">
                      <td className="py-1 text-gray-500">Valor de Entrada</td>
                      <td className="py-1 text-right font-medium text-green-600">{formatCurrency(order.entry_amount)}</td>
                    </tr>
                  )}
                  {order.remaining_amount > 0 && (
                    <tr className="text-xs border-b border-gray-100">
                      <td className="py-1 text-gray-500">Saldo Restante</td>
                      <td className="py-1 text-right font-medium text-red-600">{formatCurrency(order.remaining_amount)}</td>
                    </tr>
                  )}
                  {order.payment_method && (
                    <tr className="text-xs border-b border-gray-100">
                      <td className="py-1 text-gray-500">Forma de Pagamento</td>
                      <td className="py-1 text-right font-medium">{paymentMethodLabels[order.payment_method] || order.payment_method}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="border border-gray-200 rounded p-3 mb-4">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Fases da Produção</div>
            <div className="flex flex-wrap gap-x-6 gap-y-1">
              {stageNames.map((stage) => (
                <div key={stage} className="flex items-center gap-2 text-sm">
                  <span className="inline-block w-4 h-4 border-2 border-gray-400 rounded" />
                  <span>{stage}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="border border-gray-200 rounded p-3 mb-4">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Observações da Produção</div>
            <div className="text-xs leading-relaxed">
              {order.notes ? (
                <p className="text-sm text-gray-700">{order.notes}</p>
              ) : (
                <>
                  ________________________________<br />
                  ________________________________<br />
                  ________________________________<br />
                  ________________________________
                </>
              )}
            </div>
          </div>

          {order.financial_notes && (
            <div className="border border-gray-200 rounded p-3 mb-4">
              <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Observações Financeiras</div>
              <p className="text-sm text-gray-700">{order.financial_notes}</p>
            </div>
          )}

          {(images.length > 0 || order.reference_image_url) && (
            <>
              <div className="page-break" />
              <div className="mt-8 pt-4 border-t-2 border-gray-900">
                <div className="text-sm font-bold text-gray-700 uppercase tracking-wider mb-4">Imagens de Referência</div>
                <div className="img-grid">
                  {images.map(img => (
                    <img key={img.id} src={img.image_url} alt="Referência" />
                  ))}
                  {order.reference_image_url && images.length === 0 && (
                    <img src={order.reference_image_url} alt="Referência" />
                  )}
                </div>
              </div>
            </>
          )}

          <div className="flex items-end justify-between mt-8 pt-4 border-t border-gray-300">
            <div className="flex gap-8">
              <div className="text-center">
                <div className="text-xs text-gray-500 mb-1">Responsável</div>
                <div className="text-xs font-medium text-gray-700 mb-1">{cmp.responsible_name || '________________________'}</div>
                <div className="text-xs text-gray-500">{cmp.responsible_position || ''}</div>
                <div className="w-40 border-t border-gray-400 pt-1 mt-2" />
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-500 mb-1">Responsável Produção</div>
                <div className="w-40 border-t border-gray-400 pt-1 mt-2" />
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-500 mb-1">Cliente</div>
                <div className="w-40 border-t border-gray-400 pt-1 mt-2" />
              </div>
            </div>
            <div className="text-center">
              <QRCodeSVG url={orderUrl} />
              <div className="text-xs text-gray-500 mt-1">Escanear para detalhes</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PrintOS