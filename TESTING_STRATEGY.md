# CodeCompass Testing Strategy

Always-on coding standards for every test file in this project.
See `TESTING_ARCHITECTURE.md` for the two-agent adversarial model and rationale.

---

## Assertion Standards

- **Never use if-guards around assertions.**
  `if (result.recommendations.length > 0) { expect(...) }` makes the assertion unreachable when
  the collection is empty — the test passes vacuously. Always assert the precondition
  unconditionally first: `expect(result.recommendations.length).toBeGreaterThan(0)`.

- **Assert the value, not just the type.**
  Prefer `expect(result.rules.length).toBeGreaterThan(0)` over
  `expect(Array.isArray(result.rules)).toBe(true)`.
  The latter passes even when the array is empty.

- **Assert specific values per input, not just presence.**
  For enum/tag outputs, assert the exact tags expected for a given input
  (e.g. `AI_PATTERN=agentic` → rules include `folder-structure-agentic`), not just that the array is non-empty.

- **Cover boundary values explicitly.**
  For numeric thresholds (e.g. precedenceWeight > 50), write a test at the exact boundary
  (50) to document the `>` vs `>=` distinction.

---

## Mock Standards

- **Use structural routing, not keyword sniffing.**
  Route mocks based on message structure (e.g. `body.contextVars.COMPLIANCE_FRAMEWORK === "SOC2"`)
  rather than system prompt keywords. Keyword routing breaks silently if the condition under test
  happens to contain the keyword.

- **Never use call-index counters (`callIndex++`) to route mock responses.**
  Call order is fragile — it changes if the implementation adds a new call or reorders calls.
  Route on context variables, message content, or other structural properties instead.

- **Verify mock call counts for multi-call functions.**
  If a function makes N calls per input item, assert `expect(callCount).toBe(N)`
  to catch regressions where calls are added or dropped silently.

---

## ESM / Module Standards

- **Never use `require()` inside ESM test bodies.**
  ESM modules throw `ReferenceError: require is not defined` at runtime.
  Always use top-level `import` statements.

- **For env-var-dependent modules, set the env var before `vi.resetModules()` + dynamic import.**
  Pattern:
  ```ts
  process.env.AUDIT_RULES_PATH = tmpDir;
  vi.resetModules();
  mod = await import("../../src/recommendation-engine.js");
  ```

- **Always restore env vars in `finally` blocks, not inline.**
  Inline restoration (`process.env.X = prev` after the assertion) is skipped if the
  assertion throws. Use try/finally to guarantee cleanup.

---

## Timezone / Date Standards

- **Never assert `d.getHours()` or `d.getUTCHours()` for specific values in unit tests.**
  Hour assertions are timezone-dependent across CI environments with different `TZ` settings.
  Assert `d.getMinutes()` or test that the result is a valid future ISO date instead.

---

## Coverage Standards

- **Test all enum values, not just the happy path.**
  For functions that branch on an enum (PROFILE_STAGE, THREAT_LEVEL, AI_PATTERN), write at least
  one test per enum value.

- **Test empty inputs explicitly.**
  Functions receiving arrays, strings, or objects should have a test where those are empty
  (`[]`, `""`, `{}`), verifying no crash and a well-defined return value.

- **Test error paths — not just resolutions.**
  File read errors (missing rules files), invalid JSON, missing required fields, and unknown
  enum values must each have a dedicated test.

- **Test file persistence end-to-end.**
  For functions that write files (rule templates, recommendations), read the file back and assert
  specific field values — not just that the file exists.

- **Test all permutation paths through questionnaire.**
  For Tier 1/2/3 conditional logic, test all branches: Tier 1 alone, Tier 1→2 unlocked, Tier 1→2→3 expert.
