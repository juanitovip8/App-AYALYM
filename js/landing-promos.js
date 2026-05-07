/* ═══════════════════════════════════════════════
   AYALYM — Landing Promos Sync
   Lee las promociones activas guardadas por el admin
   y las muestra en el scroll horizontal de la landing.
   ═══════════════════════════════════════════════ */
(function () {
  'use strict';

  var TIPO_META = {
    descuento: { label: 'Descuento',    bg: 'rgba(26,86,219,.22)',   col: '#7ec8f5' },
    codigo:    { label: 'Código promo', bg: 'rgba(22,163,74,.20)',   col: '#4ade80' },
    referido:  { label: 'Referido',     bg: 'rgba(114,9,183,.20)',   col: '#c084fc' },
    campana:   { label: 'Campaña',      bg: 'rgba(194,65,12,.22)',   col: '#fb923c' },
  };

  var CAMPANA_LABELS = {
    buen_fin: 'Buen Fin 🛍️',
    hot_sale: 'Hot Sale 🔥',
    navidad:  'Navidad 🎄',
    madres:   'Día de las Madres 💐',
    verano:   'Verano ☀️',
    custom:   'Campaña especial',
  };

  function loadPromos() {
    try {
      var raw = localStorage.getItem('ayalym-promos');
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return [];
  }

  function fmtDate(d) {
    if (!d) return '';
    return new Date(d + 'T12:00:00').toLocaleDateString('es-MX', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  }

  function buildCard(p) {
    var color  = p.color  || '#1A56DB';
    var emoji  = p.emoji  || '🎉';
    var nombre = p.nombre || '';

    var pctHtml  = '';
    var codeHtml = '';

    if ((p.tipo === 'descuento' || p.tipo === 'campana') && p.descuento) {
      pctHtml = '<span class="psc-pct" style="color:' + color + ';">'
              + p.descuento + '%</span>';
    }

    if ((p.tipo === 'codigo' || p.tipo === 'referido') && p.codigo) {
      codeHtml = '<span class="psc-code" style="color:' + color
               + ';border-color:' + color + '55;background:' + color + '18;">'
               + p.codigo + '</span>';
    }

    var extra = pctHtml || codeHtml
      ? '<span class="psc-sep">·</span>' + pctHtml + codeHtml
      : '';

    return '<a class="promo-scroll-card" href="index.html" style="border-color:' + color + '40;">'
         +   '<div class="psc-glow" style="background:' + color + ';"></div>'
         +   '<span class="psc-emoji">' + emoji + '</span>'
         +   '<span class="psc-nombre">' + nombre + '</span>'
         +   extra
         + '</a>';
  }

  function renderPromos() {
    var section = document.getElementById('promos-scroll-section');
    var track   = document.getElementById('promos-track');
    var countEl = document.getElementById('ps-count');
    if (!section || !track) return;

    var promos = loadPromos();

    /* Filtrar por fechas (si tienen) */
    var hoy = new Date().toISOString().split('T')[0];
    promos = promos.filter(function (p) {
      if (p.fechaFin  && p.fechaFin  < hoy) return false;
      if (p.fechaInicio && p.fechaInicio > hoy) return false;
      return true;
    });

    if (!promos.length) {
      section.style.display = 'none';
      return;
    }

    section.style.display = 'block';
    if (countEl) {
      countEl.textContent = promos.length + ' oferta' + (promos.length !== 1 ? 's' : '');
    }

    /* Duplicar las tarjetas para el efecto de scroll infinito */
    var cards = promos.map(buildCard).join('');
    track.innerHTML = cards + cards; /* doble para el loop */

    /* Ajustar velocidad según cantidad de tarjetas */
    var duration = Math.max(20, promos.length * 8);
    track.style.animationDuration = duration + 's';
  }

  /* Ejecutar al cargar */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderPromos);
  } else {
    renderPromos();
  }

  /* Cross-tab sync: cuando el admin guarda promos en otra pestaña */
  window.addEventListener('storage', function (e) {
    if (e.key === 'ayalym-promos') renderPromos();
  });

})();
