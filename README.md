# CodeCompass

> **Contextual project audit skill for Claude Code.**  
> Ask the right questions, score the right rules, produce the right recommendations — in one `/audit` invocation.

---

## What it does

CodeCompass is a Claude Code skill that audits any software project against a library of 110+ contextual rules. It adapts its recommendations to your project's maturity, team size, compliance obligations, and AI patterns — not a one-size-fits-all checklist.

**Key capabilities:**

| Capability | Detail |
|------------|--------|
| **Progressive questionnaire** | 3-tier questions (Tier 1 always, Tier 2/3 unlocked by answers) routed to novice / intermediate / expert cohorts |
| **Expert flag bypass** | Skip the questionnaire entirely with `FLAG=value` overrides |
| **Precedence scoring** | Rules scored by weight × (security × 0.35 + compliance × 0.25 + threat × 0.20) |
| **Conflict resolution** | Hard-mandatory rules cannot be overridden; soft-mandatory can with justification |
| **Phasing logic** | Large / high-threat projects automatically split into Triage (1-2 h) + Comprehensive (1-3 d) phases |
| **110+ rules** | Covering compliance, CI/CD maturity, test maturity, observability, documentation, LLM APIs, team scale, and more |

---

## Quick start

### Prerequisites

- Node.js 18+
- npm 9+

### Install

```bash
git clone <repo-url>
cd CodeCompass
npm install
```

### Build

```bash
npm run build
```

### Test

```bash
npm run test:unit    # 493 unit tests with coverage
npm run test:e2e     # 80 end-to-end scenario tests
npm run test:all     # everything
```

---

## Usage as a Claude Code skill

Invoke the skill from any Claude Code session:

```
/audit
```

Claude will walk through the questionnaire. Experienced users can bypass it with expert flags:

```
/audit PROFILE_STAGE=production TEAM_SCALE=multi-team COMPLIANCE_FRAMEWORK=ISO27001 THREAT_LEVEL=high
```

---

## Architecture

```
src/
├── recommendation-engine.ts        # Orchestrator: load → filter → score → resolve → phase → render
├── conflict-resolver.ts            # Re-export shim (backwards compatibility)
├── types/
│   └── audit.ts                    # AuditRule, PrecedenceContext, ScoredRule, ResolvedRule, …
└── functions/
    ├── context-mapping.ts          # Tier 1/2/3 questionnaire → PrecedenceContext
    ├── rule-filtering.ts           # Filter rules by contextVars AND-match
    ├── precedence-scoring.ts       # applyPrecedenceMatrix, scoreRules
    ├── conflict-resolution.ts      # detectConflicts, resolveConflict, validateConflictResolution
    ├── phasing-logic.ts            # shouldSuggestPhasing, determinePhasedRecommendations
    ├── expert-flags.ts             # parseAndValidateFlags, applyFlagOverrides
    └── index.ts                    # Re-exports all functions

.claude/audit-rules/
├── index.json                      # Rule catalogue with category → rule-id mappings
└── templates/                      # 15 JSON rule files (110+ individual rules)
    ├── generic.json
    ├── compliance-iso27001.json
    ├── compliance-gdpr.json
    ├── compliance-soc2.json
    ├── compliance-other.json        # Cyber Essentials, FedRAMP, HIPAA, NIST AI RMF, EU AI Act, PCI DSS
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

### Pipeline (recommendation-engine.ts)

```
loadAllRules()
    │
    ▼
filterRulesByContext()   ← contextVars AND-match; arrays are OR within a variable
    │
    ▼
scoreRules()             ← precedenceWeight × weighted context factors
    │
    ▼
resolveAllConflicts()    ← hard-mandatory blocks; soft-mandatory deferred with justification
    │
    ▼
shouldSuggestPhasing()   ← (threat×0.40) + (size×0.30) + (resource×0.30) > 0.65
    │
    ▼
determinePhasedRecommendations()   ← Phase 1: hard-mandatory only / Phase 2: all applied
    │
    ▼
renderRecommendation()   ← Markdown output per rule
```

---

## Questionnaire tiers

| Tier | Always shown? | Example questions |
|------|---------------|-------------------|
| **Tier 1** | ✅ Always | Project stage, team size, AI pattern, compliance framework |
| **Tier 2** | Unlocked by Tier 1 answers | CI maturity, test maturity, observability level, doc expectations |
| **Tier 3** | Expert / high-signal projects | Threat level, security weight, reuse intent, deployment target |

Cohort routing:

- **Novice** — sandbox/PoC, solo/pair-trio, no compliance → minimal, advisory rules
- **Intermediate** — MVP/beta, small team, light compliance → balanced recommendations
- **Expert** — production/enterprise + compliance + AI patterns → full depth, phasing likely

---

## Expert flags

Any `PrecedenceContext` variable can be passed as a flag to skip the questionnaire.

### Enum flags

| Flag | Values |
|------|--------|
| `PROFILE_STAGE` | `sandbox` `PoC` `MVP` `beta` `production` `sunset-legacy` |
| `TEAM_SCALE` | `solo` `pair-trio` `small` `multi-team` `enterprise` |
| `THREAT_LEVEL` | `none` `low` `medium` `high` `critical` |
| `AI_PATTERN` | `none` `LLM API` `RAG` `fine-tuning` `agentic` `training` |
| `COMPLIANCE_FRAMEWORK` | `none` `GDPR` `ISO27001` `Cyber Essentials` `SOC2` `FedRAMP` `HIPAA` |
| `TEST_MATURITY` | `none` `unit` `unit+integration` `unit+integration+E2E` `contract` `chaos` |
| `CI_MATURITY` | `none` `basic` `full` `GitOps` `ADO` |
| `DEPLOYMENT_TARGET` | `local-dev` `cloud` `on-prem` `edge` `hybrid` `air-gapped` |

### Numeric flags (0–100)

| Flag | Meaning |
|------|---------|
| `SECURITY_WEIGHT` | Emphasis on security rules in scoring (default: 60) |
| `COMPLIANCE_WEIGHT` | Emphasis on compliance rules (default: 50) |
| `THREAT_WEIGHT` | Emphasis on threat-related rules (default: 40) |

---

## Rule format

Each rule template file is a JSON array of rule objects:

```json
{
  "id": "gdpr-breach-notification",
  "description": "Establish data breach notification procedures",
  "category": "process",
  "version": "1.0.0",
  "condition": {
    "contextVars": { "COMPLIANCE_FRAMEWORK": "GDPR" },
    "precedenceWeight": 96
  },
  "action": {
    "type": "audit",
    "recommendation": "Create a breach response plan (GDPR Art. 33/34)...",
    "files": [{ "path": "/docs/compliance/breach-notification.md", "template": "gdpr-breach.md" }],
    "enforcementLevel": "hard-mandatory"
  },
  "conflictsWith": [],
  "overrides": [],
  "rationale": "GDPR Arts. 33/34 require 72-hour notification to supervisory authorities."
}
```

### Enforcement levels

| Level | Behaviour |
|-------|-----------|
| `advisory` | Shown as a suggestion; never blocks |
| `soft-mandatory` | Recommended; can be deferred with justification |
| `hard-mandatory` | Cannot be overridden; blocks if a conflicting rule wins |

### contextVars matching

- **Single value**: `"PROFILE_STAGE": "production"` — exact match
- **Array value**: `"TEAM_SCALE": ["multi-team", "enterprise"]` — OR logic (any match fires)
- **Multiple keys**: all keys must match (AND logic across keys)
- **Empty `{}`**: rule fires for all contexts (generic/universal rules)

---

## Phasing logic

The phasing formula determines whether a project needs a two-phase audit:

```
phasingScore = (threatScore × 0.40) + (sizeScore × 0.30) + (resourceScore × 0.30)

phasingScore > 0.65  →  suggest phasing
```

| Component | Score |
|-----------|-------|
| Threat: none / low / medium / high / critical | 0 / 0.1 / 0.4 / 0.7 / 1.0 |
| Size: ≤50k / >50k / >100k / >500k lines | 0.2 / 0.5 / 0.7 / 1.0 |
| Resource: unlimited/none / minimal / moderate / severe | 0 / 0.3 / 0.6 / 1.0 |

When phasing is triggered:

- **Phase 1 — Triage (1-2 hours):** hard-mandatory rules only, quick-fix guide
- **Phase 2 — Comprehensive (1-3 days):** all applicable rules, full remediation roadmap

---

## Testing

```bash
npm run test:unit           # Unit tests (493 tests, 8 suites)
npm run test:e2e            # E2E scenario tests (80 tests, 5 suites)
npm run test:all            # Both with coverage report
npm run test:watch          # Watch mode for development
```

### Coverage (current)

| Metric | Coverage | Threshold |
|--------|----------|-----------|
| Statements | 95.19% | 88% |
| Branches | 90.15% | 82% |
| Functions | 98% | 88% |
| Lines | 96.56% | 88% |

### Test suites

| Suite | Tests | What it covers |
|-------|-------|----------------|
| `rule-filtering.test.ts` | ~60 | contextVars matching, AND/OR logic, edge cases |
| `precedence-scoring.test.ts` | ~70 | Formula, boosts, clamping, scoreRules batch |
| `phasing-logic.test.ts` | ~60 | Threat/size/resource scoring, phase structure |
| `conflict-resolution.test.ts` | ~50 | Hard-mandatory enforcement, override chains |
| `expert-flag-injection.test.ts` | ~70 | Enum validation, numeric bounds, error messages |
| `questionnaire-permutations.test.ts` | ~50 | All Tier 1/2/3 question paths, cohort routing |
| `recommendation-engine.test.ts` | ~83 | Full pipeline, fs mocking, 97.7% statement coverage |
| `adversarial-scenarios.test.ts` | ~30 | Malformed input, injection attempts, boundary abuse |
| `e2e-novice-fastpath.test.ts` | ~15 | Novice cohort: sandbox/PoC paths |
| `e2e-intermediate-conditional.test.ts` | ~15 | Intermediate cohort: conditional unlocks |
| `e2e-full-audit-flow.test.ts` | ~20 | Production + compliance + phasing end-to-end |
| `e2e-expert-full-control.test.ts` | ~15 | Expert flags bypass, all overrides |
| `e2e-real-codebases.test.ts` | ~15 | Multi-framework, agentic, enterprise scenarios |

---

## Development

### Project scripts

| Script | Description |
|--------|-------------|
| `npm run build` | Compile TypeScript to `dist/` |
| `npm run clean` | Remove `dist/` and `coverage/` (cross-platform) |
| `npm run lint` | Run ESLint on `src/` |
| `npm run test:unit` | Unit tests with coverage |
| `npm run test:e2e` | E2E scenario tests |
| `npm run test:watch` | Jest watch mode |

### Adding a new rule

1. Create or open the relevant template file in `.claude/audit-rules/templates/`
2. Append a rule object following the schema above
3. Add the rule `id` to `.claude/audit-rules/index.json` under the appropriate category
4. Write at least one unit test verifying the rule fires under the correct context
5. Run `npm run test:all` — all 573 tests must pass

### Adding a new questionnaire variable

1. Add the variable to `PrecedenceContext` in `src/types/audit.ts`
2. Add mapping logic in `src/functions/context-mapping.ts`
3. If it's an expert flag, add it to `ENUM_VALUES` or `WEIGHT_FIELDS` in `src/functions/expert-flags.ts`
4. Update `src/tests/questionnaire-permutations.test.ts` with new permutations

---

## Rule categories

| Category | Count | Description |
|----------|-------|-------------|
| `compliance` | ~30 | GDPR, ISO 27001, SOC2, FedRAMP, HIPAA, PCI DSS, EU AI Act, Cyber Essentials, NIST AI RMF |
| `security` | ~20 | Hard-mandatory security controls, LLM prompt injection, access control, cryptography |
| `process` | ~25 | CI/CD, runbooks, SRE practices, incident response, ADRs, disaster recovery |
| `testing` | ~15 | Unit → integration → E2E → contract → chaos maturity ladder |
| `tooling` | ~10 | Linting, formatters, artifact signing, API versioning |
| `structure` | ~5 | .gitignore, .env config, README, LICENSE |
| `naming` | ~3 | Code style, naming conventions |

---

## Licence

MIT — see [LICENSE](LICENSE) for details.
