# Scope Error Handling System

Bu klasör, Shopify API scope hatalarını tespit etmek ve yönetmek için gerekli utility'leri içerir.

## Dosyalar

### 1. `scope-error-handler.ts`
Scope hatalarını tespit eder ve kullanıcıya bildirim gösterir.

**Özellikler:**
- Scope hata tespiti
- Kullanıcı bildirimleri (toast notifications)
- Server-side logging
- Scope güncelleme önerileri

**Kullanım:**
```typescript
import { ScopeErrorHandler } from './scope-error-handler';

// Scope hatası kontrolü
if (ScopeErrorHandler.isScopeError(error)) {
  ScopeErrorHandler.handleScopeError(error, context);
}
```

### 2. `scope-manager.ts`
Uygulama scope'larını yönetir ve kontrol eder.

**Özellikler:**
- Scope durumu kontrolü
- Eksik scope tespiti
- Scope önerileri
- Kategori bazlı scope yönetimi

**Kullanım:**
```typescript
import { ScopeManager } from './scope-manager';

// Scope'ları ayarla
ScopeManager.setCurrentScopes(['read_products', 'read_orders']);

// Scope kontrolü
const result = ScopeManager.checkRequiredScopes();
if (result.hasError) {
  console.log('Eksik scope\'lar:', result.missingScopes);
}
```

### 3. `shopify-api.ts`
Shopify API çağrılarını yönetir ve scope hatalarını otomatik yakalar.

**Özellikler:**
- Otomatik scope hata tespiti
- HTTP error handling
- Convenience methods
- Type-safe API calls

**Kullanım:**
```typescript
import { createShopifyAPI } from './shopify-api';

const api = createShopifyAPI({
  accessToken: 'your-token',
  shop: 'your-shop.myshopify.com'
});

// API çağrısı (scope hataları otomatik yakalanır)
const products = await api.getProducts();
```

### 4. `scope-test.ts`
Scope'ları test etmek için yardımcı fonksiyonlar.

**Özellikler:**
- Scope test fonksiyonları
- Test raporları
- Hızlı scope kontrolü

**Kullanım:**
```typescript
import { testScopes, generateScopeReport } from './scope-test';

// Scope'ları test et
const results = await testScopes({
  shopifyConfig: {
    accessToken: 'your-token',
    shop: 'your-shop.myshopify.com'
  }
});

// Rapor oluştur
await generateScopeReport(config);
```

## Entegrasyon

### 1. Server-side (index.ts)
```typescript
// Error handler'a scope kontrolü eklendi
fastify.setErrorHandler(async (error, request, reply) => {
  if (error.status === 403) {
    const { ScopeErrorHandler } = await import('./tracking/utils/scope-error-handler');
    
    if (ScopeErrorHandler.isScopeError(error)) {
      ScopeErrorHandler.handleScopeError(error, context);
      reply.status(403).send({
        error: 'Scope error',
        message: 'Bu özellik için ek izin gerekli'
      });
      return;
    }
  }
  // ... diğer error handling
});
```

### 2. Client-side (tracking.liquid)
```javascript
// Global error handler
window.addEventListener('unhandledrejection', (event) => {
  if (ScopeErrorHandler.isScopeError(event.reason)) {
    ScopeErrorHandler.handleScopeError(event.reason);
    event.preventDefault();
  }
});
```

### 3. Constants güncellemesi
```typescript
// ERROR_MESSAGES'a scope error mesajları eklendi
export const ERROR_MESSAGES = {
  // ... mevcut mesajlar
  INSUFFICIENT_SCOPE: 'Insufficient scope',
  SCOPE_REQUIRED: 'Scope required',
  SCOPE_ERROR: 'Scope error',
  PERMISSION_DENIED: 'Permission denied',
  ACCESS_DENIED: 'Access denied',
} as const;
```

## Özellikler

### ✅ Scope Hata Tespiti
- HTTP 403 status code kontrolü
- Error message pattern matching
- Response body analizi

### ✅ Kullanıcı Bildirimleri
- Toast notifications
- Scope güncelleme önerileri
- Partner Dashboard yönlendirmesi

### ✅ Server-side Logging
- Detaylı error logging
- Context bilgileri
- Timestamp tracking

### ✅ Scope Yönetimi
- Mevcut scope kontrolü
- Eksik scope tespiti
- Kategori bazlı yönetim

### ✅ API Wrapper
- Otomatik error handling
- Type-safe calls
- Convenience methods

### ✅ Test Utilities
- Scope test fonksiyonları
- Test raporları
- Hızlı kontrol

## Kullanım Örnekleri

### 1. Temel Scope Kontrolü
```typescript
import { ScopeManager } from './scope-manager';

// Scope'ları yükle
ScopeManager.loadScopesFromStorage();

// Kontrol et
const result = ScopeManager.checkRequiredScopes();
if (result.hasError) {
  console.log('Eksik scope\'lar:', result.missingScopes);
  console.log('Öneriler:', result.recommendations);
}
```

### 2. API Çağrısı
```typescript
import { createShopifyAPI } from './shopify-api';

const api = createShopifyAPI({
  accessToken: 'your-token',
  shop: 'your-shop.myshopify.com'
});

try {
  const products = await api.getProducts();
  console.log('Ürünler:', products.data);
} catch (error) {
  // Scope hataları otomatik olarak yakalanır ve işlenir
  console.error('API hatası:', error.message);
}
```

### 3. Scope Test
```typescript
import { testScopes } from './scope-test';

const results = await testScopes({
  shopifyConfig: {
    accessToken: 'your-token',
    shop: 'your-shop.myshopify.com'
  },
  testScopes: ['read_products', 'read_orders'],
  verbose: true
});

console.log('Test sonuçları:', results);
```

## Geliştirme Notları

1. **Type Safety**: Tüm fonksiyonlar TypeScript ile yazılmıştır
2. **Error Handling**: Kapsamlı error handling ve logging
3. **User Experience**: Kullanıcı dostu bildirimler
4. **Performance**: Minimal overhead ile hızlı çalışma
5. **Maintainability**: Modüler yapı ve temiz kod

## Gelecek Geliştirmeler

- [ ] Scope cache mekanizması
- [ ] Otomatik scope güncelleme
- [ ] Daha detaylı test raporları
- [ ] Scope analytics dashboard
- [ ] Bulk scope operations
