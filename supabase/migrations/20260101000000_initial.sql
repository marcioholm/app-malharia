-- ============================================================
-- ConfecOS - Database Schema
-- ============================================================

-- 1. COMPANIES
CREATE TABLE companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  document text,
  phone text,
  email text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 2. PROFILES
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text NOT NULL,
  role text DEFAULT 'producao',
  status text DEFAULT 'ativo',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 3. CLIENTS
CREATE TABLE clients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  phone text,
  whatsapp text,
  email text,
  city text,
  address text,
  notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 4. PRODUCTS
CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text,
  sku text,
  description text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 5. PRODUCTION STAGES (fixed stages)
CREATE TABLE production_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  position integer NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 6. PRODUCTION ORDERS
CREATE TABLE production_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients(id) ON DELETE SET NULL,
  product_id uuid REFERENCES products(id) ON DELETE SET NULL,
  order_number text NOT NULL,
  quantity integer NOT NULL,
  entry_date date,
  delivery_date date,
  priority text DEFAULT 'normal',
  current_stage text,
  status text DEFAULT 'aberta',
  notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 7. PRODUCTION ORDER STAGES (per-order stage tracking)
CREATE TABLE production_order_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  order_id uuid REFERENCES production_orders(id) ON DELETE CASCADE,
  stage_id uuid REFERENCES production_stages(id) ON DELETE CASCADE,
  responsible_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  status text DEFAULT 'pendente',
  started_at timestamptz,
  completed_at timestamptz,
  notes text,
  position integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- 8. PRODUCTION HISTORY
CREATE TABLE production_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  order_id uuid REFERENCES production_orders(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_profiles_company ON profiles(company_id);
CREATE INDEX idx_clients_company ON clients(company_id);
CREATE INDEX idx_products_company ON products(company_id);
CREATE INDEX idx_production_orders_company ON production_orders(company_id);
CREATE INDEX idx_production_orders_status ON production_orders(status);
CREATE INDEX idx_production_orders_client ON production_orders(client_id);
CREATE INDEX idx_production_order_stages_order ON production_order_stages(order_id);
CREATE INDEX idx_production_order_stages_stage ON production_order_stages(stage_id);
CREATE INDEX idx_production_history_order ON production_history(order_id);

-- ============================================================
-- AUTO-UPDATE TIMESTAMP FUNCTION
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON clients FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_products_updated_at
  BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_production_stages_updated_at
  BEFORE UPDATE ON production_stages FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_production_orders_updated_at
  BEFORE UPDATE ON production_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_production_order_stages_updated_at
  BEFORE UPDATE ON production_order_stages FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_order_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_history ENABLE ROW LEVEL SECURITY;

-- Companies: users can see only their own company
CREATE POLICY "Users can view their own company"
  ON companies FOR SELECT
  USING (id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Profiles: users can view profiles in their company
CREATE POLICY "Users can view profiles in their company"
  ON profiles FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Clients: users can manage clients in their company
CREATE POLICY "Users can view clients in their company"
  ON clients FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can insert clients in their company"
  ON clients FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can update clients in their company"
  ON clients FOR UPDATE
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can delete clients in their company"
  ON clients FOR DELETE
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Products
CREATE POLICY "Users can view products in their company"
  ON products FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can insert products in their company"
  ON products FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can update products in their company"
  ON products FOR UPDATE
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can delete products in their company"
  ON products FOR DELETE
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Production Stages
CREATE POLICY "Users can view stages in their company"
  ON production_stages FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can insert stages in their company"
  ON production_stages FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can update stages in their company"
  ON production_stages FOR UPDATE
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Production Orders
CREATE POLICY "Users can view orders in their company"
  ON production_orders FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can insert orders in their company"
  ON production_orders FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can update orders in their company"
  ON production_orders FOR UPDATE
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can delete orders in their company"
  ON production_orders FOR DELETE
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Production Order Stages
CREATE POLICY "Users can view order stages in their company"
  ON production_order_stages FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can insert order stages in their company"
  ON production_order_stages FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can update order stages in their company"
  ON production_order_stages FOR UPDATE
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- Production History
CREATE POLICY "Users can view history in their company"
  ON production_history FOR SELECT
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
CREATE POLICY "Users can insert history in their company"
  ON production_history FOR INSERT
  WITH CHECK (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));

-- ============================================================
-- AUTO SET COMPANY_ID ON INSERT (via trigger helper)
-- ============================================================
CREATE OR REPLACE FUNCTION set_company_id()
RETURNS TRIGGER AS $$
BEGIN
  NEW.company_id := (SELECT company_id FROM profiles WHERE id = auth.uid());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_clients_company_id
  BEFORE INSERT ON clients FOR EACH ROW EXECUTE FUNCTION set_company_id();
CREATE TRIGGER set_products_company_id
  BEFORE INSERT ON products FOR EACH ROW EXECUTE FUNCTION set_company_id();
CREATE TRIGGER set_production_orders_company_id
  BEFORE INSERT ON production_orders FOR EACH ROW EXECUTE FUNCTION set_company_id();
CREATE TRIGGER set_production_order_stages_company_id
  BEFORE INSERT ON production_order_stages FOR EACH ROW EXECUTE FUNCTION set_company_id();
CREATE TRIGGER set_production_history_company_id
  BEFORE INSERT ON production_history FOR EACH ROW EXECUTE FUNCTION set_company_id();

-- ============================================================
-- AUTO-CREATE PROFILE ON USER SIGNUP
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, company_id)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(
      (NEW.raw_user_meta_data->>'company_id')::uuid,
      (SELECT id FROM companies ORDER BY created_at LIMIT 1)
    )
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================
-- SEED: Default production stages (run after creating a company)
-- ============================================================
-- INSERT INTO production_stages (company_id, name, position) VALUES
--   ('COMPANY_UUID', 'Desenho', 1),
--   ('COMPANY_UUID', 'Impressão', 2),
--   ('COMPANY_UUID', 'Calandra', 3),
--   ('COMPANY_UUID', 'Corte', 4),
--   ('COMPANY_UUID', 'Costura', 5),
--   ('COMPANY_UUID', 'Acabamento', 6);
