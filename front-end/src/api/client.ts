// Stable app-facing API exports.
// Keeps Vue imports resilient even if orval generation layout changes.

export * from './generated/agent/agent'
export * from './generated/default/default'
export * from './generated/discovery/discovery'
export * from './generated/structures/structures'
export * from './generated/templates/templates'
export * from './generated/models'

// App-level stable types (stronger than generic OpenAPI dict typing).
export interface CatalogInfo {
  name: string
  catalog_name?: string
}

export interface SchemaInfo {
  name: string
  schema_name?: string
}

export interface TableInfo {
  name: string
  table_name?: string
  table_type: string
}

export interface ColumnInfo {
  name: string
  type_text: string
  type_name: string
  nullable?: boolean
}

export interface PreviewDataResponse {
  data: Record<string, unknown>
}
