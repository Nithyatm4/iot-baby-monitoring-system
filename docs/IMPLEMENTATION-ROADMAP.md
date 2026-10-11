# Implementation roadmap

## Done in this starter
- Software-only simulated sensor source
- Express API and JSON persistence
- Responsive dashboard and trend chart
- Alert history and acknowledgement
- Local statistical anomaly flags and summaries
- CSV export and camera placeholder

## Recommended next coding phases
1. Add automated tests for API routes and anomaly detection.
2. Replace JSON persistence with SQLite when the data model is stable.
3. Add authentication and server-side authorization before any remote deployment.
4. Add optional OpenRouter integration behind a backend-only API route, with key validation, rate limits, and a clear fallback if the API is unavailable.
5. Add a mock camera player or prerecorded demo clip if a visual demo is needed; do not claim it is a live camera.
6. Refactor the original firmware as a separate deliverable, with compile-time checks where a compatible toolchain is available. Physical hardware is not required for the web prototype.
7. Add unit and integration tests and document which behavior is simulated versus implemented.
