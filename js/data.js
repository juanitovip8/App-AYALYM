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

let SUPERVISORS=[];
let SUPERVISOR_ASSIGNED=[];

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
