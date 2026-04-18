/**
 * FluKAI — Tracking de Campanhas (Traffic / Conversion campaigns)
 *
 * Funciona para campanhas que enviam o usuário para o site antes do WhatsApp:
 * Google Ads, Meta Ads objetivo Trafego/Conversao, etc.
 *
 * Para campanhas Click-to-WhatsApp (Meta objetivo Mensagens),
 * o tracking e feito pelo backend via objeto referral do webhook — nao precisa deste script.
 */

const FLUKAI_API = 'https://api.flukai.com.br/api/v1';
const WA_NUMBER   = '5519995943382';
const WA_MSG_BASE = 'Ola, vim pelo site e gostaria de uma demonstracao da Flukai';

// 1. Captura UTMs e registra na API
async function capturarTracking() {
  const params = new URLSearchParams(window.location.search);

  const temCampanha =
    params.get('utm_source') ||
    params.get('fbclid')     ||
    params.get('gclid')      ||
    params.get('ttclid');

  if (!temCampanha) return;

  const payload = {
    utm_source:       params.get('utm_source')   || '',
    utm_medium:       params.get('utm_medium')   || '',
    utm_campaign:     params.get('utm_campaign') || '',
    utm_content:      params.get('utm_content')  || '',
    utm_term:         params.get('utm_term')     || '',
    fbclid:           params.get('fbclid')       || '',
    gclid:            params.get('gclid')        || '',
    ttclid:           params.get('ttclid')       || '',
    referrer_url:     document.referrer          || '',
    landing_page_url: window.location.href       || '',
    device_type:      /Mobi|Android/i.test(navigator.userAgent) ? 'mobile' : 'desktop',
    browser:          navigator.userAgent        || '',
  };

  try {
    const resp = await fetch(FLUKAI_API + '/tracking/capture', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) return;

    const data = await resp.json();

    if (data.tracking_id) {
      sessionStorage.setItem('flukai_tracking_id', data.tracking_id);
      sessionStorage.setItem('flukai_utm_source',  payload.utm_source);
      atualizarBotoesWhatsApp();
    }
  } catch (e) {
    console.warn('[FluKAI tracking] Erro ao capturar:', e);
  }
}

// 2. Atualiza todos os links WhatsApp com o tracking_id
function atualizarBotoesWhatsApp() {
  var trackingId = sessionStorage.getItem('flukai_tracking_id');
  if (!trackingId) return;

  var mensagem   = WA_MSG_BASE + ' Tracking: ' + trackingId;
  var urlWhatsApp = 'https://wa.me/' + WA_NUMBER + '?text=' + encodeURIComponent(mensagem);

  document.querySelectorAll('a[href*="wa.me"]').forEach(function(btn) {
    btn.href = urlWhatsApp;
    btn.addEventListener('click', dispararEventos, { once: true });
  });
}

// 3. Dispara eventos de conversao no clique do botao WhatsApp
function dispararEventos() {
  // Meta Pixel — Lead event
  if (typeof fbq === 'function') {
    fbq('track', 'Lead', {
      content_name: sessionStorage.getItem('flukai_utm_source') || 'organico',
    });
  }

  // Google Ads — conversion event
  if (typeof gtag === 'function') {
    gtag('event', 'conversion', {
      send_to: 'AW-18099359402',
    });
  }
}

// 4. Inicializacao
document.addEventListener('DOMContentLoaded', function () {
  capturarTracking();

  // Aplica imediatamente se ja tiver tracking_id na sessao
  if (sessionStorage.getItem('flukai_tracking_id')) {
    atualizarBotoesWhatsApp();
  }
});
