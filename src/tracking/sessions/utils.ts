/**
 * Sessions Tracking Utilities
 * 
 * Bu dosya sessions tracking modülü için yardımcı fonksiyonları içerir.
 * Session ID oluşturma, validation, formatting ve helper fonksiyonlar.
 */

import { 
  SessionData, 
  SessionValidationResult, 
  SessionFilterOptions,
  AnalyticsTimeRange 
} from './types';
import { 
  SESSION_VALIDATION
} from './constants';

/**
 * Session ID oluşturur
 * Format: session_<visitor_id>_<timestamp>_<random>
 */
export function generateSessionId(visitorId: string, timestamp?: number): string {
  const ts = timestamp || Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `session_${visitorId}_${ts}_${random}`;
}

/**
 * Visitor ID oluşturur
 * Format: visitor_<random>_<timestamp>
 */
export function generateVisitorId(): string {
  const random = Math.random().toString(36).substring(2, 8);
  const timestamp = Date.now().toString(36);
  return `visitor_${random}_${timestamp}`;
}

/**
 * Session'ı doğrular
 */
export function validateSession(session: Partial<SessionData>): SessionValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Session ID validation
  if (!session.session_id) {
    errors.push('Session ID is required');
  } else if (typeof session.session_id !== 'string' || session.session_id.length < 10) {
    errors.push('Invalid session ID format');
  }

  // Shop validation
  if (!session.shop) {
    errors.push('Shop is required');
  } else if (typeof session.shop !== 'string' || !session.shop.includes('.')) {
    errors.push('Invalid shop format');
  }

  // Visitor ID validation
  if (!session.visitor_id) {
    errors.push('Visitor ID is required');
  } else if (typeof session.visitor_id !== 'string' || session.visitor_id.length < 10) {
    errors.push('Invalid visitor ID format');
  }

  // Started at validation
  if (!session.started_at) {
    errors.push('Started at is required');
  } else if (!(session.started_at instanceof Date) || isNaN(session.started_at.getTime())) {
    errors.push('Invalid started at date');
  }

  // Duration validation
  if (session.duration_ms !== undefined) {
    if (session.duration_ms < SESSION_VALIDATION.MIN_SESSION_DURATION_MS) {
      warnings.push('Session duration is very short');
    }
    if (session.duration_ms > SESSION_VALIDATION.MAX_SESSION_DURATION_MS) {
      warnings.push('Session duration is very long');
    }
  }

  // Page path validation
  if (session.first_page && session.first_page.length > SESSION_VALIDATION.MAX_PAGE_PATH_LENGTH) {
    warnings.push('First page path is very long');
  }
  if (session.last_page && session.last_page.length > SESSION_VALIDATION.MAX_PAGE_PATH_LENGTH) {
    warnings.push('Last page path is very long');
  }

  // Referrer validation
  if (session.referrer && session.referrer.length > SESSION_VALIDATION.MAX_REFERRER_LENGTH) {
    warnings.push('Referrer is very long');
  }

  // User agent validation
  if (session.ua && session.ua.length > SESSION_VALIDATION.MAX_USER_AGENT_LENGTH) {
    warnings.push('User agent is very long');
  }

  return {
    is_valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Session'ı formatlar (display için)
 */
export function formatSession(session: SessionData): {
  id: string;
  shop: string;
  visitor: string;
  duration: string;
  pages: number;
  status: string;
  started: string;
  ended?: string;
} {
  const duration = session.duration_ms 
    ? formatDuration(session.duration_ms)
    : 'Active';

  const status = session.ended_at ? 'Ended' : 'Active';

  const result: {
    id: string;
    shop: string;
    visitor: string;
    duration: string;
    pages: number;
    status: string;
    started: string;
    ended?: string;
  } = {
    id: session.session_id,
    shop: session.shop,
    visitor: session.visitor_id,
    duration,
    pages: session.page_count || 0,
    status,
    started: formatDate(session.started_at)
  };

  if (session.ended_at) {
    result.ended = formatDate(session.ended_at);
  }

  return result;
}

/**
 * Süreyi formatlar (ms → human readable)
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }

  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) {
    return `${seconds}s`;
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ${seconds % 60}s`;
  }

  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

/**
 * Tarihi formatlar
 */
export function formatDate(date: Date): string {
  return date.toLocaleString('tr-TR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
}

/**
 * Zaman aralığı başlangıç tarihini hesaplar
 */
export function getTimeRangeStartDate(timeRange: AnalyticsTimeRange): Date {
  const now = new Date();
  
  switch (timeRange) {
    case 'today':
      return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    case '90d':
      return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
    default:
      return new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }
}

/**
 * Session filtreleme seçeneklerini doğrular
 */
export function validateFilterOptions(options: SessionFilterOptions): SessionValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Date range validation
  if (options.started_after && options.started_before) {
    if (options.started_after >= options.started_before) {
      errors.push('Started after must be before started before');
    }
  }

  if (options.ended_after && options.ended_before) {
    if (options.ended_after >= options.ended_before) {
      errors.push('Ended after must be before ended before');
    }
  }

  // Duration validation
  if (options.min_duration_ms && options.max_duration_ms) {
    if (options.min_duration_ms >= options.max_duration_ms) {
      errors.push('Min duration must be less than max duration');
    }
  }

  // Limit validation
  if (options.limit && (options.limit < 1 || options.limit > 1000)) {
    warnings.push('Limit should be between 1 and 1000');
  }

  // Offset validation
  if (options.offset && options.offset < 0) {
    errors.push('Offset must be non-negative');
  }

  return {
    is_valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Session'ları filtreler
 */
export function filterSessions(sessions: SessionData[], options: SessionFilterOptions): SessionData[] {
  let filtered = [...sessions];

  // Shop filter
  if (options.shop) {
    filtered = filtered.filter(s => s.shop === options.shop);
  }

  // Visitor ID filter
  if (options.visitor_id) {
    filtered = filtered.filter(s => s.visitor_id === options.visitor_id);
  }

  // Date range filters
  if (options.started_after) {
    filtered = filtered.filter(s => s.started_at >= options.started_after!);
  }

  if (options.started_before) {
    filtered = filtered.filter(s => s.started_at <= options.started_before!);
  }

  if (options.ended_after) {
    filtered = filtered.filter(s => s.ended_at && s.ended_at >= options.ended_after!);
  }

  if (options.ended_before) {
    filtered = filtered.filter(s => s.ended_at && s.ended_at <= options.ended_before!);
  }

  // Duration filters
  if (options.min_duration_ms) {
    filtered = filtered.filter(s => s.duration_ms && s.duration_ms >= options.min_duration_ms!);
  }

  if (options.max_duration_ms) {
    filtered = filtered.filter(s => s.duration_ms && s.duration_ms <= options.max_duration_ms!);
  }

  // Page path filter
  if (options.page_path) {
    filtered = filtered.filter(s => 
      s.first_page?.includes(options.page_path!) || 
      s.last_page?.includes(options.page_path!)
    );
  }

  // Referrer filter
  if (options.referrer) {
    filtered = filtered.filter(s => s.referrer?.includes(options.referrer!));
  }

  // User agent filter
  if (options.user_agent) {
    filtered = filtered.filter(s => s.ua?.includes(options.user_agent!));
  }

  // State filter
  if (options.state) {
    if (options.state === 'active') {
      filtered = filtered.filter(s => !s.ended_at);
    } else if (options.state === 'ended') {
      filtered = filtered.filter(s => s.ended_at);
    }
  }

  // Sorting
  if (options.order_by) {
    filtered.sort((a, b) => {
      let aValue: any, bValue: any;

      switch (options.order_by) {
        case 'started_at':
          aValue = a.started_at.getTime();
          bValue = b.started_at.getTime();
          break;
        case 'ended_at':
          aValue = a.ended_at?.getTime() || 0;
          bValue = b.ended_at?.getTime() || 0;
          break;
        case 'duration_ms':
          aValue = a.duration_ms || 0;
          bValue = b.duration_ms || 0;
          break;
        case 'page_count':
          aValue = a.page_count || 0;
          bValue = b.page_count || 0;
          break;
        default:
          return 0;
      }

      const direction = options.order_direction === 'desc' ? -1 : 1;
      return (aValue - bValue) * direction;
    });
  }

  // Pagination
  if (options.offset) {
    filtered = filtered.slice(options.offset);
  }

  if (options.limit) {
    filtered = filtered.slice(0, options.limit);
  }

  return filtered;
}

/**
 * Session istatistiklerini hesaplar
 */
export function calculateSessionStats(sessions: SessionData[]): {
  total: number;
  active: number;
  ended: number;
  avgDuration: number;
  medianDuration: number;
  maxDuration: number;
  minDuration: number;
  avgPages: number;
  maxPages: number;
  minPages: number;
} {
  const total = sessions.length;
  const active = sessions.filter(s => !s.ended_at).length;
  const ended = sessions.filter(s => s.ended_at).length;

  const durations = sessions
    .filter(s => s.duration_ms)
    .map(s => s.duration_ms!);

  const avgDuration = durations.length > 0 
    ? durations.reduce((a, b) => a + b, 0) / durations.length 
    : 0;

  const sortedDurations = durations.sort((a, b) => a - b);
  const medianDuration = sortedDurations.length > 0
    ? sortedDurations[Math.floor(sortedDurations.length / 2)]
    : 0;

  const maxDuration = durations.length > 0 ? Math.max(...durations) : 0;
  const minDuration = durations.length > 0 ? Math.min(...durations) : 0;

  const pageCounts = sessions
    .filter(s => s.page_count)
    .map(s => s.page_count!);

  const avgPages = pageCounts.length > 0
    ? pageCounts.reduce((a, b) => a + b, 0) / pageCounts.length
    : 0;

  const maxPages = pageCounts.length > 0 ? Math.max(...pageCounts) : 0;
  const minPages = pageCounts.length > 0 ? Math.min(...pageCounts) : 0;

  return {
    total,
    active,
    ended,
    avgDuration,
    medianDuration: medianDuration || 0,
    maxDuration,
    minDuration,
    avgPages,
    maxPages,
    minPages
  };
}

/**
 * Session'ları gruplar (günlük, saatlik, vb.)
 */
export function groupSessionsByTime(sessions: SessionData[], groupBy: 'hour' | 'day' | 'week' | 'month'): Array<{
  period: string;
  count: number;
  sessions: SessionData[];
}> {
  const groups = new Map<string, SessionData[]>();

  sessions.forEach(session => {
    let key: string;

    switch (groupBy) {
      case 'hour':
        key = session.started_at.toISOString().substring(0, 13) + ':00:00';
        break;
      case 'day':
        key = session.started_at.toISOString().substring(0, 10);
        break;
      case 'week':
        const weekStart = new Date(session.started_at);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        key = weekStart.toISOString().substring(0, 10);
        break;
      case 'month':
        key = session.started_at.toISOString().substring(0, 7);
        break;
      default:
        key = session.started_at.toISOString().substring(0, 10);
    }

    if (!groups.has(key)) {
      groups.set(key, []);
    }
    groups.get(key)!.push(session);
  });

  return Array.from(groups.entries())
    .map(([period, sessions]) => ({
      period,
      count: sessions.length,
      sessions
    }))
    .sort((a, b) => a.period.localeCompare(b.period));
}

/**
 * Session'ları sayfa bazında gruplar
 */
export function groupSessionsByPage(sessions: SessionData[]): Array<{
  page: string;
  count: number;
  percentage: number;
  avgDuration: number;
}> {
  const pageMap = new Map<string, SessionData[]>();

  sessions.forEach(session => {
    const page = session.first_page || '/';
    if (!pageMap.has(page)) {
      pageMap.set(page, []);
    }
    pageMap.get(page)!.push(session);
  });

  const total = sessions.length;

  return Array.from(pageMap.entries())
    .map(([page, sessions]) => {
      const durations = sessions
        .filter(s => s.duration_ms)
        .map(s => s.duration_ms!);
      
      const avgDuration = durations.length > 0
        ? durations.reduce((a, b) => a + b, 0) / durations.length
        : 0;

      return {
        page,
        count: sessions.length,
        percentage: (sessions.length / total) * 100,
        avgDuration
      };
    })
    .sort((a, b) => b.count - a.count);
}

/**
 * Session'ları referrer bazında gruplar
 */
export function groupSessionsByReferrer(sessions: SessionData[]): Array<{
  referrer: string;
  count: number;
  percentage: number;
  avgDuration: number;
}> {
  const referrerMap = new Map<string, SessionData[]>();

  sessions.forEach(session => {
    const referrer = session.referrer || 'direct';
    if (!referrerMap.has(referrer)) {
      referrerMap.set(referrer, []);
    }
    referrerMap.get(referrer)!.push(session);
  });

  const total = sessions.length;

  return Array.from(referrerMap.entries())
    .map(([referrer, sessions]) => {
      const durations = sessions
        .filter(s => s.duration_ms)
        .map(s => s.duration_ms!);
      
      const avgDuration = durations.length > 0
        ? durations.reduce((a, b) => a + b, 0) / durations.length
        : 0;

      return {
        referrer,
        count: sessions.length,
        percentage: (sessions.length / total) * 100,
        avgDuration
      };
    })
    .sort((a, b) => b.count - a.count);
}
