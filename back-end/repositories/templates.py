import json
import re
from typing import List, Optional
from uuid import UUID

from common.connectors.lakebase import LakebaseConnector, get_lakebase_connector
from common.logger import log as L
from models.template import Template, TemplateCreate, TemplateUpdate


_COLUMNS_BASE = "id, name, structure_id, html_content, created_at, updated_at"
_COLUMNS_WITH_DEFINITION = (
    "id, name, structure_id, html_content, definition_json, created_at, updated_at"
)
_DESIGNER_META_RE = re.compile(
    r"<!--\s*DESIGNER_META_START\s*([\s\S]*?)\s*DESIGNER_META_END\s*-->",
    re.IGNORECASE,
)


class TemplatesRepository:
    """Data-access layer for the templates table in Lakebase."""

    def __init__(self, connector: Optional[LakebaseConnector] = None):
        self.connector = connector or get_lakebase_connector()
        self._supports_definition_json: Optional[bool] = None

    def _require_connector(self) -> LakebaseConnector:
        if self.connector is None:
            raise RuntimeError(
                "Lakebase is not available. Ensure LAKEBASE_INSTANCE_NAME is configured "
                "and the database instance exists."
            )
        return self.connector

    async def _has_definition_json_column(self) -> bool:
        if self._supports_definition_json is not None:
            return self._supports_definition_json

        try:
            result = await self._require_connector().execute_query(
                "SELECT COUNT(*) FROM information_schema.columns "
                "WHERE table_schema = current_schema() "
                "AND table_name = 'templates' "
                "AND column_name = 'definition_json'"
            )
            self._supports_definition_json = bool(result.scalar())
        except Exception as e:
            L.warning(f"Could not inspect templates.definition_json support: {e}")
            self._supports_definition_json = False

        return self._supports_definition_json

    async def get_all(self, structure_id: Optional[UUID] = None) -> List[Template]:
        connector = self._require_connector()
        has_definition = await self._has_definition_json_column()
        columns = _COLUMNS_WITH_DEFINITION if has_definition else _COLUMNS_BASE
        if structure_id:
            result = await connector.execute_query(
                f"SELECT {columns} FROM templates WHERE structure_id = :sid ORDER BY created_at",
                {"sid": str(structure_id)},
            )
        else:
            result = await connector.execute_query(
                f"SELECT {columns} FROM templates ORDER BY created_at"
            )
        rows = result.fetchall()
        return [self._row_to_model(r, has_definition) for r in rows]

    async def get_by_id(self, template_id: UUID) -> Optional[Template]:
        has_definition = await self._has_definition_json_column()
        columns = _COLUMNS_WITH_DEFINITION if has_definition else _COLUMNS_BASE
        result = await self._require_connector().execute_query(
            f"SELECT {columns} FROM templates WHERE id = :id",
            {"id": str(template_id)},
        )
        row = result.fetchone()
        return self._row_to_model(row, has_definition) if row else None

    async def create(self, data: TemplateCreate) -> Template:
        has_definition = await self._has_definition_json_column()
        columns = _COLUMNS_WITH_DEFINITION if has_definition else _COLUMNS_BASE
        if has_definition:
            result = await self._require_connector().execute_query(
                "INSERT INTO templates (name, structure_id, html_content, definition_json) "
                "VALUES (:name, :structure_id, :html_content, :definition_json::jsonb) "
                f"RETURNING {columns}",
                {
                    "name": data.name,
                    "structure_id": str(data.structure_id),
                    "html_content": data.html_content,
                    "definition_json": json.dumps(data.definition_json),
                },
            )
        else:
            result = await self._require_connector().execute_query(
                "INSERT INTO templates (name, structure_id, html_content) "
                "VALUES (:name, :structure_id, :html_content) "
                f"RETURNING {columns}",
                {
                    "name": data.name,
                    "structure_id": str(data.structure_id),
                    "html_content": data.html_content,
                },
            )
        row = result.fetchone()
        return self._row_to_model(row, has_definition)

    async def update(self, template_id: UUID, data: TemplateUpdate) -> Optional[Template]:
        has_definition = await self._has_definition_json_column()
        sets: list[str] = []
        params: dict = {"id": str(template_id)}

        if data.name is not None:
            sets.append("name = :name")
            params["name"] = data.name
        if data.structure_id is not None:
            sets.append("structure_id = :structure_id")
            params["structure_id"] = str(data.structure_id)
        if data.html_content is not None:
            sets.append("html_content = :html_content")
            params["html_content"] = data.html_content
        if data.definition_json is not None and has_definition:
            sets.append("definition_json = :definition_json::jsonb")
            params["definition_json"] = json.dumps(data.definition_json)

        if not sets:
            return await self.get_by_id(template_id)

        sets.append("updated_at = NOW()")
        set_clause = ", ".join(sets)

        result = await self._require_connector().execute_query(
            f"UPDATE templates SET {set_clause} WHERE id = :id "
            f"RETURNING {_COLUMNS_WITH_DEFINITION if has_definition else _COLUMNS_BASE}",
            params,
        )
        row = result.fetchone()
        return self._row_to_model(row, has_definition) if row else None

    async def delete(self, template_id: UUID) -> bool:
        result = await self._require_connector().execute_query(
            "DELETE FROM templates WHERE id = :id",
            {"id": str(template_id)},
        )
        return result.rowcount > 0

    @staticmethod
    def _row_to_model(row, has_definition: bool) -> Template:
        mapping = row._mapping
        definition_json = {}
        if has_definition:
            definition_json = (mapping.get("definition_json") or {})
        else:
            html = mapping.get("html_content") or ""
            match = _DESIGNER_META_RE.search(html)
            if match and match.group(1):
                try:
                    definition_json = json.loads(match.group(1))
                except Exception:
                    definition_json = {}

        return Template(
            id=mapping["id"],
            name=mapping["name"],
            structure_id=mapping["structure_id"],
            html_content=mapping["html_content"],
            definition_json=definition_json,
            created_at=mapping["created_at"],
            updated_at=mapping["updated_at"],
        )
