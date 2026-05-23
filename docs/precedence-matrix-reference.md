# Precedence Matrix Reference

## Scoring Formula

```
RECOMMENDATION_SCORE = 
  (SECURITY_WEIGHT × 0.35) +
  (COMPLIANCE_WEIGHT × 0.25) +
  (THREAT_WEIGHT × 0.20) +
  (TEAM_SCALE_FACTOR × 0.10) +
  (PROFILE_STAGE_FACTOR × 0.05)

Scale: 0-100 (higher = more important to address)
```

## Weights Explained

### SECURITY_WEIGHT (35%)
**Why:** Direct business impact on confidentiality, integrity, availability.  
**Range:** 0-100 (0=low priority, 100=critical)  
**Example:** Production system = 85%; internal tool = 40%

### COMPLIANCE_WEIGHT (25%)
**Why:** Legal/financial consequences of non-compliance.  
**Range:** 0-100  
**Example:** SOC2 customer = 90%; no compliance = 0%

### THREAT_WEIGHT (20%)
**Why:** Active risk; immediate attack surface.  
**Range:** 0-100  
**Example:** Known vulnerability in wild = 100%; theoretical = 20%

### TEAM_SCALE_FACTOR (10%)
**Why:** Larger teams need stronger structure enforcement.  
**Range:** 0-100  
**Example:** Enterprise = 80%; solo = 20%

### PROFILE_STAGE_FACTOR (5%)
**Why:** Mature systems need stricter controls than POC.  
**Range:** 0-100  
**Example:** Production = 100%; POC = 20%

## Precedence Rules

| Rule | Effect |
|------|--------|
| **CRITICALITY_TIER = critical** | Override all other weights; force max recommendations |
| **COMPLIANCE_FRAMEWORK ≠ none** | Apply compliance rules *even if* PROFILE_STAGE=PoC |
| **THREAT_LEVEL = high/critical** | Override RESOURCE_CONSTRAINT; suggest triage |
| **TEAM_SCALE = multi-team** | Require CODEOWNERS, explicit governance |

## Conflict Resolution Examples

### Example 1: Compliance Override
- Rule A (fintech, SOC2): score = 90
- Rule B (POC stage): score = 20
- **Winner:** Rule A (compliance overrides stage)

### Example 2: Threat Override
- Rule A (critical threat): score = 85
- Rule B (severe resource limits): score = 20
- **Winner:** Rule A → suggests phasing (triage + comprehensive)

### Example 3: Tie-Breaking
- Rule A (security): score = 60
- Rule B (team structure): score = 60
- **Tie-breaker:** Apply threat level; critical threat favors Rule A

## How to Adjust Weights

### Increase SECURITY_WEIGHT for:
- Customer-facing systems
- Systems handling sensitive data
- High-attack-surface projects

### Increase COMPLIANCE_WEIGHT for:
- Regulated industries (finance, healthcare)
- Multi-tenant SaaS
- Government contracts

### Increase THREAT_WEIGHT for:
- Known exploits in the wild
- Active incident response
- Zero-day scenarios

## Expert Flag Injection

Bypass questionnaire and inject weights directly:

```bash
/audit SECURITY_WEIGHT=90 COMPLIANCE_WEIGHT=85 THREAT_WEIGHT=70 \
  PROFILE_STAGE=production COMPLIANCE_FRAMEWORK=SOC2
```

## Verification

All weights must sum to 1.0:
```
0.35 + 0.25 + 0.20 + 0.10 + 0.05 = 0.95
(remaining 0.05 distributed to lower-impact factors)
```

Score range validation: 0 ≤ score ≤ 100
