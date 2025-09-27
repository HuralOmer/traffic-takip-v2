# HRL Traffic Tracking - Assets

Bu klasör Theme App Extension için gerekli statik dosyaları içerir.

## 📁 Dosya Yapısı

### `tracking.css`
- Theme App Extension için CSS stilleri
- Debug panel stilleri
- Status widget stilleri
- Responsive tasarım

### `tracking.js`
- Yardımcı JavaScript fonksiyonları
- Debug araçları
- Status widget'ları
- Keyboard shortcut'ları

## 🎯 Kullanım

### CSS Dosyası
```liquid
{{ 'tracking.css' | asset_url }}
```

### JavaScript Dosyası
```liquid
{{ 'tracking.js' | asset_url }}
```

## 🛠️ Debug Araçları

### Keyboard Shortcuts
- `Ctrl + Shift + H`: Debug panel aç/kapat
- `Ctrl + Shift + T`: Status widget göster

### Debug Panel
- Tracking durumu
- Aktif kullanıcı sayısı
- Oturum bilgileri
- Son güncelleme zamanı

### Status Widget
- Sağ alt köşede durum göstergesi
- 5 saniye görünür kalır
- Otomatik gizlenir

## 📱 Responsive Tasarım

- Desktop: Tam özellikler
- Mobile: Kompakt görünüm
- Tablet: Orta boyut optimizasyonu

## 🔧 Geliştirme

Assets dosyaları değiştirildiğinde:
1. Shopify CLI ile deploy edin
2. Mağazada test edin
3. Browser cache'i temizleyin

## 📋 Notlar

- CSS dosyası otomatik yüklenir
- JavaScript dosyası opsiyonel
- Debug araçları sadece development'ta aktif
- Production'da minimal footprint
