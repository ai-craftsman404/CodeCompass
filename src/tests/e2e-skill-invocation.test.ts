/**
 * E2E Skill Invocation Tests
 *
 * These are TRUE integration tests — they call generateRecommendations()
 * against the REAL .claude/audit-rules/templates/ JSON files (no mocks).
 *
 * Purpose: verify the complete /audit pipeline works end-to-end:
 *   loadAllRules → filterRulesByContext → scoreRules → resolveAllConflicts
 *   → shouldSuggestPhasing → determinePhasedRecommendations → renderRecommendation
 *
 * If a new rule file is malformed or a rule ID changes, these tests will catch it.
 */

import { describe, it, expect, beforeAll } from '@jest/globals';
import path from 'path';
import { generateRecommendations, loadAllRules } from '../recommendation-engine';
import { PrecedenceContext, RepoScanResult, AuditOutput } from '../types/audit';

// ── Resolve rules directory relative to project root ──────────────────────────
const RULES_DIR = path.join(process.cwd(), '.claude', 'audit-rules');

// ── Minimal repo scan result (no special signals) ─────────────────────────────
function makeScan(overrides: Partial<RepoScanResult> = {}): RepoScanResult {
  return {
    hasCI: false,
    hasTests: false,
    testTypes: [],
    hasReadme: false,
    hasLicense: false,
    hasCodeowners: false,
    hasDocumentation: false,
    complianceMarkers: [],
    codebaseSizeLines: 10000,
    aiPatternIndicators: [],
    teamSizeIndicators: [],
    estimatedCriticalFindings: 0,
    inferred: {
      stage: undefined,
      teamScale: undefined,
      aiPattern: undefined,
      complianceFramework: undefined
    },
    ...overrides
  };
}

// ── Minimal base context ───────────────────────────────────────────────────────
function makeContext(overrides: Partial<PrecedenceContext> = {}): PrecedenceContext {
  return {
    PROFILE_STAGE: 'MVP',
    COMPLIANCE_FRAMEWORK: [],
    THREAT_LEVEL: 'none',
    TEAM_SCALE: 'solo',
    AI_PATTERN: 'none',
    ...overrides
  };
}

// ── Helper: find recommendations by rule-ID prefix ────────────────────────────
function ruleIds(output: AuditOutput): string[] {
  return output.recommendations.map(r => r.ruleId);
}

// =============================================================================
// SMOKE TEST: Rule loading
// =============================================================================

describe('Skill Invocation: Rule Loading', () => {
  let allRules: Awaited<ReturnType<typeof loadAllRules>>;

  beforeAll(async () => {
    allRules = await loadAllRules(RULES_DIR);
  });

  it('loads more than 100 rules from the template directory', () => {
    expect(allRules.length).toBeGreaterThanOrEqual(100);
  });

  it('every rule has a non-empty id, description, category, and rationale', () => {
    for (const rule of allRules) {
      expect(rule.id).toBeTruthy();
      expect(rule.description).toBeTruthy();
      expect(rule.category).toBeTruthy();
      expect(rule.rationale).toBeTruthy();
    }
  });

  it('every rule has a valid enforcementLevel', () => {
    const valid = new Set(['advisory', 'soft-mandatory', 'hard-mandatory']);
    for (const rule of allRules) {
      expect(valid.has(rule.action.enforcementLevel)).toBe(true);
    }
  });

  it('every rule has a precedenceWeight between 1 and 100', () => {
    for (const rule of allRules) {
      const w = rule.condition.precedenceWeight;
      expect(w).toBeGreaterThanOrEqual(1);
      expect(w).toBeLessThanOrEqual(100);
    }
  });

  it('rule IDs are unique across all template files', () => {
    const ids = allRules.map(r => r.id);
    const unique = new Set(ids);
    expect(unique.size).toBe(ids.length);
  });
});

// =============================================================================
// SCENARIO 1: GDPR Production Enterprise
// =============================================================================

describe('Skill Invocation Scenario: GDPR Production Enterprise', () => {
  let output: AuditOutput;

  beforeAll(async () => {
    const context = makeContext({
      PROFILE_STAGE: 'production',
      COMPLIANCE_FRAMEWORK: ['GDPR'],
      THREAT_LEVEL: 'critical',     // needs critical (1.0) to push phasing score > 0.65
      TEAM_SCALE: 'enterprise',
      SECURITY_WEIGHT: 80,
      COMPLIANCE_WEIGHT: 90,
      THREAT_WEIGHT: 70
    });
    const scan = makeScan({ codebaseSizeLines: 200000 });
    output = await generateRecommendations('/project', context, scan, RULES_DIR);
  });

  it('generates at least 10 recommendations', () => {
    expect(output.recommendations.length).toBeGreaterThanOrEqual(10);
  });

  it('includes GDPR-specific rules', () => {
    const ids = ruleIds(output);
    const gdprRules = ids.filter(id => id.startsWith('gdpr-'));
    expect(gdprRules.length).toBeGreaterThan(0);
  });

  it('includes gdpr-breach-notification (hard-mandatory for GDPR)', () => {
    const ids = ruleIds(output);
    expect(ids).toContain('gdpr-breach-notification');
  });

  it('includes gdpr-data-processing-agreement', () => {
    const ids = ruleIds(output);
    expect(ids).toContain('gdpr-data-processing-agreement');
  });

  it('includes production-stage rules (SRE runbooks, monitoring)', () => {
    const ids = ruleIds(output);
    const prodRules = ids.filter(id => id.startsWith('production-'));
    expect(prodRules.length).toBeGreaterThan(0);
  });

  it('includes enterprise team-scale rules', () => {
    const ids = ruleIds(output);
    const enterpriseRules = ids.filter(id => id.includes('enterprise') || id.includes('multi-team'));
    expect(enterpriseRules.length).toBeGreaterThan(0);
  });

  it('suggests phasing for large high-threat production project', () => {
    expect(output.phasing.phase1).not.toBeNull();
    expect(output.phasing.phase2).toBeDefined();
  });

  it('phase 1 contains only hard-mandatory rules', () => {
    // phase1.rules contains full ResolvedRule objects; enforcementLevel is at action.enforcementLevel
    const phase1Rules = output.phasing.phase1?.rules ?? [];
    expect(phase1Rules.length).toBeGreaterThan(0);
    for (const r of phase1Rules) {
      expect(r.action?.enforcementLevel).toBe('hard-mandatory');
    }
  });

  it('provides an explanation with context vars', () => {
    expect(output.explanation.contextVars.COMPLIANCE_FRAMEWORK).toContain('GDPR');
    expect(output.explanation.phasingReason).toBeDefined();
  });
});

// =============================================================================
// SCENARIO 2: LLM API MVP Small Team (no phasing)
// =============================================================================

describe('Skill Invocation Scenario: LLM API MVP Small Team', () => {
  let output: AuditOutput;

  beforeAll(async () => {
    const context = makeContext({
      PROFILE_STAGE: 'MVP',
      AI_PATTERN: 'LLM API',
      TEAM_SCALE: 'small',
      THREAT_LEVEL: 'medium',
      COMPLIANCE_FRAMEWORK: []
    });
    const scan = makeScan({ codebaseSizeLines: 30000 });
    output = await generateRecommendations('/project', context, scan, RULES_DIR);
  });

  it('generates recommendations', () => {
    expect(output.recommendations.length).toBeGreaterThan(0);
  });

  it('includes llm-api-prompt-injection (hard-mandatory for LLM API)', () => {
    const ids = ruleIds(output);
    expect(ids).toContain('llm-api-prompt-injection');
  });

  it('includes llm-api-response-validation (hard-mandatory)', () => {
    const ids = ruleIds(output);
    expect(ids).toContain('llm-api-response-validation');
  });

  it('includes llm-api-cost-control', () => {
    const ids = ruleIds(output);
    expect(ids).toContain('llm-api-cost-control');
  });

  it('includes MVP-stage rules', () => {
    const ids = ruleIds(output);
    const mvpRules = ids.filter(id => id.startsWith('mvp-'));
    expect(mvpRules.length).toBeGreaterThan(0);
  });

  it('does not suggest phasing for small MVP project', () => {
    // small codebase + medium threat → below phasing threshold
    expect(output.phasing.phase1).toBeNull();
  });
});

// =============================================================================
// SCENARIO 3: ISO 27001 Agentic Production
// =============================================================================

describe('Skill Invocation Scenario: ISO27001 Agentic Production', () => {
  let output: AuditOutput;

  beforeAll(async () => {
    const context = makeContext({
      PROFILE_STAGE: 'production',
      COMPLIANCE_FRAMEWORK: ['ISO27001'],
      AI_PATTERN: 'agentic',
      TEAM_SCALE: 'multi-team',
      THREAT_LEVEL: 'critical',     // needs critical (1.0) to push phasing score > 0.65
      SECURITY_WEIGHT: 85,
      COMPLIANCE_WEIGHT: 85,
      THREAT_WEIGHT: 75
    });
    const scan = makeScan({ codebaseSizeLines: 150000 });
    output = await generateRecommendations('/project', context, scan, RULES_DIR);
  });

  it('includes ISO 27001 compliance rules', () => {
    const ids = ruleIds(output);
    const iso = ids.filter(id => id.startsWith('iso27001-'));
    expect(iso.length).toBeGreaterThan(0);
  });

  it('includes iso27001-access-control (hard-mandatory)', () => {
    expect(ruleIds(output)).toContain('iso27001-access-control');
  });

  it('includes iso27001-incident-management (hard-mandatory)', () => {
    expect(ruleIds(output)).toContain('iso27001-incident-management');
  });

  it('includes multi-team governance rules', () => {
    const ids = ruleIds(output);
    expect(ids).toContain('multi-team-governance');
  });

  it('suggests phasing for large ISO27001 production project', () => {
    expect(output.phasing.phase1).not.toBeNull();
  });

  it('hard-mandatory ISO 27001 rules appear in phase 1', () => {
    const phase1Ids = (output.phasing.phase1?.rules ?? []).map(r => r.id);
    expect(phase1Ids.some(id => id.startsWith('iso27001-'))).toBe(true);
  });
});

// =============================================================================
// SCENARIO 4: Generic universal rules fire for any context
// =============================================================================

describe('Skill Invocation Scenario: Universal generic rules', () => {
  let output: AuditOutput;

  beforeAll(async () => {
    // Minimal context — only Tier 1 required fields
    const context = makeContext({
      PROFILE_STAGE: 'PoC',
      TEAM_SCALE: 'solo',
      AI_PATTERN: 'none',
      COMPLIANCE_FRAMEWORK: []
    });
    const scan = makeScan();
    output = await generateRecommendations('/project', context, scan, RULES_DIR);
  });

  it('includes generic-env-config (hard-mandatory, always fires)', () => {
    expect(ruleIds(output)).toContain('generic-env-config');
  });

  it('includes generic-gitignore (hard-mandatory, always fires)', () => {
    expect(ruleIds(output)).toContain('generic-gitignore');
  });

  it('includes PoC-stage rules', () => {
    const ids = ruleIds(output);
    const pocRules = ids.filter(id => id.startsWith('poc-'));
    expect(pocRules.length).toBeGreaterThan(0);
  });

  it('does NOT include production-specific rules for a PoC', () => {
    const ids = ruleIds(output);
    expect(ids).not.toContain('production-sre-runbooks');
    expect(ids).not.toContain('production-disaster-recovery');
  });

  it('does NOT include GDPR rules when no compliance framework set', () => {
    const ids = ruleIds(output);
    const gdprRules = ids.filter(id => id.startsWith('gdpr-'));
    expect(gdprRules).toHaveLength(0);
  });

  it('does not suggest phasing for a minimal PoC solo project', () => {
    expect(output.phasing.phase1).toBeNull();
  });
});

// =============================================================================
// SCENARIO 5: CI/CD maturity progression
// =============================================================================

describe('Skill Invocation Scenario: CI/CD maturity', () => {
  it('fires ci-none-suggest-basic when CI_MATURITY is none', async () => {
    const context = makeContext({ CI_MATURITY: 'none' });
    const output = await generateRecommendations('/project', context, makeScan(), RULES_DIR);
    expect(ruleIds(output)).toContain('ci-none-suggest-basic');
  });

  it('fires ci-security-scanning for basic CI_MATURITY', async () => {
    const context = makeContext({ CI_MATURITY: 'basic' });
    const output = await generateRecommendations('/project', context, makeScan(), RULES_DIR);
    expect(ruleIds(output)).toContain('ci-security-scanning');
  });

  it('fires ci-full-deployment-gates for full CI_MATURITY', async () => {
    const context = makeContext({ CI_MATURITY: 'full' });
    const output = await generateRecommendations('/project', context, makeScan(), RULES_DIR);
    expect(ruleIds(output)).toContain('ci-full-deployment-gates');
  });
});

// =============================================================================
// SCENARIO 6: Audit output structure integrity
// =============================================================================

describe('Skill Invocation: Output Structure Integrity', () => {
  let output: AuditOutput;

  beforeAll(async () => {
    const context = makeContext({
      PROFILE_STAGE: 'beta',
      COMPLIANCE_FRAMEWORK: ['SOC2'],
      TEAM_SCALE: 'small'
    });
    output = await generateRecommendations('/project', context, makeScan(), RULES_DIR);
  });

  it('every recommendation has a non-empty ruleId', () => {
    for (const rec of output.recommendations) {
      expect(rec.ruleId).toBeTruthy();
    }
  });

  it('every recommendation has a valid enforcementLevel', () => {
    const valid = new Set(['advisory', 'soft-mandatory', 'hard-mandatory']);
    for (const rec of output.recommendations) {
      expect(valid.has(rec.enforcementLevel)).toBe(true);
    }
  });

  it('every recommendation has a non-empty description', () => {
    for (const rec of output.recommendations) {
      expect(rec.description).toBeTruthy();
    }
  });

  it('every recommendation has a phase number (1 or 2)', () => {
    for (const rec of output.recommendations) {
      expect([1, 2]).toContain(rec.phase);
    }
  });

  it('appliedBecause.precedenceScore is a finite number for every recommendation', () => {
    for (const rec of output.recommendations) {
      expect(Number.isFinite(rec.appliedBecause.precedenceScore)).toBe(true);
    }
  });

  it('output.artifacts is an array', () => {
    expect(Array.isArray(output.artifacts)).toBe(true);
  });

  it('output.explanation.contextVars matches the input context', () => {
    expect(output.explanation.contextVars.PROFILE_STAGE).toBe('beta');
    expect(output.explanation.contextVars.TEAM_SCALE).toBe('small');
  });
});
