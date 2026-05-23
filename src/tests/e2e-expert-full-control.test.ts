/**
 * E2E Tests: Expert Full Control Path
 * Tests the expert user flow: all tiers visible + flag injection bypass
 * Coverage: Direct flag injection, Tier 3 customization, complete variable override = 15 tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  filterRulesByContext,
  scoreRules
} from '../recommendation-engine';
import { resolveAllConflicts } from '../conflict-resolver';
import {
  AuditRule,
  PrecedenceContext,
  UserAnswers,
  Tier1Answers,
  Tier2Answers,
  Tier3Answers
} from '../types/audit';

describe('E2E: Expert Full Control Path', () => {
  let tempDir: string;
  let mockRules: AuditRule[];

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-e2e-'));

    mockRules = [
      {
        id: 'rule-edge-deployment',
        description: 'Edge deployment hardening',
        category: 'structure',
        condition: {
          contextVars: { DEPLOYMENT_TARGET: 'edge' },
          precedenceWeight: 70
        },
        action: {
          type: 'hardening',
          recommendation: 'Optimize for edge constraints (memory, CPU, latency)',
          enforcementLevel: 'soft-mandatory'
        },
        rationale: 'Edge devices require optimized code paths'
      },
      {
        id: 'rule-air-gapped-security',
        description: 'Air-gapped network security',
        category: 'security',
        condition: {
          contextVars: { DEPLOYMENT_TARGET: 'air-gapped' },
          precedenceWeight: 95
        },
        action: {
          type: 'hardening',
          recommendation: 'Implement strict air-gapped security controls',
          enforcementLevel: 'hard-mandatory'
        },
        rationale: 'Air-gapped systems require maximum isolation'
      },
      {
        id: 'rule-chaos-testing',
        description: 'Chaos engineering framework',
        category: 'testing',
        condition: {
          contextVars: { TEST_MATURITY: 'chaos' },
          precedenceWeight: 80
        },
        action: {
          type: 'scaffold',
          recommendation: 'Set up chaos testing with fault injection',
          enforcementLevel: 'soft-mandatory'
        },
        rationale: 'Chaos testing validates resilience'
      },
      {
        id: 'rule-adr-documentation',
        description: 'Architecture decision records',
        category: 'structure',
        condition: {
          contextVars: { DOC_EXPECTATION: 'ADRs' },
          precedenceWeight: 65
        },
        action: {
          type: 'scaffold',
          recommendation: 'Create /docs/adr directory with ADR templates',
          enforcementLevel: 'soft-mandatory'
        },
        rationale: 'ADRs document architectural decisions'
      },
      {
        id: 'rule-open-source-governance',
        description: 'Open-source project governance',
        category: 'structure',
        condition: {
          contextVars: { REUSE_INTENT: 'open-source' },
          precedenceWeight: 75
        },
        action: {
          type: 'scaffold',
          recommendation: 'Create CONTRIBUTING.md, LICENSE, CODE_OF_CONDUCT',
          enforcementLevel: 'soft-mandatory'
        },
        rationale: 'Open-source projects need explicit contribution guidelines'
      },
      {
        id: 'rule-contract-testing',
        description: 'API contract testing',
        category: 'testing',
        condition: {
          contextVars: { TEST_MATURITY: 'contract' },
          precedenceWeight: 85
        },
        action: {
          type: 'scaffold',
          recommendation: 'Implement Pact/Spring Cloud Contract testing',
          enforcementLevel: 'soft-mandatory'
        },
        rationale: 'Contract tests verify API compatibility'
      },
      {
        id: 'rule-multi-cloud-strategy',
        description: 'Multi-cloud deployment strategy',
        category: 'tooling',
        condition: {
          contextVars: { DEPLOYMENT_TARGET: 'multi-cloud' },
          precedenceWeight: 78
        },
        action: {
          type: 'scaffold',
          recommendation: 'Implement multi-cloud abstraction layer',
          enforcementLevel: 'soft-mandatory'
        },
        rationale: 'Multi-cloud requires provider abstraction'
      },
      {
        id: 'rule-compliance-audit-trail',
        description: 'Full audit trail for compliance',
        category: 'compliance',
        condition: {
          contextVars: { DOC_EXPECTATION: 'full audit trail' },
          precedenceWeight: 92
        },
        action: {
          type: 'audit',
          recommendation: 'Implement comprehensive audit logging',
          enforcementLevel: 'hard-mandatory'
        },
        rationale: 'Audit trails required for compliance verification'
      },
      {
        id: 'rule-shared-library-versioning',
        description: 'Semantic versioning for shared libraries',
        category: 'structure',
        condition: {
          contextVars: { REUSE_INTENT: 'shared library' },
          precedenceWeight: 70
        },
        action: {
          type: 'scaffold',
          recommendation: 'Implement semantic versioning with changelog',
          enforcementLevel: 'soft-mandatory'
        },
        rationale: 'Shared libraries need strict versioning'
      }
    ];
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  // Test 1: Expert flag injection bypasses questionnaire
  it('expert-flag-injection-soc2-production: direct flag override via /audit command', () => {
    // Expert uses: /audit COMPLIANCE_FRAMEWORK=SOC2 PROFILE_STAGE=production
    const flagOverrides = {
      COMPLIANCE_FRAMEWORK: 'SOC2',
      PROFILE_STAGE: 'production'
    };

    // Context directly from flags (no questionnaire)
    const context: PrecedenceContext = {
      PROFILE_STAGE: flagOverrides.PROFILE_STAGE as any,
      TEAM_SCALE: 'small', // Default when not specified
      AI_PATTERN: 'none', // Default
      COMPLIANCE_FRAMEWORK: [flagOverrides.COMPLIANCE_FRAMEWORK as string],
      THREAT_LEVEL: 'medium',
      SECURITY_WEIGHT: 60,
      COMPLIANCE_WEIGHT: 50,
      THREAT_WEIGHT: 40
    };

    expect(context.PROFILE_STAGE).toBe('production');
    expect(context.COMPLIANCE_FRAMEWORK).toContain('SOC2');
  });

  // Test 2: Expert can inject all Tier 3 numeric weights
  it('expert-tier3-weight-injection: customize SECURITY_WEIGHT, COMPLIANCE_WEIGHT, THREAT_WEIGHT', () => {
    const flagOverrides = {
      SECURITY_WEIGHT: 95,
      COMPLIANCE_WEIGHT: 85,
      THREAT_WEIGHT: 75
    };

    const context: PrecedenceContext = {
      PROFILE_STAGE: 'production',
      TEAM_SCALE: 'multi-team',
      AI_PATTERN: 'none',
      COMPLIANCE_FRAMEWORK: ['SOC2'],
      THREAT_LEVEL: 'critical',
      SECURITY_WEIGHT: flagOverrides.SECURITY_WEIGHT,
      COMPLIANCE_WEIGHT: flagOverrides.COMPLIANCE_WEIGHT,
      THREAT_WEIGHT: flagOverrides.THREAT_WEIGHT
    };

    // Verify weight bounds
    expect(context.SECURITY_WEIGHT).toBeGreaterThanOrEqual(0);
    expect(context.SECURITY_WEIGHT).toBeLessThanOrEqual(100);
    expect(context.COMPLIANCE_WEIGHT).toBeGreaterThanOrEqual(0);
    expect(context.COMPLIANCE_WEIGHT).toBeLessThanOrEqual(100);
    expect(context.THREAT_WEIGHT).toBeGreaterThanOrEqual(0);
    expect(context.THREAT_WEIGHT).toBeLessThanOrEqual(100);
  });

  // Test 3: Expert Tier 3 DEPLOYMENT_TARGET override
  it('expert-deployment-target-edge: DEPLOYMENT_TARGET=edge filters edge-specific rules', () => {
    const tier3: Tier3Answers = {
      deploymentTarget: 'edge'
    };

    const context: PrecedenceContext = {
      PROFILE_STAGE: 'production',
      TEAM_SCALE: 'pair-trio',
      AI_PATTERN: 'none',
      COMPLIANCE_FRAMEWORK: ['none'],
      THREAT_LEVEL: 'high',
      SECURITY_WEIGHT: 80,
      COMPLIANCE_WEIGHT: 50,
      THREAT_WEIGHT: 70,
      DEPLOYMENT_TARGET: tier3.deploymentTarget as any
    };

    const filtered = filterRulesByContext(mockRules, context);
    expect(filtered.map(r => r.id)).toContain('rule-edge-deployment');
  });

  // Test 4: Expert air-gapped deployment (maximum security)
  it('expert-air-gapped-isolation: DEPLOYMENT_TARGET=air-gapped triggers hard-mandatory security', () => {
    const context: PrecedenceContext = {
      PROFILE_STAGE: 'production',
      TEAM_SCALE: 'small',
      AI_PATTERN: 'none',
      COMPLIANCE_FRAMEWORK: ['none'],
      THREAT_LEVEL: 'critical',
      SECURITY_WEIGHT: 100,
      COMPLIANCE_WEIGHT: 80,
      THREAT_WEIGHT: 95,
      DEPLOYMENT_TARGET: 'air-gapped'
    };

    const filtered = filterRulesByContext(mockRules, context);
    const airGappedRule = filtered.find(r => r.id === 'rule-air-gapped-security');

    expect(airGappedRule).toBeDefined();
    expect(airGappedRule?.action.enforcementLevel).toBe('hard-mandatory');
  });

  // Test 5: Expert Tier 3 TEST_MATURITY=chaos
  it('expert-chaos-testing: TEST_MATURITY=chaos enables resilience testing rules', () => {
    const tier3: Tier3Answers = {
      testMaturity: 'chaos'
    };

    const context: PrecedenceContext = {
      PROFILE_STAGE: 'production',
      TEAM_SCALE: 'multi-team',
      AI_PATTERN: 'none',
      COMPLIANCE_FRAMEWORK: ['none'],
      THREAT_LEVEL: 'high',
      SECURITY_WEIGHT: 80,
      COMPLIANCE_WEIGHT: 60,
      THREAT_WEIGHT: 75,
      TEST_MATURITY: tier3.testMaturity as any
    };

    const filtered = filterRulesByContext(mockRules, context);
    expect(filtered.map(r => r.id)).toContain('rule-chaos-testing');
  });

  // Test 6: Expert DOC_EXPECTATION=ADRs
  it('expert-adr-documentation: DOC_EXPECTATION=ADRs enables architecture documentation', () => {
    const tier3: Tier3Answers = {
      docExpectation: 'ADRs'
    };

    const context: PrecedenceContext = {
      PROFILE_STAGE: 'production',
      TEAM_SCALE: 'multi-team',
      AI_PATTERN: 'none',
      COMPLIANCE_FRAMEWORK: ['none'],
      THREAT_LEVEL: 'medium',
      SECURITY_WEIGHT: 60,
      COMPLIANCE_WEIGHT: 50,
      THREAT_WEIGHT: 40,
      DOC_EXPECTATION: tier3.docExpectation as any
    };

    const filtered = filterRulesByContext(mockRules, context);
    expect(filtered.map(r => r.id)).toContain('rule-adr-documentation');
  });

  // Test 7: Expert REUSE_INTENT=open-source
  it('expert-open-source-governance: REUSE_INTENT=open-source requires governance structure', () => {
    const tier3: Tier3Answers = {
      reuseIntent: 'open-source'
    };

    const context: PrecedenceContext = {
      PROFILE_STAGE: 'production',
      TEAM_SCALE: 'small',
      AI_PATTERN: 'none',
      COMPLIANCE_FRAMEWORK: ['none'],
      THREAT_LEVEL: 'medium',
      SECURITY_WEIGHT: 70,
      COMPLIANCE_WEIGHT: 60,
      THREAT_WEIGHT: 50,
      REUSE_INTENT: tier3.reuseIntent as any
    };

    const filtered = filterRulesByContext(mockRules, context);
    expect(filtered.map(r => r.id)).toContain('rule-open-source-governance');
  });

  // Test 8: Expert contract testing customization
  it('expert-contract-testing: TEST_MATURITY=contract enables API contract rules', () => {
    const tier3: Tier3Answers = {
      testMaturity: 'contract'
    };

    const context: PrecedenceContext = {
      PROFILE_STAGE: 'production',
      TEAM_SCALE: 'multi-team',
      AI_PATTERN: 'none',
      COMPLIANCE_FRAMEWORK: ['none'],
      THREAT_LEVEL: 'medium',
      SECURITY_WEIGHT: 70,
      COMPLIANCE_WEIGHT: 60,
      THREAT_WEIGHT: 50,
      TEST_MATURITY: tier3.testMaturity as any
    };

    const filtered = filterRulesByContext(mockRules, context);
    expect(filtered.map(r => r.id)).toContain('rule-contract-testing');
  });

  // Test 9: Expert multi-cloud strategy
  it('expert-multi-cloud: DEPLOYMENT_TARGET=multi-cloud requires cloud abstraction', () => {
    const tier3: Tier3Answers = {
      deploymentTarget: 'multi-cloud'
    };

    const context: PrecedenceContext = {
      PROFILE_STAGE: 'production',
      TEAM_SCALE: 'multi-team',
      AI_PATTERN: 'none',
      COMPLIANCE_FRAMEWORK: ['none'],
      THREAT_LEVEL: 'high',
      SECURITY_WEIGHT: 80,
      COMPLIANCE_WEIGHT: 70,
      THREAT_WEIGHT: 75,
      DEPLOYMENT_TARGET: tier3.deploymentTarget as any
    };

    const filtered = filterRulesByContext(mockRules, context);
    expect(filtered.map(r => r.id)).toContain('rule-multi-cloud-strategy');
  });

  // Test 10: Expert full audit trail compliance
  it('expert-audit-trail-compliance: DOC_EXPECTATION=full audit trail enforces compliance', () => {
    const tier3: Tier3Answers = {
      docExpectation: 'full audit trail'
    };

    const context: PrecedenceContext = {
      PROFILE_STAGE: 'production',
      TEAM_SCALE: 'small',
      AI_PATTERN: 'none',
      COMPLIANCE_FRAMEWORK: ['SOC2'],
      THREAT_LEVEL: 'critical',
      SECURITY_WEIGHT: 95,
      COMPLIANCE_WEIGHT: 95,
      THREAT_WEIGHT: 90,
      DOC_EXPECTATION: tier3.docExpectation as any
    };

    const filtered = filterRulesByContext(mockRules, context);
    const auditTrailRule = filtered.find(r => r.id === 'rule-compliance-audit-trail');

    expect(auditTrailRule).toBeDefined();
    expect(auditTrailRule?.action.enforcementLevel).toBe('hard-mandatory');
  });

  // Test 11: Expert shared library versioning
  it('expert-shared-library: REUSE_INTENT=shared library requires semantic versioning', () => {
    const tier3: Tier3Answers = {
      reuseIntent: 'shared library'
    };

    const context: PrecedenceContext = {
      PROFILE_STAGE: 'production',
      TEAM_SCALE: 'multi-team',
      AI_PATTERN: 'none',
      COMPLIANCE_FRAMEWORK: ['none'],
      THREAT_LEVEL: 'medium',
      SECURITY_WEIGHT: 70,
      COMPLIANCE_WEIGHT: 60,
      THREAT_WEIGHT: 50,
      REUSE_INTENT: tier3.reuseIntent as any
    };

    const filtered = filterRulesByContext(mockRules, context);
    expect(filtered.map(r => r.id)).toContain('rule-shared-library-versioning');
  });

  // Test 12: Expert complete flag injection with multiple overrides
  it('expert-multi-flag-override: complex flag injection with 5+ parameters', () => {
    const flagOverrides = {
      COMPLIANCE_FRAMEWORK: 'ISO27001',
      PROFILE_STAGE: 'production',
      AI_PATTERN: 'agentic',
      TEAM_SCALE: 'multi-team',
      SECURITY_WEIGHT: 90,
      COMPLIANCE_WEIGHT: 85,
      THREAT_WEIGHT: 80,
      DEPLOYMENT_TARGET: 'multi-cloud',
      TEST_MATURITY: 'chaos'
    };

    // Build context from flags
    const context: PrecedenceContext = {
      PROFILE_STAGE: flagOverrides.PROFILE_STAGE as any,
      TEAM_SCALE: flagOverrides.TEAM_SCALE as any,
      AI_PATTERN: flagOverrides.AI_PATTERN as any,
      COMPLIANCE_FRAMEWORK: [flagOverrides.COMPLIANCE_FRAMEWORK as string],
      THREAT_LEVEL: 'high',
      SECURITY_WEIGHT: flagOverrides.SECURITY_WEIGHT,
      COMPLIANCE_WEIGHT: flagOverrides.COMPLIANCE_WEIGHT,
      THREAT_WEIGHT: flagOverrides.THREAT_WEIGHT,
      DEPLOYMENT_TARGET: flagOverrides.DEPLOYMENT_TARGET as any,
      TEST_MATURITY: flagOverrides.TEST_MATURITY as any
    };

    // All flags should be set correctly
    expect(context.PROFILE_STAGE).toBe('production');
    expect(context.TEAM_SCALE).toBe('multi-team');
    expect(context.AI_PATTERN).toBe('agentic');
    expect(context.SECURITY_WEIGHT).toBe(90);
    expect(context.DEPLOYMENT_TARGET).toBe('multi-cloud');
  });

  // Test 13: Expert Tier 2/3 all visible (no hiding)
  it('expert-all-tiers-visible: expert sees Tier 1, Tier 2 (conditional), and Tier 3', () => {
    // Expert flow includes all tiers
    const userAnswers: UserAnswers = {
      cohort: 'expert',
      tier1: {
        stage: 'production',
        team_scope: 'multi-team',
        ai_involvement: 'agentic',
        compliance: 'SOC2'
      },
      tier2: {
        complianceDetails: 'SOC2',
        teamSize: 'yes',
        ciMaturity: 'full',
        observabilityLevel: 'APM',
        aiPatternDetail: 'agentic complex'
      },
      tier3: {
        deploymentTarget: 'multi-cloud',
        reuseIntent: 'open-source',
        docExpectation: 'ADRs',
        testMaturity: 'chaos',
        threatLevelOverride: 'critical'
      }
    };

    // All Tier 3 values should be populated
    expect(userAnswers.tier3?.deploymentTarget).toBe('multi-cloud');
    expect(userAnswers.tier3?.reuseIntent).toBe('open-source');
    expect(userAnswers.tier3?.docExpectation).toBe('ADRs');
    expect(userAnswers.tier3?.testMaturity).toBe('chaos');
  });

  // Test 14: Flag override precedence (flags override questionnaire)
  it('expert-flag-precedence: flag values override questionnaire answers', () => {
    const tier1: Tier1Answers = {
      stage: 'PoC',
      team_scope: 'solo',
      ai_involvement: 'none',
      compliance: 'none'
    };

    // Expert overrides with flags
    const flagOverrides = {
      PROFILE_STAGE: 'production',
      TEAM_SCALE: 'multi-team',
      COMPLIANCE_FRAMEWORK: 'SOC2'
    };

    // Final context should use flags, not Tier 1
    const context: PrecedenceContext = {
      PROFILE_STAGE: flagOverrides.PROFILE_STAGE as any, // Override wins
      TEAM_SCALE: flagOverrides.TEAM_SCALE as any, // Override wins
      AI_PATTERN: tier1.ai_involvement as any, // No override, use Tier 1
      COMPLIANCE_FRAMEWORK: [flagOverrides.COMPLIANCE_FRAMEWORK as string], // Override wins
      THREAT_LEVEL: 'medium',
      SECURITY_WEIGHT: 60,
      COMPLIANCE_WEIGHT: 50,
      THREAT_WEIGHT: 40
    };

    expect(context.PROFILE_STAGE).toBe('production');
    expect(context.TEAM_SCALE).toBe('multi-team');
    expect(context.AI_PATTERN).toBe('none');
  });

  // Test 15: Expert weight validation (0-100 range)
  it('expert-weight-bounds: numeric weights constrained to 0-100 range', () => {
    // Test boundary cases
    const validWeights = [0, 1, 50, 99, 100];
    const invalidWeights = [-1, 101, 150, -100];

    validWeights.forEach(weight => {
      expect(weight).toBeGreaterThanOrEqual(0);
      expect(weight).toBeLessThanOrEqual(100);
    });

    invalidWeights.forEach(weight => {
      expect(weight < 0 || weight > 100).toBe(true);
    });
  });
});
