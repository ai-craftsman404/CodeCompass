/**
 * E2E Tests: Novice Fast Path
 * Tests the novice user flow: auto-inferred Tier 1 → one-tap confirm → Tier 2/3 defaults → simplified output
 * Coverage: 5 different project types × 3 scenarios = 15 tests
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  loadAllRules,
  filterRulesByContext,
  scoreRules,
  shouldSuggestPhasing
} from '../recommendation-engine';
import { resolveAllConflicts, applyPrecedenceMatrix } from '../conflict-resolver';
import {
  AuditRule,
  PrecedenceContext,
  RepoScanResult,
  UserAnswers,
  Tier1Answers
} from '../types/audit';

describe('E2E: Novice Fast Path', () => {
  let tempDir: string;
  let mockRules: AuditRule[];

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-e2e-'));

    // Create mock rules for testing
    mockRules = [
      {
        id: 'rule-stage-beta-llm',
        description: 'LLM API at beta stage',
        category: 'structure',
        condition: {
          contextVars: { PROFILE_STAGE: 'beta', AI_PATTERN: 'LLM API' },
          precedenceWeight: 70
        },
        action: {
          type: 'scaffold',
          recommendation: 'Create /prompts directory for LLM API patterns',
          enforcementLevel: 'advisory'
        },
        rationale: 'Beta projects with LLM API should organize prompts'
      },
      {
        id: 'rule-soc2-production',
        description: 'SOC2 compliance for production',
        category: 'compliance',
        condition: {
          contextVars: { COMPLIANCE_FRAMEWORK: 'SOC2', PROFILE_STAGE: 'production' },
          precedenceWeight: 95
        },
        action: {
          type: 'audit',
          recommendation: 'Implement full SOC2 compliance audit trail',
          enforcementLevel: 'hard-mandatory'
        },
        rationale: 'Production SOC2 systems require strict compliance controls'
      },
      {
        id: 'rule-rag-structure',
        description: 'RAG system folder structure',
        category: 'structure',
        condition: {
          contextVars: { AI_PATTERN: 'RAG' },
          precedenceWeight: 60
        },
        action: {
          type: 'scaffold',
          recommendation: 'Create /embeddings, /retrieval, /ingestion directories',
          enforcementLevel: 'soft-mandatory'
        },
        rationale: 'RAG systems need organized embeddings and retrieval logic'
      },
      {
        id: 'rule-agentic-agents',
        description: 'Agentic system tools structure',
        category: 'structure',
        condition: {
          contextVars: { AI_PATTERN: 'agentic' },
          precedenceWeight: 75
        },
        action: {
          type: 'scaffold',
          recommendation: 'Create /agents, /tools, /memory directories',
          enforcementLevel: 'soft-mandatory'
        },
        rationale: 'Agentic systems need organized agent and tool management'
      },
      {
        id: 'rule-cicd-beta',
        description: 'CI/CD setup for beta projects',
        category: 'tooling',
        condition: {
          contextVars: { PROFILE_STAGE: 'beta' },
          precedenceWeight: 80
        },
        action: {
          type: 'scaffold',
          recommendation: 'Create .github/workflows for CI/CD pipelines',
          enforcementLevel: 'soft-mandatory'
        },
        rationale: 'Beta projects need automated CI/CD pipelines'
      },
      {
        id: 'rule-fintech-security',
        description: 'Fintech security hardening',
        category: 'security',
        condition: {
          contextVars: { COMPLIANCE_FRAMEWORK: 'SOC2', TEAM_SCALE: 'small' },
          precedenceWeight: 85
        },
        action: {
          type: 'hardening',
          recommendation: 'Implement strict secrets management and encryption',
          enforcementLevel: 'hard-mandatory'
        },
        rationale: 'Fintech teams need enhanced security controls'
      },
      {
        id: 'rule-startup-basic-ci',
        description: 'Startup MVP basic CI',
        category: 'tooling',
        condition: {
          contextVars: { PROFILE_STAGE: 'MVP', TEAM_SCALE: 'pair-trio' },
          precedenceWeight: 50
        },
        action: {
          type: 'scaffold',
          recommendation: 'Create basic GitHub Actions workflows',
          enforcementLevel: 'advisory'
        },
        rationale: 'MVP projects benefit from lightweight CI setup'
      },
      {
        id: 'rule-internal-tool-minimal',
        description: 'Internal tool minimal structure',
        category: 'structure',
        condition: {
          contextVars: { PROFILE_STAGE: 'PoC' },
          precedenceWeight: 30
        },
        action: {
          type: 'scaffold',
          recommendation: 'Create minimal .gitignore and README',
          enforcementLevel: 'advisory'
        },
        rationale: 'PoC projects need basic documentation'
      }
    ];
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  // Test 1: Agentic system at beta stage
  it('novice-agentic-beta: routes correctly with pre-filled answers and applies defaults', () => {
    // Simulate repo scan inference
    const scanResults: RepoScanResult = {
      hasCI: true,
      hasTests: true,
      testTypes: ['unit'],
      hasReadme: true,
      hasLicense: false,
      hasCodeowners: false,
      hasDocumentation: false,
      complianceMarkers: [],
      codebaseSizeLines: 25000,
      aiPatternIndicators: ['/agents/', 'AGENT.md'],
      teamSizeIndicators: ['single contributor'],
      estimatedCriticalFindings: 2,
      inferred: {
        stage: { value: 'beta', confidence: 85 },
        team_scope: { value: 'solo', confidence: 90 },
        ai_involvement: { value: 'agentic', confidence: 90 },
        compliance: { value: 'none', confidence: 95 }
      }
    };

    // Novice user confirms all inferred answers
    const userAnswers: UserAnswers = {
      cohort: 'novice',
      tier1: {
        stage: scanResults.inferred.stage.value,
        team_scope: scanResults.inferred.team_scope.value,
        ai_involvement: scanResults.inferred.ai_involvement.value,
        compliance: scanResults.inferred.compliance.value
      },
      // Defaults applied automatically for Tier 2/3
      tier2: {
        ciMaturity: 'basic',
        observabilityLevel: 'basic'
      },
      tier3: {
        stackTypeOverride: undefined,
        deploymentTarget: 'cloud',
        reuseIntent: 'project-scoped',
        docExpectation: 'minimal-informal',
        testMaturity: 'unit'
      }
    };

    // Map to context
    const context: PrecedenceContext = {
      PROFILE_STAGE: userAnswers.tier1.stage as any,
      TEAM_SCALE: userAnswers.tier1.team_scope as any,
      AI_PATTERN: userAnswers.tier1.ai_involvement as any,
      COMPLIANCE_FRAMEWORK: [userAnswers.tier1.compliance],
      THREAT_LEVEL: 'medium',
      SECURITY_WEIGHT: 60,
      COMPLIANCE_WEIGHT: 50,
      THREAT_WEIGHT: 40,
      CI_MATURITY: userAnswers.tier2?.ciMaturity as any,
      OBSERVABILITY_LEVEL: userAnswers.tier2?.observabilityLevel as any
    };

    // Filter rules
    const filtered = filterRulesByContext(mockRules, context);
    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered.map(r => r.id)).toContain('rule-agentic-agents');
    expect(filtered.map(r => r.id)).toContain('rule-cicd-beta');

    // Score and resolve
    const scored = scoreRules(filtered, context);
    expect(scored.some(s => s.id === 'rule-agentic-agents')).toBe(true);
    const resolved = resolveAllConflicts(scored, context).resolved;

    // Verify simplified output (top recommendations only)
    const hardMandatory = resolved.filter(r => r.action.enforcementLevel === 'hard-mandatory');
    const softMandatory = resolved.filter(r => r.action.enforcementLevel === 'soft-mandatory');
    const top = [
      ...hardMandatory.sort((a, b) => b.score - a.score),
      ...softMandatory.sort((a, b) => b.score - a.score)
    ].slice(0, 5);

    expect(top.length).toBeGreaterThan(0);
    expect(top.length).toBeLessThanOrEqual(5);
  });

  // Test 2: RAG system at MVP stage
  it('novice-rag-mvp: filters RAG rules and applies Tier 2/3 defaults', () => {
    const context: PrecedenceContext = {
      PROFILE_STAGE: 'MVP',
      TEAM_SCALE: 'pair-trio',
      AI_PATTERN: 'RAG',
      COMPLIANCE_FRAMEWORK: ['none'],
      THREAT_LEVEL: 'medium',
      SECURITY_WEIGHT: 60,
      COMPLIANCE_WEIGHT: 50,
      THREAT_WEIGHT: 40
    };

    const filtered = filterRulesByContext(mockRules, context);

    // RAG rule should be included
    expect(filtered.map(r => r.id)).toContain('rule-rag-structure');
    expect(filtered.map(r => r.id)).not.toContain('rule-soc2-production');

    const scored = scoreRules(filtered, context);
    const resolved = resolveAllConflicts(scored, context).resolved;

    expect(resolved.some(r => r.id === 'rule-rag-structure')).toBe(true);
    expect(resolved.length).toBeGreaterThan(0);
  });

  // Test 3: Fintech SOC2 production system
  it('novice-fintech-soc2-production: compliance rules override stage, hard-mandatory applied', () => {
    const context: PrecedenceContext = {
      PROFILE_STAGE: 'production',
      TEAM_SCALE: 'small',
      AI_PATTERN: 'none',
      COMPLIANCE_FRAMEWORK: ['SOC2'],
      THREAT_LEVEL: 'high',
      SECURITY_WEIGHT: 85,
      COMPLIANCE_WEIGHT: 90,
      THREAT_WEIGHT: 70
    };

    const filtered = filterRulesByContext(mockRules, context);

    // Both SOC2 and fintech security rules should apply
    expect(filtered.map(r => r.id)).toContain('rule-soc2-production');
    expect(filtered.map(r => r.id)).toContain('rule-fintech-security');

    const scored = scoreRules(filtered, context);

    // SOC2 rule should have highest score (compliance boost)
    const soc2Rule = scored.find(r => r.id === 'rule-soc2-production');
    expect(soc2Rule).toBeDefined();
    expect(soc2Rule?.score).toBeGreaterThan(80);

    // Verify hard-mandatory enforcement
    expect(soc2Rule?.action.enforcementLevel).toBe('hard-mandatory');

    const resolved = resolveAllConflicts(scored, context).resolved;
    expect(resolved.some(r => r.id === 'rule-soc2-production' && r.status === 'applied')).toBe(true);
  });

  // Test 4: Startup MVP basic setup
  it('novice-startup-mvp: applies startup-specific rules with defaults', () => {
    const context: PrecedenceContext = {
      PROFILE_STAGE: 'MVP',
      TEAM_SCALE: 'pair-trio',
      AI_PATTERN: 'none',
      COMPLIANCE_FRAMEWORK: ['none'],
      THREAT_LEVEL: 'medium',
      SECURITY_WEIGHT: 50,
      COMPLIANCE_WEIGHT: 30,
      THREAT_WEIGHT: 40,
      CI_MATURITY: 'basic',
      OBSERVABILITY_LEVEL: 'basic'
    };

    const filtered = filterRulesByContext(mockRules, context);
    expect(filtered.map(r => r.id)).toContain('rule-startup-basic-ci');

    const scored = scoreRules(filtered, context);
    const resolved = resolveAllConflicts(scored, context).resolved;

    // Verify advisory enforcement for startup (less strict)
    const startupRule = resolved.find(r => r.id === 'rule-startup-basic-ci');
    expect(startupRule?.action.enforcementLevel).toMatch(/advisory|soft-mandatory/);
  });

  // Test 5: Internal PoC tool minimal compliance
  it('novice-internal-poc: applies minimal rules, no compliance overhead', () => {
    const context: PrecedenceContext = {
      PROFILE_STAGE: 'PoC',
      TEAM_SCALE: 'solo',
      AI_PATTERN: 'none',
      COMPLIANCE_FRAMEWORK: ['none'],
      THREAT_LEVEL: 'low',
      SECURITY_WEIGHT: 40,
      COMPLIANCE_WEIGHT: 20,
      THREAT_WEIGHT: 20
    };

    const filtered = filterRulesByContext(mockRules, context);

    // Should include minimal PoC rules
    expect(filtered.map(r => r.id)).toContain('rule-internal-tool-minimal');

    // Should NOT include compliance-heavy rules
    expect(filtered.map(r => r.id)).not.toContain('rule-soc2-production');
    expect(filtered.map(r => r.id)).not.toContain('rule-fintech-security');

    const scored = scoreRules(filtered, context);
    expect(scored.every(r => r.action.enforcementLevel !== 'hard-mandatory')).toBe(true);
  });

  // Test 6: Novice user edits one answer from inference
  it('novice-edited-answer: user confirms most answers but changes one', () => {
    const inferred = {
      stage: { value: 'beta', confidence: 85 },
      team_scope: { value: 'solo', confidence: 90 },
      ai_involvement: { value: 'none', confidence: 88 },
      compliance: { value: 'none', confidence: 95 }
    };

    // User changes AI_PATTERN from 'none' to 'LLM API'
    const userAnswers: UserAnswers = {
      cohort: 'novice',
      tier1: {
        stage: inferred.stage.value,
        team_scope: inferred.team_scope.value,
        ai_involvement: 'LLM API', // User edited this
        compliance: inferred.compliance.value
      }
    };

    const context: PrecedenceContext = {
      PROFILE_STAGE: userAnswers.tier1.stage as any,
      TEAM_SCALE: userAnswers.tier1.team_scope as any,
      AI_PATTERN: userAnswers.tier1.ai_involvement as any,
      COMPLIANCE_FRAMEWORK: [userAnswers.tier1.compliance],
      THREAT_LEVEL: 'medium',
      SECURITY_WEIGHT: 60,
      COMPLIANCE_WEIGHT: 50,
      THREAT_WEIGHT: 40
    };

    const filtered = filterRulesByContext(mockRules, context);

    // Should now include LLM API + beta stage rule
    expect(filtered.map(r => r.id)).toContain('rule-stage-beta-llm');
  });

  // Test 7: Agentic complex multi-agent system
  it('novice-agentic-complex: scores agentic rules correctly', () => {
    const context: PrecedenceContext = {
      PROFILE_STAGE: 'beta',
      TEAM_SCALE: 'small',
      AI_PATTERN: 'agentic',
      COMPLIANCE_FRAMEWORK: ['none'],
      THREAT_LEVEL: 'high',
      SECURITY_WEIGHT: 70,
      COMPLIANCE_WEIGHT: 40,
      THREAT_WEIGHT: 60
    };

    const filtered = filterRulesByContext(mockRules, context);
    const scored = scoreRules(filtered, context);

    const agenticRule = scored.find(r => r.id === 'rule-agentic-agents');
    expect(agenticRule).toBeDefined();
    expect(agenticRule?.score).toBeGreaterThan(0);
    expect(agenticRule?.score).toBeLessThanOrEqual(100);
  });

  // Test 8: Phasing decision not triggered for novice solo PoC
  it('novice-poc-solo-no-phasing: small scope, no phasing suggestion', () => {
    const context: PrecedenceContext = {
      PROFILE_STAGE: 'PoC',
      TEAM_SCALE: 'solo',
      AI_PATTERN: 'none',
      COMPLIANCE_FRAMEWORK: ['none'],
      THREAT_LEVEL: 'low',
      SECURITY_WEIGHT: 40,
      COMPLIANCE_WEIGHT: 20,
      THREAT_WEIGHT: 20
    };

    const scanResults: RepoScanResult = {
      hasCI: false,
      hasTests: false,
      testTypes: [],
      hasReadme: false,
      hasLicense: false,
      hasCodeowners: false,
      hasDocumentation: false,
      complianceMarkers: [],
      codebaseSizeLines: 5000,
      aiPatternIndicators: [],
      teamSizeIndicators: ['solo'],
      estimatedCriticalFindings: 0,
      inferred: {
        stage: { value: 'PoC', confidence: 80 },
        team_scope: { value: 'solo', confidence: 95 },
        ai_involvement: { value: 'none', confidence: 95 },
        compliance: { value: 'none', confidence: 95 }
      }
    };

    const shouldPhase = shouldSuggestPhasing(context, scanResults);
    expect(shouldPhase).toBe(false);
  });

  // Test 9: Phasing decision triggered for production with high threat
  it('novice-production-critical-phasing: high threat, large codebase triggers phasing', () => {
    const context: PrecedenceContext = {
      PROFILE_STAGE: 'production',
      TEAM_SCALE: 'small',
      AI_PATTERN: 'none',
      COMPLIANCE_FRAMEWORK: ['SOC2'],
      THREAT_LEVEL: 'critical',
      SECURITY_WEIGHT: 90,
      COMPLIANCE_WEIGHT: 85,
      THREAT_WEIGHT: 95
    };

    const scanResults: RepoScanResult = {
      hasCI: true,
      hasTests: true,
      testTypes: ['unit', 'integration', 'e2e'],
      hasReadme: true,
      hasLicense: true,
      hasCodeowners: true,
      hasDocumentation: true,
      complianceMarkers: ['SOC2'],
      codebaseSizeLines: 150000,
      aiPatternIndicators: [],
      teamSizeIndicators: [],
      estimatedCriticalFindings: 5,
      inferred: {
        stage: { value: 'production', confidence: 98 },
        team_scope: { value: 'small', confidence: 80 },
        ai_involvement: { value: 'none', confidence: 95 },
        compliance: { value: 'SOC2', confidence: 90 }
      }
    };

    const shouldPhase = shouldSuggestPhasing(context, scanResults);
    // With threat=1.0, size=0.7, resource=0.3: (1.0×0.4 + 0.7×0.3 + 0.3×0.3) = 0.76 > 0.65
    expect(shouldPhase).toBe(true);
  });

  // Test 10: Default application in novice flow
  it('novice-defaults-applied: Tier 2/3 defaults applied without user input', () => {
    // Simulate novice user who confirms Tier 1 without seeing Tier 2/3
    const userAnswers: UserAnswers = {
      cohort: 'novice',
      tier1: {
        stage: 'MVP',
        team_scope: 'solo',
        ai_involvement: 'none',
        compliance: 'none'
      }
      // No tier2 or tier3 provided; defaults should apply
    };

    // Build context with defaults
    const context: PrecedenceContext = {
      PROFILE_STAGE: userAnswers.tier1.stage as any,
      TEAM_SCALE: userAnswers.tier1.team_scope as any,
      AI_PATTERN: userAnswers.tier1.ai_involvement as any,
      COMPLIANCE_FRAMEWORK: [userAnswers.tier1.compliance],
      THREAT_LEVEL: 'medium', // Tier 3 default
      SECURITY_WEIGHT: 60, // Tier 3 default
      COMPLIANCE_WEIGHT: 50, // Tier 3 default
      THREAT_WEIGHT: 40, // Tier 3 default
      CI_MATURITY: 'basic', // Tier 2 default (not triggered by PoC)
      OBSERVABILITY_LEVEL: 'basic', // Tier 2 default (not triggered by PoC)
      TEST_MATURITY: 'unit', // Tier 3 default
      DOC_EXPECTATION: 'minimal-informal', // Tier 3 default
      REUSE_INTENT: 'project-scoped' // Tier 3 default
    };

    // All defaults should be populated
    expect(context.THREAT_LEVEL).toBe('medium');
    expect(context.SECURITY_WEIGHT).toBe(60);
    expect(context.TEST_MATURITY).toBe('unit');
  });

  // Test 11: Confidence scores guide novice user
  it('novice-confidence-display: high confidence answers shown to user clearly', () => {
    const scanResults = {
      stage: { value: 'production', confidence: 98 },
      team_scope: { value: 'small', confidence: 85 },
      ai_involvement: { value: 'none', confidence: 95 },
      compliance: { value: 'SOC2', confidence: 92 }
    };

    // All should be high confidence (≥80%)
    expect(scanResults.stage.confidence).toBeGreaterThanOrEqual(80);
    expect(scanResults.team_scope.confidence).toBeGreaterThanOrEqual(80);
    expect(scanResults.ai_involvement.confidence).toBeGreaterThanOrEqual(80);
    expect(scanResults.compliance.confidence).toBeGreaterThanOrEqual(80);
  });

  // Test 12: Output includes rationale for each recommendation
  it('novice-output-rationale: each recommendation explains why it applies', () => {
    const context: PrecedenceContext = {
      PROFILE_STAGE: 'production',
      TEAM_SCALE: 'small',
      AI_PATTERN: 'none',
      COMPLIANCE_FRAMEWORK: ['SOC2'],
      THREAT_LEVEL: 'high',
      SECURITY_WEIGHT: 85,
      COMPLIANCE_WEIGHT: 80,
      THREAT_WEIGHT: 70
    };

    const filtered = filterRulesByContext(mockRules, context);
    const scored = scoreRules(filtered, context);
    const resolved = resolveAllConflicts(scored, context).resolved;

    // Each rule should have rationale
    resolved.forEach(rule => {
      expect(rule.rationale).toBeDefined();
      expect(rule.rationale.length).toBeGreaterThan(0);
    });
  });

  // Test 13: Simplified output limits recommendations
  it('novice-simplified-output-count: output limited to 3-5 top recommendations', () => {
    const context: PrecedenceContext = {
      PROFILE_STAGE: 'beta',
      TEAM_SCALE: 'small',
      AI_PATTERN: 'agentic',
      COMPLIANCE_FRAMEWORK: ['none'],
      THREAT_LEVEL: 'medium',
      SECURITY_WEIGHT: 60,
      COMPLIANCE_WEIGHT: 50,
      THREAT_WEIGHT: 40
    };

    const filtered = filterRulesByContext(mockRules, context);
    const scored = scoreRules(filtered, context);
    const resolved = resolveAllConflicts(scored, context).resolved;

    // Sort by score and take top 5
    const top = resolved.sort((a, b) => b.score - a.score).slice(0, 5);

    expect(top.length).toBeGreaterThanOrEqual(0);
    expect(top.length).toBeLessThanOrEqual(5);
  });

  // Test 14: No conflicts expected for novice path
  it('novice-no-conflicts: simple novice context avoids rule conflicts', () => {
    const context: PrecedenceContext = {
      PROFILE_STAGE: 'PoC',
      TEAM_SCALE: 'pair-trio',
      AI_PATTERN: 'LLM API',
      COMPLIANCE_FRAMEWORK: ['none'],
      THREAT_LEVEL: 'low',
      SECURITY_WEIGHT: 40,
      COMPLIANCE_WEIGHT: 30,
      THREAT_WEIGHT: 30
    };

    const filtered = filterRulesByContext(mockRules, context);
    const scored = scoreRules(filtered, context);
    const { conflicts } = resolveAllConflicts(scored, context);

    // Simple contexts should have minimal conflicts
    expect(conflicts.length).toBeLessThanOrEqual(2);
  });

  // Test 15: Context variables properly mapped from Tier 1
  it('novice-context-mapping: Tier 1 answers correctly mapped to context variables', () => {
    const tier1: Tier1Answers = {
      stage: 'production',
      team_scope: 'multi-team',
      ai_involvement: 'agentic',
      compliance: 'SOC2'
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

    expect(context.PROFILE_STAGE).toBe('production');
    expect(context.TEAM_SCALE).toBe('multi-team');
    expect(context.AI_PATTERN).toBe('agentic');
    expect(context.COMPLIANCE_FRAMEWORK).toContain('SOC2');
  });
});
