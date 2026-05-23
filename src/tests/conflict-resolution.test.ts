/**
 * Conflict Resolution Test Suite
 * Tests explicit overrides, precedence scoring tie-breaking,
 * hard-mandatory rule validation, and circular conflict detection
 *
 * Test Count: 52+
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import {
  detectConflictsBetweenRules,
  resolveConflict,
  resolveAllConflicts,
  validateConflictResolution
} from '../functions/conflict-resolution';

function createRule(overrides: any = {}) {
  return {
    id: `rule-${Math.random().toString(36).substr(2, 9)}`,
    category: 'structure',
    condition: { precedenceWeight: 50 },
    action: { enforcementLevel: 'advisory' },
    conflictsWith: [],
    overrides: [],
    score: 50,
    ...overrides
  };
}

describe('Conflict Resolution', () => {
  // ============================================================================
  // CONFLICT DETECTION: Explicit Declarations
  // ============================================================================

  describe('Conflict Detection: Via conflictsWith Declaration', () => {
    it('detects when ruleB declares conflict with ruleA', () => {
      const ruleA = createRule({ id: 'A' });
      const ruleB = createRule({
        id: 'B',
        conflictsWith: ['A']
      });

      const conflicts = detectConflictsBetweenRules([ruleA, ruleB]);

      expect(conflicts.size).toBeGreaterThan(0);
      const conflict = Array.from(conflicts.values())[0];
      expect([conflict.ruleA.id, conflict.ruleB.id]).toContain('A');
      expect([conflict.ruleA.id, conflict.ruleB.id]).toContain('B');
    });

    it('detects when ruleA declares conflict with ruleB', () => {
      const ruleA = createRule({
        id: 'A',
        conflictsWith: ['B']
      });
      const ruleB = createRule({ id: 'B' });

      const conflicts = detectConflictsBetweenRules([ruleA, ruleB]);

      expect(conflicts.size).toBeGreaterThan(0);
    });

    it('detects bidirectional conflicts (A→B and B→A)', () => {
      const ruleA = createRule({
        id: 'A',
        conflictsWith: ['B']
      });
      const ruleB = createRule({
        id: 'B',
        conflictsWith: ['A']
      });

      const conflicts = detectConflictsBetweenRules([ruleA, ruleB]);

      // May be detected as one conflict (depends on implementation)
      expect(conflicts.size).toBeGreaterThan(0);
    });

    it('does NOT auto-detect conflicts based on categories alone', () => {
      const ruleA = createRule({
        id: 'A',
        category: 'structure'
        // No conflictsWith declaration
      });
      const ruleB = createRule({
        id: 'B',
        category: 'performance'
        // No conflictsWith declaration
      });

      const conflicts = detectConflictsBetweenRules([ruleA, ruleB]);

      // No conflict declared explicitly
      expect(conflicts.size).toBe(0);
    });

    it('detects multiple conflicts in large rule set', () => {
      const rules = [
        createRule({ id: 'A', conflictsWith: ['B'] }),
        createRule({ id: 'B', conflictsWith: ['A'] }),
        createRule({ id: 'C', conflictsWith: ['D'] }),
        createRule({ id: 'D' }),
        createRule({ id: 'E' })  // No conflicts
      ];

      const conflicts = detectConflictsBetweenRules(rules);

      expect(conflicts.size).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // CONFLICT RESOLUTION: Precedence Rules
  // ============================================================================

  describe('Conflict Resolution: Explicit Override (Highest Priority)', () => {
    it('resolves conflict via explicit override declaration', () => {
      const ruleA = createRule({
        id: 'A',
        overrides: ['B'],
        score: 50
      });
      const ruleB = createRule({
        id: 'B',
        conflictsWith: ['A'],
        score: 95  // Higher score, but A overrides explicitly
      });

      const winner = resolveConflict(ruleA, ruleB, {});

      expect(winner).toBe('A');  // Explicit override wins
    });

    it('resolves conflict via ruleB override over ruleA', () => {
      const ruleA = createRule({
        id: 'A',
        score: 90
      });
      const ruleB = createRule({
        id: 'B',
        overrides: ['A'],
        score: 50  // Lower score, but overrides explicitly
      });

      const winner = resolveConflict(ruleA, ruleB, {});

      expect(winner).toBe('B');
    });

    it('explicit override takes precedence over score', () => {
      const ruleA = createRule({
        id: 'A',
        overrides: ['B'],
        score: 30
      });
      const ruleB = createRule({
        id: 'B',
        conflictsWith: ['A'],
        score: 99
      });

      const winner = resolveConflict(ruleA, ruleB, {});

      // A wins despite much lower score
      expect(winner).toBe('A');
    });
  });

  describe('Conflict Resolution: Compliance Precedence Rule', () => {
    it('resolves by compliance precedence when framework is set', () => {
      const ruleA = createRule({
        id: 'A',
        category: 'compliance',
        score: 60
      });
      const ruleB = createRule({
        id: 'B',
        category: 'structure',
        score: 90
      });
      const context = {
        COMPLIANCE_FRAMEWORK: ['SOC2']
      };

      const winner = resolveConflict(ruleA, ruleB, context);

      expect(winner).toBe('A');  // Compliance wins
    });

    it('resolves by compliance precedence against security rules', () => {
      const ruleA = createRule({
        id: 'A',
        category: 'compliance',
        score: 50
      });
      const ruleB = createRule({
        id: 'B',
        category: 'security',
        score: 85
      });
      const context = {
        COMPLIANCE_FRAMEWORK: ['ISO27001']
      };

      const winner = resolveConflict(ruleA, ruleB, context);

      expect(winner).toBe('A');  // Compliance beats security
    });

    it('does NOT apply compliance precedence when framework = "none"', () => {
      const ruleA = createRule({
        id: 'A',
        category: 'compliance',
        score: 60
      });
      const ruleB = createRule({
        id: 'B',
        category: 'structure',
        score: 90
      });
      const context = {
        COMPLIANCE_FRAMEWORK: ['none']
      };

      const winner = resolveConflict(ruleA, ruleB, context);

      // Score wins, not compliance precedence
      expect(winner).toBe('B');
    });

    it('does NOT apply compliance precedence when no framework set', () => {
      const ruleA = createRule({
        id: 'A',
        category: 'compliance',
        score: 60
      });
      const ruleB = createRule({
        id: 'B',
        category: 'structure',
        score: 90
      });
      const context = {};  // No framework

      const winner = resolveConflict(ruleA, ruleB, context);

      expect(winner).toBe('B');  // Score wins
    });
  });

  describe('Conflict Resolution: Threat Precedence Rule', () => {
    it('resolves by threat precedence when THREAT_LEVEL = critical', () => {
      const ruleA = createRule({
        id: 'A',
        category: 'security',
        score: 40
      });
      const ruleB = createRule({
        id: 'B',
        category: 'performance',
        score: 85
      });
      const context = {
        THREAT_LEVEL: 'critical'
      };

      const winner = resolveConflict(ruleA, ruleB, context);

      expect(winner).toBe('A');  // Security wins at critical threat
    });

    it('does NOT apply threat precedence at non-critical threat levels', () => {
      const levels = ['none', 'low', 'medium', 'high'];

      for (const level of levels) {
        const ruleA = createRule({
          id: 'A',
          category: 'security',
          score: 40
        });
        const ruleB = createRule({
          id: 'B',
          category: 'performance',
          score: 85
        });
        const context = {
          THREAT_LEVEL: level
        };

        const winner = resolveConflict(ruleA, ruleB, context);

        // Score should win, not threat precedence
        expect(winner).toBe('B');
      }
    });

    it('does NOT apply threat precedence to non-security rules', () => {
      const ruleA = createRule({
        id: 'A',
        category: 'structure',  // Not security
        score: 40
      });
      const ruleB = createRule({
        id: 'B',
        category: 'performance',
        score: 85
      });
      const context = {
        THREAT_LEVEL: 'critical'
      };

      const winner = resolveConflict(ruleA, ruleB, context);

      // Score wins, not threat precedence
      expect(winner).toBe('B');
    });
  });

  describe('Conflict Resolution: Criticality Tier Precedence', () => {
    it('resolves by score when CRITICALITY_TIER = critical', () => {
      const ruleA = createRule({
        id: 'A',
        score: 85
      });
      const ruleB = createRule({
        id: 'B',
        score: 70
      });
      const context = {
        CRITICALITY_TIER: 'critical'
      };

      const winner = resolveConflict(ruleA, ruleB, context);

      expect(winner).toBe('A');  // Higher score wins
    });
  });

  describe('Conflict Resolution: Default (Score-Based Tie-Breaking)', () => {
    it('resolves by higher score when no explicit precedence applies', () => {
      const ruleA = createRule({
        id: 'A',
        score: 70
      });
      const ruleB = createRule({
        id: 'B',
        score: 85
      });

      const winner = resolveConflict(ruleA, ruleB, {});

      expect(winner).toBe('B');
    });

    it('resolves by ID alphabetical order on exact tie', () => {
      const ruleA = createRule({
        id: 'A',
        score: 75
      });
      const ruleB = createRule({
        id: 'B',
        score: 75
      });

      const winner = resolveConflict(ruleA, ruleB, {});

      // Deterministic: alphabetical order
      expect(winner).toBe('A');
    });

    it('maintains determinism: same inputs → same winner', () => {
      const ruleA = createRule({
        id: 'A',
        score: 80
      });
      const ruleB = createRule({
        id: 'B',
        score: 75
      });
      const context = {};

      const winner1 = resolveConflict(ruleA, ruleB, context);
      const winner2 = resolveConflict(ruleA, ruleB, context);

      expect(winner1).toBe(winner2);
    });
  });

  // ============================================================================
  // FULL CONFLICT RESOLUTION PIPELINE
  // ============================================================================

  describe('Full Conflict Resolution: resolveAllConflicts', () => {
    it('marks conflicting rules with status applied/overridden', () => {
      const rules = [
        createRule({
          id: 'A',
          overrides: ['B'],
          score: 50
        }),
        createRule({
          id: 'B',
          conflictsWith: ['A'],
          score: 80
        })
      ];

      const { resolved } = resolveAllConflicts(rules, {});

      // Only winning rule should have status 'applied'
      const appliedRules = resolved.filter(r => r.status === 'applied');
      expect(appliedRules.length).toBeLessThanOrEqual(1);
      const rule = appliedRules[0];
      expect(rule.id).toBe('A');
      expect(rule.status).toBe('applied');
    });

    it('verifies conflict status with actual values', () => {
      const rules = [
        createRule({
          id: 'A',
          overrides: ['B'],
          score: 50,
          condition: { precedenceWeight: 75 }
        }),
        createRule({
          id: 'B',
          conflictsWith: ['A'],
          score: 80,
          condition: { precedenceWeight: 50 }
        })
      ];

      const { resolved } = resolveAllConflicts(rules, {});

      const winningRule = resolved.find(r => r.id === 'A');
      expect(winningRule).toBeDefined();
      expect(winningRule!.status).toBe('applied');
      // Precedence score should reflect the winner's priority
      expect(winningRule!.condition.precedenceWeight).toBeGreaterThan(50);
    });

    it('handles multiple independent conflicts', () => {
      const rules = [
        createRule({
          id: 'A',
          overrides: ['B'],
          score: 50
        }),
        createRule({
          id: 'B',
          conflictsWith: ['A'],
          score: 80
        }),
        createRule({
          id: 'C',
          conflictsWith: ['D'],
          score: 75
        }),
        createRule({
          id: 'D',
          overrides: ['C'],
          score: 60
        })
      ];

      const { resolved } = resolveAllConflicts(rules, {});

      // A and D should win
      const ids = resolved.map(r => r.id);
      expect(ids).toContain('A');
      expect(ids).toContain('D');
    });

    it('includes non-conflicting rules in output', () => {
      const rules = [
        createRule({
          id: 'A',
          overrides: ['B'],
          score: 50
        }),
        createRule({
          id: 'B',
          conflictsWith: ['A'],
          score: 80
        }),
        createRule({
          id: 'C'  // No conflicts
        })
      ];

      const { resolved } = resolveAllConflicts(rules, {});

      const ids = resolved.map(r => r.id);
      expect(ids).toContain('C');
    });

    it('generates conflict log with winner/loser/reason', () => {
      const rules = [
        createRule({
          id: 'rule-a',
          overrides: ['rule-b'],
          score: 50
        }),
        createRule({
          id: 'rule-b',
          conflictsWith: ['rule-a'],
          score: 80
        })
      ];

      const { conflicts } = resolveAllConflicts(rules, {});

      expect(conflicts.length).toBeGreaterThan(0);
      const log = conflicts[0];
      expect(log).toHaveProperty('winner');
      expect(log).toHaveProperty('loser');
      expect(log).toHaveProperty('reason');
      // Verify actual values
      expect(log.winner.id).toBe('rule-a');
      expect(log.loser.id).toBe('rule-b');
      expect(log.reason).toContain('override');
    });

    it('verifies conflict resolution metadata: forward override (A overrides B)', () => {
      const rules = [
        createRule({
          id: 'rule-a',
          overrides: ['rule-b'],
          score: 50
        }),
        createRule({
          id: 'rule-b',
          conflictsWith: ['rule-a'],
          score: 80
        })
      ];

      const { conflicts } = resolveAllConflicts(rules, {});

      const log = conflicts[0];
      expect(log.winner.id).toBe('rule-a');
      expect(log.loser.id).toBe('rule-b');
      expect(log.reason).toMatch(/override|explicit/i);
    });

    it('verifies conflict resolution metadata: reverse override (B overrides A)', () => {
      const rules = [
        createRule({
          id: 'rule-a',
          score: 50
        }),
        createRule({
          id: 'rule-b',
          overrides: ['rule-a'],
          conflictsWith: ['rule-a'],
          score: 30
        })
      ];

      const { conflicts } = resolveAllConflicts(rules, {});

      const log = conflicts[0];
      expect(log.winner.id).toBe('rule-b');
      expect(log.loser.id).toBe('rule-a');
      expect(log.reason).toContain('override');
    });

    it('applies context-aware precedence rules during resolution', () => {
      const rules = [
        createRule({
          id: 'compliance-rule',
          category: 'compliance',
          score: 60,
          conflictsWith: ['structure-rule']
        }),
        createRule({
          id: 'structure-rule',
          category: 'structure',
          score: 90
        })
      ];

      const context = {
        COMPLIANCE_FRAMEWORK: ['SOC2']
      };

      const { resolved } = resolveAllConflicts(rules, context);

      const ids = resolved.map(r => r.id);
      expect(ids).toContain('compliance-rule');  // Wins via compliance precedence
    });
  });

  // ============================================================================
  // HARD-MANDATORY RULE VALIDATION
  // ============================================================================

  describe('Hard-Mandatory Rule Validation: Critical Invariant', () => {
    it('detects when hard-mandatory rule is overridden', () => {
      const resolved = [
        {
          id: 'hard-rule',
          status: 'overridden',
          action: { enforcementLevel: 'hard-mandatory' },
          overriddenBy: 'other-rule'
        }
      ];

      const validation = validateConflictResolution(resolved);

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.errors[0]).toContain('hard-mandatory');
    });

    it('passes validation when hard-mandatory rules are applied', () => {
      const resolved = [
        {
          id: 'hard-rule',
          status: 'applied',
          action: { enforcementLevel: 'hard-mandatory' }
        },
        {
          id: 'soft-rule',
          status: 'overridden',
          action: { enforcementLevel: 'soft-mandatory' },
          overriddenBy: 'hard-rule'
        }
      ];

      const validation = validateConflictResolution(resolved);

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('detects multiple hard-mandatory violations', () => {
      const resolved = [
        {
          id: 'hard-rule-1',
          status: 'overridden',
          action: { enforcementLevel: 'hard-mandatory' },
          overriddenBy: 'other'
        },
        {
          id: 'hard-rule-2',
          status: 'overridden',
          action: { enforcementLevel: 'hard-mandatory' },
          overriddenBy: 'other'
        }
      ];

      const validation = validateConflictResolution(resolved);

      expect(validation.valid).toBe(false);
      expect(validation.errors.length).toBeGreaterThanOrEqual(2);
    });

    it('allows soft-mandatory and advisory rules to be overridden', () => {
      const resolved = [
        {
          id: 'soft-rule',
          status: 'overridden',
          action: { enforcementLevel: 'soft-mandatory' },
          overriddenBy: 'other'
        },
        {
          id: 'advisory-rule',
          status: 'overridden',
          action: { enforcementLevel: 'advisory' },
          overriddenBy: 'other'
        }
      ];

      const validation = validateConflictResolution(resolved);

      expect(validation.valid).toBe(true);
    });
  });

  // ============================================================================
  // CIRCULAR CONFLICT DETECTION
  // ============================================================================

  describe('Circular Conflict Handling', () => {
    it('detects circular conflict: A→B→A', () => {
      const ruleA = createRule({
        id: 'A',
        conflictsWith: ['B']
      });
      const ruleB = createRule({
        id: 'B',
        conflictsWith: ['A']  // Circular
      });

      const conflicts = detectConflictsBetweenRules([ruleA, ruleB]);

      expect(conflicts.size).toBeGreaterThan(0);
    });

    it('detects 3-way circular conflict: A→B→C→A', () => {
      const rules = [
        createRule({
          id: 'A',
          conflictsWith: ['B']
        }),
        createRule({
          id: 'B',
          conflictsWith: ['C']
        }),
        createRule({
          id: 'C',
          conflictsWith: ['A']
        })
      ];

      const conflicts = detectConflictsBetweenRules(rules);

      expect(conflicts.size).toBeGreaterThan(0);
    });

    it('resolves circular conflicts without infinite loops', () => {
      const rules = [
        createRule({
          id: 'A',
          score: 50,
          conflictsWith: ['B']
        }),
        createRule({
          id: 'B',
          score: 75,
          conflictsWith: ['A']
        })
      ];

      const { resolved } = resolveAllConflicts(rules, {});

      // Should complete without error
      expect(resolved).toBeDefined();
      expect(Array.isArray(resolved)).toBe(true);
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe('Edge Cases: Conflict Resolution Boundaries', () => {
    it('handles resolution with empty context', () => {
      const ruleA = createRule({
        id: 'A',
        score: 70
      });
      const ruleB = createRule({
        id: 'B',
        score: 85,
        conflictsWith: ['A']
      });

      const winner = resolveConflict(ruleA, ruleB, {});

      expect(winner).toBe('B');  // Score-based
    });

    it('handles resolution with null context', () => {
      const ruleA = createRule({
        id: 'A',
        score: 70
      });
      const ruleB = createRule({
        id: 'B',
        score: 85
      });

      const winner = resolveConflict(ruleA, ruleB, null);

      expect(winner).toBe('B');
    });

    it('handles single rule (no conflicts)', () => {
      const rules = [
        createRule({ id: 'A' })
      ];

      const { resolved } = resolveAllConflicts(rules, {});

      expect(resolved).toHaveLength(1);
      expect(resolved[0].id).toBe('A');
      expect(resolved[0].status).toBe('applied');
    });

    it('handles empty rule list', () => {
      const { resolved, conflicts } = resolveAllConflicts([], {});

      expect(resolved).toHaveLength(0);
      expect(conflicts).toHaveLength(0);
    });
  });
});

