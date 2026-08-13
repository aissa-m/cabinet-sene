const STORAGE_KEY='cabinet-sene-v1';
const DEFAULT_WORKERS=['Mohamed','Ghadi','Khetri','Ahmedou','Mbay'];
const $=(id)=>document.getElementById(id);
const state=loadState();
let currentMonth=monthKey(new Date());
let toastTimer;

function loadState(){
  try{
    const saved=JSON.parse(localStorage.getItem(STORAGE_KEY));
    if(saved && Array.isArray(saved.workers) && saved.records) return saved;
  }catch(e){}
  return {workers:DEFAULT_WORKERS.map((name,i)=>({id:`w${i+1}`,name,active:true})),records:{}};
}
function saveState(){
  localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
  $('saveStatus').textContent='Guardado · '+new Date().toLocaleTimeString('es-ES',{hour:'2-digit',minute:'2-digit'});
}
function monthKey(date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`}
function daysInMonth(key){const [y,m]=key.split('-').map(Number);return new Date(y,m,0).getDate()}
function dateKey(day){return `${currentMonth}-${String(day).padStart(2,'0')}`}
function activeWorkers(){return state.workers.filter(w=>w.active)}
function ensureRecord(key){if(!state.records[key]) state.records[key]={consultations:{},generated:'',taken:'',notes:''};return state.records[key]}
function number(v){const n=Number(String(v??'').replace(',','.'));return Number.isFinite(n)?n:0}
function fmt(n){return new Intl.NumberFormat('es-ES',{maximumFractionDigits:2}).format(n)}
function weekdayLabel(key){const d=new Date(`${key}T12:00:00`);return d.toLocaleDateString('es-ES',{weekday:'short'}).replace('.','')}
function dayLabel(key){return new Date(`${key}T12:00:00`).toLocaleDateString('es-ES',{day:'2-digit',month:'short'})}
function isToday(key){return key===new Date().toISOString().slice(0,10)}
function isWeekend(key){const d=new Date(`${key}T12:00:00`).getDay();return d===0||d===6}

function render(){
  $('monthPicker').value=currentMonth;
  renderTable();
  renderSummary();
}
function renderTable(){
  const workers=activeWorkers();
  $('tableHead').innerHTML=`<tr><th class="sticky-col">Fecha</th>${workers.map(w=>`<th>${escapeHtml(w.name)}</th>`).join('')}<th>Total consultas</th><th>Total generado</th><th>Retirado / cogido</th><th>Aclaraciones</th></tr>`;
  let body='';
  const count=daysInMonth(currentMonth);
  for(let day=1;day<=count;day++){
    const key=dateKey(day),rec=ensureRecord(key);
    const rowTotal=workers.reduce((s,w)=>s+number(rec.consultations[w.id]),0);
    const cls=[isToday(key)?'is-today':'',isWeekend(key)?'is-weekend':''].join(' ');
    body+=`<tr class="${cls}"><td class="sticky-col day-cell">${dayLabel(key)}<small>${weekdayLabel(key)}</small></td>`+
      workers.map(w=>`<td><input class="cell-input" inputmode="numeric" min="0" type="number" data-kind="consultation" data-date="${key}" data-worker="${w.id}" value="${escapeAttr(rec.consultations[w.id]??'')}" aria-label="Consultas de ${escapeAttr(w.name)} el ${key}"></td>`).join('')+
      `<td class="row-total" data-row-total="${key}">${fmt(rowTotal)}</td>`+
      `<td><input class="cell-input money-input" inputmode="decimal" type="number" step="0.01" data-kind="generated" data-date="${key}" value="${escapeAttr(rec.generated??'')}"></td>`+
      `<td><input class="cell-input money-input" inputmode="decimal" type="number" step="0.01" data-kind="taken" data-date="${key}" value="${escapeAttr(rec.taken??'')}"></td>`+
      `<td><input class="cell-input notes-input" type="text" data-kind="notes" data-date="${key}" value="${escapeAttr(rec.notes??'')}" placeholder="Nota puntual…"></td></tr>`;
  }
  $('tableBody').innerHTML=body;
  const totals=calculateTotals();
  $('tableFoot').innerHTML=`<tr><th class="sticky-col">TOTAL</th>${workers.map(w=>`<td>${fmt(totals.byWorker[w.id]||0)}</td>`).join('')}<td>${fmt(totals.consultations)}</td><td>${fmt(totals.generated)}</td><td>${fmt(totals.taken)}</td><td>Saldo: ${fmt(totals.generated-totals.taken)}</td></tr>`;
}
function calculateTotals(){
  const workers=activeWorkers(), totals={consultations:0,generated:0,taken:0,byWorker:{}};
  const count=daysInMonth(currentMonth);
  for(let day=1;day<=count;day++){
    const rec=ensureRecord(dateKey(day));
    workers.forEach(w=>{const v=number(rec.consultations[w.id]);totals.byWorker[w.id]=(totals.byWorker[w.id]||0)+v;totals.consultations+=v});
    totals.generated+=number(rec.generated);totals.taken+=number(rec.taken);
  }
  return totals;
}
function renderSummary(){
  const t=calculateTotals();
  $('summaryConsultations').textContent=fmt(t.consultations);
  $('summaryGenerated').textContent=fmt(t.generated);
  $('summaryTaken').textContent=fmt(t.taken);
  $('summaryBalance').textContent=fmt(t.generated-t.taken);
}
function updateRowTotal(key){
  const rec=ensureRecord(key);
  const total=activeWorkers().reduce((s,w)=>s+number(rec.consultations[w.id]),0);
  const cell=document.querySelector(`[data-row-total="${key}"]`);if(cell)cell.textContent=fmt(total);
}
function handleInput(e){
  const el=e.target;if(!el.dataset.kind)return;
  const rec=ensureRecord(el.dataset.date);
  if(el.dataset.kind==='consultation'){rec.consultations[el.dataset.worker]=el.value;updateRowTotal(el.dataset.date)}
  else rec[el.dataset.kind]=el.value;
  saveState();renderSummary();renderFootOnly();
}
function renderFootOnly(){
  const workers=activeWorkers(),t=calculateTotals();
  $('tableFoot').innerHTML=`<tr><th class="sticky-col">TOTAL</th>${workers.map(w=>`<td>${fmt(t.byWorker[w.id]||0)}</td>`).join('')}<td>${fmt(t.consultations)}</td><td>${fmt(t.generated)}</td><td>${fmt(t.taken)}</td><td>Saldo: ${fmt(t.generated-t.taken)}</td></tr>`;
}
function changeMonth(delta){const [y,m]=currentMonth.split('-').map(Number);currentMonth=monthKey(new Date(y,m-1+delta,1));render()}

function openWorkers(){renderWorkers();$('workersDialog').showModal()}
function renderWorkers(){
  $('workersList').innerHTML=activeWorkers().map(w=>`<div class="worker-item"><input class="worker-name" data-worker-name="${w.id}" value="${escapeAttr(w.name)}"><button type="button" class="danger-btn" data-remove-worker="${w.id}">Eliminar</button></div>`).join('')||'<p>No hay médicos activos.</p>';
}
function addWorker(){
  const input=$('newWorkerName'),name=input.value.trim();if(!name)return;
  state.workers.push({id:`w${Date.now()}`,name,active:true});input.value='';saveState();renderWorkers();render();showToast('Médico añadido');
}
function removeWorker(id){const w=state.workers.find(x=>x.id===id);if(!w)return;if(!confirm(`¿Quitar a ${w.name} de la tabla?`))return;w.active=false;saveState();renderWorkers();render();showToast('Médico eliminado de la tabla')}
function renameWorker(id,name){const w=state.workers.find(x=>x.id===id);if(w&&name.trim()){w.name=name.trim();saveState();render()}}

function exportData(){
  const payload={...state,exportedAt:new Date().toISOString(),version:1};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=`cabinet-sene-${currentMonth}.json`;a.click();URL.revokeObjectURL(url);showToast('Copia exportada');
}
async function importData(file){
  if(!file)return;
  try{
    const data=JSON.parse(await file.text());
    if(!Array.isArray(data.workers)||!data.records) throw new Error('Formato inválido');
    state.workers=data.workers;state.records=data.records;saveState();render();showToast('Copia importada correctamente');
  }catch(e){alert('No se pudo importar la copia. Comprueba que sea un archivo exportado desde esta web.');}
  $('importInput').value='';
}
function showToast(text){const el=$('toast');el.textContent=text;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),1800)}
function escapeHtml(v){return String(v).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function escapeAttr(v){return escapeHtml(v)}

$('activityTable').addEventListener('input',handleInput);
$('prevMonthBtn').addEventListener('click',()=>changeMonth(-1));
$('nextMonthBtn').addEventListener('click',()=>changeMonth(1));
$('monthPicker').addEventListener('change',e=>{if(e.target.value){currentMonth=e.target.value;render()}});
$('todayBtn').addEventListener('click',()=>{currentMonth=monthKey(new Date());render()});
$('manageWorkersBtn').addEventListener('click',openWorkers);
$('addWorkerBtn').addEventListener('click',addWorker);
$('newWorkerName').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();addWorker()}});
$('workersList').addEventListener('click',e=>{const id=e.target.dataset.removeWorker;if(id)removeWorker(id)});
$('workersList').addEventListener('change',e=>{const id=e.target.dataset.workerName;if(id)renameWorker(id,e.target.value)});
$('exportBtn').addEventListener('click',exportData);
$('importInput').addEventListener('change',e=>importData(e.target.files[0]));
render();saveState();
