/* ============================================================
   site-config.js  —  Applies SITE_CONFIG to the landing page
   ============================================================ */

(function(){
  'use strict';

  // Default config (mirrors data.js SITE_CONFIG)
  var DEFAULTS = {
    hero: {
      eyebrow:    'Limpieza profesional',
      h1Intro:    '¡Espacios',
      h1Em:       'limpios,',
      h1Close:    'entornos felices!',
      priceLabel: 'Reserva desde',
      btnPrimary: '✨ Reserva tu limpieza',
      btnSecondary:'Ver servicios'
    },
    stats: {
      s1Num: '+500', s1Lbl: 'Servicios realizados',
      s2Num: '100%', s2Lbl: 'Satisfacción garantizada',
      s3Num: 'REPSE', s3Lbl: 'ACR15827 / 2025',
      s4Num: 'CDMX', s4Lbl: 'Área Metropolitana'
    },
    nosotros: {
      highlight: 'Empresa dedicada a la innovación y cuidado del medio ambiente, generando ambientes amigables con entornos limpios y elegantes.',
      p1: 'Brindamos la seguridad de que nuestros clientes y sus colaboradores se sientan como en casa al llegar a sus instalaciones, obteniendo su entera satisfacción con la calidad de nuestro servicio.',
      p2: 'Nuestro equipo de profesionales está comprometido con los más altos estándares de calidad, utilizando productos eco-amigables y tecnología de punta.'
    },
    values: [
      { icon:'🌿', title:'Sustentabilidad', desc:'Productos y procesos respetuosos con el medio ambiente.' },
      { icon:'⭐', title:'Excelencia',       desc:'Estándares de calidad en cada servicio que realizamos.' },
      { icon:'🤝', title:'Confianza',        desc:'Personal capacitado y certificado para tu tranquilidad.' },
      { icon:'⏱️', title:'Puntualidad',     desc:'Cumplimos con tiempos y compromisos establecidos.' }
    ],
    repse: {
      num:     'Aviso de registro REPSE',
      empresa: 'No. ACR15827/2025 — AYA LIMPIEZA Y MANTENIMIENTO S.A. DE C.V.'
    },
    contacto: {
      direccion: 'Prol. Paseo de la Reforma No. 799 Int. 1308, Col. Lomas de Santa Fe, Alcaldía Álvaro Obregón, C.P. 01219, CDMX.',
      horario:   'Lunes a Viernes: 8:00 — 18:00 hrs\nSábado: 9:00 — 14:00 hrs',
      whatsapp:  'https://wa.me/521XXXXXXXXXX'
    },
    social: [
      {emoji:'📘', label:'Facebook',  url:'https://www.facebook.com/ayalym23'},
      {emoji:'📷', label:'Instagram', url:'https://www.instagram.com/ayalym23'},
      {emoji:'🎵', label:'TikTok',    url:'https://www.tiktok.com/@ayalym23'}
    ]
  };

  function set(id, text){
    var el = document.getElementById(id);
    if(el && text !== undefined && text !== null) el.textContent = text;
  }
  function setHtml(id, html){
    var el = document.getElementById(id);
    if(el && html !== undefined && html !== null) el.innerHTML = html;
  }
  function setHref(id, url){
    var el = document.getElementById(id);
    if(el && url) el.href = url;
  }

  function applyConfig(cfg){
    if(!cfg) return;

    // Hero
    var h = cfg.hero || {};
    set('lp-hero-eyebrow',    h.eyebrow    || DEFAULTS.hero.eyebrow);
    set('lp-h1-intro',        h.h1Intro    || DEFAULTS.hero.h1Intro);
    set('lp-h1-em',           h.h1Em       || DEFAULTS.hero.h1Em);
    set('lp-h1-close',        h.h1Close    || DEFAULTS.hero.h1Close);
    set('lp-hero-price-label',h.priceLabel || DEFAULTS.hero.priceLabel);
    set('lp-btn-primary',     h.btnPrimary || DEFAULTS.hero.btnPrimary);
    set('lp-btn-secondary',   h.btnSecondary || DEFAULTS.hero.btnSecondary);

    // Stats
    var s = cfg.stats || {};
    set('lp-stat-1-num', s.s1Num || DEFAULTS.stats.s1Num);
    set('lp-stat-1-lbl', s.s1Lbl || DEFAULTS.stats.s1Lbl);
    set('lp-stat-2-num', s.s2Num || DEFAULTS.stats.s2Num);
    set('lp-stat-2-lbl', s.s2Lbl || DEFAULTS.stats.s2Lbl);
    set('lp-stat-3-num', s.s3Num || DEFAULTS.stats.s3Num);
    set('lp-stat-3-lbl', s.s3Lbl || DEFAULTS.stats.s3Lbl);
    set('lp-stat-4-num', s.s4Num || DEFAULTS.stats.s4Num);
    set('lp-stat-4-lbl', s.s4Lbl || DEFAULTS.stats.s4Lbl);

    // Nosotros
    var n = cfg.nosotros || {};
    set('lp-nosotros-highlight', n.highlight || DEFAULTS.nosotros.highlight);
    set('lp-nosotros-p1',        n.p1        || DEFAULTS.nosotros.p1);
    set('lp-nosotros-p2',        n.p2        || DEFAULTS.nosotros.p2);

    // Values (dynamic count — update existing elements, ignore extras beyond what HTML has)
    var vals = cfg.values || DEFAULTS.values;
    for(var i=0;i<vals.length;i++){
      var v = vals[i];
      if(!v) continue;
      // Elements lp-val-N-* use 1-based index for the first 4 (hardcoded in HTML)
      var n = i + 1;
      set('lp-val-'+n+'-icon',  v.icon);
      set('lp-val-'+n+'-title', v.title);
      set('lp-val-'+n+'-desc',  v.desc);
    }

    // REPSE
    var r = cfg.repse || {};
    set('lp-repse-num',     r.num     || DEFAULTS.repse.num);
    set('lp-repse-empresa', r.empresa || DEFAULTS.repse.empresa);

    // Contacto
    var c = cfg.contacto || {};
    if(c.direccion){
      var dEl = document.getElementById('lp-contacto-direccion');
      if(dEl) dEl.innerHTML = '<strong>Dirección</strong>' + c.direccion.replace(/\n/g,'<br>');
    }
    if(c.horario){
      var hEl = document.getElementById('lp-contacto-horario');
      if(hEl) hEl.innerHTML = '<strong>Horario de atención</strong>' + c.horario.replace(/\n/g,'<br>');
    }
    setHref('lp-contacto-whatsapp', c.whatsapp || DEFAULTS.contacto.whatsapp);

    // Social (array format — map known platforms, inject extras)
    var soArr = cfg.social;
    if(Array.isArray(soArr)){
      var platformMap = {facebook:'lp-social-fb', instagram:'lp-social-ig', tiktok:'lp-social-tiktok'};
      var extras = [];
      soArr.forEach(function(item){
        if(!item || !item.url) return;
        var lbl = (item.label || '').toLowerCase();
        var matched = false;
        Object.keys(platformMap).forEach(function(kw){
          if(lbl.indexOf(kw) !== -1){ setHref(platformMap[kw], item.url); matched = true; }
        });
        if(!matched) extras.push(item);
      });
      var extraEl = document.getElementById('lp-social-extra');
      if(extraEl){
        extraEl.innerHTML = extras.map(function(item){
          return '<a href="'+(item.url||'#')+'" class="social-link" target="_blank" rel="noopener" aria-label="'+(item.label||'')+'" title="'+(item.label||'')+'" style="font-size:20px;text-decoration:none;display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:50%;background:rgba(255,255,255,.1);">'+(item.emoji||'🔗')+'</a>';
        }).join('');
      }
    } else if(soArr && typeof soArr === 'object'){
      /* Legacy object format */
      setHref('lp-social-fb',    soArr.fb    || DEFAULTS.social[0].url);
      setHref('lp-social-ig',    soArr.ig    || DEFAULTS.social[1].url);
      setHref('lp-social-tiktok',soArr.tiktok|| DEFAULTS.social[2].url);
    }
  }

  // Load from localStorage and apply on DOMContentLoaded
  function init(){
    try {
      var raw = localStorage.getItem('ayalym-site-config');
      if(raw){
        var cfg = JSON.parse(raw);
        applyConfig(cfg);
      }
    } catch(e){}

    // Listen for admin changes in real time (cross-tab)
    window.addEventListener('storage', function(e){
      if(e.key === 'ayalym-site-config'){
        try { applyConfig(JSON.parse(e.newValue)); } catch(ex){}
      }
    });
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
