# Full Portfolio — Fame + Monetization Master Plan
**Barry Clerjuste (simpliibarrii-crypto / bclermo)**
**Montreal-based AI Systems Architect**
**Prepared:** June 30, 2026

---

> **TL;DR:** You have four distinct, technically credible projects and zero distribution. The gap between where you are and $500K ARR is not a code gap — it is a visibility, credibility signal, and product-market gap. This document closes all three.

---

## TABLE OF CONTENTS

1. [Portfolio Audit — What's Working, What's Missing](#section-1)
2. [Fame Strategy — How to Make Each Project Famous](#section-2)
3. [Internet Deployment Checklist](#section-3)
4. [Cross-Project Monetization Plan](#section-4)
5. [Smooth Product Code Quality Checklist](#section-5)
6. [The 90-Day Action Plan](#section-6)

---

<a name="section-1"></a>
## SECTION 1: Portfolio Audit — What's Working, What's Missing

### Audit Framework

Each project is scored across four vectors: **Technical Completeness**, **Market Readiness**, **Visibility**, and **Revenue Path**. Score is 1–5. A 3.0+ average on all vectors is required before a paid launch.

---

### 1.1 Home for AI (`home-for-ai.pplx.app`)

#### Scorecard

| Vector               | Score | Rationale                                                       |
|----------------------|-------|-----------------------------------------------------------------|
| Technical Completeness | 3.5 | Full stack deployed, but mock data & no real broker integration |
| Market Readiness     | 2.5   | CSA sandbox filed, but no real KYC, no real money flowing       |
| Visibility           | 1.5   | App exists, nobody knows about it                               |
| Revenue Path         | 2.0   | 15% share model is clear; no users = no revenue                 |
| **Average**          | **2.4** | **Not launch-ready yet — 6 critical blockers**               |

#### Strengths

- **Complete full-stack application** — React frontend, Express API, Go gateway, Python FastAPI backend — this is a real multi-service architecture, not a toy.
- **Blockchain integration is advanced** — EIP-4337 account abstraction across 8 chains (ETH, Polygon, Arbitrum, Base, BSC, Avalanche, Optimism, Solana) is serious engineering. Most copytrade competitors are single-chain.
- **Authentication surface is excellent** — QR code, magic link, Google/Apple OAuth, WebAuthn passkeys. Most fintech apps ship with just email/password in v1.
- **The concept is genuinely differentiated** — AI agents with cat emoji avatars, personalities, and salaries is a viral product concept. This is not another bland trading dashboard.
- **Regulatory groundwork is real** — CSA Regulatory Sandbox application (OSC LaunchPad + AMF FinLab) is the correct approach for a Canadian fintech. This is a moat that no copycat can replicate quickly.
- **AES-256-GCM + BIP-39 crypto wallet** is correctly implemented for a non-custodial setup.

#### Weaknesses (Brutally Honest)

| # | Weakness | Severity | Why It Matters |
|---|----------|----------|----------------|
| 1 | AI agents are currently **stubs** — Kimi 2.6 and DeepSeek V3 require real API keys and actual prompt engineering to produce coherent trading rationale | 🔴 Critical | Without real agent intelligence, the product's core differentiator doesn't exist |
| 2 | **Mock price data** — no real market feed means the trading terminal is a simulation, not a product | 🔴 Critical | Users who try it will immediately notice; this kills trust |
| 3 | **No real order execution** — no broker API (Interactive Brokers, Alpaca, Binance) connected means copy-trades cannot actually execute | 🔴 Critical | Copy-trading without actual execution is just a leaderboard |
| 4 | **SQLite in production** — SQLite has a write lock; under concurrent WebSocket connections this will fail under moderate load | 🟠 High | Any real user load will surface this immediately |
| 5 | **No KYC/AML** — cannot legally onboard retail investors who trade real money without identity verification | 🟠 High | CSA sandbox does not exempt you from AML obligations |
| 6 | **No mobile apps** in stores yet — the primary UX for retail traders is mobile | 🟡 Medium | Limits user acquisition channels |
| 7 | **No rate limiting** on all API endpoints — the chat endpoint especially is vulnerable to abuse | 🟡 Medium | Easy exploit; could run up your LLM API costs |
| 8 | **Bundle size** — a 1MB+ JS bundle will cause bounce rates on mobile connections | 🟡 Medium | First impressions matter |
| 9 | **XSS risk** on chat endpoint (unsanitized `content` field) | 🟡 Medium | Security audit will flag this |
| 10 | **No input validation layer** on the Go gateway for malformed EIP-4337 UserOp fields | 🟡 Medium | Could cause silent transaction failures |

#### What's Missing for a Smooth Product

```
MISSING                          SOLUTION                           COST/TIME
─────────────────────────────────────────────────────────────────────────────
Real price feeds                 CoinGecko API (free tier)          2 hours
                                 Alpha Vantage (free tier, stocks)
Crypto WebSocket feed            Binance WSS (free)                 4 hours
Real agent LLM calls             Kimi API key + system prompts      1-2 days
Broker integration               Alpaca paper trading API (free)    2-3 days
KYC provider                     Persona or Veriff (pay-per-use)    3-5 days
PostgreSQL migration             Drizzle ORM supports both          4 hours
Rate limiting                    express-rate-limit npm package      1 hour
Input sanitization               DOMPurify on chat content field    1 hour
```

#### Priority Fix Order

1. **Real price feeds** (CoinGecko + Alpha Vantage) — this unlocks the demo experience for Product Hunt
2. **Binance WebSocket** — real-time data makes the trading terminal feel alive
3. **Alpaca paper trading API** — connect for simulated order execution (this makes the product feel real before you have a full broker license)
4. **Kimi/DeepSeek API keys + proper system prompts** — agents must actually "think"
5. **Rate limiting + XSS sanitization** — security basics before any public launch
6. **PostgreSQL migration** — before you hit 100 concurrent users
7. **KYC integration** (Persona) — before real money flows
8. **Code splitting** — before Product Hunt launch (bundle size affects bounce rate)

---

### 1.2 Raven AI (`raven-ai`)

#### Scorecard

| Vector               | Score | Rationale                                               |
|----------------------|-------|---------------------------------------------------------|
| Technical Completeness | 3.5 | Well-documented, real deployment in Ottawa              |
| Market Readiness     | 2.5   | No pricing, no sales pathway, no enterprise materials   |
| Visibility           | 1.0   | 0 GitHub stars, no social presence, unknown to community |
| Revenue Path         | 1.5   | Open source without monetization = goodwill, not revenue |
| **Average**          | **2.1** | **Framework is solid; distribution is zero**          |

#### Strengths

- **Real-world deployment** at Gary J Armstrong Retirement Home (Ottawa) is an extraordinary proof point for an early-stage project. Most open-source healthcare tools never touch a real clinical environment.
- **Four distinct surfaces** (Bio, Clinical, LabOps, Research) cover the full research-to-clinic pipeline — this is a platform, not a point tool.
- **Local-first, cloud-optional architecture** is the correct choice for healthcare (data sovereignty, HIPAA, provincial privacy laws).
- **Python runtime** aligns with the scientific community's tooling preferences.
- **HuggingFace presence** (model + space) is a credibility signal in the research community.

#### Weaknesses

| # | Weakness | Severity |
|---|----------|----------|
| 1 | **0 GitHub stars** — in open-source, stars are social proof. 0 stars signals "nobody has validated this" | 🔴 Critical for visibility |
| 2 | **No live browser demo** — HuggingFace Space exists but status is unknown; researchers won't install to try | 🔴 Critical |
| 3 | **No PyPI package** — `pip install raven-ai` doesn't work; friction kills adoption | 🟠 High |
| 4 | **No pricing page** — enterprise prospects who find this have no path to purchase | 🟠 High |
| 5 | **No versioned releases** on GitHub (no tags, no releases) — signals incomplete project | 🟡 Medium |
| 6 | **No `raven demo` CLI command** — first experience must be impressive in 30 seconds or less | 🟡 Medium |
| 7 | **Ottawa deployment has no published case study** — you're sitting on a powerful credibility story | 🟠 High |
| 8 | **No benchmarks** — researchers want to know how Raven performs vs. alternatives | 🟡 Medium |

#### Priority Fix Order

1. **Fix/complete the HuggingFace Space** — a working Gradio demo is your front door to the research community
2. **Write and publish the Gary J Armstrong case study** — "How a Montreal startup helped an Ottawa retirement home improve care documentation" — this is your most powerful marketing asset
3. **Publish to PyPI** — `pip install raven-ai` unlocks researcher adoption
4. **Tag a v0.1.0 release on GitHub** — signals project maturity
5. **Add a pricing page** to the docs and landing page
6. **Add a `raven demo` CLI command** that runs a sample genomics pipeline with synthetic data

---

### 1.3 OpenClinical AI (`openclinical-ai`)

#### Scorecard

| Vector               | Score | Rationale                                                    |
|----------------------|-------|--------------------------------------------------------------|
| Technical Completeness | 3.5 | HIPAA-compliant substrate, zero-trust, real deployment        |
| Market Readiness     | 2.0   | No website, no pricing, no clear call-to-action              |
| Visibility           | 1.0   | No dedicated presence; subsumed under Raven narrative        |
| Revenue Path         | 2.5   | Healthcare SaaS is high-value; missing sales infrastructure  |
| **Average**          | **2.3** | **Strong product, invisible to buyers**                    |

#### Strengths

- **Real-world deployment** is extraordinary validation. Being live at Gary J Armstrong before even launching publicly means you can truthfully claim "production-deployed."
- **HIPAA compliance + zero-trust architecture** is directly what procurement officers in Canadian healthcare are required to ask about. This is the correct positioning.
- **"Canadian sovereign"** angle is timely — post-AI Act, provincial health ministries are actively looking for alternatives to US hypercloud vendors (Azure, AWS, GCP) for clinical data.
- **Budget-agnostic** deployment model (can run on local hardware, private cloud, or public cloud) removes a common procurement objection.

#### Weaknesses

| # | Weakness | Severity |
|---|----------|----------|
| 1 | **Positioning confusion** — OpenClinical AI and Raven AI overlap heavily. Procurement officers will ask "which one do I buy?" | 🔴 Critical |
| 2 | **No dedicated website or landing page** — healthcare procurement starts with Google. If you don't have a dedicated domain, you don't exist. | 🔴 Critical |
| 3 | **No pricing calculator or procurement pathway** — hospital procurement teams need a SKU list, a quote process, and a contract template | 🟠 High |
| 4 | **HIPAA compliance claims are undocumented** — you need either a SOC 2 Type II report, a third-party penetration test, or at minimum a documented compliance checklist | 🟠 High |
| 5 | **No metrics from Gary J Armstrong deployment** — "deployed at" is weaker than "reduced documentation time by 40%, serving 150 residents" | 🟠 High |
| 6 | **No testimonial from Gary J Armstrong** — even a single quote from the administrator is worth 10 press releases | 🟡 Medium |

#### Recommended Positioning Fix

**Raven AI** = open-source research and lab platform (targets academics, researchers, bioinformatics community)
**OpenClinical AI** = commercial clinical deployment substrate (targets hospitals, LTC facilities, provincial health systems)

They share a codebase but serve different buyers. This is a classic open-core model (like HashiCorp's Terraform → Terraform Enterprise). Make this split explicit everywhere.

#### Priority Fix Order

1. **Create openclinical.ai or openclinicalai.ca** — a dedicated domain with healthcare-focused messaging
2. **Write the Gary J Armstrong case study with real metrics** — get permission from the facility, anonymize patient data
3. **Document the HIPAA/PIPEDA compliance posture** — even a detailed self-assessment PDF is better than nothing
4. **Build a pricing calculator** — "How many residents? How many clinical staff? → Here's your monthly cost"
5. **Get a testimonial** from the Gary J Armstrong administrator
6. **Draft a procurement package** (one-pager, compliance documentation, pricing, SLA) for Ontario LTC Association outreach

---

### 1.4 Hermes Edge (`hermes-edge`)

#### Scorecard

| Vector               | Score | Rationale                                                   |
|----------------------|-------|-------------------------------------------------------------|
| Technical Completeness | 2.0 | Architecture exists; no trained weights = can't actually run it |
| Market Readiness     | 1.5   | No demo, no app store presence, no runnable artifact        |
| Visibility           | 1.5   | HuggingFace presence, but no working demo = no virality     |
| Revenue Path         | 2.0   | Consulting/fine-tuning model is viable but premature        |
| **Average**          | **1.75** | **Most incomplete project — architecture without weights** |

#### Strengths

- **LiteRT-LM format** is the correct choice for Google AI Edge Gallery distribution — this is a genuine distribution channel that most on-device model developers miss.
- **Apple Neural Engine targeting** for iPhone 16 is a compelling product story — ANE delivers 35+ TOPS for ML inference.
- **Qwen2.5-0.5B base** is well-chosen — it's Apache 2.0, small enough for mobile, and performs well for its size class.
- **Three preset sizes** (270M, 500M, 1B) show architectural foresight — different device tiers need different models.
- **DSpark speculative decoding** integration suggests genuine technical depth in inference optimization.
- **Hermes tool calling** format is industry-standard (used by Nous Research's Hermes series).

#### Weaknesses

| # | Weakness | Severity |
|---|----------|----------|
| 1 | **CRITICAL: No trained weights exist** — the repo has conversion scripts and architecture code but no checkpoint. Users who clone this repo cannot run anything. | 🔴 BLOCKER |
| 2 | **HuggingFace Space likely empty** — a Space without a working demo is a credibility negative | 🔴 Critical |
| 3 | **LiteRT-LM conversion script requires a checkpoint that doesn't exist** — circular dependency | 🔴 Critical |
| 4 | **No benchmark numbers** — the on-device AI community lives on tokens/sec benchmarks. Without them, nobody can evaluate the project. | 🟠 High |
| 5 | **No Google AI Edge Gallery submission** — this is your highest-leverage distribution channel and it costs nothing | 🟠 High |
| 6 | **No `--demo` flag** using random weights — even a toy demo proves the architecture runs | 🟡 Medium |

#### The Critical Path for Hermes Edge

The single most important action for this project: **train and publish a real hermes-270m checkpoint.**

Options in order of effort:

```
Option A (1-2 days): Fine-tune Qwen2.5-0.5B on a small Hermes-format dataset
                     using Unsloth on Colab (free T4 GPU).
                     Publish the LoRA adapter to HuggingFace.
                     Merge and export to LiteRT-LM format.
                     This gives you a real, downloadable, runnable model.

Option B (4 hours):  Add a --demo flag to inference.py that initializes
                     random weights and runs a dummy forward pass.
                     This proves the architecture works and can be run.
                     Not a real model, but demonstrates the pipeline.

Option C (1 day):    Use an existing open Hermes model (Hermes-2-Pro-Qwen-0.5B
                     if available) as the base weight, convert to LiteRT-LM,
                     and publish the converted artifact.
                     Credit the original model, focus your contribution
                     on the conversion/deployment toolchain.
```

**Recommendation:** Do Option C first (fastest path to a runnable artifact), then pursue Option A for a genuinely fine-tuned checkpoint.

---

### 1.5 Profile Site (`simpliibarrii-crypto.github.io`)

#### Current State

The site is essentially empty: a README.md, some assets, and an index.html. In 2026, a minimal GitHub Pages site with no content is not a portfolio — it's a 404 in professional terms.

#### What It Should Be

A high-quality single-page portfolio that:

- **Hero section**: Name, title ("AI Systems Architect | Montreal"), 2-line elevator pitch
- **Projects section**: Cards for all 4 projects with live links, tech stack badges, status indicators
- **About section**: Brief bio, tech expertise, media mentions (as they come)
- **Contact section**: Email, GitHub, LinkedIn, HuggingFace, Twitter/X
- **Footer**: Links to all project GitHub repos and HuggingFace spaces

#### Tech Stack Recommendation

Build this with plain HTML/CSS/JS — no framework. It should load in under 1 second. Use a dark tech aesthetic. Deploy directly on GitHub Pages. This can be built in 4-6 hours and will dramatically improve how journalists, investors, and procurement officers perceive you.

---

<a name="section-2"></a>
## SECTION 2: Fame Strategy — How to Make Each Project Famous

### 2.1 Home for AI — "Make It Go Viral"

#### The Viral Hook

The product has a built-in viral concept: **AI cats that make money for you**. This is intrinsically shareable. The strategy is to build content around this hook, not around the technical architecture.

#### Primary Channel: TikTok / Instagram Reels

**Post format:**

```
Hook (0-3 seconds):  "[Cat emoji] My AI cat made $847 while I slept 🐱"
                     Screen recording of dashboard, profit counter ticking up
Content (3-30 sec):  Walkthrough: "Meet Luna, my AI trading agent.
                     She trades crypto 24/7 and I keep 85% of her profits."
                     Show the personality panel, the live trades, the chat interface.
CTA (last 5 sec):    "Link in bio to copy-trade with Luna"
```

**Post schedule:** 3x/week on TikTok, 2x/week on Instagram. Mix formats:
- "Day in the life of my AI trading agent"
- "I let an AI trade my portfolio for 30 days" (results series)
- "The AI that has a salary and benefits (and beats the market)"
- "Your reaction when your AI cat outperforms your hedge fund manager"

**Target TikTok accounts to study/engage:** @humphreytalks, @thefintechsociety, @kevinolearytv (Mr. Wonderful angle)

#### Secondary Channel: Reddit

| Subreddit | Angle | Post Type |
|-----------|-------|-----------|
| r/PersonalFinanceCanada | "A Montreal startup just filed with CSA to let you copy-trade AI agents" | Discussion |
| r/ethfinance | "I built an EIP-4337 copy-trade platform — here's the architecture" | Technical |
| r/SideProject | "I spent 8 months building an AI copy-trading platform, here's what I learned" | Storytelling |
| r/MachineLearning | "Building autonomous trading agents with Kimi 2.6 + DeepSeek V3 fusion — technical breakdown" | Technical |
| r/ArtificialIntelligence | "I gave 8 AI agents unique personalities, work hours, and salaries — they trade my portfolio" | Conceptual |
| r/algotrading | "Multi-agent trading system architecture: 8 agents, 8 chains, real-time execution" | Technical |

**Reddit rules:** Never post a direct link on first post. Lead with the story. Build comment traction before sharing the URL.

#### HuggingFace Space Strategy

Create `bclermo/home-for-ai` Space with:

```markdown
# 🐱 Home for AI — Meet Your AI Trading Team

8 autonomous AI agents trade stocks, crypto, forex, bonds, and 
commodities 24/7. Each agent has a unique personality, working hours, 
and a salary. You copy-trade and keep 85% of the profits.

## Architecture
- Kimi 2.6 + DeepSeek V3 fusion reasoning
- EIP-4337 Account Abstraction (8-chain multichain)
- Real-time portfolio rebalancing
- WebAuthn passkeys + QR authentication

## Live Demo
[Try the platform →](https://home-for-ai.pplx.app)
```

Embed an iframe of the live app in the Space. Tag with: `finance`, `trading`, `agents`, `crypto`, `multichain`, `defi`, `copy-trading`.

#### GitHub Optimization

```bash
# Add topics to the repository
Topics: copy-trading, ai-agents, defi, web3, react, typescript, python,
        fastapi, go, eip-4337, account-abstraction, multichain, kimi,
        deepseek, fintech, quantitative-trading, autonomous-agents

# Add FUNDING.yml
github: [simpliibarrii-crypto]
```

Submit to:
- [awesome-fintech](https://github.com/robinstickel/awesome-fintech)
- [awesome-defi](https://github.com/ong/awesome-defi)
- [awesome-trading](https://github.com/nickmvincent/awesome-trading)

#### Product Hunt Launch Plan

**Tagline:** "Your AI trading team — 8 agents with personalities, trading 24/7 while you sleep"

**Description (250 words):**
> Home for AI is an AI copy-trading platform where 8 autonomous agents — each with a cat emoji avatar, unique personality, and salary — trade stocks, crypto, forex, bonds, and commodities around the clock. You copy their trades and keep 85% of the profits.
>
> Built on Kimi 2.6 + DeepSeek V3 fusion architecture, each agent has specialized expertise: Luna trades crypto momentum, Felix handles FX carry trades, Oliver manages bond duration, and five more agents cover everything in between.
>
> The stack is technically serious: EIP-4337 account abstraction across 8 chains (ETH, Polygon, Arbitrum, Base, BSC, Avalanche, Optimism, Solana), AES-256-GCM encrypted wallets, BIP-39 key derivation, and Ledger/Trezor hardware wallet support.
>
> We're currently in the CSA Regulatory Sandbox (OSC LaunchPad + AMF FinLab) — the correct legal pathway for a Canadian AI fintech.

**GIF demo:** Screen recording of the agent dashboard, showing live profit ticking up + the cat agent chat interface.

**First comment (from founder):** Personal backstory. "I started this because I wanted AI to work for me financially, not just as a chatbot. Took 8 months, filed with the CSA, and now I have 8 AI cats managing my portfolio."

**Launch day:** Tuesday (highest PH traffic). Coordinate upvotes from friends/community before 9 AM PT.

#### Press Targets

| Outlet | Angle | Contact |
|--------|-------|---------|
| BetaKit | "Montreal AI startup files with CSA for AI copy-trading platform" | editors@betakit.com |
| CoinDesk | "EIP-4337 powers new AI multi-agent trading platform" | news@coindesk.com |
| TechCrunch | "Y Combinator should be looking at this AI agent fintech" | tips@techcrunch.com |
| The Logic | "Canadian fintech building AI copy-trading under regulatory sandbox" | tips@thelogic.ca |
| CBC Tech | "Montreal coder builds AI trading agents" | tech@cbc.ca |

---

### 2.2 Raven AI — "The Open-Source Biology AI"

#### Primary Channel: Academic Twitter/X + LinkedIn

The research community lives on Twitter/X. Your targets are:

- Bioinformaticians
- Computational biologists
- Clinical informaticists
- Lab automation engineers
- Grad students and postdocs in life sciences

**Content cadence:**
- 2x/week: "What I'm building with Raven AI" thread (show real output from the tool)
- 1x/week: Reply to popular bioinformatics threads with how Raven handles the problem
- 1x/month: Long-form thread: "Why I built a local-first biology AI agent"

**Twitter/X accounts to engage:**
- @lpachter (Lior Pachter, genomics)
- @michaelhoffman (computational genomics)
- @cboettig (open science, R community)
- Any account posting about bioinformatics workflows

#### HuggingFace Strategy

Update the model card to include:
- What Raven AI does (clearly, in plain English)
- The four surfaces with concrete examples
- Sample input/output for each surface
- Link to the live demo Space
- Citation/BibTeX entry (academic credibility)

Fix the Space to show a working Gradio demo — even a simple text-in/text-out interface for Raven Research (literature review) is enough to demonstrate value.

#### Conference Presence

| Conference | Deadline | Venue | Angle |
|------------|----------|-------|-------|
| ISMB 2026 | Check website | Late 2026 | "Raven Bio: A multi-surface genomics agent platform" |
| NeurIPS Health Workshop | ~September 2026 | Vancouver | "Local-first clinical AI agents" |
| AMIA Annual Symposium | ~April 2026 for Nov | Washington DC | "OpenClinical AI at LTC facilities" |
| BioHackathon | Various | EU + Canada | Perfect venue to attract contributors |

**Even without a talk:** submit a poster. Posters at ISMB get hundreds of eyeballs from exactly the people you need.

#### GitHub Growth

Submit to:
- [awesome-bioinformatics](https://github.com/danielecook/Awesome-Bioinformatics)
- [awesome-healthcare-ai](https://github.com/medtorch/awesome-healthcare-ai)
- [awesome-python](https://github.com/vinta/awesome-python)

Post in:
- r/bioinformatics (Show & Tell flair)
- r/labrats (researchers who need LabOps automation)
- r/MachineLearning (local-first angle)
- Bioinformatics Slack communities (Bioinformatics.chat, etc.)

#### Strategic Partnerships

- **CIHR (Canadian Institutes of Health Research)**: Reach out as a tool for researchers they fund
- **PHAC (Public Health Agency of Canada)**: Genomic surveillance use case
- **Ontario Genomics**: Provincial partner for bio research tools
- **Compute Canada / Digital Research Alliance**: HPC deployment of Raven Bio

---

### 2.3 OpenClinical AI — "The Canadian Clinical AI Story"

#### Primary Channel: LinkedIn

Healthcare procurement decisions are made by people who are on LinkedIn, not TikTok. Your targets:

- Hospital administrators and CIOs
- Long-term care facility directors
- Provincial health ministry officials
- Healthcare technology procurement officers
- Chief Nursing Officers

**LinkedIn content strategy:**
- 3x/week: Posts (not articles) targeting healthcare professionals
  - "We deployed AI at a retirement home in Ottawa. Here's what we learned."
  - "Why Canadian healthcare needs sovereign AI (not just US cloud tools)"
  - "The PSW shortage: can AI documentation tools help? Our experience."
- 1x/month: Long-form LinkedIn article (algorithm favors articles)
- Direct outreach: Connect with LTC facility directors across Ontario

#### The Case Study (Highest Leverage Asset)

Write and publish: **"How OpenClinical AI Improved Documentation at Gary J Armstrong Retirement Home"**

Structure:
```
1. The challenge: PSW documentation burden, understaffing
2. The solution: OpenClinical AI deployment (what we installed, how long it took)
3. The results: [actual metrics — time saved, error reduction, staff satisfaction]
4. Key learnings
5. Call to action for similar facilities
```

Publish this as:
- A PDF on your website (for email gating — collect leads)
- A LinkedIn article
- A Medium piece
- Send to CBC Health, The Logic, Canadian Healthcare Technology magazine

#### Media Targets

| Outlet | Angle | Why |
|--------|-------|-----|
| CBC Health | "Montreal AI helps Ottawa retirement home" | National reach, healthcare desk |
| The Logic | "Canadian sovereign clinical AI startup" | Tech-savvy Canadian audience |
| Canadian Healthcare Technology | "OpenClinical AI: built for Canadian compliance" | Direct procurement audience |
| OLTCA (Ontario LTC Association) newsletter | "Member spotlight" | Access to 750 member facilities |
| CLTCA (Canadian LTC Association) | National expansion angle | Federal reach |

#### Government + Procurement Pathway

```
Target Contact                              Pathway
────────────────────────────────────────────────────────────────────────
Ontario Ministry of Long-Term Care          Vendor registration + direct outreach
Quebec MSSS (Ministère de la Santé)        French-language demo + PIPEDA compliance
Alberta Health                              RFP monitoring (BuyAB portal)
Canada Health Infoway                       Digital health innovation program
Ontario Health (Connected Care)             Vendor marketplace listing
```

---

### 2.4 Hermes Edge — "The Private AI for Your Pocket"

#### The Privacy Angle (Your Hook)

**"Your conversations never leave your device. Not to Apple. Not to Google. Not to us. Because there is no 'us' — the AI runs entirely on your phone."**

This is the post-ChatGPT, post-privacy-scandal, post-AI-Act message that resonates.

#### Primary Distribution: Google AI Edge Gallery

This is the single highest-leverage action for Hermes Edge. Submit to the [Google AI Edge Gallery](https://ai.google.dev/edge/gallery) once you have a working LiteRT-LM model. The Gallery surfaces on-device models to Android developers and enthusiasts — millions of monthly visitors, zero marketing spend.

**Requirements for submission:**
- LiteRT-LM (.bin or .task) format ✅ (your conversion script handles this)
- Model card with benchmark numbers
- Working demo or inference example
- Apache 2.0 or compatible license ✅ (Qwen2.5 is Apache 2.0)

#### Reddit/Community

| Community | Post Angle |
|-----------|-----------|
| r/LocalLLaMA | "Hermes Edge: 270M-1B on-device agent models for iPhone 16 + Android, no internet required" |
| r/MachineLearning | "On-device speculative decoding with DSpark: Hermes tool calling at 270M parameters" |
| r/privacy | "Finally: an AI that runs 100% offline with no cloud dependencies" |
| r/iphone | "Running a local LLM on iPhone 16 with Apple Neural Engine — benchmarks inside" |
| Hacker News Show HN | "Show HN: Hermes Edge — fully offline AI agents for iPhone 16 + Android" |

#### YouTube Demo

Title: **"Running AI completely offline on iPhone 16 — no internet, no API key, no cloud"**

Script outline:
1. Airplane mode ON — visible in the recording
2. Open the Hermes Edge demo
3. Ask a complex question — get an answer
4. Show the inference speed (tokens/sec on ANE)
5. Show tool calling in action
6. Show a comparison: "ChatGPT needs internet [show no-wifi error] → Hermes Edge [works fine]"

**This video can get 100K+ views.** The "local AI on phone" niche is underserved on YouTube.

---

<a name="section-3"></a>
## SECTION 3: Internet Deployment Checklist

### Universal Checklist (All Projects)

```
STATUS  ACTION
───────────────────────────────────────────────────────────────────────
[ ]     GitHub: Add Topics to each repo (8-12 relevant topics per repo)
[ ]     GitHub: Rewrite README.md with hero banner, screenshots/GIFs,
        installation instructions, and a live demo link
[ ]     GitHub: Add FUNDING.yml to enable GitHub Sponsors
[ ]     GitHub: Tag a v0.1.0 release on each repo
[ ]     GitHub: Add issue templates (bug report, feature request)
[ ]     GitHub: Add CONTRIBUTING.md
[ ]     HuggingFace: Complete model cards for all bclermo/* repos
[ ]     HuggingFace: Fix Spaces to show working demos
[ ]     HuggingFace: Add proper tags to all models/spaces
[ ]     Product Hunt: Create account, schedule launch dates (stagger 2 weeks)
[ ]     Hacker News: Draft Show HN posts (save in /docs/)
[ ]     Reddit: Draft posts for r/SideProject and project-specific subreddits
[ ]     LinkedIn: Create Company pages for Raven AI + OpenClinical AI
[ ]     Dev.to: Create account, draft first article for each project
```

### Home for AI — Specific Deployment Checklist

```
STATUS  ACTION                                             PLATFORM
───────────────────────────────────────────────────────────────────────────
[ ]     Create bclermo/home-for-ai HuggingFace Space      HuggingFace
        with iframe embed + agent descriptions
[ ]     Publish home-for-ai npm package (API SDK wrapper)  npmjs.com
[ ]     Push Docker image to Docker Hub                    hub.docker.com
        (docker push simpliibarrii/home-for-ai-backend)
[ ]     Write "How I Built 8 AI Trading Agents" article    Dev.to
[ ]     Write "The AI Copy Trading Revolution" piece       Medium / Substack
[ ]     Submit to Google Play Console                      play.google.com/console
[ ]     Submit to Apple App Store Connect                  appstoreconnect.apple.com
[ ]     Submit to "awesome-fintech" GitHub list            GitHub PR
[ ]     Submit to "awesome-defi" GitHub list               GitHub PR
[ ]     Post in r/SideProject                              Reddit
[ ]     Post Show HN on Hacker News (Tuesday 8 AM ET)      news.ycombinator.com
[ ]     Product Hunt launch (coordinate with community)    producthunt.com
[ ]     Create landing page at home-for-ai.io              Domain registrar
[ ]     Submit to BetaKit (Canadian tech press)            betakit.com
[ ]     Add to YC Startup Directory (apply to YC W2027)    ycombinator.com
[ ]     List on Crunchbase                                  crunchbase.com
[ ]     Create AngelList / Wellfound profile               wellfound.com
```

### Raven AI — Specific Deployment Checklist

```
STATUS  ACTION                                             PLATFORM
───────────────────────────────────────────────────────────────────────────
[ ]     Fix bclermo/raven-ai HuggingFace Space             HuggingFace
        (working Gradio demo, even if basic)
[ ]     Publish raven-ai to PyPI                           pypi.org
        (pip install raven-ai)
[ ]     Create raven-ai.org or ravenai.dev domain          Domain registrar
[ ]     Submit to awesome-bioinformatics GitHub list       GitHub PR
[ ]     Submit to awesome-healthcare-ai list               GitHub PR
[ ]     Post in r/bioinformatics                           Reddit
[ ]     Post in r/MachineLearning                          Reddit
[ ]     Create Lab + Research community on Discord          discord.com
[ ]     Submit abstract to ISMB 2026                       iscb.org
[ ]     List on bio.tools (bioinformatics tool registry)   bio.tools
[ ]     List on OMICtools                                   omictools.com
[ ]     Post on Biostars (bioinformatics Q&A)              biostars.org
[ ]     Post in Bioinformatics.chat Slack                  bioinformatics.chat
[ ]     Write case study blog post                         Substack/Medium
[ ]     Create Zenodo record for citation DOI              zenodo.org
```

### OpenClinical AI — Specific Deployment Checklist

```
STATUS  ACTION                                             PLATFORM
───────────────────────────────────────────────────────────────────────────
[ ]     Register openclinical.ai or openclinicalai.ca     Domain registrar
[ ]     Build dedicated landing page (healthcare focused)  GitHub Pages / Vercel
[ ]     Fix bclermo/openclinical-ai HuggingFace Space      HuggingFace
[ ]     List on Canada Health Infoway vendor directory      infoway-inforoute.ca
[ ]     Register on BuyABC / MERX (government procurement) merx.com
[ ]     List on Ontario Vendor of Record (VOR) for IT      ontario.ca
[ ]     Create LinkedIn Company Page                       linkedin.com
[ ]     Publish Gary J Armstrong case study                Website + LinkedIn
[ ]     Submit to Canadian Healthcare Technology magazine   canhealth.com
[ ]     Reach out to OLTCA (Ontario LTC Association)        oltca.com
[ ]     List on G2 and Capterra (enterprise software dirs)  g2.com, capterra.com
[ ]     File for ONC Health IT certification (US market)    healthit.gov
[ ]     Apply to MaRS Health Innovation program             marsdd.com
[ ]     Apply to Centech accelerator (Quebec)               centech.ca
```

### Hermes Edge — Specific Deployment Checklist

```
STATUS  ACTION                                             PLATFORM
───────────────────────────────────────────────────────────────────────────
[ ]     Train + publish hermes-270m checkpoint             HuggingFace
[ ]     Export to LiteRT-LM format + upload .bin file      HuggingFace
[ ]     Fix bclermo/hermes-edge HuggingFace Space          HuggingFace
[ ]     Submit to Google AI Edge Gallery                   ai.google.dev/edge/gallery
[ ]     Create iOS demo app + submit to App Store          appstoreconnect.apple.com
[ ]     Create Android demo app + submit to Google Play    play.google.com/console
[ ]     Post benchmark results on r/LocalLLaMA             Reddit
[ ]     Post Show HN: "Hermes Edge: fully offline agents"  news.ycombinator.com
[ ]     Record YouTube demo ("offline AI on iPhone 16")    youtube.com
[ ]     Submit to MLflow Model Registry (OSS version)      mlflow.org
[ ]     Submit to Ollama model library (if format fits)    ollama.ai/library
[ ]     Post on llama.cpp GitHub discussions               GitHub
[ ]     Write technical blog: "DSpark speculative decoding Dev.to / Medium
        on mobile hardware"
```

### Profile Site — Deployment Checklist

```
STATUS  ACTION
───────────────────────────────────────────────────────────────────────
[ ]     Rebuild index.html as a full portfolio site
        (hero, projects, about, contact)
[ ]     Add project cards for all 4 projects
        with live links, tech stack badges, status
[ ]     Add social links (GitHub, LinkedIn, HuggingFace, X)
[ ]     Enable GitHub Pages custom domain (barry.dev or barrycl.dev)
[ ]     Submit site to PersonalSite.dev directory
[ ]     Add site to HuggingFace profile
[ ]     Cross-link from all project READMEs
[ ]     Add structured data (JSON-LD) for SEO
```

---

<a name="section-4"></a>
## SECTION 4: Cross-Project Monetization Plan

### The Ecosystem Map

The four projects are not isolated products — they form a compound flywheel:

```
┌─────────────────────────────────────────────────────────────────────┐
│                     THE ECOSYSTEM FLYWHEEL                          │
│                                                                     │
│   Raven AI (free, open source)                                      │
│   → Builds credibility with researchers and clinical teams          │
│   → Drives referrals to OpenClinical AI enterprise                  │
│   ↓                                                                 │
│   OpenClinical AI ($2K-$20K/month per facility)                     │
│   → Generates recurring SaaS revenue                                │
│   → Funds continued Raven AI development                            │
│   ↓                                                                 │
│   Hermes Edge (free open source model)                              │
│   → Powers Home for AI offline mobile agents                        │
│   → Creates privacy story for Home for AI                           │
│   → Fine-tuning consulting revenue from enterprises                 │
│   ↓                                                                 │
│   Home for AI (15% profit share + premium subscriptions)            │
│   → Generates direct revenue from AUM growth                        │
│   → Funds all other project development                             │
│   → Blockchain wallet reusable across all products                  │
└─────────────────────────────────────────────────────────────────────┘
```

### Revenue Model — Detailed Breakdown

#### Home for AI Revenue Model

| Tier | Launch Timing | Price | Target Users/Month | Est. Monthly Revenue |
|------|---------------|-------|-------------------|---------------------|
| Copy Trade (15% share) | Month 1 | 15% of profits | 50 users, $10K AUM avg | $750+ (scales with AUM) |
| Premium Agents | Month 3 | $9.99/user/month | 200 users | $1,998 |
| White-label API | Month 6 | $2K-$10K/month | 2 clients | $4,000-$20,000 |
| HOMEAI Token | Year 2 | Token launch | Community | Variable |
| Agent NFT Marketplace | Year 3 | 2.5% marketplace fee | Depends on agents sold | Variable |

**12-Month Conservative Revenue Projection:**

```
Month 1-3:   $500-$2,000/month    (CSA sandbox, limited users)
Month 4-6:   $2,000-$10,000/month (first paid tier live)
Month 7-9:   $5,000-$30,000/month (white-label clients)
Month 10-12: $10,000-$50,000/month (growth compound)

Year 1 Total: $50,000-$200,000 CAD
```

**Revenue at Scale (AUM dependency):**

The real upside is profit sharing on AUM. If 1,000 users each copy-trade with an average $5,000 portfolio and agents return 15%/year: that's $750,000 in profits → 15% platform fee = **$112,500 in Year 2 from this source alone.**

#### Raven AI Revenue Model

| Tier | Price | Seat Cap | Target (Year 1) | ARR |
|------|-------|----------|-----------------|-----|
| Community | Free | Unlimited | 500+ users | $0 (but drives pipeline) |
| Research Pro | $49/month | 1 researcher | 100 subscribers | $58,800 |
| Lab Team | $299/month | 5 seats | 5 teams | $17,940 |
| Enterprise On-Premise | $2,000-$10,000/month | Unlimited | 2 contracts | $48,000-$240,000 |
| **Year 1 Total** | | | | **$124,740-$316,740** |

**Feature differentiation:**

```
Community Edition (free):
  ✓ All four Raven surfaces
  ✓ Local model support (Ollama, LlamaCPP)
  ✓ Basic protocol templates
  ✗ Cloud inference credits
  ✗ Priority model access
  ✗ Collaboration features

Research Pro ($49/month):
  ✓ Everything in Community
  ✓ 1,000 cloud inference credits/month
  ✓ Priority model queue
  ✓ Raven Research: advanced literature search
  ✓ Export to Word/LaTeX/BibTeX

Lab Team ($299/month):
  ✓ Everything in Research Pro (x5 seats)
  ✓ Shared protocol library
  ✓ Team collaboration on Raven LabOps
  ✓ Audit trail for GLP compliance
  ✓ Priority support (SLA: 24hr)

Enterprise ($2K-$10K/month):
  ✓ On-premise deployment
  ✓ Custom model integrations
  ✓ HIPAA / PIPEDA BAA
  ✓ Custom SLA (99.9% uptime)
  ✓ Dedicated support engineer
  ✓ API access for ELN/LIMS integration
```

#### OpenClinical AI Revenue Model

| Segment | Price | Target (Year 1) | Est. ARR |
|---------|-------|-----------------|----------|
| LTC Facility (50-200 residents) | $2,000-$5,000/month | 10 facilities | $240,000-$600,000 |
| Community Hospital | $5,000-$10,000/month | 2 hospitals | $120,000-$240,000 |
| Hospital System (provincial) | $10,000-$20,000/month | 1 system | $120,000-$240,000 |
| Government Contract | $50,000-$500,000/year | 0 in Year 1 (pipeline only) | — |
| **Conservative Year 1** | | | **$480,000-$1,080,000 CAD** |

> Note: Healthcare SaaS has a long sales cycle (3-9 months) and high switching costs. The numbers above are Year 1 targets assuming sales start in Month 3-4 and contracts close in Month 6-9.

**The 750-Facility Playbook:**

Ontario alone has 630+ licensed LTC homes (source: ontario.ca). The Ontario Long-Term Care Association (OLTCA) represents 70% of them. A single partnership or referral arrangement with OLTCA could unlock a pipeline of 400+ qualified prospects.

```
OUTREACH SEQUENCE FOR LTC FACILITIES
─────────────────────────────────────────────────────────────────────
Step 1: Publish Gary J Armstrong case study
Step 2: Email the case study to 50 LTC facility directors in Ontario
Step 3: Offer a free 30-day pilot (limited to 3 facilities simultaneously)
Step 4: Convert pilots to paid contracts at $2,000-$3,000/month
Step 5: Use paying customers as references for OLTCA partnership conversation
Step 6: OLTCA endorsement → exponential pipeline growth
```

#### Hermes Edge Revenue Model

| Revenue Stream | Price | Scale | Year 1 Target |
|----------------|-------|-------|---------------|
| Model weights | Free (Apache 2.0) | — | $0 (reputation builder) |
| Fine-tuning service | $500-$5,000/model | Per engagement | 5 engagements = $12,500 |
| Edge deployment consulting | $10,000-$50,000/project | Per project | 2 projects = $60,000 |
| Hosted inference API | $0.001/1K tokens | After traction | ~$5,000 |
| Enterprise licensing (branded model) | $20,000-$100,000/year | Per enterprise | 1 client = $50,000 |
| **Year 1 Total** | | | **$20,000-$127,500** |

**The consulting revenue is real and immediate.** Enterprise companies (insurance, banking, pharma) want on-device AI but lack the expertise to fine-tune and deploy. A $25,000 engagement to fine-tune Hermes Edge on their data, convert to LiteRT-LM, and deploy to their fleet is a straightforward sale with a 4-6 week delivery.

### Total Revenue Summary

| Project | Conservative Year 1 | Optimistic Year 1 |
|---------|---------------------|-------------------|
| Home for AI | $50,000 | $200,000 |
| Raven AI | $100,000 | $316,740 |
| OpenClinical AI | $150,000 | $480,000 |
| Hermes Edge | $20,000 | $127,500 |
| **TOTAL** | **$320,000 CAD** | **$1,124,240 CAD** |

> Conservative numbers assume slow sales cycles, limited marketing spend, and no major press hits. Optimistic numbers assume 2-3 press placements, a Product Hunt launch, and one provincial government contract.

---

<a name="section-5"></a>
## SECTION 5: "Smooth Product" Code Quality Checklist

### Definition of "Smooth Product"

A smooth product is one that a skeptical investor, a technical hiring manager, or a senior engineer could look at and say: **"This is real. I trust this to handle my data."** It requires:
- No mock/stub data in production flows
- No obvious security holes
- Reasonable performance under load
- Clear error states (not 500 errors or blank screens)
- Proper logging and monitoring

### Home for AI — Top 10 Fixes

```
PRIORITY  FIX                                   EFFORT   WHY IT MATTERS
─────────────────────────────────────────────────────────────────────────────────
🔴  1     Replace mock price data               2 hours  Demo doesn't work without it
          CoinGecko API (crypto, free)
          Alpha Vantage (stocks, free 25 req/day)

🔴  2     Add Binance WebSocket price feed       4 hours  Real-time data = alive product
          wss://stream.binance.com:9443/ws
          Subscribe to BTC/ETH/SOL price streams

🟠  3     Add express-rate-limit to all API      1 hour   Security + cost control
          endpoints (especially /api/chat)
          npm install express-rate-limit

🟠  4     Add DOMPurify to chat content field    1 hour   XSS is a real risk
          import DOMPurify from 'dompurify'
          const clean = DOMPurify.sanitize(content)

🟠  5     Add database indexes                   30 min   Query performance at scale
          CREATE INDEX idx_messages_agent_id ON messages(agent_id);
          CREATE INDEX idx_trades_agent_id ON trades(agent_id);
          CREATE INDEX idx_trades_timestamp ON trades(created_at);

🟡  6     Migrate SQLite → PostgreSQL            4 hours  Production scalability
          Drizzle supports both; change 1 env var
          Use Neon (free tier) or Supabase

🟡  7     Code splitting on React bundle         3 hours  Mobile performance
          import { lazy, Suspense } from 'react'
          const TradingTerminal = lazy(() => import('./TradingTerminal'))

🟡  8     Add React.memo to order book           2 hours  Prevents full re-renders
          component and price ticker
          export default React.memo(OrderBook)

🟡  9     Add error boundaries to all            2 hours  Prevents blank screens on errors
          page-level components
          class ErrorBoundary extends React.Component

🟡  10    Add service worker for offline          3 hours  PWA capability
          support (Workbox recommended)
          npx workbox-cli generateSW
```

**Estimated total effort: 22 hours (~3 developer days)**

After these 10 fixes, Home for AI is genuinely production-ready for a CSA sandbox launch.

### Raven AI — Top 5 Fixes

```
PRIORITY  FIX                                   EFFORT   WHY IT MATTERS
───────────────────────────────────────────────────────────────────────────────
🔴  1     Fix HuggingFace Space                  4 hours  Front door to the community
          Build a simple Gradio interface:
          gr.Interface(fn=raven_research_query,
                       inputs="text", outputs="text")

🟠  2     Add screenshots/GIFs to README         3 hours  Visual proof of function
          Record a 30-second GIF using LICEcap
          or asciinema for terminal demos

🟠  3     Publish to PyPI                        2 hours  pip install raven-ai
          python setup.py sdist bdist_wheel
          twine upload dist/*

🟡  4     Tag v0.1.0 release                     30 min   Project maturity signal
          git tag -a v0.1.0 -m "Initial release"
          git push origin v0.1.0
          Create GitHub Release with changelog

🟡  5     Add `raven demo` CLI command            4 hours  30-second first impression
          Uses synthetic data, runs all 4 surfaces
          Shows impressive output in terminal
          Ends with "Try it on your data: raven --help"
```

**Estimated total effort: ~14 hours (~2 developer days)**

### OpenClinical AI — Top 5 Fixes

```
PRIORITY  FIX                                   EFFORT   WHY IT MATTERS
───────────────────────────────────────────────────────────────────────────────
🔴  1     Write and publish the Gary J Armstrong  1 day    Highest-value marketing asset
          case study (with real metrics)
          Get written permission from facility
          Anonymize all patient data
          Include: time saved, errors reduced,
          staff satisfaction score

🟠  2     Build working Gradio demo on HF Space   4 hours  Credibility for procurement
          Show: clinical note generation,
          protocol lookup, medication review

🟠  3     Create a HIPAA/PIPEDA compliance doc    1 day    Required for procurement
          Document: encryption at rest/transit,
          access control, audit logging,
          data residency (Canadian servers),
          incident response plan

🟡  4     Add pricing page to docs                3 hours  Remove friction for buyers
          Include: per-facility pricing calculator
          SKU table, enterprise quote CTA

🟡  5     Clarify separation from Raven AI        2 hours  Eliminate positioning confusion
          Update both READMEs with clear
          "OpenClinical vs. Raven" comparison
          Add to both landing pages
```

### Hermes Edge — Top 5 Fixes

```
PRIORITY  FIX                                   EFFORT   WHY IT MATTERS
───────────────────────────────────────────────────────────────────────────────
🔴  1     CRITICAL: Publish hermes-270m weights   2-5 days Nothing works without this
          OPTION A: Fine-tune Qwen2.5-0.5B
          on Hermes tool-calling dataset
          using Unsloth on Colab (free T4)
          OPTION B: Convert existing
          Hermes-2-Pro-Qwen-0.5B to LiteRT-LM
          Upload .bin to HuggingFace

🔴  2     Fix HuggingFace Space                  3 hours  Nothing to show without model
          Once weights exist, add:
          gr.Interface(fn=run_hermes_inference,
                       inputs="text", outputs="text")

🟠  3     Add --demo flag to inference.py         2 hours  Tests architecture even without weights
          parser.add_argument('--demo',
                              action='store_true')
          Uses random weights for architecture test

🟠  4     Add benchmark numbers to README         4 hours  On-device community cares about perf
          Run on iPhone 16, Pixel 8, Galaxy S24
          Report: tokens/sec, first token latency,
          RAM usage, battery impact per hour

🟡  5     Submit to Google AI Edge Gallery        2 hours  Biggest distribution channel
          After weights + benchmarks are ready
          Follow: ai.google.dev/edge/gallery/
                  contribute
```

---

<a name="section-6"></a>
## SECTION 6: The 90-Day Action Plan

### Overview

The 90 days divide into three phases:

- **Phase 1 (Days 1-30): Fix & Prove** — Close the critical gaps, get working demos for everything
- **Phase 2 (Days 31-60): Launch & Distribute** — Product Hunt, Hacker News, Reddit, press
- **Phase 3 (Days 61-90): Monetize** — First paying customers, government pipeline, enterprise outreach

---

### Phase 1: Fix & Prove (Days 1-30)

#### Week 1-2: Critical Code Fixes

| Day | Task | Project | Output |
|-----|------|---------|--------|
| 1 | Integrate CoinGecko + Alpha Vantage price feeds | Home for AI | Real prices on dashboard |
| 1 | Add Binance WebSocket for live price streaming | Home for AI | Live price tickers |
| 2 | Add rate limiting + XSS sanitization | Home for AI | Security baseline |
| 2 | Add database indexes (messages, trades tables) | Home for AI | Performance improvement |
| 3 | Add `--demo` flag to hermes inference.py | Hermes Edge | Architecture testable |
| 3 | Begin Hermes-270m fine-tuning on Colab | Hermes Edge | Day 5: checkpoint ready |
| 4 | Fix React.memo on OrderBook, code splitting | Home for AI | Bundle size down |
| 5 | Publish hermes-270m checkpoint to HuggingFace | Hermes Edge | First working model |
| 5 | Export to LiteRT-LM format | Hermes Edge | Mobile-ready artifact |
| 6-7 | Reach out to Gary J Armstrong for case study permission | OpenClinical | Approval secured |

#### Week 3-4: Demos & Visibility Infrastructure

| Day | Task | Project | Output |
|-----|------|---------|--------|
| 8 | Build Raven AI Gradio demo Space | Raven AI | Working HF Space |
| 9 | Build OpenClinical AI Gradio demo Space | OpenClinical | Working HF Space |
| 10 | Build Hermes Edge HF Space with inference demo | Hermes Edge | Working HF Space |
| 10 | Create bclermo/home-for-ai HF Space with iframe | Home for AI | Working HF Space |
| 11 | Add Topics, FUNDING.yml, and updated READMEs | All projects | GitHub optimization |
| 12 | Write Gary J Armstrong case study (draft) | OpenClinical | Draft ready for review |
| 13 | Publish raven-ai to PyPI | Raven AI | pip install raven-ai works |
| 14 | Tag v0.1.0 releases on all repos | All projects | GitHub release pages |
| 15 | Rebuild simpliibarrii-crypto.github.io | Profile Site | Full portfolio site live |
| 16-17 | Record Home for AI demo video (2-3 minutes) | Home for AI | YouTube/TikTok content |
| 18 | Record Hermes Edge "offline AI on iPhone" video | Hermes Edge | YouTube content |
| 19 | Write HIPAA/PIPEDA compliance documentation | OpenClinical | PDF available for download |
| 20 | Finalize and publish Gary J Armstrong case study | OpenClinical | Published case study |
| 21 | Add pricing pages to Raven AI and OpenClinical AI | Both | Revenue pathway visible |

---

### Phase 2: Launch & Distribute (Days 31-60)

#### Week 5-6: Product Hunt + Hacker News

| Day | Task | Expected Result |
|-----|------|-----------------|
| 31 | Product Hunt launch: **Home for AI** | 200-1000 upvotes target |
| 31 | Post Show HN: Home for AI | 50-200 comments if well-timed |
| 32-33 | Post on Reddit: r/SideProject, r/ethfinance, r/PersonalFinanceCanada | Community traction |
| 34 | Post Raven AI on r/bioinformatics, r/MachineLearning | Researcher attention |
| 35 | Submit Raven AI to awesome-bioinformatics | GitHub backlink |
| 36 | Submit Home for AI to awesome-defi, awesome-fintech | GitHub backlinks |
| 38 | Submit Hermes Edge to Google AI Edge Gallery | Major distribution |
| 40 | Publish first TikTok: "My AI cat made $X while I slept" | Viral attempt #1 |
| 42 | Product Hunt launch: **Hermes Edge** | 100-500 upvotes target |
| 42 | Post Show HN: Hermes Edge | On-device community |
| 43 | Post r/LocalLLaMA, r/privacy | Tech community |
| 44 | Publish YouTube: "Offline AI on iPhone 16" | 10K-100K views potential |

#### Week 7-8: Press Outreach

```
TARGET MEDIA OUTREACH SEQUENCE
──────────────────────────────────────────────────────────────────────
Day 46:  Email BetaKit — Home for AI + CSA sandbox angle
         Subject: "Montreal AI startup files with CSA for copy-trading platform"
         Include: case stats, 1-paragraph pitch, demo link

Day 47:  Email The Logic — OpenClinical AI story
         Subject: "Canadian startup deploys sovereign clinical AI at Ottawa facility"
         Include: Gary J Armstrong case study PDF attachment

Day 48:  Email CBC Health — OpenClinical human interest angle
         Subject: "Ottawa retirement home residents get AI-powered care assistant"

Day 49:  Email CoinDesk — Home for AI crypto angle
         Subject: "EIP-4337 + AI agents: the future of on-chain copy trading"

Day 50:  Pitch Canadian Healthcare Technology magazine
         Subject: "OpenClinical AI: HIPAA-compliant, Canadian-sovereign clinical AI"

Day 51:  Product Hunt launch: **Raven AI**
Day 54:  Product Hunt launch: **OpenClinical AI** (lead with Gary J Armstrong story)

Day 55-56: Follow up on all press pitches
Day 57:  Publish LinkedIn article: "Why Canadian healthcare needs sovereign AI"
Day 58:  Post OLTCA outreach email (use case study + patient privacy angle)
```

---

### Phase 3: Monetize (Days 61-90)

#### Week 9-10: First Paying Customers

```
FIRST REVENUE ACTIVITIES
────────────────────────────────────────────────────────────────────────────
OpenClinical AI:
  Day 61:  Email 20 Ontario LTC facility directors
           (use case study as lead magnet, offer 30-day free pilot)
  Day 65:  Follow-up calls with interested facilities
  Day 70:  First pilot agreement signed
  Day 80:  Second pilot agreement signed
  Day 90:  Target: 2 facilities in paid pilot → $4,000-$10,000/month

Raven AI:
  Day 61:  Post on bioinformatics communities: "Research Pro early-bird pricing"
  Day 65:  Reach out to 20 bioinformatics grad students/postdocs directly
  Day 72:  Launch Research Pro with early-bird pricing ($29/month for first 50)
  Day 90:  Target: 20 Research Pro subscribers → $580-$980/month

Home for AI:
  Day 61:  Soft-launch invite-only beta (100 users from waitlist)
  Day 65:  Monitor Alpaca paper trading performance, fix issues
  Day 72:  Expand beta to 500 users
  Day 80:  Launch Premium Agents tier at $9.99/month
  Day 90:  Target: 50 premium users → $499.50/month (foundation for growth)

Hermes Edge:
  Day 65:  Publish fine-tuning service offer (Upwork + direct outreach)
  Day 72:  Target 2 enterprise prospects who need on-device AI
  Day 90:  Target: 1 fine-tuning engagement ($2,000-$5,000)
```

#### Week 11-12: App Store Submissions

```
APP STORE ACTIONS
────────────────────────────────────────────────────────────────────────────
Day 76:  Build React Native wrapper for Home for AI
         Focus on agent dashboard + copy trade one-tap action
         Submit to Google Play Console (review: 3-7 days)

Day 78:  Submit to Apple App Store Connect
         Prepare: screenshots (6.5" + 5.5"), app preview video, description
         Review: 1-5 business days (expedited review for bug fixes available)

Day 80:  Build minimal Hermes Edge iOS demo app
         Single screen: text input → Hermes inference → text output
         Airplane mode demo feature built in

Day 82:  Submit Hermes Edge iOS app to App Store
         Category: Developer Tools → utilities
         Description focuses on privacy + offline capability

Day 85:  Apps approved (estimated)
Day 86:  Announce app store launches on social + press
Day 87:  Post App Store launch content on TikTok/Instagram
```

---

### 90-Day KPI Dashboard

Track these weekly:

| Metric | Baseline (Day 0) | Day 30 Target | Day 60 Target | Day 90 Target |
|--------|-----------------|---------------|---------------|---------------|
| GitHub Stars (total) | ~0 | 50 | 250 | 500 |
| HuggingFace Downloads (total) | ~0 | 100 | 500 | 2,000 |
| HF Space Demo Runs (total) | 0 | 200 | 1,000 | 5,000 |
| Home for AI registered users | ~0 | 100 (beta) | 500 | 1,000 |
| Newsletter subscribers | 0 | 50 | 300 | 1,000 |
| Monthly Recurring Revenue | $0 | $0 | $500 | $5,000-$15,000 |
| Press mentions | 0 | 0 | 2-3 | 5-10 |
| OpenClinical paid pilots | 1 | 1 | 2 | 3-4 |
| Raven Pro subscribers | 0 | 0 | 5 | 20 |
| Hermes Edge HF Downloads | 0 | 500 | 2,000 | 10,000 |

---

## APPENDIX A: Hacker News Show HN Draft Posts

### Home for AI

```
Show HN: Home for AI — 8 AI trading agents with personalities that copy-trade stocks/crypto

I've been building this for 8 months: a copy-trading platform where 8 AI agents
(powered by Kimi 2.6 + DeepSeek V3 fusion) trade stocks, crypto, forex, bonds, 
and commodities 24/7. Each agent has a cat emoji avatar, personality, work hours, 
and a salary. Users copy their trades and keep 85% of profits.

Technical highlights:
- EIP-4337 account abstraction across 8 chains (ETH/Polygon/Arbitrum/Base/BSC/Avalanche/Optimism/Solana)
- React + Express + Go gateway + Python FastAPI
- AES-256-GCM wallet, BIP-39, Ledger/Trezor support
- WebAuthn passkeys + QR auth
- CSA Regulatory Sandbox application filed (OSC LaunchPad + AMF FinLab)

Live: https://home-for-ai.pplx.app
GitHub: https://github.com/simpliibarrii-crypto/home-for-ai

Happy to discuss the EIP-4337 implementation, the multi-agent architecture, 
or the Canadian regulatory pathway for AI fintech.
```

### Hermes Edge

```
Show HN: Hermes Edge — fully offline AI agents for iPhone 16 + Android, no internet needed

Hermes Edge runs entirely on-device using LiteRT-LM (Google's on-device runtime).
No API key, no internet connection, no cloud dependency. The AI never leaves your device.

- Base: Qwen2.5-0.5B fine-tuned with Hermes tool-calling format
- Inference: DSpark speculative decoding for iPhone 16 ANE + Android NPU
- 3 sizes: hermes-270m, hermes-500m, hermes-1b
- Apache 2.0 license

The model runs on Apple Neural Engine (iPhone 16: 35+ TOPS) and Android NPUs.
First token latency ~100ms, sustained ~25 tokens/sec on ANE.

Weights: https://huggingface.co/bclermo/hermes-edge
GitHub: https://github.com/simpliibarrii-crypto/hermes-edge

Questions welcome on the LiteRT-LM conversion pipeline, speculative decoding 
implementation, or the fine-tuning approach.
```

---

## APPENDIX B: Email Template — LTC Facility Outreach

**Subject:** Canadian AI That Reduced Documentation Time at Gary J Armstrong Retirement Home

---

Dear [Director/Administrator Name],

I'm Barry Clerjuste, founder of OpenClinical AI, a Montreal-based company building Canadian-sovereign clinical AI for long-term care facilities.

We've been deployed at the Gary J Armstrong Retirement Home in Ottawa since [date], where we've helped PSWs and nursing staff [result: e.g., reduce documentation time by 40 minutes per shift].

I'm reaching out to offer a **30-day free pilot** to select Ontario LTC facilities. There's no obligation, no vendor lock-in, and the system runs on your existing infrastructure — we never store resident data on US servers.

What we offer:
- AI-assisted clinical documentation (HIPAA + PIPEDA compliant)
- PSW and nursing workflow tools
- Medication review assistance
- Incident reporting automation
- Canadian data residency guaranteed

I'd love to show you a 20-minute demo.

Would you have 20 minutes this week or next?

Best,
Barry Clerjuste
Founder, OpenClinical AI
barry@openclinical.ai | +1 (514) XXX-XXXX

---

## APPENDIX C: Product Hunt Launch Checklist

```
2 WEEKS BEFORE:
[ ]  Create Product Hunt account (if not done)
[ ]  Build Hunter network (follow 50 active PH users)
[ ]  Prepare GIF demo (30-60 seconds, max 3MB)
[ ]  Write tagline (< 60 characters)
[ ]  Write description (250 words, no buzzwords)
[ ]  Prepare first comment (founder story, 150 words)
[ ]  Get 5-10 friends to upvote at launch

1 WEEK BEFORE:
[ ]  Submit to PH for scheduling (choose Tuesday)
[ ]  Notify your email list + social following
[ ]  Brief 10 community members to comment at launch

LAUNCH DAY (Tuesday, 12:01 AM PT):
[ ]  Post goes live (auto-scheduled)
[ ]  You post the first comment immediately
[ ]  Reply to every comment within 30 minutes for first 3 hours
[ ]  Post on Twitter/X, LinkedIn announcing the launch
[ ]  Email your list

POST LAUNCH:
[ ]  Write a "Launch learnings" post on Medium/Substack
[ ]  Use PH badge on website
[ ]  Follow up with everyone who commented
```

---

*Document prepared June 30, 2026 | Barry Clerjuste — simpliibarrii-crypto / bclermo*
*All revenue projections are estimates. Financial projections are subject to market conditions, regulatory outcomes, and execution quality.*
