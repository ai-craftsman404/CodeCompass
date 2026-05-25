<div align="center">
  <img src="assets/CodeCompass.png" alt="CodeCompass — Navigate Your Project Architecture" width="520"/>

  <br/>

  **Stop guessing what your project needs. Get a prioritised, context-aware audit in one command.**

  <br/>

  [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![Tests](https://img.shields.io/badge/tests-615%20passing-brightgreen)](src/tests/)
  [![Coverage](https://img.shields.io/badge/coverage-95%25-brightgreen)](jest.config.js)
  [![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)

</div>

---

## See it in action

Run one command in Claude Code. Get a prioritised audit tailored to your exact project:

```
/audit PROFILE_STAGE=production COMPLIANCE_FRAMEWORK=GDPR TEAM_SCALE=small THREAT_LEVEL=high
```

```
╔══════════════════════════════════════════════════════════════════╗
║  CodeCompass — Audit Results                                     ║
║  Context: production · small team · GDPR · threat: high         ║
║  Rules matched: 23 of 110+   Phasing triggered (score: 0.72)    ║
╚══════════════════════════════════════════════════════════════════╝

PHASE 1 — Triage  (complete in 1–2 hours)
──────────────────────────────────────────
🔴 gdpr-breach-notification          [hard-mandatory]  score: 96
   Establish GDPR Art.33/34 breach response plan with 72-hour
   supervisory notification procedure.
   → Create: /docs/compliance/breach-notification.md

🔴 generic-env-config                [hard-mandatory]  score: 88
   All secrets must move to environment variables immediately.
   → Create: /.env.example  |  Verify: .gitignore covers .env

🔴 gdpr-data-processing-agreement    [hard-mandatory]  score: 85
   Document lawful processing basis for each data category.
   → Create: /docs/compliance/data-processing-register.md

PHASE 2 — Comprehensive  (complete in 1–3 days)
─────────────────────────────────────────────────
🟡 production-sre-runbooks           [soft-mandatory]  score: 78
🟡 ci-security-scanning              [soft-mandatory]  score: 74
🟡 gdpr-privacy-notice               [soft-mandatory]  score: 71
🟢 test-coverage-baseline            [advisory]        score: 65
   … 16 more recommendations

Rationale logged for each rule · Conflicts resolved · Artifacts listed
```

No noise. No generic checklists. Only what applies to *your* project.

---

## Try it in 2 minutes

**Prerequisites:** [Node.js 18+](https://nodejs.org) · [Claude Code](https://claude.ai/code)

```bash
# 1. Clone and install
git clone https://github.com/ai-craftsman404/CodeCompass.git
cd CodeCompass && npm install && npm run build

# 2. Open any project in Claude Code, then run:
/audit
```

Claude walks you through 3–4 questions, infers context from your codebase, and returns a prioritised recommendation set in under a minute.

**Already know your context? Skip the questions entirely:**

```bash
# Solo developer, MVP stage
/audit PROFILE_STAGE=MVP TEAM_SCALE=solo

# LLM app going to production
/audit PROFILE_STAGE=production AI_PATTERN=LLM API THREAT_LEVEL=high

# Regulated enterprise system
/audit PROFILE_STAGE=production TEAM_SCALE=enterprise COMPLIANCE_FRAMEWORK=ISO27001 THREAT_LEVEL=critical
```

---

## What is CodeCompass?

CodeCompass is a **Claude Code skill** that audits any software project against a library of 110+ contextual rules — and only shows you the ones that matter for your specific situation.

Most audit tools give every project the same advice. CodeCompass doesn't. It scores rules against your project's **stage, team size, compliance obligations, AI patterns, and threat level**, then resolves conflicts between competing rules using a weighted precedence engine. A solo PoC gets different advice from a regulated enterprise production system — and it should.

**What sets it apart:**

- 🎯 **Context-filtered** — 110+ rules, only relevant ones surface
- ⚖️ **Precedence-scored** — critical rules always win; no recommendation buries another
- 📋 **Compliance-ready** — GDPR, ISO 27001, SOC2, HIPAA, PCI DSS, FedRAMP, EU AI Act, NIST AI RMF, Cyber Essentials
- 🤖 **AI-native** — dedicated rule sets for LLM APIs, RAG, agentic systems, fine-tuning
- 📅 **Phase-aware** — large high-threat projects automatically split into Triage + Comprehensive phases
- 🔧 **Extensible** — add a rule in 5 minutes, pure JSON, no code required

---

## Who is it for?

| You are… | CodeCompass helps you… |
|---|---|
| 🧑‍💻 **Solo developer** on an MVP or PoC | Get the minimum viable rules — nothing overwhelming |
| 👥 **Small team** shipping to production | Catch CI/CD gaps, test blind spots, and observability failures before they become incidents |
| 🏢 **Enterprise engineering team** | Enforce compliance frameworks and multi-team governance at scale |
| 🤖 **AI / LLM application builder** | Catch prompt injection, RAG leakage, agentic safety gaps, and cost runaway before deployment |
| 🔒 **Security-conscious team** | Get threat-weighted recommendations with hard-mandatory rules that cannot be skipped |
| 📋 **Tech lead or architect** | Run phased audits that separate "fix in 2 hours" from "tackle over 3 days" |

---

## How it works

```
Repo scan → Questionnaire → Filter 110+ rules → Score & rank → Resolve conflicts → Phase → Output
```

CodeCompass runs a 7-step pipeline every time `/audit` is invoked:

1. **Repo scan** — detects CI, tests, compliance markers, AI patterns, team signals
2. **Questionnaire** — 3-tier questions routed to novice / intermediate / expert cohort
3. **Rule filtering** — 110+ rules filtered by your context (AND/OR logic across 15 variables)
4. **Precedence scoring** — `weight × (security×0.35 + compliance×0.25 + threat×0.20)`
5. **Conflict resolution** — hard-mandatory rules always win; soft-mandatory defer with justification
6. **Phasing decision** — score > 0.65 → Triage phase (1–2 h) + Comprehensive phase (1–3 d)
7. **Rendered output** — per-rule explanation, score, phase, artifact paths

### Questionnaire tiers

| Tier | When | Covers |
|------|------|--------|
| **Tier 1** | Always | Stage, team size, AI pattern, compliance |
| **Tier 2** | Unlocked by Tier 1 | CI maturity, test maturity, observability |
| **Tier 3** | Expert / high-signal | Threat level, scoring weights, reuse intent |

---

## Expert flags reference

Drive the engine directly — useful for CI pipelines, scripted audits, or when you already know your context.

### Project flags

| Flag | Values |
|------|--------|
| `PROFILE_STAGE` | `sandbox` `PoC` `MVP` `beta` `production` `sunset-legacy` |
| `TEAM_SCALE` | `solo` `pair-trio` `small` `multi-team` `enterprise` |
| `THREAT_LEVEL` | `none` `low` `medium` `high` `critical` |
| `AI_PATTERN` | `none` `LLM API` `RAG` `fine-tuning` `agentic` `training` |
| `COMPLIANCE_FRAMEWORK` | `none` `GDPR` `ISO27001` `SOC2` `FedRAMP` `HIPAA` `PCI DSS` `Cyber Essentials` `EU AI Act` `NIST AI RMF` |
| `CI_MATURITY` | `none` `basic` `full` `GitOps` `ADO` |
| `TEST_MATURITY` | `none` `unit` `unit+integration` `unit+integration+E2E` `contract` `chaos` |
| `DEPLOYMENT_TARGET` | `local-dev` `cloud` `on-prem` `edge` `hybrid` `air-gapped` |

### Scoring weight flags (0–100)

| Flag | Effect | Default |
|------|--------|---------|
| `SECURITY_WEIGHT` | Amplifies security rule scores | 60 |
| `COMPLIANCE_WEIGHT` | Amplifies compliance rule scores | 50 |
| `THREAT_WEIGHT` | Amplifies threat-related rule scores | 40 |

---

## Rule library

**110+ rules across 7 categories — all context-filtered:**

| Category | Rules | Covers |
|----------|-------|--------|
| `compliance` | ~30 | GDPR, ISO 27001, SOC2, FedRAMP, HIPAA, PCI DSS, EU AI Act, NIST AI RMF, Cyber Essentials |
| `security` | ~20 | Prompt injection, access control, cryptography, secret management |
| `process` | ~25 | CI/CD, runbooks, SRE, incident response, disaster recovery |
| `testing` | ~15 | Unit → integration → E2E → contract → chaos maturity ladder |
| `tooling` | ~10 | Linting, formatters, artifact signing, API versioning |
| `structure` | ~5 | `.gitignore`, env config, README, LICENSE |
| `ai-patterns` | ~5 | LLM API, RAG, agentic, fine-tuning specific controls |

### Enforcement levels

| Level | Meaning |
|-------|---------|
| 🔴 `hard-mandatory` | Non-negotiable. Cannot be skipped or overridden. |
| 🟡 `soft-mandatory` | Strongly recommended. Deferrable with justification. |
| 🟢 `advisory` | Best practice. Never blocks. |

---

## Architecture

```
src/
├── recommendation-engine.ts     # Orchestrator: load → filter → score → resolve → phase → render
├── types/audit.ts               # AuditRule, PrecedenceContext, ScoredRule, ResolvedRule, AuditOutput
└── functions/
    ├── context-mapping.ts       # Questionnaire answers → PrecedenceContext
    ├── rule-filtering.ts        # contextVars AND/OR matching
    ├── precedence-scoring.ts    # applyPrecedenceMatrix, scoreRules
    ├── conflict-resolution.ts   # detectConflicts, resolveConflict
    ├── phasing-logic.ts         # shouldSuggestPhasing, determinePhasedRecommendations
    └── expert-flags.ts          # parseAndValidateFlags, applyFlagOverrides

.claude/audit-rules/
├── index.json                   # Rule catalogue (category → rule-id mappings)
└── templates/                   # 15 JSON rule files, 110+ rules
    ├── generic.json             # Universal rules (fire for every project)
    ├── compliance-gdpr.json
    ├── compliance-iso27001.json
    ├── compliance-soc2.json
    ├── compliance-other.json    # FedRAMP, HIPAA, PCI DSS, EU AI Act, NIST AI RMF, Cyber Essentials
    ├── llm-api.json
    ├── agentic.json
    ├── rag.json
    ├── profile-stage.json
    ├── team-scale.json
    ├── ci-maturity.json
    ├── test-maturity.json
    ├── observability.json
    ├── documentation.json
    └── reuse-intent.json
```

---

## Testing

```bash
npm run test:unit     # 493 unit tests across 8 suites
npm run test:e2e      # 122 end-to-end scenario tests (real rule files, no mocks)
npm run test:all      # Full suite with coverage report
npm run test:watch    # Watch mode for development
```

| Metric | Coverage | Threshold |
|--------|----------|-----------|
| Statements | 95.19% | 88% |
| Branches | 90.15% | 82% |
| Functions | 98% | 88% |
| Lines | 96.56% | 88% |

---

## Extending CodeCompass

### Add a rule (no code required)

```json
{
  "id": "my-new-rule",
  "description": "Short description",
  "category": "security",
  "version": "1.0.0",
  "condition": {
    "contextVars": { "PROFILE_STAGE": ["production", "beta"] },
    "precedenceWeight": 80
  },
  "action": {
    "type": "audit",
    "recommendation": "Actionable recommendation text...",
    "files": [],
    "enforcementLevel": "soft-mandatory"
  },
  "conflictsWith": [],
  "overrides": [],
  "rationale": "Why this rule matters."
}
```

1. Add to the relevant file in `.claude/audit-rules/templates/`
2. Register the `id` in `.claude/audit-rules/index.json`
3. Write a test · run `npm run test:all` · all 615 tests must pass

Full guide: [docs/rule-format.md](docs/rule-format.md) · [docs/phasing-guide.md](docs/phasing-guide.md) · [docs/precedence-matrix-reference.md](docs/precedence-matrix-reference.md)

---

## Licence

MIT — see [LICENSE](LICENSE) for details.

---

<div align="center">
  <sub>Built with Claude Code · Navigate with confidence</sub>
</div>
