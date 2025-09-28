-- Sessions Tracking Tables Migration
-- Bu migration sessions tracking için gerekli tabloları oluşturur

-- Sessions tablosu (kanonik oturum kaydı)
CREATE TABLE IF NOT EXISTS sessions (
  session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ NULL,
  first_page TEXT NULL,
  last_page TEXT NULL,
  referrer TEXT NULL,
  ua TEXT NULL,
  ip_hash TEXT NULL,
  duration_ms INTEGER NULL,
  page_count INTEGER NULL DEFAULT 1,
  is_ended BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for sessions table
CREATE INDEX IF NOT EXISTS idx_sessions_shop_started_at ON sessions(shop, started_at);
CREATE INDEX IF NOT EXISTS idx_sessions_shop_visitor_started_at ON sessions(shop, visitor_id, started_at);
CREATE INDEX IF NOT EXISTS idx_sessions_visitor_id ON sessions(visitor_id);
CREATE INDEX IF NOT EXISTS idx_sessions_started_at ON sessions(started_at);
CREATE INDEX IF NOT EXISTS idx_sessions_ended_at ON sessions(ended_at);
CREATE INDEX IF NOT EXISTS idx_sessions_is_ended ON sessions(is_ended);
CREATE INDEX IF NOT EXISTS idx_sessions_first_page ON sessions(first_page);
CREATE INDEX IF NOT EXISTS idx_sessions_referrer ON sessions(referrer);

-- Visitor session counts tablosu (dağılım için)
CREATE TABLE IF NOT EXISTS visitor_session_counts (
  shop TEXT NOT NULL,
  visitor_id TEXT NOT NULL,
  total_sessions INTEGER NOT NULL DEFAULT 0,
  first_seen TIMESTAMPTZ DEFAULT NOW(),
  last_session_started_at TIMESTAMPTZ NULL,
  last_session_ended_at TIMESTAMPTZ NULL,
  avg_session_duration_ms INTEGER NULL,
  max_session_duration_ms INTEGER NULL,
  min_session_duration_ms INTEGER NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (shop, visitor_id)
);

-- Indexes for visitor_session_counts table
CREATE INDEX IF NOT EXISTS idx_visitor_session_counts_shop ON visitor_session_counts(shop);
CREATE INDEX IF NOT EXISTS idx_visitor_session_counts_total_sessions ON visitor_session_counts(total_sessions);
CREATE INDEX IF NOT EXISTS idx_visitor_session_counts_first_seen ON visitor_session_counts(first_seen);
CREATE INDEX IF NOT EXISTS idx_visitor_session_counts_last_session_started_at ON visitor_session_counts(last_session_started_at);

-- Session analytics view (performans için)
CREATE OR REPLACE VIEW session_analytics AS
SELECT 
  shop,
  DATE_TRUNC('day', started_at) as date,
  COUNT(*) as total_sessions,
  COUNT(CASE WHEN is_ended = true THEN 1 END) as ended_sessions,
  COUNT(CASE WHEN is_ended = false THEN 1 END) as active_sessions,
  AVG(duration_ms) as avg_duration_ms,
  PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_ms) as median_duration_ms,
  MAX(duration_ms) as max_duration_ms,
  MIN(duration_ms) as min_duration_ms,
  AVG(page_count) as avg_page_count,
  MAX(page_count) as max_page_count,
  MIN(page_count) as min_page_count
FROM sessions
GROUP BY shop, DATE_TRUNC('day', started_at);

-- Session distribution view (visitor session sayılarına göre dağılım)
CREATE OR REPLACE VIEW session_distribution AS
SELECT 
  shop,
  CASE 
    WHEN total_sessions = 1 THEN '1'
    WHEN total_sessions BETWEEN 2 AND 3 THEN '2-3'
    WHEN total_sessions BETWEEN 4 AND 5 THEN '4-5'
    WHEN total_sessions BETWEEN 6 AND 10 THEN '6-10'
    WHEN total_sessions BETWEEN 11 AND 20 THEN '11-20'
    WHEN total_sessions BETWEEN 21 AND 50 THEN '21-50'
    WHEN total_sessions BETWEEN 51 AND 100 THEN '51-100'
    ELSE '100+'
  END as session_bucket,
  COUNT(*) as visitor_count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (PARTITION BY shop), 2) as percentage
FROM visitor_session_counts
GROUP BY shop, 
  CASE 
    WHEN total_sessions = 1 THEN '1'
    WHEN total_sessions BETWEEN 2 AND 3 THEN '2-3'
    WHEN total_sessions BETWEEN 4 AND 5 THEN '4-5'
    WHEN total_sessions BETWEEN 6 AND 10 THEN '6-10'
    WHEN total_sessions BETWEEN 11 AND 20 THEN '11-20'
    WHEN total_sessions BETWEEN 21 AND 50 THEN '21-50'
    WHEN total_sessions BETWEEN 51 AND 100 THEN '51-100'
    ELSE '100+'
  END;

-- Top pages view (en çok ziyaret edilen sayfalar)
CREATE OR REPLACE VIEW top_pages AS
SELECT 
  shop,
  first_page as page,
  COUNT(*) as session_count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (PARTITION BY shop), 2) as percentage,
  AVG(duration_ms) as avg_duration_ms
FROM sessions
WHERE first_page IS NOT NULL
GROUP BY shop, first_page
ORDER BY shop, session_count DESC;

-- Top referrers view (en çok gelen referrer'lar)
CREATE OR REPLACE VIEW top_referrers AS
SELECT 
  shop,
  COALESCE(referrer, 'direct') as referrer,
  COUNT(*) as session_count,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (PARTITION BY shop), 2) as percentage,
  AVG(duration_ms) as avg_duration_ms
FROM sessions
GROUP BY shop, COALESCE(referrer, 'direct')
ORDER BY shop, session_count DESC;

-- Function: Visitor session count'unu artır
CREATE OR REPLACE FUNCTION inc_visitor_session(
  p_shop TEXT,
  p_visitor_id TEXT,
  p_last_session_started_at TIMESTAMPTZ
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO visitor_session_counts (shop, visitor_id, total_sessions, last_session_started_at)
  VALUES (p_shop, p_visitor_id, 1, p_last_session_started_at)
  ON CONFLICT (shop, visitor_id) 
  DO UPDATE SET 
    total_sessions = visitor_session_counts.total_sessions + 1,
    last_session_started_at = p_last_session_started_at,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function: Session'ı sonlandır ve visitor stats'ı güncelle
CREATE OR REPLACE FUNCTION end_session_and_update_stats(
  p_session_id UUID,
  p_ended_at TIMESTAMPTZ,
  p_last_page TEXT,
  p_duration_ms INTEGER,
  p_page_count INTEGER
)
RETURNS VOID AS $$
DECLARE
  v_shop TEXT;
  v_visitor_id TEXT;
  v_started_at TIMESTAMPTZ;
BEGIN
  -- Session'ı güncelle
  UPDATE sessions 
  SET 
    ended_at = p_ended_at,
    last_page = p_last_page,
    duration_ms = p_duration_ms,
    page_count = p_page_count,
    is_ended = true,
    updated_at = NOW()
  WHERE session_id = p_session_id
  RETURNING shop, visitor_id, started_at INTO v_shop, v_visitor_id, v_started_at;
  
  -- Visitor stats'ı güncelle
  IF v_shop IS NOT NULL AND v_visitor_id IS NOT NULL THEN
    UPDATE visitor_session_counts 
    SET 
      last_session_ended_at = p_ended_at,
      avg_session_duration_ms = CASE 
        WHEN total_sessions = 1 THEN p_duration_ms
        ELSE ROUND((avg_session_duration_ms * (total_sessions - 1) + p_duration_ms) / total_sessions)
      END,
      max_session_duration_ms = GREATEST(COALESCE(max_session_duration_ms, 0), p_duration_ms),
      min_session_duration_ms = LEAST(COALESCE(min_session_duration_ms, 999999999), p_duration_ms),
      updated_at = NOW()
    WHERE shop = v_shop AND visitor_id = v_visitor_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function: Eski session'ları temizle
CREATE OR REPLACE FUNCTION cleanup_old_sessions(
  p_shop TEXT,
  p_older_than_days INTEGER DEFAULT 30
)
RETURNS INTEGER AS $$
DECLARE
  v_deleted_count INTEGER;
BEGIN
  -- Eski session'ları sil
  DELETE FROM sessions 
  WHERE shop = p_shop 
    AND started_at < NOW() - INTERVAL '1 day' * p_older_than_days;
  
  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  
  -- Visitor session counts'u temizle (artık session'ı olmayan visitor'lar)
  DELETE FROM visitor_session_counts 
  WHERE shop = p_shop 
    AND visitor_id NOT IN (
      SELECT DISTINCT visitor_id 
      FROM sessions 
      WHERE shop = p_shop
    );
  
  RETURN v_deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function: Session istatistiklerini getir
CREATE OR REPLACE FUNCTION get_session_stats(
  p_shop TEXT,
  p_start_date TIMESTAMPTZ DEFAULT NULL,
  p_end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  total_sessions BIGINT,
  active_sessions BIGINT,
  ended_sessions BIGINT,
  avg_duration_ms NUMERIC,
  median_duration_ms NUMERIC,
  max_duration_ms BIGINT,
  min_duration_ms BIGINT,
  avg_page_count NUMERIC,
  max_page_count BIGINT,
  min_page_count BIGINT,
  bounce_rate NUMERIC,
  return_visitor_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_sessions,
    COUNT(CASE WHEN is_ended = false THEN 1 END) as active_sessions,
    COUNT(CASE WHEN is_ended = true THEN 1 END) as ended_sessions,
    ROUND(AVG(duration_ms), 2) as avg_duration_ms,
    ROUND(PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY duration_ms), 2) as median_duration_ms,
    MAX(duration_ms) as max_duration_ms,
    MIN(duration_ms) as min_duration_ms,
    ROUND(AVG(page_count), 2) as avg_page_count,
    MAX(page_count) as max_page_count,
    MIN(page_count) as min_page_count,
    ROUND(COUNT(CASE WHEN page_count = 1 THEN 1 END) * 100.0 / COUNT(*), 2) as bounce_rate,
    ROUND(COUNT(CASE WHEN vsc.total_sessions > 1 THEN 1 END) * 100.0 / COUNT(*), 2) as return_visitor_rate
  FROM sessions s
  LEFT JOIN visitor_session_counts vsc ON s.shop = vsc.shop AND s.visitor_id = vsc.visitor_id
  WHERE s.shop = p_shop
    AND (p_start_date IS NULL OR s.started_at >= p_start_date)
    AND (p_end_date IS NULL OR s.started_at <= p_end_date);
END;
$$ LANGUAGE plpgsql;

-- Trigger: Sessions tablosu güncellendiğinde updated_at'i güncelle
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_visitor_session_counts_updated_at
  BEFORE UPDATE ON visitor_session_counts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) policies
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE visitor_session_counts ENABLE ROW LEVEL SECURITY;

-- Sessions tablosu için RLS policy
CREATE POLICY "Users can view their own shop sessions" ON sessions
  FOR SELECT USING (shop = current_setting('app.current_shop', true));

CREATE POLICY "Users can insert their own shop sessions" ON sessions
  FOR INSERT WITH CHECK (shop = current_setting('app.current_shop', true));

CREATE POLICY "Users can update their own shop sessions" ON sessions
  FOR UPDATE USING (shop = current_setting('app.current_shop', true));

-- Visitor session counts tablosu için RLS policy
CREATE POLICY "Users can view their own shop visitor counts" ON visitor_session_counts
  FOR SELECT USING (shop = current_setting('app.current_shop', true));

CREATE POLICY "Users can insert their own shop visitor counts" ON visitor_session_counts
  FOR INSERT WITH CHECK (shop = current_setting('app.current_shop', true));

CREATE POLICY "Users can update their own shop visitor counts" ON visitor_session_counts
  FOR UPDATE USING (shop = current_setting('app.current_shop', true));

-- Comments
COMMENT ON TABLE sessions IS 'Sessions tracking - kanonik oturum kayıtları';
COMMENT ON TABLE visitor_session_counts IS 'Visitor session counts - visitor başına session sayıları ve istatistikler';
COMMENT ON VIEW session_analytics IS 'Session analitikleri - günlük session istatistikleri';
COMMENT ON VIEW session_distribution IS 'Session dağılımı - visitor session sayılarına göre dağılım';
COMMENT ON VIEW top_pages IS 'En çok ziyaret edilen sayfalar';
COMMENT ON VIEW top_referrers IS 'En çok gelen referrer''lar';
COMMENT ON FUNCTION inc_visitor_session IS 'Visitor session count''unu artırır';
COMMENT ON FUNCTION end_session_and_update_stats IS 'Session''ı sonlandırır ve visitor stats''ı günceller';
COMMENT ON FUNCTION cleanup_old_sessions IS 'Eski session''ları temizler';
COMMENT ON FUNCTION get_session_stats IS 'Session istatistiklerini getirir';
