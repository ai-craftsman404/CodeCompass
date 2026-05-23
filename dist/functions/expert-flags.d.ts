/**
 * Expert flag injection: parse and validate command-line flag overrides
 * IMPLEMENTATION STUB - Tests drive implementation
 */
import { PrecedenceContext } from '../types/audit';
/**
 * Parse and validate expert flag overrides
 */
export declare function parseAndValidateFlags(flags: Record<string, string>): {
    valid: boolean;
    errors: string[];
    parsed: Record<string, unknown>;
};
/**
 * Apply flag overrides to context
 */
export declare function applyFlagOverrides(context: PrecedenceContext, flags: Record<string, unknown>): PrecedenceContext;
//# sourceMappingURL=expert-flags.d.ts.map