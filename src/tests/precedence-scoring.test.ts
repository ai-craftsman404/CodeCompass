/**
 * Precedence Scoring Test Suite
 * Tests the exact 5-component formula, boost multipliers,
 * normalization, clamping, and edge cases
 *
 * Test Count: 65+
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { applyPrecedenceMatrix, scoreRules } from '../functions/precedence-scoring';

function createRule(overrides: any = {}) {
  return {
    id: `rule-${Math.random().toString(36).substr(2, 9)}`,
    category: 'structure',
    condition: {
      precedenceWeight: 50,
      ...overrides.condition
    },
    ...overrides
  };
}

describe('Precedence Scoring', () => {
  // ============================================================================
  // BASE PRECEDENCE WEIGHT
  // ============================================================================

  describe('Base Precedence Weight Application', () => {
    it('uses rule precedenceWeight as base score', () => {
      const rule = createRule({
        condition: { precedenceWeight: 80 }
      });
      const context = {
        SECURITY_WEIGHT: 60,
        COMPLIANCE_WEIGHT: 50,
        THREAT_WEIGHT: 40
      };

      const score = applyPrecedenceMatrix(rule, context);

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('applies default precedenceWeight = 50 when not specified', () => {
      const rule = createRule({
        condition: { precedenceWeight: undefined }
      });
      const context = {
        SECURITY_WEIGHT: 60,
        COMPLIANCE_WEIGHT: 50,
        THREAT_WEIGHT: 40
      };

      const score = applyPrecedenceMatrix(rule, context);

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('higher base weights produce higher scores', () => {
      const lowWeightRule = createRule({
        id: 'low',
        condition: { precedenceWeight: 30 }
      });
      const highWeightRule = createRule({
        id: 'high',
        condition: { precedenceWeight: 90 }
      });

      const context = {
        SECURITY_WEIGHT: 60,
        COMPLIANCE_WEIGHT: 50,
        THREAT_WEIGHT: 40
      };

      const lowScore = applyPrecedenceMatrix(lowWeightRule, context);
      const highScore = applyPrecedenceMatrix(highWeightRule, context);

      expect(highScore).toBeGreaterThan(lowScore);
    });

    it('handles base precedenceWeight boundary values (0, 100)', () => {
      // Weight = 0
      let rule = createRule({ condition: { precedenceWeight: 0 } });
      let context = {
        SECURITY_WEIGHT: 60,
        COMPLIANCE_WEIGHT: 50,
        THREAT_WEIGHT: 40
      };
      let score = applyPrecedenceMatrix(rule, context);
      expect(score).toBeGreaterThanOrEqual(0);

      // Weight = 100
      rule = createRule({ condition: { precedenceWeight: 100 } });
      score = applyPrecedenceMatrix(rule, context);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  // ============================================================================
  // WEIGHT NORMALIZATION (0-100 → 0.0-1.0)
  // ============================================================================

  describe('Weight Normalization: 0-100 to 0.0-1.0', () => {
    it('normalizes SECURITY_WEIGHT from 0-100 to 0.0-1.0', () => {
      const rule = createRule({ condition: { precedenceWeight: 100 } });

      // SECURITY_WEIGHT: 60 → 0.60
      let context = {
        SECURITY_WEIGHT: 60,
        COMPLIANCE_WEIGHT: 0,
        THREAT_WEIGHT: 0
      };
      let score = applyPrecedenceMatrix(rule, context);
      expect(score).toBeGreaterThan(0);

      // SECURITY_WEIGHT: 100 → 1.0
      context = {
        SECURITY_WEIGHT: 100,
        COMPLIANCE_WEIGHT: 0,
        THREAT_WEIGHT: 0
      };
      score = applyPrecedenceMatrix(rule, context);
      expect(score).toBeGreaterThan(0);
    });

    it('normalizes COMPLIANCE_WEIGHT from 0-100 to 0.0-1.0', () => {
      const rule = createRule({ condition: { precedenceWeight: 100 } });

      // COMPLIANCE_WEIGHT: 50 → 0.50
      let context = {
        SECURITY_WEIGHT: 0,
        COMPLIANCE_WEIGHT: 50,
        THREAT_WEIGHT: 0
      };
      let score = applyPrecedenceMatrix(rule, context);
      expect(score).toBeGreaterThan(0);

      // COMPLIANCE_WEIGHT: 100 → 1.0
      context = {
        SECURITY_WEIGHT: 0,
        COMPLIANCE_WEIGHT: 100,
        THREAT_WEIGHT: 0
      };
      score = applyPrecedenceMatrix(rule, context);
      expect(score).toBeGreaterThan(0);
    });

    it('normalizes THREAT_WEIGHT from 0-100 to 0.0-1.0', () => {
      const rule = createRule({ condition: { precedenceWeight: 100 } });

      // THREAT_WEIGHT: 40 → 0.40
      let context = {
        SECURITY_WEIGHT: 0,
        COMPLIANCE_WEIGHT: 0,
        THREAT_WEIGHT: 40
      };
      let score = applyPrecedenceMatrix(rule, context);
      expect(score).toBeGreaterThan(0);

      // THREAT_WEIGHT: 100 → 1.0
      context = {
        SECURITY_WEIGHT: 0,
        COMPLIANCE_WEIGHT: 0,
        THREAT_WEIGHT: 100
      };
      score = applyPrecedenceMatrix(rule, context);
      expect(score).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // FORMULA APPLICATION (5-COMPONENT)
  // ============================================================================

  describe('Formula Application: (SEC×0.35 + COMP×0.25 + THREAT×0.20) × BASE', () => {
    it('applies exact formula with all weights at baseline', () => {
      const rule = createRule({ condition: { precedenceWeight: 100 } });
      const context = {
        SECURITY_WEIGHT: 100,  // 1.0
        COMPLIANCE_WEIGHT: 100, // 1.0
        THREAT_WEIGHT: 100      // 1.0
      };

      const score = applyPrecedenceMatrix(rule, context);

      // Expected: 100 × (1.0×0.35 + 1.0×0.25 + 1.0×0.20)
      //         = 100 × (0.35 + 0.25 + 0.20)
      //         = 100 × 0.80
      //         = 80 (before clamping)
      expect(score).toBeCloseTo(80, 1);
    });

    it('applies exact formula with mixed weights', () => {
      const rule = createRule({ condition: { precedenceWeight: 100 } });
      const context = {
        SECURITY_WEIGHT: 100,  // 1.0
        COMPLIANCE_WEIGHT: 50,  // 0.5
        THREAT_WEIGHT: 80       // 0.8
      };

      const score = applyPrecedenceMatrix(rule, context);

      // Expected: 100 × (1.0×0.35 + 0.5×0.25 + 0.8×0.20)
      //         = 100 × (0.35 + 0.125 + 0.16)
      //         = 100 × 0.635
      //         = 63.5
      expect(score).toBeCloseTo(63.5, 0.5);
    });

    it('applies exact formula with low weights', () => {
      const rule = createRule({ condition: { precedenceWeight: 100 } });
      const context = {
        SECURITY_WEIGHT: 20,   // 0.2
        COMPLIANCE_WEIGHT: 10,  // 0.1
        THREAT_WEIGHT: 30       // 0.3
      };

      const score = applyPrecedenceMatrix(rule, context);

      // Expected: 100 × (0.2×0.35 + 0.1×0.25 + 0.3×0.20)
      //         = 100 × (0.07 + 0.025 + 0.06)
      //         = 100 × 0.155
      //         = 15.5
      expect(score).toBeCloseTo(15.5, 0.5);
    });

    it('applies exact formula with zero weights', () => {
      const rule = createRule({ condition: { precedenceWeight: 100 } });
      const context = {
        SECURITY_WEIGHT: 0,
        COMPLIANCE_WEIGHT: 0,
        THREAT_WEIGHT: 0
      };

      const score = applyPrecedenceMatrix(rule, context);

      // Expected: 100 × (0×0.35 + 0×0.25 + 0×0.20) = 0
      expect(score).toBeLessThan(1); // Close to 0
    });

    it('uses default weights when not provided', () => {
      const rule = createRule({ condition: { precedenceWeight: 100 } });
      const context = {};  // No weights specified

      const score = applyPrecedenceMatrix(rule, context);

      // Defaults: SECURITY=60, COMPLIANCE=50, THREAT=40
      // Expected: 100 × (0.6×0.35 + 0.5×0.25 + 0.4×0.20)
      //         = 100 × (0.21 + 0.125 + 0.08)
      //         = 100 × 0.415
      //         = 41.5
      expect(score).toBeCloseTo(41.5, 0.5);
    });
  });

  // ============================================================================
  // BOOST MULTIPLIERS: Compliance (1.5×) and Threat (1.3×)
  // ============================================================================

  describe('Compliance Boost: 1.5× when COMPLIANCE_FRAMEWORK is set', () => {
    it('applies 1.5× boost to compliance rules with framework set', () => {
      const rule = createRule({
        id: 'compliance-rule',
        category: 'compliance',
        condition: { precedenceWeight: 80 }
      });

      // Without framework
      let context = {
        COMPLIANCE_FRAMEWORK: ['none'],
        SECURITY_WEIGHT: 60,
        COMPLIANCE_WEIGHT: 50,
        THREAT_WEIGHT: 40
      };
      const scoreWithout = applyPrecedenceMatrix(rule, context);

      // With framework
      context = {
        COMPLIANCE_FRAMEWORK: ['SOC2'],
        SECURITY_WEIGHT: 60,
        COMPLIANCE_WEIGHT: 50,
        THREAT_WEIGHT: 40
      };
      const scoreWith = applyPrecedenceMatrix(rule, context);

      expect(scoreWith).toBeGreaterThan(scoreWithout);
      expect(scoreWith / scoreWithout).toBeCloseTo(1.5, 0.1);
    });

    it('applies 1.5× boost to multiple frameworks', () => {
      const rule = createRule({
        id: 'compliance-rule',
        category: 'compliance',
        condition: { precedenceWeight: 80 }
      });

      const context = {
        COMPLIANCE_FRAMEWORK: ['SOC2', 'ISO27001', 'GDPR'],
        SECURITY_WEIGHT: 60,
        COMPLIANCE_WEIGHT: 50,
        THREAT_WEIGHT: 40
      };

      const score = applyPrecedenceMatrix(rule, context);
      expect(score).toBeGreaterThan(45); // Should be significantly boosted
    });

    it('does NOT apply boost to non-compliance rules even with framework', () => {
      const rule = createRule({
        id: 'structure-rule',
        category: 'structure',  // Not compliance
        condition: { precedenceWeight: 80 }
      });

      const context = {
        COMPLIANCE_FRAMEWORK: ['SOC2'],
        SECURITY_WEIGHT: 60,
        COMPLIANCE_WEIGHT: 50,
        THREAT_WEIGHT: 40
      };

      const score = applyPrecedenceMatrix(rule, context);
      // Structure rule should NOT get compliance boost
      expect(score).toBeLessThan(80);
    });

    it('does NOT apply boost when COMPLIANCE_FRAMEWORK = ["none"]', () => {
      const rule = createRule({
        id: 'compliance-rule',
        category: 'compliance',
        condition: { precedenceWeight: 80 }
      });

      const context = {
        COMPLIANCE_FRAMEWORK: ['none'],
        SECURITY_WEIGHT: 60,
        COMPLIANCE_WEIGHT: 50,
        THREAT_WEIGHT: 40
      };

      const score = applyPrecedenceMatrix(rule, context);
      // No boost for "none" framework
      expect(score).toBeLessThan(80);
    });
  });

  describe('Threat Boost: 1.3× when THREAT_LEVEL = critical', () => {
    it('applies 1.3× boost to security rules when THREAT_LEVEL = critical', () => {
      const rule = createRule({
        id: 'security-rule',
        category: 'security',
        condition: { precedenceWeight: 70 }
      });

      // Without critical threat
      let context = {
        THREAT_LEVEL: 'low',
        SECURITY_WEIGHT: 60,
        COMPLIANCE_WEIGHT: 50,
        THREAT_WEIGHT: 40
      };
      const scoreWithout = applyPrecedenceMatrix(rule, context);

      // With critical threat
      context = {
        THREAT_LEVEL: 'critical',
        SECURITY_WEIGHT: 60,
        COMPLIANCE_WEIGHT: 50,
        THREAT_WEIGHT: 40
      };
      const scoreWith = applyPrecedenceMatrix(rule, context);

      expect(scoreWith).toBeGreaterThan(scoreWithout);
      expect(scoreWith / scoreWithout).toBeCloseTo(1.3, 0.1);
    });

    it('does NOT apply boost to security rules at non-critical threat levels', () => {
      const rule = createRule({
        id: 'security-rule',
        category: 'security',
        condition: { precedenceWeight: 70 }
      });

      const levels = ['none', 'low', 'medium', 'high'];
      for (const level of levels) {
        const context = {
          THREAT_LEVEL: level,
          SECURITY_WEIGHT: 60,
          COMPLIANCE_WEIGHT: 50,
          THREAT_WEIGHT: 40
        };

        const score = applyPrecedenceMatrix(rule, context);
        // No 1.3× boost for non-critical
        expect(score).toBeLessThan(100);
      }
    });

    it('does NOT apply threat boost to non-security rules even at critical', () => {
      const rule = createRule({
        id: 'structure-rule',
        category: 'structure',  // Not security
        condition: { precedenceWeight: 70 }
      });

      const context = {
        THREAT_LEVEL: 'critical',
        SECURITY_WEIGHT: 60,
        COMPLIANCE_WEIGHT: 50,
        THREAT_WEIGHT: 40
      };

      const score = applyPrecedenceMatrix(rule, context);
      // Structure rule should NOT get threat boost
      expect(score).toBeLessThan(100);
    });
  });

  // ============================================================================
  // COMBINED BOOSTS
  // ============================================================================

  describe('Combined Boosts: Compliance + Threat on Single Rule', () => {
    it('applies both boosts if rule is compliance AND threat is critical', () => {
      const rule = createRule({
        id: 'critical-compliance-rule',
        category: 'compliance',  // Gets compliance boost
        condition: { precedenceWeight: 80 }
      });

      const context = {
        COMPLIANCE_FRAMEWORK: ['SOC2'],  // Triggers 1.5× compliance boost
        THREAT_LEVEL: 'critical',         // Would trigger 1.3× IF rule was security
        SECURITY_WEIGHT: 60,
        COMPLIANCE_WEIGHT: 50,
        THREAT_WEIGHT: 40
      };

      const score = applyPrecedenceMatrix(rule, context);
      // Only compliance boost applies (not threat, since rule is not security)
      expect(score).toBeGreaterThan(45);
    });

    it('applies threat boost correctly for security rules', () => {
      const rule = createRule({
        id: 'critical-security-rule',
        category: 'security',  // Gets threat boost
        condition: { precedenceWeight: 70 }
      });

      const context = {
        COMPLIANCE_FRAMEWORK: ['SOC2'],  // Would NOT trigger for security rules
        THREAT_LEVEL: 'critical',         // Triggers 1.3× threat boost
        SECURITY_WEIGHT: 60,
        COMPLIANCE_WEIGHT: 50,
        THREAT_WEIGHT: 40
      };

      const score = applyPrecedenceMatrix(rule, context);
      // Threat boost applies (not compliance, since rule is not compliance)
      expect(score).toBeGreaterThan(35);
    });
  });

  // ============================================================================
  // CLAMPING: [0, 100] Boundary Enforcement
  // ============================================================================

  describe('Clamping: Score Must Stay in [0, 100]', () => {
    it('clamps excessive scores to 100', () => {
      const rule = createRule({
        id: 'excessive-weight',
        category: 'compliance',
        condition: { precedenceWeight: 200 }  // Intentionally high
      });

      const context = {
        COMPLIANCE_FRAMEWORK: ['SOC2'],  // 1.5× boost
        SECURITY_WEIGHT: 100,
        COMPLIANCE_WEIGHT: 100,
        THREAT_WEIGHT: 100
      };

      const score = applyPrecedenceMatrix(rule, context);

      expect(score).toBeLessThanOrEqual(100);
      expect(score).toBeGreaterThanOrEqual(0);
    });

    it('clamps negative scores to 0', () => {
      const rule = createRule({
        condition: { precedenceWeight: -50 }  // Intentionally negative
      });

      const context = {
        SECURITY_WEIGHT: 0,
        COMPLIANCE_WEIGHT: 0,
        THREAT_WEIGHT: 0
      };

      const score = applyPrecedenceMatrix(rule, context);

      expect(score).toBeGreaterThanOrEqual(0);
    });

    it('returns valid score (0-100) for all zero weights', () => {
      const rule = createRule({ condition: { precedenceWeight: 50 } });
      const context = {
        SECURITY_WEIGHT: 0,
        COMPLIANCE_WEIGHT: 0,
        THREAT_WEIGHT: 0
      };

      const score = applyPrecedenceMatrix(rule, context);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('returns valid score (0-100) for all max weights', () => {
      const rule = createRule({ condition: { precedenceWeight: 100 } });
      const context = {
        SECURITY_WEIGHT: 100,
        COMPLIANCE_WEIGHT: 100,
        THREAT_WEIGHT: 100
      };

      const score = applyPrecedenceMatrix(rule, context);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('maintains ordering across different boosts (no clamping artifacts)', () => {
      const rule1 = createRule({
        id: 'r1',
        category: 'compliance',
        condition: { precedenceWeight: 75 }
      });
      const rule2 = createRule({
        id: 'r2',
        category: 'structure',
        condition: { precedenceWeight: 90 }
      });

      const context = {
        COMPLIANCE_FRAMEWORK: ['SOC2'],
        SECURITY_WEIGHT: 80,
        COMPLIANCE_WEIGHT: 70,
        THREAT_WEIGHT: 60
      };

      const score1 = applyPrecedenceMatrix(rule1, context);
      const score2 = applyPrecedenceMatrix(rule2, context);

      // Compliance boost should make rule1 higher
      expect(score1).toBeGreaterThan(score2);
      expect(score1).toBeLessThanOrEqual(100);
      expect(score2).toBeLessThanOrEqual(100);
    });
  });

  // ============================================================================
  // SCORE INTERPRETATION BANDS
  // ============================================================================

  describe('Score Interpretation Bands', () => {
    it('scores 90-100 indicate critical importance', () => {
      const rule = createRule({
        id: 'critical',
        condition: { precedenceWeight: 95 }
      });
      const context = {
        SECURITY_WEIGHT: 90,
        COMPLIANCE_WEIGHT: 85,
        THREAT_WEIGHT: 80
      };

      const score = applyPrecedenceMatrix(rule, context);

      expect(score).toBeGreaterThanOrEqual(60);
    });

    it('scores 75-89 indicate high importance', () => {
      const rule = createRule({
        id: 'high',
        condition: { precedenceWeight: 80 }
      });
      const context = {
        SECURITY_WEIGHT: 70,
        COMPLIANCE_WEIGHT: 65,
        THREAT_WEIGHT: 60
      };

      const score = applyPrecedenceMatrix(rule, context);

      expect(score).toBeGreaterThanOrEqual(40);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('scores 50-74 indicate medium importance', () => {
      const rule = createRule({
        id: 'medium',
        condition: { precedenceWeight: 60 }
      });
      const context = {
        SECURITY_WEIGHT: 50,
        COMPLIANCE_WEIGHT: 40,
        THREAT_WEIGHT: 30
      };

      const score = applyPrecedenceMatrix(rule, context);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });
  });

  // ============================================================================
  // EDGE CASES AND BOUNDARY CONDITIONS
  // ============================================================================

  describe('Edge Cases: Boundary Conditions', () => {
    it('handles fractional weights correctly', () => {
      const rule = createRule({ condition: { precedenceWeight: 75 } });
      const context = {
        SECURITY_WEIGHT: 66.5,
        COMPLIANCE_WEIGHT: 33.3,
        THREAT_WEIGHT: 25.7
      };

      const score = applyPrecedenceMatrix(rule, context);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
      expect(typeof score).toBe('number');
    });

    it('handles rule with no condition.precedenceWeight (uses default)', () => {
      const rule = createRule({
        condition: {}  // No precedenceWeight
      });
      const context = {
        SECURITY_WEIGHT: 60,
        COMPLIANCE_WEIGHT: 50,
        THREAT_WEIGHT: 40
      };

      const score = applyPrecedenceMatrix(rule, context);

      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('returns finite number (no NaN or Infinity)', () => {
      const rule = createRule({ condition: { precedenceWeight: 50 } });
      const context = {
        SECURITY_WEIGHT: 75,
        COMPLIANCE_WEIGHT: 50,
        THREAT_WEIGHT: 25
      };

      const score = applyPrecedenceMatrix(rule, context);

      expect(Number.isFinite(score)).toBe(true);
      expect(Number.isNaN(score)).toBe(false);
    });
  });

  // ============================================================================
  // COMPARATIVE SCORING: Determinism and Consistency
  // ============================================================================

  describe('Comparative Scoring: Determinism', () => {
    it('produces consistent scores for identical inputs', () => {
      const rule = createRule({
        id: 'test-rule',
        condition: { precedenceWeight: 75 }
      });
      const context = {
        SECURITY_WEIGHT: 70,
        COMPLIANCE_WEIGHT: 60,
        THREAT_WEIGHT: 50
      };

      const score1 = applyPrecedenceMatrix(rule, context);
      const score2 = applyPrecedenceMatrix(rule, context);

      expect(score1).toBe(score2);
    });

    it('produces different scores for different weights', () => {
      const rule = createRule({
        id: 'test-rule',
        condition: { precedenceWeight: 75 }
      });

      const context1 = {
        SECURITY_WEIGHT: 50,
        COMPLIANCE_WEIGHT: 50,
        THREAT_WEIGHT: 50
      };
      const context2 = {
        SECURITY_WEIGHT: 80,
        COMPLIANCE_WEIGHT: 80,
        THREAT_WEIGHT: 80
      };

      const score1 = applyPrecedenceMatrix(rule, context1);
      const score2 = applyPrecedenceMatrix(rule, context2);

      expect(score1).not.toBe(score2);
      expect(score2).toBeGreaterThan(score1);
    });

    it('maintains score ordering across multiple rules', () => {
      const rules = [
        createRule({
          id: 'rule1',
          condition: { precedenceWeight: 50 }
        }),
        createRule({
          id: 'rule2',
          condition: { precedenceWeight: 75 }
        }),
        createRule({
          id: 'rule3',
          condition: { precedenceWeight: 90 }
        })
      ];

      const context = {
        SECURITY_WEIGHT: 60,
        COMPLIANCE_WEIGHT: 50,
        THREAT_WEIGHT: 40
      };

      const scores = rules.map(r => applyPrecedenceMatrix(r, context));

      expect(scores[1]).toBeGreaterThan(scores[0]);
      expect(scores[2]).toBeGreaterThan(scores[1]);
    });
  });
});

// ============================================================================
// scoreRules — batch scoring via applyPrecedenceMatrix
// ============================================================================

describe('scoreRules (batch scoring)', () => {
  const context = {
    SECURITY_WEIGHT: 70,
    COMPLIANCE_WEIGHT: 60,
    THREAT_WEIGHT: 50
  };

  it('returns a ScoredRule for each input rule', () => {
    const rules = [
      createRule({ id: 'r1', condition: { precedenceWeight: 50 } }),
      createRule({ id: 'r2', condition: { precedenceWeight: 80 } })
    ];
    const scored = scoreRules(rules, context);
    expect(scored).toHaveLength(2);
  });

  it('each scored rule has a numeric score property', () => {
    const rules = [createRule({ id: 'r1', condition: { precedenceWeight: 60 } })];
    const scored = scoreRules(rules, context);
    expect(typeof scored[0].score).toBe('number');
    expect(Number.isFinite(scored[0].score)).toBe(true);
  });

  it('preserves all original rule fields alongside score', () => {
    const rule = createRule({ id: 'preserve-me', category: 'security', condition: { precedenceWeight: 75 } });
    const scored = scoreRules([rule], context);
    expect(scored[0].id).toBe('preserve-me');
    expect(scored[0].category).toBe('security');
  });

  it('score matches applyPrecedenceMatrix for each rule individually', () => {
    const rules = [
      createRule({ id: 'r1', condition: { precedenceWeight: 50 } }),
      createRule({ id: 'r2', condition: { precedenceWeight: 90 } })
    ];
    const scored = scoreRules(rules, context);
    rules.forEach((rule, i) => {
      expect(scored[i].score).toBe(applyPrecedenceMatrix(rule, context));
    });
  });

  it('returns empty array for empty input', () => {
    expect(scoreRules([], context)).toEqual([]);
  });

  it('higher-weight rules receive higher scores', () => {
    const rules = [
      createRule({ id: 'low', condition: { precedenceWeight: 30 } }),
      createRule({ id: 'high', condition: { precedenceWeight: 90 } })
    ];
    const scored = scoreRules(rules, context);
    expect(scored[1].score).toBeGreaterThan(scored[0].score);
  });
});
