import { useEffect, useState } from 'react'
import { Plus, Search, Edit2, Trash2, Package } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card'
import { Dialog, DialogHeader, DialogTitle, DialogContent } from '../components/ui/dialog'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import { Badge } from '../components/ui/badge'
import { productsService } from '../services/products'

const categories = ['Camiseta', 'Uniforme', 'Moletom', 'Jaleco', 'Calça', 'Bermuda', 'Outro']

export function Products() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState(null)
  const [form, setForm] = useState({ name: '', category: '', sku: '', description: '' })

  useEffect(() => { loadProducts() }, [])

  const loadProducts = async () => {
    try { setProducts(await productsService.list()) }
    catch (err) { console.error(err) }
    finally { setLoading(false) }
  }

  const filtered = products.filter(p => p.name.toLowerCase().includes(search.toLowerCase()))

  const openCreate = () => { setEditingProduct(null); setForm({ name: '', category: '', sku: '', description: '' }); setModalOpen(true) }
  const openEdit = (p) => { setEditingProduct(p); setForm({ name: p.name, category: p.category || '', sku: p.sku || '', description: p.description || '' }); setModalOpen(true) }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingProduct) {
        await productsService.update(editingProduct.id, form)
        toast.success('Produto atualizado!')
      } else {
        await productsService.create(form)
        toast.success('Produto criado!')
      }
      setModalOpen(false); loadProducts()
    } catch (err) { toast.error(`Erro: ${err.message}`) }
  }

  const handleDelete = async (id) => {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return
    try { await productsService.delete(id); toast.success('Produto excluído'); loadProducts() }
    catch (err) { toast.error(`Erro: ${err.message}`) }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Produtos</h1>
          <p className="text-sm text-text-muted mt-1">Gerencie os produtos e modelos da confecção</p>
        </div>
        <Button onClick={openCreate}><Plus size={18} /> Novo Produto</Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="relative mb-6">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
            <Input className="pl-11" placeholder="Buscar produto..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          {loading ? (
            <div className="flex justify-center py-12"><div className="h-8 w-8 rounded-xl bg-primary flex items-center justify-center"><svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg></div></div>
          ) : filtered.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 text-xs font-medium text-text-muted uppercase tracking-wider">Produto</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-text-muted uppercase tracking-wider">Categoria</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-text-muted uppercase tracking-wider">SKU</th>
                    <th className="text-left py-3 px-4 text-xs font-medium text-text-muted uppercase tracking-wider">Descrição</th>
                    <th className="text-right py-3 px-4 text-xs font-medium text-text-muted uppercase tracking-wider">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-light">
                  {filtered.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 font-medium text-text-primary">{product.name}</td>
                      <td className="py-3 px-4">{product.category ? <Badge variant="primary">{product.category}</Badge> : '—'}</td>
                      <td className="py-3 px-4 text-text-secondary"><code className="text-xs bg-gray-100 px-2 py-0.5 rounded">{product.sku || '—'}</code></td>
                      <td className="py-3 px-4 text-text-secondary max-w-xs truncate">{product.description || '—'}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => openEdit(product)} className="p-2 rounded-lg hover:bg-gray-100 text-text-muted hover:text-primary transition-colors cursor-pointer"><Edit2 size={16} /></button>
                          <button onClick={() => handleDelete(product.id)} className="p-2 rounded-lg hover:bg-gray-100 text-text-muted hover:text-danger transition-colors cursor-pointer"><Trash2 size={16} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="h-16 w-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4"><Package size={32} className="text-text-muted" /></div>
              <p className="text-sm text-text-muted">Nenhum produto encontrado</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogHeader><DialogTitle>{editingProduct ? 'Editar Produto' : 'Novo Produto'}</DialogTitle></DialogHeader>
        <DialogContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2"><Label>Nome *</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Categoria</Label>
                <select className="flex h-10 w-full rounded-xl border border-border bg-white px-4 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  <option value="">Selecione</option>
                  {categories.map((cat) => (<option key={cat} value={cat}>{cat}</option>))}
                </select>
              </div>
              <div className="space-y-2"><Label>SKU</Label><Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Descrição</Label><Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Cancelar</Button>
              <Button type="submit">{editingProduct ? 'Salvar' : 'Criar'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
