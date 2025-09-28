-- Page views tablosuna referrer analizi kolonları ekle
-- Bu dosya page_views tablosuna referrer analizi için yeni kolonlar ekler

-- Page views tablosuna referrer analizi kolonları ekle
ALTER TABLE page_views 
ADD COLUMN IF NOT EXISTS referrer_source VARCHAR(50),
ADD COLUMN IF NOT EXISTS referrer_platform VARCHAR(100),
ADD COLUMN IF NOT EXISTS is_social_traffic BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_app_traffic BOOLEAN DEFAULT FALSE;

-- Index'ler ekle
CREATE INDEX IF NOT EXISTS idx_page_views_referrer_source ON page_views(referrer_source);
CREATE INDEX IF NOT EXISTS idx_page_views_is_social_traffic ON page_views(is_social_traffic);
CREATE INDEX IF NOT EXISTS idx_page_views_is_app_traffic ON page_views(is_app_traffic);

-- Comments
COMMENT ON COLUMN page_views.referrer_source IS 'Referrer kaynağı (Instagram, Facebook, Google, Direct, etc.)';
COMMENT ON COLUMN page_views.referrer_platform IS 'Referrer platformu (Instagram App, Facebook Web, etc.)';
COMMENT ON COLUMN page_views.is_social_traffic IS 'Sosyal medya trafiği mi?';
COMMENT ON COLUMN page_views.is_app_traffic IS 'Mobil uygulama trafiği mi?';
