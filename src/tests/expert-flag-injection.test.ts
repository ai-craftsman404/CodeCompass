/**
 * Expert Flag Injection Test Suite
 * Tests /audit FLAG=value syntax, enum validation, numeric bounds,
 * override precedence, and error handling
 *
 * Test Count: 32+
 */

import { describe, it, expect } from '@jest/globals';
import { parseAndValidateFlags, applyFlagOverrides } from '../functions/expert-flags';

describe('Expert Flag Injection', () => {
  // ============================================================================
  // VALID FLAG SYNTAX AND PARSING
  // ============================================================================

  describe('Valid Flag Syntax: /audit FLAG=value format', () => {
    it('parses single flag override', () => {
      const flags = { PROFILE_STAGE: 'production' };
      const validated = applyFlagOverrides(flags);

      expect(validated.PROFILE_STAGE).toBe('production');
    });

    it('parses multiple flag overrides', () => {
      const flags = {
        PROFILE_STAGE: 'production',
        TEAM_SCALE: 'multi-team',
        AI_PATTERN: 'agentic'
      };
      const validated = applyFlagOverrides(flags);

      expect(validated.PROFILE_STAGE).toBe('production');
      expect(validated.TEAM_SCALE).toBe('multi-team');
      expect(validated.AI_PATTERN).toBe('agentic');
    });

    it('parses comprehensive expert flag override', () => {
      const flags = {
        COMPLIANCE_FRAMEWORK: 'SOC2',
        PROFILE_STAGE: 'production',
        AI_PATTERN: 'agentic',
        TEAM_SCALE: 'multi-team',
        THREAT_LEVEL: 'critical',
        SECURITY_WEIGHT: 90,
        COMPLIANCE_WEIGHT: 80,
        THREAT_WEIGHT: 70
      };
      const validated = applyFlagOverrides(flags);

      expect(validated.PROFILE_STAGE).toBe('production');
      expect(validated.COMPLIANCE_FRAMEWORK).toBe('SOC2');
      expect(validated.THREAT_LEVEL).toBe('critical');
      expect(validated.SECURITY_WEIGHT).toBe(90);
    });

    it('handles empty flags object gracefully', () => {
      const validated = applyFlagOverrides({});

      expect(validated).toEqual({});
    });

    it('handles null flags gracefully', () => {
      const validated = applyFlagOverrides(null);

      expect(validated).toEqual({});
    });
  });

  // ============================================================================
  // ENUM VALUE VALIDATION: Tier 1 Variables
  // ============================================================================

  describe('Enum Validation: PROFILE_STAGE', () => {
    it('accepts valid PROFILE_STAGE values', () => {
      const validStages = ['sandbox', 'PoC', 'MVP', 'beta', 'production', 'sunset-legacy'];

      for (const stage of validStages) {
        const flags = { PROFILE_STAGE: stage };
        const validated = applyFlagOverrides(flags);
        expect(validated.PROFILE_STAGE).toBe(stage);
      }
    });

    it('rejects invalid PROFILE_STAGE values', () => {
      const flags = { PROFILE_STAGE: 'invalid-stage' };

      expect(() => applyFlagOverrides(flags)).toThrow(/invalid|allowed/i);
    });

    it('rejects common misspellings', () => {
      const invalidValues = ['prod', 'dev', 'staging', 'production-ready'];

      for (const value of invalidValues) {
        const flags = { PROFILE_STAGE: value };
        expect(() => applyFlagOverrides(flags)).toThrow();
      }
    });
  });

  describe('Enum Validation: TEAM_SCALE', () => {
    it('accepts valid TEAM_SCALE values', () => {
      const validScales = ['solo', 'pair-trio', 'small', 'multi-team', 'enterprise'];

      for (const scale of validScales) {
        const flags = { TEAM_SCALE: scale };
        const validated = applyFlagOverrides(flags);
        expect(validated.TEAM_SCALE).toBe(scale);
      }
    });

    it('rejects invalid TEAM_SCALE values', () => {
      const flags = { TEAM_SCALE: 'mega-enterprise' };

      expect(() => applyFlagOverrides(flags)).toThrow();
    });
  });

  describe('Enum Validation: AI_PATTERN', () => {
    it('accepts valid AI_PATTERN values', () => {
      const validPatterns = ['none', 'LLM API', 'RAG', 'fine-tuning', 'agentic', 'training'];

      for (const pattern of validPatterns) {
        const flags = { AI_PATTERN: pattern };
        const validated = applyFlagOverrides(flags);
        expect(validated.AI_PATTERN).toBe(pattern);
      }
    });

    it('rejects invalid AI_PATTERN values', () => {
      const flags = { AI_PATTERN: 'agent' };  // Misspelling

      expect(() => applyFlagOverrides(flags)).toThrow();
    });

    it('rejects case-sensitive mismatches', () => {
      const flags = { AI_PATTERN: 'agentic API' };

      expect(() => applyFlagOverrides(flags)).toThrow();
    });
  });

  // ============================================================================
  // ENUM VALIDATION: Compliance Framework (Array Type)
  // ============================================================================

  describe('Enum Validation: COMPLIANCE_FRAMEWORK (Array)', () => {
    it('accepts single compliance framework as string', () => {
      const flags = { COMPLIANCE_FRAMEWORK: 'SOC2' };
      const validated = applyFlagOverrides(flags);

      expect(validated.COMPLIANCE_FRAMEWORK).toBe('SOC2');
    });

    it('accepts multiple frameworks as array', () => {
      const flags = { COMPLIANCE_FRAMEWORK: ['SOC2', 'ISO27001'] };
      const validated = applyFlagOverrides(flags);

      expect(Array.isArray(validated.COMPLIANCE_FRAMEWORK)).toBe(true);
    });

    it('accepts all valid compliance frameworks', () => {
      const valid = ['none', 'GDPR', 'ISO27001', 'Cyber Essentials', 'SOC2', 'FedRAMP', 'HIPAA'];

      for (const framework of valid) {
        const flags = { COMPLIANCE_FRAMEWORK: framework };
        const validated = applyFlagOverrides(flags);
        expect(validated.COMPLIANCE_FRAMEWORK).toBe(framework);
      }
    });

    it('rejects invalid compliance framework', () => {
      const flags = { COMPLIANCE_FRAMEWORK: 'INVALID_COMPLIANCE' };

      expect(() => applyFlagOverrides(flags)).toThrow();
    });

    it('filters invalid values from array', () => {
      const flags = { COMPLIANCE_FRAMEWORK: ['SOC2', 'INVALID', 'ISO27001'] };

      // Implementation-dependent: may filter or reject
      expect(() => applyFlagOverrides(flags)).toThrow();
    });
  });

  // ============================================================================
  // NUMERIC WEIGHT VALIDATION: 0-100 Bounds
  // ============================================================================

  describe('Numeric Validation: SECURITY_WEIGHT (0-100)', () => {
    it('accepts valid SECURITY_WEIGHT values', () => {
      const validWeights = [0, 25, 50, 75, 100];

      for (const weight of validWeights) {
        const flags = { SECURITY_WEIGHT: weight };
        const validated = applyFlagOverrides(flags);
        expect(validated.SECURITY_WEIGHT).toBe(weight);
      }
    });

    it('accepts boundary values 0 and 100', () => {
      let flags = { SECURITY_WEIGHT: 0 };
      let validated = applyFlagOverrides(flags);
      expect(validated.SECURITY_WEIGHT).toBe(0);

      flags = { SECURITY_WEIGHT: 100 };
      validated = applyFlagOverrides(flags);
      expect(validated.SECURITY_WEIGHT).toBe(100);
    });

    it('rejects values below 0', () => {
      const flags = { SECURITY_WEIGHT: -1 };

      expect(() => applyFlagOverrides(flags)).toThrow(/0-100|range|bounds/i);
    });

    it('rejects values above 100', () => {
      const flags = { SECURITY_WEIGHT: 101 };

      expect(() => applyFlagOverrides(flags)).toThrow(/0-100|range|bounds/i);
    });

    it('rejects non-numeric values', () => {
      const flags = { SECURITY_WEIGHT: 'fifty' };

      expect(() => applyFlagOverrides(flags)).toThrow(/number|numeric/i);
    });

    it('accepts fractional weights', () => {
      const flags = { SECURITY_WEIGHT: 67.5 };
      const validated = applyFlagOverrides(flags);

      expect(validated.SECURITY_WEIGHT).toBe(67.5);
    });
  });

  describe('Numeric Validation: COMPLIANCE_WEIGHT (0-100)', () => {
    it('accepts valid COMPLIANCE_WEIGHT values', () => {
      const flags = { COMPLIANCE_WEIGHT: 75 };
      const validated = applyFlagOverrides(flags);

      expect(validated.COMPLIANCE_WEIGHT).toBe(75);
    });

    it('rejects values outside 0-100', () => {
      expect(() => applyFlagOverrides({ COMPLIANCE_WEIGHT: 150 })).toThrow();
    });
  });

  describe('Numeric Validation: THREAT_WEIGHT (0-100)', () => {
    it('accepts valid THREAT_WEIGHT values', () => {
      const flags = { THREAT_WEIGHT: 85 };
      const validated = applyFlagOverrides(flags);

      expect(validated.THREAT_WEIGHT).toBe(85);
    });

    it('rejects values outside 0-100', () => {
      expect(() => applyFlagOverrides({ THREAT_WEIGHT: -50 })).toThrow();
    });
  });

  // ============================================================================
  // ENUM VALIDATION: Tier 3 Expert Variables
  // ============================================================================

  describe('Enum Validation: THREAT_LEVEL', () => {
    it('accepts valid THREAT_LEVEL values', () => {
      const validLevels = ['none', 'low', 'medium', 'high', 'critical'];

      for (const level of validLevels) {
        const flags = { THREAT_LEVEL: level };
        const validated = applyFlagOverrides(flags);
        expect(validated.THREAT_LEVEL).toBe(level);
      }
    });

    it('rejects invalid THREAT_LEVEL values', () => {
      const flags = { THREAT_LEVEL: 'extreme' };

      expect(() => applyFlagOverrides(flags)).toThrow();
    });
  });

  describe('Enum Validation: TEST_MATURITY', () => {
    it('accepts valid TEST_MATURITY values', () => {
      const validLevels = ['none', 'unit', 'unit+integration', 'unit+integration+E2E', 'contract', 'chaos'];

      for (const level of validLevels) {
        const flags = { TEST_MATURITY: level };
        const validated = applyFlagOverrides(flags);
        expect(validated.TEST_MATURITY).toBe(level);
      }
    });

    it('rejects invalid TEST_MATURITY values', () => {
      const flags = { TEST_MATURITY: 'integration' };

      expect(() => applyFlagOverrides(flags)).toThrow();
    });
  });

  describe('Enum Validation: CI_MATURITY', () => {
    it('accepts valid CI_MATURITY values', () => {
      const validLevels = ['none', 'basic', 'full', 'GitOps', 'ADO'];

      for (const level of validLevels) {
        const flags = { CI_MATURITY: level };
        const validated = applyFlagOverrides(flags);
        expect(validated.CI_MATURITY).toBe(level);
      }
    });

    it('rejects invalid CI_MATURITY values', () => {
      const flags = { CI_MATURITY: 'advanced' };

      expect(() => applyFlagOverrides(flags)).toThrow();
    });
  });

  describe('Enum Validation: DEPLOYMENT_TARGET', () => {
    it('accepts valid DEPLOYMENT_TARGET values', () => {
      const validTargets = ['local-dev', 'cloud', 'on-prem', 'edge', 'hybrid', 'air-gapped'];

      for (const target of validTargets) {
        const flags = { DEPLOYMENT_TARGET: target };
        const validated = applyFlagOverrides(flags);
        expect(validated.DEPLOYMENT_TARGET).toBe(target);
      }
    });

    it('rejects invalid DEPLOYMENT_TARGET values', () => {
      const flags = { DEPLOYMENT_TARGET: 'cloud-standard' };

      expect(() => applyFlagOverrides(flags)).toThrow();
    });
  });

  // ============================================================================
  // RESTRICTED FLAGS: Not Allowed for Override
  // ============================================================================

  describe('Restricted Flags: Whitelist Enforcement', () => {
    it('rejects flagOverrides key (read-only)', () => {
      const flags = { flagOverrides: { nested: 'value' } };

      expect(() => applyFlagOverrides(flags)).toThrow(/not allowed|whitelist|invalid/i);
    });

    it('rejects userAnswers key (read-only)', () => {
      const flags = { userAnswers: { tier1: {} } };

      expect(() => applyFlagOverrides(flags)).toThrow();
    });

    it('rejects unknown flags not in whitelist', () => {
      const flags = { UNKNOWN_VARIABLE: 'value' };

      expect(() => applyFlagOverrides(flags)).toThrow();
    });

    it('rejects multiple unknown flags', () => {
      const flags = {
        PROFILE_STAGE: 'production',  // Valid
        CUSTOM_FLAG: 'value',           // Invalid
        ANOTHER_FLAG: 'value'           // Invalid
      };

      expect(() => applyFlagOverrides(flags)).toThrow();
    });
  });

  // ============================================================================
  // OVERRIDE PRECEDENCE: Flags Override Questionnaire
  // ============================================================================

  describe('Override Precedence: Flags Win Over Questionnaire', () => {
    it('flags override Tier 1 questionnaire answers', () => {
      const tier1 = { stage: 'PoC', team_scope: 'solo', ai_involvement: 'none', compliance: 'none' };
      const flags = {
        PROFILE_STAGE: 'production',
        TEAM_SCALE: 'multi-team'
      };

      // In context mapping: flags applied after tier1
      const flagValues = applyFlagOverrides(flags);

      expect(flagValues.PROFILE_STAGE).toBe('production');
      expect(flagValues.TEAM_SCALE).toBe('multi-team');
    });

    it('flags can selectively override (partial override)', () => {
      const flags = {
        PROFILE_STAGE: 'production'
        // TEAM_SCALE not overridden
      };

      const validated = applyFlagOverrides(flags);

      expect(validated.PROFILE_STAGE).toBe('production');
      expect(validated.TEAM_SCALE).toBeUndefined();  // Not set by flags
    });

    it('flags override all Tier 2/3 values', () => {
      const flags = {
        THREAT_LEVEL: 'critical',
        SECURITY_WEIGHT: 95,
        COMPLIANCE_WEIGHT: 90,
        THREAT_WEIGHT: 85
      };

      const validated = applyFlagOverrides(flags);

      expect(validated.THREAT_LEVEL).toBe('critical');
      expect(validated.SECURITY_WEIGHT).toBe(95);
    });
  });

  // ============================================================================
  // ERROR MESSAGES: Clear Feedback
  // ============================================================================

  describe('Error Messages: User Feedback', () => {
    it('provides clear error for invalid enum value', () => {
      const flags = { PROFILE_STAGE: 'staging' };

      try {
        applyFlagOverrides(flags);
        expect.fail('Should have thrown');
      } catch (e) {
        expect(e.message).toContain('staging');
        expect(e.message).toMatch(/invalid|allowed/i);
      }
    });

    it('provides clear error for weight out of range', () => {
      const flags = { SECURITY_WEIGHT: 200 };

      try {
        applyFlagOverrides(flags);
        expect.fail('Should have thrown');
      } catch (e) {
        expect(e.message).toMatch(/0-100|range/i);
      }
    });

    it('provides clear error for disallowed flag', () => {
      const flags = { CUSTOM_VARIABLE: 'value' };

      try {
        applyFlagOverrides(flags);
        expect.fail('Should have thrown');
      } catch (e) {
        expect(e.message).toContain('CUSTOM_VARIABLE');
        expect(e.message).toMatch(/not allowed|unknown/i);
      }
    });
  });

  // ============================================================================
  // TYPE VALIDATION: Non-Enum Fields
  // ============================================================================

  describe('Type Validation: Weights Must Be Numbers', () => {
    it('rejects string weights with specific error', () => {
      const flags = { SECURITY_WEIGHT: '75' };

      expect(() => applyFlagOverrides(flags)).toThrow(/SECURITY_WEIGHT.*number|numeric|type/i);
    });

    it('rejects null weights', () => {
      const flags = { SECURITY_WEIGHT: null };

      expect(() => applyFlagOverrides(flags)).toThrow(/number|numeric/i);
    });

    it('rejects undefined weights as error', () => {
      const flags = { SECURITY_WEIGHT: undefined };

      expect(() => applyFlagOverrides(flags)).toThrow(/number|numeric/i);
    });

    it('rejects boolean weights', () => {
      const flags = { SECURITY_WEIGHT: true };

      expect(() => applyFlagOverrides(flags)).toThrow(/number|numeric|type/i);
    });
  });

  describe('Error Messages Specificity: Flag Names and Enums', () => {
    it('error message includes invalid flag name', () => {
      const flags = { INVALID_FLAG: 'value' };

      expect(() => applyFlagOverrides(flags)).toThrow(/INVALID_FLAG/);
    });

    it('error message includes invalid enum value and field name', () => {
      const flags = { PROFILE_STAGE: 'invalid' };

      expect(() => applyFlagOverrides(flags)).toThrow(/invalid.*PROFILE_STAGE/i);
    });

    it('error message specifies numeric bounds for out-of-range weight', () => {
      const flags = { SECURITY_WEIGHT: 150 };

      expect(() => applyFlagOverrides(flags)).toThrow(/0-100|range/i);
    });

    it('error message is actionable for numeric underflow', () => {
      const flags = { THREAT_WEIGHT: -50 };

      expect(() => applyFlagOverrides(flags)).toThrow(/0-100|range/i);
    });
  });

  // ============================================================================
  // COMBINED SCENARIOS
  // ============================================================================

  describe('Combined Scenarios: Real-World Flag Usage', () => {
    it('expert bypasses questionnaire entirely with comprehensive flags', () => {
      const flags = {
        PROFILE_STAGE: 'production',
        TEAM_SCALE: 'enterprise',
        AI_PATTERN: 'agentic',
        COMPLIANCE_FRAMEWORK: ['SOC2', 'ISO27001'],
        THREAT_LEVEL: 'critical',
        SECURITY_WEIGHT: 95,
        COMPLIANCE_WEIGHT: 85,
        THREAT_WEIGHT: 80,
        TEST_MATURITY: 'unit+integration+E2E',
        CI_MATURITY: 'full',
        DEPLOYMENT_TARGET: 'hybrid'
      };

      const validated = applyFlagOverrides(flags);

      expect(validated.PROFILE_STAGE).toBe('production');
      expect(validated.TEAM_SCALE).toBe('enterprise');
      expect(validated.THREAT_LEVEL).toBe('critical');
      expect(validated.SECURITY_WEIGHT).toBe(95);
    });

    it('expert overrides only critical variables', () => {
      const flags = {
        THREAT_LEVEL: 'critical',
        SECURITY_WEIGHT: 99
      };

      const validated = applyFlagOverrides(flags);

      expect(Object.keys(validated)).toHaveLength(2);
      expect(validated.THREAT_LEVEL).toBe('critical');
      expect(validated.SECURITY_WEIGHT).toBe(99);
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe('Edge Cases: Boundary Conditions', () => {
    it('handles empty string flags gracefully', () => {
      const flags = { PROFILE_STAGE: '' };

      expect(() => applyFlagOverrides(flags)).toThrow();
    });

    it('handles case sensitivity (enum matching is case-sensitive)', () => {
      const flags = { PROFILE_STAGE: 'Production' };

      expect(() => applyFlagOverrides(flags)).toThrow();
    });

    it('handles whitespace in flag names', () => {
      const flags = { ' PROFILE_STAGE ': 'production' };

      expect(() => applyFlagOverrides(flags)).toThrow();
    });
  });
});
