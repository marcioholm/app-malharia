import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Upload, Trash2, Save, Building2, Image as ImageIcon } from 'lucide-react'
import toast from 'react-hot-toast'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Textarea } from '../components/ui/textarea'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card'
import { companyService } from '../services/company'

const states = [
  'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO',
  'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI',
  'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO',
]

export function CompanySettings() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [form, setForm] = useState({
    logo_url: '',
    company_name: '',
    trade_name: '',
    cnpj: '',
    state_registration: '',
    municipal_registration: '',
    phone: '',
    whatsapp: '',
    email: '',
    website: '',
    address: '',
    number: '',
    district: '',
    city: '',
    state: '',
    zip_code: '',
    responsible_name: '',
    responsible_position: '',
    notes: '',
  })

  useEffect(() => {
    const load = async () => {
      try {
        const settings = await companyService.getSettings()
        if (settings) setForm(settings)
      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Logo deve ter no máximo 5MB')
      return
    }

    if (!['image/png', 'image/jpeg', 'image/svg+xml'].includes(file.type)) {
      toast.error('Formatos permitidos: PNG, JPG, SVG')
      return
    }

    setUploading(true)
    try {
      if (form.logo_url) await companyService.removeLogo(form.logo_url)
      const url = await companyService.uploadLogo(file)
      setForm(prev => ({ ...prev, logo_url: url }))
      toast.success('Logo enviada!')
    } catch (err) {
      toast.error(`Erro ao enviar: ${err.message}`)
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveLogo = async () => {
    if (form.logo_url) await companyService.removeLogo(form.logo_url)
    setForm(prev => ({ ...prev, logo_url: '' }))
    toast.success('Logo removida')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      await companyService.saveSettings(form)
      toast.success('Dados da empresa salvos!')
    } catch (err) {
      toast.error(`Erro ao salvar: ${err.message}`)
    } finally {
      setSaving(false)
    }
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

  const InputField = ({ label, field, placeholder, type = 'text', required, className }) => (
    <div className={`space-y-1.5 ${className || ''}`}>
      <Label>{label}{required && ' *'}</Label>
      <Input
        type={type}
        value={form[field] || ''}
        onChange={e => setForm({ ...form, [field]: e.target.value })}
        placeholder={placeholder}
        required={required}
      />
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate('/settings')}
          className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
        >
          <ArrowLeft size={18} className="text-text-secondary" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-text-primary">Minha Empresa</h1>
          <p className="text-sm text-text-muted mt-1">Informações institucionais utilizadas em OS, PDF e relatórios</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Logo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon size={18} className="text-primary" />
              Logo da Empresa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-6">
              <div className="flex-shrink-0">
                {form.logo_url ? (
                  <div className="relative w-32 h-32 rounded-2xl border border-border overflow-hidden bg-gray-50">
                    <img src={form.logo_url} alt="Logo" className="w-full h-full object-contain" />
                  </div>
                ) : (
                  <div className="flex items-center justify-center w-32 h-32 rounded-2xl border-2 border-dashed border-border bg-gray-50">
                    <Building2 size={32} className="text-text-muted" />
                  </div>
                )}
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-text-primary font-medium">Logo da empresa</p>
                  <p className="text-xs text-text-muted">PNG, JPG ou SVG. Máx 5MB.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <label className="cursor-pointer">
                    <Button type="button" variant="outline" size="sm" disabled={uploading}>
                      <Upload size={14} />
                      {uploading ? 'Enviando...' : form.logo_url ? 'Substituir' : 'Enviar Logo'}
                    </Button>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/svg+xml"
                      onChange={handleLogoUpload}
                      className="hidden"
                    />
                  </label>
                  {form.logo_url && (
                    <Button type="button" variant="outline" size="sm" onClick={handleRemoveLogo}>
                      <Trash2 size={14} /> Remover
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Company Data */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 size={18} className="text-primary" />
              Dados da Empresa
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField label="Razão Social" field="company_name" placeholder="Razão social da empresa" required />
              <InputField label="Nome Fantasia" field="trade_name" placeholder="Nome fantasia" />
              <InputField label="CNPJ" field="cnpj" placeholder="00.000.000/0001-00" />
              <InputField label="Inscrição Estadual" field="state_registration" placeholder="Inscrição estadual" />
              <InputField label="Inscrição Municipal" field="municipal_registration" placeholder="Inscrição municipal" className="md:col-span-2" />
            </div>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Contato
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField label="Telefone" field="phone" placeholder="(99) 9999-9999" />
              <InputField label="WhatsApp" field="whatsapp" placeholder="(99) 99999-9999" />
              <InputField label="Email" field="email" type="email" placeholder="contato@empresa.com" />
              <InputField label="Site" field="website" placeholder="https://www.empresa.com" />
            </div>
          </CardContent>
        </Card>

        {/* Address */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Endereço
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField label="CEP" field="zip_code" placeholder="00000-000" />
              <InputField label="Endereço" field="address" placeholder="Rua, Avenida..." />
              <InputField label="Número" field="number" placeholder="123" />
              <InputField label="Bairro" field="district" placeholder="Bairro" />
              <InputField label="Cidade" field="city" placeholder="Cidade" />
              <div className="space-y-1.5">
                <Label>Estado</Label>
                <select
                  className="flex h-10 w-full rounded-xl border border-border bg-white px-4 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
                  value={form.state || ''}
                  onChange={e => setForm({ ...form, state: e.target.value })}
                >
                  <option value="">Selecione</option>
                  {states.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Responsible */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              Responsável
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <InputField label="Nome do Responsável" field="responsible_name" placeholder="Nome completo" />
              <InputField label="Cargo/Função" field="responsible_position" placeholder="Ex: Diretor, Gerente de Produção" />
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card>
          <CardHeader>
            <CardTitle>Observações</CardTitle>
          </CardHeader>
          <CardContent>
            <Textarea
              value={form.notes || ''}
              onChange={e => setForm({ ...form, notes: e.target.value })}
              placeholder="Informações adicionais..."
              rows={3}
            />
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={() => navigate('/settings')}>Cancelar</Button>
          <Button type="submit" disabled={saving}>
            <Save size={16} />
            {saving ? 'Salvando...' : 'Salvar Dados da Empresa'}
          </Button>
        </div>
      </form>
    </div>
  )
}
