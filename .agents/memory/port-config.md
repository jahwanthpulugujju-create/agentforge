---
name: Port configuration
description: How dev ports are assigned; API server and Vite dev server ports
---

The API server (Express) uses `SERVER_PORT` env var (default 3001).
Vite dev server uses `port: 5000` in vite.config.ts, which is what the external mapping points to (`.replit` maps localPort 5000 → externalPort 80).
Vite proxies /api, /auth, /socket.io to `http://127.0.0.1:3001` (read from .ocr/data/server-port).

**Why:** If both server and Vite fight for port 5000, Vite bumps to 5001, breaking the external port mapping and showing the raw API server (404s on /) in the preview pane.

**How to apply:** Always keep SERVER_PORT at a non-5000 value (3001 by default). Vite stays on 5000.
