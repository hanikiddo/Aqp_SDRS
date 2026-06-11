// shared/ui.js
const defaultConfig = {
  main_title: 'Smart Delivery Record System (SDRS)',
  subtitle: '',
  background_color: '#FFFFFF',
  primary_color: '#0F2341',
  accent_color: '#2BA5B5',
  font_family: 'Plus Jakarta Sans',
  font_size: 16
};

function applyConfig(config) {
  const c = { ...defaultConfig, ...config };
  
  const mainTitleEl = document.getElementById('mainTitle');
  if (mainTitleEl) mainTitleEl.textContent = c.main_title;
  
  const subtitleEl = document.getElementById('subtitle');
  if (subtitleEl) subtitleEl.textContent = c.subtitle;

  const appEl = document.getElementById('app');
  if (appEl) {
      appEl.style.backgroundColor = c.background_color;
      
      const font = c.font_family || defaultConfig.font_family;
      appEl.style.fontFamily = `${font}, sans-serif`;
  }

  document.querySelectorAll('.text-navy').forEach(el => el.style.color = c.primary_color);

  const base = c.font_size || defaultConfig.font_size;
  if (mainTitleEl) mainTitleEl.style.fontSize = `${base * 2}px`;
  if (subtitleEl) subtitleEl.style.fontSize = `${base}px`;
}

if (window.elementSdk) {
  window.elementSdk.init({
    defaultConfig,
    onConfigChange: async (config) => applyConfig(config),
    mapToCapabilities: (config) => ({
      recolorables: [
        { get: () => config.background_color || defaultConfig.background_color, set: (v) => { config.background_color = v; window.elementSdk.setConfig({ background_color: v }); } },
        { get: () => config.primary_color || defaultConfig.primary_color, set: (v) => { config.primary_color = v; window.elementSdk.setConfig({ primary_color: v }); } },
        { get: () => config.accent_color || defaultConfig.accent_color, set: (v) => { config.accent_color = v; window.elementSdk.setConfig({ accent_color: v }); } }
      ],
      borderables: [],
      fontEditable: {
        get: () => config.font_family || defaultConfig.font_family,
        set: (v) => { config.font_family = v; window.elementSdk.setConfig({ font_family: v }); }
      },
      fontSizeable: {
        get: () => config.font_size || defaultConfig.font_size,
        set: (v) => { config.font_size = v; window.elementSdk.setConfig({ font_size: v }); }
      }
    }),
    mapToEditPanelValues: (config) => new Map([
      ['main_title', config.main_title || defaultConfig.main_title],
      ['subtitle', config.subtitle || defaultConfig.subtitle]
    ])
  });
}

// Add CSS animation for loader
document.addEventListener('DOMContentLoaded', () => {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `;
  document.head.appendChild(style);

  // Initialize icons
  if (window.lucide) {
      window.lucide.createIcons();
  }
});
