import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Save, CheckCircle2, Plus, Trash2, UserPlus } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import { Select } from '../components/ui/select'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card'
import { Dialog, DialogHeader, DialogTitle, DialogContent } from '../components/ui/dialog'
import { clientsService } from '../services/clients'
import { productsService } from '../services/products'
import { ordersService } from '../services/orders'

const defaultStages = ['Desenho', 'Impressão', 'Calandra', 'Corte', 'Costura', 'Acabamento']

export function OrderForm() {
  const navigate = useNavigate()
  const [clients, setClients] = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [newClientOpen, setNewClientOpen] = useState(false)
  const [newClientForm, setNewClientForm] = useState({ name: '', phone: '', whatsapp: '', email: '', city: '' })
  const [form, setForm] = useState({
    client_id: '',
    product_id: '',
    unit_price: 0,
    entry_date: new Date().toISOString().split('T')[0],
    delivery_date: '',
    priority: 'normal',
    contact_person: '',
    phone: '',
    notes: '',
  })
  const [items, setItems] = useState([{ model: '', custom_name: '', size: '', quantity: 1, unit_price: 0 }])

  useEffect(() => {
    const load = async () => {
      try {
        const [c, p] = await Promise.all([clientsService.list(), productsService.list()])
        setClients(c)
        setProducts(p)
      } catch (err) {
        console.error(err)
      }
    }
    load()
  }, [])

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
    setItems([...items, { model: '', custom_name: '', size: '', quantity: 1, unit_price: 0 }])
  }

  const removeItem = (i) => {
    if (items.length <= 1) return
    setItems(items.filter((_, idx) => idx !== i))
  }

  const updateItem = (i, field, value) => {
    const updated = [...items]
    updated[i] = { ...updated[i], [field]: value }
    if (field === 'quantity' || field === 'unit_price') {
      updated[i].total_price = (Number(updated[i].quantity) || 0) * (Number(updated[i].unit_price) || 0)
    }
    setItems(updated)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    try {
      const totalQty = items.reduce((s, i) => s + (Number(i.quantity) || 0), 0)
      const totalPrice = items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unit_price) || 0), 0)
      const avgPrice = totalQty > 0 ? totalPrice / totalQty : 0
      const orderData = {
        client_id: form.client_id,
        product_id: form.product_id,
        quantity: totalQty,
        unit_price: avgPrice,
        total_price: totalPrice,
        entry_date: form.entry_date,
        delivery_date: form.delivery_date,
        priority: form.priority,
        contact_person: form.contact_person,
        phone: form.phone,
        notes: form.notes,
        order_number: await getNextOrderNumber(),
        current_stage: 'Desenho',
        status: 'aberta',
      }
      await ordersService.create(orderData, items)
      navigate('/orders')
    } catch (err) {
      console.error(err)
      alert('Erro ao criar OS')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
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
                <Label>Contato</Label>
                <Input type="text" value={form.contact_person} onChange={(e) => setForm({ ...form, contact_person: e.target.value })} placeholder="Nome do contato" />
              </div>
              <div className="space-y-2">
                <Label>Telefone</Label>
                <Input type="text" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="(99) 99999-9999" />
              </div>
              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                  <option value="baixa">Baixa</option>
                  <option value="normal">Normal</option>
                  <option value="alta">Alta</option>
                  <option value="urgente">Urgente</option>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Valor Unitário (R$)</Label>
                <Input type="number" min="0" step="0.01" value={form.unit_price} onChange={(e) => setForm({ ...form, unit_price: parseFloat(e.target.value) || 0 })} />
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

            {/* Items */}
            <div className="border-t border-border pt-6">
              <div className="flex items-center justify-between mb-4">
                <Label className="text-base font-semibold">Itens da Produção</Label>
                <Button type="button" variant="outline" size="sm" onClick={addItem}>
                  <Plus size={14} /> Adicionar Item
                </Button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border text-xs text-text-muted uppercase tracking-wider">
                      <th className="text-left py-2 pr-2">Modelo</th>
                      <th className="text-left py-2 px-2">Nome Personalizado</th>
                      <th className="text-center py-2 px-2 w-16">Tam</th>
                      <th className="text-center py-2 px-2 w-16">Qtd</th>
                      <th className="text-right py-2 px-2 w-24">Valor Unit.</th>
                      <th className="text-right py-2 px-2 w-24">Valor Total</th>
                      <th className="w-8 py-2 pl-2" />
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
                            placeholder="Nome (opcional)"
                          />
                        </td>
                        <td className="py-2 px-2">
                          <Input
                            type="text"
                            value={item.size}
                            onChange={(e) => updateItem(i, 'size', e.target.value)}
                            placeholder="Ex: M"
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
                        <td className="py-2 px-2 text-right font-medium">
                          {((Number(item.quantity) || 0) * (Number(item.unit_price) || 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        <td className="py-2 pl-2">
                          <button
                            type="button"
                            onClick={() => removeItem(i)}
                            className="text-danger hover:text-danger/80 cursor-pointer disabled:opacity-30"
                            disabled={items.length <= 1}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t border-border font-medium">
                      <td colSpan={3} className="py-2 text-sm text-text-primary">Total</td>
                      <td className="py-2 text-center text-sm">{items.reduce((s, i) => s + (Number(i.quantity) || 0), 0)}</td>
                      <td />
                      <td className="py-2 text-right text-sm font-bold">
                        {items.reduce((s, i) => s + (Number(i.quantity) || 0) * (Number(i.unit_price) || 0), 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
            </div>

            <div className="rounded-2xl bg-primary-bg border border-primary/20 p-5">
              <p className="text-sm font-medium text-primary mb-3">Fases da produção que serão criadas automaticamente:</p>
              <div className="flex flex-wrap gap-2">
                {defaultStages.map((stage, i) => (
                  <div key={stage} className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-text-secondary border border-border">
                    <CheckCircle2 size={12} className="text-primary" />
                    {stage}
                  </div>
                ))}
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
    </div>
  )
}
