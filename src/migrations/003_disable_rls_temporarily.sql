-- Geçici olarak RLS policy'lerini devre dışı bırak
-- Bu dosya sessions modülünün çalışması için geçici bir çözümdür

-- Sessions tablosu için RLS'i devre dışı bırak
ALTER TABLE sessions DISABLE ROW LEVEL SECURITY;

-- Visitor session counts tablosu için RLS'i devre dışı bırak  
ALTER TABLE visitor_session_counts DISABLE ROW LEVEL SECURITY;

-- RLS policy'lerini sil (artık gerekli değil)
DROP POLICY IF EXISTS "Users can view their own shop sessions" ON sessions;
DROP POLICY IF EXISTS "Users can insert their own shop sessions" ON sessions;
DROP POLICY IF EXISTS "Users can update their own shop sessions" ON sessions;

DROP POLICY IF EXISTS "Users can view their own shop visitor counts" ON visitor_session_counts;
DROP POLICY IF EXISTS "Users can insert their own shop visitor counts" ON visitor_session_counts;
DROP POLICY IF EXISTS "Users can update their own shop visitor counts" ON visitor_session_counts;

-- Comments
COMMENT ON TABLE sessions IS 'Sessions tracking - RLS geçici olarak devre dışı';
COMMENT ON TABLE visitor_session_counts IS 'Visitor session counts - RLS geçici olarak devre dışı';
