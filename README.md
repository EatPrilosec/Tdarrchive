# 📦 Tdarrchive

**Tdarrchive** is a modern, standalone web application and archival tool designed to connect to your [Tdarr](https://tdarr.io) instance, visualize complex transcoding workflows using the authentic Tdarr Flow engine and dark theme, and export them into multiple formats:
- 📄 **Tdarr-Importable JSON**: 100% compatible templates ready to paste directly into Tdarr's *Import JSON Template* interface.
- 📸 **High-Resolution Screenshots (PNG / SVG / JPEG)**: Lossless, full-canvas captures with customized DPI scaling (1x, 2x, 4x Ultra-HD) faithfully matching Tdarr's visual design.
- 🌐 **Portable Standalone HTML Viewers**: Single, self-contained `.html` files with pan, zoom, minimap, node search, and parameter inspectors requiring zero internet connection or external dependencies.
- 🌳 **Flow Tree Mega-Viewer (HTML)**: An intelligent composite compiler that discovers `goToFlow` / sub-flow references across your instance and stitches them into a unified, interactive mega-flow diagram with visual cluster boundaries.

---

## 🚀 Quick Start with Docker

### Using Docker Run
```bash
docker run -d \
  --name tdarrchive \
  -p 8267:8267 \
  -e PORT=8267 \
  -e TDARR_URL=http://<your-tdarr-ip>:8265 \
  -e TDARR_API_KEY=tapi_xxxxxxxxxxxxxx \
  --restart unless-stopped \
  ghcr.io/munch/tdarrchive:latest
```

Open your browser at **`http://localhost:8267`**.

### Using Docker Compose
```yaml
services:
  tdarrchive:
    image: ghcr.io/${GITHUB_REPOSITORY:-munch/tdarrchive}:latest
    container_name: tdarrchive
    restart: unless-stopped
    ports:
      - "8267:8267"
    environment:
      - PORT=8267
      - NODE_ENV=production
      - TDARR_URL=http://tdarr-server:8265
      - TDARR_API_KEY=
```

---

## 🛠 Features

| Feature | Description |
| :--- | :--- |
| **Live Tdarr Sync** | Connects to any Tdarr server via IP/Port and `x-api-key`. Queries `FlowJSONDB` via internal database API. |
| **Authentic Flow Engine** | Recreates Tdarr's exact node categorizations (Input, Filter, Transcode, Flow, Notify, File), handle badges (True/False, Output), and curved connectors. |
| **Flow Tree Resolver** | Stitches parent flows and sub-flows linked via `goToFlow` plugins into one cohesive graph with namespace collision prevention and visual cluster boundaries. |
| **Portable HTML Generator** | Exports a single, zero-dependency `.html` file containing inlined SVGs, pan/zoom engine, minimap, search, and node inspector. |
| **High-DPI Lossless Capture** | In-browser SVG/Canvas export and server-side headless Chromium rendering engine for 4K Ultra-HD diagrams. |
| **Bulk Archiving (.ZIP)** | One-click export bundling all JSON templates, standalone HTML viewers, Flow Tree Mega-Viewer, and screenshots. |
| **Offline & Drag-and-Drop** | Works standalone without a live server by importing local JSON files or using the built-in sample flow tree. |

---

## ⚙️ Environment Variables

| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `8267` | Port for the web UI and API server. |
| `TDARR_URL` | `http://localhost:8265` | Default Tdarr server address. |
| `TDARR_API_KEY` | *(empty)* | Optional Tdarr API key (`x-api-key`). |
| `NODE_ENV` | `production` | Node.js environment mode. |
| `PUPPETEER_EXECUTABLE_PATH` | `/usr/bin/chromium` | Path to system Chromium for headless screenshot rendering. |

---

## 🏗 Local Development

```bash
# Clone the repository
git clone https://github.com/munch/Tdarrchive.git
cd Tdarrchive

# Install all workspace dependencies
npm run install:all

# Run backend (port 8267) and Vite frontend (port 5173 with proxy) concurrently
npm run dev

# Build production bundle
npm run build

# Start production server
npm start
```

---

## 🔄 Automated CI/CD (GitHub Actions)

The repository includes a GitHub Actions workflow (`.github/workflows/docker-publish.yml`) that automatically:
- Builds multi-architecture Docker images (`linux/amd64`, `linux/arm64`).
- Tags images with semantic versions (`v1.0.0`), branch names, commit SHAs, and `latest`.
- Pushes directly to GitHub Container Registry (`ghcr.io`).

---

## 📄 License
MIT License
