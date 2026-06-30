# LLM Model Card — Home for AI

## Overview

Home for AI uses a **fusion LLM routing strategy** for agent trading decisions and skill learning. The system calls multiple models via the OpenRouter API and combines their outputs.

## Models Used

| Model | Provider | Role | Context Window | Weight |
|-------|----------|------|----------------|--------|
| Kimi K2.6 | Moonshot AI (`moonshotai/kimi-k2.6`) | Long-context news & chart analysis | 128K tokens | 40% |
| DeepSeek V3 | DeepSeek (`deepseek/deepseek-v3.2`) | Fast structured trading decisions | 128K tokens | 60% |

## Fusion Strategy

1. **Kimi** performs multi-article news comprehension and market analysis
2. **DeepSeek** produces structured trading decisions from the analysis
3. For high-stakes decisions: both models run in parallel → weighted vote → arbitration
4. Fallback: rule-based decision if both calls fail

## Configuration

- API base URL: `https://openrouter.ai/api/v1`
- Compatible with OpenAI Python SDK
- Environment variables:
  - `OPENROUTER_API_KEY` — API key
  - `KIMI_MODEL_ID` — override model (default: `moonshotai/kimi-k2.6`)
  - `DEEPSEEK_MODEL_ID` — override model (default: `deepseek/deepseek-v3.2`)

## System Prompt

Agents receive a persona-driven system prompt derived from their `AgentIdentity` fields (name, personality, specialty market). The fusion LLM router injects the agent's memory context and learned skills into each call.

## Error Handling

| Error | Cause | Recovery |
|-------|-------|----------|
| `LLMUnavailableError` | API unreachable | Retry with exponential backoff (tenacity) |
| `LLMTimeoutError` | Call exceeds timeout | Fall back to secondary model or rule-based |
| `LLMRateLimitError` | Rate limit hit | Back off and retry |

## Benchmarks

*Benchmark results pending. Models evaluated on trading decision accuracy, response latency, and cost per call.*

## Token Tracking

*Token counting is planned for a future release. Currently, costs are estimated from OpenRouter billing.*

## Streaming

Streaming is not currently used — all LLM calls are synchronous request/response for deterministic trading decisions.
