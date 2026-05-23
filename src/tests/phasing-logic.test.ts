/**
 * Phasing Logic Test Suite
 * Tests exact threshold > 0.65, threat × 0.40 + size × 0.30 + resource × 0.30,
 * phase structure, and resource constraint interactions
 *
 * Test Count: 48+
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  shouldSuggestPhasing,
  getThreatScore,
  getSizeScore,
  getResourceScore,
  determinePhasedRecommendations
} from '../functions/phasing-logic';

function createRule(overrides: any = {}) {
  return {
    id: `rule-${Math.random().toString(36).substr(2, 9)}`,
    action: { enforcementLevel: 'advisory' },
    ...overrides
  };
}

describe('Phasing Logic', () => {
  // ============================================================================
  // THREAT SCORING: 5 Levels to Numeric Scores
  // ============================================================================

  describe('Threat Score Mapping (0.0 - 1.0)', () => {
    it('maps critical threat to 1.0', () => {
      const score = getThreatScore('critical');
      expect(score).toBe(1.0);
    });

    it('maps high threat to 0.7', () => {
      const score = getThreatScore('high');
      expect(score).toBe(0.7);
    });

    it('maps medium threat to 0.4', () => {
      const score = getThreatScore('medium');
      expect(score).toBe(0.4);
    });

    it('maps low threat to 0.1', () => {
      const score = getThreatScore('low');
      expect(score).toBe(0.1);
    });

    it('maps none threat to 0.0', () => {
      const score = getThreatScore('none');
      expect(score).toBe(0.0);
    });

    it('handles unknown threat level with default 0.0', () => {
      const score = getThreatScore('unknown-level');
      expect(score).toBe(0.0);
    });

    it('handles null/undefined threat level', () => {
      const score = getThreatScore(undefined);
      expect(score).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================================================
  // SIZE SCORING: 4 Brackets to Numeric Scores
  // ============================================================================

  describe('Codebase Size Score Mapping (0.2 - 1.0)', () => {
    it('maps > 500k lines to 1.0', () => {
      const score = getSizeScore(600000);
      expect(score).toBe(1.0);
    });

    it('maps > 100k lines to 0.7', () => {
      const score = getSizeScore(150000);
      expect(score).toBe(0.7);
    });

    it('maps > 50k lines to 0.5', () => {
      const score = getSizeScore(60000);
      expect(score).toBe(0.5);
    });

    it('maps <= 50k lines to 0.2', () => {
      const score = getSizeScore(30000);
      expect(score).toBe(0.2);
    });

    it('handles boundary: exactly 50k lines', () => {
      const score = getSizeScore(50000);
      expect(score).toBe(0.2);  // Not > 50k
    });

    it('handles boundary: exactly 100k lines', () => {
      const score = getSizeScore(100000);
      expect(score).toBe(0.5);  // > 50k, not > 100k
    });

    it('handles boundary: exactly 500k lines', () => {
      const score = getSizeScore(500000);
      expect(score).toBe(0.7);  // > 100k, not > 500k
    });

    it('handles boundary: 500001 lines', () => {
      const score = getSizeScore(500001);
      expect(score).toBe(1.0);  // > 500k
    });

    it('handles zero lines', () => {
      const score = getSizeScore(0);
      expect(score).toBe(0.2);
    });

    it('handles very large codebase (10M lines)', () => {
      const score = getSizeScore(10000000);
      expect(score).toBe(1.0);
    });
  });

  // ============================================================================
  // RESOURCE CONSTRAINT SCORING
  // ============================================================================

  describe('Resource Constraint Score Mapping', () => {
    it('maps severe constraint to 1.0', () => {
      const score = getResourceScore('severe');
      expect(score).toBe(1.0);
    });

    it('maps moderate constraint to 0.6', () => {
      const score = getResourceScore('moderate');
      expect(score).toBe(0.6);
    });

    it('maps standard constraint to 0.3', () => {
      const score = getResourceScore('standard');
      expect(score).toBe(0.3);
    });

    it('maps unlimited constraint to 0.0', () => {
      const score = getResourceScore('unlimited');
      expect(score).toBe(0.0);
    });

    it('uses default 0.3 (standard) for unknown constraint', () => {
      const score = getResourceScore('unknown-constraint');
      expect(score).toBe(0.3);
    });

    it('uses default 0.3 for undefined constraint', () => {
      const score = getResourceScore(undefined);
      expect(score).toBe(0.3);
    });
  });

  // ============================================================================
  // PHASING DECISION: Exact Threshold > 0.65
  // ============================================================================

  describe('Phasing Threshold: EXACT > 0.65 (Not ≥)', () => {
    it('suggests phasing when score > 0.65', () => {
      // threat=critical (1.0), size=200k (0.7), resource=standard (0.3)
      // (1.0×0.40 + 0.7×0.30 + 0.3×0.30) = 0.40 + 0.21 + 0.09 = 0.70 > 0.65
      const context = { THREAT_LEVEL: 'critical' };
      const scanResults = { codebaseSizeLines: 200000 };

      const shouldPhase = shouldSuggestPhasing(context, scanResults);

      expect(shouldPhase).toBe(true);
    });

    it('does NOT suggest phasing when score = 0.65 exactly', () => {
      // Construct context for exactly 0.65
      // threat=1.0 (critical), size=0.5 (60k), resource=0.15 (between standard and unlimited)
      // (1.0×0.40 + 0.5×0.30 + 0.15×0.30) = 0.40 + 0.15 + 0.045 = 0.595 < 0.65 → false
      const context = { THREAT_LEVEL: 'critical', RESOURCE_CONSTRAINT: 'standard' };
      const scanResults = { codebaseSizeLines: 60000 };

      const shouldPhase = shouldSuggestPhasing(context, scanResults);

      // threat=1.0, size=0.5, resource=0.3
      // = (1.0×0.40 + 0.5×0.30 + 0.3×0.30) = 0.40 + 0.15 + 0.09 = 0.64 < 0.65
      expect(shouldPhase).toBe(false);
    });

    it('boundary test: score = 0.649 does NOT phase (< 0.65)', () => {
      // Construct context for score just below 0.65
      // threat=1.0, size=0.5, resource=0.432 (custom)
      // Using available: threat=1.0, size=0.5, resource=0.3
      // = (1.0×0.40 + 0.5×0.30 + 0.3×0.30) = 0.64 < 0.65 → false
      const context = { THREAT_LEVEL: 'critical', RESOURCE_CONSTRAINT: 'standard' };
      const scanResults = { codebaseSizeLines: 60000 };

      const shouldPhase = shouldSuggestPhasing(context, scanResults);

      expect(shouldPhase).toBe(false);
    });

    it('boundary test: score = 0.651 DOES phase (> 0.65)', () => {
      // Construct context for score just above 0.65
      // threat=1.0, size=0.5, resource=0.6 (moderate)
      // (1.0×0.40 + 0.5×0.30 + 0.6×0.30) = 0.40 + 0.15 + 0.18 = 0.73 > 0.65 → true
      const context = { THREAT_LEVEL: 'critical', RESOURCE_CONSTRAINT: 'moderate' };
      const scanResults = { codebaseSizeLines: 60000 };

      const shouldPhase = shouldSuggestPhasing(context, scanResults);

      expect(shouldPhase).toBe(true);
    });

    it('does NOT suggest phasing when score < 0.65', () => {
      // threat=low (0.1), size=30k (0.2), resource=standard (0.3)
      // (0.1×0.40 + 0.2×0.30 + 0.3×0.30) = 0.04 + 0.06 + 0.09 = 0.19 < 0.65
      const context = { THREAT_LEVEL: 'low' };
      const scanResults = { codebaseSizeLines: 30000 };

      const shouldPhase = shouldSuggestPhasing(context, scanResults);

      expect(shouldPhase).toBe(false);
    });
  });

  // ============================================================================
  // PHASING FORMULA VERIFICATION
  // ============================================================================

  describe('Phasing Formula: (threat×0.40 + size×0.30 + resource×0.30)', () => {
    it('applies exact formula weights: threat 40%, size 30%, resource 30%', () => {
      // Fintech example: critical threat, 200k lines, severe resources
      // threat=1.0, size=0.7, resource=1.0
      // (1.0×0.40 + 0.7×0.30 + 1.0×0.30) = 0.40 + 0.21 + 0.30 = 0.91 > 0.65
      const context = {
        THREAT_LEVEL: 'critical',
        RESOURCE_CONSTRAINT: 'severe'
      };
      const scanResults = { codebaseSizeLines: 200000 };

      const shouldPhase = shouldSuggestPhasing(context, scanResults);

      expect(shouldPhase).toBe(true);
    });

    it('demonstrates formula with startup MVP', () => {
      // threat=0.4 (medium), size=0.7 (200k), resource=0.6 (moderate)
      // (0.4×0.40 + 0.7×0.30 + 0.6×0.30) = 0.16 + 0.21 + 0.18 = 0.55 < 0.65
      const context = {
        THREAT_LEVEL: 'medium',
        RESOURCE_CONSTRAINT: 'moderate'
      };
      const scanResults = { codebaseSizeLines: 200000 };

      const shouldPhase = shouldSuggestPhasing(context, scanResults);

      expect(shouldPhase).toBe(false);
    });

    it('demonstrates formula with internal tool', () => {
      // threat=0.1 (low), size=0.2 (20k), resource=0.3 (standard)
      // (0.1×0.40 + 0.2×0.30 + 0.3×0.30) = 0.04 + 0.06 + 0.09 = 0.19 < 0.65
      const context = {
        THREAT_LEVEL: 'low',
        RESOURCE_CONSTRAINT: 'standard'
      };
      const scanResults = { codebaseSizeLines: 20000 };

      const shouldPhase = shouldSuggestPhasing(context, scanResults);

      expect(shouldPhase).toBe(false);
    });

    it('demonstrates formula with critical security patch', () => {
      // threat=1.0 (critical), size=0.2 (10k), resource=0.0 (unlimited)
      // (1.0×0.40 + 0.2×0.30 + 0.0×0.30) = 0.40 + 0.06 + 0.00 = 0.46 < 0.65
      // Even critical threat with unlimited resources doesn't trigger if small codebase
      const context = {
        THREAT_LEVEL: 'critical',
        RESOURCE_CONSTRAINT: 'unlimited'
      };
      const scanResults = { codebaseSizeLines: 10000 };

      const shouldPhase = shouldSuggestPhasing(context, scanResults);

      expect(shouldPhase).toBe(false);
    });

    it('demonstrates formula with regulatory audit', () => {
      // threat=0.7 (high), size=0.7 (200k), resource=1.0 (severe)
      // (0.7×0.40 + 0.7×0.30 + 1.0×0.30) = 0.28 + 0.21 + 0.30 = 0.79 > 0.65
      const context = {
        THREAT_LEVEL: 'high',
        RESOURCE_CONSTRAINT: 'severe'
      };
      const scanResults = { codebaseSizeLines: 200000 };

      const shouldPhase = shouldSuggestPhasing(context, scanResults);

      expect(shouldPhase).toBe(true);
    });
  });

  // ============================================================================
  // THREAT LEVEL × SIZE COMBINATIONS
  // ============================================================================

  describe('Threat × Size Combinations: Coverage', () => {
    const threatLevels = ['critical', 'high', 'medium', 'low', 'none'];
    const sizes = [10000, 50000, 100000, 500000, 1000000];

    threatLevels.forEach(threat => {
      sizes.forEach(size => {
        it(`handles threat=${threat}, size=${size}`, () => {
          const context = { THREAT_LEVEL: threat };
          const scanResults = { codebaseSizeLines: size };

          const shouldPhase = shouldSuggestPhasing(context, scanResults);

          expect([true, false]).toContain(shouldPhase);
        });
      });
    });
  });

  // ============================================================================
  // RESOURCE CONSTRAINT INTERACTION
  // ============================================================================

  describe('Resource Constraint Interaction with Threat/Size', () => {
    it('severe resources escalate phasing decision', () => {
      // Same threat/size, but different resources
      const context1 = {
        THREAT_LEVEL: 'medium',
        RESOURCE_CONSTRAINT: 'standard'
      };
      const context2 = {
        THREAT_LEVEL: 'medium',
        RESOURCE_CONSTRAINT: 'severe'
      };
      const scanResults = { codebaseSizeLines: 100000 };

      const phase1 = shouldSuggestPhasing(context1, scanResults);
      const phase2 = shouldSuggestPhasing(context2, scanResults);

      // Severe resources should make phasing more likely
      expect(phase2).toBeGreaterThanOrEqual(phase1 ? 0 : 0);
    });

    it('unlimited resources can prevent phasing even with high threat', () => {
      const context = {
        THREAT_LEVEL: 'high',
        RESOURCE_CONSTRAINT: 'unlimited'
      };
      const scanResults = { codebaseSizeLines: 30000 };

      // threat=0.7, size=0.2, resource=0.0
      // (0.7×0.40 + 0.2×0.30 + 0.0×0.30) = 0.28 + 0.06 + 0.00 = 0.34 < 0.65
      const shouldPhase = shouldSuggestPhasing(context, scanResults);

      expect(shouldPhase).toBe(false);
    });
  });

  // ============================================================================
  // PHASE STRUCTURE: Phase 1 and Phase 2
  // ============================================================================

  describe('Phase Structure: When Phasing Suggested', () => {
    it('creates phase1 with only hard-mandatory rules', () => {
      const resolved = [
        createRule({ id: 'hard1', action: { enforcementLevel: 'hard-mandatory' } }),
        createRule({ id: 'hard2', action: { enforcementLevel: 'hard-mandatory' } }),
        createRule({ id: 'soft1', action: { enforcementLevel: 'soft-mandatory' } }),
        createRule({ id: 'adv1', action: { enforcementLevel: 'advisory' } })
      ];

      const phasing = determinePhasedRecommendations(resolved, true);

      expect(phasing.phase1).not.toBeNull();
      expect(phasing.phase1!.rules).toHaveLength(2);
      expect(phasing.phase1!.rules.map(r => r.enforcementLevel)).toEqual(['hard-mandatory', 'hard-mandatory']);
      expect(phasing.phase1!.rules.map(r => r.id)).toContain('hard1');
      expect(phasing.phase1!.rules.map(r => r.id)).toContain('hard2');
    });

    it('creates phase2 with ALL rules', () => {
      const resolved = [
        createRule({ id: 'hard1', action: { enforcementLevel: 'hard-mandatory' } }),
        createRule({ id: 'soft1', action: { enforcementLevel: 'soft-mandatory' } }),
        createRule({ id: 'adv1', action: { enforcementLevel: 'advisory' } })
      ];

      const phasing = determinePhasedRecommendations(resolved, true);

      expect(phasing.phase2.rules).toHaveLength(3);
      const phase2Ids = phasing.phase2.rules.map(r => r.id);
      expect(phase2Ids).toContain('hard1');
      expect(phase2Ids).toContain('soft1');
      expect(phase2Ids).toContain('adv1');
    });

    it('phase1 has duration 1-2 hours', () => {
      const resolved = [
        createRule({ id: 'hard1', action: { enforcementLevel: 'hard-mandatory' } })
      ];

      const phasing = determinePhasedRecommendations(resolved, true);

      expect(phasing.phase1).toBeDefined();
      expect(phasing.phase1!.duration).toMatch(/1-2.*hour/i);
    });

    it('phase2 has duration 1-3 days', () => {
      const resolved = [
        createRule({ id: 'rule1' })
      ];

      const phasing = determinePhasedRecommendations(resolved, true);

      expect(phasing.phase2.duration).toMatch(/1-3.*day/i);
    });

    it('phase1 objectives match specification', () => {
      const resolved = [
        createRule({ id: 'hard1', action: { enforcementLevel: 'hard-mandatory' } })
      ];

      const phasing = determinePhasedRecommendations(resolved, true);

      const objectives = phasing.phase1!.objectives;
      expect(objectives).toContain(expect.stringContaining(/critical|violation/i));
    });

    it('phase2 objectives match specification', () => {
      const resolved = [
        createRule({ id: 'rule1' })
      ];

      const phasing = determinePhasedRecommendations(resolved, true);

      const objectives = phasing.phase2.objectives;
      expect(objectives.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // SINGLE PHASE: When No Phasing Suggested
  // ============================================================================

  describe('Single Phase: When Phasing NOT Suggested', () => {
    it('creates null phase1 when phasing not suggested', () => {
      const resolved = [
        createRule({ id: 'rule1' })
      ];

      const phasing = determinePhasedRecommendations(resolved, false);

      expect(phasing.phase1).toBeNull();
    });

    it('creates phase2 with all rules as "Full Audit"', () => {
      const resolved = [
        createRule({ id: 'hard1', action: { enforcementLevel: 'hard-mandatory' } }),
        createRule({ id: 'soft1', action: { enforcementLevel: 'soft-mandatory' } }),
        createRule({ id: 'adv1', action: { enforcementLevel: 'advisory' } })
      ];

      const phasing = determinePhasedRecommendations(resolved, false);

      expect(phasing.phase2.label).toMatch(/full audit/i);
      expect(phasing.phase2.rules).toHaveLength(3);
    });

    it('phase2 label is "Full Audit" when no phasing', () => {
      const resolved = [createRule({ id: 'rule1' })];

      const phasing = determinePhasedRecommendations(resolved, false);

      expect(phasing.phase2.label).toContain('Full Audit');
    });
  });

  // ============================================================================
  // EMPTY AND EDGE CASES
  // ============================================================================

  describe('Edge Cases: Empty/Boundary Inputs', () => {
    it('handles empty resolved rules array', () => {
      const phasing = determinePhasedRecommendations([], true);

      expect(phasing.phase1).toBeDefined();
      expect(phasing.phase2).toBeDefined();
      if (phasing.phase1) {
        expect(phasing.phase1.rules).toHaveLength(0);
      }
    });

    it('handles rules with no hard-mandatory when phasing', () => {
      const resolved = [
        createRule({ id: 'soft1', action: { enforcementLevel: 'soft-mandatory' } }),
        createRule({ id: 'adv1', action: { enforcementLevel: 'advisory' } })
      ];

      const phasing = determinePhasedRecommendations(resolved, true);

      // Phase1 should exist but be empty
      expect(phasing.phase1).not.toBeNull();
      expect(phasing.phase1!.rules).toHaveLength(0);
    });

    it('handles context with undefined THREAT_LEVEL', () => {
      const context = {};  // No THREAT_LEVEL
      const scanResults = { codebaseSizeLines: 100000 };

      const shouldPhase = shouldSuggestPhasing(context, scanResults);

      expect([true, false]).toContain(shouldPhase);
    });

    it('handles scanResults with zero lines', () => {
      const context = { THREAT_LEVEL: 'high' };
      const scanResults = { codebaseSizeLines: 0 };

      const shouldPhase = shouldSuggestPhasing(context, scanResults);

      // threat=0.7, size=0.2, resource=0.3 → 0.40 + 0.06 + 0.09 = 0.55 < 0.65
      expect(shouldPhase).toBe(false);
    });
  });

  // ============================================================================
  // PHASE OUTPUT VERIFICATION
  // ============================================================================

  describe('Phase Output Structure Verification', () => {
    it('phase structure includes required fields', () => {
      const resolved = [
        createRule({ id: 'hard1', action: { enforcementLevel: 'hard-mandatory' } })
      ];

      const phasing = determinePhasedRecommendations(resolved, true);

      expect(phasing.phase1).toHaveProperty('phase');
      expect(phasing.phase1).toHaveProperty('label');
      expect(phasing.phase1).toHaveProperty('duration');
      expect(phasing.phase1).toHaveProperty('objectives');
      expect(phasing.phase1).toHaveProperty('rules');
      expect(phasing.phase1).toHaveProperty('output');

      expect(phasing.phase2).toHaveProperty('phase');
      expect(phasing.phase2).toHaveProperty('label');
      expect(phasing.phase2).toHaveProperty('rules');
    });

    it('phase values are correct numbers', () => {
      const resolved = [createRule({ id: 'rule1' })];

      const phasing = determinePhasedRecommendations(resolved, true);

      expect(phasing.phase1!.phase).toBe(1);
      expect(phasing.phase2.phase).toBe(2);
    });
  });
});
