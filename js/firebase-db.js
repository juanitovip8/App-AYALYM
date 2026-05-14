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
/* ── Elimina todos los documentos de una colección ─── */
async function _purgeCol(colName) {
  var snap = await _col(colName).get();
  if (snap.empty) return;
  var b = _db.batch();
  snap.docs.forEach(function(d){ b.delete(d.ref); });
  await b.commit();
}

async function loadAllData() {

  /* ── Detectar cambio de versión → forzar reseed completo ──
     Usamos Firestore (config/version) en lugar de localStorage para que
     sea universal entre dispositivos y navegadores. ── */
  var _verSnap = await _col('config').doc('version').get();
  var storedVer = _verSnap.exists ? (_verSnap.data().v || 0) : 0;
  var forceReseed = (typeof DATA_VERSION !== 'undefined') && (storedVer !== DATA_VERSION);

  if (forceReseed) {
    console.log('[AYA] Reseed de datos v' + DATA_VERSION + ' — limpiando Firestore...');
    await _purgeCol('usuarios');
    await _purgeCol('trabajadores');
    await _purgeCol('personal_inm');
    await _purgeCol('clientes_inm');
    await _purgeCol('servicios_prop');
    await _purgeCol('promociones');
    /* No purgamos 'zonas' ni 'config' para conservar configuración operativa */
  }

  /* Preservar todayJobs (datos operativos en memoria) */
  var savedJobs = {};
  WORKERS.forEach(function(w){ savedJobs[w.id] = w.todayJobs || []; });

  /* 1. USERS */
  if (forceReseed || !(await _loadInto('usuarios', USERS))) {
    USERS.length = 0;
    USERS.push({id:0,nombre:'Carlos Mendoza',email:'admin@ayalym.com',rol:'admin',tel:'+52 55 1111 0001',activo:true,accesoRevocado:false,password:'ayalym123',rolProtegido:true});
    await _seedArr('usuarios', USERS, 'id');
  }

  /* 2. ZONAS */
  if (!(await _loadInto('zonas', ZONAS))) {
    await _seedArr('zonas', ZONAS, 'id');
  }

  /* 3. WORKERS */
  if (forceReseed) {
    WORKERS.length = 0; /* vaciar — se llenará cuando se registren trabajadores reales */
  } else if (!(await _loadInto('trabajadores', WORKERS))) {
    await _seedArr('trabajadores',
      WORKERS.map(function(w){ var c = _clone(w); delete c.todayJobs; return c; }),
      'id');
  }
  /* Restaurar todayJobs desde memoria */
  WORKERS.forEach(function(w){
    if (!w.todayJobs || !w.todayJobs.length) w.todayJobs = savedJobs[w.id] || [];
  });

  /* 3b. SUPERVISORS — datos operativos, nunca purgar */
  var svSnap = await _col('supervisores').get();
  if (!svSnap.empty) {
    SUPERVISORS.length = 0;
    svSnap.docs.forEach(function(d){ SUPERVISORS.push(d.data()); });
  }
  /* Deduplicar SUPERVISORS por nombre (conservar el que tenga foto) */
  var svDirty = false;
  var svSeenNames = {};
  for (var _si = SUPERVISORS.length - 1; _si >= 0; _si--) {
    var _sv = SUPERVISORS[_si];
    if (svSeenNames[_sv.name]) {
      var _prev = svSeenNames[_sv.name];
      if (_sv.photo && !_prev.photo) {
        /* Este tiene foto, eliminar el anterior */
        SUPERVISORS.splice(SUPERVISORS.indexOf(_prev), 1);
        svSeenNames[_sv.name] = _sv;
      } else {
        /* El anterior tiene foto o ninguno, eliminar este */
        SUPERVISORS.splice(_si, 1);
      }
      svDirty = true;
      console.log('[AYA] Supervisor duplicado eliminado: ' + _sv.name);
    } else {
      svSeenNames[_sv.name] = _sv;
    }
  }
  /* Reconciliación: crear entradas faltantes de SUPERVISORS basado en USERS */
  USERS.forEach(function(u) {
    if (u.rol !== 'supervisor') return;
    var exists = SUPERVISORS.find(function(s){
      return s.name === u.nombre || s.name === u.email ||
             (s.email && s.email === u.email);
    });
    if (!exists) {
      var svInit = u.nombre.split(' ').map(function(n){ return n[0]; }).join('').slice(0,2).toUpperCase();
      var svNewId = SUPERVISORS.length ? Math.max.apply(null, SUPERVISORS.map(function(s){ return s.id||0; })) + 1 : 0;
      SUPERVISORS.push({id:svNewId, name:u.nombre, initials:svInit, email:u.email||'', zonas:[], assignedWorkers:[], photo:null});
      svDirty = true;
      console.log('[AYA] Supervisor reconciliado: ' + u.nombre);
    }
  });
  /* También reconciliar WORKERS desde USERS con rol=trabajador */
  USERS.forEach(function(u) {
    if (u.rol !== 'trabajador') return;
    var wExists = WORKERS.find(function(w){ return w.name === u.nombre; });
    if (!wExists) {
      var wInit = u.nombre.split(' ').map(function(n){ return n[0]; }).join('').slice(0,2).toUpperCase();
      var wNewId = WORKERS.length ? Math.max.apply(null, WORKERS.map(function(w){ return w.id||0; })) + 1 : 0;
      WORKERS.push({id:wNewId, name:u.nombre, initials:wInit, photo:null, type:[], zonas:[], status:'active', rating:0, services:0, since:new Date().getFullYear(), desc:'', mapX:50, mapY:50, tiempoLlegada:30, reviews:[], todayJobs:[]});
      console.log('[AYA] Trabajador reconciliado: ' + u.nombre);
    }
  });
  /* También reconciliar PERSONAL_INM desde USERS con rol=personal_inm */
  USERS.forEach(function(u) {
    if (u.rol !== 'personal_inm') return;
    var piExists = PERSONAL_INM.find(function(p){ return p.email === u.email; });
    if (!piExists) {
      var piInit = u.nombre.split(' ').map(function(n){ return n[0]; }).join('').slice(0,2).toUpperCase();
      var piNewId = PERSONAL_INM.length ? Math.max.apply(null, PERSONAL_INM.map(function(p){ return p.id||0; })) + 1 : 0;
      PERSONAL_INM.push({id:piNewId, nombre:u.nombre, initials:piInit, email:u.email, password:u.password||'', tel:u.tel||'', activo:true, serviciosAsignados:[], asistencias:[], photo:null});
      console.log('[AYA] Personal Inm reconciliado: ' + u.nombre);
    }
  });
  /* También reconciliar CLIENTS_INM desde USERS con rol=cliente_inm */
  USERS.forEach(function(u) {
    if (u.rol !== 'cliente_inm') return;
    var ciExists = CLIENTS_INM.find(function(c){ return c.email === u.email; });
    if (!ciExists) {
      var ciNewId = CLIENTS_INM.length ? Math.max.apply(null, CLIENTS_INM.map(function(c){ return c.id||0; })) + 1 : 0;
      CLIENTS_INM.push({id:ciNewId, nombre:u.nombre, empresa:'', email:u.email, password:u.password||'', tel:u.tel||'', contratoId:null, activo:true, photo:null});
      console.log('[AYA] Cliente Inm reconciliado: ' + u.nombre);
    }
  });
  /* Persistir reconciliación si hubo cambios */
  if (svDirty) {
    var svB = _db.batch();
    SUPERVISORS.forEach(function(sv){ svB.set(_col('supervisores').doc(String(sv.id)), _clone(sv)); });
    await svB.commit();
  }

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
    if (c.GEO_RADIO_M)    { _loadedGeoRadio = c.GEO_RADIO_M; }
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
  if (forceReseed) {
    CLIENTS_INM.length = 0;
  } else if (!(await _loadInto('clientes_inm', CLIENTS_INM))) {
    await _seedArr('clientes_inm', CLIENTS_INM, 'id');
  }

  /* 6. PERSONAL_INM */
  if (forceReseed) {
    PERSONAL_INM.length = 0;
  } else if (!(await _loadInto('personal_inm', PERSONAL_INM))) {
    await _seedArr('personal_inm', PERSONAL_INM, 'id');
  }

  /* 7. PROPERTY_SERVICES */
  if (forceReseed) {
    PROPERTY_SERVICES.length = 0;
  } else if (!(await _loadInto('servicios_prop', PROPERTY_SERVICES))) {
    await _seedArr('servicios_prop', PROPERTY_SERVICES, 'id');
  }

  /* 8. PROMOTIONS */
  if (!forceReseed) {
    var promoSnap = await _col('promociones').get();
    if (!promoSnap.empty) {
      PROMOTIONS.length = 0;
      promoSnap.docs.forEach(function(d){ PROMOTIONS.push(d.data()); });
    }
  } else {
    PROMOTIONS.length = 0;
  }

  /* 9. SUPERVISOR ASISTENCIAS — siempre cargar desde Firestore (datos operativos, nunca purgar) */
  var svAstSnap = await _col('sv_asistencias').get();
  if (!svAstSnap.empty) {
    SUPERVISOR_ASISTENCIAS.length = 0;
    svAstSnap.docs.forEach(function(d){ SUPERVISOR_ASISTENCIAS.push(d.data()); });
  }

  /* Marcar versión como aplicada en Firestore (persiste en todos los dispositivos) */
  if (forceReseed && typeof DATA_VERSION !== 'undefined') {
    await _col('config').doc('version').set({ v: DATA_VERSION });
    console.log('[AYA] Reseed completado. Versión ' + DATA_VERSION + ' aplicada.');
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

/* Radio de geovalla — cargado desde Firestore al iniciar */
var _loadedGeoRadio = null;
function fbGetLoadedGeoRadio() { return _loadedGeoRadio; }
function fbSaveGeoRadio(value) {
  try {
    _col('config').doc('main').update({ GEO_RADIO_M: value })
      .catch(function(e){ console.warn('fbSaveGeoRadio', e); });
  } catch(e) { console.warn('fbSaveGeoRadio', e); }
}

function fbSaveConfig() {
  try {
    /* {merge:true} para no borrar campos extras como GEO_RADIO_M */
    _col('config').doc('main').set({
      SVC_TYPES:      _clone(SVC_TYPES),
      CLEANING_TYPES: _clone(CLEANING_TYPES),
      URGENCIAS:      _clone(URGENCIAS),
      SVC_EXTRAS:     _clone(SVC_EXTRAS),
      PRICES:         _clone(PRICES),
      DIAS_FESTIVOS:  DIAS_FESTIVOS.slice()
    }, { merge: true }).catch(function(e){ console.warn('fbSaveConfig', e); });
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

function fbSaveSupervisors() {
  try {
    var b = _db.batch();
    SUPERVISORS.forEach(function(sv) {
      b.set(_col('supervisores').doc(String(sv.id)), _clone(sv));
    });
    b.commit().catch(function(e){ console.warn('fbSaveSupervisors', e); });
  } catch(e) { console.warn('fbSaveSupervisors', e); }
}

function fbSaveSupervisorAsistencias() {
  try {
    var b = _db.batch();
    SUPERVISOR_ASISTENCIAS.forEach(function(a) {
      b.set(_col('sv_asistencias').doc(String(a.id)), _clone(a));
    });
    b.commit().catch(function(e){ console.warn('fbSaveSupervisorAsistencias', e); });
  } catch(e) { console.warn('fbSaveSupervisorAsistencias', e); }
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

/* ── Eliminar un documento individual de Firestore ── */
function fbDeleteDoc(colName, docId) {
  try {
    _col(colName).doc(String(docId)).delete()
      .catch(function(e){ console.warn('fbDeleteDoc', colName, docId, e); });
  } catch(e) { console.warn('fbDeleteDoc', e); }
}

/* ── Ubicaciones activas (mapa en tiempo real) ── */
function fbSaveUbicActiva(data){
  try{
    _col('ubicaciones_activas').doc(String(data.id)).set(_clone(data))
      .catch(function(e){console.warn('fbSaveUbicActiva',e);});
  }catch(e){console.warn('fbSaveUbicActiva',e);}
}
function fbDeleteUbicActiva(id){
  try{
    _col('ubicaciones_activas').doc(String(id)).delete()
      .catch(function(e){console.warn('fbDeleteUbicActiva',e);});
  }catch(e){console.warn('fbDeleteUbicActiva',e);}
}
function fbListenUbicActivas(callback){
  try{
    return _col('ubicaciones_activas').onSnapshot(function(snap){
      var locs=[];
      snap.forEach(function(d){locs.push(d.data());});
      callback(locs);
    },function(e){console.warn('fbListenUbicActivas',e);});
  }catch(e){console.warn('fbListenUbicActivas',e);return function(){};}
}

/* ══════════════════════════════════════════════════════════
   NOTIFICACIONES PERSISTENTES
   ══════════════════════════════════════════════════════════ */
function fbPushNotif(data){
  try{
    _col('notificaciones').add(_clone(data))
      .catch(function(e){console.warn('fbPushNotif',e);});
  }catch(e){console.warn('fbPushNotif',e);}
}

function fbMarkNotifRead(docId){
  try{
    _col('notificaciones').doc(docId).update({read:true})
      .catch(function(e){console.warn('fbMarkNotifRead',e);});
  }catch(e){console.warn('fbMarkNotifRead',e);}
}

function fbMarkAllNotifsRead(role){
  try{
    _col('notificaciones')
      .where('destinatario','==',role)
      .where('read','==',false)
      .get().then(function(snap){
        var b=_db.batch();
        snap.forEach(function(d){b.update(d.ref,{read:true});});
        return b.commit();
      }).catch(function(e){console.warn('fbMarkAllNotifsRead',e);});
  }catch(e){console.warn('fbMarkAllNotifsRead',e);}
}

function fbListenNotifs(role,callback){
  try{
    return _col('notificaciones')
      .where('destinatario','==',role)
      .limit(80)
      .onSnapshot(function(snap){
        var notifs=[];
        snap.forEach(function(d){
          var n=d.data();
          n._docId=d.id;
          notifs.push(n);
        });
        /* Ordenar en cliente — evita requerir índice compuesto en Firestore */
        notifs.sort(function(a,b){return(b.createdAt||0)-(a.createdAt||0);});
        if(notifs.length>60)notifs=notifs.slice(0,60);
        callback(notifs);
      },function(e){console.warn('fbListenNotifs',e);});
  }catch(e){console.warn('fbListenNotifs',e);return function(){};}
}

/* ── Web Push Subscriptions ─────────────────────────────────────── */

/* Guarda la suscripción Web Push de este dispositivo */
function fbSavePushSub(role,deviceId,subscription){
  try{
    _col('push_subs').doc(deviceId).set({
      role:role,
      sub:JSON.parse(JSON.stringify(subscription)),
      updatedAt:Date.now()
    }).catch(function(e){console.warn('fbSavePushSub',e);});
  }catch(e){console.warn('fbSavePushSub',e);}
}

/* Lee todas las suscripciones de un rol para enviar push */
async function fbGetPushSubs(role){
  try{
    var snap=await _col('push_subs').where('role','==',role).get();
    return snap.docs.map(function(d){return d.data().sub;}).filter(Boolean);
  }catch(e){
    console.warn('fbGetPushSubs',e);
    return [];
  }
}

/* Elimina la suscripción de este dispositivo (al cerrar sesión) */
function fbDeletePushSub(deviceId){
  try{
    _col('push_subs').doc(deviceId).delete()
      .catch(function(e){console.warn('fbDeletePushSub',e);});
  }catch(e){console.warn('fbDeletePushSub',e);}
}
