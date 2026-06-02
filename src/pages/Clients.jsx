import { useEffect, useState } from 'react'
import { Plus, Search, Edit2, Trash2, Users as UsersIcon } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card'
import { Dialog, DialogHeader, DialogTitle, DialogContent } from '../components/ui/dialog'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import { Avatar } from '../components/ui/avatar'
import { clientsService } from '../services/clients'

export function Clients() {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingClient, setEditingClient] = useState(null)
  const [form, setForm] = useState({ name: '', phone: '', whatsapp: '', email: '', city: '', address: '', notes: '' })

  useEffect(() => { loadClients() }, [])

  const loadClients = async () => {
    try { setClients(await clientsService.list()) }
    catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const filtered = clients.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))

  const openCreate = () => { setEditingClient(null); setForm({ name: '', phone: '', whatsapp: '', email: '', city: '', address: '', notes: '' }); setModalOpen(true) }
  const openEdit = (client) => { setEditingClient(client); setForm({ name: client.name, phone: client.phone || '', whatsapp: client.whatsapp || '', email: client.email || '', city: client.city || '', address: client.address || '', notes: client.notes || '' }); setModalOpen(true) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingClient) {
        await clientsService.update(editingClient.id, form)
        toast.success('Cliente atualizado!')
      } else {
        await clientsService.create(form)
        toast.success('Cliente criado!')
      }
      setModalOpen(false); loadClients()
    } catch (err) { toast.error(`Erro: ${err.message}`) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja excluir este cliente?')) return
    try { await clientsService.delete(id); toast.success('Cliente excluído'); loadClients() }
    catch (err) { toast.error(`Erro: ${err.message}`) }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Clientes</h1>
          <p className="text-sm text-text-muted mt-1">Gerencie os clientes da confecção</p>
        </div>
        <Button onClick={openCreate}><Plus size={18} /> Novo Cliente</Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="relative mb-6">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
            <Input className="pl-11" placeholder="Buscar cliente..." value={search} onChange={(e) => setSearch(e.target.value)} />
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
          ) : filtered.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-xs font-medium text-text-muted uppercase tracking-wider">Cliente</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-text-muted uppercase tracking-wider">Contato</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-text-muted uppercase tracking-wider">WhatsApp</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-text-muted uppercase tracking-wider">Cidade</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-text-muted uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-light">
                  {filtered.map((client) => (
                    <tr key={client.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <Avatar name={client.name} size="sm" />
                          <span className="font-medium text-text-primary">{client.name}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-text-secondary">{client.phone || '—'}</td>
                      <td className="py-3 px-4 text-text-secondary">{client.whatsapp || '—'}</td>
                      <td className="py-3 px-4 text-text-secondary">{client.city || '—'}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => openEdit(client)} className="p-2 rounded-lg hover:bg-gray-100 text-text-muted hover:text-primary transition-colors cursor-pointer"><Edit2 size={16} /></button>
                          <button onClick={() => handleDelete(client.id)} className="p-2 rounded-lg hover:bg-gray-100 text-text-muted hover:text-danger transition-colors cursor-pointer"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="h-16 w-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                  <UsersIcon size={32} className="text-text-muted" />
              </div>
              <p className="text-sm text-text-muted">Nenhum cliente encontrado</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogHeader><DialogTitle>{editingClient ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle></DialogHeader>
        <DialogContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2"><Label>Nome *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Telefone</Label><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></div>
              <div className="space-y-2"><Label>WhatsApp</Label><Input value={form.whatsapp} onChange={(e) => setForm({ ...form, whatsapp: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2"><Label>Cidade</Label><Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} /></div>
              <div className="space-y-2"><Label>Endereço</Label><Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Observações</Label><Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button type="submit">{editingClient ? 'Salvar' : 'Criar'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
