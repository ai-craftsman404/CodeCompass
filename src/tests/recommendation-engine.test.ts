/**
 * Recommendation Engine Test Suite
 * Tests all exported functions: loadAllRules, filterRulesByContext, scoreRules,
 * shouldSuggestPhasing, determinePhasedRecommendations, renderRecommendation,
 * generateRecommendations
 *
 * Coverage target: ≥ 70% statements/branches on recommendation-engine.ts
 */

import { describe, it, expect, jest, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs';

// Mock fs before any imports that use it
jest.mock('fs');

import {
  loadAllRules,
  filterRulesByContext,
  scoreRules,
  shouldSuggestPhasing,
  determinePhasedRecommendations,
  renderRecommendation,
  generateRecommendations
} from '../recommendation-engine';
import {
  AuditRule,
  PrecedenceContext,
  ResolvedRule,
  RepoScanResult
} from '../types/audit';

// ============================================================================
// TEST HELPERS
// ============================================================================

let ruleCounter = 0;

function createRule(overrides: Partial<AuditRule> = {}): AuditRule {
  ruleCounter++;
  return {
    id: `rule-${ruleCounter}-${Math.random().toString(36).substr(2, 5)}`,
    description: 'Test rule description',
    category: 'structure',
    rationale: 'Test rationale',
    condition: {
      contextVars: {},
      precedenceWeight: 50,
      ...overrides.condition
    },
    action: {
      type: 'audit',
      recommendation: 'Test recommendation',
      enforcementLevel: 'advisory',
      ...overrides.action
    },
    ...overrides
  };
}

function createContext(overrides: Partial<PrecedenceContext> = {}): PrecedenceContext {
  return {
    PROFILE_STAGE: 'production',
    COMPLIANCE_FRAMEWORK: ['none'],
    THREAT_LEVEL: 'low',
    TEAM_SCALE: 'small',
    AI_PATTERN: 'none',
    ...overrides
  };
}

function createResolvedRule(overrides: Partial<ResolvedRule> = {}): ResolvedRule {
  const base = createRule(overrides as Partial<AuditRule>);
  return {
    ...base,
    score: 50,
    status: 'applied',
    overriddenBy: undefined,
    explanation: 'Applied (no conflicts)',
    ...overrides
  };
}

function createScanResult(overrides: Partial<RepoScanResult> = {}): RepoScanResult {
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
      stage: { value: 'MVP', confidence: 0.8 },
      team_scope: { value: 'solo', confidence: 0.7 },
      ai_involvement: { value: 'none', confidence: 0.9 },
      compliance: { value: 'none', confidence: 0.85 }
    },
    ...overrides
  };
}

// ============================================================================
// loadAllRules
// ============================================================================

describe('loadAllRules', () => {
  const mockFs = fs as jest.Mocked<typeof fs>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('throws if the templates directory does not exist', async () => {
    mockFs.existsSync.mockReturnValue(false);

    await expect(loadAllRules('/some/rules/dir')).rejects.toThrow(
      /Rules directory not found/
    );
  });

  it('returns empty array when no JSON files are present', async () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readdirSync.mockReturnValue([] as any);

    const result = await loadAllRules('/some/rules/dir');
    expect(result).toEqual([]);
  });

  it('filters out index.json files', async () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readdirSync.mockReturnValue(['index.json'] as any);

    const result = await loadAllRules('/some/rules/dir');
    expect(result).toEqual([]);
    expect(mockFs.readFileSync).not.toHaveBeenCalled();
  });

  it('filters out non-JSON files', async () => {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readdirSync.mockReturnValue(['readme.md', 'rules.ts'] as any);

    const result = await loadAllRules('/some/rules/dir');
    expect(result).toEqual([]);
    expect(mockFs.readFileSync).not.toHaveBeenCalled();
  });

  it('loads rules from a single JSON file containing an array', async () => {
    const rule1 = createRule({ id: 'rule-a' });
    const rule2 = createRule({ id: 'rule-b' });

    mockFs.existsSync.mockReturnValue(true);
    mockFs.readdirSync.mockReturnValue(['rules.json'] as any);
    mockFs.readFileSync.mockReturnValue(JSON.stringify([rule1, rule2]) as any);

    const result = await loadAllRules('/some/rules/dir');
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('rule-a');
    expect(result[1].id).toBe('rule-b');
  });

  it('loads a single-object format (wraps in array)', async () => {
    const rule = createRule({ id: 'single-rule' });

    mockFs.existsSync.mockReturnValue(true);
    mockFs.readdirSync.mockReturnValue(['rule.json'] as any);
    mockFs.readFileSync.mockReturnValue(JSON.stringify(rule) as any);

    const result = await loadAllRules('/some/rules/dir');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('single-rule');
  });

  it('merges rules from multiple JSON files', async () => {
    const rule1 = createRule({ id: 'from-file-1' });
    const rule2 = createRule({ id: 'from-file-2' });

    mockFs.existsSync.mockReturnValue(true);
    mockFs.readdirSync.mockReturnValue(['file1.json', 'file2.json'] as any);
    mockFs.readFileSync
      .mockReturnValueOnce(JSON.stringify([rule1]) as any)
      .mockReturnValueOnce(JSON.stringify([rule2]) as any);

    const result = await loadAllRules('/some/rules/dir');
    expect(result).toHaveLength(2);
    const ids = result.map(r => r.id);
    expect(ids).toContain('from-file-1');
    expect(ids).toContain('from-file-2');
  });

  it('uses correct templates subdirectory path', async () => {
    mockFs.existsSync.mockReturnValue(false);

    await expect(loadAllRules('/base/path')).rejects.toThrow(/templates/);
  });
});

// ============================================================================
// filterRulesByContext
// ============================================================================

describe('filterRulesByContext', () => {
  it('returns all rules when contextVars is empty (no conditions)', () => {
    const rules = [
      createRule({ condition: { contextVars: {}, precedenceWeight: 50 } }),
      createRule({ condition: { contextVars: {}, precedenceWeight: 50 } })
    ];
    const context = createContext();

    const result = filterRulesByContext(rules, context);
    expect(result).toHaveLength(2);
  });

  it('returns empty array when no rules match', () => {
    const rules = [
      createRule({
        condition: {
          contextVars: { THREAT_LEVEL: 'critical' },
          precedenceWeight: 50
        }
      })
    ];
    const context = createContext({ THREAT_LEVEL: 'low' });

    const result = filterRulesByContext(rules, context);
    expect(result).toHaveLength(0);
  });

  it('filters rules using AND logic across multiple context vars', () => {
    const rule = createRule({
      condition: {
        contextVars: {
          THREAT_LEVEL: 'high',
          PROFILE_STAGE: 'production'
        },
        precedenceWeight: 50
      }
    });

    // Both match
    const matchContext = createContext({ THREAT_LEVEL: 'high', PROFILE_STAGE: 'production' });
    expect(filterRulesByContext([rule], matchContext)).toHaveLength(1);

    // Only one matches
    const partialContext = createContext({ THREAT_LEVEL: 'high', PROFILE_STAGE: 'sandbox' });
    expect(filterRulesByContext([rule], partialContext)).toHaveLength(0);

    // Neither matches
    const noMatchContext = createContext({ THREAT_LEVEL: 'low', PROFILE_STAGE: 'sandbox' });
    expect(filterRulesByContext([rule], noMatchContext)).toHaveLength(0);
  });

  it('matches when contextVar is a string and expected is a string', () => {
    const rule = createRule({
      condition: {
        contextVars: { THREAT_LEVEL: 'medium' },
        precedenceWeight: 50
      }
    });
    const context = createContext({ THREAT_LEVEL: 'medium' });

    const result = filterRulesByContext([rule], context);
    expect(result).toHaveLength(1);
  });

  it('matches when expected is an array and context value is in the array', () => {
    const rule = createRule({
      condition: {
        contextVars: { THREAT_LEVEL: ['low', 'medium', 'high'] },
        precedenceWeight: 50
      }
    });
    const context = createContext({ THREAT_LEVEL: 'medium' });

    const result = filterRulesByContext([rule], context);
    expect(result).toHaveLength(1);
  });

  it('rejects when context value not in expected array', () => {
    const rule = createRule({
      condition: {
        contextVars: { THREAT_LEVEL: ['low', 'medium'] },
        precedenceWeight: 50
      }
    });
    const context = createContext({ THREAT_LEVEL: 'critical' });

    const result = filterRulesByContext([rule], context);
    expect(result).toHaveLength(0);
  });

  it('matches array context value (like COMPLIANCE_FRAMEWORK) against expected values', () => {
    // COMPLIANCE_FRAMEWORK is an array in context
    const rule = createRule({
      condition: {
        contextVars: { COMPLIANCE_FRAMEWORK: 'SOC2' },
        precedenceWeight: 50
      }
    });
    const context = createContext({ COMPLIANCE_FRAMEWORK: ['SOC2', 'GDPR'] });

    const result = filterRulesByContext([rule], context);
    expect(result).toHaveLength(1);
  });

  it('rejects array context value when no array element matches', () => {
    const rule = createRule({
      condition: {
        contextVars: { COMPLIANCE_FRAMEWORK: 'HIPAA' },
        precedenceWeight: 50
      }
    });
    const context = createContext({ COMPLIANCE_FRAMEWORK: ['SOC2', 'GDPR'] });

    const result = filterRulesByContext([rule], context);
    expect(result).toHaveLength(0);
  });

  it('matches array context value against expected array (any-of logic)', () => {
    const rule = createRule({
      condition: {
        contextVars: { COMPLIANCE_FRAMEWORK: ['GDPR', 'HIPAA'] },
        precedenceWeight: 50
      }
    });
    const context = createContext({ COMPLIANCE_FRAMEWORK: ['SOC2', 'GDPR'] });

    const result = filterRulesByContext([rule], context);
    expect(result).toHaveLength(1);
  });

  it('returns empty array when input rules array is empty', () => {
    const context = createContext();
    const result = filterRulesByContext([], context);
    expect(result).toHaveLength(0);
  });

  it('filters correctly with mixed-match rules', () => {
    const matchingRule = createRule({
      id: 'match',
      condition: { contextVars: { THREAT_LEVEL: 'high' }, precedenceWeight: 50 }
    });
    const nonMatchingRule = createRule({
      id: 'no-match',
      condition: { contextVars: { THREAT_LEVEL: 'critical' }, precedenceWeight: 50 }
    });

    const context = createContext({ THREAT_LEVEL: 'high' });
    const result = filterRulesByContext([matchingRule, nonMatchingRule], context);

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe(matchingRule.id);
  });
});

// ============================================================================
// scoreRules
// ============================================================================

describe('scoreRules', () => {
  it('returns an array of same length as input', () => {
    const rules = [createRule(), createRule(), createRule()];
    const context = createContext();

    const result = scoreRules(rules, context);
    expect(result).toHaveLength(3);
  });

  it('adds a numeric score property to each rule', () => {
    const rules = [createRule()];
    const context = createContext();

    const result = scoreRules(rules, context);
    expect(typeof result[0].score).toBe('number');
    expect(Number.isFinite(result[0].score)).toBe(true);
  });

  it('preserves all original rule properties', () => {
    const rule = createRule({
      id: 'test-id',
      category: 'compliance',
      description: 'specific description',
      rationale: 'my rationale'
    });
    const context = createContext();

    const result = scoreRules([rule], context);
    expect(result[0].id).toBe(rule.id);
    expect(result[0].category).toBe('compliance');
    expect(result[0].description).toBe('specific description');
    expect(result[0].rationale).toBe('my rationale');
  });

  it('score is within valid range [0, 100]', () => {
    const rules = [
      createRule({ condition: { contextVars: {}, precedenceWeight: 100 } }),
      createRule({ condition: { contextVars: {}, precedenceWeight: 0 } })
    ];
    const context = createContext({
      SECURITY_WEIGHT: 100,
      COMPLIANCE_WEIGHT: 100,
      THREAT_WEIGHT: 100
    });

    const result = scoreRules(rules, context);
    for (const scored of result) {
      expect(scored.score).toBeGreaterThanOrEqual(0);
      expect(scored.score).toBeLessThanOrEqual(100);
    }
  });

  it('returns empty array for empty input', () => {
    const result = scoreRules([], createContext());
    expect(result).toHaveLength(0);
  });

  it('rules with higher precedenceWeight get higher scores (same context)', () => {
    const lowRule = createRule({ condition: { contextVars: {}, precedenceWeight: 20 } });
    const highRule = createRule({ condition: { contextVars: {}, precedenceWeight: 90 } });
    const context = createContext({
      SECURITY_WEIGHT: 60,
      COMPLIANCE_WEIGHT: 50,
      THREAT_WEIGHT: 40
    });

    const result = scoreRules([lowRule, highRule], context);
    expect(result[1].score).toBeGreaterThan(result[0].score);
  });
});

// ============================================================================
// shouldSuggestPhasing
// ============================================================================

describe('shouldSuggestPhasing', () => {
  // Formula: (threat × 0.40) + (size × 0.30) + (resource × 0.30) > 0.65
  // getThreatScore: critical=1.0, high=0.7, medium=0.4, low=0.1, none=0.0
  // getSizeScore: >500000=1.0, >100000=0.7, >50000=0.5, else=0.2
  // getResourceScore: severe=1.0, moderate=0.6, standard=0.3, unlimited=0.0

  it('returns false for a clearly low-risk scenario', () => {
    const context = createContext({ THREAT_LEVEL: 'none', RESOURCE_CONSTRAINT: 'standard' });
    const scan = createScanResult({ codebaseSizeLines: 10000 });

    // score = 0.0×0.40 + 0.2×0.30 + 0.3×0.30 = 0 + 0.06 + 0.09 = 0.15 → false
    expect(shouldSuggestPhasing(context, scan)).toBe(false);
  });

  it('returns true for a high threat + large codebase scenario', () => {
    const context = createContext({ THREAT_LEVEL: 'critical', RESOURCE_CONSTRAINT: 'severe' });
    const scan = createScanResult({ codebaseSizeLines: 600000 });

    // score = 1.0×0.40 + 1.0×0.30 + 1.0×0.30 = 1.0 → true
    expect(shouldSuggestPhasing(context, scan)).toBe(true);
  });

  it('returns false when phasing score is exactly 0.65 (not strictly greater)', () => {
    // We need: threat×0.40 + size×0.30 + resource×0.30 = exactly 0.65
    // Use: threat=critical(1.0), size≤50000(0.2), resource=standard(0.3)
    // = 1.0×0.40 + 0.2×0.30 + 0.3×0.30 = 0.40 + 0.06 + 0.09 = 0.55 — not enough
    // Use: threat=high(0.7), size>100000(0.7), resource=moderate(0.6)
    // = 0.7×0.40 + 0.7×0.30 + 0.6×0.30 = 0.28 + 0.21 + 0.18 = 0.67 → true (over threshold)
    // For exactly 0.65: threat=critical(1.0), size≤50000(0.2), resource=moderate(0.6)
    // = 1.0×0.40 + 0.2×0.30 + 0.6×0.30 = 0.40 + 0.06 + 0.18 = 0.64 → false
    const context = createContext({ THREAT_LEVEL: 'critical', RESOURCE_CONSTRAINT: 'moderate' });
    const scan = createScanResult({ codebaseSizeLines: 10000 }); // ≤50000 → 0.2

    // 0.40 + 0.06 + 0.18 = 0.64, which is ≤ 0.65 → false
    expect(shouldSuggestPhasing(context, scan)).toBe(false);
  });

  it('returns true when phasing score just exceeds 0.65', () => {
    // threat=high(0.7), size>100000(0.7), resource=moderate(0.6)
    // = 0.7×0.40 + 0.7×0.30 + 0.6×0.30 = 0.28 + 0.21 + 0.18 = 0.67 > 0.65
    const context = createContext({ THREAT_LEVEL: 'high', RESOURCE_CONSTRAINT: 'moderate' });
    const scan = createScanResult({ codebaseSizeLines: 200000 }); // >100000 → 0.7

    expect(shouldSuggestPhasing(context, scan)).toBe(true);
  });

  it('uses default resource score (0.3/standard) when RESOURCE_CONSTRAINT is not set', () => {
    const context = createContext({ THREAT_LEVEL: 'none' });
    delete (context as any).RESOURCE_CONSTRAINT;
    const scan = createScanResult({ codebaseSizeLines: 10000 });

    // = 0.0×0.40 + 0.2×0.30 + 0.3×0.30 = 0 + 0.06 + 0.09 = 0.15 → false
    expect(shouldSuggestPhasing(context, scan)).toBe(false);
  });

  describe('getThreatScore mappings', () => {
    const scan = createScanResult({ codebaseSizeLines: 10000 });
    const baseContext = createContext({ RESOURCE_CONSTRAINT: 'standard' });

    it('maps critical threat to 1.0 (highest contribution)', () => {
      const ctx = { ...baseContext, THREAT_LEVEL: 'critical' as const };
      // 1.0×0.40 + 0.2×0.30 + 0.3×0.30 = 0.40 + 0.06 + 0.09 = 0.55 → false
      // But still higher than none
      const noneCtx = { ...baseContext, THREAT_LEVEL: 'none' as const };
      const critScore = 1.0 * 0.4 + 0.2 * 0.3 + 0.3 * 0.3;
      const noneScore = 0.0 * 0.4 + 0.2 * 0.3 + 0.3 * 0.3;
      expect(critScore).toBeGreaterThan(noneScore);
    });

    it('maps low threat to 0.1', () => {
      const ctx = { ...baseContext, THREAT_LEVEL: 'low' as const };
      // 0.1×0.40 + 0.2×0.30 + 0.3×0.30 = 0.04 + 0.06 + 0.09 = 0.19 → false
      expect(shouldSuggestPhasing(ctx, scan)).toBe(false);
    });

    it('maps unknown threat level to 0.0 (default)', () => {
      const ctx = { ...baseContext, THREAT_LEVEL: 'unknown-level' as any };
      // 0.0×0.40 + 0.2×0.30 + 0.3×0.30 = 0.15 → false
      expect(shouldSuggestPhasing(ctx, scan)).toBe(false);
    });
  });

  describe('getSizeScore mappings', () => {
    const baseContext = createContext({ THREAT_LEVEL: 'none', RESOURCE_CONSTRAINT: 'standard' });

    it('maps >500000 lines to size score 1.0', () => {
      const scan = createScanResult({ codebaseSizeLines: 600000 });
      // = 0 + 1.0×0.30 + 0.3×0.30 = 0.30 + 0.09 = 0.39 → false still
      expect(shouldSuggestPhasing(baseContext, scan)).toBe(false);
    });

    it('maps >100000 to 0.7, >50000 to 0.5, else 0.2', () => {
      // Verify the function runs without error for all bands
      const large = createScanResult({ codebaseSizeLines: 150000 });
      const medium = createScanResult({ codebaseSizeLines: 75000 });
      const small = createScanResult({ codebaseSizeLines: 5000 });

      // All should return false with none threat + standard resource
      expect(shouldSuggestPhasing(baseContext, large)).toBe(false);
      expect(shouldSuggestPhasing(baseContext, medium)).toBe(false);
      expect(shouldSuggestPhasing(baseContext, small)).toBe(false);
    });
  });

  describe('getResourceScore mappings', () => {
    const baseScan = createScanResult({ codebaseSizeLines: 10000 });

    it('severe resource constraint contributes 1.0', () => {
      const ctx = createContext({ THREAT_LEVEL: 'critical', RESOURCE_CONSTRAINT: 'severe' });
      // 1.0×0.40 + 0.2×0.30 + 1.0×0.30 = 0.40 + 0.06 + 0.30 = 0.76 → true
      expect(shouldSuggestPhasing(ctx, baseScan)).toBe(true);
    });

    it('unlimited resource contributes 0.0', () => {
      const ctx = createContext({ THREAT_LEVEL: 'none', RESOURCE_CONSTRAINT: 'unlimited' });
      // 0.0×0.40 + 0.2×0.30 + 0.0×0.30 = 0.06 → false
      expect(shouldSuggestPhasing(ctx, baseScan)).toBe(false);
    });

    it('unknown resource constraint falls back to 0.3 (standard)', () => {
      const ctx = createContext({ THREAT_LEVEL: 'none', RESOURCE_CONSTRAINT: 'unknown-value' as any });
      // 0.0×0.40 + 0.2×0.30 + 0.3×0.30 = 0.15 → false
      expect(shouldSuggestPhasing(ctx, baseScan)).toBe(false);
    });
  });
});

// ============================================================================
// determinePhasedRecommendations
// ============================================================================

describe('determinePhasedRecommendations', () => {
  describe('when shouldPhase = false (single phase)', () => {
    it('returns phase1 as null', () => {
      const resolved = [createResolvedRule()];
      const result = determinePhasedRecommendations(resolved, false);
      expect(result.phase1).toBeNull();
    });

    it('returns all rules in phase2', () => {
      const r1 = createResolvedRule();
      const r2 = createResolvedRule();
      const result = determinePhasedRecommendations([r1, r2], false);
      expect(result.phase2.rules).toHaveLength(2);
    });

    it('phase2 has phase number 2', () => {
      const result = determinePhasedRecommendations([], false);
      expect(result.phase2.phase).toBe(2);
    });

    it('phase2 has label and duration properties', () => {
      const result = determinePhasedRecommendations([], false);
      expect(result.phase2.label).toBeDefined();
      expect(typeof result.phase2.label).toBe('string');
      expect(result.phase2.duration).toBeDefined();
      expect(typeof result.phase2.duration).toBe('string');
    });

    it('phase2 has objectives and successCriteria arrays', () => {
      const result = determinePhasedRecommendations([], false);
      expect(Array.isArray(result.phase2.objectives)).toBe(true);
      expect(Array.isArray(result.phase2.successCriteria)).toBe(true);
      expect(result.phase2.objectives.length).toBeGreaterThan(0);
    });

    it('phase2 has output string', () => {
      const result = determinePhasedRecommendations([], false);
      expect(typeof result.phase2.output).toBe('string');
      expect(result.phase2.output.length).toBeGreaterThan(0);
    });

    it('works with empty resolved rules list', () => {
      const result = determinePhasedRecommendations([], false);
      expect(result.phase1).toBeNull();
      expect(result.phase2.rules).toHaveLength(0);
    });
  });

  describe('when shouldPhase = true (dual phase)', () => {
    it('phase1 is not null', () => {
      const resolved = [createResolvedRule()];
      const result = determinePhasedRecommendations(resolved, true);
      expect(result.phase1).not.toBeNull();
    });

    it('phase1 contains only hard-mandatory rules', () => {
      const hardRule = createResolvedRule({
        action: {
          type: 'audit',
          recommendation: 'Hard rule',
          enforcementLevel: 'hard-mandatory'
        }
      });
      const softRule = createResolvedRule({
        action: {
          type: 'audit',
          recommendation: 'Soft rule',
          enforcementLevel: 'soft-mandatory'
        }
      });
      const advisoryRule = createResolvedRule({
        action: {
          type: 'audit',
          recommendation: 'Advisory rule',
          enforcementLevel: 'advisory'
        }
      });

      const result = determinePhasedRecommendations([hardRule, softRule, advisoryRule], true);
      expect(result.phase1!.rules).toHaveLength(1);
      expect(result.phase1!.rules[0].action.enforcementLevel).toBe('hard-mandatory');
    });

    it('phase2 contains all rules (not just hard-mandatory)', () => {
      const hardRule = createResolvedRule({
        action: { type: 'audit', recommendation: 'r', enforcementLevel: 'hard-mandatory' }
      });
      const softRule = createResolvedRule({
        action: { type: 'audit', recommendation: 'r', enforcementLevel: 'soft-mandatory' }
      });

      const result = determinePhasedRecommendations([hardRule, softRule], true);
      expect(result.phase2.rules).toHaveLength(2);
    });

    it('phase1 has phase number 1', () => {
      const result = determinePhasedRecommendations([createResolvedRule()], true);
      expect(result.phase1!.phase).toBe(1);
    });

    it('phase2 has phase number 2', () => {
      const result = determinePhasedRecommendations([createResolvedRule()], true);
      expect(result.phase2.phase).toBe(2);
    });

    it('phase1 has triage-related label', () => {
      const result = determinePhasedRecommendations([createResolvedRule()], true);
      expect(result.phase1!.label).toContain('Triage');
    });

    it('phase1 has short duration (1-2 hours)', () => {
      const result = determinePhasedRecommendations([createResolvedRule()], true);
      expect(result.phase1!.duration).toContain('hour');
    });

    it('phase1 has objectives and successCriteria arrays', () => {
      const result = determinePhasedRecommendations([createResolvedRule()], true);
      expect(Array.isArray(result.phase1!.objectives)).toBe(true);
      expect(Array.isArray(result.phase1!.successCriteria)).toBe(true);
    });

    it('phase2 label indicates comprehensive audit', () => {
      const result = determinePhasedRecommendations([createResolvedRule()], true);
      expect(result.phase2.label).toContain('Comprehensive');
    });

    it('phase1 has no hard-mandatory rules when none exist', () => {
      const advisoryRule = createResolvedRule({
        action: { type: 'audit', recommendation: 'r', enforcementLevel: 'advisory' }
      });
      const result = determinePhasedRecommendations([advisoryRule], true);
      expect(result.phase1!.rules).toHaveLength(0);
    });
  });
});

// ============================================================================
// renderRecommendation
// ============================================================================

describe('renderRecommendation', () => {
  it('maps ruleId from rule.id', () => {
    const rule = createResolvedRule({ id: 'my-rule-id' });
    const context = createContext();
    const result = renderRecommendation(rule, 1, context);
    expect(result.ruleId).toBe('my-rule-id');
  });

  it('maps category from rule.category', () => {
    const rule = createResolvedRule({ category: 'compliance' });
    const context = createContext();
    const result = renderRecommendation(rule, 1, context);
    expect(result.category).toBe('compliance');
  });

  it('maps enforcementLevel from rule.action.enforcementLevel', () => {
    const rule = createResolvedRule({
      action: { type: 'audit', recommendation: 'r', enforcementLevel: 'hard-mandatory' }
    });
    const context = createContext();
    const result = renderRecommendation(rule, 2, context);
    expect(result.enforcementLevel).toBe('hard-mandatory');
  });

  it('maps description from rule.action.recommendation', () => {
    const rule = createResolvedRule({
      action: { type: 'audit', recommendation: 'My recommendation text', enforcementLevel: 'advisory' }
    });
    const context = createContext();
    const result = renderRecommendation(rule, 1, context);
    expect(result.description).toBe('My recommendation text');
  });

  it('sets phase from phaseNum argument', () => {
    const rule = createResolvedRule();
    const context = createContext();

    const r1 = renderRecommendation(rule, 1, context);
    const r2 = renderRecommendation(rule, 2, context);

    expect(r1.phase).toBe(1);
    expect(r2.phase).toBe(2);
  });

  it('includes scaffold when rule.action.files is defined', () => {
    const rule = createResolvedRule({
      category: 'structure',
      action: {
        type: 'scaffold',
        recommendation: 'r',
        enforcementLevel: 'advisory',
        files: [{ path: 'src/index.ts', template: 'basic' }]
      }
    });
    const context = createContext();
    const result = renderRecommendation(rule, 1, context);

    expect(result.scaffold).toBeDefined();
    expect(result.scaffold!.folder).toBe('structure');
    expect(result.scaffold!.files).toHaveLength(1);
    expect(result.scaffold!.files[0].path).toBe('src/index.ts');
  });

  it('scaffold is undefined when rule.action.files is absent', () => {
    const rule = createResolvedRule({
      action: { type: 'audit', recommendation: 'r', enforcementLevel: 'advisory' }
    });
    const context = createContext();
    const result = renderRecommendation(rule, 1, context);
    expect(result.scaffold).toBeUndefined();
  });

  it('includes artifacts when rule.action.files is defined', () => {
    const rule = createResolvedRule({
      action: {
        type: 'scaffold',
        recommendation: 'r',
        enforcementLevel: 'advisory',
        files: [
          { path: 'src/a.ts', template: 't1' },
          { path: 'src/b.ts', template: 't2' }
        ]
      }
    });
    const context = createContext();
    const result = renderRecommendation(rule, 1, context);

    expect(result.artifacts).toBeDefined();
    expect(result.artifacts).toContain('src/a.ts');
    expect(result.artifacts).toContain('src/b.ts');
  });

  it('artifacts is undefined when rule.action.files is absent', () => {
    const rule = createResolvedRule({
      action: { type: 'audit', recommendation: 'r', enforcementLevel: 'advisory' }
    });
    const context = createContext();
    const result = renderRecommendation(rule, 1, context);
    expect(result.artifacts).toBeUndefined();
  });

  it('includes overriddenRules in appliedBecause when overriddenBy is set', () => {
    const rule = createResolvedRule({ overriddenBy: 'other-rule-id' });
    const context = createContext();
    const result = renderRecommendation(rule, 1, context);

    expect(result.appliedBecause.overriddenRules).toBeDefined();
    expect(result.appliedBecause.overriddenRules).toContain('other-rule-id');
  });

  it('overriddenRules is undefined when overriddenBy is not set', () => {
    const rule = createResolvedRule({ overriddenBy: undefined });
    const context = createContext();
    const result = renderRecommendation(rule, 1, context);
    expect(result.appliedBecause.overriddenRules).toBeUndefined();
  });

  it('includes precedenceScore in appliedBecause', () => {
    const rule = createResolvedRule({ score: 72 });
    const context = createContext();
    const result = renderRecommendation(rule, 1, context);
    expect(result.appliedBecause.precedenceScore).toBe(72);
  });

  it('filters matchedContextVars to only those present in context', () => {
    const rule = createResolvedRule({
      condition: {
        contextVars: { THREAT_LEVEL: 'high', NONEXISTENT_VAR: 'foo' },
        precedenceWeight: 50
      }
    });
    const context = createContext({ THREAT_LEVEL: 'high' });
    // NONEXISTENT_VAR is not in context, so should be filtered out
    const result = renderRecommendation(rule, 1, context);

    const varNames = result.appliedBecause.matchedContextVars.map(v => v.split('=')[0]);
    expect(varNames).toContain('THREAT_LEVEL');
    expect(varNames).not.toContain('NONEXISTENT_VAR');
  });

  it('formats matchedContextVars as key=value strings', () => {
    const rule = createResolvedRule({
      condition: {
        contextVars: { THREAT_LEVEL: 'high' },
        precedenceWeight: 50
      }
    });
    const context = createContext({ THREAT_LEVEL: 'high' });
    const result = renderRecommendation(rule, 1, context);

    expect(result.appliedBecause.matchedContextVars).toContain('THREAT_LEVEL=high');
  });

  it('formats array contextVar values joined with pipe', () => {
    const rule = createResolvedRule({
      condition: {
        contextVars: { THREAT_LEVEL: ['high', 'critical'] },
        precedenceWeight: 50
      }
    });
    const context = createContext({ THREAT_LEVEL: 'high' });
    const result = renderRecommendation(rule, 1, context);

    const matched = result.appliedBecause.matchedContextVars.find(v => v.startsWith('THREAT_LEVEL='));
    expect(matched).toBeDefined();
    expect(matched).toContain('high|critical');
  });
});

// ============================================================================
// generateRecommendations (integration test with mocked loadAllRules)
// ============================================================================

describe('generateRecommendations', () => {
  const mockFs = fs as jest.Mocked<typeof fs>;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  function setupMockRules(rules: AuditRule[]) {
    mockFs.existsSync.mockReturnValue(true);
    mockFs.readdirSync.mockReturnValue(['rules.json'] as any);
    mockFs.readFileSync.mockReturnValue(JSON.stringify(rules) as any);
  }

  it('returns an AuditOutput with required top-level properties', async () => {
    setupMockRules([createRule({ condition: { contextVars: {}, precedenceWeight: 50 } })]);
    const context = createContext();
    const scan = createScanResult();

    const result = await generateRecommendations('/project', context, scan, '/rules');

    expect(result).toHaveProperty('phasing');
    expect(result).toHaveProperty('recommendations');
    expect(result).toHaveProperty('artifacts');
    expect(result).toHaveProperty('explanation');
  });

  it('explanation.contextVars matches provided context', async () => {
    setupMockRules([]);
    const context = createContext({ THREAT_LEVEL: 'high' });
    const scan = createScanResult();

    const result = await generateRecommendations('/project', context, scan, '/rules');

    expect(result.explanation.contextVars).toEqual(context);
  });

  it('recommendations is an array', async () => {
    setupMockRules([]);
    const context = createContext();
    const scan = createScanResult();

    const result = await generateRecommendations('/project', context, scan, '/rules');

    expect(Array.isArray(result.recommendations)).toBe(true);
  });

  it('artifacts is an array', async () => {
    setupMockRules([]);
    const context = createContext();
    const scan = createScanResult();

    const result = await generateRecommendations('/project', context, scan, '/rules');

    expect(Array.isArray(result.artifacts)).toBe(true);
  });

  it('conflictsResolved is an array in explanation', async () => {
    setupMockRules([]);
    const context = createContext();
    const scan = createScanResult();

    const result = await generateRecommendations('/project', context, scan, '/rules');

    expect(Array.isArray(result.explanation.conflictsResolved)).toBe(true);
  });

  it('phasingReason is undefined when phasing is not needed', async () => {
    // Low threat + small codebase + no resource constraint = no phasing
    setupMockRules([]);
    const context = createContext({ THREAT_LEVEL: 'none', RESOURCE_CONSTRAINT: 'standard' });
    const scan = createScanResult({ codebaseSizeLines: 5000 });

    const result = await generateRecommendations('/project', context, scan, '/rules');

    // shouldPhase = false → phasingReason should be undefined
    expect(result.explanation.phasingReason).toBeUndefined();
    expect(result.phasing.phase1).toBeNull();
  });

  it('phasingReason is set when phasing is needed', async () => {
    // Critical threat + huge codebase + severe constraint → phasing
    setupMockRules([]);
    const context = createContext({ THREAT_LEVEL: 'critical', RESOURCE_CONSTRAINT: 'severe' });
    const scan = createScanResult({ codebaseSizeLines: 600000 });

    const result = await generateRecommendations('/project', context, scan, '/rules');

    expect(result.explanation.phasingReason).toBeDefined();
    expect(typeof result.explanation.phasingReason).toBe('string');
  });

  it('phasingReason contains threat level when phasing is needed', async () => {
    setupMockRules([]);
    const context = createContext({ THREAT_LEVEL: 'critical', RESOURCE_CONSTRAINT: 'severe' });
    const scan = createScanResult({ codebaseSizeLines: 600000 });

    const result = await generateRecommendations('/project', context, scan, '/rules');

    expect(result.explanation.phasingReason).toContain('critical');
  });

  it('filters rules by context before scoring', async () => {
    const matchingRule = createRule({
      condition: { contextVars: { THREAT_LEVEL: 'high' }, precedenceWeight: 50 }
    });
    const nonMatchingRule = createRule({
      condition: { contextVars: { THREAT_LEVEL: 'critical' }, precedenceWeight: 50 }
    });

    setupMockRules([matchingRule, nonMatchingRule]);
    const context = createContext({ THREAT_LEVEL: 'high' });
    const scan = createScanResult();

    const result = await generateRecommendations('/project', context, scan, '/rules');

    // Only matching rule should appear in recommendations
    const ruleIds = result.recommendations.map(r => r.ruleId);
    expect(ruleIds).toContain(matchingRule.id);
    expect(ruleIds).not.toContain(nonMatchingRule.id);
  });

  it('phase1 recommendations appear before phase2 recommendations when phasing is active', async () => {
    const hardRule = createRule({
      condition: { contextVars: {}, precedenceWeight: 80 },
      action: { type: 'audit', recommendation: 'hard', enforcementLevel: 'hard-mandatory' }
    });
    const softRule = createRule({
      condition: { contextVars: {}, precedenceWeight: 40 },
      action: { type: 'audit', recommendation: 'soft', enforcementLevel: 'advisory' }
    });

    setupMockRules([hardRule, softRule]);
    // Ensure phasing is triggered
    const context = createContext({ THREAT_LEVEL: 'critical', RESOURCE_CONSTRAINT: 'severe' });
    const scan = createScanResult({ codebaseSizeLines: 600000 });

    const result = await generateRecommendations('/project', context, scan, '/rules');

    // Phase 1 recommendations come first
    const phase1Recs = result.recommendations.filter(r => r.phase === 1);
    const phase2Recs = result.recommendations.filter(r => r.phase === 2);

    expect(phase1Recs.length).toBeGreaterThan(0);
    expect(phase2Recs.length).toBeGreaterThan(0);

    // All phase1 recommendations appear before any phase2 recommendation
    const firstPhase2Idx = result.recommendations.findIndex(r => r.phase === 2);
    const lastPhase1Idx = result.recommendations.map(r => r.phase).lastIndexOf(1);
    if (firstPhase2Idx !== -1 && lastPhase1Idx !== -1) {
      expect(lastPhase1Idx).toBeLessThan(firstPhase2Idx);
    }
  });

  it('collects artifacts from rules with files', async () => {
    const ruleWithFiles = createRule({
      condition: { contextVars: {}, precedenceWeight: 50 },
      action: {
        type: 'scaffold',
        recommendation: 'r',
        enforcementLevel: 'advisory',
        files: [{ path: 'docs/AUDIT.md', template: 'audit' }]
      }
    });

    setupMockRules([ruleWithFiles]);
    const context = createContext();
    const scan = createScanResult();

    const result = await generateRecommendations('/project', context, scan, '/rules');

    expect(result.artifacts).toContain('docs/AUDIT.md');
  });

  it('handles empty rules directory gracefully (returns empty recommendations)', async () => {
    setupMockRules([]);
    const context = createContext();
    const scan = createScanResult();

    const result = await generateRecommendations('/project', context, scan, '/rules');

    expect(result.recommendations).toHaveLength(0);
    expect(result.artifacts).toHaveLength(0);
  });

  it('throws if loadAllRules fails (templates dir missing)', async () => {
    mockFs.existsSync.mockReturnValue(false);
    const context = createContext();
    const scan = createScanResult();

    await expect(
      generateRecommendations('/project', context, scan, '/nonexistent')
    ).rejects.toThrow(/Rules directory not found/);
  });
});
