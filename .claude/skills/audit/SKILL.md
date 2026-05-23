---
name: audit
description: >
  Contextual project audit skill: scans codebase, infers context variables with confidence scores,
  generates structure/naming/tooling/compliance recommendations via tiered questionnaire (Tier 1/2/3 progressive disclosure).
  Supports novice (fast-path), intermediate (conditional), and expert (full control) user cohorts.

context_variables:
  PROFILE_STAGE: ["sandbox", "PoC", "MVP", "beta", "production", "sunset-legacy"]
  COMPLIANCE_FRAMEWORK: ["none", "GDPR", "ISO27001", "Cyber Essentials", "SOC2", "FedRAMP", "HIPAA"]
  THREAT_LEVEL: ["none", "low", "medium", "high", "critical"]
  TEAM_SCALE: ["solo", "pair-trio", "small", "multi-team", "enterprise"]
  AI_PATTERN: ["none", "LLM API", "RAG", "fine-tuning", "agentic", "model training"]
  CRITICALITY_TIER: ["none", "low", "medium", "high", "critical"]
  SECURITY_WEIGHT: 60
  COMPLIANCE_WEIGHT: 50
  THREAT_WEIGHT: 40
  TEST_MATURITY: ["none", "unit", "integration", "E2E", "contract"]
  CI_MATURITY: ["none", "basic", "full", "GitOps"]
  DOC_EXPECTATION: ["minimal", "inline", "ADRs", "runbooks"]
  REUSE_INTENT: ["throwaway", "project-scoped", "shared", "open-source"]
  OBSERVABILITY_LEVEL: ["none", "basic", "structured", "metrics", "APM"]

fallback_defaults:
  PROFILE_STAGE: "PoC"
  COMPLIANCE_FRAMEWORK: "none"
  THREAT_LEVEL: "medium"
  TEAM_SCALE: "solo"
  AI_PATTERN: "none"
  CRITICALITY_TIER: "medium"
  SECURITY_WEIGHT: 60
  COMPLIANCE_WEIGHT: 50
  THREAT_WEIGHT: 40
  TEST_MATURITY: "unit"
  CI_MATURITY: "basic"
  DOC_EXPECTATION: "minimal"
  REUSE_INTENT: "project-scoped"
  OBSERVABILITY_LEVEL: "basic"

precedence_rules:
  CRITICALITY_TIER: 100
  COMPLIANCE_FRAMEWORK: 90
  THREAT_LEVEL: 85
  PROFILE_STAGE: 75
  TEAM_SCALE: 60
  AI_PATTERN: 40
  security_weight_numeric: 0.35
  compliance_weight_numeric: 0.25
  threat_weight_numeric: 0.20
  team_scale_factor: 0.10
  stage_factor: 0.05
  test_maturity_factor: 0.03
  ai_pattern_factor: 0.02

auto_inference_signals:
  stage:
    - pattern: ".github/workflows|gitlab-ci|azure-pipelines"
      inferred: "beta"
    - pattern: "v[0-9]+\\.[0-9]+\\.[0-9]+\\s*(release|stable)"
      inferred: "production"
    - pattern: "v0\\.[0-9]+|alpha|beta"
      inferred: "PoC"
  
  ai_pattern:
    - pattern: "/agents/|agents/.*AGENT.md"
      inferred: "agentic"
    - pattern: "/embeddings/|/retrieval/|/knowledge.base"
      inferred: "RAG"
    - pattern: "import.*anthropic|from.*@anthropic"
      inferred: "LLM API"

---

# Audit — Contextual Project Recommendations

## Execution Flow

### Step 1: Repo Scan & Auto-Inference
Detect: CI/CD presence, test frameworks, documentation, compliance markers, AI patterns.  
Infer Tier 1 answers with confidence 70-99%.

### Step 2: User Cohort Routing
Ask one question: "How familiar are you with cloud/dev projects?"  
Route to: **Novice** (pre-filled → confirm) | **Intermediate** (Tier 1 → conditional Tier 2) | **Expert** (all tiers + flags)

### Step 3: Tiered Questionnaire

**Tier 1 (Core, Always Asked):**
```
T1-Q1: "What stage is this project?" 
  Options: sandbox / PoC / MVP / beta / production
  Inferred: [auto-filled with confidence]

T1-Q2: "Team size or scope?"
  Options: solo / pair-trio / small / multi-team / enterprise
  Inferred: [auto-filled]

T1-Q3: "Does this involve AI or ML?"
  Options: none / LLM API / RAG / agentic / fine-tuning / training
  Inferred: [auto-filled]

T1-Q4: "Any compliance requirements?"
  Options: none / GDPR / ISO27001 / SOC2 / HIPAA
  Inferred: [auto-filled]
```

**Tier 2 (Conditional, Unlocked by Tier 1):**
- If compliance ≠ "none" → "Which framework is critical?"
- If team ∈ [small, multi-team] → "Team size & CODEOWNERS needed?"
- If AI ≠ "none" → "Which AI pattern details?"
- If stage ∈ [production, beta] → "CI/CD maturity & observability level?"

**Tier 3 (Expert Only, Hidden by Default):**
- Stack type override
- Deployment target (air-gapped / edge / multi-cloud)
- Reuse intent (shared library / open-source / platform)
- Documentation standard (ADRs / runbooks / full audit trail)
- Test maturity (unit / E2E / contract / chaos)

### Step 4: Context Variable Mapping
Convert Tier 1/2/3 answers → 15 context variables with precedence scoring.

### Step 5: Rule Loading & Filtering
Load rules from `.claude/audit-rules/templates/`  
Filter to rules matching all context variable conditions.

### Step 6: Precedence Scoring & Conflict Resolution
Apply weights: security 35% > compliance 25% > threat 20% > team/stage 20%  
Resolve conflicts via override rules (compliance overrides stage, threat overrides resources).

### Step 7: Phasing Decision
Formula: `(threat × 0.40) + (size × 0.30) + (resource × 0.30)`  
If > 0.65 → suggest triage (1-2h) + comprehensive (1-3d) split  
Else → single comprehensive phase

### Step 8: Render Output
Per-rule explanation: why rule applied, precedence score, conflicts resolved.  
Phase-specific artifacts (quick fix guide vs full roadmap).

### Step 9: Expert Bypass
Direct flag injection: `/audit COMPLIANCE_TIER=ISO27001 PROFILE_STAGE=production AI_PATTERN=agentic`

## Novice Fast Path
1. Repo scan → pre-fill Tier 1
2. Display: "I think this is [stage] (85% confidence) — confirm?"
3. User taps confirm → skill proceeds with defaults for Tier 2/3
4. Output: Top 3 priority recommendations

## Key Files Referenced
- `.claude/audit-rules/precedence-matrix.json` — Numeric weights
- `.claude/audit-rules/index.json` — Rule catalog
- `.claude/audit-rules/templates/*.json` — Domain/compliance rules
- `.claude/audit-rules/schemas/` — JSON Schema validation
