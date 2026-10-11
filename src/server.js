require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const { randomUUID } = require('crypto');

const app = express();
const PORT = Number(process.env.PORT || 3000);
const INTERVAL_MS = Math.max(2000, Number(process.env.SIMULATOR_INTERVAL_MS || 5000));
const MAX_RECORDS = Math.max(50, Number(process.env.MAX_HISTORY_RECORDS || 500));
const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'data');
const READINGS_FILE = path.join(DATA_DIR, 'readings.json');
const ALERTS_FILE = path.join(DATA_DIR, 'alerts.json');
fs.mkdirSync(DATA_DIR, { recursive: true });

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}
function writeJson(file, value) { fs.writeFileSync(file, JSON.stringify(value, null, 2)); }
let readings = readJson(READINGS_FILE, []);
let alerts = readJson(ALERTS_FILE, []);
let lastAlertKeys = new Set();
let tick = 0;

function clamp(n, min, max) { return Math.min(max, Math.max(min, n)); }
function jitter(center, amount) { return center + (Math.random() * 2 - 1) * amount; }
function latestBaseline(key, count = 20) {
  const values = readings.slice(-count).map(r => r[key]).filter(v => typeof v === 'number' && Number.isFinite(v));
  if (values.length < 5) return null;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length;
  return { mean, sd: Math.sqrt(variance), n: values.length };
}
function analyzeReading(r) {
  const findings = [];
  // These are demo thresholds for software behavior only, not baby-safety or medical limits.
  if (r.temperatureC > 28 || r.temperatureC < 16) findings.push({ key: 'temperature', severity: 'warning', title: 'Temperature outside demo range', detail: `Simulated room temperature is ${r.temperatureC.toFixed(1)} °C; review the configured demo threshold.` });
  if (r.humidityPct > 70 || r.humidityPct < 25) findings.push({ key: 'humidity', severity: 'info', title: 'Humidity outside demo range', detail: `Simulated humidity is ${r.humidityPct.toFixed(0)}%; check the room environment if this were a real reading.` });
  if (r.soundLevel > 78) findings.push({ key: 'sound', severity: 'warning', title: 'High sound reading', detail: `The simulated sound level is elevated. A simple sound sensor cannot identify crying by itself.` });
  if (r.motionDetected) findings.push({ key: 'motion', severity: 'info', title: 'Motion detected', detail: 'The simulator reported movement. Motion data does not establish whether a baby is safe.' });
  for (const key of ['temperatureC', 'humidityPct', 'soundLevel', 'gasIndex', 'moistureIndex']) {
    const base = latestBaseline(key);
    if (base && base.sd > 0) {
      const z = Math.abs((r[key] - base.mean) / base.sd);
      if (z >= 2.8) findings.push({ key, severity: 'info', title: 'Unusual pattern detected', detail: `AI-assisted statistical check flagged ${key} as unusual compared with recent simulated history (about ${z.toFixed(1)} standard deviations from the recent mean).`, type: 'anomaly' });
    }
  }
  return findings;
}
function createAlert(finding, readingId) {
  const key = `${finding.key}:${finding.title}`;
  if (lastAlertKeys.has(key)) return;
  lastAlertKeys.add(key);
  alerts.push({ id: randomUUID(), createdAt: new Date().toISOString(), readingId, acknowledged: false, ...finding });
  if (alerts.length > MAX_RECORDS) alerts = alerts.slice(-MAX_RECORDS);
  writeJson(ALERTS_FILE, alerts);
}
function generateReading() {
  tick++;
  const unusual = tick % 23 === 0;
  const r = {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    source: 'simulator',
    temperatureC: Number(clamp(jitter(22.5, 1.6) + (unusual ? 7 : 0), 14, 36).toFixed(1)),
    humidityPct: Math.round(clamp(jitter(48, 8), 15, 90)),
    soundLevel: Math.round(clamp(jitter(35, 18) + (unusual ? 55 : 0), 0, 100)),
    motionDetected: Math.random() < 0.12,
    gasIndex: Math.round(clamp(jitter(120, 18) + (unusual ? 150 : 0), 0, 500)),
    moistureIndex: Math.round(clamp(jitter(2600, 250), 0, 4095)),
    deviceStatus: 'simulated',
    cameraStatus: 'demo-placeholder'
  };
  readings.push(r);
  if (readings.length > MAX_RECORDS) readings = readings.slice(-MAX_RECORDS);
  writeJson(READINGS_FILE, readings);
  const findings = analyzeReading(r);
  findings.forEach(f => createAlert(f, r.id));
  if (findings.length === 0) lastAlertKeys.clear();
  return r;
}

app.use(express.json({ limit: '100kb' }));
app.use(express.static(path.join(ROOT, 'public')));
app.get('/api/health', (_req, res) => res.json({ ok: true, mode: 'simulated', uptimeSeconds: Math.round(process.uptime()), timestamp: new Date().toISOString() }));
app.get('/api/state', (_req, res) => {
  if (!readings.length) generateReading();
  res.json({ mode: 'simulated', latest: readings[readings.length - 1], readings: readings.slice(-60), alerts: alerts.slice(-30).reverse(), totals: { readings: readings.length, unacknowledgedAlerts: alerts.filter(a => !a.acknowledged).length }, notice: 'All readings are simulated and are not real measurements or safety advice.' });
});
app.get('/api/readings', (req, res) => {
  const limit = clamp(Number.parseInt(req.query.limit, 10) || 100, 1, MAX_RECORDS);
  res.json(readings.slice(-limit));
});
app.get('/api/alerts', (_req, res) => res.json(alerts.slice().reverse()));
app.post('/api/alerts/:id/acknowledge', (req, res) => {
  const alert = alerts.find(a => a.id === req.params.id);
  if (!alert) return res.status(404).json({ error: 'Alert not found' });
  alert.acknowledged = true;
  writeJson(ALERTS_FILE, alerts);
  res.json(alert);
});
app.post('/api/simulator/trigger-demo-event', (_req, res) => {
  const r = generateReading();
  // Force an obvious software demo finding without implying a real-world safety event.
  createAlert({ key: 'demo', severity: 'warning', title: 'Manual demo event', detail: 'This alert was generated by the demo button to demonstrate the alert workflow.', type: 'demo' }, r.id);
  res.json({ reading: r, message: 'Demo event generated.' });
});
app.get('/api/ai/summary', (_req, res) => {
  const recent = readings.slice(-20);
  if (!recent.length) return res.json({ summary: 'Waiting for simulated readings.', observations: [], generatedBy: 'local-rule-engine' });
  const avg = key => recent.reduce((s, r) => s + r[key], 0) / recent.length;
  const unacked = alerts.filter(a => !a.acknowledged).length;
  const observations = [
    `Reviewed ${recent.length} recent simulated readings.`,
    `Average simulated temperature: ${avg('temperatureC').toFixed(1)} °C.`,
    `Average simulated humidity: ${avg('humidityPct').toFixed(0)}%.`,
    `${unacked} unacknowledged demo alert(s) are currently recorded.`
  ];
  const recentAnomalies = alerts.filter(a => a.type === 'anomaly').slice(-3);
  if (recentAnomalies.length) observations.push(`Recent statistical flags: ${recentAnomalies.map(a => a.key).join(', ')}.`);
  res.json({ summary: 'This is a local, rule-based summary of simulated data—not a diagnosis or a medical/safety assessment.', observations, generatedBy: 'local-rule-engine', createdAt: new Date().toISOString() });
});
app.get('/api/export/readings.csv', (_req, res) => {
  const keys = ['timestamp','temperatureC','humidityPct','soundLevel','motionDetected','gasIndex','moistureIndex','source'];
  const csv = [keys.join(','), ...readings.map(r => keys.map(k => JSON.stringify(r[k] ?? '')).join(','))].join('\n');
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="simulated-readings.csv"');
  res.send(csv);
});

if (!readings.length) for (let i = 0; i < 12; i++) generateReading();
setInterval(generateReading, INTERVAL_MS).unref();
app.listen(PORT, () => console.log(`Baby Monitor demo running at http://localhost:${PORT} (simulated data only)`));
