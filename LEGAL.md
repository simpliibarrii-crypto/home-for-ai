# HOME FOR AI — CANADIAN LEGAL COMPLIANCE DOCUMENT

**Platform:** Home for AI — AI-Powered Autonomous Trading Platform
**Operator Jurisdiction:** Province of Quebec (Montreal), Canada
**Document Date:** June 29, 2026
**Document Version:** 1.0 (Draft)

---

> **⚠️ MANDATORY DISCLAIMER — READ BEFORE RELYING ON THIS DOCUMENT**
>
> This document was drafted with AI assistance and **does not constitute legal advice**. It is provided for informational and planning purposes only. **Review by a licensed Canadian securities lawyer** — particularly one specializing in securities law, fintech regulation, and Quebec financial services law — **is required before launch** of the Home for AI platform or any solicitation of users. Nothing in this document creates a lawyer-client relationship, and the operator assumes all legal risk from any reliance on this document without independent legal counsel.

---

## TABLE OF CONTENTS

1. [Executive Summary](#1-executive-summary)
2. [Canadian Regulatory Requirements](#2-canadian-regulatory-requirements)
3. [Terms of Service](#3-terms-of-service)
4. [Risk Disclosure Statement](#4-risk-disclosure-statement)
5. [Privacy Policy](#5-privacy-policy)
6. [Operator Fee Disclosure](#6-operator-fee-disclosure)
7. [Pre-Launch Legal Checklist](#7-pre-launch-legal-checklist)

---

# 1. EXECUTIVE SUMMARY

## What Is Home for AI?

Home for AI is an AI-powered autonomous trading platform operated by an individual based in Montreal, Quebec, Canada. The platform deploys AI agents — each with a unique identity, powered by a fusion of Kimi 2.6 and DeepSeek V3 large language models — that trade across global markets including equities (stocks), cryptocurrency, foreign exchange (forex), bonds, and commodities on a 24/7 basis. Users may interact with agents via chat and voice interfaces.

The platform offers a **copy trading** feature: registered users can link their brokerage accounts to mirror the trades executed by an AI agent. The platform operator receives a percentage of net profits generated through copy trading.

## Legal Status at a Glance

**Under current Canadian law, as described above, the Home for AI platform as conceived engages in multiple categories of activity that require registration with provincial securities regulators and, in Quebec, the Autorité des marchés financiers (AMF) before operations may lawfully commence.**

The platform as described is not currently able to operate legally in Canada without first obtaining the required registrations and compliance infrastructure. This is not a minor procedural matter — operating without registration constitutes a serious violation of Canadian provincial securities legislation and may attract significant civil and criminal penalties, including fines, disgorgement of profits, and cease-and-desist orders.

## Recommended Legal Pathway

The operator should, **before launch**, take the following steps (detailed in Section 7):

1. **Retain a licensed Canadian securities lawyer** specializing in fintech and securities regulation. Lawyers at firms such as Osler, Stikeman Elliott, Torys, or Blakes have the relevant expertise.
2. **Apply for registration** with the AMF (Quebec) and, if operating across Canada, under the CSA passport system. The most likely required categories are: **Restricted Dealer** (initial registration for crypto), **Portfolio Manager** (for AI-driven discretionary trading advice), and potentially **Investment Dealer** (full registration with CIRO membership).
3. **Register with FINTRAC** as a Money Services Business (MSB) if handling crypto transactions or foreign exchange.
4. **Implement KYC/AML** procedures, a Chief Compliance Officer, a cybersecurity policy, and a suitability assessment framework.
5. **Consider the CSA Regulatory Sandbox** (Innovation Office) as a pathway to launch with limited exemptive relief while full registration is pursued.

## Key Risks

| Risk | Severity | Mitigant |
|---|---|---|
| Operating without registration | **Critical** | Do not launch until registered |
| AI agent deemed to constitute "advising" or "trading" in securities | **Critical** | Registration as Portfolio Manager |
| Copy trading with profit-sharing = regulated dealer activity | **Critical** | Dealer registration + disclosure |
| Crypto trading without Restricted Dealer registration | **Critical** | Apply for Restricted Dealer status |
| Forex/derivatives without AMF/QDA registration | **High** | Separate derivatives registration |
| FINTRAC non-compliance (crypto/forex = MSB) | **High** | FINTRAC MSB registration |
| Quebec Law 25 / PIPEDA violations (AI data, voice logs) | **High** | Privacy policy + DPO designation |
| AI liability (CSA/CIRO Notice 2024–2025) | **High** | Operator bears personal liability |
| Cross-border AI data transfers (Kimi/DeepSeek hosted outside Canada) | **Medium** | Disclosure + consent |

---

# 2. CANADIAN REGULATORY REQUIREMENTS

> **⚠️ This section requires review and verification by a licensed Canadian securities lawyer. Regulatory requirements change frequently. All information should be confirmed against current CSA, CIRO, and AMF guidance before reliance.**

## 2.1 Jurisdictional Framework

### Federal vs. Provincial Jurisdiction

Canadian securities regulation is **primarily provincial** in nature. There is no single federal securities regulator in Canada. Instead, each province and territory has its own securities regulator and legislation. The **Canadian Securities Administrators (CSA)** is an umbrella organization that coordinates policy across provincial regulators. Key regulatory bodies relevant to this platform are:

| Regulator | Jurisdiction | Relevance to Home for AI |
|---|---|---|
| **AMF** — Autorité des marchés financiers | Quebec (provincial) | Primary regulator; operator is located in Quebec |
| **OSC** — Ontario Securities Commission | Ontario (provincial) | Relevant if platform serves Ontario users |
| **CIRO** — Canadian Investment Regulatory Organization | National (self-regulatory) | Membership required if operating as an Investment Dealer or Mutual Fund Dealer |
| **FINTRAC** — Financial Transactions and Reports Analysis Centre of Canada | Federal | Required for MSB registration (crypto/forex) |
| **Bank of Canada** | Federal | RPAA registration if handling retail payments |
| **CSA** — Canadian Securities Administrators | National coordination | Issues national instruments (NI 31-103, etc.) and staff notices |

Because the operator is based in **Montreal, Quebec**, the AMF is the **principal regulator**. Under the CSA's **passport system** (Multilateral Instrument 11-102), registration in Quebec with the AMF generally allows the operator to conduct the same activities in other participating provinces without a separate application to each provincial regulator (though there are exceptions and additional conditions for Ontario). However, Ontario users trigger OSC jurisdiction, and given that Home for AI targets all Canadian retail investors, multi-jurisdictional registration will be necessary.

### No Federal Securities Regulator Exemption

There is no federal exemption permitting AI agents to engage in securities trading or advice without registration. CSA Staff Notice 11-348 (December 2024) confirms that **the use of AI systems does not alter or eliminate the obligation to comply with applicable securities law**, including registration requirements.

## 2.2 The Business Trigger for Registration

Under **National Instrument 31-103 — Registration Requirements, Exemptions and Ongoing Registrant Obligations (NI 31-103)**, a person or company must register as a dealer or adviser if they are **in the business** of:

- **Trading** in securities (buying, selling, or acting as an agent in trades); or
- **Advising** on securities (providing investment advice or managing discretionary portfolios).

The "business trigger" is met when activities are conducted for compensation, with repetition, or for a business purpose — all of which clearly apply to Home for AI, which:

- Executes trades autonomously in securities and crypto on behalf of users;
- Provides investment recommendations or executes discretionary trades (AI agent as portfolio manager);
- Facilitates copy trading for a profit-sharing fee; and
- Intends to operate continuously (24/7), commercially, and at scale.

**Conclusion: Registration is mandatory under NI 31-103.** The operator cannot rely on any personal trading exemption because the platform is designed to serve third-party users for compensation.

## 2.3 Required Registration Categories

Given the business model — AI agents autonomously trading stocks, crypto, forex, bonds, and commodities across global markets, with copy trading and profit-sharing — **multiple registration categories are required simultaneously.** The operator should consult a securities lawyer to determine the precise categories applicable at the time of registration, as the regulatory landscape is evolving rapidly.

### Category 1: Portfolio Manager (PM)

**Most Applicable for:** AI-driven discretionary investment advice and autonomous trading across all asset classes (stocks, bonds, commodities, forex).

A **Portfolio Manager** registration permits a firm to provide investment advice and manage client portfolios on a discretionary basis. Given that the AI agents independently select and execute trades across users' mirrored accounts, this is the most analogous category. A PM:

- May advise on any securities;
- Must apply a **best interest standard** (suitability obligation);
- Must conduct KYC assessments; and
- Requires individual registrants (Advising Representatives) to hold the **CFA Charter** plus 12 months of relevant investment management experience, or a **Canadian Investment Manager (CIM) designation** plus 48 months of experience.

**Challenge:** The individual proficiency requirements for PM registration are demanding. The operator, as an individual, must either personally meet these requirements or engage a registered individual to serve as Advising Representative.

### Category 2: Restricted Dealer (Interim — for Crypto)

**Most Applicable for:** Crypto asset trading.

Per **CSA/IIROC Notice 21-329** and **OSC Staff Notice 33-757**, crypto asset trading platforms must register. The **Restricted Dealer** category is the **interim registration pathway** specifically designed for crypto platforms that do not yet meet the full requirements for Investment Dealer registration. Restricted Dealer registration:

- Is issued with specific terms and conditions limiting the registrant's activities;
- Is the **minimum required** for a platform dealing in crypto contracts with Canadian users;
- Does not automatically permit all securities activity — the PM or ID registration is still required for non-crypto securities.

As of **July 1, 2025**, the AMF has delegated expanded registration functions (including for investment dealers and derivatives dealers) to CIRO, which now handles initial registration processing in Quebec for those categories.

### Category 3: Investment Dealer (ID) — Full Registration

**Applicable for:** Broader securities trading (stocks, bonds, ETFs); required if the platform directly executes trades in exchange-listed securities on behalf of clients.

An **Investment Dealer** must be a **CIRO member** and is subject to CIRO Rules, which supplement NI 31-103 requirements. Investment Dealer registration permits dealing in any security. This is the highest and most demanding category, requiring significant capital, compliance infrastructure, and personnel proficiency. As a startup, the operator may pursue Restricted Dealer status first and transition to full Investment Dealer status over time.

### Category 4: Derivatives Dealer / Adviser (Quebec — Forex and Derivatives)

**Most Applicable for:** Forex trading and any leveraged or derivative products.

In Quebec, the trading of **derivatives** (including forex contracts, options, and futures) is governed by the **Quebec Derivatives Act (QDA)**, not the Securities Act alone. Entities that advise on or trade in derivatives in Quebec must register with the AMF as:

- A **derivatives dealer**; or
- A **derivatives portfolio manager** (for discretionary derivatives trading on behalf of clients).

The AMF requires separate qualification for derivatives activity. This is in addition to — not a substitute for — securities registration. As amended in 2025 (Osler, July 2025), Quebec's Securities Act now incorporates a "trading platform" concept specifically addressing crypto and fintech platforms offering trading services.

### Category 5: Investment Fund Manager (IFM) — Potentially Applicable

If the AI agents trade a pooled structure (i.e., users' funds are pooled into a collective investment vehicle), Investment Fund Manager registration would be required. However, if each user's account is managed separately (one-to-one mirroring of AI trades), this category may not apply. **Clarification by a securities lawyer is required.**

## 2.4 Quebec AMF-Specific Requirements

Operating from Montreal, Quebec, the operator is subject to the AMF as the principal regulator. AMF-specific requirements include:

- **Registration in AMF's Register:** All registrants must appear in the AMF's *Registre des entreprises et individus autorisés à exercer*. Users can verify registration at [lautorite.qc.ca](https://www.lautorite.qc.ca).
- **AMF Qualification Examinations:** Quebec may require specific French-language proficiency or completion of AMF-approved qualification programs.
- **Quebec Derivatives Act (QDA):** Forex and derivatives activity requires AMF registration as a derivatives dealer or portfolio manager under the QDA (separate from NI 31-103).
- **Virtual Currency Licensing (Loi sur les activités d'entreprises de services monétaires):** Quebec was the first Canadian province to regulate virtual currency ATMs and trading platforms. Platforms handling crypto in Quebec must obtain an **AMF licence under the Act Respecting Money-Services Businesses (MSBQ)** in addition to any securities registration.
- **Quebec Law 25 (Act respecting the protection of personal information in the private sector, as amended by Bill 64):** Applies to all data processing in Quebec. See Section 5 (Privacy Policy).
- **French Language:** The *Charte de la langue française* (Charter of the French Language) may require that the platform interface, contracts, and disclosures be available in French for Quebec users.

## 2.5 Crypto-Specific Registration Requirements

Crypto asset trading platforms (CTPs) operating in Canada must comply with CSA guidance, including the requirements set out in:

- **CSA/IIROC Notice 21-329** (Joint CSA and IIROC Notice on Crypto Asset Trading Platforms)
- **OSC Staff Notice 33-757** (Crypto Asset Trading Platforms)
- **CIRO Rules** applicable to crypto dealing

Key requirements:

- **Registration as Restricted Dealer or Investment Dealer** with CIRO;
- **Custody obligations:** Client crypto assets must be held with qualified custodians; substantial portions must be in "cold storage";
- **Segregation of assets:** Client assets must be segregated from platform assets;
- **Listing standards:** Platforms must apply standards to crypto assets listed on the platform;
- **No stablecoins or margin trading** without specific additional registration or exemptive relief;
- **Investor protection fund:** Investment Dealers must be members of the Canadian Investor Protection Fund (CIPF).

## 2.6 Forex and Commodity Futures Registration

Forex trading involving **over-the-counter (OTC) forex contracts** may be regulated as:

- **Derivatives** under provincial securities legislation (in Quebec, under the QDA); or
- **Commodity futures contracts** under provincial commodity futures legislation (Ontario Commodity Futures Act, etc.).

In Quebec, the AMF regulates both. Separately, the **CIRO** (formerly IIROC) governs the conduct of forex dealers who are Investment Dealers.

The operator should obtain a separate legal opinion on whether the AI agents' forex trading activity constitutes derivatives dealing under the QDA and/or commodity futures dealing under other applicable provincial legislation.

## 2.7 FINTRAC Registration as a Money Services Business (MSB)

Under the **Proceeds of Crime (Money Laundering) and Terrorist Financing Act (PCMLTFA)**, businesses dealing in **virtual currency (crypto)** or **foreign exchange** must register with **FINTRAC** as a Money Services Business (MSB) before commencing operations.

An MSB must:

- Register at [fintrac-canafe.gc.ca](https://www.fintrac-canafe.gc.ca);
- Implement an **AML/ATF compliance program** with a compliance officer, written policies, risk assessment, and employee training;
- Report large cash transactions (over CAD $10,000), suspicious transactions, and large virtual currency transfers;
- Conduct client **identity verification** (KYC) for transactions above threshold amounts;
- Maintain records for at least five years.

As of 2024, **Foreign MSB (FMSB)** registration is also required for any non-Canadian entity directing virtual currency services at Canadian persons, even without a Canadian office.

## 2.8 CSA/CIRO AI Responsibility Framework

**CSA Staff Notice 11-348** (December 5, 2024) and **CSA/CIRO Notice 31-369** (2025) establish the regulatory treatment of AI agents in Canadian capital markets:

- **Existing obligations apply to AI-assisted activities.** The use of AI does not create new obligations, but it does not reduce or eliminate existing ones.
- **Operator responsibility:** If a person (the operator) creates an AI agent that provides investment advice or executes trades subject to securities law, **that person is held responsible** as if they personally provided the advice or executed the trades. This applies whether the AI is described as "autonomous" or not.
- **Misleading AI personas:** The use of cat emoji avatars and anthropomorphized AI agent identities may be scrutinized under rules prohibiting misleading representations about the nature of advice being provided (i.e., users must not be misled into thinking they are dealing with human advisers).
- **Audit and record-keeping:** Registrants using AI must be able to audit AI decisions, maintain records, and explain AI-driven recommendations to clients and regulators.

## 2.9 Copy Trading and Finfluencer Notice

**CSA/CIRO Staff Notice on Finfluencers and Copy Trading (2025)** confirms:

- Facilitating copy trading **for compensation** constitutes "acts in furtherance of a trade" under securities law and requires **dealer registration**.
- Linking followers who pay (directly or through profit-sharing) to automatically replicate an advisor's or AI's trades is a **regulated activity**.
- Receiving a percentage of profits from copy trading may constitute a **"referral arrangement"** under NI 31-103, subject to registration and disclosure requirements.
- All financial interests in the copy trading relationship must be disclosed **clearly and conspicuously** — see Section 6 (Operator Fee Disclosure).

## 2.10 Registration Timeline and Cost Estimates

> **Note:** These are rough estimates only. Actual timelines and costs vary significantly based on complexity, regulatory backlog, and the operator's individual circumstances. Independent legal advice is required for accurate planning.

| Step | Estimated Timeline | Estimated Cost (CAD) |
|---|---|---|
| Retain securities lawyer (initial consultation and registration strategy) | Weeks 1–2 | $5,000–$20,000+ |
| Corporate structure setup (corporation recommended over sole proprietor) | Weeks 1–4 | $2,000–$5,000 |
| Prepare registration application (CIRO/AMF forms, business plan, compliance manual) | Months 1–4 | $30,000–$80,000+ (legal fees) |
| FINTRAC MSB registration | Months 1–2 | Minimal direct cost; compliance program setup $10,000–$30,000 |
| Chief Compliance Officer (CCO) hire or appointment | Months 1–3 | $80,000–$150,000/year (salary) |
| KYC/AML platform implementation | Months 2–6 | $10,000–$50,000 |
| Capital requirements (varies by registration category) | Ongoing | $25,000–$250,000+ (minimum capital) |
| E&O / professional liability insurance | Months 3–6 | $5,000–$30,000/year |
| CSA Regulatory Sandbox application (if pursuing sandbox route) | Months 1–3 | Minimal direct cost |
| **Total estimated pre-launch legal/compliance spend** | **6–18 months** | **$150,000–$500,000+** |

> **CSA Regulatory Sandbox:** The CSA Innovation Office and AMF's Launchpad program offer fintech startups the ability to obtain **limited exemptive relief** from certain registration requirements on a time-limited basis (typically 2–3 years) while testing their platform with a restricted user base. This may be the most viable pathway for an early-stage operator. The operator should apply early, as review timelines can be significant.

---

# 3. TERMS OF SERVICE

> **⚠️ IMPORTANT LEGAL NOTICE:** This Terms of Service document is a draft template and requires review and revision by a licensed Canadian securities lawyer and a Quebec-licensed legal professional before use. This draft does not constitute legal advice and cannot be used as-is for a live platform.

---

**HOME FOR AI — TERMS OF SERVICE**

**Last Updated:** [DATE]
**Effective Date:** [DATE]

---

## 3.1 Acceptance of Terms

These Terms of Service ("Terms") constitute a legally binding agreement between you ("User," "you," or "your") and the operator of the Home for AI platform ("Operator," "we," "us," or "our"), an individual based in Montreal, Quebec, Canada.

**BY ACCESSING OR USING THE HOME FOR AI PLATFORM, YOU CONFIRM THAT YOU HAVE READ, UNDERSTOOD, AND AGREE TO BE BOUND BY THESE TERMS IN THEIR ENTIRETY.** If you do not agree to these Terms, you must not access or use the platform.

These Terms should be read together with our **Risk Disclosure Statement**, **Privacy Policy**, and **Operator Fee Disclosure**, all of which are incorporated herein by reference and form part of this agreement.

## 3.2 Platform Description and Scope

Home for AI is an online platform that:

(a) Deploys AI agents, each with a unique identity, that execute trades in financial instruments including equities, cryptocurrency, foreign exchange, bonds, and commodities on global markets, operating 24 hours a day, 7 days a week;

(b) Offers a **copy trading feature** through which Users may elect to have their linked brokerage accounts automatically mirror the trading activity of one or more AI agents;

(c) Provides a chat and voice interface enabling Users to interact with AI agents;

(d) Processes market sentiment data from news and other sources to inform AI agent trading decisions; and

(e) Is powered by AI models including Kimi 2.6 and DeepSeek V3, which are operated by third-party providers and may be hosted outside Canada.

**The AI agents are software systems, not human financial advisers.** All investment decisions made by the AI agents are made algorithmically and autonomously. The AI agents do not provide personalized financial advice tailored to your individual circumstances.

## 3.3 User Eligibility

To access and use the platform, you must:

(a) Be **at least 18 years of age** at the time of registration;

(b) Be a **resident of Canada**;

(c) Be either an **accredited investor** as defined under National Instrument 45-106 — *Prospectus Exemptions*, or have completed our self-certification process acknowledging your understanding of the risks of investing;

(d) Have the legal capacity to enter into contracts under the laws of your province or territory of residence;

(e) Not be prohibited by any applicable law, regulatory order, or sanction from accessing financial services or investing in securities; and

(f) Not be acting on behalf of a U.S. person, as defined under U.S. securities law, or any person subject to sanctions by OFAC, the United Nations Security Council, or any applicable Canadian sanctions authority.

By registering for an account, you represent and warrant that you meet all of the above eligibility requirements. If you do not meet these requirements, you must not register for or use the platform. We reserve the right to terminate your account if we determine that you do not meet or no longer meet these eligibility requirements.

## 3.4 Account Registration and Security

(a) **Account Creation:** You must create an account by providing accurate, complete, and current information as requested during registration, including for the purposes of Know Your Client (KYC) verification.

(b) **KYC/AML Verification:** As required by applicable Canadian securities and anti-money laundering law, you must complete identity verification before accessing certain features of the platform, including the copy trading feature. We may require government-issued photo identification and other documentation.

(c) **Account Security:** You are responsible for maintaining the confidentiality of your account credentials. You must notify us immediately of any unauthorized access to or use of your account.

(d) **Accurate Information:** You agree to promptly update your account information to keep it accurate and current. We may suspend or terminate your account if we have reason to believe that information you have provided is inaccurate or misleading.

## 3.5 Copy Trading Feature

> **⚠️ PROMINENT DISCLOSURE — READ CAREFULLY BEFORE ENABLING COPY TRADING**

**(a) Nature of Copy Trading:** The copy trading feature automatically replicates trades executed by AI agents in your linked brokerage account. By enabling copy trading, you authorize the platform to submit trade orders on your behalf.

**(b) Operator Fee — MANDATORY DISCLOSURE:**

> **THE PLATFORM OPERATOR RECEIVES A PERCENTAGE OF NET PROFITS GENERATED IN YOUR ACCOUNT THROUGH COPY TRADING. THIS IS A DIRECT FINANCIAL INTEREST IN YOUR TRADING ACTIVITY. DETAILS OF THE CURRENT FEE STRUCTURE ARE SET OUT IN THE OPERATOR FEE DISCLOSURE DOCUMENT, WHICH YOU MUST REVIEW AND ACKNOWLEDGE BEFORE ACTIVATING COPY TRADING. SEE SECTION 6 OF THIS DOCUMENT.**

**(c) No Guarantee of Performance:** Past performance of AI agents is not indicative of future results. The copy trading feature does not guarantee profits and may result in substantial losses, including the loss of your entire investment.

**(d) Your Responsibility:** You retain ultimate responsibility for trading activity in your linked brokerage account. You should regularly review your account and the AI agents you follow. You may disable copy trading at any time.

**(e) Suitability:** You acknowledge that you have independently assessed whether copy trading is suitable for your financial situation, investment objectives, and risk tolerance. The platform [at the time of writing, pending registration] does not provide individualized suitability assessments. **This will change upon registration as a Portfolio Manager, at which time suitability obligations will apply.**

**(f) Third-Party Brokerage:** Copy trading is executed through your account held at a separate, third-party brokerage. The platform is not responsible for the acts or omissions of your brokerage, including any delays in executing orders or any fees charged by your brokerage.

## 3.6 AI Agent Disclaimer

**(a) Autonomous Decision-Making:** AI agents on the platform operate autonomously using machine learning algorithms and AI models (currently including Kimi 2.6 and DeepSeek V3). Trading decisions are made by these AI systems, not by human portfolio managers or financial advisers.

**(b) No Personalized Advice:** The AI agents do not know your personal financial circumstances, tax situation, investment objectives, or risk tolerance unless you have provided this information through a suitability questionnaire. Nothing communicated by an AI agent constitutes personalized investment advice.

**(c) AI Identities Are Simulated:** The unique identities, personas, and communication styles of AI agents are simulated representations for interface purposes. They do not represent real persons and do not reflect human judgment.

**(d) Model Limitations:** AI models may produce errors, hallucinations, or outputs that do not reflect actual market conditions. The platform does not guarantee the accuracy, completeness, or timeliness of AI agent analyses or trading decisions.

**(e) Market Sentiment Simulation:** AI agents use publicly available news and data to simulate market sentiment. This is not equivalent to professional research or analysis by a registered financial analyst.

**(f) Past Performance:** Past performance of any AI agent is not indicative of future results.

## 3.7 No Guarantee of Profits

**THE PLATFORM DOES NOT GUARANTEE THAT USERS WILL MAKE A PROFIT. TRADING IN FINANCIAL INSTRUMENTS INVOLVES SUBSTANTIAL RISK OF LOSS. YOU MAY LOSE SOME OR ALL OF YOUR INVESTED CAPITAL. YOU SHOULD NOT INVEST MORE THAN YOU CAN AFFORD TO LOSE.**

Any statements made by the platform, its operator, or AI agents regarding potential profits, historical returns, or expected performance are for illustrative purposes only and do not constitute a guarantee or promise of future results.

## 3.8 Prohibited Activities

You agree not to:

(a) Use the platform for any purpose that violates applicable law or regulation;
(b) Engage in market manipulation, wash trading, or other prohibited trading practices;
(c) Use the platform to launder money or finance terrorism;
(d) Attempt to reverse-engineer, copy, or reproduce any AI models, algorithms, or proprietary technology underlying the platform;
(e) Use the platform to harass, intimidate, or harm other users;
(f) Circumvent or attempt to circumvent any security or verification measures;
(g) Make false or misleading statements about the platform or its AI agents; or
(h) Access the platform from a jurisdiction where doing so is prohibited by applicable law.

## 3.9 Fees and Charges

**(a) Operator Fee:** The platform operator receives a fee based on net profits generated through copy trading. This fee is set out in the Operator Fee Disclosure (Section 6). This disclosure is provided separately and must be acknowledged before activating copy trading.

**(b) No Hidden Fees:** All fees charged by the platform will be disclosed to you before they are applied.

**(c) Third-Party Costs:** You may incur fees from your brokerage, exchange, or other third-party services. These are not controlled by the platform and are your responsibility.

**(d) Taxes:** You are solely responsible for determining and satisfying any tax obligations arising from your use of the platform, including any taxes on trading gains.

## 3.10 Intellectual Property

**(a) Platform IP:** All intellectual property in the platform, including AI agent designs, names, logos, software, algorithms, and content, is owned by the Operator or its licensors. Nothing in these Terms grants you any rights in the platform's intellectual property other than a limited, non-exclusive, non-transferable licence to use the platform for personal, non-commercial purposes.

**(b) User Content:** To the extent you submit any content to the platform (e.g., via chat with AI agents), you grant the Operator a non-exclusive, royalty-free licence to use that content for the purposes of operating and improving the platform.

**(c) AI Model IP:** The underlying AI models (including Kimi 2.6 and DeepSeek V3) are owned by their respective third-party providers and licensed to the Operator. You have no rights to these models.

## 3.11 Limitation of Liability

**(a) DISCLAIMER OF WARRANTIES:** THE PLATFORM IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS, WITHOUT ANY WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, OR NON-INFRINGEMENT.

**(b) NO LIABILITY FOR TRADING LOSSES:** TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, THE OPERATOR SHALL NOT BE LIABLE FOR ANY TRADING LOSSES, INVESTMENT LOSSES, OR ANY OTHER FINANCIAL LOSSES SUFFERED BY YOU IN CONNECTION WITH YOUR USE OF THE PLATFORM OR THE COPY TRADING FEATURE.

**(c) LIMITATION ON DAMAGES:** TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, THE OPERATOR'S TOTAL AGGREGATE LIABILITY TO YOU FOR ALL CLAIMS ARISING UNDER OR IN CONNECTION WITH THESE TERMS SHALL NOT EXCEED THE GREATER OF: (I) THE TOTAL FEES PAID BY YOU TO THE PLATFORM IN THE TWELVE (12) MONTHS PRECEDING THE CLAIM; OR (II) ONE HUNDRED CANADIAN DOLLARS (CAD $100).

**(d) EXCLUSION OF CONSEQUENTIAL DAMAGES:** TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, THE OPERATOR SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, PUNITIVE, OR EXEMPLARY DAMAGES, INCLUDING LOSS OF PROFITS, LOSS OF DATA, OR LOSS OF GOODWILL.

**(e) Applicability:** Some jurisdictions do not permit the exclusion or limitation of certain warranties or liability. If such law applies to you, some of the above limitations may not apply. Nothing in these Terms is intended to exclude or limit liability that cannot be excluded by law.

**(f) Regulatory Disclaimer:** The platform is [at the time of writing, pending securities registration] not currently registered with the AMF, CSA, or CIRO as a securities dealer or adviser. Users acknowledge this status and proceed at their own risk.

## 3.12 Indemnification

You agree to indemnify, defend, and hold harmless the Operator from and against any claims, damages, losses, costs, and expenses (including reasonable legal fees) arising out of or in connection with: (a) your use of the platform; (b) your breach of these Terms; (c) your violation of any applicable law or regulation; or (d) your infringement of any third-party rights.

## 3.13 Account Termination

**(a) Termination by User:** You may terminate your account at any time by contacting us at [CONTACT EMAIL]. Termination does not affect any accrued fees owed to the Operator.

**(b) Termination by Operator:** We may suspend or terminate your account, with or without notice, if: (i) you breach these Terms; (ii) you fail to satisfy our KYC/AML requirements; (iii) we are required to do so by applicable law or a regulatory authority; or (iv) we determine, in our sole discretion, that your continued use of the platform poses a legal or operational risk.

**(c) Effect of Termination:** Upon termination, you must immediately cease using the platform. Any copy trading authorizations will be cancelled. Outstanding fees will be collected.

## 3.14 Modifications to Terms

We reserve the right to modify these Terms at any time. We will notify you of material changes by email or via a notice on the platform. Your continued use of the platform after the effective date of any modification constitutes your acceptance of the modified Terms. If you do not agree to the modified Terms, you must stop using the platform.

## 3.15 Governing Law

These Terms and any dispute arising out of or in connection with them shall be governed by and construed in accordance with the laws of the **Province of Quebec and the federal laws of Canada applicable therein**, without regard to conflict of law principles.

## 3.16 Dispute Resolution

**(a) Informal Resolution:** Before initiating formal dispute resolution, you agree to notify us of any dispute and allow thirty (30) days for the parties to attempt informal resolution.

**(b) Arbitration:** If informal resolution fails, any dispute arising out of or in connection with these Terms, including any question regarding its existence, validity, or termination, shall be referred to and finally resolved by **binding arbitration** administered in accordance with the **Code of Civil Procedure of Quebec (L.R.Q., c. C-25.01)** and the arbitration rules of the **ADR Institute of Canada**. The seat of arbitration shall be **Montreal, Quebec**. The language of arbitration shall be English (or French, if required under applicable Quebec law). The arbitral award shall be final and binding on both parties.

**(c) Class Action Waiver:** TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, YOU WAIVE YOUR RIGHT TO PARTICIPATE IN A CLASS ACTION LAWSUIT OR CLASS-WIDE ARBITRATION AGAINST THE OPERATOR. This clause is subject to applicable consumer protection law in Quebec; where it conflicts with mandatory provisions of Quebec law, such mandatory provisions apply.

**(d) Injunctive Relief:** Nothing in this section prevents either party from seeking urgent injunctive or other equitable relief from a court of competent jurisdiction to prevent irreparable harm.

## 3.17 General Provisions

**(a) Severability:** If any provision of these Terms is found to be invalid or unenforceable, that provision shall be modified to the minimum extent necessary to make it valid and enforceable, and the remaining provisions shall continue in full force.

**(b) Entire Agreement:** These Terms, together with the Privacy Policy, Risk Disclosure Statement, and Operator Fee Disclosure, constitute the entire agreement between you and the Operator regarding the platform and supersede all prior agreements and understandings.

**(c) No Waiver:** The Operator's failure to enforce any provision of these Terms shall not constitute a waiver of that provision.

**(d) Assignment:** You may not assign your rights or obligations under these Terms without our prior written consent. The Operator may assign its rights and obligations without restriction.

**(e) Language:** The parties confirm their express wish that these Terms be drafted in English. Les parties confirment leur volonté expresse que cette convention soit rédigée en anglais. [Note: Under Quebec's Charter of the French Language, this dual-language clause is important; however, a Quebec-licensed lawyer should advise on whether a full French translation is required.]

**(f) Contact:** [OPERATOR NAME], [ADDRESS], Montreal, Quebec, Canada. Email: [CONTACT EMAIL].

---

# 4. RISK DISCLOSURE STATEMENT

> **⚠️ READ THIS DOCUMENT CAREFULLY BEFORE INVESTING. THIS DOCUMENT DESCRIBES THE RISKS OF USING HOME FOR AI. TRADING IN FINANCIAL INSTRUMENTS INVOLVES SUBSTANTIAL RISK OF LOSS.**

---

**HOME FOR AI — RISK DISCLOSURE STATEMENT**

**This Risk Disclosure Statement is provided as a standalone document and is incorporated by reference into the Home for AI Terms of Service.**

---

## 4.1 General Investment Risk

Trading and investing in financial instruments involves a **high degree of risk**. You may lose some or all of your invested capital. The value of investments can go down as well as up. You should carefully consider your financial situation, investment objectives, and risk tolerance before investing.

**You should not invest money that you cannot afford to lose.** If you are uncertain whether investing is appropriate for your circumstances, you should seek independent financial advice from a licensed financial adviser.

## 4.2 AI and Algorithmic Trading Risk

The Home for AI platform uses AI agents powered by algorithmic and machine learning systems to make trading decisions autonomously. The following risks are specific to AI and algorithmic trading:

(a) **Model Error:** AI models may produce incorrect or unexpected outputs, including trading signals that result in losses. No AI system is infallible.

(b) **Overfitting / Historical Bias:** AI models trained on historical market data may not perform well in new or unprecedented market conditions.

(c) **Hallucination:** Large language models (LLMs) may generate plausible-sounding but factually incorrect analysis or trade rationale.

(d) **Black Box Risk:** AI trading decisions may not be fully explainable, making it difficult to understand why a particular trade was entered or exited.

(e) **Execution Risk:** Autonomous trading may result in unintended large orders, rapid position building, or other execution errors that amplify losses.

(f) **No Human Oversight in Real Time:** AI agents operate 24/7 without constant human supervision. Errors may compound before any intervention is possible.

(g) **Model Deprecation / Change:** AI models (Kimi 2.6, DeepSeek V3, or future models) may be updated, deprecated, or replaced, which may materially alter trading behaviour.

## 4.3 Market Volatility Risk

Financial markets can be highly volatile. Prices may move rapidly and unpredictably in response to:

- Economic data releases;
- Central bank decisions;
- Geopolitical events;
- Corporate announcements;
- Natural disasters and pandemics; and
- Sudden shifts in investor sentiment.

Market volatility can result in large, rapid losses. Stop-loss orders and other risk management tools are not guaranteed to prevent loss in highly volatile conditions.

## 4.4 Cryptocurrency-Specific Risk

Investment in cryptocurrency involves risks additional to those of traditional financial instruments:

(a) **Extreme Volatility:** Cryptocurrency prices can fluctuate by tens of percent within hours.

(b) **No Deposit Insurance:** Cryptocurrency holdings are **not covered** by the Canada Deposit Insurance Corporation (CDIC) or any provincial deposit insurance scheme. You may lose your entire investment with no recourse.

(c) **Regulatory Risk:** The regulatory treatment of cryptocurrency is evolving rapidly. Changes in law or regulatory guidance may adversely affect the value of cryptocurrencies or the platform's ability to offer crypto-related services.

(d) **Security Risk:** Cryptocurrency wallets and exchanges may be hacked or compromised. There is no central authority that can reverse fraudulent transactions on a blockchain.

(e) **Liquidity Risk:** Some cryptocurrencies may have thin trading markets, making it difficult to buy or sell at desired prices.

(f) **Technology Risk:** Blockchain networks may experience forks, protocol changes, or technical failures that affect the value or functionality of cryptocurrencies.

(g) **Tax Treatment:** The Canadian Revenue Agency (CRA) treats cryptocurrency as a commodity for tax purposes. Capital gains or losses may arise from crypto trading. You are responsible for your own tax obligations.

## 4.5 Forex and Leverage Risk

Trading in foreign exchange (forex) involves the following additional risks:

(a) **Currency Risk:** The value of positions denominated in foreign currencies will fluctuate with exchange rates, which may result in losses even if the underlying trade was profitable.

(b) **Leverage Risk:** Many forex products are leveraged, meaning small price movements can result in large gains or losses relative to the amount invested. Leverage amplifies both profits and losses. You may lose more than your initial investment.

(c) **Counterparty Risk:** Forex trading is typically conducted over-the-counter (OTC), creating counterparty risk if the other party to the transaction defaults.

(d) **Rollover Risk:** Positions held overnight in forex may be subject to rollover interest charges that erode returns.

## 4.6 Liquidity Risk

Some financial instruments traded on the platform may have limited markets, meaning:

(a) You may be unable to sell a position at a desired price;

(b) Large orders may significantly move the market price; or

(c) In extreme market conditions, it may be impossible to exit a position at any price.

Liquidity can deteriorate rapidly during market crises.

## 4.7 Technology and Cybersecurity Risk

The platform is dependent on technology infrastructure, and the following risks apply:

(a) **Platform Downtime:** The platform may experience outages, maintenance periods, or technical failures that prevent you from accessing your account or disabling copy trading in a timely manner.

(b) **Cybersecurity:** The platform, your account, or your linked brokerage account may be subject to cyberattacks, hacking, or unauthorized access. The platform implements security measures but cannot guarantee protection against all cyber threats.

(c) **Third-Party Infrastructure:** The platform relies on third-party cloud providers, AI model APIs, and brokerage connectivity. Failures in these third-party systems may affect platform functionality.

(d) **Internet Risk:** The quality and reliability of your internet connection affects your ability to access and use the platform.

(e) **AI Model Provider Risk:** AI models used by the platform are provided by third parties (including non-Canadian providers). Disruption, outage, or change in these services may affect AI agent performance.

## 4.8 Regulatory Risk

(a) **Platform Registration Status:** As of the date of these Terms, the platform [is in the process of / has not yet obtained] registration with the AMF, CIRO, or other applicable Canadian securities regulators. **Operating without proper registration may require the platform to cease operations, refund users, or face enforcement action.** Users accept this risk by using the platform prior to full registration.

(b) **Changing Regulation:** Securities laws, crypto regulations, and AI governance frameworks in Canada are evolving rapidly. Future regulatory changes may restrict or prohibit certain activities on the platform, require modifications to the business model, or result in the platform being unable to continue operations.

(c) **Regulatory Enforcement:** If the platform becomes subject to regulatory enforcement action, user accounts may be frozen or terminated and assets may be subject to regulatory proceedings.

## 4.9 Copy Trading-Specific Risk

In addition to the above, copy trading involves the following specific risks:

(a) **Dependency on AI Agent Performance:** Your returns are entirely dependent on the performance of the AI agent(s) you copy. Poor AI performance directly translates to losses in your account.

(b) **No Personalized Suitability Assessment:** AI agents do not tailor their trading strategies to your personal financial situation unless a formal suitability assessment has been completed.

(c) **Simultaneous Trade Execution:** Trades are replicated automatically. You may not be able to review or decline a specific trade before it is executed.

(d) **Operator Fee Impact:** The profit-sharing fee payable to the Operator reduces your net return. See Section 6 (Operator Fee Disclosure) for details.

(e) **Slippage:** Due to timing differences between the AI agent's trade and your mirrored trade, the price at which your copy trade executes may differ from the AI agent's price, resulting in different returns.

(f) **No Recourse:** If the AI agent makes poor trading decisions that result in losses, you have no recourse against the Operator for investment losses, subject to any applicable securities law obligations.

---

*I acknowledge that I have read and understood this Risk Disclosure Statement.*

**Signature / Electronic Acknowledgment:** ____________________________
**Date:** ____________________________

---

# 5. PRIVACY POLICY

> **⚠️ This Privacy Policy is a draft template. It requires review by a qualified privacy lawyer familiar with PIPEDA, Quebec Law 25 (Bill 64), and applicable Canadian privacy legislation before use.**

---

**HOME FOR AI — PRIVACY POLICY**

**Last Updated:** [DATE]
**Effective Date:** [DATE]

---

## 5.1 Introduction and Scope

Home for AI ("we," "us," or "our") is committed to protecting the personal information of our users. This Privacy Policy describes how we collect, use, disclose, retain, and protect personal information in connection with the Home for AI platform.

This Privacy Policy complies with:

- The **Personal Information Protection and Electronic Documents Act (PIPEDA)** (SC 2000, c. 5), the federal privacy law applicable to our commercial activities;
- **Quebec's Act Respecting the Protection of Personal Information in the Private Sector**, as significantly amended by **Bill 64 (Law 25)** (LRQ c P-39.1), which introduces stricter requirements for organizations operating in Quebec or handling data of Quebec residents; and
- Other applicable Canadian privacy legislation.

This Privacy Policy applies to personal information collected through the platform, including via website, mobile application, chat interface, and voice interface.

## 5.2 Who We Are

**Data Controller / Privacy Officer:**
Home for AI
[Operator Name]
[Address], Montreal, Quebec, Canada
Email: [PRIVACY CONTACT EMAIL]
Phone: [PHONE NUMBER]

## 5.3 Personal Information We Collect

We collect the following categories of personal information:

### (a) Identity and Account Information
- Full legal name
- Date of birth
- Government-issued identification (for KYC)
- Email address
- Username and password
- Province/territory of residence

### (b) Financial and Investment Information
- Investment objectives, risk tolerance, and financial situation (collected via suitability questionnaire)
- Linked brokerage account information
- Trade history and portfolio data
- Transaction records related to the operator fee

### (c) Communications Data
- **Chat logs:** All text-based communications with AI agents are logged and stored.
- **Voice recordings:** If you use the voice interface to interact with AI agents, your voice inputs are recorded and may be processed by third-party AI model providers. See Section 5.6 regarding cross-border data transfers.

### (d) Technical and Usage Data
- IP address
- Device type and operating system
- Browser type
- Platform usage logs (pages visited, features used, session duration)
- Cookies and similar tracking technologies

### (e) KYC/AML Verification Data
- Identity documents (passport, driver's licence)
- Proof of address
- Source of funds documentation (where required)
- Screening records (sanctions, politically exposed persons (PEP) checks)

## 5.4 How We Use Your Personal Information

We use your personal information for the following purposes:

| Purpose | Legal Basis (PIPEDA / Law 25) |
|---|---|
| Account creation and authentication | Consent; necessary for contract performance |
| KYC/AML identity verification | Legal obligation (PCMLTFA) |
| Operating the copy trading feature | Consent; contract performance |
| Calculating and processing the operator fee | Contract performance |
| Improving AI agent performance and training | Consent (with opportunity to withdraw) |
| Communicating with you about your account | Contract performance; legitimate interest |
| Customer support | Legitimate interest |
| Fraud prevention and security | Legal obligation; legitimate interest |
| Compliance with regulatory and legal obligations | Legal obligation |
| Analytics and platform improvement | Legitimate interest (with safeguards) |
| **Automated decision-making (AI trading)** | **Consent; see Section 5.9 below** |

We do not sell your personal information to third parties for marketing purposes.

## 5.5 Third-Party Sharing

We may share your personal information with the following categories of third parties:

**(a) AI Model Providers:** The platform uses **Kimi 2.6** (operated by Moonshot AI, a company based in China) and **DeepSeek V3** (operated by DeepSeek, a company based in China). Your chat inputs, voice data, and market context data may be processed by these providers. **See Section 5.7 regarding cross-border data transfers.**

**(b) KYC/AML Service Providers:** We use third-party identity verification services to process your KYC documents.

**(c) Brokerage Partners:** If you link a brokerage account, we will share necessary trading instructions and account data with your brokerage.

**(d) Cloud Infrastructure Providers:** The platform is hosted on third-party cloud infrastructure (e.g., AWS, Google Cloud, Azure), which may involve data processing in the United States or other jurisdictions.

**(e) Analytics Providers:** We may use third-party analytics tools that process certain usage data.

**(f) Legal and Regulatory Authorities:** We may disclose personal information to the AMF, CIRO, FINTRAC, law enforcement, or courts as required by law, court order, or regulatory request.

**(g) Business Transfers:** If the platform is sold or merged, personal information may be transferred to the acquiring entity, subject to equivalent privacy protections.

We require all third-party processors to handle your personal information in accordance with applicable privacy law and to implement appropriate security measures.

## 5.6 Data Retention

We retain personal information for the following periods:

| Category | Retention Period |
|---|---|
| Account information (active users) | Duration of account + 7 years after closure |
| KYC/AML records | Minimum 5 years (as required by PCMLTFA) |
| Trade records and transaction history | Minimum 7 years (as required by applicable tax and securities law) |
| Chat logs | 3 years from date of communication |
| Voice recordings | 1 year from date of recording, unless required for compliance |
| Technical/usage logs | 2 years |
| Terminated account data | As required by legal and regulatory obligations |

## 5.7 Cross-Border Data Transfers

> **⚠️ IMPORTANT DISCLOSURE:** Your personal information, including **chat logs and voice recordings**, may be transferred to and processed in **countries outside Canada**, including **China** (where the AI model providers Moonshot AI and DeepSeek are based) and the **United States** (cloud infrastructure). These countries may not have privacy laws equivalent to Canadian law.

By using the platform, and specifically by using the chat and voice interface features, **you consent to this cross-border transfer of your personal information.**

Under **Quebec Law 25**, before transferring personal information outside Quebec, we are required to conduct a **Privacy Impact Assessment (PIA)** to ensure that the receiving jurisdiction provides adequate protection. We commit to:

(a) Conducting PIAs for all cross-border transfers to non-adequate jurisdictions;

(b) Entering into data processing agreements with AI model providers that include appropriate contractual safeguards; and

(c) Notifying you if we become aware of a significant change in the privacy protection available in a recipient jurisdiction.

You may withdraw consent for cross-border data processing at any time, subject to the consequence that you will be unable to use the AI chat and voice features.

## 5.8 Cookies and Tracking Technologies

We use cookies and similar technologies to:

- Maintain your session when you are logged in;
- Remember your preferences;
- Analyse platform usage;
- Prevent fraud and enhance security.

You may configure your browser to refuse certain cookies, but this may affect your ability to use some features of the platform. We will seek your consent for any non-essential cookies in accordance with applicable law.

## 5.9 Automated Decision-Making

The platform uses automated decision-making through AI agents to execute trades in your linked account via copy trading. This automated processing may have a **significant financial effect** on you.

Under **Quebec Law 25**, you have the right to:

(a) **Be informed** that automated decision-making is being used in connection with your account;

(b) **Request a human review** of automated decisions that significantly affect you; and

(c) **Withdraw consent** to automated decision-making, which will result in the deactivation of copy trading on your account.

You acknowledge that the copy trading feature is fundamentally an automated decision-making service and that you consent to this automation by enabling copy trading.

## 5.10 Your Privacy Rights

Under PIPEDA and Quebec Law 25, you have the following rights with respect to your personal information:

| Right | Description | Response Timeframe |
|---|---|---|
| **Right of Access** | Request a copy of the personal information we hold about you | 30 days |
| **Right of Correction** | Request correction of inaccurate personal information | 30 days |
| **Right of Deletion** | Request deletion of personal information no longer necessary (subject to legal retention obligations) | 30 days |
| **Right to Object** | Object to certain uses of your personal information | Assessed case by case |
| **Right to Data Portability** (Law 25) | Request your data in a structured, common format | 30 days |
| **Right to Withdraw Consent** | Withdraw consent for optional processing (e.g., cross-border AI processing) | Immediate; may affect platform features |
| **Right to Know About Automated Decisions** | Receive an explanation of automated decisions affecting you | 30 days |

To exercise any of these rights, contact our Privacy Officer at: **[PRIVACY CONTACT EMAIL]**

## 5.11 Data Security

We implement appropriate technical and organizational measures to protect your personal information against unauthorized access, disclosure, alteration, or destruction. These measures include:

- Encryption of personal data at rest and in transit (TLS/SSL);
- Multi-factor authentication for account access;
- Access controls limiting employee access to personal information on a need-to-know basis;
- Regular security audits and penetration testing; and
- Incident response procedures for data breaches.

In the event of a data breach that presents a **risk of serious harm** to affected individuals, we will notify the **Commission d'accès à l'information (CAI)** (the Quebec privacy authority) and affected individuals within **72 hours** of becoming aware of the breach, as required by Quebec Law 25.

## 5.12 Children's Privacy

The platform is not intended for persons under the age of 18. We do not knowingly collect personal information from minors. If we become aware that we have collected personal information from a person under 18, we will delete that information promptly.

## 5.13 Designated Privacy Officer

As required by Quebec Law 25, we have designated a **Privacy Officer** responsible for the protection of personal information at the organization. Contact information:

**Privacy Officer:** [NAME]
**Email:** [PRIVACY EMAIL]
**Address:** [ADDRESS], Montreal, Quebec, Canada

The Privacy Officer is also responsible for conducting privacy impact assessments (PIAs) for new projects involving personal information, and for handling privacy complaints.

## 5.14 Changes to This Privacy Policy

We may update this Privacy Policy from time to time. We will notify you of material changes by email or by a notice on the platform. The updated Privacy Policy will be effective as of the date stated at the top of the document. Your continued use of the platform after that date constitutes acceptance of the updated Privacy Policy.

---

# 6. OPERATOR FEE DISCLOSURE

> **⚠️ THIS DOCUMENT MUST BE PRESENTED TO USERS AT ACCOUNT CREATION AND AGAIN IMMEDIATELY BEFORE EACH ACTIVATION OF THE COPY TRADING FEATURE, AS REQUIRED BY CSA/CIRO DISCLOSURE REQUIREMENTS.**

---

**HOME FOR AI — OPERATOR FEE DISCLOSURE**

---

## ⚠️ MANDATORY DISCLOSURE — FINANCIAL INTEREST OF THE OPERATOR

**This disclosure is required by Canadian securities law and CSA regulatory guidance. Please read it carefully.**

---

## 6.1 Profit-Sharing Arrangement

The Operator of Home for AI receives a **direct financial benefit** from your copy trading activity. Specifically:

> **THE PLATFORM OPERATOR RECEIVES [X]% OF NET PROFITS GENERATED IN YOUR ACCOUNT THROUGH COPY TRADING.**
>
> **YOU RETAIN [Y]% OF NET PROFITS GENERATED IN YOUR ACCOUNT THROUGH COPY TRADING.**
>
> **THIS FEE IS CHARGED ONLY WHEN PROFITS ARE REALIZED IN YOUR ACCOUNT. NO FEE IS CHARGED ON TRADING LOSSES.**

*[Note to operator: Replace [X]% and [Y]% with actual percentages. Ensure X + Y = 100%. Common structures in copy trading range from 10%–30% operator fee. This must be specified before launch and verified with a securities lawyer as to whether it requires a specific disclosure format under NI 31-103.]*

**Example:**
If the operator fee is 20% and copy trading generates CAD $1,000 in net profits in your account over a calendar month:
- You retain: CAD $800 (80%)
- Operator receives: CAD $200 (20%)

If copy trading results in a net loss in a calendar month, no operator fee is charged for that period.

## 6.2 Why This Matters

The Operator has a **financial incentive** to encourage you to use and maintain copy trading, because the Operator profits when you profit. While we believe this aligns our interests with yours, you should be aware that:

(a) The Operator does **not** bear any portion of your trading losses;

(b) The Operator's fee reduces your **net return**. A fee of 20% means that even if the AI agent generates a 10% annual return, your net return would be 8% (before taxes and brokerage fees);

(c) The Operator may have incentives to promote high-frequency or high-turnover trading strategies, which may generate more profit events (and therefore more fees) but may not be optimal for your long-term investment goals; and

(d) **This arrangement has not been reviewed or approved by the AMF, CIRO, or any other Canadian securities regulator** [pending registration]. The operator is in the process of seeking registration.

## 6.3 How the Fee Is Calculated

The operator fee is calculated as follows:

| Term | Definition |
|---|---|
| **Gross Profits** | Total realized gains in your copy trading account for the calculation period |
| **Trading Costs** | Brokerage commissions, exchange fees, and other transaction costs deducted from gross profits |
| **Net Profits** | Gross Profits minus Trading Costs |
| **Operator Fee** | [X]% of Net Profits for the calculation period |
| **Your Net Return** | [Y]% of Net Profits after operator fee |

**Calculation Period:** [Monthly / Quarterly — specify]

**Fee Collection:** The operator fee will be deducted from your account [specify mechanism — e.g., quarterly debit, invoice, deduction from realized gains].

## 6.4 Referral and Third-Party Arrangements

[If applicable: Disclose any referral fees, affiliate arrangements, or other financial relationships that may influence the operator's recommendations.]

The Operator does not currently receive fees from AI model providers (Kimi/DeepSeek) or brokerage partners in connection with user referrals. [Update if this changes.]

## 6.5 Acknowledgment

**By activating the copy trading feature, you confirm that:**

- [ ] I have read and understood this Operator Fee Disclosure;
- [ ] I understand that the Operator receives [X]% of net profits generated by copy trading in my account;
- [ ] I understand that this constitutes a financial conflict of interest and I accept this arrangement;
- [ ] I have been provided with the Risk Disclosure Statement and I acknowledge the risks associated with copy trading; and
- [ ] I agree to the Home for AI Terms of Service.

**User Signature / Electronic Acknowledgment:** ____________________________
**Date and Time:** ____________________________

---

*This Operator Fee Disclosure must be retained by the Operator as evidence of user acknowledgment for a minimum of seven (7) years.*

---

# 7. PRE-LAUNCH LEGAL CHECKLIST

> **⚠️ This checklist is a guide only and does not constitute legal advice. It is incomplete without independent legal review. Items marked [CRITICAL] must be addressed before the platform may lawfully accept its first user.**

---

**HOME FOR AI — PRE-LAUNCH LEGAL CHECKLIST**

---

## 7.1 Legal Counsel and Corporate Structure

- [ ] **[CRITICAL] Retain a licensed Canadian securities lawyer** with expertise in securities law, fintech regulation, and Quebec financial services law before taking any further steps. Relevant firms include Osler, Hoskin & Harcourt LLP; Stikeman Elliott LLP; Torys LLP; McCarthy Tétrault LLP; and Blakes (Blake, Cassels & Graydon LLP). Estimated cost: $5,000–$20,000+ initial engagement.

- [ ] **[CRITICAL] Incorporate a legal entity** (Quebec or federally incorporated corporation) through which to operate the platform. Operating as an individual creates unlimited personal liability. Estimated cost: $1,500–$5,000.

- [ ] **Obtain a legal opinion** on the specific registration categories required for this business model (PM, EMD, ID, Restricted Dealer), including whether the platform constitutes an investment fund and whether IFM registration is required.

- [ ] **Obtain a legal opinion** on AI liability under CSA Staff Notice 11-348 and CIRO/CSA Notice 31-369, specifically regarding operator responsibility for AI agent trading decisions.

---

## 7.2 Securities Registration

- [ ] **[CRITICAL] Apply for registration with the AMF** (as principal regulator under the CSA passport system) in the applicable categories. Based on current analysis, likely categories include:

  - [ ] **Restricted Dealer** — for crypto asset trading platform operations (minimum required for crypto; interim pathway per CSA/IIROC Notice 21-329)
  - [ ] **Portfolio Manager** — for discretionary AI-driven trading and investment advice across all asset classes
  - [ ] **Exempt Market Dealer** — consider if platform will distribute securities to accredited investors outside a full prospectus framework
  - [ ] **Investment Dealer / CIRO Membership** — required if operating a full-service securities trading platform; CIRO membership mandatory for Investment Dealer category

- [ ] **Submit CSA Regulatory Sandbox application** (AMF Innovation Office / CSA Innovation Office) for time-limited exemptive relief while full registration is pursued. This may allow limited operations with a restricted user base and conditions. See: [securities-administrators.ca](https://www.securities-administrators.ca).

- [ ] **Apply for registration under the Quebec Derivatives Act (QDA)** for forex and derivatives trading:
  - [ ] **Derivatives Dealer** — if facilitating OTC derivatives trades
  - [ ] **Derivatives Portfolio Manager** — if managing derivative positions on a discretionary basis for clients

- [ ] **Appoint a registered Advising Representative** (CFA Charter + 12 months experience, or CIM + 48 months) for Portfolio Manager registration, if the operator does not personally meet these qualifications.

- [ ] **Appoint an Ultimate Designated Person (UDP)** and **Chief Compliance Officer (CCO)** as required by NI 31-103.

---

## 7.3 Compliance Officer and Compliance Infrastructure

- [ ] **[CRITICAL] Engage a Chief Compliance Officer (CCO)** registered with the AMF (and CIRO if applicable). This may be an individual hire (salary estimate: CAD $80,000–$150,000/year) or an outsourced compliance consulting firm.

- [ ] **Develop a Compliance Manual** covering all NI 31-103 obligations, including:
  - KYC and suitability policies
  - Conflict of interest management
  - Supervision of AI trading systems
  - Error and complaint handling
  - Recordkeeping

- [ ] **Implement a conflicts of interest policy** that specifically addresses the operator's profit-sharing arrangement and the potential conflict between operator fee interests and client best interests.

---

## 7.4 KYC / AML / FINTRAC

- [ ] **[CRITICAL] Register with FINTRAC as a Money Services Business (MSB)** if the platform handles virtual currency (crypto) or foreign exchange. Registration is at [fintrac-canafe.gc.ca](https://www.fintrac-canafe.gc.ca). No fee for registration, but compliance infrastructure is required.

- [ ] **Develop and implement an AML/ATF Compliance Program** that includes:
  - [ ] Written AML compliance policies and procedures
  - [ ] Designated AML Compliance Officer
  - [ ] Risk assessment of business activities and clients
  - [ ] KYC (Know Your Client) procedures: identity verification, ongoing monitoring
  - [ ] Transaction monitoring system for suspicious transactions
  - [ ] Mandatory reporting to FINTRAC: large cash transactions (>CAD $10,000), large virtual currency transactions (>CAD $10,000), suspicious transactions
  - [ ] Recordkeeping (minimum 5 years)
  - [ ] Employee AML training program

- [ ] **Implement a KYC platform** (e.g., Persona, Jumio, Onfido, or Canadian-focused alternatives) for identity verification of users.

- [ ] **Assess RPAA (Retail Payment Activities Act) registration** with the Bank of Canada if the platform holds client funds or processes payment transactions.

---

## 7.5 Cybersecurity and Technology Risk

- [ ] **Develop a Cybersecurity Risk Management Policy** as required by CIRO and AMF guidance applicable to registered firms. This policy must address:
  - [ ] Threat and vulnerability assessment
  - [ ] Access controls and multi-factor authentication
  - [ ] Data encryption (at rest and in transit)
  - [ ] Incident response and data breach notification procedures
  - [ ] Business continuity and disaster recovery
  - [ ] Third-party/vendor risk management (AI model providers, cloud hosts)

- [ ] **Conduct penetration testing** of the platform before launch.

- [ ] **Implement AI system audit capability** to comply with CSA Staff Notice 11-348 requirements for registrants to be able to review and explain AI-driven trading decisions.

---

## 7.6 Insurance

- [ ] **Obtain Errors & Omissions (E&O) / Professional Liability Insurance** covering AI-driven trading advice and copy trading services. This is likely required by the AMF as a condition of registration. Estimated annual cost: CAD $5,000–$30,000+.

- [ ] **Assess Directors & Officers (D&O) insurance** requirements once a corporation is incorporated.

- [ ] **Obtain Cyber Liability Insurance** given the significant technology and data risk.

---

## 7.7 Derivatives and Forex

- [ ] **Engage a Quebec-licensed derivatives dealer or obtain AMF registration under the QDA** before offering forex or leveraged derivatives trading to users.

- [ ] **Obtain a separate legal opinion** on whether the AI agents' forex trading constitutes "derivatives dealing" under the QDA requiring dealer (as opposed to just adviser) registration.

---

## 7.8 Privacy and Data Governance

- [ ] **Designate a Privacy Officer** and publish their contact information, as required by Quebec Law 25.

- [ ] **Conduct Privacy Impact Assessments (PIAs)** for:
  - [ ] Cross-border transfers of personal data to Kimi/DeepSeek AI providers in China
  - [ ] Voice recording processing
  - [ ] Automated decision-making through AI copy trading
  - [ ] KYC/AML data processing

- [ ] **Enter into Data Processing Agreements (DPAs)** with Moonshot AI (Kimi) and DeepSeek covering data protection obligations, data retention, breach notification, and applicable law.

- [ ] **Implement a cookie consent mechanism** on the platform website.

- [ ] **Register or notify the CAI** (Commission d'accès à l'information du Québec) if required under Law 25.

---

## 7.9 Platform Terms and Disclosures

- [ ] **Have Terms of Service reviewed** by a Quebec-licensed lawyer and confirm compliance with the Quebec Consumer Protection Act, the Civil Code of Quebec, and the Charter of the French Language.

- [ ] **Translate Terms of Service, Privacy Policy, and all required disclosures into French** as required by the Charter of the French Language (Bill 96 amendments) for users in Quebec.

- [ ] **Implement the Operator Fee Disclosure** at account creation and before each copy trading activation, as required by CSA disclosure requirements.

- [ ] **Implement a prominent risk warning** on all platform pages accessible to users, prominently disclosing that the platform is [pending registration] and that trading involves substantial risk.

- [ ] **Review AI agent communications** for compliance with rules prohibiting misleading representations. Ensure users clearly understand that AI agents are software systems, not human advisers.

---

## 7.10 Ongoing Compliance Post-Registration

- [ ] File **annual financial statements and reports** with the AMF and CIRO as required.
- [ ] Conduct **annual suitability assessments** for copy trading users.
- [ ] Maintain **trade records** for at least seven (7) years.
- [ ] Monitor CSA, CIRO, and AMF guidance for regulatory updates affecting AI trading platforms.
- [ ] Conduct **annual AML compliance reviews** and report to FINTRAC as required.
- [ ] Conduct **annual cybersecurity reviews** and update the cybersecurity risk management policy.

---

## SUMMARY CHECKLIST STATUS TABLE

| # | Action Item | Priority | Status |
|---|---|---|---|
| 1 | Retain Canadian securities lawyer | 🔴 CRITICAL | ☐ Not Started |
| 2 | Incorporate legal entity | 🔴 CRITICAL | ☐ Not Started |
| 3 | Apply for Restricted Dealer registration (crypto) | 🔴 CRITICAL | ☐ Not Started |
| 4 | Apply for Portfolio Manager registration | 🔴 CRITICAL | ☐ Not Started |
| 5 | Apply for AMF derivatives registration (forex/QDA) | 🔴 CRITICAL | ☐ Not Started |
| 6 | Register with FINTRAC as MSB | 🔴 CRITICAL | ☐ Not Started |
| 7 | Engage Chief Compliance Officer | 🔴 CRITICAL | ☐ Not Started |
| 8 | Implement KYC/AML procedures | 🔴 CRITICAL | ☐ Not Started |
| 9 | Develop Cybersecurity Risk Management Policy | 🟠 HIGH | ☐ Not Started |
| 10 | Obtain legal opinion on AI liability | 🟠 HIGH | ☐ Not Started |
| 11 | Obtain E&O insurance | 🟠 HIGH | ☐ Not Started |
| 12 | Conduct Privacy Impact Assessments | 🟠 HIGH | ☐ Not Started |
| 13 | Enter DPAs with Kimi/DeepSeek providers | 🟠 HIGH | ☐ Not Started |
| 14 | Designate Privacy Officer | 🟠 HIGH | ☐ Not Started |
| 15 | Translate documents into French (Law 101/Bill 96) | 🟡 MEDIUM | ☐ Not Started |
| 16 | Apply for CSA Regulatory Sandbox | 🟡 MEDIUM | ☐ Not Started |
| 17 | Obtain cyber liability insurance | 🟡 MEDIUM | ☐ Not Started |
| 18 | Assess RPAA (Bank of Canada) registration | 🟡 MEDIUM | ☐ Not Started |

---

## IMPORTANT CONTACTS

| Organization | Purpose | Contact |
|---|---|---|
| AMF (Autorité des marchés financiers) | Quebec securities regulator; primary registration authority | [lautorite.qc.ca](https://www.lautorite.qc.ca) · 1-877-525-0337 |
| CIRO (Canadian Investment Regulatory Organization) | National SRO; Investment Dealer and Mutual Fund Dealer regulation | [ciro.ca](https://www.ciro.ca) |
| CSA Innovation Office | Regulatory sandbox for fintech firms | [securities-administrators.ca](https://www.securities-administrators.ca) |
| FINTRAC | MSB registration and AML compliance | [fintrac-canafe.gc.ca](https://www.fintrac-canafe.gc.ca) |
| Bank of Canada (RPAA) | Retail Payment Activities Act registration | [bankofcanada.ca](https://www.bankofcanada.ca) |
| CAI (Commission d'accès à l'information) | Quebec privacy authority | [cai.gouv.qc.ca](https://www.cai.gouv.qc.ca) |
| OPC (Office of the Privacy Commissioner) | Federal privacy authority (PIPEDA) | [priv.gc.ca](https://www.priv.gc.ca) |

---

## FINAL DISCLAIMER

> **This document was drafted with AI assistance and does not constitute legal advice. It is provided for informational and planning purposes only. Review by a licensed Canadian securities lawyer — particularly one specializing in securities law, fintech regulation, and Quebec financial services law — is required before the Home for AI platform launches or solicits any users. The operator assumes all legal risk from reliance on this document without independent legal counsel.**
>
> **Regulatory requirements change frequently. All information in this document should be confirmed against current CSA, CIRO, and AMF guidance at the time of use. This document reflects the regulatory landscape as of June 2026 to the best of the drafting AI's knowledge, but may be incomplete or out of date.**

---

*Document prepared: June 29, 2026*
*Version: 1.0 (Draft — Requires Legal Review)*
*Jurisdiction: Province of Quebec, Canada*
