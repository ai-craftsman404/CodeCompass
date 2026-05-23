/**
 * Conflict Resolution Engine for Audit Rules
 * Detects and resolves conflicts between applicable rules using precedence matrix
 */

import { AuditRule, PrecedenceContext, ScoredRule, ResolvedRule, RuleConflict } from './types/audit';

/**
 * Detect conflicts between two rules: do they recommend contradictory actions?
 */
export function detectConflictsBetweenRules(rules: ScoredRule[]): Map<string, RuleConflict> {
  const conflicts = new Map<string, RuleConflict>();

  for (let i = 0; i < rules.length; i++) {
    for (let j = i + 1; j < rules.length; j++) {
      const ruleA = rules[i];
      const ruleB = rules[j];

      // Check if ruleB is explicitly marked as conflicting with ruleA
      if (ruleB.conflictsWith?.includes(ruleA.id)) {
        const conflictKey = `${ruleA.id}--${ruleB.id}`;
        conflicts.set(conflictKey, {
          ruleA,
          ruleB,
          reason: `${ruleB.id} declares conflict with ${ruleA.id}`
        });
      }

      // Check if ruleA is explicitly marked as conflicting with ruleB
      if (ruleA.conflictsWith?.includes(ruleB.id)) {
        const conflictKey = `${ruleA.id}--${ruleB.id}`;
        conflicts.set(conflictKey, {
          ruleA,
          ruleB,
          reason: `${ruleA.id} declares conflict with ${ruleB.id}`
        });
      }
    }
  }

  return conflicts;
}

/**
 * Resolve a single conflict between two rules
 * Returns the winning rule ID
 */
export function resolveConflict(
  ruleA: ScoredRule,
  ruleB: ScoredRule,
  context: PrecedenceContext
): string {
  // Check explicit overrides
  if (ruleA.overrides?.includes(ruleB.id)) {
    return ruleA.id;
  }
  if (ruleB.overrides?.includes(ruleA.id)) {
    return ruleB.id;
  }

  // Apply critical precedence rules
  // Rule 1: CRITICALITY_TIER (100) always wins
  if (context.CRITICALITY_TIER === 'critical') {
    // Any rule addressing critical security wins
    return ruleA.score > ruleB.score ? ruleA.id : ruleB.id;
  }

  // Rule 2: COMPLIANCE_FRAMEWORK (90) overrides PROFILE_STAGE (75)
  if (context.COMPLIANCE_FRAMEWORK && context.COMPLIANCE_FRAMEWORK.length > 0 && context.COMPLIANCE_FRAMEWORK[0] !== 'none') {
    // If one rule is compliance-focused and other is stage-focused, compliance wins
    const ruleAIsCompliance = ruleA.category === 'compliance';
    const ruleBIsCompliance = ruleB.category === 'compliance';

    if (ruleAIsCompliance && !ruleBIsCompliance) {
      return ruleA.id;
    }
    if (ruleBIsCompliance && !ruleAIsCompliance) {
      return ruleB.id;
    }
  }

  // Rule 3: THREAT_LEVEL (85) overrides RESOURCE_CONSTRAINT (60)
  if (context.THREAT_LEVEL === 'critical') {
    // If one rule addresses threat and other addresses resources, threat wins
    const ruleAIsThreat = ruleA.category === 'security';
    const ruleBIsThreat = ruleB.category === 'security';

    if (ruleAIsThreat && !ruleBIsThreat) {
      return ruleA.id;
    }
    if (ruleBIsThreat && !ruleAIsThreat) {
      return ruleB.id;
    }
  }

  // Default: Higher precedence score wins
  return ruleA.score > ruleB.score ? ruleA.id : ruleB.id;
}

/**
 * Apply the precedence matrix to score rules
 * Lower precedence rules can be overridden by higher precedence variables
 */
export function applyPrecedenceMatrix(rule: AuditRule, context: PrecedenceContext): number {
  let score = rule.condition.precedenceWeight || 50;

  // Apply context variable weighting (numeric factors)
  const securityFactor = (context.SECURITY_WEIGHT || 60) / 100;
  const complianceFactor = (context.COMPLIANCE_WEIGHT || 50) / 100;
  const threatFactor = (context.THREAT_WEIGHT || 40) / 100;

  // Formula: weighted combination of factors
  score = score * (securityFactor * 0.35 + complianceFactor * 0.25 + threatFactor * 0.2);

  // Boost score if rule matches COMPLIANCE_FRAMEWORK
  if (context.COMPLIANCE_FRAMEWORK && context.COMPLIANCE_FRAMEWORK.length > 0 && rule.category === 'compliance') {
    score *= 1.5;
  }

  // Boost score if rule matches THREAT_LEVEL
  if (context.THREAT_LEVEL === 'critical' && rule.category === 'security') {
    score *= 1.3;
  }

  // Clamp to 0-100
  return Math.max(0, Math.min(100, score));
}

/**
 * Main conflict resolution: apply all rules, detect conflicts, resolve via precedence
 */
export function resolveAllConflicts(
  rules: ScoredRule[],
  context: PrecedenceContext
): {
  resolved: ResolvedRule[];
  conflicts: Array<{ winner: string; loser: string; reason: string }>;
} {
  const conflicts = detectConflictsBetweenRules(rules);
  const resolved: ResolvedRule[] = [];
  const conflictLog: Array<{ winner: string; loser: string; reason: string }> = [];

  const resolvedIds = new Set<string>();

  // Process each rule
  for (const rule of rules) {
    // Check if this rule is involved in any conflicts
    let hasConflict = false;
    for (const [key, conflict] of conflicts) {
      if (conflict.ruleA.id === rule.id || conflict.ruleB.id === rule.id) {
        hasConflict = true;
        const other = conflict.ruleA.id === rule.id ? conflict.ruleB : conflict.ruleA;
        const winner = resolveConflict(rule as ScoredRule, other as ScoredRule, context);

        if (winner === rule.id) {
          // This rule wins the conflict
          resolved.push({
            ...rule,
            status: 'applied',
            explanation: `Applied (won conflict vs ${other.id} due to ${conflict.reason})`
          });
          resolvedIds.add(rule.id);
          conflictLog.push({ winner: rule.id, loser: other.id, reason: conflict.reason });
        } else {
          // This rule loses the conflict
          resolved.push({
            ...rule,
            status: 'overridden',
            overriddenBy: winner,
            explanation: `Overridden by ${winner} due to ${conflict.reason}`
          });
          conflictLog.push({ winner, loser: rule.id, reason: conflict.reason });
        }
        break;
      }
    }

    // If no conflict, apply the rule
    if (!hasConflict) {
      resolved.push({
        ...rule,
        status: 'applied',
        explanation: 'Applied (no conflicts)'
      });
      resolvedIds.add(rule.id);
    }
  }

  // Dedup: remove overridden rules, keep only winners
  const final = resolved.filter(r => r.status === 'applied');

  return {
    resolved: final,
    conflicts: conflictLog
  };
}

/**
 * Validate conflict resolution: ensure no hard-mandatory rules are overridden
 */
export function validateConflictResolution(resolved: ResolvedRule[]): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  for (const rule of resolved) {
    if (rule.status === 'overridden' && rule.action.enforcementLevel === 'hard-mandatory') {
      errors.push(`Hard-mandatory rule ${rule.id} was overridden by ${rule.overriddenBy}. This may indicate a precedence misconfiguration.`);
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}
