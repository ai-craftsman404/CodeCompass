/**
 * Conflict Resolution Engine for Audit Rules
 * Detects and resolves conflicts between applicable rules using precedence matrix
 */
import { AuditRule, PrecedenceContext, ScoredRule, ResolvedRule, RuleConflict } from './types/audit';
/**
 * Detect conflicts between two rules: do they recommend contradictory actions?
 */
export declare function detectConflictsBetweenRules(rules: ScoredRule[]): Map<string, RuleConflict>;
/**
 * Resolve a single conflict between two rules
 * Returns the winning rule ID
 */
export declare function resolveConflict(ruleA: ScoredRule, ruleB: ScoredRule, context: PrecedenceContext): string;
/**
 * Apply the precedence matrix to score rules
 * Lower precedence rules can be overridden by higher precedence variables
 */
export declare function applyPrecedenceMatrix(rule: AuditRule, context: PrecedenceContext): number;
/**
 * Main conflict resolution: apply all rules, detect conflicts, resolve via precedence
 */
export declare function resolveAllConflicts(rules: ScoredRule[], context: PrecedenceContext): {
    resolved: ResolvedRule[];
    conflicts: Array<{
        winner: string;
        loser: string;
        reason: string;
    }>;
};
/**
 * Validate conflict resolution: ensure no hard-mandatory rules are overridden
 */
export declare function validateConflictResolution(resolved: ResolvedRule[]): {
    valid: boolean;
    errors: string[];
};
//# sourceMappingURL=conflict-resolver.d.ts.map