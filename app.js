/* Budget & Forecast — ING-stijl (zonder logo's)
   Data-opslag: localStorage onder key 'ing-budget.v2'
*/
(function(){
  const LS_KEY = 'ing-budget.v2';

  /** ---------- Utilities ---------- */
  const € = Intl.NumberFormat('nl-NL', { style:'currency', currency:'EUR' });
  const fmt = v => €.format(v || 0);
  const parseAmount = v => Number(String(v).replace(',', '.')) || 0;
  const todayISO = () => new Date().toISOString().slice(0,10);
  const addDays = (d, n) => { const dt = new Date(d); dt.setDate(dt.getDate()+n); return dt; };

  const startOfWeek = (d=new Date()) => { // maandag
    const dt = new Date(d);
    const day = dt.getDay(); // 0=zo .. 6=za
    const diff = (day === 0 ? -6 : 1) - day;
    dt.setDate(dt.getDate()+diff);
    dt.setHours(0,0,0,0);
    return dt;
  };
  const startOfMonth = (d=new Date()) => new Date(d.getFullYear(), d.getMonth(), 1);
  const startOfQuarter = (d=new Date()) => new Date(d.getFullYear(), Math.floor(d.getMonth()/3)*3, 1);
  const startOfYear = (d=new Date()) => new Date(d.getFullYear(), 0, 1);
  const endOfPeriod = (start, type) => {
    const dt = new Date(start);
    if(type==='week') return addDays(dt, 6);
    if(type==='maand') return new Date(dt.getFullYear(), dt.getMonth()+1, 0);
    if(type==='kwartaal') return new Date(dt.getFullYear(), Math.floor(dt.getMonth()/3)*3 + 3, 0);
    if(type==='jaar') return new Date(dt.getFullYear(), 11, 31);
    return dt;
  };

  const byId = id => document.getElementById(id);

  // ---- Hardening & Debug ----
  function showBanner(msg){
    const b = document.getElementById('debugBanner');
    if(!b) return;
    b.style.display = 'block';
    b.style.background = '#fff0f0';
    b.style.border = '1px solid #ffc9c9';
    b.style.color = '#8a0030';
    b.style.padding = '10px 16px';
    b.style.margin = '8px 16px';
    b.style.borderRadius = '12px';
    b.textContent = msg;
  }
  window.addEventListener('error', function(ev){
    showBanner('JavaScript fout: ' + (ev?.message || 'onbekend'));
  });

  // Debug tools via ?debug=1
  if (location.search.includes('debug=1')) {
    var tools = document.getElementById('debugTools');
    if(tools) tools.style.display = 'block';
    var dbg = document.getElementById('debugBtn');
    if(dbg) dbg.addEventListener('click', function(){ openModal(null, { type:'expense' }); });
  }

  // Keyboard: "n" -> open nieuwe transactie (uitgave)
  window.addEventListener('keydown', function(e){
    if (e.key && e.key.toLowerCase() === 'n') { openModal(null, { type:'expense' }); }
  });

  const el = (tag, attrs={}, children=[]) => {
    const n = document.createElement(tag);
    Object.entries(attrs).forEach(([k,v]) => {
      if(k==='class') n.className = v;
      else if(k==='text') n.textContent = v;
      else if(k==='onclick') n.onclick = v;
      else n.setAttribute(k, v);
    });
    children.forEach(c => n.appendChild(c));
    return n;
  };

  /** ---------- State ---------- */
  const state = {
    txns: [],
    labels: new Set(),
    filter: { rangeType: 'maand', start: null, end: null, label: '', search: '' },
    sort: { key:'date', dir:'desc' },
  };

  const defaultLabels = [
    'salaris','freelance','toeslagen','overig inkomen',
    'boodschappen','hypotheek','huur','energie','water','internet','telefoon',
    'autoverzekering','zorg','andere verzekeringen','brandstof','openbaar vervoer','onderhoud auto',
    'kinderopvang','onderwijs','sport','uit eten','cadeaus','abonnementen','vakantie','overig'
  ];

  /** ---------- Storage ---------- */
  function load(){
    try{
      const raw = localStorage.getItem(LS_KEY);
      if(raw){
        const obj = JSON.parse(raw);
        state.txns = obj.txns || [];
      }
    }catch(e){ console.error('Load error', e) }
    state.labels = new Set([...defaultLabels, ...state.txns.map(t=>t.label).filter(Boolean)]);
  }
  function save(){
    localStorage.setItem(LS_KEY, JSON.stringify({ txns: state.txns }));
  }

  /** ---------- Filters & Period ---------- */
  function setDefaultPeriod(anchorDate=new Date()){
    const select = byId('rangeSelect').value;
    state.filter.rangeType = select;
    if(select==='week'){
      const s = startOfWeek(anchorDate);
      state.filter.start = s; state.filter.end = endOfPeriod(s, 'week');
    }else if(select==='maand'){
      const s = startOfMonth(anchorDate);
      state.filter.start = s; state.filter.end = endOfPeriod(s, 'maand');
    }else if(select==='kwartaal'){
      const s = startOfQuarter(anchorDate);
      state.filter.start = s; state.filter.end = endOfPeriod(s, 'kwartaal');
    }else if(select==='jaar'){
      const s = startOfYear(anchorDate);
      state.filter.start = s; state.filter.end = endOfPeriod(s, 'jaar');
    }else{
      const from = byId('fromDate').value;
      const to = byId('toDate').value;
      state.filter.start = from ? new Date(from) : null;
      state.filter.end = to ? new Date(to) : null;
    }
  }
  function shiftPeriod(dir){
    const type = state.filter.rangeType;
    if(type==='custom') return; 
    const mult = dir;
    const s = new Date(state.filter.start);
    if(type==='week') s.setDate(s.getDate()+7*mult);
    if(type==='maand') s.setMonth(s.getMonth()+1*mult);
    if(type==='kwartaal') s.setMonth(s.getMonth()+3*mult);
    if(type==='jaar') s.setFullYear(s.getFullYear()+1*mult);
    state.filter.start = s; state.filter.end = endOfPeriod(s, type);
    render();
  }

  /** ---------- Transactions ---------- */
  function addOrUpdateTxn(txn){
    if(!txn.id){
      txn.id = crypto.randomUUID();
      state.txns.push(txn);
    }else{
      const i = state.txns.findIndex(t=>t.id===txn.id);
      if(i>=0) state.txns[i] = txn; else state.txns.push(txn);
    }
    state.labels.add(txn.label);
    save(); render();
  }
  function deleteTxn(id){
    state.txns = state.txns.filter(t=>t.id!==id);
    save(); render();
  }

  /** ---------- Derived Data ---------- */
  const inRange = (d, start, end) => {
    if(!d) return false;
    const ts = new Date(d).setHours(0,0,0,0);
    const s = start ? new Date(start).setHours(0,0,0,0) : -Infinity;
    const e = end ? new Date(end).setHours(0,0,0,0) : Infinity;
    return ts>=s && ts<=e;
  };

  function occurrencesWithin(start, end, txn){
    if(!txn.recurring) return 0;
    const freq = txn.frequency || 'monthly';
    const firstDate = new Date(txn.date);
    if(end < firstDate) return 0;
    const until = txn.until ? new Date(txn.until) : null;
    const last = until && until < end ? until : end;

    let count = 0;
    for(let dt = new Date(firstDate); dt <= last; ){
      if(dt >= start && dt <= last) count++;
      if(freq==='weekly') dt = addDays(dt, 7);
      else if(freq==='monthly') { dt = new Date(dt); dt.setMonth(dt.getMonth()+1); }
      else if(freq==='yearly')  { dt = new Date(dt); dt.setFullYear(dt.getFullYear()+1); }
      else if(freq==='quarterly'){ dt = new Date(dt); dt.setMonth(dt.getMonth()+3); } // compat
      if(until && dt > until) break;
    }
    return count;
  }

  function compute(){
    const { start, end } = state.filter;
    const labelFilter = state.filter.label;
    const search = state.filter.search.toLowerCase();

    const periodTxns = state.txns.filter(t => {
      const matchRange = inRange(t.date, start, end);
      const matchLabel = !labelFilter || t.label === labelFilter;
      const matchSearch = !search || (t.notes||'').toLowerCase().includes(search) || (t.label||'').toLowerCase().includes(search);
      return matchRange && matchLabel && matchSearch;
    });

    const income = periodTxns.filter(t=>t.type==='income').reduce((s,t)=>s + t.amount, 0);
    const expense = periodTxns.filter(t=>t.type==='expense').reduce((s,t)=>s + t.amount, 0);
    const net = income - expense;

    const saldo = state.txns.reduce((s,t)=> s + (t.type==='income' ? t.amount : -t.amount), 0);

    let forecastNet = 0;
    state.txns.forEach(t => {
      if(!t.recurring) return;
      const cnt = occurrencesWithin(start, end, t);
      if(cnt>0) forecastNet += (t.type==='income' ? 1 : -1) * (t.amount * cnt);
    });

    return { periodTxns, saldo, income, expense, net, forecastNet };
  }

  /** ---------- Rendering ---------- */
  function renderFilters(){
    const labelFilter = byId('labelFilter');
    const labelList = byId('labelList');
    labelFilter.innerHTML = '<option value=\"\">Alle labels</option>' + [...state.labels].sort().map(l=>`<option value=\"${l}\">${l}</option>`).join('');
    labelList.innerHTML = [...state.labels].sort().map(l=>`<option value=\"${l}\">`).join('');
    const rs = byId('rangeSelect').value;
    byId('customRange').classList.toggle('hidden', rs!=='custom');
  }

  function renderTable(items){
    const tbody = document.querySelector('#txnTable tbody');
    const dir = state.sort.dir === 'asc' ? 1 : -1;
    const key = state.sort.key;

    const sorted = [...items].sort((a,b)=>{
      let va = a[key], vb = b[key];
      if(key==='amount'){ va = +va; vb = +vb; }
      if(key==='date'){ va = new Date(va); vb = new Date(vb); }
      if(va<vb) return -1*dir;
      if(va>vb) return  1*dir;
      return 0;
    });

    tbody.innerHTML = '';
    sorted.forEach(t => {
      const tr = el('tr', {}, [
        el('td', { text: new Date(t.date).toLocaleDateString('nl-NL') }),
        el('td', {}, [ el('span', { class: 'badge', text: t.type==='income' ? 'Inkomst' : 'Uitgave' }) ]),
        el('td', { text: fmt(t.amount*(t.type==='income'?1:-1)) }),
        el('td', { text: t.label || '' }),
        el('td', { text: t.notes || '' }),
        el('td', { text: t.recurring ? (t.frequency || 'maandelijks') : 'nee' }),
        el('td', {}, [ el('button', { class:'btn', text:'Bewerk', onclick:()=>openModal(t.id) }) ])
      ]);
      tbody.appendChild(tr);
    }); } // end if Chart
  }

  function renderKPIs(data){
    byId('kpiSaldo').textContent = fmt(data.saldo);
    byId('kpiIncome').textContent = fmt(data.income);
    byId('kpiExpense').textContent = fmt(data.expense);
    const netEl = byId('kpiNetto');
    netEl.textContent = fmt(data.net);
    netEl.classList.toggle('positive', data.net >= 0);
    netEl.classList.toggle('negative', data.net < 0);
    byId('kpiForecast').textContent = fmt(data.forecastNet);
  }

  let labelChart, saldoChart;
  function renderCharts(data){
    const { periodTxns } = data;
    const spend = periodTxns.filter(t=>t.type==='expense').reduce((acc,t)=>{
      acc[t.label||'onbekend'] = (acc[t.label||'onbekend']||0) + t.amount;
      return acc;
    }, {});
    const labels = Object.keys(spend);
    const values = Object.values(spend);

    if(labelChart) labelChart.destroy();
    if (window.Chart) { labelChart = new Chart(document.getElementById('labelChart'), {
      type: 'doughnut',
      data: { labels, datasets: [{ data: values }]},
      options: { plugins: { legend: { position: 'bottom' } }, responsive: true, maintainAspectRatio: false }
    }); } // end if Chart

    const all = [...periodTxns].sort((a,b)=> new Date(a.date) - new Date(b.date));
    let cum = 0;
    const x = [], y = [];
    all.forEach(t=>{
      cum += (t.type==='income' ? t.amount : -t.amount);
      x.push(new Date(t.date).toLocaleDateString('nl-NL'));
      y.push(cum);
    });
    if(saldoChart) saldoChart.destroy();
    if (window.Chart) { saldoChart = new Chart(document.getElementById('saldoChart'), {
      type: 'line',
      data: { labels: x, datasets: [{ label:'Netto (cumulatief)', data: y, fill:false, tension:.2 }]},
      options: { plugins:{ legend:{ display:false } }, responsive:true, maintainAspectRatio:false }
    }); } // end if Chart
  }

  function render(){
    renderFilters();
    const data = compute();
    renderKPIs(data);
    renderTable(data.periodTxns);
    renderCharts(data);
    setupWhatIf(data);
  }

  /** ---------- What-if ---------- */
  function setupWhatIf(data){
    const btn = byId('whatIfBtn');
    const dateEl = byId('whatIfDate');
    const amtEl = byId('whatIfAmount');
    if(!dateEl.value) dateEl.value = state.filter.start ? new Date(state.filter.start).toISOString().slice(0,10) : todayISO();

    const base = data.forecastNet;
    byId('whatIfForecast').textContent = fmt(base);
    byId('whatIfDelta').textContent = fmt(0);

    btn.onclick = () => {
      const d = dateEl.value ? new Date(dateEl.value) : null;
      const a = parseAmount(amtEl.value);
      let adjusted = base;
      if(d && inRange(d, state.filter.start, state.filter.end)){
        adjusted -= a; 
      }
      byId('whatIfForecast').textContent = fmt(adjusted);
      byId('whatIfDelta').textContent = (adjusted-base>=0?'+':'') + fmt(adjusted - base);
    };
  }

  /** ---------- Modal ---------- */
  const modal = byId('modal');
  const txnForm = byId('txnForm');

  function openModal(id=null, defaults={}){
    byId('modalTitle').textContent = id ? 'Transactie bewerken' : 'Nieuwe transactie';
    byId('deleteBtn').classList.toggle('hidden', !id);
    txnForm.reset();
    byId('txnId').value = id || '';
    byId('txnDate').value = todayISO();
    if(defaults.type){ byId('txnType').value = defaults.type; }
    if(defaults.recurring!==undefined){ byId('txnRecurring').checked = !!defaults.recurring; }
    if(defaults.frequency){ byId('txnFrequency').value = defaults.frequency; }

    if(id){
      const t = state.txns.find(x=>x.id===id);
      if(t){
        byId('txnType').value = t.type;
        byId('txnAmount').value = t.amount;
        byId('txnDate').value = t.date;
        byId('txnLabel').value = t.label || '';
        byId('txnNotes').value = t.notes || '';
        byId('txnRecurring').checked = !!t.recurring;
        byId('txnFrequency').value = t.frequency || 'monthly';
        byId('txnUntil').value = t.until || '';
      }
    }
    modal.classList.remove('hidden');
    setTimeout(()=>byId('txnAmount').focus(), 10);
  }
  function closeModal(){ modal.classList.add('hidden') }

  txnForm.addEventListener('submit', (e)=>{
    e.preventDefault();
    const txn = {
      id: byId('txnId').value || null,
      type: byId('txnType').value,
      amount: parseAmount(byId('txnAmount').value),
      date: byId('txnDate').value,
      label: byId('txnLabel').value.trim(),
      notes: byId('txnNotes').value.trim(),
      recurring: byId('txnRecurring').checked,
      frequency: byId('txnFrequency').value,
      until: byId('txnUntil').value || null
    };
    addOrUpdateTxn(txn);
    closeModal();
  });
  byId('deleteBtn').addEventListener('click', ()=>{
    const id = byId('txnId').value;
    if(id && confirm('Weet je zeker dat je deze transactie wilt verwijderen?')){
      deleteTxn(id);
      closeModal();
    }
  });
  const _expBtn = byId('addExpenseBtn'); if(_expBtn) _expBtn.addEventListener('click', ()=>openModal(null, { type:'expense' }));
  const _incBtn = byId('addIncomeBtn'); if(_incBtn) _incBtn.addEventListener('click', ()=>openModal(null, { type:'income' }));
  const _closeBtn = byId('modalClose'); if(_closeBtn) _closeBtn.addEventListener('click', closeModal);
  window.addEventListener('keydown', (e)=>{ if(e.key==='Escape') closeModal() });
  modal.addEventListener('click', (e)=>{ if(e.target===modal) closeModal() });
  // Fallback: event delegation (works even if buttons are added later)
  document.addEventListener('click', (e)=>{
    const t = e.target;
    if(t && (t.id === 'addExpenseBtn' || (t.closest && t.closest('#addExpenseBtn')))) {
      e.preventDefault(); openModal(null, { type:'expense' }); 
    }
    if(t && (t.id === 'addIncomeBtn' || (t.closest && t.closest('#addIncomeBtn')))) {
      e.preventDefault(); openModal(null, { type:'income' }); 
    }
  });


  /** ---------- Export / Import ---------- */
  byId('exportBtn').addEventListener('click', ()=>{
    const data = JSON.stringify({ txns: state.txns }, null, 2);
    const blob = new Blob([data], { type:'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `budget-export-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  });
  byId('importFile').addEventListener('change', (e)=>{
    const file = e.target.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = (ev)=>{
      try{
        const obj = JSON.parse(ev.target.result);
        if(Array.isArray(obj.txns)){
          state.txns = obj.txns;
          save(); render();
        }else{
          alert('Onjuist bestand.');
        }
      }catch(err){
        alert('Import mislukt: ' + err.message);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  });

  /** ---------- Table interactions ---------- */
  document.querySelectorAll('#txnTable thead th[data-sort]').forEach(th=>{
    th.addEventListener('click', ()=>{
      const key = th.getAttribute('data-sort');
      if(state.sort.key===key){
        state.sort.dir = state.sort.dir==='asc' ? 'desc' : 'asc';
      }else{
        state.sort.key = key;
        state.sort.dir = key==='date' ? 'desc' : 'asc';
      }
      render();
    });
  });
  byId('searchInput').addEventListener('input', e=>{ state.filter.search = e.target.value; render(); });

  /** ---------- Period controls ---------- */
  const rangeSelect = byId('rangeSelect');
  rangeSelect.addEventListener('change', ()=>{
    const val = rangeSelect.value;
    state.filter.rangeType = val;
    if(val==='custom'){
      byId('customRange').classList.remove('hidden');
    }else{
      byId('customRange').classList.add('hidden');
      setDefaultPeriod(new Date()); render();
    }
  });
  byId('fromDate').addEventListener('change', ()=>{ setDefaultPeriod(); render(); });
  byId('toDate').addEventListener('change', ()=>{ setDefaultPeriod(); render(); });
  byId('prevRange').addEventListener('click', ()=> shiftPeriod(-1));
  byId('nextRange').addEventListener('click', ()=> shiftPeriod(1));
  byId('todayRange').addEventListener('click', ()=> { setDefaultPeriod(new Date()); render(); });

  byId('labelFilter').addEventListener('change', (e)=>{ state.filter.label = e.target.value; render(); });

  /** ---------- Bootstrap ---------- */
  load();
  setDefaultPeriod(new Date());
  render();

  // Seed example if empty
  if(state.txns.length===0){
    const d = todayISO().slice(0,8);
    const seed = [
      {type:'income', amount: 2500, date: d+'01', label:'salaris', notes:'maandsalaris', recurring:true, frequency:'monthly', until:null},
      {type:'expense', amount: 1100, date: d+'02', label:'hypotheek', notes:'', recurring:true, frequency:'monthly', until:null},
      {type:'expense', amount: 85,   date: d+'03', label:'autoverzekering', notes:'', recurring:true, frequency:'monthly', until:null},
      {type:'expense', amount: 145,  date: d+'05', label:'zorg', notes:'zorgverzekering', recurring:true, frequency:'monthly', until:null},
      {type:'expense', amount: 350,  date: d+'10', label:'boodschappen', notes:'', recurring:false},
    ].map(t=>({ id: crypto.randomUUID(), ...t }));
    state.txns = seed; save(); render();
  }
})();