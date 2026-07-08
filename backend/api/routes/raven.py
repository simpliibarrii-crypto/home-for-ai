from __future__ import annotations

from typing import Any, Literal

from fastapi import APIRouter
from pydantic import BaseModel, Field

from raven_runtime import build_home_run_record, connector_source

Privacy = Literal["public", "internal", "private", "phi"]

router = APIRouter(prefix="/raven", tags=["raven"])


class SourceInput(BaseModel):
    connector: str = Field(default="local", min_length=1, max_length=80)
    record_id: str = Field(default="manual", min_length=1, max_length=120)
    title: str | None = Field(default=None, max_length=180)
    kind: str = Field(default="connector-record", max_length=80)
    uri: str | None = Field(default=None, max_length=300)


class HomeRunRecordRequest(BaseModel):
    run_id: str = Field(default="local-run", max_length=120)
    question: str = Field(..., min_length=1, max_length=2_000)
    answer: str = Field(..., min_length=1, max_length=10_000)
    claims: list[str] | None = None
    sources: list[SourceInput] = Field(default_factory=list)
    privacy: Privacy = "public"
    estimated_context_tokens: int = Field(default=0, ge=0)
    estimated_output_tokens: int = Field(default=512, ge=1, le=20_000)
    cache_hit_ratio: float = Field(default=0.0, ge=0.0, le=1.0)
    draft_confidence: float = Field(default=0.55, ge=0.0, le=1.0)
    evidence_coverage: float = Field(default=0.0, ge=0.0, le=1.0)
    tool_available: bool = False
    latency_sensitive: bool = False


@router.post("/run-record")
async def create_home_run_record(body: HomeRunRecordRequest) -> dict[str, Any]:
    """Create a local Raven-compatible run record without copying private payloads."""

    sources = [
        connector_source(
            source.connector,
            source.record_id,
            title=source.title,
            kind=source.kind,
            uri=source.uri,
        )
        for source in body.sources
    ]
    if not sources:
        sources = [connector_source("local", body.run_id, title="Manual local run")]

    return build_home_run_record(
        run_id=body.run_id,
        question=body.question,
        answer=body.answer,
        sources=sources,
        claims=body.claims,
        privacy=body.privacy,
        estimated_context_tokens=body.estimated_context_tokens,
        estimated_output_tokens=body.estimated_output_tokens,
        cache_hit_ratio=body.cache_hit_ratio,
        draft_confidence=body.draft_confidence,
        evidence_coverage=body.evidence_coverage,
        tool_available=body.tool_available,
        latency_sensitive=body.latency_sensitive,
    )
