const STORAGE_KEY='cabinet-sene-v2';
const LEGACY_KEY='cabinet-sene-v1';
const DEFAULT_WORKERS=['Mohamed','Ghadi','Khetri','Ahmedou','Mbay'];
const $=id=>document.getElementById(id);
let state=loadState();
let currentMonth=monthKey(new Date());
let editingId=null;
let toastTimer;

function loadState(){
  try{const saved=JSON.parse(localStorage.getItem(STORAGE_KEY));if(saved&&Array.isArray(saved.workers)&&Array.isArray(saved.entries))return saved}catch(e){}
  const fresh={workers:DEFAULT_WORKERS.map((name,i)=>({id:`w${i+1}`,name,active:true})),entries:[]};
  try{
    const legacy=JSON.parse(localStorage.getItem(LEGACY_KEY));
    if(legacy&&Array.isArray(legacy.workers)){fresh.workers=legacy.workers;Object.entries(legacy.records||{}).forEach(([date,rec])=>{Object.entries(rec.consultations||{}).forEach(([doctorId,value])=>{if(Number(value)>0)fresh.entries.push({id:`legacy-${date}-${doctorId}`,date,doctorId,consultations:Number(value),generated:0,taken:0,notes:rec.notes||''})})})}
  }catch(e){}
  return fresh;
}
function saveState(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state));$('saveStatus').textContent='Enregistré · '+new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}
function monthKey(date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`}
function activeWorkers(){return state.workers.filter(w=>w.active)}
function number(v){const n=Number(String(v??'').replace(',','.'));return Number.isFinite(n)?n:0}
function fmt(n){return new Intl.NumberFormat('fr-FR',{maximumFractionDigits:2}).format(n)}
function esc(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function doctorById(id){return state.workers.find(w=>w.id===id)}
function monthEntries(){return state.entries.filter(e=>e.date.startsWith(currentMonth)).sort((a,b)=>b.date.localeCompare(a.date)||String(b.id).localeCompare(String(a.id)))}

function render(){
  $('monthPicker').value=currentMonth;
  renderDoctorOptions();renderSummary();renderEntries();renderDoctorStats();
}
function renderDoctorOptions(){
  const current=$('entryDoctor').value;
  const workers=activeWorkers();
  $('entryDoctor').innerHTML='<option value="">Choisir un médecin</option>'+workers.map(w=>`<option value="${w.id}">${esc(w.name)}</option>`).join('');
  if(workers.some(w=>w.id===current))$('entryDoctor').value=current;
}
function renderSummary(){
  const entries=monthEntries();
  const t=entries.reduce((a,e)=>({consultations:a.consultations+number(e.consultations),generated:a.generated+number(e.generated),taken:a.taken+number(e.taken)}),{consultations:0,generated:0,taken:0});
  $('summaryConsultations').textContent=fmt(t.consultations);$('summaryGenerated').textContent=fmt(t.generated);$('summaryTaken').textContent=fmt(t.taken);$('summaryBalance').textContent=fmt(t.generated-t.taken);
}
function renderEntries(){
  const entries=monthEntries();$('entriesCount').textContent=`${entries.length} ${entries.length===1?'saisie':'saisies'}`;
  if(!entries.length){$('entriesList').innerHTML='<div class="empty-state">Aucune saisie pour ce mois.<br>Ajoutez la première ci-dessus.</div>';return}
  $('entriesList').innerHTML=entries.map(e=>{const d=new Date(`${e.date}T12:00:00`),doctor=doctorById(e.doctorId),day=d.toLocaleDateString('fr-FR',{day:'2-digit'}),mon=d.toLocaleDateString('fr-FR',{month:'short'}).replace('.','');return `<article class="entry-item"><div class="entry-date">${day}<small>${mon}</small></div><div class="entry-main"><strong>${esc(doctor?.name||'Médecin')}</strong><p>${fmt(e.consultations)} consultations${e.notes?` · ${esc(e.notes)}`:''}</p><div class="entry-actions"><button class="mini-btn" data-edit="${e.id}">Modifier</button><button class="mini-btn danger" data-delete="${e.id}">Supprimer</button></div></div><div class="entry-values"><strong>${fmt(e.generated)} MRU</strong><small>${number(e.taken)?`Retiré : ${fmt(e.taken)} MRU`:'Aucun retrait'}</small></div></article>`}).join('');
}
function renderDoctorStats(){
  const entries=monthEntries(),workers=activeWorkers();
  const totals=workers.map(w=>{const own=entries.filter(e=>e.doctorId===w.id);return{w,consultations:own.reduce((s,e)=>s+number(e.consultations),0),generated:own.reduce((s,e)=>s+number(e.generated),0)}});
  const max=Math.max(1,...totals.map(x=>x.consultations));
  $('doctorStats').innerHTML=totals.length?totals.map(x=>`<div class="doctor-stat"><div class="doctor-stat-head"><strong>${esc(x.w.name)}</strong><span>${fmt(x.consultations)}</span></div><small>${fmt(x.generated)} MRU générés</small><div class="bar"><i style="width:${Math.max(4,(x.consultations/max)*100)}%"></i></div></div>`).join(''):'<div class="empty-state">Aucun médecin actif.</div>';
}

function submitEntry(e){
  e.preventDefault();const doctorId=$('entryDoctor').value,date=$('entryDate').value,consultations=number($('entryConsultations').value);if(!doctorId||!date)return;
  const data={date,doctorId,consultations,generated:number($('entryGenerated').value),taken:number($('entryTaken').value),notes:$('entryNotes').value.trim()};
  if(editingId){const i=state.entries.findIndex(x=>String(x.id)===String(editingId));if(i>=0)state.entries[i]={...state.entries[i],...data};showToast('Saisie modifiée')}
  else{state.entries.push({id:Date.now().toString(),...data});showToast('Saisie enregistrée')}
  currentMonth=date.slice(0,7);saveState();resetForm();render();
}
function editEntry(id){const x=state.entries.find(e=>String(e.id)===String(id));if(!x)return;editingId=x.id;$('entryDate').value=x.date;$('entryDoctor').value=x.doctorId;$('entryConsultations').value=x.consultations;$('entryGenerated').value=x.generated||'';$('entryTaken').value=x.taken||'';$('entryNotes').value=x.notes||'';document.querySelector('.save-entry').textContent='Enregistrer les modifications';document.querySelector('.entry-card').scrollIntoView({behavior:'smooth',block:'start'})}
function deleteEntry(id){const x=state.entries.find(e=>String(e.id)===String(id));if(!x||!confirm('Supprimer cette saisie ?'))return;state.entries=state.entries.filter(e=>String(e.id)!==String(id));saveState();render();showToast('Saisie supprimée')}
function resetForm(){editingId=null;$('entryForm').reset();$('entryDate').value=new Date().toISOString().slice(0,10);document.querySelector('.save-entry').textContent='Enregistrer'}
function changeMonth(delta){const[y,m]=currentMonth.split('-').map(Number);currentMonth=monthKey(new Date(y,m-1+delta,1));render()}

function openWorkers(){renderWorkers();$('workersDialog').showModal()}
function renderWorkers(){$('workersList').innerHTML=activeWorkers().map(w=>`<div class="worker-item"><input class="worker-name" data-worker-name="${w.id}" value="${esc(w.name)}"><button type="button" class="danger-btn" data-remove-worker="${w.id}">Supprimer</button></div>`).join('')||'<p>Aucun médecin actif.</p>'}
function addWorker(){const input=$('newWorkerName'),name=input.value.trim();if(!name)return;state.workers.push({id:`w${Date.now()}`,name,active:true});input.value='';saveState();renderWorkers();render();showToast('Médecin ajouté')}
function removeWorker(id){const w=doctorById(id);if(!w||!confirm(`Retirer ${w.name} de la liste ?`))return;w.active=false;saveState();renderWorkers();render();showToast('Médecin retiré')}
function renameWorker(id,name){const w=doctorById(id);if(w&&name.trim()){w.name=name.trim();saveState();render()}}
function exportData(){const blob=new Blob([JSON.stringify({...state,version:2,exportedAt:new Date().toISOString()},null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`cabinet-sene-${currentMonth}.json`;a.click();URL.revokeObjectURL(url);showToast('Sauvegarde exportée')}
async function importData(file){if(!file)return;try{const data=JSON.parse(await file.text());if(!Array.isArray(data.workers)||!Array.isArray(data.entries))throw new Error();state={workers:data.workers,entries:data.entries};saveState();render();showToast('Sauvegarde importée')}catch(e){alert('Impossible d’importer cette sauvegarde.')}$('importInput').value=''}
function showToast(text){const el=$('toast');el.textContent=text;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),1800)}

$('entryForm').addEventListener('submit',submitEntry);
$('entriesList').addEventListener('click',e=>{if(e.target.dataset.edit)editEntry(e.target.dataset.edit);if(e.target.dataset.delete)deleteEntry(e.target.dataset.delete)});
$('prevMonthBtn').addEventListener('click',()=>changeMonth(-1));$('nextMonthBtn').addEventListener('click',()=>changeMonth(1));$('monthPicker').addEventListener('change',e=>{if(e.target.value){currentMonth=e.target.value;render()}});
$('manageWorkersBtn').addEventListener('click',openWorkers);$('addWorkerBtn').addEventListener('click',addWorker);$('newWorkerName').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();addWorker()}});$('workersList').addEventListener('click',e=>{if(e.target.dataset.removeWorker)removeWorker(e.target.dataset.removeWorker)});$('workersList').addEventListener('change',e=>{if(e.target.dataset.workerName)renameWorker(e.target.dataset.workerName,e.target.value)});
$('exportBtn').addEventListener('click',exportData);$('importInput').addEventListener('change',e=>importData(e.target.files[0]));
resetForm();render();saveState();
