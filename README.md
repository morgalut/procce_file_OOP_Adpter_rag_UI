# QBR Intelligence — React dashboard

React 19 + Vite dashboard for the **existing** QBR FastAPI service. No backend replacement, no mock API responses.

## Included screens
Overview and API health; PDF upload/extraction; document metadata; validation; vector indexing; semantic search; OpenAPI-driven API Explorer.

## Local development

Terminal A (project root):
```bash
uvicorn qbr.api.main:app --reload --host 127.0.0.1 --port 8000 --env-file .env
```

Terminal B:
```bash
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 . Vite proxies `/api`, `/health`, and `/openapi.json` to port 8000. The browser therefore avoids CORS issues.

## Build and serve from FastAPI

```bash
cd frontend
npm ci   # if package-lock.json is present; otherwise npm install
npm run build
```

Copy `frontend/dist/` into the existing backend under `src/qbr/api/react_dist/` (or change the path in the integration snippet below).

Add to your FastAPI application setup **after API routes are registered**:

```python
from pathlib import Path
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

react_dist = Path(__file__).resolve().parent / 'react_dist'
if react_dist.joinpath('index.html').is_file():
    app.mount('/assets', StaticFiles(directory=react_dist / 'assets'), name='react-assets')
    @app.get('/ui', include_in_schema=False)
    @app.get('/ui/', include_in_schema=False)
    async def react_ui():
        return FileResponse(react_dist / 'index.html')
```

If the old static dashboard is registered at `/ui`, remove its registration first to avoid a route collision. No changes are required to your six existing business endpoints.

## Docker
Use the included `frontend/Dockerfile` to build a standalone Nginx-served React UI. `frontend/nginx.conf` proxies API requests to `api:8000` on the same Docker Compose network. Merge `compose.react.example.yml` into your existing Compose file; do **not** replace your current DB volumes or services. The React service will be accessible at http://localhost:5173 .

## Verification
```bash
cd frontend
npm test
npm run build
```

Automated tests validate API utilities and OpenAPI operation discovery. Live PDF/DB/LLM integration must be checked against your running backend.

## Notes
The dashboard tracks document IDs in browser localStorage; it does not invent a document-list API. API Explorer discovers any additional endpoints from the live OpenAPI schema. Semantic search returns stored chunks; it is not an LLM answer generator.
