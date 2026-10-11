# LittleWatch — IoT Baby Monitoring System

IoT-based Baby Monitoring System with a responsive web dashboard, simulated sensor data, real-time monitoring, alert management, historical analytics, and local AI-assisted anomaly detection. Built with Node.js, Express, JavaScript, and a modular architecture for future ESP32 and camera integration.

## Included features

- Responsive web dashboard
- Simulated temperature, humidity, sound, motion, gas-index, and moisture-index readings
- Express backend API
- Persistent JSON files for readings and alerts (`data/readings.json`, `data/alerts.json`)
- Configurable simulator interval and history limit
- Rule-based demo alerts and acknowledge action
- Local statistical anomaly flags against recent simulated history
- AI-assisted summary endpoint (local rule engine; no external AI API required)
- Trend chart and CSV export
- Camera preview placeholder
- Manual button to trigger a demo alert

## Requirements

- Windows 10/11
- Node.js 18 or newer
- VS Code
- Internet connection on first run to download npm dependencies and load Chart.js from CDN

No Arduino IDE, ESP32, physical sensors, camera, Adafruit IO account, or API key is needed to run this software prototype.

## Run on Windows

1. Open this folder in VS Code.
2. Open **Terminal → New Terminal**.
3. Install dependencies:
   ```powershell
   npm install
   ```
4. Optionally create a local environment file by copying `.env.example` to `.env`.
5. Start the application:
   ```powershell
   npm start
   ```
6. Open `http://localhost:3000` in your browser.
7. Click **Trigger demo alert** to demonstrate the alert workflow. Use **Export readings as CSV** to export simulated readings.
8. Stop the server with `Ctrl+C` in the terminal.

## API endpoints

- `GET /api/health` — backend health check
- `GET /api/state` — latest reading, recent readings, alerts, and counts
- `GET /api/readings?limit=100` — historical readings
- `GET /api/alerts` — alert list
- `POST /api/alerts/:id/acknowledge` — acknowledge an alert
- `POST /api/simulator/trigger-demo-event` — generate a demo event
- `GET /api/ai/summary` — local rule-based summary of simulated data
- `GET /api/export/readings.csv` — CSV export

## AI implementation note

The initial AI feature is a transparent, local statistical/rule-based analysis layer. It checks configured demo ranges, compares values with recent history, and summarizes observations. It does not require an external API key. A hosted AI model can be integrated later through the backend, keeping credentials in `.env`.

## Current limitations

- All sensor readings are simulated and must never be interpreted as real-world readings.
- Demo thresholds are for demonstrating software behavior only, not infant-safety or medical limits.
- Camera is a placeholder; there is no actual video feed in this software-only build.
- Data is stored in local JSON files for easy setup, not a production database.
- Chart.js is loaded from a CDN.

## Original firmware

The original ESP32 sketches are kept in `firmware/` for code reference and software firmware corrections.

## Safety note

This is an educational software prototype, not a certified baby monitor or medical device. It cannot determine whether a baby is safe, diagnose a condition, or replace appropriate supervision.

## License

This project is licensed under the [MIT License](LICENSE).
