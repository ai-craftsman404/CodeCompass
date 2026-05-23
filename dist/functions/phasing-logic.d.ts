/**
 * Phasing logic: determine if audit should be phased into triage + comprehensive
 * IMPLEMENTATION STUB - Tests drive implementation
 */
import { PrecedenceContext } from '../types/audit';
/**
 * Get threat score (0-1 normalized)
 */
export declare function getThreatScore(context: PrecedenceContext): number;
/**
 * Get codebase size score (0-1 normalized)
 * Assumes codebaseSizeLines is provided in context
 */
export declare function getSizeScore(context: PrecedenceContext): number;
/**
 * Get resource constraint score (0-1 normalized)
 */
export declare function getResourceScore(context: PrecedenceContext): number;
/**
 * Determine if phasing should be suggested
 * Formula: (threat × 0.40) + (size × 0.30) + (resource × 0.30) > 0.65
 */
export declare function shouldSuggestPhasing(context: PrecedenceContext): boolean;
//# sourceMappingURL=phasing-logic.d.ts.map