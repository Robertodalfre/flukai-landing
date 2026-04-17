/**
 * FluKAI — Tracking de Campanhas
 * Captura UTMs da URL, chama a API de tracking e embute o tracking_id
 * no botão WhatsApp para rastrear a origem do lead.
 */

const FLUKAI_API = 'https://api.flukai.com.br';
const WA_NUMBER  = '5519995943382';
const WA_MSG_BASE = 'Olá, vim pelo site e gostaria de uma demonstração da Flukai';

// ─── 1. Captura UTMs e registra na API ───────────────────────────────────────

async function capturarTracking() {
  const params = new URLSearchParams(window.location.search);

  // Só rastreia se vier de campanha (utm_source, fbclid ou gclid presentes)
  const temCampanha = params.get('utm_source') || params.get('fbclid') || params.get('gclid') || params.get('ttclid');
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
    const resp = await fetch(`${FLUKAI_API}/tracking/capture`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!resp.ok) return;

    const data = await resp.json();

    if (data.tracking_id) {
      sessionStorage.setItem('flukai_tracking_id', data.tracking_id);
      sessionStorage.setItem('flukai_utm_source', payload.utm_source);
      atualizarBotoesWhatsApp();
    }
  } catch (e) {
    // Silencia erros para não afetar a UX
    console.warn('[FluKAI tracking] Erro ao capturar:', e);
  }
}

// ─── 2. Atualiza todos os botões WhatsApp com o tracking_id ──────────────────

function atualizarBotoesWhatsApp() {
  const trackingId = sessionStorage.getItem('flukai_tracking_id');
  if (!trackingId) return;

  const mensagem = `${WA_MSG_BASE} Tracking: ${trackingId}`;
  const urlWhatsApp = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(mensagem)}`;

  // Atualiza todos os links WhatsApp da página
  document.querySelectorAll('a[href*="wa.me"]').forEach(function(btn) {
    btn.href = urlWhatsApp;

    // Adiciona evento de clique para disparar pixel
    btn.addEventListener('click', dispararPixelLead, { once: true });
  });
}

// ─── 3. Dispara evento Lead no Meta Pixel ────────────────────────────────────

function dispararPixelLead() {
  if (typeof fbq === 'function') {
    fbq('track', 'Lead', {
      content_name: sessionStorage.getItem('flukai_utm_source') || 'organico',
    });
  }
}

// ─── 4. Inicialização ────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', function () {
  capturarTracking();

  // Se já tiver tracking_id salvo na sessão (usuário voltou à página), aplica imediatamente
  if (sessionStorage.getItem('flukai_tracking_id')) {
    atualizarBotoesWhatsApp();
  }
});
