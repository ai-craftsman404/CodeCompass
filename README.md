<div align="center">
  <img src="assets/CodeCompass.png" alt="CodeCompass — Navigate Your Project Architecture" width="520"/>

  <br/>

  **The intelligent audit skill for Claude Code that tells you exactly what your project needs — and why.**

  <br/>

  [![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
  [![Tests](https://img.shields.io/badge/tests-615%20passing-brightgreen)](src/tests/)
  [![Coverage](https://img.shields.io/badge/coverage-95%25-brightgreen)](jest.config.js)
  [![Node.js](https://img.shields.io/badge/Node.js-18%2B-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)

</div>

---

## What is CodeCompass?

CodeCompass is a **Claude Code skill** that audits any software project and produces a prioritised, context-aware set of recommendations — not a generic checklist.

Most audit tools give every project the same advice. CodeCompass doesn't. It asks smart questions about your project's **stage, team, compliance obligations, and AI patterns**, then uses a weighted scoring engine to surface only the rules that genuinely apply to *your* situation. A solo PoC gets different advice from a regulated enterprise production system — and it should.

One command. Tailored output. No noise.

```
/audit
```

---

## Who is it for?

| You are… | CodeCompass helps you… |
|---|---|
| 🧑‍💻 **Solo developer** building an MVP or PoC | Get the minimum viable set of structure, security, and process rules — nothing overwhelming |
| 👥 **Small team** shipping to production | Identify CI/CD gaps, test maturity steps, and observability blind spots before they become incidents |
| 🏢 **Enterprise engineering team** | Enforce compliance frameworks (GDPR, ISO 27001, SOC2, HIPAA, PCI DSS) and multi-team governance at scale |
| 🤖 **AI/LLM application builder** | Catch prompt injection risks, RAG data leakage, agentic safety gaps, and LLM cost runaway before deployment |
| 🔒 **Security-conscious team** | Get threat-level-weighted recommendations with hard-mandatory rules that cannot be bypassed |
| 📋 **Tech lead or architect** | Run phased audits that separate "fix in the next 2 hours" from "tackle over the next 3 days" |

---

## Why CodeCompass?

Generic project linters and checklists have two failure modes: they either show you everything (overwhelming) or nothing relevant (useless). CodeCompass solves both by treating audit recommendations as a **scoring and filtering problem**, not a checklist problem.

- **Context-aware** — 15 project dimensions scored and weighted before a single rule fires
- **Precedence-driven** — rules compete for relevance; the most critical ones always win
- **Compliance-ready** — 9 frameworks built in: GDPR, ISO 27001, SOC2, FedRAMP, HIPAA, PCI DSS, Cyber Essentials, EU AI Act, NIST AI RMF
- **AI-native** — dedicated rule sets for LLM APIs, RAG pipelines, agentic systems, and fine-tuning workflows
- **Phaseable** — large high-threat projects automatically split into Triage (1–2 h) and Comprehensive (1–3 d) phases
- **Extensible** — add a new rule in under 5 minutes; JSON schema, no code required

---

## Quick start

### Prerequisites

- Node.js 18+
- npm 9+
- [Claude Code](https://claude.ai/code)

### Install

```bash
git clone https://github.com/ai-craftsman404/CodeCompass.git
cd CodeCompass
npm install
npm run build
```

### Run the skill

Open any project in Claude Code and invoke:

```
/audit
```

Claude walks you through a 3-tier questionnaire, infers context from your codebase, and returns prioritised recommendations with rationale for each.

**Experienced user? Skip the questionnaire entirely with expert flags:**

```
/audit PROFILE_STAGE=production TEAM_SCALE=multi-team COMPLIANCE_FRAMEWORK=ISO27001 THREAT_LEVEL=high
```

---

## How it works

CodeCompass runs a 7-step pipeline every time `/audit` is invoked:

```
1. Repo scan          Detect CI, tests, compliance markers, AI patterns, team signals
        │
2. Questionnaire      3-tier questions (novice / intermediate / expert cohort routing)
        │
3. Rule filtering     110+ rules filtered by your context variables (AND/OR logic)
        │
4. Precedence scoring weight × (security×0.35 + compliance×0.25 + threat×0.20)
        │
5. Conflict resolution hard-mandatory rules always win; soft-mandatory defer with justification
        │
6. Phasing decision   score > 0.65 → Triage phase + Comprehensive phase
        │
7. Rendered output    per-rule explanation, precedence score, phase assignment, artifacts
```

### Questionnaire tiers

| Tier | When asked | Covers |
|------|-----------|--------|
| **Tier 1** | Always | Project stage, team size, AI pattern, compliance framework |
| **Tier 2** | Unlocked by Tier 1 | CI maturity, test maturity, observability, documentation |
| **Tier 3** | Expert / high-signal | Threat level, security weight, reuse intent, deployment target |

**Cohort routing:**
- 🟢 **Novice** (sandbox/PoC, solo, no compliance) → minimal advisory rules, no overwhelm
- 🟡 **Intermediate** (MVP/beta, small team, light compliance) → balanced recommendations
- 🔴 **Expert** (production/enterprise, compliance, AI patterns) → full depth, phasing likely

---

## Rule library

**110+ rules across 15 categories, all context-filtered:**

| Category | Rules | What fires |
|----------|-------|-----------|
| `compliance` | ~30 | GDPR, ISO 27001, SOC2, FedRAMP, HIPAA, PCI DSS, EU AI Act, NIST AI RMF, Cyber Essentials |
| `security` | ~20 | Prompt injection, access control, cryptography, secret management |
| `process` | ~25 | CI/CD maturity, runbooks, SRE practices, incident response, disaster recovery |
| `testing` | ~15 | Unit → integration → E2E → contract → chaos maturity ladder |
| `tooling` | ~10 | Linting, formatters, artifact signing, API versioning |
| `structure` | ~5 | `.gitignore`, env config, README, LICENSE |
| `ai-patterns` | ~5 | LLM API, RAG, agentic, fine-tuning specific controls |

### Enforcement levels

Every rule carries one of three enforcement levels — there's no ambiguity about what's optional:

| Level | Meaning |
|-------|---------|
| 🔴 `hard-mandatory` | Non-negotiable. Cannot be skipped or overridden. Blocks conflicting rules. |
| 🟡 `soft-mandatory` | Strongly recommended. Can be deferred with documented justification. |
| 🟢 `advisory` | Best practice. Shown as guidance; never blocks. |

---

## Expert flags reference

Skip the questionnaire and drive the engine directly — useful in CI pipelines, scripted audits, or when you already know your context.

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

**Example — full expert bypass for a regulated AI production system:**

```
/audit PROFILE_STAGE=production TEAM_SCALE=enterprise AI_PATTERN=agentic \
       COMPLIANCE_FRAMEWORK=GDPR THREAT_LEVEL=critical \
       SECURITY_WEIGHT=85 COMPLIANCE_WEIGHT=90
```

---

## Phasing logic

For large, high-threat projects CodeCompass automatically recommends a two-phase approach so teams aren't paralysed by a wall of recommendations:

```
phasingScore = (threatScore × 0.40) + (sizeScore × 0.30) + (resourceScore × 0.30)

phasingScore > 0.65  →  two-phase audit
```

| Component | Score |
|-----------|-------|
| Threat: none / low / medium / high / critical | 0 / 0.1 / 0.4 / 0.7 / 1.0 |
| Size: ≤50k / >50k / >100k / >500k lines | 0.2 / 0.5 / 0.7 / 1.0 |
| Resource constraint: none / minimal / moderate / severe | 0 / 0.3 / 0.6 / 1.0 |

- **Phase 1 — Triage (1–2 hours):** hard-mandatory rules only → quick-fix guide
- **Phase 2 — Comprehensive (1–3 days):** all applicable rules → full remediation roadmap

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
    ├── profile-stage.json       # sandbox → PoC → MVP → beta → production → sunset
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

### Coverage

| Metric | Coverage | Threshold |
|--------|----------|-----------|
| Statements | 95.19% | 88% |
| Branches | 90.15% | 82% |
| Functions | 98% | 88% |
| Lines | 96.56% | 88% |

### Test suites

| Suite | Tests | What it validates |
|-------|-------|------------------|
| `rule-filtering.test.ts` | ~60 | contextVars AND/OR matching, edge cases |
| `precedence-scoring.test.ts` | ~70 | Formula, boosts, clamping, batch scoring |
| `phasing-logic.test.ts` | ~60 | Threat/size/resource scoring, phase structure |
| `conflict-resolution.test.ts` | ~50 | Hard-mandatory enforcement, override chains |
| `expert-flag-injection.test.ts` | ~70 | Enum validation, numeric bounds, error messages |
| `questionnaire-permutations.test.ts` | ~50 | All Tier 1/2/3 paths, cohort routing |
| `recommendation-engine.test.ts` | ~83 | Full pipeline, 97.7% statement coverage |
| `adversarial-scenarios.test.ts` | ~30 | Malformed input, injection attempts, boundary abuse |
| `e2e-skill-invocation.test.ts` | ~42 | **Real rule files** — GDPR, ISO27001, LLM API, CI/CD scenarios |
| `e2e-novice-fastpath.test.ts` | ~15 | Novice cohort: sandbox/PoC paths |
| `e2e-intermediate-conditional.test.ts` | ~15 | Intermediate: conditional unlocks |
| `e2e-full-audit-flow.test.ts` | ~20 | Production + compliance + phasing |
| `e2e-expert-full-control.test.ts` | ~15 | Expert flag bypass, all overrides |
| `e2e-real-codebases.test.ts` | ~15 | Multi-framework, agentic, enterprise |

---

## Extending CodeCompass

### Adding a new rule

Rules are pure JSON — no code required:

1. Open the relevant file in `.claude/audit-rules/templates/`
2. Add a rule object following the [rule format](docs/rule-format.md)
3. Register the `id` in `.claude/audit-rules/index.json`
4. Write a test that asserts the rule fires under the correct context
5. Run `npm run test:all` — all 615 tests must pass

```json
{
  "id": "my-new-rule",
  "description": "Short description of the recommendation",
  "category": "security",
  "version": "1.0.0",
  "condition": {
    "contextVars": { "PROFILE_STAGE": ["production", "beta"] },
    "precedenceWeight": 80
  },
  "action": {
    "type": "audit",
    "recommendation": "Detailed, actionable recommendation text...",
    "files": [],
    "enforcementLevel": "soft-mandatory"
  },
  "conflictsWith": [],
  "overrides": [],
  "rationale": "Why this rule matters."
}
```

### Adding a new context variable

1. Add the variable to `PrecedenceContext` in `src/types/audit.ts`
2. Add mapping logic in `src/functions/context-mapping.ts`
3. Register it in `ENUM_VALUES` or `WEIGHT_FIELDS` in `src/functions/expert-flags.ts`
4. Update `SKILL.md` `context_variables` section
5. Add test permutations to `src/tests/questionnaire-permutations.test.ts`

---

## Documentation

- [Rule format reference](docs/rule-format.md) — schema, lifecycle, conflict patterns
- [Phasing guide](docs/phasing-guide.md) — formula details, compliance implications, examples
- [Precedence matrix reference](docs/precedence-matrix-reference.md) — weights, precedence rules, conflict examples

---

## Licence

MIT — see [LICENSE](LICENSE) for details.

---

<div align="center">
  <sub>Built with Claude Code · Navigate with confidence</sub>
</div>
