from __future__ import annotations

import hashlib
import re
from datetime import datetime, timezone
from typing import Any, Literal

Risk = Literal["low", "medium", "high", "critical"]
Privacy = Literal["public", "internal", "private", "phi"]
DraftLane = Literal["cache", "tool", "local-small", "local-large", "remote-cheap", "remote-strong"]

EVIDENCE_SCHEMA = "raven.evidence_graph.v1"
RUN_RECORD_SCHEMA = "raven.home_run.v1"
TOKEN_ECONOMY_SCHEMA = "raven.token_economy.v1"

RISK_WEIGHT: dict[Risk, float] = {"low": 0.0, "medium": 0.33, "high": 0.72, "critical": 1.0}


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")


def normalize_space(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip()


def clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
    return max(low, min(high, value))


def stable_id(prefix: str, *parts: object) -> str:
    joined = "::".join(str(part) for part in parts if part is not None)
    digest = hashlib.sha256(joined.encode("utf-8")).hexdigest()[:16]
    return f"{prefix}:{digest}"


def connector_source(
    connector: str,
    record_id: str,
    *,
    title: str | None = None,
    kind: str = "connector-record",
    uri: str | None = None,
    raw_payload: Any | None = None,
) -> dict[str, Any]:
    """Represent a private connector record without copying raw payloads."""

    safe_connector = normalize_space(connector) or "connector"
    safe_record_id = normalize_space(record_id) or "record"
    safe_title = normalize_space(title or f"{safe_connector} record {safe_record_id}")
    return {
        "id": stable_id("source", safe_connector, safe_record_id),
        "title": safe_title,
        "kind": normalize_space(kind) or "connector-record",
        "uri": normalize_space(uri) if uri else f"local://{safe_connector}/{safe_record_id}",
        "connector": safe_connector,
        "private": True,
        "content_included": False,
        "redaction": "raw connector payload retained locally and referenced by source id",
    }


def split_claims(text: str) -> list[str]:
    chunks = re.split(r"(?<=[.!?])\s+", normalize_space(text))
    return [chunk for chunk in chunks if len(chunk) >= 12]


def infer_risk(text: str) -> Risk:
    lowered = text.lower()
    critical_terms = ("emergency", "critical", "suicide", "overdose", "chest pain", "stroke")
    high_terms = ("patient", "clinical", "medical", "diagnosis", "medication", "private", "phi", "financial")
    if any(term in lowered for term in critical_terms):
        return "critical"
    if any(term in lowered for term in high_terms):
        return "high"
    if len(text) > 220:
        return "medium"
    return "low"


def plan_token_economy(
    *,
    task: str,
    privacy: Privacy = "public",
    risk: Risk = "medium",
    estimated_context_tokens: int = 0,
    estimated_output_tokens: int = 512,
    cache_hit_ratio: float = 0.0,
    draft_confidence: float = 0.55,
    evidence_coverage: float = 0.0,
    tool_available: bool = False,
    latency_sensitive: bool = False,
) -> dict[str, Any]:
    """Create model-agnostic token-saving metadata for a local Home run."""

    cache_hit_ratio = clamp(cache_hit_ratio)
    draft_confidence = clamp(draft_confidence)
    evidence_coverage = clamp(evidence_coverage)

    if cache_hit_ratio >= 0.8:
        draft_lane: DraftLane = "cache"
    elif tool_available:
        draft_lane = "tool"
    elif privacy in {"private", "phi"}:
        draft_lane = "local-large" if risk in {"high", "critical"} else "local-small"
    elif latency_sensitive:
        draft_lane = "local-small"
    elif risk in {"high", "critical"}:
        draft_lane = "remote-strong"
    else:
        draft_lane = "remote-cheap"

    reusable_context = int(max(0, estimated_context_tokens) * cache_hit_ratio)
    privacy_cap = 24_000 if privacy in {"private", "phi"} else 48_000
    context_after_cache = max(0, estimated_context_tokens - reusable_context)
    context_budget = min(context_after_cache, privacy_cap)
    saved_context_tokens = reusable_context + max(0, context_after_cache - context_budget)

    survival = clamp((draft_confidence * 0.6) + (evidence_coverage * 0.32) - (RISK_WEIGHT[risk] * 0.24))
    verification_pressure = clamp((1.0 - survival) * 0.55 + RISK_WEIGHT[risk] * 0.35)
    confidence_floor = round(max(0.52, 1.0 - verification_pressure), 2)
    escalation_allowed = survival < 0.45 or risk == "critical"
    if privacy in {"private", "phi"}:
        escalation_allowed = False

    verification_spans = []
    if risk in {"high", "critical"}:
        verification_spans.append("high-risk claims")
    if evidence_coverage < 0.7:
        verification_spans.append("weak-evidence claims")
    if draft_confidence < confidence_floor:
        verification_spans.append("low-confidence draft spans")
    if not verification_spans:
        verification_spans.append("uncertain claims only")

    return {
        "schema": TOKEN_ECONOMY_SCHEMA,
        "task": normalize_space(task),
        "draft_lane": draft_lane,
        "thinking_level": "high" if risk in {"high", "critical"} else "medium",
        "context_budget": context_budget,
        "estimated_saved_context_tokens": saved_context_tokens,
        "confidence_floor": confidence_floor,
        "draft_confidence": round(draft_confidence, 2),
        "evidence_coverage": round(evidence_coverage, 2),
        "verification_spans": verification_spans,
        "escalation_allowed": escalation_allowed,
        "privacy": privacy,
        "risk": risk,
        "actions": [
            "reuse cached summaries before raw context",
            "retrieve narrow evidence slices",
            f"draft first with {draft_lane}",
            "verify risky or uncertain spans",
            "escalate only after confidence floor failure" if escalation_allowed else "keep escalation disabled by policy",
        ],
    }


def build_evidence_trace(
    *,
    question: str,
    answer: str,
    sources: list[dict[str, Any]],
    claims: list[str] | None = None,
    confidence: float = 0.72,
    risk: Risk | None = None,
) -> dict[str, Any]:
    safe_question = normalize_space(question)
    safe_answer = normalize_space(answer)
    claim_texts = [normalize_space(claim) for claim in (claims or split_claims(safe_answer)) if normalize_space(claim)]
    if not claim_texts:
        claim_texts = [safe_answer or "Local run completed."]

    source_ids = [source["id"] for source in sources]
    trace_risk = risk or max((infer_risk(claim) for claim in claim_texts), key=lambda value: RISK_WEIGHT[value])
    claim_packets = [
        {
            "id": stable_id("claim", safe_question, claim),
            "text": claim,
            "source_ids": source_ids,
            "confidence": round(clamp(confidence), 2),
            "risk": infer_risk(claim),
        }
        for claim in claim_texts
    ]

    return {
        "schema": EVIDENCE_SCHEMA,
        "question": safe_question,
        "answer": safe_answer,
        "claim_ids": [claim["id"] for claim in claim_packets],
        "source_ids": source_ids,
        "claims": claim_packets,
        "sources": sources,
        "confidence": round(clamp(confidence), 2),
        "risk": trace_risk,
        "explanation": "Home for AI linked this local run to source ids, claims, confidence, and review risk.",
    }


def build_home_run_record(
    *,
    run_id: str,
    question: str,
    answer: str,
    sources: list[dict[str, Any]],
    claims: list[str] | None = None,
    privacy: Privacy = "public",
    estimated_context_tokens: int = 0,
    estimated_output_tokens: int = 512,
    cache_hit_ratio: float = 0.0,
    draft_confidence: float = 0.55,
    evidence_coverage: float = 0.0,
    tool_available: bool = False,
    latency_sensitive: bool = False,
) -> dict[str, Any]:
    trace = build_evidence_trace(
        question=question,
        answer=answer,
        sources=sources,
        claims=claims,
        confidence=draft_confidence,
    )
    token_plan = plan_token_economy(
        task=question,
        privacy=privacy,
        risk=trace["risk"],
        estimated_context_tokens=estimated_context_tokens,
        estimated_output_tokens=estimated_output_tokens,
        cache_hit_ratio=cache_hit_ratio,
        draft_confidence=draft_confidence,
        evidence_coverage=evidence_coverage,
        tool_available=tool_available,
        latency_sensitive=latency_sensitive,
    )
    return {
        "schema": RUN_RECORD_SCHEMA,
        "run_id": normalize_space(run_id) or stable_id("run", question, answer),
        "app": "home-for-ai",
        "created_at": utc_now(),
        "evidence_trace": trace,
        "token_economy": token_plan,
    }
