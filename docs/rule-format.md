# Rule Format Guide

## JSON Schema

Each rule is a JSON object matching `audit-rules/schemas/rule.schema.json`:

```json
{
  "id": "unique-rule-id",
  "description": "Short description (10-200 chars)",
  "category": "structure|naming|tooling|compliance|process|testing",
  "version": "1.0.0",
  
  "condition": {
    "contextVars": {
      "AI_PATTERN": "agentic",
      "TEAM_SCALE": ["small", "multi-team"]
    },
    "precedenceWeight": 85
  },
  
  "action": {
    "type": "scaffold|audit|hardening|reporting",
    "recommendation": "Plain English recommendation (rendered as markdown)",
    "files": [
      { "path": "/agents/README.md", "template": "agents-readme.md" }
    ],
    "enforcementLevel": "advisory|soft-mandatory|hard-mandatory"
  },
  
  "conflictsWith": ["other-rule-id"],
  "overrides": ["rule-to-supersede"],
  "rationale": "Why this rule exists"
}
```

## Example: SOC2 Access Control Rule

```json
{
  "id": "soc2-cc6-access-control",
  "description": "SOC2 CC6.1: Restrict physical and logical access",
  "category": "compliance",
  "version": "1.0.0",
  
  "condition": {
    "contextVars": {
      "COMPLIANCE_FRAMEWORK": "SOC2"
    },
    "precedenceWeight": 95
  },
  
  "action": {
    "type": "audit",
    "recommendation": "Implement access control matrix (RBAC or ABAC). Document user provisioning/deprovisioning. Require MFA for production access. Create CODEOWNERS file.",
    "files": [
      { "path": "/docs/access-control-matrix.md", "template": "access-control.md" },
      { "path": "/.github/CODEOWNERS", "template": "codeowners.txt" }
    ],
    "enforcementLevel": "hard-mandatory"
  },
  
  "conflictsWith": [],
  "overrides": [],
  "rationale": "CC6.1 is foundational to SOC2; access control must be documented and enforced."
}
```

## Rule Lifecycle

Rules follow a semantic versioning pattern (MAJOR.MINOR.PATCH):

- **1.0.0** — Initial rule release
- **1.1.0** — Non-breaking enhancement (e.g., expanded contextVars, new template files)
- **2.0.0** — Breaking change (e.g., renamed rule ID, removed conditions)
- **Deprecation** — Mark with `deprecated: true` and `successor: "new-rule-id"` in action block

Example deprecated rule:
```json
{
  "id": "old-rule-id",
  "deprecated": true,
  "successor": "new-rule-id",
  "action": {
    "recommendation": "This rule is deprecated. Use new-rule-id instead."
  }
}
```

## Circular Dependencies & Conflict Edges

**Avoid circular references:**
- Rule A overrides Rule B
- Rule B overrides Rule C
- Rule C overrides Rule A ← **INVALID**

Use `conflictsWith` to mark mutual exclusion, and `overrides` for one-directional precedence only.

**Override precedence chaining:** If Rule A overrides Rule B, and Rule B overrides Rule C, then Rule A transitively overrides Rule C (automatic in scoring).

## Common Pitfalls

1. **Conflicting Conditions** — If two rules match the same scenario, explicitly mark conflict with `conflictsWith`
2. **Missing Rationale** — Always explain *why* the rule exists (used in conflict resolution)
3. **Vague Recommendations** — Use specific, actionable language; reference artifacts/artifacts
4. **Wrong Enforcement Level** — Hard-mandatory: non-negotiable. Soft-mandatory: strongly recommend. Advisory: suggest
5. **Circular Overrides** — Check that `overrides` chains don't form cycles (tools will detect and fail)
6. **Mismatch Between Condition and Action** — If condition targets "multi-team" but action assumes "solo", conflict will arise

## Testing Your Rule

1. Create test case matching rule's condition (contextVars)
2. Verify rule is loaded and filtered
3. Verify recommendation is rendered correctly
4. Check conflicts are resolved as expected

### Test Case Template

```typescript
describe('my-new-rule', () => {
  it('fires when condition matches', async () => {
    const context = {
      COMPLIANCE_FRAMEWORK: 'SOC2',
      TEAM_SCALE: 'multi-team',
    };
    const rules = await loadRules(context);
    expect(rules).toContainEqual(
      expect.objectContaining({ id: 'my-new-rule' })
    );
  });

  it('does not fire when condition does not match', async () => {
    const context = {
      COMPLIANCE_FRAMEWORK: 'none',
      TEAM_SCALE: 'solo',
    };
    const rules = await loadRules(context);
    expect(rules).not.toContainEqual(
      expect.objectContaining({ id: 'my-new-rule' })
    );
  });

  it('resolves conflicts correctly', async () => {
    const scored = scoreRules(rules);
    const winner = scored.filter(r => r.id === 'my-new-rule')[0];
    expect(winner.score).toBeGreaterThan(conflictingRule.score);
  });
});
```

## File Locations

- New rules go in: `.claude/audit-rules/templates/[domain].json`
- Update catalog: `.claude/audit-rules/index.json`
- Schemas: `.claude/audit-rules/schemas/rule.schema.json`
