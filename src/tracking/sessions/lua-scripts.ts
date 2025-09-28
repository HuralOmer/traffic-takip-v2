/**
 * Redis Lua Scripts for Sessions Tracking
 * 
 * Bu dosya sessions tracking için Redis Lua script'lerini içerir.
 * Atomik operasyonlar, race condition önleme ve performans optimizasyonu.
 */

/**
 * Session Start Lua Script
 * Yeni session başlatma için atomik script
 * 
 * Bu script:
 * 1. Visitor'ın mevcut session'ını kontrol eder
 * 2. Session gap'ini kontrol eder (offline → online geçiş)
 * 3. Yeni session ID oluşturur
 * 4. Session'ı Redis'e kaydeder
 * 5. Visitor session count'unu artırır
 * 
 * @param KEYS[1] - visitor:current_session:<shop>:<visitor_id>
 * @param KEYS[2] - presence:s:<shop>
 * @param KEYS[3] - vis:session-count:<shop>
 * @param KEYS[4] - session:meta:<shop>:<session_id>
 * @param ARGV[1] - visitor_id
 * @param ARGV[2] - current_timestamp
 * @param ARGV[3] - session_gap_ms
 * @param ARGV[4] - session_ttl_ms
 * @param ARGV[5] - page_path
 * @param ARGV[6] - referrer
 * @param ARGV[7] - user_agent
 * @param ARGV[8] - ip_hash
 * 
 * @returns {session_id, is_new_session, previous_session_id, session_gap_ms}
 */
export const SESSION_START_SCRIPT = `
  local current_session_key = KEYS[1]
  local presence_sessions_key = KEYS[2]
  local visitor_counts_key = KEYS[3]
  local session_meta_key = KEYS[4]
  
  local visitor_id = ARGV[1]
  local current_timestamp = tonumber(ARGV[2])
  local session_gap_ms = tonumber(ARGV[3])
  local session_ttl_ms = tonumber(ARGV[4])
  local page_path = ARGV[5]
  local referrer = ARGV[6] or ''
  local user_agent = ARGV[7] or ''
  local ip_hash = ARGV[8] or ''
  
  -- Mevcut session'ı kontrol et
  local current_session_id = redis.call('GET', current_session_key)
  local is_new_session = true
  local previous_session_id = nil
  local session_gap = 0
  
  if current_session_id then
    -- Mevcut session'ın son aktivite zamanını al
    local session_meta = redis.call('HGETALL', 'session:meta:' .. current_session_id)
    local last_activity = 0
    
    for i = 1, #session_meta, 2 do
      if session_meta[i] == 'last_activity' then
        last_activity = tonumber(session_meta[i + 1])
        break
      end
    end
    
    -- Session gap'ini hesapla
    session_gap = current_timestamp - last_activity
    
    -- Eğer session gap yeterince büyükse yeni session başlat
    if session_gap >= session_gap_ms then
      -- Eski session'ı sonlandır
      redis.call('HSET', 'session:meta:' .. current_session_id, 'ended_at', last_activity)
      redis.call('ZREM', presence_sessions_key, current_session_id)
      previous_session_id = current_session_id
    else
      -- Mevcut session'ı güncelle
      is_new_session = false
      redis.call('HSET', 'session:meta:' .. current_session_id, 'last_activity', current_timestamp)
      redis.call('HSET', 'session:meta:' .. current_session_id, 'last_page', page_path)
      redis.call('ZADD', presence_sessions_key, current_timestamp, current_session_id)
      redis.call('EXPIRE', presence_sessions_key, math.ceil(session_ttl_ms / 1000))
      
      return {
        session_id = current_session_id,
        is_new_session = false,
        previous_session_id = nil,
        session_gap_ms = session_gap
      }
    end
  end
  
  -- Yeni session ID oluştur
  local session_id = 'session_' .. visitor_id .. '_' .. current_timestamp .. '_' .. math.random(100000, 999999)
  
  -- Session metadata'sını kaydet
  local session_data = {
    'session_id', session_id,
    'visitor_id', visitor_id,
    'started_at', current_timestamp,
    'last_activity', current_timestamp,
    'page_count', 1,
    'first_page', page_path,
    'last_page', page_path,
    'referrer', referrer,
    'user_agent', user_agent,
    'ip_hash', ip_hash
  }
  
  redis.call('HSET', session_meta_key, unpack(session_data))
  redis.call('EXPIRE', session_meta_key, math.ceil(session_ttl_ms / 1000))
  
  -- Session'ı presence set'e ekle
  redis.call('ZADD', presence_sessions_key, current_timestamp, session_id)
  redis.call('EXPIRE', presence_sessions_key, math.ceil(session_ttl_ms / 1000))
  
  -- Current session'ı güncelle
  redis.call('SET', current_session_key, session_id, 'EX', math.ceil(session_ttl_ms / 1000))
  
  -- Visitor session count'unu artır
  redis.call('HINCRBY', visitor_counts_key, visitor_id, 1)
  redis.call('HSET', visitor_counts_key, visitor_id .. '_last_session', current_timestamp)
  redis.call('EXPIRE', visitor_counts_key, math.ceil(session_ttl_ms / 1000))
  
  return {
    session_id = session_id,
    is_new_session = true,
    previous_session_id = previous_session_id,
    session_gap_ms = session_gap
  }
`;

/**
 * Session End Lua Script
 * Session sonlandırma için atomik script
 * 
 * @param KEYS[1] - visitor:current_session:<shop>:<visitor_id>
 * @param KEYS[2] - presence:s:<shop>
 * @param KEYS[3] - session:meta:<shop>:<session_id>
 * @param ARGV[1] - session_id
 * @param ARGV[2] - current_timestamp
 * @param ARGV[3] - last_page
 * 
 * @returns {session_id, duration_ms, page_count, success}
 */
export const SESSION_END_SCRIPT = `
  local current_session_key = KEYS[1]
  local presence_sessions_key = KEYS[2]
  local session_meta_key = KEYS[3]
  
  local session_id = ARGV[1]
  local current_timestamp = tonumber(ARGV[2])
  local last_page = ARGV[3] or ''
  
  -- Session metadata'sını al
  local session_meta = redis.call('HGETALL', session_meta_key)
  local session_data = {}
  
  for i = 1, #session_meta, 2 do
    session_data[session_meta[i]] = session_meta[i + 1]
  end
  
  if not session_data['session_id'] then
    return {
      session_id = session_id,
      duration_ms = 0,
      page_count = 0,
      success = false,
      error = 'Session not found'
    }
  end
  
  local started_at = tonumber(session_data['started_at'])
  local page_count = tonumber(session_data['page_count']) or 1
  local duration_ms = current_timestamp - started_at
  
  -- Session'ı sonlandır
  redis.call('HSET', session_meta_key, 'ended_at', current_timestamp)
  redis.call('HSET', session_meta_key, 'last_page', last_page)
  redis.call('HSET', session_meta_key, 'duration_ms', duration_ms)
  redis.call('HSET', session_meta_key, 'is_ended', 'true')
  
  -- Presence set'ten kaldır
  redis.call('ZREM', presence_sessions_key, session_id)
  
  -- Current session'ı temizle
  redis.call('DEL', current_session_key)
  
  return {
    session_id = session_id,
    duration_ms = duration_ms,
    page_count = page_count,
    success = true
  }
`;

/**
 * Session Update Lua Script
 * Session güncelleme için atomik script
 * 
 * @param KEYS[1] - presence:s:<shop>
 * @param KEYS[2] - session:meta:<shop>:<session_id>
 * @param ARGV[1] - session_id
 * @param ARGV[2] - current_timestamp
 * @param ARGV[3] - page_path
 * 
 * @returns {session_id, page_count, success}
 */
export const SESSION_UPDATE_SCRIPT = `
  local presence_sessions_key = KEYS[1]
  local session_meta_key = KEYS[2]
  
  local session_id = ARGV[1]
  local current_timestamp = tonumber(ARGV[2])
  local page_path = ARGV[3]
  
  -- Session metadata'sını al
  local session_meta = redis.call('HGETALL', session_meta_key)
  local session_data = {}
  
  for i = 1, #session_meta, 2 do
    session_data[session_meta[i]] = session_meta[i + 1]
  end
  
  if not session_data['session_id'] then
    return {
      session_id = session_id,
      page_count = 0,
      success = false,
      error = 'Session not found'
    }
  end
  
  -- Session'ı güncelle
  local page_count = (tonumber(session_data['page_count']) or 1) + 1
  
  redis.call('HSET', session_meta_key, 'last_activity', current_timestamp)
  redis.call('HSET', session_meta_key, 'last_page', page_path)
  redis.call('HSET', session_meta_key, 'page_count', page_count)
  
  -- Presence set'i güncelle
  redis.call('ZADD', presence_sessions_key, current_timestamp, session_id)
  
  return {
    session_id = session_id,
    page_count = page_count,
    success = true
  }
`;

/**
 * Session Cleanup Lua Script
 * Eski session'ları temizleme için script
 * 
 * @param KEYS[1] - presence:s:<shop>
 * @param KEYS[2] - session:meta:<shop>:*
 * @param ARGV[1] - current_timestamp
 * @param ARGV[2] - session_ttl_ms
 * 
 * @returns {cleaned_count, errors}
 */
export const SESSION_CLEANUP_SCRIPT = `
  local presence_sessions_key = KEYS[1]
  local current_timestamp = tonumber(ARGV[1])
  local session_ttl_ms = tonumber(ARGV[2])
  local cutoff_time = current_timestamp - session_ttl_ms
  
  -- Eski session'ları presence set'ten kaldır
  local removed_count = redis.call('ZREMRANGEBYSCORE', presence_sessions_key, '-inf', cutoff_time)
  
  -- Session metadata'larını temizle (pattern matching gerekli)
  local session_keys = redis.call('KEYS', 'session:meta:*')
  local cleaned_count = 0
  local errors = {}
  
  for i = 1, #session_keys do
    local session_key = session_keys[i]
    local session_meta = redis.call('HGETALL', session_key)
    local session_data = {}
    
    for j = 1, #session_meta, 2 do
      session_data[session_meta[j]] = session_meta[j + 1]
    end
    
    local last_activity = tonumber(session_data['last_activity']) or 0
    
    if last_activity < cutoff_time then
      local success = redis.call('DEL', session_key)
      if success == 1 then
        cleaned_count = cleaned_count + 1
      else
        table.insert(errors, 'Failed to delete ' .. session_key)
      end
    end
  end
  
  return {
    cleaned_count = cleaned_count,
    removed_from_presence = removed_count,
    errors = errors
  }
`;

/**
 * Get Active Sessions Lua Script
 * Aktif session'ları getirme için script
 * 
 * @param KEYS[1] - presence:s:<shop>
 * @param ARGV[1] - current_timestamp
 * @param ARGV[2] - session_ttl_ms
 * 
 * @returns {active_sessions, total_sessions}
 */
export const GET_ACTIVE_SESSIONS_SCRIPT = `
  local presence_sessions_key = KEYS[1]
  local current_timestamp = tonumber(ARGV[1])
  local session_ttl_ms = tonumber(ARGV[2])
  local cutoff_time = current_timestamp - session_ttl_ms
  
  -- Aktif session'ları al
  local active_sessions = redis.call('ZCOUNT', presence_sessions_key, cutoff_time, '+inf')
  
  -- Toplam session sayısını al
  local total_sessions = redis.call('ZCARD', presence_sessions_key)
  
  return {
    active_sessions = active_sessions,
    total_sessions = total_sessions
  }
`;

/**
 * Get Session Distribution Lua Script
 * Session dağılımını getirme için script
 * 
 * @param KEYS[1] - vis:session-count:<shop>
 * @param ARGV[1] - bucket_size
 * 
 * @returns {distribution}
 */
export const GET_SESSION_DISTRIBUTION_SCRIPT = `
  local visitor_counts_key = KEYS[1]
  local bucket_size = tonumber(ARGV[1]) or 1
  
  local visitor_counts = redis.call('HGETALL', visitor_counts_key)
  local distribution = {}
  local total_visitors = 0
  
  -- Visitor count'larını bucket'lara dağıt
  for i = 1, #visitor_counts, 2 do
    local visitor_id = visitor_counts[i]
    local count = tonumber(visitor_counts[i + 1])
    
    if count and count > 0 then
      local bucket = math.ceil(count / bucket_size) * bucket_size
      distribution[bucket] = (distribution[bucket] or 0) + 1
      total_visitors = total_visitors + 1
    end
  end
  
  -- Distribution'ı array formatına çevir
  local result = {}
  for bucket, count in pairs(distribution) do
    table.insert(result, {
      bucket = bucket,
      count = count,
      percentage = (count / total_visitors) * 100
    })
  end
  
  return {
    distribution = result,
    total_visitors = total_visitors
  }
`;

/**
 * Lua Script Registry
 * Tüm script'leri merkezi olarak yönetmek için
 */
export const LUA_SCRIPTS = {
  SESSION_START: SESSION_START_SCRIPT,
  SESSION_END: SESSION_END_SCRIPT,
  SESSION_UPDATE: SESSION_UPDATE_SCRIPT,
  SESSION_CLEANUP: SESSION_CLEANUP_SCRIPT,
  GET_ACTIVE_SESSIONS: GET_ACTIVE_SESSIONS_SCRIPT,
  GET_SESSION_DISTRIBUTION: GET_SESSION_DISTRIBUTION_SCRIPT,
} as const;

/**
 * Script Key Mappings
 * Her script için gerekli key'leri tanımlar
 */
export const SCRIPT_KEY_MAPPINGS = {
  SESSION_START: {
    keys: ['visitor:current_session', 'presence:s', 'vis:session-count', 'session:meta'],
    args: ['visitor_id', 'current_timestamp', 'session_gap_ms', 'session_ttl_ms', 'page_path', 'referrer', 'user_agent', 'ip_hash'],
  },
  SESSION_END: {
    keys: ['visitor:current_session', 'presence:s', 'session:meta'],
    args: ['session_id', 'current_timestamp', 'last_page'],
  },
  SESSION_UPDATE: {
    keys: ['presence:s', 'session:meta'],
    args: ['session_id', 'current_timestamp', 'page_path'],
  },
  SESSION_CLEANUP: {
    keys: ['presence:s', 'session:meta:*'],
    args: ['current_timestamp', 'session_ttl_ms'],
  },
  GET_ACTIVE_SESSIONS: {
    keys: ['presence:s'],
    args: ['current_timestamp', 'session_ttl_ms'],
  },
  GET_SESSION_DISTRIBUTION: {
    keys: ['vis:session-count'],
    args: ['bucket_size'],
  },
} as const;
