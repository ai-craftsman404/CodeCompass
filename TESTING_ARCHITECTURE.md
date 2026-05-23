# CodeCompass — Adversarial Testing Architecture

## Overview

CodeCompass uses an **adversarial two-agent testing model** for its own development process.
Rather than a single agent writing and reviewing tests, two specialist agents with
opposing objectives collaborate to produce a more robust test suite.

This mirrors CodeCompass's core philosophy — rigorous context inference and precedence-based decision making
is now applied to the quality of CodeCompass's own code.

---

## The Two Agents

### Agent 1: Test Writer (`agents/test-writer/`)
**Objective:** Write the most comprehensive test suite possible for a given module.

**Responsibilities:**
- Write Vitest unit tests following TDD conventions
- Cover happy path, edge cases, boundary conditions, and error paths
- Mock CodeCompass audit modules correctly — matching real API contracts
- Write tests before implementation (strict TDD order)
- Address challenges raised by the Adversarial Evaluator

**Knows:**
- CodeCompass module conventions and file structure
- Existing test patterns from implementation phases
- The CLAUDE.md testing rules (no exact LLM string matching, fix root cause not assertions)
- All rule template files and their JSON schemas

---

### Agent 2: Adversarial Evaluator (`agents/adversarial-evaluator/`)
**Objective:** Find every way the Test Writer's tests could fail to catch a real bug.

**Challenges on four dimensions:**

#### 1. Test Coverage Gaps
- What questionnaire branches, rule combinations, or context paths are NOT tested?
- Are all context variable enum values tested (all PROFILE_STAGE values, all THREAT_LEVEL values)?
- Are error paths tested (missing rules files, malformed JSON, invalid context, empty arrays)?
- Are all Tier 1/2/3 permutations tested (novice fast-path, intermediate conditional, expert)?
- Are boundary values tested (precedenceWeight at exact thresholds, phasing score at 0.65)?
- Are all rule conflict scenarios tested (explicit overrides, precedence winner, no hard-mandatory override)?

#### 2. Test Quality
- Are assertions specific enough? (`.toBe('SOC2')` vs `.toBeTruthy()`)
- Could a test pass even if the implementation is completely wrong?
- Are any tests testing the mock rather than the real logic?
- Are rule recommendation assertions specific (checking actual rule IDs, not just presence)?
- Are tests independent — would running them in any order still pass?
- Do tests verify WHAT rules are recommended, not just that recommendations exist?

#### 3. Implementation Weaknesses
- What inputs could cause the implementation to crash that no test covers?
- What happens at the exact boundary of phasing score (0.65), precedenceWeight thresholds?
- Are there off-by-one errors in rule filtering, array ordering, or conflict resolution?
- What happens when a context variable is missing, null, or invalid?
- What happens when a rule file is corrupted, empty, or missing required fields?
- What happens when two rules have identical precedenceWeight (tie-breaking logic)?

#### 4. Security Logic Flaws
- Could a carefully crafted context bypass compliance enforcement?
- Does compliance precedence correctly override PROFILE_STAGE in all scenarios?
- Are there inputs where rule filtering would silently drop critical rules?
- Could phasing logic suggest triage when comprehensive audit is mandatory?
- Are severity/priority ratings consistent — would the same context always get the same recommendations?
- For AI patterns: does RAG detection avoid false positives (agentic vs RAG confusion)?

---

## Workflow

```
Feature requirement
        ↓
  [Test Writer]         writes initial test suite for the module
        ↓
  [Adversarial          reviews tests on all 4 dimensions
   Evaluator]           produces structured Challenge Report
        ↓
  Challenge Report      lists specific gaps, weak assertions,
                        uncovered paths, security logic flaws
        ↓
  [Test Writer]         addresses each challenge — adds missing
                        tests, strengthens assertions, fixes logic
        ↓
  [Adversarial          re-reviews — confirms challenges addressed
   Evaluator]           raises any new challenges found
        ↓
  loop until Evaluator  confirms "No further challenges"
        ↓
  Implementation        written to make the agreed test suite pass
        ↓
  [Adversarial          final check — does implementation introduce
   Evaluator]           any paths the tests still don't cover?
        ↓
  ✅ Ship
```

---

## Files

### `agents/test-writer/AGENT.md`
Specialist agent for writing CodeCompass test suites.

**System context loaded:**
- CodeCompass testing conventions (Vitest, mock patterns, rule template structure)
- CLAUDE.md rules (no exact LLM string matching, fix root cause)
- All existing test file patterns
- CodeCompass rule schema and context variable definitions

**Tool access:** Read, Write, Bash (run tests), Glob, Grep

**Behaviour rules:**
- Always write tests BEFORE implementation files
- Always mock CodeCompass audit modules at module level, not inside individual tests
- Always test all enum values for every enum parameter (PROFILE_STAGE, THREAT_LEVEL, AI_PATTERN, etc.)
- Always include at least one test for missing required params
- Always include at least one test for each error path
- Never use `.toBeTruthy()` or `.toBeDefined()` where a more specific assertion exists
- Never assert exact rule recommendation strings — use specific rule ID checks or pattern matching

---

### `agents/adversarial-evaluator/AGENT.md`
Adversarial specialist agent for challenging CodeCompass test suites.

**System context loaded:**
- All four challenge dimensions (coverage gaps, quality, implementation weaknesses, security logic flaws)
- CodeCompass module architecture (context inference, rule filtering, precedence scoring, phasing)
- Common patterns that cause false negatives in audit recommendations
- CodeCompass API contracts (correct function names, return shapes, parameter order)

**Tool access:** Read, Glob, Grep (read-only — evaluator never writes code)

**Behaviour rules:**
- NEVER fix issues — only identify and describe them precisely
- For each challenge, provide: dimension, specific gap, why it matters,
  and a concrete example of a bug it would miss
- Rate each challenge: BLOCKER (would miss a real bug) or IMPROVEMENT (would strengthen confidence)
- Do not raise challenges about style or formatting — only functional gaps
- When re-reviewing, explicitly confirm which previous challenges were addressed
  and which were not
- Issue "No further challenges" verdict only when all BLOCKER challenges are resolved

---

### `skills/test-review/SKILL.md` → `/audit:test-review`
Orchestrates the full adversarial review workflow for a given test file or module.

**Usage:** `/audit:test-review $ARGUMENTS`
Where `$ARGUMENTS` is a module name (e.g. `recommendation-engine`) or a test file path.

**Behaviour:**
1. Read the test file(s) for the specified module
2. Switch to `adversarial-evaluator` agent — run full review across all 4 dimensions
3. Present the Challenge Report to the user
4. Switch to `test-writer` agent — address all BLOCKER challenges
5. Switch back to `adversarial-evaluator` — re-review
6. Repeat until "No further challenges" verdict
7. Confirm final test count and coverage summary

---

## Challenge Report Format

The Adversarial Evaluator produces a structured report after each review:

```
## Adversarial Evaluation Report
**Module:** recommendation-engine
**Test file:** src/tests/recommendation-engine.test.ts
**Review round:** 1

### BLOCKER Challenges

[B1] COVERAGE GAP — Missing test for COMPLIANCE_FRAMEWORK override of PROFILE_STAGE
     Why it matters: Implementation may not enforce compliance precedence
     Bug it would miss: PoC + SOC2 → skips CC6.1 access control requirements

[B2] TEST QUALITY — Phasing assertion uses .toBeTruthy() — too broad
     Why it matters: Any non-empty result passes; implementation may suggest single phase when triage needed
     Bug it would miss: Critical threat + 100k LOC + severe resources → suggests comprehensive (should be triage first)

[B3] SECURITY LOGIC — No test for conflicting rules where both are hard-mandatory
     Why it matters: Implementation may not validate conflict resolution correctly
     Bug it would miss: Two hard-mandatory rules override each other (invalid precedence state)

### IMPROVEMENT Challenges

[I1] TEST QUALITY — Rule filtering test only checks single context variable
     Suggest testing combinations: COMPLIANCE_FRAMEWORK=SOC2 + THREAT_LEVEL=critical

### Summary
3 BLOCKER challenges require resolution before this module ships.
1 IMPROVEMENT challenge is optional but recommended.
```

---

## Integration with CodeCompass Build

Apply the adversarial agent team to every test file in this order:

| Module | Test File | Phase |
|---|---|---|
| `recommendation-engine.ts` | `recommendation-engine.test.ts` | Before implementation |
| `conflict-resolver.ts` | `conflict-resolver.test.ts` | Before implementation |
| `infer-context.ts` | `infer-context.test.ts` | Before implementation |
| `permutation-paths.ts` | `permutation-paths.test.ts` | Before implementation (all Tier 1/2/3 branches) |
| Final integration | `e2e.test.ts` | Final ship check |

---

## Files to Create

| File | Purpose |
|---|---|
| `agents/test-writer/AGENT.md` | Test Writer agent definition |
| `agents/adversarial-evaluator/AGENT.md` | Adversarial Evaluator agent definition |
| `skills/test-review/SKILL.md` | `/audit:test-review` orchestration skill |

**Total agents after this enhancement:** 2 (test-writer + adversarial-evaluator)
**Total skills after this enhancement:** TBD (audit-main + test-review)
