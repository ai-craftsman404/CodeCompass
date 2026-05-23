/**
 * Precedence scoring: apply precedence matrix to score rules
 * IMPLEMENTATION STUB - Tests drive implementation
 */
import { AuditRule, ScoredRule, PrecedenceContext } from '../types/audit';
/**
 * Apply precedence matrix scoring to a rule based on context
 */
export declare function applyPrecedenceMatrix(rule: AuditRule, context: PrecedenceContext): number;
/**
 * Score multiple rules based on context
 */
export declare function scoreRules(rules: AuditRule[], context: PrecedenceContext): ScoredRule[];
//# sourceMappingURL=precedence-scoring.d.ts.map