/* =====================================================
   AYALYM — Datos de la aplicación
   ===================================================== */

/* ── VERSIÓN DE DATOS ──────────────────────────────────
   Incrementa DATA_VERSION para forzar un reseed completo
   de Firestore con los datos de este archivo.
   ─────────────────────────────────────────────────── */
const DATA_VERSION = 2;

const IVA=0.16,TAP_MIN=1200,BUFFER_MIN=60;
const MESES=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
let facturaOn=false,facturaPersonaTipo='fisica',uploadedFiles=[],currentRole='cliente',staffRole='trabajador',workerActive=true,nwPhotoData=null,inlineStars={};
let currentWorkerRef=null,currentSupervisorRef=null,currentUserEmail=''; /* referencia al usuario logueado */
let clientReviews=[]; /* se puebla al iniciar sesión con cuenta demo o al recibir evaluaciones */
let staffPanelOpen=false,notifPanelOpen=false,userRoleFilter='all',recoverOpen=false,facturaFilter='todas';
let SOLICITUDES_FACTURA=[];
let clientDiscount=0,workerDeductions=[],workerBaseTotal=4050;
let dateFilterMode='dia',selectedCleanTypeId='general';
let clientZoneId='narvarte',selectedZoneId='narvarte';
let selectedTimeSlot='';
let selectedWorkerId=null,fichaWorkerId=null,selectedPayMethod='tarjeta';
let currentRescheduleId=null,rescheduledTimeSlot='';

let ZONAS=[
  {id:'roma',nombre:'Roma / Condesa',colonias:'Roma Norte, Roma Sur, Condesa, Hipódromo',activo:true},
  {id:'polanco',nombre:'Polanco / Lomas',colonias:'Polanco, Anzures, Lomas de Chapultepec',activo:true},
  {id:'narvarte',nombre:'Narvarte / Del Valle',colonias:'Narvarte Poniente, Narvarte Oriente, Del Valle',activo:true},
  {id:'coyoacan',nombre:'Coyoacán / Pedregal',colonias:'Coyoacán, Pedregal, Villa Coapa',activo:true},
  {id:'tlalpan',nombre:'Tlalpan / Xochimilco',colonias:'Tlalpan, Xochimilco, Tulyehualco',activo:true},
  {id:'satellite',nombre:'Satélite / Naucalpan',colonias:'Ciudad Satélite, Naucalpan Centro, La Florida',activo:true},
];

let CLEANING_TYPES=[
  {id:'general',nombre:'Limpieza general',descripcion:'Áreas comunes, pisos, superficies y baños',factor:1.0,activo:true},
  {id:'profunda',nombre:'Limpieza profunda',descripcion:'Todo lo anterior + muebles, ventanas, cocina a fondo',factor:1.4,activo:true},
  {id:'fina',nombre:'Limpieza fina',descripcion:'Mantenimiento y detalle fino de espacios ya limpios',factor:1.2,activo:true},
];

let SVC_TYPES=[
  {id:'depto',nombre:'Limpieza de departamento',precio:500,durMin:60,durMax:180,activo:true},
  {id:'auto',nombre:'Lavado de auto',precio:400,durMin:30,durMax:60,activo:true},
  {id:'tapiceria',nombre:'Lavado de tapicería',precio:1200,durMin:90,durMax:240,activo:true},
];

let URGENCIAS=[
  {id:'normal', nombre:'Normal (3-5 días)', pct:0,  activo:true, modo:'sin_filtro', maxMin:null, diasMin:3, diasMax:14},
  {id:'rapido', nombre:'Rápido',            pct:15, activo:true, modo:'mismo_dia',  maxMin:null, diasMin:0, diasMax:1},
  {id:'urgente',nombre:'Urgente',           pct:30, activo:true, modo:'minutos',    maxMin:120,  diasMin:0, diasMax:0},
];

/* Días festivos México 2026 – recargo 100 % sobre precio base */
let DIAS_FESTIVOS=[
  '2026-01-01',// Año Nuevo
  '2026-02-02',// Constitución (1er lunes feb)
  '2026-03-16',// Natalicio Juárez (3er lunes mar)
  '2026-04-02',// Jueves Santo
  '2026-04-03',// Viernes Santo
  '2026-05-01',// Día del Trabajo
  '2026-09-16',// Independencia
  '2026-11-02',// Día de Muertos
  '2026-11-16',// Revolución (3er lunes nov)
  '2026-12-12',// Virgen de Guadalupe
  '2026-12-25',// Navidad
];

/* Extras opcionales por tipo de servicio — el admin puede agregar/eliminar */
let SVC_EXTRAS=[
  {id:'interior',svcId:'auto',nombre:'Interior del auto',precio:900,activo:true},
  {id:'ref',svcId:'depto',nombre:'Limpieza de refrigerador',precio:200,activo:true},
  {id:'horno',svcId:'depto',nombre:'Limpieza de horno',precio:150,activo:true},
  {id:'imp',svcId:'tapiceria',nombre:'Tratamiento impermeabilizante',precio:300,activo:true},
];

let USERS=[
  {id:0,nombre:'Carlos Mendoza',email:'admin@ayalym.com',rol:'admin',tel:'+52 55 1111 0001',activo:true,accesoRevocado:false,password:'ayalym123',rolProtegido:true},
];

let clientDirecciones=[]; /* se puebla con las direcciones del usuario logueado */
let selectedDirId=null;

let currentPersonalId=null;
let currentClientInmId=null;

let CLIENTS_INM=[];
let PERSONAL_INM=[];
let INSUMOS_REQUESTS=[]; /* {id,personalId,servicioId,folio,fecha,status,items:[{catalogoId,nombre,unidad,precio,cantidad,subtotal,esPersonalizado}],notas,total,presupuesto,revisadoPor,revisadoFecha} */
let INSUMOS_CONFIG={diaInicio:15,diaFin:25,panelActivo:true}; /* Período de recepción de solicitudes (días del mes) + toggle global */

let INSUMOS_CATALOGO=[
  /* JARCIERÍA */
  {id:0,categoria:'jarcieria',nombre:'FIBRA SCOTCH VERDE-AMARILLA P-94 3M',unidad:'PZ',precio:14.13,activo:true},
  {id:1,categoria:'jarcieria',nombre:'FIBRA SCOTCH BLANCA P-66 3M',unidad:'PZ',precio:9.48,activo:true},
  {id:2,categoria:'jarcieria',nombre:'FIBRA SCOTCH NEGRA P-76 3M',unidad:'PZ',precio:14.89,activo:true},
  {id:3,categoria:'jarcieria',nombre:'FIBRA SCOTCH VERDE P-96 3M',unidad:'PZ',precio:10.69,activo:true},
  {id:4,categoria:'jarcieria',nombre:'FIBRA BRILLOSA GRANDE',unidad:'PZ',precio:7.67,activo:true},
  {id:5,categoria:'jarcieria',nombre:'GUANTES ADEX ROJO # 7',unidad:'PZ',precio:26.98,activo:true},
  {id:6,categoria:'jarcieria',nombre:'GUANTES ADEX ROJO # 8',unidad:'PZ',precio:26.98,activo:true},
  {id:7,categoria:'jarcieria',nombre:'GUANTES ADEX ROJO # 9',unidad:'PZ',precio:26.98,activo:true},
  {id:8,categoria:'jarcieria',nombre:'GUANTES DE CARNAZA',unidad:'PZ',precio:29.22,activo:true},
  {id:9,categoria:'jarcieria',nombre:'AXION LIQUIDO PARA TRASTES 1 LT',unidad:'PZ',precio:37.07,activo:true},
  {id:10,categoria:'jarcieria',nombre:'JALADOR INDUSTRIAL IDEAL DE 1 MT',unidad:'PZ',precio:153.10,activo:true},
  {id:11,categoria:'jarcieria',nombre:'JALADOR MASTER 40CM (ARELLANO) S/B',unidad:'PZ',precio:33.62,activo:true},
  {id:12,categoria:'jarcieria',nombre:'RECOGEDOR DE LAMINA',unidad:'PZ',precio:29.48,activo:true},
  {id:13,categoria:'jarcieria',nombre:'JABON ROMA 10 KG',unidad:'PZ',precio:327.24,activo:true},
  {id:14,categoria:'jarcieria',nombre:'JABON ROMA 5 KG',unidad:'PZ',precio:157.59,activo:true},
  {id:15,categoria:'jarcieria',nombre:'JABON ROMA 1 KG',unidad:'PZ',precio:33.36,activo:true},
  {id:16,categoria:'jarcieria',nombre:'EXTENSION PARA VIDRIOS',unidad:'PZ',precio:120.00,activo:true},
  {id:17,categoria:'jarcieria',nombre:'CEPILLO PARA VIDRIOS 1 MT',unidad:'PZ',precio:157.24,activo:true},
  {id:18,categoria:'jarcieria',nombre:'CEPILLO CERDA 30CM RANURADO S/BASTON',unidad:'PZ',precio:92.07,activo:true},
  {id:19,categoria:'jarcieria',nombre:'BATIDOR No 2 PLASTIPOP (BANDEJA)',unidad:'PZ',precio:6.72,activo:true},
  {id:20,categoria:'jarcieria',nombre:'BOMBA PALMA P/WC GRANDE',unidad:'PZ',precio:37.07,activo:true},
  {id:21,categoria:'jarcieria',nombre:'BASTON DE MADERA',unidad:'PZ',precio:11.38,activo:true},
  {id:22,categoria:'jarcieria',nombre:'ESCOBA PERICO ABANICO P-250 S/BASTON',unidad:'PZ',precio:28.53,activo:true},
  {id:23,categoria:'jarcieria',nombre:'ESCOBA PERICO P-140 S/BASTON',unidad:'PZ',precio:23.62,activo:true},
  {id:24,categoria:'jarcieria',nombre:'ESCOBA DE VARA',unidad:'PZ',precio:91.47,activo:true},
  {id:25,categoria:'jarcieria',nombre:'ESCOBA DE MIJO',unidad:'PZ',precio:100.00,activo:true},
  {id:26,categoria:'jarcieria',nombre:'MECHUDO DE MICROFIBRA S/BASTON',unidad:'PZ',precio:41.98,activo:true},
  {id:27,categoria:'jarcieria',nombre:'MECHUDO PAVILO PM-350 PERICO S/BASTON',unidad:'PZ',precio:28.97,activo:true},
  {id:28,categoria:'jarcieria',nombre:'CEPILLO USO RUDO PERICO',unidad:'PZ',precio:40.00,activo:true},
  {id:29,categoria:'jarcieria',nombre:'CEPILLO PERICO SANITARIO C/BASE PWC',unidad:'PZ',precio:24.57,activo:true},
  {id:30,categoria:'jarcieria',nombre:'PLUMERO 1/2 PARED',unidad:'PZ',precio:82.59,activo:true},
  {id:31,categoria:'jarcieria',nombre:'CUBETA FLEXIBLE No 14',unidad:'PZ',precio:47.93,activo:true},
  {id:32,categoria:'jarcieria',nombre:'JALADOR 1MT INDUS. ARELLANO S/B',unidad:'PZ',precio:80.26,activo:true},
  {id:33,categoria:'jarcieria',nombre:'EMBUDO CHICO',unidad:'PZ',precio:10.95,activo:true},
  {id:34,categoria:'jarcieria',nombre:'EMBUDO MEDIANO',unidad:'PZ',precio:11.95,activo:true},
  {id:35,categoria:'jarcieria',nombre:'EMBUDO GRANDE',unidad:'PZ',precio:12.95,activo:true},
  {id:36,categoria:'jarcieria',nombre:'ATOMIZADOR 1/2 LT',unidad:'PZ',precio:7.07,activo:true},
  {id:37,categoria:'jarcieria',nombre:'ATOMIZADOR TIPO INDUSTRIAL 1 LT',unidad:'PZ',precio:9.31,activo:true},
  {id:38,categoria:'jarcieria',nombre:'LIJA DE AGUA # 180',unidad:'PZ',precio:12.50,activo:true},
  {id:39,categoria:'jarcieria',nombre:'PANO DE MICROFIBRA LUXE 3000 37X50',unidad:'PZ',precio:8.71,activo:true},
  {id:40,categoria:'jarcieria',nombre:'PANO DE MICROFIBRA DE 1 METRO',unidad:'PZ',precio:49.48,activo:true},
  {id:41,categoria:'jarcieria',nombre:'JERGA TRAPIMAX',unidad:'PZ',precio:17.67,activo:true},
  {id:42,categoria:'jarcieria',nombre:'ESPATULA FLEXIBLE No 4 C/MANGO SANTUL',unidad:'PZ',precio:15.69,activo:true},
  {id:43,categoria:'jarcieria',nombre:'FELPAS PARA MOP 60 CM',unidad:'PZ',precio:27.16,activo:true},
  {id:44,categoria:'jarcieria',nombre:'FELPAS PARA MOP 90 CM',unidad:'PZ',precio:34.22,activo:true},
  {id:45,categoria:'jarcieria',nombre:'FELPAS PARA MOP 1.20 CM',unidad:'PZ',precio:69.50,activo:true},
  {id:46,categoria:'jarcieria',nombre:'MOP COMPLETO CON BASTON 60 CM',unidad:'PZ',precio:108.46,activo:true},
  {id:47,categoria:'jarcieria',nombre:'MOP COMPLETO CON BASTON 90 CM',unidad:'PZ',precio:95.60,activo:true},
  {id:48,categoria:'jarcieria',nombre:'MOP COMPLETO CON BASTON 1.20 CM',unidad:'PZ',precio:171.40,activo:true},
  {id:49,categoria:'jarcieria',nombre:'LETRERO DE PISO MOJADO',unidad:'PZ',precio:101.98,activo:true},
  /* BOLSAS */
  {id:50,categoria:'bolsas',nombre:'BOLSA BASURA NEGRA 60 × 90 CM',unidad:'KG',precio:27.07,activo:true},
  {id:51,categoria:'bolsas',nombre:'BOLSA BASURA NEGRA 90 × 120 CM',unidad:'KG',precio:27.07,activo:true},
  {id:52,categoria:'bolsas',nombre:'BOLSA BASURA NEGRA 70 × 90 CM',unidad:'KG',precio:2.50,activo:true},
  /* LÍQUIDOS */
  {id:53,categoria:'liquidos',nombre:'ATRAPA OLORES',unidad:'LT',precio:15.00,activo:true},
  {id:54,categoria:'liquidos',nombre:'DESENGRASANTE',unidad:'LT',precio:16.50,activo:true},
  {id:55,categoria:'liquidos',nombre:'HIPOCLORITO',unidad:'LT',precio:11.00,activo:true},
  {id:56,categoria:'liquidos',nombre:'ALMOROL',unidad:'LT',precio:30.00,activo:true},
  {id:57,categoria:'liquidos',nombre:'MULTILIMPIADOR MANZANA/CANELA',unidad:'LT',precio:65.00,activo:true},
  {id:58,categoria:'liquidos',nombre:'MULTILIMPIADOR DURAZNO',unidad:'LT',precio:65.00,activo:true},
  {id:59,categoria:'liquidos',nombre:'MULTILIMPIADOR FRUTAS',unidad:'LT',precio:65.00,activo:true},
  {id:60,categoria:'liquidos',nombre:'MULTILIMPIADOR LIMON',unidad:'LT',precio:65.00,activo:true},
  {id:61,categoria:'liquidos',nombre:'MULTILIMPIADOR LAVANDA',unidad:'LT',precio:65.00,activo:true},
  {id:62,categoria:'liquidos',nombre:'QUITASARRO',unidad:'LT',precio:20.00,activo:true},
  {id:63,categoria:'liquidos',nombre:'SHAMPOO NEUTRO',unidad:'LT',precio:18.00,activo:true},
  {id:64,categoria:'liquidos',nombre:'JABON ROMA LIQUIDO',unidad:'LT',precio:19.50,activo:true},
];

let SUPERVISORS=[];
let SUPERVISOR_ASSIGNED=[];
let SUPERVISOR_ASISTENCIAS=[]; /* {id,supervisorId,supervisorNombre,servicioId,servicioFolio,servicioTipo,clienteNombre,inmuebleDireccion,fecha,entrada,salida,duracion,notas} */

let WORKERS=[];

let CLIENT_NOTES=[];


const Q_PERIODS=[];

const CONVS=[];

let LOW_REVIEWS=[];

let NOTIFICATIONS={
  cliente:[],
  trabajador:[],
  supervisor:[],
  admin:[],
};

/* Estado de la sesión de soporte (chat c↔a iniciado por el cliente) */
let supportChat={active:false,openedAt:null,lastClientMsg:null,closedReason:null};
let supportChatTimer=null;

/* ─── CHAT UNIFICADO ───
   Claves: 'c-t' cliente↔trabajador | 'c-a' cliente↔admin(soporte)
           'sv-a' supervisor↔admin  | 't-a' trabajador↔admin
           't-sv' trabajador↔supervisor
   from: 'c'=cliente, 't'=trabajador, 'sv'=supervisor, 'a'=admin
────────────────────────── */
let CHAT={
  'c-t':[],
  'c-a':[],
  'sv-a':[],
  't-a':[],
  't-sv':[],
};

/* ── SERVICIOS DE INMUEBLES ── */
let PROPERTY_SERVICES=[];
let propSvcFormOpen=false;

/* Solicitudes pendientes de aceptación por el trabajador */
let PENDING_REQUESTS=[];

const PRICES={
  depto:{base:500,hab:120,bano:80},
  auto:{sedan:400,suv:500,pickup:620},
  interior:900,
  tap:{
    silla:{unit:100},
    sofa:{tela:380,piel:560,mixta:450},
    tapete:{factor:80},
    alfombra:{factor:90},
    colchon:{individual:500,matrimonial:650,kingsize:750},
  },
};

/* ── PROMOCIONES ──────────────────────────────────────────────
   tipo: 'descuento' | 'codigo' | 'referido' | 'campana'
   campana: 'buen_fin' | 'hot_sale' | 'navidad' | 'madres' | 'custom'
   ──────────────────────────────────────────────────────────── */
let PROMOTIONS = [];

/* ── AGENDA ───────────────────────────────────────────────────
   Servicios especiales asignados por admin/supervisor a cualquier
   rol (trabajador, supervisor, personal_inm).
   Estructura: {id, titulo, tipo, descripcion, fecha, horaInicio,
     horaFin, notas, estado, asignadoA:{id,nombre,rol},
     asignadoPor:{id,nombre,rol}, redirectedBy:null|{id,nombre},
     createdAt}
   ──────────────────────────────────────────────────────────── */
let AGENDA_ITEMS = [];

/* ── SITE CONFIG ──────────────────────────────────────────────
   Textos, redes y datos editables de la landing page.
   Se persiste en Firestore config/site y localStorage.
   ──────────────────────────────────────────────────────────── */
let SITE_CONFIG = {
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
    s1Num:'+500', s1Lbl:'Servicios realizados',
    s2Num:'100%', s2Lbl:'Satisfacción garantizada',
    s3Num:'REPSE', s3Lbl:'ACR15827 / 2025',
    s4Num:'CDMX', s4Lbl:'Área Metropolitana'
  },
  nosotros: {
    highlight:'Empresa dedicada a la innovación y cuidado del medio ambiente, generando ambientes amigables con entornos limpios y elegantes.',
    p1:'Brindamos la seguridad de que nuestros clientes y sus colaboradores se sientan como en casa al llegar a sus instalaciones, obteniendo su entera satisfacción con la calidad de nuestro servicio.',
    p2:'Nuestro equipo de profesionales está comprometido con los más altos estándares de calidad, utilizando productos eco-amigables y tecnología de punta.'
  },
  values:[
    {icon:'🌿',title:'Sustentabilidad',desc:'Productos y procesos respetuosos con el medio ambiente.'},
    {icon:'⭐',title:'Excelencia',      desc:'Estándares de calidad en cada servicio que realizamos.'},
    {icon:'🤝',title:'Confianza',       desc:'Personal capacitado y certificado para tu tranquilidad.'},
    {icon:'⏱️',title:'Puntualidad',    desc:'Cumplimos con tiempos y compromisos establecidos.'}
  ],
  repse:{
    num:'Aviso de registro REPSE',
    empresa:'No. ACR15827/2025 — AYA LIMPIEZA Y MANTENIMIENTO S.A. DE C.V.'
  },
  contacto:{
    direccion:'Prol. Paseo de la Reforma No. 799 Int. 1308, Col. Lomas de Santa Fe, Alcaldía Álvaro Obregón, C.P. 01219, CDMX.',
    horario:'Lunes a Viernes: 8:00 — 18:00 hrs\nSábado: 9:00 — 14:00 hrs',
    whatsapp:'https://wa.me/521XXXXXXXXXX'
  },
  social:[
    {emoji:'📘', label:'Facebook',  url:'https://www.facebook.com/ayalym23'},
    {emoji:'📷', label:'Instagram', url:'https://www.instagram.com/ayalym23'},
    {emoji:'🎵', label:'TikTok',    url:'https://www.tiktok.com/@ayalym23'}
  ],
  portal:{
    notif1Title:'Entrada registrada',
    notif1Text: 'María González llegó a las 09:02 — Torre Norte',
    notif2Title:'Nuevo reporte del supervisor',
    notif2Text: 'Revisión de área común completada — ver detalles',
    notif3Title:'Presupuesto autorizado',
    notif3Text: '$1,800 MXN aprobados para el período',
    notif4Title:'Salida registrada',
    notif4Text: 'Carlos Ramírez salió a las 18:15 — Plaza Central'
  }
};
