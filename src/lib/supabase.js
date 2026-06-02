import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Variáveis de ambiente ausentes. Crie um arquivo .env na raiz do projeto com:\n' +
    'VITE_SUPABASE_URL=sua_url\n' +
    'VITE_SUPABASE_ANON_KEY=sua_chave_anon'
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
