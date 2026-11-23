'use strict';
// Integra la sesión existente: sessionStorage.token_entomo.
// El servidor vuelve a validar el rol y la jurisdicción en cada solicitud.
const API = 'https://dttmexasjpwdlnbikijx.supabase.co/functions/v1/ovitrampas-apis';
const $ = id => document.getElementById(id);
const state = { jurisdiccion:'', colonia:'', anio:0, semana:0, pagina:0, total:0, filas:[], filtro:'todas', cambios:new Map(), ocupado:false, secuencia:0 };
const PAGE_SIZE = 200;
let geosisConsulta = 0;
const token = () => sessionStorage.getItem('token_entomo') || '';
function localDate(d = new Date()) { const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0');return `${y}-${m}-${day}`; }
function isoWeek(d) { const date = new Date(Date.UTC(d.getFullYear(),d.getMonth(),d.getDate())); date.setUTCDate(date.getUTCDate()+4-(date.getUTCDay()||7)); const year=date.getUTCFullYear(); const start=new Date(Date.UTC(year,0,1)); return {anio:year,semana:Math.ceil((((date-start)/86400000)+1)/7)}; }
function aviso(msg,tipo='info'){ const el=$('alerta');el.textContent=msg;el.className=`alerta visible ${tipo}`; }
function clearAviso(){ $('alerta').className='alerta'; $('alerta').textContent=''; }
function habilitar(){ $('guardarBtn').disabled=state.ocupado||!state.colonia||state.cambios.size===0; $('recargarBtn').disabled=state.ocupado||!state.colonia; $('anteriorBtn').disabled=state.ocupado||state.pagina===0; $('siguienteBtn').disabled=state.ocupado||(state.pagina+1)*PAGE_SIZE>=state.total; }
async function api(accion,datos={}){
 const t=token(); if(!t)throw new Error('No se encontró la sesión. Ingresa primero a la plataforma de Dengue.');
 const r=await fetch(API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({accion,token:t,...datos})});
 let data;try{data=await r.json();}catch{throw new Error(`Respuesta inválida del servidor (${r.status})`)}
 if(!r.ok||!data.valida)throw new Error(data.error||`Error del servidor (${r.status})`);return data;
}
function contexto(){return {jurisdiccion:Number(state.jurisdiccion),colonia_id:Number(state.colonia),anio:state.anio,semana:state.semana};}
function puedeSalir(){return !state.cambios.size||confirm('Hay lecturas sin guardar. ¿Deseas descartarlas y cambiar de selección?');}
function reiniciar(){state.pagina=0;state.total=0;state.filas=[];state.cambios.clear(); $('buscarFolio').value='';$('tablaFolios').innerHTML='<tr><td colspan="5" class="vacio">Selecciona una colonia para consultar sus folios.</td></tr>';resumen();habilitar();}
function resumen(){const captured=state.filas.filter(f=>f.lectura).length;const geosis=state.filas.filter(f=>f.lectura&&['PENDIENTE','ERROR'].includes(f.lectura.estado_geosis)).length;
 $('kpiTotal').textContent=state.colonia?state.total.toLocaleString('es-MX'):'—';
 // Las cifras de lectura corresponden a la página actual si existen más de 200 folios.
 $('kpiCapturadas').textContent=state.colonia?captured:'—';$('kpiPendientes').textContent=state.colonia?state.filas.length-captured:'—';$('kpiGeosis').textContent=state.colonia?geosis:'—';
 $('subtituloTabla').textContent=state.colonia?`Semana ${state.semana} de ${state.anio} · ${$('coloniaSelect').selectedOptions[0]?.textContent||''}${state.total>PAGE_SIZE?' · Indicadores de la página actual':''}`:'Selecciona una colonia para consultar sus folios.';
 $('resumenPagina').textContent=state.colonia?`${state.filas.length} folios en esta página · ${state.total} en la colonia`:'Sin resultados';$('paginaLabel').textContent=state.colonia?`Página ${state.pagina+1} de ${Math.max(1,Math.ceil(state.total/PAGE_SIZE))}`:'—';
}
function lecturaActual(f){if(!f.lectura)return '';return f.lectura.incidencia||String(f.lectura.huevecillos??'');}
function esBloqueada(f){return ['SINCRONIZADO','EN_PROCESO'].includes(f.lectura?.estado_geosis||'');}
function validar(v){return /^(?:\d{1,4}|SL|SB|C|D)$/.test(v)&&(!/^\d+$/.test(v)||Number(v)<=9999);}
function etiquetaEstado(txt,clase){const s=document.createElement('span');s.className=`estado ${clase}`;s.textContent=txt;return s;}
function pintar(){const tb=$('tablaFolios');tb.replaceChildren();const busqueda=$('buscarFolio').value.trim().toLowerCase();let visibles=state.filas.filter(f=>{
 const capturada=!!f.lectura;return (!busqueda||String(f.ovitrampa).toLowerCase().includes(busqueda))&&(state.filtro==='todas'||(state.filtro==='capturadas'&&capturada)||(state.filtro==='pendientes'&&!capturada));
 });if(!visibles.length){const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=5;td.className='vacio';td.textContent='No hay folios para el filtro seleccionado.';tr.append(td);tb.append(tr);habilitar();return;}
 for(const f of visibles){const tr=document.createElement('tr');const c1=document.createElement('td');c1.textContent=f.ovitrampa;const c2=document.createElement('td');const inp=document.createElement('input');inp.className='lectura-input';inp.maxLength=4;inp.placeholder='0 / SL / SB…';inp.setAttribute('aria-label',`Lectura de ${f.ovitrampa}`);inp.value=state.cambios.get(f.ovitrampa)??lecturaActual(f);inp.disabled=esBloqueada(f)||state.ocupado;
 inp.addEventListener('input',()=>{const v=inp.value.trim().toUpperCase();inp.value=v;const original=lecturaActual(f);if(v===original)state.cambios.delete(f.ovitrampa);else state.cambios.set(f.ovitrampa,v);inp.classList.toggle('invalida',v!==''&&!validar(v));inp.classList.toggle('modificada',state.cambios.has(f.ovitrampa));habilitar();});inp.classList.toggle('modificada',state.cambios.has(f.ovitrampa));inp.classList.toggle('invalida',inp.value!==''&&!validar(inp.value));c2.append(inp);
 const c3=document.createElement('td');c3.textContent=f.lectura?.fecha_recoleccion||'—';const c4=document.createElement('td');c4.append(f.lectura?etiquetaEstado('Con lectura','capturada'):etiquetaEstado('Sin captura','pendiente'));
 const c5=document.createElement('td');const estado=f.lectura?.estado_geosis||'';const label=estado==='SINCRONIZADO'?'Sincronizada':estado==='EN_PROCESO'?'En proceso':estado==='ERROR'?'Error':estado==='PENDIENTE'?'Pendiente de envío':'—';const clase=estado==='SINCRONIZADO'?'sincronizada':estado==='EN_PROCESO'?'proceso':estado==='ERROR'?'error':estado==='PENDIENTE'?'capturada':'pendiente';c5.append(etiquetaEstado(label,clase));tr.append(c1,c2,c3,c4,c5);tb.append(tr);
 }habilitar();}
async function cargarColonias(){const sec=++state.secuencia;state.ocupado=true;habilitar();$('coloniaSelect').disabled=true;$('coloniaSelect').innerHTML='<option value="">Cargando colonias...</option>';try{const result=await api('colonias',{jurisdiccion:Number(state.jurisdiccion)});if(sec!==state.secuencia)return;const sel=$('coloniaSelect');sel.replaceChildren();const op=document.createElement('option');op.value='';op.textContent='Selecciona colonia';sel.append(op);for(const c of result.data||[]){const opt=document.createElement('option');opt.value=c.id;opt.textContent=c.nombre+(c.municipio?` · Municipio ${c.municipio}`:'');sel.append(opt);}sel.disabled=false;clearAviso();}catch(e){if(sec===state.secuencia)aviso(e.message,'error');}finally{state.ocupado=false;habilitar();}}
async function cargarFolios(){if(!state.colonia)return;const sec=++state.secuencia;state.ocupado=true;habilitar();aviso('Consultando ovitrampas…');try{const result=await api('folios',{...contexto(),pagina:state.pagina});if(sec!==state.secuencia)return;state.filas=result.data||[];state.total=result.total_folios||0;resumen();pintar();clearAviso();}catch(e){if(sec===state.secuencia)aviso(e.message,'error');}finally{state.ocupado=false;habilitar();}}
async function guardar(){if(!state.cambios.size)return;const invalidos=[...state.cambios].filter(([,v])=>v!==''&&!validar(v));if(invalidos.length)return aviso(`Corrige la lectura del folio ${invalidos[0][0]}. Usa 0–9999, SL, SB, C o D.`,'error');
 // Borrar el texto de una lectura existente no elimina registros: se omite del envío.
 const entradas=state.filas.filter(f=>state.cambios.has(f.ovitrampa)&&state.cambios.get(f.ovitrampa)!=='').map(f=>({ovitrampa:f.ovitrampa,lectura:state.cambios.get(f.ovitrampa)}));
 if(!entradas.length)return aviso('Los campos vacíos no eliminan lecturas previas. No hay lecturas nuevas para guardar.','info');
 if(!$('fechaTrabajo').value)return aviso('Selecciona la fecha de trabajo.','error');
 state.ocupado=true;habilitar();aviso('Guardando capturas…');try{const r=await api('guardar_colonia',{...contexto(),fecha_recoleccion:$('fechaTrabajo').value,lecturas:entradas});state.cambios.clear();await cargarFolios();cargarTarjetasGeosis();aviso(`Guardadas: ${r.guardadas??0}. Sin cambios: ${r.omitidas_sin_cambios??0}. Los folios vacíos permanecen pendientes.`,'exito');}catch(e){aviso(e.message,'error');}finally{state.ocupado=false;habilitar();}}
function cambioPeriodo(){if(!puedeSalir()){ $('anioSelect').value=state.anio;$('semanaSelect').value=state.semana;return;}state.anio=Number($('anioSelect').value);state.semana=Number($('semanaSelect').value);state.cambios.clear();state.pagina=0;if(state.colonia)cargarFolios();else resumen();}

// Bandeja por cuenta administradora. No se filtra por jurisdicción operativa.
// La acción pendientes_geosis devuelve cuentas activas de la jurisdicción administradora
// y el total de lecturas pendientes para cada cuenta consultada.
async function cargarTarjetasGeosis() {
  const seq = ++geosisConsulta;
  const zona = $('tarjetasGeosis'), msg = $('geosisMensaje');
  zona.replaceChildren();
  const j = Number(state.jurisdiccion);
  if (!j) { msg.textContent = 'Selecciona una jurisdicción para consultar sus cuentas GEOSIS.'; return; }
  msg.textContent = 'Consultando cuentas y lecturas pendientes…';
  $('actualizarGeosis').disabled = true;
  try {
    const base = await api('pendientes_geosis', { jurisdiccion:j, pagina:0 });
    if (seq !== geosisConsulta) return;
    const cuentas = base.cuentas || [];
    if (!cuentas.length) {
      msg.textContent = 'Esta jurisdicción todavía no tiene cuentas GEOSIS activas configuradas.';
      return;
    }
    const resultados = await Promise.allSettled(cuentas.map(c =>
      api('pendientes_geosis', { jurisdiccion:j, cuenta_geosis_id:c.id, pagina:0 })
    ));
    if (seq !== geosisConsulta) return;
    msg.textContent = `${cuentas.length} cuenta(s) GEOSIS administrada(s) por esta jurisdicción.`;
    cuentas.forEach((cuenta,i) => {
      const res = resultados[i];
      const ok = res.status === 'fulfilled';
      const total = ok ? Number(res.value.total || 0) : null;
      const card = document.createElement('article'); card.className = 'geosis-card';
      const head = document.createElement('div'); head.className = 'geosis-card-head';
      const title = document.createElement('h3'); title.textContent = cuenta.alias || `Cuenta ${cuenta.id}`;
      const pill = document.createElement('span'); pill.className = 'geosis-pill'; pill.textContent = 'Cuenta GEOSIS';
      head.append(title,pill);
      const metric = document.createElement('div'); metric.className = 'geosis-count';
      metric.textContent = total === null ? '—' : total.toLocaleString('es-MX');
      const label = document.createElement('p'); label.className = 'geosis-count-label';
      label.textContent = 'Lecturas pendientes de sincronización';
      const form = document.createElement('div'); form.className = 'geosis-form';
      const btn = document.createElement('button'); btn.type='button'; btn.className='btn';
      btn.disabled=!ok; btn.textContent=('Sincronizar pendientes');
      const estado = document.createElement('p'); estado.className='geosis-mensaje';estado.textContent='Sincronización deshabilitada durante la validación.';
      btn.addEventListener('click',()=>sincronizarCuentaGeosis(cuenta,btn,estado));
      form.append(btn,estado);
      card.append(head,metric,label,form);
      if (!ok) {
        const error = document.createElement('p'); error.className='geosis-error';
        error.textContent = 'No se pudo consultar el contador de esta cuenta.'; card.append(error);
      }
      zona.append(card);
    });
  } catch (e) {
    if (seq === geosisConsulta) msg.textContent = `No se pudieron consultar las cuentas GEOSIS: ${e.message}`;
  } finally {
    if (seq === geosisConsulta) $('actualizarGeosis').disabled = false;
  }
}


// Comunicación con la extensión del perfil de Chrome. Fase de validación, sin guardado.
const BRIDGE_CHANNEL='NL_OVITRAMPAS_GEOSIS_V1';
const bridgePending=new Map();
window.addEventListener('message',event=>{
 if(event.source!==window||event.origin!==location.origin)return;
 const m=event.data;
 if(!m||m.channel!==BRIDGE_CHANNEL||m.direction!=='extension-to-page')return;
 const p=bridgePending.get(m.requestId);if(!p)return;
 bridgePending.delete(m.requestId);clearTimeout(p.timer);
 m.ok?p.resolve(m.data):p.reject(new Error(m.error||'La extensión no respondió correctamente.'));
});
function enviarExtension(action,details={}){
 return new Promise((resolve,reject)=>{
  const requestId=crypto.randomUUID();
  const timer=setTimeout(()=>{bridgePending.delete(requestId);reject(new Error('No se detectó la extensión. Verifica su instalación y permisos de este sitio.'));},35000);
  bridgePending.set(requestId,{resolve,reject,timer});
  window.postMessage({channel:BRIDGE_CHANNEL,direction:'page-to-extension',requestId,action,details},location.origin);
 });
}
async function detectarExtension(){
 const msg=$('conexionLocal'),btn=$('detectarLocal');btn.disabled=true;msg.textContent='Comprobando extensión en este perfil de Chrome…';
 try{const r=await enviarExtension('PING');msg.textContent=`Extensión conectada (${r.version}). ${r.geosis?.formulario?'Formulario GEOSIS detectado.':'Abre el formulario GEOSIS en este perfil.'} Listo para sincronizar con sesión GEOSIS iniciada.`;}
 catch(e){msg.textContent=e.message;}
 finally{btn.disabled=false;}
}
async function verificarCuentaGeosis(cuenta,btn,estado){
 if(!token()){estado.textContent='Inicia sesión en la plataforma.';return;}
 btn.disabled=true;estado.textContent='Verificando extensión y pestaña GEOSIS…';
 try{
  // Verificar de nuevo que la cuenta sea visible/autorizada por la Edge Function.
  const r=await api('pendientes_geosis',{jurisdiccion:Number(state.jurisdiccion),cuenta_geosis_id:cuenta.id,pagina:0});
  const ext=await enviarExtension('CHECK_ACCOUNT',{accountId:Number(cuenta.id)});
  estado.textContent=`Cuenta ${cuenta.alias||cuenta.id}: ${Number(r.total||0)} pendientes. ${ext.geosis.formulario?'Formulario GEOSIS disponible.':'No se encontró el formulario GEOSIS.'} ${ext.geosis.formulario?'Listo para sincronizar.':''}`;
 }catch(e){estado.textContent=`No se pudo verificar: ${e.message}`;}
 finally{btn.disabled=false;}
}



// Ejecuta una cuenta por vez en cada perfil de Chrome. Backend bloquea la cuenta entre perfiles.
async function sincronizarCuentaGeosis(cuenta,btn,estado){
 const cuentaId=Number(cuenta.id);
 btn.disabled=true;
 let jobId=null,procesados=0,exitos=0,errores=0,revisar=0,detener=false;
 try{
  const ext=await enviarExtension('CHECK_ACCOUNT',{accountId:cuentaId});
  if(!ext.geosis?.formulario)throw Error('Abre el formulario GEOSIS en otra pestaña de este perfil.');
  if(!confirm(`Confirma que la sesión de GEOSIS corresponde a ${cuenta.alias||cuentaId}.\n\n¿Sincronizar PENDIENTE, ERROR y REVISAR de esta cuenta?`))return;
  const start=await api('geosis_iniciar',{cuenta_geosis_id:cuentaId});
  jobId=start.job_id;
  const stop=document.createElement('button');stop.type='button';stop.className='btn secundario';stop.textContent='Detener después del registro actual';
  stop.onclick=()=>{detener=true;stop.disabled=true;estado.textContent='Deteniendo al finalizar el registro actual…';};
  btn.after(stop);
  try{
   while(!detener){
    const r=await api('geosis_siguiente',{cuenta_geosis_id:cuentaId,job_id:jobId});
    const lectura=r.lectura;
    if(!lectura)break;
    estado.textContent=`Procesados ${procesados} · Sincronizados ${exitos} · Error ${errores} · Revisar ${revisar} · Folio ${lectura.ovitrampa}`;
    let resultado;
    try{
      resultado=await enviarExtension('SYNC_READING',{accountId:cuentaId,reading:lectura});
    }catch(e){resultado={status:'INCIERTO',message:e.message||'Error de comunicación tras iniciar el envío'};}
    const estadoDB=resultado.status==='CONFIRMADO'?'SINCRONIZADO':resultado.status==='FOLIO_NO_REGISTRADO'?'ERROR':'REVISAR';
    // En respuesta ambigua, marcar REVISAR, no reintentar en el mismo lote.
    await api('geosis_resultado',{cuenta_geosis_id:cuentaId,job_id:jobId,lectura_id:lectura.id,
      estado:estadoDB,mensaje:`${resultado.status||'DESCONOCIDO'}: ${resultado.message||''}`});
    procesados++;
    if(estadoDB==='SINCRONIZADO')exitos++;else if(estadoDB==='ERROR')errores++;else revisar++;
    if(resultado.status==='INCIERTO'||resultado.status==='INESPERADO'){
      detener=true;
      estado.textContent=`Proceso detenido por respuesta no confirmada en ${lectura.ovitrampa}. Revisar GEOSIS antes de reintentar.`;
    }
   }
  }finally{stop.remove();}
  estado.textContent+=` | Total ${procesados}; sincronizados ${exitos}; errores ${errores}; revisar ${revisar}.`;
 }catch(e){estado.textContent=`Sincronización interrumpida: ${e.message}. Procesados: ${procesados}.`;}
 finally{
  if(jobId){
   try{await api('geosis_finalizar',{cuenta_geosis_id:cuentaId,job_id:jobId});}
   catch(e){estado.textContent+=` No se pudo cerrar el trabajo: ${e.message}`;}
  }
  btn.disabled=false;
  if(state.colonia && state.cambios.size===0)cargarFolios();
 }
}

function init(){const today=new Date(),wk=isoWeek(today);$('anioSelect').value=wk.anio;state.anio=wk.anio;for(let i=1;i<=53;i++){const opt=document.createElement('option');opt.value=i;opt.textContent=`Semana ${i}`;$('semanaSelect').append(opt);}$('semanaSelect').value=wk.semana;state.semana=wk.semana;$('fechaTrabajo').value=localDate();
 for(let j=1;j<=8;j++){const o=document.createElement('option');o.value=j;o.textContent=`Jurisdicción ${j}`;$('jurisdiccionSelect').append(o);}
 $('jurisdiccionSelect').addEventListener('change',e=>{if(!puedeSalir()){e.target.value=state.jurisdiccion;return;}state.jurisdiccion=e.target.value;state.colonia='';cargarTarjetasGeosis();state.secuencia++;reiniciar();if(state.jurisdiccion)cargarColonias();else{$('coloniaSelect').disabled=true;$('coloniaSelect').innerHTML='<option value="">Selecciona jurisdicción primero</option>';}});
 $('coloniaSelect').addEventListener('change',e=>{if(!puedeSalir()){e.target.value=state.colonia;return;}state.colonia=e.target.value;reiniciar();if(state.colonia)cargarFolios();});$('anioSelect').addEventListener('change',cambioPeriodo);$('semanaSelect').addEventListener('change',cambioPeriodo);
 $('buscarFolio').addEventListener('input',pintar);document.querySelectorAll('[data-filtro]').forEach(btn=>btn.addEventListener('click',()=>{state.filtro=btn.dataset.filtro;document.querySelectorAll('[data-filtro]').forEach(x=>x.classList.toggle('activa',x===btn));pintar();}));
 $('detectarLocal').addEventListener('click',detectarExtension);$('actualizarGeosis').addEventListener('click',cargarTarjetasGeosis);$('guardarBtn').addEventListener('click',guardar);$('recargarBtn').addEventListener('click',()=>{if(!puedeSalir())return;state.cambios.clear();cargarFolios();});$('anteriorBtn').addEventListener('click',()=>{if(!puedeSalir())return;state.cambios.clear();state.pagina--;cargarFolios();});$('siguienteBtn').addEventListener('click',()=>{if(!puedeSalir())return;state.cambios.clear();state.pagina++;cargarFolios();});window.addEventListener('beforeunload',e=>{if(state.cambios.size){e.preventDefault();e.returnValue='';}});
 if(!token())aviso('No se encontró una sesión activa. Abre este módulo desde la plataforma de Dengue con una cuenta autorizada.','error');}
document.addEventListener('DOMContentLoaded',init);
