/**
 * Scope Error Handler
 * 
 * Shopify API scope hatalarını tespit eder ve yönetir.
 * Kullanıcılara scope güncelleme önerileri sunar.
 */

export interface ScopeError {
  status: number;
  message: string;
  required_scope?: string;
  error_type?: string;
}

export interface ScopeErrorContext {
  url?: string;
  method?: string;
  shop?: string;
  feature?: string;
  timestamp?: number;
}

export class ScopeErrorHandler {
  private static readonly SCOPE_ERROR_PATTERNS = [
    /insufficient_scope/i,
    /required_scope/i,
    /scope.*required/i,
    /permission.*denied/i,
    /access.*denied/i
  ];

  private static readonly SCOPE_MESSAGES = {
    'read_products': 'Ürün bilgilerini okuma',
    'write_products': 'Ürün bilgilerini düzenleme',
    'read_orders': 'Sipariş bilgilerini okuma',
    'write_orders': 'Sipariş bilgilerini düzenleme',
    'read_customers': 'Müşteri bilgilerini okuma',
    'write_customers': 'Müşteri bilgilerini düzenleme',
    'read_analytics': 'Analitik verilerini okuma',
    'read_reports': 'Rapor verilerini okuma',
    'read_inventory': 'Envanter bilgilerini okuma',
    'read_files': 'Dosya bilgilerini okuma',
    'write_files': 'Dosya yönetimi',
    'read_gift_cards': 'Hediye kartı bilgilerini okuma',
    'write_gift_cards': 'Hediye kartı yönetimi',
    'read_third_party_fulfillment_orders': '3. taraf karşılama siparişlerini okuma',
    'write_third_party_fulfillment_orders': '3. taraf karşılama siparişlerini düzenleme',
    'read_themes': 'Tema bilgilerini okuma',
    'write_themes': 'Tema yönetimi',
    'read_content': 'İçerik bilgilerini okuma',
    'write_content': 'İçerik yönetimi',
    'read_translations': 'Çeviri bilgilerini okuma',
    'write_translations': 'Çeviri yönetimi',
    'read_custom_pixels': 'Özel pixel bilgilerini okuma',
    'write_custom_pixels': 'Özel pixel yönetimi',
    'read_customer_data_erasure': 'Müşteri veri silme taleplerini okuma',
    'write_customer_data_erasure': 'Müşteri veri silme yönetimi',
    'read_discovery': 'Keşif API verilerini okuma',
    'write_discovery': 'Keşif API yönetimi',
    'read_locations': 'Konum bilgilerini okuma',
    'read_marketing_integrated_campaigns': 'Entegre pazarlama kampanyalarını okuma',
    'read_marketing_events': 'Pazarlama etkinliklerini okuma',
    'read_markets': 'Pazar bilgilerini okuma',
    'read_online_store_navigation': 'Online mağaza navigasyonunu okuma',
    'read_online_store_pages': 'Online mağaza sayfalarını okuma',
    'read_returns': 'İade bilgilerini okuma',
    'read_shipping': 'Kargo bilgilerini okuma',
    'unauthenticated_read_product_listings': 'Ürün listelerini okuma (kimlik doğrulamasız)',
    'unauthenticated_read_product_inventory': 'Ürün envanterini okuma (kimlik doğrulamasız)',
    'unauthenticated_read_checkouts': 'Ödeme bilgilerini okuma (kimlik doğrulamasız)',
    'unauthenticated_read_customers': 'Müşteri bilgilerini okuma (kimlik doğrulamasız)',
    'unauthenticated_read_customer_tags': 'Müşteri etiketlerini okuma (kimlik doğrulamasız)',
    'unauthenticated_read_metaobjects': 'Meta nesnelerini okuma (kimlik doğrulamasız)',
    'unauthenticated_read_product_pickup_locations': 'Ürün teslim alma konumlarını okuma (kimlik doğrulamasız)',
    'unauthenticated_read_product_tags': 'Ürün etiketlerini okuma (kimlik doğrulamasız)',
    'unauthenticated_read_selling_plans': 'Satış planlarını okuma (kimlik doğrulamasız)',
    'unauthenticated_read_shop_pay_installments_pricing': 'Shop Pay taksit fiyatlandırmasını okuma (kimlik doğrulamasız)',
    'unauthenticated_read_content': 'İçerik bilgilerini okuma (kimlik doğrulamasız)',
    'unauthenticated_read_bulk_operations': 'Toplu işlemleri okuma (kimlik doğrulamasız)',
    'unauthenticated_read_bundles': 'Paket bilgilerini okuma (kimlik doğrulamasız)',
    'customer_read_customers': 'Müşteri hesaplarından müşteri bilgilerini okuma',
    'customer_read_orders': 'Müşteri hesaplarından sipariş bilgilerini okuma',
    'customer_read_companies': 'Müşteri hesaplarından şirket bilgilerini okuma',
    'customer_read_draft_orders': 'Müşteri hesaplarından taslak siparişleri okuma',
    'customer_read_markets': 'Müşteri hesaplarından pazar bilgilerini okuma',
    'customer_read_store_credit_accounts': 'Müşteri hesaplarından mağaza kredi hesaplarını okuma',
    'customer_read_store_credit_account_transactions': 'Müşteri hesaplarından mağaza kredi işlemlerini okuma'
  };

  /**
   * Hatanın scope hatası olup olmadığını kontrol eder
   */
  static isScopeError(error: any): boolean {
    if (!error) return false;
    
    // HTTP status code kontrolü
    if (error.status === 403 || error.statusCode === 403) {
      return this.SCOPE_ERROR_PATTERNS.some(pattern => 
        pattern.test(error.message || '')
      );
    }
    
    // Response body kontrolü
    if (error.response?.status === 403) {
      const responseData = error.response.data || error.response.body;
      return this.SCOPE_ERROR_PATTERNS.some(pattern => 
        pattern.test(responseData?.message || '')
      );
    }
    
    return false;
  }

  /**
   * Hata mesajından gerekli scope'u çıkarır
   */
  static extractRequiredScope(error: any): string | null {
    if (!this.isScopeError(error)) return null;
    
    const message = error.message || error.response?.data?.message || '';
    
    // Farklı pattern'leri dene
    const patterns = [
      /required_scope[:\s]+(\w+)/i,
      /scope[:\s]+(\w+)[:\s]+required/i,
      /insufficient_scope[:\s]+(\w+)/i,
      /permission[:\s]+(\w+)[:\s]+denied/i,
      /access[:\s]+(\w+)[:\s]+denied/i
    ];
    
    for (const pattern of patterns) {
      const match = message.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    return null;
  }

  /**
   * Scope hatasını işler ve kullanıcıya bildirir
   */
  static handleScopeError(error: any, context: ScopeErrorContext = {}): void {
    const requiredScope = this.extractRequiredScope(error);
    const scopeDescription = requiredScope ? (this.SCOPE_MESSAGES as any)[requiredScope] : 'bilinmeyen izin';
    
    // Log the error
    console.error('Scope error detected:', {
      requiredScope,
      scopeDescription,
      context,
      error: error.message || error.response?.data?.message,
      timestamp: new Date().toISOString()
    });
    
    // Browser'da kullanıcıya bildirim göster
    if (typeof window !== 'undefined') {
      this.notifyUser(requiredScope, scopeDescription, context);
    }
    
    // Server-side logging
    if (typeof window === 'undefined') {
      this.logScopeError(requiredScope, scopeDescription, context, error);
    }
  }

  /**
   * Kullanıcıya scope hatası bildirimi gösterir
   */
  private static notifyUser(requiredScope: string | null, scopeDescription: string, _context: ScopeErrorContext): void {
    const message = requiredScope 
      ? `Bu özellik için '${scopeDescription}' izni gerekli. Lütfen uygulamayı güncelleyin.`
      : 'Bu özellik için ek izin gerekli. Lütfen uygulamayı güncelleyin.';
    
    // Toast notification göster
    this.showToast({
      type: 'warning',
      title: 'İzin Gerekli',
      message,
      action: 'Güncelle',
      onClick: () => this.openScopeUpdatePage()
    });
    
    // Console'a da yazdır
    console.warn('Scope Error:', message);
  }

  /**
   * Server-side scope hatası loglar
   */
  private static logScopeError(requiredScope: string | null, scopeDescription: string, _context: ScopeErrorContext, error: any): void {
    const logData = {
      type: 'SCOPE_ERROR',
      requiredScope,
      scopeDescription,
      context: _context,
      error: {
        message: error.message || error.response?.data?.message,
        status: error.status || error.response?.status,
        stack: error.stack
      },
      timestamp: new Date().toISOString()
    };
    
    // Burada loglama sisteminizi kullanabilirsiniz
    console.error('Scope Error Log:', JSON.stringify(logData, null, 2));
  }

  /**
   * Toast notification gösterir
   */
  private static showToast(options: {
    type: 'success' | 'warning' | 'error' | 'info';
    title: string;
    message: string;
    action?: string;
    onClick?: () => void;
  }): void {
    // Basit toast notification implementasyonu
    const toast = document.createElement('div');
    toast.className = `scope-error-toast scope-error-toast--${options.type}`;
    toast.innerHTML = `
      <div class="scope-error-toast__content">
        <div class="scope-error-toast__icon">⚠️</div>
        <div class="scope-error-toast__text">
          <div class="scope-error-toast__title">${options.title}</div>
          <div class="scope-error-toast__message">${options.message}</div>
        </div>
        ${options.action ? `<button class="scope-error-toast__action" onclick="this.parentElement.parentElement.remove()">${options.action}</button>` : ''}
        <button class="scope-error-toast__close" onclick="this.parentElement.parentElement.remove()">×</button>
      </div>
    `;
    
    // Stil ekle
    if (!document.getElementById('scope-error-toast-styles')) {
      const style = document.createElement('style');
      style.id = 'scope-error-toast-styles';
      style.textContent = `
        .scope-error-toast {
          position: fixed;
          top: 20px;
          right: 20px;
          z-index: 10000;
          background: #fff;
          border: 1px solid #ddd;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          max-width: 400px;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }
        .scope-error-toast--warning {
          border-left: 4px solid #f59e0b;
        }
        .scope-error-toast--error {
          border-left: 4px solid #ef4444;
        }
        .scope-error-toast__content {
          display: flex;
          align-items: flex-start;
          padding: 16px;
        }
        .scope-error-toast__icon {
          font-size: 20px;
          margin-right: 12px;
          margin-top: 2px;
        }
        .scope-error-toast__text {
          flex: 1;
        }
        .scope-error-toast__title {
          font-weight: 600;
          font-size: 14px;
          margin-bottom: 4px;
          color: #1f2937;
        }
        .scope-error-toast__message {
          font-size: 13px;
          color: #6b7280;
          line-height: 1.4;
        }
        .scope-error-toast__action {
          background: #3b82f6;
          color: white;
          border: none;
          padding: 6px 12px;
          border-radius: 4px;
          font-size: 12px;
          cursor: pointer;
          margin-left: 8px;
        }
        .scope-error-toast__close {
          background: none;
          border: none;
          font-size: 18px;
          cursor: pointer;
          color: #9ca3af;
          margin-left: 8px;
          padding: 0;
          width: 20px;
          height: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
      `;
      document.head.appendChild(style);
    }
    
    document.body.appendChild(toast);
    
    // 5 saniye sonra otomatik kapat
    setTimeout(() => {
      if (toast.parentElement) {
        toast.remove();
      }
    }, 5000);
    
    // Action button click handler
    if (options.onClick) {
      const actionButton = toast.querySelector('.scope-error-toast__action');
      if (actionButton) {
        actionButton.addEventListener('click', options.onClick);
      }
    }
  }

  /**
   * Scope güncelleme sayfasını açar
   */
  private static openScopeUpdatePage(): void {
    // Shopify Partner Dashboard'a yönlendir
    // Bu URL'yi kendi app ID'nizle değiştirin
    const partnerDashboardUrl = 'https://partners.shopify.com/apps/YOUR_APP_ID/permissions';
    window.open(partnerDashboardUrl, '_blank');
  }

  /**
   * Mevcut scope'ları kontrol eder
   */
  static async checkRequiredScopes(requiredScopes: string[]): Promise<{
    hasError: boolean;
    missingScopes: string[];
    message?: string;
  }> {
    try {
      // Bu fonksiyon client-side'da çalışır
      // Mevcut scope'ları localStorage'dan veya API'den alabilirsiniz
      const currentScopes = this.getCurrentScopes();
      const missingScopes = requiredScopes.filter(scope => 
        !currentScopes.includes(scope)
      );
      
      if (missingScopes.length > 0) {
        return {
          hasError: true,
          missingScopes,
          message: `Eksik scope'lar: ${missingScopes.join(', ')}`
        };
      }
      
      return { hasError: false, missingScopes: [] };
    } catch (error) {
      console.error('Scope check failed:', error);
      return {
        hasError: true,
        missingScopes: requiredScopes,
        message: 'Scope kontrolü başarısız'
      };
    }
  }

  /**
   * Mevcut scope'ları alır
   */
  private static getCurrentScopes(): string[] {
    try {
      // localStorage'dan scope'ları al
      const stored = localStorage.getItem('shopify_app_scopes');
      if (stored) {
        return JSON.parse(stored);
      }
      
      // Varsayılan scope'lar
      return [];
    } catch (error) {
      console.error('Failed to get current scopes:', error);
      return [];
    }
  }

  /**
   * Scope'ları günceller
   */
  static updateScopes(scopes: string[]): void {
    try {
      localStorage.setItem('shopify_app_scopes', JSON.stringify(scopes));
    } catch (error) {
      console.error('Failed to update scopes:', error);
    }
  }
}

// Global error handler for unhandled promise rejections
if (typeof window !== 'undefined') {
  window.addEventListener('unhandledrejection', (event) => {
    if (ScopeErrorHandler.isScopeError(event.reason)) {
      ScopeErrorHandler.handleScopeError(event.reason);
      event.preventDefault(); // Prevent default error handling
    }
  });
}
