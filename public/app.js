let chart;
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function timeLabel(value) { return new Date(value).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', second:'2-digit'}); }
function setupChart() {
  const ctx = $('trendChart');
  if (!window.Chart) { ctx.parentElement.innerHTML = '<div class="empty">Chart library unavailable. Connect to the internet to load Chart.js.</div>'; return; }
  chart = new Chart(ctx, { type:'line', data:{ labels:[], datasets:[
    {label:'Temperature °C',data:[],borderColor:'#e67c72',backgroundColor:'rgba(230,124,114,.08)',borderWidth:2,pointRadius:1.5,tension:.35,yAxisID:'y'},
    {label:'Humidity %',data:[],borderColor:'#5e8fe8',backgroundColor:'rgba(94,143,232,.08)',borderWidth:2,pointRadius:1.5,tension:.35,yAxisID:'y1'}
  ]}, options:{responsive:true,maintainAspectRatio:false,interaction:{mode:'index',intersect:false},plugins:{legend:{labels:{boxWidth:8,usePointStyle:true,font:{size:10}}}},scales:{x:{grid:{display:false},ticks:{maxTicksLimit:7,color:'#9299a8',font:{size:9}}},y:{position:'left',grid:{color:'#f0f1f5'},ticks:{color:'#9299a8',font:{size:9}}},y1:{position:'right',grid:{drawOnChartArea:false},min:0,max:100,ticks:{color:'#9299a8',font:{size:9}}}}}});
}
function renderAlerts(alerts) {
  const open = alerts.filter(a => !a.acknowledged).length;
  $('alertCount').textContent = `${open} open`;
  if (!alerts.length) { $('alertList').innerHTML = '<div class="empty">No alerts yet. The simulator will create demo events over time.</div>'; return; }
  $('alertList').innerHTML = alerts.slice(0,7).map(a => `<div class="alert-item"><div class="alert-symbol ${a.severity==='info'?'info':''}">${a.type==='anomaly'?'✧':'!'}</div><div class="alert-copy"><strong>${esc(a.title)}</strong><p>${esc(a.detail)}</p><div class="alert-meta">${timeLabel(a.createdAt)} · ${esc(a.severity || 'info').toUpperCase()}${a.acknowledged?' · ACKNOWLEDGED':''}</div></div>${a.acknowledged?'':`<button class="ack-button" data-ack="${esc(a.id)}">Acknowledge</button>`}</div>`).join('');
  document.querySelectorAll('[data-ack]').forEach(b => b.addEventListener('click', async () => { await fetch(`/api/alerts/${encodeURIComponent(b.dataset.ack)}/acknowledge`, {method:'POST'}); refresh(); }));
}
async function refreshInsights() {
  const el = $('insightList'); el.innerHTML = '<div class="empty">Updating local analysis…</div>';
  try { const r = await fetch('/api/ai/summary'); const data = await r.json(); el.innerHTML = `<div class="insight-line">${esc(data.summary)}</div>` + data.observations.map(x=>`<div class="insight-line">${esc(x)}</div>`).join(''); }
  catch { el.innerHTML = '<div class="empty">Could not load insights. Check that the backend is running.</div>'; }
}
async function refresh() {
  try {
    const response = await fetch('/api/state'); if (!response.ok) throw new Error('API error');
    const state = await response.json(); const r = state.latest;
    $('temperature').textContent = Number(r.temperatureC).toFixed(1); $('humidity').textContent = r.humidityPct;
    $('sound').textContent = r.soundLevel; $('motion').textContent = r.motionDetected ? 'Detected' : 'None';
    $('temperatureStatus').textContent = r.temperatureC > 28 || r.temperatureC < 16 ? 'Outside demo range' : 'Within demo range';
    $('gas').textContent = r.gasIndex; $('moisture').textContent = r.moistureIndex;
    $('gasBar').style.width = `${Math.min(100, r.gasIndex/500*100)}%`; $('moistureBar').style.width = `${Math.min(100, r.moistureIndex/4095*100)}%`;
    $('lastUpdated').textContent = `Last update: ${timeLabel(r.timestamp)}`;
    if (chart) { chart.data.labels = state.readings.map(x=>timeLabel(x.timestamp)); chart.data.datasets[0].data = state.readings.map(x=>x.temperatureC); chart.data.datasets[1].data = state.readings.map(x=>x.humidityPct); chart.update('none'); }
    renderAlerts(state.alerts);
  } catch { $('alertList').innerHTML = '<div class="empty">Backend not reachable. Start the app with npm start.</div>'; }
}
$('demoEvent').addEventListener('click', async () => { const b=$('demoEvent'); b.disabled=true; try { await fetch('/api/simulator/trigger-demo-event',{method:'POST'}); await refresh(); await refreshInsights(); } finally { b.disabled=false; } });
$('refreshInsights').addEventListener('click', refreshInsights);
setupChart(); refresh(); refreshInsights(); setInterval(refresh, 4000); setInterval(refreshInsights, 30000);
