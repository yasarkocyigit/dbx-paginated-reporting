# Paginated Reporting

Enterprise-style, Databricks-native paginated reporting platform for metadata-driven report development, runtime validation, and controlled PDF export.

## Overview

This project provides a full report lifecycle in one application:
- data discovery from Unity Catalog
- structure modeling and query generation
- template authoring (Designer mode and Advanced HTML mode)
- runtime parameterized preview against real warehouse data
- paginated PDF export
- AI-assisted report development through Databricks Model Serving

The goal is to deliver an SSRS-like workflow with a modern, cloud-native, Databricks-first implementation.

## Key Capabilities

### Data and Metadata
- Unity Catalog drill-down discovery (`catalog -> schema -> table -> columns`)
- structure definitions persisted in Lakebase
- inferred field graph (including nested fields)
- reusable metadata layer across templates

### Report Authoring
- `Designer` mode for metadata-driven report composition
- `HTML` mode for full Mustache + HTML control
- reusable snippet insertion for common report blocks
- automatic template save behavior with guarded template switching

### Preview and Export
- runtime parameter overrides
- backend-applied query filters, grouping, and sorting
- query trace/debug visibility in preview
- paginated rendering and production-style PDF export

### AI Assistant
- REST and WebSocket chat endpoints
- optional template-aware context prompt
- powered by Databricks Model Serving endpoint

## Architecture

### Backend
- FastAPI service layer
- repositories over Lakebase (PostgreSQL)
- Databricks SQL connector for data retrieval
- Databricks SDK for workspace integrations
- model-serving connector for AI assistant

### Frontend
- Vue 3 + TypeScript + Vite
- TanStack Query for server-state APIs
- Pinia for local view state
- CodeMirror-based editor experience
- Mustache rendering pipeline

## Repository Structure

```text
back-end/
  app.py
  common/
    config.py
    connectors/
    factories/
  migrations/
  models/
  repositories/
  routes/v1/
  services/
  static/

front-end/
  src/
    api/
    components/
    stores/
    utils/
    views/
  vite.config.ts
  orval.config.ts

examples/
  general_ledger_all_features_template.html
  general_ledger_ssrs_demo_template.html
```

## Local Development

### Prerequisites
- Python `3.11+`
- Node.js `18+`
- npm `9+`
- Databricks workspace access
- Lakebase and SQL Warehouse credentials

### Start Backend

```bash
cd back-end
pip install -r requirements.txt
uvicorn app:app --reload --port 8012
```

### Start Frontend

```bash
cd front-end
npm install
VITE_API_PROXY_TARGET=http://127.0.0.1:8012 npm run dev -- --port 5180
```

Application URL:
- `http://localhost:5180`

## Configuration

See `back-end/.env.example` for the full set. Primary variables:
- `DATABRICKS_HOST`
- `DATABRICKS_TOKEN` (or OAuth equivalents)
- `DATABRICKS_WAREHOUSE_ID` or `DATABRICKS_WAREHOUSE_PATH`
- `LAKEBASE_INSTANCE_NAME`
- `LAKEBASE_DATABASE_NAME`
- `MODEL_SERVING_ENDPOINT` (default fallback: `databricks-claude-sonnet-4-6`)

## Product Workflow

### 1) Data Structures
- create structure
- select source table(s)
- build and infer fields
- persist generated query metadata

### 2) Template Editor
- create/select template
- choose `Designer` or `HTML` authoring mode
- edit with live preview support
- save metadata and layout updates

### 3) Preview and Export
- select template
- apply runtime parameters
- validate filter behavior in debug view
- export full paginated PDF

## API Surface (Core)

### Structures
- `GET /api/v1/structures/`
- `POST /api/v1/structures/`
- `PUT /api/v1/structures/{structure_id}`
- `POST /api/v1/structures/{structure_id}/build`

### Templates
- `GET /api/v1/templates/`
- `POST /api/v1/templates/`
- `PUT /api/v1/templates/{template_id}`
- `POST /api/v1/templates/{template_id}/preview-data`
- `POST /api/v1/templates/{template_id}/parameter-options`

### AI Agent
- `POST /api/v1/agent/chat`
- `WS /api/v1/agent/ws`

## Data Rendering Contract

Template render payload uses a `rows` collection. Example:

```json
{
  "rows": [
    { "txn_id": "TXN-1", "department": "FIN", "_index": 1, "_total": 2 },
    { "txn_id": "TXN-2", "department": "OPS", "_index": 2, "_total": 2 }
  ]
}
```

Supported patterns:
- scalar: `{{field}}`
- list section: `{{#rows}}...{{/rows}}`
- object path: `{{customer.name}}`
- nested list: `{{#line_items}}...{{/line_items}}`

## Quality and Safety Notes

To prevent template cross-write issues during fast switching:
- autosave is guarded with template snapshot checks
- stale async save requests are ignored
- template IDs remain stable UUID references

Recommended next hardening step for multi-user concurrency:
- optimistic locking on update (`version` or `updated_at` checks)

## Regenerate Frontend API Client

```bash
cd front-end
npm run generate-all
```

With custom OpenAPI URL:

```bash
cd front-end
OPENAPI_URL=http://127.0.0.1:8012/openapi.json npm run generate-all
```

## Troubleshooting

### UI runs but API calls fail
- verify backend is running on expected port
- verify `VITE_API_PROXY_TARGET` points to backend URL

### Preview shows no rows
- validate structure query
- validate selected fields
- validate runtime parameters and applied filters

### Host mismatch (`localhost` vs `127.0.0.1`)
- use the exact host printed by Vite in local startup logs

## License

Internal/demo use unless explicitly licensed otherwise.
