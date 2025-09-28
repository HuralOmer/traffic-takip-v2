-- Shops tablosu için RLS policy ekle
-- Bu dosya shops tablosuna RLS policy ekler

-- Shops tablosu için RLS'i etkinleştir
ALTER TABLE shops ENABLE ROW LEVEL SECURITY;

-- Shops tablosu için RLS policy'leri
CREATE POLICY "Users can view all shops" ON shops
  FOR SELECT USING (true);

CREATE POLICY "Users can insert shops" ON shops
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update shops" ON shops
  FOR UPDATE USING (true);

-- Comments
COMMENT ON TABLE shops IS 'Stores Shopify app installation data - RLS enabled';
