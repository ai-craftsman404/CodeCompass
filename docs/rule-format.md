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

## Common Pitfalls

1. **Conflicting Conditions** — If two rules match the same scenario, explicitly mark conflict with `conflictsWith`
2. **Missing Rationale** — Always explain *why* the rule exists (used in conflict resolution)
3. **Vague Recommendations** — Use specific, actionable language; reference artifacts/artifacts
4. **Wrong Enforcement Level** — Hard-mandatory: non-negotiable. Soft-mandatory: strongly recommend. Advisory: suggest

## Testing Your Rule

1. Create test case matching rule's condition (contextVars)
2. Verify rule is loaded and filtered
3. Verify recommendation is rendered correctly
4. Check conflicts are resolved as expected

## File Locations

- New rules go in: `.claude/audit-rules/templates/[domain].json`
- Update catalog: `.claude/audit-rules/index.json`
