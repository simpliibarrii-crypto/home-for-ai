# Raven Token Economy Integration

Home for AI should use Raven Token Economy as local run-cost and reasoning-budget metadata. This is about AI inference token saving, not crypto tokenomics.

## Role in Home for AI

Home for AI owns local orchestration, chat history, connector runs, and user-facing inspection. Raven Token Economy owns the planning language for why a workflow used cache, tools, local lanes, cheap remote lanes, or stronger escalation.

| Home area | Token Economy use |
|---|---|
| Agent runs | Store `draft_lane`, `thinking_level`, `context_budget`, `saved_context_tokens`, `confidence_floor`, and `escalation_allowed`. |
| Chat history | Show users whether an answer reused cache, retrieved narrow evidence, or escalated. |
| Connectors | Summarize connector records locally and pass source IDs instead of dumping raw payloads into prompts. |
| Export | Include token-economy metadata beside `raven.evidence_graph.v1` traces. |

## Guardrails

- Token Economy means model/inference token saving, not blockchain, staking, wallets, or governance tokens.
- Keep private connector payloads local.
- Do not use cost savings as a quality claim unless the run records include evidence.
- Route PHI and private user data to local or approved models only.

## Adoption path

1. Add a token-economy metadata object to local agent run records.
2. Render an inspection panel explaining cache reuse, draft lane, verification spans, and escalation status.
3. Link token-economy metadata to Evidence Graph traces.
4. Add tests proving private connector payloads are not copied into public exports.
