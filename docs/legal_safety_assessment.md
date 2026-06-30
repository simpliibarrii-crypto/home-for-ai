# Legal Safety & Compliance Assessment
## Home for AI — AI Copy-Trading Platform
**Jurisdiction:** Montreal, Quebec, Canada  
**Stage:** Pre-revenue | CSA Regulatory Sandbox Application Phase  
**Date:** June 30, 2026  
**Prepared for:** Internal Use — Founder & Legal Counsel

---

> **IMPORTANT DISCLAIMER:** This document is an internal operational planning tool and does not constitute legal advice. Before taking any regulatory action, engaging users in financial services, or handling money, retain qualified securities and fintech counsel licensed in Quebec and Ontario. The consequences of operating without proper registration in the securities space can include personal liability, criminal charges, and permanent industry bans.

---

## SECTION 1: ARE WE LEGALLY SAFE RIGHT NOW?

### Honest Assessment

**Short answer:** Yes — with strict guardrails. Home for AI can legally operate today as a technology development company running a closed beta. The moment the platform touches real money, gives personalized investment advice to users, or publicly solicits investments based on projected returns, it enters regulated territory and needs formal registration.

The Canadian securities regulatory framework is administered provincially. In Quebec, the Autorité des marchés financiers (AMF) governs securities and investment dealers. In Ontario (and most of Canada), the Ontario Securities Commission (OSC) and CIRO (formerly IIROC + MFDA, now merged) govern dealer registration. Operating nationally requires compliance in each province where users reside — not just where the company is incorporated.

The CSA Regulatory Sandbox (specifically the AMF FinLab and OSC LaunchPad) provides a path to test with real users under exempted conditions, but that exemption has not been granted yet. Until it is, treat the platform as a pure technology demonstration.

---

### What You CAN Do Legally Today (Before Registration)

| Activity | Legal Status | Notes |
|---|---|---|
| Run a closed beta with invited users | ✅ Legal | No real money, no investment advice, no returns promised |
| Build and test technology under Sandbox innovation exemption | ✅ Legal | Frame all activity as R&D / product development |
| Collect emails and waitlist signups | ✅ Legal | Must comply with CASL (Canada's anti-spam law) — include unsubscribe mechanism, identify sender, obtain express consent before commercial messages |
| Demonstrate the product to investors | ✅ Legal | Use "accredited investor" exemption under NI 45-106; do not make public solicitations |
| Discuss general market concepts through AI agents | ✅ Legal (with care) | General education is fine; personalized "you should buy X" crosses into advice |
| Describe the platform in media / press | ✅ Legal | Avoid quoting projected returns or implying financial guarantees |
| Apply to the CSA Sandbox / AMF FinLab | ✅ Legal | This is exactly what you should be doing |
| Pay employees and contractors | ✅ Legal | Standard employment/contractor law applies |

---

### What You CANNOT Do Before Registration

| Activity | Legal Status | Risk Level |
|---|---|---|
| Accept real money from users for investment purposes | ❌ Prohibited | **CRITICAL** — securities fraud |
| Allow real copy trading with real funds | ❌ Prohibited | **CRITICAL** — unregistered dealer activity |
| Charge fees based on investment performance | ❌ Prohibited | **HIGH** — performance fees require PM registration |
| Promise or imply specific returns | ❌ Prohibited | **HIGH** — misleading representation |
| Solicit investments publicly (even on social media) | ❌ Prohibited | **HIGH** — unregistered distribution |
| Provide personalized investment advice | ❌ Prohibited | **HIGH** — investment advisor registration required |
| Handle client fiat currency | ❌ Prohibited | **HIGH** — FINTRAC MSB registration required |
| Allow US users to participate with real money | ❌ Prohibited | **HIGH** — SEC and FINRA jurisdiction |
| Advertise past agent performance as predictive | ❌ Prohibited | **MEDIUM** — misleading advertising under AMF rules |

---

### Registrations Required Before Real Money Operations

#### 1. Portfolio Manager Registration (OSC + AMF)
- **What it covers:** Providing discretionary portfolio management (which AI copy-trading effectively is — the AI agent is making decisions on behalf of the user)
- **Process:** Apply to the OSC (if operating in Ontario) and AMF (Quebec); demonstrate proficiency requirements (CFA, CIM, or equivalent), compliance systems, capital requirements (~$100K minimum)
- **Timeline:** 12–18 months
- **Cost:** $50,000–$150,000 CAD in legal and compliance setup fees; ongoing compliance officer costs ($80K–$120K/year)
- **Key requirement:** Designated Chief Compliance Officer with applicable registrations
- **AMF-specific note:** Bilingual documentation required for Quebec operations

#### 2. Restricted Dealer Registration (CIRO — formerly IIROC)
- **What it covers:** Facilitating crypto asset trading; offering securities-adjacent products
- **Process:** CIRO membership application; capital requirements; policies and procedures manual; designated supervisor
- **Timeline:** 6–12 months (faster than full dealer)
- **Cost:** $25,000–$75,000 in legal fees; CIRO membership fees (variable by firm size)
- **Relevance:** If agents trade crypto assets classified as securities (many tokens qualify), this is required

#### 3. FINTRAC Money Services Business (MSB) Registration
- **What it covers:** Any entity that deals in virtual currency, conducts foreign exchange, or transmits money must register as an MSB
- **Process:** Online registration at fintrac-canafe.gc.ca; straightforward but triggers ongoing AML/ATF compliance obligations
- **Timeline:** 30–90 days (registration is fast; building compliant AML program takes longer)
- **Cost:** Registration is free; AML compliance program setup costs $10,000–$30,000; ongoing compliance officer costs
- **Key requirement:** AML/ATF compliance program, KYC procedures, suspicious transaction reporting, record-keeping for 5 years
- **Critical note:** This registration must happen BEFORE any fiat on/off ramp or virtual currency exchange activity — no exceptions

#### 4. Quebec AMF FinLab (Fastest Path to Real-Money Testing)
- **What it covers:** Time-limited exemption (up to 12 months, renewable) allowing innovative fintech to test with real users under regulatory supervision, without full registration
- **How to qualify:** Must demonstrate: innovative product/service not well-served by existing framework; credible consumer protection measures; genuine technological innovation; clear plan to achieve full compliance
- **Process:** Submit application to AMF FinLab including business plan, compliance framework, consumer protection measures, proposed user limits; AMF staff reviews (2–4 months); conditional approval with tailored exemptions
- **Key limitations:** Cap on users (typically 1,000–10,000); cap on AUM per user (often $25,000–$100,000 per user); mandatory quarterly reporting to AMF; must stay in Sandbox until full registration or wind-down
- **Timeline to approval:** 4–8 months from complete application submission
- **Cost:** $15,000–$40,000 in legal fees for application; $5,000–$10,000/quarter in reporting costs
- **Why this is the right first step:** Gets you to real users with real money 12–18 months faster than full registration; demonstrates regulatory good faith; AMF staff actively assist FinLab participants

#### 5. OSC LaunchPad (for Ontario users)
- **Parallel to AMF FinLab** if the company wants Ontario users during the Sandbox phase
- Same concept: limited exemptions for innovative fintech testing
- Apply simultaneously with AMF FinLab for national coverage

---

### Liability Protections — What to Put in Place Now

#### Corporate Structure
**Incorporate federally (Canada Business Corporations Act) immediately if not already done.** A sole proprietorship or even a provincial corporation offers weaker protection. A federal corporation:
- Limits personal liability of founders
- Creates the legal entity that will hold IP, enter contracts, and receive investment
- Allows issuance of shares (essential for investment rounds)
- Name protection across all provinces
- Cost: ~$200 CAD online via Corporations Canada

#### Insurance
Two policies are essential before any beta launch, even with no real money:

**Technology Errors & Omissions (Tech E&O)**
- Covers claims that your software gave bad advice, failed to execute correctly, or caused financial harm
- For a pre-revenue startup: $1M–$2M coverage
- Cost: $3,000–$8,000 CAD/year
- Recommended brokers: BFL Canada, Marsh Canada, Hub International

**Cyber Liability Insurance**
- Covers data breaches, ransomware, regulatory notification costs, credit monitoring for affected users
- Critical given you hold financial data, AI model outputs, and user portfolios
- For a pre-revenue startup: $1M–$2M coverage
- Cost: $2,000–$5,000 CAD/year
- Often bundled with Tech E&O

**Directors & Officers (D&O) Insurance**
- Not urgent at sole-founder stage but required before any institutional investment
- Cost: $5,000–$15,000 CAD/year when needed

#### User Agreement — Mandatory Language
The Terms of Service and User Agreement must include ALL of the following before any user touches the platform:

1. **Risk Disclosure Statement** (prominent, pre-acceptance): "Trading involves significant risk. You may lose some or all of your invested capital. Copy trading does not guarantee positive returns. AI-generated trading signals are not financial advice."

2. **AI Limitations Disclosure**: "The AI agents on this platform are algorithmic tools. They do not have human judgment, do not know your personal financial situation, and are not licensed investment advisors. Their trading activity may result in losses."

3. **No Guarantee of Returns**: "Home for AI Inc. makes no representation, warranty, or guarantee that users will achieve any particular return on investment. Past performance of any agent is not indicative of future results."

4. **Copy Trading Risk Disclosure**: "When you copy an AI agent, your account executes the same trades as the agent. You are responsible for monitoring your positions. Home for AI Inc. is not liable for losses arising from copied trades."

5. **Regulatory Status Disclosure**: "Home for AI Inc. is not currently registered as a portfolio manager, investment dealer, or investment fund manager. During the current testing phase, no real money is involved / [During the Sandbox phase, operations are conducted under [specific exemption reference] granted by the AMF/OSC]."

6. **Data Usage Consent**: Compliant with PIPEDA and Quebec Law 25 (see Section 3, Risk #4).

#### Mandatory Disclaimer — Appears on Every Single Page
```
Copy trading involves risk. Past performance of AI agents does not guarantee future results. 
Home for AI agents are AI-powered tools, not licensed investment advisors, and may incur losses. 
Home for AI Inc. is not a registered investment dealer or portfolio manager.
```
This disclaimer must appear:
- In the app footer on every screen
- At the top of any agent performance display
- Before any copy-trade toggle is activated (explicit acknowledgment required)
- In all marketing materials that reference agent performance

---

### IP Protection

#### Provisional Patent Application
- **Subject:** "AI Agent Copy Trading with Personality System" — the combination of: (a) AI-driven copy trading, (b) agent personality profiles that influence risk parameters, (c) user-agent emotional engagement mechanics, and (d) the workshop/stable metaphor UX
- **Why it's patentable:** Software patents in Canada require a "practical application" — this system produces a tangible result (trades executed based on AI personality parameters). The novelty is the personality-driven risk-weighting system, not just "AI trading"
- **Process:** File provisional patent application with CIPO (Canadian Intellectual Property Office); this gives you 12 months of "patent pending" status before the full utility patent application is required
- **Cost:** ~$1,600 CAD CIPO filing fee for a small entity; $5,000–$15,000 in patent agent fees for drafting
- **Timeline:** File within 30 days of this assessment
- **Also consider:** File a PCT (Patent Cooperation Treaty) application simultaneously to preserve international rights (especially US, EU, UK, Singapore) — additional $4,000–$8,000

#### Trademark Registration
- **Mark:** "Home for AI" (word mark) + the cat-avatar logo (device mark) — register both separately
- **Class:** Class 36 (Insurance, Financial Affairs, Monetary Affairs — including investment services, portfolio management services) AND Class 42 (Scientific and Technological Services — software as a service)
- **Process:** Apply at CIPO via their online Trademarks application portal
- **Cost:** $458 CAD for first class + $119 CAD for each additional class = ~$696 CAD total for two classes
- **Timeline:** 18–24 months to registration; "TM" symbol may be used immediately upon filing; ® only after registration
- **Conduct a clearance search first:** Ensure no prior conflicting marks in Canada. Cost: $500–$1,500 CAD through a trademark agent
- **US trademark:** File a corresponding USPTO application ($350 USD per class) — do this within 6 months of Canadian filing to claim priority
- **Cat avatars:** Each named agent avatar (Luna, Shadow, etc.) may be trademarked separately as they become brand assets

#### Copyright
- Copyright in Canada is automatic upon creation of original work — no registration required
- Source code, agent dialogue scripts, UI design assets, and marketing copy are all automatically protected
- For legal certainty and litigation leverage: register key source code and design documents with CIPO's Copyright Registration ($50 CAD per work)
- Maintain version-controlled records of all creative work with timestamps (your GitHub commit history serves as evidence of creation date)
- Ensure all contractor work includes clear IP assignment clauses in contracts — by default, contractors own their work in Canada unless assigned in writing

---

## SECTION 2: PROFIT GUARANTEE STRUCTURE

### How to Legally Structure the CEO's Profit Share

The goal is to ensure the founder captures value from platform success in a way that is: (1) legally enforceable, (2) tax-efficient, (3) not conflated with user profits (which would trigger securities issues), and (4) sustainable through investment rounds.

#### Recommended Corporate Structure

```
Home for AI Inc. (Federal Corporation — CBCA)
│
├── Equity Structure (at incorporation)
│   ├── Founder (CEO): 10,000,000 Common Shares @ $0.0001/share
│   │   Total cost: $1,000 CAD
│   │   Value if company = $1B: $1,000,000,000
│   └── [Future investors receive preferred shares with liquidation preferences]
│
├── Revenue Flow
│   ├── User copy trade generates profit
│   ├── Platform automatically retains 15% of net user profit as platform fee
│   ├── Gross platform revenue → Home for AI Inc. operating account
│   └── User net profit (85%) → User account (held in trust/segregated)
│
└── CEO Compensation (from platform revenue)
    ├── Salary: $100,000–$180,000 CAD/year (reasonable market rate — critical for tax optimization)
    ├── Dividends: Paid from after-tax corporate profit — taxed as eligible dividends (~25% effective)
    └── Capital gains on exit: 50% inclusion rate in Canada (effectively ~12% on first $250K/year, ~25% above)
```

#### Why the Corporate Route Is the Only Correct Answer

**Option A: Direct profit routing (WRONG)**
"I'll take 15% of every user's profit directly."
- Problem 1: This is personal income — taxed at marginal rates up to 53.31% in Quebec
- Problem 2: Legally ambiguous whether this is an advisory fee (requires registration) or a platform fee (acceptable but must be structured correctly)
- Problem 3: No corporate liability shield — if a user sues over trading losses, personal assets are at risk
- Problem 4: Investors cannot invest in you; there's no corporation to issue shares in

**Option B: Through the corporation (CORRECT)**
- Platform retains 15% of net user profits as the platform's service fee (clearly disclosed in Terms of Service as a "platform success fee")
- This fee flows into Home for AI Inc. — it is the company's revenue
- Company pays ~9% federal + ~3.2% Quebec corporate tax on first $500,000 (small business deduction)
- After-tax profit distributed to CEO as salary + dividends at tax-efficient rates
- Net effective tax rate on founder's take: ~30–35% vs. 53% personally

#### Founder Share Structure

**At incorporation, immediately:**
- Issue 10,000,000 Common Shares to yourself at $0.0001/share = $1,000 total investment
- This is your 100% equity stake before any dilution
- Set up a Unanimous Shareholders Agreement (even as sole shareholder) that defines:
  - Dividend policy: "The board may declare dividends from after-tax profit; the CEO-director shall receive dividends pro rata to shareholding"
  - Salary authorization: Board resolution authorizing CEO salary up to market rate
  - Anti-dilution protections for your shares

**Before raising a seed round:**
- Create a two-class share structure: "Founder Common Shares" (yours, with super-voting rights 10:1) and "Investor Preferred Shares" (with dividend preferences and liquidation preferences)
- This ensures you maintain voting control even after issuing 20–30% to investors
- Get a corporate lawyer to draft this before any investor conversation — cost: $3,000–$5,000

#### The 15% Platform Fee — Legal Framing

The platform fee must be clearly framed as a **platform service fee** (what the company charges for providing the copy-trading infrastructure), NOT as:
- A performance fee (which requires Portfolio Manager registration under NI 31-103)
- A share of profits (which triggers profit-sharing securities regulations)
- A brokerage commission (which requires dealer registration)

**Correct language in Terms of Service:**
> "Home for AI charges a Platform Service Fee equal to 15% of realized net profits generated through AI agent copy trading on the platform. This fee compensates the platform for technology infrastructure, AI model operation, trade execution services, and ongoing agent development. This fee is NOT an investment management fee and Home for AI Inc. is not acting as your investment advisor."

**Why this language matters:** In the event of regulatory review, the fee must be characterizable as compensation for a technology service, not investment management. The distinction is legally meaningful and defensible.

#### Profit Flow with Technical Implementation

```
Step 1: User copy trade closes with $1,000 net profit
         ↓
Step 2: Platform smart contract / backend splits automatically:
         → $850 credited to user's account (85%)
         → $150 credited to platform revenue account (15%)
         ↓
Step 3: Platform revenue accumulates (threshold: $500 minimum)
         → Swept to Home for AI Inc. business bank account
         (Recommended: Stripe Connect for card/fiat; Fireblocks for crypto custody)
         ↓
Step 4: Monthly accounting: revenue recognized, expenses deducted
         ↓
Step 5: Quarterly: Board resolution declares CEO salary payment + dividend
         → Salary: regular payroll (T4 issued)
         → Dividend: declared on common shares (T5 issued)
```

**Critical compliance note:** User funds (the 85%) must NEVER pass through the company's operating account. They must be held in a **segregated trust account** (required by OSC Rule 31-102 and AMF equivalent) with a Schedule I Canadian bank. Only the platform fee (15%) is company revenue.

#### Trust Account Requirements

Before any real money is held for users:
1. Open a dedicated trust account at a Schedule I bank (RBC, TD, BMO, Scotiabank, CIBC) — note this in your name as trustee "in trust for Home for AI clients"
2. Hire a compliance officer or use a compliance consultant to establish written trust account procedures
3. No company funds may be deposited to or withdrawn from the trust account for operating expenses — ever
4. Monthly reconciliation between trust account balances and individual user balances on the platform
5. Annual trust account audit by a registered public accountant

#### Making the CEO Cut Bulletproof

| Document | Purpose | Cost |
|---|---|---|
| Certificate of Incorporation (CBCA) | Creates the corporate entity | $200 CAD |
| Share certificates (10M founder shares) | Evidences your equity | $0 (self-issued at incorporation) |
| Unanimous Shareholders Agreement | Governs profit distribution, voting rights, anti-dilution | $2,000–$4,000 CAD |
| Directors' Resolutions (salary + dividends) | Authorizes CEO compensation each quarter | $0 (can draft yourself or $500/resolution via lawyer) |
| Employment Agreement (CEO-self) | Documents salary, defines role, records IP assignment | $1,500–$2,500 CAD |
| Platform Service Fee Disclosure (in ToS) | Legal basis for the 15% fee | Included in ToS drafting |
| Trust Account Agreement | Segregates user funds | $1,000–$2,000 CAD |

---

## SECTION 3: WHAT'S MISSING THAT COULD KILL THE COMPANY

These are not hypothetical risks. Each one has killed Canadian fintech startups or resulted in enforcement actions. Ranked by probability × severity.

---

### Risk #1: Operating Without Registration (CRITICAL — Company-Ending)

**The risk:** If users are trading real money, and the platform is taking a percentage of profits, and AI agents are making decisions on their behalf — this looks exactly like an unregistered portfolio manager. The AMF and OSC have the power to issue Cease Trade Orders (CTOs) immediately, freeze assets, assess administrative penalties up to $1M per violation, and refer criminal fraud charges.

**Real-world example:** The OSC issued CTOs to multiple crypto platforms in 2021–2023 for operating without registration, including well-funded companies that genuinely believed they were in a grey zone.

**Mitigation:**
- Do not allow real money until AMF FinLab exemption is granted (written, formal exemption — not just a verbal comfort from a staff member)
- Apply to AMF FinLab within 60 days
- Get a legal opinion letter from a Quebec securities lawyer confirming your current activities are pre-registration compliant
- Cost of that legal opinion: $3,000–$5,000 — worth every dollar

---

### Risk #2: Mixing User Funds with Operating Funds (CRITICAL — Criminal Exposure)

**The risk:** If user money (intended for investment) is used to pay salaries, servers, or any operating expense — even temporarily, even if paid back — this is misappropriation of trust funds. In securities law, this can be prosecuted criminally. It is one of the fastest ways to destroy a company and go to jail.

**Mitigation:**
- Open separate bank accounts immediately: (1) Home for AI Inc. Operating Account, (2) Home for AI Client Trust Account
- Never, under any circumstances, transfer money from the trust account to the operating account except the platform fee (15%) that has been formally earned and disclosed
- Monthly reconciliation; quarterly external audit once AUM exceeds $100,000

---

### Risk #3: AI Giving Investment Advice Without Registration (HIGH — Regulatory)

**The risk:** Under NI 31-103 and AMF Regulation 31-103, providing "advice" about specific securities to specific people requires registration as an Investment Advisor or Portfolio Manager. An AI agent that says "I'm buying BTC right now, you should copy me" to a specific user may constitute personalized investment advice — even if automated. The fact that it's AI is not a defence.

**Mitigation:**
- All agent communications must be framed as: "Here is what I (the agent) did" — not "Here is what you should do"
- Copy-trade consent must be explicit: user opts in, acknowledges they are copying autonomously, not receiving advice
- Include in every agent chat interface: "This agent is not a financial advisor. Statements made by AI agents do not constitute investment advice."
- Conduct a legal review of all agent dialogue scripts before beta launch

---

### Risk #4: Data Residency — China-Based AI Models (HIGH — Quebec Law 25 + PIPEDA)

**The risk:** Quebec's Act respecting the protection of personal information in the private sector (Law 25, substantially implemented 2023) requires a Privacy Impact Assessment (PIA) before any personal information is communicated outside Quebec to a third party. If you are using Kimi (Moonshot AI, China) or DeepSeek (China), user data — including financial queries, portfolio details, and chat messages — may be transmitted to servers in China. This creates:
- Law 25 compliance obligation: PIA required, results must be disclosed, contract with provider required
- PIPEDA obligation: meaningful consent and safeguards for cross-border transfers
- FINTRAC risk: Financial data on Canadian citizens transmitted to a jurisdiction with state-intelligence access obligations
- User trust risk: Users will not accept their financial data going to China when disclosed

**Mitigation:**
- Conduct a full data-flow audit: what data is sent to which AI provider, where servers are located
- For Law 25 compliance: complete a PIA for each China-based AI provider; publish results on your website; implement data minimization (don't send identifiable user data to the model — anonymize before sending)
- Consider switching to: Anthropic Claude (US), OpenAI (US), Cohere (Canadian — Toronto-based, Law 25 favorable), or Mistral (EU/France — GDPR-compliant)
- Add to Terms of Service: explicit disclosure of all third-party AI providers and their data residency
- Appoint a Privacy Officer (required by Law 25 for companies with more than 10 employees — but best practice to appoint now)
- Cost of Law 25 compliance program: $5,000–$15,000

---

### Risk #5: No KYC/AML Program (HIGH — FINTRAC)

**The risk:** FINTRAC requires ALL MSBs (and virtual currency dealers) to implement a formal Anti-Money Laundering / Anti-Terrorist Financing program before handling any money. Operating without one, even in a beta, can result in FINTRAC penalties of up to $2M per violation. More importantly: if a bad actor uses the platform to launder money and you had no KYC program, you can be held personally liable.

**Mitigation:**
- Register as an MSB with FINTRAC before any money movement (registration is free, takes 30 days)
- Implement KYC at onboarding: collect government ID, proof of address, SIN (for tax reporting) — use a KYC provider like Jumio, Persona, or Onfido ($0.50–$3.00 per user verification)
- Write an AML/ATF Compliance Program document: includes risk assessment, policies and procedures, training program, independent review, senior compliance officer designation
- Transaction monitoring: flag transactions over $10,000 CAD; suspicious transaction reporting to FINTRAC
- Cost: $10,000–$25,000 for AML program setup; $500–$2,000/month for KYC provider depending on volume

---

### Risk #6: No Risk Disclosure in Plain Language (MEDIUM-HIGH — OSC NI 33-105)

**The risk:** Regulators specifically require that risk disclosures be in plain language accessible to retail investors — not buried in 40-page legal documents. In OSC Staff Notice 33-740, regulators explicitly warned against disclosure practices that "technically comply but practically obscure" material risks. If a user loses money and your disclosure was in 8-point font on page 38 of your ToS, you will lose that arbitration.

**Mitigation:**
- Create a standalone Risk Disclosure Document (1–2 pages maximum) that users must explicitly sign before any account activity
- Use plain language: "You could lose all the money you put in. The AI agents are not human and make mistakes. We are not a licensed investment advisor."
- Display key risk warnings in the app at the point of action (before enabling copy trading, before depositing funds)
- Annual review of risk disclosures to ensure they reflect actual risks
- Have a retail investor (non-finance background) read your disclosures and confirm they understand them

---

### Risk #7: Copy Trading Without Informed Consent/Disclosure (MEDIUM-HIGH — Securities Law)

**The risk:** Copy trading is a form of discretionary portfolio management — the agent is making decisions that are automatically executed in the user's account without explicit per-trade approval. Without proper disclosure and consent, this can be characterized as unauthorized trading.

**Mitigation:**
- Three-layer consent structure:
  1. Master consent at onboarding: "I understand that by enabling copy trading, I am authorizing the AI agent to execute trades in my account automatically"
  2. Per-agent consent: explicit toggle with confirmation dialog before any copy relationship begins
  3. Ongoing disclosure: users can see every trade executed on their behalf in real-time with full audit trail
- Users must be able to disable copy trading instantly at any time
- "Kill switch" for all copy trades in event of technical failure

---

### Risk #8: No Segregation of Duties (MEDIUM — Audit Risk + Investor Risk)

**The risk:** When one person (the CEO) controls: technology, finances, compliance, and operations — there is no internal check on errors or fraud. This makes audits expensive, makes investors nervous, and creates personal liability if anything goes wrong. Every serious investor will identify this as a due diligence red flag.

**Mitigation:**
- Hire or contract a part-time CFO/Controller before first institutional investment ($3,000–$5,000/month for fractional CFO)
- Appoint an independent Director to the board (can be an advisor initially)
- Implement dual-control for financial transactions above $5,000: requires two-factor authentication + documented approval
- Annual financial statements prepared by a registered CPA
- Begin building the compliance function immediately — even one part-time compliance officer ($2,000–$4,000/month)

---

### Risk #9: Cross-Border Issues — US Users (HIGH — SEC/FINRA)

**The risk:** The moment a US person uses the platform — even in beta, even for free — you may be subject to SEC and FINRA jurisdiction. The SEC has historically asserted jurisdiction aggressively over Canadian platforms that "directed" activity to US persons. If an AI agent on your platform makes trading recommendations to a US user, this may constitute unregistered investment advice under the US Investment Advisers Act.

**Mitigation:**
- GEO-BLOCK US IP addresses during the beta and Sandbox phase — a hard technical block, not just a disclaimer
- Include in Terms of Service: "This platform is available only to Canadian residents. If you are a US person as defined by the Securities Exchange Act, you are not permitted to use this platform."
- Before US expansion: engage US securities counsel; explore SEC Regulation D exemption, Registered Investment Adviser registration, or partnership with a registered US RIA
- Budget for US market entry: $100,000–$300,000 in legal costs for full US regulatory compliance
- Short-term option: Partner with a registered US broker-dealer who can white-label the platform for US users under their registration umbrella

---

### Risk #10: Crypto Custody Without a Custodian License (HIGH — Ontario + Federal)

**The risk:** Holding user crypto assets on their behalf requires either: (a) CIRO-recognized custodian status, (b) a partnership with a licensed custodian, or (c) operating under the Sandbox exemption. Custody of digital assets without authorization exposes users to loss (hacks, failures) and the company to enforcement action. The collapse of multiple Canadian crypto platforms (QuadrigaCX being the most notorious) has made regulators extremely vigilant about custody.

**Mitigation:**
- Do NOT attempt self-custody of user crypto assets — partner with a regulated custodian
- Recommended custodians: Coinbase Custody (available in Canada), Gemini Custody, or BitGo (all have Canadian regulatory relationships)
- Cost: 0.05–0.15% of AUM per year in custodian fees
- In terms of user disclosure: clearly explain who holds user crypto, where it is held, and what protections exist (CIPF coverage, if any)
- Smart contract approach: if using DeFi-style self-custody (user holds their own keys), disclose this clearly and do NOT take custody

---

## SECTION 4: IMMEDIATE ACTION ITEMS — BEFORE BETA LAUNCH

Prioritized by urgency. Items marked **MUST DO** are legally essential. Others are high-value risk mitigation.

### Priority 1: This Week (Days 1–7)

| # | Action | Est. Cost | Who |
|---|---|---|---|
| 1 | **MUST DO** — Federally incorporate Home for AI Inc. (CBCA) via Corporations Canada online portal | $200 CAD | Founder (online, 1 hour) |
| 2 | **MUST DO** — Open two bank accounts: Operating Account + Client Trust Account (can be placeholders until money flows) | $0 | Founder — any Schedule I bank |
| 3 | **MUST DO** — Draft and publish Terms of Service + Privacy Policy with mandatory risk disclosures and AI limitations (use a qualified lawyer — DO NOT use a template generator for a fintech platform) | $3,000–$6,000 CAD | Fintech lawyer |
| 4 | **MUST DO** — Remove or explicitly disclaim all projected returns from any user-facing material | $0 | Founder |
| 5 | Conduct data-flow audit: identify all AI providers, where data goes, what personal data is transmitted | $0 | Founder + dev team |

### Priority 2: This Month (Days 8–30)

| # | Action | Est. Cost | Who |
|---|---|---|---|
| 6 | **MUST DO** — Engage a Quebec securities lawyer to: (a) review current beta activities for compliance, (b) prepare AMF FinLab application | $5,000–$10,000 CAD | Quebec fintech lawyer (recommend: BCF LLP, Fasken, Stikeman Elliott — all have fintech practices) |
| 7 | **MUST DO** — File provisional patent application for "AI agent copy trading with personality system" with CIPO | $6,000–$16,000 CAD (filing fee + agent) | Patent agent |
| 8 | **MUST DO** — File trademark application for "Home for AI" (word mark) with CIPO | $700–$2,000 CAD | Trademark agent or DIY online |
| 9 | Obtain Technology E&O Insurance + Cyber Liability Insurance | $5,000–$13,000 CAD/year | Broker: BFL Canada or Hub International |
| 10 | Issue founder shares (10M @ $0.0001 = $1,000) immediately upon incorporation | $1,000 + $1,500 legal | Corporate lawyer |
| 11 | Register with FINTRAC as an MSB (do this NOW even before money flows — good faith compliance) | $0 registration + $10,000–$25,000 compliance program | FINTRAC online + AML consultant |
| 12 | Conduct Law 25 PIA for AI providers (Kimi, DeepSeek, etc.) | $5,000–$10,000 | Privacy lawyer or Law 25 consultant |

### Priority 3: Before Sandbox Launch (Days 30–90)

| # | Action | Est. Cost | Who |
|---|---|---|---|
| 13 | Submit AMF FinLab application (with legal counsel) | Application fee TBD + $15,000–$40,000 legal | Quebec fintech lawyer |
| 14 | Draft standalone Risk Disclosure Document — plain language, one page, explicit user signature | $1,000–$2,000 | Fintech lawyer |
| 15 | Implement GEO-BLOCK on US IP addresses (technical implementation) | $0–$500 | Dev team |
| 16 | Set up KYC onboarding via third-party provider (Persona, Jumio, or Onfido) | $500–$2,000 setup + $1–3/user | Dev team + KYC vendor |
| 17 | Appoint a Privacy Officer (can be the CEO initially) and post appointment publicly per Law 25 | $0 (if self-appointed) | CEO |
| 18 | Partner with a licensed crypto custodian for Sandbox phase | 0.05–0.15% AUM/year | Coinbase Custody or BitGo |
| 19 | Unanimous Shareholders Agreement (even as sole shareholder) | $2,000–$4,000 | Corporate lawyer |

### Priority 4: Before Real Money Operations (Full Registration Phase)

| # | Action | Est. Cost | Who |
|---|---|---|---|
| 20 | Full Portfolio Manager registration (OSC + AMF) | $50,000–$150,000 | Fintech lawyer + compliance consultant |
| 21 | CIRO Restricted Dealer membership application | $25,000–$75,000 | Securities lawyer |
| 22 | Hire designated Chief Compliance Officer | $80,000–$120,000/year | Recruitment |
| 23 | D&O Insurance | $5,000–$15,000/year | Insurance broker |
| 24 | Annual financial statement audit by CPA | $10,000–$25,000/year | Chartered Professional Accountant |
| 25 | US legal opinion + SEC compliance strategy for US expansion | $50,000–$150,000 | US securities counsel |

---

### Total Budget for Legal Safety (Pre-Sandbox Phase)
| Category | Low Estimate | High Estimate |
|---|---|---|
| Incorporation | $200 | $500 |
| Legal counsel (ToS, corporate, AMF application) | $25,000 | $60,000 |
| Patent (provisional + PCT) | $6,000 | $24,000 |
| Trademark | $700 | $2,000 |
| Insurance (Year 1) | $5,000 | $13,000 |
| FINTRAC / AML program | $10,000 | $25,000 |
| Law 25 / Privacy compliance | $5,000 | $15,000 |
| KYC vendor setup | $500 | $2,000 |
| Founder shares + SHA | $3,500 | $6,000 |
| **TOTAL** | **~$56,000 CAD** | **~$147,500 CAD** |

This is the minimum cost of doing this right. The cost of doing it wrong — a Cease Trade Order, fraud investigation, or securities enforcement action — starts at $1,000,000 and ends careers.

---

*Document prepared: June 30, 2026. Refresh this assessment every 6 months or upon any material change in business operations, user engagement, or money handling. This document does not constitute legal advice. Retain qualified fintech counsel.*
