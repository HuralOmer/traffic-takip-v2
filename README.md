# Shopify Tracking App

Gelişmiş Shopify mağaza analitik uygulaması. Gerçek zamanlı kullanıcı takibi, e-ticaret analizi ve performans izleme özellikleri sunar.

## 🚀 Özellikler

### Temel Özellikler
- **Gerçek Zamanlı Aktif Kullanıcı Takibi** - EMA algoritması ile
- **Oturum Yönetimi** - Offline → Online geçiş mantığı
- **Sayfa Analitikleri** - Görüntülenme, süre, scroll depth
- **E-ticaret Hunisi** - Ürün görüntüleme → Satış takibi
- **Performans İzleme** - Core Web Vitals, hata takibi
- **Kullanıcı Davranış Analizi** - Scroll, click, heatmap
- **Cihaz Zekası** - Browser, OS, çözünürlük analizi
- **Coğrafi Analiz** - Ülke, şehir, zaman dilimi
- **Meta Conversions API** - Facebook/Instagram entegrasyonu

### Teknik Özellikler
- **1st Party Cookie Stratejisi** - Ad-blocker bypass
- **Modüler Mimari** - Event bazlı klasör yapısı
- **Real-time Updates** - Server-Sent Events (SSE)
- **Rate Limiting** - IP + Shop bazlı
- **PII Güvenliği** - Hash'leme ve sanitizasyon
- **Horizontal Scaling** - Redis cluster desteği

## 🏗️ Mimari

```
src/
├── app/                    # Shopify App entegrasyonu
├── tracking/              # Tracking modülleri
│   ├── active-users/      # Aktif kullanıcı takibi
│   ├── sessions/          # Oturum yönetimi
│   ├── page-analytics/    # Sayfa analitikleri
│   ├── ecommerce/         # E-ticaret takibi
│   ├── user-behavior/     # Kullanıcı davranışı
│   ├── device-intel/      # Cihaz zekası
│   ├── geo-time/          # Coğrafi ve zaman
│   ├── performance/       # Performans izleme
│   ├── meta-capi/         # Meta Conversions API
│   ├── core/              # Temel tracking
│   ├── utils/             # Yardımcı fonksiyonlar
│   └── consent/           # Rıza yönetimi
├── types/                 # TypeScript tipleri
├── migrations/            # Veritabanı migrasyonları
└── jobs/                  # Background işler
```

## 🛠️ Kurulum

### Gereksinimler
- Node.js 18+
- Supabase hesabı
- Upstash Redis hesabı
- Railway hesabı (deployment için)

### 1. Projeyi klonlayın
```bash
git clone <repository-url>
cd shopify-tracking-app
```

### 2. Bağımlılıkları yükleyin
```bash
npm install
```

### 3. Environment variables
```bash
cp env.example .env
```

`.env` dosyasını düzenleyin:
```env
# Server Configuration
NODE_ENV=development
PORT=3000

# Shopify App Configuration
SHOPIFY_API_KEY=your_shopify_api_key
SHOPIFY_API_SECRET=your_shopify_api_secret
SHOPIFY_APP_URL=https://your-app.railway.app

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Upstash Redis Configuration
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_redis_token
```

### 4. Veritabanı migrasyonları
```bash
npm run migrate
```

### 5. Geliştirme sunucusunu başlatın
```bash
npm run dev
```

## 📊 Veri Modeli

### Temel Tablolar
- `active_users_minutely` - Dakikalık aktif kullanıcı verisi
- `sessions` - Oturum kayıtları
- `page_views` - Sayfa görüntüleme verisi
- `product_view_events` - Ürün görüntüleme olayları
- `add_to_cart_events` - Sepete ekleme olayları
- `order_completed_events` - Sipariş tamamlama olayları

### Özet Tablolar
- `page_daily_analytics` - Günlük sayfa analitikleri
- `shop_daily_metrics` - Günlük mağaza metrikleri
- `product_daily_metrics` - Günlük ürün metrikleri
- `device_daily_metrics` - Günlük cihaz metrikleri

## 🔌 API Endpoints

### Tracking Endpoints
- `POST /presence/beat` - Heartbeat gönderimi
- `POST /presence/bye` - Oturum sonlandırma
- `GET /presence/stream` - Real-time updates (SSE)
- `POST /collect/page_view` - Sayfa görüntüleme
- `POST /collect/page_close` - Sayfa kapatma

### Analytics Endpoints
- `GET /api/analytics/daily` - Günlük analitikler
- `GET /api/analytics/active-users` - Aktif kullanıcı sayısı
- `GET /api/analytics/page/:path` - Sayfa analizi

### Health & Metrics
- `GET /health` - Sağlık kontrolü
- `GET /metrics` - Performans metrikleri

## 🚀 Deployment

### Railway ile Deployment
1. Railway hesabınıza giriş yapın
2. Yeni proje oluşturun
3. GitHub repository'nizi bağlayın
4. Environment variables'ları ekleyin
5. Deploy edin

### Environment Variables (Production)
```env
NODE_ENV=production
SHOPIFY_API_KEY=your_production_api_key
SHOPIFY_API_SECRET=your_production_api_secret
SUPABASE_URL=your_production_supabase_url
SUPABASE_SERVICE_ROLE_KEY=your_production_service_key
UPSTASH_REDIS_REST_URL=your_production_redis_url
UPSTASH_REDIS_REST_TOKEN=your_production_redis_token
```

## 📈 Monitoring

### Health Check
```bash
curl https://your-app.railway.app/health
```

### Metrics
```bash
curl https://your-app.railway.app/metrics
```

### Logs
Railway dashboard'dan real-time logları görüntüleyebilirsiniz.

## 🔒 Güvenlik

- **Rate Limiting** - IP ve shop bazlı sınırlama
- **PII Güvenliği** - Hassas veriler hash'lenir
- **RLS** - Row Level Security ile veri izolasyonu
- **HMAC** - Webhook doğrulama
- **CORS** - Cross-origin güvenlik

## 🧪 Test

```bash
# Unit testler
npm test

# Linting
npm run lint

# Type checking
npm run build
```

## 📝 Geliştirme

### Yeni Modül Ekleme
1. `src/tracking/` altında yeni klasör oluşturun
2. `index.ts`, `types.ts`, `constants.ts` dosyalarını ekleyin
3. API endpoints'leri `src/index.ts`'e ekleyin
4. Veritabanı tablolarını `src/migrations/`'a ekleyin

### Code Style
- ESLint ve Prettier kullanın
- TypeScript strict mode
- Comprehensive error handling
- Detailed logging

## 🤝 Katkıda Bulunma

1. Fork yapın
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit yapın (`git commit -m 'Add amazing feature'`)
4. Push yapın (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

## 📄 Lisans

Bu proje MIT lisansı altında lisanslanmıştır.

## 🆘 Destek

Sorularınız için:
- GitHub Issues
- Email: support@tracking-app.com
- Documentation: [docs.tracking-app.com](https://docs.tracking-app.com)

## 🔄 Changelog

### v1.0.0
- İlk sürüm
- Temel tracking özellikleri
- Real-time aktif kullanıcı takibi
- E-ticaret hunisi analizi
- Performance monitoring
