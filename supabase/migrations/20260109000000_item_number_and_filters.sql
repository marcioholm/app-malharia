-- ============================================================
-- ConfecOS - v9: Item number, notes field, production filters
-- ============================================================

-- 1. ADD item_number AND notes TO order_items
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS item_number text;
ALTER TABLE order_items ADD COLUMN IF NOT EXISTS notes text;

CREATE INDEX IF NOT EXISTS idx_order_items_company ON order_items(company_id);
