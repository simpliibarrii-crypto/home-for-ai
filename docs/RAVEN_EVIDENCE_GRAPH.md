# Raven Evidence Graph Integration

Home for AI should use Raven Evidence Graph as the local provenance layer for agent runs. The graph lives in Raven AI and serializes as `raven.evidence_graph.v1` JSON so the desktop app can store, inspect, and export traces without binding the UI to one model provider.

## Role in Home for AI

Home for AI owns local orchestration, desktop controls, backend routes, and user-facing run history. Raven Evidence Graph owns source, claim, confidence, risk, and answer trace structure.

| Home for AI area | Evidence Graph use |
|---|---|
| Agent runs | Store one trace packet per meaningful answer, plan, report, or generated artifact. |
| Chat history | Link messages to trace IDs so a user can inspect why an answer was produced. |
| Connectors | Represent connector records as sources with local IDs instead of copying private data into graph exports. |
| Settings/export | Let users export trace JSON for debugging, governance review, or reproducible workflow handoff. |

## Local run record shape

```json
{
  "run_id": "local-run-001",
  "app": "home-for-ai",
  "evidence_trace": {
    "schema": "raven.evidence_graph.v1",
    "question": "What did this workflow decide?",
    "answer": "The workflow selected a local tool-first path.",
    "claim_ids": ["claim:example"],
    "source_ids": ["source:example"],
    "confidence": 0.78,
    "risk": "low",
    "explanation": "The answer is supported by local settings and tool output."
  }
}
```

## Guardrails

- Keep raw connector payloads in local storage and reference them by source ID.
- Make trace export explicit and user-controlled.
- Do not use confidence as a financial, medical, or legal recommendation score.
- Preserve enough context for debugging without leaking credentials, private drafts, or personal data.

## Adoption path

1. Keep this document as the contract while Raven Evidence Graph lands upstream.
2. Add backend helpers for creating evidence sources from connector/tool results.
3. Link chat responses and workflow records to trace IDs.
4. Add a desktop inspection panel for claims, sources, risk, and confidence.
