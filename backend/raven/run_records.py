from __future__ import annotations

import hashlib
import re
from datetime import datetime, timezone
from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator, model_validator

Risk = Literal["low", "medium", "high", "critical"]
Privacy = Literal["public", "internal", "private", "phi"]
DraftLane = Literal["cache", "tool", "local-small", "local-large", "remote-cheap", "remote-strong"]
ThinkingLevel = Literal["off", "low", "medium", "high", "max"]
SupportStatus = Literal["supported", "under-evidenced", "contradicted", "unverified"]

RISK_ORDER: dict[Risk, int] = {"low": 0, "medium": 1, "high": 2, "critical": 3}
SENSITIVE_TERMS = {"diagnosis", "medication", "patient", "clinical", "consent", "phi", "private", "credential"}
REMOTE_LANES = {"remote-cheap", "remote-strong"}


def utc_now() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")


def normalize_space(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def stable_id(prefix: str, *parts: str) -> str:
    digest = hashlib.sha256("\n".join(parts).encode("utf-8")).hexdigest()[:16]
    return f"{prefix}:{digest}"


def clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
    return max(low, min(high, value))


def risk_from_text(text: str, privacy: Privacy) -> Risk:
    lowered = text.lower()
    if privacy == "phi":
        return "critical"
    if privacy == "private":
        return "high"
    if any(term in lowered for term in SENSITIVE_TERMS):
        return "high"
    return "medium" if len(text) > 400 else "low"


class RunSourceInput(BaseModel):
    title: str = Field(min_length=1, max_length=160)
    kind: str = Field(default="local-run", min_length=1, max_length=64)
    uri: str | None = Field(default=None, max_length=240)
    source_id: str | None = Field(default=None, max_length=96)
    metadata: dict[str, str] = Field(default_factory=dict)

    @field_validator("title", "kind")
    @classmethod
    def clean_text(cls, value: str) -> str:
        cleaned = normalize_space(value)
        if not cleaned:
            raise ValueError("value cannot be empty")
        return cleaned

    @field_validator("uri")
    @classmethod
    def clean_uri(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = normalize_space(value)
        return cleaned or None


class TokenEconomyMetadata(BaseModel):
    draft_lane: DraftLane = "local-small"
    thinking_level: ThinkingLevel = "medium"
    context_budget: int = Field(default=0, ge=0)
    estimated_saved_context_tokens: int = Field(default=0, ge=0)
    confidence_floor: float = Field(default=0.65, ge=0.0, le=1.0)
    verification_spans: list[str] = Field(default_factory=list)
    escalation_allowed: bool = False
    actions: list[str] = Field(default_factory=list)

    @field_validator("verification_spans", "actions")
    @classmethod
    def clean_list(cls, value: list[str]) -> list[str]:
        return [normalize_space(item)[:220] for item in value if normalize_space(item)]


class EvidenceSource(BaseModel):
    id: str
    title: str
    kind: str
    uri: str | None = None
    metadata: dict[str, str] = Field(default_factory=dict)


class EvidenceClaim(BaseModel):
    id: str
    text: str
    source_ids: list[str]
    confidence: float = Field(ge=0.0, le=1.0)
    risk: Risk
    support_status: SupportStatus = "unverified"
    verification_notes: str = "Claim requires downstream evidence verification before high-stakes use."


class EvidenceTrace(BaseModel):
    schema: str = "raven.evidence_graph.v1"
    question: str
    answer: str
    claim_ids: list[str]
    source_ids: list[str]
    confidence: float = Field(ge=0.0, le=1.0)
    risk: Risk
    explanation: str


class RunRecordInput(BaseModel):
    task: str = Field(min_length=1, max_length=180)
    question: str = Field(min_length=1, max_length=500)
    answer: str = Field(min_length=1, max_length=4_000)
    run_id: str | None = Field(default=None, max_length=96)
    privacy: Privacy = "internal"
    sources: list[RunSourceInput] = Field(default_factory=list)
    token_economy: TokenEconomyMetadata = Field(default_factory=TokenEconomyMetadata)

    @field_validator("task", "question", "answer")
    @classmethod
    def clean_required_text(cls, value: str) -> str:
        cleaned = normalize_space(value)
        if not cleaned:
            raise ValueError("value cannot be empty")
        return cleaned

    @model_validator(mode="after")
    def validate_privacy_and_routing(self) -> "RunRecordInput":
        if self.privacy in {"private", "phi"} and self.token_economy.draft_lane in REMOTE_LANES:
            raise ValueError("private or PHI-bearing runs must not default to remote draft lanes")
        return self


class RavenRunRecord(BaseModel):
    schema: str = "home.raven_run_record.v1"
    run_id: str
    app: str = "home-for-ai"
    created_at: str
    task: str
    privacy: Privacy
    source_refs: list[EvidenceSource]
    claims: list[EvidenceClaim]
    evidence_trace: EvidenceTrace
    token_economy: TokenEconomyMetadata
    input_digest: str
    replay_policy: str
    redaction_warnings: list[str] = Field(default_factory=list)

    def public_export(self) -> dict[str, Any]:
        payload = self.model_dump()
        if self.privacy in {"private", "phi"}:
            for source in payload["source_refs"]:
                source["uri"] = None
                source["metadata"] = {"redacted": "true"}
            payload["redaction_warnings"] = sorted(
                set(payload["redaction_warnings"] + ["Private source URIs and metadata were redacted for export."])
            )
        return payload


def build_sources(inputs: list[RunSourceInput], run_id: str, privacy: Privacy) -> list[EvidenceSource]:
    if not inputs:
        inputs = [RunSourceInput(title="Local Home for AI run", kind="local-run")]

    sources: list[EvidenceSource] = []
    for item in inputs:
        source_id = item.source_id or stable_id("source", run_id, item.title, item.kind, item.uri or "")
        uri = item.uri
        metadata = dict(item.metadata)
        if privacy in {"private", "phi"}:
            uri = None
            metadata = {"redacted": "true"}
        sources.append(EvidenceSource(id=source_id, title=item.title, kind=item.kind, uri=uri, metadata=metadata))
    return sources


def build_run_record(body: RunRecordInput) -> RavenRunRecord:
    run_id = body.run_id or stable_id("run", body.task, body.question, body.answer)
    sources = build_sources(body.sources, run_id, body.privacy)
    source_ids = [source.id for source in sources]
    risk = risk_from_text(f"{body.task} {body.question} {body.answer}", body.privacy)

    confidence = clamp(max(body.token_economy.confidence_floor, 0.55) - (0.08 * RISK_ORDER[risk]))
    support_status: SupportStatus = "unverified" if body.token_economy.verification_spans else "under-evidenced"
    claim = EvidenceClaim(
        id=stable_id("claim", run_id, body.answer),
        text=body.answer,
        source_ids=source_ids,
        confidence=round(confidence, 2),
        risk=risk,
        support_status=support_status,
    )

    trace = EvidenceTrace(
        question=body.question,
        answer=body.answer,
        claim_ids=[claim.id],
        source_ids=source_ids,
        confidence=claim.confidence,
        risk=risk,
        explanation=(
            "Home for AI created this Raven trace from local run metadata. "
            "Claim support is recorded separately from model confidence so later verification can upgrade or reject it."
        ),
    )

    digest = stable_id("digest", body.task, body.question, body.answer, body.privacy)
    warnings: list[str] = []
    if body.privacy in {"private", "phi"}:
        warnings.append("Private source URIs and metadata were redacted.")
    if claim.support_status != "supported":
        warnings.append("Claim support remains unverified until evidence verification runs.")

    return RavenRunRecord(
        run_id=run_id,
        created_at=utc_now(),
        task=body.task,
        privacy=body.privacy,
        source_refs=sources,
        claims=[claim],
        evidence_trace=trace,
        token_economy=body.token_economy,
        input_digest=digest,
        replay_policy="Replay with the same source IDs, token-economy plan, and evidence verification spans before publishing claims.",
        redaction_warnings=warnings,
    )
