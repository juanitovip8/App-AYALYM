/* ═══════════════════════════════════════════════
   AYALYM — Landing Prices Sync
   Lee los precios guardados por el admin en la app
   y actualiza las tarjetas de la landing en tiempo real.
   ═══════════════════════════════════════════════ */
(function () {
  'use strict';

  /* Valores por defecto (igual que data.js) */
  var DEFAULTS = {
    depto:    { base: 500, hab: 120, bano: 80 },
    auto:     { sedan: 400, suv: 500, pickup: 620 },
    interior: 900,
    tap: {
      silla:   { unit: 100 },
      sofa:    { tela: 380, piel: 560, mixta: 450 },
      tapete:  { factor: 80 },
      alfombra:{ factor: 90 },
      colchon: { individual: 500, matrimonial: 650, kingsize: 750 }
    },
    cleaning: [
      { id: 'general',  factor: 1.0 },
      { id: 'fina',     factor: 1.2 },
      { id: 'profunda', factor: 1.4 }
    ],
    svcDesde: { depto: 500, auto: 400, tapiceria: 1200 }
  };

  /* Valores por defecto de visibilidad */
  var SVC_ACTIVO_DEFAULTS = { depto: true, auto: true, tapiceria: true };

  /* Carga precios guardados del localStorage (con fallback a defaults) */
  function loadPrices() {
    try {
      var raw = localStorage.getItem('ayalym-prices');
      if (raw) {
        var saved = JSON.parse(raw);
        /* Merge profundo para no perder campos no guardados */
        return {
          depto:    Object.assign({}, DEFAULTS.depto,    saved.depto    || {}),
          auto:     Object.assign({}, DEFAULTS.auto,     saved.auto     || {}),
          interior: (saved.interior != null) ? saved.interior : DEFAULTS.interior,
          tap: {
            silla:    Object.assign({}, DEFAULTS.tap.silla,    (saved.tap||{}).silla    || {}),
            sofa:     Object.assign({}, DEFAULTS.tap.sofa,     (saved.tap||{}).sofa     || {}),
            tapete:   Object.assign({}, DEFAULTS.tap.tapete,   (saved.tap||{}).tapete   || {}),
            alfombra: Object.assign({}, DEFAULTS.tap.alfombra, (saved.tap||{}).alfombra || {}),
            colchon:  Object.assign({}, DEFAULTS.tap.colchon,  (saved.tap||{}).colchon  || {}),
          },
          cleaning: saved.cleaning || DEFAULTS.cleaning,
          svcDesde: Object.assign({}, DEFAULTS.svcDesde, saved.svcDesde || {}),
          svcActivo: Object.assign({}, SVC_ACTIVO_DEFAULTS, saved.svcActivo || {})
        };
      }
    } catch (e) {}
    return Object.assign({}, DEFAULTS, { svcActivo: Object.assign({}, SVC_ACTIVO_DEFAULTS) });
  }

  /* Formatea número como precio MXN */
  function fmt(n) {
    var num = Number(n) || 0;
    return '$' + num.toLocaleString('es-MX');
  }

  /* Actualiza el texto de un elemento por ID (si existe) */
  function set(id, text) {
    var el = document.getElementById(id);
    if (el) el.textContent = text;
  }

  /* Obtiene el factor de un tipo de limpieza */
  function getFactor(cleaning, id, def) {
    if (!cleaning) return def;
    for (var i = 0; i < cleaning.length; i++) {
      if (cleaning[i].id === id) return cleaning[i].factor || def;
    }
    return def;
  }

  /* Renderiza todos los precios en la landing */
  function renderPrices() {
    var p = loadPrices();

    var finaFactor = getFactor(p.cleaning, 'fina',     1.2);
    var profFactor = getFactor(p.cleaning, 'profunda', 1.4);
    var deptoBase  = p.depto.base;
    var autoSedan  = p.auto.sedan;
    var tapDesde   = p.svcDesde.tapiceria;

    /* ── Hero ── */
    set('lp-hero-desde', fmt(deptoBase));

    /* ── Tarjeta 1: Departamento ── */
    set('lp-depto-desde',    fmt(deptoBase));
    set('lp-depto-general',  fmt(deptoBase));
    set('lp-depto-fina',     fmt(Math.round(deptoBase * finaFactor)));
    set('lp-depto-profunda', fmt(Math.round(deptoBase * profFactor)));
    set('lp-depto-hab',      '+' + fmt(p.depto.hab));
    set('lp-depto-bano',     '+' + fmt(p.depto.bano));
    /* Factores en la etiqueta */
    set('lp-fina-factor', finaFactor % 1 === 0 ? finaFactor.toFixed(1) : finaFactor);
    set('lp-prof-factor', profFactor % 1 === 0 ? profFactor.toFixed(1) : profFactor);

    /* ── Tarjeta 2: Auto ── */
    set('lp-auto-desde',   fmt(autoSedan));
    set('lp-auto-sedan',   fmt(p.auto.sedan));
    set('lp-auto-suv',     fmt(p.auto.suv));
    set('lp-auto-pickup',  fmt(p.auto.pickup));
    set('lp-auto-interior', '+' + fmt(p.interior));

    /* ── Tarjeta 3: Tapicería ── */
    set('lp-tap-desde',     fmt(tapDesde));
    set('lp-tap-silla',     fmt(p.tap.silla.unit));
    set('lp-tap-sofa-tela', fmt(p.tap.sofa.tela));
    set('lp-tap-sofa-piel', fmt(p.tap.sofa.piel));
    set('lp-tap-colchon',   fmt(p.tap.colchon.individual));
    set('lp-tap-tapete',    fmt(p.tap.tapete.factor) + '/m²');

    /* ── Visibilidad de tarjetas según configuración del admin ── */
    var activo = p.svcActivo || SVC_ACTIVO_DEFAULTS;
    var keys = ['depto', 'auto', 'tapiceria'];
    var allOff = true;
    keys.forEach(function(key) {
      var card = document.getElementById('lp-card-' + key);
      var visible = activo[key] !== false;
      if (visible) allOff = false;
      if (card) card.style.display = visible ? '' : 'none';
      /* Limpiar el <style> de flash-prevention si existe */
      var flashStyle = document.getElementById('lp-hide-' + key);
      if (flashStyle) flashStyle.parentNode.removeChild(flashStyle);
    });
    /* Mostrar / ocultar la sección completa */
    var section = document.getElementById('servicios');
    if (section) section.style.display = allOff ? 'none' : '';
    var hideAll = document.getElementById('lp-hide-servicios');
    if (hideAll) hideAll.parentNode.removeChild(hideAll);
  }

  /* Ejecutar cuando el DOM esté listo */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', renderPrices);
  } else {
    renderPrices();
  }

  /* Escuchar cambios de precios desde otra pestaña (admin en index.html) */
  window.addEventListener('storage', function (e) {
    if (e.key === 'ayalym-prices') renderPrices();
  });

})();
