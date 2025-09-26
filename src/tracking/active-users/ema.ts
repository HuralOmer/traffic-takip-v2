/**
 * EMA (Exponential Moving Average) Algorithm Implementation
 * 
 * Bu dosya Active Users tracking için EMA algoritmasını implement eder.
 * Aggregate-EMA yaklaşımı kullanarak anlık aktif kullanıcı sayısını
 * smooth bir şekilde hesaplar ve trend analizi yapar.
 */

import { EMAResult, EMAState, TrendDirection } from './types';
import { EMA_TAU_FAST, EMA_TAU_SLOW, EMA_MIN_ALPHA, EMA_MAX_ALPHA } from './constants';

/**
 * Alpha değerini hesaplar (sürekli zaman katsayısı)
 * @param tau - Time constant (saniye)
 * @param dt - Time delta (saniye)
 * @returns Alpha değeri (0-1 arası)
 */
export function alpha(tau: number, dt: number): number {
  if (dt <= 0) return 0;
  if (tau <= 0) return 1;
  
  const rawAlpha = 1 - Math.exp(-dt / tau);
  return Math.max(EMA_MIN_ALPHA, Math.min(EMA_MAX_ALPHA, rawAlpha));
}

/**
 * EMA adımını hesaplar
 * @param current - Mevcut EMA değeri
 * @param newValue - Yeni değer
 * @param alpha - Alpha katsayısı
 * @returns Güncellenmiş EMA değeri
 */
export function emaStep(current: number, newValue: number, alpha: number): number {
  if (alpha <= 0) return current;
  if (alpha >= 1) return newValue;
  
  return current + alpha * (newValue - current);
}

/**
 * Trend yönünü hesaplar
 * @param ema_fast - Fast EMA değeri
 * @param ema_slow - Slow EMA değeri
 * @returns Trend yönü ve gücü
 */
export function calculateTrend(ema_fast: number, ema_slow: number): {
  direction: TrendDirection;
  strength: number;
} {
  const diff = ema_fast - ema_slow;
  const avg = (ema_fast + ema_slow) / 2;
  
  if (avg === 0) {
    return { direction: 'stable', strength: 0 };
  }
  
  const relativeDiff = Math.abs(diff) / avg;
  const strength = Math.min(1, relativeDiff * 2); // 0-1 arası normalize et
  
  if (diff > 0.01) {
    return { direction: 'up', strength };
  } else if (diff < -0.01) {
    return { direction: 'down', strength };
  } else {
    return { direction: 'stable', strength };
  }
}

/**
 * EMA state'ini günceller
 * @param currentState - Mevcut EMA state
 * @param newAuRaw - Yeni aktif kullanıcı sayısı
 * @param timestamp - Yeni timestamp
 * @returns Güncellenmiş EMA state
 */
export function updateEMAState(
  currentState: EMAState,
  newAuRaw: number,
  timestamp: number
): EMAState {
  const dt = (timestamp - currentState.last_ts) / 1000; // saniye cinsinden
  
  if (dt <= 0) {
    return currentState; // Geçersiz zaman delta
  }
  
  const alphaFast = alpha(EMA_TAU_FAST, dt);
  const alphaSlow = alpha(EMA_TAU_SLOW, dt);
  
  const newEmaFast = emaStep(currentState.ema_fast, newAuRaw, alphaFast);
  const newEmaSlow = emaStep(currentState.ema_slow, newAuRaw, alphaSlow);
  
  return {
    ema_fast: newEmaFast,
    ema_slow: newEmaSlow,
    last_ts: timestamp,
    last_au_raw: newAuRaw,
  };
}

/**
 * EMA sonucunu hesaplar (trend analizi ile)
 * @param emaState - EMA state
 * @returns EMA sonucu ve trend bilgisi
 */
export function calculateEMAResult(emaState: EMAState): EMAResult {
  const trend = calculateTrend(emaState.ema_fast, emaState.ema_slow);
  
  return {
    ema_fast: emaState.ema_fast,
    ema_slow: emaState.ema_slow,
    last_ts: emaState.last_ts,
    trend: trend.direction,
    trend_strength: trend.strength,
  };
}

/**
 * İlk EMA state'ini oluşturur
 * @param auRaw - İlk aktif kullanıcı sayısı
 * @param timestamp - İlk timestamp
 * @returns İlk EMA state
 */
export function createInitialEMAState(auRaw: number, timestamp: number): EMAState {
  return {
    ema_fast: auRaw,
    ema_slow: auRaw,
    last_ts: timestamp,
    last_au_raw: auRaw,
  };
}

/**
 * EMA değerlerini normalize eder (0-1 arası)
 * @param emaValue - EMA değeri
 * @param maxValue - Maksimum değer (normalizasyon için)
 * @returns Normalize edilmiş değer
 */
export function normalizeEMA(emaValue: number, maxValue: number = 1000): number {
  if (maxValue <= 0) return 0;
  return Math.min(1, Math.max(0, emaValue / maxValue));
}

/**
 * EMA değerlerinin geçerliliğini kontrol eder
 * @param emaState - EMA state
 * @returns Geçerli mi?
 */
export function isValidEMAState(emaState: EMAState): boolean {
  return (
    emaState.ema_fast >= 0 &&
    emaState.ema_slow >= 0 &&
    emaState.last_ts > 0 &&
    emaState.last_au_raw >= 0 &&
    !isNaN(emaState.ema_fast) &&
    !isNaN(emaState.ema_slow) &&
    isFinite(emaState.ema_fast) &&
    isFinite(emaState.ema_slow)
  );
}

/**
 * EMA değerlerini sıfırlar
 * @returns Sıfırlanmış EMA state
 */
export function resetEMAState(): EMAState {
  return {
    ema_fast: 0,
    ema_slow: 0,
    last_ts: Date.now(),
    last_au_raw: 0,
  };
}

/**
 * EMA hesaplama istatistiklerini döndürür
 * @param emaState - EMA state
 * @returns İstatistikler
 */
export function getEMAStats(emaState: EMAState): {
  fast_slow_ratio: number;
  volatility: number;
  last_update_age_ms: number;
} {
  const now = Date.now();
  const fastSlowRatio = emaState.ema_slow > 0 ? emaState.ema_fast / emaState.ema_slow : 1;
  const volatility = Math.abs(emaState.ema_fast - emaState.ema_slow) / Math.max(emaState.ema_fast, emaState.ema_slow, 1);
  const lastUpdateAge = now - emaState.last_ts;
  
  return {
    fast_slow_ratio: fastSlowRatio,
    volatility: volatility,
    last_update_age_ms: lastUpdateAge,
  };
}
