-- ============================================================
-- ConfecOS - v6: SaaS Multi-empresa, Financeiro, Galeria, Auditoria
-- ============================================================

-- ============================================================
-- 1. EXPAND COMPANIES TABLE
-- ============================================================
ALTER TABLE companies ADD COLUMN IF NOT EXISTS trade_name text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS legal_name text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS cnpj text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS state text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS zipcode text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- ============================================================
-- 2. EXPAND PRODUCTION_ORDERS
-- ============================================================
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS seller_id uuid REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS entry_amount numeric(10,2) DEFAULT 0;
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS remaining_amount numeric(10,2) DEFAULT 0;
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pendente';
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS payment_method text;
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS financial_notes text;
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS edited_by uuid REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS edited_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_production_orders_seller ON production_orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_production_orders_payment_status ON production_orders(payment_status);

-- ============================================================
-- 3. PRODUCTION ORDER IMAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS production_order_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  order_id uuid REFERENCES production_orders(id) ON DELETE CASCADE,
  image_url text NOT NULL,
  file_path text,
  file_name text,
  file_size integer,
  mime_type text,
  position integer DEFAULT 0,
  created_by uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE production_order_images ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_prod_order_images_order ON production_order_images(order_id);
CREATE INDEX IF NOT EXISTS idx_prod_order_images_company ON production_order_images(company_id);

-- ============================================================
-- 4. PRODUCTION ORDER AUDIT
-- ============================================================
CREATE TABLE IF NOT EXISTS production_order_audit (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  order_id uuid REFERENCES production_orders(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  old_data jsonb,
  new_data jsonb,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE production_order_audit ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_prod_order_audit_order ON production_order_audit(order_id);
CREATE INDEX IF NOT EXISTS idx_prod_order_audit_company ON production_order_audit(company_id);

-- ============================================================
-- 5. RLS POLICIES FOR NEW TABLES
-- ============================================================

-- production_order_images
CREATE POLICY "Users can view order images in their company"
  ON production_order_images FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can insert order images in their company"
  ON production_order_images FOR INSERT
  WITH CHECK (company_id = get_user_company_id());

CREATE POLICY "Users can update order images in their company"
  ON production_order_images FOR UPDATE
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can delete order images in their company"
  ON production_order_images FOR DELETE
  USING (company_id = get_user_company_id());

-- production_order_audit
CREATE POLICY "Users can view audit in their company"
  ON production_order_audit FOR SELECT
  USING (company_id = get_user_company_id());

CREATE POLICY "Users can insert audit in their company"
  ON production_order_audit FOR INSERT
  WITH CHECK (company_id = get_user_company_id());

-- ============================================================
-- 6. TRIGGERS FOR NEW TABLES
-- ============================================================
CREATE TRIGGER set_production_order_images_company_id
  BEFORE INSERT ON production_order_images
  FOR EACH ROW EXECUTE FUNCTION set_company_id();

CREATE TRIGGER set_production_order_audit_company_id
  BEFORE INSERT ON production_order_audit
  FOR EACH ROW EXECUTE FUNCTION set_company_id();

-- ============================================================
-- 7. SECURITY DEFINER HELPER FOR SUPER_ADMIN CHECK
-- ============================================================
-- Avoids infinite RLS recursion caused by inline EXISTS subquery on profiles
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
$$;

-- ============================================================
-- 8. UPDATE RLS FOR COMPANIES - ALLOW SUPER_ADMIN
-- ============================================================
DROP POLICY IF EXISTS "Users can view their own company" ON companies;
CREATE POLICY "Users can view their own company"
  ON companies FOR SELECT
  USING (
    id = get_user_company_id()
    OR
    is_super_admin()
  );

DROP POLICY IF EXISTS "Users can view profiles in their company" ON profiles;
CREATE POLICY "Users can view profiles in their company"
  ON profiles FOR SELECT
  USING (
    company_id = get_user_company_id()
    OR
    is_super_admin()
  );

-- Allow super_admin to update companies
DROP POLICY IF EXISTS "Users can update companies" ON companies;
CREATE POLICY "Users can update companies"
  ON companies FOR UPDATE
  USING (
    id = get_user_company_id()
    OR
    is_super_admin()
  );

-- ============================================================
-- 9. UPDATE handle_new_user - SAFE VERSION
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_company_id uuid;
BEGIN
  v_company_id := (NEW.raw_user_meta_data->>'company_id')::uuid;
  IF v_company_id IS NULL THEN
    v_company_id := (SELECT id FROM companies ORDER BY created_at LIMIT 1);
  END IF;

  INSERT INTO public.profiles (id, email, name, company_id, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    v_company_id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'visualizador')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 10. EXPAND STORAGE BUCKET FOR ORDER IMAGES
-- ============================================================
UPDATE storage.buckets
SET allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp']
WHERE id = 'order-images';

-- ============================================================
-- 11. SEED NOTIFICATIONS TABLE IF NOT EXISTS
-- ============================================================
CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  type text,
  title text,
  message text,
  link text,
  read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "System can insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
