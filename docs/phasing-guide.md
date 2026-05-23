# Phasing Guide: Triage vs Comprehensive

## When to Suggest Phasing

**Phasing Trigger Formula:**
```
score = (threat_weight × 0.40) + (codebase_size_weight × 0.30) + (resource_constraint_weight × 0.30)
Suggest phasing if score > 0.65
```

## Threat Scoring

| Level | Score |
|-------|-------|
| critical | 1.0 |
| high | 0.7 |
| medium | 0.4 |
| low | 0.1 |
| none | 0.0 |

## Codebase Size Scoring

| Lines | Score |
|-------|-------|
| > 500k | 1.0 |
| > 100k | 0.7 |
| > 50k | 0.5 |
| < 50k | 0.2 |

## Resource Constraint Scoring

| Level | Score |
|-------|-------|
| severe | 1.0 |
| moderate | 0.6 |
| standard | 0.3 |
| unlimited | 0.0 |

## Examples

### Example 1: Fintech (Phasing Suggested)
- Threat: critical (1.0) × 0.40 = 0.40
- Size: 100k lines (0.7) × 0.30 = 0.21
- Resource: severe (1.0) × 0.30 = 0.30
- **Score: 0.91 → Phase recommended**
  - Phase 1: Triage (1-2h) — critical findings + quick fixes
  - Phase 2: Comprehensive (3 days) — full SOC2 audit trail

### Example 2: Internal Tool (No Phasing)
- Threat: low (0.1) × 0.40 = 0.04
- Size: 20k lines (0.2) × 0.30 = 0.06
- Resource: standard (0.3) × 0.30 = 0.09
- **Score: 0.19 → Single comprehensive phase**

### Example 3: Startup Growth (Phasing Recommended)
- Threat: medium (0.4) × 0.40 = 0.16
- Size: 150k lines (0.7) × 0.30 = 0.21
- Resource: moderate (0.6) × 0.30 = 0.18
- **Score: 0.55 → No phasing (just below 0.65 threshold)**
  - But if resource constraint escalates → recalculate

## Compliance Implications

- **ISO27001/SOC2:** Built on phasing (readiness → formal audit)
- **HIPAA:** Phasing acceptable if comprehensive phase has clear timeline
- **GDPR:** Phasing acceptable for initial assessment → follow-up audit

## Troubleshooting

- **Large codebase but low threat:** No phasing (score stays low)
- **Critical threat but small codebase:** May not trigger (depends on resource)
- **Impossible timeline:** Suggest phasing even if score < 0.65
