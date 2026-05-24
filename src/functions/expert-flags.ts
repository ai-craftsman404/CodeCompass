/**
 * Expert flag injection: parse and validate command-line flag overrides
 * Tests drive implementation
 */
import { PrecedenceContext } from '../types/audit';

// Enum values for each flag type
const ENUM_VALUES = {
  PROFILE_STAGE: ['sandbox', 'PoC', 'MVP', 'beta', 'production', 'sunset-legacy'],
  THREAT_LEVEL: ['none', 'low', 'medium', 'high', 'critical'],
  TEAM_SCALE: ['solo', 'pair-trio', 'small', 'multi-team', 'enterprise'],
  AI_PATTERN: ['none', 'LLM API', 'RAG', 'fine-tuning', 'agentic', 'training'],
  COMPLIANCE_FRAMEWORK: ['none', 'GDPR', 'ISO27001', 'Cyber Essentials', 'SOC2', 'FedRAMP', 'HIPAA', 'EU AI Act', 'NIST AI RMF', 'PCI DSS'],
  TEST_MATURITY: ['none', 'unit', 'unit+integration', 'unit+integration+E2E', 'contract', 'chaos'],
  CI_MATURITY: ['none', 'basic', 'full', 'GitOps', 'ADO'],
  DEPLOYMENT_TARGET: ['local-dev', 'cloud', 'on-prem', 'edge', 'hybrid', 'air-gapped']
};

// Weight fields: must be numbers in range 0-100
const WEIGHT_FIELDS = ['SECURITY_WEIGHT', 'COMPLIANCE_WEIGHT', 'THREAT_WEIGHT'];

/**
 * Parse and validate expert flag overrides
 */
export function parseAndValidateFlags(flags: Record<string, string>): { valid: boolean; errors: string[]; parsed: Record<string, unknown> } {
  const errors: string[] = [];
  const parsed: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(flags)) {
    if (key in ENUM_VALUES) {
      const validValues = ENUM_VALUES[key as keyof typeof ENUM_VALUES];
      if (!validValues.includes(value)) {
        errors.push(`${key}: invalid value '${value}', expected one of: ${validValues.join(', ')}`);
      } else {
        parsed[key] = value;
      }
    } else if (WEIGHT_FIELDS.includes(key)) {
      const num = Number(value);
      if (isNaN(num) || num < 0 || num > 100) {
        errors.push(`${key}: must be a number between 0-100, got '${value}'`);
      } else {
        parsed[key] = num;
      }
    } else {
      errors.push(`Flag not recognized: ${key}`);
    }
  }

  return { valid: errors.length === 0, errors, parsed };
}

/**
 * Apply flag overrides (validates and returns object)
 * Throws on invalid values
 */
export function applyFlagOverrides(flags: Record<string, unknown> | null = {}): Record<string, unknown> {
  if (!flags) return {};

  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(flags)) {
    // Check if this is a recognized flag
    const isEnumFlag = key in ENUM_VALUES;
    const isWeightField = WEIGHT_FIELDS.includes(key);

    if (!isEnumFlag && !isWeightField) {
      throw new Error(`${key}: not allowed or unknown flag`);
    }

    // Validate enum flags
    if (isEnumFlag) {
      const validValues = ENUM_VALUES[key as keyof typeof ENUM_VALUES];

      // Handle array values for COMPLIANCE_FRAMEWORK
      if (key === 'COMPLIANCE_FRAMEWORK') {
        if (Array.isArray(value)) {
          // Check each item in the array
          for (const item of value) {
            if (!validValues.includes(String(item))) {
              throw new Error(`${key}: invalid value '${item}', expected one of: ${validValues.join(', ')}`);
            }
          }
          result[key] = value;
        } else {
          // Single string value
          if (!validValues.includes(String(value))) {
            throw new Error(`${key}: invalid value '${value}', expected one of: ${validValues.join(', ')}`);
          }
          result[key] = value;
        }
      } else {
        // All other enum flags: single value string
        const strValue = String(value);
        if (!validValues.includes(strValue)) {
          throw new Error(`invalid value '${strValue}' for ${key}`);
        }
        result[key] = value;
      }
    }

    // Validate weight fields
    if (isWeightField) {
      // Reject non-number types
      if (typeof value === 'string' || typeof value === 'boolean' || value === null || value === undefined) {
        throw new Error(`${key}: must be a number between 0-100, got '${value}'`);
      }

      const num = Number(value);
      if (isNaN(num) || num < 0 || num > 100) {
        throw new Error(`${key}: must be a number between 0-100, got '${value}'`);
      }

      result[key] = num;
    }
  }

  return result;
}
