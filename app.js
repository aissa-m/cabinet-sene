const STORAGE_KEY='cabinet-sene-v3';
const PREV_KEY='cabinet-sene-v2';
const CONSULTATION_PRICE=50;
const DEFAULT_WORKERS=['Mohamed','Ghadi','Khetri','Ahmedou','Mbay'];
const $=id=>document.getElementById(id);
let state=loadState();
let currentMonth=monthKey(new Date());
let editingId=null;
let editingWithdrawalId=null;
let toastTimer;

function loadState(){
  try{
    const saved=JSON.parse(localStorage.getItem(STORAGE_KEY));
    if(saved&&Array.isArray(saved.workers)&&Array.isArray(saved.entries)&&Array.isArray(saved.withdrawals)){
      saved.entries=saved.entries.map(e=>({...e,consultations:number(e.consultations),generated:number(e.consultations)*CONSULTATION_PRICE}));
      saved.withdrawals=saved.withdrawals.map(w=>({...w,amount:number(w.amount)}));
      return saved;
    }
  }catch(e){}
  const fresh={workers:DEFAULT_WORKERS.map((name,i)=>({id:`w${i+1}`,name,active:true})),entries:[],withdrawals:[]};
  try{
    const old=JSON.parse(localStorage.getItem(PREV_KEY));
    if(old&&Array.isArray(old.workers)&&Array.isArray(old.entries)){
      fresh.workers=old.workers;
      fresh.entries=old.entries.map(e=>({id:e.id,date:e.date,doctorId:e.doctorId,consultations:number(e.consultations),generated:number(e.consultations)*CONSULTATION_PRICE,notes:e.notes||''}));
      old.entries.forEach(e=>{if(number(e.taken)>0)fresh.withdrawals.push({id:`legacy-w-${e.id}`,date:e.date,doctorId:e.doctorId,amount:number(e.taken),notes:'Retrait migré depuis l’ancien format'})});
    }
  }catch(e){}
  return fresh;
}
function saveState(){
  localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
  $('saveStatus').textContent='Enregistré · '+new Date().toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'});
}
function monthKey(date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`}
function activeWorkers(){return state.workers.filter(w=>w.active)}
function number(v){const n=Number(String(v??'').replace(',','.'));return Number.isFinite(n)?n:0}
function fmt(n){return new Intl.NumberFormat('fr-FR',{maximumFractionDigits:2}).format(n)}
function esc(v){return String(v??'').replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]))}
function doctorById(id){return state.workers.find(w=>w.id===id)}
function monthEntries(){return state.entries.filter(e=>e.date.startsWith(currentMonth)).sort((a,b)=>b.date.localeCompare(a.date)||String(b.id).localeCompare(String(a.id)))}
function monthWithdrawals(){return state.withdrawals.filter(w=>w.date.startsWith(currentMonth)).sort((a,b)=>b.date.localeCompare(a.date)||String(b.id).localeCompare(String(a.id)))}
function generatedFromConsultations(value){return number(value)*CONSULTATION_PRICE}

function render(){
  $('monthPicker').value=currentMonth;
  renderDoctorOptions();
  renderSummary();
  renderEntries();
  renderWithdrawals();
  renderDoctorStats();
  renderWorkersCount();
}
function renderDoctorOptions(){
  const workers=activeWorkers();
  const options='<option value="">Choisir un médecin</option>'+workers.map(w=>`<option value="${w.id}">${esc(w.name)}</option>`).join('');
  const entryCurrent=$('entryDoctor')?.value||'';
  const withdrawalCurrent=$('withdrawalDoctor')?.value||'';
  if($('entryDoctor')){$('entryDoctor').innerHTML=options;if(workers.some(w=>w.id===entryCurrent))$('entryDoctor').value=entryCurrent}
  if($('withdrawalDoctor')){$('withdrawalDoctor').innerHTML=options;if(workers.some(w=>w.id===withdrawalCurrent))$('withdrawalDoctor').value=withdrawalCurrent}
}
function renderSummary(){
  const entries=monthEntries(),withdrawals=monthWithdrawals();
  const consultations=entries.reduce((s,e)=>s+number(e.consultations),0);
  const generated=entries.reduce((s,e)=>s+generatedFromConsultations(e.consultations),0);
  const taken=withdrawals.reduce((s,w)=>s+number(w.amount),0);
  $('summaryConsultations').textContent=fmt(consultations);
  $('summaryGenerated').textContent=fmt(generated);
  $('summaryTaken').textContent=fmt(taken);
  $('summaryBalance').textContent=fmt(generated-taken);
}
function renderEntries(){
  const entries=monthEntries();
  $('entriesCount').textContent=`${entries.length} ${entries.length===1?'saisie':'saisies'}`;
  if(!entries.length){$('entriesList').innerHTML='<div class="empty-state">Aucune saisie pour ce mois.<br>Ajoutez la première avec « Nouvelle saisie ».</div>';return}
  $('entriesList').innerHTML=entries.map(e=>{
    const d=new Date(`${e.date}T12:00:00`),doctor=doctorById(e.doctorId),day=d.toLocaleDateString('fr-FR',{day:'2-digit'}),mon=d.toLocaleDateString('fr-FR',{month:'short'}).replace('.','');
    const generated=generatedFromConsultations(e.consultations);
    return `<article class="entry-item"><div class="entry-date">${day}<small>${mon}</small></div><div class="entry-main"><strong>${esc(doctor?.name||'Médecin')}</strong><p>${fmt(e.consultations)} consultations × ${CONSULTATION_PRICE} MRU${e.notes?` · ${esc(e.notes)}`:''}</p><div class="entry-actions"><button class="mini-btn" data-edit="${e.id}"><i class="fa-solid fa-pen"></i>Modifier</button><button class="mini-btn danger" data-delete="${e.id}"><i class="fa-solid fa-trash"></i>Supprimer</button></div></div><div class="entry-values"><strong>${fmt(generated)} MRU</strong><small>Généré</small></div></article>`;
  }).join('');
}
function renderWithdrawals(){
  const withdrawals=monthWithdrawals();
  $('withdrawalsCount').textContent=`${withdrawals.length} ${withdrawals.length===1?'retrait':'retraits'}`;
  if(!withdrawals.length){$('withdrawalsList').innerHTML='<div class="empty-state">Aucun retrait pour ce mois.</div>';return}
  $('withdrawalsList').innerHTML=withdrawals.map(w=>{
    const d=new Date(`${w.date}T12:00:00`),doctor=doctorById(w.doctorId),day=d.toLocaleDateString('fr-FR',{day:'2-digit'}),mon=d.toLocaleDateString('fr-FR',{month:'short'}).replace('.','');
    return `<article class="entry-item"><div class="entry-date">${day}<small>${mon}</small></div><div class="entry-main"><strong>${esc(doctor?.name||'Médecin')}</strong><p>${w.notes?esc(w.notes):'Retrait'}</p><div class="entry-actions"><button class="mini-btn" data-edit-withdrawal="${w.id}"><i class="fa-solid fa-pen"></i>Modifier</button><button class="mini-btn danger" data-delete-withdrawal="${w.id}"><i class="fa-solid fa-trash"></i>Supprimer</button></div></div><div class="entry-values"><strong>${fmt(w.amount)} MRU</strong><small>Retiré</small></div></article>`;
  }).join('');
}
function renderDoctorStats(){
  const entries=monthEntries(),withdrawals=monthWithdrawals(),workers=activeWorkers();
  const totals=workers.map(w=>{
    const own=entries.filter(e=>e.doctorId===w.id),ownW=withdrawals.filter(x=>x.doctorId===w.id);
    const consultations=own.reduce((s,e)=>s+number(e.consultations),0);
    return{w,consultations,generated:consultations*CONSULTATION_PRICE,taken:ownW.reduce((s,x)=>s+number(x.amount),0)};
  });
  const max=Math.max(1,...totals.map(x=>x.consultations));
  $('doctorStats').innerHTML=totals.length?totals.map(x=>`<div class="doctor-stat"><div class="doctor-stat-head"><strong>${esc(x.w.name)}</strong><span>${fmt(x.consultations)}</span></div><small>${fmt(x.generated)} MRU générés · ${fmt(x.taken)} MRU retirés</small><div class="bar"><i style="width:${x.consultations?Math.max(5,(x.consultations/max)*100):0}%"></i></div></div>`).join(''):'<div class="empty-state">Aucun médecin actif.</div>';
}
function renderWorkersCount(){$('workersCount').textContent=`${activeWorkers().length} actif${activeWorkers().length>1?'s':''}`}

function updateGeneratedPreview(){if($('entryGenerated'))$('entryGenerated').value=generatedFromConsultations($('entryConsultations').value)}
function openEntryDialog(){if(!activeWorkers().length){showToast('Ajoutez d’abord un médecin');openWorkers();return}resetForm();$('entryDialog').showModal()}
function closeEntryDialog(){if($('entryDialog').open)$('entryDialog').close();resetForm()}
function submitEntry(e){
  e.preventDefault();
  const doctorId=$('entryDoctor').value,date=$('entryDate').value,consultations=Math.max(0,Math.floor(number($('entryConsultations').value)));
  if(!doctorId||!date)return;
  const data={date,doctorId,consultations,generated:consultations*CONSULTATION_PRICE,notes:$('entryNotes').value.trim()};
  if(editingId){
    const i=state.entries.findIndex(x=>String(x.id)===String(editingId));
    if(i>=0)state.entries[i]={...state.entries[i],...data};
    showToast('Saisie modifiée');
  }else{
    state.entries.push({id:`s${Date.now()}`,...data});
    showToast('Saisie enregistrée');
  }
  currentMonth=date.slice(0,7);saveState();render();closeEntryDialog();
}
function editEntry(id){
  const x=state.entries.find(e=>String(e.id)===String(id));if(!x)return;
  editingId=x.id;renderDoctorOptions();
  $('entryDate').value=x.date;$('entryDoctor').value=x.doctorId;$('entryConsultations').value=x.consultations;$('entryNotes').value=x.notes||'';
  updateGeneratedPreview();$('entryDialogTitle').textContent='Modifier la saisie';$('entryDialog').showModal();
}
function deleteEntry(id){if(!confirm('Supprimer cette saisie ?'))return;state.entries=state.entries.filter(e=>String(e.id)!==String(id));saveState();render();showToast('Saisie supprimée')}
function resetForm(){editingId=null;$('entryForm').reset();$('entryDate').value=new Date().toISOString().slice(0,10);$('entryDialogTitle').textContent='Nouvelle saisie';renderDoctorOptions();updateGeneratedPreview()}

function openWithdrawalDialog(){
  if(!activeWorkers().length){showToast('Ajoutez d’abord un médecin');openWorkers();return}
  resetWithdrawalForm();$('withdrawalDialog').showModal();
}
function closeWithdrawalDialog(){if($('withdrawalDialog').open)$('withdrawalDialog').close();resetWithdrawalForm()}
function submitWithdrawal(e){
  e.preventDefault();
  const doctorId=$('withdrawalDoctor').value;
  const date=$('withdrawalDate').value;
  const amount=number($('withdrawalAmount').value);
  if(!doctorId){showToast('Choisissez un médecin');return}
  if(!date){showToast('Choisissez une date');return}
  if(amount<=0){showToast('Le montant doit être supérieur à 0');return}
  const data={date,doctorId,amount:Math.round(amount*100)/100,notes:$('withdrawalNotes').value.trim()};
  if(editingWithdrawalId){
    const i=state.withdrawals.findIndex(x=>String(x.id)===String(editingWithdrawalId));
    if(i<0){showToast('Retrait introuvable');return}
    state.withdrawals[i]={...state.withdrawals[i],...data};
    showToast('Retrait modifié');
  }else{
    state.withdrawals.push({id:`r${Date.now()}-${Math.random().toString(36).slice(2,7)}`,...data});
    showToast('Retrait enregistré');
  }
  currentMonth=date.slice(0,7);saveState();render();closeWithdrawalDialog();
}
function editWithdrawal(id){
  const w=state.withdrawals.find(x=>String(x.id)===String(id));if(!w){showToast('Retrait introuvable');return}
  editingWithdrawalId=w.id;renderDoctorOptions();
  $('withdrawalDate').value=w.date;$('withdrawalDoctor').value=w.doctorId;$('withdrawalAmount').value=w.amount;$('withdrawalNotes').value=w.notes||'';
  $('withdrawalDialogTitle').textContent='Modifier le retrait';$('withdrawalDialog').showModal();
}
function deleteWithdrawal(id){
  const exists=state.withdrawals.some(w=>String(w.id)===String(id));if(!exists){showToast('Retrait introuvable');return}
  if(!confirm('Supprimer ce retrait ?'))return;
  state.withdrawals=state.withdrawals.filter(w=>String(w.id)!==String(id));saveState();render();showToast('Retrait supprimé');
}
function resetWithdrawalForm(){editingWithdrawalId=null;$('withdrawalForm').reset();$('withdrawalDate').value=new Date().toISOString().slice(0,10);$('withdrawalDialogTitle').textContent='Nouveau retrait';renderDoctorOptions()}

function changeMonth(delta){const[y,m]=currentMonth.split('-').map(Number);currentMonth=monthKey(new Date(y,m-1+delta,1));render()}
function openWorkers(){renderWorkers();$('workersDialog').showModal()}
function closeWorkers(){if($('workersDialog').open)$('workersDialog').close()}
function renderWorkers(){const workers=activeWorkers();$('workersList').innerHTML=workers.map(w=>`<div class="worker-item"><input class="worker-name" data-worker-name="${w.id}" value="${esc(w.name)}" aria-label="Nom du médecin"><button type="button" class="danger-btn" data-remove-worker="${w.id}" aria-label="Supprimer ${esc(w.name)}"><i class="fa-solid fa-trash"></i></button></div>`).join('')||'<div class="empty-state">Aucun médecin actif.</div>';renderWorkersCount()}
function addWorker(){const input=$('newWorkerName'),name=input.value.trim();if(!name)return;if(activeWorkers().some(w=>w.name.toLowerCase()===name.toLowerCase())){showToast('Ce médecin existe déjà');return}state.workers.push({id:`w${Date.now()}`,name,active:true});input.value='';saveState();renderWorkers();render();showToast('Médecin ajouté')}
function removeWorker(id){const w=doctorById(id);if(!w||!confirm(`Retirer ${w.name} de la liste ?`))return;w.active=false;saveState();renderWorkers();render();showToast('Médecin retiré')}
function renameWorker(id,name){const w=doctorById(id);if(w&&name.trim()){w.name=name.trim();saveState();render();showToast('Nom mis à jour')}}

function excelDate(dateStr){const[y,m,d]=dateStr.split('-').map(Number);return new Date(y,m-1,d)}
function exportData(){
  if(typeof XLSX==='undefined'){alert('Le module Excel n’a pas pu être chargé.');return}
  if(!state.entries.length&&!state.withdrawals.length){showToast('Aucune donnée à exporter');return}
  const shifts=[...state.entries].sort((a,b)=>a.date.localeCompare(b.date)).map(e=>({Date:excelDate(e.date),Travailleur:doctorById(e.doctorId)?.name||'Médecin',Consultations:number(e.consultations),'Prix/consultation (MRU)':CONSULTATION_PRICE,'Total généré (MRU)':generatedFromConsultations(e.consultations),Remarque:e.notes||''}));
  const totalConsultations=shifts.reduce((s,r)=>s+r.Consultations,0),totalGenerated=shifts.reduce((s,r)=>s+r['Total généré (MRU)'],0);
  shifts.push({Date:'',Travailleur:'TOTAL',Consultations:totalConsultations,'Prix/consultation (MRU)':'','Total généré (MRU)':totalGenerated,Remarque:''});
  const withdrawals=[...state.withdrawals].sort((a,b)=>a.date.localeCompare(b.date)).map(w=>({Date:excelDate(w.date),Travailleur:doctorById(w.doctorId)?.name||'Médecin','Montant retiré (MRU)':number(w.amount),Remarque:w.notes||''}));
  const totalWithdrawn=withdrawals.reduce((s,r)=>s+r['Montant retiré (MRU)'],0);
  withdrawals.push({Date:'',Travailleur:'TOTAL','Montant retiré (MRU)':totalWithdrawn,Remarque:''});
  const resume=[{Indicateur:'Total consultations',Valeur:totalConsultations},{Indicateur:'Prix par consultation (MRU)',Valeur:CONSULTATION_PRICE},{Indicateur:'Total généré (MRU)',Valeur:totalGenerated},{Indicateur:'Total retiré (MRU)',Valeur:totalWithdrawn},{Indicateur:'Solde (MRU)',Valeur:totalGenerated-totalWithdrawn}];
  const wb=XLSX.utils.book_new();
  const ws1=XLSX.utils.json_to_sheet(shifts,{header:['Date','Travailleur','Consultations','Prix/consultation (MRU)','Total généré (MRU)','Remarque']});ws1['!cols']=[{wch:13},{wch:24},{wch:15},{wch:23},{wch:20},{wch:42}];ws1['!autofilter']={ref:`A1:F${Math.max(2,shifts.length)}`};
  const ws2=XLSX.utils.json_to_sheet(withdrawals,{header:['Date','Travailleur','Montant retiré (MRU)','Remarque']});ws2['!cols']=[{wch:13},{wch:24},{wch:22},{wch:42}];ws2['!autofilter']={ref:`A1:D${Math.max(2,withdrawals.length)}`};
  const ws3=XLSX.utils.json_to_sheet(resume);ws3['!cols']=[{wch:30},{wch:18}];
  [ws1,ws2].forEach(ws=>Object.keys(ws).forEach(k=>{if(/^A\d+$/.test(k)&&ws[k]?.v instanceof Date){ws[k].t='d';ws[k].z='dd/mm/yyyy'}}));
  XLSX.utils.book_append_sheet(wb,ws1,'Saisies');XLSX.utils.book_append_sheet(wb,ws2,'Retraits');XLSX.utils.book_append_sheet(wb,ws3,'Résumé');
  XLSX.writeFile(wb,`cabinet-sene-export-${new Date().toISOString().slice(0,10)}.xlsx`,{compression:true});showToast('Excel exporté');
}
async function importData(file){if(!file)return;try{const data=JSON.parse(await file.text());if(!Array.isArray(data.workers)||!Array.isArray(data.entries))throw new Error();state={workers:data.workers,entries:data.entries.map(e=>({...e,generated:generatedFromConsultations(e.consultations)})),withdrawals:Array.isArray(data.withdrawals)?data.withdrawals:[]};saveState();render();showToast('Sauvegarde importée')}catch(e){alert('Impossible d’importer cette sauvegarde.')}$('importInput').value=''}
function showToast(text){const el=$('toast');el.textContent=text;el.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>el.classList.remove('show'),1800)}

$('entryConsultations').addEventListener('input',updateGeneratedPreview);
$('openEntryBtn').addEventListener('click',openEntryDialog);$('fabEntryBtn').addEventListener('click',openEntryDialog);$('entryForm').addEventListener('submit',submitEntry);$('closeEntryBtn').addEventListener('click',closeEntryDialog);$('cancelEntryBtn').addEventListener('click',closeEntryDialog);$('entryDialog').addEventListener('click',e=>{if(e.target===$('entryDialog'))closeEntryDialog()});
$('openWithdrawalBtn').addEventListener('click',openWithdrawalDialog);$('openWithdrawalBtn2').addEventListener('click',openWithdrawalDialog);$('withdrawalForm').addEventListener('submit',submitWithdrawal);$('closeWithdrawalBtn').addEventListener('click',closeWithdrawalDialog);$('cancelWithdrawalBtn').addEventListener('click',closeWithdrawalDialog);$('withdrawalDialog').addEventListener('click',e=>{if(e.target===$('withdrawalDialog'))closeWithdrawalDialog()});
$('entriesList').addEventListener('click',e=>{const edit=e.target.closest('[data-edit]'),del=e.target.closest('[data-delete]');if(edit)editEntry(edit.dataset.edit);if(del)deleteEntry(del.dataset.delete)});
$('withdrawalsList').addEventListener('click',e=>{const edit=e.target.closest('[data-edit-withdrawal]'),del=e.target.closest('[data-delete-withdrawal]');if(edit)editWithdrawal(edit.dataset.editWithdrawal);if(del)deleteWithdrawal(del.dataset.deleteWithdrawal)});
$('prevMonthBtn').addEventListener('click',()=>changeMonth(-1));$('nextMonthBtn').addEventListener('click',()=>changeMonth(1));$('monthPicker').addEventListener('change',e=>{if(e.target.value){currentMonth=e.target.value;render()}});
$('manageWorkersBtn').addEventListener('click',openWorkers);$('addDoctorQuickBtn').addEventListener('click',openWorkers);$('closeWorkersBtn').addEventListener('click',closeWorkers);$('workersDialog').addEventListener('click',e=>{if(e.target===$('workersDialog'))closeWorkers()});$('addWorkerBtn').addEventListener('click',addWorker);$('newWorkerName').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();addWorker()}});$('workersList').addEventListener('click',e=>{const btn=e.target.closest('[data-remove-worker]');if(btn)removeWorker(btn.dataset.removeWorker)});$('workersList').addEventListener('change',e=>{if(e.target.dataset.workerName)renameWorker(e.target.dataset.workerName,e.target.value)});
$('exportBtn').addEventListener('click',exportData);$('importInput').addEventListener('change',e=>importData(e.target.files[0]));
resetForm();resetWithdrawalForm();render();saveState();
