/**
 * Conflict resolution: detect and resolve conflicts between rules
 * IMPLEMENTATION STUB - Tests drive implementation
 *
 * For full implementation, see src/conflict-resolver.ts
 */
import { AuditRule, PrecedenceContext, ResolvedRule } from '../types/audit';
/**
 * Detect conflicts between two rules
 */
export declare function detectConflictsBetweenRules(ruleA: AuditRule, ruleB: AuditRule): boolean;
/**
 * Resolve conflict between two rules
 * Returns the ID of the winning rule
 */
export declare function resolveConflict(ruleA: ResolvedRule, ruleB: ResolvedRule, context: PrecedenceContext): string;
/**
 * Resolve all conflicts in a rule set
 */
export declare function resolveAllConflicts(rules: ResolvedRule[], context: PrecedenceContext): ResolvedRule[];
/**
 * Validate that no hard-mandatory rules were overridden
 */
export declare function validateConflictResolution(original: AuditRule[], resolved: ResolvedRule[]): {
    valid: boolean;
    errors: string[];
};
//# sourceMappingURL=conflict-resolution.d.ts.map