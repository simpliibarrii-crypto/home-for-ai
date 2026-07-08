from __future__ import annotations

from typing import Any

from fastapi import APIRouter

from raven.run_records import RavenRunRecord, RunRecordInput, build_run_record

router = APIRouter(prefix="/raven", tags=["raven"])


@router.post("/run-records/preview", response_model=RavenRunRecord)
async def preview_run_record(body: RunRecordInput) -> RavenRunRecord:
    """Create a portable Raven run record without persisting it."""

    return build_run_record(body)


@router.post("/run-records/public-export")
async def export_run_record(body: RunRecordInput) -> dict[str, Any]:
    """Create an export-safe Raven run record payload."""

    return build_run_record(body).public_export()
