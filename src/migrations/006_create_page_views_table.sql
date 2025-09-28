-- Page views tablosunu oluştur
-- Bu dosya page_views tablosunu ve referrer analizi kolonlarını oluşturur

-- Page views tablosunu oluştur
CREATE TABLE IF NOT EXISTS page_views (
    id SERIAL PRIMARY KEY,
    shop VARCHAR(255) NOT NULL,
    visitor_id VARCHAR(255) NOT NULL,
    session_id VARCHAR(255) NOT NULL,
    page_path VARCHAR(500) NOT NULL,
    page_title VARCHAR(500),
    referrer TEXT,
    referrer_source VARCHAR(50),
    referrer_platform VARCHAR(100),
    is_social_traffic BOOLEAN DEFAULT FALSE,
    is_app_traffic BOOLEAN DEFAULT FALSE,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index'ler oluştur
CREATE INDEX IF NOT EXISTS idx_page_views_shop ON page_views(shop);
CREATE INDEX IF NOT EXISTS idx_page_views_visitor_id ON page_views(visitor_id);
CREATE INDEX IF NOT EXISTS idx_page_views_session_id ON page_views(session_id);
CREATE INDEX IF NOT EXISTS idx_page_views_timestamp ON page_views(timestamp);
CREATE INDEX IF NOT EXISTS idx_page_views_referrer_source ON page_views(referrer_source);
CREATE INDEX IF NOT EXISTS idx_page_views_is_social_traffic ON page_views(is_social_traffic);
CREATE INDEX IF NOT EXISTS idx_page_views_is_app_traffic ON page_views(is_app_traffic);

-- Comments
COMMENT ON TABLE page_views IS 'Page view tracking - sayfa görüntüleme kayıtları';
COMMENT ON COLUMN page_views.shop IS 'Mağaza kimliği';
COMMENT ON COLUMN page_views.visitor_id IS 'Ziyaretçi kimliği';
COMMENT ON COLUMN page_views.session_id IS 'Oturum kimliği';
COMMENT ON COLUMN page_views.page_path IS 'Sayfa yolu';
COMMENT ON COLUMN page_views.page_title IS 'Sayfa başlığı';
COMMENT ON COLUMN page_views.referrer IS 'Referrer URL';
COMMENT ON COLUMN page_views.referrer_source IS 'Referrer kaynağı (Instagram, Facebook, Google, Direct, etc.)';
COMMENT ON COLUMN page_views.referrer_platform IS 'Referrer platformu (Instagram App, Facebook Web, etc.)';
COMMENT ON COLUMN page_views.is_social_traffic IS 'Sosyal medya trafiği mi?';
COMMENT ON COLUMN page_views.is_app_traffic IS 'Mobil uygulama trafiği mi?';
COMMENT ON COLUMN page_views.timestamp IS 'Sayfa görüntüleme zamanı';
