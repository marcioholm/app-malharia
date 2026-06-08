import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Eye, EyeOff, Sparkles } from 'lucide-react'
import { authService } from '../services/auth'
import { companyService } from '../services/company'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [companyName, setCompanyName] = useState('')
  const [companyLogo, setCompanyLogo] = useState('')
  const [loaded, setLoaded] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    companyService.getSettings().then(data => {
      if (data) {
        setCompanyName(data.trade_name || data.company_name || 'ConfecOS')
        setCompanyLogo(data.logo_url || '')
      }
    }).catch(() => {
      setCompanyName('ConfecOS')
    })
    setTimeout(() => setLoaded(true), 100)
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await authService.login(email, password)
      const from = location.state?.from || '/dashboard'
      navigate(from, { replace: true })
    } catch (err) {
      setError(err.message === 'Invalid login credentials' ? 'Email ou senha inválidos' : err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen bg-[#0a0a0a] overflow-hidden relative">
      {/* Decorative background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-[500px] h-[500px] rounded-full bg-[#F97316]/5 blur-3xl" />
        <div className="absolute top-1/3 left-1/4 w-[300px] h-[300px] rounded-full bg-primary/3 blur-3xl" />
      </div>

      {/* Left side - Hero Image */}
      <div className="hidden lg:flex lg:w-[55%] relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat scale-110"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=1400&q=85')`,
            transform: loaded ? 'scale(1)' : 'scale(1.1)',
            transition: 'transform 1.5s cubic-bezier(0.16, 1, 0.3, 1)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0a0a]/90 via-[#0a0a0a]/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a]/60 via-transparent to-transparent" />

        {/* Decorative pattern overlay */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)`,
          backgroundSize: '40px 40px'
        }} />

        {/* Floating decorative circles */}
        <div className={`absolute top-[15%] right-[10%] w-32 h-32 rounded-full border border-white/10 backdrop-blur-sm transition-all duration-1000 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} />
        <div className={`absolute bottom-[25%] left-[15%] w-20 h-20 rounded-full bg-primary/10 backdrop-blur-sm transition-all duration-1000 delay-300 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} />

        {/* Hero Content */}
        <div className="relative z-10 flex flex-col justify-center px-16 w-full">
          <div className={`max-w-lg transition-all duration-1000 delay-200 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <div className="flex items-center gap-4 mb-8">
              {companyLogo ? (
                <img src={companyLogo} alt="" className="h-14 w-14 object-contain rounded-2xl bg-white/10 backdrop-blur-md p-2 border border-white/10" />
              ) : (
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md border border-white/10">
                  <Sparkles size={28} className="text-white" />
                </div>
              )}
              <div>
                <h1 className="text-4xl font-bold text-white font-serif tracking-tight leading-none">
                  {companyName}
                </h1>
                <p className="text-sm text-white/50 font-alt mt-2 tracking-wide uppercase">
                  Sistema de Ordem de Serviço
                </p>
              </div>
            </div>

            <p className="text-lg text-white/60 font-alt mt-8 leading-relaxed">
              Gerencie suas ordens de produção com acompanhamento visual em tempo real.
              Do desenho ao acabamento, cada fase sob controle.
            </p>

            <div className="mt-10 flex flex-wrap gap-3">
              {['Controle Total', 'Kanban Visual', 'Sem Atrasos'].map((item, i) => (
                <div
                  key={item}
                  className={`rounded-xl px-4 py-2.5 text-sm text-white/80 bg-white/5 backdrop-blur-md border border-white/10 font-alt transition-all duration-700 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                  style={{ transitionDelay: `${500 + i * 150}ms` }}
                >
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="flex-1 flex items-center justify-center px-6 lg:px-12 relative">
        <div className={`w-full max-w-sm transition-all duration-1000 delay-400 ${loaded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          {/* Mobile Logo */}
          <div className="lg:hidden flex flex-col items-center mb-10">
            {companyLogo ? (
              <img src={companyLogo} alt="" className="h-16 w-16 object-contain rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 p-2 mb-4" />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 mb-4">
                <Sparkles size={32} className="text-white" />
              </div>
            )}
            <h1 className="text-2xl font-bold text-white font-serif">{companyName}</h1>
            <p className="text-sm text-white/40 font-alt mt-1">Sistema de Ordem de Serviço</p>
          </div>

          <div className="text-center mb-8">
            <h2 className="text-xl font-bold text-white font-alt">Acessar o sistema</h2>
            <p className="text-sm text-white/40 font-alt mt-2">Faça login para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm text-white/60 font-alt font-medium">Email</Label>
              <div className="relative group">
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl focus:bg-white/10 focus:border-primary/50 transition-all font-alt"
                />
                <div className="absolute inset-0 rounded-xl border border-primary/0 group-focus-within:border-primary/30 transition-all pointer-events-none" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm text-white/60 font-alt font-medium">Senha</Label>
              <div className="relative group">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-12 bg-white/5 border-white/10 text-white placeholder:text-white/30 rounded-xl focus:bg-white/10 focus:border-primary/50 transition-all font-alt pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
                <div className="absolute inset-0 rounded-xl border border-primary/0 group-focus-within:border-primary/30 transition-all pointer-events-none" />
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-danger/10 border border-danger/20 p-4 text-sm text-danger/90 font-alt">
                {error}
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 rounded-xl bg-primary hover:bg-primary-dark text-white font-alt font-semibold shadow-lg shadow-primary/20 hover:shadow-primary/30 transition-all"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Entrando...
                </span>
              ) : 'Entrar'}
            </Button>
          </form>

          <p className="text-xs text-white/20 text-center mt-10 font-alt">
            {companyName} &mdash; Controle de Produção
          </p>
        </div>
      </div>
    </div>
  )
}
