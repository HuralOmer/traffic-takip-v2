# HRL Traffic Tracking - Theme App Extension

Bu Theme App Extension, Shopify mağazalarına gelişmiş trafik takip özelliklerini ekler.

## 🚀 Özellikler

- **Gerçek Zamanlı Kullanıcı Takibi**: Aktif kullanıcı sayısını anlık olarak takip eder
- **Sayfa Analitikleri**: Sayfa görüntüleme, süre ve bounce rate analizi
- **Oturum Takibi**: Kullanıcı oturumlarını detaylı olarak izler
- **Performans Metrikleri**: Sayfa yükleme süreleri ve performans verileri
- **E-ticaret Olayları**: Satın alma, sepete ekleme gibi e-ticaret olayları

## 📁 Dosya Yapısı

```
theme-app-extension/
├── shopify.extension.toml    # Extension konfigürasyonu
├── blocks/
│   ├── tracking.liquid       # Ana tracking script
│   └── tracking.schema.json  # Block ayarları
└── README.md                 # Bu dosya
```

## ⚙️ Kurulum

1. **Theme App Extension'ı Etkinleştir**:
   - Shopify Admin → Apps → HRL Traffic Tracking
   - "Add to theme" butonuna tıkla
   - Tracking block'ını tema editöründe aktif et

2. **App Proxy Ayarları**:
   - App Proxy subpath: `hrl-proxy` (varsayılan)
   - Bu değer değiştirilmemelidir

3. **Tracking Ayarları**:
   - **Trafik Takibini Etkinleştir**: ✅ (varsayılan)
   - **Debug Modu**: ❌ (production'da kapalı)
   - **Script Versiyonu**: 1 (otomatik güncellenir)

## 🔧 Kullanım

### Otomatik Kurulum
Extension eklendikten sonra otomatik olarak çalışmaya başlar. Herhangi bir ek konfigürasyon gerekmez.

### Manuel Kontrol
```javascript
// Tracking durumunu kontrol et
if (window.HRLTracking) {
  console.log('Tracking aktif:', window.HRLTracking.initialized);
}

// Manuel başlatma (gerekirse)
window.HRLTracking.init();
```

### Debug Modu
Debug modu aktif edildiğinde console'da detaylı bilgiler görünür:
- Script URL'i
- Shop bilgileri
- Konfigürasyon ayarları
- Hata mesajları

## 📊 Veri Toplama

Extension aşağıdaki verileri toplar:

### Kullanıcı Verileri
- Visitor ID (localStorage'da saklanır)
- Session ID (her oturum için benzersiz)
- Sayfa yolu ve başlığı
- Referrer bilgisi

### Zaman Verileri
- Sayfa yükleme zamanı
- Sayfa görüntüleme süresi
- Heartbeat interval'ları
- Oturum süresi

### Teknik Veriler
- User Agent
- Ekran çözünürlüğü
- Dil ayarları
- Timezone

## 🔒 Gizlilik

- **GDPR Uyumlu**: Kullanıcı onayı alınır
- **Veri Minimizasyonu**: Sadece gerekli veriler toplanır
- **Güvenli İletişim**: HTTPS üzerinden veri gönderimi
- **Veri Saklama**: Sınırlı süre için saklanır

## 🛠️ Geliştirici Notları

### Cache Busting
Script versiyonu değiştirilerek cache kırılabilir:
```liquid
?v={{ script_version }}
```

### Feature Flags
Sunucu tarafından feature flags ile modüller kontrol edilir:
```javascript
if (CONFIG.features.activeUsers) {
  // Active Users modülü aktif
}
```

### Error Handling
Tüm hatalar yakalanır ve console'a yazılır:
```javascript
.catch(err => console.warn('Tracking failed:', err));
```

## 📞 Destek

Sorunlar için:
- GitHub Issues
- Email: support@hrl-tracking.com
- Documentation: https://docs.hrl-tracking.com

## 📄 Lisans

MIT License - Detaylar için LICENSE dosyasına bakın.
