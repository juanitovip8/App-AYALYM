/* ═══════════════════════════════════════════════════════
   AYALYM — Firebase / Firestore
   Persistencia de datos en la nube
   ═══════════════════════════════════════════════════════ */

const _FIREBASE_CFG = {
  apiKey:            "AIzaSyCPOysCjAn45mIYNX9L0ePrwIPOHRh56MM",
  authDomain:        "ayalym-app.firebaseapp.com",
  projectId:         "ayalym-app",
  storageBucket:     "ayalym-app.firebasestorage.app",
  messagingSenderId: "848723036056",
  appId:             "1:848723036056:web:9db6343868afe7f9838ded"
};

if (!firebase.apps.length) firebase.initializeApp(_FIREBASE_CFG);
const _db = firebase.firestore();

/* ── Helpers ──────────────────────────────────────────── */
function _col(n)  { return _db.collection(n); }
function _clone(x){ return JSON.parse(JSON.stringify(x)); }

async function _loadInto(colName, arr) {
  const snap = await _col(colName).get();
  if (snap.empty) return false;
  arr.length = 0;
  snap.docs.forEach(d => arr.push(d.data()));
  return true;
}

async function _seedArr(colName, arr, idField) {
  const batch = _db.batch();
  arr.forEach(function(item, i) {
    const id = (idField !== undefined && item[idField] !== undefined)
      ? String(item[idField]) : String(i);
    batch.set(_col(colName).doc(id), _clone(item));
  });
  await batch.commit();
}

/* ── LOAD ALL ─────────────────────────────────────────────
   1. Lee Firestore → variables JS globales.
   2. Si la colección está vacía → sube los datos de data.js
   ─────────────────────────────────────────────────────── */
async function loadAllData() {

  /* Preservar todayJobs (datos operativos en memoria) */
  var savedJobs = {};
  WORKERS.forEach(function(w){ savedJobs[w.id] = w.todayJobs || []; });

  /* 1. USERS */
  if (!(await _loadInto('usuarios', USERS))) {
    await _seedArr('usuarios', USERS, 'id');
  }

  /* 2. ZONAS */
  if (!(await _loadInto('zonas', ZONAS))) {
    await _seedArr('zonas', ZONAS, 'id');
  }

  /* 3. WORKERS (sin todayJobs — datos operativos) */
  if (!(await _loadInto('trabajadores', WORKERS))) {
    await _seedArr('trabajadores',
      WORKERS.map(function(w){ var c = _clone(w); delete c.todayJobs; return c; }),
      'id');
  }
  /* Restaurar todayJobs desde memoria */
  WORKERS.forEach(function(w){
    if (!w.todayJobs || !w.todayJobs.length) w.todayJobs = savedJobs[w.id] || [];
  });

  /* 4. CONFIG */
  var cfgSnap = await _col('config').doc('main').get();
  if (cfgSnap.exists) {
    var c = cfgSnap.data();
    if (c.SVC_TYPES)      { SVC_TYPES.length = 0;      c.SVC_TYPES.forEach(function(x){ SVC_TYPES.push(x); }); }
    if (c.CLEANING_TYPES) { CLEANING_TYPES.length = 0;  c.CLEANING_TYPES.forEach(function(x){ CLEANING_TYPES.push(x); }); }
    if (c.URGENCIAS)      { URGENCIAS.length = 0;        c.URGENCIAS.forEach(function(x){ URGENCIAS.push(x); }); }
    if (c.SVC_EXTRAS)     { SVC_EXTRAS.length = 0;       c.SVC_EXTRAS.forEach(function(x){ SVC_EXTRAS.push(x); }); }
    if (c.PRICES)         { Object.keys(c.PRICES).forEach(function(k){ PRICES[k] = c.PRICES[k]; }); }
    if (c.DIAS_FESTIVOS)  { DIAS_FESTIVOS.length = 0;   c.DIAS_FESTIVOS.forEach(function(x){ DIAS_FESTIVOS.push(x); }); }
  } else {
    await _col('config').doc('main').set({
      SVC_TYPES:      _clone(SVC_TYPES),
      CLEANING_TYPES: _clone(CLEANING_TYPES),
      URGENCIAS:      _clone(URGENCIAS),
      SVC_EXTRAS:     _clone(SVC_EXTRAS),
      PRICES:         _clone(PRICES),
      DIAS_FESTIVOS:  DIAS_FESTIVOS.slice()
    });
  }

  /* 5. CLIENTS_INM */
  if (!(await _loadInto('clientes_inm', CLIENTS_INM))) {
    await _seedArr('clientes_inm', CLIENTS_INM, 'id');
  }

  /* 6. PERSONAL_INM */
  if (!(await _loadInto('personal_inm', PERSONAL_INM))) {
    await _seedArr('personal_inm', PERSONAL_INM, 'id');
  }

  /* 7. PROPERTY_SERVICES */
  if (!(await _loadInto('servicios_prop', PROPERTY_SERVICES))) {
    await _seedArr('servicios_prop', PROPERTY_SERVICES, 'id');
  }

  /* 8. PROMOTIONS */
  var promoSnap = await _col('promociones').get();
  if (!promoSnap.empty) {
    PROMOTIONS.length = 0;
    promoSnap.docs.forEach(function(d){ PROMOTIONS.push(d.data()); });
  }
}

/* ══════════════════════════════════════════════════════
   FUNCIONES DE GUARDADO (fire-and-forget)
   Llama a estas funciones después de cada mutación.
   ══════════════════════════════════════════════════════ */

function fbSaveUsers() {
  try {
    var b = _db.batch();
    USERS.forEach(function(u){ b.set(_col('usuarios').doc(String(u.id)), _clone(u)); });
    b.commit().catch(function(e){ console.warn('fbSaveUsers', e); });
  } catch(e) { console.warn('fbSaveUsers', e); }
}

function fbSaveZonas() {
  try {
    var b = _db.batch();
    ZONAS.forEach(function(z){ b.set(_col('zonas').doc(z.id), _clone(z)); });
    b.commit().catch(function(e){ console.warn('fbSaveZonas', e); });
  } catch(e) { console.warn('fbSaveZonas', e); }
}

function fbSaveConfig() {
  try {
    _col('config').doc('main').set({
      SVC_TYPES:      _clone(SVC_TYPES),
      CLEANING_TYPES: _clone(CLEANING_TYPES),
      URGENCIAS:      _clone(URGENCIAS),
      SVC_EXTRAS:     _clone(SVC_EXTRAS),
      PRICES:         _clone(PRICES),
      DIAS_FESTIVOS:  DIAS_FESTIVOS.slice()
    }).catch(function(e){ console.warn('fbSaveConfig', e); });
  } catch(e) { console.warn('fbSaveConfig', e); }
}

function fbSaveWorkers() {
  try {
    var b = _db.batch();
    WORKERS.forEach(function(w){
      var d = _clone(w);
      delete d.todayJobs; /* datos operativos — no persisten */
      b.set(_col('trabajadores').doc(String(w.id)), d);
    });
    b.commit().catch(function(e){ console.warn('fbSaveWorkers', e); });
  } catch(e) { console.warn('fbSaveWorkers', e); }
}

function fbSaveClientsInm() {
  try {
    var b = _db.batch();
    CLIENTS_INM.forEach(function(c){ b.set(_col('clientes_inm').doc(String(c.id)), _clone(c)); });
    b.commit().catch(function(e){ console.warn('fbSaveClientsInm', e); });
  } catch(e) { console.warn('fbSaveClientsInm', e); }
}

function fbSavePersonalInm() {
  try {
    var b = _db.batch();
    PERSONAL_INM.forEach(function(p){ b.set(_col('personal_inm').doc(String(p.id)), _clone(p)); });
    b.commit().catch(function(e){ console.warn('fbSavePersonalInm', e); });
  } catch(e) { console.warn('fbSavePersonalInm', e); }
}

function fbSavePropertyServices() {
  try {
    var b = _db.batch();
    PROPERTY_SERVICES.forEach(function(ps){ b.set(_col('servicios_prop').doc(String(ps.id)), _clone(ps)); });
    b.commit().catch(function(e){ console.warn('fbSavePropertyServices', e); });
  } catch(e) { console.warn('fbSavePropertyServices', e); }
}

function fbSavePromotions() {
  try {
    _col('promociones').get().then(function(snap){
      var b = _db.batch();
      snap.docs.forEach(function(d){ b.delete(d.ref); });
      PROMOTIONS.forEach(function(p, i){
        b.set(_col('promociones').doc(String(p.id !== undefined ? p.id : i)), _clone(p));
      });
      b.commit().catch(function(e){ console.warn('fbSavePromotions batch', e); });
    }).catch(function(e){ console.warn('fbSavePromotions', e); });
  } catch(e) { console.warn('fbSavePromotions', e); }
}
