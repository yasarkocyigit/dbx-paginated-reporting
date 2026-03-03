"""
Service for querying real data from Unity Catalog tables linked to structures.

Uses the SQL query stored on the Structure (auto-generated from a single table
and selected columns) and executes it via SQLConnector against a Databricks
SQL warehouse. ARRAY<STRUCT<...>> columns are returned as native Python lists
by the Arrow deserialiser, so no flat-to-nested mapping is needed.
"""

import re
from typing import Any, Dict, List, Optional, Tuple

import numpy as np

from common.connectors.sql import SQLConnector
from common.logger import log as L
from models.structure import Structure
from models.template import FilterOperator, PreviewFilter, PreviewSort, SortDirection
from repositories.structures import StructuresRepository
from repositories.templates import TemplatesRepository


class DataQueryService:
    """Execute data queries for template preview and final report rendering."""

    def __init__(self, sql_connector: Optional[SQLConnector] = None, token: Optional[str] = None):
        self.sql_connector = sql_connector or SQLConnector(bearer=token)
        self.structures_repo = StructuresRepository()
        self.templates_repo = TemplatesRepository()

    async def execute_for_preview(
        self,
        template_id,
        limit: int = 50,
        offset: int = 0,
        filters: Optional[List[PreviewFilter]] = None,
        group_by: Optional[str] = None,
        sorts: Optional[List[PreviewSort]] = None,
    ) -> Dict[str, Any]:
        template = await self.templates_repo.get_by_id(template_id)
        if not template:
            raise ValueError("Template not found")

        structure = await self.structures_repo.get_by_id(template.structure_id)
        if not structure:
            raise ValueError("Linked structure not found")

        if not structure.sql_query:
            return {"data": {}, "query": None, "row_count": 0}

        limited_query, query_debug = self._build_preview_query(
            structure_sql=structure.sql_query,
            selected_columns=structure.selected_columns,
            filters=filters or [],
            group_by=group_by,
            sorts=sorts or [],
            limit=limit,
            offset=offset,
        )
        rows, columns = await self._run_query(limited_query)
        data = self._map_results_to_data(columns, rows, structure)

        return {
            "data": data,
            "query": structure.sql_query,
            "executed_query": limited_query,
            "filter_debug": query_debug,
            "row_count": len(rows),
        }

    async def get_distinct_values_for_template(
        self,
        template_id,
        field: str,
        limit: int = 100,
        filters: Optional[List[PreviewFilter]] = None,
    ) -> Dict[str, Any]:
        template = await self.templates_repo.get_by_id(template_id)
        if not template:
            raise ValueError("Template not found")

        structure = await self.structures_repo.get_by_id(template.structure_id)
        if not structure:
            raise ValueError("Linked structure not found")

        if not structure.sql_query:
            return {"field": field, "values": []}

        distinct_query = self._build_distinct_values_query(
            structure_sql=structure.sql_query,
            selected_columns=structure.selected_columns,
            field=field,
            filters=filters or [],
            limit=limit,
        )
        rows, _ = await self._run_query(distinct_query)
        values: List[str] = []
        for row in rows:
            raw_value = row.get("value")
            if raw_value is None:
                continue
            text = str(raw_value).strip()
            if not text:
                continue
            values.append(text)
        deduped = list(dict.fromkeys(values))
        return {"field": field, "values": deduped}

    @staticmethod
    def _safe_identifier(name: str) -> Optional[str]:
        candidate = (name or "").strip()
        if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", candidate):
            return None
        return f"`{candidate}`"

    @staticmethod
    def _sql_literal(value: Any) -> str:
        if value is None:
            return "NULL"
        if isinstance(value, bool):
            return "TRUE" if value else "FALSE"
        if isinstance(value, (int, float)) and not isinstance(value, bool):
            return str(value)
        text = str(value).replace("'", "''")
        return f"'{text}'"

    @staticmethod
    def _numeric_literal(value: Any) -> float:
        if isinstance(value, (int, float)) and not isinstance(value, bool):
            return float(value)
        text = str(value).strip()
        if not text:
            raise ValueError("Numeric filter value is empty")
        return float(text)

    @staticmethod
    def _as_list(value: Any) -> List[Any]:
        if value is None:
            return []
        if isinstance(value, list):
            return value
        text = str(value).strip()
        if not text:
            return []
        return [item.strip() for item in text.split(",") if item.strip()]

    def _build_filter_predicate(
        self,
        filter_item: PreviewFilter,
        allowed_fields: Dict[str, str],
    ) -> Tuple[Optional[str], Optional[Dict[str, Any]]]:
        field_name = (filter_item.field or "").strip()
        resolved_field = allowed_fields.get(field_name.lower())
        if not resolved_field:
            L.warning(f"Skipping unsupported filter field: {field_name}")
            return None, None

        identifier = self._safe_identifier(resolved_field)
        if not identifier:
            L.warning(f"Skipping unsafe filter field: {field_name}")
            return None, None

        column_expr = f"_q.{identifier}"
        op = filter_item.operator
        value = filter_item.value

        if isinstance(value, str) and not value.strip() and op != FilterOperator.in_list:
            return None, None
        if isinstance(value, str):
            normalized = value.strip().upper()
            if normalized in {"ALL", "(ALL)", "*"}:
                return None, None
        if value is None and op != FilterOperator.equals and op != FilterOperator.not_equals:
            return None, None

        # SSRS-like convenience: comma-separated scalar under equals => IN list
        if op == FilterOperator.equals and isinstance(value, str) and "," in value:
            op = FilterOperator.in_list

        def _trace(predicate_sql: str) -> Dict[str, Any]:
            return {
                "field": resolved_field,
                "operator": op.value if isinstance(op, FilterOperator) else str(op),
                "value": value,
                "predicate_sql": predicate_sql,
            }

        if op == FilterOperator.equals:
            if value is None:
                predicate = f"{column_expr} IS NULL"
                return predicate, _trace(predicate)
            predicate = f"LOWER(CAST({column_expr} AS STRING)) = LOWER({self._sql_literal(str(value).strip())})"
            return predicate, _trace(predicate)

        if op == FilterOperator.not_equals:
            if value is None:
                predicate = f"{column_expr} IS NOT NULL"
                return predicate, _trace(predicate)
            predicate = f"LOWER(CAST({column_expr} AS STRING)) <> LOWER({self._sql_literal(str(value).strip())})"
            return predicate, _trace(predicate)

        if op == FilterOperator.contains:
            token = str(value).replace("'", "''")
            predicate = f"LOWER(CAST({column_expr} AS STRING)) LIKE LOWER('%{token}%')"
            return predicate, _trace(predicate)

        if op == FilterOperator.starts_with:
            token = str(value).replace("'", "''")
            predicate = f"LOWER(CAST({column_expr} AS STRING)) LIKE LOWER('{token}%')"
            return predicate, _trace(predicate)

        if op == FilterOperator.ends_with:
            token = str(value).replace("'", "''")
            predicate = f"LOWER(CAST({column_expr} AS STRING)) LIKE LOWER('%{token}')"
            return predicate, _trace(predicate)

        if op == FilterOperator.gt:
            predicate = f"CAST({column_expr} AS DOUBLE) > {self._numeric_literal(value)}"
            return predicate, _trace(predicate)

        if op == FilterOperator.gte:
            predicate = f"CAST({column_expr} AS DOUBLE) >= {self._numeric_literal(value)}"
            return predicate, _trace(predicate)

        if op == FilterOperator.lt:
            predicate = f"CAST({column_expr} AS DOUBLE) < {self._numeric_literal(value)}"
            return predicate, _trace(predicate)

        if op == FilterOperator.lte:
            predicate = f"CAST({column_expr} AS DOUBLE) <= {self._numeric_literal(value)}"
            return predicate, _trace(predicate)

        if op == FilterOperator.in_list:
            values = self._as_list(value)
            if not values:
                return None, None
            normalized_values = [str(item).strip() for item in values if str(item).strip()]
            if not normalized_values:
                return None, None
            literals = ", ".join(self._sql_literal(item.lower()) for item in normalized_values)
            predicate = f"LOWER(CAST({column_expr} AS STRING)) IN ({literals})"
            return predicate, _trace(predicate)

        return None, None

    def _resolve_selectable_fields(self, selected_columns: List[str]) -> Dict[str, str]:
        available_fields: Dict[str, str] = {}
        for col in selected_columns or []:
            raw = col.strip()
            if not re.fullmatch(r"[A-Za-z_][A-Za-z0-9_]*", raw):
                continue
            available_fields[raw.lower()] = raw
        return available_fields

    def _build_order_clause(
        self,
        allowed_fields: Dict[str, str],
        group_by: Optional[str],
        sorts: List[PreviewSort],
    ) -> Tuple[str, List[Dict[str, Any]]]:
        order_parts: List[str] = []
        order_debug: List[Dict[str, Any]] = []
        seen_fields: set[str] = set()

        group_value = (group_by or "").strip()
        if group_value:
            resolved_group = allowed_fields.get(group_value.lower())
            if resolved_group:
                identifier = self._safe_identifier(resolved_group)
                if identifier:
                    order_parts.append(f"_q.{identifier} ASC")
                    order_debug.append({
                        "field": resolved_group,
                        "direction": "asc",
                        "source": "group_by",
                    })
                    seen_fields.add(resolved_group.lower())

        for sort_item in sorts:
            sort_field = (sort_item.field or "").strip()
            resolved_field = allowed_fields.get(sort_field.lower())
            if not resolved_field:
                continue
            if resolved_field.lower() in seen_fields:
                continue
            identifier = self._safe_identifier(resolved_field)
            if not identifier:
                continue
            direction = (
                SortDirection.desc
                if sort_item.direction == SortDirection.desc
                else SortDirection.asc
            )
            order_parts.append(f"_q.{identifier} {direction.value.upper()}")
            order_debug.append({
                "field": resolved_field,
                "direction": direction.value,
                "source": "sort",
            })
            seen_fields.add(resolved_field.lower())

        order_clause = ", ".join(order_parts)
        return order_clause, order_debug

    def _build_preview_query(
        self,
        structure_sql: str,
        selected_columns: List[str],
        filters: List[PreviewFilter],
        group_by: Optional[str],
        sorts: List[PreviewSort],
        limit: int,
        offset: int,
    ) -> Tuple[str, Dict[str, Any]]:
        available_fields = self._resolve_selectable_fields(selected_columns)

        predicates: List[str] = []
        applied_filters: List[Dict[str, Any]] = []
        for item in filters:
            predicate, trace = self._build_filter_predicate(item, available_fields)
            if predicate:
                predicates.append(predicate)
                if trace:
                    applied_filters.append(trace)

        query = f"SELECT * FROM ({structure_sql}) _q"
        where_clause = ""
        if predicates:
            where_clause = " AND ".join(predicates)
            query = f"{query} WHERE {where_clause}"

        order_clause, order_debug = self._build_order_clause(available_fields, group_by, sorts)
        if not order_clause and available_fields:
            # Keep paging deterministic when the user does not specify sorting.
            default_field = next(iter(available_fields.values()))
            identifier = self._safe_identifier(default_field)
            if identifier:
                order_clause = f"_q.{identifier} ASC"
                order_debug.append({
                    "field": default_field,
                    "direction": "asc",
                    "source": "default",
                })
        if order_clause:
            query = f"{query} ORDER BY {order_clause}"

        safe_limit = max(1, int(limit))
        safe_offset = max(0, int(offset))
        query = f"{query} LIMIT {safe_limit}"
        if safe_offset:
            query = f"{query} OFFSET {safe_offset}"
        return query, {
            "where_clause": where_clause,
            "order_by_clause": order_clause,
            "applied_filters": applied_filters,
            "applied_sorts": order_debug,
            "group_by": (group_by or "").strip() or None,
            "limit": safe_limit,
            "offset": safe_offset,
        }

    def _build_distinct_values_query(
        self,
        structure_sql: str,
        selected_columns: List[str],
        field: str,
        filters: List[PreviewFilter],
        limit: int,
    ) -> str:
        available_fields = self._resolve_selectable_fields(selected_columns)
        resolved_field = available_fields.get((field or "").strip().lower())
        if not resolved_field:
            raise ValueError(f"Unsupported field for parameter options: {field}")

        identifier = self._safe_identifier(resolved_field)
        if not identifier:
            raise ValueError(f"Unsafe field for parameter options: {field}")

        predicates: List[str] = []
        for item in filters:
            # Avoid self-filtering the distinct option query when same field is present.
            if (item.field or "").strip().lower() == resolved_field.lower():
                continue
            predicate, _trace = self._build_filter_predicate(item, available_fields)
            if predicate:
                predicates.append(predicate)

        query = (
            f"SELECT DISTINCT CAST(_q.{identifier} AS STRING) AS value "
            f"FROM ({structure_sql}) _q "
            f"WHERE _q.{identifier} IS NOT NULL"
        )
        if predicates:
            query = f"{query} AND {' AND '.join(predicates)}"

        safe_limit = max(1, int(limit))
        return f"{query} ORDER BY value LIMIT {safe_limit}"

    async def _run_query(self, query: str):
        """Execute SQL via the Databricks SQL warehouse connector.

        Returns a list of row-dicts and a list of column names.
        The SQLConnector returns a pandas DataFrame, so we convert here.
        """
        L.info(f"[DataQueryService] Executing: {query[:120]}...")
        df = await self.sql_connector.run_sql_statement_async(query)

        if df is None or df.empty:
            return [], []

        columns = list(df.columns)
        def _convert(val):
            if isinstance(val, np.ndarray):
                return [_convert(v) for v in val.tolist()]
            if isinstance(val, np.integer):
                return int(val)
            if isinstance(val, np.floating):
                return float(val)
            if isinstance(val, np.bool_):
                return bool(val)
            if isinstance(val, list):
                return [_convert(v) for v in val]
            if isinstance(val, dict):
                return {k: _convert(v) for k, v in val.items()}
            if hasattr(val, 'isoformat'):
                return val.isoformat()
            return val

        rows = [
            {k: _convert(v) for k, v in row.items()}
            for row in df.to_dict(orient="records")
        ]
        return rows, columns

    def _map_results_to_data(
        self, columns: List[str], rows: List[Dict[str, Any]], structure: Structure
    ) -> Dict[str, Any]:
        """
        Build the template data context from query rows.

        Each row is enriched with `_index` (1-based) and `_total` so templates
        can reference record position. ARRAY columns are already native Python
        lists courtesy of Databricks Arrow serialisation — no further mapping
        is required.
        """
        total = len(rows)
        enriched = []
        for idx, row in enumerate(rows):
            row["_index"] = idx + 1
            row["_total"] = total
            enriched.append(row)
        context: Dict[str, Any] = {"rows": enriched}

        # Expose first-row scalar fields at root-level so templates can render
        # page headers/totals without looping (for report-like layouts).
        if enriched:
            first = enriched[0]
            for key, value in first.items():
                if key.startswith("_"):
                    continue
                if isinstance(value, (list, dict)):
                    continue
                context[key] = value

        return context
