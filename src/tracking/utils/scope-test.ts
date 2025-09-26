/**
 * Scope Test Utilities
 * 
 * Scope'ları test etmek ve doğrulamak için yardımcı fonksiyonlar.
 */

import { ScopeManager } from './scope-manager';
import { ScopeErrorHandler } from './scope-error-handler';
import { createShopifyAPI, ShopifyAPIConfig } from './shopify-api';

export interface ScopeTestConfig {
  shopifyConfig: ShopifyAPIConfig;
  testScopes?: string[];
  verbose?: boolean;
}

export interface ScopeTestResult {
  scope: string;
  success: boolean;
  error?: string;
  responseTime?: number;
  statusCode?: number;
}

export class ScopeTester {
  private config: ScopeTestConfig;
  private shopifyAPI: ReturnType<typeof createShopifyAPI>;

  constructor(config: ScopeTestConfig) {
    this.config = config;
    this.shopifyAPI = createShopifyAPI(config.shopifyConfig);
  }

  /**
   * Belirli scope'ları test eder
   */
  async testScopes(scopes?: string[]): Promise<ScopeTestResult[]> {
    const scopesToTest = scopes || this.config.testScopes || ScopeManager.getCurrentScopes();
    const results: ScopeTestResult[] = [];

    for (const scope of scopesToTest) {
      const result = await this.testScope(scope);
      results.push(result);
      
      if (this.config.verbose) {
        console.log(`Testing scope: ${scope} - ${result.success ? '✅' : '❌'}`);
        if (result.error) {
          console.log(`  Error: ${result.error}`);
        }
        if (result.responseTime) {
          console.log(`  Response time: ${result.responseTime}ms`);
        }
      }
    }

    return results;
  }

  /**
   * Tek bir scope'u test eder
   */
  private async testScope(scope: string): Promise<ScopeTestResult> {
    const startTime = Date.now();
    
    try {
      // Scope'a göre uygun API endpoint'ini seç
      const endpoint = this.getEndpointForScope(scope);
      if (!endpoint) {
        return {
          scope,
          success: false,
          error: 'No endpoint found for scope'
        };
      }

      // API çağrısı yap
      const response = await this.shopifyAPI.get(endpoint, { limit: 1 });
      
      const responseTime = Date.now() - startTime;
      
      return {
        scope,
        success: true,
        responseTime,
        statusCode: response.status
      };

    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      // Scope error kontrolü
      if (ScopeErrorHandler.isScopeError(error)) {
        return {
          scope,
          success: false,
          error: `Scope error: ${error.message}`,
          responseTime,
          statusCode: error.status || 403
        };
      }

      return {
        scope,
        success: false,
        error: error.message || 'Unknown error',
        responseTime,
        statusCode: error.status || 500
      };
    }
  }

  /**
   * Scope'a göre uygun API endpoint'ini döndürür
   */
  private getEndpointForScope(scope: string): string | null {
    const endpointMap: Record<string, string> = {
      // Products
      'read_products': '/products.json',
      'write_products': '/products.json',
      
      // Orders
      'read_orders': '/orders.json',
      'write_orders': '/orders.json',
      
      // Customers
      'read_customers': '/customers.json',
      'write_customers': '/customers.json',
      
      // Analytics
      'read_analytics': '/analytics.json',
      'write_analytics': '/analytics.json',
      
      // Reports
      'read_reports': '/reports.json',
      'write_reports': '/reports.json',
      
      // Inventory
      'read_inventory': '/inventory_items.json',
      'write_inventory': '/inventory_items.json',
      
      // Files
      'read_files': '/files.json',
      'write_files': '/files.json',
      
      // Gift Cards
      'read_gift_cards': '/gift_cards.json',
      'write_gift_cards': '/gift_cards.json',
      
      // Themes
      'read_themes': '/themes.json',
      'write_themes': '/themes.json',
      
      // Content
      'read_content': '/content.json',
      'write_content': '/content.json',
      
      // Translations
      'read_translations': '/translations.json',
      'write_translations': '/translations.json',
      
      // Custom Pixels
      'read_custom_pixels': '/custom_pixels.json',
      'write_custom_pixels': '/custom_pixels.json',
      
      // Customer Data Erasure
      'read_customer_data_erasure': '/customer_data_erasure.json',
      'write_customer_data_erasure': '/customer_data_erasure.json',
      
      // Discovery
      'read_discovery': '/discovery.json',
      'write_discovery': '/discovery.json',
      
      // Locations
      'read_locations': '/locations.json',
      'write_locations': '/locations.json',
      
      // Marketing
      'read_marketing_integrated_campaigns': '/marketing_campaigns.json',
      'write_marketing_integrated_campaigns': '/marketing_campaigns.json',
      'read_marketing_events': '/marketing_events.json',
      'write_marketing_events': '/marketing_events.json',
      
      // Markets
      'read_markets': '/markets.json',
      'write_markets': '/markets.json',
      
      // Online Store
      'read_online_store_navigation': '/online_store_navigation.json',
      'write_online_store_navigation': '/online_store_navigation.json',
      'read_online_store_pages': '/pages.json',
      'write_online_store_pages': '/pages.json',
      
      // Returns
      'read_returns': '/returns.json',
      'write_returns': '/returns.json',
      
      // Shipping
      'read_shipping': '/shipping_rates.json',
      'write_shipping': '/shipping_rates.json',
      
      // Third Party Fulfillment
      'read_third_party_fulfillment_orders': '/fulfillment_orders.json',
      'write_third_party_fulfillment_orders': '/fulfillment_orders.json',
      
      // Storefront API (unauthenticated)
      'unauthenticated_read_product_listings': '/products.json',
      'unauthenticated_read_product_inventory': '/inventory_items.json',
      'unauthenticated_read_checkouts': '/checkouts.json',
      'unauthenticated_read_customers': '/customers.json',
      'unauthenticated_read_customer_tags': '/customer_tags.json',
      'unauthenticated_read_metaobjects': '/metaobjects.json',
      'unauthenticated_read_product_pickup_locations': '/product_pickup_locations.json',
      'unauthenticated_read_product_tags': '/product_tags.json',
      'unauthenticated_read_selling_plans': '/selling_plans.json',
      'unauthenticated_read_shop_pay_installments_pricing': '/shop_pay_installments_pricing.json',
      'unauthenticated_read_content': '/content.json',
      'unauthenticated_read_bulk_operations': '/bulk_operations.json',
      'unauthenticated_read_bundles': '/bundles.json',
      
      // Customer Account API
      'customer_read_customers': '/customers.json',
      'customer_read_orders': '/orders.json',
      'customer_read_companies': '/companies.json',
      'customer_read_draft_orders': '/draft_orders.json',
      'customer_read_markets': '/markets.json',
      'customer_read_store_credit_accounts': '/store_credit_accounts.json',
      'customer_read_store_credit_account_transactions': '/store_credit_account_transactions.json'
    };

    return endpointMap[scope] || null;
  }

  /**
   * Test sonuçlarını raporlar
   */
  generateReport(results: ScopeTestResult[]): {
    summary: {
      total: number;
      successful: number;
      failed: number;
      successRate: number;
    };
    successful: ScopeTestResult[];
    failed: ScopeTestResult[];
    recommendations: string[];
  } {
    const total = results.length;
    const successful = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    const successRate = total > 0 ? (successful.length / total) * 100 : 0;

    const recommendations: string[] = [];
    
    if (failed.length > 0) {
      const scopeErrors = failed.filter(r => r.error?.includes('Scope error'));
      if (scopeErrors.length > 0) {
        recommendations.push('Scope hataları tespit edildi. Lütfen uygulamayı güncelleyin.');
      }
      
      const permissionErrors = failed.filter(r => r.error?.includes('Permission denied') || r.error?.includes('Access denied'));
      if (permissionErrors.length > 0) {
        recommendations.push('İzin hataları tespit edildi. API anahtarlarınızı kontrol edin.');
      }
      
      const networkErrors = failed.filter(r => r.error?.includes('Network') || r.error?.includes('timeout'));
      if (networkErrors.length > 0) {
        recommendations.push('Ağ hataları tespit edildi. İnternet bağlantınızı kontrol edin.');
      }
    }

    return {
      summary: {
        total,
        successful: successful.length,
        failed: failed.length,
        successRate
      },
      successful,
      failed,
      recommendations
    };
  }

  /**
   * Test sonuçlarını konsola yazdırır
   */
  printReport(results: ScopeTestResult[]): void {
    const report = this.generateReport(results);
    
    console.log('\n🔍 Scope Test Raporu');
    console.log('==================');
    console.log(`Toplam: ${report.summary.total}`);
    console.log(`Başarılı: ${report.summary.successful} (${report.summary.successRate.toFixed(1)}%)`);
    console.log(`Başarısız: ${report.summary.failed}`);
    
    if (report.failed.length > 0) {
      console.log('\n❌ Başarısız Scope\'lar:');
      report.failed.forEach(result => {
        console.log(`  • ${result.scope}: ${result.error}`);
      });
    }
    
    if (report.recommendations.length > 0) {
      console.log('\n💡 Öneriler:');
      report.recommendations.forEach(rec => {
        console.log(`  • ${rec}`);
      });
    }
    
    console.log('\n');
  }
}

/**
 * Scope test fonksiyonu
 */
export async function testScopes(config: ScopeTestConfig): Promise<ScopeTestResult[]> {
  const tester = new ScopeTester(config);
  return tester.testScopes();
}

/**
 * Scope test raporu oluşturur
 */
export async function generateScopeReport(config: ScopeTestConfig): Promise<void> {
  const tester = new ScopeTester(config);
  const results = await tester.testScopes();
  tester.printReport(results);
}

/**
 * Scope'ları hızlıca test eder
 */
export async function quickScopeTest(shopifyConfig: ShopifyAPIConfig): Promise<boolean> {
  const tester = new ScopeTester({ shopifyConfig, verbose: false });
  const results = await tester.testScopes();
  
  const report = tester.generateReport(results);
  return report.summary.successRate >= 80; // %80 başarı oranı
}
