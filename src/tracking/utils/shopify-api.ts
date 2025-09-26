/**
 * Shopify API Wrapper
 * 
 * Shopify API çağrılarını yönetir ve scope hatalarını otomatik olarak yakalar.
 */

import { ScopeErrorHandler } from './scope-error-handler';

export interface ShopifyAPIConfig {
  accessToken: string;
  shop: string;
  apiVersion?: string;
  baseURL?: string;
}

export interface ShopifyAPIResponse<T = any> {
  data: T;
  status: number;
  headers: Record<string, string>;
  errors: any[];
}

export interface ShopifyAPIError {
  status: number;
  message: string;
  errors: any[];
  required_scope?: string;
}

export class ShopifyAPI {
  private config: ShopifyAPIConfig;
  private defaultHeaders: Record<string, string>;

  constructor(config: ShopifyAPIConfig) {
    this.config = {
      apiVersion: '2023-10',
      baseURL: 'https://api.shopify.com',
      ...config
    };
    
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      'X-Shopify-Access-Token': this.config.accessToken,
      'User-Agent': 'Traffic-Takip-App/1.0'
    };
  }

  /**
   * Genel API çağrısı yapar
   */
  async makeRequest<T = any>(
    endpoint: string, 
    options: RequestInit = {}
  ): Promise<ShopifyAPIResponse<T>> {
    const url = this.buildURL(endpoint);
    
    const requestOptions: RequestInit = {
      ...options,
      headers: {
        ...this.defaultHeaders,
        ...options.headers
      }
    };

    try {
      const response = await fetch(url, requestOptions);
      
      // Scope hatası kontrolü
      if (response.status === 403) {
        const errorData = await response.json();
        if (ScopeErrorHandler.isScopeError(errorData)) {
          ScopeErrorHandler.handleScopeError(errorData, {
            url: endpoint,
            method: options.method || 'GET',
            shop: this.config.shop,
            timestamp: Date.now()
          });
          
          throw new ShopifyAPIError(
            response.status,
            errorData.message || 'Scope error',
            errorData.errors || [],
            ScopeErrorHandler.extractRequiredScope(errorData) || undefined
          );
        }
      }

      // Diğer HTTP hataları
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ShopifyAPIError(
          response.status,
          errorData.message || `HTTP ${response.status}`,
          errorData.errors || []
        );
      }

      const data = await response.json();
      
      return {
        data,
        status: response.status,
        headers: this.extractHeaders(response.headers),
        errors: []
      };

    } catch (error) {
      // Scope hatası kontrolü (fetch error'ları için)
      if (ScopeErrorHandler.isScopeError(error)) {
        ScopeErrorHandler.handleScopeError(error, {
          url: endpoint,
          method: options.method || 'GET',
          shop: this.config.shop,
          timestamp: Date.now()
        });
      }
      
      throw error;
    }
  }

  /**
   * GET isteği yapar
   */
  async get<T = any>(endpoint: string, params?: Record<string, any>): Promise<ShopifyAPIResponse<T>> {
    const url = params ? this.addQueryParams(endpoint, params) : endpoint;
    return this.makeRequest<T>(url, { method: 'GET' });
  }

  /**
   * POST isteği yapar
   */
  async post<T = any>(endpoint: string, data?: any): Promise<ShopifyAPIResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : null
    });
  }

  /**
   * PUT isteği yapar
   */
  async put<T = any>(endpoint: string, data?: any): Promise<ShopifyAPIResponse<T>> {
    return this.makeRequest<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : null
    });
  }

  /**
   * DELETE isteği yapar
   */
  async delete<T = any>(endpoint: string): Promise<ShopifyAPIResponse<T>> {
    return this.makeRequest<T>(endpoint, { method: 'DELETE' });
  }

  /**
   * URL oluşturur
   */
  private buildURL(endpoint: string): string {
    const baseURL = `https://${this.config.shop}.myshopify.com/admin/api/${this.config.apiVersion}`;
    
    // Eğer endpoint zaten tam URL ise, olduğu gibi döndür
    if (endpoint.startsWith('http')) {
      return endpoint;
    }
    
    // Eğer endpoint / ile başlamıyorsa, / ekle
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    
    return `${baseURL}${normalizedEndpoint}`;
  }

  /**
   * Query parametrelerini ekler
   */
  private addQueryParams(endpoint: string, params: Record<string, any>): string {
    const url = new URL(this.buildURL(endpoint));
    
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(item => url.searchParams.append(key, String(item)));
        } else {
          url.searchParams.append(key, String(value));
        }
      }
    });
    
    return url.toString();
  }

  /**
   * Response header'larını çıkarır
   */
  private extractHeaders(headers: Headers): Record<string, string> {
    const result: Record<string, string> = {};
    headers.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  // Convenience methods for common Shopify API calls

  /**
   * Ürünleri getirir
   */
  async getProducts(params?: {
    limit?: number;
    page_info?: string;
    fields?: string;
    ids?: string;
    since_id?: number;
    title?: string;
    vendor?: string;
    product_type?: string;
    status?: 'active' | 'archived' | 'draft';
    collection_id?: number;
    created_at_min?: string;
    created_at_max?: string;
    updated_at_min?: string;
    updated_at_max?: string;
    published_at_min?: string;
    published_at_max?: string;
  }): Promise<ShopifyAPIResponse<{ products: any[] }>> {
    return this.get('/products.json', params);
  }

  /**
   * Siparişleri getirir
   */
  async getOrders(params?: {
    limit?: number;
    page_info?: string;
    fields?: string;
    ids?: string;
    since_id?: number;
    status?: 'open' | 'closed' | 'cancelled' | 'any';
    financial_status?: 'pending' | 'authorized' | 'partially_paid' | 'paid' | 'partially_refunded' | 'refunded' | 'voided';
    fulfillment_status?: 'shipped' | 'partial' | 'unshipped' | 'any';
    created_at_min?: string;
    created_at_max?: string;
    updated_at_min?: string;
    updated_at_max?: string;
    processed_at_min?: string;
    processed_at_max?: string;
  }): Promise<ShopifyAPIResponse<{ orders: any[] }>> {
    return this.get('/orders.json', params);
  }

  /**
   * Müşterileri getirir
   */
  async getCustomers(params?: {
    limit?: number;
    page_info?: string;
    fields?: string;
    ids?: string;
    since_id?: number;
    created_at_min?: string;
    created_at_max?: string;
    updated_at_min?: string;
    updated_at_max?: string;
  }): Promise<ShopifyAPIResponse<{ customers: any[] }>> {
    return this.get('/customers.json', params);
  }

  /**
   * Raporları getirir
   */
  async getReports(params?: {
    limit?: number;
    page_info?: string;
    fields?: string;
    ids?: string;
    since_id?: number;
  }): Promise<ShopifyAPIResponse<{ reports: any[] }>> {
    return this.get('/reports.json', params);
  }

  /**
   * Envanteri getirir
   */
  async getInventory(params?: {
    limit?: number;
    page_info?: string;
    fields?: string;
    ids?: string;
    since_id?: number;
  }): Promise<ShopifyAPIResponse<{ inventory_items: any[] }>> {
    return this.get('/inventory_items.json', params);
  }

  /**
   * Dosyaları getirir
   */
  async getFiles(params?: {
    limit?: number;
    page_info?: string;
    fields?: string;
    ids?: string;
    since_id?: number;
  }): Promise<ShopifyAPIResponse<{ files: any[] }>> {
    return this.get('/files.json', params);
  }

  /**
   * Temaları getirir
   */
  async getThemes(params?: {
    limit?: number;
    page_info?: string;
    fields?: string;
    ids?: string;
    since_id?: number;
  }): Promise<ShopifyAPIResponse<{ themes: any[] }>> {
    return this.get('/themes.json', params);
  }

  /**
   * İçeriği getirir
   */
  async getContent(params?: {
    limit?: number;
    page_info?: string;
    fields?: string;
    ids?: string;
    since_id?: number;
  }): Promise<ShopifyAPIResponse<{ content: any[] }>> {
    return this.get('/content.json', params);
  }

  /**
   * Hediye kartlarını getirir
   */
  async getGiftCards(params?: {
    limit?: number;
    page_info?: string;
    fields?: string;
    ids?: string;
    since_id?: number;
    status?: 'enabled' | 'disabled';
  }): Promise<ShopifyAPIResponse<{ gift_cards: any[] }>> {
    return this.get('/gift_cards.json', params);
  }

  /**
   * 3. taraf karşılama siparişlerini getirir
   */
  async getThirdPartyFulfillmentOrders(params?: {
    limit?: number;
    page_info?: string;
    fields?: string;
    ids?: string;
    since_id?: number;
  }): Promise<ShopifyAPIResponse<{ fulfillment_orders: any[] }>> {
    return this.get('/fulfillment_orders.json', params);
  }

  /**
   * Çevirileri getirir
   */
  async getTranslations(params?: {
    limit?: number;
    page_info?: string;
    fields?: string;
    ids?: string;
    since_id?: number;
  }): Promise<ShopifyAPIResponse<{ translations: any[] }>> {
    return this.get('/translations.json', params);
  }

  /**
   * Konumları getirir
   */
  async getLocations(params?: {
    limit?: number;
    page_info?: string;
    fields?: string;
    ids?: string;
    since_id?: number;
  }): Promise<ShopifyAPIResponse<{ locations: any[] }>> {
    return this.get('/locations.json', params);
  }

  /**
   * Pazarlama kampanyalarını getirir
   */
  async getMarketingCampaigns(params?: {
    limit?: number;
    page_info?: string;
    fields?: string;
    ids?: string;
    since_id?: number;
  }): Promise<ShopifyAPIResponse<{ marketing_campaigns: any[] }>> {
    return this.get('/marketing_campaigns.json', params);
  }

  /**
   * Pazarlama etkinliklerini getirir
   */
  async getMarketingEvents(params?: {
    limit?: number;
    page_info?: string;
    fields?: string;
    ids?: string;
    since_id?: number;
  }): Promise<ShopifyAPIResponse<{ marketing_events: any[] }>> {
    return this.get('/marketing_events.json', params);
  }

  /**
   * Pazarları getirir
   */
  async getMarkets(params?: {
    limit?: number;
    page_info?: string;
    fields?: string;
    ids?: string;
    since_id?: number;
  }): Promise<ShopifyAPIResponse<{ markets: any[] }>> {
    return this.get('/markets.json', params);
  }

  /**
   * Online mağaza navigasyonunu getirir
   */
  async getOnlineStoreNavigation(params?: {
    limit?: number;
    page_info?: string;
    fields?: string;
    ids?: string;
    since_id?: number;
  }): Promise<ShopifyAPIResponse<{ navigation: any[] }>> {
    return this.get('/online_store_navigation.json', params);
  }

  /**
   * Online mağaza sayfalarını getirir
   */
  async getOnlineStorePages(params?: {
    limit?: number;
    page_info?: string;
    fields?: string;
    ids?: string;
    since_id?: number;
  }): Promise<ShopifyAPIResponse<{ pages: any[] }>> {
    return this.get('/pages.json', params);
  }

  /**
   * İadeleri getirir
   */
  async getReturns(params?: {
    limit?: number;
    page_info?: string;
    fields?: string;
    ids?: string;
    since_id?: number;
  }): Promise<ShopifyAPIResponse<{ returns: any[] }>> {
    return this.get('/returns.json', params);
  }

  /**
   * Kargo oranlarını getirir
   */
  async getShippingRates(params?: {
    limit?: number;
    page_info?: string;
    fields?: string;
    ids?: string;
    since_id?: number;
  }): Promise<ShopifyAPIResponse<{ shipping_rates: any[] }>> {
    return this.get('/shipping_rates.json', params);
  }

  /**
   * Özel pixel'leri getirir
   */
  async getCustomPixels(params?: {
    limit?: number;
    page_info?: string;
    fields?: string;
    ids?: string;
    since_id?: number;
  }): Promise<ShopifyAPIResponse<{ custom_pixels: any[] }>> {
    return this.get('/custom_pixels.json', params);
  }

  /**
   * Müşteri veri silme taleplerini getirir
   */
  async getCustomerDataErasure(params?: {
    limit?: number;
    page_info?: string;
    fields?: string;
    ids?: string;
    since_id?: number;
  }): Promise<ShopifyAPIResponse<{ customer_data_erasure: any[] }>> {
    return this.get('/customer_data_erasure.json', params);
  }

  /**
   * Keşif API verilerini getirir
   */
  async getDiscovery(params?: {
    limit?: number;
    page_info?: string;
    fields?: string;
    ids?: string;
    since_id?: number;
  }): Promise<ShopifyAPIResponse<{ discovery: any[] }>> {
    return this.get('/discovery.json', params);
  }
}

/**
 * Shopify API Error sınıfı
 */
export class ShopifyAPIError extends Error {
  public status: number;
  public errors: any[];
  public required_scope?: string;

  constructor(status: number, message: string, errors: any[] = [], required_scope?: string) {
    super(message);
    this.name = 'ShopifyAPIError';
    this.status = status;
    this.errors = errors;
    if (required_scope) {
      this.required_scope = required_scope;
    }
  }
}

/**
 * Shopify API factory fonksiyonu
 */
export function createShopifyAPI(config: ShopifyAPIConfig): ShopifyAPI {
  return new ShopifyAPI(config);
}

/**
 * Global Shopify API instance (opsiyonel)
 */
let globalShopifyAPI: ShopifyAPI | null = null;

export function setGlobalShopifyAPI(config: ShopifyAPIConfig): void {
  globalShopifyAPI = new ShopifyAPI(config);
}

export function getGlobalShopifyAPI(): ShopifyAPI | null {
  return globalShopifyAPI;
}
