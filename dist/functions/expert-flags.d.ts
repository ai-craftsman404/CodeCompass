/**
 * Parse and validate expert flag overrides
 */
export declare function parseAndValidateFlags(flags: Record<string, string>): {
    valid: boolean;
    errors: string[];
    parsed: Record<string, unknown>;
};
/**
 * Apply flag overrides (validates and returns object)
 * Throws on invalid values
 */
export declare function applyFlagOverrides(flags?: Record<string, unknown> | null): Record<string, unknown>;
//# sourceMappingURL=expert-flags.d.ts.map