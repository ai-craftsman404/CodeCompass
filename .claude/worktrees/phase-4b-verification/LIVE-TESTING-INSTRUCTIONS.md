# Phase 4B-3: Live Testing Instructions

**Objective:** Execute interactive testing of the `/audit` skill on CodeCompass project  
**Date:** 2026-05-23  
**Status:** READY TO EXECUTE

---

## Pre-Testing Checklist

Before starting live tests, verify:

- ✅ Working directory is CodeCompass: `C:\Users\georg\claude-code-project\CodeCompass`
- ✅ SKILL.md exists: `.claude/skills/audit/SKILL.md`
- ✅ Rules exist: `.claude/audit-rules/index.json`, `precedence-matrix.json`
- ✅ Settings configured: `.claude/settings.json` with audit skill enabled
- ✅ Claude Code harness is ready to invoke `/audit` skill

---

## Test Scenario A: Novice Fast Path

**Objective:** Verify pre-fill and confirm flow  
**Duration:** ~30 seconds  
**Difficulty:** Easy

### Steps

1. **Run the skill:**
   ```
   /audit
   ```

2. **Answer cohort question:**
   When asked: "How familiar are you with cloud/dev projects?"
   → Select: **"Just learning"** (or Novice option)

3. **Verify Tier 1 pre-fill:**
   You should see:
   ```
   "What stage is this project?"
   Pre-filled: PoC (75% confidence)
   [Confirm] [Override]
   
   "Team size or scope?"
   Pre-filled: pair-trio (80% confidence)
   [Confirm] [Override]
   
   "Does this involve AI or ML?"
   Pre-filled: none (85% confidence)
   [Confirm] [Override]
   
   "Any compliance requirements?"
   Pre-filled: none (95% confidence)
   [Confirm] [Override]
   ```

4. **Tap Confirm All (or confirm each):**
   → Skill should skip Tier 2 and go to output

5. **Verify output:**
   - [ ] Phasing decision stated (single phase expected)
   - [ ] 0-3 recommendations shown (no agentic/RAG/SOC2 rules expected)
   - [ ] Confidence scores included
   - [ ] Each recommendation shows precedence score
   - [ ] Conflict log shown (empty expected)

### Expected Results

**Output should include:**
```
Phasing Decision:
Single comprehensive phase recommended
(Score: 0.45 < 0.65 threshold)

Recommendations:
0-3 generic rules applied (none from agentic/RAG/SOC2 sets)

Confidence Scores:
PROFILE_STAGE (PoC): 75%
TEAM_SCALE (pair-trio): 80%
AI_PATTERN (none): 85%
COMPLIANCE_FRAMEWORK (none): 95%

Conflict Log:
No conflicts detected
```

**Pass Criteria:**
- ✅ Pre-filled answers appear with confidence scores
- ✅ User can confirm all answers
- ✅ Output renders with required sections
- ✅ No agentic/RAG/SOC2 rules included
- ✅ Phasing decision matches formula

---

## Test Scenario B: Intermediate Conditional Flow

**Objective:** Verify Tier 2 conditional unlocking  
**Duration:** ~2-3 minutes  
**Difficulty:** Medium

### Steps

1. **Run the skill:**
   ```
   /audit
   ```

2. **Answer cohort question:**
   When asked: "How familiar are you with cloud/dev projects?"
   → Select: **"Some experience"** (or Intermediate option)

3. **Answer Tier 1 questions:**
   When presented with pre-filled answers:
   - Q1 Stage: Keep "PoC" (or override and re-confirm)
   - Q2 Team: Keep "pair-trio" (or override)
   - Q3 AI: Keep "none" (or override)
   - Q4 Compliance: Keep "none" (or override)

4. **Verify Tier 2 conditional logic:**
   You should NOT see these questions (because of context):
   - ❌ "Which framework is critical?" (only if compliance != none)
   - ❌ "CODEOWNERS needed?" (only if team IN [small, multi-team])
   - ❌ "Which AI pattern details?" (only if AI != none)
   - ❌ "CI/CD maturity?" (only if stage IN [production, beta])
   
   Expected Tier 2 unlocks: **0 questions** (all conditions false)

5. **Verify output:**
   - [ ] All Tier 1 questions answered
   - [ ] 0 Tier 2 questions shown (conditional logic correct)
   - [ ] Full recommendations with precedence scores
   - [ ] Per-rule explanation includes why rule applied
   - [ ] Conflict resolution log present

### Expected Results

**Output should include:**
```
Tier 1 Answers Confirmed:
- PROFILE_STAGE: PoC
- TEAM_SCALE: pair-trio
- AI_PATTERN: none
- COMPLIANCE_FRAMEWORK: none

Tier 2 Conditional Check:
No Tier 2 questions unlocked (all conditions false)

Recommendations:
Per-rule explanation:
  Rule ID: [example-rule]
  Category: [category]
  Precedence Score: XX/100
  Why Applied: [rationale with context variable reference]
  Artifacts: [files listed]
  Enforcement: [level]

Conflict Log:
No conflicts detected
```

### Pass Criteria
- ✅ Tier 2 conditional logic works (0 questions unlocked is correct)
- ✅ Per-rule explanation includes precedence score
- ✅ Rationale references context variables
- ✅ All required output sections present

---

## Test Scenario C: Expert Bypass (Flag Injection)

**Objective:** Verify flag injection skips questionnaire  
**Duration:** ~10 seconds  
**Difficulty:** Easy (if skill supports it)

### Steps

1. **Run skill with flags:**
   ```
   /audit PROFILE_STAGE=production COMPLIANCE_FRAMEWORK=ISO27001 AI_PATTERN=agentic
   ```

2. **Verify questionnaire skip:**
   - ❌ Cohort routing question should NOT appear
   - ❌ Tier 1 questions should NOT appear
   - ❌ Tier 2 questions should NOT appear
   - ❌ Tier 3 questions should NOT appear
   → Go directly to output

3. **Verify flags applied to context:**
   Output should show:
   ```
   Context Variables (Injected via flags):
   - PROFILE_STAGE: production (via flag)
   - COMPLIANCE_FRAMEWORK: ISO27001 (via flag)
   - AI_PATTERN: agentic (via flag)
   ```

4. **Verify rule filtering by flags:**
   Expected rules included:
   - 5 agentic rules (due to AI_PATTERN=agentic)
   - [0-5 ISO27001 rules if available] (due to COMPLIANCE_FRAMEWORK=ISO27001)
   - [0+ production-stage rules if available]
   
   NOT included:
   - RAG rules (AI_PATTERN != RAG)
   - SOC2 rules (COMPLIANCE_FRAMEWORK != SOC2)

5. **Verify output:**
   - [ ] Phasing decision calculated with new context
   - [ ] Agentic rules included
   - [ ] Output reflects production stage (likely higher urgency)
   - [ ] No conflicting recommendations

### Expected Results

**Output should include:**
```
EXPERT MODE: Direct Flag Injection
Context Variables Injected:
- PROFILE_STAGE = production
- COMPLIANCE_FRAMEWORK = ISO27001
- AI_PATTERN = agentic

Rules Applied (5 Agentic + ISO27001):
[1] folder-structure-agentic (weight: 85)
[2] mcp-integration-required (weight: 80)
[3] agent-orchestration-pattern (weight: 75)
[4] agentic-testing-strategy (weight: 70)
[5] agent-memory-persistence (weight: 60)
[6-N] ISO27001 rules (if available in templates)

Phasing Decision:
[Recalculated with production stage and agentic complexity]

Output: Full audit report
```

### Pass Criteria
- ✅ Questionnaire completely skipped
- ✅ Flags directly applied to context
- ✅ Rule filtering respects flag-injected variables
- ✅ Agentic rules included (5 rules)
- ✅ Output generated without user interaction

---

## Test Scenario D: Edge Cases (Optional Advanced Testing)

### Test D1: Override Inferred Answer

1. Run `/audit` → Novice path
2. When Tier 1 pre-fill shown, tap "Override" on one question
3. Change answer (e.g., stage from "PoC" to "beta")
4. Verify:
   - [ ] Override is accepted
   - [ ] New confidence score shown for changed variable
   - [ ] Rule filtering adjusts to new value
   - [ ] Output recommendations update accordingly

**Expected:** Tier 2 questions should unlock (beta stage triggers CI/CD maturity question in intermediate mode)

### Test D2: Conflicting Context Variables

If you can inject conflicting flags:
```
/audit CRITICALITY_TIER=critical PROFILE_STAGE=sandbox THREAT_LEVEL=high
```

Verify:
- [ ] Conflict log shows which rules apply
- [ ] CRITICALITY_TIER (weight 100) overrides PROFILE_STAGE (weight 75)
- [ ] Output shows security recommendations despite sandbox stage
- [ ] Rationale explains precedence override

**Expected:** Hard-mandatory security rules included even in sandbox stage

### Test D3: Minimal Context (All Defaults)

Run with minimal signals:
```
/audit
```

In Novice mode, confirm all defaults without override.

Verify:
- [ ] Skill runs with fallback defaults only
- [ ] Recommendations match lowest-risk profile (PoC, solo, none AI, none compliance)
- [ ] Output is meaningful despite minimal context

---

## Success Criteria Summary

### All Scenarios Must Pass:
- [x] A: Novice path pre-fills, confirms, outputs correctly
- [x] B: Intermediate path shows correct Tier 2 conditionals
- [x] C: Expert bypass skips questionnaire, applies flags
- [x] D: Edge cases handled properly (if tested)

### Output Requirements (All Tests):
1. Phasing decision clearly stated
2. Per-rule explanation with precedence score
3. Context variable list shown with confidence scores
4. Conflict resolution log (even if empty)
5. Summary statistics (rules considered, applied, skipped)
6. Artifact files listed for each recommendation
7. Enforcement levels specified (hard-mandatory, soft-mandatory, advisory)

### No Regressions:
- [ ] Skill doesn't crash on any input
- [ ] No hallucinated rules (only from index.json)
- [ ] Confidence scores stay in 70-99% range
- [ ] Precedence scoring is deterministic (same input = same score)

---

## Debugging & Troubleshooting

### If Pre-Fill Doesn't Appear:
1. Check inference signals: Are the expected patterns in CodeCompass?
2. Verify auto-inference patterns in SKILL.md match project structure
3. Check fallback defaults are applied (all variables should have values)
4. Look for errors in rules JSON (malformed JSON skips inference)

### If Tier 2 Conditional Logic Doesn't Work:
1. Verify conditional rules in SKILL.md match context variable values
2. Check if Tier 1 answers correctly set context variables
3. Trace rule filtering logic (index.json filters by context)
4. Verify rule conditions in template files use correct operators (==, IN, !=)

### If Expert Flags Don't Apply:
1. Verify `allowDirectFlagInjection: true` in settings.json
2. Check flag names match context variable names exactly (case-sensitive)
3. Verify flag values exist in context variable type arrays (SKILL.md)
4. Look for errors in flag parsing/mapping logic

### If Output Has Missing Sections:
1. Verify phasing formula is implemented (not just output)
2. Check per-rule explanation template includes all required fields
3. Verify conflict resolution log is populated (even if empty)
4. Ensure summary statistics are calculated correctly

---

## Success Metrics

**Test A (Novice):** ✅ Pass if output appears with pre-fill and no errors  
**Test B (Intermediate):** ✅ Pass if Tier 2 conditional unlocking works correctly  
**Test C (Expert):** ✅ Pass if questionnaire is skipped and flags applied  
**Test D (Edge Cases):** ✅ Pass if overrides and conflicts handled properly  

**Overall Status:** 🟢 READY FOR TESTING

Once all tests pass, Phase 4B-3 is **COMPLETE** and skill is production-ready.

---

## Post-Testing Deliverables

After live testing completes, create final report with:

1. **Test Results Summary**
   - [ ] Test A: PASS/FAIL with details
   - [ ] Test B: PASS/FAIL with details
   - [ ] Test C: PASS/FAIL with details
   - [ ] Test D: PASS/FAIL with details (if executed)

2. **Output Samples**
   - [ ] Screenshot of Novice output
   - [ ] Screenshot of Intermediate output
   - [ ] Screenshot of Expert output
   - [ ] Any error messages (if failures occur)

3. **Production Readiness Assessment**
   - [ ] All infrastructure verified ✅
   - [ ] All tests passed ✅
   - [ ] No regressions detected ✅
   - [ ] Ready for production deployment ✅

4. **Recommendation**
   - [ ] APPROVE for production release
   - [ ] OR REMEDIATE and retry specific tests

---

**Testing Ready:** YES  
**Last Updated:** 2026-05-23 15:50 UTC  
**Next Phase:** Live Interactive Testing

