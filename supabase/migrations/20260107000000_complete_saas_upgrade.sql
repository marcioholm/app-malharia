-- ============================================================
-- ConfecOS - v7: Complete SaaS Multi-empresa Upgrade
-- Orçamento, Comissão, Automação, Timeline, Notificações
-- ============================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- 1. ADD BUDGET & COMMISSION FIELDS TO PRODUCTION_ORDERS
-- ============================================================
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS estimated_value numeric(10,2) DEFAULT 0;
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS discount_value numeric(10,2) DEFAULT 0;
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS approved_value numeric(10,2) DEFAULT 0;
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS budget_status text DEFAULT 'pending';
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS budget_approved boolean DEFAULT false;
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS budget_approved_by uuid REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS budget_approved_at timestamptz;
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS public_budget_token text;
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS public_budget_approved_at timestamptz;
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS budget_customer_response text;
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS budget_customer_message text;
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS budget_ip text;
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS budget_user_agent text;
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS budget_expires_at timestamptz;
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS commission_percentage numeric(5,2) DEFAULT 0;
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS commission_value numeric(10,2) DEFAULT 0;
ALTER TABLE production_orders ADD COLUMN IF NOT EXISTS commission_blocked boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_production_orders_budget_token ON production_orders(public_budget_token);
CREATE INDEX IF NOT EXISTS idx_production_orders_budget_status ON production_orders(budget_status);

-- ============================================================
-- 2. INSERT "APROVAÇÃO DE ORÇAMENTO" STAGE (position 0)
-- ============================================================
-- Shift existing stages: Desenho (1→2), Impressão (2→3), etc.
-- This is done per-company by shifting existing positions up.
-- We also insert the new stage for companies that already exist.

DO $$
DECLARE
  comp_record RECORD;
BEGIN
  FOR comp_record IN SELECT id FROM companies LOOP
    -- Shift existing stages up
    UPDATE production_stages
    SET position = position + 1
    WHERE company_id = comp_record.id;

    -- Insert Aprovação de Orçamento at position 0
    IF NOT EXISTS (
      SELECT 1 FROM production_stages
      WHERE company_id = comp_record.id AND name = 'Aprovação de Orçamento'
    ) THEN
      INSERT INTO production_stages (company_id, name, position, is_active)
      VALUES (comp_record.id, 'Aprovação de Orçamento', 0, true);
    END IF;
  END LOOP;
END;
$$;

-- ============================================================
-- 3. ACTIVITY TIMELINE TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS activity_timeline (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  order_id uuid REFERENCES production_orders(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  action text NOT NULL,
  description text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE activity_timeline ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_activity_timeline_company ON activity_timeline(company_id);
CREATE INDEX IF NOT EXISTS idx_activity_timeline_order ON activity_timeline(order_id);
CREATE INDEX IF NOT EXISTS idx_activity_timeline_created ON activity_timeline(created_at DESC);

-- ============================================================
-- 4. AUTOMATION EVENTS TABLE (queue for N8N)
-- ============================================================
CREATE TABLE IF NOT EXISTS automation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  order_id uuid REFERENCES production_orders(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb,
  status text DEFAULT 'pending',
  processed_at timestamptz,
  error_message text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE automation_events ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_automation_events_status ON automation_events(status);
CREATE INDEX IF NOT EXISTS idx_automation_events_company ON automation_events(company_id);

-- ============================================================
-- 5. AUTOMATION MESSAGE TEMPLATES
-- ============================================================
CREATE TABLE IF NOT EXISTS automation_message_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  audience text NOT NULL CHECK (audience IN ('customer', 'responsible_user', 'admin')),
  subject text,
  message_template text NOT NULL,
  event_type text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE automation_message_templates ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_auto_msg_templates_company ON automation_message_templates(company_id);

-- ============================================================
-- 6. COMPANY AUTOMATION SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS company_automation_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES companies(id) ON DELETE CASCADE UNIQUE,
  production_notifications_enabled boolean DEFAULT false,
  notify_customer_on_stage_change boolean DEFAULT false,
  notify_next_responsible boolean DEFAULT false,
  notify_customer_on_completion boolean DEFAULT false,
  n8n_webhook_url text,
  n8n_secret_key text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE company_automation_settings ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_company_auto_settings_company ON company_automation_settings(company_id);

-- ============================================================
-- 7. RLS POLICIES FOR NEW TABLES
-- ============================================================

-- activity_timeline
DROP POLICY IF EXISTS "Users can view timeline in their company" ON activity_timeline;
CREATE POLICY "Users can view timeline in their company"
  ON activity_timeline FOR SELECT
  USING (company_id = get_user_company_id() OR is_super_admin());

DROP POLICY IF EXISTS "Users can insert timeline in their company" ON activity_timeline;
CREATE POLICY "Users can insert timeline in their company"
  ON activity_timeline FOR INSERT
  WITH CHECK (company_id = get_user_company_id() OR is_super_admin());

-- automation_events (system internal, restricted)
DROP POLICY IF EXISTS "Super admin can view automation events" ON automation_events;
CREATE POLICY "Super admin can view automation events"
  ON automation_events FOR SELECT
  USING (is_super_admin());

DROP POLICY IF EXISTS "System can insert automation events" ON automation_events;
CREATE POLICY "System can insert automation events"
  ON automation_events FOR INSERT
  WITH CHECK (true);

-- automation_message_templates
DROP POLICY IF EXISTS "Users can view message templates in their company" ON automation_message_templates;
CREATE POLICY "Users can view message templates in their company"
  ON automation_message_templates FOR SELECT
  USING (company_id = get_user_company_id() OR is_super_admin());

DROP POLICY IF EXISTS "Admins can manage message templates" ON automation_message_templates;
CREATE POLICY "Admins can manage message templates"
  ON automation_message_templates FOR INSERT
  WITH CHECK (company_id = get_user_company_id() AND get_user_role() IN ('super_admin', 'admin_empresa'));

DROP POLICY IF EXISTS "Admins can update message templates" ON automation_message_templates;
CREATE POLICY "Admins can update message templates"
  ON automation_message_templates FOR UPDATE
  USING (company_id = get_user_company_id() AND get_user_role() IN ('super_admin', 'admin_empresa'));

-- company_automation_settings
DROP POLICY IF EXISTS "Users can view automation settings in their company" ON company_automation_settings;
CREATE POLICY "Users can view automation settings in their company"
  ON company_automation_settings FOR SELECT
  USING (company_id = get_user_company_id() OR is_super_admin());

DROP POLICY IF EXISTS "Admins can manage automation settings" ON company_automation_settings;
CREATE POLICY "Admins can manage automation settings"
  ON company_automation_settings FOR INSERT
  WITH CHECK (company_id = get_user_company_id() AND get_user_role() IN ('super_admin', 'admin_empresa'));

DROP POLICY IF EXISTS "Admins can update automation settings" ON company_automation_settings;
CREATE POLICY "Admins can update automation settings"
  ON company_automation_settings FOR UPDATE
  USING (company_id = get_user_company_id() AND get_user_role() IN ('super_admin', 'admin_empresa'));

-- ============================================================
-- 8. TRIGGERS FOR NEW TABLES (auto-set company_id)
-- ============================================================
CREATE TRIGGER set_activity_timeline_company_id
  BEFORE INSERT ON activity_timeline
  FOR EACH ROW EXECUTE FUNCTION set_company_id();

CREATE TRIGGER set_automation_events_company_id
  BEFORE INSERT ON automation_events
  FOR EACH ROW EXECUTE FUNCTION set_company_id();

CREATE TRIGGER set_auto_msg_templates_company_id
  BEFORE INSERT ON automation_message_templates
  FOR EACH ROW EXECUTE FUNCTION set_company_id();

CREATE TRIGGER set_company_auto_settings_company_id
  BEFORE INSERT ON company_automation_settings
  FOR EACH ROW EXECUTE FUNCTION set_company_id();

-- ============================================================
-- 9. ACTIVITY TIMELINE TRIGGER ON STAGE CHANGE
-- ============================================================
CREATE OR REPLACE FUNCTION log_stage_change_timeline()
RETURNS TRIGGER AS $$
DECLARE
  v_company_id uuid;
  v_stage_name text;
BEGIN
  IF NEW.status = 'em_andamento' AND (OLD.status IS NULL OR OLD.status != 'em_andamento') THEN
    SELECT company_id INTO v_company_id FROM production_orders WHERE id = NEW.order_id;
    SELECT name INTO v_stage_name FROM production_stages WHERE id = NEW.stage_id;

    INSERT INTO activity_timeline (company_id, order_id, user_id, action, description)
    VALUES (
      v_company_id,
      NEW.order_id,
      auth.uid(),
      'stage_changed',
      CASE
        WHEN v_stage_name = 'Aprovação de Orçamento' THEN 'Orçamento enviado para aprovação'
        ELSE 'Fase iniciada: ' || COALESCE(v_stage_name, 'Desconhecida')
      END
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_log_stage_change ON production_order_stages;
CREATE TRIGGER trg_log_stage_change
  AFTER UPDATE OF status ON production_order_stages
  FOR EACH ROW
  WHEN (NEW.status = 'em_andamento')
  EXECUTE FUNCTION log_stage_change_timeline();

-- ============================================================
-- 10. AUTO-CREATE NOTIFICATION ON TIMELINE INSERT
-- ============================================================
CREATE OR REPLACE FUNCTION notify_on_timeline_insert()
RETURNS TRIGGER AS $$
DECLARE
  v_order_number text;
  v_user_name text;
  v_company_users uuid[];
BEGIN
  SELECT order_number INTO v_order_number FROM production_orders WHERE id = NEW.order_id;

  SELECT array_agg(id) INTO v_company_users
  FROM profiles
  WHERE company_id = NEW.company_id AND status = 'ativo';

  IF v_company_users IS NOT NULL THEN
    INSERT INTO notifications (company_id, user_id, type, title, message, link)
    SELECT
      NEW.company_id,
      unnest(v_company_users),
      CASE
        WHEN NEW.action = 'budget_approved' THEN 'budget_approved'
        WHEN NEW.action = 'stage_changed' THEN 'stage_changed'
        WHEN NEW.action = 'order_completed' THEN 'order_completed'
        ELSE 'system'
      END,
      CASE
        WHEN NEW.action = 'budget_approved' THEN 'Orçamento Aprovado'
        WHEN NEW.action = 'stage_changed' THEN 'Fase Atualizada'
        WHEN NEW.action = 'order_completed' THEN 'OS Finalizada'
        ELSE 'Atualização'
      END,
      NEW.description,
      '/orders/' || NEW.order_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_notify_on_timeline ON activity_timeline;
CREATE TRIGGER trg_notify_on_timeline
  AFTER INSERT ON activity_timeline
  FOR EACH ROW
  EXECUTE FUNCTION notify_on_timeline_insert();

-- ============================================================
-- 11. FUNCTION TO GENERATE PUBLIC BUDGET TOKEN
-- ============================================================
CREATE OR REPLACE FUNCTION generate_budget_token()
RETURNS text
LANGUAGE SQL
STABLE
AS $$
  SELECT replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')
$$;

-- ============================================================
-- 12. FUNCTION TO GET PUBLIC BUDGET DATA (SECURE, NO SENSITIVE DATA)
-- ============================================================
CREATE OR REPLACE FUNCTION get_public_budget(p_token text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result jsonb;
  v_order production_orders%ROWTYPE;
  v_company companies%ROWTYPE;
  v_company_settings company_settings%ROWTYPE;
  v_items jsonb;
  v_images jsonb;
  v_client_name text;
BEGIN
  SELECT * INTO v_order
  FROM production_orders
  WHERE public_budget_token = p_token
    AND budget_status IN ('pending', 'revision_requested')
    AND (budget_expires_at IS NULL OR budget_expires_at > now());

  IF v_order.id IS NULL THEN
    RETURN jsonb_build_object('error', 'Orçamento não encontrado ou expirado');
  END IF;

  SELECT * INTO v_company FROM companies WHERE id = v_order.company_id;
  SELECT * INTO v_company_settings FROM company_settings WHERE company_id = v_order.company_id;

  SELECT name INTO v_client_name FROM clients WHERE id = v_order.client_id;

  SELECT jsonb_agg(jsonb_build_object(
    'model', oi.model,
    'custom_name', oi.custom_name,
    'size', oi.size,
    'quantity', oi.quantity,
    'unit_price', oi.unit_price,
    'total_price', oi.total_price
  ) ORDER BY oi.custom_name NULLS LAST, oi.size, oi.model)
  INTO v_items
  FROM order_items oi
  WHERE oi.order_id = v_order.id;

  SELECT jsonb_agg(jsonb_build_object(
    'image_url', poi.image_url
  ) ORDER BY poi.position)
  INTO v_images
  FROM production_order_images poi
  WHERE poi.order_id = v_order.id;

  v_result := jsonb_build_object(
    'order_id', v_order.id,
    'order_number', v_order.order_number,
    'client_name', v_client_name,
    'product_id', v_order.product_id,
    'total_price', v_order.total_price,
    'entry_amount', v_order.entry_amount,
    'remaining_amount', v_order.remaining_amount,
    'delivery_date', v_order.delivery_date,
    'financial_notes', v_order.financial_notes,
    'items', COALESCE(v_items, '[]'::jsonb),
    'images', COALESCE(v_images, '[]'::jsonb),
    'payment_method', v_order.payment_method,
    'payment_status', v_order.payment_status,
    'company_name', COALESCE(v_company_settings.trade_name, v_company.trade_name, v_company.name),
    'company_logo', v_company_settings.logo_url,
    'company_cnpj', COALESCE(v_company_settings.cnpj, v_company.cnpj),
    'company_phone', COALESCE(v_company_settings.phone, v_company.phone),
    'company_address', v_company_settings.address,
    'company_city', v_company_settings.city,
    'company_state', v_company_settings.state
  );

  RETURN v_result;
END;
$$;

-- ============================================================
-- 13. FUNCTION TO APPROVE BUDGET FROM PUBLIC LINK
-- ============================================================
CREATE OR REPLACE FUNCTION approve_public_budget(
  p_token text,
  p_response text,
  p_message text DEFAULT NULL,
  p_ip text DEFAULT NULL,
  p_user_agent text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order production_orders%ROWTYPE;
  v_company_id uuid;
BEGIN
  SELECT * INTO v_order
  FROM production_orders
  WHERE public_budget_token = p_token
    AND budget_status IN ('pending', 'revision_requested')
    AND (budget_expires_at IS NULL OR budget_expires_at > now());

  IF v_order.id IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Orçamento não encontrado ou expirado');
  END IF;

  IF v_order.budget_approved THEN
    RETURN jsonb_build_object('success', false, 'error', 'Orçamento já foi aprovado anteriormente');
  END IF;

  v_company_id := v_order.company_id;

  IF p_response = 'approved' THEN
    UPDATE production_orders
    SET
      budget_status = 'approved',
      budget_approved = true,
      budget_approved_at = now(),
      public_budget_approved_at = now(),
      budget_customer_response = p_response,
      budget_customer_message = p_message,
      budget_ip = p_ip,
      budget_user_agent = p_user_agent
    WHERE id = v_order.id;

    INSERT INTO activity_timeline (company_id, order_id, user_id, action, description, metadata)
    VALUES (v_company_id, v_order.id, NULL, 'budget_approved',
      'Cliente aprovou o orçamento via link público',
      jsonb_build_object('response', p_response, 'ip', p_ip));

    INSERT INTO automation_events (company_id, order_id, event_type, payload)
    VALUES (v_company_id, v_order.id, 'budget_approved_by_customer',
      jsonb_build_object('order_id', v_order.id, 'order_number', v_order.order_number));

  ELSIF p_response = 'revision_requested' THEN
    UPDATE production_orders
    SET
      budget_status = 'revision_requested',
      budget_customer_response = p_response,
      budget_customer_message = p_message,
      budget_ip = p_ip,
      budget_user_agent = p_user_agent
    WHERE id = v_order.id;

    INSERT INTO activity_timeline (company_id, order_id, user_id, action, description, metadata)
    VALUES (v_company_id, v_order.id, NULL, 'budget_revision_requested',
      'Cliente solicitou alteração no orçamento via link público',
      jsonb_build_object('response', p_response, 'message', p_message, 'ip', p_ip));

    INSERT INTO automation_events (company_id, order_id, event_type, payload)
    VALUES (v_company_id, v_order.id, 'budget_revision_requested',
      jsonb_build_object('order_id', v_order.id, 'order_number', v_order.order_number, 'message', p_message));

  ELSIF p_response = 'rejected' THEN
    UPDATE production_orders
    SET
      budget_status = 'rejected',
      budget_customer_response = p_response,
      budget_customer_message = p_message,
      budget_ip = p_ip,
      budget_user_agent = p_user_agent
    WHERE id = v_order.id;

    INSERT INTO activity_timeline (company_id, order_id, user_id, action, description, metadata)
    VALUES (v_company_id, v_order.id, NULL, 'budget_rejected',
      'Cliente recusou o orçamento via link público',
      jsonb_build_object('response', p_response, 'message', p_message, 'ip', p_ip));

    INSERT INTO automation_events (company_id, order_id, event_type, payload)
    VALUES (v_company_id, v_order.id, 'budget_rejected_by_customer',
      jsonb_build_object('order_id', v_order.id, 'order_number', v_order.order_number, 'message', p_message));

  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Resposta inválida');
  END IF;

  RETURN jsonb_build_object('success', true);
END;
$$;

-- ============================================================
-- 14. FUNCTION TO REGISTER BUDGET TIMELINE FROM INTERNAL
-- ============================================================
CREATE OR REPLACE FUNCTION register_activity(
  p_order_id uuid,
  p_action text,
  p_description text,
  p_metadata jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_user_id uuid;
  v_timeline_id uuid;
BEGIN
  SELECT company_id INTO v_company_id FROM production_orders WHERE id = p_order_id;
  v_user_id := auth.uid();
  v_timeline_id := gen_random_uuid();

  INSERT INTO activity_timeline (id, company_id, order_id, user_id, action, description, metadata)
  VALUES (v_timeline_id, v_company_id, p_order_id, v_user_id, p_action, p_description, p_metadata);

  RETURN v_timeline_id;
END;
$$;

-- ============================================================
-- 15. UPDATE handle_new_user - REFINED
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  v_company_id uuid;
  v_role text;
BEGIN
  v_company_id := (NEW.raw_user_meta_data->>'company_id')::uuid;
  IF v_company_id IS NULL THEN
    v_company_id := (SELECT id FROM companies ORDER BY created_at LIMIT 1);
  END IF;

  v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'visualizador');
  -- Map legacy roles
  IF v_role IN ('admin', 'manager', 'seller', 'operator', 'user') THEN
    v_role := CASE v_role
      WHEN 'admin' THEN 'admin_empresa'
      WHEN 'manager' THEN 'gerente'
      WHEN 'seller' THEN 'vendedor'
      WHEN 'operator' THEN 'producao'
      WHEN 'user' THEN 'visualizador'
      ELSE v_role
    END;
  END IF;

  INSERT INTO public.profiles (id, email, name, company_id, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    v_company_id,
    v_role
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
