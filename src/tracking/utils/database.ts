/**
 * Veritabanı Yönetim Sınıfı
 * 
 * Bu sınıf, Supabase veritabanı bağlantılarını yönetir.
 * Singleton pattern kullanarak tek bir instance sağlar.
 * 
 * Özellikler:
 * - Normal kullanıcı bağlantısı (RLS ile)
 * - Servis rolü bağlantısı (RLS bypass)
 * - Health check fonksiyonalitesi
 * - Shop context yönetimi
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { DatabaseConfig } from '../../types';

/**
 * Veritabanı yöneticisi sınıfı
 * Singleton pattern ile tek instance garantisi
 */
class DatabaseManager {
  private static instance: DatabaseManager;
  private supabase: SupabaseClient; // Normal kullanıcı bağlantısı
  private supabaseService: SupabaseClient; // Servis rolü bağlantısı

  /**
   * Özel constructor - Singleton pattern için private
   * Ortam değişkenlerinden Supabase konfigürasyonunu yükler
   */
  private constructor() {
    // Ortam değişkenlerinden Supabase konfigürasyonunu al
    const config: DatabaseConfig = {
      url: process.env['SUPABASE_URL'] || '',
      anon_key: process.env['SUPABASE_ANON_KEY'] || '',
      service_role_key: process.env['SUPABASE_SERVICE_ROLE_KEY'] || '',
    };

    // Debug: Environment variables'ları logla
    console.log('Environment Variables Debug:');
    console.log('SUPABASE_URL:', process.env['SUPABASE_URL'] ? 'SET' : 'NOT SET');
    console.log('SUPABASE_ANON_KEY:', process.env['SUPABASE_ANON_KEY'] ? 'SET' : 'NOT SET');
    console.log('SUPABASE_SERVICE_ROLE_KEY:', process.env['SUPABASE_SERVICE_ROLE_KEY'] ? 'SET' : 'NOT SET');
    console.log('All env keys:', Object.keys(process.env).filter(key => key.includes('SUPABASE')));

    // Konfigürasyon kontrolü
    if (!config.url || !config.anon_key || !config.service_role_key) {
      throw new Error('Supabase configuration is missing. Please check your environment variables.');
    }

    // Normal operasyonlar için client (RLS ile)
    this.supabase = createClient(config.url, config.anon_key, {
      auth: {
        persistSession: false, // Session'ı kalıcı hale getirme
      },
    });

    // Admin operasyonları için servis rolü client (RLS bypass)
    this.supabaseService = createClient(config.url, config.service_role_key, {
      auth: {
        persistSession: false,
      },
    });
  }

  /**
   * Singleton instance'ı döndür
   * İlk çağrıda yeni instance oluşturur, sonraki çağrılarda mevcut instance'ı döndürür
   */
  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  /**
   * Normal kullanıcı client'ını döndür (RLS ile)
   * Row Level Security politikaları uygulanır
   */
  public getClient(): SupabaseClient {
    return this.supabase;
  }

  /**
   * Servis rolü client'ını döndür (RLS bypass)
   * Admin operasyonları için kullanılır
   */
  public getServiceClient(): SupabaseClient {
    return this.supabaseService;
  }

  /**
   * Shop context'i ayarla (RLS için)
   * Bu metod, Row Level Security politikalarında shop bilgisini kullanmak için
   * 
   * @param shop - Mağaza adı
   * @returns SupabaseClient - Context ayarlanmış client
   */
  public async setShopContext(shop: string): Promise<SupabaseClient> {
    const { error } = await this.supabase.auth.signInWithPassword({
      email: `shop-${shop}@tracking.app`,
      password: 'dummy-password',
    });

    if (error) {
      // RLS context için farklı bir yaklaşım kullanılmalı
      // Bu basitleştirilmiş bir versiyon - production'da JWT token'lar kullanılmalı
      console.warn('Could not set shop context:', error.message);
    }

    return this.supabase;
  }

  /**
   * Veritabanı sağlık kontrolü
   * Basit bir query ile bağlantının çalışıp çalışmadığını test eder
   * 
   * @returns boolean - Veritabanı sağlıklı mı?
   */
  public async healthCheck(): Promise<boolean> {
    try {
      // Daha basit bir health check - sadece bağlantıyı test et
      const { error } = await this.supabaseService
        .rpc('version'); // PostgreSQL version fonksiyonu

      if (error) {
        console.error('Database health check failed:', error);
        return false;
      }

      console.log('Database health check passed');
      return true;
    } catch (error) {
      console.error('Database health check failed:', error);
      return false;
    }
  }
}

// Singleton instance'ı export et
export const db = DatabaseManager.getInstance();
export default db;
