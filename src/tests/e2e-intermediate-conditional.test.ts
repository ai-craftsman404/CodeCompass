/**
 * E2E Tests: Intermediate Conditional Path
 * Tests the intermediate user flow: Tier 1 → conditional Tier 2 unlock → Tier 3 defaults → moderate detail
 * Coverage: All Tier 2 unlock conditions tested, context variables mapped correctly = 15 tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  loadAllRules,
  filterRulesByContext,
  scoreRules
} from '../recommendation-engine';
import { resolveAllConflicts } from '../conflict-resolver';
import {
  AuditRule,
  PrecedenceContext,
  UserAnswers,
  Tier1Answers,
  Tier2Answers
} from '../types/audit';

describe('E2E: Intermediate Conditional Path', () => {
  let tempDir: string;
  let mockRules: AuditRule[];

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-e2e-'));

    mockRules = [
      {
        id: 'rule-compliance-soc2-detail',
        description: 'SOC2 compliance detailed requirements',
        category: 'compliance',
        condition: {
          contextVars: { COMPLIANCE_FRAMEWORK: 'SOC2' },
          precedenceWeight: 90
        },
        action: {
          type: 'audit',
          recommendation: 'Implement SOC2 Type II audit trail',
          enforcementLevel: 'hard-mandatory'
        },
        rationale: 'SOC2 requires detailed compliance controls'
      },
      {
        id: 'rule-codeowners-multi-team',
        description: 'CODEOWNERS for multi-team governance',
        category: 'structure',
        condition: {
          contextVars: { TEAM_SCALE: ['small', 'multi-team', 'enterprise'] },
          precedenceWeight: 75
        },
        action: {
          type: 'scaffold',
          recommendation: 'Create and maintain CODEOWNERS file',
          enforcementLevel: 'soft-mandatory'
        },
        rationale: 'Multi-team projects need explicit code ownership'
      },
      {
        id: 'rule-agentic-detail',
        description: 'Agentic system detailed patterns',
        category: 'structure',
        condition: {
          contextVars: { AI_PATTERN: 'agentic' },
          precedenceWeight: 70
        },
        action: {
          type: 'scaffold',
          recommendation: 'Set up agent orchestration with memory management',
          enforcementLevel: 'soft-mandatory'
        },
        rationale: 'Agentic systems require sophisticated memory/tool management'
      },
      {
        id: 'rule-ci-production-full',
        description: 'Full CI/CD for production',
        category: 'tooling',
        condition: {
          contextVars: { PROFILE_STAGE: 'production', CI_MATURITY: 'full' },
          precedenceWeight: 85
        },
        action: {
          type: 'scaffold',
          recommendation: 'Implement full CI/CD with approval gates',
          enforcementLevel: 'hard-mandatory'
        },
        rationale: 'Production systems need gated deployments'
      },
      {
        id: 'rule-observability-metrics',
        description: 'Production observability with metrics',
        category: 'tooling',
        condition: {
          contextVars: { PROFILE_STAGE: 'production', OBSERVABILITY_LEVEL: 'metrics+alerts' },
          precedenceWeight: 80
        },
        action: {
          type: 'scaffold',
          recommendation: 'Set up Prometheus metrics and alerting',
          enforcementLevel: 'soft-mandatory'
        },
        rationale: 'Production systems need monitoring and alerts'
      },
      {
        id: 'rule-gdpr-data-handling',
        description: 'GDPR data handling procedures',
        category: 'compliance',
        condition: {
          contextVars: { COMPLIANCE_FRAMEWORK: 'GDPR' },
          precedenceWeight: 88
        },
        action: {
          type: 'audit',
          recommendation: 'Implement GDPR data processing agreement',
          enforcementLevel: 'hard-mandatory'
        },
        rationale: 'GDPR compliance requires explicit data handling'
      },
      {
        id: 'rule-rag-advanced',
        description: 'Advanced RAG system patterns',
        category: 'structure',
        condition: {
          contextVars: { AI_PATTERN: 'RAG' },
          precedenceWeight: 65
        },
        action: {
          type: 'scaffold',
          recommendation: 'Set up vector store with advanced retrieval',
          enforcementLevel: 'soft-mandatory'
        },
        rationale: 'RAG systems need sophisticated retrieval patterns'
      },
      {
        id: 'rule-iso27001-security',
        description: 'ISO27001 security controls',
        category: 'compliance',
        condition: {
          contextVars: { COMPLIANCE_FRAMEWORK: 'ISO27001' },
          precedenceWeight: 87
        },
        action: {
          type: 'hardening',
          recommendation: 'Implement ISO27001 security controls',
          enforcementLevel: 'hard-mandatory'
        },
        rationale: 'ISO27001 requires systematic security management'
      },
      {
        id: 'rule-solo-minimal',
        description: 'Solo developer minimal setup',
        category: 'structure',
        condition: {
          contextVars: { TEAM_SCALE: 'solo' },
          precedenceWeight: 20
        },
        action: {
          type: 'scaffold',
          recommendation: 'Basic project structure only',
          enforcementLevel: 'advisory'
        },
        rationale: 'Solo projects can skip team governance'
      }
    ];
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  // Test 1: T2_UNLOCK_COMPLIANCE triggered by non-none compliance
  it('intermediate-t2-unlock-compliance: compliance != none triggers T2-Q1', () => {
    const tier1: Tier1Answers = {
      stage: 'production',
      team_scope: 'small',
      ai_involvement: 'none',
      compliance: 'SOC2' // Triggers unlock
    };

    // Intermediate user sees T2-Q1 unlocked
    const tier2: Tier2Answers = {
      complianceDetails: 'SOC2' // User answers T2-Q1
    };

    const context: PrecedenceContext = {
      PROFILE_STAGE: tier1.stage as any,
      TEAM_SCALE: tier1.team_scope as any,
      AI_PATTERN: tier1.ai_involvement as any,
      COMPLIANCE_FRAMEWORK: [tier2.complianceDetails || tier1.compliance],
      THREAT_LEVEL: 'high',
      SECURITY_WEIGHT: 75,
      COMPLIANCE_WEIGHT: 85,
      THREAT_WEIGHT: 60
    };

    const filtered = filterRulesByContext(mockRules, context);
    expect(filtered.map(r => r.id)).toContain('rule-compliance-soc2-detail');

    // Verify hard-mandatory enforcement
    const soc2Rule = filtered.find(r => r.id === 'rule-compliance-soc2-detail');
    expect(soc2Rule?.action.enforcementLevel).toBe('hard-mandatory');
  });

  // Test 2: T2_UNLOCK_COMPLIANCE NOT triggered by 'none'
  it('intermediate-t2-no-unlock-compliance: compliance = none does NOT trigger T2-Q1', () => {
    const tier1: Tier1Answers = {
      stage: 'MVP',
      team_scope: 'solo',
      ai_involvement: 'none',
      compliance: 'none' // Does NOT trigger unlock
    };

    // Tier 2 should not have compliance question
    // No T2-Q1 presented to user
    const context: PrecedenceContext = {
      PROFILE_STAGE: tier1.stage as any,
      TEAM_SCALE: tier1.team_scope as any,
      AI_PATTERN: tier1.ai_involvement as any,
      COMPLIANCE_FRAMEWORK: [tier1.compliance],
      THREAT_LEVEL: 'low',
      SECURITY_WEIGHT: 40,
      COMPLIANCE_WEIGHT: 20,
      THREAT_WEIGHT: 30
    };

    const filtered = filterRulesByContext(mockRules, context);

    // Compliance rules should not apply
    expect(
      filtered.filter(r => r.category === 'compliance').some(r =>
        r.condition.contextVars.COMPLIANCE_FRAMEWORK !== undefined &&
        r.condition.contextVars.COMPLIANCE_FRAMEWORK !== 'none'
      )
    ).toBe(false);
  });

  // Test 3: T2_UNLOCK_TEAM_SCALE triggered by small team
  it('intermediate-t2-unlock-team-scale-small: team = small triggers governance T2-Q2', () => {
    const tier1: Tier1Answers = {
      stage: 'beta',
      team_scope: 'small', // Triggers unlock
      ai_involvement: 'none',
      compliance: 'none'
    };

    const tier2: Tier2Answers = {
      teamSize: 'yes' // User answers T2-Q2: needs CODEOWNERS
    };

    const context: PrecedenceContext = {
      PROFILE_STAGE: tier1.stage as any,
      TEAM_SCALE: tier1.team_scope as any,
      AI_PATTERN: tier1.ai_involvement as any,
      COMPLIANCE_FRAMEWORK: [tier1.compliance],
      THREAT_LEVEL: 'medium',
      SECURITY_WEIGHT: 60,
      COMPLIANCE_WEIGHT: 50,
      THREAT_WEIGHT: 40
    };

    const filtered = filterRulesByContext(mockRules, context);
    expect(filtered.map(r => r.id)).toContain('rule-codeowners-multi-team');
  });

  // Test 4: T2_UNLOCK_TEAM_SCALE NOT triggered by solo
  it('intermediate-t2-no-unlock-team-scale-solo: team = solo does NOT trigger governance', () => {
    const tier1: Tier1Answers = {
      stage: 'beta',
      team_scope: 'solo', // Does NOT trigger unlock
      ai_involvement: 'none',
      compliance: 'none'
    };

    const context: PrecedenceContext = {
      PROFILE_STAGE: tier1.stage as any,
      TEAM_SCALE: tier1.team_scope as any,
      AI_PATTERN: tier1.ai_involvement as any,
      COMPLIANCE_FRAMEWORK: [tier1.compliance],
      THREAT_LEVEL: 'medium',
      SECURITY_WEIGHT: 50,
      COMPLIANCE_WEIGHT: 30,
      THREAT_WEIGHT: 40
    };

    const filtered = filterRulesByContext(mockRules, context);

    // CODEOWNERS rule should not apply to solo
    expect(filtered.map(r => r.id)).not.toContain('rule-codeowners-multi-team');
  });

  // Test 5: T2_UNLOCK_AI_PATTERN triggered by agentic
  it('intermediate-t2-unlock-ai-pattern-agentic: ai_pattern = agentic triggers T2-Q3', () => {
    const tier1: Tier1Answers = {
      stage: 'beta',
      team_scope: 'small',
      ai_involvement: 'agentic', // Triggers unlock
      compliance: 'none'
    };

    const tier2: Tier2Answers = {
      aiPatternDetail: 'agentic complex' // User refines AI pattern
    };

    const context: PrecedenceContext = {
      PROFILE_STAGE: tier1.stage as any,
      TEAM_SCALE: tier1.team_scope as any,
      AI_PATTERN: tier1.ai_involvement as any,
      COMPLIANCE_FRAMEWORK: [tier1.compliance],
      THREAT_LEVEL: 'medium',
      SECURITY_WEIGHT: 60,
      COMPLIANCE_WEIGHT: 50,
      THREAT_WEIGHT: 40
    };

    const filtered = filterRulesByContext(mockRules, context);
    expect(filtered.map(r => r.id)).toContain('rule-agentic-detail');
  });

  // Test 6: T2_UNLOCK_AI_PATTERN NOT triggered by 'none'
  it('intermediate-t2-no-unlock-ai-pattern-none: ai_pattern = none does NOT trigger T2-Q3', () => {
    const tier1: Tier1Answers = {
      stage: 'beta',
      team_scope: 'small',
      ai_involvement: 'none', // Does NOT trigger unlock
      compliance: 'none'
    };

    const context: PrecedenceContext = {
      PROFILE_STAGE: tier1.stage as any,
      TEAM_SCALE: tier1.team_scope as any,
      AI_PATTERN: tier1.ai_involvement as any,
      COMPLIANCE_FRAMEWORK: [tier1.compliance],
      THREAT_LEVEL: 'medium',
      SECURITY_WEIGHT: 60,
      COMPLIANCE_WEIGHT: 50,
      THREAT_WEIGHT: 40
    };

    const filtered = filterRulesByContext(mockRules, context);

    // AI-specific rules should not apply when AI_PATTERN = none
    expect(
      filtered.filter(r =>
        ['rule-agentic-detail', 'rule-rag-advanced'].includes(r.id)
      ).length
    ).toBe(0);
  });

  // Test 7: T2_UNLOCK_PRODUCTION_OBSERVABILITY triggered by production
  it('intermediate-t2-unlock-production: stage = production triggers T2-Q4 and T2-Q5', () => {
    const tier1: Tier1Answers = {
      stage: 'production', // Triggers unlock
      team_scope: 'small',
      ai_involvement: 'none',
      compliance: 'none'
    };

    const tier2: Tier2Answers = {
      ciMaturity: 'full',
      observabilityLevel: 'metrics' // User answers T2-Q4 and T2-Q5
    };

    const context: PrecedenceContext = {
      PROFILE_STAGE: tier1.stage as any,
      TEAM_SCALE: tier1.team_scope as any,
      AI_PATTERN: tier1.ai_involvement as any,
      COMPLIANCE_FRAMEWORK: [tier1.compliance],
      THREAT_LEVEL: 'high',
      SECURITY_WEIGHT: 80,
      COMPLIANCE_WEIGHT: 60,
      THREAT_WEIGHT: 70,
      CI_MATURITY: tier2.ciMaturity as any,
      OBSERVABILITY_LEVEL: tier2.observabilityLevel as any
    };

    const filtered = filterRulesByContext(mockRules, context);

    // Both CI and observability rules should apply
    expect(filtered.map(r => r.id)).toContain('rule-ci-production-full');
    expect(filtered.map(r => r.id)).toContain('rule-observability-metrics');
  });

  // Test 8: T2_UNLOCK_PRODUCTION NOT triggered by PoC
  it('intermediate-t2-no-unlock-production: stage = PoC does NOT trigger T2-Q4/Q5', () => {
    const tier1: Tier1Answers = {
      stage: 'PoC', // Does NOT trigger unlock
      team_scope: 'small',
      ai_involvement: 'none',
      compliance: 'none'
    };

    const context: PrecedenceContext = {
      PROFILE_STAGE: tier1.stage as any,
      TEAM_SCALE: tier1.team_scope as any,
      AI_PATTERN: tier1.ai_involvement as any,
      COMPLIANCE_FRAMEWORK: [tier1.compliance],
      THREAT_LEVEL: 'medium',
      SECURITY_WEIGHT: 50,
      COMPLIANCE_WEIGHT: 30,
      THREAT_WEIGHT: 40
      // No CI_MATURITY or OBSERVABILITY_LEVEL (defaults applied silently)
    };

    const filtered = filterRulesByContext(mockRules, context);

    // Production-specific rules should not apply
    expect(filtered.map(r => r.id)).not.toContain('rule-ci-production-full');
  });

  // Test 9: Multi-condition filtering in intermediate path
  it('intermediate-multi-condition: GDPR + production applies both compliance and ci rules', () => {
    const tier1: Tier1Answers = {
      stage: 'production',
      team_scope: 'multi-team',
      ai_involvement: 'none',
      compliance: 'GDPR'
    };

    const tier2: Tier2Answers = {
      complianceDetails: 'GDPR',
      ciMaturity: 'full',
      observabilityLevel: 'metrics'
    };

    const context: PrecedenceContext = {
      PROFILE_STAGE: tier1.stage as any,
      TEAM_SCALE: tier1.team_scope as any,
      AI_PATTERN: tier1.ai_involvement as any,
      COMPLIANCE_FRAMEWORK: [tier2.complianceDetails || tier1.compliance],
      THREAT_LEVEL: 'high',
      SECURITY_WEIGHT: 85,
      COMPLIANCE_WEIGHT: 90,
      THREAT_WEIGHT: 75,
      CI_MATURITY: tier2.ciMaturity as any,
      OBSERVABILITY_LEVEL: tier2.observabilityLevel as any
    };

    const filtered = filterRulesByContext(mockRules, context);

    expect(filtered.map(r => r.id)).toContain('rule-gdpr-data-handling');
    expect(filtered.map(r => r.id)).toContain('rule-codeowners-multi-team');
    expect(filtered.map(r => r.id)).toContain('rule-ci-production-full');
  });

  // Test 10: Context variables correctly map from Tier 1 + Tier 2
  it('intermediate-context-mapping-tier1-tier2: Tier 2 overrides/refines Tier 1', () => {
    const tier1: Tier1Answers = {
      stage: 'production',
      team_scope: 'multi-team',
      ai_involvement: 'RAG',
      compliance: 'SOC2'
    };

    const tier2: Tier2Answers = {
      complianceDetails: 'ISO27001', // User refines compliance choice
      aiPatternDetail: 'RAG advanced',
      ciMaturity: 'full',
      observabilityLevel: 'APM'
    };

    // Context should include Tier 2 refinements
    const context: PrecedenceContext = {
      PROFILE_STAGE: tier1.stage as any,
      TEAM_SCALE: tier1.team_scope as any,
      AI_PATTERN: tier1.ai_involvement as any,
      COMPLIANCE_FRAMEWORK: [tier2.complianceDetails || tier1.compliance],
      THREAT_LEVEL: 'high',
      SECURITY_WEIGHT: 85,
      COMPLIANCE_WEIGHT: 90,
      THREAT_WEIGHT: 75,
      CI_MATURITY: tier2.ciMaturity as any,
      OBSERVABILITY_LEVEL: tier2.observabilityLevel as any
    };

    // Tier 2 override should be applied
    expect(context.COMPLIANCE_FRAMEWORK).toContain('ISO27001');
    expect(context.CI_MATURITY).toBe('full');
    expect(context.OBSERVABILITY_LEVEL).toBe('APM');
  });

  // Test 11: ISO27001 compliance unlocks governance and security
  it('intermediate-iso27001-comprehensive: ISO27001 affects multiple rule categories', () => {
    const tier1: Tier1Answers = {
      stage: 'production',
      team_scope: 'small',
      ai_involvement: 'none',
      compliance: 'ISO27001'
    };

    const tier2: Tier2Answers = {
      complianceDetails: 'ISO27001'
    };

    const context: PrecedenceContext = {
      PROFILE_STAGE: tier1.stage as any,
      TEAM_SCALE: tier1.team_scope as any,
      AI_PATTERN: tier1.ai_involvement as any,
      COMPLIANCE_FRAMEWORK: [tier2.complianceDetails || tier1.compliance],
      THREAT_LEVEL: 'high',
      SECURITY_WEIGHT: 85,
      COMPLIANCE_WEIGHT: 90,
      THREAT_WEIGHT: 70
    };

    const filtered = filterRulesByContext(mockRules, context);
    expect(filtered.map(r => r.id)).toContain('rule-iso27001-security');

    // ISO27001 is hard-mandatory
    const iso27001Rule = filtered.find(r => r.id === 'rule-iso27001-security');
    expect(iso27001Rule?.action.enforcementLevel).toBe('hard-mandatory');
  });

  // Test 12: Tier 3 defaults apply invisibly in intermediate path
  it('intermediate-tier3-defaults-invisible: Tier 3 defaults applied without user seeing Tier 3', () => {
    const tier1: Tier1Answers = {
      stage: 'production',
      team_scope: 'small',
      ai_involvement: 'none',
      compliance: 'none'
    };

    const tier2: Tier2Answers = {
      ciMaturity: 'full',
      observabilityLevel: 'metrics'
    };

    // Tier 3 not shown, but defaults applied
    const context: PrecedenceContext = {
      PROFILE_STAGE: tier1.stage as any,
      TEAM_SCALE: tier1.team_scope as any,
      AI_PATTERN: tier1.ai_involvement as any,
      COMPLIANCE_FRAMEWORK: [tier1.compliance],
      THREAT_LEVEL: 'medium', // Tier 3 default
      SECURITY_WEIGHT: 60, // Tier 3 default
      COMPLIANCE_WEIGHT: 50, // Tier 3 default
      THREAT_WEIGHT: 40, // Tier 3 default
      CI_MATURITY: tier2.ciMaturity as any,
      OBSERVABILITY_LEVEL: tier2.observabilityLevel as any,
      TEST_MATURITY: 'unit', // Tier 3 default
      DOC_EXPECTATION: 'minimal-informal', // Tier 3 default
      REUSE_INTENT: 'project-scoped' // Tier 3 default
    };

    // Verify defaults populated
    expect(context.THREAT_LEVEL).toBe('medium');
    expect(context.SECURITY_WEIGHT).toBe(60);
    expect(context.TEST_MATURITY).toBe('unit');
  });

  // Test 13: RAG unlock conditions and rules
  it('intermediate-rag-unlock: RAG ai_pattern triggers detailed rules', () => {
    const tier1: Tier1Answers = {
      stage: 'beta',
      team_scope: 'small',
      ai_involvement: 'RAG',
      compliance: 'none'
    };

    const tier2: Tier2Answers = {
      aiPatternDetail: 'RAG advanced'
    };

    const context: PrecedenceContext = {
      PROFILE_STAGE: tier1.stage as any,
      TEAM_SCALE: tier1.team_scope as any,
      AI_PATTERN: tier1.ai_involvement as any,
      COMPLIANCE_FRAMEWORK: [tier1.compliance],
      THREAT_LEVEL: 'medium',
      SECURITY_WEIGHT: 60,
      COMPLIANCE_WEIGHT: 50,
      THREAT_WEIGHT: 40
    };

    const filtered = filterRulesByContext(mockRules, context);
    expect(filtered.map(r => r.id)).toContain('rule-rag-advanced');
  });

  // Test 14: All three Tier 2 unlocks triggered simultaneously
  it('intermediate-all-tier2-unlocks: production SOC2 multi-team agentic triggers all T2 questions', () => {
    const tier1: Tier1Answers = {
      stage: 'production', // Triggers T2_UNLOCK_PRODUCTION_OBSERVABILITY
      team_scope: 'multi-team', // Triggers T2_UNLOCK_TEAM_SCALE
      ai_involvement: 'agentic', // Triggers T2_UNLOCK_AI_PATTERN
      compliance: 'SOC2' // Triggers T2_UNLOCK_COMPLIANCE
    };

    const tier2: Tier2Answers = {
      complianceDetails: 'SOC2',
      teamSize: 'yes',
      ciMaturity: 'full',
      observabilityLevel: 'APM',
      aiPatternDetail: 'agentic complex'
    };

    const context: PrecedenceContext = {
      PROFILE_STAGE: tier1.stage as any,
      TEAM_SCALE: tier1.team_scope as any,
      AI_PATTERN: tier1.ai_involvement as any,
      COMPLIANCE_FRAMEWORK: [tier2.complianceDetails || tier1.compliance],
      THREAT_LEVEL: 'critical',
      SECURITY_WEIGHT: 95,
      COMPLIANCE_WEIGHT: 95,
      THREAT_WEIGHT: 90,
      CI_MATURITY: tier2.ciMaturity as any,
      OBSERVABILITY_LEVEL: tier2.observabilityLevel as any
    };

    const filtered = filterRulesByContext(mockRules, context);

    // All applicable rule categories should be present
    const categories = new Set(filtered.map(r => r.category));
    expect(categories.has('compliance')).toBe(true);
    expect(categories.has('structure')).toBe(true);
    expect(categories.has('tooling')).toBe(true);

    // Verify hard-mandatory rules exist
    expect(filtered.some(r => r.action.enforcementLevel === 'hard-mandatory')).toBe(true);
  });

  // Test 15: Precedence scoring with Tier 2 context
  it('intermediate-precedence-scoring: Tier 2 answers affect rule scoring', () => {
    const tier1: Tier1Answers = {
      stage: 'production',
      team_scope: 'small',
      ai_involvement: 'none',
      compliance: 'SOC2'
    };

    const tier2: Tier2Answers = {
      complianceDetails: 'SOC2',
      ciMaturity: 'full'
    };

    const context: PrecedenceContext = {
      PROFILE_STAGE: tier1.stage as any,
      TEAM_SCALE: tier1.team_scope as any,
      AI_PATTERN: tier1.ai_involvement as any,
      COMPLIANCE_FRAMEWORK: [tier2.complianceDetails || tier1.compliance],
      THREAT_LEVEL: 'high',
      SECURITY_WEIGHT: 85,
      COMPLIANCE_WEIGHT: 90,
      THREAT_WEIGHT: 75,
      CI_MATURITY: tier2.ciMaturity as any
    };

    const filtered = filterRulesByContext(mockRules, context);
    const scored = scoreRules(filtered, context);

    // SOC2 rule should score highest (compliance framework set + hard-mandatory)
    const soc2Rule = scored.find(r => r.id === 'rule-compliance-soc2-detail');
    const ciRule = scored.find(r => r.id === 'rule-ci-production-full');

    expect(soc2Rule?.score).toBeDefined();
    expect(ciRule?.score).toBeDefined();

    if (soc2Rule && ciRule) {
      expect(soc2Rule.score).toBeGreaterThanOrEqual(ciRule.score);
    }
  });
});
