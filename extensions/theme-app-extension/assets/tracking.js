/**
 * HRL Traffic Tracking - JavaScript Utilities
 * 
 * Bu dosya Theme App Extension için yardımcı JavaScript fonksiyonları içerir.
 * Ana tracking script'i inline olarak head içinde çalışır,
 * bu dosya ek özellikler ve debug araçları için hazır.
 */

(function() {
  'use strict';
  
  // Global HRL Tracking namespace
  window.HRLTrackingUtils = {
    
    // Debug panel oluştur
    createDebugPanel: function() {
      if (document.getElementById('hrl-debug-panel')) {
        return; // Zaten mevcut
      }
      
      const debugPanel = document.createElement('div');
      debugPanel.id = 'hrl-debug-panel';
      debugPanel.className = 'hrl-debug-panel';
      debugPanel.innerHTML = `
        <div class="debug-header">HRL Tracking Debug</div>
        <div class="debug-item">
          <span class="debug-label">Status:</span>
          <span class="debug-value" id="debug-status">Loading...</span>
        </div>
        <div class="debug-item">
          <span class="debug-label">Active Users:</span>
          <span class="debug-value" id="debug-users">-</span>
        </div>
        <div class="debug-item">
          <span class="debug-label">Sessions:</span>
          <span class="debug-value" id="debug-sessions">-</span>
        </div>
        <div class="debug-item">
          <span class="debug-label">Last Update:</span>
          <span class="debug-value" id="debug-update">-</span>
        </div>
      `;
      
      document.body.appendChild(debugPanel);
      
      // CSS dosyasını yükle
      this.loadCSS();
      
      // Debug panel'i göster
      setTimeout(() => {
        debugPanel.classList.add('show');
      }, 100);
    },
    
    // CSS dosyasını yükle
    loadCSS: function() {
      if (document.getElementById('hrl-tracking-css')) {
        return; // Zaten yüklü
      }
      
      const link = document.createElement('link');
      link.id = 'hrl-tracking-css';
      link.rel = 'stylesheet';
      link.href = '{{ "tracking.css" | asset_url }}';
      document.head.appendChild(link);
    },
    
    // Debug bilgilerini güncelle
    updateDebugInfo: function(data) {
      const statusEl = document.getElementById('debug-status');
      const usersEl = document.getElementById('debug-users');
      const sessionsEl = document.getElementById('debug-sessions');
      const updateEl = document.getElementById('debug-update');
      
      if (statusEl) statusEl.textContent = data.status || 'Unknown';
      if (usersEl) usersEl.textContent = data.activeUsers || 0;
      if (sessionsEl) sessionsEl.textContent = data.activeSessions || 0;
      if (updateEl) updateEl.textContent = new Date().toLocaleTimeString();
    },
    
    // Status widget oluştur
    createStatusWidget: function(status) {
      if (document.getElementById('hrl-status-widget')) {
        return; // Zaten mevcut
      }
      
      const widget = document.createElement('div');
      widget.id = 'hrl-status-widget';
      widget.className = 'hrl-tracking-widget';
      
      const statusClass = status === 'active' ? '' : status === 'error' ? 'error' : 'warning';
      const statusText = status === 'active' ? 'Tracking Active' : 
                        status === 'error' ? 'Tracking Error' : 'Tracking Inactive';
      
      widget.innerHTML = `
        <span class="status-dot ${statusClass}"></span>
        <span>HRL: ${statusText}</span>
      `;
      
      document.body.appendChild(widget);
      
      // CSS dosyasını yükle
      this.loadCSS();
      
      // Widget'ı göster
      setTimeout(() => {
        widget.classList.add('show');
      }, 500);
      
      // 5 saniye sonra gizle
      setTimeout(() => {
        widget.classList.remove('show');
        setTimeout(() => {
          if (widget.parentNode) {
            widget.parentNode.removeChild(widget);
          }
        }, 300);
      }, 5000);
    },
    
    // Keyboard shortcut'ları
    initKeyboardShortcuts: function() {
      document.addEventListener('keydown', function(e) {
        // Ctrl + Shift + H = Debug panel toggle
        if (e.ctrlKey && e.shiftKey && e.key === 'H') {
          e.preventDefault();
          const debugPanel = document.getElementById('hrl-debug-panel');
          if (debugPanel) {
            debugPanel.classList.toggle('show');
          } else {
            window.HRLTrackingUtils.createDebugPanel();
          }
        }
        
        // Ctrl + Shift + T = Status widget
        if (e.ctrlKey && e.shiftKey && e.key === 'T') {
          e.preventDefault();
          const status = window.HRLTracking && window.HRLTracking.isLoaded() ? 'active' : 'error';
          window.HRLTrackingUtils.createStatusWidget(status);
        }
      });
    }
  };
  
  // Sayfa yüklendiğinde keyboard shortcut'ları aktif et
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      window.HRLTrackingUtils.initKeyboardShortcuts();
    });
  } else {
    window.HRLTrackingUtils.initKeyboardShortcuts();
  }
  
  // Development modunda debug panel'i otomatik aç
  if (window.location.hostname === 'localhost' || window.location.hostname.includes('myshopify.com')) {
    setTimeout(() => {
      if (window.HRLTracking && !window.HRLTracking.isLoaded()) {
        window.HRLTrackingUtils.createDebugPanel();
      }
    }, 2000);
  }
  
})();
