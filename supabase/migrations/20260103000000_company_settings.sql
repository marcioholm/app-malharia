-- ============================================================
-- ConfecOS - v3: Company Settings
-- ============================================================

CREATE TABLE IF NOT EXISTS company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE UNIQUE,
  logo_url text,
  company_name text,
  trade_name text,
  cnpj text,
  state_registration text,
  municipal_registration text,
  phone text,
  whatsapp text,
  email text,
  website text,
  address text,
  number text,
  district text,
  city text,
  state text,
  zip_code text,
  responsible_name text,
  responsible_position text,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view company settings"
  ON company_settings FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can insert company settings"
  ON company_settings FOR INSERT
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can update company settings"
  ON company_settings FOR UPDATE
  USING (company_id = get_user_company_id());

CREATE TRIGGER update_company_settings_updated_at
  BEFORE UPDATE ON company_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
