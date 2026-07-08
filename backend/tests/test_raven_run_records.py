from __future__ import annotations

import pytest
from pydantic import ValidationError

from raven.run_records import (
    RunRecordInput,
    RunSourceInput,
    TokenEconomyMetadata,
    build_run_record,
)


def test_build_run_record_exports_evidence_trace_and_token_economy() -> None:
    record = build_run_record(
        RunRecordInput(
            task="summarize local workflow",
            question="What did this workflow decide?",
            answer="The workflow selected a local tool-first path with evidence review.",
            sources=[RunSourceInput(title="Local settings snapshot", kind="settings", uri="local://settings/current")],
            token_economy=TokenEconomyMetadata(
                draft_lane="tool",
                thinking_level="low",
                context_budget=1200,
                estimated_saved_context_tokens=3400,
                confidence_floor=0.74,
                verification_spans=["evidence review"],
                actions=["reuse cached settings", "verify claim spans"],
            ),
        )
    )

    assert record.schema == "home.raven_run_record.v1"
    assert record.evidence_trace.schema == "raven.evidence_graph.v1"
    assert record.token_economy.draft_lane == "tool"
    assert record.token_economy.estimated_saved_context_tokens == 3400
    assert record.claims[0].support_status == "unverified"
    assert record.source_refs[0].uri == "local://settings/current"


def test_private_run_redacts_source_export() -> None:
    record = build_run_record(
        RunRecordInput(
            task="private local summary",
            question="What happened in the private run?",
            answer="The private workflow produced a local-only summary.",
            privacy="private",
            sources=[RunSourceInput(title="Private connector record", kind="connector", uri="local://private/source")],
            token_economy=TokenEconomyMetadata(draft_lane="local-large", escalation_allowed=False),
        )
    )

    exported = record.public_export()

    assert record.privacy == "private"
    assert exported["source_refs"][0]["uri"] is None
    assert exported["source_refs"][0]["metadata"] == {"redacted": "true"}
    assert "Private source URIs and metadata were redacted for export." in exported["redaction_warnings"]


def test_phi_run_cannot_default_to_remote_lane() -> None:
    with pytest.raises(ValidationError):
        RunRecordInput(
            task="clinical handoff",
            question="What should be reviewed?",
            answer="Patient note requires clinical review.",
            privacy="phi",
            token_economy=TokenEconomyMetadata(draft_lane="remote-cheap"),
        )


def test_claim_risk_reflects_sensitive_context() -> None:
    record = build_run_record(
        RunRecordInput(
            task="clinical note review",
            question="What does the note say?",
            answer="The clinical note should be reviewed before action.",
            token_economy=TokenEconomyMetadata(draft_lane="local-small"),
        )
    )

    assert record.evidence_trace.risk == "high"
    assert record.claims[0].risk == "high"
    assert record.claims[0].confidence < record.token_economy.confidence_floor
