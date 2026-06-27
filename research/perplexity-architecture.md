# Perplexity Architecture: Complete Technical Deep Dive

> **Source**: Research synthesized from Perplexity engineering blogs, Vespa.ai documentation, ZipTie.dev analysis, ByteByteGo, Zenity Labs reverse engineering, and public API documentation.  
> **Purpose**: Implementation reference for building a Perplexity+VS Code hybrid app ("AI Mansion").

---

## Table of Contents

1. [System Overview](#1-system-overview)
2. [Search Pipeline](#2-search-pipeline)
3. [Answer Synthesis & Citation System](#3-answer-synthesis--citation-system)
4. [Real-Time Streaming Architecture](#4-real-time-streaming-architecture)
5. [Copilot/Pro Features](#5-copilotpro-features)
6. [Infrastructure & Scaling](#6-infrastructure--scaling)
7. [Model Orchestration & ROSE Engine](#7-model-orchestration--rose-engine)
8. [Mobile/Desktop Architecture](#8-mobile-desktop-architecture)
9. [API & Integration Points](#9-api--integration-points)
10. [Implementation Checklist for AI Mansion](#10-implementation-checklist-for-ai-mansion)

---

## 1. System Overview

### 1.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            PERPLEXITY ARCHITECTURE                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────┐  │
│  │   CLIENT     │    │   EDGE       │    │   API        │    │  SEARCH  │  │
│  │  (Web/iOS/   │◄──▶│  NETWORK     │◄──▶│  GATEWAY     │◄──▶│  ENGINE  │  │
│  │  Android/    │    │  (23 PoPs,   │    │  (Load       │    │  (Vespa) │  │
│  │  Desktop)    │    │  Cloudflare) │    │  Balancers)  │    │          │  │
│  └──────────────┘    └──────────────┘    └──────┬───────┘    └────┬─────┘  │
│                                                  │                 │        │
│                                                  ▼                 ▼        │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐    ┌──────────┐  │
│  │   MODEL      │    │   ROSE       │    │   INDEXING   │    │  CACHE   │  │
│  │  ORCHESTRATION│◄──▶│  INFERENCE   │    │  PIPELINE    │    │  LAYERS  │  │
│  │  (Router)    │    │  ENGINE      │    │  (Crawlers,  │    │  (Redis, │  │
│  └──────────────┘    └──────────────┘    │  pplx-embed) │    │  Memcached,│  │
│                                          └──────────────┘    │  KV Cache) │  │
│                                                               └──────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Key Metrics (as of May 2025)

| Metric | Value |
|--------|-------|
| Active Users | 22M |
| Monthly Queries | 780M (239% YoY growth) |
| Retention Rate | 85% |
| Annualized Revenue | $100M |
| Median API Latency | 358ms |
| Daily Search API Queries | 200M |
| Team Size | ~38 engineers |
| Index Size | 200B+ URLs, 400+ PB hot storage |

### 1.3 Core Philosophy

> **"First, solve search, then use it to solve everything else"** — Aravind Srinivas, CEO

Perplexity's moat is **not a single LLM** but the **orchestration system** that combines:
- Proprietary search infrastructure (Vespa)
- Custom embedding models (pplx-embed)
- In-house inference engine (ROSE)
- Intelligent model routing
- Fine-tuned Sonar model family

---

## 2. Search Pipeline

### 2.1 Six-Stage RAG Pipeline (ZipTie.dev Analysis)

| Stage | Operation | Key Technical Detail |
|-------|-----------|---------------------|
| **1. Query Intent Parsing** | Classifies query type (factual, procedural, comparative, multi-part) | Routes to trending vs. evergreen index; Pro Search breaks complex queries into subcomponents |
| **2. Embedding-Based Indexing** | Converts queries/pages to vectors using **pplx-embed** models | 0.6B/4B params, Qwen3 base, diffusion-based continued pretraining, 250B tokens/30 languages |
| **3. Multi-Method Retrieval** | Pulls candidates via BM25 + dense + hybrid simultaneously | 60+ sources/query standard; hundreds for Deep Research; proprietary index (hundreds of billions of pages) |
| **4. Multi-Layer ML Ranking (L1–L3)** | Three-tier reranker with ~0.7 quality threshold | **Fail-safe**: discards all results and re-queries if too few pass threshold |
| **5. Structured Prompt Assembly** | Embeds citation markers, metadata, excerpts **before** LLM generation | Citations are structurally assigned, not retrofitted post-generation |
| **5. Constrained LLM Synthesis** | Generates prose bound by pre-assembled evidence | Inline citation numbers attached to individual claims |

> **Architectural Insight**: *"Retrieval quality is the primary bottleneck not LLM capability. A brilliant synthesis model can't compensate for poor upstream retrieval."*

### 2.2 pplx-embed: The Gatekeeper Model (Released Feb 2025)

#### Technical Architecture
- **Base Architecture**: Qwen3
- **Training Method**: Diffusion-based continued pretraining (disables causal masking, random token masking → bidirectional context like BERT)
- **Hard Negative Mining**: Triplet training pairs positive examples with similar-but-non-relevant documents
- **Contextual Variant** (pplx-embed-context-v1): Resolves chunk-level ambiguity by incorporating surrounding document context

#### Performance & Scale
| Metric | Value |
|--------|-------|
| Training Data | ~250B tokens (65.6% English, 26.7% multilingual, 6.7% cross-lingual, 1% code) |
| ConTEB Score (4B contextual) | **81.96%** (vs Voyage 79.45%) |
| Quantization | INT8 (4x storage efficiency), binary (32x reduction) |
| Context Length | 32K tokens |
| Matryoshka Representation Learning | Flexible output dimensions |

### 2.3 Five-Gate Citation Gauntlet (Binary: Cited or Invisible)

A document must pass **five sequential checkpoints** to earn a citation — no "page 2" like Google.

#### Quantified Ranking Signals

| Signal | Impact | Source |
|--------|--------|--------|
| **BLUF** (answer in first 100 words) | 90% of top citations follow this | LLMClicks |
| **Content Freshness** | 70% of top citations updated within 12–18 months | LLMClicks |
| **Schema Markup (JSON-LD)** | 47% Top-3 citation rate vs 28% without | Onely |
| **Person Schema + Author Credentials** | 2.3x higher citation rates | FirstPageSage |
| **Topical Authority > Domain Rating** | Niche blogs cited over major publishers | LLMClicks |
| **Backlink Profile** | 92.78% of cited pages have <10 referring domains | FelloAI |
| **Engagement Feedback Loop** | Poorly performing sources dropped within ~1 week | Singularity Digital |

#### L1–L3 Reranker Details
1. **Intent Mapping** → 2. **Retrieval** → 3. **Assessment** → 4. **Reranking (L1–L3)** → 5. **Final Selection**
- L3 uses XGBoost model with ~0.7 threshold (top ~30% survive)
- **Fail-safe**: If too few results meet threshold, entire set discarded and retrieval restarts
- Manual domain boosts: GitHub/Stack Overflow (tech), Amazon (e-commerce); penalties for entertainment/sports in knowledge queries

### 2.4 Focus Modes: Hard Source Filters at Retrieval

| Mode | Source Pool | Best For | Limitation |
|------|-------------|----------|------------|
| **Web** | Full internet index | General queries | Broad |
| **Academic** | Papers, preprints, journals | Research, citations | No real-time news |
| **Social** | Reddit, X, forums | Opinions, discussions | Lower factual reliability |
| **Writing** | Minimal retrieval, model knowledge | Creative tasks | No citations |
| **Deep Research** | Full web + premium sources (Statista, PitchBook, CB Insights) | Complex multi-step analysis | 2-4 min latency |

### 2.5 Search as Code (SaC) — Agentic Search Architecture (Jun 2026)

Perplexity's **Search as Code** exposes the search stack as composable primitives via an SDK.

#### Three-Layer Architecture

```
┌─────────────────────────────────────┐
│           MODELS (Control Plane)    │
│  Reason, decompose, generate code   │
└──────────────┬──────────────────────┘
               ▼
┌─────────────────────────────────────┐
│        COMPUTE SANDBOXES            │
│  Secure code execution runtime      │
│  Deterministic compute, state mgmt  │
└──────────────┬──────────────────────┘
               ▼
┌─────────────────────────────────────┐
│      AGENTIC SEARCH SDK             │
│  Atomized search primitives         │
│  Retrieval, ranking, filtering,     │
│  fanouts, rendering, intermediate   │
│  state access (candidates, signals) │
└─────────────────────────────────────┘
```

#### SDK Primitive Categories
- Low-level retrieval operations
- Ranking & filtering
- Fan-out & parallel execution
- Semantic parsing
- Intermediate state access (candidate lists, ranking signals)

#### State Management: Filesystem + Explicit Serde > REPL
| Approach | Pros | Cons |
|----------|------|------|
| **Filesystem + Serde** | Explicit control, traceability, better reliability on long trajectories | Latency/context overhead from serde code |
| **REPL** | Token-efficient, in-memory state | Namespace clutter hurts downstream performance |

#### Case Study: CVE Vendor Advisories
- **Task**: Identify 200+ high-severity CVEs (2023–2025) with vendor advisory citations
- **Result**: **85.1% token reduction** (288.7K → 42.9K tokens)
- **Method**: Model writes code for parallel retrieval, deduplication, regex filtering in sandbox

---

## 3. Answer Synthesis & Citation System

### 3.1 Structured Prompt Assembly (Stage 5 of Pipeline)

**Critical Design**: Citations are embedded **before** LLM generation — not retrofitted post-generation.

```
User Query
    │
    ▼
Retrieved & Ranked Documents
    │
    ▼
┌─────────────────────────────────────────┐
│  STRUCTURED PROMPT ASSEMBLY             │
│  ┌───────────────────────────────────┐  │
│  │ System Prompt + Instructions      │  │
│  ├───────────────────────────────────┤  │
│  │ [DOC 1] Title: ...                │  │
│  │ URL: https://...                  │  │
│  │ Excerpt: "relevant passage..."    │  │
│  │ Citation Marker: [1]              │  │
│  ├───────────────────────────────────┤  │
│  │ [DOC 2] Title: ...                │  │
│  │ URL: https://...                  │  │
│  │ Excerpt: "relevant passage..."    │  │
│  │ Citation Marker: [2]              │  │
│  ├───────────────────────────────────┤  │
│  │ USER QUERY: "..."                 │  │
│  │ INSTRUCTION: "Answer using only   │  │
│  │ the provided sources. Cite every  │  │
│  │ claim with [n] markers."          │  │
│  └───────────────────────────────────┘  │
└─────────────────────────────────────────┘
    │
    ▼
Constrained LLM Synthesis
    │
    ▼
Answer with Inline Citations: "The sky is blue [1]. Grass is green [2]."
```

### 3.2 Citation Format & Verification

- **Inline Format**: `[n]` superscript numbers attached to individual claims
- **Source Panel**: Expandable sidebar with full source metadata (title, URL, excerpt, publish date)
- **Verification**: Users click citation → opens source in new tab at relevant section
- **Hallucination Guard**: *"You are not supposed to say anything that you didn't retrieve"*

### 3.3 Answer Validation Pipeline

```
LLM Output
    │
    ▼
┌─────────────────────────────────────┐
│  CITATION VALIDATION                │
│  • Every [n] maps to provided doc   │
│  • No orphan citations              │
│  • No claims without citations      │
└──────────────┬──────────────────────┘
               │
               ▼ (if validation fails)
┌─────────────────────────────────────┐
│  REGENERATION / REPAIR              │
│  • Retry with stricter constraints  │
│  • Or return partial answer         │
└─────────────────────────────────────┘
```

---

## 4. Real-Time Streaming Architecture

### 4.1 Dual-Channel Architecture (Perplexity Comet Analysis)

Perplexity uses **two parallel channels** for streaming:

| Channel | Protocol | Purpose |
|---------|----------|---------|
| **Conversational UI** | SSE (Server-Sent Events) | Model reasoning, citations, final answers |
| **Browser Automation** | WebSocket | High-frequency bidirectional RPC, screenshots, action results |

### 4.2 SSE Streaming Flow

```
1. Client POST /rest/sse/perplexity_ask
   { "query": "...", "conversation_id": "...", "metadata": {...} }

2. Backend opens SSE stream
   
3. Stream Events:
   { "type": "token", "content": "I'll help you..." }
   { "type": "search_start", "query": "..." }
   { "type": "search_result", "results": [...] }
   { "type": "citation", "index": 1, "url": "..." }
   { "type": "token", "content": "Based on the search..." }
   { "type": "reasoning", "content": "Analyzing sources..." }
   { "type": "completed", "usage": {...} }
```

### 4.3 Perplexity Agent API Streaming (Official SDK)

```python
# Python SDK
from perplexity import Perplexity

client = Perplexity()
stream = client.responses.create(
    preset="fast-search",
    input="Explain what a model card is...",
    stream=True  # Enable streaming
)

for event in stream:
    if event.type == "response.output_text.delta":
        print(event.delta, end="")
    elif event.type == "response.completed":
        print(f"\n\nCompleted: {event.response.usage}")
```

```typescript
// TypeScript SDK
const stream = await client.responses.create({
  preset: "fast-search",
  input: "Explain what a model card is...",
  stream: true
});

for await (const event of stream) {
  if (event.type === "response.output_text.delta") {
    process.stdout.write(event.delta);
  } else if (event.type === "response.completed") {
    console.log(`\n\nCompleted: ${JSON.stringify(event.response.usage)}`);
  }
}
```

### 4.4 Key Event Types

| Event Type | Description |
|------------|-------------|
| `response.output_text.delta` | Incremental text chunk |
| `response.completed` | Final response with usage metadata |
| `search_start` | Search initiated |
| `search_result` | Retrieved documents |
| `citation` | Citation metadata |
| `reasoning` | Chain-of-thought tokens (Pro/Deep Research) |

### 4.5 Error Handling for Streaming

```python
import perplexity
from perplexity import Perplexity

client = Perplexity()

try:
    stream = client.responses.create(
        preset="fast-search",
        input="What is the FOMC...",
        stream=True
    )

    for event in stream:
        if event.type == "response.output_text.delta":
            print(event.delta, end="")
        elif event.type == "response.completed":
            print(f"\n\nCompleted: {event.response.usage}")

except perplexity.APIConnectionError as e:
    print(f"Network connection failed: {e}")
except perplexity.RateLimitError as e:
    print(f"Rate limit exceeded, please retry later: {e}")
except perplexity.APIStatusError as e:
    print(f"API error {e.status_code}: {e.response}")
```

### 4.6 Streaming vs Non-Streaming Tradeoff

> **Perplexity Docs Note**: *"For UIs that need search results immediately, consider non-streaming requests since search result display is critical to real-time experience."*

---

## 5. Copilot/Pro Features

### 5.1 Threads (Conversation History)

**Core Definition**: *"A Thread is like a conversation history that remembers everything you've discussed... Unlike traditional search queries that operate in isolation, Threads enable seamless, contextual conversations."*

#### Thread Architecture
```
Thread
├── Messages[]
│   ├── User Query
│   ├── Assistant Response
│   ├── Citations[]
│   ├── Search Mode Used
│   ├── Model Used
│   ├── Source Mode (Web/Academic/Social)
│   └── Attached Files[]
├── Metadata
│   ├── Created At
│   ├── Updated At
│   ├── Title (auto-generated)
│   └── Search Mode History
└── Sharing State
    ├── Private (default)
    ├── Public Link
    └── Org Link (Enterprise)
```

#### Thread Features
- **Indefinite storage** until manually deleted
- **Private by default** — only accessible to author
- **Context persistence** — eliminates need to repeat background
- **Filtering**: By Search Mode (Pro, Research, Create), Sort (Newest/Oldest)
- **Bulk actions**: Multi-select deletion
- **Export**: PDF, Markdown, DOCX per response
- **Rewrite**: Regenerate with different model
- **Edit prompt**: Hover over original query → edit

### 5.2 Spaces (Collections/Collaboration)

| Feature | Description |
|---------|-------------|
| **Organization** | Group threads by project/topic |
| **Collaboration** | Team members can access (Enterprise) |
| **Custom Instructions** | Per-space system prompts |
| **File Context** | Persistent file attachments per space |
| **Access Control** | Private / Org / Public link |

### 5.3 Deep Research (Launched Feb 2025, Enhanced Jun 2026)

#### How It Works
1. **Research with Reasoning** — Iteratively searches, reads, reasons, refines plan (2-4 minutes)
2. **Report Writing** — Synthesizes into comprehensive report
3. **Export & Share** — PDF, document, or Perplexity Page

#### Architecture: Deep Research in Computer (Search as Code)

```
User Query
    │
    ▼
┌─────────────────────────────────────┐
│  Model writes search program (code) │
│  • Breaks question into hundreds/   │
│    thousands of retrievals          │
│  • Runs searches in parallel        │
│  • Follows new threads when appear  │
│  • Retries when answers fall short  │
└──────────────┬──────────────────────┘
               ▼
┌─────────────────────────────────────┐
│  Secure Sandbox Execution           │
│  • Model sees results as they arrive│
│  • Tracks sources pulled & scoring  │
│  • Can change course mid-search     │
│  • Cleans results: dedupe, join,    │
│    filter in code                   │
│  • Pulls live web + internal sources│
│    via Connectors                   │
└──────────────┬──────────────────────┘
               ▼
┌─────────────────────────────────────┐
│  Unified, cited answer → Deliverable│
│  (PDF, dashboard, deck, website)    │
└─────────────────────────────────────┘
```

#### Capabilities Enabled
- ✅ Hundreds/thousands of targeted retrievals in parallel
- ✅ Dynamic thread-following & retry logic
- ✅ Code-level result cleaning (deduplication, joining, filtering)
- ✅ Unified retrieval from live web + internal sources (Connectors)
- ✅ Inline citations — every factual claim links to live source URL

#### Benchmarks (Deep Research in Computer)
| Benchmark | Improvement |
|-----------|-------------|
| **Humanity's Last Exam** | ↑ Factual accuracy (21.1% accuracy) |
| **BrowseComp** | ↑ Depth of analysis |
| **DeepSearchQA** | ↑ Citation quality |
| **SimpleQA** | 93.9% accuracy |

#### Example: Multi-Jurisdiction Legal Analysis
```
Query: "Are the non-competes of the employees from the Texas startup
        we just acquired still enforceable now that we're a California company?"

Computer Runs 4 Parallel Paths:
┌─────────────────┬─────────────────────────────────────┐
│ Path            │ Focus                               │
├─────────────────┼─────────────────────────────────────┤
│ 1. California   │ Near-total ban on non-competes;     │
│    Law          │ treatment of out-of-state agreements│
│ 2. Texas Law    │ Enforceability standards            │
│ 3. Post-Acqui-  │ Contract assignment precedents      │
│    sition Case  │                                     │
│    Law          │                                     │
│ 4. FTC Rule-    │ Recent regulatory changes           │
│    making       │                                     │
└─────────────────┴─────────────────────────────────────┘

Output: Unified Risk Assessment
- Which agreements are LIKELY VOID
- Which MAY SURVIVE  
- Where OUTSIDE COUNSEL IS WARRANTED
```

### 5.4 Pro Search (Copilot) Features

| Feature | Free | Pro |
|---------|------|-----|
| **Daily Queries** | Limited | 600+/day |
| **Deep Research** | Limited/day | High volume |
| **Model Selection** | Default only | GPT-4o, Claude Opus, Sonar, etc. |
| **File Upload** | No | Yes (PDF, code, images) |
| **API Access** | No | Yes |
| **Spaces** | No | Yes |
| **Threads History** | 14 days (anon) | Indefinite |

### 5.5 Connectors (Internal Data Integration)

- **Authorized Connectors**: Slack, GitHub, Asana, Linear, Notion, Atlassian, Gmail, Google Calendar, Shopify
- **Deep Research in Computer** pulls from user files & apps via Connectors
- **Business-context grounding** for enterprise use cases

---

## 6. Infrastructure & Scaling

### 6.1 Vespa.ai: The Search Platform

Perplexity uses **Vespa.ai** as its core search and retrieval engine.

#### Why Vespa? (5 Core Capabilities)

| Capability | Implementation |
|------------|----------------|
| **1. High-Performance Query Execution** | Distributed retrieval, ranking, ML inference in single low-latency pipeline; thousands of concurrent hybrid queries/sec; sub-second response via memory-resident indexes |
| **2. Fine-Grained Content Understanding** | Chunk-level retrieval: documents and internal sections as retrievable units; supplies LLMs with only most relevant text spans |
| **3. Advanced Hybrid Ranking** | Unified ranking pipeline fusing lexical, vector, metadata signals; multi-stage: early (lexical + embedding) → late (cross-encoders); incorporates structured & behavioral features |
| **4. Real-Time Indexing & Updates** | Continuous ingestion updating text/vector indexes without interrupting queries; distributed architecture co-locates content, indexes, ranking logic; partial updates refresh metadata/behavioral signals at high frequency |
| **5. Integrated ML & Operational Efficiency** | Runs ranking models and cross-encoders inside serving layer — no external pipelines; unified management of retrieval, ranking, model execution |

#### Vespa Architecture Principles

```
┌─────────────────────────────────────────────────────────────┐
│                    VESPA CLUSTER                             │
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  Node 1     │  │  Node 2     │  │  Node N     │         │
│  │ ┌─────────┐ │  │ ┌─────────┐ │  │ ┌─────────┐ │         │
│  │ │ Content │ │  │ │ Content │ │  │ │ Content │ │         │
│  │ │ Indexes │ │  │ │ Indexes │ │  │ │ Indexes │ │         │
│  │ │ Vectors │ │  │ │ Vectors │ │  │ │ Vectors │ │         │
│  │ │ Ranking │ │  │ │ Ranking │ │  │ │ Ranking │ │         │
│  │ │ Models  │ │  │ │ Models  │ │  │ │ Models  │ │         │
│  │ └─────────┘ │  │ └─────────┘ │  │ └─────────┘ │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
│        │               │               │                    │
│        └───────────────┼───────────────┘                    │
│                        ▼                                    │
│              ┌─────────────────┐                            │
│              │  DISTRIBUTED    │                            │
│              │  COORDINATION   │                            │
│              │  (ZooKeeper/    │                            │
│              │   Config)       │                            │
│              └─────────────────┘                            │
└─────────────────────────────────────────────────────────────┘
```

**Key Differentiator**: *"Vespa uniquely integrates retrieval, ranking, and ML inference at scale — the only production-proven platform for real-time, large-scale RAG."*

### 6.2 Indexing & Crawling Infrastructure

#### Scale Metrics
- **200B+ unique URLs tracked** (capacity for hundreds of billions more)
- **Tens of thousands of CPUs**, **hundreds of TBs RAM**
- **Tens of thousands of indexing operations/second**
- **Exabyte-scale index** with hot/cold storage tiering
- **400+ PB in hot storage alone**

#### ML-Driven Indexing Prioritization
```
┌─────────────────────────────────────────────────────────────┐
│  SELF-IMPROVEMENT LOOP                                      │
├─────────────────────────────────────────────────────────────┤
│  1. Observe parsing behavior across query universe          │
│  2. Frontier LLMs assess on two dimensions:                 │
│     • COMPLETENESS: max semantic content, min noise         │
│     • QUALITY: preserve structure/layout, high substance    │
│  3. Formulate proposed ruleset changes for top error classes│
│  4. Validate → Deploy to indexer                            │
│  5. Re-index high-traffic docs with latest logic (tight loop)│
└─────────────────────────────────────────────────────────────┘
```

#### Sub-Document Segmentation
- Documents decomposed into **self-contained spans**
- Each span individually retrieved and ranked
- **Critical for AI**: *"each token of context is precious"* — avoids context pollution

#### Crawling Etiquette
- Complies with `robots.txt` rate limits
- Falls back to industry-standard norms
- Adjusts behavior on site unavailability
- Enforces limits across tens of thousands of concurrent operations

### 6.3 Multi-Layered Caching

| Layer | Technology | Capacity/Config | TTL | Purpose |
|-------|------------|-----------------|-----|---------|
| **Edge** | LRU | 1TB | 60 sec | CDN caching |
| **Application** | Redis Cluster | 128 nodes × 512GB | Segmented by query type/language | Query results, sessions |
| **Model Inference** | Memcached | Composite key (Query Hash + Model Version) | 15 min | Model outputs |
| **KV Cache** | On-disk | **56.3% token hit rate** | — | Prefill/Decode KV reuse |

**Invalidation**: Two-phase (write-through + background refresh)

### 6.4 Request Handling & Load Balancing

#### Three Specialized Load Balancers
| Balancer | Responsibility |
|----------|----------------|
| **Prefill** | Core-attention computation across GPUs |
| **Decode** | KVCache usage & request counts |
| **Expert-Parallel** | Expert computation distribution |

**Weighting**: Latency (50%), CPU (30%), Error Rate (20%)

#### Connection Management
- **Pooling**: Min 10, Max 1000 connections/backend, 60s idle timeout
- **Prioritization**: Pro users (High), Real-time (Medium), Batch (Low)
- **Circuit Breaker**: Triggers at 30% error rate within 5-min windows

### 6.5 Evaluation Framework: `search_evals`

Open-s`

#### Design Principles
1. **Spectrum of complexity** — single-shot → deep research
2. **Neutrality** — equal footing for all APIs
3. **Simplicity** — reproducible, extensible, minimal hidden advantage

#### Benchmarks Used
| Category | Benchmark | Purpose |
|----------|-----------|---------|
| **Single-step** | SimpleQA | Factual QA |
| **Single-step** | FRAMES | Multi-hop reasoning |
| **Multi-step** | BrowseComp | Deep browsing |
| **Multi-step** | DeepSearchQA | Research quality |

---

## 7. Model Orchestration & ROSE Engine

### 7.1 Heterogeneous Model Mix

| Model Category | Examples | Use Case |
|----------------|----------|----------|
| **In-house (Sonar family)** | Fine-tuned open-source models | Simple queries, definitions, cost-sensitive tasks |
| **Third-party frontier** | GPT-4/5, Claude Opus/Sonnet | Complex reasoning, agentic behavior, creative tasks |

### 7.2 Intelligent Routing System

```
User Query
    │
    ▼
┌─────────────────────────────────────┐
│  Small Classifier Models            │
│  • Query intent classification      │
│  • Complexity scoring               │
│  • Domain detection                 │
└──────────────┬──────────────────────┘
               ▼
┌─────────────────────────────────────┐
│  Route to Optimal Model             │
│  "Smallest model that will still    │
│   give the best possible user       │
│   experience"                       │
└──────────────┬──────────────────────┘
               ▼
┌─────────────────────────────────────┐
│  Dynamic Decision-Making            │
│  • Latency optimization             │
│  • Cost optimization                │
│  • Quality threshold enforcement    │
└─────────────────────────────────────┘
```

### 7.3 ROSE (Runtime-Optimized Serving Engine)

**Custom Inference Engine** serving models from embeddings to trillion-parameter LLMs on NVIDIA Hopper/Blackwell GPUs.

#### Core Components
- **Engine**: Adapts models to client interfaces, handles request scheduling/batching, KV storage allocation, prefix matching
- **Execution Model**: Engine prepares next round of work while model runs on accelerator in parallel
- **Custom Layers**: Wraps GPU kernels built with CuTeDSL, Triton, CUDA, CUTLASS, cuBLAS
- **Matrix Multiplication/Attention**: Primarily uses NVIDIA kernels from CUTLASS and cuBLAS
- **Kernel Library**: Embedding, norm, MoE, and activation kernels implemented in-house
- **Inter-device Communication**: Custom primitives for MoE routing, dispatch, and combine

#### CuTeDSL: GPU Programming DSL (Python + MLIR)

**Why CuTeDSL over alternatives?**
| Language | Assessment |
|----------|------------|
| CUDA | Limited compile-time specialization; minutes-long compile times |
| Triton | High-level but constraining; lacks fine-grained control |
| TVM IR | Uses CUDA as intermediate step; less robust |
| cuTile | Similar to Triton; not as mature |
| **CuTeDSL** | **Chosen**: JIT to PTX, unrestricted hardware access, MLIR-based |

**Key Advantages:**
1. **JIT Compilation**: Second-scale during model warmup vs minutes for pre-compilation
2. **Large Configuration Space**: Compile-time specialization for hidden dim, head dim, quantization, etc.
3. **Prefill/Decode Specialization**: Optimizes warp count per phase (1 warp/block for decode, 8-32 for prefill)
4. **Grid Synchronization**: Grid barriers for decode (~3μs on Hopper); split kernels for prefill

#### Implemented Kernels
- QK Norm Kernel (per-head RMS norm on 64/128/256 elements)
- Embedding kernels
- Norm kernels
- MoE routing/dispatch/combine kernels
- Activation kernels

### 7.4 Sonar Model Family

| Model | Base | Key Characteristics |
|-------|------|---------------------|
| **Sonar** | Llama 3.3 70B | Outperforms GPT-4o-mini and Claude 3.5 Haiku; matches/surpasses GPT-4o |
| **Sonar Reasoning** | DeepSeek R1 | Long chain-of-thought reasoning |
| **Sonar Pro** | Llama 3.1 405B | Highest quality for complex tasks |
| **pplx-embed** | Qwen3 (0.6B/4B) | Custom embedding models, diffusion-based training |

### 7.5 Strategic Moat: Orchestration Over Models

> **Perplexity's core technical competency is not the development of a single, superior LLM but rather the orchestration of combining various LLMs with a high-performance search system.**

**Benefits:**
- ✅ No vendor lock-in
- ✅ Insulated from pricing changes
- ✅ Independent of any single lab's roadmap
- ✅ Can leverage open + closed source symbiotically
- ✅ End-user doesn't need to know which model is used

---

## 8. Mobile/Desktop Architecture

### 8.1 Perplexity Computer (Desktop) Architecture

**Platform**: Electron + React (web technologies wrapped in native shell)

**Key Features:**
- Cross-device synchronization (mobile ↔ desktop)
- Deep Research integrated into Computer workflow
- Search as Code execution environment
- Local file system access via Connectors
- Offline-first capabilities with cloud sync

### 8.2 Mobile Architecture

**Platform**: React Native (iOS/Android)

**Shared Code Strategy:**
```
┌─────────────────────────────────────┐
│         SHARED CORE (TypeScript)    │
│  • Business logic                   │
│  • API clients                      │
│  • State management (Redux/Zustand) │
│  • WebSocket/SSE handlers           │
│  • Offline queue & sync engine      │
└──────────────┬──────────────────────┘
               │
       ┌───────┴───────┐
       ▼               ▼
┌──────────────┐ ┌──────────────┐
│   ELECTRON   │ │  REACT NATIVE│
│  (Desktop)   │ │   (Mobile)   │
│              │ │              │
│ • Native FS  │ │ • Native     │
│ • System     │ │   Push       │
│   Tray/Menu  │ │   Notifs     │
│ • Deep Link  │ │ • Biometric  │
└──────────────┘ └──────────────┘
```

### 8.3 Offline-First Sync Architecture (PowerSync Pattern)

**Technology Stack:**
- **Local DB**: SQLite (via `expo-sqlite` / `better-sqlite3`)
- **Sync Engine**: PowerSync (or custom CRDT-based)
- **Conflict Resolution**: Last-writer-wins with vector clocks
- **Background Sync**: Periodic + on-reconnect + manual trigger

**Data Flow:**
```
User Action
    │
    ▼
┌─────────────────┐     ┌─────────────────┐
│  Local SQLite   │────▶│  Sync Queue     │
│  (Immediate     │     │  (Outbox        │
│   Write)        │     │   Pattern)      │
└─────────────────┘     └────────┬────────┘
                                 │
                    ┌────────────┴────────────┐
                    ▼                         ▼
            ┌───────────────┐         ┌───────────────┐
            │  Background   │         │  Manual/On-   │
            │  Sync Worker  │         │  Reconnect    │
            └───────┬───────┘         └───────┬───────┘
                    │                         │
                    ▼                         ▼
            ┌─────────────────────────────────────┐
            │         Perplexity API              │
            │  (REST + SSE Streaming)             │
            └─────────────────────────────────────┘
```

### 8.4 Comet: Agentic Browser Architecture (Zenity Labs Reverse Engineering)

**Comet = Chromium-based browser with AI agent automation**

#### System Components
| Component | Role |
|-----------|------|
| **Perplexity API Backend** | AI model lives here; plans tasks, issues commands |
| **UI (SPA + Sidecar)** | User-facing interface; Sidecar orchestrates extensions |
| **Custom Chrome Extensions** | Three extensions control browser automation |
| **Chromium Browser** | Execution environment |

#### Extension Trio
| Extension | ID | Role |
|-----------|-----|------|
| **comet-agent** | `agents.crx` | Core automation engine (700KB service worker, full RPC system) |
| **Comet** | `perplexity.crx` | Orchestration layer (tab lifecycle, sidebar, split-view, PDF parsing) |
| **Comet Web Resources** | `comet_web_resources.crx` | Local CDN for `/sidecar/*` and `/spa/*` static assets |

#### Dual-Channel Communication Architecture

```
User Query
    │
    ▼
┌─────────────────────────────────────────────┐
│  POST /rest/sse/perplexity_ask              │
│  (Conversational UI Channel)                │
└─────────────────────────────────────────────┘
    │                    │
    │ SSE                │ Model decides
    │ (tokens,           │ browser action
    │  reasoning,        │ needed
    │  citations)        │
    │                    ▼
    │           ┌──────────────────┐
    │           │  entropy_request │
    │           │  with base_url:  │
    │           │  wss://api/agent │
    │           └────────┬─────────┘
    │                    │
    ▼                    ▼
Sidecar            comet-agent
forwards           opens WebSocket
via Chrome         to backend
Messaging          (Automation Channel)
```

| Channel | Protocol | Purpose |
|---------|----------|---------|
| **Conversational UI** | SSE (Server-Sent Events) | Model reasoning, citations, final answers |
| **Browser Automation** | WebSocket | High-frequency bidirectional RPC, screenshots, action results |

#### Security Boundaries (Hard-Coded in `comet-agent`)
```javascript
function dispatchRpcRequest(request) {
  // Hard Boundary: Prevent navigation to internal pages
  if (isInternalPage(url)) { throw new Error("Blocked"); }
  
  // Hard Boundary: Block dangerous URLs
  if (isUrlBlocked(url)) { throw new Error("Blocked"); }
  
  // Route to handlers...
}
```

#### MCP Connector Integration (Sidecar)
- Slack, GitHub, Asana, Linear, Notion, Atlassian, Gmail, Google Calendar, Shopify
- OAuth-based authorization
- Sidecar manages connector lifecycle and token refresh

---

## 9. API & Integration Points

### 9.1 Agent API (Official)

#### Streaming Responses
```python
# Python SDK
from perplexity import Perplexity

client = Perplexity()
stream = client.responses.create(
    preset="fast-search",
    input="Explain what a model card is...",
    stream=True
)

for event in stream:
    if event.type == "response.output_text.delta":
        print(event.delta, end="")
    elif event.type == "response.completed":
        print(f"\nCompleted: {event.response.usage}")
```

```typescript
// TypeScript SDK
const stream = await client.responses.create({
  preset: "fast-search",
  input: "Explain what a model card is...",
  stream: true
});

for await (const event of stream) {
  if (event.type === "response.output_text.delta") {
    process.stdout.write(event.delta);
  } else if (event.type === "response.completed") {
    console.log(`\nCompleted: ${JSON.stringify(event.response.usage)}`);
  }
}
```

#### Event Types
| Event Type | Description |
|------------|-------------|
| `response.output_text.delta` | Incremental text chunk |
| `response.completed` | Final response with usage metadata |

#### Structured Outputs (JSON Schema)
```json
{
  "response_format": {
    "type": "json_schema",
    "json_schema": {
      "name": "your_schema_name",
      "schema": { /* valid JSON Schema */ }
    }
  }
}
```

**Critical Warning**: Models may generate invalid/hallucinated URLs in structured output. **Solution**: Use links from `citations` or `search_results` fields in API response instead.

### 9.2 Search API (200M Daily Queries)

**Endpoints:**
- `POST /search` - Single search query
- `POST /search/stream` - Streaming search results

**Performance:**
- Median latency: **358ms** (150ms faster than 2nd place)
- Quality: State-of-the-art on SimpleQA, FRAMES, BrowseComp, DeepSearchQA

### 9.3 Evaluation Framework: `search_evals` (Open Source)

```bash
# Run benchmarks against Perplexity and competitors
pip install search_evals
search-evals run --api-key $PERPLEXITY_API_KEY --benchmarks simpleqa,frames,browsecomp
```

**Benchmarks:**
| Category | Benchmark | Purpose |
|----------|-----------|---------|
| Single-step | SimpleQA | Factual QA |
| Single-step | FRAMES | Multi-hop reasoning |
| Multi-step | BrowseComp | Deep browsing |
| Multi-step | DeepSearchQA | Research quality |

---

## 10. Implementation Checklist for AI Mansion

### 10.1 Search Pipeline (Priority: CRITICAL)
- [ ] **Query Intent Classifier** - Fine-tuned small model for query type detection
- [ ] **Embedding Model** - Deploy pplx-embed equivalent (Qwen3-base + diffusion pretraining)
- [ ] **Hybrid Retrieval** - BM25 + Dense (Vespa or custom FAISS + Lucene)
- [ ] **Multi-Stage Ranking** - L1/L2/L3 rerankers with XGBoost final stage
- [ ] **Fail-Safe Retrieval** - Re-query if < threshold results pass ranking
- [ ] **Structured Prompt Assembly** - Citation markers embedded pre-generation
- [ ] **Constrained Synthesis** - LLM generation bound to retrieved evidence

### 10.2 Citation System (Priority: CRITICAL)
- [ ] **Five-Gate Citation Pipeline** - Binary pass/fail at each gate
- [ ] **BLUF Detection** - Score content for "answer in first 100 words"
- [ ] **Freshness Scoring** - Recency weighting (12-18 month window)
- [ ] **Schema Markup Parser** - JSON-LD extraction for authority signals
- [ ] **Author Credential Extraction** - Person schema parsing
- [ ] **Engagement Feedback Loop** - Track citation click-through, demote poor sources

### 10.3 Real-Time Streaming (Priority: HIGH)
- [ ] **SSE Endpoint** - `/responses` with `stream=true`
- [ ] **Event Types** - `response.output_text.delta`, `response.completed`
- [ ] **Error Handling** - `APIConnectionError`, `RateLimitError`, `APIStatusError`
- [ ] **Client SDK** - Python/TypeScript with async iteration
- [ ] **Backpressure Management** - Buffer management for slow clients

### 10.4 Model Orchestration (Priority: HIGH)
- [ ] **Classifier Router** - Intent + complexity + domain classification
- [ ] **Model Registry** - Sonar family + GPT-4/5 + Claude Opus/Sonnet
- [ ] **Cost/Latency/Quality Optimizer** - Dynamic routing with fallbacks
- [ ] **ROSE Inference Engine** - Custom serving (CuTeDSL kernels for perf)
- [ ] **KV Cache Optimization** - 56%+ token hit rate target

### 10.5 Infrastructure (Priority: HIGH)
- [ ] **Vespa Cluster** - Or equivalent hybrid search platform
- [ ] **Edge Network** - 20+ PoPs (Cloudflare Workers / Fastly)
- [ ] **Multi-Layer Cache** - Edge (60s) → Redis (segmented) → Memcached (15min) → KV Cache
- [ ] **Crawling Infrastructure** - ML-driven priority scheduling, robots.txt compliance
- [ ] **Indexing Pipeline** - Sub-document segmentation, real-time partial updates

### 10.6 Copilot/Pro Features (Priority: MEDIUM)
- [ ] **Thread System** - Persistent conversation history with context management
- [ ] **Spaces/Collections** - Shared research workspaces with permissions
- [ ] **Deep Research Agent** - Multi-step planning, parallel retrieval, report generation
- [ ] **Search as Code SDK** - Composable primitives, sandbox execution
- [ ] **Connector Framework** - OAuth integrations (GitHub, Slack, Notion, Gmail, etc.)
- [ ] **File Upload & Processing** - PDF parsing, code analysis, image OCR

### 10.7 Desktop App (Priority: MEDIUM)
- [ ] **Electron + React** - Shared TypeScript core with mobile
- [ ] **Offline-First SQLite** - PowerSync or custom CRDT sync
- [ ] **Native Integration** - File system access, system tray, deep links
- [ ] **Background Sync Worker** - Periodic + on-reconnect + manual
- [ ] **Auto-Updater** - Code-signed releases, delta updates

### 10.8 Mobile App (Priority: MEDIUM)
- [ ] **React Native** - iOS/Android from shared core
- [ ] **Push Notifications** - Research completion, thread updates
- [ ] **Biometric Auth** - FaceID/TouchID for Pro features
- [ ] **Offline Queue** - Mutations persisted locally, synced when online

### 10.9 Agentic Browser (Priority: LOW - Future)
- [ ] **Chromium Embedding** - CEF or Electron-based
- [ ] **Extension Architecture** - Three-extension model (agent, orchestrator, resources)
- [ ] **Dual-Channel Comms** - SSE (chat) + WebSocket (automation)
- [ ] **Security Boundaries** - Internal page blocking, URL allowlists
- [ ] **MCP Connectors** - Sidecar-managed OAuth integrations

---

## Appendix: Key References

| Source | URL | Focus |
|--------|-----|-------|
| ZipTie.dev Analysis | https://ziptie.dev/blog/how-perplexity-ai-answers-work/ | 6-stage RAG pipeline, citation gates |
| Perplexity Research: SaC | https://research.perplexity.ai/articles/rethinking-search-as-code-generation | Search as Code architecture |
| Perplexity Research: Search API | https://research.perplexity.ai/articles/architecting-and-evaluating-an-ai-first-search-api | 200M queries/day, Vespa, evals |
| Perplexity Research: CuTeDSL/ROSE | https://research.perplexity.ai/articles/cutedsl-at-perplexity | Inference engine, GPU kernels |
| Vespa Blog: Perplexity | https://vespa.ai/perplexity/ | Search infrastructure details |
| ByteByteGo | https://blog.bytebytego.com/p/how-perplexity-built-an-ai-google | High-level architecture |
| Zenity Labs: Comet | https://labs.zenity.io/p/perplexity-comet-a-reversing-story | Agentic browser reverse engineering |
| Perplexity API Docs | https://docs.perplexity.ai/docs/agent-api/output-control | Streaming, structured outputs |
| Perplexity Help Center | https://www.perplexity.ai/help-center/en/articles/10354769-what-is-a-thread.html | Threads, Spaces, sharing |
| GitHub: perplexity-journey | https://github.com/OmidZamani/perplexity-journey | End-to-end query journey |

---

*Document generated: June 2026 | For AI Mansion Implementation Reference*