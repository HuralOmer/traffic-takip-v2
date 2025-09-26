/**
 * Scope Manager
 * 
 * Uygulama scope'larını yönetir ve scope kontrollerini yapar.
 */

import { ScopeErrorHandler } from './scope-error-handler';

export interface ScopeInfo {
  name: string;
  description: string;
  required: boolean;
  category: 'read' | 'write' | 'admin' | 'storefront' | 'customer';
  feature?: string;
}

export interface ScopeCheckResult {
  hasError: boolean;
  missingScopes: string[];
  availableScopes: string[];
  message?: string;
  recommendations?: string[];
}

export class ScopeManager {
  private static readonly REQUIRED_SCOPES: ScopeInfo[] = [
    // Admin API - Read Scopes
    { name: 'read_products', description: 'Ürün bilgilerini okuma', required: true, category: 'read', feature: 'product_analysis' },
    { name: 'read_orders', description: 'Sipariş bilgilerini okuma', required: true, category: 'read', feature: 'order_analysis' },
    { name: 'read_customers', description: 'Müşteri bilgilerini okuma', required: true, category: 'read', feature: 'customer_analysis' },
    { name: 'read_analytics', description: 'Analitik verilerini okuma', required: true, category: 'read', feature: 'analytics' },
    { name: 'read_reports', description: 'Rapor verilerini okuma', required: true, category: 'read', feature: 'reporting' },
    { name: 'read_inventory', description: 'Envanter bilgilerini okuma', required: true, category: 'read', feature: 'inventory_analysis' },
    { name: 'read_files', description: 'Dosya bilgilerini okuma', required: true, category: 'read', feature: 'file_analysis' },
    { name: 'read_gift_cards', description: 'Hediye kartı bilgilerini okuma', required: true, category: 'read', feature: 'gift_card_analysis' },
    { name: 'read_third_party_fulfillment_orders', description: '3. taraf karşılama siparişlerini okuma', required: true, category: 'read', feature: 'fulfillment_analysis' },
    { name: 'read_themes', description: 'Tema bilgilerini okuma', required: true, category: 'read', feature: 'theme_analysis' },
    { name: 'read_content', description: 'İçerik bilgilerini okuma', required: true, category: 'read', feature: 'content_analysis' },
    { name: 'read_translations', description: 'Çeviri bilgilerini okuma', required: true, category: 'read', feature: 'translation_analysis' },
    { name: 'read_custom_pixels', description: 'Özel pixel bilgilerini okuma', required: true, category: 'read', feature: 'pixel_analysis' },
    { name: 'read_customer_data_erasure', description: 'Müşteri veri silme taleplerini okuma', required: true, category: 'read', feature: 'gdpr_compliance' },
    { name: 'read_discovery', description: 'Keşif API verilerini okuma', required: true, category: 'read', feature: 'discovery_analysis' },
    { name: 'read_locations', description: 'Konum bilgilerini okuma', required: true, category: 'read', feature: 'location_analysis' },
    { name: 'read_marketing_integrated_campaigns', description: 'Entegre pazarlama kampanyalarını okuma', required: true, category: 'read', feature: 'marketing_analysis' },
    { name: 'read_marketing_events', description: 'Pazarlama etkinliklerini okuma', required: true, category: 'read', feature: 'marketing_analysis' },
    { name: 'read_markets', description: 'Pazar bilgilerini okuma', required: true, category: 'read', feature: 'market_analysis' },
    { name: 'read_online_store_navigation', description: 'Online mağaza navigasyonunu okuma', required: true, category: 'read', feature: 'navigation_analysis' },
    { name: 'read_online_store_pages', description: 'Online mağaza sayfalarını okuma', required: true, category: 'read', feature: 'page_analysis' },
    { name: 'read_returns', description: 'İade bilgilerini okuma', required: true, category: 'read', feature: 'return_analysis' },
    { name: 'read_shipping', description: 'Kargo bilgilerini okuma', required: true, category: 'read', feature: 'shipping_analysis' },

    // Admin API - Write Scopes
    { name: 'write_products', description: 'Ürün bilgilerini düzenleme', required: true, category: 'write', feature: 'product_management' },
    { name: 'write_customer_data_erasure', description: 'Müşteri veri silme yönetimi', required: true, category: 'write', feature: 'gdpr_compliance' },
    { name: 'write_discovery', description: 'Keşif API yönetimi', required: true, category: 'write', feature: 'discovery_management' },
    { name: 'write_files', description: 'Dosya yönetimi', required: true, category: 'write', feature: 'file_management' },
    { name: 'write_gift_cards', description: 'Hediye kartı yönetimi', required: true, category: 'write', feature: 'gift_card_management' },
    { name: 'write_third_party_fulfillment_orders', description: '3. taraf karşılama siparişlerini düzenleme', required: true, category: 'write', feature: 'fulfillment_management' },
    { name: 'write_themes', description: 'Tema yönetimi', required: true, category: 'write', feature: 'theme_management' },
    { name: 'write_content', description: 'İçerik yönetimi', required: true, category: 'write', feature: 'content_management' },
    { name: 'write_translations', description: 'Çeviri yönetimi', required: true, category: 'write', feature: 'translation_management' },
    { name: 'write_custom_pixels', description: 'Özel pixel yönetimi', required: true, category: 'write', feature: 'pixel_management' },

    // Storefront API - Unauthenticated Scopes
    { name: 'unauthenticated_read_product_listings', description: 'Ürün listelerini okuma (kimlik doğrulamasız)', required: true, category: 'storefront', feature: 'storefront_analysis' },
    { name: 'unauthenticated_read_product_inventory', description: 'Ürün envanterini okuma (kimlik doğrulamasız)', required: true, category: 'storefront', feature: 'storefront_analysis' },
    { name: 'unauthenticated_read_checkouts', description: 'Ödeme bilgilerini okuma (kimlik doğrulamasız)', required: true, category: 'storefront', feature: 'checkout_analysis' },
    { name: 'unauthenticated_read_customers', description: 'Müşteri bilgilerini okuma (kimlik doğrulamasız)', required: true, category: 'storefront', feature: 'customer_analysis' },
    { name: 'unauthenticated_read_customer_tags', description: 'Müşteri etiketlerini okuma (kimlik doğrulamasız)', required: true, category: 'storefront', feature: 'customer_analysis' },
    { name: 'unauthenticated_read_metaobjects', description: 'Meta nesnelerini okuma (kimlik doğrulamasız)', required: true, category: 'storefront', feature: 'meta_analysis' },
    { name: 'unauthenticated_read_product_pickup_locations', description: 'Ürün teslim alma konumlarını okuma (kimlik doğrulamasız)', required: true, category: 'storefront', feature: 'pickup_analysis' },
    { name: 'unauthenticated_read_product_tags', description: 'Ürün etiketlerini okuma (kimlik doğrulamasız)', required: true, category: 'storefront', feature: 'product_analysis' },
    { name: 'unauthenticated_read_selling_plans', description: 'Satış planlarını okuma (kimlik doğrulamasız)', required: true, category: 'storefront', feature: 'selling_plan_analysis' },
    { name: 'unauthenticated_read_shop_pay_installments_pricing', description: 'Shop Pay taksit fiyatlandırmasını okuma (kimlik doğrulamasız)', required: true, category: 'storefront', feature: 'payment_analysis' },
    { name: 'unauthenticated_read_content', description: 'İçerik bilgilerini okuma (kimlik doğrulamasız)', required: true, category: 'storefront', feature: 'content_analysis' },
    { name: 'unauthenticated_read_bulk_operations', description: 'Toplu işlemleri okuma (kimlik doğrulamasız)', required: true, category: 'storefront', feature: 'bulk_analysis' },
    { name: 'unauthenticated_read_bundles', description: 'Paket bilgilerini okuma (kimlik doğrulamasız)', required: true, category: 'storefront', feature: 'bundle_analysis' },

    // Customer Account API - Customer Scopes
    { name: 'customer_read_customers', description: 'Müşteri hesaplarından müşteri bilgilerini okuma', required: true, category: 'customer', feature: 'customer_account_analysis' },
    { name: 'customer_read_orders', description: 'Müşteri hesaplarından sipariş bilgilerini okuma', required: true, category: 'customer', feature: 'customer_account_analysis' },
    { name: 'customer_read_companies', description: 'Müşteri hesaplarından şirket bilgilerini okuma', required: true, category: 'customer', feature: 'company_analysis' },
    { name: 'customer_read_draft_orders', description: 'Müşteri hesaplarından taslak siparişleri okuma', required: true, category: 'customer', feature: 'draft_order_analysis' },
    { name: 'customer_read_markets', description: 'Müşteri hesaplarından pazar bilgilerini okuma', required: true, category: 'customer', feature: 'market_analysis' },
    { name: 'customer_read_store_credit_accounts', description: 'Müşteri hesaplarından mağaza kredi hesaplarını okuma', required: true, category: 'customer', feature: 'credit_analysis' },
    { name: 'customer_read_store_credit_account_transactions', description: 'Müşteri hesaplarından mağaza kredi işlemlerini okuma', required: true, category: 'customer', feature: 'credit_analysis' }
  ];

  private static currentScopes: string[] = [];

  /**
   * Mevcut scope'ları ayarlar
   */
  static setCurrentScopes(scopes: string[]): void {
    this.currentScopes = scopes;
    
    // localStorage'a kaydet (client-side)
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('shopify_app_scopes', JSON.stringify(scopes));
      } catch (error) {
        console.warn('Failed to save scopes to localStorage:', error);
      }
    }
  }

  /**
   * Mevcut scope'ları getirir
   */
  static getCurrentScopes(): string[] {
    return [...this.currentScopes];
  }

  /**
   * Scope'ları localStorage'dan yükler
   */
  static loadScopesFromStorage(): string[] {
    if (typeof window === 'undefined') return [];

    try {
      const stored = localStorage.getItem('shopify_app_scopes');
      if (stored) {
        const scopes = JSON.parse(stored);
        this.setCurrentScopes(scopes);
        return scopes;
      }
    } catch (error) {
      console.warn('Failed to load scopes from localStorage:', error);
    }

    return [];
  }

  /**
   * Gerekli scope'ları kontrol eder
   */
  static checkRequiredScopes(feature?: string): ScopeCheckResult {
    const requiredScopes = feature 
      ? this.REQUIRED_SCOPES.filter(scope => scope.feature === feature)
      : this.REQUIRED_SCOPES;

    const requiredScopeNames = requiredScopes.map(scope => scope.name);
    const missingScopes = requiredScopeNames.filter(scope => 
      !this.currentScopes.includes(scope)
    );

    const availableScopes = this.currentScopes.filter(scope => 
      requiredScopeNames.includes(scope)
    );

    const hasError = missingScopes.length > 0;

    let message: string | undefined;
    let recommendations: string[] | undefined;

    if (hasError) {
      const missingScopeInfos = missingScopes.map(name => 
        this.REQUIRED_SCOPES.find(scope => scope.name === name)
      ).filter(Boolean) as ScopeInfo[];

      message = `Eksik scope'lar: ${missingScopeInfos.map(scope => scope.description).join(', ')}`;
      
      recommendations = [
        'Lütfen uygulamayı güncelleyin ve gerekli izinleri verin',
        'Partner Dashboard > App Settings > API Permissions bölümünden scope'ları güncelleyin',
        'Uygulamayı yeniden yükleyin'
      ];
    }

    return {
      hasError,
      missingScopes,
      availableScopes,
      message,
      recommendations
    };
  }

  /**
   * Belirli bir scope'un mevcut olup olmadığını kontrol eder
   */
  static hasScope(scopeName: string): boolean {
    return this.currentScopes.includes(scopeName);
  }

  /**
   * Belirli bir feature için gerekli scope'ları kontrol eder
   */
  static checkFeatureScopes(feature: string): ScopeCheckResult {
    return this.checkRequiredScopes(feature);
  }

  /**
   * Scope bilgilerini getirir
   */
  static getScopeInfo(scopeName: string): ScopeInfo | undefined {
    return this.REQUIRED_SCOPES.find(scope => scope.name === scopeName);
  }

  /**
   * Tüm scope bilgilerini getirir
   */
  static getAllScopeInfos(): ScopeInfo[] {
    return [...this.REQUIRED_SCOPES];
  }

  /**
   * Kategoriye göre scope'ları getirir
   */
  static getScopesByCategory(category: ScopeInfo['category']): ScopeInfo[] {
    return this.REQUIRED_SCOPES.filter(scope => scope.category === category);
  }

  /**
   * Feature'a göre scope'ları getirir
   */
  static getScopesByFeature(feature: string): ScopeInfo[] {
    return this.REQUIRED_SCOPES.filter(scope => scope.feature === feature);
  }

  /**
   * Scope durumunu raporlar
   */
  static getScopeStatus(): {
    total: number;
    available: number;
    missing: number;
    coverage: number;
    categories: Record<string, { total: number; available: number; missing: number }>;
  } {
    const total = this.REQUIRED_SCOPES.length;
    const available = this.currentScopes.length;
    const missing = total - available;
    const coverage = total > 0 ? (available / total) * 100 : 0;

    const categories = this.REQUIRED_SCOPES.reduce((acc, scope) => {
      if (!acc[scope.category]) {
        acc[scope.category] = { total: 0, available: 0, missing: 0 };
      }
      
      acc[scope.category].total++;
      
      if (this.currentScopes.includes(scope.name)) {
        acc[scope.category].available++;
      } else {
        acc[scope.category].missing++;
      }
      
      return acc;
    }, {} as Record<string, { total: number; available: number; missing: number }>);

    return {
      total,
      available,
      missing,
      coverage,
      categories
    };
  }

  /**
   * Scope güncelleme önerilerini getirir
   */
  static getScopeRecommendations(): {
    critical: string[];
    recommended: string[];
    optional: string[];
  } {
    const missingScopes = this.checkRequiredScopes().missingScopes;
    const missingScopeInfos = missingScopes.map(name => 
      this.REQUIRED_SCOPES.find(scope => scope.name === name)
    ).filter(Boolean) as ScopeInfo[];

    const critical = missingScopeInfos
      .filter(scope => scope.required)
      .map(scope => scope.description);

    const recommended = missingScopeInfos
      .filter(scope => !scope.required && scope.category === 'read')
      .map(scope => scope.description);

    const optional = missingScopeInfos
      .filter(scope => !scope.required && scope.category === 'write')
      .map(scope => scope.description);

    return {
      critical,
      recommended,
      optional
    };
  }

  /**
   * Scope'ları test eder
   */
  static async testScopes(): Promise<{
    success: boolean;
    results: Array<{
      scope: string;
      success: boolean;
      error?: string;
    }>;
  }> {
    const results = [];
    let allSuccess = true;

    for (const scope of this.currentScopes) {
      try {
        // Burada gerçek API test'leri yapılabilir
        // Şimdilik basit bir kontrol yapıyoruz
        const scopeInfo = this.getScopeInfo(scope);
        if (scopeInfo) {
          results.push({
            scope,
            success: true
          });
        } else {
          results.push({
            scope,
            success: false,
            error: 'Unknown scope'
          });
          allSuccess = false;
        }
      } catch (error) {
        results.push({
          scope,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        allSuccess = false;
      }
    }

    return {
      success: allSuccess,
      results
    };
  }

  /**
   * Scope'ları başlatır
   */
  static initialize(): void {
    // localStorage'dan scope'ları yükle
    this.loadScopesFromStorage();
    
    // Global error handler'ı ayarla
    if (typeof window !== 'undefined') {
      window.addEventListener('unhandledrejection', (event) => {
        if (ScopeErrorHandler.isScopeError(event.reason)) {
          ScopeErrorHandler.handleScopeError(event.reason);
          event.preventDefault();
        }
      });
    }
  }
}

// Otomatik başlatma
if (typeof window !== 'undefined') {
  ScopeManager.initialize();
}
