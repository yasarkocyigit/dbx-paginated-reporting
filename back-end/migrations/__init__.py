"""
SQL migration strings for Lakebase PostgreSQL tables.

Storing migrations as Python strings avoids OS-level file reads
and simplifies deployment (no need to bundle .sql files separately).
"""

# -- app schema ----------------------------------------------------------------
# Created before any tables so we avoid needing CREATE privileges on 'public'.

CREATE_APP_SCHEMA = "CREATE SCHEMA IF NOT EXISTS {schema}"

# -- structures table ----------------------------------------------------------

CREATE_STRUCTURES_TABLE = """\
CREATE TABLE IF NOT EXISTS structures (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    fields JSONB NOT NULL DEFAULT '[]',
    tables JSONB NOT NULL DEFAULT '[]',
    relationships JSONB NOT NULL DEFAULT '[]',
    selected_columns JSONB NOT NULL DEFAULT '[]',
    sql_query TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
)"""

# -- templates table -----------------------------------------------------------

CREATE_TEMPLATES_TABLE = """\
CREATE TABLE IF NOT EXISTS templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    structure_id UUID NOT NULL REFERENCES structures(id) ON DELETE CASCADE,
    html_content TEXT NOT NULL DEFAULT '',
    definition_json JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
)"""

ALTER_TEMPLATES_ADD_DEFINITION_JSON = """\
ALTER TABLE templates
ADD COLUMN IF NOT EXISTS definition_json JSONB NOT NULL DEFAULT '{}'::jsonb"""

CREATE_TEMPLATES_INDEXES = """\
CREATE INDEX IF NOT EXISTS idx_templates_structure_id
    ON templates(structure_id)"""

# -- seed: structures ----------------------------------------------------------

SEED_STRUCTURES = """\
INSERT INTO structures (id, name, fields, tables, selected_columns, sql_query) VALUES
(
    'a0000000-0000-0000-0000-000000000001',
    'Customer Directory',
    '[
        {"name": "customerID", "type": "number"},
        {"name": "first_name", "type": "string"},
        {"name": "last_name", "type": "string"},
        {"name": "email_address", "type": "string"},
        {"name": "phone_number", "type": "string"},
        {"name": "address", "type": "string"},
        {"name": "city", "type": "string"},
        {"name": "state", "type": "string"},
        {"name": "country", "type": "string"},
        {"name": "continent", "type": "string"},
        {"name": "postal_zip_code", "type": "number"},
        {"name": "gender", "type": "string"}
    ]'::jsonb,
    '[{"full_name": "samples.bakehouse.sales_customers", "alias": "sales_customers"}]'::jsonb,
    '["customerID", "first_name", "last_name", "email_address", "phone_number", "address", "city", "state", "country", "continent", "postal_zip_code", "gender"]'::jsonb,
    'SELECT customerID, first_name, last_name, email_address, phone_number, address, city, state, country, continent, postal_zip_code, gender FROM samples.bakehouse.sales_customers'
),
(
    'a0000000-0000-0000-0000-000000000002',
    'Supplier Directory',
    '[
        {"name": "supplierID", "type": "number"},
        {"name": "name", "type": "string"},
        {"name": "ingredient", "type": "string"},
        {"name": "continent", "type": "string"},
        {"name": "city", "type": "string"},
        {"name": "district", "type": "string"},
        {"name": "size", "type": "string"},
        {"name": "longitude", "type": "number"},
        {"name": "latitude", "type": "number"},
        {"name": "approved", "type": "string"}
    ]'::jsonb,
    '[{"full_name": "samples.bakehouse.sales_suppliers", "alias": "sales_suppliers"}]'::jsonb,
    '["supplierID", "name", "ingredient", "continent", "city", "district", "size", "longitude", "latitude", "approved"]'::jsonb,
    'SELECT supplierID, name, ingredient, continent, city, district, size, longitude, latitude, approved FROM samples.bakehouse.sales_suppliers'
),
(
    'a0000000-0000-0000-0000-000000000003',
    'General Ledger Detail',
    '[
        {"name": "txn_date", "type": "string"},
        {"name": "txn_id", "type": "string"},
        {"name": "description", "type": "string"},
        {"name": "department", "type": "string"},
        {"name": "gl_code", "type": "string"},
        {"name": "account_group", "type": "string"},
        {"name": "debit_amount", "type": "number"},
        {"name": "credit_amount", "type": "number"},
        {"name": "grand_total_debit", "type": "number"},
        {"name": "grand_total_credit", "type": "number"}
    ]'::jsonb,
    '[{"full_name": "samples.tpch.lineitem", "alias": "lineitem"}]'::jsonb,
    '["txn_date", "txn_id", "description", "department", "gl_code", "account_group", "debit_amount", "credit_amount", "grand_total_debit", "grand_total_credit"]'::jsonb,
    'SELECT CAST(o.o_orderdate AS STRING) AS txn_date, CONCAT(''TXN-'', CAST((l.l_orderkey * 100) + l.l_linenumber AS STRING)) AS txn_id, p.p_name AS description, o.o_orderpriority AS department, CONCAT(''GL-'', CAST(1000 + PMOD(l.l_partkey, 9000) AS STRING)) AS gl_code, CONCAT(''Account Group: '', o.o_orderstatus) AS account_group, CASE WHEN PMOD(l.l_linenumber, 2) = 0 THEN ROUND(l.l_extendedprice * (1 - l.l_discount), 2) END AS debit_amount, CASE WHEN PMOD(l.l_linenumber, 2) = 1 THEN ROUND(l.l_extendedprice * (1 - l.l_discount), 2) END AS credit_amount, SUM(CASE WHEN PMOD(l.l_linenumber, 2) = 0 THEN ROUND(l.l_extendedprice * (1 - l.l_discount), 2) ELSE 0 END) OVER () AS grand_total_debit, SUM(CASE WHEN PMOD(l.l_linenumber, 2) = 1 THEN ROUND(l.l_extendedprice * (1 - l.l_discount), 2) ELSE 0 END) OVER () AS grand_total_credit FROM samples.tpch.lineitem l INNER JOIN samples.tpch.orders o ON l.l_orderkey = o.o_orderkey INNER JOIN samples.tpch.part p ON l.l_partkey = p.p_partkey'
)
ON CONFLICT (id) DO NOTHING"""

# -- seed: templates -----------------------------------------------------------
# Template HTML is stored via separate per-template inserts to keep strings manageable.

_CUSTOMER_PER_PAGE_HTML = r"""<div class="report-preview">
  <div class="report-page">
    <div class="report-page-header">
      <h1>Customer Profiles</h1>
      <p class="lead">Individual Customer Report</p>
    </div>
    <div class="text-center my-4">
      <i class="bi bi-people-fill" style="font-size: 4rem; color: #3498db;"></i>
      <p class="text-muted mt-3">samples.bakehouse.sales_customers</p>
    </div>
    <div class="page-number">Cover Page</div>
  </div>
  {{#rows}}
  <div class="report-page">
    <div class="report-page-header">
      <div class="d-flex justify-content-between align-items-center">
        <div>
          <h2>{{first_name}} {{last_name}}</h2>
          <p class="text-muted mb-0">Customer #{{customerID}}</p>
        </div>
        <span class="badge bg-primary fs-6">{{gender}}</span>
      </div>
    </div>
    <div class="row mb-4">
      <div class="col-md-4">
        <div class="text-center p-4 bg-light rounded">
          <i class="bi bi-person-circle" style="font-size: 5rem; color: #6c757d;"></i>
          <h4 class="mt-3">{{first_name}} {{last_name}}</h4>
          <p class="text-muted">Record {{_index}} of {{_total}}</p>
        </div>
      </div>
      <div class="col-md-8">
        <div class="card h-100">
          <div class="card-header"><strong>Contact Information</strong></div>
          <div class="card-body">
            <table class="table table-borderless mb-0">
              <tr><td class="text-muted" style="width:140px;">Email:</td><td><strong>{{email_address}}</strong></td></tr>
              <tr><td class="text-muted">Phone:</td><td><strong>{{phone_number}}</strong></td></tr>
              <tr><td class="text-muted">Address:</td><td><strong>{{address}}</strong></td></tr>
            </table>
          </div>
        </div>
      </div>
    </div>
    <div class="row mb-4">
      <div class="col-md-6">
        <div class="card">
          <div class="card-header"><strong>Location</strong></div>
          <div class="card-body">
            <table class="table table-borderless mb-0">
              <tr><td class="text-muted" style="width:120px;">City:</td><td><strong>{{city}}</strong></td></tr>
              <tr><td class="text-muted">State:</td><td><strong>{{state}}</strong></td></tr>
              <tr><td class="text-muted">Country:</td><td><strong>{{country}}</strong></td></tr>
              <tr><td class="text-muted">Continent:</td><td><strong>{{continent}}</strong></td></tr>
              <tr><td class="text-muted">Postal Code:</td><td><strong>{{postal_zip_code}}</strong></td></tr>
            </table>
          </div>
        </div>
      </div>
      <div class="col-md-6">
        <div class="report-tile tile-primary mb-3">
          <div class="report-tile-title">Customer ID</div>
          <div class="report-tile-value">{{customerID}}</div>
        </div>
        <div class="report-tile tile-success">
          <div class="report-tile-title">Region</div>
          <div class="report-tile-value">{{continent}}</div>
        </div>
      </div>
    </div>
    <div class="page-number">Customer {{_index}} of {{_total}}</div>
  </div>
  {{/rows}}
</div>"""

_SUPPLIER_PER_PAGE_HTML = r"""<div class="report-preview">
  <div class="report-page">
    <div class="report-page-header">
      <h1>Supplier Profiles</h1>
      <p class="lead">Individual Supplier Report</p>
    </div>
    <div class="text-center my-4">
      <i class="bi bi-shop" style="font-size: 4rem; color: #27ae60;"></i>
      <p class="text-muted mt-3">samples.bakehouse.sales_suppliers</p>
    </div>
    <div class="page-number">Cover Page</div>
  </div>
  {{#rows}}
  <div class="report-page">
    <div class="report-page-header">
      <div class="d-flex justify-content-between align-items-center">
        <div>
          <h2>{{name}}</h2>
          <p class="text-muted mb-0">Supplier #{{supplierID}}</p>
        </div>
        {{#approved}}<span class="badge bg-success fs-6">{{approved}}</span>{{/approved}}
      </div>
    </div>
    <div class="row mb-4">
      <div class="col-md-4">
        <div class="text-center p-4 bg-light rounded">
          <i class="bi bi-building" style="font-size: 5rem; color: #6c757d;"></i>
          <h4 class="mt-3">{{name}}</h4>
          <p class="text-muted">Record {{_index}} of {{_total}}</p>
        </div>
      </div>
      <div class="col-md-8">
        <div class="card h-100">
          <div class="card-header"><strong>Supplier Details</strong></div>
          <div class="card-body">
            <table class="table table-borderless mb-0">
              <tr><td class="text-muted" style="width:140px;">Supplier ID:</td><td><strong>{{supplierID}}</strong></td></tr>
              <tr><td class="text-muted">Ingredient:</td><td><strong>{{ingredient}}</strong></td></tr>
              <tr><td class="text-muted">Size:</td><td><strong>{{size}}</strong></td></tr>
              <tr><td class="text-muted">Approved:</td><td><strong>{{approved}}</strong></td></tr>
            </table>
          </div>
        </div>
      </div>
    </div>
    <div class="row mb-4">
      <div class="col-md-6">
        <div class="card">
          <div class="card-header"><strong>Location</strong></div>
          <div class="card-body">
            <table class="table table-borderless mb-0">
              <tr><td class="text-muted" style="width:120px;">City:</td><td><strong>{{city}}</strong></td></tr>
              <tr><td class="text-muted">District:</td><td><strong>{{district}}</strong></td></tr>
              <tr><td class="text-muted">Continent:</td><td><strong>{{continent}}</strong></td></tr>
            </table>
          </div>
        </div>
      </div>
      <div class="col-md-6">
        <div class="card">
          <div class="card-header"><strong>Coordinates</strong></div>
          <div class="card-body">
            <div class="report-tile tile-primary mb-3">
              <div class="report-tile-title">Longitude</div>
              <div class="report-tile-value">{{longitude}}</div>
            </div>
            <div class="report-tile tile-success">
              <div class="report-tile-title">Latitude</div>
              <div class="report-tile-value">{{latitude}}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="page-number">Supplier {{_index}} of {{_total}}</div>
  </div>
  {{/rows}}
</div>"""

_GENERAL_LEDGER_DETAIL_HTML = r"""<div class="report-page" style="font-family: Georgia, 'Times New Roman', serif; background: #fff; min-height: 1120px; padding: 40px 48px;">
  <div style="display:flex; justify-content:space-between; align-items:flex-end; border-bottom:2px solid #000; padding-bottom:10px; margin-bottom:20px;">
    <div>
      <h1 style="margin:0; font-size:56px; line-height:1;">General Ledger Detail</h1>
      <div style="font-size:12px; letter-spacing:1px; text-transform:uppercase; color:#6b7280; margin-top:6px;">Consolidated Entity: Global Corp Inc.</div>
    </div>
    <div style="text-align:right;">
      <div style="font-size:32px; font-weight:700; color:#111827;">Period: Dec 2024</div>
      <div style="font-size:11px; color:#9ca3af; margin-top:4px;">RUN: {{txn_date}}</div>
    </div>
  </div>

  <div style="display:grid; grid-template-columns:repeat(4, minmax(0, 1fr)); gap:10px; border:1px solid #d1d5db; background:#f3f4f6; padding:8px 10px; margin-bottom:18px; font-family:'Courier New', monospace; font-size:11px;">
    <div><span style="color:#6b7280;">DEPT:</span> <strong>ALL</strong></div>
    <div><span style="color:#6b7280;">STATUS:</span> <strong>POSTED, PENDING</strong></div>
    <div><span style="color:#6b7280;">CURR:</span> <strong>USD</strong></div>
    <div><span style="color:#6b7280;">USER:</span> <strong>SYS_ADMIN</strong></div>
  </div>

  <table style="width:100%; border-collapse:collapse; table-layout:fixed; font-size:11px;">
    <thead>
      <tr>
        <th style="text-align:left; border-bottom:1px solid #000; padding:6px 4px; width:90px;">DATE</th>
        <th style="text-align:left; border-bottom:1px solid #000; padding:6px 4px; width:130px;">TXN ID</th>
        <th style="text-align:left; border-bottom:1px solid #000; padding:6px 4px;">DESCRIPTION</th>
        <th style="text-align:left; border-bottom:1px solid #000; padding:6px 4px; width:120px;">DEPT</th>
        <th style="text-align:left; border-bottom:1px solid #000; padding:6px 4px; width:100px;">GL CODE</th>
        <th style="text-align:right; border-bottom:1px solid #000; padding:6px 4px; width:120px;">DEBIT</th>
        <th style="text-align:right; border-bottom:1px solid #000; padding:6px 4px; width:120px;">CREDIT</th>
      </tr>
    </thead>
    <tbody>
      <tr style="background:#f9fafb;">
        <td colspan="7" style="padding:6px 4px; border-bottom:1px solid #e5e7eb; font-style:italic; font-weight:700; color:#4b5563;">{{account_group}}</td>
      </tr>
      {{#rows}}
      <tr>
        <td style="padding:6px 4px; border-bottom:1px dotted #e5e7eb; color:#6b7280; font-family:'Courier New', monospace;">{{txn_date}}</td>
        <td style="padding:6px 4px; border-bottom:1px dotted #e5e7eb; color:#6b7280; font-family:'Courier New', monospace;">{{txn_id}}</td>
        <td style="padding:6px 4px; border-bottom:1px dotted #e5e7eb;">{{description}}</td>
        <td style="padding:6px 4px; border-bottom:1px dotted #e5e7eb; color:#6b7280;">{{department}}</td>
        <td style="padding:6px 4px; border-bottom:1px dotted #e5e7eb; color:#6b7280;">{{gl_code}}</td>
        <td style="padding:6px 4px; border-bottom:1px dotted #e5e7eb; text-align:right; font-family:'Courier New', monospace;">{{debit_amount}}</td>
        <td style="padding:6px 4px; border-bottom:1px dotted #e5e7eb; text-align:right; font-family:'Courier New', monospace;">{{credit_amount}}</td>
      </tr>
      {{/rows}}
      <tr style="background:#f3f4f6;">
        <td colspan="5" style="padding:8px 4px; border-top:2px solid #000; text-align:right; font-weight:700;">GRAND TOTAL:</td>
        <td style="padding:8px 4px; border-top:2px solid #000; text-align:right; font-weight:700; font-family:'Courier New', monospace;">{{grand_total_debit}}</td>
        <td style="padding:8px 4px; border-top:2px solid #000; text-align:right; font-weight:700; font-family:'Courier New', monospace;">{{grand_total_credit}}</td>
      </tr>
    </tbody>
  </table>

  <div style="position:absolute; left:48px; right:48px; bottom:18px; border-top:1px solid #e5e7eb; padding-top:6px; display:flex; justify-content:space-between; color:#9ca3af; font-size:10px; font-family:'Courier New', monospace;">
    <div>POWER BI PAGINATED REPORT STYLE</div>
    <div>CONFIDENTIAL</div>
    <div>Page 1 of 1</div>
  </div>
</div>"""

_GENERAL_LEDGER_ALL_FEATURES_HTML = r"""<!-- DESIGNER_META_START
{
  "kind": "designer_v1",
  "version": 1,
  "title": "General Ledger Control Report",
  "subtitle": "Consolidated Entity: Global Corp Inc.",
  "periodLabel": "Period: Dec 2024",
  "runDateField": "txn_date",
  "accountGroupLabel": "Account Group: 5000 - Operating Expenses",
  "showRowNumber": true,
  "showGrandTotal": true,
  "totalLabel": "GRAND TOTAL:",
  "totalFields": ["debit_amount", "credit_amount"],
  "groupByField": "department",
  "showGroupSubtotals": true,
  "sortByField": "txn_date",
  "sortDirection": "desc",
  "conditionalRules": [
    { "field": "debit_amount", "operator": "gt", "value": "50000", "cssClass": "row-high-debit" },
    { "field": "credit_amount", "operator": "gt", "value": "50000", "cssClass": "row-high-credit" }
  ],
  "footerLeft": "FINANCE CONTROLLERS PACK",
  "footerCenter": "INTERNAL USE ONLY",
  "footerRight": "Page {{page_number}} of {{total_pages}}",
  "columns": [
    { "key": "txn_date", "label": "Txn Date", "align": "left" },
    { "key": "txn_id", "label": "Txn Id", "align": "left" },
    { "key": "description", "label": "Description", "align": "left" },
    { "key": "department", "label": "Department", "align": "left" },
    { "key": "gl_code", "label": "GL Code", "align": "left" },
    { "key": "debit_amount", "label": "Debit", "align": "right" },
    { "key": "credit_amount", "label": "Credit", "align": "right" }
  ],
  "parameters": [
    {
      "label": "DEPT",
      "value": "ALL",
      "dataType": "string",
      "defaultValue": "ALL",
      "optionsSourceField": "department",
      "filterField": "department",
      "filterOperator": "equals"
    },
    {
      "label": "GL_CODE",
      "value": "",
      "dataType": "string",
      "defaultValue": "",
      "optionsSourceField": "gl_code",
      "dependsOn": "DEPT",
      "filterField": "gl_code",
      "filterOperator": "equals"
    },
    {
      "label": "ACCOUNT_GROUP",
      "value": "ALL",
      "dataType": "string",
      "defaultValue": "ALL",
      "optionsSourceField": "account_group",
      "filterField": "account_group",
      "filterOperator": "contains"
    },
    {
      "label": "TXN_IDS",
      "value": "",
      "dataType": "enum",
      "allowMultiple": true,
      "defaultValue": "",
      "optionsSourceField": "txn_id",
      "dependsOn": "DEPT",
      "filterField": "txn_id",
      "filterOperator": "in"
    },
    {
      "label": "MIN_DEBIT",
      "value": "0",
      "dataType": "number",
      "required": true,
      "defaultValue": "0",
      "filterField": "debit_amount",
      "filterOperator": "gte"
    }
  ]
}
DESIGNER_META_END -->

<style>
  .gl-enterprise {
    background: #ffffff;
    width: 794px;
    min-height: 1123px;
    margin: 0 auto;
    padding: 36px 40px;
    border: 1px solid #d5d9e0;
    box-sizing: border-box;
    color: #0f172a;
    font-family: "Segoe UI", Arial, sans-serif;
    position: relative;
  }

  .gl-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    border-bottom: 2px solid #0f172a;
    padding-bottom: 12px;
    margin-bottom: 16px;
    gap: 20px;
  }

  .gl-title {
    margin: 0;
    font-size: 40px;
    line-height: 1.05;
    letter-spacing: -0.02em;
    color: #0f172a;
  }

  .gl-subtitle {
    margin-top: 6px;
    color: #64748b;
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.08em;
    font-weight: 600;
  }

  .gl-period {
    font-size: 33px;
    line-height: 1;
    color: #1d4ed8;
    font-weight: 800;
  }

  .gl-run {
    margin-top: 8px;
    color: #94a3b8;
    font-size: 11px;
    font-family: "Courier New", monospace;
    text-align: right;
  }

  .param-grid {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    gap: 8px;
    margin-bottom: 14px;
    border: 1px solid #d1d5db;
    background: #f8fafc;
    padding: 10px;
  }

  .param-card {
    border: 1px solid #e2e8f0;
    background: #ffffff;
    border-radius: 6px;
    padding: 6px 8px;
  }

  .param-label {
    color: #64748b;
    font-size: 10px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    margin-bottom: 3px;
    font-weight: 700;
  }

  .param-value {
    color: #0f172a;
    font-size: 12px;
    font-weight: 700;
    font-family: "Courier New", monospace;
  }

  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
    margin-bottom: 14px;
  }

  .kpi-card {
    border: 1px solid #dbe3f1;
    border-radius: 8px;
    padding: 8px 10px;
    background: linear-gradient(180deg, #ffffff 0%, #f8fbff 100%);
  }

  .kpi-label {
    font-size: 10px;
    letter-spacing: 0.08em;
    color: #64748b;
    text-transform: uppercase;
    font-weight: 700;
  }

  .kpi-value {
    margin-top: 4px;
    font-size: 16px;
    font-weight: 800;
    color: #0f172a;
    font-family: "Courier New", monospace;
  }

  .gl-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    font-size: 12px;
    margin-bottom: 14px;
  }

  .gl-table thead tr {
    background: #1e293b;
    color: #ffffff;
  }

  .gl-table th {
    padding: 8px 6px;
    border-bottom: 1px solid #111827;
    text-align: left;
    font-size: 11px;
    letter-spacing: 0.04em;
    text-transform: uppercase;
  }

  .gl-table th.num,
  .gl-table td.num {
    text-align: right;
    font-family: "Courier New", monospace;
  }

  .gl-table td {
    padding: 7px 6px;
    border-bottom: 1px dashed #dbe3f1;
    vertical-align: top;
  }

  .gl-table .group-row td {
    font-style: italic;
    font-weight: 700;
    color: #475569;
    background: #f8fafc;
    border-bottom: 1px solid #cbd5e1;
  }

  .gl-table .grand-row td {
    border-top: 2px solid #0f172a;
    border-bottom: 3px double #0f172a;
    background: #f8fafc;
    font-weight: 800;
    color: #0f172a;
  }

  .gl-table .grand-row .label-cell {
    text-align: right;
    letter-spacing: 0.06em;
  }

  .chart-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    margin-bottom: 12px;
  }

  .chart-card {
    border: 1px solid #dbe3f1;
    border-radius: 8px;
    padding: 8px;
    background: #ffffff;
  }

  .chart-title {
    font-size: 11px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: #475569;
    margin-bottom: 4px;
    font-weight: 700;
  }

  .report-bar-chart,
  .report-pie-chart {
    height: 160px;
    width: 100%;
  }

  .gl-table .row-high-debit td {
    background: #fff1f2;
  }

  .gl-table .row-high-credit td {
    background: #ecfeff;
  }

  .gl-footer {
    position: absolute;
    left: 40px;
    right: 40px;
    bottom: 22px;
    border-top: 1px solid #cbd5e1;
    padding-top: 6px;
    display: flex;
    justify-content: space-between;
    font-size: 10px;
    color: #64748b;
    font-family: "Courier New", monospace;
  }
</style>

<div class="report-page gl-enterprise">
  <div class="gl-header">
    <div>
      <h1 class="gl-title">General Ledger Control Report</h1>
      <div class="gl-subtitle">Consolidated Entity: Global Corp Inc.</div>
    </div>
    <div>
      <div class="gl-period">Dec 2024</div>
      <div class="gl-run">RUN: {{txn_date}}</div>
    </div>
  </div>

  <div class="param-grid">
    <div class="param-card">
      <div class="param-label">Dept</div>
      <div class="param-value">{{DEPT}}</div>
    </div>
    <div class="param-card">
      <div class="param-label">GL Code</div>
      <div class="param-value">{{GL_CODE}}</div>
    </div>
    <div class="param-card">
      <div class="param-label">Account Group</div>
      <div class="param-value">{{ACCOUNT_GROUP}}</div>
    </div>
    <div class="param-card">
      <div class="param-label">Txn Ids</div>
      <div class="param-value">{{TXN_IDS}}</div>
    </div>
    <div class="param-card">
      <div class="param-label">Min Debit</div>
      <div class="param-value">{{MIN_DEBIT}}</div>
    </div>
  </div>

  <div class="kpi-grid">
    <div class="kpi-card">
      <div class="kpi-label">Rows In Page</div>
      <div class="kpi-value">{{_row_count}}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Total Debit</div>
      <div class="kpi-value">{{_totals.debit_amount}}</div>
    </div>
    <div class="kpi-card">
      <div class="kpi-label">Total Credit</div>
      <div class="kpi-value">{{_totals.credit_amount}}</div>
    </div>
  </div>

  <table class="gl-table report-table">
    <thead>
      <tr>
        <th class="num" style="width: 42px;">#</th>
        <th style="width: 100px;">Txn Date</th>
        <th style="width: 132px;">Txn Id</th>
        <th>Description</th>
        <th style="width: 120px;">Department</th>
        <th style="width: 90px;">GL Code</th>
        <th class="num" style="width: 115px;">Debit</th>
        <th class="num" style="width: 115px;">Credit</th>
      </tr>
    </thead>
    <tbody>
      <tr class="group-row">
        <td colspan="8">{{account_group}}</td>
      </tr>
      {{#rows}}
      <tr>
        <td class="num">{{_index}}</td>
        <td>{{txn_date}}</td>
        <td>{{txn_id}}</td>
        <td>{{description}}</td>
        <td>{{department}}</td>
        <td>{{gl_code}}</td>
        <td class="num">{{debit_amount}}</td>
        <td class="num">{{credit_amount}}</td>
      </tr>
      {{/rows}}
      <tr class="grand-row">
        <td></td>
        <td colspan="5" class="label-cell">GRAND TOTAL:</td>
        <td class="num">{{_totals.debit_amount}}</td>
        <td class="num">{{_totals.credit_amount}}</td>
      </tr>
    </tbody>
  </table>

  <div class="chart-grid">
    <div class="chart-card">
      <div class="chart-title">Debit Pattern (Rows in this page)</div>
      <div
        class="report-bar-chart"
        data-labels="{{#rows}}{{_index}},{{/rows}}"
        data-values="{{#rows}}{{#debit_amount}}{{debit_amount}}{{/debit_amount}}{{^debit_amount}}0{{/debit_amount}},{{/rows}}"
      ></div>
    </div>
    <div class="chart-card">
      <div class="chart-title">Debit vs Credit (Filtered preview scope)</div>
      <div
        class="report-pie-chart"
        data-labels="Debit,Credit"
        data-values="{{_totals.debit_amount}},{{_totals.credit_amount}}"
      ></div>
    </div>
  </div>

  <div class="gl-footer">
    <span>FINANCE CONTROLLERS PACK</span>
    <span>INTERNAL USE ONLY</span>
    <span>Page {{page_number}} of {{total_pages}}</span>
  </div>
</div>"""

_SSRS_STEEL_BLUE_GL_HTML = r"""<div class="report-page" style="font-family: Arial, Helvetica, sans-serif; background: #ffffff; min-height: 1123px; padding: 36px 40px; color: #000000; font-size: 8pt; box-sizing: border-box;">
  <div style="border: 1px solid #000; padding: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-start; background: #fbfbfb;">
    <div>
      <h1 style="margin: 0 0 6px 0; font-size: 16pt; font-weight: bold; color: #1f497d;">General Ledger (SSRS Classic Blue)</h1>
      <div style="font-size: 8pt; color: #555;">Execution Time: {{txn_date}}</div>
    </div>
    <div style="background: #e6eef5; padding: 6px 12px; border: 1px solid #c6d9f1;">
      <table style="font-size: 8pt; border-collapse: collapse;">
        <tr><td style="font-weight: bold; padding-right: 12px; padding-bottom: 2px;">DEPT:</td><td style="padding-bottom: 2px;">ALL</td></tr>
        <tr><td style="font-weight: bold; padding-right: 12px;">CURR:</td><td>USD</td></tr>
      </table>
    </div>
  </div>

  <table style="width: 100%; border-collapse: collapse; table-layout: fixed; font-size: 8pt;">
    <thead>
      <tr>
        <th style="background: #4f81bd; color: #ffffff; padding: 5px 6px; border: 1px solid #000; text-align: left; width: 65px; font-weight: bold;">Date</th>
        <th style="background: #4f81bd; color: #ffffff; padding: 5px 6px; border: 1px solid #000; text-align: left; width: 85px; font-weight: bold;">Txn ID</th>
        <th style="background: #4f81bd; color: #ffffff; padding: 5px 6px; border: 1px solid #000; text-align: left; font-weight: bold;">Description</th>
        <th style="background: #4f81bd; color: #ffffff; padding: 5px 6px; border: 1px solid #000; text-align: left; width: 80px; font-weight: bold;">GL Code</th>
        <th style="background: #4f81bd; color: #ffffff; padding: 5px 6px; border: 1px solid #000; text-align: right; width: 90px; font-weight: bold;">Debit</th>
        <th style="background: #4f81bd; color: #ffffff; padding: 5px 6px; border: 1px solid #000; text-align: right; width: 90px; font-weight: bold;">Credit</th>
      </tr>
    </thead>
    <tbody>
      <tr style="background: #dce6f1;">
        <td colspan="6" style="padding: 5px 6px; border: 1px solid #000; border-bottom: 2px solid #000; font-weight: bold; color: #1f497d;">{{account_group}}</td>
      </tr>
      {{#rows}}
      <tr>
        <td style="padding: 4px 6px; border: 1px solid #999;">{{txn_date}}</td>
        <td style="padding: 4px 6px; border: 1px solid #999;">{{txn_id}}</td>
        <td style="padding: 4px 6px; border: 1px solid #999; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">{{description}}</td>
        <td style="padding: 4px 6px; border: 1px solid #999;">{{gl_code}}</td>
        <td style="padding: 4px 6px; border: 1px solid #999; text-align: right; font-family: 'Courier New', monospace;">{{debit_amount}}</td>
        <td style="padding: 4px 6px; border: 1px solid #999; text-align: right; font-family: 'Courier New', monospace;">{{credit_amount}}</td>
      </tr>
      {{/rows}}
      <tr style="background: #dce6f1;">
        <td colspan="4" style="padding: 6px; border: 1px solid #000; border-top: 2px solid #000; font-weight: bold; text-align: right; color: #1f497d;">Grand Total</td>
        <td style="padding: 6px; border: 1px solid #000; border-top: 2px solid #000; text-align: right; font-weight: bold; font-family: 'Courier New', monospace; color: #1f497d;">{{grand_total_debit}}</td>
        <td style="padding: 6px; border: 1px solid #000; border-top: 2px solid #000; text-align: right; font-weight: bold; font-family: 'Courier New', monospace; color: #1f497d;">{{grand_total_credit}}</td>
      </tr>
    </tbody>
  </table>

  <div style="position: absolute; bottom: 36px; left: 40px; right: 40px; border-top: 1px solid #000; padding-top: 6px; display: flex; justify-content: space-between; font-size: 7.5pt; color: #555;">
    <span>SQL Server Reporting Services Preview</span>
    <span>Page {{page_number}} of {{total_pages}}</span>
  </div>
</div>"""

_SSRS_GREYSCALE_CUSTOMER_HTML = r"""<div class="report-page" style="font-family: Tahoma, 'Segoe UI', Arial, sans-serif; background: #fff; min-height: 1123px; padding: 40px 48px; color: #333; font-size: 9pt; box-sizing: border-box;">
  <div style="display: flex; justify-content: space-between; border-bottom: 2px solid #333; padding-bottom: 10px; margin-bottom: 18px;">
    <div>
      <h1 style="margin: 0 0 4px 0; font-size: 15pt; font-weight: bold; color: #000;">Customer Directory (SSRS BW Default)</h1>
      <div style="font-size: 8pt; color: #666;">Report Level: Internal Audit</div>
    </div>
    <div style="text-align: right; font-size: 8pt; color: #666; display: flex; flex-direction: column; justify-content: flex-end;">
      <div>Generated: {{page_number}} / {{total_pages}}</div>
    </div>
  </div>

  <table style="width: 100%; border-collapse: collapse; font-size: 8.5pt; border: 1px solid #666; margin-bottom: 16px;">
    <thead>
      <tr style="background: #e6e6e6;">
        <th style="padding: 6px 8px; border: 1px solid #888; text-align: left; width: 70px; font-weight: bold; color: #000;">Cust ID</th>
        <th style="padding: 6px 8px; border: 1px solid #888; text-align: left; font-weight: bold; color: #000;">Full Name</th>
        <th style="padding: 6px 8px; border: 1px solid #888; text-align: left; font-weight: bold; color: #000;">Email Address</th>
        <th style="padding: 6px 8px; border: 1px solid #888; text-align: left; width: 140px; font-weight: bold; color: #000;">Location (State / Country)</th>
        <th style="padding: 6px 8px; border: 1px solid #888; text-align: center; width: 60px; font-weight: bold; color: #000;">Gender</th>
      </tr>
    </thead>
    <tbody>
      {{#rows}}
      <tr>
        <td style="padding: 5px 8px; border: 1px solid #aaa; text-align: left; background: #fdfdfd; font-family: 'Courier New', monospace;">{{customerID}}</td>
        <td style="padding: 5px 8px; border: 1px solid #aaa; text-align: left;">{{first_name}} {{last_name}}</td>
        <td style="padding: 5px 8px; border: 1px solid #aaa; text-align: left; color: #0044cc;"><u>{{email_address}}</u></td>
        <td style="padding: 5px 8px; border: 1px solid #aaa; text-align: left;">{{state}}, {{country}}</td>
        <td style="padding: 5px 8px; border: 1px solid #aaa; text-align: center;">{{gender}}</td>
      </tr>
      {{/rows}}
    </tbody>
  </table>

  <div style="font-size: 7.5pt; color: #999; border-top: 1px dashed #ccc; padding-top: 8px;">
    Data source: samples.bakehouse.sales_customers (Execution completed without warnings)
  </div>
</div>"""

_SSRS_EXECUTIVE_DASHBOARD_GL = r"""<div class="report-page" style="font-family: 'Segoe UI', Arial, sans-serif; background: #fff; min-height: 1123px; padding: 30px 40px; color: #1e293b; font-size: 8pt; box-sizing: border-box;">
  <div style="border-bottom: 3px solid #0f172a; padding-bottom: 12px; margin-bottom: 15px; display: flex; justify-content: space-between; align-items: flex-end;">
    <div>
      <h1 style="margin: 0; font-size: 20pt; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: -0.02em;">Executive Dashboard: General Ledger</h1>
      <div style="font-size: 8pt; color: #64748b; margin-top: 4px; font-weight: 600; letter-spacing: 0.05em;">Financial Control System • Strictly Confidential</div>
    </div>
    <div style="text-align: right;">
      <div style="font-size: 14pt; font-weight: 800; color: #0f172a;">Q4 Overview</div>
      <div style="font-size: 7.5pt; color: #94a3b8; font-family: 'Courier New', monospace; margin-top: 2px;">{{txn_date}}</div>
    </div>
  </div>

  <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 15px;">
    <div style="border: 1px solid #cbd5e1; border-radius: 4px; padding: 12px; background: #f8fafc; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
      <div style="font-size: 8pt; font-weight: 700; color: #475569; text-transform: uppercase; margin-bottom: 8px;">Debit Distribution (By Row)</div>
      <div class="report-bar-chart" data-labels="{{#rows}}{{_index}},{{/rows}}" data-values="{{#rows}}{{#debit_amount}}{{debit_amount}}{{/debit_amount}}{{^debit_amount}}0{{/debit_amount}},{{/rows}}" style="height: 180px;"></div>
    </div>
    <div style="border: 1px solid #cbd5e1; border-radius: 4px; padding: 12px; background: #f8fafc; box-shadow: 0 1px 2px rgba(0,0,0,0.05);">
      <div style="font-size: 8pt; font-weight: 700; color: #475569; text-transform: uppercase; margin-bottom: 8px;">Macro Balance (Debit vs Credit)</div>
      <div class="report-pie-chart" data-labels="Total Debit,Total Credit" data-values="{{_totals.debit_amount}},{{_totals.credit_amount}}" style="height: 180px;"></div>
    </div>
  </div>

  <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 15px;">
    <div style="background: #0f172a; color: #fff; padding: 10px 12px; border-radius: 4px;">
      <div style="font-size: 7pt; color: #94a3b8; text-transform: uppercase; font-weight: 600;">Total Transactions</div>
      <div style="font-size: 14pt; font-weight: 800; font-family: 'Courier New', monospace;">{{_row_count}}</div>
    </div>
    <div style="background: #0f172a; color: #fff; padding: 10px 12px; border-radius: 4px;">
      <div style="font-size: 7pt; color: #94a3b8; text-transform: uppercase; font-weight: 600;">Total Debit Volume</div>
      <div style="font-size: 14pt; font-weight: 800; font-family: 'Courier New', monospace; color: #ef4444;">{{_totals.debit_amount}}</div>
    </div>
    <div style="background: #0f172a; color: #fff; padding: 10px 12px; border-radius: 4px;">
      <div style="font-size: 7pt; color: #94a3b8; text-transform: uppercase; font-weight: 600;">Total Credit Volume</div>
      <div style="font-size: 14pt; font-weight: 800; font-family: 'Courier New', monospace; color: #22c55e;">{{_totals.credit_amount}}</div>
    </div>
    <div style="background: #0f172a; color: #fff; padding: 10px 12px; border-radius: 4px;">
      <div style="font-size: 7pt; color: #94a3b8; text-transform: uppercase; font-weight: 600;">Target Dept</div>
      <div style="font-size: 14pt; font-weight: 800;">ALL</div>
    </div>
  </div>

  <table style="width: 100%; border-collapse: collapse; font-size: 7.5pt;">
    <thead>
      <tr>
        <th style="padding: 6px 8px; border-bottom: 2px solid #0f172a; text-align: left; font-weight: 700; color: #0f172a; text-transform: uppercase;">ID</th>
        <th style="padding: 6px 8px; border-bottom: 2px solid #0f172a; text-align: left; font-weight: 700; color: #0f172a; text-transform: uppercase;">Date</th>
        <th style="padding: 6px 8px; border-bottom: 2px solid #0f172a; text-align: left; font-weight: 700; color: #0f172a; text-transform: uppercase;">Description</th>
        <th style="padding: 6px 8px; border-bottom: 2px solid #0f172a; text-align: left; font-weight: 700; color: #0f172a; text-transform: uppercase;">GL Code</th>
        <th style="padding: 6px 8px; border-bottom: 2px solid #0f172a; text-align: right; font-weight: 700; color: #0f172a; text-transform: uppercase;">Debit ($)</th>
        <th style="padding: 6px 8px; border-bottom: 2px solid #0f172a; text-align: right; font-weight: 700; color: #0f172a; text-transform: uppercase;">Credit ($)</th>
      </tr>
    </thead>
    <tbody>
      <tr style="background: #f1f5f9;">
        <td colspan="6" style="padding: 5px 8px; font-weight: 700; color: #475569; font-style: italic;">{{account_group}}</td>
      </tr>
      {{#rows}}
      <tr>
        <td style="padding: 5px 8px; border-bottom: 1px solid #e2e8f0; font-family: 'Courier New', monospace;">{{txn_id}}</td>
        <td style="padding: 5px 8px; border-bottom: 1px solid #e2e8f0;">{{txn_date}}</td>
        <td style="padding: 5px 8px; border-bottom: 1px solid #e2e8f0; color: #334155;">{{description}}</td>
        <td style="padding: 5px 8px; border-bottom: 1px solid #e2e8f0; color: #64748b;">{{gl_code}}</td>
        <td style="padding: 5px 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-family: 'Courier New', monospace; font-weight: 600;">{{debit_amount}}</td>
        <td style="padding: 5px 8px; border-bottom: 1px solid #e2e8f0; text-align: right; font-family: 'Courier New', monospace; font-weight: 600;">{{credit_amount}}</td>
      </tr>
      {{/rows}}
      <tr>
        <td colspan="4" style="padding: 8px; border-top: 2px solid #0f172a; text-align: right; font-weight: 800; font-size: 8pt; color: #0f172a;">NET TOTAL:</td>
        <td style="padding: 8px; border-top: 2px solid #0f172a; text-align: right; font-weight: 800; font-family: 'Courier New', monospace; font-size: 8.5pt;">{{_totals.debit_amount}}</td>
        <td style="padding: 8px; border-top: 2px solid #0f172a; text-align: right; font-weight: 800; font-family: 'Courier New', monospace; font-size: 8.5pt;">{{_totals.credit_amount}}</td>
      </tr>
    </tbody>
  </table>

  <div style="position: absolute; bottom: 30px; left: 40px; right: 40px; border-top: 1px solid #cbd5e1; padding-top: 8px; display: flex; justify-content: space-between; font-size: 7pt; color: #94a3b8; font-family: 'Courier New', monospace;">
    <span>C-SUITE BRIEFING / INTERNAL DISTRIBUTION ONLY</span>
    <span>Page {{page_number}} / {{total_pages}}</span>
  </div>
</div>"""

_SSRS_CUSTOMER_SCORECARD = r"""<div class="report-page" style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background: #fff; min-height: 1123px; padding: 40px; color: #333; font-size: 9pt; box-sizing: border-box;">
  <div style="background: #0284c7; color: #fff; padding: 20px; border-radius: 6px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
    <div>
      <h1 style="margin: 0 0 4px 0; font-size: 24pt; font-weight: 300;">Customer Scorecard & Demographics</h1>
      <div style="font-size: 9pt; opacity: 0.8; font-weight: 500;">Retail Banking & Sales Operations</div>
    </div>
    <div style="text-align: right;">
      <div style="font-size: 28pt; font-weight: 700; line-height: 1;">{{_row_count}}</div>
      <div style="font-size: 8pt; text-transform: uppercase; letter-spacing: 1px; opacity: 0.9; margin-top: 4px;">Active Profiles</div>
    </div>
  </div>

  <div style="display: flex; gap: 20px; margin-bottom: 20px;">
    <div style="flex: 1; border: 1px solid #e0e0e0; border-radius: 6px; padding: 15px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
      <h3 style="margin: 0 0 10px 0; font-size: 10pt; color: #555; border-bottom: 1px solid #eee; padding-bottom: 8px;">Gender Distribution</h3>
      <div class="report-pie-chart" data-labels="Male,Female,Other" data-values="45,52,3" style="height: 200px;"></div>
    </div>
    <div style="flex: 2; border: 1px solid #e0e0e0; border-radius: 6px; padding: 15px; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
      <h3 style="margin: 0 0 10px 0; font-size: 10pt; color: #555; border-bottom: 1px solid #eee; padding-bottom: 8px;">Regional Acquisition Index</h3>
      <div class="report-bar-chart" data-labels="{{#rows}}{{country}},{{/rows}}" data-values="{{#rows}}{{customerID}},{{/rows}}" style="height: 200px;"></div>
    </div>
  </div>

  <table style="width: 100%; border-collapse: separate; border-spacing: 0; font-size: 8.5pt;">
    <thead>
      <tr>
        <th style="padding: 10px 12px; border-bottom: 2px solid #0284c7; text-align: left; font-weight: 600; color: #555;">UID</th>
        <th style="padding: 10px 12px; border-bottom: 2px solid #0284c7; text-align: left; font-weight: 600; color: #555;">Name</th>
        <th style="padding: 10px 12px; border-bottom: 2px solid #0284c7; text-align: left; font-weight: 600; color: #555;">Email Contact</th>
        <th style="padding: 10px 12px; border-bottom: 2px solid #0284c7; text-align: left; font-weight: 600; color: #555;">Region Base</th>
        <th style="padding: 10px 12px; border-bottom: 2px solid #0284c7; text-align: center; font-weight: 600; color: #555;">Status</th>
      </tr>
    </thead>
    <tbody>
      {{#rows}}
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #f0f0f0; font-family: monospace; color: #888;">#{{customerID}}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #f0f0f0; font-weight: 600; color: #222;">{{first_name}} {{last_name}}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #f0f0f0; color: #0284c7;">{{email_address}}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #f0f0f0; color: #666;">{{city}}, {{country}} ({{continent}})</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #f0f0f0; text-align: center;"><span style="background: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 10px; font-size: 7.5pt; border: 1px solid #bae6fd;">Verified</span></td>
      </tr>
      {{/rows}}
    </tbody>
  </table>

  <div style="position: absolute; bottom: 40px; left: 40px; right: 40px; text-align: center; font-size: 8pt; color: #aaa; border-top: 1px solid #eee; padding-top: 10px;">
    Page {{page_number}} of {{total_pages}} | Generated by CRM Analytics Core
  </div>
</div>"""

_SSRS_SUPPLIER_AUDIT_REPORT = r"""<div class="report-page" style="font-family: 'Times New Roman', Times, serif; background: #fff; min-height: 1123px; padding: 45px 50px; color: #000; font-size: 10pt; box-sizing: border-box; border: 5px solid #ececec;">
  <div style="text-align: center; border-bottom: 3px double #800000; padding-bottom: 15px; margin-bottom: 25px;">
    <h1 style="margin: 0; font-size: 22pt; font-weight: bold; color: #800000; text-transform: uppercase;">Official Supplier Audit Record</h1>
    <div style="font-size: 11pt; color: #333; margin-top: 5px; font-style: italic;">Department of Compliance & Supply Chain Logistics</div>
    <div style="font-size: 9pt; font-family: 'Courier New', monospace; margin-top: 8px;">Doc. Ref: AUD-{{page_number}}-{{_row_count}} / Executed: {{_date}}</div>
  </div>

  <div style="display: flex; gap: 20px; margin-bottom: 25px;">
    <div style="flex: 2;">
      <table style="width: 100%; border-collapse: collapse; font-family: 'Courier New', monospace; font-size: 9pt;">
        <tr><td style="padding: 4px; border: 1px solid #ccc; background: #f5f5f5; font-weight: bold; width: 120px;">Inspector:</td><td style="padding: 4px; border: 1px solid #ccc;">Auto-Generated System</td></tr>
        <tr><td style="padding: 4px; border: 1px solid #ccc; background: #f5f5f5; font-weight: bold;">Audit Scope:</td><td style="padding: 4px; border: 1px solid #ccc;">Geographic Vendor Integrity</td></tr>
        <tr><td style="padding: 4px; border: 1px solid #ccc; background: #f5f5f5; font-weight: bold;">Result Code:</td><td style="padding: 4px; border: 1px solid #ccc; color: #800000; font-weight: bold;">PASS CONDITIONAL</td></tr>
      </table>
    </div>
    <div style="flex: 1; border: 1px solid #ccc; padding: 10px; background: #fafafa; text-align: center;">
      <div style="font-size: 8pt; font-weight: bold; text-transform: uppercase; margin-bottom: 5px;">Approval Matrix</div>
      <div class="report-pie-chart" data-labels="Approved,Pending,Rejected" data-values="75,20,5" style="height: 120px;"></div>
    </div>
  </div>

  <table style="width: 100%; border-collapse: collapse; font-size: 9pt; margin-bottom: 30px;">
    <thead>
      <tr>
        <th style="padding: 8px; border: 1px solid #000; background: #800000; color: #fff; text-align: left; font-weight: bold;">S-ID</th>
        <th style="padding: 8px; border: 1px solid #000; background: #800000; color: #fff; text-align: left; font-weight: bold;">Supplier Entity Name</th>
        <th style="padding: 8px; border: 1px solid #000; background: #800000; color: #fff; text-align: left; font-weight: bold;">Primary Ingredient</th>
        <th style="padding: 8px; border: 1px solid #000; background: #800000; color: #fff; text-align: center; font-weight: bold;">Facility Size</th>
        <th style="padding: 8px; border: 1px solid #000; background: #800000; color: #fff; text-align: center; font-weight: bold;">Geo-Marker (Lat/Lon)</th>
        <th style="padding: 8px; border: 1px solid #000; background: #800000; color: #fff; text-align: center; font-weight: bold;">Audit Stat</th>
      </tr>
    </thead>
    <tbody>
      {{#rows}}
      <tr>
        <td style="padding: 6px 8px; border: 1px solid #000; font-family: 'Courier New', monospace; text-align: center;">{{supplierID}}</td>
        <td style="padding: 6px 8px; border: 1px solid #000; font-weight: bold;">{{name}}<br><span style="font-size: 7.5pt; font-weight: normal; color: #666;">Loc: {{city}}, {{district}}, {{continent}}</span></td>
        <td style="padding: 6px 8px; border: 1px solid #000; font-style: italic;">{{ingredient}}</td>
        <td style="padding: 6px 8px; border: 1px solid #000; text-align: center;">{{size}}</td>
        <td style="padding: 6px 8px; border: 1px solid #000; text-align: center; font-family: 'Courier New', monospace; font-size: 8pt;">[{{latitude}}, {{longitude}}]</td>
        <td style="padding: 6px 8px; border: 1px solid #000; text-align: center;"><strong>{{approved}}</strong></td>
      </tr>
      {{/rows}}
    </tbody>
  </table>

  <div style="font-size: 8pt; text-align: justify; line-height: 1.4; color: #555;">
    <strong>Declaration:</strong> This document serves as the official registry of audited suppliers within the specified period. The geological markers and approval statuses depicted reflect the state of the database at the exact moment of rendering. Unauthorized alteration of this document constitutes a breach of compliance protocols.
  </div>

  <div style="position: absolute; bottom: 45px; left: 50px; right: 50px; display: flex; justify-content: space-between; font-size: 9pt; border-top: 1px solid #000; padding-top: 5px;">
    <span>Form 404-B (Rev: 2)</span>
    <span>Authorized Signature: ___________________</span>
  </div>
</div>"""

_DBX_PREMIUM_FINANCIAL_STATEMENT = r"""<div class="report-page" style="font-family: system-ui, -apple-system, sans-serif; background: #fdfdfd; min-height: 1123px; padding: 50px; color: #111; font-size: 9pt; box-sizing: border-box; position: relative;">
  <div style="position: absolute; top: 0; left: 0; right: 0; height: 6px; background: linear-gradient(90deg, #FF3621 0%, #111 100%);"></div>
  
  <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; margin-top: 10px;">
    <div>
      <h1 style="margin: 0; font-size: 32pt; font-weight: 800; letter-spacing: -1.5px; line-height: 1;">Financial<br>Statement.</h1>
      <div style="font-size: 10pt; color: #666; font-weight: 500; margin-top: 8px; letter-spacing: 0.5px;">Premium Data Application Export</div>
    </div>
    <div style="text-align: right; border-left: 2px solid #eee; padding-left: 20px;">
      <div style="font-size: 8pt; text-transform: uppercase; letter-spacing: 1px; color: #999; font-weight: 700; margin-bottom: 4px;">Net Debit Exposure</div>
      <div style="font-size: 24pt; font-weight: 800; font-family: 'SF Mono', Consolas, monospace; letter-spacing: -1px; color: #FF3621;">${{_totals.debit_amount}}</div>
      <div style="font-size: 8pt; text-transform: uppercase; letter-spacing: 1px; color: #999; font-weight: 700; margin-top: 12px; margin-bottom: 4px;">Net Credit Holdings</div>
      <div style="font-size: 18pt; font-weight: 800; font-family: 'SF Mono', Consolas, monospace; letter-spacing: -0.5px; color: #111;">${{_totals.credit_amount}}</div>
    </div>
  </div>

  <table style="width: 100%; border-collapse: collapse; font-size: 9pt; margin-bottom: 40px;">
    <thead>
      <tr>
        <th style="padding: 12px 0; border-bottom: 2px solid #111; text-align: left; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; font-size: 7.5pt; color: #666; width: 120px;">Reference ID</th>
        <th style="padding: 12px 0; border-bottom: 2px solid #111; text-align: left; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; font-size: 7.5pt; color: #666;">Transaction Details</th>
        <th style="padding: 12px 0; border-bottom: 2px solid #111; text-align: left; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; font-size: 7.5pt; color: #666; width: 100px;">Classification</th>
        <th style="padding: 12px 0; border-bottom: 2px solid #111; text-align: right; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; font-size: 7.5pt; color: #666; width: 110px;">Debit Flow</th>
        <th style="padding: 12px 0; border-bottom: 2px solid #111; text-align: right; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; font-size: 7.5pt; color: #666; width: 110px;">Credit Flow</th>
      </tr>
    </thead>
    <tbody>
      <tr style="background: #fafafa;">
        <td colspan="5" style="padding: 10px 0; font-weight: 800; color: #111; font-size: 10pt; letter-spacing: -0.2px;">{{account_group}}</td>
      </tr>
      {{#rows}}
      <tr>
        <td style="padding: 12px 0; border-bottom: 1px solid #eaeaea; font-family: 'SF Mono', Consolas, monospace; color: #888; font-size: 8.5pt;">{{txn_id}}</td>
        <td style="padding: 12px 0; border-bottom: 1px solid #eaeaea;">
          <div style="font-weight: 600; color: #111; letter-spacing: -0.2px;">{{description}}</div>
          <div style="font-size: 7.5pt; color: #999; margin-top: 2px;">Executed: {{txn_date}}</div>
        </td>
        <td style="padding: 12px 0; border-bottom: 1px solid #eaeaea;">
          <span style="background: #f4f4f4; padding: 4px 8px; border-radius: 4px; font-size: 7.5pt; font-weight: 600; color: #555;">{{gl_code}}</span>
        </td>
        <td style="padding: 12px 0; border-bottom: 1px solid #eaeaea; text-align: right; font-family: 'SF Mono', Consolas, monospace; font-weight: 700; color: #FF3621;">{{debit_amount}}</td>
        <td style="padding: 12px 0; border-bottom: 1px solid #eaeaea; text-align: right; font-family: 'SF Mono', Consolas, monospace; font-weight: 700; color: #111;">{{credit_amount}}</td>
      </tr>
      {{/rows}}
    </tbody>
  </table>
  
  <div style="display: flex; justify-content: space-between; align-items: center; background: #111; color: #fff; padding: 24px 30px; border-radius: 8px; margin-bottom: 40px;">
    <div>
      <div style="font-size: 8pt; text-transform: uppercase; letter-spacing: 1px; color: #888; font-weight: 700;">Final Reconciliation</div>
      <div style="font-size: 11pt; font-weight: 500; margin-top: 2px; color: #ccc;">End of Period Balance Sheet</div>
    </div>
    <div style="display: flex; gap: 40px; text-align: right;">
      <div>
        <div style="font-size: 7pt; text-transform: uppercase; letter-spacing: 1px; color: #666; margin-bottom: 4px;">Gross Debit</div>
        <div style="font-size: 16pt; font-family: 'SF Mono', Consolas, monospace; font-weight: 700; color: #fff;">{{_totals.debit_amount}}</div>
      </div>
      <div>
        <div style="font-size: 7pt; text-transform: uppercase; letter-spacing: 1px; color: #666; margin-bottom: 4px;">Gross Credit</div>
        <div style="font-size: 16pt; font-family: 'SF Mono', Consolas, monospace; font-weight: 700; color: #fff;">{{_totals.credit_amount}}</div>
      </div>
    </div>
  </div>

  <div style="position: absolute; bottom: 50px; left: 50px; right: 50px; display: flex; justify-content: space-between; align-items: flex-end;">
    <div>
      <div style="width: 32px; height: 32px; background: #FF3621; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-bottom: 8px;">
        <div style="width: 12px; height: 12px; background: #fff; border-radius: 50%;"></div>
      </div>
      <div style="font-size: 8pt; font-weight: 700; color: #111; letter-spacing: -0.2px;">DATABRICKS REPORTING SYSTEM</div>
    </div>
    <div style="text-align: right; font-size: 8pt; color: #999; font-weight: 500;">
      PAGE {{page_number}} / {{total_pages}}
    </div>
  </div>
</div>"""

# Built at import time so the factory can reference a single constant
SEED_TEMPLATES = (
    "INSERT INTO templates (id, name, structure_id, html_content) VALUES\n"
    "('b0000000-0000-0000-0000-000000000001', 'Customer Profiles (Per-Page)', 'a0000000-0000-0000-0000-000000000001', $tmpl$" + _CUSTOMER_PER_PAGE_HTML + "$tmpl$),\n"
    "('b0000000-0000-0000-0000-000000000002', 'Supplier Profiles (Per-Page)', 'a0000000-0000-0000-0000-000000000002', $tmpl$" + _SUPPLIER_PER_PAGE_HTML + "$tmpl$),\n"
    "('b0000000-0000-0000-0000-000000000003', 'General Ledger Detail (Power BI Style)', 'a0000000-0000-0000-0000-000000000003', $tmpl$" + _GENERAL_LEDGER_DETAIL_HTML + "$tmpl$),\n"
    "('b0000000-0000-0000-0000-000000000004', 'General Ledger Executive (All Features)', 'a0000000-0000-0000-0000-000000000003', $tmpl$" + _GENERAL_LEDGER_ALL_FEATURES_HTML + "$tmpl$),\n"
    "('b0000000-0000-0000-0000-000000000005', 'Classic SSRS - General Ledger (Blue Theme)', 'a0000000-0000-0000-0000-000000000003', $tmpl$" + _SSRS_STEEL_BLUE_GL_HTML + "$tmpl$),\n"
    "('b0000000-0000-0000-0000-000000000006', 'Classic SSRS - Customer Directory (B&W)', 'a0000000-0000-0000-0000-000000000001', $tmpl$" + _SSRS_GREYSCALE_CUSTOMER_HTML + "$tmpl$),\n"
    "('b0000000-0000-0000-0000-000000000007', 'Executive Dashboard (GL & Visuals)', 'a0000000-0000-0000-0000-000000000003', $tmpl$" + _SSRS_EXECUTIVE_DASHBOARD_GL + "$tmpl$),\n"
    "('b0000000-0000-0000-0000-000000000008', 'Customer Scorecard (Charts & Demographics)', 'a0000000-0000-0000-0000-000000000001', $tmpl$" + _SSRS_CUSTOMER_SCORECARD + "$tmpl$),\n"
    "('b0000000-0000-0000-0000-000000000009', 'Supplier Audit Report (Compliance Mtrx)', 'a0000000-0000-0000-0000-000000000002', $tmpl$" + _SSRS_SUPPLIER_AUDIT_REPORT + "$tmpl$),\n"
    "('b0000000-0000-0000-0000-000000000010', 'Premium Financial Statement (Apple/Vercel Aesthetic)', 'a0000000-0000-0000-0000-000000000003', $tmpl$" + _DBX_PREMIUM_FINANCIAL_STATEMENT + "$tmpl$)\n"
    "ON CONFLICT (id) DO NOTHING"
)

# -- conversation_messages table ------------------------------------------------

CREATE_CONVERSATION_MESSAGES_TABLE = """\
CREATE TABLE IF NOT EXISTS conversation_messages (
    id UUID PRIMARY KEY,
    space_id VARCHAR(255) NOT NULL,
    conversation_id VARCHAR(255) NOT NULL,
    message_id VARCHAR(255) NOT NULL,
    user_message TEXT NOT NULL,
    genie_response TEXT,
    query_result JSONB,
    query_data JSONB,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
)"""

CREATE_CONVERSATION_MESSAGES_INDEXES = """\
CREATE INDEX IF NOT EXISTS idx_conversation_messages_conversation_id
    ON conversation_messages(conversation_id);

CREATE INDEX IF NOT EXISTS idx_conversation_messages_created_at
    ON conversation_messages(created_at);

CREATE INDEX IF NOT EXISTS idx_conversation_messages_space_id
    ON conversation_messages(space_id)"""
