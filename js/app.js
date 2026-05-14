/* =====================================================
   AYALYM — Funciones de la aplicación
   ===================================================== */
function s$(n,sz=14){return Array.from({length:5},(_,i)=>`<span style="font-size:${sz}px;color:${i<Math.round(n)?'#EF9F27':'#D3D1C7'};">★</span>`).join('');}
function ss(id,n,sz=14){const el=document.getElementById(id);if(el)el.innerHTML=s$(n,sz);}
const rolColor=r=>({admin:'rb-admin',supervisor:'rb-supervisor',cliente:'rb-cliente',trabajador:'rb-trabajador',personal_inm:'rb-supervisor'}[r]||'rb-cliente');
const rolLabel=r=>({admin:'Administrador',supervisor:'Supervisor',cliente:'Cliente',trabajador:'Trabajador',personal_inm:'Personal Inmuebles'}[r]||r);
const avBgs={admin:'#EEEDFE',supervisor:'#E1F5EE',cliente:'#E6F1FB',trabajador:'#FAEEDA'};
const avCols={admin:'#3C3489',supervisor:'#085041',cliente:'#0C447C',trabajador:'#633806'};

/* ── Avatar helper: muestra foto de perfil o iniciales en un círculo.
   person  — objeto con .photo (base64 o null) e .initials (o .nombre/.name para auto-generar)
   size    — diámetro en px (default 32)
   bg      — color de fondo cuando no hay foto (default '#042C53')
   xStyle  — estilos inline adicionales (string, opcional) */
function _avHtml(person,size,bg,xStyle){
  const s=size||32;
  const background=bg||'#042C53';
  const initials=person?(person.initials||(person.nombre||person.name||'').split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()||'??'):'??';
  const fs=person&&person.photo?'0':Math.round(s*0.38)+'px';
  const inner=person&&person.photo
    ?`<img src="${person.photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
    :initials;
  const extra=xStyle?';'+xStyle:'';
  return`<div class="av" style="width:${s}px;height:${s}px;font-size:${fs};background:${background};flex-shrink:0${extra}">${inner}</div>`;
}

/* RECOVER */
function toggleRecover(){showLV('recover');}
function recoverStep1(){const e=document.getElementById('rec-email').value.trim();if(!e){showToast('amber','⚠️','Ingresa tu correo');return;}document.getElementById('rec-email-shown').textContent=e;document.getElementById('rec-1').className='recover-step';document.getElementById('rec-2').className='recover-step active';showToast('blue','📧','Código enviado (demo: cualquier código)');}
function recoverStep2(){const c=document.getElementById('rec-code').value.trim();if(!c){showToast('amber','⚠️','Ingresa el código');return;}document.getElementById('rec-2').className='recover-step';document.getElementById('rec-3').className='recover-step active';}
function recoverStep3(){const p1=document.getElementById('rec-newpass').value,p2=document.getElementById('rec-newpass2').value;if(p1.length<8){showToast('amber','⚠️','Mínimo 8 caracteres');return;}if(p1!==p2){showToast('red','❌','Las contraseñas no coinciden');return;}document.getElementById('rec-3').className='recover-step';document.getElementById('rec-4').className='recover-step active';}
function recoverBack(step){if(step===2){document.getElementById('rec-2').className='recover-step';document.getElementById('rec-1').className='recover-step active';}if(step===3){document.getElementById('rec-3').className='recover-step';document.getElementById('rec-2').className='recover-step active';}}
function finishRecover(){showLV('main');showToast('green','✅','Contraseña cambiada.');}
function setPersonaTipo(tipo){facturaPersonaTipo=tipo;document.getElementById('ptab-fisica').classList.toggle('active',tipo==='fisica');document.getElementById('ptab-moral').classList.toggle('active',tipo==='moral');document.getElementById('pf-fisica').classList.toggle('active',tipo==='fisica');document.getElementById('pf-moral').classList.toggle('active',tipo==='moral');}

/* CLEANING TYPES */
function renderCleaningTypesForClient(){
  const el=document.getElementById('cleaning-types-list');if(!el)return;
  const active=CLEANING_TYPES.filter(ct=>ct.activo!==false);
  // If selected type was deactivated, reset to first active
  if(!active.find(ct=>ct.id===selectedCleanTypeId)&&active.length){selectedCleanTypeId=active[0].id;}
  el.innerHTML=active.map(ct=>`
    <div class="clean-type-card${ct.id===selectedCleanTypeId?' selected':''}" onclick="selectCleanType('${ct.id}',this)">
      <div class="clean-type-radio"></div>
      <div class="clean-type-info"><p>${ct.nombre}</p><span>${ct.descripcion}</span></div>
      <span class="clean-type-price">${ct.factor===1.0?'Incluido':'+'+Math.round((ct.factor-1)*100)+'%'}</span>
    </div>`).join('');
  updateDurationBanner();
}

/* Populate #svc select from active SVC_TYPES */
function renderSvcSelect(){
  const el=document.getElementById('svc');if(!el)return;
  const active=SVC_TYPES.filter(s=>s.activo!==false);
  el.innerHTML=active.map(s=>`<option value="${s.id}">${s.nombre}</option>`).join('');
  onSvcChange();
}

/* Devuelve true si hoy quedan slots válidos para el servicio seleccionado
   (hora actual + 30 min de anticipación, al menos un trabajador libre) */
function _todayHasSlots(){
  const svcEl=document.getElementById('svc');if(!svcEl)return false;
  const svc=svcEl.value;
  const svcData=SVC_TYPES.find(s=>s.id===svc)||{durMax:90};
  const ct=CLEANING_TYPES.find(c=>c.id===selectedCleanTypeId)||{factor:1.0};
  const durMax=Math.round(svcData.durMax*(ct.factor||1));
  const today=new Date().toISOString().split('T')[0];
  const now=new Date();
  const nowMin=now.getHours()*60+now.getMinutes()+30; // 30 min de anticipación mínima
  const slots=['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00'];
  const workers=WORKERS.filter(w=>w.status!=='inactive'&&w.zonas.includes(clientZoneId)&&w.type.includes(svc));
  if(!workers.length)return false;
  return slots.some(sl=>{
    const[sh,sm]=sl.split(':').map(Number);
    const sMin=sh*60+sm;
    if(sMin<nowMin)return false;           // slot ya pasó o no alcanza el aviso
    if(sMin>17*60)return false;            // último inicio permitido: 17:00
    return workers.some(w=>{
      const dayJobs=w.todayJobs.filter(j=>j.fecha===today);
      return !dayJobs.some(j=>{
        const[jh,jm]=j.hora.split(':').map(Number);
        const jS=jh*60+jm,jE=jS+j.durMax+BUFFER_MIN;
        return sMin<jE&&jS<eMin;
      });
    });
  });
}

/* Returns a date string offset by N days from today */
function _dateOffsetStr(days){const d=new Date();d.setDate(d.getDate()+days);return d.toISOString().split('T')[0];}

/* Update fecha input min/max according to the currently selected urgency */
function _updateFechaByUrgencia(){
  const urg=_getSelectedUrgencia();
  const fechaEl=document.getElementById('fecha');
  if(!fechaEl)return;
  const minD=urg?(urg.diasMin||0):0;
  const maxD=urg&&urg.diasMax!=null?urg.diasMax:null;
  const minStr=_dateOffsetStr(minD);
  const maxStr=maxD!=null?_dateOffsetStr(maxD):'';
  fechaEl.min=minStr;
  fechaEl.max=maxStr;
  // Reset value if out of new range
  if(!fechaEl.value||fechaEl.value<minStr||(maxStr&&fechaEl.value>maxStr)){
    fechaEl.value=minStr;
  }
  // Also update the warn hint below the date input
  const warn=document.getElementById('fecha-warn');
  if(warn&&urg){
    if(urg.diasMin===urg.diasMax){
      warn.style.display='block';warn.style.color='#185FA5';
      warn.textContent=`📅 "${urg.nombre}": solo disponible ${urg.diasMin===0?'hoy':_dateOffsetStr(urg.diasMin)}.`;
    }else if(maxD!=null){
      warn.style.display='block';warn.style.color='#185FA5';
      warn.textContent=`📅 "${urg.nombre}": puedes agendar entre ${urg.diasMin} y ${maxD} días adelante.`;
    }else{
      warn.style.display='none';warn.style.color='';
    }
  }
}

/* Populate #urgencia select from active URGENCIAS */
function renderUrgenciaSelect(){
  const el=document.getElementById('urgencia');if(!el)return;
  const active=URGENCIAS.filter(u=>u.activo!==false);
  const hasToday=_todayHasSlots();
  // Mostrar/ocultar aviso sin slots hoy
  const warn=document.getElementById('urg-no-today-warn');if(warn)warn.style.display=hasToday?'none':'block';
  // Renderizar opciones; deshabilitar las que requieren hoy si no hay slots
  el.innerHTML=active.map(u=>{
    const needsToday=u.modo==='mismo_dia'||u.modo==='minutos';
    const off=needsToday&&!hasToday;
    const rangeHint=u.diasMin===u.diasMax?(u.diasMin===0?' — hoy':` — en ${u.diasMin} día(s)`):(u.diasMax!=null?` — ${u.diasMin}-${u.diasMax} días`:'');
    return`<option value="${u.pct}" data-uid="${u.id}"${off?' disabled':''}>${u.nombre}${u.pct>0?' (+'+u.pct+'%)':''}${rangeHint}${off?' · sin horarios hoy':''}</option>`;
  }).join('');
  // Si la opción seleccionada está deshabilitada, elegir la primera disponible
  if(el.selectedIndex>=0&&el.options[el.selectedIndex]&&el.options[el.selectedIndex].disabled){
    for(let i=0;i<el.options.length;i++){if(!el.options[i].disabled){el.selectedIndex=i;break;}}
  }
  _updateFechaByUrgencia();
  calcPrice();
}
function selectCleanType(id,card){
  selectedCleanTypeId=id;
  document.querySelectorAll('.clean-type-card').forEach(c=>c.classList.remove('selected'));
  card.classList.add('selected');
  calcPrice();updateDurationBanner();renderTimeSlots();
}
function updateDurationBanner(){
  const svc=document.getElementById('svc').value;
  const svcData=SVC_TYPES.find(s=>s.id===svc)||{durMin:60,durMax:90};
  const ct=CLEANING_TYPES.find(c=>c.id===selectedCleanTypeId)||{factor:1.0};
  const min=Math.round(svcData.durMin*ct.factor);
  const max=Math.round(svcData.durMax*ct.factor);
  const el=document.getElementById('dur-banner-text');
  if(el)el.textContent=min<60?(min+' min'):(Math.floor(min/60)+'h'+(min%60?(' '+min%60+' min'):''))+' – '+(max<60?(max+' min'):(Math.floor(max/60)+'h'+(max%60?(' '+max%60+' min'):'')));
}

function renderTimeSlots(){
  const section=document.getElementById('time-slots-section'),list=document.getElementById('time-slots-list');
  if(!section||!list)return;
  const svc=document.getElementById('svc').value;
  const svcData=SVC_TYPES.find(s=>s.id===svc)||{durMin:60,durMax:90};
  const ct=CLEANING_TYPES.find(c=>c.id===selectedCleanTypeId)||{factor:1.0};
  const durMax=Math.round(svcData.durMax*ct.factor);
  const fechaEl=document.getElementById('fecha');
  const selectedDate=fechaEl?fechaEl.value:'';
  const slots=['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00'];
  // Filter slots using ONLY the selected worker's agenda
  const workerToCheck=selectedWorkerId!==null?WORKERS.find(w=>w.id===selectedWorkerId):null;
  const checkWorkers=workerToCheck?[workerToCheck]:WORKERS.filter(w=>w.zonas.includes(clientZoneId)&&w.type.includes(svc)&&w.status!=='inactive');
  const available=slots.filter(sl=>{
    const[sh,sm]=sl.split(':').map(Number);
    const newStartMin=sh*60+sm;
    const newEndMin=newStartMin+durMax+BUFFER_MIN;
    if(newStartMin>17*60)return false;    // último inicio permitido: 17:00
    return checkWorkers.some(w=>{
      const dayJobs=selectedDate?w.todayJobs.filter(j=>j.fecha===selectedDate):w.todayJobs;
      return !dayJobs.some(j=>{
        const[jh,jm]=j.hora.split(':').map(Number);
        const jStartMin=jh*60+jm;
        const jEndMin=jStartMin+j.durMax+BUFFER_MIN;
        return newStartMin<jEndMin && jStartMin<newEndMin;
      });
    });
  });
  section.style.display='block';
  const wName=workerToCheck?` de ${workerToCheck.name.split(' ')[0]}`:'';
  list.innerHTML=available.map(sl=>`<button class="svc-tab${selectedTimeSlot===sl?' active':''}" onclick="selectSlot('${sl}',this)">${sl}</button>`).join('')||`<p style="font-size:12px;color:#185FA5;">No hay horarios disponibles${wName} para esta fecha</p>`;
}
function selectSlot(sl,btn){selectedTimeSlot=sl;document.querySelectorAll('#time-slots-list .svc-tab').forEach(b=>b.classList.remove('active'));btn.classList.add('active');updateReservarBtn();}

/* FINANCIAL */
function setDateFilter(mode,btn){dateFilterMode=mode;document.querySelectorAll('.df-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');['dia','mes','año','rango'].forEach(m=>{const el=document.getElementById('di-'+m);if(el)el.classList.toggle('show',m===mode);});renderFinance();}
/* ── Financiero: calcula rango de fechas según filtro activo ── */
function _getFinanceDateRange(){
  const hoy=new Date().toISOString().split('T')[0];
  let label,desde,hasta;
  if(dateFilterMode==='dia'){
    const v=(document.getElementById('fi-dia')||{}).value||hoy;
    desde=hasta=v;
    label=new Date(v+'T12:00:00').toLocaleDateString('es-MX',{weekday:'long',year:'numeric',month:'long',day:'numeric'});
  }else if(dateFilterMode==='mes'){
    const m=parseInt((document.getElementById('fi-mes')||{}).value||new Date().getMonth()+1);
    const a=parseInt((document.getElementById('fi-mes-año')||{}).value||new Date().getFullYear());
    desde=`${a}-${String(m).padStart(2,'0')}-01`;
    hasta=`${a}-${String(m).padStart(2,'0')}-${new Date(a,m,0).getDate()}`;
    label=MESES[m-1]+' '+a;
  }else if(dateFilterMode==='año'){
    const a=parseInt((document.getElementById('fi-año')||{}).value||new Date().getFullYear());
    desde=`${a}-01-01`;hasta=`${a}-12-31`;label='Año '+a;
  }else{
    desde=(document.getElementById('fi-rango-inicio')||{}).value||hoy.slice(0,8)+'01';
    hasta=(document.getElementById('fi-rango-fin')||{}).value||hoy;
    if(hasta<desde)return null;
    const d1=new Date(desde+'T12:00:00'),d2=new Date(hasta+'T12:00:00');
    const dias=Math.round((d2-d1)/864e5)+1;
    label=`${d1.toLocaleDateString('es-MX',{day:'numeric',month:'short',year:'numeric'})} — ${d2.toLocaleDateString('es-MX',{day:'numeric',month:'short',year:'numeric'})} (${dias} día${dias!==1?'s':''})`;
  }
  return{desde,hasta,label};
}
/* Compatibilidad: getFinanceData() sigue existiendo para otros usos */
function getFinanceData(){
  const r=_getFinanceDateRange();if(!r)return null;
  const{desde,hasta,label}=r;
  const contratos=PROPERTY_SERVICES.filter(ps=>{const fi=ps.fechaInicio||'';const ff=ps.fechaFin||'';return fi<=hasta&&(!ff||ff>=desde);});
  const ingresos=contratos.reduce((a,ps)=>a+(parseFloat(ps.pago?.monto)||0),0);
  return{ingresos,utilidad:Math.round(ingresos*.5),comisionNeta:Math.round(ingresos*.5),descuentos:0,servicios:contratos.length,label,contratos,desde,hasta};
}

function renderFinance(){
  const r=_getFinanceDateRange();
  if(!r){showToast('amber','⚠️','La fecha inicio debe ser anterior a la fecha fin');return;}
  const{desde,hasta,label}=r;
  document.getElementById('finance-period-label').textContent=label;

  /* ── SECCIÓN 1: Contratos de inmuebles ── */
  const contratos=PROPERTY_SERVICES.filter(ps=>{
    const fi=ps.fechaInicio||'';const ff=ps.fechaFin||'';
    return fi<=hasta&&(!ff||ff>=desde);
  });
  const ingresosInm=contratos.reduce((a,ps)=>a+(parseFloat(ps.pago?.monto)||0),0);

  /* ── SECCIÓN 2: Servicios de limpieza reservados y completados ── */
  const _parseMonto=s=>parseFloat((s||'').replace(/[^0-9.]/g,''))||0;
  const facturasEnPeriodo=(SOLICITUDES_FACTURA||[]).filter(f=>f.fecha>=desde&&f.fecha<=hasta);
  const ingresosFacturas=facturasEnPeriodo.reduce((a,f)=>a+_parseMonto(f.total),0);
  const utilidadSvc=Math.round(ingresosFacturas*.5);
  const pagoTrabajadorSvc=Math.round(ingresosFacturas*.5);

  document.getElementById('finance-grid').innerHTML=`
    <div style="grid-column:1/-1;font-size:12px;font-weight:600;color:#185FA5;text-transform:uppercase;letter-spacing:.5px;padding-bottom:4px;border-bottom:.5px solid #B5D4F4;margin-bottom:4px;">🏢 Contratos de inmuebles</div>
    <div class="fc fc-income"><p>Ingresos contratos</p><span class="amount">$${ingresosInm.toLocaleString('es-MX')}</span><small>${contratos.length} contrato${contratos.length!==1?'s':''} vigente${contratos.length!==1?'s':''}</small></div>
    <div style="grid-column:1/-1;font-size:12px;font-weight:600;color:#185FA5;text-transform:uppercase;letter-spacing:.5px;padding:12px 0 4px;border-bottom:.5px solid #B5D4F4;margin-top:8px;">🧹 Servicios de limpieza (reservados y completados)</div>
    <div class="fc fc-discount"><p>Servicios completados</p><span class="amount">${facturasEnPeriodo.length}</span><small>En el período</small></div>
    <div class="fc fc-income" style="background:linear-gradient(135deg,#065535,#0A8754);"><p>Ingresos (servicios)</p><span class="amount">$${ingresosFacturas.toLocaleString('es-MX')}</span><small>Total reservas completadas</small></div>
    <div class="fc fc-utility"><p>Utilidad AYALYM (50%)</p><span class="amount">$${utilidadSvc.toLocaleString('es-MX')}</span><small>Margen de servicios</small></div>
    <div class="fc fc-workers"><p>Pago trabajador (50%)</p><span class="amount">$${pagoTrabajadorSvc.toLocaleString('es-MX')}</span><small>Destinado a trabajadores</small></div>`;

  /* Detalle de contratos */
  const rowsInm=contratos.length
    ?contratos.map(ps=>`
      <div class="fin-detail-row">
        <span><strong style="font-size:11px;">${ps.folio}</strong> ${ps.cliente?.nombre||'—'}</span>
        <span style="text-align:right;white-space:nowrap;">${ps.pago?.monto?'$'+(parseFloat(ps.pago.monto)||0).toLocaleString('es-MX'):'—'}<span style="font-size:10px;color:#5C7A9A;margin-left:4px;">/${ps.pago?.periodicidad||'—'}</span></span>
      </div>`).join('')
    :`<div style="padding:10px;text-align:center;font-size:13px;color:#185FA5;">Sin contratos activos en este período</div>`;

  /* Detalle de servicios a domicilio */
  const rowsSvcs=facturasEnPeriodo.length
    ?facturasEnPeriodo.map(f=>`
      <div class="fin-detail-row">
        <span><strong style="font-size:11px;">${f.fecha}</strong> ${f.clienteNombre} · <em style="color:#5C7A9A;">${f.svc}</em></span>
        <span style="text-align:right;white-space:nowrap;color:#065535;font-weight:500;">${f.total||'—'}</span>
      </div>`).join('')
    :`<div style="padding:10px;text-align:center;font-size:13px;color:#185FA5;">Sin servicios con factura en este período</div>`;

  document.getElementById('finance-detail').innerHTML=`
    <p style="font-size:11px;font-weight:600;color:#042C53;margin-bottom:6px;">🏢 Detalle contratos de inmuebles</p>
    <div class="fin-detail-row" style="border-bottom:.5px solid #D1E4F6;padding-bottom:4px;margin-bottom:4px;">
      <span style="font-weight:600;color:#042C53;">Contrato</span><span style="font-weight:600;color:#042C53;">Monto / periodicidad</span>
    </div>
    ${rowsInm}
    ${contratos.length?`<div class="fin-detail-row" style="margin-top:4px;"><span style="font-weight:600;">Total inmuebles</span><span style="font-weight:600;color:#065535;">$${ingresosInm.toLocaleString('es-MX')}</span></div>`:''}
    <p style="font-size:11px;font-weight:600;color:#042C53;margin:14px 0 6px;">🧹 Detalle servicios a domicilio (facturados)</p>
    <div class="fin-detail-row" style="border-bottom:.5px solid #D1E4F6;padding-bottom:4px;margin-bottom:4px;">
      <span style="font-weight:600;color:#042C53;">Fecha · Cliente · Servicio</span><span style="font-weight:600;color:#042C53;">Total</span>
    </div>
    ${rowsSvcs}
    ${facturasEnPeriodo.length?`<div class="fin-detail-row" style="margin-top:4px;"><span style="font-weight:600;">Total servicios facturados</span><span style="font-weight:600;color:#065535;">$${ingresosFacturas.toLocaleString('es-MX')}</span></div>`:''}`;
}

/* ── Tab Resumen — visión general del negocio con datos reales ── */
function renderAdminResumen(){
  const panel=document.getElementById('dash-panel');if(!panel)return;
  const hoy=new Date().toISOString().split('T')[0];
  const wActivos=WORKERS.filter(w=>w.status==='active').length;
  const wOcupados=WORKERS.filter(w=>w.status==='busy').length;
  const wInactivos=WORKERS.filter(w=>w.status==='inactive').length;
  const totalSvcs=WORKERS.reduce((a,w)=>a+w.services,0);
  const allRevs=WORKERS.flatMap(w=>w.reviews);
  const avgRating=allRevs.length?(allRevs.reduce((a,r)=>a+r.stars,0)/allRevs.length):0;
  const cActivos=PROPERTY_SERVICES.filter(p=>p.status==='activo');
  const cPendientes=PROPERTY_SERVICES.filter(p=>p.status==='pendiente');
  /* Ingreso mensual estimado de contratos activos (normalizando periodicidad a mensual) */
  const ingresoMensual=cActivos.reduce((a,ps)=>{
    const m=parseFloat(ps.pago?.monto)||0;
    const p=ps.pago?.periodicidad||'mensual';
    if(p==='quincenal')return a+m*2;
    if(p==='semanal')return a+m*4;
    if(p==='única')return a+m;
    return a+m; /* mensual por defecto */
  },0);
  /* Contratos que vencen pronto (próximos 30 días) */
  const limite=new Date();limite.setDate(limite.getDate()+30);
  const limitStr=limite.toISOString().split('T')[0];
  const porVencer=cActivos.filter(p=>p.fechaFin&&p.fechaFin>=hoy&&p.fechaFin<=limitStr);
  /* Asistencias hoy (personal_inm) */
  const conEntrada=PERSONAL_INM.filter(p=>p.asistencias?.find(a=>a.fecha===hoy&&a.entrada));
  const recientes=[...PROPERTY_SERVICES].sort((a,b)=>(b.createdAt||'').localeCompare(a.createdAt||'')).slice(0,4);
  panel.innerHTML=`
    <p class="dash-section-title" style="margin-top:0;">👥 Equipo de trabajo</p>
    <div class="dash-kpi-grid">
      <div class="dash-kpi green"><p>Trabajadores activos</p><span>${wActivos}</span></div>
      <div class="dash-kpi" style="background:#FAEEDA;"><p>En servicio ahora</p><span style="color:#633806;">${wOcupados}</span></div>
      <div class="dash-kpi red"><p>Inactivos</p><span>${wInactivos}</span></div>
      <div class="dash-kpi"><p>Supervisores</p><span>${SUPERVISORS.length}</span></div>
      <div class="dash-kpi"><p>Personal Inmuebles</p><span>${PERSONAL_INM.length}</span></div>
      <div class="dash-kpi${conEntrada.length?'':' red'}"><p>Entrada registrada hoy</p><span>${conEntrada.length}/${PERSONAL_INM.length}</span></div>
    </div>
    <p class="dash-section-title">🏢 Contratos de inmuebles</p>
    <div class="dash-kpi-grid">
      <div class="dash-kpi accent"><p>Contratos activos</p><span>${cActivos.length}</span></div>
      <div class="dash-kpi" style="background:#FAEEDA;"><p>Pendientes firma</p><span style="color:#633806;">${cPendientes.length}</span></div>
      <div class="dash-kpi green"><p>Ingreso mensual est.</p><span style="font-size:${ingresoMensual>0?'14px':'20px'};">${ingresoMensual>0?'$'+Math.round(ingresoMensual).toLocaleString('es-MX'):'$0'}</span></div>
      <div class="dash-kpi${porVencer.length?'':''}" style="${porVencer.length?'background:#FAEEDA;':''}"><p>Vencen en 30 días</p><span style="${porVencer.length?'color:#633806;':''}">${porVencer.length}</span></div>
    </div>
    <p class="dash-section-title">📊 Actividad de limpieza</p>
    <div class="dash-kpi-grid">
      <div class="dash-kpi accent"><p>Servicios acumulados</p><span>${totalSvcs.toLocaleString('es-MX')}</span></div>
      <div class="dash-kpi green"><p>Calificación promedio</p><span>${avgRating?avgRating.toFixed(1)+' ★':'—'}</span></div>
      <div class="dash-kpi"><p>Total reseñas</p><span>${allRevs.length}</span></div>
      <div class="dash-kpi"><p>Clientes registrados</p><span>${USERS.filter(u=>u.rol==='cliente'||u.rol==='cliente_inm').length}</span></div>
    </div>
    ${recientes.length?`
    <p class="dash-section-title">🕐 Contratos recientes</p>
    ${recientes.map(ps=>{
      const sc=ps.status==='activo'?'b-activo':ps.status==='pendiente'?'bwarn':'b-inactivo';
      const sl={activo:'Activo',pendiente:'Pendiente',completado:'Completado',cancelado:'Cancelado'}[ps.status]||ps.status||'—';
      return`<div class="dash-rank-row">
        <div style="width:34px;height:34px;border-radius:8px;background:#E6F1FB;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;">🏢</div>
        <div class="dash-rank-info">
          <p>${ps.folio} — ${ps.cliente?.nombre||'—'}</p>
          <span>${ps.tipo||'—'} · ${(ps.inmueble?.direccion||'—').split(',')[0]}</span>
        </div>
        <div style="text-align:right;min-width:80px;">
          <p style="font-size:12px;font-weight:600;color:#042C53;">${ps.pago?.monto?'$'+(parseFloat(ps.pago.monto)||0).toLocaleString('es-MX'):'—'}</p>
          <span class="badge ${sc}" style="font-size:10px;">${sl}</span>
        </div>
      </div>`;
    }).join('')}`:''}`;
}

/* NOTIFICATIONS */
let _notifListener=null;
let _fcmDeviceId=null;

/* ═══════════════════════════════════════════════════════
   PWA — Instalar en pantalla de inicio
   ═══════════════════════════════════════════════════════ */
let _pwaPrompt=null;

/* Android/Chrome: captura el evento de instalación */
window.addEventListener('beforeinstallprompt',e=>{
  e.preventDefault();
  _pwaPrompt=e;
  const btn=document.getElementById('btn-install-pwa');
  if(btn)btn.style.display='flex';
});

/* Ocultar botón si ya se instaló */
window.addEventListener('appinstalled',()=>{
  _pwaPrompt=null;
  const btn=document.getElementById('btn-install-pwa');
  if(btn)btn.style.display='none';
});

/* iOS: muestra modal con instrucciones de Safari */
function _showIOSInstallModal(){
  if(document.getElementById('ios-install-modal'))return;
  const m=document.createElement('div');
  m.id='ios-install-modal';
  m.style.cssText='position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:99999;display:flex;align-items:flex-end;';
  m.innerHTML=`<div style="background:#fff;border-radius:20px 20px 0 0;padding:24px 20px calc(24px + env(safe-area-inset-bottom,0px));width:100%;text-align:center;">
    <div style="width:40px;height:4px;background:#ddd;border-radius:2px;margin:0 auto 20px;"></div>
    <p style="font-size:16px;font-weight:700;color:#042C53;margin-bottom:6px;">Agregar a pantalla de inicio</p>
    <p style="font-size:13px;color:#5C7A9A;margin-bottom:18px;">Sigue estos pasos en Safari:</p>
    <div style="text-align:left;background:#F4F8FF;border-radius:12px;padding:16px;margin-bottom:20px;">
      <p style="font-size:13px;color:#042C53;margin:0 0 10px;"><strong>1.</strong> Toca el botón <strong>Compartir</strong> ⬆️ en la barra inferior de Safari</p>
      <p style="font-size:13px;color:#042C53;margin:0 0 10px;"><strong>2.</strong> Desliza y elige <strong>"Agregar a pantalla de inicio"</strong> 📲</p>
      <p style="font-size:13px;color:#042C53;margin:0;"><strong>3.</strong> Toca <strong>"Agregar"</strong> arriba a la derecha</p>
    </div>
    <button onclick="document.getElementById('ios-install-modal').remove()" style="background:#185FA5;color:#fff;border:none;border-radius:10px;padding:13px 0;font-size:14px;font-weight:600;width:100%;cursor:pointer;">Entendido</button>
  </div>`;
  m.addEventListener('click',e=>{if(e.target===m)m.remove();});
  document.body.appendChild(m);
}

/* Llamado al tocar "📲 Instalar" en el header */
async function installPWA(){
  const isStandalone=window.matchMedia('(display-mode: standalone)').matches||window.navigator.standalone;
  if(isStandalone){showToast('green','📱','La app ya está instalada');return;}
  const isIOS=/iphone|ipad|ipod/i.test(navigator.userAgent);
  if(isIOS){_showIOSInstallModal();return;}
  if(_pwaPrompt){
    _pwaPrompt.prompt();
    const{outcome}=await _pwaPrompt.userChoice;
    _pwaPrompt=null;
    if(outcome==='accepted'){
      showToast('green','📱','¡App instalada correctamente!');
      const btn=document.getElementById('btn-install-pwa');
      if(btn)btn.style.display='none';
    }
  }
}

/* Mostrar botón en iOS aunque no haya beforeinstallprompt */
(function(){
  const isIOS=/iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone=window.navigator.standalone;
  if(isIOS&&!isStandalone){
    document.addEventListener('DOMContentLoaded',()=>{
      const btn=document.getElementById('btn-install-pwa');
      if(btn)btn.style.display='flex';
    });
  }
})();

/* VAPID public key (debe coincidir con la del servidor) */
const _VAPID_PUBLIC='BODy9QBNnNx_TyTwD62uDqYfszR9dBtz_qO6umCLHcqUHPza6cuJIj_9enoiY-wdR2L6JLQWtjmbUsjL7mzHRZ8';

/* Convierte la VAPID key base64url a Uint8Array para la API de Push */
function _vapidToUint8(base64String){
  const pad=base64String.replace(/-/g,'+').replace(/_/g,'/');
  const raw=atob(pad);
  return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)));
}

/* ── Web Push: suscribir este dispositivo al rol ── */
async function _subscribePush(role,reg){
  try{
    let sub=await reg.pushManager.getSubscription();
    if(!sub){
      sub=await reg.pushManager.subscribe({
        userVisibleOnly:true,
        applicationServerKey:_vapidToUint8(_VAPID_PUBLIC)
      });
    }
    fbSavePushSub(role,_fcmDeviceId,sub);
    console.log('[push] suscripción registrada para rol:',role);
  }catch(e){console.warn('[push] subscribe failed:',e.message);}
}

/* ── Banner flotante que pide activar notificaciones (requiere gesto del usuario) ── */
function _showPushBanner(role){
  if(document.getElementById('push-banner'))return;
  const b=document.createElement('div');
  b.id='push-banner';
  b.innerHTML=`<div style="position:fixed;bottom:80px;left:12px;right:12px;background:#185FA5;color:#fff;border-radius:14px;padding:14px 16px;display:flex;align-items:center;gap:12px;z-index:9999;box-shadow:0 4px 24px rgba(0,0,0,.35);">
    <span style="font-size:24px;flex-shrink:0;">🔔</span>
    <div style="flex:1;min-width:0;">
      <p style="font-size:13px;font-weight:600;margin:0 0 2px;">Activar notificaciones</p>
      <p style="font-size:11px;margin:0;opacity:.85;">Recibe alertas aunque la app esté cerrada</p>
    </div>
    <button onclick="_enablePushFromBanner('${role}')" style="background:#fff;color:#185FA5;border:none;border-radius:8px;padding:8px 14px;font-size:12px;font-weight:700;cursor:pointer;flex-shrink:0;">Activar</button>
    <button onclick="document.getElementById('push-banner').remove()" style="background:none;border:none;color:rgba(255,255,255,.7);font-size:20px;cursor:pointer;line-height:1;padding:0 2px;flex-shrink:0;">✕</button>
  </div>`;
  document.body.appendChild(b);
}

/* Llamado al tocar "Activar" en el banner — ya tiene gesto del usuario */
async function _enablePushFromBanner(role){
  const b=document.getElementById('push-banner');if(b)b.remove();
  try{
    const perm=await Notification.requestPermission();
    if(perm!=='granted'){showToast('amber','🔔','Notificaciones no activadas');return;}
    const reg=await navigator.serviceWorker.getRegistration('/firebase-messaging-sw.js');
    if(!reg)return;
    await _subscribePush(role,reg);
    showToast('green','🔔','¡Notificaciones activadas!');
  }catch(e){console.warn('[push] enable failed:',e.message);}
}

/* ── Inicializa push al login: automático si ya hay permiso, banner si no ── */
async function _initFCMPush(role){
  try{
    if(!('serviceWorker' in navigator)||!('PushManager' in window))return;
    /* ID único del dispositivo */
    _fcmDeviceId=localStorage.getItem('_ayalym_did');
    if(!_fcmDeviceId){
      _fcmDeviceId='dev_'+Math.random().toString(36).slice(2)+Date.now();
      localStorage.setItem('_ayalym_did',_fcmDeviceId);
    }
    /* Registrar service worker (no necesita permiso) */
    const reg=await navigator.serviceWorker.register('/firebase-messaging-sw.js',{scope:'/'});
    await navigator.serviceWorker.ready;
    if(Notification.permission==='granted'){
      /* Ya tiene permiso → suscribir directamente */
      await _subscribePush(role,reg);
    }else if(Notification.permission==='default'){
      /* Sin respuesta → mostrar banner (requiere toque en móvil) */
      setTimeout(()=>_showPushBanner(role),2000);
    }
    /* Si es 'denied' → no hacer nada */
  }catch(e){console.warn('[push] init failed:',e.message);}
}

function updateNotifBadge(){
  const list=NOTIFICATIONS[currentRole]||[];
  const u=list.filter(n=>!n.read).length;
  const b=document.getElementById('notif-badge');
  if(b){b.textContent=u;b.classList.toggle('show',u>0);}
}

function toggleNotifPanel(){
  notifPanelOpen=!notifPanelOpen;
  document.getElementById('notif-panel').classList.toggle('open',notifPanelOpen);
  if(notifPanelOpen)renderNotifications();
}

function _fmtNotifTime(n){
  if(!n.createdAt)return n.time||'';
  const d=new Date(n.createdAt);
  const now=new Date();
  const diffMs=now-d;
  const diffMin=Math.floor(diffMs/60000);
  if(diffMin<1)return'ahora';
  if(diffMin<60)return diffMin+'m';
  const diffH=Math.floor(diffMin/60);
  if(diffH<24)return diffH+'h';
  return`${d.getDate()}/${d.getMonth()+1}`;
}

function renderNotifications(){
  const list=NOTIFICATIONS[currentRole]||[];
  const tc={green:'#EAF3DE',blue:'#E6F1FB',amber:'#FAEEDA',red:'#FCEBEB',purple:'#EEEDFE'};
  document.getElementById('notif-list').innerHTML=list.length?list.map(n=>{
    const did=n._docId||'';
    const canResched=currentRole==='cliente'&&n.reqId!=null;
    const reschedBtn=canResched?`<button class="btn-sm" style="margin-top:7px;font-size:11px;padding:4px 12px;" onclick="event.stopPropagation();markRead('${currentRole}','${did}');openReschedule(${n.reqId})">📅 Reprogramar →</button>`:'';
    return`<div class="notif-item${n.read?'':' unread'}" onclick="markRead('${currentRole}','${did}')">
      <div class="notif-icon" style="background:${tc[n.type]||'#E6F1FB'};">${n.icon}</div>
      <div class="notif-body"><p>${n.title}</p><span>${n.body}</span>${reschedBtn}</div>
      <span class="notif-time">${_fmtNotifTime(n)}</span>
    </div>`;
  }).join(''):`<div style="text-align:center;padding:1.5rem;font-size:13px;color:#185FA5;">Sin notificaciones</div>`;
}

function markRead(role,docId){
  const list=NOTIFICATIONS[role]||[];
  const n=list.find(x=>x._docId===String(docId));
  if(!n||n.read)return;
  n.read=true;
  if(n._docId)fbMarkNotifRead(n._docId);
  renderNotifications();updateNotifBadge();
}

function markAllRead(){
  const list=NOTIFICATIONS[currentRole]||[];
  const unread=list.filter(n=>!n.read);
  if(!unread.length)return;
  unread.forEach(n=>{n.read=true;});
  fbMarkAllNotifsRead(currentRole);
  renderNotifications();updateNotifBadge();
}

function pushNotif(role,icon,type,title,body,reqId=null){
  const now=new Date();
  const n={
    destinatario:role,icon,type,title,body,reqId,
    time:_nowTime(),read:false,createdAt:now.getTime()
  };
  fbPushNotif(n);
  /* Actualización inmediata en memoria mientras llega el snapshot */
  if(!NOTIFICATIONS[role])NOTIFICATIONS[role]=[];
  NOTIFICATIONS[role].unshift({...n,_docId:'_tmp_'+Date.now()});
  if(role===currentRole){updateNotifBadge();if(notifPanelOpen)renderNotifications();}
  /* Push en background: leer suscripciones del rol y enviar vía servidor */
  fbGetPushSubs(role).then(function(subscriptions){
    if(!subscriptions.length)return;
    fetch('/api/push',{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({subscriptions,title,body})
    }).catch(function(){});
  }).catch(function(){});
}

function _startNotifListener(role){
  if(_notifListener){_notifListener();_notifListener=null;}
  if(!NOTIFICATIONS[role])NOTIFICATIONS[role]=[];
  _notifListener=fbListenNotifs(role,function(notifs){
    NOTIFICATIONS[role]=notifs;
    updateNotifBadge();
    if(notifPanelOpen)renderNotifications();
  });
}

function _stopNotifListener(){
  if(_notifListener){_notifListener();_notifListener=null;}
}

/* LOGIN */
function switchClientTab(tab){['login','registro'].forEach(t=>{document.getElementById('ctab-'+t).classList.toggle('active',t===tab);document.getElementById('view-'+t).classList.toggle('active',t===tab);});}
function showStaffPanel(){document.getElementById('client-panel').style.display='none';document.getElementById('staff-access-link').style.display='none';document.getElementById('staff-panel').classList.add('open');}
function showClientPanel(){document.getElementById('client-panel').style.display='';document.getElementById('staff-access-link').style.display='';document.getElementById('staff-panel').classList.remove('open');}
function selStaffRole(r){staffRole=r;['trabajador','supervisor','admin','personal_inm'].forEach(x=>document.getElementById('srole-'+x).classList.toggle('active',x===r));document.getElementById('hint-role').textContent={trabajador:'Trabajador',supervisor:'Supervisor',admin:'Administrador',personal_inm:'Personal Inmuebles'}[r];}
/* --- Login unificado --- */
function showLV(view){
  ['main','register','recover'].forEach(function(v){
    var el=document.getElementById('lv-'+v);
    if(el)el.style.display=v===view?'':'none';
  });
  if(view==='recover'){
    ['rec-1','rec-2','rec-3','rec-4'].forEach(function(id,i){
      var el=document.getElementById(id);
      if(el)el.className='recover-step'+(i===0?' active':'');
    });
  }
}
function showClientPanel(){showLV('main');}
function togglePassVis(id,btn){
  var el=document.getElementById(id);if(!el)return;
  el.type=el.type==='password'?'text':'password';
  btn.textContent=el.type==='password'?'👁':'🙈';
}
function doLogin(){
  var e=document.getElementById('login-email').value.trim(),p=document.getElementById('login-pass').value.trim();
  if(!e||!p){showToast('amber','⚠️','Ingresa tu correo y contraseña');return;}
  var user=USERS.find(function(u){return u.email===e;});
  if(!user){showToast('red','❌','Correo o contraseña incorrectos');return;}
  if(user.password&&user.password!==p){showToast('red','❌','Correo o contraseña incorrectos');return;}
  if(!user.activo){showToast('red','🔒','Tu cuenta ha sido desactivada. Contacta al administrador.');return;}
  if(user.accesoRevocado){showToast('red','🔒','Tu acceso ha sido revocado. Contacta al administrador.');return;}
  currentUserEmail=e; /* guardar email del usuario logueado */
  saveSession(e);
  if(user.rol==='cliente_inm'){
    var ci=CLIENTS_INM.find(function(c){return c.email===e;});
    if(!ci||ci.activo===false){showToast('red','🔒','Cuenta sin acceso activo. Contacta al administrador.');return;}
    currentClientInmId=ci.id;
    launchApp('cliente_inm',ci.nombre,'');
  }else if(user.rol==='personal_inm'){
    var pi=PERSONAL_INM.find(function(x){return x.email===e;});
    if(!pi||pi.activo===false){showToast('red','🔒','Cuenta sin acceso activo.');return;}
    currentPersonalId=pi.id;
    launchApp('personal_inm',user.nombre,'');
  }else{
    launchApp(user.rol,user.nombre,'');
  }
}
function doClientLogin(){doLogin();}
function doStaffLogin(){doLogin();}
function switchClientTab(){}
function showStaffPanel(){}
function selStaffRole(){}
function doClientLogin_OLD(){
  const e=document.getElementById('c-login-email').value.trim(),p=document.getElementById('c-login-pass').value.trim();
  if(!e||!p){showToast('amber','⚠️','Ingresa tu correo y contraseña');return;}
  const user=USERS.find(u=>u.email===e);
  if(!user){showToast('red','❌','Correo o contraseña incorrectos');return;}
  if(user.rol!=='cliente'&&user.rol!=='cliente_inm'){showToast('red','🔒','Esta cuenta no corresponde a un cliente. Usa el acceso para personal.');return;}
  if(user.password&&user.password!==p){showToast('red','❌','Correo o contraseña incorrectos');return;}
  if(!user.activo){showToast('red','🔒','Tu cuenta ha sido desactivada. Contacta a soporte.');return;}
  if(user.accesoRevocado){showToast('red','🔒','Tu acceso ha sido revocado. Contacta a soporte.');return;}
  if(user.rol==='cliente_inm'){
    const ci=CLIENTS_INM.find(c=>c.email===e);
    if(!ci||ci.activo===false){showToast('red','🔒','Cuenta sin acceso activo. Contacta al administrador.');return;}
    currentClientInmId=ci.id;
    launchApp('cliente_inm',ci.nombre,'');
  }else{
    launchApp('cliente',user.nombre,'Narvarte / Del Valle');
  }
}
function doStaffLogin(){
  const e=document.getElementById('s-email').value.trim(),p=document.getElementById('s-pass').value.trim();
  if(!e||!p){showToast('amber','⚠️','Ingresa correo y contraseña');return;}
  const user=USERS.find(u=>u.email===e);
  if(!user||user.rol==='cliente'||user.rol==='cliente_inm'){showToast('red','❌','Correo o contraseña incorrectos');return;}
  if(user.password&&user.password!==p){showToast('red','❌','Correo o contraseña incorrectos');return;}
  if(!user.activo){showToast('red','🔒','Tu cuenta ha sido desactivada. Contacta al administrador.');return;}
  if(user.accesoRevocado){showToast('red','🔒','Tu acceso ha sido revocado. Contacta al administrador.');return;}
  if(user.rol==='personal_inm'){
    const pi=PERSONAL_INM.find(x=>x.email===e);
    if(!pi||pi.activo===false){showToast('red','🔒','Cuenta sin acceso activo.');return;}
    currentPersonalId=pi.id;
  }
  launchApp(user.rol,user.nombre,'');
}
function changePassword(role){
  const emails={cliente:'ana@cliente.com',trabajador:'juan@ayalym.com',supervisor:'laura@ayalym.com'};
  const email=currentUserEmail||emails[role];
  const curr=document.getElementById('cp-current-'+role).value;
  const n1=document.getElementById('cp-new1-'+role).value;
  const n2=document.getElementById('cp-new2-'+role).value;
  const user=USERS.find(u=>u.email===email);
  if(!user)return;
  if(user.password&&curr!==user.password){showToast('red','❌','La contraseña actual es incorrecta');return;}
  if(n1.length<8){showToast('amber','⚠️','La nueva contraseña debe tener mínimo 8 caracteres');return;}
  if(n1!==n2){showToast('red','❌','Las contraseñas nuevas no coinciden');return;}
  user.password=n1;
  ['cp-current-'+role,'cp-new1-'+role,'cp-new2-'+role].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  document.getElementById('cp-panel-'+role).classList.remove('open');
  showToast('green','✅','Contraseña actualizada correctamente');
}
function toggleCpPanel(role){const el=document.getElementById('cp-panel-'+role);if(el)el.classList.toggle('open');}
function doClientRegister(){
  var nombre=(document.getElementById('r-nombre').value.trim()+' '+document.getElementById('r-apellido').value.trim()).trim();
  var email=document.getElementById('r-email')?document.getElementById('r-email').value.trim():'';
  var tel=document.getElementById('r-tel')?document.getElementById('r-tel').value.trim():'';
  var pass=document.getElementById('r-pass')?document.getElementById('r-pass').value:'';
  var zEl=document.getElementById('r-zona');
  var zId=zEl?zEl.value:'';

  if(!nombre){showToast('amber','⚠️','Ingresa tu nombre');return;}
  if(!email){showToast('amber','⚠️','Ingresa tu correo');return;}
  if(!pass||pass.length<8){showToast('amber','⚠️','La contraseña debe tener mínimo 8 caracteres');return;}
  if(USERS.find(function(u){return u.email===email;})){
    showToast('red','❌','Este correo ya tiene una cuenta. Inicia sesión.');return;
  }

  var zData=ZONAS.find(function(z){return z.id===zId&&z.activo!==false;});
  if(zId&&zData) clientZoneId=zId;
  var zonaDisplay=zData?zData.nombre:'Sin zona';

  /* Crear usuario y guardar en Firestore */
  var newId=USERS.length?Math.max.apply(null,USERS.map(function(u){return u.id;}))+1:100;
  USERS.push({id:newId,nombre:nombre,email:email,password:pass,rol:'cliente',activo:true,accesoRevocado:false,zona:zId||'narvarte',tel:tel});
  fbSaveUsers();

  /* Sesión */
  currentUserEmail=email;
  saveSession(email);

  /* Limpiar datos demo — nuevo usuario empieza sin historial */
  clientReviews=[];
  clientDirecciones=[];
  clientDiscount=0;

  showLV('main');
  launchApp('cliente',nombre,zonaDisplay);
  showToast('green','✅','¡Bienvenido/a, '+nombre.split(' ')[0]+'! Tu cuenta fue creada.');
}
function regNext(step){if(step===1){if(!document.getElementById('r-nombre').value.trim()||!document.getElementById('r-email').value.trim()){showToast('amber','⚠️','Completa nombre y correo');return;}document.getElementById('reg-step-1').style.display='none';document.getElementById('reg-step-2').style.display='block';document.getElementById('sd-2').classList.add('done');renderRegisterZoneSelect();}else if(step===2){const p=document.getElementById('r-pass').value,p2=document.getElementById('r-pass2').value;if(p.length<8){showToast('amber','⚠️','Mínimo 8 caracteres');return;}if(p!==p2){showToast('red','❌','Las contraseñas no coinciden');return;}const zEl=document.getElementById('r-zona');const zNombre=zEl.options[zEl.selectedIndex]?zEl.options[zEl.selectedIndex].text:'No seleccionada';document.getElementById('r-summary').innerHTML=`Nombre: <strong>${document.getElementById('r-nombre').value+' '+document.getElementById('r-apellido').value}</strong><br>Correo: <strong>${document.getElementById('r-email').value}</strong><br>Zona: <strong>${zNombre}</strong>`;document.getElementById('reg-step-2').style.display='none';document.getElementById('reg-step-3').style.display='block';document.getElementById('sd-3').classList.add('done');}}
function regBack(step){if(step===2){document.getElementById('reg-step-2').style.display='none';document.getElementById('reg-step-1').style.display='block';document.getElementById('sd-2').classList.remove('done');}if(step===3){document.getElementById('reg-step-3').style.display='none';document.getElementById('reg-step-2').style.display='block';document.getElementById('sd-3').classList.remove('done');}}

/* ── Persiste direcciones del cliente en su entrada de USERS/Firestore ── */
function _saveClientDirs(){
  const u=USERS.find(u=>u.email===currentUserEmail&&(u.rol==='cliente'||u.rol==='cliente_inm'));
  if(!u)return;
  u.direcciones=clientDirecciones.slice();
  fbSaveUsers();
}

/* ── DIRECCIONES DEL CLIENTE ── */
function renderClientDirs(){
  const el=document.getElementById('client-dirs-list');if(!el)return;
  if(!clientDirecciones.length){
    el.innerHTML='<p style="font-size:12px;color:#185FA5;text-align:center;padding:8px 0;">No tienes direcciones guardadas aún.</p>';
    return;
  }
  el.innerHTML=clientDirecciones.map(d=>`
    <div class="cdir-card">
      <div class="cdir-info">
        <p class="cdir-alias">${d.alias}</p>
        <p class="cdir-addr">${d.calle}, ${d.colonia}${d.cp?' · CP '+d.cp:''}</p>
        ${d.ref?`<p class="cdir-ref">${d.ref}</p>`:''}
      </div>
      <button class="btn-danger" style="padding:4px 10px;font-size:11px;flex-shrink:0;" onclick="deleteClientDir(${d.id})">✕</button>
    </div>`).join('');
}
function renderResDirs(){
  const el=document.getElementById('res-dir-section');if(!el)return;
  if(!clientDirecciones.length){el.innerHTML='';return;}
  el.innerHTML=clientDirecciones.map(d=>`
    <div class="res-dir-card${selectedDirId===d.id?' selected':''}" onclick="selectResDir(${d.id})">
      <div class="res-dir-radio${selectedDirId===d.id?' checked':''}"></div>
      <div class="res-dir-info">
        <p class="res-dir-alias">${d.alias}</p>
        <p class="res-dir-addr">${d.calle}, ${d.colonia}${d.cp?' · CP '+d.cp:''}</p>
        ${d.ref?`<p class="res-dir-ref">${d.ref}</p>`:''}
      </div>
    </div>`).join('')+
    `<div class="res-dir-card${selectedDirId===0?' selected':''}" onclick="selectResDir(0)">
      <div class="res-dir-radio${selectedDirId===0?' checked':''}"></div>
      <div class="res-dir-info"><p class="res-dir-alias">✏️ Otra dirección</p><p class="res-dir-addr">Ingresar una dirección diferente</p></div>
    </div>`;
  // If a saved address is selected, pre-fill the form inputs
  if(selectedDirId&&selectedDirId!==0){
    const d=clientDirecciones.find(x=>x.id===selectedDirId);
    if(d){
      const set=(id,v)=>{const e=document.getElementById(id);if(e)e.value=v;};
      set('res-calle',d.calle);set('res-colonia',d.colonia);set('res-cp',d.cp||'');set('res-ref',d.ref||'');
    }
  } else if(selectedDirId===0){
    // Clear when "Otra dirección" is chosen so user types fresh
    ['res-calle','res-colonia','res-cp','res-ref'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
  }
}
function selectResDir(id){
  selectedDirId=id;
  renderResDirs();
}
function addClientDir(){
  const alias=(document.getElementById('nd-alias')||{}).value?.trim()||'';
  const calle=(document.getElementById('nd-calle')||{}).value?.trim()||'';
  const colonia=(document.getElementById('nd-colonia')||{}).value?.trim()||'';
  const cp=(document.getElementById('nd-cp')||{}).value?.trim()||'';
  const ref=(document.getElementById('nd-ref')||{}).value?.trim()||'';
  if(!alias||!calle||!colonia){showToast('amber','⚠️','Completa alias, calle y colonia');return;}
  const maxId=clientDirecciones.reduce((m,d)=>Math.max(m,d.id),0);
  clientDirecciones.push({id:maxId+1,alias,calle,colonia,cp,ref});
  ['nd-alias','nd-calle','nd-colonia','nd-cp','nd-ref'].forEach(id=>{const e=document.getElementById(id);if(e)e.value='';});
  const form=document.getElementById('add-dir-form');if(form)form.style.display='none';
  _saveClientDirs();
  renderClientDirs();
  showToast('green','✅','Dirección guardada');
}
function deleteClientDir(id){
  clientDirecciones=clientDirecciones.filter(d=>d.id!==id);
  if(selectedDirId===id)selectedDirId=null;
  _saveClientDirs();
  renderClientDirs();
  showToast('green','✅','Dirección eliminada');
}
function toggleAddDirForm(){
  const el=document.getElementById('add-dir-form');if(el)el.style.display=el.style.display==='none'?'block':'none';
}

/* ── FOTO DE TRABAJADOR ── */
function openWorkerPhotoUpload(){
  const inp=document.getElementById('worker-photo-input');if(inp)inp.click();
}
function handleWorkerPhotoFile(input){
  const file=input.files[0];if(!file)return;
  if(file.size>3*1024*1024){showToast('amber','⚠️','La foto debe pesar menos de 3 MB');input.value='';return;}
  const reader=new FileReader();
  reader.onload=function(e){
    const b64=e.target.result;
    if(currentWorkerRef){
      currentWorkerRef.photo=b64;
      // Actualizar avatar de perfil
      const av=document.getElementById('t-profile-av');
      if(av){av.innerHTML=`<img src="${b64}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;av.style.fontSize='0';av.style.padding='0';}
      // Actualizar header
      const hav=document.getElementById('header-av');
      if(hav){hav.innerHTML=`<img src="${b64}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;hav.style.fontSize='0';}
      if(typeof fbSaveWorkers==='function')fbSaveWorkers();
      showToast('green','📷','¡Foto actualizada!');
    }
    input.value='';
  };
  reader.readAsDataURL(file);
}
/* ── Foto de perfil del cliente ── */
function clientUploadPhoto(){
  const inp=document.getElementById('perfil-photo-input');if(inp)inp.click();
}
function handleClientPhotoChange(e){
  const file=e.target.files[0];if(!file)return;
  if(file.size>3*1024*1024){showToast('amber','⚠️','La foto debe pesar menos de 3 MB');e.target.value='';return;}
  const reader=new FileReader();
  reader.onload=function(ev){
    const b64=ev.target.result;
    /* Actualizar avatar en perfil y header */
    ['perfil-av','c-user-av','header-av'].forEach(id=>{
      const el=document.getElementById(id);if(!el)return;
      el.innerHTML=`<img src="${b64}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
      el.style.fontSize='0';
    });
    /* Guardar en USERS y Firestore */
    const u=USERS.find(u=>u.email===currentUserEmail&&(u.rol==='cliente'||u.rol==='cliente_inm'));
    if(u){u.photo=b64;fbSaveUsers();}
    showToast('green','📷','Foto de perfil actualizada');
    e.target.value='';
  };
  reader.readAsDataURL(file);
}

/* Admin sube foto de un trabajador */
function adminUploadWorkerPhoto(wid){
  let inp=document.getElementById('admin-photo-input-'+wid);
  if(!inp){inp=document.createElement('input');inp.type='file';inp.accept='image/*';inp.id='admin-photo-input-'+wid;inp.style.display='none';inp.onchange=function(){handleAdminWorkerPhotoFile(inp,wid);};document.body.appendChild(inp);}
  inp.click();
}
function handleAdminWorkerPhotoFile(input,wid){
  const file=input.files[0];if(!file)return;
  if(file.size>3*1024*1024){showToast('amber','⚠️','La foto debe pesar menos de 3 MB');input.value='';return;}
  const reader=new FileReader();
  reader.onload=function(e){
    const b64=e.target.result;
    const w=WORKERS.find(x=>x.id===wid);if(w)w.photo=b64;
    if(typeof fbSaveWorkers==='function')fbSaveWorkers();
    renderUsersPanel();renderStaffList(null);
    showToast('green','📷',`Foto actualizada para ${w?w.name:'trabajador'}`);
    input.value='';
  };
  reader.readAsDataURL(file);
}

/* Admin sube foto de un supervisor */
function adminUploadSupervisorPhoto(svId){
  let inp=document.getElementById('admin-sv-photo-input-'+svId);
  if(!inp){inp=document.createElement('input');inp.type='file';inp.accept='image/*';inp.id='admin-sv-photo-input-'+svId;inp.style.display='none';inp.onchange=function(){handleAdminSupervisorPhotoFile(inp,svId);};document.body.appendChild(inp);}
  inp.click();
}
function handleAdminSupervisorPhotoFile(input,svId){
  const file=input.files[0];if(!file)return;
  if(file.size>3*1024*1024){showToast('amber','⚠️','La foto debe pesar menos de 3 MB');input.value='';return;}
  const reader=new FileReader();
  reader.onload=function(e){
    const b64=e.target.result;
    const sv=SUPERVISORS.find(x=>x.id===svId);if(sv)sv.photo=b64;
    if(typeof fbSaveSupervisors==='function')fbSaveSupervisors();
    renderUsersPanel();renderSupervisorsPanel();
    showToast('green','📷',`Foto actualizada para ${sv?sv.name:'supervisor'}`);
    input.value='';
  };
  reader.readAsDataURL(file);
}
/* Admin sube foto de personal inmuebles */
function adminUploadPersonalInmPhoto(pid){
  let inp=document.getElementById('admin-pi-photo-input-'+pid);
  if(!inp){inp=document.createElement('input');inp.type='file';inp.accept='image/*';inp.id='admin-pi-photo-input-'+pid;inp.style.display='none';inp.onchange=function(){handleAdminPersonalInmPhotoFile(inp,pid);};document.body.appendChild(inp);}
  inp.click();
}
function handleAdminPersonalInmPhotoFile(input,pid){
  const file=input.files[0];if(!file)return;
  if(file.size>3*1024*1024){showToast('amber','⚠️','La foto debe pesar menos de 3 MB');input.value='';return;}
  const reader=new FileReader();
  reader.onload=function(e){
    const b64=e.target.result;
    const p=PERSONAL_INM.find(x=>x.id===pid);if(p)p.photo=b64;
    if(typeof fbSavePersonalInm==='function')fbSavePersonalInm();
    renderUsersPanel();
    showToast('green','📷',`Foto actualizada para ${p?p.nombre:'personal'}`);
    input.value='';
  };
  reader.readAsDataURL(file);
}
/* Cliente inmuebles sube su propia foto */
function uploadCinmPhoto(){
  let inp=document.getElementById('cinm-photo-input');
  if(!inp){inp=document.createElement('input');inp.type='file';inp.accept='image/*';inp.id='cinm-photo-input';inp.style.display='none';inp.onchange=function(){handleCinmPhotoFile(inp);};document.body.appendChild(inp);}
  inp.click();
}
function handleCinmPhotoFile(input){
  const file=input.files[0];if(!file)return;
  if(file.size>3*1024*1024){showToast('amber','⚠️','La foto debe pesar menos de 3 MB');input.value='';return;}
  const reader=new FileReader();
  reader.onload=function(e){
    const b64=e.target.result;
    const ci=CLIENTS_INM[currentClientInmId];if(ci)ci.photo=b64;
    // Actualizar header
    const hav=document.getElementById('header-av');
    if(hav){hav.innerHTML=`<img src="${b64}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;hav.style.fontSize='0';}
    if(typeof fbSaveClientsInm==='function')fbSaveClientsInm();
    renderClienteInmPerfil();
    showToast('green','📷','¡Foto de perfil actualizada!');
    input.value='';
  };
  reader.readAsDataURL(file);
}

/* ── RESERVA WIZARD ── */
var promoAplicada = null; /* promo seleccionada en el paso 4 */

function resetReserva(){
  [1,2,3,4].forEach(i=>{const el=document.getElementById('res-step-'+i);if(el)el.style.display=i===1?'block':'none';});
  ['rs-1','rs-2','rs-3','rs-4'].forEach((id,i)=>{const el=document.getElementById(id);if(el)el.classList.toggle('done',i===0);});
  promoAplicada=null;
  selectedTimeSlot='';selectedWorkerId=null;selectedDirId=null;
  ['res-calle','res-colonia','res-cp','res-ref'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  const fechaEl=document.getElementById('fecha');if(fechaEl){const t=new Date().toISOString().split('T')[0];if(!fechaEl.value)fechaEl.value=t;fechaEl.min=t;}
  const fwarn=document.getElementById('fecha-warn');if(fwarn)fwarn.style.display='none';
  const tss=document.getElementById('time-slots-section');if(tss)tss.style.display='none';
  renderResDirs();
  renderCleaningTypesForClient();calcPrice();updateReservarBtn();
}
function reservaNext(step){
  if(step===1){
    const svc=document.getElementById('svc').value;
    if(svc==='tapiceria'&&!uploadedFiles.length){showToast('amber','⚠️','Sube al menos una foto del mueble para continuar');return;}
    const calle=(document.getElementById('res-calle')||{}).value?.trim()||'';
    const colonia=(document.getElementById('res-colonia')||{}).value?.trim()||'';
    if(!calle||!colonia){showToast('amber','⚠️','Ingresa la dirección completa del servicio');return;}
    calcPrice();updateDurationBanner();
    document.getElementById('res-step-1').style.display='none';
    document.getElementById('res-step-2').style.display='block';
    document.getElementById('rs-2').classList.add('done');
    renderUrgenciaSelect();
    _updateUrgStep2Hint();
    renderWorkersByZone();
  }else if(step===2){
    if(selectedWorkerId===null){showToast('amber','⚠️','Selecciona un trabajador para continuar');return;}
    document.getElementById('res-step-2').style.display='none';
    document.getElementById('res-step-3').style.display='block';
    document.getElementById('rs-3').classList.add('done');
    renderSelectedWorkerCard();
    const fechaEl=document.getElementById('fecha');
    if(fechaEl&&fechaEl.value)onFechaChange();else renderTimeSlots();
  }else if(step===3){
    if(!selectedTimeSlot){showToast('amber','⚠️','Selecciona un horario disponible para continuar');return;}
    const fechaEl=document.getElementById('fecha');
    if(!fechaEl||!fechaEl.value){showToast('amber','⚠️','Selecciona una fecha');return;}
    // Validate urgency day range
    const urg3=_getSelectedUrgencia();
    if(urg3){
      const today3=new Date();today3.setHours(0,0,0,0);
      const sel3=new Date(fechaEl.value+'T00:00:00');
      const diff3=Math.round((sel3-today3)/864e5);
      const minD=urg3.diasMin||0,maxD=urg3.diasMax!=null?urg3.diasMax:9999;
      if(diff3<minD||diff3>maxD){showToast('amber','⚠️',`La urgencia "${urg3.nombre}" permite agendar entre ${minD} y ${maxD} día(s) adelante`);return;}
    }
    document.getElementById('res-step-3').style.display='none';
    document.getElementById('res-step-4').style.display='block';
    document.getElementById('rs-4').classList.add('done');
    populatePromoSelect();calcPrice();updateReservarBtn();
  }
}
function reservaBack(step){
  if(step===2){
    document.getElementById('res-step-2').style.display='none';
    document.getElementById('res-step-1').style.display='block';
    document.getElementById('rs-2').classList.remove('done');
  }else if(step===3){
    document.getElementById('res-step-3').style.display='none';
    document.getElementById('res-step-2').style.display='block';
    document.getElementById('rs-3').classList.remove('done');
    selectedTimeSlot='';
    renderWorkersByZone();
  }else if(step===4){
    document.getElementById('res-step-4').style.display='none';
    document.getElementById('res-step-3').style.display='block';
    document.getElementById('rs-4').classList.remove('done');
  }
}
function renderSelectedWorkerCard(){
  const el=document.getElementById('step3-worker-card');
  if(!el)return;
  if(selectedWorkerId===null){el.style.display='none';return;}
  const w=WORKERS.find(x=>x.id===selectedWorkerId);
  if(!w){el.style.display='none';return;}
  const ph=w.photo?`<img src="${w.photo}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`:w.initials;
  el.style.display='flex';
  el.innerHTML=`<div class="av" style="width:38px;height:38px;font-size:12px;flex-shrink:0;">${ph}</div><div style="flex:1;"><p style="font-size:13px;font-weight:500;color:#042C53;">${w.name}</p><p style="font-size:11px;color:#185FA5;">${s$(w.rating,11)} ${w.rating.toFixed(1)}</p></div><button class="btn-light" style="font-size:11px;padding:3px 10px;" onclick="goBackToWorkerSelect()">Cambiar</button>`;
}
function goBackToWorkerSelect(){
  selectedWorkerId=null;selectedTimeSlot='';
  document.getElementById('res-step-3').style.display='none';
  document.getElementById('res-step-2').style.display='block';
  document.getElementById('rs-3').classList.remove('done');
  renderWorkersByZone();
}

function launchApp(role,nombre,zona){
  /* Cargar radio de geovalla guardado por el admin (si existe) */
  const _savedGeoR=fbGetLoadedGeoRadio();if(_savedGeoR)GEO_RADIO_M=_savedGeoR;
  document.getElementById('screen-login').classList.remove('active');document.getElementById('screen-app').classList.add('active');
  window.scrollTo({top:0,behavior:'instant'});
  currentRole=role;
  _startNotifListener(role);
  _initFCMPush(role);
  // ── Header: nombre + rol + avatar ──
  const init=nombre.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
  const avBg={cliente:'#0C447C',trabajador:'#633806',supervisor:'#085041',admin:'#3C3489',cliente_inm:'#065535',personal_inm:'#5B2C6F'}[role]||'#042C53';
  const av=document.getElementById('header-av');if(av){av.textContent=init;av.style.background=avBg;}
  const uname=document.getElementById('header-uname');if(uname)uname.textContent=nombre;
  const urole=document.getElementById('header-urole');if(urole)urole.textContent={cliente:'Cliente',trabajador:'Trabajador',supervisor:'Supervisor',admin:'Administrador',cliente_inm:'Cliente Inmuebles',personal_inm:'Personal Inmuebles'}[role];
  document.querySelectorAll('.role-section').forEach(s=>s.style.display='none');
  document.getElementById('role-'+role).style.display='block';
  updateNotifBadge();
  if(role==='cliente'){
    // Avatar e iniciales
    const cUser=USERS.find(u=>u.email===currentUserEmail&&(u.rol==='cliente'||u.rol==='cliente_inm'));
    const cPhoto=cUser?.photo||null;
    ['c-user-av','perfil-av'].forEach(id=>{
      const el=document.getElementById(id);if(!el)return;
      if(cPhoto){el.innerHTML=`<img src="${cPhoto}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;el.style.fontSize='0';}
      else{el.textContent=init;el.style.fontSize=id==='perfil-av'?'18px':'13px';}
    });
    ['c-user-name','perfil-name'].forEach(id=>{const el=document.getElementById(id);if(el)el.textContent=nombre;});
    const emailEl=document.getElementById('perfil-email');if(emailEl)emailEl.textContent=currentUserEmail;
    const uz=document.getElementById('c-user-zona');if(uz)uz.textContent=zona;
    // Sincronizar panel de zona en perfil
    const zonaData=ZONAS.find(z=>z.id===clientZoneId&&z.activo!==false)||ZONAS.find(z=>z.activo!==false);
    if(zonaData){const zn=document.getElementById('zone-current-name'),zc=document.getElementById('zone-current-cols');if(zn)zn.textContent=zonaData.nombre;if(zc)zc.textContent=zonaData.colonias;if(uz)uz.textContent=zonaData.nombre;}
    // Cargar direcciones guardadas de Firestore
    clientDirecciones=cUser?.direcciones||[];
    const todayStr=new Date().toISOString().split('T')[0];
    const fechaEl=document.getElementById('fecha');if(fechaEl){fechaEl.value=todayStr;fechaEl.min=todayStr;}
    renderSvcSelect();renderUrgenciaSelect();
    resetReserva();renderClientHistorial();updateClientAvg();renderClientUbicacion();
    renderChatBox('c-t','c','chat-c-t');renderChatBox('c-a','c','chat-c-a');
    renderClientPromos();renderClientDirs();
    setTimeout(()=>renderClienteResumen(),600);
  }
  if(role==='trabajador'){
    // Inicializar estado desde WORKERS.status (independiente de USERS.activo)
    // USERS.activo controla el login; WORKERS.status controla disponibilidad para reservas
    let wRef=WORKERS.find(x=>x.name===nombre);
    if(!wRef){
      const init2=nombre.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
      const newWId=WORKERS.length?Math.max(...WORKERS.map(w=>w.id))+1:0;
      wRef={id:newWId,name:nombre,initials:init2,photo:null,type:[],zonas:[],status:'active',rating:0,services:0,since:new Date().getFullYear(),desc:'',mapX:50,mapY:50,tiempoLlegada:30,reviews:[],todayJobs:[]};
      WORKERS.push(wRef);
      fbSaveWorkers();
    }
    currentWorkerRef=wRef; /* fijar referencia global al trabajador logueado */
    workerActive=wRef?wRef.status!=='inactive':true; /* leer disponibilidad de WORKERS, no de USERS */
    // ── Actualizar tarjeta de perfil del trabajador ──
    const tProfName=document.getElementById('t-profile-name');if(tProfName)tProfName.textContent=nombre;
    const tProfType=document.getElementById('t-profile-type');
    if(tProfType&&wRef)tProfType.textContent=(wRef.type||[]).map(t=>({depto:'Departamentos',auto:'Lavado de autos',tapiceria:'Tapicería'}[t]||t)).join(' · ');
    // ── Mostrar foto o iniciales en avatar de perfil ──
    const tAvEl=document.getElementById('t-profile-av');
    if(tAvEl){
      if(wRef&&wRef.photo){tAvEl.innerHTML=`<img src="${wRef.photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;tAvEl.style.fontSize='0';tAvEl.style.padding='0';}
      else{tAvEl.textContent=init;tAvEl.style.fontSize='15px';tAvEl.style.padding='';}
    }
    // También actualizar el header avatar si hay foto
    const headerAv=document.getElementById('header-av');
    if(headerAv&&wRef&&wRef.photo){headerAv.innerHTML=`<img src="${wRef.photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;headerAv.style.fontSize='0';}
    // ── Actualizar contacto del supervisor en el chat del trabajador ──
    const mySv=wRef?SUPERVISORS.find(sv=>sv.assignedWorkers.includes(wRef.id)):null;
    const svInit2=mySv?mySv.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase():'SV';
    const tSvAv=document.getElementById('t-sv-contact-av');if(tSvAv)tSvAv.textContent=svInit2;
    const tSvNm=document.getElementById('t-sv-contact-name');if(tSvNm)tSvNm.textContent=mySv?mySv.name:'Supervisor';
    const pill=document.getElementById('sp'),label=document.getElementById('wsl');
    if(label)label.innerHTML=workerActive?'Estatus: <strong style="color:#1A56DB;">Activo</strong>':'Estatus: <strong style="color:#888780;">Inactivo — no apareces disponible para reservas</strong>';
    if(pill){pill.textContent=workerActive?'Inactivarme':'Activarme';pill.className=workerActive?'status-pill sp-inactivar':'status-pill sp-activar';}
    const _wRating=wRef?wRef.rating||0:0;
    const _wReviews=wRef?(wRef.reviews||[]).length:0;
    ss('w-avg-stars',_wRating,15);
    const _sc=document.getElementById('w-avg-score');if(_sc)_sc.textContent=_wRating.toFixed(1);
    const _rv=document.getElementById('w-avg-reviews');if(_rv)_rv.textContent=_wReviews+' reseña'+(_wReviews===1?'':'s');
    renderWorkerQuincena();renderWorkerNotes();renderTrabajadorResumen();
    renderSolicitudes();renderWorkerAgenda();renderWorkerHistorial();
    renderChatBox('c-t','t','chat-t-c');renderChatBox('t-sv','t','chat-t-sv');renderChatBox('t-a','t','chat-t-a');
  }
  if(role==='supervisor'){
    currentSupervisorRef=SUPERVISORS.find(sv=>sv.name===nombre);
    if(!currentSupervisorRef){
      const svInit0=nombre.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
      const newSvId=SUPERVISORS.length?Math.max(...SUPERVISORS.map(s=>s.id))+1:0;
      currentSupervisorRef={id:newSvId,name:nombre,initials:svInit0,zonas:[],assignedWorkers:[],photo:null};
      SUPERVISORS.push(currentSupervisorRef);
      fbSaveSupervisors();
    }
    if(currentSupervisorRef){SUPERVISOR_ASSIGNED=currentSupervisorRef.assignedWorkers.slice();}
    // ── Actualizar tarjeta de perfil del supervisor ──
    const svInit=nombre.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
    const svAvEl=document.getElementById('sv-av-disp');if(svAvEl){if(currentSupervisorRef&&currentSupervisorRef.photo){svAvEl.innerHTML=`<img src="${currentSupervisorRef.photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;svAvEl.style.fontSize='0';}else{svAvEl.textContent=svInit;svAvEl.style.fontSize='15px';}}
    const svNmEl=document.getElementById('sv-name-disp');if(svNmEl)svNmEl.textContent=nombre;
    const svZnEl=document.getElementById('sv-zona-disp');
    if(svZnEl&&currentSupervisorRef)svZnEl.textContent='Zona '+(currentSupervisorRef.zonas||[]).join(' / ');
    const svJbEl=document.getElementById('sv-jobs-disp');
    if(svJbEl&&currentSupervisorRef){const _svW=WORKERS.filter(w=>currentSupervisorRef.assignedWorkers.includes(w.id));svJbEl.textContent=_svW.reduce((a,w)=>a+w.todayJobs.length,0);}
    // ── Mostrar foto del supervisor en header si existe ──
    const svHeaderAv=document.getElementById('header-av');
    if(svHeaderAv&&currentSupervisorRef&&currentSupervisorRef.photo){svHeaderAv.innerHTML=`<img src="${currentSupervisorRef.photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;svHeaderAv.style.fontSize='0';}
    renderSVWorkers();renderSVChatSelector();renderSVNotes();renderSupervisorResumen();
    renderChatBox('sv-a','sv','chat-sv-a');
    renderChatBox('c-t','sv','chat-sv-ct');
    renderChatBox('c-a','sv','chat-sv-ca');
    renderSVAstHoy();renderSVInmuebles();
  }
  if(role==='admin'){
    renderZonasAdmin();renderStaffList('all');renderLowReviews();renderRevBreakdown();renderUrgencias();
    renderSvcDurationList();renderCleaningTypesAdmin();drawMap('admin-map-svg',WORKERS);renderWorkerLocList();
    renderUsersPanel('all');renderQReport();renderConvs();renderSupervisorsPanel();renderAdminResumen();
    renderAdminNotes();renderTopCards();renderAdminKPIs();renderPropServices('all');
    renderChatBox('c-a','a','chat-a-c');renderChatBox('sv-a','a','chat-a-sv');renderChatBox('t-a','a','chat-a-t');
    populatePropSupervisorSelect();
  }
  if(role==='personal_inm'){
    const pi=PERSONAL_INM.find(p=>p.email===currentUserEmail||p.nombre===nombre);
    if(pi&&pi.photo){const hav=document.getElementById('header-av');if(hav){hav.innerHTML=`<img src="${pi.photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;hav.style.fontSize='0';}}
    renderPersonalInmPanel();
  }
  if(role==='cliente_inm'){
    const ci=CLIENTS_INM[currentClientInmId];
    if(ci&&ci.photo){const hav=document.getElementById('header-av');if(hav){hav.innerHTML=`<img src="${ci.photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;hav.style.fontSize='0';}}
    renderClienteInmInicio();
  }
  /* ── Inicializar chat flotante ── */
  setTimeout(initChatFab, 200);
}

function doLogout(){
  /* Cerrar todas las ventanas de chat flotante */
  const layer=document.getElementById('chat-float-layer');if(layer)layer.innerHTML='';
  chatFloatOpen={};chatUnread={};chatContactsOpen=false;
  const fab=document.getElementById('chat-fab');if(fab)fab.style.display='none';
  const pop=document.getElementById('chat-contacts-pop');if(pop)pop.classList.remove('open');
  document.getElementById('screen-app').classList.remove('active');document.getElementById('screen-login').classList.add('active');
  document.querySelectorAll('.role-section').forEach(s=>s.style.display='none');
  window.scrollTo({top:0,behavior:'instant'});
  ['login-email','login-pass'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});showLV('main');;
  uploadedFiles=[];clientDiscount=0;workerDeductions=[];selectedTimeSlot='';selectedWorkerId=null;fichaWorkerId=null;currentWorkerRef=null;currentSupervisorRef=null;currentUserEmail='';clearSession();
  if(typeof _stopAdminMapListener==='function')_stopAdminMapListener();
  if(typeof _stopSVMapListener==='function')_stopSVMapListener();
  _stopNotifListener();
  if(_fcmDeviceId)fbDeletePushSub(_fcmDeviceId);
  ['prev-wrap'].forEach(id=>{const el=document.getElementById(id);if(el)el.innerHTML='';});
  facturaOn=false;const ft=document.getElementById('ftoggle');if(ft)ft.classList.remove('on');const ff=document.getElementById('ffields');if(ff)ff.classList.remove('show');
  document.getElementById('ficha-ov').classList.remove('open');document.getElementById('notif-panel').classList.remove('open');notifPanelOpen=false;
  document.getElementById('reg-step-1').style.display='block';document.getElementById('reg-step-2').style.display='none';document.getElementById('reg-step-3').style.display='none';
  ['sd-1','sd-2','sd-3'].forEach((id,i)=>{const el=document.getElementById(id);if(el)el.classList.toggle('done',i===0);});
  [1,2,3,4].forEach(i=>{const el=document.getElementById('res-step-'+i);if(el)el.style.display=i===1?'block':'none';});
  ['rs-1','rs-2','rs-3','rs-4'].forEach((id,i)=>{const el=document.getElementById(id);if(el)el.classList.toggle('done',i===0);});
  switchClientTab('login');
}

function navGo(role,sec,btn){
  const pfx={cliente:'c-',trabajador:'t-',supervisor:'sv-',admin:'a-',personal_inm:'pi-',cliente_inm:'cinm-'}[role];
  document.querySelectorAll('#role-'+role+' .sec').forEach(s=>s.classList.remove('active'));
  const t=document.getElementById(pfx+sec);if(t)t.classList.add('active');
  // Update bottom-nav active state
  if(btn&&btn.classList){
    const navEl=document.getElementById('nav-'+role);
    if(navEl){navEl.querySelectorAll('.bnav-btn,.nav-btn').forEach(b=>b.classList.remove('active'));btn.classList.add('active');}
  }
  if(role==='cliente'&&sec==='resumen')renderClienteResumen();
  if(role==='cliente'&&sec==='reserva')resetReserva();
  if(role==='cliente'&&sec==='historial')renderClientHistorial();
  if(role==='cliente'&&sec==='perfil')renderClientDirs();
  if(role==='cliente'&&sec==='mensajes'){renderChatBox('c-t','c','chat-c-t');renderChatBox('c-a','c','chat-c-a');setTimeout(()=>renderClientUbicacion(),50);}
  if(role==='trabajador'&&sec==='resumen')renderTrabajadorResumen();
  if(role==='trabajador'&&sec==='solicitudes')renderSolicitudes();
  if(role==='trabajador'&&sec==='agenda')renderWorkerAgenda();
  if(role==='trabajador'&&sec==='realizados')renderWorkerHistorial();
  if(role==='trabajador'&&sec==='mensajes-t'){renderChatBox('c-t','t','chat-t-c');renderChatBox('t-sv','t','chat-t-sv');renderChatBox('t-a','t','chat-t-a');}
  if(role==='supervisor'&&sec==='resumen')renderSupervisorResumen();
  if(role==='supervisor'&&sec==='mapa-sv'){setTimeout(()=>renderSVMap(),50);}
  else if(_svMapListener&&role==='supervisor'){_stopSVMapListener();}
  if(role==='supervisor'&&sec==='eval-sv')renderSVEval();
  if(role==='supervisor'&&sec==='mensajes-sv'){renderSVChatSelector();renderChatBox('sv-a','sv','chat-sv-a');renderChatBox('c-t','sv','chat-sv-ct');renderChatBox('c-a','sv','chat-sv-ca');}
  if(role==='admin'&&sec==='mapa'){setTimeout(()=>renderAdminMapa(),50);}
  else if(_adminMapListener&&role==='admin'){_stopAdminMapListener();}
  if(role==='admin'&&sec==='notas-admin')renderAdminNotes();
  if(role==='admin'&&sec==='soporte-admin'){renderChatBox('c-a','a','chat-a-c');renderChatBox('sv-a','a','chat-a-sv');renderChatBox('t-a','a','chat-a-t');}
  if(role==='admin'&&sec==='resumen'){renderTopCards();renderAdminKPIs();}
  if(role==='admin'&&sec==='inmuebles'){switchPropTab('all',document.getElementById('inm-ftab-all'));switchInmMainTab('contratos',document.getElementById('inm-main-tab-contratos'));}
  if(role==='admin'&&sec==='personal-inm')renderPersonalInmAdmin();
  if(role==='admin'&&sec==='usuarios'){renderUsersPanel();renderSupervisorsPanel();}
  if(role==='admin'&&sec==='supervisores')renderSupervisorsPanel();
  if(role==='admin'&&sec==='facturacion')renderFacturacionAdmin();
  if(role==='supervisor'&&sec==='asistencias-sv')renderSVAstHoy();
  if(role==='supervisor'&&sec==='inmuebles-sv')renderSVInmuebles();
  // Personal Inmuebles
  if(role==='personal_inm'&&sec==='inicio')renderPIInicio();
  if(role==='personal_inm'&&sec==='servicios')renderPIServicios();
  if(role==='personal_inm'&&sec==='asistencias')renderPIAsistencias();
  if(role==='personal_inm'&&sec==='perfil')renderPIPerfil();
  // Cliente Inmuebles
  if(role==='cliente_inm'&&sec==='inicio')renderClienteInmInicio();
  if(role==='cliente_inm'&&sec==='contrato')renderClienteInmContrato();
  if(role==='cliente_inm'&&sec==='reportes')renderClienteInmReportes();
  if(role==='cliente_inm'&&sec==='asistencias')renderClienteInmAsistencias();
  if(role==='cliente_inm'&&sec==='perfil')renderClienteInmPerfil();
}

/* ── UNIFIED CHAT ── */
/* ── Chats de servicio: solo disponibles 30 min antes y durante el servicio ── */
const SVC_CHAT_KEYS=['c-t','t-sv','t-a'];

/* ── SOPORTE: sesión iniciada por el cliente, cierre por inactividad de 30 min ── */
function _nowTime(){const n=new Date();return String(n.getHours()).padStart(2,'0')+':'+String(n.getMinutes()).padStart(2,'0');}

function openSupportChat(){
  supportChat.active=true;
  supportChat.openedAt=Date.now();
  supportChat.lastClientMsg=Date.now();
  supportChat.closedReason=null;
  CHAT['c-a']=[{from:'a',text:'¡Hola! Bienvenido a Soporte AYALYM. ¿En qué podemos ayudarte hoy?',time:_nowTime(),name:'Soporte'}];
  pushNotif('admin','🆘','blue','Nueva sesión de soporte','Un cliente inició una sesión de soporte');
  if(supportChatTimer)clearInterval(supportChatTimer);
  supportChatTimer=setInterval(_checkSupportTimeout,60000); // revisa cada 60 s
  _renderSupportBox();
  const abox=document.getElementById('chat-a-c');if(abox)renderChatBox('c-a','a','chat-a-c');
  const svbox=document.getElementById('chat-sv-ca');if(svbox)renderChatBox('c-a','sv','chat-sv-ca');
}

function _checkSupportTimeout(){
  if(!supportChat.active){if(supportChatTimer){clearInterval(supportChatTimer);supportChatTimer=null;}return;}
  const idleMin=(Date.now()-supportChat.lastClientMsg)/60000;
  if(idleMin>=30){
    supportChat.active=false;
    supportChat.closedReason='timeout';
    clearInterval(supportChatTimer);supportChatTimer=null;
    CHAT['c-a'].push({from:'system',text:'La sesión se cerró por inactividad (30 min sin actividad del cliente).',time:_nowTime(),name:'Sistema'});
    pushNotif('admin','⏰','amber','Soporte cerrado por inactividad','La sesión cerró tras 30 min sin respuesta del cliente');
    _renderSupportBox();
    const abox=document.getElementById('chat-a-c');if(abox)renderChatBox('c-a','a','chat-a-c');
    const svbox=document.getElementById('chat-sv-ca');if(svbox)renderChatBox('c-a','sv','chat-sv-ca');
  }
}

function _renderSupportBox(){
  // Renderiza el panel de soporte desde la perspectiva del cliente (#chat-c-a)
  const box=document.getElementById('chat-c-a');if(!box)return;
  const panel=document.getElementById('c-msg-soporte');
  const ir=panel?panel.querySelector('.chat-input-row'):null;
  if(!supportChat.active){
    if(ir)ir.style.display='none';
    if(!supportChat.closedReason){
      // Sin sesión previa — pantalla de inicio
      box.innerHTML=`<div class="support-start-card">
        <div style="font-size:42px;margin-bottom:14px;">💬</div>
        <p class="support-start-title">¿Necesitas ayuda?</p>
        <p class="support-start-sub">Un agente de soporte AYALYM te atenderá. El chat se cierra automáticamente si no hay actividad durante 30 minutos.</p>
        <button class="btn-royal" style="margin-top:18px;width:100%;max-width:260px;" onclick="openSupportChat()">Iniciar chat de soporte</button>
      </div>`;
    } else {
      // Sesión cerrada por timeout — mostrar historial + opción de reabrir
      const msgs=CHAT['c-a']||[];
      box.innerHTML=msgs.map(m=>{
        if(m.from==='system')return`<div class="chat-sys-msg">${m.text}</div>`;
        return`<div class="msg ${m.from==='c'?'sent':'recv'}">${m.text}<span class="msg-meta">${m.from!=='c'?m.name+' · ':''}${m.time}</span></div>`;
      }).join('')+`<div class="support-reopen-row"><button class="btn-sm" onclick="openSupportChat()">💬 Iniciar nueva sesión</button></div>`;
      box.scrollTop=box.scrollHeight;
    }
  } else {
    // Sesión activa — mostrar mensajes e input
    if(ir)ir.style.display='';
    const msgs=CHAT['c-a']||[];
    box.innerHTML=msgs.map(m=>{
      if(m.from==='system')return`<div class="chat-sys-msg">${m.text}</div>`;
      return`<div class="msg ${m.from==='c'?'sent':'recv'}">${m.text}<span class="msg-meta">${m.from!=='c'?m.name+' · ':''}${m.time}</span></div>`;
    }).join('');
    box.scrollTop=box.scrollHeight;
  }
}
function chatSvcWindow(){
  const now=new Date(),today=now.toISOString().split('T')[0];
  const nowMin=now.getHours()*60+now.getMinutes();
  const w=currentWorkerRef||WORKERS[0];if(!w)return false;
  return w.todayJobs.some(j=>{
    if(j.fecha!==today||j.status==='completed')return false;
    const[h,m]=j.hora.split(':').map(Number);
    const start=h*60+m;
    return nowMin>=start-30&&nowMin<=start+(j.durMax||60);
  });
}
function renderChatBox(convKey,myRole,boxId){
  const box=document.getElementById(boxId);if(!box)return;
  // ── Soporte (c-a): lógica propia según quién ve el panel ──
  if(convKey==='c-a'){
    if(boxId==='chat-c-a'){_renderSupportBox();return;}
    // Admin o supervisor: mostrar mensajes y bloquear input si no hay sesión
    const msgs=CHAT['c-a']||[];
    const sessionOn=supportChat.active;
    const ir=box.parentElement&&box.parentElement.querySelector('.chat-input-row');
    if(ir){ir.style.opacity=sessionOn?'':'0.4';ir.style.pointerEvents=sessionOn?'':'none';}
    if(!sessionOn&&!msgs.length){
      box.innerHTML='<div class="chat-locked"><span class="chat-locked-icon">💬</span><p class="chat-locked-title">Sin sesión activa</p><p class="chat-locked-sub">Las sesiones de soporte son iniciadas por el cliente. Recibirás una notificación al comenzar una.</p></div>';
      return;
    }
    box.innerHTML=msgs.map(m=>{
      if(m.from==='system')return`<div class="chat-sys-msg">${m.text}</div>`;
      return`<div class="msg ${m.from===myRole?'sent':'recv'}">${m.text}<span class="msg-meta">${m.from!==myRole?m.name+' · ':''}${m.time}</span></div>`;
    }).join('');
    box.scrollTop=box.scrollHeight;
    return;
  }
  const isGated=SVC_CHAT_KEYS.includes(convKey);
  const open=!isGated||chatSvcWindow();
  // Bloquear/desbloquear fila de input
  const inputRow=box.parentElement&&box.parentElement.querySelector('.chat-input-row');
  if(inputRow){inputRow.style.opacity=open?'':'0.4';inputRow.style.pointerEvents=open?'':'none';}
  if(!open){
    const now=new Date(),today=now.toISOString().split('T')[0];
    const nowMin=now.getHours()*60+now.getMinutes();
    const w=currentWorkerRef||WORKERS[0];
    const nextJob=w&&[...w.todayJobs]
      .filter(j=>j.fecha===today&&j.status!=='completed')
      .sort((a,b)=>{const[ah,am]=a.hora.split(':').map(Number);const[bh,bm]=b.hora.split(':').map(Number);return(ah*60+am)-(bh*60+bm);})[0];
    const minsLeft=nextJob?(()=>{const[h,m]=nextJob.hora.split(':').map(Number);return(h*60+m)-nowMin;})():null;
    const infoTxt=nextJob
      ?(minsLeft>30?`Próximo servicio a las ${nextJob.hora}`
        :minsLeft>0?`Se habilita en ${minsLeft} min · Servicio a las ${nextJob.hora}`
        :`En servicio · ${nextJob.svc}`)
      :'Sin servicios programados hoy';
    box.innerHTML=`<div class="chat-locked"><span class="chat-locked-icon">🔒</span><p class="chat-locked-title">Chat no disponible</p><p class="chat-locked-sub">El chat se activa 30 min antes del inicio del servicio y se cierra al finalizar.</p><p class="chat-locked-svc">${infoTxt}</p></div>`;
    return;
  }
  const msgs=CHAT[convKey]||[];
  box.innerHTML=msgs.map(m=>`<div class="msg ${m.from===myRole?'sent':'recv'}">${m.text}<span class="msg-meta">${m.from!==myRole?m.name+' · ':''}${m.time}</span></div>`).join('');
  box.scrollTop=box.scrollHeight;
}
function sendChat(convKey,myRole,myName,inputId,boxId){
  if(SVC_CHAT_KEYS.includes(convKey)&&!chatSvcWindow()){showToast('amber','🔒','Chat disponible solo durante el servicio o 30 min antes');return;}
  // Soporte: solo si hay sesión activa
  if(convKey==='c-a'&&!supportChat.active){showToast('amber','⚠️','No hay sesión de soporte activa');return;}
  const input=document.getElementById(inputId);if(!input)return;
  const text=input.value.trim();if(!text)return;
  const now=new Date(),time=now.getHours()+':'+String(now.getMinutes()).padStart(2,'0');
  if(!CHAT[convKey])CHAT[convKey]=[];
  CHAT[convKey].push({from:myRole,text,time,name:myName});
  // Registrar actividad del cliente para el timeout de soporte
  if(convKey==='c-a'&&myRole==='c')supportChat.lastClientMsg=Date.now();
  input.value='';
  renderChatBox(convKey,myRole,boxId);
  // Mirrors: actualiza todas las cajas que muestran este chat (incluyendo supervisor)
  const mirrors={
    'c-t':{c:'chat-t-c',t:'chat-c-t',sv:'chat-sv-ct'},
    'c-a':{c:'chat-a-c',a:'chat-c-a',sv:'chat-sv-ca'},
    'sv-a':{sv:'chat-a-sv',a:'chat-sv-a'},
    't-a':{t:'chat-a-t',a:'chat-t-a'},
    't-sv':{t:'chat-t-sv',sv:'chat-sv-t'},
  };
  const m=mirrors[convKey];
  if(m)Object.entries(m).forEach(([role,id])=>{if(role!==myRole){const b=document.getElementById(id);if(b)renderChatBox(convKey,role,id);}});
  // Notificaciones: múltiples destinatarios según la conversación
  const notifyMap={
    'c-t':{c:['trabajador','supervisor'],t:['cliente','supervisor'],sv:['cliente','trabajador']},
    'c-a':{c:['admin','supervisor'],a:['cliente'],sv:['cliente']},
    'sv-a':{sv:['admin'],a:['supervisor']},
    't-a':{t:['admin'],a:['trabajador']},
    't-sv':{t:['supervisor'],sv:['trabajador']},
  };
  const targets=((notifyMap[convKey]||{})[myRole])||[];
  targets.forEach(r=>pushNotif(r,'💬','blue','Nuevo mensaje',`${myName}: ${text.slice(0,40)}`));
  updateNotifBadge();
}
function renderChatBoxSide(convKey,asRole,boxId){renderChatBox(convKey,asRole,boxId);}

/* ══════════════════════════════════════════════════════
   CHAT FLOTANTE — FAB + popup de contactos + ventanas
   ══════════════════════════════════════════════════════ */
let chatUnread={};  /* {convKey: count} mensajes no leídos */
let chatFloatOpen={}; /* {convKey: true} ventanas abiertas */
let chatContactsOpen=false;
let svcCardCollapsed={}; /* {svcId: true} cards colapsadas */

/* ── Definición de contactos por rol ── */
function getChatContacts(){
  const avBg={cliente:'#0C447C',trabajador:'#633806',supervisor:'#085041',admin:'#3C3489'};
  switch(currentRole){
    case 'cliente':{
      const wRef=currentWorkerRef||WORKERS[0];
      const wPh=wRef&&wRef.photo?`<img src="${wRef.photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`:(wRef?wRef.initials:'T');
      return[
        {convKey:'c-t',name:wRef?wRef.name:'Trabajador',sub:'Chat de servicio',av:wPh,avBg:'#633806'},
        {convKey:'c-a',name:'Soporte AYALYM',sub:'Asistencia y consultas',av:'🆘',avBg:'#185FA5'},
      ];}
    case 'trabajador':{
      const mySv=currentWorkerRef?SUPERVISORS.find(sv=>sv.assignedWorkers.includes(currentWorkerRef.id)):SUPERVISORS[0];
      return[
        {convKey:'c-t',name:'Cliente del servicio',sub:'Chat durante el servicio',av:'👤',avBg:'#0C447C'},
        {convKey:'t-sv',name:mySv?mySv.name:'Supervisor',sub:'Comunicación interna',av:mySv?mySv.initials:'SV',avBg:'#085041'},
        {convKey:'t-a',name:'Administración',sub:'Canal directo',av:'⚙️',avBg:'#3C3489'},
      ];}
    case 'supervisor':
      return[
        {convKey:'c-t',name:'Monitor cliente-trabajador',sub:'Supervisión de servicio',av:'👁️',avBg:'#0C447C'},
        {convKey:'sv-a',name:'Administración',sub:'Canal interno',av:'⚙️',avBg:'#3C3489'},
      ];
    case 'admin':
      return[
        {convKey:'c-a',name:'Soporte al cliente',sub:'Sesiones activas',av:'🆘',avBg:'#185FA5'},
        {convKey:'sv-a',name:'Supervisores',sub:'Canal de coordinación',av:'👁️',avBg:'#085041'},
        {convKey:'t-a',name:'Trabajadores',sub:'Canal de comunicación',av:'🧹',avBg:'#633806'},
      ];
    default:return[];
  }
}

/* ── Mostrar/ocultar FAB según el rol ── */
function initChatFab(){
  const fab=document.getElementById('chat-fab');
  if(!fab)return;
  const noFab=['personal_inm','cliente_inm'];
  fab.style.display=noFab.includes(currentRole)?'none':'flex';
  chatUnread={};chatFloatOpen={};chatContactsOpen=false;
  document.getElementById('chat-contacts-pop').classList.remove('open');
  updateChatFab();
}

/* ── Toggle popup de contactos ── */
function toggleChatContacts(){
  const pop=document.getElementById('chat-contacts-pop');
  chatContactsOpen=!chatContactsOpen;
  pop.classList.toggle('open',chatContactsOpen);
  if(chatContactsOpen)_renderContactsList();
}
function _renderContactsList(){
  const list=document.getElementById('chat-contacts-list');if(!list)return;
  const contacts=getChatContacts();
  list.innerHTML=contacts.map(c=>{
    const unread=chatUnread[c.convKey]||0;
    const avIsEmoji=/\p{Emoji}/u.test(c.av);
    const avHtml=avIsEmoji||!c.av.startsWith('<')?c.av:c.av;
    return`<div class="chat-contact-item" onclick="openChatFloat('${c.convKey}')">
      <div class="chat-contact-av" style="background:${c.avBg};">${avHtml}</div>
      <div class="chat-contact-info">
        <p>${c.name}</p>
        <span>${c.sub}</span>
      </div>
      ${unread?`<span class="chat-contact-unread">${unread}</span>`:''}
    </div>`;
  }).join('');
}

/* ── Actualizar badge del FAB ── */
function updateChatFab(){
  const total=Object.values(chatUnread).reduce((a,n)=>a+n,0);
  const badge=document.getElementById('chat-fab-badge');
  if(badge){badge.textContent=total>9?'9+':total;badge.style.display=total?'flex':'none';}
}

/* ── Abrir ventana flotante ── */
function openChatFloat(convKey){
  // Cerrar popup de contactos
  chatContactsOpen=false;
  const pop=document.getElementById('chat-contacts-pop');if(pop)pop.classList.remove('open');
  // Si ya existe, solo mostrar/restaurar
  const existing=document.getElementById('cfw-'+convKey);
  if(existing){existing.classList.remove('minimized');_scrollFloatBody(convKey);return;}
  // Buscar datos del contacto
  const contacts=getChatContacts();
  const c=contacts.find(x=>x.convKey===convKey)||{name:convKey,av:'💬',avBg:'#1A56DB',sub:''};
  // Calcular posición horizontal
  const winW=300,gap=8,marginR=16;
  const openKeys=Object.keys(chatFloatOpen);
  const isMobile=window.innerWidth<=600;
  const rightPos=isMobile?0:marginR+(openKeys.length*(winW+gap));
  // Crear ventana
  const layer=document.getElementById('chat-float-layer');if(!layer)return;
  const win=document.createElement('div');
  win.className='chat-float-win';
  win.id='cfw-'+convKey;
  win.style.right=rightPos+'px';
  const avIsEmoji=/\p{Emoji}/u.test(c.av)||(!c.av.startsWith('<')&&c.av.length<=4);
  win.innerHTML=`
    <div class="chat-float-hdr" onclick="minChatFloat('${convKey}')">
      <div class="chat-float-hdr-av" style="background:${c.avBg};">${c.av}</div>
      <div class="chat-float-hdr-info">
        <p>${c.name}</p>
        <span>${c.sub||'Chat'}</span>
      </div>
      <div class="chat-float-hdr-btns" onclick="event.stopPropagation()">
        <button class="chat-float-hdr-btn" onclick="minChatFloat('${convKey}')" title="Minimizar">─</button>
        <button class="chat-float-hdr-btn" onclick="closeChatFloat('${convKey}')" title="Cerrar">✕</button>
      </div>
    </div>
    <div class="chat-float-body" id="cfb-${convKey}"></div>
    <div class="chat-float-inp">
      <input type="text" id="cfi-${convKey}" placeholder="Escribe un mensaje…"
        style="font-size:16px;"
        onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendChatFloat('${convKey}');}">
      <button class="chat-float-inp-btn" onclick="sendChatFloat('${convKey}')">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
      </button>
    </div>`;
  layer.appendChild(win);
  chatFloatOpen[convKey]=true;
  chatUnread[convKey]=0;
  updateChatFab();
  _renderFloatMessages(convKey);
  _scrollFloatBody(convKey);
  // Focus input
  setTimeout(()=>{const inp=document.getElementById('cfi-'+convKey);if(inp)inp.focus();},100);
}

/* ── Cerrar ventana ── */
function closeChatFloat(convKey){
  const win=document.getElementById('cfw-'+convKey);
  if(win){win.style.animation='cfWinOut .15s ease-in forwards';setTimeout(()=>{win.remove();},150);}
  delete chatFloatOpen[convKey];
  _repositionFloatWindows();
}

/* ── Minimizar / restaurar ── */
function minChatFloat(convKey){
  const win=document.getElementById('cfw-'+convKey);
  if(win)win.classList.toggle('minimized');
}

/* ── Reposicionar ventanas abiertas ── */
function _repositionFloatWindows(){
  const isMobile=window.innerWidth<=600;
  if(isMobile)return;
  const winW=300,gap=8,marginR=16;
  Object.keys(chatFloatOpen).forEach((key,i)=>{
    const w=document.getElementById('cfw-'+key);
    if(w)w.style.right=(marginR+i*(winW+gap))+'px';
  });
}

/* ── Renderizar mensajes en ventana flotante ── */
function _renderFloatMessages(convKey){
  const box=document.getElementById('cfb-'+convKey);if(!box)return;
  const myRole=currentRole==='cliente'?'c':currentRole==='trabajador'?'t':currentRole==='supervisor'?'sv':'a';
  /* Reutilizar lógica de renderChatBox */
  if(convKey==='c-a'){
    if(currentRole==='cliente'){
      _renderSupportBoxFloat(box);return;
    }
    const msgs=CHAT['c-a']||[];
    const sessionOn=supportChat.active;
    if(!sessionOn&&!msgs.length){
      box.innerHTML=`<div class="chat-locked"><span class="chat-locked-icon">💬</span><p class="chat-locked-title">Sin sesión activa</p><p class="chat-locked-sub">Las sesiones de soporte son iniciadas por el cliente.</p></div>`;
      return;
    }
    box.innerHTML=msgs.map(m=>{
      if(m.from==='system')return`<div class="chat-sys-msg">${m.text}</div>`;
      return`<div class="msg ${m.from===myRole?'sent':'recv'}">${m.text}<span class="msg-meta">${m.from!==myRole?m.name+' · ':''}${m.time}</span></div>`;
    }).join('');
    box.scrollTop=box.scrollHeight;return;
  }
  /* Chat de servicio (c-t) — verificar ventana activa */
  const SVC_KEYS=['c-t','t-sv'];
  if(SVC_KEYS.includes(convKey)&&currentRole==='trabajador'&&!chatSvcWindow()){
    const w=currentWorkerRef||WORKERS[0];
    const today=new Date().toISOString().split('T')[0];
    const nextJob=w?[...w.todayJobs].filter(j=>j.fecha===today&&j.status!=='completed').sort((a,b)=>a.hora.localeCompare(b.hora))[0]:null;
    box.innerHTML=`<div class="chat-locked"><span class="chat-locked-icon">🔒</span><p class="chat-locked-title">Chat no disponible</p><p class="chat-locked-sub">Se activa 30 min antes del servicio.</p>${nextJob?`<p class="chat-locked-svc">Próximo: ${nextJob.svc} a las ${nextJob.hora}</p>`:''}</div>`;
    return;
  }
  const msgs=CHAT[convKey]||[];
  if(!msgs.length){box.innerHTML=`<div class="chat-locked"><span class="chat-locked-icon">💬</span><p class="chat-locked-title">Sin mensajes aún</p><p class="chat-locked-sub">Sé el primero en escribir.</p></div>`;return;}
  box.innerHTML=msgs.map(m=>{
    if(m.from==='system')return`<div class="chat-sys-msg">${m.text}</div>`;
    return`<div class="msg ${m.from===myRole?'sent':'recv'}">${m.text}<span class="msg-meta">${m.from!==myRole?m.name+' · ':''}${m.time}</span></div>`;
  }).join('');
  box.scrollTop=box.scrollHeight;
}

/* Render de soporte para cliente en ventana flotante */
function _renderSupportBoxFloat(box){
  const msgs=CHAT['c-a']||[];
  const inputRow=box.nextElementSibling; /* .chat-float-inp */
  if(!supportChat.active&&!msgs.length){
    box.innerHTML=`<div class="chat-locked"><span class="chat-locked-icon">💬</span><p class="chat-locked-title">¿Necesitas ayuda?</p><p class="chat-locked-sub">Inicia una sesión de soporte para chatear con el equipo AYALYM.</p></div>`;
    if(inputRow){
      inputRow.innerHTML=`<button class="btn-royal" style="width:100%;font-size:13px;" onclick="startSupportFloat()">Iniciar soporte</button>`;
    }
    return;
  }
  if(inputRow&&inputRow.querySelector('.btn-royal')){
    inputRow.innerHTML=`<input type="text" id="cfi-c-a" placeholder="Escribe un mensaje…" style="font-size:16px;" onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();sendChatFloat('c-a');}"><button class="chat-float-inp-btn" onclick="sendChatFloat('c-a')"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg></button>`;
  }
  box.innerHTML=msgs.map(m=>{
    if(m.from==='system')return`<div class="chat-sys-msg">${m.text}</div>`;
    return`<div class="msg ${m.from==='c'?'sent':'recv'}">${m.text}<span class="msg-meta">${m.from!=='c'?m.name+' · ':''}${m.time}</span></div>`;
  }).join('');
  box.scrollTop=box.scrollHeight;
}
function startSupportFloat(){
  startSupport();
  const box=document.getElementById('cfb-c-a');
  if(box){_renderSupportBoxFloat(box);_scrollFloatBody('c-a');}
}

/* ── Scroll al fondo ── */
function _scrollFloatBody(convKey){
  const box=document.getElementById('cfb-'+convKey);
  if(box)setTimeout(()=>{box.scrollTop=box.scrollHeight;},30);
}

/* ── Enviar desde ventana flotante ── */
function sendChatFloat(convKey){
  const myRole=currentRole==='cliente'?'c':currentRole==='trabajador'?'t':currentRole==='supervisor'?'sv':'a';
  const myName=currentRole==='cliente'?'Cliente':
    currentRole==='trabajador'?(currentWorkerRef?currentWorkerRef.name:'Trabajador'):
    currentRole==='supervisor'?(currentSupervisorRef?currentSupervisorRef.name:'Supervisor'):'Admin';
  const inp=document.getElementById('cfi-'+convKey);
  if(!inp||!inp.value.trim())return;
  /* Validaciones */
  if(convKey==='c-a'&&!supportChat.active){showToast('amber','⚠️','No hay sesión de soporte activa');return;}
  const SVC_CHAT_KEYS_LOCAL=['c-t'];
  if(SVC_CHAT_KEYS_LOCAL.includes(convKey)&&currentRole==='trabajador'&&!chatSvcWindow()){
    showToast('amber','🔒','Chat disponible solo durante el servicio o 30 min antes');return;
  }
  const text=inp.value.trim();
  const time=new Date().getHours()+':'+String(new Date().getMinutes()).padStart(2,'0');
  if(!CHAT[convKey])CHAT[convKey]=[];
  CHAT[convKey].push({from:myRole,text,time,name:myName});
  if(convKey==='c-a'&&myRole==='c')supportChat.lastClientMsg=Date.now();
  inp.value='';
  /* Actualizar ventana flotante */
  _renderFloatMessages(convKey);
  _scrollFloatBody(convKey);
  /* Actualizar mirrors del panel */
  const mirrors={'c-t':{c:'chat-t-c',t:'chat-c-t',sv:'chat-sv-ct'},'c-a':{c:'chat-a-c',a:'chat-c-a',sv:'chat-sv-ca'},'sv-a':{sv:'chat-a-sv',a:'chat-sv-a'},'t-a':{t:'chat-a-t',a:'chat-t-a'},'t-sv':{t:'chat-t-sv',sv:'chat-sv-t'}};
  const m=mirrors[convKey];
  if(m)Object.entries(m).forEach(([role,id])=>{const b=document.getElementById(id);if(b)renderChatBox(convKey,role,id);});
  /* Notificaciones */
  const notifyMap={'c-t':{c:['trabajador','supervisor'],t:['cliente','supervisor'],sv:['cliente','trabajador']},'c-a':{c:['admin','supervisor'],a:['cliente'],sv:['cliente']},'sv-a':{sv:['admin'],a:['supervisor']},'t-a':{t:['admin'],a:['trabajador']},'t-sv':{t:['supervisor'],sv:['trabajador']}};
  const targets=((notifyMap[convKey]||{})[myRole])||[];
  targets.forEach(r=>pushNotif(r,'💬','blue','Nuevo mensaje',`${myName}: ${text.slice(0,40)}`));
  updateNotifBadge();
  /* Simular respuesta automática después de 1-2s (demo) */
  _simulateTyping(convKey,myRole);
}

/* ── Typing indicator + respuesta automática (demo) ── */
function _simulateTyping(convKey,myRole){
  if(convKey!=='c-a'&&convKey!=='c-t')return;
  const box=document.getElementById('cfb-'+convKey);if(!box)return;
  const delay=1000+Math.random()*1500;
  const typDiv=document.createElement('div');
  typDiv.className='chat-typing';
  typDiv.innerHTML='<span></span><span></span><span></span>';
  box.appendChild(typDiv);
  box.scrollTop=box.scrollHeight;
  setTimeout(()=>{
    if(typDiv.parentNode)typDiv.remove();
    const autoReplies={
      'c-a':['Entendido, ya lo reviso.','¿Me puedes dar más detalles?','Un momento, lo verifico.','Claro, con gusto te ayudo.'],
      'c-t':['Ya voy en camino.','Confirmo la cita.','Listo, nos vemos pronto.','De acuerdo, gracias.'],
    };
    const replies=autoReplies[convKey]||[];
    if(!replies.length)return;
    const reply=replies[Math.floor(Math.random()*replies.length)];
    const respRole=convKey==='c-a'?'a':'t';
    const respName=convKey==='c-a'?'Soporte':'Trabajador';
    const time=new Date().getHours()+':'+String(new Date().getMinutes()).padStart(2,'0');
    CHAT[convKey].push({from:respRole,text:reply,time,name:respName});
    // Si la ventana no está abierta, contar no leído
    if(!chatFloatOpen[convKey]){chatUnread[convKey]=(chatUnread[convKey]||0)+1;updateChatFab();}
    _renderFloatMessages(convKey);_scrollFloatBody(convKey);
    // Actualizar ventanas del panel también
    const mirrors={'c-t':{c:'chat-t-c',t:'chat-c-t',sv:'chat-sv-ct'},'c-a':{c:'chat-a-c',a:'chat-c-a',sv:'chat-sv-ca'}};
    const mr=mirrors[convKey];if(mr)Object.entries(mr).forEach(([r,id])=>{const b=document.getElementById(id);if(b)renderChatBox(convKey,r,id);});
  },delay);
}

/* ── Hook: actualizar ventana flotante cuando sendChat() del panel actualice el chat ── */
const _origSendChat=window.sendChat;
function _updateFloatOnSend(convKey){
  if(chatFloatOpen[convKey])_renderFloatMessages(convKey);
  else{chatUnread[convKey]=(chatUnread[convKey]||0)+1;updateChatFab();if(chatContactsOpen)_renderContactsList();}
}

/* ── MSG TABS (cliente, trabajador, supervisor) ── */
function switchMsgTab(rolePrefix,tab,btn){
  const tabsId=rolePrefix+'-msg-tabs';
  const tabsBtns=document.getElementById(tabsId);
  if(tabsBtns)tabsBtns.querySelectorAll('.msg-tab').forEach(b=>b.classList.remove('active'));
  if(btn)btn.classList.add('active');
  // Hide all panels then show the target
  const panels=document.querySelectorAll('#'+rolePrefix+'-msg-'+tab).length
    ? document.querySelectorAll('[id^="'+rolePrefix+'-msg-"]')
    : document.querySelectorAll('#'+{c:'c',t:'t',sv:'sv'}[rolePrefix]+'_msg_'+tab);
  // Generic approach: hide all sibling panels
  const target=document.getElementById(rolePrefix+'-msg-'+tab);
  if(!target)return;
  const parent=target.parentElement;
  parent.querySelectorAll('.msg-panel').forEach(p=>p.classList.remove('active'));
  target.classList.add('active');
}
function switchAdminMsgTab(tab,btn){
  document.getElementById('admin-msg-tabs').querySelectorAll('.msg-tab').forEach(b=>b.classList.remove('active'));
  if(btn)btn.classList.add('active');
  document.querySelectorAll('#a-soporte-admin .msg-panel').forEach(p=>p.classList.remove('active'));
  const t=document.getElementById('admin-msg-'+tab);if(t)t.classList.add('active');
}

/* ZONE */
function renderZoneOptions(){
  const el=document.getElementById('zone-options-list');if(!el)return;
  const active=ZONAS.filter(z=>z.activo!==false);
  if(!active.length){el.innerHTML='<p style="font-size:12px;color:#5C7A9A;text-align:center;padding:10px 0;">No hay zonas disponibles.</p>';return;}
  el.innerHTML=active.map(z=>`<div class="zone-card${z.id===selectedZoneId?' selected':''}" onclick="selectZone('${z.id}',this)"><div class="zone-card-info"><p>${z.nombre}</p><span>${z.colonias}</span></div><span class="zone-check">✓</span></div>`).join('');
}
function renderRegisterZoneSelect(){
  const el=document.getElementById('r-zona');if(!el)return;
  const active=ZONAS.filter(z=>z.activo!==false);
  el.innerHTML=`<option value="">— Selecciona tu zona —</option>`+active.map(z=>`<option value="${z.id}">${z.nombre}</option>`).join('');
}
function selectZone(id,card){selectedZoneId=id;document.querySelectorAll('.zone-card').forEach(c=>c.classList.remove('selected'));card.classList.add('selected');}
function toggleZoneEdit(){const panel=document.getElementById('zone-edit-panel');const open=panel.classList.toggle('open');if(open){selectedZoneId=clientZoneId;renderZoneOptions();}}
function saveZone(){if(selectedZoneId===clientZoneId){toggleZoneEdit();return;}const newZ=ZONAS.find(z=>z.id===selectedZoneId&&z.activo!==false);if(!newZ){showToast('amber','⚠️','Zona no disponible');return;}clientZoneId=selectedZoneId;const n=document.getElementById('zone-current-name'),c=document.getElementById('zone-current-cols'),zu=document.getElementById('c-user-zona');if(n)n.textContent=newZ.nombre;if(c)c.textContent=newZ.colonias;if(zu)zu.textContent=newZ.nombre;document.getElementById('zone-edit-panel').classList.remove('open');renderWorkersByZone();renderTimeSlots();showToast('green','📍','Zona actualizada a: '+newZ.nombre);pushNotif('cliente','📍','blue','Zona actualizada','Ahora recibirás servicio en '+newZ.nombre);updateNotifBadge();}

/* SUPERVISORS */
function getAllAssignedWorkers(exceptSvIdx){const used=new Set();SUPERVISORS.forEach((sv,i)=>{if(i!==exceptSvIdx)sv.assignedWorkers.forEach(w=>used.add(w));});return used;}
function renderSupervisorsPanel(){
  const el=document.getElementById('supervisors-list');if(!el)return;
  el.innerHTML=SUPERVISORS.map((sv,si)=>{
    const assignedW=WORKERS.filter(w=>sv.assignedWorkers.includes(w.id));
    const allRevs=assignedW.flatMap(w=>w.reviews);
    const avg=allRevs.length?allRevs.reduce((a,r)=>a+r.stars,0)/allRevs.length:null;
    const avgTxt=avg!==null?avg.toFixed(1):'—';
    const workerRatings=assignedW.map(w=>{
      const wAvg=w.reviews.length?w.reviews.reduce((a,r)=>a+r.stars,0)/w.reviews.length:null;
      return`<div style="display:flex;align-items:center;justify-content:space-between;padding:5px 0;border-bottom:.5px solid #E6F1FB;">
        <div style="display:flex;align-items:center;gap:6px;">${_avHtml(w,22,'#042C53','font-size:'+(w.photo?'0':'9px'))}<span style="font-size:12px;color:#042C53;">${w.name.split(' ')[0]}</span></div>
        <div style="display:flex;align-items:center;gap:4px;">${s$(wAvg||0,11)}<span style="font-size:12px;font-weight:500;color:#042C53;">${wAvg!==null?wAvg.toFixed(1):'—'}</span><span style="font-size:11px;color:#185FA5;">(${w.reviews.length})</span></div>
      </div>`;
    }).join('');
    const pills=assignedW.map(w=>`<div class="sv-worker-pill">${_avHtml(w,22,'#042C53','font-size:'+(w.photo?'0':'9px'))}<span>${w.name.split(' ')[0]}</span><button onclick="removeWorkerFromSV(${si},${w.id})">×</button></div>`).join('');
    const svAvHtml=sv.photo
      ?`<div class="av-photo-wrap" style="position:relative;cursor:pointer;flex-shrink:0;" onclick="adminUploadSupervisorPhoto(${sv.id})" title="Cambiar foto"><div class="av" style="width:44px;height:44px;font-size:0;background:#085041;overflow:hidden;"><img src="${sv.photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"></div><div class="av-photo-badge" style="font-size:10px;width:18px;height:18px;">📷</div></div>`
      :`<div class="av-photo-wrap" style="position:relative;cursor:pointer;flex-shrink:0;" onclick="adminUploadSupervisorPhoto(${sv.id})" title="Subir foto"><div class="av" style="width:44px;height:44px;font-size:14px;background:#085041;">${sv.initials}</div><div class="av-photo-badge" style="font-size:10px;width:18px;height:18px;">📷</div></div>`;
    return`<div class="supervisor-card">
      <div class="sv-card-header">
        ${svAvHtml}
        <div class="sv-card-info"><p>${sv.name}</p><span>Zonas: ${sv.zonas.join(', ')||'Sin asignar'}</span></div>
        <div style="text-align:right;display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
          <button class="btn-danger" style="background:#fff0f0;color:#c0392b;border-color:#f5c6c6;padding:2px 8px;font-size:11px;" onclick="deleteSupervisor(${si})" title="Eliminar supervisor">🗑️</button>
          <div style="display:flex;align-items:center;gap:4px;">${s$(avg||0,13)}<span style="font-size:15px;font-weight:500;color:#042C53;">${avgTxt}</span></div>
          <span style="font-size:11px;color:#185FA5;">${allRevs.length} reseña${allRevs.length!==1?'s':''}</span>
        </div>
      </div>
      ${assignedW.length?`<div style="background:#E6F1FB;border-radius:8px;padding:8px 10px;margin-bottom:10px;">${workerRatings}</div>`:''}
      <p style="font-size:12px;font-weight:500;color:#042C53;margin-bottom:8px;">Trabajadores asignados</p>
      <div class="sv-assigned-list">${pills||'<span style="font-size:12px;color:#185FA5;font-style:italic;">Sin asignar</span>'}</div>
      <button class="btn-light" style="padding:5px 12px;font-size:12px;" onclick="toggleSVAssignPanel(${si})">+ Asignar trabajador</button>
      <div class="sv-assign-panel" id="sv-ap-${si}"><p style="font-size:12px;font-weight:500;color:#042C53;margin-bottom:4px;">Seleccionar trabajador</p><p style="font-size:11px;color:#185FA5;margin-bottom:8px;">Los bloqueados 🔒 ya pertenecen a otro supervisor.</p>${buildWorkerOptions(si)}<div style="margin-top:10px;display:flex;gap:8px;"><button class="btn-sm" onclick="saveSVAssign(${si})">Guardar</button><button class="btn-sec" onclick="toggleSVAssignPanel(${si})">Cancelar</button></div></div>
    </div>`;
  }).join('');
}
function deleteSupervisor(si){
  const sv=SUPERVISORS[si];if(!sv)return;
  if(!window.confirm('¿Eliminar al supervisor "'+sv.name+'" permanentemente?\nSus trabajadores asignados quedarán sin supervisor.'))return;
  /* Eliminar de Firestore y del array */
  fbDeleteDoc('supervisores',sv.id);
  SUPERVISORS.splice(si,1);
  fbSaveSupervisors();
  /* También eliminar de USERS si existe */
  const uIdx=USERS.findIndex(u=>u.rol==='supervisor'&&u.nombre===sv.name);
  if(uIdx>=0){fbDeleteDoc('usuarios',USERS[uIdx].id);USERS.splice(uIdx,1);fbSaveUsers();}
  renderSupervisorsPanel();
  renderUsersPanel();
  showToast('green','🗑️','"'+sv.name+'" eliminado de supervisores');
}
function buildWorkerOptions(si){const used=getAllAssignedWorkers(si);return WORKERS.filter(w=>w.status!=='inactive').map(w=>{const mine=SUPERVISORS[si].assignedWorkers.includes(w.id);const locked=used.has(w.id);const whoHas=locked?SUPERVISORS.find((sv,i)=>i!==si&&sv.assignedWorkers.includes(w.id)):null;const svc=w.type.map(t=>({depto:'Depto',auto:'Autos',tapiceria:'Tapicería'}[t])).join(', ');if(locked)return`<div class="wkr-opt-row locked"><input type="checkbox" disabled><div class="wkr-opt-info"><p>🔒 ${w.name} <span class="locked-tag">→ ${whoHas?.name?.split(' ')[0]||'Otro sup.'}</span></p><span>${svc}</span></div></div>`;return`<div class="wkr-opt-row"><input type="checkbox" id="wck-${si}-${w.id}" ${mine?'checked':''} onchange="toggleWorkerToSV(${si},${w.id},this.checked)"><label for="wck-${si}-${w.id}" style="display:flex;flex:1;align-items:flex-start;flex-direction:column;cursor:pointer;margin:0;"><p style="font-size:13px;font-weight:500;color:#042C53;margin:0;">${w.name}</p><span style="font-size:11px;color:#185FA5;">${svc}</span></label></div>`;}).join('');}
function toggleWorkerToSV(si,wid,checked){const used=getAllAssignedWorkers(si);if(checked&&used.has(wid)){showToast('red','🔒','Este trabajador ya está asignado a otro supervisor');setTimeout(()=>{const cb=document.getElementById('wck-'+si+'-'+wid);if(cb)cb.checked=false;},50);return;}if(checked&&!SUPERVISORS[si].assignedWorkers.includes(wid))SUPERVISORS[si].assignedWorkers.push(wid);if(!checked)SUPERVISORS[si].assignedWorkers=SUPERVISORS[si].assignedWorkers.filter(x=>x!==wid);}
function toggleSVAssignPanel(si){const panel=document.getElementById('sv-ap-'+si);const wasOpen=panel.classList.contains('open');document.querySelectorAll('.sv-assign-panel').forEach(p=>p.classList.remove('open'));if(!wasOpen){panel.innerHTML=`<p style="font-size:12px;font-weight:500;color:#042C53;margin-bottom:4px;">Seleccionar trabajador</p><p style="font-size:11px;color:#185FA5;margin-bottom:8px;">Los bloqueados 🔒 ya pertenecen a otro supervisor.</p>${buildWorkerOptions(si)}<div style="margin-top:10px;display:flex;gap:8px;"><button class="btn-sm" onclick="saveSVAssign(${si})">Guardar</button><button class="btn-sec" onclick="toggleSVAssignPanel(${si})">Cancelar</button></div>`;panel.classList.add('open');}}
function removeWorkerFromSV(si,wid){SUPERVISORS[si].assignedWorkers=SUPERVISORS[si].assignedWorkers.filter(x=>x!==wid);const w=WORKERS.find(x=>x.id===wid);fbSaveSupervisors();renderSupervisorsPanel();showToast('blue','👥',(w?w.name:'')+' removido de '+SUPERVISORS[si].name);}
function saveSVAssign(si){document.getElementById('sv-ap-'+si).classList.remove('open');fbSaveSupervisors();renderSupervisorsPanel();showToast('green','✅','Asignación guardada para '+SUPERVISORS[si].name);pushNotif('supervisor','👥','blue','Equipo actualizado','Tu lista de trabajadores fue modificada');updateNotifBadge();}

/* USERS WITH REVOKE */
const PROTECTED_ADMIN='admin@ayalym.com';
function renderUsersPanel(filter){
  filter=filter||userRoleFilter||'all';
  const filtered=filter==='all'?USERS:USERS.filter(u=>u.rol===filter);
  document.getElementById('users-list').innerHTML=filtered.map((u)=>{
    const i=USERS.indexOf(u);
    const isProtected=u.rolProtegido===true;
    // Para trabajadores/supervisores/personal_inm/clientes_inm mostrar foto si existe
    const wRef=u.rol==='trabajador'?WORKERS.find(w=>w.name===u.nombre):null;
    const svRef=u.rol==='supervisor'?SUPERVISORS.find(s=>s.name===u.nombre):null;
    const piRef=u.rol==='personal_inm'?PERSONAL_INM.find(p=>p.email===u.email||p.nombre===u.nombre):null;
    const ciRef=u.rol==='cliente_inm'?CLIENTS_INM.find(c=>c.email===u.email):null;
    const photoSrc=(wRef&&wRef.photo)||(svRef&&svRef.photo)||(piRef&&piRef.photo)||(ciRef&&ciRef.photo)||null;
    const avContent=photoSrc
      ?`<img src="${photoSrc}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
      :u.nombre.split(' ').map(n=>n[0]).join('').slice(0,2);
    return`<div class="user-card">
      <div class="user-card-top">
        <div class="user-av" style="background:${avBgs[u.rol]||'#E6F1FB'};color:${avCols[u.rol]||'#042C53'};overflow:hidden;font-size:${photoSrc?'0':'13px'};">${avContent}</div>
        <div class="user-info">
          <p>${u.nombre} <span class="role-badge ${rolColor(u.rol)}">${rolLabel(u.rol)}</span> ${u.accesoRevocado?'<span class="badge b-revoked">Acceso revocado</span>':''}</p>
          <span>${u.email}</span>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
          ${(u.rol!=='cliente'&&u.rol!=='cliente_inm')?`<span class="badge ${u.activo?'b-activo':'b-inactivo'}">${u.activo?'Activo':'Inactivo'}</span>`:''}
          ${isProtected
            ?`<div style="display:flex;gap:4px;"><button class="btn-edit" onclick="toggleEditUser(${i})">Editar perfil</button></div><span style="font-size:11px;color:#185FA5;">Rol protegido</span>`
            :`<div style="display:flex;gap:4px;flex-wrap:wrap;justify-content:flex-end;">
              <button class="btn-edit" onclick="toggleEditUser(${i})">Editar</button>
              ${wRef?`<button class="btn-light" onclick="adminUploadWorkerPhoto(${wRef.id})" title="Subir foto">📷</button>`:''}${svRef?`<button class="btn-light" onclick="adminUploadSupervisorPhoto(${svRef.id})" title="Subir foto">📷</button>`:''}${piRef?`<button class="btn-light" onclick="adminUploadPersonalInmPhoto(${piRef.id})" title="Subir foto">📷</button>`:''}
              ${(u.rol!=='cliente'&&u.rol!=='cliente_inm')?`<button class="btn-danger" onclick="toggleUser(${i})">${u.activo?'Desactivar':'Activar'}</button>`:''}
              <button class="${u.accesoRevocado?'btn-restore':'btn-revoke'}" onclick="revokeAccess(${i})">${u.accesoRevocado?'Restaurar acceso':'Revocar acceso'}</button>
              <button class="btn-danger" style="background:#fff0f0;color:#c0392b;border-color:#f5c6c6;" onclick="deleteUser(${i})" title="Eliminar usuario">🗑️</button>
            </div>`}
        </div>
      </div>
      <div class="user-edit-panel" id="uep-${i}">
        ${isProtected
          ?`<div class="frow"><div><label>Nombre</label><input type="text" id="ue-nombre-${i}" value="${u.nombre}"></div><div><label>Teléfono</label><input type="text" id="ue-tel-${i}" value="${u.tel||''}"></div></div>
            <div class="frow"><div style="grid-column:1/-1;"><label>Correo</label><input type="email" id="ue-email-${i}" value="${u.email}"></div></div>
            <div style="border-top:.5px solid #B5D4F4;margin-top:10px;padding-top:10px;">
              <p style="font-size:11px;font-weight:600;color:#042C53;margin-bottom:8px;">🔐 Cambiar contraseña (opcional)</p>
              <div class="frow"><div><label>Contraseña actual</label><input type="password" id="ue-cp-curr-${i}" placeholder="••••••••"></div><div><label>Nueva contraseña</label><input type="password" id="ue-cp-new1-${i}" placeholder="Mínimo 8 caracteres"></div></div>
              <div class="frow"><div style="grid-column:1/-1;"><label>Confirmar nueva contraseña</label><input type="password" id="ue-cp-new2-${i}" placeholder="Repite la nueva contraseña"></div></div>
            </div>
            <div style="display:flex;gap:8px;margin-top:8px;"><button class="btn-sm" style="flex:1;" onclick="saveAdminProfile(${i})">Guardar</button><button class="btn-sec" onclick="toggleEditUser(${i})">Cancelar</button></div>`
          :`<div class="frow"><div><label>Nombre</label><input type="text" id="ue-nombre-${i}" value="${u.nombre}"></div><div><label>Teléfono</label><input type="text" id="ue-tel-${i}" value="${u.tel||''}"></div></div>
            <div class="frow"><div><label>Correo</label><input type="email" id="ue-email-${i}" value="${u.email}"></div><div><label>Rol</label><select id="ue-rol-${i}"><option value="admin" ${u.rol==='admin'?'selected':''}>Administrador</option><option value="supervisor" ${u.rol==='supervisor'?'selected':''}>Supervisor</option><option value="trabajador" ${u.rol==='trabajador'?'selected':''}>Trabajador</option><option value="cliente" ${u.rol==='cliente'?'selected':''}>Cliente</option><option value="cliente_inm" ${u.rol==='cliente_inm'?'selected':''}>Cliente Inmuebles</option><option value="personal_inm" ${u.rol==='personal_inm'?'selected':''}>Personal Inmuebles</option></select></div></div>
            <div style="border-top:.5px solid #B5D4F4;margin-top:10px;padding-top:10px;">
              <p style="font-size:11px;font-weight:600;color:#042C53;margin-bottom:6px;">🔑 Contraseña temporal <span style="font-weight:400;color:#5A8CB0;">(opcional — dejar vacío para no cambiar)</span></p>
              <div class="frow"><div style="grid-column:1/-1;"><label>Nueva contraseña</label><input type="password" id="ue-tmppass-${i}" placeholder="Mínimo 8 caracteres"></div></div>
            </div>
            <div style="display:flex;gap:8px;margin-top:8px;"><button class="btn-sm" style="flex:1;" onclick="saveUser(${i})">Guardar</button><button class="btn-sec" onclick="toggleEditUser(${i})">Cancelar</button></div>`}
      </div>
    </div>`;
  }).join('');
  /* ── Trabajadores en WORKERS sin cuenta de sistema ── */
  if(filter==='all'||filter==='trabajador'){
    const inUsers=new Set(USERS.filter(u=>u.rol==='trabajador').map(u=>u.nombre));
    const sinCuenta=WORKERS.filter(w=>!inUsers.has(w.name));
    if(sinCuenta.length){
      const extra=sinCuenta.map(w=>{
        const photo=w.photo?`<img src="${w.photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`:w.initials;
        const svc=w.type.map(t=>({depto:'Depto',auto:'Autos',tapiceria:'Tapicería'}[t]||t)).join(', ')||'Sin especialidad';
        return`<div class="user-card" style="opacity:.85;">
          <div class="user-card-top">
            <div class="user-av" style="background:#FAEEDA;color:#633806;overflow:hidden;font-size:${w.photo?'0':'13px'};">${photo}</div>
            <div class="user-info">
              <p>${w.name} <span class="role-badge rb-trabajador">Trabajador</span> <span class="badge" style="background:#F4F4F4;color:#888;border:.5px solid #ddd;font-size:10px;">Sin acceso al sistema</span></p>
              <span style="font-size:11px;color:#5C7A9A;">${svc}</span>
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
              <button class="btn-sm" style="font-size:11px;" onclick="openAssignWorkerAccess(${w.id})">🔑 Asignar acceso</button>
            </div>
          </div>
        </div>`;
      }).join('');
      document.getElementById('users-list').innerHTML+= extra;
    }
  }
  /* ── Supervisores en SUPERVISORS sin cuenta de sistema ── */
  if(filter==='all'||filter==='supervisor'){
    const svInUsers=new Set(USERS.filter(u=>u.rol==='supervisor').map(u=>u.nombre));
    const svSinCuenta=SUPERVISORS.filter(sv=>!svInUsers.has(sv.name));
    if(svSinCuenta.length){
      const extra=svSinCuenta.map(sv=>{
        const photo=sv.photo?`<img src="${sv.photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`:sv.initials;
        return`<div class="user-card" style="opacity:.85;">
          <div class="user-card-top">
            <div class="user-av" style="background:#E8F0FE;color:#185FA5;overflow:hidden;font-size:${sv.photo?'0':'13px'};">${photo}</div>
            <div class="user-info">
              <p>${sv.name} <span class="role-badge rb-supervisor">Supervisor</span> <span class="badge" style="background:#F4F4F4;color:#888;border:.5px solid #ddd;font-size:10px;">Sin acceso al sistema</span></p>
              <span style="font-size:11px;color:#5C7A9A;">${sv.email||'Sin correo registrado'}</span>
            </div>
            <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;">
              <button class="btn-sm" style="font-size:11px;" onclick="openAssignSupervisorAccess(${sv.id})">🔑 Asignar acceso</button>
            </div>
          </div>
        </div>`;
      }).join('');
      document.getElementById('users-list').innerHTML+= extra;
    }
  }
  if(!document.getElementById('users-list').innerHTML)
    document.getElementById('users-list').innerHTML='<p style="font-size:13px;color:#185FA5;text-align:center;padding:1rem;">Sin usuarios en esta categoría</p>';
}
function openAssignWorkerAccess(wid){
  const w=WORKERS.find(x=>x.id===wid);if(!w)return;
  document.getElementById('admin-modal-title').textContent='🔑 Asignar acceso a '+w.name;
  document.getElementById('admin-modal-body').innerHTML=`
    <p style="font-size:12px;color:#185FA5;margin-bottom:12px;">Asigna un correo y contraseña para que ${w.name.split(' ')[0]} pueda iniciar sesión en la app.</p>
    <div class="frow full"><label>Correo electrónico</label><input type="email" id="wac-email" placeholder="trabajador@email.com" autofocus></div>
    <div class="frow full"><label>Contraseña</label><input type="password" id="wac-pass" placeholder="Mínimo 8 caracteres"></div>
    <div class="admin-modal-btns">
      <button class="btn-sm" onclick="doAssignWorkerAccess(${wid})">Guardar acceso</button>
      <button class="btn-sec" onclick="_closeModal()">Cancelar</button>
    </div>`;
  document.getElementById('admin-modal-ov').classList.add('open');
}
function doAssignWorkerAccess(wid){
  const w=WORKERS.find(x=>x.id===wid);if(!w)return;
  const email=(document.getElementById('wac-email')||{}).value?.trim()||'';
  const pass=(document.getElementById('wac-pass')||{}).value?.trim()||'';
  if(!email||!email.includes('@')){showToast('amber','⚠️','Ingresa un correo válido');return;}
  if(!pass||pass.length<8){showToast('amber','⚠️','La contraseña debe tener mínimo 8 caracteres');return;}
  if(USERS.find(u=>u.email.toLowerCase()===email.toLowerCase())){showToast('red','❌','Este correo ya está registrado');return;}
  const newId=USERS.length?Math.max(...USERS.map(u=>u.id))+1:0;
  USERS.push({id:newId,nombre:w.name,email,rol:'trabajador',tel:'',activo:true,accesoRevocado:false,password:pass});
  fbSaveUsers();
  _closeModal();
  renderUsersPanel();
  showToast('green','✅','Acceso asignado a '+w.name);
}
function openAssignSupervisorAccess(svId){
  const sv=SUPERVISORS.find(x=>x.id===svId);if(!sv)return;
  document.getElementById('admin-modal-title').textContent='🔑 Asignar acceso a '+sv.name;
  document.getElementById('admin-modal-body').innerHTML=`
    <p style="font-size:12px;color:#185FA5;margin-bottom:12px;">Asigna un correo y contraseña para que ${sv.name.split(' ')[0]} pueda iniciar sesión como supervisor.</p>
    <div class="frow full"><label>Correo electrónico</label><input type="email" id="svac-email" placeholder="supervisor@email.com" value="${sv.email||''}" autofocus></div>
    <div class="frow full"><label>Contraseña</label><input type="password" id="svac-pass" placeholder="Mínimo 8 caracteres"></div>
    <div class="admin-modal-btns">
      <button class="btn-sm" onclick="doAssignSupervisorAccess(${svId})">Guardar acceso</button>
      <button class="btn-sec" onclick="_closeModal()">Cancelar</button>
    </div>`;
  document.getElementById('admin-modal-ov').classList.add('open');
}
function doAssignSupervisorAccess(svId){
  const sv=SUPERVISORS.find(x=>x.id===svId);if(!sv)return;
  const email=(document.getElementById('svac-email')||{}).value?.trim()||'';
  const pass=(document.getElementById('svac-pass')||{}).value?.trim()||'';
  if(!email||!email.includes('@')){showToast('amber','⚠️','Ingresa un correo válido');return;}
  if(!pass||pass.length<8){showToast('amber','⚠️','La contraseña debe tener mínimo 8 caracteres');return;}
  if(USERS.find(u=>u.email.toLowerCase()===email.toLowerCase())){showToast('red','❌','Este correo ya está registrado');return;}
  // Guardar email en la entrada de SUPERVISORS también
  sv.email=email;
  fbSaveSupervisors();
  const newId=USERS.length?Math.max(...USERS.map(u=>u.id))+1:0;
  USERS.push({id:newId,nombre:sv.name,email,rol:'supervisor',tel:sv.tel||'',activo:true,accesoRevocado:false,password:pass});
  fbSaveUsers();
  _closeModal();
  renderUsersPanel();
  showToast('green','✅','Acceso asignado a '+sv.name);
}
function revokeAccess(i){
  if(USERS[i].rolProtegido===true){showToast('amber','⚠️','No puedes modificar al administrador principal');return;}
  USERS[i].accesoRevocado=!USERS[i].accesoRevocado;
  const action=USERS[i].accesoRevocado?'revocado':'restaurado';
  renderUsersPanel();
  showToast(USERS[i].accesoRevocado?'red':'green',USERS[i].accesoRevocado?'🔒':'✅',`Acceso ${action} para ${USERS[i].nombre}`);
  pushNotif('admin','🔑',USERS[i].accesoRevocado?'red':'green',`Acceso ${action}`,USERS[i].nombre+' — '+rolLabel(USERS[i].rol));updateNotifBadge();
}
function deleteUser(i){
  const u=USERS[i];
  if(!u)return;
  if(u.rolProtegido){showToast('amber','⚠️','No puedes eliminar al administrador principal');return;}
  if(!window.confirm('¿Eliminar a "'+u.nombre+'" permanentemente?\nEsta acción no se puede deshacer.')){return;}
  /* Eliminar de array de dominio y de Firestore */
  if(u.rol==='trabajador'){
    const w=WORKERS.find(ww=>ww.name===u.nombre);
    if(w){WORKERS.splice(WORKERS.indexOf(w),1);fbDeleteDoc('trabajadores',w.id);fbSaveWorkers();}
  }else if(u.rol==='supervisor'){
    const sv=SUPERVISORS.find(s=>s.name===u.nombre);
    if(sv){SUPERVISORS.splice(SUPERVISORS.indexOf(sv),1);fbDeleteDoc('supervisores',sv.id);fbSaveSupervisors();renderSupervisorsPanel();}
  }else if(u.rol==='personal_inm'){
    const pi=PERSONAL_INM.find(p=>p.email===u.email);
    if(pi){PERSONAL_INM.splice(PERSONAL_INM.indexOf(pi),1);fbDeleteDoc('personal_inm',pi.id);fbSavePersonalInm();}
  }else if(u.rol==='cliente_inm'){
    const ci=CLIENTS_INM.find(c=>c.email===u.email);
    if(ci){CLIENTS_INM.splice(CLIENTS_INM.indexOf(ci),1);fbDeleteDoc('clientes_inm',ci.id);fbSaveClientsInm();}
  }
  /* Eliminar de USERS y de Firestore */
  fbDeleteDoc('usuarios',u.id);
  USERS.splice(i,1);
  fbSaveUsers();
  renderUsersPanel();
  showToast('green','🗑️','"'+u.nombre+'" eliminado del sistema');
}
function filterUsers(role,btn){userRoleFilter=role;document.querySelectorAll('.urf-btn').forEach(b=>b.classList.remove('active'));if(btn)btn.classList.add('active');renderUsersPanel(role);}
function toggleEditUser(i){const el=document.getElementById('uep-'+i);if(el)el.classList.toggle('open');}
function saveUser(i){
  if(USERS[i].rolProtegido===true){showToast('amber','⚠️','El administrador principal no puede ser editado');return;}
  const nombre=document.getElementById('ue-nombre-'+i).value.trim(),email=document.getElementById('ue-email-'+i).value.trim(),tel=document.getElementById('ue-tel-'+i).value.trim(),rol=document.getElementById('ue-rol-'+i).value;
  if(!nombre||!email){showToast('amber','⚠️','Nombre y correo requeridos');return;}
  if(USERS.find((u,idx)=>idx!==i&&u.email.toLowerCase()===email.toLowerCase())){showToast('red','❌','Este correo ya está en uso por otro usuario');return;}
  if(tel&&USERS.find((u,idx)=>idx!==i&&u.tel&&u.tel.replace(/\s/g,'')===tel.replace(/\s/g,''))){showToast('amber','⚠️','Este teléfono ya está registrado en otro usuario');return;}
  const tmpPass=(document.getElementById('ue-tmppass-'+i)||{}).value||'';
  if(tmpPass){
    if(tmpPass.length<8){showToast('amber','⚠️','La contraseña temporal debe tener mínimo 8 caracteres');return;}
    USERS[i].password=tmpPass;
    showToast('green','🔑','Contraseña temporal asignada a '+nombre);
  }
  const oldRol=USERS[i].rol, oldNombre=USERS[i].nombre;
  USERS[i]={...USERS[i],nombre,email,tel,rol};
  /* ── Manejar cambio de rol: crear entrada en WORKERS / SUPERVISORS si no existe ── */
  if(rol==='trabajador'){
    const wExists=WORKERS.find(w=>w.name===nombre||w.name===oldNombre);
    if(!wExists){
      const wInit=nombre.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
      const wNewId=WORKERS.length?Math.max(...WORKERS.map(w=>w.id))+1:0;
      WORKERS.push({id:wNewId,name:nombre,initials:wInit,photo:null,type:[],zonas:[],status:'active',rating:0,services:0,since:new Date().getFullYear(),desc:'',mapX:50,mapY:50,tiempoLlegada:30,reviews:[],todayJobs:[]});
      fbSaveWorkers();
    } else if(wExists.name!==nombre){wExists.name=nombre;wExists.initials=nombre.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();fbSaveWorkers();}
  }
  if(rol==='supervisor'){
    const svExists=SUPERVISORS.find(s=>s.name===nombre||s.name===oldNombre);
    if(!svExists){
      const svInit=nombre.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
      const svNewId=SUPERVISORS.length?Math.max(...SUPERVISORS.map(s=>s.id))+1:0;
      SUPERVISORS.push({id:svNewId,name:nombre,initials:svInit,zonas:[],assignedWorkers:[],photo:null});
    } else if(svExists.name!==nombre){svExists.name=nombre;svExists.initials=nombre.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();}
    fbSaveSupervisors();
  }
  document.getElementById('uep-'+i).classList.remove('open');
  renderUsersPanel();
  fbSaveUsers();
  if(!tmpPass)showToast('green','✅','"'+nombre+'" actualizado');
}
function saveAdminProfile(i){
  const nombre=document.getElementById('ue-nombre-'+i).value.trim();
  const email=document.getElementById('ue-email-'+i).value.trim();
  const tel=document.getElementById('ue-tel-'+i).value.trim();
  if(!nombre||!email){showToast('amber','⚠️','Nombre y correo requeridos');return;}
  const curr=(document.getElementById('ue-cp-curr-'+i)||{}).value||'';
  const n1=(document.getElementById('ue-cp-new1-'+i)||{}).value||'';
  const n2=(document.getElementById('ue-cp-new2-'+i)||{}).value||'';
  if(curr||n1||n2){
    if(USERS[i].password&&curr!==USERS[i].password){showToast('red','❌','La contraseña actual es incorrecta');return;}
    if(n1.length<8){showToast('amber','⚠️','La nueva contraseña debe tener mínimo 8 caracteres');return;}
    if(n1!==n2){showToast('red','❌','Las contraseñas nuevas no coinciden');return;}
    USERS[i].password=n1;
  }
  USERS[i]={...USERS[i],nombre,email,tel};
  document.getElementById('uep-'+i).classList.remove('open');
  // Update header name + avatar initials if admin is currently logged in
  if(currentRole==='admin'){
    const init=nombre.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
    const av=document.getElementById('header-av');if(av)av.textContent=init;
    const uname=document.getElementById('header-uname');if(uname)uname.textContent=nombre;
  }
  renderUsersPanel();
  fbSaveUsers();
  showToast('green','✅','Perfil actualizado correctamente');
}
function addUser(){
  const nombre=document.getElementById('nu-nombre').value.trim(),email=document.getElementById('nu-email').value.trim(),pass=document.getElementById('nu-pass').value.trim(),rol=document.getElementById('nu-rol').value;
  if(!nombre||!email||!pass){showToast('amber','⚠️','Completa todos los campos');return;}
  if(USERS.find(u=>u.email.toLowerCase()===email.toLowerCase())){showToast('red','❌','Este correo ya está registrado en el sistema');return;}
  USERS.push({id:USERS.length,nombre,email,rol,tel:'',activo:true,accesoRevocado:false,password:pass});
  /* ── Auto-crear entrada en WORKERS o SUPERVISORS según el rol ── */
  if(rol==='trabajador'){
    if(!WORKERS.find(w=>w.name===nombre)){
      const wInit=nombre.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
      const wNewId=WORKERS.length?Math.max(...WORKERS.map(w=>w.id))+1:0;
      WORKERS.push({id:wNewId,name:nombre,initials:wInit,photo:null,type:[],zonas:[],status:'active',rating:0,services:0,since:new Date().getFullYear(),desc:'',mapX:50,mapY:50,tiempoLlegada:30,reviews:[],todayJobs:[]});
      fbSaveWorkers();
    }
  } else if(rol==='supervisor'){
    if(!SUPERVISORS.find(s=>s.name===nombre)){
      const svInit=nombre.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
      const svNewId=SUPERVISORS.length?Math.max(...SUPERVISORS.map(s=>s.id))+1:0;
      SUPERVISORS.push({id:svNewId,name:nombre,initials:svInit,zonas:[],assignedWorkers:[],photo:null});
      fbSaveSupervisors();
    }
  } else if(rol==='personal_inm'){
    /* Crear entrada en PERSONAL_INM si no existe */
    if(!PERSONAL_INM.find(p=>p.email===email)){
      const piInit=nombre.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
      const piNewId=PERSONAL_INM.length?Math.max(...PERSONAL_INM.map(p=>p.id))+1:0;
      PERSONAL_INM.push({id:piNewId,nombre,initials:piInit,email,password:pass,tel:'',activo:true,serviciosAsignados:[],asistencias:[],photo:null});
      fbSavePersonalInm();
      if(typeof renderPersonalInmAdmin==='function')renderPersonalInmAdmin();
    }
  } else if(rol==='cliente_inm'){
    /* Crear entrada en CLIENTS_INM si no existe */
    if(!CLIENTS_INM.find(c=>c.email===email)){
      const ciNewId=CLIENTS_INM.length?Math.max(...CLIENTS_INM.map(c=>c.id))+1:0;
      CLIENTS_INM.push({id:ciNewId,nombre,empresa:'',email,password:pass,tel:'',contratoId:null,activo:true,photo:null});
      fbSaveClientsInm();
      if(typeof renderAdminClientesInm==='function')renderAdminClientesInm();
    }
  }
  _closeModal();
  renderUsersPanel();
  if(rol==='trabajador'&&typeof renderStaffList==='function')renderStaffList('all');
  fbSaveUsers();showToast('green','✅','"'+nombre+'" registrado como '+rolLabel(rol));
}

/* Registro de supervisor desde el panel de supervisores */
function addSupervisorForm(){
  const nombre=(document.getElementById('nsv-nombre')||{}).value?.trim()||'';
  const email=(document.getElementById('nsv-email')||{}).value?.trim()||'';
  const tel=(document.getElementById('nsv-tel')||{}).value?.trim()||'';
  const pass=(document.getElementById('nsv-pass')||{}).value?.trim()||'';
  if(!nombre||!email||!pass){showToast('amber','⚠️','Nombre, correo y contraseña son obligatorios');return;}
  if(pass.length<8){showToast('amber','⚠️','La contraseña debe tener mínimo 8 caracteres');return;}
  if(USERS.find(u=>u.email.toLowerCase()===email.toLowerCase())){showToast('red','❌','Este correo ya está registrado');return;}
  if(tel&&USERS.find(u=>u.tel&&u.tel.replace(/\s/g,'')===tel.replace(/\s/g,''))){showToast('amber','⚠️','Este teléfono ya está registrado en otro usuario');return;}
  /* Crear entrada en SUPERVISORS */
  const svInit=nombre.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
  const svNewId=SUPERVISORS.length?Math.max(...SUPERVISORS.map(s=>s.id))+1:0;
  SUPERVISORS.push({id:svNewId,name:nombre,initials:svInit,zonas:[],assignedWorkers:[],photo:null});
  /* Crear cuenta de acceso en USERS */
  const uNewId=USERS.length?Math.max(...USERS.map(u=>u.id))+1:0;
  USERS.push({id:uNewId,nombre,email,rol:'supervisor',tel,activo:true,accesoRevocado:false,password:pass});
  fbSaveSupervisors();fbSaveUsers();
  _closeModal();
  renderSupervisorsPanel();renderUsersPanel();
  showToast('green','✅','"'+nombre+'" registrado como supervisor');
}

/* ── ADMIN: FACTURACIÓN ── */
function filterFacturas(filter,btn){
  facturaFilter=filter;
  document.querySelectorAll('#fact-filter-tabs .msg-tab').forEach(b=>b.classList.remove('active'));
  if(btn)btn.classList.add('active');
  renderFacturacionAdmin();
}
function setFacturaStatus(id,newStatus){
  const f=SOLICITUDES_FACTURA.find(x=>x.id===id);if(!f)return;
  f.status=newStatus;
  const labels={nueva:'Nueva',atendida:'Atendida',enviada:'Enviada'};
  showToast(newStatus==='enviada'?'green':newStatus==='atendida'?'amber':'blue','🧾','Factura de '+f.clienteNombre+' marcada como '+labels[newStatus]);
  renderFacturacionAdmin();
}
function toggleFactFiscal(id){const el=document.getElementById('ff-'+id);if(el)el.classList.toggle('open');}
function renderFacturacionAdmin(){
  const el=document.getElementById('fact-list');if(!el)return;
  const list=facturaFilter==='todas'?SOLICITUDES_FACTURA:SOLICITUDES_FACTURA.filter(f=>f.status===facturaFilter);
  if(!list.length){
    el.innerHTML='<p style="font-size:13px;color:#185FA5;text-align:center;padding:1.5rem 0;">'+
      (facturaFilter==='todas'?'Sin solicitudes de facturación aún.':'Sin solicitudes con este estado.')+'</p>';
    return;
  }
  const statusBadge=s=>({
    nueva:'<span class="badge" style="background:#DBEAFE;color:#1E40AF;font-weight:600;">🔵 Nueva</span>',
    atendida:'<span class="badge" style="background:#FEF3C7;color:#92400E;font-weight:600;">🟡 Atendida</span>',
    enviada:'<span class="badge" style="background:#D1FAE5;color:#065F46;font-weight:600;">✅ Enviada</span>',
  }[s]||'');
  const statusBtns=f=>{
    const btns=[];
    if(f.status==='nueva')btns.push(`<button class="btn-sm" style="background:#F59E0B;color:#fff;" onclick="setFacturaStatus(${f.id},'atendida')">Marcar atendida</button>`);
    if(f.status!=='enviada')btns.push(`<button class="btn-sm" onclick="setFacturaStatus(${f.id},'enviada')">Marcar enviada</button>`);
    if(f.status!=='nueva')btns.push(`<button class="btn-sec" onclick="setFacturaStatus(${f.id},'nueva')">Reabrir</button>`);
    return btns.join('');
  };
  const fiscalRows=f=>{
    const fi=f.fiscal;if(!fi)return '';
    if(fi.tipo==='fisica'){
      return`<div class="inm-grid" style="gap:4px 14px;">
        <div class="inm-field" style="grid-column:1/-1;"><strong>Nombre fiscal</strong>${fi.nombre||'—'}</div>
        <div class="inm-field"><strong>RFC</strong>${fi.rfc||'—'}</div>
        <div class="inm-field"><strong>CURP</strong>${fi.curp||'—'}</div>
        <div class="inm-field"><strong>Correo fiscal</strong>${fi.correoFiscal||'—'}</div>
        <div class="inm-field"><strong>Régimen fiscal</strong>${fi.regimen||'—'}</div>
        <div class="inm-field"><strong>Uso CFDI</strong>${fi.cfdi||'—'}</div>
        <div class="inm-field" style="grid-column:1/-1;"><strong>Domicilio fiscal</strong>${fi.dir||'—'}${fi.cp?' · CP '+fi.cp:''}${fi.estado?', '+fi.estado:''}</div>
      </div>`;
    }else{
      return`<div class="inm-grid" style="gap:4px 14px;">
        <div class="inm-field" style="grid-column:1/-1;"><strong>Razón social</strong>${fi.razonSocial||'—'}</div>
        <div class="inm-field"><strong>RFC</strong>${fi.rfc||'—'}</div>
        <div class="inm-field"><strong>Representante</strong>${fi.rep||'—'}</div>
        <div class="inm-field"><strong>Correo fiscal</strong>${fi.correoFiscal||'—'}</div>
        <div class="inm-field"><strong>Teléfono</strong>${fi.tel||'—'}</div>
        <div class="inm-field"><strong>Régimen fiscal</strong>${fi.regimen||'—'}</div>
        <div class="inm-field"><strong>Uso CFDI</strong>${fi.cfdi||'—'}</div>
        <div class="inm-field" style="grid-column:1/-1;"><strong>Domicilio fiscal</strong>${fi.dir||'—'}${fi.cp?' · CP '+fi.cp:''}${fi.estado?', '+fi.estado:''}</div>
      </div>`;
    }
  };
  el.innerHTML=[...list].reverse().map(f=>{
    const fechaTxt=f.fecha?new Date(f.fecha+'T12:00:00').toLocaleDateString('es-MX',{weekday:'short',day:'numeric',month:'short',year:'numeric'}):'—';
    const createdTxt=f.createdAt?new Date(f.createdAt).toLocaleDateString('es-MX',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'';
    const tipoLabel=f.fiscal?.tipo==='fisica'?'Persona Física':'Persona Moral';
    return`<div class="user-card" style="margin-bottom:10px;">
      <div class="user-card-top">
        <div class="user-av" style="background:#E6F1FB;color:#042C53;font-size:12px;">${f.clienteNombre.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}</div>
        <div class="user-info">
          <p style="font-weight:600;font-size:13px;color:#042C53;">${f.clienteNombre} ${statusBadge(f.status)}</p>
          <span style="font-size:11px;color:#5A8CB0;">${f.clienteEmail||'—'}</span>
        </div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0;">
          <span style="font-size:11px;color:#185FA5;font-weight:500;">${f.total}</span>
          <span style="font-size:10px;color:#5A8CB0;">${createdTxt}</span>
        </div>
      </div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;margin:6px 0 8px;font-size:11px;color:#5A8CB0;border-top:.5px solid #E6F1FB;padding-top:8px;">
        <span>🔧 ${f.svc}</span>
        <span>📅 ${fechaTxt}</span>
        <span>🕐 ${f.hora||'—'}</span>
        <span>📄 ${tipoLabel}</span>
      </div>
      <button class="btn-sm" style="background:#E6F1FB;color:#042C53;margin-bottom:8px;width:100%;text-align:left;" onclick="toggleFactFiscal(${f.id})">
        🧾 Datos fiscales ▼
      </button>
      <div id="ff-${f.id}" class="user-edit-panel" style="background:#F8FBFF;padding:10px;border-radius:8px;margin-bottom:8px;">
        ${fiscalRows(f)}
      </div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;">${statusBtns(f)}</div>
    </div>`;
  }).join('');
}
function toggleUser(i){
  if(USERS[i].rolProtegido===true){showToast('amber','⚠️','El administrador principal no puede ser desactivado');return;}
  USERS[i].activo=!USERS[i].activo;
  // Sincronizar estado en WORKERS para que todos los paneles reflejen el cambio
  if(USERS[i].rol==='trabajador'){
    const w=WORKERS.find(x=>x.name===USERS[i].nombre);
    if(w)w.status=USERS[i].activo?'active':'inactive';
  }
  renderUsersPanel();
  if(typeof renderStaffList==='function')renderStaffList('all');
  if(typeof renderSVWorkers==='function')renderSVWorkers();
  fbSaveUsers();fbSaveWorkers();
  showToast(USERS[i].activo?'green':'amber',USERS[i].activo?'✅':'⚠️',USERS[i].nombre+' — '+(USERS[i].activo?'Activado':'Desactivado'));
}

/* CLIENT NOTES */
function renderWorkerNotes(){
  const el=document.getElementById('worker-notes-list');if(!el)return;
  const myId=(currentWorkerRef||WORKERS[0]).id;
  const myNotes=CLIENT_NOTES.filter(n=>n.workerId===myId);
  el.innerHTML=myNotes.length?myNotes.map(n=>`<div class="note-card"><div class="note-card-header"><p>👤 ${n.client}</p><span>${n.date}</span></div><p class="note-card-body">${n.note}</p><p class="note-card-meta">Solo visible para tu supervisor y administrador</p></div>`).join(''):`<p style="font-size:13px;color:#185FA5;text-align:center;padding:1rem;">Sin notas aún</p>`;
}
function addWorkerNote(){
  const client=document.getElementById('nota-cliente').value;
  const note=document.getElementById('nota-texto').value.trim();
  if(!note){showToast('amber','⚠️','Escribe el contenido de la nota');return;}
  const myW=currentWorkerRef||WORKERS[0];
  CLIENT_NOTES.push({workerId:myW.id,workerName:myW.name,client,note,date:new Date().toLocaleDateString('es-MX',{day:'numeric',month:'short'})});
  selectTrabajadorTab('notas',document.querySelector('#trabajador-dash-tabs .dash-tab.active'));
  showToast('green','📝','Nota guardada. Solo la verán tu supervisor y el admin.');
}
function renderSVNotes(){
  const el=document.getElementById('sv-notes-list');if(!el)return;
  const myWorkerIds=SUPERVISOR_ASSIGNED;
  const notes=CLIENT_NOTES.filter(n=>myWorkerIds.includes(n.workerId));
  el.innerHTML=notes.length?notes.map(n=>`<div class="note-card"><div class="note-card-header"><p>🧹 ${n.workerName} sobre <strong>${n.client}</strong></p><span>${n.date}</span></div><p class="note-card-body">${n.note}</p></div>`).join(''):`<p style="font-size:13px;color:#185FA5;text-align:center;padding:1rem;">Tus trabajadores no han escrito notas aún</p>`;
}
function renderAdminNotes(){
  const el=document.getElementById('admin-notes-list');if(!el)return;
  el.innerHTML=CLIENT_NOTES.length?CLIENT_NOTES.map(n=>`<div class="note-card"><div class="note-card-header"><p>🧹 ${n.workerName} sobre 👤 <strong>${n.client}</strong></p><span>${n.date}</span></div><p class="note-card-body">${n.note}</p></div>`).join(''):`<p style="font-size:13px;color:#185FA5;text-align:center;padding:1rem;">Sin notas de trabajadores</p>`;
}

/* ─── SERVICE CONFIG ADMIN ─── */
function _safeCalcPrice(){try{if(document.getElementById('svc'))calcPrice();}catch(e){}}

/* helper: price input row */
function _prow(lbl,val,onch){
  return`<div class="svc-price-row">
    <span class="svc-price-lbl">${lbl}</span>
    <label class="svc-price-inp"><span>$</span><input type="number" value="${val}" min="0" step="10" onchange="${onch};_safeCalcPrice();fbSaveConfig();" style="width:80px;"></label>
  </div>`;
}

/* collapsible section header inside a card */
function _secHdr(icon,title,id){
  return`<button class="stc-sec-hdr" onclick="(function(b){var p=b.nextElementSibling;var open=p.classList.toggle('stc-sec-open');b.querySelector('.stc-sec-arrow').textContent=open?'▲':'▼';})(this)">
    <span>${icon} ${title}</span><span class="stc-sec-arrow">▼</span>
  </button>`;
}

/* price fields per service */
function _svcPriceFieldsHtml(svcId,svcIdx){
  if(svcId==='depto'){
    return`${_secHdr('💰','Precios','p-depto')}
    <div class="stc-sec-body stc-sec-open">
      <p class="svc-prices-sub">Limpieza base</p>
      ${_prow('Precio base',PRICES.depto.base,`PRICES.depto.base=parseInt(this.value)||0;SVC_TYPES[${svcIdx}].precio=PRICES.depto.base`)}
      <p class="svc-prices-sub" style="margin-top:8px;">Habitaciones y baños extra</p>
      ${_prow('Por habitación',PRICES.depto.hab,`PRICES.depto.hab=parseInt(this.value)||0`)}
      ${_prow('Por baño',PRICES.depto.bano,`PRICES.depto.bano=parseInt(this.value)||0`)}
    </div>`;
  }
  if(svcId==='auto'){
    return`${_secHdr('💰','Precios','p-auto')}
    <div class="stc-sec-body stc-sec-open">
      <p class="svc-prices-sub">Tipos de vehículo</p>
      ${_prow('Sedán',PRICES.auto.sedan,`PRICES.auto.sedan=parseInt(this.value)||0;SVC_TYPES[${svcIdx}].precio=PRICES.auto.sedan`)}
      ${_prow('SUV',PRICES.auto.suv,`PRICES.auto.suv=parseInt(this.value)||0`)}
      ${_prow('Pickup',PRICES.auto.pickup,`PRICES.auto.pickup=parseInt(this.value)||0`)}
    </div>`;
  }
  if(svcId==='tapiceria'){
    return`${_secHdr('💰','Precios','p-tap')}
    <div class="stc-sec-body stc-sec-open">
      <p class="svc-prices-sub">Sillas</p>
      ${_prow('Por silla',PRICES.tap.silla.unit,`PRICES.tap.silla.unit=parseInt(this.value)||0;SVC_TYPES[${svcIdx}].precio=PRICES.tap.silla.unit`)}
      <p class="svc-prices-sub">Sofás (por pieza)</p>
      ${_prow('Tela',PRICES.tap.sofa.tela,`PRICES.tap.sofa.tela=parseInt(this.value)||0`)}
      ${_prow('Piel',PRICES.tap.sofa.piel,`PRICES.tap.sofa.piel=parseInt(this.value)||0`)}
      ${_prow('Mixto',PRICES.tap.sofa.mixta,`PRICES.tap.sofa.mixta=parseInt(this.value)||0`)}
      <p class="svc-prices-sub">Tapetes y alfombras (por m²)</p>
      ${_prow('Tapete',PRICES.tap.tapete.factor,`PRICES.tap.tapete.factor=parseInt(this.value)||0`)}
      ${_prow('Alfombra',PRICES.tap.alfombra.factor,`PRICES.tap.alfombra.factor=parseInt(this.value)||0`)}
      <p class="svc-prices-sub">Colchones</p>
      ${_prow('Individual',PRICES.tap.colchon.individual,`PRICES.tap.colchon.individual=parseInt(this.value)||0`)}
      ${_prow('Matrimonial',PRICES.tap.colchon.matrimonial,`PRICES.tap.colchon.matrimonial=parseInt(this.value)||0`)}
      ${_prow('King size',PRICES.tap.colchon.kingsize,`PRICES.tap.colchon.kingsize=parseInt(this.value)||0`)}
    </div>`;
  }
  /* custom service */
  return`${_secHdr('💰','Precio','p-cust')}
  <div class="stc-sec-body stc-sec-open">
    ${_prow('Precio base',SVC_TYPES[svcIdx].precio,`SVC_TYPES[${svcIdx}].precio=parseInt(this.value)||0`)}
  </div>`;
}

/* extras section per service */
function _svcExtrasHtml(svcId){
  const exts=SVC_EXTRAS.filter(x=>x.svcId===svcId);
  const rows=exts.length
    ? exts.map(x=>`<div class="svc-extra-row">
        <input type="checkbox" ${x.activo!==false?'checked':''} onchange="toggleSvcExtra('${x.id}')">
        <span class="svc-extra-name">${x.nombre}</span>
        <label class="svc-price-inp" style="flex-shrink:0;"><span>$</span><input type="number" value="${x.precio}" min="0" step="10" style="width:70px;" onchange="setSvcExtraPrice('${x.id}',this.value)"></label>
        <button class="btn-danger" style="padding:3px 8px;font-size:11px;" onclick="removeSvcExtra('${x.id}')">✕</button>
      </div>`).join('')
    : `<p style="font-size:11px;color:#8A9BB0;text-align:center;padding:6px 0;">Sin extras. Agrega el primero.</p>`;
  return`${_secHdr('⚡','Extras opcionales','ext-'+svcId)}
  <div class="stc-sec-body stc-sec-open">
    ${rows}
    <div class="svc-extra-add">
      <input type="text" id="ne-nombre-${svcId}" placeholder="Nombre del extra" class="svc-extra-input">
      <label class="svc-price-inp" style="flex-shrink:0;"><span>$</span><input type="number" id="ne-precio-${svcId}" placeholder="0" min="0" step="10" style="width:70px;"></label>
      <button class="btn-sm" onclick="addSvcExtra('${svcId}')">+ Agregar</button>
    </div>
  </div>`;
}

/* ══════════════════════════════════════════════════════
   ADMIN MODAL FLOTANTE
   ══════════════════════════════════════════════════════ */
function openAdminModal(type){
  const titles={
    servicio:'➕ Agregar tipo de servicio',
    limpieza:'➕ Agregar tipo de limpieza',
    urgencia:'➕ Agregar nivel de urgencia',
    zona:'➕ Agregar zona de cobertura',
    usuario:'➕ Registrar usuario (Admin / Cliente)',
    supervisor:'➕ Registrar nuevo supervisor',
  };
  const bodies={
    servicio:`
      <div class="frow">
        <div><label>Nombre del servicio</label><input type="text" id="ns-name" placeholder="Ej: Limpieza de oficina"></div>
        <div><label>Precio base ($)</label><input type="number" id="ns-price" placeholder="500"></div>
      </div>
      <div class="frow">
        <div><label>Duración mín. (min)</label><input type="number" id="ns-dur-min" placeholder="30"></div>
        <div><label>Duración máx. (min)</label><input type="number" id="ns-dur-max" placeholder="60"></div>
      </div>
      <div class="admin-modal-btns">
        <button class="btn-sm" onclick="addSvcType()">Agregar servicio</button>
        <button class="btn-sec" onclick="closeAdminModal()">Cancelar</button>
      </div>`,
    limpieza:`
      <div class="frow">
        <div><label>Nombre</label><input type="text" id="nct-nombre" placeholder="Ej: Limpieza ecológica"></div>
        <div><label>Factor de precio (1.0 = base)</label><input type="number" id="nct-factor" placeholder="1.2" step="0.1" min="1"></div>
      </div>
      <div class="frow full"><label>Descripción</label><input type="text" id="nct-desc" placeholder="Breve descripción del tipo de limpieza"></div>
      <div class="admin-modal-btns">
        <button class="btn-sm" onclick="addCleaningType()">Agregar tipo</button>
        <button class="btn-sec" onclick="closeAdminModal()">Cancelar</button>
      </div>`,
    urgencia:`
      <div class="frow">
        <div><label>Nombre</label><input type="text" id="nu-name" placeholder="Ej: Express"></div>
        <div><label>Incremento sobre precio (%)</label><input type="number" id="nu-pct" placeholder="50"></div>
      </div>
      <div class="admin-modal-btns">
        <button class="btn-sm" onclick="addUrgencia()">Agregar urgencia</button>
        <button class="btn-sec" onclick="closeAdminModal()">Cancelar</button>
      </div>`,
    zona:`
      <div class="frow full"><label>Nombre de la zona</label><input type="text" id="nz-nombre" placeholder="Ej: Xochimilco / Tláhuac"></div>
      <div class="frow full"><label>Colonias que cubre</label><input type="text" id="nz-colonias" placeholder="Ej: Xochimilco, Santa Cecilia, La Nopalera"></div>
      <div class="admin-modal-btns">
        <button class="btn-sm" onclick="addZona()">Agregar zona</button>
        <button class="btn-sec" onclick="closeAdminModal()">Cancelar</button>
      </div>`,
    usuario:`
      <div style="background:rgba(26,86,219,.08);border-radius:8px;padding:10px 12px;margin-bottom:12px;font-size:12px;color:#185FA5;line-height:1.5;">
        💡 Este formulario es para <strong>Administradores</strong> y <strong>Clientes regulares</strong>.<br>
        Para otros roles usa sus paneles dedicados:<br>
        <span style="color:#042C53;">• Trabajadores → Personal &nbsp;• Supervisores → Supervisores</span><br>
        <span style="color:#042C53;">• Personal Inm → Personal Inm &nbsp;• Clientes Inm → Inmuebles</span>
      </div>
      <div class="frow">
        <div><label>Nombre completo</label><input type="text" id="nu-nombre" placeholder="María López"></div>
        <div><label>Correo electrónico</label><input type="email" id="nu-email" placeholder="maria@email.com"></div>
      </div>
      <div class="frow">
        <div><label>Contraseña temporal</label><input type="password" id="nu-pass" placeholder="Mínimo 8 caracteres"></div>
        <div><label>Rol</label><select id="nu-rol">
          <option value="admin">Administrador</option>
          <option value="cliente">Cliente regular</option>
        </select></div>
      </div>
      <div class="admin-modal-btns">
        <button class="btn-sm" onclick="addUser()">Registrar usuario</button>
        <button class="btn-sec" onclick="closeAdminModal()">Cancelar</button>
      </div>`,
    supervisor:`
      <div class="frow">
        <div><label>Nombre completo</label><input type="text" id="nsv-nombre" placeholder="Luis Torres"></div>
        <div><label>Correo electrónico</label><input type="email" id="nsv-email" placeholder="luis@ayalym.com"></div>
      </div>
      <div class="frow">
        <div><label>Teléfono</label><input type="text" id="nsv-tel" placeholder="+52 55 0000 0000"></div>
        <div><label>Contraseña</label><input type="password" id="nsv-pass" placeholder="Mínimo 8 caracteres"></div>
      </div>
      <div class="admin-modal-btns">
        <button class="btn-sm" onclick="addSupervisorForm()">Registrar supervisor</button>
        <button class="btn-sec" onclick="closeAdminModal()">Cancelar</button>
      </div>`,
  };
  document.getElementById('admin-modal-title').textContent=titles[type]||'Agregar';
  document.getElementById('admin-modal-body').innerHTML=bodies[type]||'';
  document.getElementById('admin-modal-ov').classList.add('open');
  setTimeout(()=>{const f=document.querySelector('#admin-modal-body input');if(f)f.focus();},120);
}
function closeAdminModal(e){
  if(e&&e.target!==document.getElementById('admin-modal-ov'))return;
  document.getElementById('admin-modal-ov').classList.remove('open');
}
function _closeModal(){document.getElementById('admin-modal-ov').classList.remove('open');}

/* Colapsado de service cards */
function toggleSvcCard(svcId){
  /* Por defecto (undefined) = colapsado. false = abierto, true = colapsado */
  const isCollapsed = svcCardCollapsed[svcId] !== false; /* undefined y true = colapsado */
  svcCardCollapsed[svcId] = !isCollapsed; /* false = abierto, true = colapsado */
  const body=document.getElementById('stc-body-'+svcId);
  const chev=document.getElementById('stc-chev-'+svcId);
  if(body)body.classList.toggle('collapsed',!!svcCardCollapsed[svcId]);
  if(chev)chev.classList.toggle('open',svcCardCollapsed[svcId]===false);
}

function renderSvcDurationList(){
  const el=document.getElementById('svc-duration-list');if(!el)return;
  el.innerHTML=SVC_TYPES.map((s,i)=>{
    const isOn=s.activo!==false;
    const collapsed=svcCardCollapsed[s.id]!==false; /* default colapsado */
    return`<div class="svc-type-card${isOn?'':' inactive'}">
      <div class="stc-hdr" onclick="toggleSvcCard('${s.id}')" style="padding:10px 12px;">
        <div style="display:flex;align-items:center;gap:8px;flex:1;">
          <div class="stc-status-dot${isOn?' stc-status-dot--on':''}"></div>
          <p style="font-size:13px;font-weight:600;color:#042C53;margin:0;">${s.nombre}</p>
          <span style="font-size:11px;color:#5C7A9A;">${isOn?'Activo':'Inactivo'}</span>
        </div>
        <div style="display:flex;gap:6px;align-items:center;flex-shrink:0;" onclick="event.stopPropagation()">
          <button class="toggle-btn${isOn?' on':''}" onclick="toggleSvcType(${i})">${isOn?'Activo':'Inactivo'}</button>
          <button class="btn-danger" onclick="removeSvcType(${i})">✕</button>
          <span id="stc-chev-${s.id}" class="stc-chevron${collapsed?'':' open'}">▼</span>
        </div>
      </div>
      <div id="stc-body-${s.id}" class="stc-body${collapsed?' collapsed':''}">
        ${_secHdr('⏱','Duración','dur-'+s.id)}
        <div class="stc-sec-body stc-sec-open">
          <div class="svc-dur-row">
            <span>Mínima</span>
            <label class="svc-price-inp"><input type="number" value="${s.durMin}" min="15" step="15" onchange="SVC_TYPES[${i}].durMin=parseInt(this.value);updateDurationBanner();renderTimeSlots();fbSaveConfig();" style="width:60px;text-align:center;"></label>
            <span>—</span>
            <span>Máxima</span>
            <label class="svc-price-inp"><input type="number" value="${s.durMax}" min="15" step="15" onchange="SVC_TYPES[${i}].durMax=parseInt(this.value);updateDurationBanner();renderTimeSlots();fbSaveConfig();" style="width:60px;text-align:center;"></label>
            <span style="color:#5C7A9A;">min</span>
          </div>
        </div>
        ${_svcPriceFieldsHtml(s.id,i)}
        ${_svcExtrasHtml(s.id)}
      </div>
    </div>`;}).join('');
}

function toggleSvcType(i){SVC_TYPES[i].activo=!(SVC_TYPES[i].activo!==false);renderSvcDurationList();renderSvcSelect();savePricesToLanding();fbSaveConfig();showToast(SVC_TYPES[i].activo!==false?'green':'blue',SVC_TYPES[i].activo!==false?'✅':'⚪','"'+SVC_TYPES[i].nombre+'" '+(SVC_TYPES[i].activo!==false?'activado':'desactivado'));}
function addSvcType(){const n=document.getElementById('ns-name').value.trim(),p=parseInt(document.getElementById('ns-price').value)||500,dMin=parseInt(document.getElementById('ns-dur-min').value)||30,dMax=parseInt(document.getElementById('ns-dur-max').value)||60;if(!n){showToast('amber','⚠️','Escribe el nombre');return;}SVC_TYPES.push({id:'s'+Date.now(),nombre:n,precio:p,durMin:dMin,durMax:dMax,activo:true});_closeModal();renderSvcDurationList();renderSvcSelect();savePricesToLanding();fbSaveConfig();showToast('green','✅','"'+n+'" agregado');}
function removeSvcType(i){const n=SVC_TYPES[i].nombre;SVC_TYPES.splice(i,1);renderSvcDurationList();renderSvcSelect();fbSaveConfig();showToast('blue','🗑️','"'+n+'" eliminado');}

/* extras CRUD */
function addSvcExtra(svcId){
  const nEl=document.getElementById('ne-nombre-'+svcId),pEl=document.getElementById('ne-precio-'+svcId);
  const nombre=(nEl?nEl.value.trim():'');const precio=parseInt(pEl?pEl.value:0)||0;
  if(!nombre){showToast('amber','⚠️','Escribe el nombre del extra');return;}
  SVC_EXTRAS.push({id:'ex'+Date.now(),svcId,nombre,precio,activo:true});
  renderSvcDurationList();renderSvcExtrasForClient(document.getElementById('svc')?.value||'');
  fbSaveConfig();showToast('green','✅','"'+nombre+'" agregado como extra');
}
function removeSvcExtra(id){
  const x=SVC_EXTRAS.find(e=>e.id===id);
  SVC_EXTRAS=SVC_EXTRAS.filter(e=>e.id!==id);
  renderSvcDurationList();renderSvcExtrasForClient(document.getElementById('svc')?.value||'');
  fbSaveConfig();if(x)showToast('blue','🗑️','"'+x.nombre+'" eliminado');
}
function toggleSvcExtra(id){
  const x=SVC_EXTRAS.find(e=>e.id===id);if(!x)return;
  x.activo=!x.activo;
  renderSvcExtrasForClient(document.getElementById('svc')?.value||'');
  fbSaveConfig();
}
function setSvcExtraPrice(id,val){
  const x=SVC_EXTRAS.find(e=>e.id===id);if(x)x.precio=parseInt(val)||0;
  _safeCalcPrice();fbSaveConfig();
}

/* CLEANING TYPES ADMIN */
function renderCleaningTypesAdmin(){
  const el=document.getElementById('cleaning-types-admin-list');if(!el)return;
  el.innerHTML=CLEANING_TYPES.map((ct,i)=>{
    const isOn=ct.activo!==false;
    const cid='ct-'+ct.id;
    const collapsed=svcCardCollapsed[cid]!==false; /* default colapsado */
    return`<div class="svc-type-card${isOn?'':' inactive'}">
      <div class="stc-hdr" onclick="toggleSvcCard('${cid}')" style="padding:10px 12px;">
        <div style="display:flex;align-items:center;gap:8px;flex:1;">
          <div class="stc-status-dot${isOn?' stc-status-dot--on':''}"></div>
          <p style="font-size:13px;font-weight:600;color:#042C53;margin:0;">${ct.nombre}</p>
        </div>
        <div style="display:flex;gap:6px;align-items:center;flex-shrink:0;" onclick="event.stopPropagation()">
          <button class="toggle-btn${isOn?' on':''}" onclick="toggleCleaningType(${i})">${isOn?'Activo':'Inactivo'}</button>
          <button class="btn-danger" onclick="${i<3?`showToast('amber','⚠️','No se puede eliminar un tipo predeterminado')`:`removeCleaningType(${i})`}">✕</button>
          <span id="stc-chev-${cid}" class="stc-chevron${collapsed?'':' open'}">▼</span>
        </div>
      </div>
      <div id="stc-body-${cid}" class="stc-body${collapsed?' collapsed':''}" style="padding:0 12px 12px;">
        <p style="font-size:12px;color:#185FA5;margin:8px 0 6px;">${ct.descripcion}</p>
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-size:12px;color:#185FA5;">Factor de precio:</span>
          <input type="number" value="${ct.factor}" min="1" step="0.1" style="width:70px;" onchange="CLEANING_TYPES[${i}].factor=parseFloat(this.value);renderCleaningTypesForClient();calcPrice();">
          <span style="font-size:12px;color:#185FA5;">(base × factor)</span>
        </div>
      </div>
    </div>`;}).join('');
}
function toggleCleaningType(i){CLEANING_TYPES[i].activo=!(CLEANING_TYPES[i].activo!==false);renderCleaningTypesAdmin();renderCleaningTypesForClient();fbSaveConfig();showToast(CLEANING_TYPES[i].activo!==false?'green':'blue',CLEANING_TYPES[i].activo!==false?'✅':'⚪','"'+CLEANING_TYPES[i].nombre+'" '+(CLEANING_TYPES[i].activo!==false?'activado':'desactivado'));}
function addCleaningType(){const n=document.getElementById('nct-nombre').value.trim(),f=parseFloat(document.getElementById('nct-factor').value)||1.0,d=document.getElementById('nct-desc').value.trim();if(!n){showToast('amber','⚠️','Escribe el nombre');return;}CLEANING_TYPES.push({id:'ct'+Date.now(),nombre:n,descripcion:d||'Servicio de limpieza especializado',factor:f,activo:true});_closeModal();renderCleaningTypesAdmin();renderCleaningTypesForClient();fbSaveConfig();showToast('green','✅','"'+n+'" agregado');}
function removeCleaningType(i){if(i<3){showToast('amber','⚠️','No se pueden eliminar los tipos predeterminados');return;}const n=CLEANING_TYPES[i].nombre;CLEANING_TYPES.splice(i,1);renderCleaningTypesAdmin();renderCleaningTypesForClient();showToast('blue','🗑️','"'+n+'" eliminado');}

/* WORKER QUINCENA */
function renderWorkerQuincena(){
  // Re-render the active tab so quincena data stays in sync when deductions are applied
  const activeTab=document.querySelector('#trabajador-dash-tabs .dash-tab.active');
  const tabName=activeTab?activeTab.getAttribute('onclick').match(/'(\w+)'/)?.[1]:'hoy';
  selectTrabajadorTab(tabName,activeTab);
}

/* CLIENT DISCOUNT */
function setClientDiscount(amount,reason){
  clientDiscount=amount;
  const banner=document.getElementById('discount-banner');
  if(amount>0&&banner){banner.style.display='flex';const txt=document.getElementById('discount-banner-text');if(txt)txt.textContent=reason;const tag=document.getElementById('discount-tag');if(tag)tag.textContent='-$'+amount.toLocaleString('es-MX');calcPrice();pushNotif('cliente','🎁','blue','Tienes un descuento','-$'+amount+' en tu próxima reserva');updateNotifBadge();}
}

/* ── Urgency helpers ── */
function _getSelectedUrgencia(){
  const el=document.getElementById('urgencia');if(!el)return null;
  const opt=el.options[el.selectedIndex];if(!opt)return null;
  const uid=opt.dataset.uid;
  return URGENCIAS.find(u=>u.id===uid)||null;
}
function _workerMeetsUrgencia(w,urg){
  if(!urg||urg.modo==='sin_filtro')return true;
  if(urg.modo==='minutos') return (w.tiempoLlegada||999)<=(urg.maxMin||999);
  if(urg.modo==='mismo_dia'){
    const today=new Date().toISOString().split('T')[0];
    const svcId=document.getElementById('svc')?document.getElementById('svc').value:'';
    const svcData=SVC_TYPES.find(s=>s.id===svcId)||{durMax:90};
    const slots=['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00'];
    return slots.some(sl=>{
      const[sh,sm]=sl.split(':').map(Number);
      const sMin=sh*60+sm;
      if(sMin>17*60)return false;
      const dayJobs=w.todayJobs.filter(j=>j.fecha===today);
      return !dayJobs.some(j=>{
        const[jh,jm]=j.hora.split(':').map(Number);
        const jS=jh*60+jm,jE=jS+j.durMax+BUFFER_MIN;
        return sMin<jE&&jS<eMin;
      });
    });
  }
  return true;
}
function _updateUrgStep2Hint(){
  const urg=_getSelectedUrgencia();
  const el=document.getElementById('urg-step2-hint');if(!el)return;
  if(!urg||urg.modo==='sin_filtro'){el.textContent='Se muestran todos los trabajadores disponibles en tu zona.';el.className='urg-step2-hint';}
  else if(urg.modo==='mismo_dia'){el.textContent='📅 Solo trabajadores con horario libre hoy. La fecha se fija a hoy automáticamente.';el.className='urg-step2-hint urg-step2-hint--amber';}
  else if(urg.modo==='minutos'){el.textContent=`⚡ Solo trabajadores que llegan en ≤ ${urg.maxMin} min. La fecha se fija a hoy automáticamente.`;el.className='urg-step2-hint urg-step2-hint--amber';}
}
function onUrgenciaChange(){
  _updateFechaByUrgencia();
  _updateUrgStep2Hint();
  calcPrice();renderWorkersByZone();renderTimeSlots();
}
function renderWorkersByZone(){
  const svc=document.getElementById('svc').value;
  const urg=_getSelectedUrgencia();
  const allZone=WORKERS.filter(w=>w.status!=='inactive'&&w.zonas.includes(clientZoneId)&&w.type.includes(svc));
  const matches=allZone.filter(w=>_workerMeetsUrgencia(w,urg));
  const excluded=allZone.length-matches.length;
  const sec=document.getElementById('workers-section'),list=document.getElementById('workers-list');
  const hdr=document.getElementById('workers-section-hdr');
  sec.style.display='block';
  // urgency filter banner
  let urgBanner='';
  if(urg&&urg.modo==='minutos'&&excluded>0)
    urgBanner=`<div class="urg-filter-badge">⚡ Urgente: solo trabajadores que llegan en ≤ ${urg.maxMin} min · ${excluded} excluido${excluded>1?'s':''}</div>`;
  else if(urg&&urg.modo==='minutos')
    urgBanner=`<div class="urg-filter-badge urg-filter-badge--ok">⚡ Urgente: todos los disponibles llegan en ≤ ${urg.maxMin} min</div>`;
  else if(urg&&urg.modo==='mismo_dia'&&excluded>0)
    urgBanner=`<div class="urg-filter-badge">📅 Rápido: solo con horario libre hoy · ${excluded} sin disponibilidad</div>`;
  else if(urg&&urg.modo==='mismo_dia')
    urgBanner=`<div class="urg-filter-badge urg-filter-badge--ok">📅 Rápido: todos disponibles hoy</div>`;
  if(!matches.length){
    if(hdr)hdr.innerHTML='<p style="font-size:12px;font-weight:500;color:#042C53;">Disponibles en tu zona</p>';
    list.innerHTML=urgBanner+'<div class="no-avail">Sin trabajadores disponibles'+(urg&&urg.modo!=='sin_filtro'?' con este nivel de urgencia':'en tu zona')+'.</div>';
    return;
  }
  if(selectedWorkerId!==null){
    const w=WORKERS.find(x=>x.id===selectedWorkerId);
    if(hdr)hdr.innerHTML='<p style="font-size:12px;font-weight:500;color:#042C53;">Trabajador seleccionado</p><button class="btn-light" style="font-size:11px;padding:3px 10px;" onclick="unselectWorker()">Cambiar</button>';
    if(w){list.innerHTML=urgBanner+`<div class="wkr-selected"><div class="av" style="width:38px;height:38px;font-size:12px;">${w.photo?`<img src="${w.photo}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`:''}${w.initials}</div><div class="wsel-info"><p>${w.name}</p><span>${w.status==='active'?'Disponible':'Ocupado'} · ${s$(w.rating,11)} ${w.rating.toFixed(1)}</span></div><span style="font-size:16px;color:#1A56DB;">✓</span></div>`;}
  }else{
    if(hdr)hdr.innerHTML='<p style="font-size:12px;font-weight:500;color:#042C53;">Disponibles en tu zona</p>';
    list.innerHTML=urgBanner+matches.map(w=>{
      const ph=w.photo?`<img src="${w.photo}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">` :'';
      const llegadaTag=urg&&urg.modo==='minutos'?`<span class="urg-llegada-tag">🕐 ~${w.tiempoLlegada} min</span>`:'';
      return`<div class="wkr-av" onclick="openFicha(${w.id})"><div class="adot${w.status==='busy'?' busy':''}"></div><div class="av" style="width:34px;height:34px;font-size:11px;">${ph||w.initials}</div><div class="avi"><p>${w.name} <span style="font-size:10px;color:#1A56DB;">— ver ficha</span></p><span>${w.status==='active'?'Disponible':'Ocupado'}${llegadaTag?'&nbsp;':''}</span>${llegadaTag}<div style="display:flex;gap:2px;margin-top:2px;">${s$(w.rating,12)}<span style="font-size:11px;color:#185FA5;margin-left:4px;">${w.rating.toFixed(1)}</span></div></div></div>`;
    }).join('');
  }
}
function renderSvcExtrasForClient(svcId){
  const el=document.getElementById('svc-extras-fields');if(!el)return;
  const sec=document.getElementById('svc-extras-section');
  const active=(typeof SVC_EXTRAS!=='undefined'?SVC_EXTRAS:[]).filter(x=>x.svcId===svcId&&x.activo!==false);
  if(!active.length){el.innerHTML='';if(sec)sec.style.display='none';return;}
  if(sec)sec.style.display='block';
  el.innerHTML=`<p style="font-size:12px;font-weight:600;color:#042C53;margin-bottom:8px;">⚡ Extras opcionales</p>
    <div class="svc-extras-client-block">${
    active.map(x=>`<div class="cbrow">
      <input type="checkbox" class="extra-cb" id="extra-${x.id}" data-precio="${x.precio}" onchange="calcPrice()">
      <label for="extra-${x.id}">${x.nombre}</label>
      <span class="extra-precio-badge">+$${x.precio.toLocaleString('es-MX')}</span>
    </div>`).join('')
  }</div>`;
}
function onSvcChange(){
  const svc=document.getElementById('svc').value;
  document.getElementById('depto-fields').style.display=svc==='depto'?'block':'none';
  document.getElementById('auto-fields').style.display=svc==='auto'?'block':'none';
  document.getElementById('tapiceria-fields').style.display=svc==='tapiceria'?'block':'none';
  document.getElementById('cleaning-type-section').style.display=svc==='depto'?'block':'none';
  renderSvcExtrasForClient(svc);
  selectedTimeSlot='';selectedWorkerId=null;calcPrice();updateDurationBanner();updateReservarBtn();
}
function onMuebleChange(){const m=document.getElementById('mueble').value;document.getElementById('cantidad-wrap').style.display=(m==='silla'||m==='sofa')?'block':'none';document.getElementById('colchon-wrap').style.display=m==='colchon'?'block':'none';document.getElementById('medida-wrap').style.display=(m==='tapete'||m==='alfombra')?'block':'none';document.getElementById('mat-wrap').style.display=m==='sofa'?'block':'none';calcPrice();}

function calcPrice(){
  const svc=document.getElementById('svc').value,urgPct=parseFloat(document.getElementById('urgencia').value)||0;
  let base=0,extrasAmt=0,minApplied=false;
  if(svc==='depto'){const h=parseInt(document.getElementById('habitaciones').value),b=parseInt(document.getElementById('banos').value);base=PRICES.depto.base+(h-1)*PRICES.depto.hab+(b-1)*PRICES.depto.bano;}
  else if(svc==='auto'){base=PRICES.auto[document.getElementById('vehiculo').value]||400;}
  else if(svc==='tapiceria'){const m=document.getElementById('mueble').value;if(m==='silla')base=PRICES.tap.silla.unit*parseInt(document.getElementById('cantidad').value);else if(m==='sofa')base=PRICES.tap.sofa[document.getElementById('material').value]*parseInt(document.getElementById('cantidad').value);else if(m==='tapete')base=PRICES.tap.tapete.factor*parseInt(document.getElementById('medida').value)*2;else if(m==='alfombra')base=PRICES.tap.alfombra.factor*parseInt(document.getElementById('medida').value)*2;else if(m==='colchon')base=PRICES.tap.colchon[document.getElementById('colchon-tipo').value];if(base<TAP_MIN){base=TAP_MIN;minApplied=true;}}
  /* dynamic extras */
  const checkedExtras=[];
  document.querySelectorAll('#svc-extras-fields .extra-cb:checked').forEach(cb=>{
    const precio=parseInt(cb.dataset.precio)||0;
    const lbl=cb.nextElementSibling?cb.nextElementSibling.textContent:'Extra';
    extrasAmt+=precio;checkedExtras.push({lbl,precio});
  });
  // Apply cleaning type factor for depto
  const ct=CLEANING_TYPES.find(c=>c.id===selectedCleanTypeId)||{factor:1.0};
  const cleanExtra=svc==='depto'&&ct.factor!==1.0?Math.round(base*(ct.factor-1)):0;
  const extras=extrasAmt;
  // Date surcharges (domingo +50%, festivo +100% — sobre precio base)
  const fechaVal=(document.getElementById('fecha')||{}).value||'';
  let domingoAmt=0,festivoAmt=0;
  if(fechaVal){
    const dDate=new Date(fechaVal+'T12:00:00');
    if(DIAS_FESTIVOS.includes(fechaVal))festivoAmt=Math.round(base*1.0);
    else if(dDate.getDay()===0)domingoAmt=Math.round(base*0.5);
  }
  const urgAmt=Math.round((base+extras+cleanExtra)*urgPct/100);
  const sub=base+extras+cleanExtra+urgAmt+domingoAmt+festivoAmt;
  /* Descuento: promo seleccionada tiene prioridad (no acumulable con clientDiscount) */
  let promoAmt=0;
  if(promoAplicada&&promoAplicada.descuento>0) promoAmt=Math.min(Math.round(sub*promoAplicada.descuento/100),sub);
  const discAmt=promoAmt>0?promoAmt:Math.min(clientDiscount,sub);
  const discLabel=promoAmt>0?`🏷️ ${promoAplicada.nombre} (${promoAplicada.descuento}% OFF)`:'🎁 Descuento';
  const subAfter=sub-discAmt,ivaAmt=Math.round(subAfter*IVA),total=facturaOn?subAfter+ivaAmt:subAfter;
  setR('pr-base','Servicio base','$'+base.toLocaleString('es-MX'));
  const pea=document.getElementById('pr-extras-area');
  if(pea)pea.innerHTML=checkedExtras.map(x=>`<div class="prow2"><span>${x.lbl}</span><span>+$${x.precio.toLocaleString('es-MX')}</span></div>`).join('');
  const cr=document.getElementById('pr-clean'),cv=document.getElementById('pr-clean-val');
  if(svc==='depto'&&cleanExtra>0&&cr){cr.style.display='flex';if(cv)cv.textContent='+$'+cleanExtra.toLocaleString('es-MX');}else if(cr)cr.style.display='none';
  const ur=document.getElementById('pr-urg');if(urgAmt>0){ur.style.display='flex';setR('pr-urg','Urgencia','$'+urgAmt.toLocaleString('es-MX'));}else ur.style.display='none';
  // Domingo / Festivo rows
  const drD=document.getElementById('pr-domingo'),dvD=document.getElementById('pr-domingo-val');
  if(domingoAmt>0){if(drD)drD.style.display='flex';if(dvD)dvD.textContent='+$'+domingoAmt.toLocaleString('es-MX');}else{if(drD)drD.style.display='none';}
  const drF=document.getElementById('pr-festivo'),dvF=document.getElementById('pr-festivo-val');
  if(festivoAmt>0){if(drF)drF.style.display='flex';if(dvF)dvF.textContent='+$'+festivoAmt.toLocaleString('es-MX');}else{if(drF)drF.style.display='none';}
  const dr=document.getElementById('pr-desc'),dv=document.getElementById('pr-desc-val');if(discAmt>0){dr.style.display='flex';setR('pr-desc',discLabel,'-$'+discAmt.toLocaleString('es-MX'));}else dr.style.display='none';
  const ir=document.getElementById('pr-iva');if(facturaOn){ir.style.display='flex';setR('pr-iva','IVA 16%','$'+ivaAmt.toLocaleString('es-MX'));}else ir.style.display='none';
  setR('pr-total','Total','$'+total.toLocaleString('es-MX'));document.getElementById('min-note').style.display=minApplied?'block':'none';
}
function setR(id,l,v){const el=document.getElementById(id);if(el)el.innerHTML='<span>'+l+'</span><span>'+v+'</span>';}
function toggleFactura(){facturaOn=!facturaOn;document.getElementById('ftoggle').classList.toggle('on',facturaOn);document.getElementById('ffields').classList.toggle('show',facturaOn);if(facturaOn)setPersonaTipo('fisica');calcPrice();}
function handleFiles(e){const files=Array.from(e.target.files);uploadedFiles=[...uploadedFiles,...files].slice(0,5);const wrap=document.getElementById('prev-wrap');wrap.innerHTML='';uploadedFiles.forEach(f=>{const ph=document.createElement('div');ph.style.cssText='width:54px;height:54px;border-radius:8px;background:#E6F1FB;display:flex;align-items:center;justify-content:center;font-size:10px;color:#185FA5;text-align:center;';ph.textContent=f.name.slice(0,8);const r=new FileReader();r.onload=ev=>{const img=document.createElement('img');img.style.cssText='width:54px;height:54px;border-radius:8px;object-fit:cover;border:.5px solid #B5D4F4;';img.src=ev.target.result;wrap.replaceChild(img,ph);};r.readAsDataURL(f);wrap.appendChild(ph);});document.getElementById('fc').textContent=uploadedFiles.length+' fotos';updateReservarBtn();}
function reservar(){
  if(document.getElementById('svc').value==='tapiceria'&&!uploadedFiles.length){showToast('amber','⚠️','Sube al menos una foto del mueble');return;}
  if(facturaOn){const rfc=document.getElementById(facturaPersonaTipo==='fisica'?'f-rfc-fisica':'f-rfc-moral').value.trim();if(!rfc){showToast('amber','⚠️','Ingresa el RFC para facturar');return;}}
  if(!selectedTimeSlot){showToast('amber','⚠️','Selecciona un horario disponible');return;}
  openConfirmPanel();
}
function openConfirmPanel(){
  const svcEl=document.getElementById('svc');
  const svcLabel={depto:'Limpieza de departamento',auto:'Lavado de auto',tapiceria:'Lavado de tapicería'}[svcEl.value]||svcEl.value;
  const ct=CLEANING_TYPES.find(c=>c.id===selectedCleanTypeId);
  const svcData=SVC_TYPES.find(s=>s.id===svcEl.value);
  const durMax=svcData?Math.round(svcData.durMax*(ct?.factor||1)):90;
  const durTxt=durMax<60?durMax+' min':(Math.floor(durMax/60)+'h'+(durMax%60?' '+durMax%60+' min':''));
  const fechaVal=document.getElementById('fecha').value;
  const fechaTxt=fechaVal?new Date(fechaVal+'T12:00:00').toLocaleDateString('es-MX',{weekday:'long',day:'numeric',month:'long'}):'—';
  const urgEl=document.getElementById('urgencia');
  const urgLabel=urgEl.options[urgEl.selectedIndex].text;
  // worker row
  const wrow=document.getElementById('confirm-worker-row');
  if(selectedWorkerId!==null){const w=WORKERS.find(x=>x.id===selectedWorkerId);if(w){wrow.style.display='flex';wrow.innerHTML=`<div class="av" style="width:38px;height:38px;font-size:${w.photo?'0':'12px'};flex-shrink:0;">${w.photo?'<img src="'+w.photo+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">':w.initials}</div><div style="flex:1;"><p style="font-size:13px;font-weight:500;color:#042C53;">${w.name}</p><p style="font-size:11px;color:#185FA5;">${s$(w.rating,11)} ${w.rating.toFixed(1)} · Trabajador seleccionado</p></div>`;}}else{wrow.style.display='none';}
  // summary rows
  const totalEl=document.getElementById('pr-total');
  const totalTxt=totalEl?totalEl.querySelector('span:last-child').textContent:'—';
  const resCalle=((document.getElementById('res-calle')||{}).value||'').trim();
  const resColonia=((document.getElementById('res-colonia')||{}).value||'').trim();
  const resRef=((document.getElementById('res-ref')||{}).value||'').trim();
  const dirTxt=[resCalle,resColonia].filter(Boolean).join(', ');
  let rows=`<div class="confirm-row"><span>Servicio</span><span>${svcLabel}</span></div>`;
  if(svcEl.value==='depto'&&ct)rows+=`<div class="confirm-row"><span>Tipo de limpieza</span><span>${ct.nombre}</span></div>`;
  if(dirTxt)rows+=`<div class="confirm-row"><span>📍 Dirección</span><span>${dirTxt}</span></div>`;
  if(resRef)rows+=`<div class="confirm-row"><span>Referencias</span><span>${resRef}</span></div>`;
  rows+=`<div class="confirm-row"><span>Fecha</span><span style="text-transform:capitalize;">${fechaTxt}</span></div>`;
  rows+=`<div class="confirm-row"><span>Horario</span><span>${selectedTimeSlot} hrs</span></div>`;
  rows+=`<div class="confirm-row"><span>Duración estimada</span><span>${durTxt}</span></div>`;
  rows+=`<div class="confirm-row"><span>Urgencia</span><span>${urgLabel}</span></div>`;
  document.querySelectorAll('#svc-extras-fields .extra-cb:checked').forEach(cb=>{
    const lbl=cb.nextElementSibling?cb.nextElementSibling.textContent.trim():'Extra';
    const precio=parseInt(cb.dataset.precio)||0;
    rows+=`<div class="confirm-row" style="color:#185FA5;"><span>⚡ ${lbl}</span><span>+$${precio.toLocaleString('es-MX')}</span></div>`;
  });
  if(clientDiscount>0)rows+=`<div class="confirm-row" style="color:#1A56DB;"><span>🎁 Descuento</span><span>-$${clientDiscount.toLocaleString('es-MX')}</span></div>`;
  if(facturaOn)rows+=`<div class="confirm-row"><span>Factura</span><span>Sí · IVA incluido</span></div>`;
  document.getElementById('confirm-rows').innerHTML=rows;
  document.getElementById('confirm-total-val').textContent=totalTxt;
  selectPayMethod('tarjeta',document.getElementById('pay-tarjeta'));
  document.getElementById('confirm-ov').classList.add('open');
}
function closeConfirmPanel(){document.getElementById('confirm-ov').classList.remove('open');}
function selectPayMethod(method,btn){
  selectedPayMethod=method;
  document.querySelectorAll('.pay-btn').forEach(b=>b.classList.remove('active'));
  if(btn)btn.classList.add('active');
  const detail=document.getElementById('pay-detail');
  const info={tarjeta:'Pagarás con tarjeta de crédito o débito al finalizar. Cargo seguro con cifrado SSL.',transferencia:'Recibirás los datos de cuenta CLABE al confirmar. El servicio se agenda al verificar el pago.',efectivo:'Paga en efectivo al trabajador al iniciar el servicio. Ten el monto exacto disponible.'};
  detail.textContent=info[method]||'';
}
function _collectFiscalData(){
  const tipo=facturaPersonaTipo;
  const gv=id=>(document.getElementById(id)||{}).value||'';
  if(tipo==='fisica'){
    return{tipo,nombre:gv('f-nombre-fisica'),rfc:gv('f-rfc-fisica'),correoFiscal:gv('f-email-fisica'),curp:gv('f-curp'),dir:gv('f-dir-fisica'),cp:gv('f-cp-fisica'),estado:gv('f-estado-fisica'),regimen:gv('f-regimen-fisica'),cfdi:gv('f-cfdi-fisica')};
  }else{
    return{tipo,razonSocial:gv('f-razon-moral'),rfc:gv('f-rfc-moral'),correoFiscal:gv('f-email-moral'),tel:gv('f-tel-moral'),rep:gv('f-rep-moral'),dir:gv('f-dir-moral'),cp:gv('f-cp-moral'),estado:gv('f-estado-moral'),regimen:gv('f-regimen-moral'),cfdi:gv('f-cfdi-moral')};
  }
}
function confirmarPago(){
  const ct=CLEANING_TYPES.find(c=>c.id===selectedCleanTypeId);
  const svcEl=document.getElementById('svc');
  const svcData=SVC_TYPES.find(s=>s.id===svcEl.value);
  const durMax=svcData?Math.round(svcData.durMax*(ct?.factor||1)):90;
  const used=clientDiscount;
  // Capture factura request before resetting form
  if(facturaOn){
    const fiscal=_collectFiscalData();
    const svcLabel={depto:'Limpieza de departamento',auto:'Lavado de auto',tapiceria:'Lavado de tapicería'}[svcEl.value]||svcEl.value;
    const totalEl=document.getElementById('pr-total');
    const totalTxt=totalEl?totalEl.querySelector('span:last-child').textContent:'—';
    const fechaVal=document.getElementById('fecha').value;
    const clienteNombre=(document.getElementById('header-uname')||{}).textContent||'Cliente';
    const clienteUser=USERS.find(u=>u.nombre===clienteNombre&&(u.rol==='cliente'||u.rol==='cliente_inm'));
    SOLICITUDES_FACTURA.push({
      id:Date.now(),
      clienteNombre,
      clienteEmail:clienteUser?clienteUser.email:'',
      svc:svcLabel,
      fecha:fechaVal,
      hora:selectedTimeSlot,
      total:totalTxt,
      fiscal,
      status:'nueva',
      createdAt:new Date().toISOString()
    });
    pushNotif('admin','🧾','blue','Nueva solicitud de factura',clienteNombre+' — '+svcLabel);
    updateNotifBadge();
  }
  closeConfirmPanel();
  if(used>0){showToast('green','🎁','¡Descuento de $'+used+' aplicado!');clientDiscount=0;document.getElementById('discount-banner').style.display='none';}
  else showToast('green','✅',`Reserva confirmada · ${selectedTimeSlot} hrs · ${Math.floor(durMax/60)}h${durMax%60?' '+durMax%60+'min':''}`);
  pushNotif('cliente','✅','green','Reserva confirmada',`${selectedTimeSlot} · ${ct?.nombre||'Servicio'} · ${selectedPayMethod}`);
  pushNotif('admin','📋','blue','Nueva reserva',`Cliente confirmó servicio para las ${selectedTimeSlot}`);
  updateNotifBadge();resetReserva();
}
function updateClientAvg(){if(!clientReviews.length)return;const avg=clientReviews.reduce((a,r)=>a+r.stars,0)/clientReviews.length;document.getElementById('client-avg').textContent=avg.toFixed(1);document.getElementById('c-total').textContent=clientReviews.length;ss('client-avg-stars',avg,15);}
function openIR(btn,svcName,idx){const p=document.getElementById('ir-'+idx);if(!p)return;const open=p.style.display==='block';p.style.display=open?'none':'block';btn.textContent=open?'Evaluar':'Cerrar';}
function closeIR(idx){const p=document.getElementById('ir-'+idx);if(p)p.style.display='none';}
function setIS(idx,n){inlineStars[idx]=n;const lbl=['','Muy malo','Malo','Regular','Bueno','Excelente'];document.querySelectorAll('#isr-'+idx+' .star').forEach((s,i)=>s.classList.toggle('lit',i<n));const l=document.getElementById('isl-'+idx);if(l)l.textContent=lbl[n]+' ('+n+'/5)';}
function submitIR(idx,svcName){const stars=inlineStars[idx]||0;if(!stars){showToast('amber','⚠️','Selecciona al menos una estrella');return;}clientReviews.push({stars,comment:document.getElementById('ic-'+idx).value||'',svc:svcName});updateClientAvg();renderClientHistorial();closeIR(idx);if(stars<4){showToast('amber','⭐','Notificamos al administrador.');pushNotif('admin','⭐','red','Evaluación baja',svcName+' — '+stars+' estrellas');pushNotif('supervisor','⭐','amber','Evaluación baja en equipo',svcName+' — '+stars+' estrellas');}else showToast('green','⭐','¡Evaluación enviada, gracias!');updateNotifBadge();}
function openFicha(wid){fichaWorkerId=wid;const w=WORKERS.find(x=>x.id===wid);if(!w)return;const fp=document.getElementById('fp');fp.innerHTML=w.photo?`<img src="${w.photo}" alt="">`:`<span style="font-size:22px;font-weight:500;color:#fff;">${w.initials}</span>`;document.getElementById('fn').textContent=w.name;document.getElementById('fr').textContent=w.type.map(t=>({depto:'Departamento',auto:'Autos',tapiceria:'Tapicería'}[t])).join(' · ');document.getElementById('frat').textContent=w.rating>0?w.rating.toFixed(1):'Nuevo';document.getElementById('fsvc').textContent=w.services;document.getElementById('fsince').textContent=w.since;document.getElementById('fstars').innerHTML=s$(w.rating,18);const svcData=SVC_TYPES.find(s=>s.id===document.getElementById('svc')?.value);const ct=CLEANING_TYPES.find(c=>c.id===selectedCleanTypeId);const durMin=svcData?Math.round(svcData.durMin*(ct?.factor||1)):60;const durMax=svcData?Math.round(svcData.durMax*(ct?.factor||1)):90;document.getElementById('fdetails').innerHTML=`<div class="frow2"><span>Zonas</span><span>${w.zonas.map(z=>{const f=ZONAS.find(x=>x.id===z);return f?f.nombre.split('/')[0].trim():z;}).join(', ')||'No asignadas'}</span></div><div class="frow2"><span>Duración est. para este servicio</span><span>${durMin}–${durMax} min</span></div>${w.desc?`<p style="font-size:12px;color:#185FA5;padding:8px 0;border-bottom:.5px solid #B5D4F4;">${w.desc}</p>`:''}`;document.getElementById('fall-reviews').innerHTML=w.reviews.length?w.reviews.map(r=>`<div class="rev-card"><div style="display:flex;gap:2px;margin-bottom:4px;">${s$(r.stars,13)}</div><p class="rev-comment">"${r.comment}"</p><p class="rev-meta">${r.svc}${r.client?' · '+r.client:''}</p></div>`).join(''):`<p style="font-size:12px;color:#185FA5;text-align:center;padding:.5rem;">Sin reseñas</p>`;document.getElementById('ficha-ov').classList.add('open');}
function closeFicha(){document.getElementById('ficha-ov').classList.remove('open');}
function selectWorker(){selectedWorkerId=fichaWorkerId;closeFicha();renderWorkersByZone();showToast('blue','✓',`Trabajador seleccionado — pulsa Continuar para ver horarios`);}
function unselectWorker(){selectedWorkerId=null;selectedTimeSlot='';renderWorkersByZone();}
function updateReservarBtn(){
  const fechaVal=document.getElementById('fecha').value;
  const svc=document.getElementById('svc').value;
  const isTap=svc==='tapiceria';
  let fechaOk=false;
  if(fechaVal){fechaOk=true;} // domingos y festivos permitidos (aplica recargo)
  const slotOk=!!selectedTimeSlot;
  const fotoOk=!isTap||uploadedFiles.length>0;
  // checklist visibility
  const cl=document.getElementById('params-checklist');
  const allOk=fechaOk&&slotOk&&fotoOk;
  cl.style.display=allOk?'none':'block';
  // foto item
  const fotoItem=document.getElementById('pcheck-foto');
  if(fotoItem)fotoItem.style.display=isTap?'flex':'none';
  // update each item
  function setItem(id,ok){const el=document.getElementById(id);if(!el)return;el.classList.toggle('done',ok);el.querySelector('.pcheck').textContent=ok?'✓':'';}
  setItem('pcheck-fecha',fechaOk);
  setItem('pcheck-slot',slotOk);
  setItem('pcheck-foto',fotoOk);
  // button state
  const btn=document.getElementById('btn-reservar');
  if(btn){btn.classList.toggle('disabled',!allOk);btn.style.pointerEvents=allOk?'':'none';}
}
function onFechaChange(){
  const val=document.getElementById('fecha').value;
  const warn=document.getElementById('fecha-warn');
  if(!val){warn.style.display='none';calcPrice();updateReservarBtn();return;}
  const d=new Date(val+'T12:00:00');
  const isSunday=d.getDay()===0;
  const isFestivo=DIAS_FESTIVOS.includes(val);
  // Validate against urgency range
  const urg=_getSelectedUrgencia();
  if(urg){
    const today=new Date();today.setHours(0,0,0,0);
    const sel=new Date(val+'T00:00:00');
    const diffDays=Math.round((sel-today)/864e5);
    const minD=urg.diasMin||0;
    const maxD=urg.diasMax!=null?urg.diasMax:9999;
    if(diffDays<minD||diffDays>maxD){
      warn.style.display='block';
      warn.textContent=`⚠️ La urgencia "${urg.nombre}" permite agendar entre ${minD} y ${maxD} días adelante. Elige otra fecha.`;
      document.getElementById('time-slots-section').style.display='none';selectedTimeSlot='';
      calcPrice();updateReservarBtn();return;
    }
  }
  if(isFestivo){
    warn.style.display='block';warn.style.color='#991B1B';
    warn.textContent='🎉 Día festivo — se aplica un recargo del 100% sobre el precio base.';
    renderTimeSlots();
  }else if(isSunday){
    warn.style.display='block';warn.style.color='#7A4900';
    warn.textContent='🌞 Domingo — se aplica un recargo del 50% sobre el precio base.';
    renderTimeSlots();
  }else{
    warn.style.display='none';warn.style.color='';renderTimeSlots();
  }
  calcPrice();updateReservarBtn();
}
function renderClientUbicacion(){
  const el=document.getElementById('client-ubicacion-card');if(!el)return;
  const now=new Date(),today=now.toISOString().split('T')[0];
  const nowMin=now.getHours()*60+now.getMinutes();
  let activeJob=null,activeWorker=null,nextJob=null,nextWorker=null,nextStart=Infinity;
  WORKERS.forEach(w=>{
    w.todayJobs.filter(j=>j.fecha===today&&j.status!=='completed').forEach(j=>{
      const[h,m]=j.hora.split(':').map(Number);
      const startMin=h*60+m,endMin=startMin+(j.durMax||60);
      if(nowMin>=startMin-15&&nowMin<=endMin){
        if(!activeJob||startMin<(activeJob._sMin||Infinity)){j._sMin=startMin;activeJob=j;activeWorker=w;}
      } else if(startMin>nowMin&&startMin<nextStart){
        nextStart=startMin;nextJob=j;nextWorker=w;
      }
    });
  });
  if(activeJob){
    const[h,m]=activeJob.hora.split(':').map(Number);
    const startMin=h*60+m,minsLeft=startMin-nowMin;
    const statusTxt=minsLeft>0?'Llega en ~'+minsLeft+' min':'En servicio';
    const colBadge=minsLeft>0?'bwarn':'bok';
    el.innerHTML='<p class="ctitle">📍 Ubicación del trabajador</p>'+
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">'+
        '<div class="av" style="width:40px;height:40px;font-size:14px;">'+activeWorker.initials+'</div>'+
        '<div style="flex:1;">'+
          '<p style="font-size:14px;font-weight:600;color:#042C53;">'+activeWorker.name+'</p>'+
          '<p style="font-size:12px;color:#185FA5;">'+activeJob.svc+'</p>'+
        '</div>'+
        '<span class="badge '+colBadge+'">'+statusTxt+'</span>'+
      '</div>'+
      '<div class="map-container"><svg width="100%" height="190" id="client-map-svg"></svg></div>';
    drawMap('client-map-svg',[activeWorker]);
  } else {
    let lockedMsg='No tienes servicios próximos hoy.';
    if(nextJob){
      const[h,m]=nextJob.hora.split(':').map(Number);
      const actMin=(h*60+m)-15,actH=Math.floor(actMin/60)%24,actM=actMin%60;
      const actStr=String(actH).padStart(2,'0')+':'+String(actM).padStart(2,'0');
      lockedMsg='La ubicación de <strong>'+nextWorker.name+'</strong> se activará a las <strong>'+actStr+'</strong>, 15 min antes de tu servicio.';
    }
    el.innerHTML='<p class="ctitle">📍 Ubicación del trabajador</p>'+
      '<div class="chat-locked">'+
        '<span class="chat-locked-icon">📍</span>'+
        '<p class="chat-locked-title">Ubicación no disponible</p>'+
        '<p class="chat-locked-sub">'+lockedMsg+'</p>'+
      '</div>';
  }
}
function drawMap(svgId,workers){const svg=document.getElementById(svgId);if(!svg)return;setTimeout(()=>{const W=svg.clientWidth||640,H=parseInt(svg.getAttribute('height'))||200;let h=`<rect width="${W}" height="${H}" fill="#dce8f5"/>`;for(let x=0;x<W;x+=50)h+=`<line x1="${x}" y1="0" x2="${x}" y2="${H}" stroke="#B5D4F4" stroke-width=".5"/>`;for(let y=0;y<H;y+=40)h+=`<line x1="0" y1="${y}" x2="${W}" y2="${y}" stroke="#B5D4F4" stroke-width=".5"/>`;workers.forEach(w=>{const cx=Math.round(w.mapX/100*W),cy=Math.round(w.mapY/100*H),col=w.status==='inactive'?'#888780':w.status==='busy'?'#BA7517':'#1A56DB';h+=`<circle cx="${cx}" cy="${cy}" r="9" fill="${col}" stroke="#fff" stroke-width="2"/>`;h+=`<text x="${cx}" y="${cy+21}" text-anchor="middle" font-size="10" fill="#042C53" font-family="sans-serif">${w.initials}</text>`;});svg.innerHTML=h;},50);}
function renderWorkerLocList(){const el=document.getElementById('worker-loc-list');if(!el)return;el.innerHTML=WORKERS.filter(w=>w.status!=='inactive').map(w=>`<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:.5px solid #B5D4F4;"><div style="width:9px;height:9px;border-radius:50%;background:${w.status==='busy'?'#BA7517':'#1A56DB'};flex-shrink:0;"></div><div class="av" style="width:30px;height:30px;font-size:${w.photo?'0':'11px'};">${w.photo?'<img src="'+w.photo+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">':w.initials}</div><div style="flex:1;"><p style="font-size:13px;font-weight:500;color:#042C53;">${w.name}</p></div><span class="badge ${w.status==='active'?'bok':'bwarn'}">${w.status==='active'?'Disponible':'En servicio'}</span></div>`).join('');}
function _svcTypeLabel(t){return({depto:'Depto',auto:'Autos',tapiceria:'Tapicería'}[t])||t;}
function twSvcType(wid,svcId,checked){clearTimeout(window._twsTimer);window._twsTimer=setTimeout(fbSaveWorkers,1200);
  const w=WORKERS.find(x=>x.id===wid);if(!w)return;
  if(checked&&!w.type.includes(svcId))w.type.push(svcId);
  if(!checked)w.type=w.type.filter(t=>t!==svcId);
  // update inline label without re-rendering
  const lbl=document.getElementById('svc-lbl-'+wid);
  if(lbl)lbl.textContent=w.type.map(_svcTypeLabel).join(' · ')||'Sin especialidades';
}
function toggleSvcAssign(wid){
  const el=document.getElementById('svc-assign-'+wid);if(!el)return;
  const open=el.classList.toggle('open');
  // close zones panel if open
  if(open){const zp=document.getElementById('assign-'+wid);if(zp)zp.classList.remove('open');}
}
function renderStaffList(filter){
  const filtered=filter==='all'?WORKERS:WORKERS.filter(w=>w.type.includes(filter));
  document.getElementById('staff-list').innerHTML=filtered.map(w=>{
    const isInact=w.status==='inactive';
    const svc=w.type.map(_svcTypeLabel).join(' · ');
    const sb=w.status==='active'?'b-activo':w.status==='busy'?'bwarn':'b-inactivo';
    const st=w.status==='active'?'Activo':w.status==='busy'?'En servicio':'Inactivo';
    const zt=w.zonas.map(z=>{const f=ZONAS.find(x=>x.id===z);return f?`<span class="ztag">${f.nombre.split('/')[0].trim()}</span>`:''}).join('');
    const ph=w.photo?`<img src="${w.photo}" alt="">`:'';
    const uE=USERS.find(u=>u.nombre===w.name);
    const acctB=uE&&uE.accesoRevocado?'<span class="badge b-revoked" style="font-size:10px;padding:2px 7px;">Acceso revocado</span>':uE&&!uE.activo?'<span class="badge b-inactivo" style="font-size:10px;padding:2px 7px;">Cuenta inactiva</span>':'';
    const svcChecks=SVC_TYPES.map(s=>`<div class="zck">
      <input type="checkbox" id="sc-${w.id}-${s.id}" ${w.type.includes(s.id)?'checked':''}
        onchange="twSvcType(${w.id},'${s.id}',this.checked)">
      <label for="sc-${w.id}-${s.id}">${s.nombre}</label>
    </div>`).join('');
    return`<div class="srow${isInact?' srow--inactive':''}">
      ${isInact?`<div class="srow-inactive-note">🔴 Inactivo — no disponible para clientes</div>`:''}
      <div class="si">
        <div class="av" style="width:40px;height:40px;">${ph||w.initials}</div>
        <div class="sit">
          <p>${w.name}</p>
          <span id="svc-lbl-${w.id}">${svc||'Sin especialidades'}</span>${zt}
          <div style="display:flex;gap:2px;margin-top:2px;">${s$(w.rating,11)}<span style="font-size:11px;color:#185FA5;margin-left:4px;">${w.rating.toFixed(1)}</span></div>
        </div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
        <span class="badge ${sb}">${st}</span>
        ${acctB}
        <div style="display:flex;gap:5px;">
          <button class="btn-light" style="padding:3px 8px;font-size:11px;" onclick="toggleAssign(${w.id})">Zonas</button>
          <button class="btn-light" style="padding:3px 8px;font-size:11px;background:#F0F7EE;border-color:#A8D5B5;color:#085041;" onclick="toggleSvcAssign(${w.id})">Servicios</button>
        </div>
      </div>
    </div>
    <div class="ap" id="assign-${w.id}">
      <p style="font-size:12px;font-weight:500;color:#042C53;margin-bottom:8px;">Zonas de ${w.name}</p>
      ${ZONAS.map(z=>`<div class="zck"><input type="checkbox" id="zc-${w.id}-${z.id}" ${w.zonas.includes(z.id)?'checked':''} onchange="twz(${w.id},'${z.id}',this.checked)"><label for="zc-${w.id}-${z.id}">${z.nombre}</label></div>`).join('')}
      <div style="margin-top:8px;"><button class="btn-sm" onclick="toggleAssign(${w.id})">Guardar</button></div>
    </div>
    <div class="ap" id="svc-assign-${w.id}" style="background:#F0F7EE;border-top:.5px solid #A8D5B5;">
      <p style="font-size:12px;font-weight:500;color:#085041;margin-bottom:8px;">Especialidades de ${w.name}</p>
      ${svcChecks}
      <div style="margin-top:8px;"><button class="btn-sm" style="background:#085041;" onclick="toggleSvcAssign(${w.id})">Guardar</button></div>
    </div>`;
  }).join('');
}
function renderRevBreakdown(){const el=document.getElementById('rev-breakdown-list');if(!el)return;el.innerHTML=WORKERS.map((w,i)=>{const total=w.reviews.length;if(!total)return'';const counts=[0,0,0,0,0];w.reviews.forEach(r=>{if(r.stars>=1&&r.stars<=5)counts[r.stars-1]++;});const avg=w.reviews.reduce((a,r)=>a+r.stars,0)/total;const ph=w.photo?`<img src="${w.photo}" alt="">`:'';const bars=[5,4,3,2,1].map(star=>{const cnt=counts[star-1];const pct=total>0?Math.round(cnt/total*100):0;return`<div class="star-bar-row"><span class="star-bar-label">${star}★</span><div class="star-bar-track"><div class="star-bar-fill" style="width:${pct}%;"></div></div><span class="star-bar-count">${cnt}</span></div>`;}).join('');return`<div class="rev-breakdown"><div class="rev-bd-header" onclick="toggleRevBD(${i})"><div class="av" style="width:40px;height:40px;font-size:13px;">${ph||w.initials}</div><div class="rev-bd-info"><p>${w.name}</p><span>${total} reseñas</span></div><div style="text-align:right;flex-shrink:0;"><div style="display:flex;gap:2px;justify-content:flex-end;">${s$(avg,13)}</div><p style="font-size:13px;font-weight:500;color:#042C53;">${avg.toFixed(1)}</p></div></div><div class="rev-bd-body" id="rbd-${i}">${bars}<div class="div"></div>${w.reviews.slice(0,3).map(r=>`<div class="rev-card"><div style="display:flex;gap:2px;margin-bottom:4px;">${s$(r.stars,13)}</div><p class="rev-comment">"${r.comment}"</p><p class="rev-meta">${r.svc}${r.client?' · '+r.client:''}</p></div>`).join('')}</div></div>`;}).join('');}
function toggleRevBD(i){const el=document.getElementById('rbd-'+i);if(el)el.classList.toggle('open');}
function renderLowReviews(){const el=document.getElementById('low-reviews-list');if(!el)return;el.innerHTML=LOW_REVIEWS.map((r,i)=>{const ctrl=r.applied?`<span class="badge berr">Descuento: -$${r.discount} aplicado</span>`:`<div style="display:flex;align-items:center;gap:8px;margin-top:8px;flex-wrap:wrap;"><label style="font-size:12px;color:#633806;">Descuento ($):</label><input type="number" id="disc-${i}" placeholder="0" min="0" style="width:80px;background:#fff;border:.5px solid #FAC775;"><button class="btn-sm" onclick="applyDiscount(${i})">Aplicar</button></div>`;return`<div class="discount-card"><div style="display:flex;justify-content:space-between;margin-bottom:8px;"><p style="font-size:13px;font-weight:500;color:#412402;">${r.client} → ${r.worker}</p><span style="font-size:11px;color:#633806;">${r.date}</span></div><div style="display:flex;gap:2px;margin-bottom:6px;">${s$(r.stars,14)}</div><p style="font-size:12px;color:#412402;margin-bottom:8px;">"${r.comment}"</p>${ctrl}</div>`;}).join('')||'<p style="font-size:13px;color:#185FA5;text-align:center;padding:1rem;">Sin evaluaciones bajas</p>';}
function applyDiscount(i){const val=parseInt(document.getElementById('disc-'+i).value)||0;if(!val){showToast('amber','⚠️','Ingresa el monto');return;}LOW_REVIEWS[i].discount=val;LOW_REVIEWS[i].applied=true;setClientDiscount(val,'Compensación por '+LOW_REVIEWS[i].svc);workerDeductions.push({amount:val,workerId:LOW_REVIEWS[i].workerId,worker:LOW_REVIEWS[i].worker,client:LOW_REVIEWS[i].client,svc:LOW_REVIEWS[i].svc,date:LOW_REVIEWS[i].date});renderWorkerQuincena();renderLowReviews();showToast('green','🎁','Descuento de $'+val+' asignado al cliente y descontado de quincena de '+LOW_REVIEWS[i].worker);pushNotif('cliente','🎁','blue','¡Tienes un descuento!','-$'+val+' en tu próxima reserva');pushNotif('trabajador','⚠️','amber','Ajuste en tu quincena','-$'+val+' por evaluación baja');updateNotifBadge();}
function toggleSvSvcAssign(wid){
  const el=document.getElementById('sv-svc-assign-'+wid);if(!el)return;
  el.classList.toggle('sv-svc-assign-open');
}
function renderSVWorkers(){
  const el=document.getElementById('sv-workers-list');if(!el)return;
  const assigned=WORKERS.filter(w=>SUPERVISOR_ASSIGNED.includes(w.id));
  document.getElementById('sv-count').textContent=assigned.length;
  document.getElementById('sv-active').textContent=assigned.filter(w=>w.status==='active').length;
  el.innerHTML=assigned.map(w=>{
    const isInact=w.status==='inactive';
    const sb=w.status==='active'?'b-activo':w.status==='busy'?'bwarn':'b-inactivo';
    const st=w.status==='active'?'Disponible':w.status==='busy'?'En servicio':'Inactivo';
    const svc=w.type.map(_svcTypeLabel).join(' · ');
    const ph=w.photo?`<img src="${w.photo}" alt="">`:'';
    const uEntry=USERS.find(u=>u.nombre===w.name);
    const acctBadge=uEntry&&uEntry.accesoRevocado?'<span class="badge b-revoked" style="font-size:10px;padding:2px 7px;">Acceso revocado</span>':uEntry&&!uEntry.activo?'<span class="badge berr" style="font-size:10px;padding:2px 7px;">Cuenta inactiva</span>':'';
    const jobs=w.todayJobs.length
      ? w.todayJobs.map(j=>`<div class="sv-agenda-row"><span>${j.svc}</span><span>${j.hora} · ${j.durMin}–${j.durMax}min · ${j.zona}</span></div>`).join('')
      : `<div class="sv-agenda-row"><span style="color:#185FA5;font-style:italic;">Sin servicios hoy</span><span></span></div>`;
    const svcChecks=SVC_TYPES.map(s=>`<div class="zck">
      <input type="checkbox" id="svsvc-${w.id}-${s.id}" ${w.type.includes(s.id)?'checked':''}
        onchange="twSvcType(${w.id},'${s.id}',this.checked);document.getElementById('sv-svc-lbl-${w.id}').textContent=WORKERS.find(x=>x.id===${w.id}).type.map(_svcTypeLabel).join(' · ')||'Sin especialidades';">
      <label for="svsvc-${w.id}-${s.id}">${s.nombre}</label>
    </div>`).join('');
    return`<div class="sv-worker-card${isInact?' sv-worker-card--inactive':''}">
      ${isInact?`<div class="sv-inactive-banner">🔴 Trabajador inactivo — no disponible para clientes</div>`:''}
      <div class="sv-worker-top">
        <div class="av" style="width:44px;height:44px;font-size:14px;">${ph||w.initials}</div>
        <div class="sv-worker-info"><p>${w.name}</p><span id="sv-svc-lbl-${w.id}">${svc||'Sin especialidades'}</span></div>
        <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0;">
          <span class="badge ${sb}">${st}</span>
          ${acctBadge}
          <button class="btn-light" style="padding:3px 10px;font-size:11px;background:#F0F7EE;border-color:#A8D5B5;color:#085041;" onclick="toggleSvSvcAssign(${w.id})">✏️ Servicios</button>
        </div>
      </div>
      <div class="sv-svc-assign-panel" id="sv-svc-assign-${w.id}">
        <p style="font-size:11px;font-weight:600;color:#085041;margin-bottom:8px;">Especialidades de ${w.name}</p>
        ${svcChecks}
        <div style="margin-top:8px;"><button class="btn-sm" style="background:#085041;" onclick="toggleSvSvcAssign(${w.id})">Guardar</button></div>
      </div>
      <div class="sv-metrics">
        <div class="sv-metric"><p>Calificación</p><span>${w.rating>0?w.rating.toFixed(1):'—'}</span></div>
        <div class="sv-metric"><p>Servicios</p><span>${w.services}</span></div>
        <div class="sv-metric"><p>Hoy</p><span>${w.todayJobs.length}</span></div>
      </div>
      <div class="sv-agenda"><p>Agenda del día (con duración estimada)</p>${jobs}</div>
    </div>`;
  }).join('');
}
function renderSVEval(){
  const assigned=WORKERS.filter(w=>SUPERVISOR_ASSIGNED.includes(w.id));
  const allReviews=assigned.flatMap(w=>w.reviews);
  const totalRev=allReviews.length;
  const avg=totalRev?allReviews.reduce((a,r)=>a+r.stars,0)/totalRev:0;
  const avgEl=document.getElementById('sv-eval-avg-num');if(avgEl)avgEl.textContent=totalRev?avg.toFixed(1):'—';
  const starsEl=document.getElementById('sv-eval-avg-stars');if(starsEl)starsEl.innerHTML=s$(avg,18);
  const subEl=document.getElementById('sv-eval-avg-sub');if(subEl)subEl.textContent=totalRev+' reseña'+(totalRev!==1?'s':'')+' en total';
  const list=document.getElementById('sv-eval-list');if(!list)return;
  list.innerHTML=assigned.map(w=>{
    const wRev=w.reviews.length;
    const wAvg=wRev?w.reviews.reduce((a,r)=>a+r.stars,0)/wRev:0;
    const counts=[0,0,0,0,0];w.reviews.forEach(r=>{if(r.stars>=1&&r.stars<=5)counts[r.stars-1]++;});
    const bars=[5,4,3,2,1].map(star=>{const cnt=counts[star-1];const pct=wRev?Math.round(cnt/wRev*100):0;return`<div style="display:flex;align-items:center;gap:6px;margin-bottom:3px;"><span style="font-size:11px;color:#185FA5;width:16px;text-align:right;">${star}★</span><div style="flex:1;height:6px;background:#E6F1FB;border-radius:3px;overflow:hidden;"><div style="width:${pct}%;height:100%;background:#1A56DB;border-radius:3px;"></div></div><span style="font-size:11px;color:#185FA5;width:16px;">${cnt}</span></div>`;}).join('');
    const revList=w.reviews.length?w.reviews.map(r=>`<div style="padding:8px 0;border-bottom:.5px solid #E6F1FB;"><div style="display:flex;gap:2px;margin-bottom:3px;">${s$(r.stars,12)}</div><p style="font-size:12px;color:#042C53;">"${r.comment}"</p><p style="font-size:11px;color:#185FA5;margin-top:2px;">${r.svc}${r.client?' · '+r.client:''}</p></div>`).join(''):`<p style="font-size:12px;color:#185FA5;padding:8px 0;">Sin reseñas aún.</p>`;
    return`<div style="border:.5px solid #B5D4F4;border-radius:10px;overflow:hidden;margin-bottom:10px;">
      <div style="padding:12px;display:flex;align-items:center;gap:10px;cursor:pointer;background:#F4F8FF;" onclick="this.nextElementSibling.classList.toggle('open')">
        <div class="av" style="width:40px;height:40px;font-size:${w.photo?'0':'13px'};flex-shrink:0;">${w.photo?'<img src="'+w.photo+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">':w.initials}</div>
        <div style="flex:1;"><p style="font-size:13px;font-weight:500;color:#042C53;">${w.name}</p><div style="display:flex;align-items:center;gap:4px;margin-top:2px;">${s$(wAvg,12)}<span style="font-size:12px;color:#185FA5;">${wRev?wAvg.toFixed(1):'Sin reseñas'} · ${wRev} reseña${wRev!==1?'s':''}</span></div></div>
        <span style="font-size:18px;color:#185FA5;">›</span>
      </div>
      <div class="rev-bd-body" style="padding:12px;background:#fff;">
        <div style="margin-bottom:10px;">${bars}</div>
        ${revList}
      </div>
    </div>`;
  }).join('')||'<p style="font-size:13px;color:#185FA5;text-align:center;padding:1rem;">Sin personal asignado.</p>';
}
/* ══════════════════════════════════════════════════════════
   MAPA EN TIEMPO REAL — Supervisor
   ══════════════════════════════════════════════════════════ */
let _svMapInstance=null;
let _svMapMarkers={};
let _svMapListener=null;

function renderSVMap(){
  const mapDiv=document.getElementById('sv-map-div');if(!mapDiv)return;
  /* Limpiar listener previo si existe */
  if(_svMapListener){_svMapListener();_svMapListener=null;}
  _svMapMarkers={};_svMapInstance=null;
  const statusEl=document.getElementById('sv-map-status');
  if(statusEl)statusEl.textContent='Conectando…';
  _waitForGoogleMaps().then(()=>{
    const el=document.getElementById('sv-map-div');if(!el)return;
    const isMobileSV=window.innerWidth<=640;
    _svMapInstance=new google.maps.Map(el,{
      center:{lat:19.4326,lng:-99.1332},
      zoom:isMobileSV?11:12,
      mapTypeId:'roadmap',
      streetViewControl:false,mapTypeControl:false,
      fullscreenControl:!isMobileSV,
      gestureHandling:'cooperative',
      styles:[
        {featureType:'poi',elementType:'labels',stylers:[{visibility:'off'}]},
        {featureType:'transit',elementType:'labels',stylers:[{visibility:'off'}]},
        {featureType:'administrative.locality',elementType:'labels',stylers:[{visibility:'simplified'}]}
      ]
    });
    _svMapMarkers={};
    _svMapListener=fbListenUbicActivas(function(locs){
      var assignedIds=new Set((SUPERVISOR_ASSIGNED||[]).map(function(id){return 'w_'+id;}));
      var filtered=locs.filter(function(l){return l.rol==='personal_inm'||(l.rol==='trabajador'&&assignedIds.has(String(l.id)));});
      _updateSVMapMarkers(filtered);
    });
  });
}

function _stopSVMapListener(){
  if(_svMapListener){_svMapListener();_svMapListener=null;}
  _svMapMarkers={};_svMapInstance=null;
}

async function _updateSVMapMarkers(locs){
  if(!_svMapInstance)return;
  const statusEl=document.getElementById('sv-map-status');
  const locIds=new Set(locs.map(l=>String(l.id)));
  Object.keys(_svMapMarkers).forEach(id=>{
    if(!locIds.has(id)){_svMapMarkers[id].marker.setMap(null);delete _svMapMarkers[id];}
  });
  for(const loc of locs){
    const id=String(loc.id);
    const pos={lat:parseFloat(loc.lat),lng:parseFloat(loc.lng)};
    const color=loc.rol==='personal_inm'?'#065041':'#D97706';
    const rolLabel=loc.rol==='personal_inm'?'🏢 Personal de Inmuebles':'🧹 Trabajador de Servicios';
    const infoHtml=`<div style="font-family:system-ui,sans-serif;min-width:165px;padding:4px 2px;background:#fff;">
      <p style="font-weight:700;font-size:13px;color:#042C53!important;margin:0 0 4px;">${loc.nombre}</p>
      <p style="font-size:11px;color:#5C7A9A;margin:0 0 3px;">${rolLabel}</p>
      ${loc.contratoNombre?`<p style="font-size:11px;color:#185FA5;margin:0 0 3px;">🔧 ${loc.contratoNombre}</p>`:''}
      <p style="font-size:11px;color:#065041;margin:0;">⏱ Inicio: <strong style="color:#042C53;">${loc.entrada||'—'}</strong></p>
    </div>`;
    const{photo,initials}=_getPersonInfo(loc);
    const icon=await _buildMarkerIcon(photo,initials,color);
    if(_svMapMarkers[id]){
      _svMapMarkers[id].marker.setIcon(icon);
      _svMapMarkers[id].marker.setPosition(pos);
      _svMapMarkers[id].infoWindow.setContent(infoHtml);
    }else{
      const marker=new google.maps.Marker({position:pos,map:_svMapInstance,title:loc.nombre,icon,animation:google.maps.Animation.DROP});
      const infoWindow=new google.maps.InfoWindow({content:infoHtml});
      marker.addListener('click',()=>{
        Object.values(_svMapMarkers).forEach(m=>m.infoWindow.close());
        infoWindow.open(_svMapInstance,marker);
      });
      _svMapMarkers[id]={marker,infoWindow};
    }
  }
  if(statusEl){
    const now=new Date().toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'});
    statusEl.textContent=locs.length?`${locs.length} persona${locs.length>1?'s':''} activa${locs.length>1?'s':''} · Actualizado ${now}`:'Sin personal activo en este momento';
  }
}
function renderSVChatSelector(){
  const assigned=WORKERS.filter(w=>SUPERVISOR_ASSIGNED.includes(w.id));
  const sel=document.getElementById('sv-chat-selector');if(!sel)return;
  // Map worker id → chat conv key (supervisor sees worker↔supervisor chat)
  sel.innerHTML=assigned.map((w,i)=>`<button class="sv-chat-pill${i===0?' active':''}" onclick="selectSVChat(${w.id},this)">${w.name.split(' ')[0]}</button>`).join('');
  if(assigned.length)selectSVChat(assigned[0].id,sel.querySelector('.sv-chat-pill'));
}
function selectSVChat(wid,btn){
  document.querySelectorAll('#sv-chat-selector .sv-chat-pill').forEach(b=>b.classList.remove('active'));if(btn)btn.classList.add('active');
  const w=WORKERS.find(x=>x.id===wid);if(!w)return;
  const display=document.getElementById('sv-chat-display');if(!display)return;
  // Show t-sv conversation + input for supervisor
  display.innerHTML=`
    <div class="chat-contact-bar">
      <div class="av" style="width:34px;height:34px;font-size:${w.photo?'0':'11px'};">${w.photo?'<img src="'+w.photo+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">':w.initials}</div>
      <div><p>${w.name}</p><span>${w.type.map(t=>({depto:'Depto',auto:'Autos',tapiceria:'Tapicería'}[t])).join(' · ')}</span></div>
      <span class="badge ${w.status==='active'?'b-activo':w.status==='busy'?'bwarn':'b-inactivo'}">${w.status==='active'?'Disponible':w.status==='busy'?'En servicio':'Inactivo'}</span>
    </div>
    <div class="chat-box" id="sv-worker-chat-box"></div>
    <div class="chat-input-row">
      <input type="text" id="sv-worker-chat-input" placeholder="Escribe a ${w.name.split(' ')[0]}..." onkeydown="if(event.key==='Enter')sendChat('t-sv','sv','Laura','sv-worker-chat-input','sv-worker-chat-box')">
      <button class="btn-sm" onclick="sendChat('t-sv','sv','Laura','sv-worker-chat-input','sv-worker-chat-box')">Enviar</button>
    </div>`;
  renderChatBox('t-sv','sv','sv-worker-chat-box');
}
/* ── SUPERVISOR MONITOR (cliente↔trabajador) ── */
function renderSVMonitorSelector(){
  const assigned=WORKERS.filter(w=>SUPERVISOR_ASSIGNED.includes(w.id));
  const sel=document.getElementById('sv-monitor-selector');if(!sel)return;
  sel.innerHTML=assigned.map((w,i)=>`<button class="sv-chat-pill${i===0?' active':''}" onclick="selectSVMonitor(${w.id},this)">${w.name.split(' ')[0]}</button>`).join('');
  if(assigned.length)selectSVMonitor(assigned[0].id,sel.querySelector('.sv-chat-pill'));
}
function selectSVMonitor(wid,btn){
  document.querySelectorAll('#sv-monitor-selector .sv-chat-pill').forEach(b=>b.classList.remove('active'));if(btn)btn.classList.add('active');
  const w=WORKERS.find(x=>x.id===wid);if(!w)return;
  const bar=document.querySelector('#sv-msg-monitor .chat-contact-bar p');
  if(bar)bar.textContent=`Cliente ↔ ${w.name}`;
  renderChatBox('c-t','sv','chat-sv-ct');
}

/* ── REPROGRAMAR SERVICIO (desde notificación) ── */
function openReschedule(reqId){
  const req=PENDING_REQUESTS.find(r=>r.id===reqId);if(!req)return;
  currentRescheduleId=reqId;rescheduledTimeSlot='';
  // Resumen del servicio original
  const sumEl=document.getElementById('resched-svc-summary');
  if(sumEl)sumEl.innerHTML=`
    <p style="font-size:13px;font-weight:500;color:#042C53;margin-bottom:4px;">${req.svc}</p>
    <span style="font-size:11px;color:#185FA5;">📍 ${req.zona} · Duración estimada: ${req.durMax} min</span>`;
  const fechaEl=document.getElementById('resched-fecha');
  if(fechaEl){const t=new Date().toISOString().split('T')[0];fechaEl.min=t;fechaEl.value='';}
  const w=document.getElementById('resched-fecha-warn');if(w)w.style.display='none';
  const sw=document.getElementById('resched-slots-wrap');if(sw)sw.style.display='none';
  const sl=document.getElementById('resched-slot-list');if(sl)sl.innerHTML='';
  const btn=document.getElementById('btn-confirm-resched');if(btn)btn.classList.add('disabled');
  document.getElementById('reschedule-ov').classList.add('open');
  if(notifPanelOpen)toggleNotifPanel();
}
function closeReschedule(){document.getElementById('reschedule-ov').classList.remove('open');currentRescheduleId=null;rescheduledTimeSlot='';}
function onReschedFechaChange(){
  const req=PENDING_REQUESTS.find(r=>r.id===currentRescheduleId);if(!req)return;
  const fechaEl=document.getElementById('resched-fecha');if(!fechaEl||!fechaEl.value)return;
  const warnEl=document.getElementById('resched-fecha-warn');
  const d=new Date(fechaEl.value+'T12:00:00');
  if(d.getDay()===0){warnEl.style.display='block';warnEl.textContent='⚠️ Sin disponibilidad los domingos. Elige otro día.';return;}
  warnEl.style.display='none';
  // Renderizar slots disponibles con la misma lógica que el wizard
  const selectedDate=fechaEl.value;
  const svc=req.svc.toLowerCase().includes('depto')?'depto':req.svc.toLowerCase().includes('tapic')?'tapiceria':'auto';
  const availableWorkers=WORKERS.filter(w=>w.status!=='inactive'&&w.type.includes(svc));
  const slots=['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00'];
  const durMax=req.durMax;
  const available=slots.filter(sl=>{
    const[sh,sm]=sl.split(':').map(Number);
    const newStartMin=sh*60+sm,newEndMin=newStartMin+durMax+BUFFER_MIN;
    if(newStartMin>17*60)return false;
    return availableWorkers.some(w=>{
      const dayJobs=w.todayJobs.filter(j=>j.fecha===selectedDate&&j.status!=='completed');
      return!dayJobs.some(j=>{const[jh,jm]=j.hora.split(':').map(Number);const jS=jh*60+jm,jE=jS+j.durMax+BUFFER_MIN;return newStartMin<jE&&jS<newEndMin;});
    });
  });
  rescheduledTimeSlot='';
  const sw=document.getElementById('resched-slots-wrap');if(sw)sw.style.display='block';
  const sl=document.getElementById('resched-slot-list');
  if(sl)sl.innerHTML=available.map(s=>`<button class="svc-tab" onclick="selectReschedSlot('${s}',this)">${s}</button>`).join('')||'<p style="font-size:12px;color:#185FA5;">Sin horarios disponibles para esta fecha</p>';
  const btn=document.getElementById('btn-confirm-resched');if(btn)btn.classList.add('disabled');
}
function selectReschedSlot(sl,btn){
  rescheduledTimeSlot=sl;
  document.querySelectorAll('#resched-slot-list .svc-tab').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  const b=document.getElementById('btn-confirm-resched');if(b)b.classList.remove('disabled');
}
function confirmReschedule(){
  if(!rescheduledTimeSlot){showToast('amber','⚠️','Selecciona un horario');return;}
  const fechaEl=document.getElementById('resched-fecha');if(!fechaEl||!fechaEl.value){showToast('amber','⚠️','Selecciona una fecha');return;}
  const req=PENDING_REQUESTS.find(r=>r.id===currentRescheduleId);if(!req)return;
  // Actualizar la solicitud con nueva fecha y hora
  req.fecha=fechaEl.value;req.hora=rescheduledTimeSlot;
  req.rejected=false;req.autoRejected=false;req.accepted=false;req.notified=false;
  closeReschedule();
  const fechaTxt=new Date(req.fecha+'T12:00:00').toLocaleDateString('es-MX',{weekday:'long',day:'numeric',month:'long'});
  showToast('green','📅',`Reprogramado: ${req.svc} · ${fechaTxt} · ${req.hora}`);
  pushNotif('cliente','✅','green','Servicio reprogramado',`${req.svc} → ${fechaTxt} a las ${req.hora}`);
  pushNotif('trabajador','📬','blue','Nueva solicitud',`${req.svc} — ${req.fecha} ${req.hora}`);
  pushNotif('admin','📋','blue','Servicio reprogramado',`${req.svc} — ${req.fecha} ${req.hora}`);
  updateNotifBadge();
  renderSolicitudes();
}

function renderUrgencias(){
  const modoOpts=[
    {v:'sin_filtro', l:'Sin filtro de trabajadores'},
    {v:'mismo_dia',  l:'Disponibles el mismo día'},
    {v:'minutos',    l:'Por tiempo de llegada (minutos)'},
  ];
  document.getElementById('urgencias-list').innerHTML=URGENCIAS.map((u,i)=>{
    const isOn=u.activo!==false;
    const modoSel=modoOpts.map(o=>`<option value="${o.v}"${u.modo===o.v?' selected':''}>${o.l}</option>`).join('');
    return`<div class="urg-card${isOn?'':' inactive'}">
      <div class="urg-card-main">
        <div class="urg-card-fields">
          <div class="urg-field">
            <label class="urg-label">Nombre</label>
            <input class="urg-inp" value="${u.nombre.replace(/"/g,'&quot;')}" placeholder="Ej. Express"
              onchange="setUrgNombre(${i},this.value)" onblur="setUrgNombre(${i},this.value)">
          </div>
          <div class="urg-field urg-field-pct">
            <label class="urg-label">Recargo</label>
            <div class="urg-pct-wrap">
              <input class="urg-inp" type="number" min="0" max="999" value="${u.pct}"
                onchange="setUrgPct(${i},this.value)" onblur="setUrgPct(${i},this.value)">
              <span class="urg-pct-sign">%</span>
            </div>
          </div>
        </div>
        <div class="urg-card-actions">
          <button class="toggle-btn${isOn?' on':''}" onclick="toggleUrgencia(${i})">${isOn?'Activo':'Inactivo'}</button>
          <button class="btn-danger" onclick="removeUrgencia(${i})">✕</button>
        </div>
      </div>
      <div class="urg-card-filter">
        <div class="urg-filter-row">
          <div class="urg-field" style="flex:1;">
            <label class="urg-label">Filtro de trabajadores</label>
            <select class="urg-inp" onchange="setUrgModo(${i},this.value)">${modoSel}</select>
          </div>
          ${u.modo==='minutos'?`<div class="urg-field urg-field-pct">
            <label class="urg-label">Máx. llegada</label>
            <div class="urg-pct-wrap">
              <input class="urg-inp" type="number" min="1" max="999" value="${u.maxMin||120}"
                onchange="setUrgMaxMin(${i},this.value)" onblur="setUrgMaxMin(${i},this.value)">
              <span class="urg-pct-sign">min</span>
            </div>
          </div>`:''}
        </div>
        <p class="urg-filter-hint">${
          u.modo==='sin_filtro'?'Muestra todos los trabajadores disponibles en la zona del cliente.':
          u.modo==='mismo_dia'?'Solo muestra trabajadores con al menos un horario libre hoy.':
          `Solo muestra trabajadores que llegan en ≤ ${u.maxMin||120} minutos al domicilio.`
        }</p>
        <div class="urg-filter-row urg-dias-row">
          <div class="urg-field urg-field-pct">
            <label class="urg-label">Días mín.</label>
            <div class="urg-pct-wrap">
              <input class="urg-inp" type="number" min="0" max="365" value="${u.diasMin||0}"
                onchange="setUrgDiasMin(${i},this.value)" onblur="setUrgDiasMin(${i},this.value)">
              <span class="urg-pct-sign">d</span>
            </div>
          </div>
          <div class="urg-field urg-field-pct">
            <label class="urg-label">Días máx.</label>
            <div class="urg-pct-wrap">
              <input class="urg-inp" type="number" min="0" max="365" value="${u.diasMax!=null?u.diasMax:''}" placeholder="∞"
                onchange="setUrgDiasMax(${i},this.value)" onblur="setUrgDiasMax(${i},this.value)">
              <span class="urg-pct-sign">d</span>
            </div>
          </div>
          <div class="urg-field" style="flex:1;align-self:flex-end;">
            <p class="urg-filter-hint" style="margin:0;">📅 Rango de días en que el cliente puede agendar desde hoy.</p>
          </div>
        </div>
      </div>
    </div>`;}).join('');
}
function setUrgNombre(i,val){const v=val.trim();if(!v){showToast('amber','⚠️','El nombre no puede estar vacío');return;}if(URGENCIAS[i].nombre===v)return;URGENCIAS[i].nombre=v;renderUrgenciaSelect();}
function setUrgPct(i,val){const p=Math.max(0,Math.min(999,parseInt(val)||0));if(URGENCIAS[i].pct===p)return;URGENCIAS[i].pct=p;renderUrgenciaSelect();}
function setUrgModo(i,val){URGENCIAS[i].modo=val;if(val!=='minutos')URGENCIAS[i].maxMin=null;if(val==='minutos'&&!URGENCIAS[i].maxMin)URGENCIAS[i].maxMin=120;renderUrgencias();}
function setUrgMaxMin(i,val){const v=Math.max(1,parseInt(val)||120);if(URGENCIAS[i].maxMin===v)return;URGENCIAS[i].maxMin=v;}
function setUrgDiasMin(i,val){const v=Math.max(0,parseInt(val)||0);if(URGENCIAS[i].diasMin===v)return;URGENCIAS[i].diasMin=v;if(URGENCIAS[i].diasMax!=null&&v>URGENCIAS[i].diasMax)URGENCIAS[i].diasMax=v;renderUrgenciaSelect();}
function setUrgDiasMax(i,val){const raw=val.toString().trim();const v=raw===''||isNaN(parseInt(raw))?null:Math.max(0,parseInt(raw));if(URGENCIAS[i].diasMax===v)return;URGENCIAS[i].diasMax=v;renderUrgenciaSelect();}
function toggleUrgencia(i){URGENCIAS[i].activo=!(URGENCIAS[i].activo!==false);renderUrgencias();renderUrgenciaSelect();fbSaveConfig();showToast(URGENCIAS[i].activo!==false?'green':'blue',URGENCIAS[i].activo!==false?'✅':'⚪','"'+URGENCIAS[i].nombre+'" '+(URGENCIAS[i].activo!==false?'activada':'desactivada'));}
function addUrgencia(){const n=document.getElementById('nu-name').value.trim(),p=Math.max(0,parseInt(document.getElementById('nu-pct').value)||0);if(!n){showToast('amber','⚠️','Escribe el nombre');return;}URGENCIAS.push({id:'u'+Date.now(),nombre:n,pct:p,activo:true,modo:'sin_filtro',maxMin:null});_closeModal();renderUrgencias();renderUrgenciaSelect();fbSaveConfig();showToast('green','✅','"'+n+'" agregada');}
function removeUrgencia(i){const n=URGENCIAS[i].nombre;URGENCIAS.splice(i,1);renderUrgencias();renderUrgenciaSelect();showToast('blue','🗑️','"'+n+'" eliminada');}
function renderZonasAdmin(){
  document.getElementById('zonas-list').innerHTML=ZONAS.map((z,i)=>{
    const isOn=z.activo!==false;
    return`<div class="zona-item${isOn?'':' inactive'}"><div class="zi-hdr"><p>${z.nombre}</p><div style="display:flex;gap:6px;align-items:center;">
      <button class="toggle-btn${isOn?' on':''}" onclick="toggleZona(${i})">${isOn?'Activo':'Inactivo'}</button>
      <button class="btn-danger" onclick="removeZona(${i})">Eliminar</button>
    </div></div><input type="text" value="${z.colonias}" onchange="ZONAS[${i}].colonias=this.value;" style="font-size:12px;color:#185FA5;background:transparent;border:none;width:100%;outline:none;padding:0;"></div>`;}).join('');
}
function toggleZona(i){ZONAS[i].activo=!(ZONAS[i].activo!==false);renderZonasAdmin();fbSaveZonas();showToast(ZONAS[i].activo!==false?'green':'blue',ZONAS[i].activo!==false?'✅':'⚪','"'+ZONAS[i].nombre+'" '+(ZONAS[i].activo!==false?'activada':'desactivada'));}
function addZona(){const n=document.getElementById('nz-nombre').value.trim(),c=document.getElementById('nz-colonias').value.trim();if(!n){showToast('amber','⚠️','Escribe el nombre');return;}ZONAS.push({id:'z'+Date.now(),nombre:n,colonias:c,activo:true});_closeModal();renderZonasAdmin();fbSaveZonas();showToast('green','✅','"'+n+'" agregada');}
function removeZona(i){const n=ZONAS[i].nombre;ZONAS.splice(i,1);renderZonasAdmin();showToast('blue','🗑️','"'+n+'" eliminada');}
/* ── Genera lista de quincenas dinámicas (actual + 5 anteriores) ── */
function _buildQPeriods(){
  const periods=[];
  const hoy=new Date();
  let yr=hoy.getFullYear(),mo=hoy.getMonth();
  // Quincena actual
  const ini1=hoy.getDate()<=15?1:16;
  const fin1=hoy.getDate()<=15?15:new Date(yr,mo+1,0).getDate();
  periods.push({yr,mo,ini:ini1,fin:fin1});
  // 5 quincenas anteriores
  for(let i=0;i<5;i++){
    let ni=periods[periods.length-1].ini===1?16:1;
    let nm=periods[periods.length-1].mo,ny=periods[periods.length-1].yr;
    if(ni===16){nm--;if(nm<0){nm=11;ny--;}}
    const nf=ni===1?15:new Date(ny,nm+1,0).getDate();
    periods.push({yr:ny,mo:nm,ini:ni,fin:nf});
  }
  return periods;
}
function _qLabel(p){
  const MESES_S=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  return`${p.ini}–${p.fin} ${MESES_S[p.mo]} ${p.yr}`;
}
function _qDateRange(p){
  const pad=n=>String(n).padStart(2,'0');
  return{
    from:`${p.yr}-${pad(p.mo+1)}-${pad(p.ini)}`,
    to:`${p.yr}-${pad(p.mo+1)}-${pad(p.fin)}`
  };
}

function renderQReport(){
  const selEl=document.getElementById('q-period');if(!selEl)return;
  /* Poblar opciones si están vacías */
  if(!selEl.options.length){
    _buildQPeriods().forEach((p,i)=>{
      const opt=document.createElement('option');opt.value=i;opt.textContent=_qLabel(p);selEl.appendChild(opt);
    });
  }
  const idx=parseInt(selEl.value)||0;
  const periods=_buildQPeriods();
  const period=periods[idx];
  const {from,to}=_qDateRange(period);
  const isCurrent=idx===0;
  /* Ingresos del período: PROPERTY_SERVICES con contrato activo en ese rango */
  const contratos=PROPERTY_SERVICES.filter(ps=>{
    const fi=ps.fechaInicio||'';const ff=ps.fechaFin||'';
    return fi<=to&&(!ff||ff>=from);
  });
  const ingresosTotal=contratos.reduce((a,ps)=>a+(parseFloat(ps.pago?.monto)||0),0);
  /* Solicitudes aceptadas en el período */
  const svcsEnPeriodo=PENDING_REQUESTS.filter(r=>r.accepted&&r.fecha>=from&&r.fecha<=to);
  const totalSvcs=WORKERS.reduce((a,w)=>a+w.services,0);
  /* Descuentos activos (solo período actual) */
  const totalDesc=isCurrent?workerDeductions.reduce((a,d)=>a+d.amount,0):0;
  /* Render resumen */
  document.getElementById('q-summary').innerHTML=`
    <div class="metric"><p>Contratos activos</p><span>${contratos.length}</span></div>
    <div class="metric"><p>Ingresos período</p><span>$${ingresosTotal.toLocaleString('es-MX')}</span></div>
    <div class="metric"><p>Servicios acumulados</p><span>${totalSvcs.toLocaleString('es-MX')}</span></div>`;
  /* Render por trabajador */
  const wsConActividad=WORKERS.filter(w=>w.services>0||w.status!=='inactive').sort((a,b)=>b.services-a.services);
  if(!wsConActividad.length){
    document.getElementById('q-worker-list').innerHTML='<p style="font-size:13px;color:#185FA5;text-align:center;padding:1.5rem;">Sin trabajadores con actividad</p>';
    return;
  }
  document.getElementById('q-worker-list').innerHTML=wsConActividad.map((w,wi)=>{
    const myDeducs=isCurrent?workerDeductions.filter(d=>d.workerId===w.id):[];
    const totalD=myDeducs.reduce((a,d)=>a+d.amount,0);
    const wSvcsP=svcsEnPeriodo.filter(r=>r.workerId===w.id).length;
    const wAvg=w.reviews.length?w.reviews.reduce((a,r)=>a+r.stars,0)/w.reviews.length:0;
    const avHtml=w.photo
      ?`<img src="${w.photo}" style="width:36px;height:36px;border-radius:50%;object-fit:cover;flex-shrink:0;">`
      :`<div class="av" style="width:36px;height:36px;font-size:12px;flex-shrink:0;">${w.initials}</div>`;
    const deducBlock=myDeducs.length?`
      <div id="qd-${wi}" style="display:none;background:#FCEBEB;border-top:.5px solid #FADADD;padding:8px 12px 10px;">
        ${myDeducs.map(d=>`<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:.5px solid #FADADD;">
          <div><p style="font-size:12px;color:#791F1F;">Eval. baja · ${d.svc}</p><p style="font-size:11px;color:#B45309;">${d.client} · ${d.date}</p></div>
          <span style="font-size:13px;font-weight:500;color:#E24B4A;">-$${d.amount.toLocaleString('es-MX')}</span>
        </div>`).join('')}
      </div>`:'';
    const descTag=myDeducs.length?`<span style="font-size:11px;color:#E24B4A;cursor:pointer;text-decoration:underline;display:block;margin-top:2px;" onclick="toggleQDeducs('qd-${wi}',this)">Ver ${myDeducs.length} desc. ›</span>`:'';
    return`<div class="comm-row" style="flex-direction:column;align-items:stretch;gap:0;padding:0;overflow:hidden;margin-bottom:8px;">
      <div style="display:flex;align-items:center;gap:10px;padding:12px;">
        ${avHtml}
        <div class="comm-info"><p>${w.name}</p><span>${w.services} servicios acumulados${wSvcsP?` · ${wSvcsP} este período`:''}</span></div>
        <div class="comm-amounts" style="text-align:right;">
          <p>${wAvg?wAvg.toFixed(1)+' ★':'Sin calificación'}</p>
          <span class="badge ${w.status==='active'?'b-activo':w.status==='busy'?'bwarn':'b-inactivo'}" style="font-size:10px;">${w.status==='active'?'Disponible':w.status==='busy'?'En servicio':'Inactivo'}</span>
          ${totalD?`<p style="font-size:11px;color:#E24B4A;margin-top:2px;">-$${totalD.toLocaleString('es-MX')}</p>`:''}
          ${descTag}
        </div>
      </div>
      ${deducBlock}
    </div>`;
  }).join('');
}
function selectDashTab(tab, btn){
  document.querySelectorAll('.dash-tab').forEach(t=>t.classList.remove('active'));
  if(btn)btn.classList.add('active');
  const panel=document.getElementById('dash-panel');
  if(tab==='resumen'){
    renderAdminResumen();
  } else if(tab==='financiero'){
    const hoy=new Date().toISOString().split('T')[0];
    const cm=new Date().getMonth()+1,cy=new Date().getFullYear();
    const p1m=hoy.slice(0,8)+'01';
    const mesOpts=MESES.map((n,i)=>`<option value="${i+1}"${i+1===cm?' selected':''}>${n}</option>`).join('');
    const yrOpts=[cy-1,cy,cy+1].map(y=>`<option value="${y}"${y===cy?' selected':''}>${y}</option>`).join('');
    panel.innerHTML=`
      <div class="date-filter-row"><button class="df-btn active" id="df-dia" onclick="setDateFilter('dia',this)">Día</button><button class="df-btn" id="df-mes" onclick="setDateFilter('mes',this)">Mes</button><button class="df-btn" id="df-año" onclick="setDateFilter('año',this)">Año</button><button class="df-btn" id="df-rango" onclick="setDateFilter('rango',this)">Rango</button></div>
      <div class="date-input-section show" id="di-dia"><div class="frow full"><label>Día</label><input type="date" id="fi-dia" value="${hoy}" onchange="renderFinance()"></div></div>
      <div class="date-input-section" id="di-mes"><div class="frow"><div><label>Mes</label><select id="fi-mes" onchange="renderFinance()">${mesOpts}</select></div><div><label>Año</label><select id="fi-mes-año" onchange="renderFinance()">${yrOpts}</select></div></div></div>
      <div class="date-input-section" id="di-año"><div class="frow full"><label>Año</label><select id="fi-año" onchange="renderFinance()">${yrOpts}</select></div></div>
      <div class="date-input-section" id="di-rango"><div style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap;"><div style="flex:1;min-width:120px;"><label>Inicio</label><input type="date" id="fi-rango-inicio" value="${p1m}" onchange="renderFinance()"></div><div style="flex:1;min-width:120px;"><label>Fin</label><input type="date" id="fi-rango-fin" value="${hoy}" onchange="renderFinance()"></div><button class="btn-sm" onclick="renderFinance()">Aplicar</button></div></div>
      <div class="period-badge" id="finance-period-label"></div>
      <div class="finance-grid" id="finance-grid"></div>
      <div id="finance-detail"></div>`;
    dateFilterMode='dia';renderFinance();
  } else if(tab==='personal'){
    const active=WORKERS.filter(w=>w.status==='active').length;
    const busy=WORKERS.filter(w=>w.status==='busy').length;
    const inactive=WORKERS.filter(w=>w.status==='inactive').length;
    const totalSvcs=WORKERS.reduce((a,w)=>a+w.services,0);
    const jobsHoy=WORKERS.reduce((a,w)=>a+w.todayJobs.length,0);
    const ranked=[...WORKERS].filter(w=>w.status!=='inactive').sort((a,b)=>b.services-a.services);
    panel.innerHTML=`
      <div class="dash-kpi-grid">
        <div class="dash-kpi green"><p>Activos</p><span>${active}</span></div>
        <div class="dash-kpi" style="background:#FAEEDA;"><p>En servicio</p><span style="color:#633806;">${busy}</span></div>
        <div class="dash-kpi red"><p>Inactivos</p><span>${inactive}</span></div>
        <div class="dash-kpi accent"><p>Servicios acumulados</p><span>${totalSvcs.toLocaleString('es-MX')}</span></div>
        <div class="dash-kpi"><p>Trabajos hoy</p><span>${jobsHoy}</span></div>
        <div class="dash-kpi"><p>Total trabajadores</p><span>${WORKERS.length}</span></div>
      </div>
      <p class="dash-section-title">Ranking por servicios realizados</p>
      ${ranked.map((w,i)=>{
        const badge=w.status==='active'?'b-activo':'bwarn';
        const svc=w.type.map(t=>({depto:'Depto',auto:'Autos',tapiceria:'Tap.'}[t])).join(' · ');
        return`<div class="dash-rank-row">
          <span class="dash-rank-num">${i+1}</span>
          <div class="av" style="width:32px;height:32px;font-size:${w.photo?'0':'11px'};flex-shrink:0;">${w.photo?'<img src="'+w.photo+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">':w.initials}</div>
          <div class="dash-rank-info"><p>${w.name}</p><span>${svc} · desde ${w.since}</span></div>
          <div style="text-align:right;"><p style="font-size:13px;font-weight:500;color:#042C53;">${w.services}</p><span class="badge ${badge}" style="font-size:10px;">${w.status==='active'?'Activo':'En srv.'}</span></div>
        </div>`;
      }).join('')}`;
  } else if(tab==='evaluaciones'){
    const allRevs=WORKERS.flatMap(w=>w.reviews);
    const totalR=allRevs.length;
    const globalAvg=totalR?allRevs.reduce((a,r)=>a+r.stars,0)/totalR:0;
    const counts=[1,2,3,4,5].map(n=>allRevs.filter(r=>r.stars===n).length);
    const lowCount=WORKERS.flatMap(w=>w.reviews).filter(r=>r.stars<4).length;
    const ranked=[...WORKERS].filter(w=>w.reviews.length).sort((a,b)=>{
      const aA=a.reviews.reduce((s,r)=>s+r.stars,0)/a.reviews.length;
      const bA=b.reviews.reduce((s,r)=>s+r.stars,0)/b.reviews.length;
      return bA-aA;
    });
    const bars=[5,4,3,2,1].map(n=>{
      const cnt=counts[n-1];
      const pct=totalR?Math.round(cnt/totalR*100):0;
      return`<div class="dash-bar-row"><span class="dash-bar-label">${n}★</span><div class="dash-bar-track"><div class="dash-bar-fill" style="width:${pct}%;background:${n>=4?'#1A56DB':n===3?'#BA7517':'#E24B4A'};"></div></div><span class="dash-bar-count">${cnt}</span></div>`;
    }).join('');
    panel.innerHTML=`
      <div class="dash-kpi-grid">
        <div class="dash-kpi accent"><p>Promedio global</p><span>${totalR?globalAvg.toFixed(2):'—'}</span></div>
        <div class="dash-kpi"><p>Total reseñas</p><span>${totalR}</span></div>
        <div class="dash-kpi red"><p>Eval. bajas (&lt;4★)</p><span>${lowCount}</span></div>
        <div class="dash-kpi green"><p>Eval. positivas (≥4★)</p><span>${totalR-lowCount}</span></div>
      </div>
      <p class="dash-section-title">Distribución de estrellas</p>
      <div style="margin-bottom:14px;">${bars}</div>
      <p class="dash-section-title">Ranking por calificación</p>
      ${ranked.map((w,i)=>{
        const avg=w.reviews.reduce((s,r)=>s+r.stars,0)/w.reviews.length;
        return`<div class="dash-rank-row">
          <span class="dash-rank-num">${i+1}</span>
          <div class="av" style="width:32px;height:32px;font-size:${w.photo?'0':'11px'};flex-shrink:0;">${w.photo?'<img src="'+w.photo+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">':w.initials}</div>
          <div class="dash-rank-info"><p>${w.name}</p><div style="display:flex;gap:2px;margin-top:2px;">${s$(avg,11)}</div></div>
          <div style="text-align:right;"><p style="font-size:15px;font-weight:500;color:#042C53;">${avg.toFixed(1)}</p><span style="font-size:11px;color:#185FA5;">${w.reviews.length} reseñas</span></div>
        </div>`;
      }).join('')}`;
  } else if(tab==='quincenas'){
    /* ── Quincenas con datos reales ──
       Ingresos: contratos activos de PROPERTY_SERVICES (50% a personal inm + 50% AYALYM)
       Trabajadores: servicios acumulados desde WORKERS ── */
    const hoy=new Date();
    const iniQ=new Date(hoy.getFullYear(),hoy.getMonth(),hoy.getDate()<=15?1:16);
    const finQ=new Date(hoy.getFullYear(),hoy.getMonth(),hoy.getDate()<=15?15:new Date(hoy.getFullYear(),hoy.getMonth()+1,0).getDate());
    const fmtQ=d=>d.toLocaleDateString('es-MX',{day:'numeric',month:'long',year:'numeric'});
    const labelQ=`Quincena ${fmtQ(iniQ)} – ${fmtQ(finQ)}`;
    /* Ingresos de contratos activos = base de ingresos de inmuebles */
    const contActivos=PROPERTY_SERVICES.filter(p=>p.status==='activo');
    const ingresosInm=contActivos.reduce((a,p)=>a+(parseFloat(p.pago?.monto)||0),0);
    const comPct=0.5;
    const comInm=Math.round(ingresosInm*comPct);
    /* Personal INM: actividad del período */
    const iniStr=iniQ.toISOString().split('T')[0];
    const finStr=finQ.toISOString().split('T')[0];
    const piActivity=PERSONAL_INM.map(pi=>{
      const asis=(pi.asistencias||[]).filter(a=>a.fecha>=iniStr&&a.fecha<=finStr);
      const dias=asis.filter(a=>a.entrada).length;
      const contratosPI=PROPERTY_SERVICES.filter(p=>p.personalAsignado?.includes(pi.id)||p.personalIds?.includes(pi.id)||(PROPERTY_SERVICES.find(pp=>pp.id===p.id)&&pi.serviciosAsignados?.includes(p.id)));
      return{...pi,diasTrabajados:dias,contratos:pi.serviciosAsignados?.length||0};
    }).filter(pi=>pi.activo!==false);
    /* Trabajadores de limpieza */
    const wsActivos=WORKERS.filter(w=>w.status!=='inactive'&&w.services>0).sort((a,b)=>b.services-a.services);
    const totalSvcsW=wsActivos.reduce((a,w)=>a+w.services,0);
    panel.innerHTML=`
      <p class="dash-section-title" style="margin-top:0;">${labelQ}</p>
      <div class="dash-kpi-grid">
        <div class="dash-kpi accent"><p>Ingresos contratos</p><span>$${ingresosInm.toLocaleString('es-MX')}</span></div>
        <div class="dash-kpi green"><p>Utilidad AYALYM (50%)</p><span>$${comInm.toLocaleString('es-MX')}</span></div>
        <div class="dash-kpi"><p>Pago personal Inm. (50%)</p><span>$${comInm.toLocaleString('es-MX')}</span></div>
        <div class="dash-kpi"><p>Contratos activos</p><span>${contActivos.length}</span></div>
      </div>
      ${piActivity.length?`
      <p class="dash-section-title">Personal de inmuebles — asistencia en el período</p>
      ${piActivity.map(pi=>{
        const init=(pi.initials||pi.nombre?.split(' ').map(n=>n[0]).join('').slice(0,2)||'??').toUpperCase();
        return`<div class="dash-rank-row">
          <div class="av" style="width:32px;height:32px;font-size:${pi.photo?'0':'11px'};background:#5B2C6F;color:#fff;flex-shrink:0;">${pi.photo?'<img src="'+pi.photo+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">':init}</div>
          <div class="dash-rank-info"><p>${pi.nombre}</p><span>${pi.contratos} contrato${pi.contratos!==1?'s':''} asignado${pi.contratos!==1?'s':''}</span></div>
          <div style="text-align:right;">
            <p style="font-size:13px;font-weight:500;color:#042C53;">${pi.diasTrabajados} día${pi.diasTrabajados!==1?'s':''}</p>
            <span class="badge ${pi.activo?'b-activo':'b-inactivo'}" style="font-size:10px;">${pi.activo?'Activo':'Inactivo'}</span>
          </div>
        </div>`;}).join('')}`:`<p style="font-size:12px;color:#185FA5;text-align:center;padding:8px;">Sin personal de inmuebles registrado</p>`}
      ${wsActivos.length?`
      <p class="dash-section-title">Trabajadores de limpieza — servicios acumulados</p>
      <div class="dash-kpi-grid" style="margin-bottom:12px;">
        <div class="dash-kpi"><p>Servicios acumulados</p><span>${totalSvcsW.toLocaleString('es-MX')}</span></div>
        <div class="dash-kpi"><p>Trabajadores con actividad</p><span>${wsActivos.length}</span></div>
      </div>
      ${wsActivos.slice(0,8).map((w,i)=>{
        const avg=w.reviews.length?w.reviews.reduce((s,r)=>s+r.stars,0)/w.reviews.length:0;
        const svc=w.type.map(t=>({depto:'Depto',auto:'Autos',tapiceria:'Tap.'}[t])).join('·');
        return`<div class="dash-rank-row">
          <span class="dash-rank-num">${i+1}</span>
          <div class="av" style="width:32px;height:32px;font-size:${w.photo?'0':'11px'};flex-shrink:0;">${w.photo?'<img src="'+w.photo+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">':w.initials}</div>
          <div class="dash-rank-info"><p>${w.name}</p><span>${svc}${avg?` · ★${avg.toFixed(1)}`:''}</span></div>
          <div style="text-align:right;">
            <p style="font-size:13px;font-weight:500;color:#042C53;">${w.services} servicios</p>
            <span class="badge b-activo" style="font-size:10px;">Activo</span>
          </div>
        </div>`;}).join('')}`:`<p style="font-size:12px;color:#185FA5;text-align:center;padding:8px;">Sin trabajadores con servicios registrados</p>`}`;
  } else if(tab==='zonas'){
    panel.innerHTML=`
      <div class="dash-kpi-grid">
        <div class="dash-kpi accent"><p>Zonas activas</p><span>${ZONAS.length}</span></div>
        <div class="dash-kpi"><p>Trabajadores activos</p><span>${WORKERS.filter(w=>w.status!=='inactive').length}</span></div>
      </div>
      <p class="dash-section-title">Cobertura por zona</p>
      ${ZONAS.map(z=>{
        const ws=WORKERS.filter(w=>w.status!=='inactive'&&w.zonas.includes(z.id));
        const activos=ws.filter(w=>w.status==='active').length;
        const ocupados=ws.filter(w=>w.status==='busy').length;
        const svcs=ws.map(w=>w.type).flat().filter((v,i,a)=>a.indexOf(v)===i).map(t=>({depto:'Depto',auto:'Autos',tapiceria:'Tap.'}[t])).join(', ');
        return`<div style="border:.5px solid #B5D4F4;border-radius:10px;padding:10px 12px;margin-bottom:8px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
            <p style="font-size:13px;font-weight:500;color:#042C53;">${z.nombre}</p>
            <span style="font-size:12px;font-weight:500;color:#1A56DB;">${ws.length} trabajador${ws.length!==1?'es':''}</span>
          </div>
          <p style="font-size:11px;color:#185FA5;margin-bottom:6px;">${z.colonias}</p>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            ${activos?`<span class="badge bok">${activos} disponible${activos!==1?'s':''}</span>`:''}
            ${ocupados?`<span class="badge bwarn">${ocupados} en servicio</span>`:''}
            ${!ws.length?`<span class="badge berr">Sin cobertura</span>`:''}
            ${svcs?`<span style="font-size:11px;color:#185FA5;align-self:center;">${svcs}</span>`:''}
          </div>
        </div>`;
      }).join('')}`;
  }
}
function renderTopCards(){
  const el=document.getElementById('top-cards-list');if(!el)return;
  // Mejor trabajador — mayor promedio de reseñas (mínimo 1 reseña)
  const withRevs=WORKERS.filter(w=>w.status!=='inactive'&&w.reviews.length>0);
  const bestW=withRevs.sort((a,b)=>{
    const avgA=a.reviews.reduce((s,r)=>s+r.stars,0)/a.reviews.length;
    const avgB=b.reviews.reduce((s,r)=>s+r.stars,0)/b.reviews.length;
    return avgB-avgA||(b.reviews.length-a.reviews.length);
  })[0];
  // Mejor supervisor — mayor promedio del equipo (mínimo 1 reseña en el equipo)
  const svScored=SUPERVISORS.map(sv=>{
    const ws=WORKERS.filter(w=>sv.assignedWorkers.includes(w.id));
    const revs=ws.flatMap(w=>w.reviews);
    const avg=revs.length?revs.reduce((s,r)=>s+r.stars,0)/revs.length:null;
    return{...sv,avg,totalRevs:revs.length,teamSize:ws.length};
  }).filter(sv=>sv.avg!==null).sort((a,b)=>b.avg-a.avg||(b.totalRevs-a.totalRevs));
  const bestSV=svScored[0];
  const rows=[];
  if(bestW){
    const avg=bestW.reviews.reduce((s,r)=>s+r.stars,0)/bestW.reviews.length;
    const svc=bestW.type.map(t=>({depto:'Depto',auto:'Autos',tapiceria:'Tapicería'}[t])).join(' · ');
    rows.push(`<div class="top-card gold">
      <div class="top-card-badge">🏆</div>
      <div class="av" style="width:40px;height:40px;font-size:${bestW.photo?'0':'13px'};flex-shrink:0;">${bestW.photo?'<img src="'+bestW.photo+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">':bestW.initials}</div>
      <div class="top-card-body"><p>${bestW.name}</p><span>Mejor trabajador · ${svc}</span><div style="display:flex;gap:2px;margin-top:3px;">${s$(avg,11)}</div></div>
      <div class="top-card-score"><p>${avg.toFixed(1)}</p><span>${bestW.reviews.length} reseñas</span></div>
    </div>`);
  }
  if(bestSV){
    rows.push(`<div class="top-card teal">
      <div class="top-card-badge">⭐</div>
      <div class="av" style="width:40px;height:40px;font-size:${bestSV.photo?'0':'13px'};background:#085041;flex-shrink:0;">${bestSV.photo?'<img src="'+bestSV.photo+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">':bestSV.initials}</div>
      <div class="top-card-body"><p>${bestSV.name}</p><span>Mejor supervisor · ${bestSV.teamSize} trabajador${bestSV.teamSize!==1?'es':''}</span><div style="display:flex;gap:2px;margin-top:3px;">${s$(bestSV.avg,11)}</div></div>
      <div class="top-card-score"><p>${bestSV.avg.toFixed(1)}</p><span>${bestSV.totalRevs} reseñas</span></div>
    </div>`);
  }
  el.innerHTML=rows.join('')||'<p style="font-size:13px;color:#185FA5;text-align:center;padding:1rem;">Sin datos suficientes aún.</p>';
}

function renderAdminKPIs(){
  const el=document.getElementById('admin-kpi-bar');if(!el)return;
  const workersActivos=WORKERS.filter(w=>w.status==='active').length;
  const totalWorkers=WORKERS.length;
  const inmueblesActivos=PROPERTY_SERVICES.filter(p=>p.status==='activo').length;
  const totalInmuebles=PROPERTY_SERVICES.length;
  const totalClientes=USERS.filter(u=>u.rol==='cliente'&&u.activo!==false).length;
  const alertas=LOW_REVIEWS.filter(r=>!r.applied).length;
  const personalInmActivos=PERSONAL_INM.filter(p=>p.activo!==false).length;
  el.innerHTML=`<div class="admin-kpi-bar">
    <div class="admin-kpi-cell akc-green">
      <div class="akc-val">${workersActivos}<span style="font-size:13px;color:#5C7A9A;">/${totalWorkers}</span></div>
      <div class="akc-lbl">Trabajadores<br>activos</div>
    </div>
    <div class="admin-kpi-cell">
      <div class="akc-val">${totalClientes}</div>
      <div class="akc-lbl">Clientes<br>registrados</div>
    </div>
    <div class="admin-kpi-cell akc-purple">
      <div class="akc-val">${inmueblesActivos}<span style="font-size:13px;color:#5C7A9A;">/${totalInmuebles}</span></div>
      <div class="akc-lbl">Contratos<br>activos</div>
    </div>
    <div class="admin-kpi-cell${alertas>0?' akc-amber':''}">
      <div class="akc-val">${alertas||'✓'}</div>
      <div class="akc-lbl">Evaluaciones<br>por atender</div>
    </div>
  </div>`;
}

/* ── ADMIN: PANEL DE REPORTES ── */
/* ── Estado filtros de asistencias admin ── */
let _adminAstFiltro='dia';
let _adminAstFechaA='';
let _adminAstFechaB='';
let _adminAstClientFiltro='';
let _adminAstSvFiltro='';
let _adminAstView='supervisores'; /* 'supervisores' | 'personal_inm' */
let _adminAstPIContratoFiltro=''; /* filtro contrato para personal_inm */
let _adminAstPIPersonalFiltro=''; /* filtro por trabajador para personal_inm */

/* Fecha local (no UTC) para evitar desfase de zona horaria México */
function _localDateStr(){
  const d=new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function switchRepTab(tab,btn){
  ['rendimiento','asistencias'].forEach(t=>{
    const p=document.getElementById('rep-panel-'+t);
    if(p)p.style.display=t===tab?'':'none';
  });
  document.querySelectorAll('#a-reportes .msg-tab').forEach(b=>b.classList.remove('active'));
  if(btn)btn.classList.add('active');
  if(tab==='asistencias')renderAdminAstReport();
}

function _astDateRange(){
  const hoy=new Date();
  const yyyy=hoy.getFullYear();
  const mm=String(hoy.getMonth()+1).padStart(2,'0');
  const dd=String(hoy.getDate()).padStart(2,'0');
  const todayStr=`${yyyy}-${mm}-${dd}`;
  switch(_adminAstFiltro){
    case 'dia': return{from:todayStr,to:todayStr,label:'Hoy '+todayStr};
    case 'quincena':{
      const d=hoy.getDate();
      const from=d<=15?`${yyyy}-${mm}-01`:`${yyyy}-${mm}-16`;
      return{from,to:todayStr,label:'Quincena '+from+' → '+todayStr};
    }
    case 'mes': return{from:`${yyyy}-${mm}-01`,to:todayStr,label:'Mes '+yyyy+'-'+mm};
    case 'año': return{from:`${yyyy}-01-01`,to:todayStr,label:'Año '+yyyy};
    case 'rango':{
      const f=_adminAstFechaA||`${yyyy}-${mm}-01`;
      const t=_adminAstFechaB||todayStr;
      return{from:f,to:t,label:f+' → '+t};
    }
    default: return{from:todayStr,to:todayStr,label:todayStr};
  }
}

function _setAstFiltro(f){
  _adminAstFiltro=f;
  if(f!=='rango'){_adminAstFechaA='';_adminAstFechaB='';}
  _adminAstClientFiltro=''; /* resetear filtros al cambiar período */
  _adminAstSvFiltro='';
  _adminAstPIContratoFiltro='';
  _adminAstPIPersonalFiltro='';
  renderAdminAstReport();
}

function renderAdminAstReport(){
  /* El contenido va dentro del card, en ast-report-body o en rep-panel-asistencias */
  const el=document.getElementById('ast-report-body')||document.getElementById('rep-panel-asistencias');if(!el)return;
  const{from,to,label}=_astDateRange();
  /* Filtramos por fecha primero para construir las listas disponibles */
  const byDate=SUPERVISOR_ASISTENCIAS.filter(a=>a.fecha>=from&&a.fecha<=to);
  /* Listas únicas de supervisores y clientes en el período */
  const supervisores=[...new Set(byDate.map(a=>a.supervisorNombre).filter(Boolean))].sort();
  const clientes=[...new Set(byDate.map(a=>a.clienteNombre).filter(Boolean))].sort();
  /* Si el valor seleccionado ya no existe en el rango, lo limpiamos */
  if(_adminAstSvFiltro&&!supervisores.includes(_adminAstSvFiltro))_adminAstSvFiltro='';
  if(_adminAstClientFiltro&&!clientes.includes(_adminAstClientFiltro))_adminAstClientFiltro='';
  /* Filtro final: fecha + supervisor + cliente */
  const filtered=byDate
    .filter(a=>(!_adminAstSvFiltro||a.supervisorNombre===_adminAstSvFiltro)&&(!_adminAstClientFiltro||a.clienteNombre===_adminAstClientFiltro))
    .sort((a,b)=>b.fecha.localeCompare(a.fecha)||a.supervisorNombre.localeCompare(b.supervisorNombre));

  const filtBtns=['dia','quincena','mes','año','rango'].map(f=>
    `<button class="urf-btn${_adminAstFiltro===f?' active':''}" onclick="_setAstFiltro('${f}')">${{dia:'Hoy',quincena:'Quincena',mes:'Mes',año:'Año',rango:'Rango'}[f]}</button>`
  ).join('');
  const rangoInps=_adminAstFiltro==='rango'?`
    <input type="date" value="${_adminAstFechaA}" style="font-size:12px;padding:4px 8px;border-radius:6px;border:1px solid #B5D4F4;" onchange="_adminAstFechaA=this.value;renderAdminAstReport()">
    <span style="font-size:12px;color:#5C7A9A;">—</span>
    <input type="date" value="${_adminAstFechaB}" style="font-size:12px;padding:4px 8px;border-radius:6px;border:1px solid #B5D4F4;" onchange="_adminAstFechaB=this.value;renderAdminAstReport()">
  `:'';
  /* Dropdown de supervisor */
  const svOpts=['<option value="">— Todos los supervisores —</option>',
    ...supervisores.map(s=>`<option value="${s}"${_adminAstSvFiltro===s?' selected':''}>${s}</option>`)
  ].join('');
  const svSel=`<select style="font-size:12px;padding:5px 8px;border-radius:6px;border:.5px solid #B5D4F4;color:#042C53;background:#fff;max-width:190px;"
    onchange="_adminAstSvFiltro=this.value;renderAdminAstReport()">${svOpts}</select>`;
  /* Dropdown de cliente */
  const clienteOpts=['<option value="">— Todos los clientes —</option>',
    ...clientes.map(c=>`<option value="${c}"${_adminAstClientFiltro===c?' selected':''}>${c}</option>`)
  ].join('');
  const clienteSel=`<select style="font-size:12px;padding:5px 8px;border-radius:6px;border:.5px solid #B5D4F4;color:#042C53;background:#fff;max-width:190px;"
    onchange="_adminAstClientFiltro=this.value;renderAdminAstReport()">${clienteOpts}</select>`;

  const tbodyHtml=filtered.length?filtered.map(a=>`<tr>
    <td>${a.supervisorNombre}</td>
    <td>${a.servicioFolio}</td>
    <td>${a.clienteNombre}</td>
    <td>${a.inmuebleDireccion||'—'}</td>
    <td>${a.fecha}</td>
    <td>${a.entrada||'—'}</td>
    <td>${a.salida||'—'}</td>
    <td>${_fmtDur(a.duracion)}</td>
    <td><button onclick="adminDeleteSVAst('${a.id}')" style="background:none;border:none;cursor:pointer;font-size:14px;padding:2px 6px;color:#B91C1C;" title="Eliminar registro">🗑</button></td>
  </tr>`).join('')
  :`<tr><td colspan="9" style="text-align:center;padding:1.5rem;color:#5C7A9A;">Sin registros en este período</td></tr>`;
  /* ── Tabla Personal de Inmuebles ── */
  const{from:fromPI,to:toPI}=_astDateRange();
  /* Enriquecer filas con contratos asignados */
  const piRowsAll=PERSONAL_INM.flatMap(pi=>{
    const contratos=PROPERTY_SERVICES.filter(ps=>(pi.serviciosAsignados||[]).includes(ps.id));
    const contratoLabel=contratos.length?contratos.map(ps=>`${ps.folio||'INM'} — ${ps.cliente.nombre}`).join(', '):'Sin contrato';
    const contratoKeys=contratos.map(ps=>ps.folio||String(ps.id));
    return(pi.asistencias||[])
      .filter(a=>a.fecha>=fromPI&&a.fecha<=toPI)
      .map(a=>({...a,piId:pi.id,piNombre:pi.nombre,piPhoto:pi.photo||null,contratoLabel,contratoKeys}));
  }).sort((a,b)=>b.fecha.localeCompare(a.fecha)||a.piNombre.localeCompare(b.piNombre));
  /* Lista única de trabajadores y contratos para los dropdowns */
  const piPersonales=[...new Set(piRowsAll.map(r=>r.piNombre))].sort();
  const piContratos=[...new Set(piRowsAll.map(r=>r.contratoLabel))].sort();
  if(_adminAstPIPersonalFiltro&&!piPersonales.includes(_adminAstPIPersonalFiltro))_adminAstPIPersonalFiltro='';
  if(_adminAstPIContratoFiltro&&!piContratos.includes(_adminAstPIContratoFiltro))_adminAstPIContratoFiltro='';
  const piRows=piRowsAll.filter(r=>
    (!_adminAstPIPersonalFiltro||r.piNombre===_adminAstPIPersonalFiltro)&&
    (!_adminAstPIContratoFiltro||r.contratoLabel===_adminAstPIContratoFiltro)
  );
  const piPersonalOpts=['<option value="">— Todos los trabajadores —</option>',
    ...piPersonales.map(p=>`<option value="${p}"${_adminAstPIPersonalFiltro===p?' selected':''}>${p}</option>`)
  ].join('');
  const piPersonalSel=`<select style="font-size:12px;padding:5px 8px;border-radius:6px;border:.5px solid #B5D4F4;color:#042C53;background:#fff;max-width:200px;"
    onchange="_adminAstPIPersonalFiltro=this.value;renderAdminAstReport()">${piPersonalOpts}</select>`;
  const piContratoOpts=['<option value="">— Todos los contratos —</option>',
    ...piContratos.map(c=>`<option value="${c}"${_adminAstPIContratoFiltro===c?' selected':''}>${c}</option>`)
  ].join('');
  const piContratoSel=`<select style="font-size:12px;padding:5px 8px;border-radius:6px;border:.5px solid #B5D4F4;color:#042C53;background:#fff;max-width:260px;"
    onchange="_adminAstPIContratoFiltro=this.value;renderAdminAstReport()">${piContratoOpts}</select>`;
  const piTbodyHtml=piRows.length?piRows.map(a=>{
    const initials=(a.piNombre||'').split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()||'PI';
    const avCell=a.piPhoto
      ?`<img src="${a.piPhoto}" style="width:26px;height:26px;border-radius:50%;object-fit:cover;vertical-align:middle;margin-right:6px;">`
      :`<span style="display:inline-flex;align-items:center;justify-content:center;width:26px;height:26px;border-radius:50%;background:#042C53;color:#fff;font-size:9px;font-weight:700;vertical-align:middle;margin-right:6px;">${initials}</span>`;
    return`<tr>
    <td style="white-space:nowrap;">${avCell}${a.piNombre}</td>
    <td style="font-size:11px;color:#5C7A9A;">${a.contratoLabel}</td>
    <td>${a.fecha}</td>
    <td>${a.entrada||'—'}</td>
    <td>${a.salida||'—'}</td>
    <td>${a.entrada&&a.salida?_fmtDur((()=>{const[eh,em]=(a.entrada||'0:0').split(':').map(Number);const[sh,sm]=(a.salida||'0:0').split(':').map(Number);return(sh*60+sm)-(eh*60+em);})()):'—'}</td>
    <td><button onclick="adminDeletePIAst('${a.piId}','${a.fecha}')" style="background:none;border:none;cursor:pointer;font-size:14px;padding:2px 6px;color:#B91C1C;" title="Eliminar registro">🗑</button></td>
  </tr>`;}).join('')
  :`<tr><td colspan="7" style="text-align:center;padding:1.5rem;color:#5C7A9A;">Sin registros en este período</td></tr>`;
  const labelExtra=[_adminAstSvFiltro?`Supervisor: ${_adminAstSvFiltro}`:'',_adminAstClientFiltro?`Cliente: ${_adminAstClientFiltro}`:''].filter(Boolean).join(' · ');
  const viewTabs=`<div class="user-role-filter" style="margin:0 0 12px;">
    <button class="urf-btn${_adminAstView==='supervisores'?' active':''}" onclick="_adminAstView='supervisores';renderAdminAstReport()">🧑‍💼 Supervisores</button>
    <button class="urf-btn${_adminAstView==='personal_inm'?' active':''}" onclick="_adminAstView='personal_inm';renderAdminAstReport()">🏢 Personal Inmuebles</button>
  </div>`;
  const svContent=`
    <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:10px;">
      <div class="user-role-filter" style="margin:0;">${filtBtns}</div>
      ${rangoInps}
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:12px;">
      <span style="font-size:12px;color:#185FA5;font-weight:500;">🧑‍💼 Supervisor:</span>
      ${svSel}
      <span style="font-size:12px;color:#185FA5;font-weight:500;">👤 Cliente:</span>
      ${clienteSel}
      <button class="btn-sm" style="margin-left:auto;font-size:11px;" onclick="exportAsistenciasPDF()">⬇ Exportar PDF</button>
    </div>
    <p style="font-size:11px;color:#5C7A9A;margin-bottom:10px;">${filtered.length} registro${filtered.length!==1?'s':''} · ${label}${labelExtra?' · '+labelExtra:''}</p>
    <div style="overflow-x:auto;">
      <table class="rep-table" id="ast-report-table">
        <thead><tr>
          <th>Supervisor</th><th>Folio</th><th>Cliente</th>
          <th>Inmueble</th><th>Fecha</th><th>Entrada</th><th>Salida</th><th>Duración</th><th></th>
        </tr></thead>
        <tbody>${tbodyHtml}</tbody>
      </table>
    </div>`;
  const piLabelExtra=[_adminAstPIPersonalFiltro?`👤 ${_adminAstPIPersonalFiltro}`:'',_adminAstPIContratoFiltro?`📄 ${_adminAstPIContratoFiltro}`:''].filter(Boolean).join(' · ');
  const piContent=`
    <div style="display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:10px;">
      <div class="user-role-filter" style="margin:0;">${filtBtns}</div>
      ${rangoInps}
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:12px;">
      <span style="font-size:12px;color:#185FA5;font-weight:500;">👤 Trabajador:</span>
      ${piPersonalSel}
      <span style="font-size:12px;color:#185FA5;font-weight:500;">📄 Contrato:</span>
      ${piContratoSel}
      <button class="btn-sm" style="margin-left:auto;font-size:11px;" onclick="exportPIAsistenciasPDF()">⬇ Exportar PDF</button>
    </div>
    <p style="font-size:11px;color:#5C7A9A;margin-bottom:10px;">${piRows.length} registro${piRows.length!==1?'s':''} · ${label}${piLabelExtra?' · '+piLabelExtra:''}</p>
    <div style="overflow-x:auto;">
      <table class="rep-table">
        <thead><tr>
          <th>Personal</th><th>Contrato</th><th>Fecha</th><th>Entrada</th><th>Salida</th><th>Duración</th><th></th>
        </tr></thead>
        <tbody>${piTbodyHtml}</tbody>
      </table>
    </div>`;
  el.innerHTML=viewTabs+(_adminAstView==='personal_inm'?piContent:svContent);
}

function adminDeleteSVAst(id){
  if(!confirm('¿Eliminar este registro de asistencia?'))return;
  const idx=SUPERVISOR_ASISTENCIAS.findIndex(a=>String(a.id)===String(id));
  if(idx===-1)return;
  const docId=SUPERVISOR_ASISTENCIAS[idx].id;
  SUPERVISOR_ASISTENCIAS.splice(idx,1);
  fbDeleteDoc('sv_asistencias',docId); /* borra el documento en Firestore */
  renderAdminAstReport();
  showToast('green','🗑','Registro eliminado');
}

function adminDeletePIAst(piId,fecha){
  if(!confirm('¿Eliminar este registro de asistencia?'))return;
  const pi=PERSONAL_INM.find(p=>String(p.id)===String(piId));
  if(!pi)return;
  const idx=(pi.asistencias||[]).findIndex(a=>a.fecha===fecha);
  if(idx===-1)return;
  pi.asistencias.splice(idx,1);
  fbSavePersonalInm(); /* personal_inm se guarda como un solo doc, set() reemplaza todo */
  renderAdminAstReport();
  showToast('green','🗑','Registro eliminado');
}

function exportAsistenciasPDF(){
  const{from,to,label}=_astDateRange();
  const filtered=SUPERVISOR_ASISTENCIAS.filter(a=>a.fecha>=from&&a.fecha<=to&&(!_adminAstSvFiltro||a.supervisorNombre===_adminAstSvFiltro)&&(!_adminAstClientFiltro||a.clienteNombre===_adminAstClientFiltro))
    .sort((a,b)=>b.fecha.localeCompare(a.fecha));
  const badges=[_adminAstSvFiltro?`🧑‍💼 ${_adminAstSvFiltro}`:'',_adminAstClientFiltro?`👤 ${_adminAstClientFiltro}`:''].filter(Boolean);
  const labelExtra=badges.join(' · ');
  const logoSrc=new URL('img/logo.png',window.location.href).href;
  const rows=filtered.map(a=>`<tr>
    <td>${a.supervisorNombre}</td><td>${a.servicioFolio}</td><td>${a.clienteNombre}</td>
    <td>${a.inmuebleDireccion||'—'}</td><td>${a.fecha}</td>
    <td>${a.entrada||'—'}</td><td>${a.salida||'—'}</td><td>${_fmtDur(a.duracion)}</td>
  </tr>`).join('');
  const html=`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Asistencias AYALYM — ${label}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:Arial,sans-serif;font-size:11px;color:#1a1a2e;padding:24px;}
  .header{display:flex;align-items:center;gap:14px;padding-bottom:14px;border-bottom:2px solid #042C53;margin-bottom:14px;}
  .header img{width:52px;height:52px;object-fit:contain;border-radius:10px;}
  .header-text{}
  .logo{font-size:22px;font-weight:800;color:#042C53;letter-spacing:-0.5px;line-height:1;}
  .logo span{color:#185FA5;}
  .logo-tag{font-size:9px;color:#5C7A9A;margin-top:2px;letter-spacing:.5px;}
  h2{font-size:13px;color:#042C53;margin:0 0 3px;}
  p.sub{font-size:10px;color:#666;margin-bottom:0;}
  .filter-badge{display:inline-block;background:#E6F1FB;color:#0C447C;border-radius:4px;padding:2px 8px;font-size:9px;font-weight:600;margin-top:4px;}
  table{width:100%;border-collapse:collapse;margin-top:4px;}
  th{background:#042C53;color:#fff;padding:7px 9px;text-align:left;font-size:10px;}
  td{padding:6px 9px;border-bottom:1px solid #e0e7ef;font-size:10px;}
  tr:nth-child(even) td{background:#f4f8fc;}
  .footer{margin-top:14px;font-size:9px;color:#999;display:flex;justify-content:space-between;border-top:1px solid #e0e7ef;padding-top:8px;}
  @media print{@page{margin:12mm 15mm;} button{display:none;}}
</style></head><body>
  <div class="header">
    <img src="${logoSrc}" alt="AYA Limpieza y Mantenimiento">
    <div class="header-text">
      <div class="logo">AYA<span>LYM</span></div>
      <div class="logo-tag">Limpieza y Mantenimiento Profesional</div>
    </div>
    <div style="margin-left:auto;text-align:right;">
      <h2>Reporte de Asistencias de Supervisores</h2>
      <p class="sub">Período: ${label}</p>
      ${badges.map(b=>`<span class="filter-badge">${b}</span>`).join(' ')}
      <p class="sub" style="margin-top:4px;">Generado el ${new Date().toLocaleDateString('es-MX',{day:'2-digit',month:'long',year:'numeric'})}</p>
    </div>
  </div>
  <table>
    <thead><tr>
      <th>Supervisor</th><th>Folio</th><th>Cliente</th>
      <th>Inmueble</th><th>Fecha</th><th>Entrada</th><th>Salida</th><th>Duración</th>
    </tr></thead>
    <tbody>${rows||'<tr><td colspan="8" style="text-align:center;padding:1rem;color:#666;">Sin registros en este período</td></tr>'}</tbody>
  </table>
  <div class="footer">
    <span>Total: ${filtered.length} registro${filtered.length!==1?'s':''}${labelExtra?' · '+labelExtra:''}</span>
    <span>AYALYM © ${new Date().getFullYear()}</span>
  </div>
  <script>window.onload=function(){window.print();}<\/script>
</body></html>`;
  const w=window.open('','_blank','width=960,height=720');
  if(w){w.document.write(html);w.document.close();}
  else{showToast('amber','⚠️','Permite ventanas emergentes para exportar PDF');}
}

function exportPIAsistenciasPDF(){
  const{from,to,label}=_astDateRange();
  const piRowsAll=PERSONAL_INM.flatMap(pi=>{
    const contratos=PROPERTY_SERVICES.filter(ps=>(pi.serviciosAsignados||[]).includes(ps.id));
    const contratoLabel=contratos.length?contratos.map(ps=>`${ps.folio||'INM'} — ${ps.cliente.nombre}`).join(', '):'Sin contrato';
    return(pi.asistencias||[])
      .filter(a=>a.fecha>=from&&a.fecha<=to)
      .map(a=>({...a,piId:pi.id,piNombre:pi.nombre,piPhoto:pi.photo||null,contratoLabel}));
  }).sort((a,b)=>b.fecha.localeCompare(a.fecha)||a.piNombre.localeCompare(b.piNombre));
  const piRows=piRowsAll.filter(r=>
    (!_adminAstPIPersonalFiltro||r.piNombre===_adminAstPIPersonalFiltro)&&
    (!_adminAstPIContratoFiltro||r.contratoLabel===_adminAstPIContratoFiltro)
  );
  const badges=[_adminAstPIPersonalFiltro?`👤 ${_adminAstPIPersonalFiltro}`:'',_adminAstPIContratoFiltro?`📄 ${_adminAstPIContratoFiltro}`:''].filter(Boolean);
  const labelExtra=badges.join(' · ');
  const logoSrc=new URL('img/logo.png',window.location.href).href;
  /* Si hay un solo trabajador filtrado, mostrar su foto grande en la cabecera */
  const soloWorker=_adminAstPIPersonalFiltro&&piRows.length?piRows[0]:null;
  const workerPhotoHtml=soloWorker&&soloWorker.piPhoto
    ?`<img src="${soloWorker.piPhoto}" style="width:54px;height:54px;border-radius:50%;object-fit:cover;border:3px solid #042C53;">`
    :'';
  const rows=piRows.map(a=>{
    const initials=(a.piNombre||'').split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()||'PI';
    const avHtml=a.piPhoto
      ?`<img src="${a.piPhoto}" style="width:24px;height:24px;border-radius:50%;object-fit:cover;vertical-align:middle;margin-right:5px;">`
      :`<span style="display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:#042C53;color:#fff;font-size:8px;font-weight:700;vertical-align:middle;margin-right:5px;">${initials}</span>`;
    const dur=a.entrada&&a.salida?(()=>{const[eh,em]=(a.entrada||'0:0').split(':').map(Number);const[sh,sm]=(a.salida||'0:0').split(':').map(Number);return _fmtDur((sh*60+sm)-(eh*60+em));})():'—';
    return`<tr>
      <td style="white-space:nowrap;">${avHtml}${a.piNombre}</td>
      <td style="font-size:10px;color:#5C7A9A;">${a.contratoLabel}</td>
      <td>${a.fecha}</td><td>${a.entrada||'—'}</td><td>${a.salida||'—'}</td><td>${dur}</td>
    </tr>`;
  }).join('');
  const html=`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Asistencias Personal Inmuebles — ${label}</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:Arial,sans-serif;font-size:11px;color:#1a1a2e;padding:24px;}
  .header{display:flex;align-items:center;gap:14px;padding-bottom:14px;border-bottom:2px solid #042C53;margin-bottom:14px;}
  .header img.logo-img{width:52px;height:52px;object-fit:contain;border-radius:10px;}
  .logo{font-size:22px;font-weight:800;color:#042C53;letter-spacing:-0.5px;line-height:1;}
  .logo span{color:#185FA5;}
  .logo-tag{font-size:9px;color:#5C7A9A;margin-top:2px;letter-spacing:.5px;}
  h2{font-size:13px;color:#042C53;margin:0 0 3px;}
  p.sub{font-size:10px;color:#666;margin-bottom:0;}
  .filter-badge{display:inline-block;background:#E1F5EE;color:#085041;border-radius:4px;padding:2px 8px;font-size:9px;font-weight:600;margin-top:4px;}
  table{width:100%;border-collapse:collapse;margin-top:4px;}
  th{background:#042C53;color:#fff;padding:7px 9px;text-align:left;font-size:10px;}
  td{padding:6px 9px;border-bottom:1px solid #e0e7ef;font-size:10px;}
  tr:nth-child(even) td{background:#f4f8fc;}
  .footer{margin-top:14px;font-size:9px;color:#999;display:flex;justify-content:space-between;border-top:1px solid #e0e7ef;padding-top:8px;}
  @media print{@page{margin:12mm 15mm;} button{display:none;}}
</style></head><body>
  <div class="header">
    <img class="logo-img" src="${logoSrc}" alt="AYA Limpieza y Mantenimiento">
    <div>
      <div class="logo">AYA<span>LYM</span></div>
      <div class="logo-tag">Limpieza y Mantenimiento Profesional</div>
    </div>
    ${workerPhotoHtml}
    <div style="margin-left:auto;text-align:right;">
      <h2>Reporte de Asistencias — Personal Inmuebles</h2>
      <p class="sub">Período: ${label}</p>
      ${badges.map(b=>`<span class="filter-badge">${b}</span>`).join(' ')}
      <p class="sub" style="margin-top:4px;">Generado el ${new Date().toLocaleDateString('es-MX',{day:'2-digit',month:'long',year:'numeric'})}</p>
    </div>
  </div>
  <table>
    <thead><tr>
      <th>Trabajador</th><th>Contrato</th><th>Fecha</th><th>Entrada</th><th>Salida</th><th>Duración</th>
    </tr></thead>
    <tbody>${rows||'<tr><td colspan="6" style="text-align:center;padding:1rem;color:#666;">Sin registros en este período</td></tr>'}</tbody>
  </table>
  <div class="footer">
    <span>Total: ${piRows.length} registro${piRows.length!==1?'s':''}${labelExtra?' · '+labelExtra:''}</span>
    <span>AYALYM © ${new Date().getFullYear()}</span>
  </div>
  <script>window.onload=function(){window.print();}<\/script>
</body></html>`;
  const w=window.open('','_blank','width=960,height=720');
  if(w){w.document.write(html);w.document.close();}
  else{showToast('amber','⚠️','Permite ventanas emergentes para exportar PDF');}
}

/* ══════════════════════════════════════════════════════════
   MAPA EN TIEMPO REAL — Admin
   ══════════════════════════════════════════════════════════ */
let _adminMapInstance=null;
let _adminMapMarkers={};
let _adminMapListener=null;

/* Carga el API de Google Maps solo la primera vez que se necesita (lazy load).
   Ahorra ~300KB en cada sesión donde el usuario nunca abre el mapa. */
let _mapsLoadPromise=null;
function _waitForGoogleMaps(){
  if(_mapsLoadPromise)return _mapsLoadPromise;
  _mapsLoadPromise=new Promise(resolve=>{
    if(window.google&&window.google.maps&&window.google.maps.Map){resolve();return;}
    /* Inyectar script solo una vez */
    if(!document.getElementById('gmaps-script')){
      const s=document.createElement('script');
      s.id='gmaps-script';
      s.src='https://maps.googleapis.com/maps/api/js?key=AIzaSyB09Mi1wxP_LSKMiM8un83M1OtnauG_vuE&loading=async';
      s.async=true;
      document.head.appendChild(s);
    }
    /* Esperar hasta que esté listo (máx 15 s) */
    let tries=0;
    const t=setInterval(()=>{
      if(window.google&&window.google.maps&&window.google.maps.Map){clearInterval(t);resolve();}
      else if(++tries>50){clearInterval(t);resolve();} // timeout seguro
    },300);
  });
  return _mapsLoadPromise;
}

/* ── Configurar radio de geovalla desde el mapa admin ── */
function setGeoRadio(val){
  const v=Math.max(50,Math.min(5000,parseInt(val)||500));
  GEO_RADIO_M=v;
  fbSaveGeoRadio(v);
  const inp=document.getElementById('geo-radio-input');if(inp)inp.value=v;
  showToast('green','📍',`Radio de geovalla: ${v} m`);
}

/* ── Obtener foto e iniciales de un trabajador/supervisor/personal-inm activo ── */
function _getPersonInfo(loc){
  const id=String(loc.id);
  let person=null;
  if(id.startsWith('w_')){const wid=parseInt(id.slice(2));person=WORKERS.find(w=>w.id===wid);}
  else if(id.startsWith('sv_')){const sid=parseInt(id.slice(3));person=SUPERVISORS.find(s=>s.id===sid);}
  else if(id.startsWith('pi_')){const pid=parseInt(id.slice(3));person=PERSONAL_INM.find(p=>p.id===pid);}
  const rawName=person?(person.name||person.nombre||''):'';
  const initials=person?.initials||(rawName.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase())||'??';
  return{photo:person?.photo||null,initials};
}

/* ── Construir ícono de marcador circular con foto o iniciales (Canvas) ── */
function _buildMarkerIcon(photo,initials,borderColor){
  const S=44;
  return new Promise(function(resolve){
    const canvas=document.createElement('canvas');
    canvas.width=S;canvas.height=S;
    const ctx=canvas.getContext('2d');
    function draw(img){
      /* Círculo de borde con color del rol */
      ctx.beginPath();ctx.arc(S/2,S/2,S/2-0.5,0,Math.PI*2);
      ctx.fillStyle=borderColor;ctx.fill();
      /* Anillo blanco interior */
      ctx.beginPath();ctx.arc(S/2,S/2,S/2-6,0,Math.PI*2);
      ctx.strokeStyle='#ffffff';ctx.lineWidth=2;ctx.stroke();
      /* Área interior recortada en círculo */
      ctx.save();
      ctx.beginPath();ctx.arc(S/2,S/2,S/2-7.5,0,Math.PI*2);ctx.clip();
      if(img){
        ctx.drawImage(img,7,7,S-14,S-14);
      }else{
        ctx.fillStyle=borderColor;ctx.fillRect(0,0,S,S);
        ctx.fillStyle='#ffffff';
        ctx.font='bold '+Math.round(S*0.3)+'px system-ui,sans-serif';
        ctx.textAlign='center';ctx.textBaseline='middle';
        ctx.fillText((initials||'??').slice(0,2),S/2,S/2+1);
      }
      ctx.restore();
      resolve({url:canvas.toDataURL('image/png'),scaledSize:new google.maps.Size(S,S),anchor:new google.maps.Point(S/2,S/2)});
    }
    if(photo){
      const img=new Image();
      img.onload=function(){draw(img);};
      img.onerror=function(){draw(null);};
      img.src=photo;
    }else{draw(null);}
  });
}

function renderAdminMapa(){
  const el=document.getElementById('a-mapa');if(!el)return;
  el.innerHTML=`
    <div class="card" style="padding:0;overflow:hidden;">
      <div style="padding:16px 20px 12px;display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;">
        <p class="ctitle" style="margin:0;">🗺️ Ubicaciones en tiempo real</p>
        <div style="display:flex;gap:16px;flex-wrap:wrap;align-items:center;">
          <span style="font-size:11px;color:#5C7A9A;display:flex;align-items:center;gap:5px;">
            <span style="width:11px;height:11px;border-radius:50%;background:#065041;display:inline-block;border:2px solid #fff;box-shadow:0 0 0 1px #065041;"></span>Personal Inmuebles
          </span>
          <span style="font-size:11px;color:#5C7A9A;display:flex;align-items:center;gap:5px;">
            <span style="width:11px;height:11px;border-radius:50%;background:#185FA5;display:inline-block;border:2px solid #fff;box-shadow:0 0 0 1px #185FA5;"></span>Supervisores
          </span>
          <span style="font-size:11px;color:#5C7A9A;display:flex;align-items:center;gap:5px;">
            <span style="width:11px;height:11px;border-radius:50%;background:#D97706;display:inline-block;border:2px solid #fff;box-shadow:0 0 0 1px #D97706;"></span>Trabajadores
          </span>
          <label style="display:flex;align-items:center;gap:5px;font-size:11px;color:#5C7A9A;background:#EEF5FF;border-radius:8px;padding:4px 10px;border:1px solid #C4D9F5;">
            📍 Radio:
            <input type="number" id="geo-radio-input" value="${GEO_RADIO_M}" min="50" max="5000" step="50"
              style="width:58px;padding:2px 5px;border-radius:6px;border:1px solid #C4D9F5;font-size:11px;background:#fff;color:#042C53;text-align:center;"
              onchange="setGeoRadio(this.value)" title="Radio de geovalla en metros">
            <span>m</span>
          </label>
        </div>
      </div>
      <div id="admin-map-div" style="width:100%;height:clamp(280px,45vw,520px);"></div>
      <div id="admin-map-status" style="padding:10px 16px;font-size:11px;color:#5C7A9A;border-top:.5px solid #E6F1FB;background:#F4F8FD;">
        Conectando…
      </div>
    </div>`;
  _waitForGoogleMaps().then(()=>{
    const mapDiv=document.getElementById('admin-map-div');
    if(!mapDiv)return;
    const isMobile=window.innerWidth<=640;
    _adminMapInstance=new google.maps.Map(mapDiv,{
      center:{lat:19.4326,lng:-99.1332},
      zoom:isMobile?11:12,
      mapTypeId:'roadmap',
      streetViewControl:false,
      mapTypeControl:false,
      fullscreenControl:!isMobile,
      gestureHandling:'cooperative',
      /* Estilos simplificados: oculta POIs y etiquetas secundarias → tiles más simples */
      styles:[
        {featureType:'poi',elementType:'labels',stylers:[{visibility:'off'}]},
        {featureType:'transit',elementType:'labels',stylers:[{visibility:'off'}]},
        {featureType:'administrative.locality',elementType:'labels',stylers:[{visibility:'simplified'}]}
      ]
    });
    _adminMapMarkers={};
    if(_adminMapListener){_adminMapListener();_adminMapListener=null;}
    _adminMapListener=fbListenUbicActivas(_updateAdminMapMarkers);
  });
}

function _stopAdminMapListener(){
  if(_adminMapListener){_adminMapListener();_adminMapListener=null;}
  _adminMapMarkers={};
  _adminMapInstance=null;
}

async function _updateAdminMapMarkers(locs){
  if(!_adminMapInstance)return;
  const statusEl=document.getElementById('admin-map-status');
  /* Eliminar marcadores que ya no están activos */
  const locIds=new Set(locs.map(l=>String(l.id)));
  Object.keys(_adminMapMarkers).forEach(id=>{
    if(!locIds.has(id)){_adminMapMarkers[id].marker.setMap(null);delete _adminMapMarkers[id];}
  });
  /* Agregar o actualizar marcadores con foto/iniciales */
  for(const loc of locs){
    const id=String(loc.id);
    const pos={lat:parseFloat(loc.lat),lng:parseFloat(loc.lng)};
    const color=loc.rol==='personal_inm'?'#065041':loc.rol==='trabajador'?'#D97706':'#185FA5';
    const rolLabel=loc.rol==='personal_inm'?'🏢 Personal de Inmuebles':loc.rol==='trabajador'?'🧹 Trabajador de Servicios':'🧑‍💼 Supervisor';
    const infoHtml=`<div style="font-family:system-ui,sans-serif;min-width:175px;padding:4px 2px;background:#fff;">
      <p style="font-weight:700;font-size:13px;color:#042C53;margin:0 0 4px;">${loc.nombre}</p>
      <p style="font-size:11px;color:#5C7A9A;margin:0 0 3px;">${rolLabel}</p>
      ${loc.contratoNombre?`<p style="font-size:11px;color:#185FA5;margin:0 0 3px;">🔧 ${loc.contratoNombre}</p>`:''}
      <p style="font-size:11px;color:#065041;margin:0;">⏱ Inicio: <strong style="color:#042C53;">${loc.entrada||'—'}</strong></p>
    </div>`;
    const{photo,initials}=_getPersonInfo(loc);
    const icon=await _buildMarkerIcon(photo,initials,color);
    if(_adminMapMarkers[id]){
      _adminMapMarkers[id].marker.setIcon(icon);
      _adminMapMarkers[id].marker.setPosition(pos);
      _adminMapMarkers[id].infoWindow.setContent(infoHtml);
    }else{
      const marker=new google.maps.Marker({position:pos,map:_adminMapInstance,title:loc.nombre,icon,animation:google.maps.Animation.DROP});
      const infoWindow=new google.maps.InfoWindow({content:infoHtml});
      marker.addListener('click',()=>{
        Object.values(_adminMapMarkers).forEach(m=>m.infoWindow.close());
        infoWindow.open(_adminMapInstance,marker);
      });
      _adminMapMarkers[id]={marker,infoWindow};
    }
  }
  /* Actualizar status */
  if(statusEl){
    const now=new Date().toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit'});
    statusEl.textContent=locs.length
      ?`${locs.length} persona${locs.length>1?'s':''} activa${locs.length>1?'s':''} · Actualizado ${now}`
      :'Sin personal activo en este momento';
  }
}

function renderAdminReportes(){
  const el=document.getElementById('a-reportes');if(!el)return;
  // ── KPIs globales ──
  const totalSvcs=WORKERS.reduce((a,w)=>a+w.services,0);
  const activeWks=WORKERS.filter(w=>w.status!=='inactive').length;
  const ratedWks=WORKERS.filter(w=>w.rating>0);
  const avgRating=ratedWks.length?(ratedWks.reduce((a,w)=>a+w.rating,0)/ratedWks.length).toFixed(1):'—';
  const totalRevQ=Q_PERIODS.reduce((a,p)=>a+p.workers.reduce((b,w)=>b+w.total,0),0);
  // ── Servicios por tipo ──
  const svcCounts={};
  WORKERS.forEach(w=>(w.type||[]).forEach(t=>{svcCounts[t]=(svcCounts[t]||0)+w.services;}));
  const svcLabels={depto:'Departamentos',auto:'Lavado de autos',tapiceria:'Tapicería'};
  const svcList=Object.entries(svcCounts).sort((a,b)=>b[1]-a[1]);
  const maxSvc=svcList[0]?svcList[0][1]:1;
  // ── Tabla de desempeño ──
  const perfRows=WORKERS.map(w=>{
    const qw=Q_PERIODS[0]?.workers.find(x=>x.id===w.id);
    const avHtml=w.photo
      ?`<img src="${w.photo}" style="width:32px;height:32px;border-radius:50%;object-fit:cover;flex-shrink:0;">`
      :`<div class="av" style="width:32px;height:32px;font-size:10px;flex-shrink:0;">${w.initials}</div>`;
    const stBadge=w.status==='active'?'<span class="badge b-active">Activo</span>':w.status==='busy'?'<span class="badge b-busy">Ocupado</span>':'<span class="badge b-inactive">Inactivo</span>';
    return`<tr>
      <td><div style="display:flex;align-items:center;gap:8px;">${avHtml}<span>${w.name}</span></div></td>
      <td style="text-align:center;">${w.services}</td>
      <td>${s$(w.rating,12)} ${w.rating.toFixed(1)}</td>
      <td style="text-align:right;">$${(qw?.total||0).toLocaleString('es-MX')}</td>
      <td>${stBadge}</td>
    </tr>`;
  }).join('');
  // ── Evaluaciones bajas recientes ──
  const lowHtml=LOW_REVIEWS.length
    ?LOW_REVIEWS.slice(0,4).map(r=>`<div class="rep-card"><div style="display:flex;justify-content:space-between;margin-bottom:3px;"><span style="font-size:12px;font-weight:500;">${s$(r.stars,12)} ${r.worker}</span><span style="font-size:11px;color:#185FA5;">${r.date}</span></div><p style="font-size:12px;color:#185FA5;">"${r.comment}" — ${r.svc}</p></div>`).join('')
    :`<p style="font-size:12px;color:#185FA5;text-align:center;padding:.75rem 0;">Sin evaluaciones bajas recientes ✓</p>`;
  const rendimientoHtml=`
  <div class="card">
    <p class="ctitle">📈 KPIs generales</p>
    <div class="rep-kpi-grid">
      <div class="rep-kpi"><span>${totalSvcs.toLocaleString()}</span><p>Servicios realizados</p></div>
      <div class="rep-kpi"><span>${avgRating}⭐</span><p>Calificación promedio</p></div>
      <div class="rep-kpi"><span>${activeWks}</span><p>Trabajadores activos</p></div>
      <div class="rep-kpi"><span>$${totalRevQ.toLocaleString('es-MX')}</span><p>Ingresos acumulados</p></div>
    </div>
  </div>
  <div class="card">
    <p class="ctitle">🛠️ Distribución de servicios</p>
    ${svcList.length?svcList.map(([t,c])=>`
    <div style="margin-bottom:12px;">
      <div style="display:flex;justify-content:space-between;margin-bottom:4px;">
        <span style="font-size:13px;">${svcLabels[t]||t}</span>
        <span style="font-size:12px;font-weight:600;">${c} servicios</span>
      </div>
      <div class="rep-bar-wrap"><div class="rep-bar" style="width:${Math.round(c/maxSvc*100)}%;"></div></div>
    </div>`).join(''):'<p style="font-size:13px;color:#185FA5;">Sin datos de servicios aún.</p>'}
  </div>
  <div class="card">
    <p class="ctitle">👥 Desempeño por trabajador</p>
    ${WORKERS.length?`<div style="overflow-x:auto;"><table class="rep-table"><thead><tr>
      <th>Trabajador</th><th style="text-align:center;">Servicios</th>
      <th>Calificación</th><th style="text-align:right;">Ingresos (Q)</th><th>Estatus</th>
    </tr></thead><tbody>${perfRows}</tbody></table></div>`
    :'<p style="font-size:13px;color:#185FA5;">Sin trabajadores registrados.</p>'}
  </div>
  <div class="card"><p class="ctitle">⚠️ Evaluaciones bajas recientes</p>${lowHtml}</div>`;
  el.innerHTML=`
    <div class="msg-tabs" style="margin-bottom:14px;">
      <button class="msg-tab active" onclick="switchRepTab('rendimiento',this)">📊 Rendimiento</button>
      <button class="msg-tab" onclick="switchRepTab('asistencias',this)">📋 Asistencias</button>
    </div>
    <div id="rep-panel-rendimiento">${rendimientoHtml}</div>
    <div id="rep-panel-asistencias" style="display:none;">
      <div class="card"><p class="ctitle">📋 Asistencias</p>
        <div id="ast-report-body"></div>
      </div>
    </div>`;
}

function selectClienteTab(tab,btn){
  document.querySelectorAll('#cliente-dash-tabs .dash-tab').forEach(t=>t.classList.remove('active'));
  if(btn)btn.classList.add('active');
  const panel=document.getElementById('cliente-dash-panel');
  const zona=ZONAS.find(z=>z.id===clientZoneId);
  const totalSvcs=clientReviews.length;
  const avgStars=totalSvcs?clientReviews.reduce(function(a,r){return a+(r.stars||0);},0)/totalSvcs:0;
  const gastoTotal=clientReviews.reduce(function(a,r){return a+(r.precio||0);},0);

  if(tab==='actividad'){
    /* Próximo servicio: buscar solicitudes aceptadas pendientes */
    const proximo=PENDING_REQUESTS.find(function(r){return r.accepted&&!r.rejected;});
    const proximoHtml=proximo
      ?`<div style="background:#E6F1FB;border-radius:8px;padding:10px 12px;margin-bottom:12px;display:flex;justify-content:space-between;align-items:center;">
          <div><p style="font-size:13px;font-weight:500;color:#042C53;">${proximo.svc}</p><p style="font-size:11px;color:#185FA5;margin-top:3px;">${proximo.fecha} · ${proximo.hora} · ${proximo.zona}</p></div>
          <span class="badge bwarn">Confirmado</span>
        </div>`
      :`<p style="font-size:12px;color:#185FA5;text-align:center;padding:1rem 0;background:#F4F8FD;border-radius:8px;margin-bottom:12px;">Sin próximo servicio. <strong style="color:#1A56DB;cursor:pointer;" onclick="navGo('cliente','reserva',document.querySelectorAll('#nav-cliente .bnav-btn')[1])">Reservar →</strong></p>`;
    /* Historial reciente */
    const histHtml=totalSvcs
      ?clientReviews.slice(-3).reverse().map(function(r){
          return`<div class="dash-rank-row">
            <div class="av" style="width:32px;height:32px;font-size:11px;flex-shrink:0;">${(r.svc||'?').split(' ').map(function(n){return n[0];}).join('').slice(0,2).toUpperCase()}</div>
            <div class="dash-rank-info"><p>${r.svc}</p><span>${r.fecha||''}</span></div>
            <div style="text-align:right;">${r.precio?`<p style="font-size:13px;font-weight:500;color:#042C53;">$${r.precio.toLocaleString('es-MX')}</p>`:''}
              <span class="badge bok" style="font-size:10px;">Completado</span>
            </div></div>`;
        }).join('')
      :`<p style="font-size:12px;color:#185FA5;text-align:center;padding:1rem 0;">Aún sin servicios completados.</p>`;

    panel.innerHTML=`
      <div class="dash-kpi-grid">
        <div class="dash-kpi accent"><p>Servicios realizados</p><span>${totalSvcs}</span></div>
        <div class="dash-kpi green"><p>Calificación promedio</p><span>${totalSvcs?avgStars.toFixed(1):'—'}</span></div>
        <div class="dash-kpi" style="${clientDiscount>0?'background:#EAF3DE;':''}"><p>Descuento disponible</p><span style="${clientDiscount>0?'color:#27500A;font-size:16px;':''}">${clientDiscount>0?'-$'+clientDiscount:'Sin descuento'}</span></div>
        <div class="dash-kpi"><p>Zona de servicio</p><span style="font-size:12px;">${zona?zona.nombre.split('/')[0].trim():'—'}</span></div>
      </div>
      <p class="dash-section-title">Próximo servicio</p>
      ${proximoHtml}
      <p class="dash-section-title">Historial reciente</p>
      ${histHtml}`;
  } else if(tab==='zona'){
    const active=WORKERS.filter(w=>w.status==='active');
    const busy=WORKERS.filter(w=>w.status==='busy');
    const enZona=WORKERS.filter(w=>w.status!=='inactive'&&(w.zonas||[]).includes(clientZoneId));
    panel.innerHTML=`
      <div class="dash-kpi-grid">
        <div class="dash-kpi green"><p>Disponibles ahora</p><span>${active.length}</span></div>
        <div class="dash-kpi" style="background:#FAEEDA;"><p>En servicio</p><span style="color:#633806;">${busy.length}</span></div>
        <div class="dash-kpi accent"><p>Mi zona</p><span style="font-size:12px;">${zona?zona.nombre.split('/')[0].trim():'—'}</span></div>
        <div class="dash-kpi"><p>En tu zona</p><span>${enZona.length}</span></div>
      </div>
      <p class="dash-section-title">Disponibles para tu próxima reserva</p>
      ${active.slice(0,4).map(w=>{
        const svc=w.type.map(t=>({depto:'Depto',auto:'Autos',tapiceria:'Tap.'}[t])).join(' · ');
        return`<div class="dash-rank-row">
          ${_avHtml(w,32,'#042C53')}
          <div class="dash-rank-info"><p>${w.name}</p><span>${svc}</span></div>
          <div style="text-align:right;">${s$(w.rating,11)}<p style="font-size:12px;font-weight:500;color:#042C53;margin-top:2px;">${w.rating.toFixed(1)}</p></div>
        </div>`;
      }).join('')||'<p style="font-size:12px;color:#185FA5;text-align:center;padding:1rem;">Sin trabajadores disponibles en este momento.</p>'}`;
  } else if(tab==='cuenta'){
    const userObj=USERS.find(function(u){return u.email===currentUserEmail;})||{};
    const telDisplay=userObj.tel||'—';
    const ultimoSvc=clientReviews.length?clientReviews[clientReviews.length-1].fecha||'—':'—';
    panel.innerHTML=`
      <div class="dash-kpi-grid">
        <div class="dash-kpi accent"><p>Servicios totales</p><span>${totalSvcs}</span></div>
        <div class="dash-kpi green"><p>Gasto total</p><span style="font-size:${gastoTotal>0?'15px':'20px'};">${gastoTotal>0?'$'+gastoTotal.toLocaleString('es-MX'):'$0'}</span></div>
        <div class="dash-kpi"><p>Último servicio</p><span style="font-size:12px;">${ultimoSvc}</span></div>
        <div class="dash-kpi"><p>Zona activa</p><span style="font-size:11px;">${zona?zona.nombre.split('/')[0].trim():'—'}</span></div>
      </div>
      <p class="dash-section-title">Datos de cuenta</p>
      <div style="border:.5px solid #B5D4F4;border-radius:8px;overflow:hidden;">
        <div class="frow2" style="padding:8px 12px;"><span>Correo</span><span>${currentUserEmail||'—'}</span></div>
        <div class="frow2" style="padding:8px 12px;"><span>Teléfono</span><span>${telDisplay}</span></div>
        <div class="frow2" style="padding:8px 12px;"><span>Zona</span><span>${zona?zona.nombre:'—'}</span></div>
        <div class="frow2" style="padding:8px 12px;border-bottom:none;"><span>Colonias</span><span style="text-align:right;max-width:60%;font-size:11px;">${zona?zona.colonias:'—'}</span></div>
      </div>`;
  }
}
function renderClienteResumen(){selectClienteTab('actividad',document.querySelector('#cliente-dash-tabs .dash-tab'));}

/* ── HISTORIAL DINÁMICO DEL CLIENTE ── */
function renderClientHistorial(){
  const el=document.getElementById('c-historial-list');if(!el)return;
  if(!clientReviews.length){
    el.innerHTML=`<div style="text-align:center;padding:2.5rem 0;">
      <p style="font-size:32px;margin-bottom:8px;">📋</p>
      <p style="font-size:14px;font-weight:600;color:#042C53;margin-bottom:4px;">Sin servicios aún</p>
      <p style="font-size:12px;color:#185FA5;">Aquí verás tu historial de servicios y evaluaciones una vez que realices tu primera reserva.</p>
    </div>`;
    return;
  }
  const totalStars=clientReviews.reduce(function(a,r){return a+(r.stars||0);},0);
  const avg=clientReviews.length?totalStars/clientReviews.length:0;
  el.innerHTML=`<div class="rbar-compact" style="margin-bottom:12px;">
    <span class="rscore-sm">${avg.toFixed(1)}</span>
    <div style="display:flex;gap:2px;">${s$(avg,12)}</div>
    <span style="font-size:11px;color:#185FA5;margin-left:4px;">Promedio · ${clientReviews.length} servicio${clientReviews.length!==1?'s':''}</span>
  </div>`+
  clientReviews.map(function(r,i){
    return`<div class="hrow-c">
      <div class="hrow-c-main">
        <div class="hrow-c-info">
          <span class="hrow-c-title">${r.svc}</span>
          <span class="badge bok" style="font-size:10px;padding:2px 6px;">Completado</span>
        </div>
        ${r.fecha?`<div class="hrow-c-sub">${r.fecha}${r.comment?' · "'+r.comment+'"':''}</div>`:''}
      </div>
      <div class="hrow-c-right">
        ${r.precio?`<span class="hrow-c-price">$${r.precio.toLocaleString('es-MX')}</span>`:''}
        <div style="display:flex;gap:2px;">${s$(r.stars||0,11)}</div>
      </div>
    </div>`;
  }).join('');
  // Actualizar contadores en el resumen
  var avgEl=document.getElementById('client-avg');if(avgEl)avgEl.textContent=avg.toFixed(1);
  var totEl=document.getElementById('c-total');if(totEl)totEl.textContent=clientReviews.length;
  var starsEl=document.getElementById('client-avg-stars');if(starsEl)starsEl.innerHTML=s$(avg,12);
}

/* ── SELECTOR DE PROMOCIONES EN EL PASO 4 ── */
function populatePromoSelect(){
  const sel=document.getElementById('promo-select');
  if(!sel)return;
  const hoy=new Date().toISOString().split('T')[0];
  var activas=[];
  try{var raw=localStorage.getItem('ayalym-promos');if(raw)activas=JSON.parse(raw);}catch(e){}
  activas=activas.filter(function(p){
    if(p.fechaFin&&p.fechaFin<hoy)return false;
    if(p.fechaInicio&&p.fechaInicio>hoy)return false;
    if(p.tipo==='codigo'||p.tipo==='referido')return false; /* códigos solo via input manual */
    return p.descuento>0;
  });
  /* Reconstruir opciones */
  sel.innerHTML='<option value="">— Sin promoción —</option>';
  activas.forEach(function(p){
    const label=p.emoji+' '+p.nombre+' · '+p.descuento+'% OFF';
    const opt=document.createElement('option');
    opt.value=p.id;opt.textContent=label;
    sel.appendChild(opt);
  });
  const codeOpt=document.createElement('option');
  codeOpt.value='__codigo__';codeOpt.textContent='🔑 Ingresar código promocional...';
  sel.appendChild(codeOpt);
  /* Reset estado */
  promoAplicada=null;
  const cw=document.getElementById('promo-code-wrap');if(cw)cw.style.display='none';
  const badge=document.getElementById('promo-applied-badge');if(badge)badge.style.display='none';
  const ci=document.getElementById('promo-code-input');if(ci)ci.value='';
}

function onPromoSelectChange(){
  const sel=document.getElementById('promo-select');
  const cw=document.getElementById('promo-code-wrap');
  const badge=document.getElementById('promo-applied-badge');
  if(!sel)return;
  const val=sel.value;
  /* Ocultar código si no es esa opción */
  if(cw)cw.style.display=(val==='__codigo__')?'flex':'none';
  if(val==='__codigo__'||val===''){
    promoAplicada=null;
    if(badge)badge.style.display='none';
    calcPrice();return;
  }
  /* Buscar promo por id */
  var activas=[];
  try{var raw=localStorage.getItem('ayalym-promos');if(raw)activas=JSON.parse(raw);}catch(e){}
  const found=activas.find(function(p){return String(p.id)===String(val);});
  if(found&&found.descuento>0){
    promoAplicada=found;
    if(badge){badge.style.display='flex';badge.innerHTML='✅ <strong>'+found.nombre+'</strong> aplicada · <span style="color:#059669;">-'+found.descuento+'% OFF</span>';}
  } else {
    promoAplicada=null;
    if(badge)badge.style.display='none';
  }
  calcPrice();
}

function applyPromoCode(){
  const inp=document.getElementById('promo-code-input');
  const badge=document.getElementById('promo-applied-badge');
  if(!inp)return;
  const code=inp.value.trim().toUpperCase();
  if(!code){showToast('amber','⚠️','Escribe un código para aplicar');return;}
  var activas=[];
  try{var raw=localStorage.getItem('ayalym-promos');if(raw)activas=JSON.parse(raw);}catch(e){}
  const hoy=new Date().toISOString().split('T')[0];
  activas=activas.filter(function(p){
    if(p.fechaFin&&p.fechaFin<hoy)return false;
    if(p.fechaInicio&&p.fechaInicio>hoy)return false;
    return true;
  });
  const found=activas.find(function(p){return p.codigo&&p.codigo.toUpperCase()===code;});
  if(!found){showToast('red','❌','Código no válido o expirado');return;}
  if(!found.descuento||found.descuento<=0){showToast('amber','⚠️','Este código no tiene un descuento configurado');return;}
  promoAplicada=found;
  if(badge){badge.style.display='flex';badge.innerHTML='✅ <strong>'+found.nombre+'</strong> · Código <strong>'+found.codigo+'</strong> · <span style="color:#059669;">-'+found.descuento+'% OFF</span>';}
  showToast('green','🏷️','¡Código aplicado! '+found.descuento+'% de descuento');
  calcPrice();
}

/* ── SCROLL DE PROMOCIONES — Panel cliente registrado ── */
function renderClientPromos(){
  var bar=document.getElementById('client-promos-bar');
  var track=document.getElementById('cp-track');
  if(!bar||!track)return;
  var hoy=new Date().toISOString().split('T')[0];
  /* Leer directamente de PROMOTIONS (Firestore) — fallback a localStorage */
  var promos=[];
  if(typeof PROMOTIONS!=='undefined'&&PROMOTIONS.length){
    promos=PROMOTIONS.filter(function(p){return p.activo;});
  }else{
    try{var raw=localStorage.getItem('ayalym-promos');if(raw)promos=JSON.parse(raw);}catch(e){}
  }
  promos=promos.filter(function(p){
    if(p.fechaFin&&p.fechaFin<hoy)return false;
    if(p.fechaInicio&&p.fechaInicio>hoy)return false;
    return true;
  });
  if(!promos.length){bar.style.display='none';return;}
  bar.style.display='block';
  var cards=promos.map(function(p){
    var color=p.color||'#1A56DB';
    var emoji=p.emoji||'🎉';
    var nombre=p.nombre||'';
    var pct='',code='';
    if((p.tipo==='descuento'||p.tipo==='campana')&&p.descuento)
      pct='<span class="cp-pct" style="color:'+color+';">'+p.descuento+'%</span>';
    if((p.tipo==='codigo'||p.tipo==='referido')&&p.codigo)
      code='<span class="cp-code" style="border-color:'+color+'55;">'+p.codigo+'</span>';
    var extra=(pct||code)?'<span class="cp-card-sep"></span>'+pct+code:'';
    return '<span class="cp-card" style="border-color:'+color+'30;">'
      +'<span class="cp-emoji">'+emoji+'</span>'
      +'<span class="cp-nombre">'+nombre+'</span>'
      +extra+'</span>';
  }).join('');
  track.innerHTML=cards+cards;
  var dur=Math.max(18,promos.length*7);
  track.style.animationDuration=dur+'s';
}
window.addEventListener('storage',function(e){if(e.key==='ayalym-promos')renderClientPromos();});

function selectTrabajadorTab(tab,btn){
  document.querySelectorAll('#trabajador-dash-tabs .dash-tab').forEach(t=>t.classList.remove('active'));
  if(btn)btn.classList.add('active');
  const panel=document.getElementById('trabajador-dash-panel');
  const worker=currentWorkerRef||WORKERS[0];
  const initials=worker.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
  const zonaNombre=worker.zonas.map(z=>{const f=ZONAS.find(x=>x.id===z);return f?f.nombre.split('/')[0].trim():z;}).join(', ');

  if(tab==='hoy'){
    const jobsHoy=worker.todayJobs.filter(j=>j.status!=='completed');
    const completedToday=worker.todayJobs.filter(j=>j.status==='completed').length;
    panel.innerHTML=`
      <div class="tw-banner">
        <div class="tw-banner-av">${initials}</div>
        <div class="tw-banner-info">
          <p>${worker.name}</p>
          <span>${zonaNombre}</span>
        </div>
        <div class="tw-banner-rating">
          <strong>${worker.rating.toFixed(1)}</strong>
          <span>⭐ Calificación</span>
        </div>
      </div>
      <div class="tw-kpi-grid">
        <div class="tw-kpi navy">
          <span class="tw-kpi-label">Pendientes hoy</span>
          <span class="tw-kpi-val">${jobsHoy.length}</span>
          <span class="tw-kpi-sub">${completedToday} completado${completedToday!==1?'s':''}</span>
        </div>
        <div class="tw-kpi amber">
          <span class="tw-kpi-label">Solicitudes</span>
          <span class="tw-kpi-val">${PENDING_REQUESTS.filter(r=>r.workerId===worker.id&&!r.accepted&&!r.rejected).length}</span>
          <span class="tw-kpi-sub">Por confirmar</span>
        </div>
        <div class="tw-kpi green">
          <span class="tw-kpi-label">Calificación</span>
          <span class="tw-kpi-val">${worker.rating.toFixed(1)}</span>
          <span class="tw-kpi-sub">de 5.0 estrellas</span>
        </div>
        <div class="tw-kpi blue">
          <span class="tw-kpi-label">Servicios totales</span>
          <span class="tw-kpi-val">${worker.services}</span>
          <span class="tw-kpi-sub">acumulados</span>
        </div>
      </div>
      <p class="tw-section">Agenda de hoy</p>
      ${jobsHoy.length
        ? jobsHoy.map(j=>`
          <div class="tw-agenda-item">
            <div class="tw-agenda-dot"></div>
            <div class="tw-agenda-info">
              <p>${j.svc}</p>
              <span>${j.zona} · ${j.durMin}–${j.durMax} min</span>
            </div>
            <span class="tw-agenda-time">${j.hora}</span>
          </div>`).join('')
        : `<div class="tw-empty">Sin servicios pendientes hoy</div>`}
      <p class="tw-section">Solicitudes pendientes</p>
      ${(()=>{
        const pending=PENDING_REQUESTS.filter(r=>r.workerId===worker.id&&!r.accepted&&!r.rejected);
        if(!pending.length)return`<div class="tw-empty">Sin solicitudes pendientes</div>`;
        return pending.map(r=>{
          const fechaTxt=new Date(r.fecha+'T12:00:00').toLocaleDateString('es-MX',{day:'numeric',month:'short'});
          return`<div class="tw-pending-item">
            <div class="tw-pending-info"><p>${r.svc}</p><span>${fechaTxt} · ${r.hora} · ${r.zona}</span></div>
            <span class="badge bwarn">Pendiente</span>
          </div>`;
        }).join('');
      })()}`;

  } else if(tab==='quincena'){
    /* ── Quincena con datos reales del trabajador ── */
    const hoyQ=new Date();
    const diaQ=hoyQ.getDate();
    const iniQ=new Date(hoyQ.getFullYear(),hoyQ.getMonth(),diaQ<=15?1:16);
    const finQ=new Date(hoyQ.getFullYear(),hoyQ.getMonth(),diaQ<=15?15:new Date(hoyQ.getFullYear(),hoyQ.getMonth()+1,0).getDate());
    const fmtQ=d=>d.toLocaleDateString('es-MX',{day:'numeric',month:'long',year:'numeric'});
    const labelQ=`${fmtQ(iniQ)} – ${fmtQ(finQ)}`;
    /* Descuentos del trabajador */
    const myDeducts=workerDeductions.filter(d=>d.workerId===worker.id);
    const totalD=myDeducts.reduce((a,d)=>a+d.amount,0);
    /* Estadísticas reales */
    const totalSvcs=worker.services||0;
    const totalRevs=(worker.reviews||[]).length;
    const avgRating=totalRevs?(worker.reviews.reduce((a,r)=>a+r.stars,0)/totalRevs):0;
    /* Solicitudes aceptadas en el período */
    const svcsAceptadas=PENDING_REQUESTS.filter(r=>r.workerId===worker.id&&r.accepted);
    panel.innerHTML=`
      <p class="tw-section" style="margin-top:0;margin-bottom:12px;">📅 ${labelQ}</p>
      <div class="tw-kpi-grid">
        <div class="tw-kpi navy">
          <span class="tw-kpi-label">Servicios acumulados</span>
          <span class="tw-kpi-val">${totalSvcs}</span>
          <span class="tw-kpi-sub">total registrado</span>
        </div>
        <div class="tw-kpi green">
          <span class="tw-kpi-label">Calificación</span>
          <span class="tw-kpi-val">${avgRating?avgRating.toFixed(1):'—'}</span>
          <span class="tw-kpi-sub">${totalRevs} reseña${totalRevs!==1?'s':''}</span>
        </div>
        <div class="tw-kpi amber">
          <span class="tw-kpi-label">Confirmados (período)</span>
          <span class="tw-kpi-val">${svcsAceptadas.length}</span>
          <span class="tw-kpi-sub">esta quincena</span>
        </div>
        ${totalD?`<div class="tw-kpi red">
          <span class="tw-kpi-label">Descuentos</span>
          <span class="tw-kpi-val">-$${totalD.toLocaleString('es-MX')}</span>
          <span class="tw-kpi-sub">por eval. bajas</span>
        </div>`:''}
      </div>
      ${myDeducts.length?`
        <p class="tw-section">Descuentos aplicados</p>
        ${myDeducts.map(d=>`
          <div class="tw-deduct-row">
            <div class="tw-deduct-info">
              <p>Evaluación baja · ${d.svc}</p>
              <span>${d.client} · ${d.date}</span>
            </div>
            <span class="tw-deduct-amount">-$${d.amount.toLocaleString('es-MX')}</span>
          </div>`).join('')}`:''}
      ${svcsAceptadas.length?`
        <p class="tw-section">Servicios confirmados este período</p>
        ${svcsAceptadas.map(r=>{
          const fechaTxt=new Date(r.fecha+'T12:00:00').toLocaleDateString('es-MX',{day:'numeric',month:'short'});
          return`<div class="tw-svc-row"><div class="tw-svc-info"><p>${r.svc}</p><span>${fechaTxt} · ${r.hora} · ${r.zona}</span></div><span class="badge b-activo" style="font-size:10px;">Aceptado</span></div>`;
        }).join('')}`
      :`<div class="tw-empty" style="margin-top:16px;">Sin servicios confirmados en esta quincena</div>`}`;

  } else if(tab==='evaluaciones'){
    const revs=worker.reviews;
    const total=revs.length;
    const avg=total?revs.reduce((a,r)=>a+r.stars,0)/total:0;
    const avgFloor=Math.round(avg);
    const starsHTML=n=>[1,2,3,4,5].map(i=>`<span style="font-size:14px;color:${i<=n?'#FFD966':'#CBD5E1'};">★</span>`).join('');
    const counts=[0,0,0,0,0];
    revs.forEach(r=>{if(r.stars>=1&&r.stars<=5)counts[r.stars-1]++;});
    const bars=[5,4,3,2,1].map(n=>{
      const cnt=counts[n-1];
      const pct=total?Math.round(cnt/total*100):0;
      const clr=n>=4?'#1A56DB':n===3?'#BA7517':'#E24B4A';
      return`<div class="dash-bar-row"><span class="dash-bar-label">${n}★</span><div class="dash-bar-track"><div class="dash-bar-fill" style="width:${pct}%;background:${clr};"></div></div><span class="dash-bar-count">${cnt}</span></div>`;
    }).join('');
    const posCount=revs.filter(r=>r.stars>=4).length;
    const negCount=revs.filter(r=>r.stars<4).length;
    panel.innerHTML=`
      <div class="tw-rating-hero">
        <div class="tw-rating-big">
          <strong>${total?avg.toFixed(1):'—'}</strong>
          <div class="tw-rating-stars">${starsHTML(avgFloor)}</div>
          <span>de 5 estrellas</span>
        </div>
        <div class="tw-rating-meta">
          <p>${total} evaluación${total!==1?'es':''}</p>
          <span>${posCount} positiva${posCount!==1?'s':''} · ${negCount} baja${negCount!==1?'s':''}</span>
        </div>
      </div>
      <div class="tw-kpi-grid">
        <div class="tw-kpi green">
          <span class="tw-kpi-label">Positivas ≥4★</span>
          <span class="tw-kpi-val">${posCount}</span>
        </div>
        <div class="tw-kpi red">
          <span class="tw-kpi-label">Bajas &lt;4★</span>
          <span class="tw-kpi-val">${negCount}</span>
        </div>
      </div>
      <p class="tw-section">Distribución</p>
      <div style="margin-bottom:16px;">${bars}</div>
      <p class="tw-section">Últimas evaluaciones</p>
      ${revs.length
        ? revs.slice(-3).reverse().map(r=>`
          <div class="tw-review-card">
            <div class="tw-review-stars">${starsHTML(r.stars)}</div>
            <p class="tw-review-comment">"${r.comment}"</p>
            <p class="tw-review-meta">${r.svc}${r.client?' · '+r.client:''}</p>
          </div>`).join('')
        : `<div class="tw-empty">Sin reseñas aún</div>`}`;

  } else if(tab==='notas'){
    const myNotes=CLIENT_NOTES.filter(n=>n.workerId===0);
    const notesHtml=myNotes.length
      ? myNotes.map(n=>`<div class="note-card"><div class="note-card-header"><p>👤 ${n.client}</p><span>${n.date}</span></div><p class="note-card-body">${n.note}</p><p class="note-card-meta">Solo visible para tu supervisor y administrador</p></div>`).join('')
      : `<p style="font-size:13px;color:#185FA5;text-align:center;padding:1rem 0;">Sin notas aún</p>`;
    panel.innerHTML=`
      <p class="csub" style="margin-bottom:12px;">Solo visibles para tu supervisor y el administrador.</p>
      <div id="worker-notes-list">${notesHtml}</div>
      <div class="div" style="margin:12px 0;"></div>
      <p style="font-size:12px;font-weight:500;color:#042C53;margin-bottom:10px;">Agregar nueva nota</p>
      <div class="frow full"><label>Cliente</label><select id="nota-cliente">
        <option value="Ana García">Ana García</option>
        <option value="Carlos López">Carlos López</option>
        <option value="María Torres">María Torres</option>
        <option value="Pedro Martínez">Pedro Martínez</option>
      </select></div>
      <div class="frow full"><label>Nota</label><textarea id="nota-texto" placeholder="Ej: Prefiere llegar antes de las 9am. Tiene mascota..." style="min-height:80px;"></textarea></div>
      <button class="btn-sm" style="margin-top:4px;" onclick="addWorkerNote()">Guardar nota</button>`;
  }
}
function renderTrabajadorResumen(){selectTrabajadorTab('hoy',document.querySelector('#trabajador-dash-tabs .dash-tab'));}

function renderWorkerAgenda(){
  const el=document.getElementById('t-agenda');if(!el)return;
  const worker=currentWorkerRef||WORKERS[0];
  const fmt=(h,m)=>`${h}:${String(m).padStart(2,'0')}`;
  const todayISO=new Date().toISOString().split('T')[0];
  const fmtDate=iso=>{const d=new Date(iso+'T12:00:00');return d.toLocaleDateString('es-MX',{weekday:'long',day:'numeric',month:'long'});};
  // Only UPCOMING jobs
  const upcomingJobs=worker.todayJobs.filter(j=>j.status!=='completed');
  const byDate={};
  upcomingJobs.forEach(j=>{const d=j.fecha||todayISO;if(!byDate[d])byDate[d]=[];byDate[d].push(j);});
  const dates=Object.keys(byDate).sort();
  let html='';
  if(!dates.length){
    html=`<div class="card"><p class="ctitle">📅 Próximos servicios</p><p style="font-size:13px;color:#185FA5;text-align:center;padding:2rem 0;">Sin servicios próximos agendados</p></div>`;
  } else {
    html=`<div class="card"><p class="ctitle">📅 Próximos servicios</p><p class="csub">Incluye ${BUFFER_MIN} min de traslado entre servicios</p>`;
    dates.forEach((dateStr,di)=>{
      const jobs=[...byDate[dateStr]].sort((a,b)=>{const[ah,am]=a.hora.split(':').map(Number);const[bh,bm]=b.hora.split(':').map(Number);return(ah*60+am)-(bh*60+bm);});
      const accId='agenda-acc-'+di;const openFirst=di===0;
      html+=`<div class="agenda-accordion"><div class="agenda-acc-hdr${openFirst?' open':''}" onclick="toggleAgendaAcc('${accId}',this)"><div><p>📅 ${dateStr===todayISO?'Hoy':fmtDate(dateStr)}</p><span>${jobs.length} servicio${jobs.length!==1?'s':''}</span></div><span class="acc-arrow">${openFirst?'▲':'▼'}</span></div><div class="agenda-acc-body${openFirst?' open':''}" id="${accId}">`;
      let lastEndMin=null;
      jobs.forEach(j=>{
        const[sh,sm]=j.hora.split(':').map(Number);
        const startMin=sh*60+sm,svcEndMin=startMin+j.durMax,travelEndMin=svcEndMin+BUFFER_MIN;
        const svcEndH=Math.floor(svcEndMin/60),svcEndM=svcEndMin%60,nextH=Math.floor(travelEndMin/60),nextM=travelEndMin%60;
        if(lastEndMin!==null&&startMin>lastEndMin)html+=`<div class="agenda-gap">⏱ ${startMin-lastEndMin} min libres</div>`;
        const jobIdx=worker.todayJobs.indexOf(j);
        const isInProgress=j.status==='in-progress';
        const borderStyle=isInProgress?'border:1.5px solid #D97706;background:#FFFBF2;':'';
        const statusBadge=isInProgress?'<span style="font-size:10px;font-weight:600;color:#D97706;background:#FFF3CD;border-radius:20px;padding:2px 8px;">● En curso</span>':'';
        const actionBtn=isInProgress
          ?`<button onclick="completarServicioWorker(${worker.id},${jobIdx})" style="width:100%;padding:8px;border:none;border-radius:8px;background:#27500A;color:#fff;font-size:12px;font-weight:600;cursor:pointer;">✅ Completar servicio</button>`
          :`<button onclick="iniciarServicioWorker(${worker.id},${jobIdx})" style="width:100%;padding:8px;border:none;border-radius:8px;background:#D97706;color:#fff;font-size:12px;font-weight:600;cursor:pointer;">▶ Iniciar servicio</button>`;
        html+=`<div class="agenda-item" style="flex-direction:column;align-items:stretch;gap:8px;padding:12px;${borderStyle}"><div style="display:flex;justify-content:space-between;align-items:center;"><div><p style="font-size:13px;font-weight:600;color:#042C53;margin-bottom:2px;">${j.svc} ${statusBadge}</p><span style="font-size:11px;color:#185FA5;">${j.zona}</span></div><span style="font-size:16px;font-weight:700;color:#1A56DB;">${j.hora}</span></div><div style="background:#F4F9FF;border-radius:8px;padding:8px 10px;display:grid;grid-template-columns:auto 1fr;gap:4px 10px;align-items:center;font-size:11px;"><span>🔧 Servicio</span><span style="font-weight:500;color:#042C53;">${j.hora} – ${fmt(svcEndH,svcEndM)} <span style="color:#185FA5;">(${j.durMin}–${j.durMax} min)</span></span><span>🚗 Traslado</span><span style="font-weight:500;color:#042C53;">${fmt(svcEndH,svcEndM)} – ${fmt(nextH,nextM)} <span style="color:#185FA5;">(${BUFFER_MIN} min)</span></span><span>✅ Libre</span><span style="font-weight:700;color:#27500A;">${fmt(nextH,nextM)}</span></div>${actionBtn}</div>`;
        lastEndMin=travelEndMin;
      });
      if(lastEndMin!==null){const nh=Math.floor(lastEndMin/60),nm=lastEndMin%60;html+=`<div style="background:#EAF3DE;border-radius:8px;padding:10px 14px;margin:4px 0;display:flex;justify-content:space-between;align-items:center;"><div><p style="font-size:13px;font-weight:600;color:#27500A;">Próxima disponibilidad</p><p style="font-size:11px;color:#27500A;">Tras el último traslado</p></div><span style="font-size:20px;font-weight:700;color:#27500A;">${fmt(nh,nm)}</span></div>`;}
      html+=`</div></div>`;
    });
    html+=`</div>`;
  }
  el.innerHTML=html;
}

function renderWorkerHistorial(){
  const el=document.getElementById('t-realizados');if(!el)return;
  const worker=currentWorkerRef||WORKERS[0];
  const todayISO=new Date().toISOString().split('T')[0];
  const fmtDate=iso=>{const d=new Date(iso+'T12:00:00');return d.toLocaleDateString('es-MX',{weekday:'long',day:'numeric',month:'long'});};
  const completedJobs=worker.todayJobs.filter(j=>j.status==='completed');
  if(!completedJobs.length){
    el.innerHTML=`<div class="card"><p class="ctitle">✅ Servicios realizados</p><p style="font-size:13px;color:#185FA5;text-align:center;padding:2rem 0;">Aún no hay servicios realizados en este período</p></div>`;return;
  }
  const cByDate={};
  completedJobs.forEach(j=>{const d=j.fecha||todayISO;if(!cByDate[d])cByDate[d]=[];cByDate[d].push(j);});
  const cDates=Object.keys(cByDate).sort().reverse();
  const totalSvcs=completedJobs.length;
  let html=`<div class="card"><p class="ctitle">✅ Servicios realizados</p>
    <div class="dash-kpi-grid" style="margin-bottom:14px;">
      <div class="dash-kpi green"><p>Total realizados</p><span>${totalSvcs}</span></div>
      <div class="dash-kpi accent"><p>Este período</p><span>${cDates.length} día${cDates.length!==1?'s':''}</span></div>
    </div>`;
  cDates.forEach((dateStr,di)=>{
    const jobs=[...cByDate[dateStr]].sort((a,b)=>{const[ah,am]=a.hora.split(':').map(Number);const[bh,bm]=b.hora.split(':').map(Number);return(bh*60+bm)-(ah*60+am);});
    const accId='hist-acc-'+di;const openFirst=di===0;
    html+=`<div class="agenda-accordion"><div class="agenda-acc-hdr hist${openFirst?' open':''}" onclick="toggleAgendaAcc('${accId}',this)"><div><p>✅ ${fmtDate(dateStr)}</p><span>${jobs.length} servicio${jobs.length!==1?'s':''} realizado${jobs.length!==1?'s':''}</span></div><span class="acc-arrow">${openFirst?'▲':'▼'}</span></div><div class="agenda-acc-body${openFirst?' open':''}" id="${accId}">`;
    jobs.forEach(j=>{
      html+=`<div class="agenda-item agenda-done" style="flex-direction:column;align-items:stretch;gap:4px;padding:10px 12px;"><div style="display:flex;justify-content:space-between;align-items:center;"><div><p style="font-size:13px;font-weight:500;color:#042C53;">${j.svc}</p><span style="font-size:11px;color:#185FA5;">${j.zona}</span></div><div style="text-align:right;"><span style="font-size:13px;font-weight:600;color:#185FA5;">${j.hora}</span><br><span class="badge bok" style="font-size:10px;">Completado</span></div></div></div>`;
    });
    html+=`</div></div>`;
  });
  html+=`</div>`;
  el.innerHTML=html;
}

function toggleAgendaAcc(id,hdr){
  const body=document.getElementById(id);if(!body)return;
  const isOpen=body.classList.contains('open');
  body.classList.toggle('open',!isOpen);
  hdr.classList.toggle('open',!isOpen);
  const arrow=hdr.querySelector('.acc-arrow');
  if(arrow)arrow.textContent=isOpen?'▼':'▲';
}

function iniciarServicioWorker(wid,jobIdx){
  const worker=WORKERS.find(w=>w.id===wid);if(!worker)return;
  const job=worker.todayJobs[jobIdx];if(!job)return;
  const _doStart=(uLat,uLng)=>{
    job.status='in-progress';
    worker.status='busy';
    fbSaveWorkers();
    if(uLat&&uLng){
      fbSaveUbicActiva({id:'w_'+wid,nombre:worker.name,rol:'trabajador',
        lat:uLat,lng:uLng,entrada:job.hora,
        contratoNombre:job.svc+(job.zona?' · '+job.zona:'')});
    }
    renderWorkerAgenda();
    renderTrabajadorResumen();
    showToast('green','▶','Servicio iniciado');
  };
  if(navigator.geolocation){
    navigator.geolocation.getCurrentPosition(
      pos=>_doStart(pos.coords.latitude,pos.coords.longitude),
      ()=>_doStart(null,null),
      {enableHighAccuracy:false,timeout:8000,maximumAge:20000}
    );
  }else{
    _doStart(null,null);
  }
}

function completarServicioWorker(wid,jobIdx){
  const worker=WORKERS.find(w=>w.id===wid);if(!worker)return;
  const job=worker.todayJobs[jobIdx];if(!job)return;
  if(!confirm('¿Marcar este servicio como completado?'))return;
  job.status='completed';
  const stillBusy=worker.todayJobs.some(j=>j.status==='in-progress');
  if(!stillBusy)worker.status='active';
  worker.services=(worker.services||0)+1;
  fbDeleteUbicActiva('w_'+wid);
  fbSaveWorkers();
  renderWorkerAgenda();
  renderWorkerHistorial();
  renderTrabajadorResumen();
  showToast('green','✅','Servicio completado');
}

function selectSupervisorTab(tab,btn){
  document.querySelectorAll('#supervisor-dash-tabs .dash-tab').forEach(t=>t.classList.remove('active'));
  if(btn)btn.classList.add('active');
  const panel=document.getElementById('supervisor-dash-panel');
  const assigned=WORKERS.filter(w=>SUPERVISOR_ASSIGNED.includes(w.id));
  if(tab==='equipo'){
    const active=assigned.filter(w=>w.status==='active').length;
    const busy=assigned.filter(w=>w.status==='busy').length;
    const inactive=assigned.filter(w=>w.status==='inactive').length;
    const jobsHoy=assigned.reduce((a,w)=>a+w.todayJobs.length,0);
    const allRevs=assigned.flatMap(w=>w.reviews);
    const teamAvg=allRevs.length?allRevs.reduce((a,r)=>a+r.stars,0)/allRevs.length:0;
    panel.innerHTML=`
      <div class="dash-kpi-grid">
        <div class="dash-kpi green"><p>Disponibles</p><span>${active}</span></div>
        <div class="dash-kpi" style="background:#FAEEDA;"><p>En servicio</p><span style="color:#633806;">${busy}</span></div>
        <div class="dash-kpi red"><p>Inactivos</p><span>${inactive}</span></div>
        <div class="dash-kpi accent"><p>Servicios hoy</p><span>${jobsHoy}</span></div>
        <div class="dash-kpi"><p>Total equipo</p><span>${assigned.length}</span></div>
        <div class="dash-kpi" style="background:#E1F5EE;"><p>Promedio equipo</p><span style="color:#085041;font-size:18px;">${allRevs.length?teamAvg.toFixed(1):'—'}</span></div>
      </div>
      <p class="dash-section-title">Estado del equipo hoy</p>
      ${assigned.map(w=>{
        const sb=w.status==='active'?'b-activo':w.status==='busy'?'bwarn':'b-inactivo';
        const st=w.status==='active'?'Disponible':w.status==='busy'?'En servicio':'Inactivo';
        const wAvg=w.reviews.length?w.reviews.reduce((a,r)=>a+r.stars,0)/w.reviews.length:0;
        return`<div class="dash-rank-row">
          ${_avHtml(w,32,'#042C53')}
          <div class="dash-rank-info"><p>${w.name}</p><span>${w.todayJobs.length} servicio${w.todayJobs.length!==1?'s':''} hoy</span></div>
          <div style="text-align:right;"><span class="badge ${sb}" style="font-size:10px;">${st}</span>${w.reviews.length?`<p style="font-size:11px;color:#185FA5;margin-top:2px;">${s$(wAvg,10)} ${wAvg.toFixed(1)}</p>`:''}
          </div>
        </div>`;
      }).join('')||'<p style="font-size:13px;color:#185FA5;text-align:center;padding:1rem;">Sin equipo asignado</p>'}`;
  } else if(tab==='evaluaciones'){
    const allRevs=assigned.flatMap(w=>w.reviews);const totalR=allRevs.length;
    const teamAvg=totalR?allRevs.reduce((a,r)=>a+r.stars,0)/totalR:0;
    const ranked=[...assigned].filter(w=>w.reviews.length).sort((a,b)=>{const aA=a.reviews.reduce((s,r)=>s+r.stars,0)/a.reviews.length;const bA=b.reviews.reduce((s,r)=>s+r.stars,0)/b.reviews.length;return bA-aA;});
    panel.innerHTML=`
      <div class="dash-kpi-grid">
        <div class="dash-kpi accent"><p>Promedio equipo</p><span>${totalR?teamAvg.toFixed(1):'—'}</span></div>
        <div class="dash-kpi"><p>Total reseñas</p><span>${totalR}</span></div>
        <div class="dash-kpi red"><p>Eval. bajas (&lt;4★)</p><span>${allRevs.filter(r=>r.stars<4).length}</span></div>
        <div class="dash-kpi green"><p>Positivas (≥4★)</p><span>${allRevs.filter(r=>r.stars>=4).length}</span></div>
      </div>
      <p class="dash-section-title">Ranking del equipo</p>
      ${ranked.map((w,i)=>{const avg=w.reviews.reduce((s,r)=>s+r.stars,0)/w.reviews.length;return`<div class="dash-rank-row"><span class="dash-rank-num">${i+1}</span>${_avHtml(w,32,'#042C53')}<div class="dash-rank-info"><p>${w.name}</p><div style="display:flex;gap:2px;margin-top:2px;">${s$(avg,10)}</div></div><div style="text-align:right;"><p style="font-size:15px;font-weight:500;color:#042C53;">${avg.toFixed(1)}</p><span style="font-size:11px;color:#185FA5;">${w.reviews.length} reseñas</span></div></div>`;}).join('')||'<p style="font-size:13px;color:#185FA5;text-align:center;padding:1rem;">Sin evaluaciones</p>'}`;
  } else if(tab==='alertas'){
    const inactivos=assigned.filter(w=>w.status==='inactive');
    const lowRevs=assigned.flatMap(w=>w.reviews.filter(r=>r.stars<4).map(r=>({...r,workerName:w.name})));
    panel.innerHTML=`
      <div class="dash-kpi-grid">
        <div class="dash-kpi red"><p>Trabajadores inactivos</p><span>${inactivos.length}</span></div>
        <div class="dash-kpi" style="background:#FAEEDA;"><p>Eval. bajas en equipo</p><span style="color:#633806;">${lowRevs.length}</span></div>
      </div>
      ${inactivos.length?`<p class="dash-section-title">⚠️ Trabajadores inactivos</p>
        ${inactivos.map(w=>`<div class="dash-rank-row">${_avHtml(w,32,'#042C53')}<div class="dash-rank-info"><p>${w.name}</p><span>${w.type.map(t=>({depto:'Depto',auto:'Autos',tapiceria:'Tap.'}[t])).join(' · ')}</span></div><span class="badge berr">Inactivo</span></div>`).join('')}`:''}
      ${lowRevs.length?`<p class="dash-section-title">⭐ Evaluaciones bajas recientes</p>
        ${lowRevs.slice(0,5).map(r=>`<div style="border:.5px solid #FAC775;border-radius:8px;padding:10px 12px;margin-bottom:8px;background:#FAEEDA;"><div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;"><p style="font-size:12px;font-weight:500;color:#412402;">${r.workerName}</p><div style="display:flex;gap:2px;">${s$(r.stars,11)}</div></div><p style="font-size:12px;color:#412402;">"${r.comment}"</p><p style="font-size:11px;color:#633806;margin-top:3px;">${r.svc}${r.client?' · '+r.client:''}</p></div>`).join('')}`
        :`<p style="font-size:13px;color:#27500A;text-align:center;padding:1rem;background:#EAF3DE;border-radius:8px;margin-top:8px;">✓ Sin evaluaciones bajas en el equipo</p>`}
      ${!inactivos.length&&!lowRevs.length?'<p style="font-size:13px;color:#185FA5;text-align:center;padding:1rem;">Sin alertas activas</p>':''}`;

  } else if(tab==='notas'){
    const notes=CLIENT_NOTES.filter(n=>SUPERVISOR_ASSIGNED.includes(n.workerId));
    const notesHtml=notes.length
      ? notes.map(n=>`<div class="note-card"><div class="note-card-header"><p>🧹 ${n.workerName} sobre <strong>${n.client}</strong></p><span>${n.date}</span></div><p class="note-card-body">${n.note}</p></div>`).join('')
      : `<p style="font-size:13px;color:#185FA5;text-align:center;padding:1rem 0;">Tus trabajadores no han escrito notas aún</p>`;
    panel.innerHTML=`
      <p class="csub" style="margin-bottom:12px;">Comentarios que tus trabajadores escribieron sobre los clientes.</p>
      <div id="sv-notes-list">${notesHtml}</div>`;
  }
}
function renderSupervisorResumen(){selectSupervisorTab('equipo',document.querySelector('#supervisor-dash-tabs .dash-tab'));}

function toggleQDeducs(id,btn){const el=document.getElementById(id);if(!el)return;const open=el.style.display==='block';el.style.display=open?'none':'block';btn.textContent=open?`Ver ${btn.textContent.match(/\d+/)?.[0]||''} desc. ›`:'Ocultar ›';}
function renderConvs(){const el=document.getElementById('conv-list');if(!el)return;el.innerHTML=CONVS.map((c,i)=>`<div class="conv-btn" onclick="toggleConv(${i})"><div class="av" style="width:34px;height:34px;font-size:11px;">${c.client.split(' ').map(n=>n[0]).join('').slice(0,2)}</div><div class="conv-info"><p>${c.client} ↔ ${c.worker}</p><span>${c.svc}</span></div><span style="font-size:12px;color:#185FA5;">Ver ›</span></div><div class="conv-detail" id="conv-${i}"><p style="font-size:11px;font-weight:500;color:#185FA5;margin-bottom:8px;">${c.svc}</p><div style="display:flex;flex-direction:column;gap:6px;">${c.msgs.map(m=>`<div style="display:flex;flex-direction:column;align-items:${m.from==='worker'?'flex-start':'flex-end'};"><span style="font-size:10px;color:#185FA5;margin-bottom:2px;">${m.from==='worker'?c.worker:c.client} · ${m.time}</span><div class="msg ${m.from==='worker'?'recv':'sent'}">${m.text}</div></div>`).join('')}</div></div>`).join('');}
function toggleConv(i){const el=document.getElementById('conv-'+i);if(el)el.classList.toggle('open');}
function toggleAssign(id){document.getElementById('assign-'+id).classList.toggle('open');}
function twz(wid,zid,checked){const w=WORKERS.find(x=>x.id===wid);if(!w)return;if(checked&&!w.zonas.includes(zid))w.zonas.push(zid);if(!checked)w.zonas=w.zonas.filter(z=>z!==zid);clearTimeout(window._twzTimer);window._twzTimer=setTimeout(fbSaveWorkers,1200);}
function filterStaff(type,el){document.querySelectorAll('.svc-tab').forEach(t=>t.classList.remove('active'));el.classList.add('active');renderStaffList(type);}
function previewNWPhoto(e){const file=e.target.files[0];if(!file)return;const r=new FileReader();r.onload=ev=>{nwPhotoData=ev.target.result;document.getElementById('nw-photo-circle').innerHTML=`<img src="${nwPhotoData}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;};r.readAsDataURL(file);}
function addNewWorker(){
  const nombre=document.getElementById('nw-nombre').value.trim();
  if(!nombre){showToast('amber','⚠️','Escribe el nombre');return;}
  const types=[];
  if(document.getElementById('nw-depto').checked)types.push('depto');
  if(document.getElementById('nw-auto').checked)types.push('auto');
  if(document.getElementById('nw-tap').checked)types.push('tapiceria');
  if(!types.length){showToast('amber','⚠️','Selecciona al menos una especialidad');return;}
  const email=(document.getElementById('nw-email')||{}).value?.trim()||'';
  const pass=(document.getElementById('nw-pass')||{}).value?.trim()||'';
  const tel=(document.getElementById('nw-tel')||{}).value?.trim()||'';
  if(email&&pass&&pass.length<8){showToast('amber','⚠️','La contraseña debe tener mínimo 8 caracteres');return;}
  if(email&&USERS.find(u=>u.email.toLowerCase()===email.toLowerCase())){showToast('red','❌','Este correo ya está registrado en el sistema');return;}
  if(tel&&USERS.find(u=>u.tel&&u.tel.replace(/\s/g,'')===tel.replace(/\s/g,''))){showToast('amber','⚠️','Este teléfono ya está registrado en otro usuario');return;}
  const since=parseInt(document.getElementById('nw-since').value)||new Date().getFullYear();
  const initials=nombre.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
  const newWId=WORKERS.length?Math.max(...WORKERS.map(w=>w.id))+1:0;
  WORKERS.push({id:newWId,name:nombre,initials,photo:nwPhotoData,type:types,zonas:[],status:'active',rating:0,services:0,since,desc:(document.getElementById('nw-desc')||{}).value||'',mapX:Math.round(Math.random()*70+15),mapY:Math.round(Math.random()*60+15),reviews:[],todayJobs:[]});
  /* Si se capturó correo y contraseña → crear cuenta de acceso */
  if(email&&pass){
    const newUId=USERS.length?Math.max(...USERS.map(u=>u.id))+1:0;
    USERS.push({id:newUId,nombre,email,rol:'trabajador',tel,activo:true,accesoRevocado:false,password:pass});
    fbSaveUsers();
    showToast('green','✅','"'+nombre+'" registrado con acceso al sistema');
  }else{
    showToast('green','✅','"'+nombre+'" agregado al panel de personal');
  }
  nwPhotoData=null;
  document.getElementById('nw-photo-circle').innerHTML='<div class="ph-ph">Foto</div>';
  ['nw-nombre','nw-tel','nw-email','nw-pass','nw-desc','nw-since'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  ['nw-depto','nw-auto','nw-tap'].forEach(id=>{const el=document.getElementById(id);if(el)el.checked=false;});
  fbSaveWorkers();
  if(typeof renderUsersPanel==='function')renderUsersPanel();
  navGo('admin','personal',document.querySelectorAll('#nav-admin .nav-btn')[1]);
  renderStaffList('all');
}
function toggleWStatus(){
  workerActive=!workerActive;
  // Actualizar WORKERS.status (disponibilidad) — NO tocar USERS.activo (acceso al sistema)
  const w=currentWorkerRef||WORKERS[0];
  if(w) w.status=workerActive?'active':'inactive';
  fbSaveWorkers(); /* persistir disponibilidad en Firestore */
  const pill=document.getElementById('sp'),label=document.getElementById('wsl');
  if(workerActive){
    label.innerHTML='Estatus: <strong style="color:#1A56DB;">Activo</strong>';
    pill.textContent='Inactivarme';
    pill.className='status-pill sp-inactivar';
  }else{
    label.innerHTML='Estatus: <strong style="color:#888780;">Inactivo — no apareces disponible para reservas</strong>';
    pill.textContent='Activarme';
    pill.className='status-pill sp-activar';
  }
  // Re-render views that depend on worker status
  if(typeof renderWorkersByZone==='function') renderWorkersByZone();
  if(typeof renderTimeSlots==='function') renderTimeSlots();
  if(typeof renderSVWorkers==='function') renderSVWorkers();
  if(typeof renderStaffList==='function') renderStaffList('all');
  if(typeof renderUsersPanel==='function') renderUsersPanel();
  if(typeof renderAdminKPIs==='function') renderAdminKPIs();
  if(typeof renderWorkerLocList==='function') renderWorkerLocList();
  // Refrescar ubicación del cliente según ventana de 15 min
  renderClientUbicacion();
  showToast(workerActive?'green':'amber',workerActive?'✅':'⚠️','Estatus: '+(workerActive?'Activo':'Inactivo'));
}
/* ── SOLICITUDES DINÁMICAS ── */
function renderSolicitudes(){
  const el=document.getElementById('t-solicitudes');if(!el)return;
  const now=new Date();
  const todayISO=now.toISOString().split('T')[0];
  const nowMin=now.getHours()*60+now.getMinutes();
  const worker=currentWorkerRef||WORKERS[0];
  // Detectar y marcar solicitudes vencidas o a 1h del servicio sin aceptar
  PENDING_REQUESTS.forEach(req=>{
    if(req.accepted||req.rejected)return;
    const[rh,rm]=req.hora.split(':').map(Number);
    const reqMin=rh*60+rm;
    const expired=req.fecha<todayISO;
    const tooLate=req.fecha===todayISO&&nowMin>=reqMin-60;
    if((expired||tooLate)&&!req.autoRejected){
      req.rejected=true;req.autoRejected=true;
      if(!req.notified){
        req.notified=true;
        const fechaTxt=new Date(req.fecha+'T12:00:00').toLocaleDateString('es-MX',{weekday:'long',day:'numeric',month:'long'});
        pushNotif('cliente','📅','amber','Servicio sin trabajador asignado',`Tu reserva del ${fechaTxt} a las ${req.hora} no fue aceptada. Toca "Reprogramar" para elegir nueva fecha.`,req.id);
        pushNotif('admin','⚠️','amber','Servicio sin asignar',`${req.svc} — ${req.fecha} ${req.hora} sin trabajador. Requiere reasignación.`);
        updateNotifBadge();
      }
    }
  });
  const myPending=PENDING_REQUESTS.filter(r=>r.workerId===worker.id&&!r.accepted&&!r.rejected);
  const myAutoRej=PENDING_REQUESTS.filter(r=>r.workerId===worker.id&&r.autoRejected);
  let html=`<div class="card"><p class="ctitle">📬 Solicitudes pendientes</p>`;
  // Sección de servicios que no se aceptaron a tiempo
  if(myAutoRej.length){
    html+=`<div style="background:#FAEEDA;border-radius:8px;padding:10px 14px;margin-bottom:14px;">
      <p style="font-size:12px;font-weight:600;color:#412402;margin-bottom:8px;">⏰ No aceptados — cliente notificado para reprogramar</p>`;
    myAutoRej.forEach(r=>{
      const fechaTxt=new Date(r.fecha+'T12:00:00').toLocaleDateString('es-MX',{day:'numeric',month:'long'});
      html+=`<div style="display:flex;justify-content:space-between;align-items:center;padding:7px 0;border-bottom:.5px solid #FAC775;">
        <div><p style="font-size:12px;font-weight:500;color:#412402;">${r.svc}</p><span style="font-size:11px;color:#633806;">${fechaTxt} · ${r.hora} · ${r.zona}</span></div>
        <span class="badge berr" style="font-size:10px;">Sin aceptar</span></div>`;
    });
    html+=`</div>`;
  }
  // Solicitudes pendientes reales
  if(!myPending.length){
    html+=`<p style="font-size:13px;color:#185FA5;text-align:center;padding:1.5rem 0;">Sin solicitudes pendientes</p>`;
  }else{
    html+=`<p class="csub">Acepta o rechaza las solicitudes asignadas a ti.</p>`;
    myPending.forEach(req=>{
      const[rh,rm]=req.hora.split(':').map(Number);
      const endMin=rh*60+rm+req.durMax;
      const endStr=String(Math.floor(endMin/60)).padStart(2,'0')+':'+String(endMin%60).padStart(2,'0');
      const fechaTxt=new Date(req.fecha+'T12:00:00').toLocaleDateString('es-MX',{weekday:'short',day:'numeric',month:'short'});
      const isToday=req.fecha===todayISO;
      const minsLeft=(rh*60+rm)-60-nowMin;
      const urgWarn=isToday&&minsLeft>0&&minsLeft<=90;
      html+=`<div class="wcrow" data-req-id="${req.id}" data-fecha="${req.fecha}" data-hora="${req.hora}" data-dur-max="${req.durMax}">
        <div class="wi">
          <p>${req.svc}</p>
          <span>${fechaTxt} · ${req.hora}–${endStr} · ${req.zona}</span>
          ${urgWarn?`<span style="display:block;font-size:11px;color:#BA7517;font-weight:500;margin-top:3px;">⚠️ ${minsLeft} min para el plazo de aceptación</span>`:''}
        </div>
        <div class="wa">
          <button class="btn-accept" onclick="respondWorker(this,'Aceptada')">Aceptar</button>
          <button class="btn-reject" onclick="respondWorker(this,'Rechazada')">Rechazar</button>
        </div>
      </div>`;
    });
  }
  html+=`</div>`;
  el.innerHTML=html;
}

/* ── ADMIN SERVICIOS TABS ── */
function switchSvcTab(tab,btn){
  document.querySelectorAll('.svc-adm-panel').forEach(p=>p.style.display='none');
  const p=document.getElementById('svcp-'+tab);if(p)p.style.display='block';
  document.querySelectorAll('#a-servicios .msg-tab').forEach(b=>b.classList.remove('active'));
  if(btn)btn.classList.add('active');
}

function respondWorker(btn,action){
  const row=btn.closest('.wcrow');
  const svc=row.querySelector('.wi p').textContent.trim();
  const detailsTxt=row.querySelector('.wi span').textContent.trim();
  const parts=detailsTxt.split(' · ');
  const timeRange=parts[1]||'09:00–09:30';
  const zona=parts[2]||'Ciudad';
  const[startStr,endStr]=timeRange.split('–');
  const[sh,sm]=(startStr||'09:00').split(':').map(Number);
  const[eh,em]=(endStr||'09:30').split(':').map(Number);
  const durMax=Math.max(15,(isNaN(eh)||isNaN(em))?30:(eh*60+(em||0))-(sh*60+(sm||0)));
  const durMin=Math.max(15,durMax-15);
  const hora=String(sh||9).padStart(2,'0')+':'+String(sm||0).padStart(2,'0');
  // Leer fecha del atributo data-fecha o parsear del texto
  let fecha=row.dataset.fecha||'';
  if(!fecha){
    const mAbr={ene:'01',feb:'02',mar:'03',abr:'04',may:'05',jun:'06',jul:'07',ago:'08',sep:'09',oct:'10',nov:'11',dic:'12'};
    const m=(parts[0]||'').trim().match(/(\d+)\s+(\w{3})/i);
    if(m){fecha=`${new Date().getFullYear()}-${mAbr[m[2].toLowerCase()]||'04'}-${String(m[1]).padStart(2,'0')}`;}
  }
  if(action==='Aceptada'){
    const worker=currentWorkerRef||WORKERS[0];
    const newStartMin=sh*60+(sm||0);
    const newEndMin=newStartMin+durMax+BUFFER_MIN;
    // Buscar conflicto en la agenda del mismo día (solo pendientes y en curso)
    const dayJobs=(fecha?worker.todayJobs.filter(j=>j.fecha===fecha&&j.status!=='completed'):worker.todayJobs);
    const conflict=dayJobs.find(j=>{
      const[jh,jm]=j.hora.split(':').map(Number);
      const jStartMin=jh*60+jm;
      const jEndMin=jStartMin+j.durMax+BUFFER_MIN;
      return newStartMin<jEndMin && jStartMin<newEndMin;
    });
    if(conflict){
      const[jh,jm]=conflict.hora.split(':').map(Number);
      const libreMin=jh*60+jm+conflict.durMax+BUFFER_MIN;
      const libreStr=String(Math.floor(libreMin/60)).padStart(2,'0')+':'+String(libreMin%60).padStart(2,'0');
      showToast('red','⛔',`Ya tienes "${conflict.svc}" a las ${conflict.hora} — con traslado libre hasta las ${libreStr}`);
      return; // No modificar la UI ni aceptar
    }
    // Sin conflicto: aceptar y registrar en la agenda
    const reqId=parseInt(row.dataset.reqId);
    if(!isNaN(reqId)){const pr=PENDING_REQUESTS.find(r=>r.id===reqId);if(pr)pr.accepted=true;}
    worker.todayJobs.push({svc,fecha,hora,durMin,durMax,zona,status:'upcoming'});
    worker.todayJobs.sort((a,b)=>{const[ah,am]=a.hora.split(':').map(Number);const[bh,bm]=b.hora.split(':').map(Number);return(ah*60+am)-(bh*60+bm);});
    showToast('green','✅',svc+' — Aceptada y agregada a tu agenda');
    pushNotif('cliente','✅','green','Servicio aceptado','Tu trabajador confirmó la reserva');
    renderWorkerAgenda();renderTrabajadorResumen();
    renderSolicitudes();
    setTimeout(()=>navGo('trabajador','agenda',document.querySelectorAll('#nav-trabajador .bnav-btn')[2]),500);
  }else{
    const reqId=parseInt(row.dataset.reqId);
    if(!isNaN(reqId)){const pr=PENDING_REQUESTS.find(r=>r.id===reqId);if(pr)pr.rejected=true;}
    row.querySelector('.wa').innerHTML='<span class="badge berr">Rechazada</span>';
    showToast('amber','⚠️',svc+' — Rechazada');
    pushNotif('cliente','❌','red','Servicio rechazado','Se buscará otro trabajador disponible');
    setTimeout(()=>renderSolicitudes(),600);
  }
  updateNotifBadge();
}
function showToast(type,icon,msg){const t=document.getElementById('toast');t.className='toast show '+type;t.innerHTML=`<span style="font-size:16px;flex-shrink:0;">${icon}</span><span>${msg}</span>`;clearTimeout(t._timer);t._timer=setTimeout(()=>{t.className='toast';},3500);}


/* ACCESO RÁPIDO POR ROL */
function quickLogin(role){
  const profiles={
    cliente:      {nombre:'Ana García',       zona:'Narvarte / Del Valle'},
    trabajador:   {nombre:'Juan Morales',     zona:''},
    supervisor:   {nombre:'Laura Supervisor', zona:''},
    admin:        {nombre:'Carlos Mendoza',   zona:''},
    personal_inm: {nombre:'Pedro Ramírez',    zona:''},
    cliente_inm:  {nombre:'Patricia León',    zona:''},
  };
  const p=profiles[role];
  if(!p)return;
  showClientPanel();
  if(role==='personal_inm'){
    const pi=PERSONAL_INM.find(x=>x.nombre===p.nombre);
    if(pi)currentPersonalId=pi.id;
  }
  if(role==='cliente_inm'){
    const ci=CLIENTS_INM.find(x=>x.nombre===p.nombre);
    if(ci)currentClientInmId=ci.id;
  }
  launchApp(role,p.nombre,p.zona);
  const icons={cliente:'👤',trabajador:'🧹',supervisor:'👁️',admin:'⚙️',personal_inm:'🏢',cliente_inm:'🏢'};
  const labels={cliente:'Cliente',trabajador:'Trabajador',supervisor:'Supervisor',admin:'Administrador',personal_inm:'Personal Inmuebles',cliente_inm:'Cliente Inmuebles'};
  showToast('green',icons[role],`Bienvenido/a, ${p.nombre} — ${labels[role]}`);
}

/* ═══════════════════════════════════════════
   SERVICIOS DE INMUEBLES
   ═══════════════════════════════════════════ */

let _propFilter='all';
let _svPropFilter='all';
let _openInmRows=new Set(); // IDs de servicios cuya fila debe permanecer abierta
let _reportPsId=null;       // ID del servicio al que se agrega un reporte de visita
let _reportFotos=[];        // Fotos (base64) del reporte en curso

function buildReportesSection(ps,canCreate){
  const reps=ps.reportes||[];
  const canPDF=currentRole!=='personal_inm';
  const cards=[...reps].reverse().map(r=>{
    const fd=new Date(r.fecha+'T12:00:00').toLocaleDateString('es-MX',{day:'numeric',month:'short',year:'numeric'});
    const thumbs=r.fotos&&r.fotos.length?r.fotos.slice(0,3).map(f=>`<img src="${f}" class="rep-foto-thumb">`).join('')+(r.fotos.length>3?`<span style="font-size:10px;color:#185FA5;background:#E6F1FB;padding:2px 5px;border-radius:8px;">+${r.fotos.length-3}</span>`:''): '';
    const actTxt=r.actividades?r.actividades.slice(0,120)+(r.actividades.length>120?'…':''):'';
    const obsTxt=r.observaciones?r.observaciones.slice(0,100)+(r.observaciones.length>100?'…':''):'';
    return`<div class="rep-card" style="padding:8px 10px;margin-bottom:6px;">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:4px;">
        <span style="font-size:11px;color:#042C53;font-weight:600;min-width:0;">📅 ${fd} &nbsp;·&nbsp; 🕒 ${r.hora} &nbsp;·&nbsp; 👁️ ${r.supervisorNombre}</span>
        <div style="display:flex;gap:4px;align-items:center;flex-shrink:0;">
          ${r.fotos&&r.fotos.length?`<span style="font-size:10px;color:#185FA5;background:#E6F1FB;padding:2px 6px;border-radius:10px;">📷${r.fotos.length}</span>`:''}
          ${canPDF?`<button class="btn-sm" style="padding:2px 7px;font-size:10px;" onclick="downloadReportePDF(${ps.id},${r.id})">⬇️ PDF</button>`:''}
          ${canCreate?`<button class="btn-sm" style="background:#FFF0F0;color:#C0392B;padding:2px 7px;font-size:10px;" onclick="deleteReporte(${ps.id},${r.id})">🗑</button>`:''}
        </div>
      </div>
      ${actTxt?`<p style="font-size:11px;color:#1C2B3A;line-height:1.5;margin-bottom:2px;"><span style="font-weight:600;color:#185FA5;">Act:</span> ${actTxt}</p>`:''}
      ${obsTxt?`<p style="font-size:11px;color:#1C2B3A;line-height:1.5;"><span style="font-weight:600;color:#185FA5;">Obs:</span> ${obsTxt}</p>`:''}
      ${thumbs?`<div class="rep-fotos-prev" style="margin-top:5px;">${thumbs}</div>`:''}
    </div>`;
  }).join('');
  const empty=`<p style="font-size:12px;color:#5C7A9A;text-align:center;padding:10px 0;">Sin reportes de visita aún.</p>`;
  return`<div style="margin-top:10px;border-top:.5px solid var(--blue-border);padding-top:8px;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
      <p style="font-size:12px;font-weight:600;color:#042C53;">📋 Reportes&ensp;<span style="font-size:11px;font-weight:400;color:#185FA5;">${reps.length} reg.</span></p>
      ${canCreate?`<button class="btn-sm" style="background:#D4EDDA;color:#155724;font-size:10px;padding:2px 8px;" onclick="openInmReport(${ps.id})">+ Nuevo</button>`:''}
    </div>
    <div class="rep-list">${cards||empty}</div>
  </div>`;
}

/* ── Helpers de etiquetas ── */
function statusLabel(s){
  return {pendiente:'Pendiente',activo:'Activo',completado:'Completado',vencido:'Vencido'}[s]||s;
}
function contratoLabel(s){
  return {firmado:'✅ Firmado',por_firmar:'⏳ Por firmar',sin_contrato:'📄 Sin contrato'}[s]||s;
}
function pagoMetodoLabel(m){
  return {transferencia:'Transferencia bancaria',cheque:'Cheque',efectivo:'Efectivo',tarjeta:'Tarjeta'}[m]||m;
}
function formatDateShort(d){
  if(!d)return '—';
  const [y,mo,dy]=d.split('-');
  const mes=['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  return `${parseInt(dy)} ${mes[parseInt(mo)-1]} ${y}`;
}

/* ── Formulario: abrir/cerrar ── */
function populatePropSupervisorSelect(){
  const sel=document.getElementById('inm-supervisor-sel');
  if(!sel)return;
  sel.innerHTML=SUPERVISORS.map(s=>`<option value="${s.id}">${s.name}</option>`).join('');
}
function togglePropForm(){
  const body=document.getElementById('inm-form-body');
  const arrow=document.getElementById('inm-form-arrow');
  if(!body)return;
  const isOpen=body.classList.toggle('open');
  if(arrow)arrow.textContent=isOpen?'▲':'▼';
  if(isOpen){
    const hoy=new Date().toISOString().split('T')[0];
    const fi=document.getElementById('inm-fecha-inicio');if(fi&&!fi.value){fi.value=hoy;}
    populatePropSupervisorSelect();
  }
}

/* ── Tabs de filtro ── */
function switchPropTab(filter,btn){
  _propFilter=filter;
  document.querySelectorAll('#a-inmuebles .inm-filter-bar .msg-tab').forEach(b=>b.classList.remove('active'));
  if(btn)btn.classList.add('active');
  renderPropServices(filter);
}
/* switchSVPropTab eliminado: supervisor solo ve activos */

/* ── Datos fiscales toggle ── */
function toggleInmFiscal(btnEl){
  const panel=btnEl.nextElementSibling;
  if(!panel)return;
  const open=panel.classList.toggle('open');
  btnEl.textContent=btnEl.textContent.replace(open?'▼':'▲',open?'▲':'▼');
}

/* ═══════════════════════════════════════════════
   PERSONAL DE INMUEBLES
═══════════════════════════════════════════════ */
function renderPersonalInmPanel(){
  // Reset to Inicio tab on every login
  document.querySelectorAll('#role-personal_inm .sec').forEach(s=>s.classList.remove('active'));
  const ini=document.getElementById('pi-inicio');if(ini)ini.classList.add('active');
  const nav=document.getElementById('nav-personal_inm');
  if(nav){nav.querySelectorAll('.bnav-btn').forEach(b=>b.classList.remove('active'));const first=nav.querySelector('.bnav-btn');if(first)first.classList.add('active');}
  renderPIInicio();
  renderPIServicios();
}

function _getPIData(){
  return PERSONAL_INM.find(x=>x.id===currentPersonalId)||null;
}

function renderPIInicio(){
  const el=document.getElementById('pi-inicio-content');if(!el)return;
  const p=_getPIData();
  if(!p){el.innerHTML='<p style="text-align:center;color:#5C7A9A;padding:40px 0;">Sesión no encontrada.</p>';return;}
  const today=_localDateStr();
  const todayAsis=p.asistencias.find(a=>a.fecha===today)||null;
  const hoyCaps=new Date().toLocaleDateString('es-MX',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  const yaEntrada=!!(todayAsis?.entrada);
  const yaSalida=!!(todayAsis?.salida);
  el.innerHTML=`
    <div class="pi-attendance-card">
      <div class="pi-att-title">🗓️ Asistencia del día</div>
      <div class="pi-att-date">${hoyCaps}</div>
      <div class="pi-att-times">
        <div class="pi-att-time-block${yaEntrada?' confirmed':''}">
          <span class="pi-att-time-label">Entrada</span>
          <strong class="pi-att-time-val">${todayAsis?.entrada?todayAsis.entrada+' hrs':'—'}</strong>
          ${yaEntrada?'<span class="pi-att-check">✓</span>':''}
        </div>
        <div class="pi-att-divider"></div>
        <div class="pi-att-time-block${yaSalida?' confirmed':''}">
          <span class="pi-att-time-label">Salida</span>
          <strong class="pi-att-time-val">${todayAsis?.salida?todayAsis.salida+' hrs':'—'}</strong>
          ${yaSalida?'<span class="pi-att-check">✓</span>':''}
        </div>
      </div>
      <div class="pi-att-btns">
        <button class="pi-att-btn-main${yaEntrada?' done':''}" onclick="${yaEntrada?'':'registrarEntrada()'}" ${yaEntrada?'disabled':''}>
          ${yaEntrada?'✅ Entrada registrada':'🟢 Registrar entrada'}
        </button>
        <button class="pi-att-btn-sec${yaSalida?' done':''}" onclick="${yaEntrada&&!yaSalida?'registrarSalida()':''}" ${!yaEntrada||yaSalida?'disabled':''}>
          ${yaSalida?'✅ Salida registrada':yaEntrada?'🔴 Registrar salida':'🔴 Registrar salida'}
        </button>
      </div>
    </div>`;
}

function renderPIServicios(){
  const el=document.getElementById('pi-servicios-content');if(!el)return;
  const p=_getPIData();
  if(!p){el.innerHTML='';return;}
  const svcs=PROPERTY_SERVICES.filter(ps=>p.serviciosAsignados.includes(ps.id));
  const svcsHtml=svcs.length
    ?svcs.map(ps=>{
      const stLbl={activo:'Activo',pendiente:'Pendiente',completado:'Completado',vencido:'Vencido'}[ps.status]||ps.status;
      const stBg={activo:'#D4EDDA',pendiente:'#FFF3CD',completado:'#EEF5FF',vencido:'#FFF0F0'}[ps.status]||'#eee';
      const stCol={activo:'#1A7A3B',pendiente:'#A05C00',completado:'#1A56DB',vencido:'#C0392B'}[ps.status]||'#333';
      return`<div class="pi-svc-row">
        <div class="pi-svc-dot" style="background:${stBg};color:${stCol};">${stLbl[0]}</div>
        <div class="pi-svc-info">
          <p>${ps.folio} · ${ps.tipo}</p>
          <span>${ps.cliente.nombre} · ${ps.inmueble.tipo}, ${ps.inmueble.colonia}</span>
          <span>📅 ${ps.frecuencia||'—'} · ⏰ ${ps.hora} hrs</span>
        </div>
        <span class="pi-svc-badge" style="background:${stBg};color:${stCol};">${stLbl}</span>
      </div>`;}).join('')
    :'<p style="font-size:12px;color:#5C7A9A;text-align:center;padding:24px 0;">Sin servicios asignados aún.</p>';
  el.innerHTML=`
    <div class="pi-section">
      <div class="pi-section-title">🏢 Servicios asignados</div>
      <div class="pi-svc-list">${svcsHtml}</div>
    </div>`;
}

function renderPIAsistencias(){
  const el=document.getElementById('pi-asistencias-content');if(!el)return;
  const p=_getPIData();
  if(!p){el.innerHTML='';return;}
  const now=new Date();
  const mesStr=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const label=`${_MESES_ATT[now.getMonth()]} ${now.getFullYear()}`;
  const today=now.toISOString().split('T')[0];
  const timeToMin=t=>{if(!t)return null;const[h,m]=t.split(':').map(Number);return h*60+m;};
  const filtered=(p.asistencias||[]).filter(a=>a.fecha.startsWith(mesStr));
  const completos=filtered.filter(a=>a.salida);
  const avgMin=completos.length
    ?Math.round(completos.reduce((acc,a)=>{const d=(timeToMin(a.salida)||0)-(timeToMin(a.entrada)||0);return acc+(d>0?d:0);},0)/completos.length)
    :null;
  const avgStr=avgMin!=null?(Math.floor(avgMin/60)+'h'+(avgMin%60>0?' '+(avgMin%60)+'m':'')):null;
  const kpis=`<div class="att-kpis">
    <div class="att-kpi"><span class="att-kpi-val">${filtered.length}</span><span class="att-kpi-lbl">Registros</span></div>
    <div class="att-kpi-div"></div>
    <div class="att-kpi"><span class="att-kpi-val">${completos.length}</span><span class="att-kpi-lbl">Completos</span></div>
    <div class="att-kpi-div"></div>
    <div class="att-kpi"><span class="att-kpi-val">${avgStr||'—'}</span><span class="att-kpi-lbl">Prom. turno</span></div>
  </div>`;
  const rowsHtml=_buildAttRowsHtml(filtered.filter(a=>a.fecha!==today));
  el.innerHTML=`
    <p class="att-period-label" style="margin-bottom:10px;">📅 ${label}</p>
    ${kpis}
    <div class="att-list">${rowsHtml}</div>`;
}

function renderPIPerfil(){
  const el=document.getElementById('pi-perfil-content');if(!el)return;
  const p=_getPIData();
  if(!p){el.innerHTML='';return;}
  el.innerHTML=`
    <div class="pi-session-hdr">
      <div class="av" style="width:52px;height:52px;font-size:${p.photo?'0':'18px'};font-weight:700;background:#085041;color:#fff;flex-shrink:0;">${p.photo?'<img src="'+p.photo+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">':p.initials}</div>
      <div class="pi-session-info">
        <h2>${p.nombre}</h2>
        <span class="pi-role-badge">🏢 Personal de Inmuebles</span>
        <p style="font-size:11px;color:#5C7A9A;margin-top:4px;">${p.email}</p>
      </div>
    </div>
    <button class="btn-sec" style="width:100%;margin-top:8px;" onclick="doLogout()">Cerrar sesión</button>`;
}

function _piSetMode(mode,k){_getAttF(k).mode=mode;renderPIAsistencias();}
function _piApplyRange(k){renderPIAsistencias();}
function _piAttPDF(){
  const p=_getPIData();if(!p)return;
  const k='pi_'+p.id;
  const filtered=_filterAsisByPeriod(p.asistencias,_getAttF(k));
  _downloadAsisPDF(filtered,p.nombre,_attFilterLabel(k),null);
}

function _piSvcLabel(p){
  if(!p||!p.serviciosAsignados||!p.serviciosAsignados.length)return'';
  const names=p.serviciosAsignados.map(sid=>{
    const ps=PROPERTY_SERVICES.find(x=>x.id===sid);
    return ps?`${ps.folio} — ${ps.cliente.nombre}`:'';
  }).filter(Boolean);
  return names.length?` · ${names.join(' / ')}`:'';
}

function registrarEntrada(){
  const p=PERSONAL_INM.find(x=>x.id===currentPersonalId);if(!p)return;
  const today=_localDateStr();
  if(p.asistencias.find(a=>a.fecha===today)){showToast('amber','⚠️','Entrada ya registrada hoy');return;}
  /* Recopilar coords de todos los inmuebles asignados */
  const myCoords=PROPERTY_SERVICES
    .filter(ps=>(p.serviciosAsignados||[]).includes(ps.id))
    .map(ps=>({lat:ps.inmueble.lat,lng:ps.inmueble.lng}));
  showToast('blue','📍','Verificando ubicación…');
  _checkGeoFence(
    myCoords,
    (info,uLat,uLng)=>{
      const hora=new Date().toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit',hour12:false});
      p.asistencias.push({fecha:today,entrada:hora,salida:null});
      const svcLabel=_piSvcLabel(p);
      pushNotif('supervisor','🟢','green','Entrada registrada',`${p.nombre} registró entrada a las ${hora}${svcLabel}`);
      pushNotif('admin','🟢','green','Entrada registrada',`${p.nombre} (Personal Inm.) registró entrada a las ${hora}${svcLabel}`);
      renderPIInicio();
      fbSavePersonalInm();
      /* Guardar ubicación activa para mapa admin */
      if(uLat&&uLng){
        fbSaveUbicActiva({id:'pi_'+p.id,nombre:p.nombre,rol:'personal_inm',
          lat:uLat,lng:uLng,entrada:hora,contratoNombre:svcLabel.replace(/^ · /,'')});
      }
      const dtxt=typeof info==='number'?` · ${info}m del inmueble`:'';
      showToast('green','✅','Entrada registrada: '+hora+dtxt);
    },
    dist=>showToast('red','📍',`Te encuentras a ${_fmtDist(dist)} del inmueble, acércate para registrar tu entrada.`),
    err=>{
      if(err.code===1)showToast('red','🔒','Permite el acceso a tu ubicación para registrar asistencia.');
      else showToast('amber','⚠️','No se pudo obtener tu ubicación. Intenta de nuevo.');
    }
  );
}

function registrarSalida(){
  const p=PERSONAL_INM.find(x=>x.id===currentPersonalId);if(!p)return;
  const today=_localDateStr();
  const asis=p.asistencias.find(a=>a.fecha===today);
  if(!asis||!asis.entrada){showToast('amber','⚠️','Primero registra tu entrada');return;}
  if(asis.salida){showToast('amber','⚠️','Salida ya registrada hoy');return;}
  const myCoords=PROPERTY_SERVICES
    .filter(ps=>(p.serviciosAsignados||[]).includes(ps.id))
    .map(ps=>({lat:ps.inmueble.lat,lng:ps.inmueble.lng}));
  showToast('blue','📍','Verificando ubicación…');
  _checkGeoFence(
    myCoords,
    (info)=>{
      const hora=new Date().toLocaleTimeString('es-MX',{hour:'2-digit',minute:'2-digit',hour12:false});
      asis.salida=hora;
      const svcLabel=_piSvcLabel(p);
      pushNotif('supervisor','🔴','blue','Salida registrada',`${p.nombre} registró salida a las ${hora}${svcLabel}`);
      pushNotif('admin','🔴','blue','Salida registrada',`${p.nombre} (Personal Inm.) registró salida a las ${hora}${svcLabel}`);
      renderPIInicio();
      fbSavePersonalInm();
      fbDeleteUbicActiva('pi_'+p.id); /* quitar del mapa */
      const dtxt=typeof info==='number'?` · ${info}m del inmueble`:'';
      showToast('green','✅','Salida registrada: '+hora+dtxt);
    },
    dist=>showToast('red','📍',`Te encuentras a ${_fmtDist(dist)} del inmueble, acércate para registrar tu salida.`),
    err=>{
      if(err.code===1)showToast('red','🔒','Permite el acceso a tu ubicación para registrar asistencia.');
      else showToast('amber','⚠️','No se pudo obtener tu ubicación. Intenta de nuevo.');
    }
  );
}

/* ── Admin: gestión de personal de inmuebles ── */
function renderPersonalInmAdmin(){
  const el=document.getElementById('personal-inm-list');if(!el)return;
  if(!PERSONAL_INM.length){
    el.innerHTML='<p style="font-size:13px;color:#5C7A9A;text-align:center;padding:20px 0;">Sin personal registrado. Agrega al primero.</p>';return;
  }
  el.innerHTML=PERSONAL_INM.map((p,i)=>{
    const isOn=p.activo!==false;
    const svcsChips=p.serviciosAsignados.map(sid=>{
      const ps=PROPERTY_SERVICES.find(x=>x.id===sid);
      return ps?`<span class="pi-chip" onclick="desasignarPi(${i},${sid})" title="Quitar asignación">${ps.folio} ✕</span>`:'';
    }).join('');
    const hoyCaps=new Date().toISOString().split('T')[0];
    const todayAsis=p.asistencias.find(a=>a.fecha===hoyCaps);
    const statusAsis=todayAsis?.salida?'Salida '+todayAsis.salida:todayAsis?.entrada?'Entrada '+todayAsis.entrada:'Sin registro hoy';
    return`<div class="pi-admin-card${isOn?'':' inactive'}">
      <div class="pi-admin-hdr">
        <div style="display:flex;align-items:center;gap:10px;">
          <div class="av" style="width:38px;height:38px;font-size:${p.photo?'0':'13px'};font-weight:700;background:#085041;color:#fff;flex-shrink:0;">${p.photo?'<img src="'+p.photo+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">':p.initials}</div>
          <div>
            <p style="font-size:13px;font-weight:600;color:#042C53;">${p.nombre}</p>
            <span style="font-size:11px;color:#185FA5;">${p.email}</span>
            <span style="font-size:11px;color:#5C7A9A;display:block;">${p.tel||'—'} · Hoy: ${statusAsis}</span>
          </div>
        </div>
        <div style="display:flex;gap:5px;align-items:flex-start;flex-wrap:wrap;justify-content:flex-end;">
          <button class="toggle-btn${isOn?' on':''}" onclick="togglePersonalInm(${i})">${isOn?'Activo':'Inactivo'}</button>
          <button class="btn-danger" onclick="removePersonalInm(${i})">Eliminar</button>
        </div>
      </div>
      <div class="pi-admin-svcs">
        <span style="font-size:11px;color:#5C7A9A;margin-right:4px;">Servicios:</span>
        ${svcsChips||'<span style="font-size:11px;color:#5C7A9A;font-style:italic;">Sin asignar</span>'}
        <button class="pi-assign-btn" onclick="openAsignarPi(${i})">+ Asignar</button>
      </div>
      <div style="padding:4px 12px 8px;">
        <button class="pi-att-toggle" onclick="toggleAdmAtt(${p.id})">📋 Asistencias</button>
      </div>
      <div id="att-adm-${p.id}" class="att-adm-panel"></div>
    </div>`;
  }).join('');
}

function togglePersonalInm(i){
  PERSONAL_INM[i].activo=!(PERSONAL_INM[i].activo!==false);
  // Sync USERS table
  const u=USERS.find(x=>x.email===PERSONAL_INM[i].email);if(u)u.activo=PERSONAL_INM[i].activo;
  renderPersonalInmAdmin();
  fbSavePersonalInm();fbSaveUsers();
  showToast(PERSONAL_INM[i].activo!==false?'green':'blue',PERSONAL_INM[i].activo!==false?'✅':'⚪',PERSONAL_INM[i].nombre+' '+(PERSONAL_INM[i].activo!==false?'activado':'desactivado'));
}

function removePersonalInm(i){
  const n=PERSONAL_INM[i].nombre;
  // Remove from USERS too
  const idx=USERS.findIndex(u=>u.email===PERSONAL_INM[i].email);if(idx>-1)USERS.splice(idx,1);
  PERSONAL_INM.splice(i,1);
  renderPersonalInmAdmin();
  fbSavePersonalInm();fbSaveUsers();
  showToast('blue','🗑️',n+' eliminado');
}

function addPersonalInm(){
  const nombre=document.getElementById('pi-nombre').value.trim();
  const initials=(document.getElementById('pi-initials').value.trim()||nombre.split(' ').map(n=>n[0]).join('').slice(0,2)).toUpperCase();
  const email=document.getElementById('pi-email').value.trim();
  const tel=document.getElementById('pi-tel').value.trim();
  const pass=document.getElementById('pi-pass').value;
  if(!nombre||!email){showToast('amber','⚠️','Nombre y correo son obligatorios');return;}
  if(pass&&pass.length<8){showToast('amber','⚠️','La contraseña debe tener mínimo 8 caracteres');return;}
  if(USERS.find(u=>u.email.toLowerCase()===email.toLowerCase())){showToast('amber','⚠️','Este correo ya está registrado');return;}
  if(tel&&USERS.find(u=>u.tel&&u.tel.replace(/\s/g,'')===tel.replace(/\s/g,''))){showToast('amber','⚠️','Este teléfono ya está registrado en otro usuario');return;}
  const newId=PERSONAL_INM.length?Math.max(...PERSONAL_INM.map(p=>p.id))+1:0;
  const newUserId=USERS.length?Math.max(...USERS.map(u=>u.id))+1:0;
  PERSONAL_INM.push({id:newId,nombre,initials,email,password:pass||'ayalym123',tel,activo:true,serviciosAsignados:[],asistencias:[]});
  USERS.push({id:newUserId,nombre,email,rol:'personal_inm',tel,activo:true,accesoRevocado:false,password:pass||'ayalym123'});
  ['pi-nombre','pi-initials','pi-email','pi-tel','pi-pass'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  togglePiForm();
  renderPersonalInmAdmin();
  if(typeof renderUsersPanel==='function')renderUsersPanel();
  fbSavePersonalInm();fbSaveUsers();
  showToast('green','✅',nombre+' agregado');
}

function togglePiForm(){
  const wrap=document.getElementById('pi-form-wrap');
  const body=document.getElementById('pi-form-body');
  const arrow=document.getElementById('pi-form-arrow');
  if(!wrap||!body)return;
  const open=body.classList.toggle('open');
  if(arrow)arrow.textContent=open?'▲':'▼';
}

function openAsignarPi(pIdx){
  const p=PERSONAL_INM[pIdx];
  const available=PROPERTY_SERVICES.filter(ps=>!p.serviciosAsignados.includes(ps.id)&&ps.status!=='completado'&&ps.status!=='vencido');
  if(!available.length){showToast('amber','⚠️','No hay servicios disponibles para asignar');return;}
  document.getElementById('ap-pidx').value=pIdx;
  document.getElementById('ap-select').innerHTML=available.map(ps=>`<option value="${ps.id}">${ps.folio} · ${ps.cliente.nombre} (${ps.status})</option>`).join('');
  document.getElementById('asignar-pi-ov').classList.add('open');
}

function closeAsignarPi(){document.getElementById('asignar-pi-ov').classList.remove('open');}

function confirmarAsignarPi(){
  const pIdx=parseInt(document.getElementById('ap-pidx').value);
  const psId=parseInt(document.getElementById('ap-select').value);
  const p=PERSONAL_INM[pIdx];
  if(p&&!p.serviciosAsignados.includes(psId)){
    p.serviciosAsignados.push(psId);
    renderPersonalInmAdmin();
    const ps=PROPERTY_SERVICES.find(x=>x.id===psId);
    showToast('green','✅',p.nombre+' asignado a '+(ps?ps.folio:'servicio'));
  }
  fbSavePersonalInm();
  closeAsignarPi();
}

function desasignarPi(pIdx,psId){
  const p=PERSONAL_INM[pIdx];if(!p)return;
  p.serviciosAsignados=p.serviciosAsignados.filter(id=>id!==psId);
  renderPersonalInmAdmin();
  fbSavePersonalInm();
  showToast('blue','📋','Asignación removida');
}

function toggleAdmAtt(piId){
  const el=document.getElementById('att-adm-'+piId);if(!el)return;
  const open=el.classList.toggle('att-adm-open');
  if(open)el.innerHTML=_buildAdmAttHtml('adm_'+piId,PERSONAL_INM.find(p=>p.id===piId));
}
function _buildAdmAttHtml(k,p){
  if(!p)return'';
  const label=_attFilterLabel(k);
  const filtered=_filterAsisByPeriod(p.asistencias,_getAttF(k));
  const cmpl=filtered.filter(a=>a.salida);
  const rowsHtml=_buildAttRowsHtml(filtered);
  return`<div style="padding:10px 12px 8px;">
    <div class="att-filter-row">
      ${_attFilterBarHtml(k,'_admSetMode','_admApplyRange')}
      <button class="att-pdf-btn" onclick="_admAttPDF('${k}',${p.id})">⬇ PDF</button>
    </div>
    <p class="att-period-label">${label}</p>
    <div class="att-kpis" style="margin:6px 0;">
      <div class="att-kpi"><span class="att-kpi-val">${filtered.length}</span><span class="att-kpi-lbl">Registros</span></div>
      <div class="att-kpi-div"></div>
      <div class="att-kpi"><span class="att-kpi-val">${cmpl.length}</span><span class="att-kpi-lbl">Completos</span></div>
    </div>
    <div class="att-list" style="max-height:220px;overflow-y:auto;">${rowsHtml}</div>
  </div>`;
}
function _admSetMode(mode,k){_getAttF(k).mode=mode;_reRenderAdmAtt(k);}
function _admApplyRange(k){_reRenderAdmAtt(k);}
function _reRenderAdmAtt(k){
  const piId=parseInt(k.replace('adm_',''));
  const el=document.getElementById('att-adm-'+piId);if(!el)return;
  el.innerHTML=_buildAdmAttHtml(k,PERSONAL_INM.find(p=>p.id===piId));
}
function _admAttPDF(k,piId){
  const p=PERSONAL_INM.find(x=>x.id===piId);if(!p)return;
  const filtered=_filterAsisByPeriod(p.asistencias,_getAttF(k));
  _downloadAsisPDF(filtered,p.nombre,_attFilterLabel(k),null);
}

function buildPersonalAsignadoHtml(psId,showActions){
  const asignados=PERSONAL_INM.filter(p=>p.serviciosAsignados.includes(psId));
  if(!asignados.length&&!showActions)return'';
  const chips=asignados.map(p=>{
    const today=new Date().toISOString().split('T')[0];
    const asis=p.asistencias.find(a=>a.fecha===today);
    const dot=asis?.salida?'#1A7A3B':asis?.entrada?'#E6A817':'#ccc';
    const dotTitle=asis?.salida?'Salida registrada':asis?.entrada?'Entrada registrada':'Sin registro hoy';
    const avInner=p.photo
      ?`<img src="${p.photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
      :`<span style="font-size:8px;font-weight:700;color:#fff;">${p.initials}</span>`;
    return`<span class="pi-asig-chip" title="${dotTitle}">
      <span style="width:7px;height:7px;border-radius:50%;background:${dot};display:inline-block;margin-right:5px;flex-shrink:0;"></span>
      <span style="width:20px;height:20px;border-radius:50%;background:#085041;display:inline-flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0;margin-right:5px;">${avInner}</span>
      ${p.nombre.split(' ')[0]}
    </span>`;}).join('');
  return`<div class="inm-pi-assigned">
    <p class="inm-pi-assigned-title">👷 Personal asignado</p>
    <div style="display:flex;flex-wrap:wrap;gap:5px;">
      ${chips||'<span class="inm-pi-empty">Sin personal asignado</span>'}
    </div>
  </div>`;
}

/* ── Detalle expandido de un servicio ── */
function buildInmDetail(ps,showActions){
  const cs=ps.contratoStatus||'sin_contrato';

  /* Historial de renovaciones */
  const parent=ps.parentId!=null?PROPERTY_SERVICES.find(p=>p.id===ps.parentId):null;
  const renewed=ps.renovadoPor!=null?PROPERTY_SERVICES.find(p=>p.id===ps.renovadoPor):null;
  const histHtml=(parent||renewed)?`<div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:4px;">
    ${parent?`<div class="inm-history-link">⬅️ Anterior: <strong>${parent.folio}</strong>&nbsp;${formatDateShort(parent.fechaInicio)} – ${formatDateShort(parent.fechaFin)}</div>`:''}
    ${renewed?`<div class="inm-history-link">➡️ Renovado: <strong>${renewed.folio}</strong>&nbsp;${formatDateShort(renewed.fechaInicio)} – ${formatDateShort(renewed.fechaFin)}</div>`:''}
  </div>`:'';

  /* Forma de pago */
  const pagoHtml=ps.pago?`<div class="inm-pay-row">💳 <strong>${pagoMetodoLabel(ps.pago.metodo)}</strong>&ensp;·&ensp;$${(ps.pago.monto||0).toLocaleString('es-MX')}&ensp;·&ensp;${(ps.pago.periodicidad||'').charAt(0).toUpperCase()+(ps.pago.periodicidad||'').slice(1)}</div>`:'';

  /* Datos fiscales colapsable */
  const hasFiscal=ps.fiscal&&(ps.fiscal.rfc||ps.fiscal.razonSocial);
  const fiscHtml=hasFiscal?`<button class="btn-sm" style="margin-top:8px;background:var(--blue-light);color:var(--blue-mid);" onclick="toggleInmFiscal(this)">🧾 Datos fiscales ▼</button>
    <div class="inm-fiscal-panel">
      <div class="inm-grid" style="gap:4px 14px;">
        <div class="inm-field" style="grid-column:1/-1;"><strong>Razón social</strong>${ps.fiscal.razonSocial||'—'}</div>
        <div class="inm-field"><strong>RFC</strong>${ps.fiscal.rfc||'—'}</div>
        <div class="inm-field"><strong>Régimen fiscal</strong>${ps.fiscal.regimen||'—'}</div>
        <div class="inm-field" style="grid-column:1/-1;"><strong>Uso CFDI</strong>${ps.fiscal.usoCFDI||'—'}</div>
        <div class="inm-field" style="grid-column:1/-1;"><strong>Dirección fiscal</strong>${ps.fiscal.dirFiscal||'—'}</div>
      </div>
    </div>`:'';

  /* geoOk debe estar fuera del if(showActions) para que mapHtml siempre pueda usarla */
  const geoOk=!!(ps.inmueble&&ps.inmueble.lat&&ps.inmueble.lng);

  /* Acciones admin */
  let adminActionsHtml='';
  if(showActions){
    const svcRow=`<div class="inm-action-group">
      <p class="inm-action-label">Estado del servicio</p>
      <div class="inm-action-row">
        ${ps.status!=='pendiente'?`<button class="btn-sm" onclick="updatePropStatus(${ps.id},'pendiente')">🔄 Pendiente</button>`:''}
        ${ps.status!=='activo'&&ps.status!=='vencido'?`<button class="btn-sm" onclick="updatePropStatus(${ps.id},'activo')">✅ Activo</button>`:''}
        ${ps.status!=='completado'&&ps.status!=='vencido'?`<button class="btn-sm" onclick="updatePropStatus(${ps.id},'completado')">🏁 Completado</button>`:''}
        ${ps.status!=='vencido'?`<button class="btn-sm" style="background:#FFF0F0;color:#C0392B;" onclick="updatePropStatus(${ps.id},'vencido')">⛔ Vencer</button>`:''}
        ${ps.renovadoPor==null&&(ps.status==='vencido'||ps.status==='completado')?`<button class="btn-sm" style="background:#D4EDDA;color:#155724;" onclick="renewContract(${ps.id})">🔄 Renovar</button>`:''}
      </div>
    </div>`;
    const contratoRow=`<div class="inm-action-group">
      <p class="inm-action-label">Estado del contrato</p>
      <div class="inm-action-row">
        ${cs!=='firmado'?`<button class="btn-sm" onclick="updatePropContratoStatus(${ps.id},'firmado')">✍️ Firmado</button>`:''}
        ${cs!=='por_firmar'?`<button class="btn-sm" onclick="updatePropContratoStatus(${ps.id},'por_firmar')">⏳ Por firmar</button>`:''}
        ${cs!=='sin_contrato'?`<button class="btn-sm" onclick="updatePropContratoStatus(${ps.id},'sin_contrato')">📄 Sin contrato</button>`:''}
        <button class="btn-sm" style="background:#FFF0F0;color:#C0392B;margin-left:auto;" onclick="deletePropService(${ps.id})">🗑 Eliminar</button>
      </div>
    </div>`;
    const geoBadge=geoOk
      ?`<span style="font-size:10px;color:#065F46;background:#D1FAE5;border-radius:4px;padding:2px 7px;font-weight:600;">📍 Geo OK</span>`
      :`<span style="font-size:10px;color:#92400E;background:#FEF3C7;border-radius:4px;padding:2px 7px;font-weight:600;cursor:pointer;" onclick="_regeocodeInm(${ps.id})">📍 Sin coords — Geocodificar</span>`;
    const editRow=`<div class="inm-action-row" style="justify-content:flex-start;gap:8px;">
      <button class="btn-sm" style="background:#EEF5FF;color:#0C447C;border:.5px solid #B5D4F4;" onclick="openInmEdit(${ps.id})">✏️ Editar información</button>
      ${geoBadge}
    </div>`;
    adminActionsHtml=`<div class="inm-actions" style="flex-direction:column;gap:6px;">${editRow}<div class="inm-action-divider"></div>${svcRow}<div class="inm-action-divider"></div>${contratoRow}</div>`;
  }

  /* Acciones supervisor */
  let svActionsHtml='';
  if(!showActions){
    if(ps.status==='pendiente')svActionsHtml=`<div class="inm-actions"><button class="btn-sm" onclick="svUpdatePropStatus(${ps.id},'activo')">✅ Iniciar servicio</button></div>`;
    else if(ps.status==='activo')svActionsHtml=`<div class="inm-actions"><button class="btn-sm" onclick="svUpdatePropStatus(${ps.id},'completado')">🏁 Marcar completado</button></div>`;
    else if(ps.status==='completado')svActionsHtml=`<div class="inm-actions"><span class="badge bok">Completado ✓</span></div>`;
  }

  const reportesHtml=buildReportesSection(ps,true); // ambos roles pueden crear y ver reportes
  /* Mini mapa OSM — solo cuando hay coordenadas */
  const _GMKEY='AIzaSyB09Mi1wxP_LSKMiM8un83M1OtnauG_vuE';
  const mapHtml=geoOk
    ?`<div style="margin:10px 0 4px;border-radius:10px;overflow:hidden;border:.5px solid var(--blue-border);">
        <iframe src="https://www.google.com/maps/embed/v1/view?key=${_GMKEY}&center=${ps.inmueble.lat},${ps.inmueble.lng}&zoom=17&maptype=roadmap" style="width:100%;height:185px;border:none;display:block;" loading="lazy" title="Ubicación del inmueble" allowfullscreen referrerpolicy="no-referrer-when-downgrade"></iframe>
        <a href="https://www.google.com/maps?q=${ps.inmueble.lat},${ps.inmueble.lng}" target="_blank" rel="noopener noreferrer" style="font-size:11px;color:#185FA5;display:flex;align-items:center;gap:4px;justify-content:flex-end;padding:5px 10px;background:#F4F8FD;">🗺️ Abrir en Google Maps</a>
      </div>`
    :'';
  return`<div class="inm-grid">
    <div class="inm-field"><strong>🏗️ ${ps.inmueble.tipo} · ${ps.inmueble.m2} m²</strong>${ps.inmueble.colonia}</div>
    <div class="inm-field"><strong>📍 Dirección</strong>${ps.inmueble.direccion}</div>
    <div class="inm-field"><strong>📅 Vigencia del contrato</strong>${formatDateShort(ps.fechaInicio)} → ${formatDateShort(ps.fechaFin)}</div>
    <div class="inm-field"><strong>🔁 Frecuencia · ⏰ Hora</strong>${(ps.frecuencia||'').charAt(0).toUpperCase()+(ps.frecuencia||'').slice(1)} · ${ps.hora}</div>
    <div class="inm-field"><strong>👤 Contacto directo</strong>${ps.cliente.contacto}</div>
    <div class="inm-field"><strong>📞 Teléfono</strong>${ps.cliente.tel}</div>
    <div class="inm-field" style="grid-column:1/-1;"><strong>✉️ Correo</strong>${ps.cliente.email}</div>
    ${ps.descripcion?`<div class="inm-field" style="grid-column:1/-1;"><strong>Descripción</strong>${ps.descripcion}</div>`:''}
  </div>
  ${mapHtml}
  ${pagoHtml}
  ${fiscHtml}
  ${ps.notas?`<p style="font-size:11px;color:#5C7A9A;margin-top:8px;background:var(--blue-light);border-radius:6px;padding:6px 10px;">📝 ${ps.notas}</p>`:''}
  ${histHtml}
  ${buildPersonalAsignadoHtml(ps.id,showActions)}
  ${reportesHtml}
  ${showActions?adminActionsHtml:svActionsHtml}`;
}

/* ── Fila de lista (acordeón) ── */
function buildInmRow(ps,showActions){
  const cs=ps.contratoStatus||'sin_contrato';
  const sBadge=`<span class="inm-status ${ps.status}" style="font-size:10px;padding:2px 8px;">${statusLabel(ps.status)}</span>`;
  const cBadge=`<span class="inm-contrato-badge ${cs}">${contratoLabel(cs)}</span>`;
  const rangoFechas=`${formatDateShort(ps.fechaInicio)} → ${formatDateShort(ps.fechaFin)}`;
  // data-id en el row para identificar el servicio; onclick usa `this` para evitar conflictos de ID
  return`<div class="inm-row" data-id="${ps.id}">
    <div class="inm-row-hdr" onclick="toggleInmRow(this)">
      <div style="flex:1;min-width:0;">
        <span class="inm-row-folio">${ps.folio}${ps.parentId!=null?'&nbsp;·&nbsp;Renovación':''}</span>
        <p class="inm-row-title">${ps.cliente.nombre}</p>
        <p class="inm-row-sub">${ps.tipo}&ensp;·&ensp;${rangoFechas}</p>
      </div>
      <div class="inm-row-badges">${sBadge}${cBadge}</div>
      <span class="inm-row-arrow">▼</span>
    </div>
    <div class="inm-row-body">${buildInmDetail(ps,showActions)}</div>
  </div>`;
}

/* Usar DOM traversal (this) para evitar conflictos de ID entre paneles admin y supervisor */
function toggleInmRow(hdrEl){
  const body=hdrEl.nextElementSibling;
  if(!body)return;
  const open=body.classList.toggle('open');
  hdrEl.classList.toggle('open',open);
  // Persistir estado para restaurar tras re-render
  const row=hdrEl.parentElement;
  if(row){
    const id=parseInt(row.dataset.id);
    if(!isNaN(id)){if(open)_openInmRows.add(id);else _openInmRows.delete(id);}
  }
}

/* Restaurar filas abiertas después de re-render */
function _restoreOpenRows(scope){
  _openInmRows.forEach(id=>{
    document.querySelectorAll(`${scope} .inm-row[data-id="${id}"]`).forEach(row=>{
      const hdr=row.querySelector('.inm-row-hdr');
      const body=row.querySelector('.inm-row-body');
      if(hdr&&body){body.classList.add('open');hdr.classList.add('open');}
    });
  });
}

/* ── Grupo de supervisor ── */
function buildSupervisorGroup(sv,services,showActions){
  const total=services.length;
  const activos=services.filter(s=>s.status==='activo').length;
  const vencidos=services.filter(s=>s.status==='vencido').length;
  const zonasTxt=sv.zonas&&sv.zonas.length?sv.zonas.join(' · '):'';
  const rows=services.map(ps=>buildInmRow(ps,showActions)).join('');
  return`<div class="inm-group">
    <div class="inm-group-hdr">
      <div style="display:flex;align-items:center;gap:10px;">
        <div class="av" style="width:34px;height:34px;font-size:${sv.photo?'0':'12px'};background:rgba(255,255,255,.18);">${sv.photo?'<img src="'+sv.photo+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">':sv.initials||'??'}</div>
        <div>
          <p>${sv.name}</p>
          <span>${total} contrato${total!==1?'s':''}${activos?' &nbsp;·&nbsp; '+activos+' activo'+(activos!==1?'s':''):''}${vencidos?' &nbsp;·&nbsp; '+vencidos+' vencido'+(vencidos!==1?'s':''):''}</span>
        </div>
      </div>
      ${zonasTxt?`<span style="font-size:10px;color:rgba(255,255,255,.55);">📍 ${zonasTxt}</span>`:''}
    </div>
    <div class="inm-group-body">${rows}</div>
  </div>`;
}

/* ── Reportes de visita ── */
function openInmReport(psId){
  _reportPsId=psId;
  _reportFotos=[];
  const ov=document.getElementById('inm-report-ov');
  if(!ov){console.error('inm-report-ov not found');return;}
  ov.classList.add('open');
  const set=(id,v)=>{const el=document.getElementById(id);if(el)el.value=v;};
  const today=new Date().toISOString().split('T')[0];
  const now=new Date();
  set('rep-fecha',today);
  set('rep-hora',String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0'));
  set('rep-actividades','');
  set('rep-observaciones','');
  set('rep-fotos-input','');
  const prev=document.getElementById('rep-fotos-prev');if(prev)prev.innerHTML='';
  const cnt=document.getElementById('rep-fotos-count');if(cnt)cnt.textContent='';
}
function closeInmReport(){const ov=document.getElementById('inm-report-ov');if(ov)ov.classList.remove('open');}
function handleReportFotos(e){
  const files=Array.from(e.target.files);
  const remaining=8-_reportFotos.length;
  if(!remaining){showToast('amber','⚠️','Máximo 8 fotos por reporte');return;}
  files.slice(0,remaining).forEach(f=>{
    const rd=new FileReader();
    rd.onload=ev=>{
      _reportFotos.push(ev.target.result);
      const img=document.createElement('img');
      img.src=ev.target.result;img.className='rep-foto-thumb';
      document.getElementById('rep-fotos-prev').appendChild(img);
      document.getElementById('rep-fotos-count').textContent=_reportFotos.length+' foto'+(_reportFotos.length!==1?'s':'')+' adjunta'+(_reportFotos.length!==1?'s':'');
    };
    rd.readAsDataURL(f);
  });
  if(files.length>remaining)showToast('amber','⚠️','Máximo 8 fotos por reporte');
}
function saveInmReport(){
  if(_reportPsId===null){showToast('amber','⚠️','Error: servicio no identificado');return;}
  const ps=PROPERTY_SERVICES.find(p=>p.id===_reportPsId);
  if(!ps){showToast('amber','⚠️','Servicio no encontrado');return;}
  const gv=id=>{const el=document.getElementById(id);return el?el.value.trim():'';};
  const fecha=gv('rep-fecha');
  const hora=gv('rep-hora');
  const actividades=gv('rep-actividades');
  const observaciones=gv('rep-observaciones');
  if(!fecha){showToast('amber','⚠️','Selecciona la fecha de la visita');return;}
  if(!actividades&&!observaciones){showToast('amber','⚠️','Ingresa actividades u observaciones de la visita');return;}
  if(!ps.reportes)ps.reportes=[];
  const unameEl=document.getElementById('header-uname');
  const svNombre=unameEl?unameEl.textContent.trim()||'Supervisor':'Supervisor';
  const savedId=_reportPsId;
  ps.reportes.push({
    id:Date.now(),fecha,hora,supervisorNombre:svNombre,
    actividades,observaciones,
    fotos:[..._reportFotos],
    createdAt:new Date().toLocaleDateString('es-MX',{day:'numeric',month:'short',year:'numeric'})
  });
  closeInmReport();
  _openInmRows.add(savedId);
  renderPropServices(_propFilter);
  renderSVInmuebles();
  fbSavePropertyServices();
  showToast('green','✅','Reporte de visita guardado');
}
function deleteReporte(psId,reporteId){
  const ps=PROPERTY_SERVICES.find(p=>p.id===psId);
  if(!ps||!ps.reportes)return;
  ps.reportes=ps.reportes.filter(r=>r.id!==reporteId);
  _openInmRows.add(psId);
  renderPropServices(_propFilter);
  renderSVInmuebles();
  fbSavePropertyServices();
  showToast('amber','🗑','Reporte eliminado');
}
function downloadReportePDF(psId,reporteId){
  if(currentRole==='personal_inm'){showToast('amber','⚠️','Sin permiso para descargar reportes');return;}
  const ps=PROPERTY_SERVICES.find(p=>p.id===psId);
  if(!ps)return;
  const r=(ps.reportes||[]).find(x=>x.id===reporteId);
  if(!r){showToast('amber','⚠️','Reporte no encontrado');return;}
  // Convertir logo a base64 para embebido en ventana emergente
  const logoImg=new Image();
  logoImg.crossOrigin='anonymous';
  logoImg.onload=function(){
    const cv=document.createElement('canvas');cv.width=logoImg.width;cv.height=logoImg.height;
    cv.getContext('2d').drawImage(logoImg,0,0);
    const logoB64=cv.toDataURL('image/png');
    _buildAndOpenReportePDF(ps,r,logoB64);
  };
  logoImg.onerror=function(){_buildAndOpenReportePDF(ps,r,null);};
  logoImg.src='img/logo.png?v='+Date.now();
}

function _buildAndOpenReportePDF(ps,r,logoB64){
  const fechaTxt=new Date(r.fecha+'T12:00:00').toLocaleDateString('es-MX',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  const generadoTxt=new Date().toLocaleDateString('es-MX',{day:'numeric',month:'long',year:'numeric'});
  const statusLabel={activo:'Activo',pendiente:'Pendiente',completado:'Completado',vencido:'Vencido'}[ps.status]||ps.status;
  const statusColor={activo:'#1A7A3B',pendiente:'#A05C00',completado:'#1A56DB',vencido:'#C0392B'}[ps.status]||'#5C7A9A';
  const statusBg={activo:'#D4EDDA',pendiente:'#FFF3CD',completado:'#EEF5FF',vencido:'#FFF0F0'}[ps.status]||'#F0F0F0';
  const contratoLabel={'firmado':'✅ Firmado','por_firmar':'⏳ Por firmar','sin_contrato':'📄 Sin contrato'}[ps.contratoStatus]||'—';
  const logoHtml=logoB64
    ?`<img src="${logoB64}" style="height:64px;width:64px;object-fit:contain;">`
    :`<div style="font-size:26px;font-weight:900;color:#042C53;letter-spacing:-1px;">AYA<span style="color:#1A56DB;">LYM</span></div>`;
  const fotosHtml=r.fotos&&r.fotos.length
    ?`<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-top:8px;">${r.fotos.map(f=>`<img src="${f}" style="width:100%;height:100px;object-fit:cover;border-radius:5px;border:1px solid #dce8f5;">`).join('')}</div>`
    :`<p style="color:#8A9BB0;font-size:11px;font-style:italic;padding:6px 0;">Sin evidencia fotográfica adjunta.</p>`;

  const html=`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Reporte de Visita — ${ps.folio} — ${r.fecha}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'Segoe UI',Arial,Helvetica,sans-serif;font-size:12px;color:#1C2B3A;background:#fff;padding:0;}
/* ── Cabecera ── */
.page-header{background:#042C53;padding:16px 32px;display:flex;justify-content:space-between;align-items:center;}
.ph-brand{display:flex;align-items:center;gap:10px;}
.ph-brand-text{color:#fff;}
.ph-brand-text h1{font-size:18px;font-weight:800;letter-spacing:.5px;line-height:1;}
.ph-brand-text p{font-size:10px;color:rgba(255,255,255,.6);margin-top:2px;letter-spacing:.4px;text-transform:uppercase;}
.ph-right{text-align:right;}
.ph-right h2{font-size:14px;font-weight:700;color:#fff;margin-bottom:4px;}
.ph-folio{display:inline-block;background:rgba(255,255,255,.15);color:#fff;font-size:10px;font-weight:600;padding:2px 9px;border-radius:20px;letter-spacing:.5px;}
.ph-date{font-size:9.5px;color:rgba(255,255,255,.55);margin-top:4px;}
/* ── Banda de estado ── */
.status-bar{background:#F0F4FA;border-bottom:1px solid #D8E5F3;padding:7px 32px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;}
.status-chip{font-size:10px;font-weight:700;padding:2px 10px;border-radius:20px;}
.status-label{font-size:10px;color:#5C7A9A;margin-right:3px;}
/* ── Cuerpo ── */
.body{padding:16px 32px 14px;}
/* ── Secciones ── */
.section{margin-bottom:12px;}
.section-title{font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#1A56DB;padding-bottom:4px;border-bottom:1.5px solid #D0E3F7;margin-bottom:8px;}
/* ── Grid de campos ── */
.grid{display:grid;grid-template-columns:1fr 1fr;gap:0;}
.field{padding:5px 10px;border-bottom:.5px solid #EBF1FA;}
.field:nth-child(odd){border-right:.5px solid #EBF1FA;}
.field b{display:block;font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:.4px;color:#8A9BB0;margin-bottom:2px;}
.field span{font-size:11.5px;color:#1C2B3A;font-weight:500;}
.field-full{grid-column:1/-1;padding:5px 10px;border-bottom:.5px solid #EBF1FA;}
.field-full b{display:block;font-size:9px;font-weight:600;text-transform:uppercase;letter-spacing:.4px;color:#8A9BB0;margin-bottom:2px;}
.field-full span{font-size:11.5px;color:#1C2B3A;font-weight:500;}
.grid-wrap{border:1px solid #D0E3F7;border-radius:7px;overflow:hidden;}
/* ── Bloque de texto ── */
.text-block{background:#F7FAFF;border:1px solid #D0E3F7;border-radius:7px;padding:10px 13px;font-size:12px;line-height:1.65;white-space:pre-wrap;color:#1C2B3A;min-height:40px;}
/* ── Firma ── */
.sign-section{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:20px;}
.sign-box{text-align:center;}
.sign-line{border-top:1.5px solid #8A9BB0;margin-bottom:6px;margin-top:40px;}
.sign-name{font-size:11px;font-weight:600;color:#1C2B3A;}
.sign-role{font-size:9.5px;color:#8A9BB0;margin-top:2px;}
/* ── Pie de página ── */
.page-footer{background:#F0F4FA;border-top:1px solid #D0E3F7;padding:8px 32px;display:flex;justify-content:space-between;align-items:center;margin-top:20px;}
.page-footer span{font-size:9.5px;color:#8A9BB0;}
.page-footer strong{color:#1A56DB;font-weight:600;}
@media print{
  body{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  .page-header{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
  .status-bar{-webkit-print-color-adjust:exact;print-color-adjust:exact;}
}
</style></head><body>

<!-- CABECERA -->
<div class="page-header">
  <div class="ph-brand">
    ${logoHtml}
    <div class="ph-brand-text">
      <h1>AYALYM</h1>
      <p>Servicios de limpieza profesional</p>
    </div>
  </div>
  <div class="ph-right">
    <h2>Reporte de Visita</h2>
    <div class="ph-folio">${ps.folio}${ps.parentId!=null?' &nbsp;·&nbsp; RENOVACIÓN':''}</div>
    <div class="ph-date">Generado el ${generadoTxt}</div>
  </div>
</div>

<!-- BANDA DE ESTADO -->
<div class="status-bar">
  <span class="status-label">Estado:</span>
  <span class="status-chip" style="background:${statusBg};color:${statusColor};">${statusLabel}</span>
  <span class="status-label" style="margin-left:8px;">Contrato:</span>
  <span class="status-chip" style="background:#F0F4FA;color:#1C2B3A;border:1px solid #D0E3F7;">${contratoLabel}</span>
  <span class="status-label" style="margin-left:8px;">Supervisor:</span>
  <span style="font-size:10px;font-weight:600;color:#1C2B3A;">${r.supervisorNombre}</span>
  <span class="status-label" style="margin-left:8px;">Visita:</span>
  <span style="font-size:10px;font-weight:600;color:#1C2B3A;text-transform:capitalize;">${fechaTxt} &nbsp;·&nbsp; ${r.hora} hrs</span>
</div>

<div class="body">

<!-- SECCIÓN 1+2 unificada: Datos del servicio y visita -->
<div class="section">
  <div class="section-title">Datos del servicio y visita</div>
  <div class="grid-wrap">
    <div class="grid">
      <div class="field"><b>Cliente / Empresa</b><span>${ps.cliente.nombre}</span></div>
      <div class="field"><b>Contacto directo</b><span>${ps.cliente.contacto||'—'}</span></div>
      <div class="field"><b>Teléfono</b><span>${ps.cliente.tel||'—'}</span></div>
      <div class="field"><b>Correo electrónico</b><span>${ps.cliente.email||'—'}</span></div>
      <div class="field"><b>Tipo de inmueble</b><span>${ps.inmueble.tipo} · ${ps.inmueble.m2} m²</span></div>
      <div class="field"><b>Colonia</b><span>${ps.inmueble.colonia}</span></div>
      <div class="field-full"><b>Dirección</b><span>${ps.inmueble.direccion}</span></div>
      <div class="field"><b>Tipo de servicio</b><span>${ps.tipo}</span></div>
      <div class="field"><b>Frecuencia · Hora habitual</b><span style="text-transform:capitalize;">${ps.frecuencia||'—'} · ${ps.hora} hrs</span></div>
      <div class="field"><b>Vigencia</b><span>${ps.fechaInicio} → ${ps.fechaFin||'—'}</span></div>
      <div class="field"><b>Folio</b><span>${ps.folio}</span></div>
      <div class="field"><b>Fecha de registro</b><span>${r.createdAt}</span></div>
    </div>
  </div>
</div>

<!-- SECCIÓN 2: Actividades -->
<div class="section">
  <div class="section-title">Actividades realizadas</div>
  <div class="text-block">${r.actividades||'Sin actividades registradas.'}</div>
</div>

<!-- SECCIÓN 3: Observaciones -->
<div class="section">
  <div class="section-title">Observaciones / Estado del inmueble</div>
  <div class="text-block">${r.observaciones||'Sin observaciones.'}</div>
</div>

${r.fotos&&r.fotos.length?`
<!-- SECCIÓN 4: Fotografías -->
<div class="section">
  <div class="section-title">Evidencia fotográfica (${r.fotos.length} foto${r.fotos.length!==1?'s':''})</div>
  ${fotosHtml}
</div>`:''}

<!-- FIRMAS -->
<div class="sign-section">
  <div class="sign-box">
    <div class="sign-line"></div>
    <div class="sign-name">${r.supervisorNombre}</div>
    <div class="sign-role">Supervisor responsable</div>
  </div>
  <div class="sign-box">
    <div class="sign-line"></div>
    <div class="sign-name">${ps.cliente.contacto||ps.cliente.nombre}</div>
    <div class="sign-role">Representante del cliente</div>
  </div>
</div>

</div><!-- /body -->

<!-- PIE DE PÁGINA -->
<div class="page-footer">
  <span>AYALYM · Servicios de limpieza profesional</span>
  <span>Folio: <strong>${ps.folio}</strong> &nbsp;·&nbsp; Visita del ${r.fecha} &nbsp;·&nbsp; ${generadoTxt}</span>
</div>

<script>window.onload=function(){window.print();}<\/script>
</body></html>`;
  const w=window.open('','_blank');
  if(!w){showToast('amber','⚠️','Permite ventanas emergentes en tu navegador para generar el PDF');return;}
  w.document.write(html);
  w.document.close();
}

/* Re-geocodifica un inmueble existente desde el panel admin */
async function _regeocodeInm(id){
  const ps=PROPERTY_SERVICES.find(p=>p.id===id);if(!ps)return;
  showToast('blue','📍',`Buscando coordenadas de ${ps.folio}…`);
  const ok=await _geocodeInmueble(ps);
  if(ok){
    showToast('green','📍',`Coordenadas configuradas para ${ps.folio}`);
    renderPropServices(_propFilter);
  }else{
    showToast('amber','📍',`No se encontraron coordenadas para "${ps.inmueble.direccion}". Verifica la dirección.`);
  }
}

/* ── Edición de servicio de inmueble (admin) ── */
function openInmEdit(id){
  const ps=PROPERTY_SERVICES.find(p=>p.id===id);
  if(!ps)return;
  const ov=document.getElementById('inm-edit-ov');
  if(!ov){console.error('inm-edit-ov not found');return;}
  // Mostrar overlay primero
  ov.classList.add('open');
  // Helper: asigna valor de forma segura
  const set=(eid,val)=>{const el=document.getElementById(eid);if(el)el.value=(val??'');};
  set('inm-edit-id',id);
  // Cliente
  set('ie-cli-nombre',ps.cliente.nombre);
  set('ie-cli-contacto',ps.cliente.contacto);
  set('ie-cli-tel',ps.cliente.tel);
  set('ie-cli-email',ps.cliente.email);
  // Inmueble
  const _knownTipos=['Oficina','Casa','Departamento','Residencial','Condominio','Bodega','Local comercial','Edificio','Hotel'];
  const _psTipo=ps.inmueble.tipo||'Oficina';
  const _ieOtroEl=document.getElementById('ie-tipo-otro');
  if(_knownTipos.indexOf(_psTipo)>=0){
    set('ie-tipo',_psTipo);
    if(_ieOtroEl){_ieOtroEl.value='';_ieOtroEl.style.display='none';}
  }else{
    set('ie-tipo','Otro');
    if(_ieOtroEl){_ieOtroEl.value=_psTipo;_ieOtroEl.style.display='';}
  }
  set('ie-m2',ps.inmueble.m2);
  set('ie-direccion',ps.inmueble.direccion);
  set('ie-colonia',ps.inmueble.colonia);
  // Servicio
  set('ie-svc-tipo',ps.tipo);
  set('ie-svc-desc',ps.descripcion);
  set('ie-frecuencia',ps.frecuencia||'única');
  set('ie-hora',ps.hora);
  set('ie-fecha-inicio',ps.fechaInicio);
  set('ie-fecha-fin',ps.fechaFin);
  // Pago
  const pago=ps.pago||{};
  set('ie-pago-metodo',pago.metodo||'transferencia');
  set('ie-pago-periodicidad',pago.periodicidad||'mensual');
  set('ie-pago-monto',pago.monto);
  // Fiscal
  const fisc=ps.fiscal||{};
  set('ie-fiscal-razon',fisc.razonSocial);
  set('ie-fiscal-rfc',fisc.rfc);
  set('ie-fiscal-regimen',fisc.regimen);
  set('ie-fiscal-cfdi',fisc.usoCFDI);
  set('ie-fiscal-dir',fisc.dirFiscal);
  // Supervisor
  const sel=document.getElementById('ie-supervisor');
  if(sel)sel.innerHTML=SUPERVISORS.map(sv=>`<option value="${sv.id}"${sv.id===ps.supervisorId?' selected':''}>${sv.name}</option>`).join('');
  // Notas
  set('ie-notas',ps.notas);
}
function closeInmEdit(){const ov=document.getElementById('inm-edit-ov');if(ov)ov.classList.remove('open');}
function saveInmEdit(){
  const id=parseInt(document.getElementById('inm-edit-id').value);
  const ps=PROPERTY_SERVICES.find(p=>p.id===id);
  if(!ps)return;
  const g=id=>document.getElementById(id).value.trim();
  /* Capturar dirección anterior para detectar cambio */
  const _oldDir=ps.inmueble.direccion;
  const _oldCol=ps.inmueble.colonia;
  // Cliente
  ps.cliente.nombre=g('ie-cli-nombre')||ps.cliente.nombre;
  ps.cliente.contacto=g('ie-cli-contacto');
  ps.cliente.tel=g('ie-cli-tel');
  ps.cliente.email=g('ie-cli-email');
  // Inmueble
  const _ieTipoSel=document.getElementById('ie-tipo');
  const _ieTipoOtro=document.getElementById('ie-tipo-otro');
  ps.inmueble.tipo=(_ieTipoSel&&_ieTipoSel.value==='Otro')
    ?(_ieTipoOtro&&_ieTipoOtro.value.trim()||'Otro')
    :(_ieTipoSel?_ieTipoSel.value:'Oficina');
  ps.inmueble.m2=parseInt(document.getElementById('ie-m2').value)||ps.inmueble.m2;
  ps.inmueble.direccion=g('ie-direccion');
  ps.inmueble.colonia=g('ie-colonia');
  // Servicio
  ps.tipo=g('ie-svc-tipo')||ps.tipo;
  ps.descripcion=g('ie-svc-desc');
  ps.frecuencia=document.getElementById('ie-frecuencia').value;
  ps.hora=document.getElementById('ie-hora').value;
  ps.fechaInicio=document.getElementById('ie-fecha-inicio').value||ps.fechaInicio;
  ps.fechaFin=document.getElementById('ie-fecha-fin').value||ps.fechaFin;
  // Pago
  if(!ps.pago)ps.pago={};
  ps.pago.metodo=document.getElementById('ie-pago-metodo').value;
  ps.pago.periodicidad=document.getElementById('ie-pago-periodicidad').value;
  ps.pago.monto=parseFloat(document.getElementById('ie-pago-monto').value)||0;
  // Fiscal
  if(!ps.fiscal)ps.fiscal={};
  ps.fiscal.razonSocial=g('ie-fiscal-razon');
  ps.fiscal.rfc=g('ie-fiscal-rfc');
  ps.fiscal.regimen=g('ie-fiscal-regimen');
  ps.fiscal.usoCFDI=g('ie-fiscal-cfdi');
  ps.fiscal.dirFiscal=g('ie-fiscal-dir');
  // Supervisor
  ps.supervisorId=parseInt(document.getElementById('ie-supervisor').value);
  // Notas
  ps.notas=g('ie-notas');
  /* Si cambió la dirección, limpiar coords viejas y re-geocodificar */
  const _dirChanged=_oldDir!==ps.inmueble.direccion||_oldCol!==ps.inmueble.colonia;
  if(_dirChanged){ps.inmueble.lat=null;ps.inmueble.lng=null;}
  fbSavePropertyServices(); /* persistir cambios */
  closeInmEdit();
  _openInmRows.add(id);
  renderPropServices(_propFilter);
  renderSVInmuebles();
  showToast('green','✅','Información actualizada correctamente');
  if(_dirChanged){
    _geocodeInmueble(ps).then(ok=>{
      if(ok)showToast('green','📍','Coordenadas del inmueble actualizadas.');
      else showToast('amber','📍','No se encontraron coordenadas para la nueva dirección. Verifica que sea válida en México.');
    });
  }
}

/* ── Renderizado admin: agrupado por supervisor, activos primero ── */
const _statusOrder={activo:0,pendiente:1,completado:2,vencido:3};
const _sortActivos=arr=>[...arr].sort((a,b)=>(_statusOrder[a.status]??9)-(_statusOrder[b.status]??9));

function renderPropServices(filter){
  _propFilter=filter||_propFilter;
  const list=document.getElementById('prop-services-list');
  if(!list)return;
  const services=_propFilter==='all'?[...PROPERTY_SERVICES]:PROPERTY_SERVICES.filter(ps=>ps.status===_propFilter);
  if(!services.length){
    const lbl={all:'registrados',pendiente:'pendientes',activo:'activos',completado:'completados',vencido:'vencidos'}[_propFilter]||_propFilter;
    list.innerHTML=`<div style="text-align:center;padding:30px 0;color:#5C7A9A;font-size:13px;">No hay contratos ${lbl} aún.</div>`;
    return;
  }
  let html='';
  // Sort supervisor groups: groups with active services appear first
  const svGroups=SUPERVISORS.map(sv=>({sv,svcs:_sortActivos(services.filter(ps=>ps.supervisorId===sv.id))}))
    .filter(g=>g.svcs.length)
    .sort((a,b)=>{
      const bestA=_statusOrder[a.svcs[0].status]??9;
      const bestB=_statusOrder[b.svcs[0].status]??9;
      return bestA-bestB;
    });
  svGroups.forEach(({sv,svcs})=>{html+=buildSupervisorGroup(sv,svcs,true);});
  const unassigned=_sortActivos(services.filter(ps=>!SUPERVISORS.some(sv=>sv.id===ps.supervisorId)));
  if(unassigned.length)html+=buildSupervisorGroup({name:'Sin asignar',initials:'??',zonas:[]},unassigned,true);
  list.innerHTML=html;
  _restoreOpenRows('#prop-services-list');
}

/* ── Detalle solo-lectura para supervisor (sin dinero, sin fiscal, sin acciones) ── */
function buildInmDetailSV(ps){
  const reportesHtml=buildReportesSection(ps,true);
  return`<div class="inm-grid">
    <div class="inm-field"><strong>🏗️ ${ps.inmueble.tipo} · ${ps.inmueble.m2} m²</strong>${ps.inmueble.colonia}</div>
    <div class="inm-field"><strong>📍 Dirección</strong>${ps.inmueble.direccion}</div>
    <div class="inm-field"><strong>📅 Vigencia del contrato</strong>${formatDateShort(ps.fechaInicio)} → ${formatDateShort(ps.fechaFin)}</div>
    <div class="inm-field"><strong>🔁 Frecuencia · ⏰ Hora</strong>${(ps.frecuencia||'').charAt(0).toUpperCase()+(ps.frecuencia||'').slice(1)} · ${ps.hora}</div>
    <div class="inm-field"><strong>👤 Contacto directo</strong>${ps.cliente.contacto}</div>
    <div class="inm-field"><strong>📞 Teléfono</strong>${ps.cliente.tel}</div>
    <div class="inm-field" style="grid-column:1/-1;"><strong>✉️ Correo</strong>${ps.cliente.email}</div>
    ${ps.descripcion?`<div class="inm-field" style="grid-column:1/-1;"><strong>Descripción</strong>${ps.descripcion}</div>`:''}
  </div>
  ${ps.notas?`<p style="font-size:11px;color:#5C7A9A;margin-top:8px;background:var(--blue-light);border-radius:6px;padding:6px 10px;">📝 ${ps.notas}</p>`:''}
  ${buildPersonalAsignadoHtml(ps.id,false)}
  ${reportesHtml}
  <div id="att-sv-${ps.id}">${_buildSvAttHtml('sv_'+ps.id,ps)}</div>`;
}
function _buildSvAttHtml(k,ps){
  const label=_attFilterLabel(k);
  const personal=PERSONAL_INM.filter(p=>p.serviciosAsignados.includes(ps.id));
  if(!personal.length)return`<div class="att-section-block"><p class="att-section-hdr">🕐 Asistencias del personal</p><div class="att-empty-state">Sin personal asignado a este contrato.</div></div>`;
  const rows=personal.map(p=>{
    const filtered=_filterAsisByPeriod(p.asistencias,_getAttF(k));
    const cmpl=filtered.filter(a=>a.salida);
    const rowsHtml=_buildAttRowsHtml(filtered);
    return`<div style="margin-bottom:14px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
        <div style="display:flex;align-items:center;gap:8px;">
          <div class="av" style="width:30px;height:30px;font-size:${p.photo?'0':'11px'};background:#085041;color:#fff;flex-shrink:0;">${p.photo?'<img src="'+p.photo+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">':p.initials}</div>
          <div>
            <p style="font-size:12px;font-weight:600;color:#042C53;">${p.nombre}</p>
            <p style="font-size:11px;color:#5C7A9A;">${filtered.length} registros · ${cmpl.length} completos</p>
          </div>
        </div>
        <button class="att-pdf-btn" style="font-size:10px;padding:4px 10px;" onclick="_svAttPDF('${k}',${p.id},${ps.id})">⬇ PDF</button>
      </div>
      <div class="att-list" style="max-height:200px;overflow-y:auto;">${rowsHtml}</div>
    </div>`;
  }).join('<hr style="border:none;border-top:.5px solid #D8E5F3;margin:10px 0;">');
  return`<div class="att-section-block">
    <p class="att-section-hdr">🕐 Asistencias del personal</p>
    <div class="att-filter-row">${_attFilterBarHtml(k,'_svSetMode','_svApplyRange')}</div>
    <p class="att-period-label">${label}</p>
    ${rows}
  </div>`;
}
function _svSetMode(mode,k){_getAttF(k).mode=mode;_reRenderSvAtt(k);}
function _svApplyRange(k){_reRenderSvAtt(k);}
function _reRenderSvAtt(k){
  const psId=parseInt(k.replace('sv_',''));
  const ps=PROPERTY_SERVICES.find(p=>p.id===psId);
  const el=document.getElementById('att-sv-'+psId);
  if(!el||!ps)return;
  el.innerHTML=_buildSvAttHtml(k,ps);
}
function _svAttPDF(k,piId,psId){
  const p=PERSONAL_INM.find(x=>x.id===piId);
  const ps=PROPERTY_SERVICES.find(x=>x.id===psId);
  if(!p)return;
  const filtered=_filterAsisByPeriod(p.asistencias,_getAttF(k));
  _downloadAsisPDF(filtered,p.nombre,_attFilterLabel(k),ps);
}

/* ── Fila acordeón solo supervisor ── */
function buildInmRowSV(ps){
  const rangoFechas=`${formatDateShort(ps.fechaInicio)} → ${formatDateShort(ps.fechaFin)}`;
  return`<div class="inm-row" data-id="${ps.id}">
    <div class="inm-row-hdr" onclick="toggleInmRow(this)">
      <div style="flex:1;min-width:0;">
        <span class="inm-row-folio">${ps.folio}</span>
        <p class="inm-row-title">${ps.cliente.nombre}</p>
        <p class="inm-row-sub">${ps.tipo}&ensp;·&ensp;${rangoFechas}</p>
      </div>
      <span class="inm-row-arrow">▼</span>
    </div>
    <div class="inm-row-body">${buildInmDetailSV(ps)}</div>
  </div>`;
}

/* ══════════════════════════════════════════════════════
   SUPERVISOR — ASISTENCIAS (entrada / salida por servicio)
   ══════════════════════════════════════════════════════ */
function _todaySVAst(servicioId){
  const today=_localDateStr();
  const svId=currentSupervisorRef?currentSupervisorRef.id:-1;
  return SUPERVISOR_ASISTENCIAS.find(a=>a.supervisorId===svId&&a.servicioId===servicioId&&a.fecha===today)||null;
}
function _fmtDur(min){
  if(!min&&min!==0)return'—';
  const h=Math.floor(min/60),m=min%60;
  return h>0?(m>0?h+'h '+m+'m':h+'h'):(m+'m');
}
function _nowHM(){
  const n=new Date();
  return String(n.getHours()).padStart(2,'0')+':'+String(n.getMinutes()).padStart(2,'0');
}

/* ═══════════════════════════════════════════════════════════
   GEO-CERCA — Validación de proximidad para asistencias
   Radio: GEO_RADIO_M metros. Usa Nominatim (OSM) para
   geocodificar la dirección del inmueble al crearlo/editarlo.
   ═══════════════════════════════════════════════════════════ */
let GEO_RADIO_M = 500; // metros permitidos desde el inmueble (configurable por admin)

/* Formatea metros en texto legible: <1000→"Xm", ≥1000→"X.Xkm" */
function _fmtDist(m){return m>=1000?(m/1000).toFixed(1)+'km':m+'m';}

/* Distancia en metros entre dos pares lat/lng (fórmula Haversine) */
function _haversineDistance(lat1,lng1,lat2,lng2){
  const R=6371000, r=Math.PI/180;
  const dLat=(lat2-lat1)*r, dLng=(lng2-lng1)*r;
  const a=Math.sin(dLat/2)**2+Math.cos(lat1*r)*Math.cos(lat2*r)*Math.sin(dLng/2)**2;
  return Math.round(R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a)));
}

/* Geocodifica la dirección del inmueble vía Nominatim y guarda lat/lng en ps.
   Aplica varias estrategias: primero simplifica la dirección (elimina Torre/Piso/Oficina),
   luego intenta con colonia + CP, y como último recurso solo el CP. */
async function _geocodeInmueble(ps){
  const dir=(ps.inmueble.direccion||'').trim();
  const col=(ps.inmueble.colonia||'').trim();

  /* Esperar a que cargue la API de Google Maps JS (hasta 9 seg) */
  for(let i=0;i<30;i++){
    if(window.google&&window.google.maps&&window.google.maps.Geocoder) break;
    await new Promise(r=>setTimeout(r,300));
  }
  if(!window.google||!window.google.maps||!window.google.maps.Geocoder){
    console.warn('[geo] Google Maps JS API no disponible');
    return false;
  }

  const geocoder=new google.maps.Geocoder();

  async function _tryAddr(address){
    try{
      const res=await geocoder.geocode({address,region:'MX'});
      if(res.results&&res.results.length>0) return res.results[0].geometry.location;
      return null;
    }catch(e){
      console.warn('[geo-gmaps]',e.code||e.message||e,address);
      return null;
    }
  }

  let loc=null;
  /* E1: dirección + colonia + CDMX */
  loc=await _tryAddr([dir,col,'Ciudad de México','México'].filter(Boolean).join(', '));
  /* E2: solo dirección + CDMX */
  if(!loc&&dir) loc=await _tryAddr(`${dir}, Ciudad de México, México`);
  /* E3: colonia + CDMX (al menos ubica la zona) */
  if(!loc&&col) loc=await _tryAddr(`${col}, Ciudad de México, México`);

  if(loc){
    ps.inmueble.lat=loc.lat();
    ps.inmueble.lng=loc.lng();
    fbSavePropertyServices();
    return true;
  }
  return false;
}

/* Verifica si el usuario está dentro del radio de alguna de las coords dadas.
   coordsList: [{lat,lng}]
   onOk(dist|'sin-coords'|'no-api') — permitido
   onFar(dist) — demasiado lejos
   onError(err) — sin permiso u otro error */
function _checkGeoFence(coordsList,onOk,onFar,onError){
  if(!navigator.geolocation){onOk('no-api');return;}
  const valid=(coordsList||[]).filter(c=>c&&c.lat&&c.lng);
  if(!valid.length){onOk('sin-coords');return;}
  navigator.geolocation.getCurrentPosition(
    pos=>{
      const{latitude:uLat,longitude:uLng}=pos.coords;
      const dist=Math.min(...valid.map(c=>_haversineDistance(uLat,uLng,c.lat,c.lng)));
      if(dist<=GEO_RADIO_M)onOk(dist,uLat,uLng);
      else onFar(dist);
    },
    err=>onError(err),
    {enableHighAccuracy:true,timeout:10000,maximumAge:30000}
  );
}

function marcarEntradaSV(servicioId){
  if(!currentSupervisorRef){showToast('amber','⚠️','Sin sesión de supervisor');return;}
  if(_todaySVAst(servicioId)){showToast('amber','⚠️','Ya registraste tu entrada hoy');return;}
  const ps=PROPERTY_SERVICES.find(p=>p.id===servicioId);if(!ps)return;
  showToast('blue','📍','Verificando ubicación…');
  _checkGeoFence(
    [{lat:ps.inmueble.lat,lng:ps.inmueble.lng}],
    (info,uLat,uLng)=>{
      const hora=_nowHM(),today=_localDateStr();
      SUPERVISOR_ASISTENCIAS.push({
        id:'ast'+Date.now(),
        supervisorId:currentSupervisorRef.id,supervisorNombre:currentSupervisorRef.name,
        servicioId:ps.id,servicioFolio:ps.folio||String(ps.id),servicioTipo:ps.tipo,
        clienteNombre:ps.cliente.nombre,inmuebleDireccion:ps.inmueble.direccion,
        fecha:today,entrada:hora,salida:null,duracion:null,notas:'',
      });
      fbSaveSupervisorAsistencias();
      /* Guardar ubicación activa para mapa admin */
      if(uLat&&uLng){
        fbSaveUbicActiva({id:'sv_'+currentSupervisorRef.id,nombre:currentSupervisorRef.name,
          rol:'supervisor',lat:uLat,lng:uLng,entrada:hora,
          contratoNombre:`${ps.folio||'INM'} — ${ps.cliente.nombre}`});
      }
      renderSVAstHoy();
      const dtxt=typeof info==='number'?` · ${info}m del inmueble`:'';
      showToast('green','📍','Entrada registrada: '+hora+dtxt);
    },
    dist=>showToast('red','📍',`Te encuentras a ${_fmtDist(dist)} del inmueble, acércate para registrar tu entrada.`),
    err=>{
      if(err.code===1)showToast('red','🔒','Permite el acceso a tu ubicación para registrar asistencia.');
      else showToast('amber','⚠️','No se pudo obtener tu ubicación. Intenta de nuevo.');
    }
  );
}

function marcarSalidaSV(servicioId){
  if(!currentSupervisorRef)return;
  const today=_localDateStr();
  const ast=SUPERVISOR_ASISTENCIAS.find(a=>a.supervisorId===currentSupervisorRef.id&&a.servicioId===servicioId&&a.fecha===today);
  if(!ast){showToast('amber','⚠️','No hay entrada registrada hoy');return;}
  if(ast.salida){showToast('amber','⚠️','Ya registraste tu salida hoy');return;}
  const ps=PROPERTY_SERVICES.find(p=>p.id===servicioId);
  showToast('blue','📍','Verificando ubicación…');
  _checkGeoFence(
    [ps?{lat:ps.inmueble.lat,lng:ps.inmueble.lng}:{}],
    (info)=>{
      const hora=_nowHM();
      ast.salida=hora;
      const[eh,em]=ast.entrada.split(':').map(Number);
      const[sh,sm]=hora.split(':').map(Number);
      ast.duracion=(sh*60+sm)-(eh*60+em);
      fbSaveSupervisorAsistencias();
      fbDeleteUbicActiva('sv_'+currentSupervisorRef.id); /* quitar del mapa */
      renderSVAstHoy();
      const dtxt=typeof info==='number'?` · ${info}m del inmueble`:'';
      showToast('green','🏁','Salida registrada: '+hora+dtxt);
    },
    dist=>showToast('red','📍',`Te encuentras a ${_fmtDist(dist)} del inmueble, acércate para registrar tu salida.`),
    err=>{
      if(err.code===1)showToast('red','🔒','Permite el acceso a tu ubicación para registrar asistencia.');
      else showToast('amber','⚠️','No se pudo obtener tu ubicación. Intenta de nuevo.');
    }
  );
}

function renderSVAstHoy(){
  const el=document.getElementById('sv-ast-today');
  if(!el||!currentSupervisorRef)return;
  const svId=currentSupervisorRef.id;
  const today=_localDateStr();
  const mine=PROPERTY_SERVICES.filter(ps=>ps.supervisorId===svId&&ps.status==='activo');
  if(!mine.length){el.innerHTML='';return;}
  const dt=new Date(today+'T12:00:00');
  const dias=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const meses=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const fechaLabel=dias[dt.getDay()]+' '+dt.getDate()+' de '+meses[dt.getMonth()];
  const rows=mine.map(ps=>{
    const ast=SUPERVISOR_ASISTENCIAS.find(a=>a.supervisorId===svId&&a.servicioId===ps.id&&a.fecha===today);
    let statusHtml='',btnHtml='';
    if(!ast){
      statusHtml=`<span class="badge" style="background:#FEF3C7;color:#92400E;">Sin entrada</span>`;
      btnHtml=`<button class="btn-sm" style="font-size:11px;padding:5px 12px;background:#065041;border-color:#065041;" onclick="marcarEntradaSV(${ps.id})">📍 Marcar entrada</button>`;
    } else if(!ast.salida){
      statusHtml=`<span class="badge" style="background:#D1FAE5;color:#065F46;font-weight:600;">⏱ En servicio · ${ast.entrada}</span>`;
      btnHtml=`<button class="btn-sm" style="font-size:11px;padding:5px 12px;background:#B91C1C;border-color:#B91C1C;" onclick="marcarSalidaSV(${ps.id})">🏁 Marcar salida</button>`;
    } else {
      statusHtml=`<span class="badge" style="background:#D1FAE5;color:#065F46;font-weight:600;">✅ ${ast.entrada} → ${ast.salida} (${_fmtDur(ast.duracion)})</span>`;
    }
    return`<div style="display:flex;align-items:center;justify-content:space-between;padding:11px 0;border-bottom:.5px solid #E6F1FB;gap:10px;flex-wrap:wrap;">
      <div style="flex:1;min-width:0;">
        <p style="font-size:13px;font-weight:600;color:#042C53;margin:0;">${ps.folio||'INM'} — ${ps.cliente.nombre} · ${ps.inmueble.direccion}</p>
        <p style="font-size:11px;color:#185FA5;margin:2px 0 0;">${ps.tipo}</p>
      </div>
      <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">${statusHtml}${btnHtml}</div>
    </div>`;
  }).join('');
  el.innerHTML=`<div class="card" style="margin-bottom:12px;">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;">
      <p class="ctitle" style="margin:0;">📋 Asistencia de hoy</p>
      <span style="font-size:11px;color:#5C7A9A;">${fechaLabel}</span>
    </div>${rows}
  </div>`;
}

/* ── Renderizado supervisor: solo servicios activos ── */
function renderSVInmuebles(){
  const list=document.getElementById('sv-prop-list');
  if(!list)return;
  const mySvId=currentSupervisorRef?currentSupervisorRef.id:0;
  const mine=PROPERTY_SERVICES.filter(ps=>ps.supervisorId===mySvId&&ps.status==='activo');
  if(!mine.length){
    list.innerHTML=`<div style="text-align:center;padding:30px 0;color:#5C7A9A;font-size:13px;">No tienes servicios activos asignados.</div>`;
    return;
  }
  const rows=mine.map(ps=>buildInmRowSV(ps)).join('');
  list.innerHTML=`<div class="inm-group-body" style="border:.5px solid var(--blue-border);border-radius:10px;overflow:hidden;">${rows}</div>`;
  _restoreOpenRows('#sv-prop-list');
}

/* ── Crear contrato ── */
function _gv(id){return(document.getElementById(id)||{}).value?.trim()||'';}

/* Muestra/oculta el campo de texto libre cuando se selecciona "Otro" en tipo de inmueble */
function toggleTipoOtro(selId, inputId){
  const sel=document.getElementById(selId);
  const inp=document.getElementById(inputId);
  if(!sel||!inp)return;
  inp.style.display=sel.value==='Otro'?'':'none';
  if(sel.value!=='Otro')inp.value='';
}

function clearPropForm(){
  ['inm-cli-nombre','inm-cli-contacto','inm-cli-tel','inm-cli-email','inm-cli-pass','inm-direccion','inm-colonia',
   'inm-svc-tipo','inm-svc-desc','inm-notas','inm-fiscal-razon','inm-fiscal-rfc',
   'inm-fiscal-regimen','inm-fiscal-cfdi','inm-fiscal-dir','inm-fecha-inicio','inm-fecha-fin','inm-pago-monto'].forEach(id=>{
    const el=document.getElementById(id);if(el)el.value='';
  });
  ['inm-m2'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  // Resetear tipo inmueble y ocultar campo "Otro"
  const tipoSel=document.getElementById('inm-tipo');if(tipoSel)tipoSel.value='Oficina';
  const tipoOtro=document.getElementById('inm-tipo-otro');if(tipoOtro){tipoOtro.value='';tipoOtro.style.display='none';}
}

function createPropertyService(){
  const nombre=_gv('inm-cli-nombre');
  const dir=_gv('inm-direccion');
  const svcTipo=_gv('inm-svc-tipo');
  const fechaInicio=_gv('inm-fecha-inicio');
  if(!nombre){showToast('amber','⚠️','Ingresa el nombre del cliente o empresa');return;}
  if(!dir){showToast('amber','⚠️','Ingresa la dirección del inmueble');return;}
  if(!svcTipo){showToast('amber','⚠️','Ingresa el tipo de servicio');return;}
  if(!fechaInicio){showToast('amber','⚠️','Selecciona la fecha de inicio del contrato');return;}

  const newId=PROPERTY_SERVICES.length?Math.max(...PROPERTY_SERVICES.map(p=>p.id))+1:0;
  const folio='INM-'+String(newId+1).padStart(3,'0');
  const today=new Date().toISOString().split('T')[0];
  const supId=parseInt((document.getElementById('inm-supervisor-sel')||{}).value)||0;
  const monto=parseFloat((document.getElementById('inm-pago-monto')||{}).value)||0;
  const m2=parseInt((document.getElementById('inm-m2')||{}).value)||0;

  PROPERTY_SERVICES.push({
    id:newId,folio,
    tipo:svcTipo,
    descripcion:_gv('inm-svc-desc'),
    cliente:{nombre,contacto:_gv('inm-cli-contacto'),tel:_gv('inm-cli-tel'),email:_gv('inm-cli-email')},
    inmueble:{tipo:(()=>{const _s=(document.getElementById('inm-tipo')||{}).value||'Oficina';return _s==='Otro'?(_gv('inm-tipo-otro')||'Otro'):_s;})(),
              direccion:dir,colonia:_gv('inm-colonia'),m2},
    frecuencia:(document.getElementById('inm-frecuencia')||{}).value||'única',
    fechaInicio,
    fechaFin:_gv('inm-fecha-fin'),
    hora:(document.getElementById('inm-hora')||{}).value||'08:00',
    status:'pendiente',
    contratoStatus:(document.getElementById('inm-contrato-status')||{}).value||'por_firmar',
    supervisorId:supId,
    pago:{
      metodo:(document.getElementById('inm-pago-metodo')||{}).value||'transferencia',
      periodicidad:(document.getElementById('inm-pago-periodicidad')||{}).value||'única',
      monto,
    },
    fiscal:{
      razonSocial:_gv('inm-fiscal-razon'),
      rfc:_gv('inm-fiscal-rfc').toUpperCase(),
      regimen:_gv('inm-fiscal-regimen'),
      usoCFDI:_gv('inm-fiscal-cfdi'),
      dirFiscal:_gv('inm-fiscal-dir'),
    },
    notas:_gv('inm-notas'),
    reportes:[],
    parentId:null,renovadoPor:null,createdAt:today,
  });

  /* ── Acceso al sistema para cliente inmuebles (opcional) ── */
  const ciPass=_gv('inm-cli-pass');
  const ciEmail=_gv('inm-cli-email');
  if(ciEmail&&ciPass){
    if(ciPass.length<6){showToast('amber','⚠️','La contraseña del cliente debe tener al menos 6 caracteres');return;}
    if(USERS.find(u=>u.email===ciEmail)){
      /* Correo ya registrado — solo vincular contrato */
      const existCI=CLIENTS_INM.find(c=>c.email===ciEmail);
      if(existCI){existCI.contratoId=newId;PROPERTY_SERVICES[PROPERTY_SERVICES.length-1].clienteInmId=existCI.id;}
      showToast('amber','ℹ️',`Correo ya registrado — contrato vinculado a ${ciEmail}`);
    }else{
      const ciNewId=CLIENTS_INM.length?Math.max(...CLIENTS_INM.map(c=>c.id))+1:0;
      const ciUId=USERS.length?Math.max(...USERS.map(u=>u.id))+1:0;
      CLIENTS_INM.push({id:ciNewId,nombre,empresa:_gv('inm-cli-contacto')||nombre,email:ciEmail,password:ciPass,tel:_gv('inm-cli-tel'),contratoId:newId,activo:true,photo:null});
      USERS.push({id:ciUId,nombre,email:ciEmail,rol:'cliente_inm',tel:_gv('inm-cli-tel'),activo:true,accesoRevocado:false,password:ciPass});
      PROPERTY_SERVICES[PROPERTY_SERVICES.length-1].clienteInmId=ciNewId;
      fbSaveClientsInm();fbSaveUsers();
      if(typeof renderAdminClientesInm==='function')renderAdminClientesInm();
      if(typeof renderUsersPanel==='function')renderUsersPanel();
      showToast('green','👤','Acceso al sistema creado para '+nombre);
    }
  }
  pushNotif('supervisor','🏢','blue','Nuevo contrato asignado',`${folio} — ${nombre}`);
  fbSavePropertyServices();
  showToast('green','🏢',`Contrato ${folio} creado y asignado.`);
  /* Geocodificar la dirección en segundo plano para habilitar geo-cerca */
  const _newPs=PROPERTY_SERVICES[PROPERTY_SERVICES.length-1];
  _geocodeInmueble(_newPs).then(ok=>{
    if(ok)showToast('green','📍','Ubicación del inmueble configurada correctamente.');
    else showToast('amber','📍','No se encontraron coordenadas para la dirección. Verifica que sea una dirección válida en México o edita el inmueble para reintentarlo.');
  });
  clearPropForm();
  togglePropForm();
  renderPropServices(_propFilter);
}

/* ── Renovar contrato ── */
function renewContract(id){
  const old=PROPERTY_SERVICES.find(p=>p.id===id);
  if(!old)return;
  const newId=Math.max(...PROPERTY_SERVICES.map(p=>p.id))+1;
  const folio='INM-'+String(newId+1).padStart(3,'0');
  const today=new Date().toISOString().split('T')[0];

  // Calcular nuevas fechas: inicio = fin antiguo + 1 día, misma duración
  let newStart=old.fechaFin||old.fechaInicio||today;
  let newEnd='';
  if(old.fechaInicio&&old.fechaFin){
    const dur=new Date(old.fechaFin)-new Date(old.fechaInicio);
    const ns=new Date(old.fechaFin);ns.setDate(ns.getDate()+1);
    const ne=new Date(ns.getTime()+dur);
    newStart=ns.toISOString().split('T')[0];
    newEnd=ne.toISOString().split('T')[0];
  }

  const newContract={
    id:newId,folio,
    tipo:old.tipo,descripcion:old.descripcion,
    cliente:{...old.cliente},inmueble:{...old.inmueble},
    frecuencia:old.frecuencia,fechaInicio:newStart,fechaFin:newEnd,hora:old.hora,
    status:'pendiente',contratoStatus:'por_firmar',
    supervisorId:old.supervisorId,
    pago:{...(old.pago||{})},
    fiscal:{...(old.fiscal||{})},
    notas:`Renovación del contrato ${old.folio}.`,
    parentId:old.id,renovadoPor:null,createdAt:today,
  };
  PROPERTY_SERVICES.push(newContract);
  old.renovadoPor=newId;
  old.status='vencido';

  pushNotif('supervisor','🔄','blue','Contrato renovado',`${folio} — ${old.cliente.nombre}`);
  fbSavePropertyServices();
  showToast('green','🔄',`Contrato renovado: ${folio}`);
  renderPropServices(_propFilter);
  renderSVInmuebles();
}

/* ── Cambiar estados ── */
function deletePropService(id){
  const idx=PROPERTY_SERVICES.findIndex(p=>p.id===id);
  if(idx===-1)return;
  const nm=PROPERTY_SERVICES[idx].folio;
  fbDeleteDoc('servicios_prop',id); /* eliminar documento de Firestore */
  PROPERTY_SERVICES.splice(idx,1);
  fbSavePropertyServices();
  showToast('amber','🗑',`Contrato ${nm} eliminado`);
  renderPropServices(_propFilter);
}

function updatePropStatus(id,status){
  const ps=PROPERTY_SERVICES.find(p=>p.id===id);
  if(!ps)return;
  ps.status=status;
  fbSavePropertyServices();
  showToast('green','✅',`Servicio: ${statusLabel(status)}`);
  renderPropServices(_propFilter);
  renderSVInmuebles();
}

function updatePropContratoStatus(id,status){
  const ps=PROPERTY_SERVICES.find(p=>p.id===id);
  if(!ps)return;
  ps.contratoStatus=status;
  fbSavePropertyServices();
  showToast('green','📋',`Contrato: ${contratoLabel(status)}`);
  renderPropServices(_propFilter);
  renderSVInmuebles();
}

function svUpdatePropStatus(id,status){
  const ps=PROPERTY_SERVICES.find(p=>p.id===id);
  if(!ps)return;
  ps.status=status;
  pushNotif('admin','🏢','blue','Servicio actualizado',`${ps.folio} — ${statusLabel(status)}`);
  fbSavePropertyServices();
  showToast('green','✅',`Servicio: ${statusLabel(status)}`);
  renderSVInmuebles();
  renderPropServices(_propFilter);
}

/* ═══════════════════════════════════════════
   CLIENTE INMUEBLES — PANEL
   ═══════════════════════════════════════════ */

/* ── helper ── */
function _cinmData(){
  const ci=CLIENTS_INM[currentClientInmId];
  const ps=ci?PROPERTY_SERVICES.find(p=>p.id===ci.contratoId):null;
  return{ci,ps};
}
function _cinmStatusClass(s){return{activo:'cinm-st-activo',pendiente:'cinm-st-pendiente',vencido:'cinm-st-vencido',completado:'cinm-st-vencido'}[s]||'cinm-st-pendiente';}
function _cinmStatusLabel(s){return{activo:'Activo',pendiente:'Pendiente',vencido:'Vencido',completado:'Completado'}[s]||s;}
function _cinmFreqLabel(f){return{diaria:'Diaria',semanal:'Semanal',quincenal:'Quincenal',mensual:'Mensual','única':'Única'}[f]||f;}

/* ── INICIO ── */
function renderClienteInmInicio(){
  const {ci,ps}=_cinmData();
  const el=document.getElementById('cinm-inicio-content');
  if(!el)return;
  if(!ci){el.innerHTML='<div class="card"><p class="csub">Sin datos de usuario.</p></div>';return;}
  if(!ps){el.innerHTML=`<div class="card"><p class="ctitle">Bienvenida, ${ci.nombre.split(' ')[0]} 👋</p><p class="csub">${ci.empresa}</p><div style="text-align:center;padding:2rem;"><span style="font-size:32px;">📄</span><p style="font-size:13px;color:#185FA5;margin-top:8px;">Sin contrato asignado aún.</p></div></div>`;return;}
  const sv=SUPERVISORS.find(s=>s.id===ps.supervisorId);
  const personal=PERSONAL_INM.filter(p=>p.activo&&p.serviciosAsignados.includes(ps.id));
  const reps=(ps.reportes||[]).slice().sort((a,b)=>b.fecha.localeCompare(a.fecha));
  const lastRep=reps[0];
  const navBtn3=`document.querySelectorAll('#nav-cliente_inm .bnav-btn')[2]`;
  el.innerHTML=`
  <div class="card">
    <div class="cinm-welcome-hdr">
      <div>
        <p class="ctitle" style="margin-bottom:2px;">Bienvenida, ${ci.nombre.split(' ')[0]} 👋</p>
        <p class="csub" style="margin-bottom:0;">${ci.empresa}</p>
      </div>
      <span class="cinm-status-badge ${_cinmStatusClass(ps.status)}">${_cinmStatusLabel(ps.status)}</span>
    </div>
    <div class="cinm-summary-row">
      <div class="cinm-summary-item">
        <span class="cinm-si-icon">📄</span>
        <div><p>${ps.folio}</p><span>${ps.tipo}</span></div>
      </div>
      <div class="cinm-summary-item">
        <span class="cinm-si-icon">📅</span>
        <div><p>Vigente hasta</p><span>${formatDateShort(ps.fechaFin)}</span></div>
      </div>
      <div class="cinm-summary-item">
        <span class="cinm-si-icon">🔄</span>
        <div><p>Frecuencia</p><span>${_cinmFreqLabel(ps.frecuencia)}</span></div>
      </div>
      <div class="cinm-summary-item">
        <span class="cinm-si-icon">📋</span>
        <div><p>Visitas</p><span>${reps.length} reportes</span></div>
      </div>
    </div>
  </div>

  <div class="card">
    <p class="cinm-section-title">👁️ Supervisor a cargo</p>
    ${sv?`<div class="cinm-person-card">
      <div class="av" style="width:44px;height:44px;font-size:${sv.photo?'0':'14px'};background:#185FA5;color:#fff;flex-shrink:0;">${sv.photo?'<img src="'+sv.photo+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">':sv.initials}</div>
      <div class="cinm-person-info"><p>${sv.name}</p><span>Supervisor · Zona ${sv.zonas.join(', ')}</span></div>
    </div>`:'<p class="csub">Sin supervisor asignado</p>'}
  </div>

  <div class="card">
    <p class="cinm-section-title">👷 Personal asignado</p>
    ${personal.length?personal.map(p=>`<div class="cinm-person-card">
      <div class="av" style="width:44px;height:44px;font-size:${p.photo?'0':'14px'};flex-shrink:0;">${p.photo?'<img src="'+p.photo+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">':p.initials}</div>
      <div class="cinm-person-info"><p>${p.nombre}</p><span>Personal de inmuebles · ${p.tel}</span></div>
    </div>`).join(''):'<p class="csub">Sin personal asignado aún.</p>'}
  </div>

  ${lastRep?`<div class="card">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;">
      <p class="cinm-section-title" style="margin-bottom:0;">📋 Último reporte de visita</p>
      <button class="btn-sm" onclick="navGo('cliente_inm','reportes',${navBtn3})">Ver todos →</button>
    </div>
    <div class="cinm-last-report">
      <div class="cinm-lr-date">
        <span class="cinm-lr-day">${new Date(lastRep.fecha+'T12:00:00').getDate()}</span>
        <span class="cinm-lr-month">${new Date(lastRep.fecha+'T12:00:00').toLocaleDateString('es-MX',{month:'short'}).replace('.','')}</span>
      </div>
      <div class="cinm-lr-info">
        <p>👁️ ${lastRep.supervisorNombre}</p>
        <span>${lastRep.actividades.slice(0,100)}${lastRep.actividades.length>100?'…':''}</span>
      </div>
    </div>
  </div>`:''}`;
}

/* ── CONTRATO ── */
function renderClienteInmContrato(){
  const {ci,ps}=_cinmData();
  const el=document.getElementById('cinm-contrato-content');
  if(!el)return;
  if(!ps){el.innerHTML='<div class="card"><p class="ctitle">Sin contrato asignado</p><p class="csub">Contacta al administrador.</p></div>';return;}
  const cs={firmado:'✅ Firmado',por_firmar:'⏳ Por firmar',sin_contrato:'📄 Sin contrato'}[ps.contratoStatus]||ps.contratoStatus;
  el.innerHTML=`<div class="card">
    <div class="cinm-contract-header">
      <div><p class="ctitle" style="margin-bottom:2px;">${ps.folio}</p><p class="csub" style="margin-bottom:0;">${ps.tipo}</p></div>
      <span class="cinm-status-badge ${_cinmStatusClass(ps.status)}">${_cinmStatusLabel(ps.status)}</span>
    </div>

    <p class="cinm-section-title">🏢 Inmueble</p>
    <div class="cinm-detail-grid">
      <div class="cinm-dg-item"><span>Tipo</span><p>${ps.inmueble.tipo}</p></div>
      <div class="cinm-dg-item"><span>Superficie</span><p>${ps.inmueble.m2} m²</p></div>
      <div class="cinm-dg-item cinm-full"><span>Dirección</span><p>${ps.inmueble.direccion}</p></div>
      <div class="cinm-dg-item cinm-full"><span>Colonia</span><p>${ps.inmueble.colonia}</p></div>
    </div>

    <div class="div" style="margin:12px 0;"></div>
    <p class="cinm-section-title">🧹 Servicio</p>
    <div class="cinm-detail-grid">
      <div class="cinm-dg-item"><span>Frecuencia</span><p>${_cinmFreqLabel(ps.frecuencia)}</p></div>
      <div class="cinm-dg-item"><span>Hora</span><p>${ps.hora} hrs</p></div>
      <div class="cinm-dg-item"><span>Inicio</span><p>${formatDateShort(ps.fechaInicio)}</p></div>
      <div class="cinm-dg-item"><span>Fin</span><p>${formatDateShort(ps.fechaFin)}</p></div>
      <div class="cinm-dg-item cinm-full"><span>Descripción</span><p>${ps.descripcion}</p></div>
    </div>

    <div class="div" style="margin:12px 0;"></div>
    <p class="cinm-section-title">💳 Pago</p>
    <div class="cinm-detail-grid">
      <div class="cinm-dg-item"><span>Monto</span><p>$${ps.pago.monto.toLocaleString('es-MX')}</p></div>
      <div class="cinm-dg-item"><span>Periodicidad</span><p>${ps.pago.periodicidad}</p></div>
      <div class="cinm-dg-item"><span>Método</span><p>${{transferencia:'Transferencia',cheque:'Cheque',efectivo:'Efectivo',tarjeta:'Tarjeta'}[ps.pago.metodo]||ps.pago.metodo}</p></div>
    </div>

    <div class="div" style="margin:12px 0;"></div>
    <p class="cinm-section-title">📋 Contrato</p>
    <div class="cinm-detail-grid">
      <div class="cinm-dg-item cinm-full"><span>Estatus del contrato</span><p>${cs}</p></div>
    </div>

    ${ps.notas?`<div class="div" style="margin:12px 0;"></div>
    <p class="cinm-section-title">📝 Notas del servicio</p>
    <div style="background:#EEF5FF;border-radius:8px;padding:10px 12px;font-size:13px;color:#042C53;line-height:1.6;">${ps.notas}</div>`:''}
  </div>`;
}

/* ── REPORTES cliente_inm ── */
let _cinmRptFilter='mes';
let _cinmRptFrom='';
let _cinmRptTo='';

function _cinmGetFilteredReps(allReps){
  const now=new Date();
  let filtered=allReps,label='';
  if(_cinmRptFilter==='quincena'){
    const d=now.getDate(),y=now.getFullYear(),m=now.getMonth();
    let from,to;
    if(d<=15){
      from=`${y}-${String(m+1).padStart(2,'0')}-01`;
      to=`${y}-${String(m+1).padStart(2,'0')}-15`;
      label=`1ª quincena de ${now.toLocaleDateString('es-MX',{month:'long',year:'numeric'})}`;
    } else {
      from=`${y}-${String(m+1).padStart(2,'0')}-16`;
      to=new Date(y,m+1,0).toISOString().split('T')[0];
      label=`2ª quincena de ${now.toLocaleDateString('es-MX',{month:'long',year:'numeric'})}`;
    }
    filtered=allReps.filter(r=>r.fecha>=from&&r.fecha<=to);
  } else if(_cinmRptFilter==='mes'){
    const ms=`${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
    filtered=allReps.filter(r=>r.fecha.startsWith(ms));
    label=now.toLocaleDateString('es-MX',{month:'long',year:'numeric'});
  } else if(_cinmRptFilter==='año'){
    const y=String(now.getFullYear());
    filtered=allReps.filter(r=>r.fecha.startsWith(y));
    label=y;
  } else if(_cinmRptFilter==='rango'&&_cinmRptFrom&&_cinmRptTo){
    filtered=allReps.filter(r=>r.fecha>=_cinmRptFrom&&r.fecha<=_cinmRptTo);
    label=`${_cinmRptFrom} al ${_cinmRptTo}`;
  } else {
    label='Todos los reportes';
  }
  return{filtered,label};
}
function switchCinmRptFilter(f){_cinmRptFilter=f;renderClienteInmReportes();}
function applyCinmRptRango(){
  const fEl=document.getElementById('cinm-rpt-from');
  const tEl=document.getElementById('cinm-rpt-to');
  if(!fEl||!tEl||!fEl.value||!tEl.value){showToast('amber','⚠️','Selecciona ambas fechas');return;}
  if(fEl.value>tEl.value){showToast('amber','⚠️','La fecha inicial no puede ser mayor a la final');return;}
  _cinmRptFrom=fEl.value;_cinmRptTo=tEl.value;
  renderClienteInmReportes();
}

function renderClienteInmReportes(){
  const {ci,ps}=_cinmData();
  const el=document.getElementById('cinm-reportes-content');
  if(!el)return;
  if(!ps){el.innerHTML='<div class="card"><p class="ctitle">Sin contrato asignado</p></div>';return;}
  const allReps=(ps.reportes||[]).slice().sort((a,b)=>b.fecha.localeCompare(a.fecha));
  const {filtered,label}=_cinmGetFilteredReps(allReps);
  const tabStyle=(id)=>_cinmRptFilter===id
    ?'background:#042C53;color:#fff;'
    :'background:#EEF5FF;color:#185FA5;';
  const filterBar=`
    <div style="display:flex;gap:5px;margin-bottom:8px;flex-wrap:wrap;">
      <button class="btn-sm" style="${tabStyle('quincena')}font-size:11px;padding:3px 10px;" onclick="switchCinmRptFilter('quincena')">Quincena</button>
      <button class="btn-sm" style="${tabStyle('mes')}font-size:11px;padding:3px 10px;" onclick="switchCinmRptFilter('mes')">Mes</button>
      <button class="btn-sm" style="${tabStyle('año')}font-size:11px;padding:3px 10px;" onclick="switchCinmRptFilter('año')">Año</button>
      <button class="btn-sm" style="${tabStyle('rango')}font-size:11px;padding:3px 10px;" onclick="switchCinmRptFilter('rango')">Rango</button>
    </div>
    ${_cinmRptFilter==='rango'?`<div style="display:flex;gap:6px;align-items:center;margin-bottom:8px;flex-wrap:wrap;">
      <input type="date" id="cinm-rpt-from" value="${_cinmRptFrom}" style="font-size:11px;padding:3px 8px;border:1px solid #D0E3F7;border-radius:6px;">
      <span style="font-size:11px;color:#5C7A9A;">al</span>
      <input type="date" id="cinm-rpt-to" value="${_cinmRptTo}" style="font-size:11px;padding:3px 8px;border:1px solid #D0E3F7;border-radius:6px;">
      <button class="btn-sm" style="background:#042C53;color:#fff;font-size:11px;" onclick="applyCinmRptRango()">Aplicar</button>
    </div>`:''}`;
  const rows=filtered.length?filtered.map(r=>{
    const fd=new Date(r.fecha+'T12:00:00').toLocaleDateString('es-MX',{day:'numeric',month:'short',year:'numeric'});
    const thumbs=(r.fotos&&r.fotos.length)?r.fotos.slice(0,3).map(f=>`<img src="${f}" class="cinm-foto-thumb">`).join('')+(r.fotos.length>3?`<span style="font-size:10px;color:#185FA5;background:#E6F1FB;padding:2px 5px;border-radius:8px;margin-left:4px;">+${r.fotos.length-3}</span>`:''): '';
    const actTxt=r.actividades?r.actividades.slice(0,140)+(r.actividades.length>140?'…':''):'';
    const obsTxt=r.observaciones?r.observaciones.slice(0,120)+(r.observaciones.length>120?'…':''):'';
    return`<div style="padding:9px 0;border-bottom:.5px solid var(--blue-border);">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;margin-bottom:4px;">
        <span style="font-size:12px;font-weight:600;color:#042C53;">📅 ${fd} &nbsp;·&nbsp; 🕒 ${r.hora}</span>
        <span style="font-size:11px;color:#185FA5;flex-shrink:0;">👁️ ${r.supervisorNombre}</span>
      </div>
      ${actTxt?`<p style="font-size:11.5px;color:#1C2B3A;line-height:1.55;margin-bottom:3px;"><span style="font-weight:600;color:#185FA5;">Act:</span> ${actTxt}</p>`:''}
      ${obsTxt?`<p style="font-size:11px;color:#5C7A9A;line-height:1.5;"><span style="font-weight:600;">Obs:</span> ${obsTxt}</p>`:''}
      ${thumbs?`<div class="cinm-fotos-grid" style="margin-top:6px;">${thumbs}</div>`:''}
    </div>`;
  }).join(''):`<div style="text-align:center;padding:1.8rem 1rem;"><span style="font-size:32px;">📋</span><p style="font-size:12px;color:#185FA5;margin-top:8px;">Sin reportes en este periodo.</p></div>`;
  el.innerHTML=`<div class="card">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px;">
      <p class="ctitle" style="margin:0;">📋 Reportes de visita</p>
      ${filtered.length?`<button class="btn-sm" style="background:#042C53;color:#fff;font-size:11px;padding:4px 11px;" onclick="downloadClienteInmPeriodoPDF(${ps.id})">⬇️ PDF</button>`:''}
    </div>
    <p class="csub" style="margin-bottom:10px;">${filtered.length} reporte${filtered.length!==1?'s':''} · ${label} · ${ps.folio}</p>
    ${filterBar}
    ${rows}
  </div>`;
}

function downloadClienteInmPeriodoPDF(psId){
  const ps=PROPERTY_SERVICES.find(p=>p.id===psId);
  if(!ps)return;
  const allReps=(ps.reportes||[]).slice().sort((a,b)=>b.fecha.localeCompare(a.fecha));
  const {filtered,label}=_cinmGetFilteredReps(allReps);
  if(!filtered.length){showToast('amber','⚠️','Sin reportes en este periodo');return;}
  const logoImg=new Image();
  logoImg.crossOrigin='anonymous';
  logoImg.onload=function(){
    const cv=document.createElement('canvas');cv.width=logoImg.width;cv.height=logoImg.height;
    cv.getContext('2d').drawImage(logoImg,0,0);
    _buildClienteInmPeriodoPDF(ps,filtered,label,cv.toDataURL('image/png'));
  };
  logoImg.onerror=function(){_buildClienteInmPeriodoPDF(ps,filtered,label,null);};
  logoImg.src='img/logo.png?v='+Date.now();
}

function _buildClienteInmPeriodoPDF(ps,reps,periodoLabel,logoB64){
  const generadoTxt=new Date().toLocaleDateString('es-MX',{day:'numeric',month:'long',year:'numeric'});
  const logoHtml=logoB64
    ?`<img src="${logoB64}" style="height:48px;width:48px;object-fit:contain;">`
    :`<div style="font-size:20px;font-weight:900;color:#042C53;">AYA<span style="color:#1A56DB;">LYM</span></div>`;
  const reportsHtml=reps.map((r,idx)=>{
    const fechaTxt=new Date(r.fecha+'T12:00:00').toLocaleDateString('es-MX',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
    const fotosHtml=r.fotos&&r.fotos.length
      ?`<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-top:8px;">${r.fotos.map(f=>`<img src="${f}" style="width:100%;height:75px;object-fit:cover;border-radius:5px;border:1px solid #dce8f5;">`).join('')}</div>`
      :'';
    return`<div style="margin-bottom:${idx<reps.length-1?'14px':'0'};padding-bottom:${idx<reps.length-1?'14px':'0'};border-bottom:${idx<reps.length-1?'1px solid #D0E3F7':'none'};">
      <div style="display:flex;align-items:center;gap:8px;background:#F0F4FA;border-radius:6px;padding:6px 12px;margin-bottom:8px;">
        <span style="font-size:11px;font-weight:700;color:#042C53;text-transform:capitalize;flex:1;">${fechaTxt}</span>
        <span style="font-size:10.5px;color:#5C7A9A;">🕒 ${r.hora} hrs</span>
        <span style="font-size:10.5px;color:#1A56DB;">👁️ ${r.supervisorNombre}</span>
        ${r.fotos&&r.fotos.length?`<span style="font-size:10px;color:#185FA5;background:#E6F1FB;padding:1px 7px;border-radius:10px;">📷 ${r.fotos.length}</span>`:''}
      </div>
      ${r.actividades?`<p style="font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#1A56DB;margin-bottom:4px;">Actividades realizadas</p>
      <p style="font-size:11.5px;line-height:1.6;color:#1C2B3A;white-space:pre-wrap;">${r.actividades}</p>`:''}
      ${r.observaciones?`<p style="font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#1A56DB;margin-top:8px;margin-bottom:4px;">Observaciones</p>
      <p style="font-size:11.5px;line-height:1.6;color:#5C7A9A;white-space:pre-wrap;">${r.observaciones}</p>`:''}
      ${fotosHtml}
    </div>`;
  }).join('');
  const html=`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8">
<title>Reportes — ${ps.folio} — ${periodoLabel}</title>
<style>
*{box-sizing:border-box;margin:0;padding:0;}
body{font-family:'Segoe UI',Arial,Helvetica,sans-serif;font-size:12px;color:#1C2B3A;background:#fff;}
.page-header{background:#042C53;padding:13px 26px;display:flex;justify-content:space-between;align-items:center;}
.ph-brand{display:flex;align-items:center;gap:10px;}
.ph-brand-text h1{font-size:16px;font-weight:800;color:#fff;}
.ph-brand-text p{font-size:9.5px;color:rgba(255,255,255,.6);text-transform:uppercase;letter-spacing:.4px;margin-top:1px;}
.ph-right{text-align:right;}
.ph-right h2{font-size:13px;font-weight:700;color:#fff;margin-bottom:2px;}
.ph-right p{font-size:10px;color:rgba(255,255,255,.6);}
.info-bar{background:#F0F4FA;border-bottom:1px solid #D8E5F3;padding:6px 26px;display:flex;align-items:center;gap:14px;flex-wrap:wrap;}
.info-bar span{font-size:10.5px;color:#5C7A9A;}
.info-bar strong{color:#042C53;font-weight:600;}
.body{padding:14px 26px 12px;}
.sec-title{font-size:9.5px;font-weight:700;text-transform:uppercase;letter-spacing:.8px;color:#1A56DB;padding-bottom:4px;border-bottom:1.5px solid #D0E3F7;margin-bottom:12px;}
.page-footer{background:#F0F4FA;border-top:1px solid #D0E3F7;padding:6px 26px;display:flex;justify-content:space-between;align-items:center;margin-top:14px;}
.page-footer span{font-size:9.5px;color:#8A9BB0;}
.page-footer strong{color:#1A56DB;font-weight:600;}
@media print{body,.page-header,.info-bar,.page-footer{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}
</style></head><body>
<div class="page-header">
  <div class="ph-brand">${logoHtml}<div class="ph-brand-text"><h1>AYALYM</h1><p>Servicios de limpieza profesional</p></div></div>
  <div class="ph-right"><h2>Reportes de Visita</h2><p>Periodo: ${periodoLabel}</p></div>
</div>
<div class="info-bar">
  <span>Folio: <strong>${ps.folio}</strong></span>
  <span>Cliente: <strong>${ps.cliente.nombre}</strong></span>
  <span>Inmueble: <strong>${ps.inmueble.direccion}</strong></span>
  <span>Total: <strong>${reps.length} reporte${reps.length!==1?'s':''}</strong></span>
</div>
<div class="body">
  <div class="sec-title">Detalle de reportes — ${periodoLabel}</div>
  ${reportsHtml}
</div>
<div class="page-footer">
  <span>AYALYM · Servicios de limpieza profesional</span>
  <span>Folio: <strong>${ps.folio}</strong> &nbsp;·&nbsp; ${periodoLabel} &nbsp;·&nbsp; Generado: ${generadoTxt}</span>
</div>
<script>window.onload=function(){window.print();}<\/script>
</body></html>`;
  const w=window.open('','_blank');
  if(!w){showToast('amber','⚠️','Permite ventanas emergentes para generar el PDF');return;}
  w.document.write(html);
  w.document.close();
}

/* ── PERFIL ── */
function renderClienteInmPerfil(){
  const {ci}=_cinmData();
  const el=document.getElementById('cinm-perfil-content');
  if(!el||!ci)return;
  const init=ci.nombre.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
  const cinmPhotoHtml=ci.photo
    ?`<div class="av-photo-wrap" style="position:relative;cursor:pointer;flex-shrink:0;" onclick="uploadCinmPhoto()" title="Cambiar foto"><div class="av" style="width:56px;height:56px;font-size:0;background:#065535;color:#fff;overflow:hidden;"><img src="${ci.photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"></div><div class="av-photo-badge">📷</div></div>`
    :`<div class="av-photo-wrap" style="position:relative;cursor:pointer;flex-shrink:0;" onclick="uploadCinmPhoto()" title="Subir foto de perfil"><div class="av" style="width:56px;height:56px;font-size:18px;background:#065535;color:#fff;">${init}</div><div class="av-photo-badge">📷</div></div>`;
  el.innerHTML=`<div class="card">
    <p class="ctitle">👤 Mi perfil</p>
    <div class="cinm-profile-hdr">
      ${cinmPhotoHtml}
      <div><p style="font-size:15px;font-weight:600;color:#042C53;">${ci.nombre}</p><p style="font-size:12px;color:#185FA5;">${ci.empresa}</p></div>
    </div>
    <div class="cinm-detail-grid" style="margin-top:14px;">
      <div class="cinm-dg-item cinm-full"><span>Correo</span><p>${ci.email}</p></div>
      <div class="cinm-dg-item cinm-full"><span>Teléfono</span><p>${ci.tel||'—'}</p></div>
    </div>
    <div class="div" style="margin:14px 0;"></div>
    <p style="font-size:12px;font-weight:600;color:#042C53;margin-bottom:10px;">🔑 Cambiar contraseña</p>
    <div class="fld"><label>Contraseña actual</label><input type="password" id="cinm-cp-curr" placeholder="••••••••"></div>
    <div class="fld"><label>Nueva contraseña</label><input type="password" id="cinm-cp-new1" placeholder="Mínimo 6 caracteres"></div>
    <div class="fld" style="margin-bottom:14px;"><label>Confirmar nueva contraseña</label><input type="password" id="cinm-cp-new2" placeholder="••••••••"></div>
    <button class="btn-royal" style="width:100%;" onclick="changePasswordClienteInm()">Actualizar contraseña</button>
  </div>`;
}

function changePasswordClienteInm(){
  const ci=CLIENTS_INM[currentClientInmId];if(!ci)return;
  const curr=(document.getElementById('cinm-cp-curr')||{}).value||'';
  const n1=(document.getElementById('cinm-cp-new1')||{}).value||'';
  const n2=(document.getElementById('cinm-cp-new2')||{}).value||'';
  if(!curr||!n1||!n2){showToast('amber','⚠️','Completa todos los campos');return;}
  if(curr!==ci.password){showToast('red','❌','Contraseña actual incorrecta');return;}
  if(n1.length<6){showToast('amber','⚠️','Mínimo 6 caracteres');return;}
  if(n1!==n2){showToast('amber','⚠️','Las contraseñas no coinciden');return;}
  ci.password=n1;
  const user=USERS.find(u=>u.email===ci.email);if(user)user.password=n1;
  showToast('green','✅','Contraseña actualizada correctamente');
  renderClienteInmPerfil();
}

/* ── ASISTENCIAS ── */
let _attTabId=null; // trabajador seleccionado actualmente

/* ── Filtros de asistencia: estado compartido ── */
let _attFilterState={};
function _getAttF(k){if(!_attFilterState[k]){const _n=new Date();_attFilterState[k]={mode:'mes',q:_n.getDate()<=15?1:2,mes:_n.getMonth()+1,año:_n.getFullYear(),from:'',to:''};} return _attFilterState[k];}
function _filterAsisByPeriod(asis,f){
  const{mode,from,to,q,mes,año}=f;
  const my=`${año}-${String(mes).padStart(2,'0')}`;
  if(mode==='quincena'){
    const isF=(q||1)===1;
    const lastDay=new Date(año,mes,0).getDate();
    const qf=my+'-'+(isF?'01':'16');
    const qt=my+'-'+(isF?'15':String(lastDay).padStart(2,'0'));
    return asis.filter(a=>a.fecha>=qf&&a.fecha<=qt);
  }
  if(mode==='mes')return asis.filter(a=>a.fecha.startsWith(my));
  if(mode==='año')return asis.filter(a=>a.fecha.startsWith(String(año)));
  if(mode==='rango'&&from&&to)return asis.filter(a=>a.fecha>=from&&a.fecha<=to);
  return asis;
}
const _MESES_ATT=['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
const _DIAS_C_ATT=['dom','lun','mar','mié','jue','vie','sáb'];
function _attFilterLabel(k){
  const{mode,from,to,q,mes,año}=_getAttF(k);
  const mn=_MESES_ATT[(mes||1)-1];
  if(mode==='quincena')return`Quincena ${(q||1)===1?'1–15':'16–fin'} ${mn} ${año}`;
  if(mode==='mes')return`${mn} ${año}`;
  if(mode==='año')return`Año ${año}`;
  if(mode==='rango'&&from&&to)return`${from.split('-').reverse().join('/')} → ${to.split('-').reverse().join('/')}`;
  return'Todo';
}
function _attFilterBarHtml(k,modeFn,rangeFn){
  const f=_getAttF(k);
  const{mode,q,mes,año,from,to}=f;
  const pills=[['quincena','Quincena'],['mes','Mes'],['año','Año'],['rango','Rango']].map(([id,lbl])=>
    `<button class="att-filter-pill${mode===id?' att-filter-pill--active':''}" onclick="${modeFn}('${id}','${k}')">${lbl}</button>`).join('');
  const curY=new Date().getFullYear();
  const yOpts=[curY,curY-1,curY-2,curY-3].map(y=>`<option value="${y}"${y===año?' selected':''}>${y}</option>`).join('');
  const mOpts=_MESES_ATT.map((mn,i)=>`<option value="${i+1}"${i+1===mes?' selected':''}>${mn}</option>`).join('');
  let sel='';
  if(mode==='quincena')sel=`<div class="att-period-sel"><select onchange="_setAttVal('${k}','q',+this.value);_reRenderAttByKey('${k}')"><option value="1"${(q||1)===1?' selected':''}>1ra quincena (1–15)</option><option value="2"${(q||1)===2?' selected':''}>2da quincena (16–fin)</option></select><select onchange="_setAttVal('${k}','mes',+this.value);_reRenderAttByKey('${k}')">${mOpts}</select><select onchange="_setAttVal('${k}','año',+this.value);_reRenderAttByKey('${k}')">${yOpts}</select></div>`;
  else if(mode==='mes')sel=`<div class="att-period-sel"><select onchange="_setAttVal('${k}','mes',+this.value);_reRenderAttByKey('${k}')">${mOpts}</select><select onchange="_setAttVal('${k}','año',+this.value);_reRenderAttByKey('${k}')">${yOpts}</select></div>`;
  else if(mode==='año')sel=`<div class="att-period-sel"><select onchange="_setAttVal('${k}','año',+this.value);_reRenderAttByKey('${k}')">${yOpts}</select></div>`;
  else if(mode==='rango')sel=`<div class="att-filter-range"><input type="date" value="${from}" onchange="_setAttRange('${k}','from',this.value)"><span>→</span><input type="date" value="${to}" onchange="_setAttRange('${k}','to',this.value)"><button class="btn-sm" onclick="${rangeFn}('${k}')">Aplicar</button></div>`;
  return`<div class="att-filter-bar">${pills}</div>${sel}`;
}
function _setAttRange(k,field,val){_getAttF(k)[field]=val;}
function _setAttVal(k,field,val){_getAttF(k)[field]=val;}
function _reRenderAttByKey(k){
  if(k.startsWith('pi_')){renderPIAsistencias();return;}
  if(k==='cinm'){const{ps}=_cinmData();if(ps){const pers=PERSONAL_INM.filter(p=>p.serviciosAsignados.includes(ps.id));_renderAttPanel(pers);}return;}
  if(k.startsWith('sv_')){_reRenderSvAtt(k);return;}
  if(k.startsWith('adm_')){_reRenderAdmAtt(k);return;}
}
function _buildAttRowsHtml(asis){
  if(!asis.length)return`<div class="att-empty-state">Sin registros en el período seleccionado</div>`;
  const tmn=t=>{if(!t)return null;const[h,m]=t.split(':').map(Number);return h*60+m;};
  const dStr=(e,s)=>{const d=(tmn(s)||0)-(tmn(e)||0);if(d<=0)return null;const h=Math.floor(d/60),m=d%60;return h>0?(m>0?`${h}h ${m}m`:`${h}h`):`${m}m`;};
  return asis.slice().sort((a,b)=>b.fecha.localeCompare(a.fecha)).map(a=>{
    const dt=new Date(a.fecha+'T12:00:00'),dur=a.salida?dStr(a.entrada,a.salida):null;
    return`<div class="att-row"><div class="att-date"><span class="att-wd">${_DIAS_C_ATT[dt.getDay()]}</span><span class="att-dd">${dt.getDate()}</span></div><div class="att-shift"><div class="att-time-in"><span class="att-time-label">Entrada</span><span class="att-time-val">${a.entrada}</span></div><div class="att-separator"><div class="att-line"></div></div><div class="att-time-out"><span class="att-time-label">Salida</span><span class="att-time-val">${a.salida||'—'}</span></div></div><div class="att-dur${!dur?' att-dur--empty':''}">${dur||'—'}</div></div>`;
  }).join('');
}
function _downloadAsisPDF(asis,workerName,label,ps){
  const logoImg=new Image();
  logoImg.crossOrigin='anonymous';
  logoImg.onload=function(){
    const cv=document.createElement('canvas');cv.width=logoImg.width;cv.height=logoImg.height;
    cv.getContext('2d').drawImage(logoImg,0,0);
    _renderAsisPDF(asis,workerName,label,ps,cv.toDataURL('image/png'));
  };
  logoImg.onerror=function(){_renderAsisPDF(asis,workerName,label,ps,null);};
  logoImg.src='img/logo.png?v='+Date.now();
}
function _renderAsisPDF(asis,workerName,label,ps,logoB64){
  const generado=new Date().toLocaleDateString('es-MX',{day:'numeric',month:'long',year:'numeric'});
  const tmn=t=>{if(!t)return null;const[h,m]=t.split(':').map(Number);return h*60+m;};
  const dStrMin=min=>{if(!min)return'—';const h=Math.floor(min/60),m=min%60;return h>0?(m>0?`${h}h ${m}m`:`${h}h`):`${m}m`;};
  const cmpl=asis.filter(a=>a.salida);
  const avgMin=cmpl.length?Math.round(cmpl.reduce((s,a)=>{const d=(tmn(a.salida)||0)-(tmn(a.entrada)||0);return s+(d>0?d:0);},0)/cmpl.length):0;
  const rows=[...asis].sort((a,b)=>a.fecha.localeCompare(b.fecha)).map(a=>{
    const dt=new Date(a.fecha+'T12:00:00');
    const durMin=a.salida?(()=>{const d=(tmn(a.salida)||0)-(tmn(a.entrada)||0);return d>0?d:0;})():0;
    return`<tr><td>${dt.getDate()} ${_MESES_ATT[dt.getMonth()].slice(0,3)} ${dt.getFullYear()}</td><td style="text-transform:capitalize;">${dt.toLocaleDateString('es-MX',{weekday:'long'})}</td><td>${a.entrada||'—'}</td><td>${a.salida||'—'}</td><td>${a.salida?dStrMin(durMin):'En curso'}</td></tr>`;
  }).join('');
  const psRow=ps?`<tr><td>Contrato</td><td>${ps.folio} — ${ps.cliente.nombre}</td></tr>`:'';
  const logoHtml=logoB64
    ?`<img src="${logoB64}" style="height:52px;width:52px;object-fit:contain;border-radius:6px;">`
    :`<div style="font-size:22px;font-weight:900;color:#fff;letter-spacing:-1px;">AYA<span style="color:#5B9FE8;">LYM</span></div>`;
  const w=window.open('','_blank','width=860,height=720');if(!w)return;
  w.document.write(`<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>Asistencias — ${workerName}</title><style>*{box-sizing:border-box;margin:0;padding:0;}body{font-family:'Segoe UI',Arial,sans-serif;font-size:13px;color:#1C2B3A;}.hdr{background:#042C53;padding:18px 36px;display:flex;justify-content:space-between;align-items:center;color:#fff;}.hdr-brand{display:flex;align-items:center;gap:13px;}.hdr-brand h1{font-size:20px;font-weight:800;letter-spacing:.5px;line-height:1;}.hdr-sub{font-size:10px;color:rgba(255,255,255,.5);text-transform:uppercase;letter-spacing:.5px;margin-top:3px;}.hdr-r{text-align:right;}.hdr-r h2{font-size:14px;font-weight:700;}.hdr-r p{font-size:10px;color:rgba(255,255,255,.5);margin-top:3px;}.meta{background:#F0F4FA;border-bottom:1px solid #D8E5F3;padding:10px 36px;}.meta table{width:100%;border-collapse:collapse;font-size:12px;}.meta td{padding:4px 6px;}.meta td:first-child{font-weight:600;color:#5C7A9A;width:130px;}.stats{display:flex;border-bottom:1px solid #D8E5F3;}.stat{flex:1;padding:12px 0;text-align:center;border-right:1px solid #D8E5F3;}.stat:last-child{border-right:none;}.sv{font-size:20px;font-weight:700;color:#042C53;}.sl{font-size:10px;color:#8A9BB0;text-transform:uppercase;letter-spacing:.4px;margin-top:2px;}.body{padding:16px 36px;}h3{font-size:12px;font-weight:700;color:#5C7A9A;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px;}table.tbl{width:100%;border-collapse:collapse;font-size:12px;}table.tbl thead th{background:#F0F4FA;color:#5C7A9A;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;padding:8px;border-bottom:1.5px solid #D8E5F3;text-align:left;}table.tbl tbody tr:nth-child(even){background:#F8FAFB;}table.tbl tbody td{padding:7px 8px;border-bottom:.5px solid #E8EEF7;}.ftr{padding:10px 36px;background:#F0F4FA;border-top:1px solid #D8E5F3;font-size:10px;color:#8A9BB0;display:flex;justify-content:space-between;margin-top:16px;}@media print{body,.hdr,.meta,.stats,.ftr{-webkit-print-color-adjust:exact;print-color-adjust:exact;}}</style></head><body>
<div class="hdr"><div class="hdr-brand">${logoHtml}<div><h1>AYALYM</h1><p class="hdr-sub">Limpieza profesional</p></div></div><div class="hdr-r"><h2>Reporte de Asistencias</h2><p>Generado: ${generado}</p></div></div>
<div class="meta"><table><tbody><tr><td>Trabajador</td><td>${workerName}</td></tr><tr><td>Período</td><td>${label}</td></tr>${psRow}</tbody></table></div>
<div class="stats"><div class="stat"><div class="sv">${asis.length}</div><div class="sl">Registros</div></div><div class="stat"><div class="sv">${cmpl.length}</div><div class="sl">Completos</div></div><div class="stat"><div class="sv">${asis.length-cmpl.length}</div><div class="sl">Sin salida</div></div><div class="stat"><div class="sv">${dStrMin(avgMin)}</div><div class="sl">Promedio turno</div></div></div>
<div class="body"><h3>Detalle de registros</h3><table class="tbl"><thead><tr><th>Fecha</th><th>Día</th><th>Entrada</th><th>Salida</th><th>Duración</th></tr></thead><tbody>${rows||'<tr><td colspan="5" style="text-align:center;color:#8A9BB0;padding:16px;">Sin registros en el período.</td></tr>'}</tbody></table></div>
<div class="ftr"><span>AYALYM — Sistema de gestión</span><span>${workerName} · ${label}</span></div>
<script>window.onload=function(){window.print();}<\/script></body></html>`);
  w.document.close();
}

function renderClienteInmAsistencias(){
  const {ci,ps}=_cinmData();
  const el=document.getElementById('cinm-asistencias-content');
  if(!el)return;
  if(!ps){el.innerHTML='<div class="card"><p class="ctitle">Sin contrato asignado</p></div>';return;}

  /* ── Sección: asistencias del supervisor ── */
  const svAsts=SUPERVISOR_ASISTENCIAS.filter(a=>a.servicioId===ps.id).sort((a,b)=>b.fecha.localeCompare(a.fecha));
  const svSection=(()=>{
    if(!svAsts.length) return `<div class="card" style="margin-bottom:12px;"><p class="ctitle">👔 Visitas del supervisor</p><p style="font-size:13px;color:#185FA5;text-align:center;padding:1rem 0;">Sin visitas registradas aún.</p></div>`;
    const _fmtDs=d=>{const dt=new Date(d+'T12:00:00');return dt.getDate()+'/'+(dt.getMonth()+1)+'/'+dt.getFullYear();};
    const rows=svAsts.slice(0,15).map(a=>{
      const done=a.entrada&&a.salida;
      const inProg=a.entrada&&!a.salida;
      return`<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:.5px solid #E6F1FB;flex-wrap:wrap;gap:8px;">
        <div><p style="font-size:13px;font-weight:600;color:#042C53;margin:0;">${_fmtDs(a.fecha)}</p>
          <p style="font-size:11px;color:#185FA5;margin:2px 0 0;">${a.supervisorNombre}</p></div>
        <div>${done
          ?`<span class="badge" style="background:#D1FAE5;color:#065F46;font-weight:600;">✅ ${a.entrada} → ${a.salida} (${_fmtDur(a.duracion)})</span>`
          :inProg
            ?`<span class="badge" style="background:#FEF3C7;color:#92400E;">⏱ En servicio · ${a.entrada}</span>`
            :`<span class="badge" style="background:#F3F4F6;color:#6B7280;">Sin registro</span>`
        }</div>
      </div>`;}).join('');
    return`<div class="card" style="margin-bottom:12px;">
      <p class="ctitle">👔 Visitas del supervisor</p>
      <p class="csub" style="margin-bottom:10px;">Últimas ${Math.min(svAsts.length,15)} visitas registradas</p>
      ${rows}
    </div>`;
  })();

  const personal=PERSONAL_INM.filter(p=>p.serviciosAsignados.includes(ps.id));
  if(!personal.length){
    el.innerHTML=svSection+'<div class="card"><p class="ctitle">Asistencias del personal</p><div style="text-align:center;padding:2.5rem 1rem;"><span style="font-size:36px;">👷</span><p style="font-size:13px;color:#185FA5;margin-top:10px;">Sin personal asignado a este contrato.</p></div></div>';
    return;
  }

  // Seleccionar primera pestaña si no hay ninguna o ya no existe
  if(_attTabId===null||!personal.find(p=>p.id===_attTabId)) _attTabId=personal[0].id;

  // Renderizar el contenedor con pestañas + panel
  el.innerHTML=svSection+`
    <div class="card att-card" style="padding-bottom:8px;">
      <p class="ctitle" style="margin-bottom:12px;">🕐 Asistencias del personal</p>
      <div class="att-tabs" id="att-tab-bar">
        ${personal.map(p=>`
          <button class="att-tab${p.id===_attTabId?' att-tab--active':''}"
            onclick="_selectAttTab(${p.id})">
            <span class="att-tab-av" style="${p.photo?'padding:0;font-size:0;overflow:hidden;':''}">${p.photo?`<img src="${p.photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`:p.initials}</span>
            <span class="att-tab-name">${p.nombre.split(' ')[0]}</span>
          </button>`).join('')}
      </div>
      <div id="att-panel"></div>
    </div>`;

  _renderAttPanel(personal);
}

function _selectAttTab(id){
  _attTabId=id;
  const {ps}=_cinmData();
  const personal=PERSONAL_INM.filter(p=>p.serviciosAsignados.includes(ps.id));
  // Actualizar estilos de tabs
  document.querySelectorAll('#att-tab-bar .att-tab').forEach(btn=>{
    const match=parseInt(btn.getAttribute('onclick').match(/\d+/)[0])===id;
    btn.classList.toggle('att-tab--active',match);
  });
  _renderAttPanel(personal);
}

function _renderAttPanel(personal){
  const panel=document.getElementById('att-panel');
  if(!panel)return;
  const p=personal.find(x=>x.id===_attTabId);
  if(!p){panel.innerHTML='';return;}

  const {ps}=_cinmData();
  const label=_attFilterLabel('cinm');

  /* helpers */
  const timeToMin=t=>{if(!t)return null;const[h,m]=t.split(':').map(Number);return h*60+m;};
  const durStr=(e,s)=>{
    const d=(timeToMin(s)||0)-(timeToMin(e)||0);
    if(d<=0)return null;
    const h=Math.floor(d/60),m=d%60;
    return h>0?(m>0?`${h}h ${m}m`:`${h}h`):`${m}m`;
  };
  const DIAS_LARGO=['Domingo','Lunes','Martes','Miércoles','Jueves','Viernes','Sábado'];
  const today=new Date().toISOString().split('T')[0];

  const allAsis=p.asistencias;
  const hoyReg=allAsis.find(a=>a.fecha===today);
  const activoHoy=!!(hoyReg&&!hoyReg.salida);
  const durHoy=hoyReg&&hoyReg.salida?durStr(hoyReg.entrada,hoyReg.salida):null;
  const todayDt=new Date(today+'T12:00:00');
  const todayLabel=DIAS_LARGO[todayDt.getDay()]+', '+todayDt.getDate()+' de '+_MESES_ATT[todayDt.getMonth()];

  const todayCard=`
    <div class="att-today-card${activoHoy?' att-today-card--active':''}${hoyReg&&!activoHoy?' att-today-card--done':''}">
      <div class="att-today-header">
        <div>
          <p class="att-today-label">HOY</p>
          <p class="att-today-date">${todayLabel}</p>
        </div>
        <div class="att-status${activoHoy?' att-status--active':''}">
          <span class="att-status-dot"></span>
          <span>${activoHoy?'En sitio':hoyReg?'Turno completado':'Sin registro'}</span>
        </div>
      </div>
      ${hoyReg
        ? `<div class="att-today-times">
            <div class="att-today-time">
              <span class="att-today-time-lbl">Entrada</span>
              <span class="att-today-time-val">${hoyReg.entrada}</span>
            </div>
            <div class="att-today-arrow">→</div>
            <div class="att-today-time">
              <span class="att-today-time-lbl">${activoHoy?'En turno':'Salida'}</span>
              <span class="att-today-time-val${activoHoy?' att-today-time-active':''}">${hoyReg.salida||'—'}</span>
            </div>
            ${durHoy?`<div class="att-today-dur">${durHoy}</div>`:''}
          </div>`
        : `<p class="att-today-empty">Sin asistencia registrada hoy</p>`}
    </div>`;

  /* apply filter */
  const filtered=_filterAsisByPeriod(allAsis,_getAttF('cinm'));
  const completos=filtered.filter(a=>a.salida);
  const timeToMin2=t=>{if(!t)return null;const[h,m]=t.split(':').map(Number);return h*60+m;};
  const avgMin=completos.length
    ? Math.round(completos.reduce((acc,a)=>{const d=(timeToMin2(a.salida)||0)-(timeToMin2(a.entrada)||0);return acc+(d>0?d:0);},0)/completos.length)
    : null;
  const avgStr=avgMin!=null?(Math.floor(avgMin/60)+'h'+(avgMin%60>0?' '+(avgMin%60)+'m':'')):null;

  /* KPIs */
  const kpis=`
    <div class="att-kpis">
      <div class="att-kpi"><span class="att-kpi-val">${filtered.length}</span><span class="att-kpi-lbl">Registros</span></div>
      <div class="att-kpi-div"></div>
      <div class="att-kpi"><span class="att-kpi-val">${completos.length}</span><span class="att-kpi-lbl">Completos</span></div>
      <div class="att-kpi-div"></div>
      <div class="att-kpi"><span class="att-kpi-val">${avgStr||'—'}</span><span class="att-kpi-lbl">Prom. turno</span></div>
    </div>`;

  /* historial filtrado (excluyendo hoy) */
  const historial=filtered.filter(a=>a.fecha!==today);
  const rowsHtml=_buildAttRowsHtml(historial);

  panel.innerHTML=`
    ${todayCard}
    <div class="att-filter-row">
      ${_attFilterBarHtml('cinm','_cinmSetMode','_cinmApplyRange')}
      <button class="att-pdf-btn" onclick="_cinmAttPDF()">⬇ PDF</button>
    </div>
    <p class="att-period-label">${label}</p>
    ${kpis}
    <div class="att-list">${rowsHtml}</div>
  `;
}
function _cinmSetMode(mode,k){_getAttF(k).mode=mode;const{ps}=_cinmData();const personal=PERSONAL_INM.filter(p=>p.serviciosAsignados.includes(ps.id));_renderAttPanel(personal);}
function _cinmApplyRange(k){const{ps}=_cinmData();const personal=PERSONAL_INM.filter(p=>p.serviciosAsignados.includes(ps.id));_renderAttPanel(personal);}
function _cinmAttPDF(){
  const{ps}=_cinmData();
  const personal=PERSONAL_INM.filter(p=>p.serviciosAsignados.includes(ps.id));
  const p=personal.find(x=>x.id===_attTabId);
  if(!p)return;
  const filtered=_filterAsisByPeriod(p.asistencias,_getAttF('cinm'));
  _downloadAsisPDF(filtered,p.nombre,_attFilterLabel('cinm'),ps);
}

/* ═══════════════════════════════════════════
   ADMIN — GESTIÓN CLIENTES INMUEBLES
   ═══════════════════════════════════════════ */

function switchInmMainTab(tab,btn){
  document.querySelectorAll('#a-inmuebles .msg-tab').forEach(b=>b.classList.remove('active'));
  if(btn)btn.classList.add('active');
  const panContratos=document.getElementById('inm-panel-contratos');
  const panClientes=document.getElementById('inm-panel-clientes');
  if(panContratos)panContratos.style.display=tab==='contratos'?'':'none';
  if(panClientes)panClientes.style.display=tab==='clientes'?'':'none';
  if(tab==='clientes'){populateCiContratoSelect();renderAdminClientesInm();}
}

function toggleCiForm(){
  const body=document.getElementById('ci-form-body');
  const arrow=document.getElementById('ci-form-arrow');
  if(!body)return;
  const open=body.classList.toggle('open');
  if(arrow)arrow.textContent=open?'▲':'▼';
}

function populateCiContratoSelect(){
  const sel=document.getElementById('ci-contrato');if(!sel)return;
  const used=CLIENTS_INM.map(c=>c.contratoId).filter(id=>id!=null);
  sel.innerHTML='<option value="">Sin contrato</option>'+
    PROPERTY_SERVICES.filter(p=>!used.includes(p.id)||true).map(p=>`<option value="${p.id}">${p.folio} — ${p.tipo.slice(0,30)} (${p.cliente.nombre})</option>`).join('');
}

function addClienteInm(){
  const gv=id=>{const el=document.getElementById(id);return el?el.value.trim():'';};
  const nombre=gv('ci-nombre'),empresa=gv('ci-empresa'),email=gv('ci-email'),tel=gv('ci-tel'),pass=gv('ci-pass');
  const contratoIdRaw=gv('ci-contrato');
  const contratoId=contratoIdRaw!==''?parseInt(contratoIdRaw):null;
  if(!nombre||!email||!pass){showToast('amber','⚠️','Nombre, correo y contraseña son requeridos');return;}
  if(pass.length<6){showToast('amber','⚠️','La contraseña debe tener al menos 6 caracteres');return;}
  if(USERS.find(u=>u.email.toLowerCase()===email.toLowerCase())){showToast('red','❌','Este correo ya está registrado');return;}
  if(tel&&USERS.find(u=>u.tel&&u.tel.replace(/\s/g,'')===tel.replace(/\s/g,''))){showToast('amber','⚠️','Este teléfono ya está registrado en otro usuario');return;}
  const newId=CLIENTS_INM.length;
  CLIENTS_INM.push({id:newId,nombre,empresa,email,password:pass,tel,contratoId,activo:true});
  USERS.push({id:USERS.length,nombre,email,rol:'cliente_inm',tel,activo:true,accesoRevocado:false,password:pass});
  if(contratoId!=null){const ps=PROPERTY_SERVICES.find(p=>p.id===contratoId);if(ps)ps.clienteInmId=newId;}
  showToast('green','✅',`"${nombre}" agregado como cliente`);
  ['ci-nombre','ci-empresa','ci-email','ci-tel','ci-pass'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
  fbSaveClientsInm();fbSaveUsers();
  toggleCiForm();
  renderAdminClientesInm();
  if(typeof renderUsersPanel==='function')renderUsersPanel();
}

function renderAdminClientesInm(){
  const el=document.getElementById('admin-clients-inm-list');if(!el)return;
  if(!CLIENTS_INM.length){el.innerHTML='<p style="font-size:12px;color:#185FA5;text-align:center;padding:1.5rem;">Sin clientes registrados</p>';return;}
  el.innerHTML=CLIENTS_INM.map(ci=>{
    const ps=PROPERTY_SERVICES.find(p=>p.id===ci.contratoId);
    const init=ci.nombre.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase();
    return`<div class="pi-admin-card" style="${!ci.activo?'opacity:.65;':''}">
      <div class="pi-admin-hdr">
        <div class="av" style="width:38px;height:38px;font-size:12px;background:#065535;color:#fff;flex-shrink:0;">${init}</div>
        <div style="flex:1;min-width:0;">
          <p style="font-size:13px;font-weight:500;color:#042C53;">${ci.nombre}</p>
          <p style="font-size:11px;color:#185FA5;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${ci.empresa}</p>
        </div>
        <button class="toggle-btn ${ci.activo?'on':''}" onclick="toggleClienteInmStatus(${ci.id})">${ci.activo?'Activo':'Inactivo'}</button>
      </div>
      <div style="padding:6px 12px 8px;display:grid;gap:3px;">
        <p style="font-size:12px;color:#185FA5;">📧 ${ci.email}</p>
        <p style="font-size:12px;color:#185FA5;">📞 ${ci.tel||'—'}</p>
        <p style="font-size:12px;color:#185FA5;">📄 ${ps?ps.folio+' — '+ps.tipo.slice(0,35):'Sin contrato asignado'}</p>
      </div>
      <div style="padding:0 12px 12px;display:flex;gap:6px;flex-wrap:wrap;">
        <button class="btn-sm" onclick="openCiPassOv(${ci.id})">🔑 Restablecer contraseña</button>
        <button class="btn-sm" style="background:#FCEBEB;color:#9B1C1C;border-color:#FCEBEB;" onclick="removeClienteInm(${ci.id})">Eliminar</button>
      </div>
    </div>`;
  }).join('');
}

function toggleClienteInmStatus(id){
  const ci=CLIENTS_INM.find(c=>c.id===id);if(!ci)return;
  ci.activo=!ci.activo;
  const user=USERS.find(u=>u.email===ci.email);
  if(user){user.activo=ci.activo;user.accesoRevocado=!ci.activo;}
  fbSaveClientsInm();fbSaveUsers();
  showToast(ci.activo?'green':'amber',ci.activo?'✅':'⚠️',`${ci.nombre}: ${ci.activo?'activado':'desactivado'}`);
  renderAdminClientesInm();
}

function removeClienteInm(id){
  const ci=CLIENTS_INM.find(c=>c.id===id);if(!ci)return;
  if(!confirm(`¿Eliminar al cliente "${ci.nombre}"? Esta acción no se puede deshacer.`))return;
  CLIENTS_INM=CLIENTS_INM.filter(c=>c.id!==id);
  const userIdx=USERS.findIndex(u=>u.email===ci.email&&u.rol==='cliente_inm');
  if(userIdx>-1)USERS.splice(userIdx,1);
  fbSaveClientsInm();fbSaveUsers();
  showToast('green','✅',`"${ci.nombre}" eliminado`);
  renderAdminClientesInm();
}

function openCiPassOv(id){
  const ci=CLIENTS_INM.find(c=>c.id===id);if(!ci)return;
  document.getElementById('ci-pass-ov-id').value=id;
  document.getElementById('ci-pass-ov-name').textContent=`Para: ${ci.nombre} (${ci.email})`;
  document.getElementById('ci-pass-ov-new').value='';
  document.getElementById('ci-pass-ov-new2').value='';
  document.getElementById('ci-pass-ov').classList.add('open');
}
function closeCiPassOv(){document.getElementById('ci-pass-ov').classList.remove('open');}
function saveResetClienteInmPass(){
  const id=parseInt(document.getElementById('ci-pass-ov-id').value);
  const n1=document.getElementById('ci-pass-ov-new').value;
  const n2=document.getElementById('ci-pass-ov-new2').value;
  const ci=CLIENTS_INM.find(c=>c.id===id);if(!ci)return;
  if(!n1||!n2){showToast('amber','⚠️','Completa los campos');return;}
  if(n1.length<6){showToast('amber','⚠️','Mínimo 6 caracteres');return;}
  if(n1!==n2){showToast('amber','⚠️','Las contraseñas no coinciden');return;}
  ci.password=n1;
  const user=USERS.find(u=>u.email===ci.email);if(user)user.password=n1;
  showToast('green','✅',`Contraseña de ${ci.nombre} restablecida`);
  closeCiPassOv();
}

/* ═══════════════════════════════════════════════
   PANEL DE PROMOCIONES & CAMPAÑAS (ADMIN)
   ═══════════════════════════════════════════════ */

let _promoTipo   = 'descuento';
let _promoCampana = 'buen_fin';

/* Datos precargados por tipo de campaña */
const _CAMPANA_PRESETS = {
  buen_fin: { nombre:'Buen Fin',       emoji:'🛍️', color:'#e63946', pct:20 },
  hot_sale: { nombre:'Hot Sale',       emoji:'🔥', color:'#f4a261', pct:15 },
  navidad:  { nombre:'Navidad',        emoji:'🎄', color:'#2a9d8f', pct:25 },
  madres:   { nombre:'Día de las Madres', emoji:'💐', color:'#7209b7', pct:10 },
  verano:   { nombre:'Verano',         emoji:'☀️', color:'#ef9f27', pct:12 },
  custom:   { nombre:'',               emoji:'🎉', color:'#1A56DB', pct:0  },
};

const _TIPO_META = {
  descuento: { label:'Descuento',   bg:'#E6F1FB', col:'#1A56DB' },
  codigo:    { label:'Código promo',bg:'#F0FDF4', col:'#166534' },
  referido:  { label:'Referido',    bg:'#FDF4FF', col:'#7209b7' },
  campana:   { label:'Campaña',     bg:'#FFF7ED', col:'#c2410c' },
};

function selectPromoTipo(tipo, btn) {
  _promoTipo = tipo;
  document.querySelectorAll('.ptp-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  // Mostrar/ocultar campos según tipo
  document.getElementById('pf-wrap-pct').style.display  = ''; /* siempre visible */
  document.getElementById('pf-wrap-code').style.display = (tipo==='codigo'||tipo==='referido')   ? '' : 'none';
  document.getElementById('pf-wrap-ref').style.display  = (tipo==='referido')                    ? '' : 'none';
  document.getElementById('promo-campana-wrap').style.display = (tipo==='campana')               ? '' : 'none';
  if (tipo==='campana') _applyPreset(_promoCampana);
  _updatePromoPreview();
}

function selectPromoCampana(camp, btn) {
  _promoCampana = camp;
  document.querySelectorAll('.pcp-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  _applyPreset(camp);
  _updatePromoPreview();
}

function _applyPreset(camp) {
  const p = _CAMPANA_PRESETS[camp] || _CAMPANA_PRESETS.custom;
  const n = document.getElementById('pf-nombre');
  const e = document.getElementById('pf-emoji');
  const c = document.getElementById('pf-color');
  const pct = document.getElementById('pf-pct');
  if (n && !n.dataset.userEdited) n.value = p.nombre;
  if (e) e.value = p.emoji;
  if (c) c.value = p.color;
  if (pct && p.pct) pct.value = p.pct;
}

function _updatePromoPreview() {
  const wrap = document.getElementById('promo-preview-wrap');
  if (!wrap) return;
  const tipo  = _promoTipo;
  const emoji = document.getElementById('pf-emoji')?.value || '🎉';
  const nombre= document.getElementById('pf-nombre')?.value || 'Nombre de la promoción';
  const desc  = document.getElementById('pf-desc')?.value   || 'Descripción aquí';
  const pct   = document.getElementById('pf-pct')?.value;
  const code  = document.getElementById('pf-code')?.value;
  const color = document.getElementById('pf-color')?.value  || '#1A56DB';
  const fin   = document.getElementById('pf-fin')?.value;
  const meta  = _TIPO_META[tipo] || _TIPO_META.descuento;
  const dateStr = fin ? `Válido hasta: ${new Date(fin+'T12:00:00').toLocaleDateString('es-MX',{day:'numeric',month:'long',year:'numeric'})}` : '';
  wrap.innerHTML = `
    <div class="promo-lp-card" style="background:${color}18;border:1.5px solid ${color}40;">
      <div class="plpc-accent" style="background:${color};"></div>
      <div class="plpc-emoji">${emoji}</div>
      <div class="plpc-body">
        <div class="plpc-tipo" style="color:${color};">${meta.label}${tipo==='campana'&&_promoCampana!=='custom'?' · '+(_CAMPANA_PRESETS[_promoCampana]?.nombre||''):''}</div>
        <div class="plpc-nombre">${nombre}</div>
        <div class="plpc-desc">${desc}</div>
        ${(tipo==='descuento'||tipo==='campana')&&pct ? `<div class="plpc-code" style="background:${color}22;color:${color};">${pct}% OFF</div>` : ''}
        ${(tipo==='codigo'||tipo==='referido')&&code ? `<div class="plpc-code">${code}</div>` : ''}
        ${dateStr ? `<div class="plpc-dates">📅 ${dateStr}</div>` : ''}
      </div>
      ${(tipo==='descuento'||tipo==='campana')&&pct ? `<div class="plpc-pct" style="color:${color};">${pct}%</div>` : ''}
    </div>`;
}

/* Llamado en cada cambio de campo */
document.addEventListener('input', function(e) {
  if (['pf-nombre','pf-desc','pf-emoji','pf-color','pf-pct','pf-code','pf-fin'].includes(e.target.id)) {
    if (e.target.id === 'pf-nombre') e.target.dataset.userEdited = '1';
    _updatePromoPreview();
  }
});
document.addEventListener('change', function(e) {
  if (e.target.id === 'pf-color') _updatePromoPreview();
});

function renderAdminPromociones() {
  _updatePromoPreview();
  _renderPromoList();
}

function _renderPromoList() {
  const list = document.getElementById('promo-list-admin');
  const badge = document.getElementById('promo-count-badge');
  if (!list) return;
  const activas = PROMOTIONS.filter(p => p.activo).length;
  if (badge) badge.textContent = `${activas} activa${activas!==1?'s':''}`;
  if (!PROMOTIONS.length) {
    list.innerHTML = '<p style="font-size:13px;color:#5C7A9A;text-align:center;padding:20px 0;">Sin promociones publicadas aún.</p>';
    return;
  }
  const meta = _TIPO_META;
  list.innerHTML = PROMOTIONS.map(p => {
    const m = meta[p.tipo] || meta.descuento;
    const campLabel = p.campana && p.campana!=='custom' ? ` · ${_CAMPANA_PRESETS[p.campana]?.nombre||''}` : '';
    const keyInfo = (p.tipo==='descuento'||p.tipo==='campana') && p.descuento
      ? `<strong>${p.descuento}% OFF</strong>`
      : p.codigo ? `<span class="plpc-code">${p.codigo}</span>` : '';
    const dates = [p.fechaInicio,p.fechaFin].filter(Boolean)
      .map(d=>new Date(d+'T12:00:00').toLocaleDateString('es-MX',{day:'numeric',month:'short'})).join(' → ');
    return `<div class="promo-admin-item">
      <div style="font-size:22px;flex-shrink:0;">${p.emoji||'🎉'}</div>
      <div class="pai-left">
        <span class="pai-tipo-badge" style="background:${m.bg};color:${m.col};">${m.label}${campLabel}</span>
        <div class="pai-nombre">${p.nombre}</div>
        <div class="pai-desc">${p.descripcion}</div>
        <div class="pai-meta">${keyInfo} ${dates ? '📅 '+dates : ''}</div>
      </div>
      <div class="pai-right">
        <button class="toggle-btn ${p.activo?'on':''}" onclick="togglePromocion(${p.id})">${p.activo?'Activa':'Inactiva'}</button>
        <button class="btn-danger" style="font-size:11px;padding:3px 8px;" onclick="deletePromocion(${p.id})">🗑</button>
      </div>
    </div>`;
  }).join('');
}

function addPromocion() {
  const nombre = document.getElementById('pf-nombre')?.value.trim();
  const desc   = document.getElementById('pf-desc')?.value.trim();
  if (!nombre) { showToast('amber','⚠️','Escribe un nombre para la promoción'); return; }
  const pct    = parseInt(document.getElementById('pf-pct')?.value) || 0;
  const code   = (document.getElementById('pf-code')?.value||'').trim().toUpperCase();
  const ref    = document.getElementById('pf-ref')?.value.trim() || '';
  const inicio = document.getElementById('pf-inicio')?.value || '';
  const fin    = document.getElementById('pf-fin')?.value    || '';
  const emoji  = document.getElementById('pf-emoji')?.value  || '🎉';
  const color  = document.getElementById('pf-color')?.value  || '#1A56DB';
  if (((_promoTipo==='descuento'||_promoTipo==='campana') && !pct)) {
    showToast('amber','⚠️','Ingresa el porcentaje de descuento'); return;
  }
  if ((_promoTipo==='codigo'||_promoTipo==='referido') && !code) {
    showToast('amber','⚠️','Ingresa el código'); return;
  }
  const newId = PROMOTIONS.length ? Math.max(...PROMOTIONS.map(p=>p.id))+1 : 0;
  PROMOTIONS.push({
    id: newId, tipo: _promoTipo,
    campana: _promoTipo==='campana' ? _promoCampana : '',
    nombre, descripcion: desc, descuento: pct, codigo: code,
    referidoPor: ref, fechaInicio: inicio, fechaFin: fin,
    emoji, color, activo: true, createdAt: new Date().toISOString().split('T')[0],
  });
  // Limpiar form
  ['pf-nombre','pf-desc','pf-pct','pf-code','pf-ref','pf-inicio','pf-fin'].forEach(id => {
    const el = document.getElementById(id); if (el) { el.value=''; delete el.dataset.userEdited; }
  });
  savePromosToLanding();
  _renderPromoList();
  showToast('green','🚀','Promoción publicada en el sitio web');
}

function deletePromocion(id) {
  PROMOTIONS = PROMOTIONS.filter(p => p.id !== id);
  savePromosToLanding();
  _renderPromoList();
  showToast('amber','🗑','Promoción eliminada');
}

function togglePromocion(id) {
  const p = PROMOTIONS.find(p => p.id === id);
  if (!p) return;
  p.activo = !p.activo;
  savePromosToLanding();
  _renderPromoList();
  showToast('blue', p.activo?'✅':'⏸️', p.activo?'Promoción activada':'Promoción desactivada');
}

function savePromosToLanding() {
  try {
    const activas = PROMOTIONS.filter(p => p.activo);
    localStorage.setItem('ayalym-promos', JSON.stringify(activas));
    fbSavePromotions();
  } catch(e) {}
}

/* ═══════════════════════════════════════════════
   SYNC DE PRECIOS → LANDING PAGE
   Serializa PRICES, CLEANING_TYPES y SVC_EXTRAS
   en localStorage para que landing-prices.js los lea.
   ═══════════════════════════════════════════════ */
function savePricesToLanding() {
  try {
    const interiorExtra = SVC_EXTRAS.find(function(e){ return e.id === 'interior'; });
    const tapSvc        = SVC_TYPES.find(function(s){ return s.id === 'tapiceria'; });
    const data = {
      depto: {
        base: PRICES.depto.base,
        hab:  PRICES.depto.hab,
        bano: PRICES.depto.bano
      },
      auto: {
        sedan:  PRICES.auto.sedan,
        suv:    PRICES.auto.suv,
        pickup: PRICES.auto.pickup
      },
      interior: interiorExtra ? interiorExtra.precio : 900,
      tap: {
        silla:    { unit: PRICES.tap.silla.unit },
        sofa:     { tela: PRICES.tap.sofa.tela, piel: PRICES.tap.sofa.piel, mixta: PRICES.tap.sofa.mixta },
        tapete:   { factor: PRICES.tap.tapete.factor },
        alfombra: { factor: PRICES.tap.alfombra.factor },
        colchon:  {
          individual:  PRICES.tap.colchon.individual,
          matrimonial: PRICES.tap.colchon.matrimonial,
          kingsize:    PRICES.tap.colchon.kingsize
        }
      },
      cleaning: CLEANING_TYPES.map(function(c){ return { id: c.id, factor: c.factor }; }),
      svcDesde: {
        depto:     PRICES.depto.base,
        auto:      PRICES.auto.sedan,
        tapiceria: tapSvc ? tapSvc.precio : 1200
      },
      svcActivo: {
        depto:     (SVC_TYPES.find(function(s){ return s.id === 'depto'; })     || {activo:true}).activo !== false,
        auto:      (SVC_TYPES.find(function(s){ return s.id === 'auto'; })      || {activo:true}).activo !== false,
        tapiceria: (SVC_TYPES.find(function(s){ return s.id === 'tapiceria'; }) || {activo:true}).activo !== false
      },
      timestamp: Date.now()
    };
    localStorage.setItem('ayalym-prices', JSON.stringify(data));
    fbSaveConfig();
  } catch(e) {}
}

/* Auto-guardar cuando el admin cambia cualquier campo numérico de precios */
document.addEventListener('input', function(e) {
  if (currentRole === 'admin' && e.target.type === 'number') {
    clearTimeout(window._priceSaveTimer);
    window._priceSaveTimer = setTimeout(function() {
      savePricesToLanding();
      showToast('blue', '💾', 'Precios actualizados en el sitio web');
    }, 800);
  }
});
/* ══════════════════════════════════════════════════
   SESIÓN PERSISTENTE — localStorage
   ══════════════════════════════════════════════════ */
/* Helpers para nombre dinámico en sendChat */
function _svName(){return(currentSupervisorRef&&currentSupervisorRef.name)||'Supervisor';}
function _tName(){return(currentWorkerRef&&currentWorkerRef.name)||'Trabajador';}

function saveSession(email){
  try{localStorage.setItem('ayalym-session',JSON.stringify({email:email}));}catch(e){}
}
function clearSession(){
  try{localStorage.removeItem('ayalym-session');}catch(e){}
}
function restoreSession(){
  var saved;
  try{saved=JSON.parse(localStorage.getItem('ayalym-session')||'null');}catch(e){return false;}
  if(!saved||!saved.email)return false;
  var e=saved.email;
  var user=USERS.find(function(u){return u.email===e;});
  if(!user||!user.activo||user.accesoRevocado){clearSession();return false;}
  currentUserEmail=e;
  if(user.rol==='cliente_inm'){
    var ci=CLIENTS_INM.find(function(c){return c.email===e;});
    if(!ci||ci.activo===false){clearSession();return false;}
    currentClientInmId=ci.id;
    launchApp('cliente_inm',ci.nombre,'');
  }else if(user.rol==='personal_inm'){
    var pi=PERSONAL_INM.find(function(x){return x.email===e;});
    if(!pi||pi.activo===false){clearSession();return false;}
    currentPersonalId=pi.id;
    launchApp('personal_inm',user.nombre,'');
  }else{
    launchApp(user.rol,user.nombre,'');
  }
  return true;
}

/* ══════════════════════════════════════════════════
   INICIO CON FIREBASE — carga datos al arrancar
   ══════════════════════════════════════════════════ */
(async function initFirebase() {
  var overlay = document.getElementById('fb-loading');
  try {
    await loadAllData();
    /* Sincronizar PROMOTIONS a localStorage para landing page */
    try{
      localStorage.setItem('ayalym-promos',JSON.stringify(
        PROMOTIONS.filter(function(p){return p.activo;})
      ));
    }catch(e){}
    /* Sincronizar PRICES a localStorage para landing page
       (se hace en cada carga para restaurar datos si se borró caché) */
    try{ savePricesToLanding(); }catch(e){}
  } catch(e) {
    console.warn('Firebase: usando datos locales.', e);
  } finally {
    if (overlay) overlay.style.display = 'none';
    restoreSession(); /* auto-login si hay sesión guardada */
  }
})();
