/**
 * Expert flag injection: parse and validate command-line flag overrides
 * IMPLEMENTATION STUB - Tests drive implementation
 */
import { PrecedenceContext } from '../types/audit';

/**
 * Parse and validate expert flag overrides
 */
export function parseAndValidateFlags(flags: Record<string, string>): { valid: boolean; errors: string[]; parsed: Record<string, unknown> } {
  const errors: string[] = [];
  const parsed: Record<string, unknown> = {};

  // Whitelist of allowed flags
  const allowedFlags = {
    PROFILE_STAGE: ['sandbox', 'PoC', 'MVP', 'beta', 'production', 'sunset-legacy'],
    COMPLIANCE_FRAMEWORK: 'array',
    THREAT_LEVEL: ['none', 'low', 'medium', 'high', 'critical'],
    TEAM_SCALE: ['solo', 'pair-trio', 'small', 'multi-team', 'enterprise'],
    AI_PATTERN: ['none', 'LLM API', 'RAG', 'fine-tuning', 'agentic', 'model training'],
    SECURITY_WEIGHT: 'number-0-100',
    COMPLIANCE_WEIGHT: 'number-0-100',
    THREAT_WEIGHT: 'number-0-100'
  };

  for (const [key, value] of Object.entries(flags)) {
    if (!(key in allowedFlags)) {
      errors.push(`Flag not recognized: ${key}`);
      continue;
    }

    const allowed = (allowedFlags as Record<string, unknown>)[key];

    // Validate based on type
    if (Array.isArray(allowed)) {
      if (!allowed.includes(value)) {
        errors.push(`${key}: invalid value '${value}', expected one of: ${allowed.join(', ')}`);
      } else {
        parsed[key] = value;
      }
    } else if (allowed === 'number-0-100') {
      const num = Number(value);
      if (isNaN(num) || num < 0 || num > 100) {
        errors.push(`${key}: must be a number between 0-100, got '${value}'`);
      } else {
        parsed[key] = num;
      }
    }
  }

  return { valid: errors.length === 0, errors, parsed };
}

/**
 * Apply flag overrides to context
 */
export function applyFlagOverrides(context: PrecedenceContext, flags: Record<string, unknown>): PrecedenceContext {
  // TODO: Implement flag override application
  const merged = { ...context };
  Object.assign(merged, flags);
  return merged;
}
