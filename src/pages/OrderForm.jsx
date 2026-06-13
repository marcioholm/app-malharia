import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, Plus, Trash2, UserPlus, ImageUp, X, Copy } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card'
import { Dialog, DialogHeader, DialogTitle, DialogContent } from '../components/ui/dialog'
import { clientsService } from '../services/clients'
import { productsService } from '../services/products'
import { ordersService } from '../services/orders'
import { authService, normalizeRole } from '../services/auth'
import { formatCurrency } from '../lib/utils'

export function OrderForm() {
  const navigate = useNavigate()
  const [clients, setClients] = useState([])
  const [products, setProducts] = useState([])
  const [sellers, setSellers] = useState([])
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [newClientOpen, setNewClientOpen] = useState(false)
  const [newClientForm, setNewClientForm] = useState({ name: '', phone: '', whatsapp: '', email: '', city: '' })
  const [form, setForm] = useState({
    client_id: '',
    product_id: '',
    entry_date: new Date().toISOString().split('T')[0],
    delivery_date: '',
    priority: 'normal',
    contact_person: '',
    phone: '',
    notes: '',
    seller_id: '',
    estimated_value: 0,
    discount_value: 0,
    entry_amount: 0,
    payment_method: '',
    financial_notes: '',
    commission_percentage: 0,
  })
  const [items, setItems] = useState([{ model: '', custom_name: '', item_number: '', size: '', quantity: 1, unit_price: 0, notes: '' }])
  const [imageFiles, setImageFiles] = useState([])
  const [imagePreviews, setImagePreviews] = useState([])

  useEffect(() => {
    const load = async () => {
      try {
        const [c, p, s, prof] = await Promise.all([
          clientsService.list(),
          productsService.list(),
          authService.getUsersByRole(['vendedor', 'seller', 'gerente', 'manager', 'admin_empresa', 'admin']),
          authService.getCurrentUser().then(u => u ? authService.getProfile(u.id) : null),
        ])
        setClients(c)
        setProducts(p)
        setSellers(s)
        setProfile(prof)
      } catch (err) {
        console.error(err)
      }
    }
    load()
  }, [])

  const userRole = normalizeRole(profile?.role)
  const isAdmin = userRole === 'super_admin' || userRole === 'admin_empresa'

  const handleClientChange = (clientId) => {
    const client = clients.find(c => c.id === clientId)
    setForm({
      ...form,
      client_id: clientId,
      contact_person: client ? client.name : '',
      phone: client ? (client.phone || client.whatsapp || '') : '',
    })
  }

  const handleCreateClient = async (e) => {
    e.preventDefault()
    if (!newClientForm.name) return
    try {
      const created = await clientsService.create(newClientForm)
      const updated = await clientsService.list()
      setClients(updated)
      handleClientChange(created.id)
      setNewClientOpen(false)
      setNewClientForm({ name: '', phone: '', whatsapp: '', email: '', city: '' })
      toast.success('Cliente criado!')
    } catch (err) {
      toast.error(`Erro ao criar cliente: ${err.message}`)
    }
  }

  const getNextOrderNumber = async () => {
    const orders = await ordersService.list()
    const maxNum = orders.reduce((max, o) => {
      const match = o.order_number?.match(/OS-\d+-(\d+)/)
      const num = match ? parseInt(match[1]) : parseInt(o.order_number) || 0
      return num > max ? num : max
    }, 0)
    const year = new Date().getFullYear()
    return `OS-${year}-${String(maxNum + 1).padStart(6, '0')}`
  }

  const addItem = () => {
    setItems([...items, { model: '', custom_name: '', item_number: '', size: '', quantity: 1, unit_price: 0, notes: '' }])
  }

  const removeItem = (i) => {
    if (items.length <= 1) return
    setItems(items.filter((_, idx) => idx !== i))
  }

  const duplicateItem = (i) => {
    const newItems = [...items]
    newItems.splice(i + 1, 0, { ...items[i] })
    setItems(newItems)
  }

  const updateItem = (i, field, value) => {
    const updated = [...items]
    updated[i] = { ...updated[i], [field]: value }
    setItems(updated)
  }

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files || [])
    const validFiles = files.filter(f => {
      if (f.size > 5 * 1024 * 1024) {
        toast.error(`Imagem ${f.name} excede 5MB`)
        return false
      }
      const allowed = ['image/jpeg', 'image/png', 'image/webp']
      if (!allowed.includes(f.type)) {
        toast.error(`Formato não permitido: ${f.name}`)
        return false
      }
      return true
    })

    const totalSlots = 5 - imageFiles.length
    const toAdd = validFiles.slice(0, totalSlots)

    if (toAdd.length < validFiles.length) {
      toast.error('Máximo de 5 imagens por OS')
    }

    setImageFiles(prev => [...prev, ...toAdd])
    setImagePreviews(prev => [...prev, ...toAdd.map(f => URL.createObjectURL(f))])
  }

  const removeImage = (index) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index))
    setImagePreviews(prev => {
      URL.revokeObjectURL(prev[index])
      return prev.filter((_, i) => i !== index)
    })
  }

  const totalQty = items.reduce((s, i) => s + (Number(i.quantity) || 0), 0)
  const totalPrice = items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unit_price) || 0), 0)
  const remainingAmount = totalPrice - (Number(form.entry_amount) || 0)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const orderData = {
        client_id: form.client_id,
        product_id: form.product_id,
        quantity: totalQty,
        total_price: totalPrice,
        estimated_value: Number(form.estimated_value) || 0,
        discount_value: Number(form.discount_value) || 0,
        entry_date: form.entry_date,
        delivery_date: form.delivery_date,
        priority: form.priority,
        contact_person: form.contact_person,
        phone: form.phone,
        notes: form.notes,
        seller_id: form.seller_id || null,
        entry_amount: Number(form.entry_amount) || 0,
        payment_method: form.payment_method || null,
        financial_notes: form.financial_notes || null,
        commission_percentage: isAdmin ? (Number(form.commission_percentage) || 0) : 0,
        commission_value: isAdmin ? (totalPrice * (Number(form.commission_percentage) || 0) / 100) : 0,
        order_number: await getNextOrderNumber(),
        current_stage: 'Aprovação de Orçamento',
        status: 'aberta',
        budget_status: 'pending',
      }
      const created = await ordersService.create(orderData, items)

      for (const file of imageFiles) {
        try {
          await ordersService.uploadImage(created.id, file)
        } catch (err) {
          console.error('Erro ao enviar imagem:', err)
        }
      }

      toast.success('OS criada com sucesso!')
      navigate('/orders')
    } catch (err) {
      console.error(err)
      toast.error(`Erro ao criar OS: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 relative pb-20">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/orders')}
          className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
        >
          <ArrowLeft size={18} className="text-text-secondary" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Nova Ordem de Serviço</h1>
          <p className="text-sm text-text-muted mt-1">Preencha os dados do pedido de produção</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados do Pedido</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              <div className="space-y-2">
                <Label>Cliente *</Label>
                <div className="flex gap-2">
                  <select
                    className="flex h-10 flex-1 rounded-xl border border-border bg-white px-4 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    value={form.client_id}
                    onChange={(e) => handleClientChange(e.target.value)}
                    required
                  >
                    <option value="">Selecione um cliente</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                  <Button type="button" variant="outline" size="sm" onClick={() => setNewClientOpen(true)} className="shrink-0">
                    <UserPlus size={16} />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Produto *</Label>
                <select
                  className="flex h-10 w-full rounded-xl border border-border bg-white px-4 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  value={form.product_id}
                  onChange={(e) => setForm({ ...form, product_id: e.target.value })}
                  required
                >
                  <option value="">Selecione um produto</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Vendedor Responsável</Label>
                <select
                  className="flex h-10 w-full rounded-xl border border-border bg-white px-4 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  value={form.seller_id}
                  onChange={(e) => setForm({ ...form, seller_id: e.target.value })}
                >
                  <option value="">Selecione um vendedor</option>
                  {sellers.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label>Contato</Label>
                <Input type="text" value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} placeholder="Nome do contato" />
              </div>

              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(99) 99999-9999" />
              </div>

              <div className="space-y-2">
                <Label>Prioridade</Label>
                <select
                  className="flex h-10 w-full rounded-xl border border-border bg-white px-4 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  value={form.priority}
                  onChange={(e) => setForm({ ...form, priority: e.target.value })}
                >
                  <option value="baixa">Baixa</option>
                  <option value="normal">Normal</option>
                  <option value="alta">Alta</option>
                  <option value="urgente">Urgente</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>Data de Entrada</Label>
                <Input type="date" value={form.entry_date} onChange={(e) => setForm({ ...form, entry_date: e.target.value })} />
              </div>

              <div className="space-y-2">
                <Label>Prazo de Entrega *</Label>
                <Input type="date" value={form.delivery_date} onChange={(e) => setForm({ ...form, delivery_date: e.target.value })} required />
              </div>
            </div>

            {/* Financial Section */}
            <div className="border-t border-border pt-6">
              <h3 className="text-base font-semibold text-text-primary mb-4">Informações Financeiras</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
                <div className="space-y-2">
                  <Label>Valor Estimado</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.estimated_value}
                    onChange={(e) => setForm({ ...form, estimated_value: e.target.value })}
                    placeholder="0,00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Desconto</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.discount_value}
                    onChange={(e) => setForm({ ...form, discount_value: e.target.value })}
                    placeholder="0,00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valor Total (itens)</Label>
                  <div className="flex h-10 items-center rounded-xl border border-border bg-gray-50 px-4 text-sm font-bold text-text-primary">
                    {formatCurrency(totalPrice)}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Valor de Entrada</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.entry_amount}
                    onChange={(e) => setForm({ ...form, entry_amount: e.target.value })}
                    placeholder="0,00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Saldo Restante</Label>
                  <div className="flex h-10 items-center rounded-xl border border-border bg-gray-50 px-4 text-sm font-bold text-text-primary">
                    {formatCurrency(Math.max(0, remainingAmount))}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-4">
                <div className="space-y-2">
                  <Label>Forma de Pagamento</Label>
                  <select
                    className="flex h-10 w-full rounded-xl border border-border bg-white px-4 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                    value={form.payment_method}
                    onChange={(e) => setForm({ ...form, payment_method: e.target.value })}
                  >
                    <option value="">Selecione</option>
                    <option value="dinheiro">Dinheiro</option>
                    <option value="pix">Pix</option>
                    <option value="cartao_credito">Cartão de Crédito</option>
                    <option value="cartao_debito">Cartão de Débito</option>
                    <option value="boleto">Boleto</option>
                    <option value="transferencia">Transferência</option>
                    <option value="outros">Outros</option>
                  </select>
                </div>
                {isAdmin && (
                  <div className="space-y-2">
                    <Label>Comissão (%)</Label>
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      value={form.commission_percentage}
                      onChange={(e) => setForm({ ...form, commission_percentage: e.target.value })}
                      placeholder="0%"
                    />
                  </div>
                )}
              </div>
              <div className="mt-4 space-y-2">
                <Label>Observações Financeiras</Label>
                <Textarea
                  value={form.financial_notes}
                  onChange={(e) => setForm({ ...form, financial_notes: e.target.value })}
                  rows={2}
                  placeholder="Observações sobre pagamento..."
                />
              </div>
            </div>

            {/* Items */}
            <div className="border-t border-border pt-6" id="items-section">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-text-primary">Itens da Produção</h3>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus size={14} /> Adicionar Item
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs text-text-muted uppercase tracking-wider">
                      <th className="text-left py-2 pr-2">Modelo</th>
                      <th className="text-left py-2 px-2">Nome</th>
                      <th className="text-center py-2 px-2 w-16">Nº</th>
                      <th className="text-center py-2 px-2 w-16">Tam</th>
                      <th className="text-center py-2 px-2 w-20">Qtd</th>
                      <th className="text-right py-2 px-2 w-24">Valor Unit.</th>
                      <th className="text-right py-2 px-2 w-24">V. Total</th>
                      <th className="w-24 py-2 pl-2" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-light">
                    {items.map((item, i) => (
                      <tr key={i}>
                        <td className="py-2 pr-2">
                          <Input
                            type="text"
                            value={item.model}
                            onChange={(e) => updateItem(i, 'model', e.target.value)}
                            placeholder="Ex: Dry Fit"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <Input
                            type="text"
                            value={item.custom_name}
                            onChange={(e) => updateItem(i, 'custom_name', e.target.value)}
                            placeholder="Nome"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <Input
                            type="text"
                            value={item.item_number}
                            onChange={(e) => updateItem(i, 'item_number', e.target.value)}
                            placeholder="Nº"
                            className="text-center"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <Input
                            type="text"
                            value={item.size}
                            onChange={(e) => updateItem(i, 'size', e.target.value)}
                            placeholder="Tam"
                            className="text-center"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <Input
                            type="number"
                            min="1"
                            value={item.quantity}
                            onChange={(e) => updateItem(i, 'quantity', parseInt(e.target.value) || 0)}
                            className="text-center"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unit_price}
                            onChange={(e) => updateItem(i, 'unit_price', parseFloat(e.target.value) || 0)}
                            className="text-right"
                          />
                        </td>
                        <td className="py-2 px-2 text-right font-medium text-xs">
                          {formatCurrency((Number(item.quantity) || 0) * (Number(item.unit_price) || 0))}
                        </td>
                        <td className="py-2 pl-2">
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => duplicateItem(i)}
                              className="text-primary hover:text-primary/80 cursor-pointer"
                              title="Duplicar item"
                            >
                              <Copy size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => removeItem(i)}
                              className="text-danger hover:text-danger/80 cursor-pointer disabled:opacity-30"
                              disabled={items.length <= 1}
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-border font-medium">
                      <td colSpan={4} className="py-2 text-sm text-text-primary">Total</td>
                      <td className="py-2 text-center text-sm">{totalQty}</td>
                      <td />
                      <td className="py-2 text-right text-sm font-bold">{formatCurrency(totalPrice)}</td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Observações de Produção</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
            </div>

            {/* Images */}
            <div className="space-y-2">
              <Label>Imagens da OS ({imageFiles.length}/5)</Label>
              <p className="text-xs text-text-muted">Anexe até 5 imagens para referência (JPG, PNG, WEBP — até 5MB cada)</p>
              <div className="flex flex-wrap gap-3">
                {imagePreviews.map((preview, i) => (
                  <div key={i} className="relative w-28 h-28 rounded-xl border border-border overflow-hidden bg-gray-50">
                    <img src={preview} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-danger text-white shadow-sm cursor-pointer"
                    >
                      <X size={10} />
                    </button>
                  </div>
                ))}
                {imageFiles.length < 5 && (
                  <label className="flex items-center justify-center w-28 h-28 rounded-xl border-2 border-dashed border-border bg-gray-50 hover:border-primary/40 hover:bg-primary-bg/30 transition-all cursor-pointer">
                    <div className="flex flex-col items-center gap-1 text-text-muted">
                      <ImageUp size={20} />
                      <span className="text-xs">Adicionar</span>
                    </div>
                    <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleImageSelect} className="hidden" multiple />
                  </label>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => navigate('/orders')}>Cancelar</Button>
              <Button type="submit" disabled={loading}>
                <Save size={16} />
                {loading ? 'Criando...' : 'Criar Ordem de Serviço'}
              </Button>
            </div>
          </form>

          <Dialog open={newClientOpen} onOpenChange={setNewClientOpen}>
            <DialogHeader><DialogTitle>Novo Cliente</DialogTitle></DialogHeader>
            <DialogContent>
              <form onSubmit={handleCreateClient} className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome *</Label>
                  <Input value={newClientForm.name} onChange={(e) => setNewClientForm({ ...newClientForm, name: e.target.value })} required />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Telefone</Label>
                    <Input value={newClientForm.phone} onChange={(e) => setNewClientForm({ ...newClientForm, phone: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>WhatsApp</Label>
                    <Input value={newClientForm.whatsapp} onChange={(e) => setNewClientForm({ ...newClientForm, whatsapp: e.target.value })} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input type="email" value={newClientForm.email} onChange={(e) => setNewClientForm({ ...newClientForm, email: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Cidade</Label>
                    <Input value={newClientForm.city} onChange={(e) => setNewClientForm({ ...newClientForm, city: e.target.value })} />
                  </div>
                </div>
                <div className="flex justify-end gap-3 pt-2">
                  <Button type="button" variant="outline" onClick={() => setNewClientOpen(false)}>Cancelar</Button>
                  <Button type="submit">Criar Cliente</Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>

      {/* Floating add button */}
      <button
        type="button"
        onClick={addItem}
        className="fixed bottom-6 right-6 lg:bottom-8 lg:right-8 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-white shadow-lg hover:bg-primary-dark hover:shadow-xl transition-all z-50 cursor-pointer"
        title="Adicionar item"
      >
        <Plus size={24} />
      </button>
    </div>
  )
}
