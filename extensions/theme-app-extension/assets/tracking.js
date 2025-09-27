/**
 * HRL Traffic Tracking - Ana Tracking Scripti
 * 
 * Bu dosya mağaza sayfalarına enjekte edilen ana tracking scriptidir.
 */

(function() {
  'use strict';
  
  console.log('🚀 HRL Tracking: Script yüklendi');
  
  // Global HRL Tracking namespace
  window.HRLTracking = {
    version: '1.0.0',
    isLoaded: function() { return true; },
    sessionId: null,
    userId: null,
    
    // Başlatma fonksiyonu
    init: function() {
      console.log('🎯 HRL Tracking: Başlatılıyor...');
      
      // Session ID oluştur
      this.sessionId = this.generateSessionId();
      this.userId = this.generateUserId();
      
      // Konfigürasyonu yükle
      this.loadConfig();
      
      // Sayfa görüntüleme eventi gönder
      this.trackPageView();
      
      // Heartbeat başlat
      this.startHeartbeat();
      
      console.log('✅ HRL Tracking: Başarıyla başlatıldı');
      console.log('📊 Session ID:', this.sessionId);
      console.log('👤 User ID:', this.userId);
    },
    
    // Konfigürasyon yükle
    loadConfig: function() {
      const script = document.querySelector('script[src^="/apps/"][src*="tracking.js"]');
      if (script) {
        const url = new URL(script.src);
        const baseUrl = url.origin + url.pathname.replace('/tracking.js', '');
        
        this.config = {
          baseUrl: baseUrl,
          endpoints: {
            collect: baseUrl + '/collect',
            config: baseUrl + '/config.json'
          },
          shop: window.Shopify?.shop || 'unknown',
          timestamp: Date.now()
        };
        
        console.log('📋 HRL Tracking: Konfigürasyon yüklendi', this.config);
      } else {
        console.warn('⚠️ HRL Tracking: App Proxy script bulunamadı');
      }
    },
    
    // Session ID oluştur
    generateSessionId: function() {
      let sessionId = localStorage.getItem('hrl_session_id');
      if (!sessionId) {
        sessionId = 'hrl_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('hrl_session_id', sessionId);
      }
      return sessionId;
    },
    
    // User ID oluştur
    generateUserId: function() {
      let userId = localStorage.getItem('hrl_user_id');
      if (!userId) {
        userId = 'usr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        localStorage.setItem('hrl_user_id', userId);
      }
      return userId;
    },
    
    // Sayfa görüntüleme takibi
    trackPageView: function() {
      const pageData = {
        type: 'page_view',
        url: window.location.href,
        title: document.title,
        timestamp: Date.now(),
        sessionId: this.sessionId,
        userId: this.userId,
        shop: window.Shopify?.shop || 'unknown'
      };
      
      console.log('📊 HRL Tracking Event:', pageData);
      
      // Sunucuya gönder (şimdilik sadece console'da göster)
      this.sendToServer(pageData);
    },
    
    // Sunucuya veri gönder
    sendToServer: function(data) {
      if (!this.config?.endpoints?.collect) {
        console.warn('⚠️ HRL Tracking: Collect endpoint bulunamadı');
        return;
      }
      
      console.log('📤 HRL Tracking: Veri gönderiliyor...', data);
      
      // Gerçek API endpoint'e gönder
      fetch(this.config.endpoints.collect, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      })
      .then(response => {
        if (!response.ok) {
          throw new Error('HTTP ' + response.status);
        }
        return response.json();
      })
      .then(result => {
        console.log('✅ HRL Tracking: Veri gönderildi', result);
      })
      .catch(error => {
        console.warn('⚠️ HRL Tracking: Veri gönderme hatası', error);
      });
    },
    
    // Heartbeat başlat
    startHeartbeat: function() {
      // Her 30 saniyede bir heartbeat gönder
      setInterval(() => {
        this.trackEvent('heartbeat');
      }, 30000);
    },
    
    // Event gönder
    trackEvent: function(eventType, data = {}) {
      const eventData = {
        type: eventType,
        timestamp: Date.now(),
        sessionId: this.sessionId,
        userId: this.userId,
        shop: window.Shopify?.shop || 'unknown',
        ...data
      };
      
      console.log('📊 HRL Tracking Event:', eventData);
      this.sendToServer(eventData);
    }
  };
  
  // Sayfa yüklendiğinde başlat
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      window.HRLTracking.init();
    });
  } else {
    window.HRLTracking.init();
  }
  
  // Global debug fonksiyonu
  window.getHRLTrackingDebug = function() {
    return {
      version: window.HRLTracking.version,
      sessionId: window.HRLTracking.sessionId,
      userId: window.HRLTracking.userId,
      isLoaded: window.HRLTracking.isLoaded()
    };
  };
  
  console.log('🎉 HRL Tracking: Script hazır!');
  
})();