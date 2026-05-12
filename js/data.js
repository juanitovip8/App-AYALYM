/* =====================================================
   AYALYM — Datos de la aplicación
   ===================================================== */

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
  {id:1,nombre:'Laura Supervisor',email:'laura@ayalym.com',rol:'supervisor',tel:'+52 55 1111 0002',activo:true,accesoRevocado:false,password:'ayalym123'},
  {id:2,nombre:'Marco Torres',email:'marco@ayalym.com',rol:'supervisor',tel:'+52 55 1111 0003',activo:true,accesoRevocado:false,password:'ayalym123'},
  {id:3,nombre:'Ana García',email:'ana@cliente.com',rol:'cliente',tel:'+52 55 2222 0001',activo:true,accesoRevocado:false,password:'ayalym123'},
  {id:4,nombre:'Juan Morales',email:'juan@ayalym.com',rol:'trabajador',tel:'+52 55 3333 0001',activo:true,accesoRevocado:false,password:'ayalym123'},
  {id:5,nombre:'Sofía Campos',email:'sofia@ayalym.com',rol:'trabajador',tel:'+52 55 3333 0002',activo:true,accesoRevocado:false,password:'ayalym123'},
  {id:6,nombre:'Luis Vera',email:'luis@cliente.com',rol:'cliente',tel:'+52 55 2222 0002',activo:true,accesoRevocado:false,password:'ayalym123'},
  {id:7,nombre:'Pedro Ramírez',email:'pedro@ayalym.com',rol:'personal_inm',tel:'+52 55 4444 0001',activo:true,accesoRevocado:false,password:'ayalym123'},
  {id:8,nombre:'Carmen Vega',email:'carmen@ayalym.com',rol:'personal_inm',tel:'+52 55 4444 0002',activo:true,accesoRevocado:false,password:'ayalym123'},
  {id:9,nombre:'Patricia León',email:'pleon@romaboutique.com',rol:'cliente_inm',tel:'+52 55 8800 0022',activo:true,accesoRevocado:false,password:'hotel123'},
];

let clientDirecciones=[]; /* se puebla con las direcciones del usuario logueado */
let selectedDirId=null;

let currentPersonalId=null;
let currentClientInmId=null;

let CLIENTS_INM=[
  {id:0,nombre:'Patricia León',empresa:'Hotel Roma Boutique',email:'pleon@romaboutique.com',password:'hotel123',tel:'+52 55 8800 0022',contratoId:1,activo:true},
];
let PERSONAL_INM=[
  {id:0,nombre:'Pedro Ramírez',initials:'PR',email:'pedro@ayalym.com',password:'ayalym123',tel:'+52 55 4444 0001',activo:true,serviciosAsignados:[1,3],asistencias:[
    {fecha:'2026-05-05',entrada:'07:52',salida:null},
    {fecha:'2026-04-29',entrada:'08:05',salida:'17:30'},
    {fecha:'2026-04-28',entrada:'07:58',salida:'17:25'},
    {fecha:'2026-04-27',entrada:'08:12',salida:'17:15'},
    {fecha:'2026-04-24',entrada:'08:00',salida:'17:20'},
    {fecha:'2026-04-23',entrada:'07:55',salida:'17:10'},
    {fecha:'2026-04-22',entrada:'08:08',salida:'17:35'},
    {fecha:'2026-04-21',entrada:'07:50',salida:'17:00'},
    {fecha:'2026-04-17',entrada:'08:03',salida:'17:28'},
    {fecha:'2026-04-16',entrada:'08:00',salida:'17:15'},
    {fecha:'2026-04-15',entrada:'08:10',salida:'17:40'},
    {fecha:'2026-04-14',entrada:'07:58',salida:'17:00'},
  ]},
  {id:1,nombre:'Carmen Vega',initials:'CV',email:'carmen@ayalym.com',password:'ayalym123',tel:'+52 55 4444 0002',activo:true,serviciosAsignados:[1],asistencias:[
    {fecha:'2026-05-05',entrada:'07:48',salida:null},
    {fecha:'2026-04-29',entrada:'07:55',salida:'17:00'},
    {fecha:'2026-04-28',entrada:'08:00',salida:'17:05'},
    {fecha:'2026-04-27',entrada:'07:59',salida:'16:58'},
    {fecha:'2026-04-24',entrada:'08:02',salida:'17:15'},
    {fecha:'2026-04-23',entrada:'07:48',salida:'17:00'},
    {fecha:'2026-04-22',entrada:'08:05',salida:'17:20'},
    {fecha:'2026-04-21',entrada:'07:52',salida:'17:00'},
    {fecha:'2026-04-17',entrada:'08:00',salida:'17:10'},
    {fecha:'2026-04-16',entrada:'07:55',salida:'17:05'},
    {fecha:'2026-04-14',entrada:'08:01',salida:'17:00'},
  ]},
];

let SUPERVISORS=[
  {id:0,name:'Laura Supervisor',initials:'LS',zonas:['Roma','Narvarte'],assignedWorkers:[0,1]},
  {id:1,name:'Marco Torres',initials:'MT',zonas:['Coyoacán','Tlalpan'],assignedWorkers:[2,5]},
  {id:2,name:'Patricia Vera',initials:'PV',zonas:['Satélite','Polanco'],assignedWorkers:[3]},
];
let SUPERVISOR_ASSIGNED=[0,1];

let WORKERS=[
  {id:0,name:'Juan Morales',initials:'JM',photo:null,type:['auto'],zonas:['roma','polanco'],status:'active',rating:4.8,services:142,since:2023,desc:'Especialista en lavado.',mapX:35,mapY:40,tiempoLlegada:45,
    reviews:[{stars:5,comment:'Auto impecable',svc:'SUV',client:'Ana G.'},{stars:2,comment:'Manchas',svc:'SUV',client:'Pedro M.'}],
    todayJobs:[
      {svc:'SUV lavado exterior',fecha:'2026-04-27',hora:'09:00',durMin:40,durMax:50,zona:'Polanco',status:'completed'},
      {svc:'Sedán básico',fecha:'2026-04-28',hora:'11:00',durMin:30,durMax:35,zona:'Roma',status:'completed'},
      {svc:'Pickup + interior',fecha:'2026-04-29',hora:'09:00',durMin:40,durMax:50,zona:'Polanco',status:'upcoming'},
      {svc:'Sedán',fecha:'2026-04-29',hora:'10:50',durMin:30,durMax:40,zona:'Lomas',status:'upcoming'},
      {svc:'Camioneta premium',fecha:'2026-04-30',hora:'10:00',durMin:50,durMax:60,zona:'Narvarte',status:'upcoming'},
    ]},
  {id:1,name:'Sofía Campos',initials:'SC',photo:null,type:['depto','auto'],zonas:['roma','narvarte'],status:'active',rating:4.6,services:98,since:2023,desc:'Limpieza y autos.',mapX:55,mapY:55,tiempoLlegada:60,
    reviews:[{stars:5,comment:'Excelente',svc:'Depto',client:'Ana G.'},{stars:3,comment:'Faltó cocina',svc:'Depto',client:'Luis V.'}],
    todayJobs:[{svc:'Depto 2 hab · Profunda',fecha:'2026-04-29',hora:'10:00',durMin:150,durMax:180,zona:'Narvarte',status:'upcoming'}]},
  {id:2,name:'Laura Cruz',initials:'LC',photo:null,type:['depto','tapiceria'],zonas:['narvarte','coyoacan'],status:'busy',rating:4.9,services:210,since:2022,desc:'Tapicería y limpieza.',mapX:70,mapY:70,tiempoLlegada:90,
    reviews:[{stars:5,comment:'Mejor servicio',svc:'Sofá',client:'Ana G.'}],
    todayJobs:[{svc:'Sofá piel',fecha:'2026-04-29',hora:'11:00',durMin:90,durMax:120,zona:'Coyoacán',status:'upcoming'}]},
  {id:3,name:'Roberto Gómez',initials:'RG',photo:null,type:['auto'],zonas:['satellite'],status:'active',rating:4.3,services:67,since:2024,desc:'Lavado puntual.',mapX:20,mapY:30,tiempoLlegada:150,
    reviews:[{stars:4,comment:'Buen trabajo',svc:'SUV',client:'Carlos L.'}],
    todayJobs:[]},
  {id:4,name:'Andrés Ríos',initials:'AR',photo:null,type:['tapiceria'],zonas:['polanco','narvarte'],status:'active',rating:4.7,services:134,since:2022,desc:'Tapicería fina.',mapX:45,mapY:25,tiempoLlegada:30,
    reviews:[{stars:5,comment:'Como nuevo',svc:'Sofá',client:'Ana G.'}],
    todayJobs:[{svc:'Tapicería sillas',fecha:'2026-04-29',hora:'12:00',durMin:60,durMax:90,zona:'Polanco',status:'upcoming'}]},
  {id:5,name:'María Paz',initials:'MP',photo:null,type:['depto'],zonas:['coyoacan','tlalpan'],status:'inactive',rating:4.4,services:55,since:2024,desc:'Limpieza entre semana.',mapX:80,mapY:80,tiempoLlegada:200,
    reviews:[{stars:4,comment:'Organizada',svc:'Depto',client:'Carlos L.'}],
    todayJobs:[]},
];

/* Demo: job de hoy que siempre cae dentro de la ventana de ubicación (inicia en 10 min) */
(function(){
  const _n=new Date(),_t=_n.toISOString().split('T')[0];
  const _sm=_n.getHours()*60+_n.getMinutes()+10;
  const _sh=Math.floor(_sm/60)%24,_smi=_sm%60;
  WORKERS[0].todayJobs.push({
    svc:'Sedán lavado completo',fecha:_t,
    hora:String(_sh).padStart(2,'0')+':'+String(_smi).padStart(2,'0'),
    durMin:35,durMax:45,zona:'Roma Norte',status:'upcoming'
  });
})();

let CLIENT_NOTES=[
  {workerId:0,workerName:'Juan Morales',client:'Ana García',note:'Prefiere que lleguen antes de las 9am. Tiene perro pequeño en casa, requiere aviso al entrar.',date:'20 abr'},
  {workerId:1,workerName:'Sofía Campos',client:'Luis Vera',note:'Solicita productos sin cloro. Departamento en piso 8, sin elevador disponible los martes.',date:'18 abr'},
];


const Q_PERIODS=[
  {label:'16–30 abr 2026',workers:[
    {id:0,name:'Juan Morales',initials:'JM',svcs:9,total:4050,deductions:[{amount:200,svc:'Lavado SUV',client:'Ana García',date:'20 abr'}]},
    {id:1,name:'Sofía Campos',initials:'SC',svcs:7,total:3200,deductions:[]},
    {id:2,name:'Laura Cruz',initials:'LC',svcs:11,total:5800,deductions:[{amount:150,svc:'Limpieza depto',client:'Luis Vera',date:'18 abr'}]}
  ]},
  {label:'1–15 abr 2026',workers:[
    {id:0,name:'Juan Morales',initials:'JM',svcs:11,total:5100,deductions:[]},
    {id:2,name:'Laura Cruz',initials:'LC',svcs:14,total:7200,deductions:[{amount:300,svc:'Tapicería sofá',client:'Carlos López',date:'8 abr'}]}
  ]},
  {label:'16–31 mar 2026',workers:[
    {id:0,name:'Juan Morales',initials:'JM',svcs:8,total:3600,deductions:[]}
  ]},
];

const CONVS=[
  {id:0,client:'Ana García',worker:'Juan Morales',svc:'Lavado SUV · 27 abr',msgs:[
    {from:'worker',text:'Hola, salí hacia su domicilio.',time:'08:35'},
    {from:'client',text:'Perfecto.',time:'08:36'}
  ]},
  {id:1,client:'Carlos López',worker:'Sofía Campos',svc:'Depto 2 hab · 27 abr',msgs:[
    {from:'worker',text:'Confirmo cita 10:00.',time:'09:30'},
    {from:'client',text:'Ok.',time:'09:31'}
  ]},
];

let LOW_REVIEWS=[
  {id:0,client:'Ana García',worker:'Juan Morales',workerId:0,svc:'Lavado SUV',stars:2,comment:'Quedó con manchas',date:'20 abr',discount:0,applied:false},
  {id:1,client:'Luis Vera',worker:'Sofía Campos',workerId:1,svc:'Limpieza depto',stars:3,comment:'Faltó cocina',date:'18 abr',discount:0,applied:false},
];

let NOTIFICATIONS={
  cliente:[{id:0,icon:'🎁',type:'blue',title:'Tienes un descuento',body:'-$200 en tu próxima reserva',time:'hace 2 min',read:false}],
  trabajador:[{id:0,icon:'📬',type:'blue',title:'Nueva solicitud',body:'Lavado auto Sedán — 28 abr',time:'hace 3 min',read:false}],
  supervisor:[{id:0,icon:'⚠️',type:'amber',title:'Evaluación baja',body:'Juan Morales recibió 2 estrellas',time:'hace 30 min',read:false}],
  admin:[{id:0,icon:'⭐',type:'red',title:'Evaluación baja',body:'Juan Morales — 2 estrellas',time:'hace 15 min',read:false}],
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
  'c-t':[
    {from:'t',text:'Hola, salí hacia su domicilio.',time:'08:35',name:'Juan'},
    {from:'c',text:'Perfecto, ya estoy en casa.',time:'08:36',name:'Ana'},
  ],
  'c-a':[],
  'sv-a':[
    {from:'a',text:'Hola Laura, ¿en qué podemos ayudarte?',time:'08:00',name:'Admin'},
    {from:'sv',text:'¿Puedes revisar la agenda de Juan para mañana?',time:'08:05',name:'Laura'},
    {from:'a',text:'Claro, ya la estoy revisando.',time:'08:06',name:'Admin'},
  ],
  't-a':[
    {from:'a',text:'Hola Juan, ¿todo listo para el día de hoy?',time:'07:30',name:'Admin'},
    {from:'t',text:'Sí, salgo a las 8:30. Sin novedades.',time:'07:35',name:'Juan'},
  ],
  't-sv':[
    {from:'sv',text:'Juan, confirma tu disponibilidad para el 29.',time:'10:00',name:'Laura'},
    {from:'t',text:'Confirmado, disponible desde las 9am.',time:'10:05',name:'Juan'},
  ],
};

/* ── SERVICIOS DE INMUEBLES ── */
let PROPERTY_SERVICES=[
  /* INM-001: Pendiente de firma y de inicio */
  {id:0,folio:'INM-001',tipo:'Limpieza post-construcción',
   descripcion:'Limpieza profunda tras remodelación de dos pisos de oficinas.',
   cliente:{nombre:'Corporativo Reforma S.A.',contacto:'Roberto Silva',tel:'+52 55 9900 0011',email:'rsilva@reforma.com'},
   inmueble:{tipo:'Oficina',direccion:'Paseo de la Reforma 222, Piso 5',colonia:'Cuauhtémoc',m2:220},
   frecuencia:'única',fechaInicio:'2026-05-06',fechaFin:'2026-05-06',hora:'08:00',
   status:'pendiente',contratoStatus:'por_firmar',supervisorId:0,
   pago:{metodo:'transferencia',periodicidad:'única',monto:22000},
   fiscal:{razonSocial:'Corporativo Reforma S.A. de C.V.',rfc:'CRE200101HDF',
     regimen:'601 - General de Ley Personas Morales',usoCFDI:'G03 - Gastos en general',
     dirFiscal:'Paseo de la Reforma 222, Col. Cuauhtémoc, CDMX, 06500'},
   notas:'Acceso por estacionamiento subterráneo nivel -1.',
   parentId:null,renovadoPor:null,createdAt:'2026-04-29'},

  /* INM-002: Contrato activo con firma, mantenimiento semanal */
  {id:1,folio:'INM-002',tipo:'Mantenimiento semanal',
   descripcion:'Limpieza de áreas comunes, lobby y pasillos cada lunes por 6 meses.',
   cliente:{nombre:'Hotel Roma Boutique',contacto:'Patricia León',tel:'+52 55 8800 0022',email:'pleon@romaboutique.com'},
   inmueble:{tipo:'Hotel',direccion:'Álvaro Obregón 88',colonia:'Roma Norte',m2:350},
   frecuencia:'semanal',fechaInicio:'2026-04-01',fechaFin:'2026-09-30',hora:'07:00',
   status:'activo',contratoStatus:'firmado',supervisorId:1,
   pago:{metodo:'transferencia',periodicidad:'mensual',monto:15600},
   fiscal:{razonSocial:'Hotel Roma Boutique S.A. de C.V.',rfc:'HRB190320ABC',
     regimen:'601 - General de Ley Personas Morales',usoCFDI:'G03 - Gastos en general',
     dirFiscal:'Álvaro Obregón 88, Col. Roma Norte, CDMX, 06700'},
   notas:'Coordinar con housekeeping. Entrada por servicio lateral.',
   clienteInmId:0,
   reportes:[
     {id:1001,fecha:'2026-04-28',hora:'08:15',supervisorNombre:'Marco Torres',actividades:'Limpieza completa de lobby y pasillos niveles 1-3. Vaciado de basureros, aspirado de alfombras en sala de eventos. Revisión y desinfección de baños en pisos 1-3. Limpieza de cristales en recepción.',observaciones:'Estado general bueno. Se detectó mancha en alfombra de sala de juntas, señalada con cinta para seguimiento en próxima visita. Foco fundido en pasillo norte piso 2, reportado a mantenimiento del hotel.',fotos:[]},
     {id:1002,fecha:'2026-04-21',hora:'07:45',supervisorNombre:'Marco Torres',actividades:'Mantenimiento semanal completo: áreas comunes, lobby y pasillos. Limpieza de cristales en entrada principal. Desinfección de manijas, botoneras de elevadores y superficies de alto contacto.',observaciones:'Excelente estado general. Sin incidencias. El equipo llegó puntual y completó todas las actividades en tiempo.',fotos:[]},
     {id:1003,fecha:'2026-04-14',hora:'08:00',supervisorNombre:'Marco Torres',actividades:'Limpieza profunda de áreas comunes. Lavado de alfombras en sala de conferencias. Pulido de pisos en lobby principal. Revisión de bodegas de servicio.',observaciones:'Se detectó humedad en baño de planta baja esquina noreste. Se reportó formalmente a mantenimiento del hotel para atención. El resto del inmueble en óptimas condiciones.',fotos:[]},
     {id:1004,fecha:'2026-04-07',hora:'07:50',supervisorNombre:'Marco Torres',actividades:'Rutina semanal: limpieza de áreas comunes, pasillos, lobby, baños. Reposición de insumos en baños de uso común.',observaciones:'Sin incidencias. Mancha de café en tapete del lobby fue tratada satisfactoriamente.',fotos:[]},
   ],
   parentId:null,renovadoPor:null,createdAt:'2026-03-15'},

  /* INM-003: Vencido — fue renovado como INM-004 */
  {id:2,folio:'INM-003',tipo:'Limpieza mensual de unidad residencial',
   descripcion:'Limpieza mensual de depto y áreas comunes. Contrato original vencido.',
   cliente:{nombre:'Inmobiliaria Narvarte',contacto:'Carlos Fuentes',tel:'+52 55 7700 0033',email:'cfuentes@narvarte.com'},
   inmueble:{tipo:'Departamento',direccion:'Eje 7 Sur 420, Depto 3B',colonia:'Narvarte Oriente',m2:85},
   frecuencia:'mensual',fechaInicio:'2026-01-15',fechaFin:'2026-03-15',hora:'10:00',
   status:'vencido',contratoStatus:'firmado',supervisorId:0,
   pago:{metodo:'cheque',periodicidad:'mensual',monto:8500},
   fiscal:{razonSocial:'Inmobiliaria Narvarte S.C.',rfc:'INA151001XYZ',
     regimen:'612 - Personas Físicas con Actividades Empresariales',usoCFDI:'G03 - Gastos en general',
     dirFiscal:'Eje 7 Sur 420, Col. Narvarte Oriente, CDMX, 03020'},
   notas:'Llave disponible con el portero. Contrato original renovado.',
   parentId:null,renovadoPor:3,createdAt:'2026-01-10'},

  /* INM-004: Renovación de INM-003 — activo */
  {id:3,folio:'INM-004',tipo:'Limpieza mensual de unidad residencial',
   descripcion:'Renovación — limpieza mensual ampliada de depto y áreas comunes del edificio.',
   cliente:{nombre:'Inmobiliaria Narvarte',contacto:'Carlos Fuentes',tel:'+52 55 7700 0033',email:'cfuentes@narvarte.com'},
   inmueble:{tipo:'Departamento',direccion:'Eje 7 Sur 420, Depto 3B',colonia:'Narvarte Oriente',m2:85},
   frecuencia:'mensual',fechaInicio:'2026-03-16',fechaFin:'2026-09-16',hora:'10:00',
   status:'activo',contratoStatus:'firmado',supervisorId:0,
   pago:{metodo:'cheque',periodicidad:'mensual',monto:9200},
   fiscal:{razonSocial:'Inmobiliaria Narvarte S.C.',rfc:'INA151001XYZ',
     regimen:'612 - Personas Físicas con Actividades Empresariales',usoCFDI:'G03 - Gastos en general',
     dirFiscal:'Eje 7 Sur 420, Col. Narvarte Oriente, CDMX, 03020'},
   notas:'Renovación del contrato INM-003. Incluye áreas comunes del edificio.',
   parentId:2,renovadoPor:null,createdAt:'2026-03-10'},
];
let propSvcFormOpen=false;

/* Solicitudes pendientes de aceptación por el trabajador */
let PENDING_REQUESTS=[
  {id:0,svc:'Lavado auto Sedán',fecha:'2026-04-28',hora:'09:00',durMax:45,zona:'Condesa',workerId:0,accepted:false,rejected:false,autoRejected:false,notified:false},
  {id:1,svc:'Auto SUV + interior',fecha:'2026-04-29',hora:'11:00',durMax:45,zona:'Roma',workerId:0,accepted:false,rejected:false,autoRejected:false,notified:false},
  {id:2,svc:'Pickup + interior',fecha:'2026-04-30',hora:'14:00',durMax:55,zona:'Polanco',workerId:0,accepted:false,rejected:false,autoRejected:false,notified:false},
];

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
