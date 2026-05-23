---
name: test-review
description: >
  Orchestrates full adversarial test review workflow: runs adversarial evaluator
  against test file(s), collects Challenge Report, switches to test-writer to address
  blockers, re-evaluates, loops until "No further challenges" verdict.
  
support_modules:
  - agents/test-writer
  - agents/adversarial-evaluator

---

# Test Review — Adversarial Evaluation Orchestration

## Purpose

`/audit:test-review` runs a structured two-agent adversarial review against a test file or module:

1. **Adversarial Evaluator** reads tests and identifies coverage gaps, quality issues, implementation weaknesses, security logic flaws across 4 dimensions
2. Produces a **Challenge Report** with BLOCKER (must fix) and IMPROVEMENT (optional) items
3. **Test Writer** addresses all BLOCKER challenges by adding/updating tests
4. **Adversarial Evaluator** re-reviews to confirm challenges resolved
5. Loop until **"No further challenges"** verdict
6. Report final test count and coverage summary

---

## Usage

```bash
/audit:test-review recommendation-engine
/audit:test-review src/tests/conflict-resolver.test.ts
/audit:test-review --all      # Review all test files in src/tests/
```

---

## Workflow

### Phase 1: Initial Review (Adversarial Evaluator)

1. Parse the specified module or file path
2. Read test file(s) for that module
3. Switch to adversarial-evaluator agent
4. Review across 4 dimensions:
   - **Coverage Gaps**: Missing enum values, error paths, boundary conditions, Tier 1/2/3 permutations
   - **Test Quality**: Specific assertions, mock correctness, test independence
   - **Implementation Weaknesses**: Crash scenarios, off-by-one, async edge cases, conflict resolution stability
   - **Security Logic Flaws**: Compliance bypass, precedence enforcement, rule filtering integrity, phasing logic
5. Produce structured Challenge Report

### Phase 2: Address BLOCKER Challenges (Test Writer)

1. Switch to test-writer agent
2. For each BLOCKER challenge:
   - Add missing test(s)
   - Strengthen assertions
   - Verify mock contracts
   - Ensure no hard-mandatory rule overrides in conflict scenarios
3. Run test suite locally: `npm run test:unit`
4. Update test file(s)
5. Request re-review

### Phase 3: Re-Evaluate (Adversarial Evaluator)

1. Switch back to adversarial-evaluator
2. Read updated test file(s)
3. Verify each previous BLOCKER was addressed
4. Identify any new gaps introduced by test changes
5. Either issue "No further challenges" or raise new challenges

### Phase 4: Loop or Ship

- If new BLOCKERs: return to Phase 2 (Test Writer addresses them)
- If only IMPROVEMENTs: Test Writer addresses if low-effort, notes if complex
- If "No further challenges": Report summary and confirm ready for implementation

---

## Challenge Report Example

```
## Adversarial Evaluation Report
**Module:** recommendation-engine
**Test file:** src/tests/recommendation-engine.test.ts
**Review round:** 1

### BLOCKER Challenges

[B1] COVERAGE GAP — Missing test for COMPLIANCE_FRAMEWORK override of PROFILE_STAGE
     Gap: When COMPLIANCE_FRAMEWORK=SOC2 and PROFILE_STAGE=PoC, compliance rules should NOT be suppressed
     Why it matters: PoC with compliance requirement should enforce production-grade audit
     Example: Context {PROFILE_STAGE: 'PoC', COMPLIANCE_FRAMEWORK: 'SOC2'} → must include CC6.1 access control rules

[B2] COVERAGE GAP — No test for phasing score exactly at boundary (0.65)
     Gap: Implementation uses (threat × 0.40) + (size × 0.30) + (resource × 0.30) > 0.65
     Why it matters: Need to verify > vs >= distinction at boundary
     Example: Score = 0.65 should NOT suggest phasing; 0.651 should

[B3] SECURITY LOGIC — Missing conflict scenario where two rules both hard-mandatory and conflicting
     Gap: When ruleA {conflictsWith: ['ruleB'], enforcementLevel: 'hard-mandatory'} and
          ruleB {enforcementLevel: 'hard-mandatory'}, implementation should handle without override
     Why it matters: Could silently break audit integrity if validation missing
     Example: Two incompatible hard-mandatory rules in same context → error or specific precedence?

### IMPROVEMENT Challenges

[I1] COVERAGE — Single context variable tests could be expanded to multi-variable combinations
     Suggest: Test COMPLIANCE_FRAMEWORK=SOC2 + THREAT_LEVEL=critical together

### Summary
3 BLOCKER challenges require resolution before this module ships.
1 IMPROVEMENT challenge is optional but recommended.
```

---

## Four Challenge Dimensions

### 1. Coverage Gaps
- Enum values: all PROFILE_STAGE, THREAT_LEVEL, COMPLIANCE_FRAMEWORK, AI_PATTERN, CRITICALITY_TIER values?
- Error paths: missing files, malformed JSON, invalid context, empty arrays, null values?
- Questionnaire permutations: Tier 1 alone, Tier 1→2 conditional, Tier 1→2→3 expert?
- Boundary values: precedenceWeight at thresholds, phasing score at 0.65?
- Conflict scenarios: explicit overrides, precedence ties, hard-mandatory validation?

### 2. Test Quality
- Assertions specific? (exact values vs generic `.toBeTruthy()`)
- Mock contracts verified? (function names, return shapes, parameters match real API)
- Tests independent? (no state leakage between tests)
- LLM/rule assertions using pattern matching? (not exact string match)
- Deduplication verified? (if multiple rules match, all included, no duplicates)

### 3. Implementation Weaknesses
- Crash scenarios: invalid enum, missing field, null context?
- Off-by-one: array indexing, rule filtering, precedence sorting?
- Async edge cases: concurrent rule loading, file system races?
- Boundary stability: same input always produces same output?
- Conflict resolution: stable winner selection, no indeterminate states?

### 4. Security Logic Flaws
- Compliance bypass: can a crafted context evade compliance rules?
- Precedence enforcement: does COMPLIANCE override PROFILE_STAGE in all cases?
- Rule filtering integrity: do critical rules get filtered out unintentionally?
- Phasing logic: can threat override be ignored if resources limited?
- Pattern detection: agentic vs RAG confusion, false positives?
- Multi-compliance handling: SOC2 + GDPR + ISO27001 rules merged correctly?

---

## Integration with Build Process

Run test review BEFORE writing implementation:

```
1. Test Writer writes test suite (TDD-first)
2. Adversarial Evaluator challenges it
3. Test Writer addresses all BLOCKERs
4. Adversarial Evaluator confirms "No further challenges"
5. **THEN** write implementation to make tests pass
6. Final Adversarial Evaluator check (post-implementation verification)
7. Ship
```

---

## Output Summary

After "No further challenges" verdict:

```
## Final Summary
✅ recommendation-engine test suite approved for implementation

Test Count: 32 tests (23 unit + 9 integration)
Coverage:
- Context inference: 8 tests (all enum values + 2 error paths)
- Rule filtering: 6 tests (single var + 3 combinations)
- Precedence scoring: 5 tests (all weights + boundary)
- Conflict resolution: 7 tests (overrides + precedence + hard-mandatory validation)
- Phasing logic: 4 tests (at boundary 0.65, above, below, edge cases)
- Error paths: 2 tests (malformed JSON, missing rules)

BLOCKER challenges resolved: 3/3
IMPROVEMENT challenges addressed: 1/1
Re-review rounds: 2

Ready to implement: YES
```
