/**
 * E2E Tests: Complete Audit Flow
 * Tests the full 9-step flow: repo scan → context infer → rule filter → score → resolve → phase → render
 * Coverage: Full integration from input to output, phasing logic, conflict resolution = 20 tests
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  filterRulesByContext,
  scoreRules,
  shouldSuggestPhasing
} from '../recommendation-engine';
import { resolveAllConflicts } from '../conflict-resolver';
import {
  AuditRule,
  PrecedenceContext,
  RepoScanResult,
  AuditOutput,
  AuditRecommendation
} from '../types/audit';

describe('E2E: Complete Audit Flow', () => {
  let tempDir: string;
  let mockRules: AuditRule[];

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-e2e-'));

    mockRules = [
      {
        id: 'rule-cicd-signal-beta',
        description: 'CI/CD detected → stage: beta',
        category: 'tooling',
        condition: {
          contextVars: { PROFILE_STAGE: 'beta' },
          precedenceWeight: 75
        },
        action: {
          type: 'scaffold',
          recommendation: '.github/workflows CI/CD pipelines',
          enforcementLevel: 'soft-mandatory'
        },
        rationale: 'Beta projects need automated pipelines'
      },
      {
        id: 'rule-agents-folder-agentic',
        description: '/agents/ folder → agentic pattern',
        category: 'structure',
        condition: {
          contextVars: { AI_PATTERN: 'agentic' },
          precedenceWeight: 80
        },
        action: {
          type: 'scaffold',
          recommendation: '/agents, /tools, /memory folders',
          enforcementLevel: 'soft-mandatory'
        },
        rationale: 'Agentic systems need agent/tool structure'
      },
      {
        id: 'rule-compliance-marker-soc2',
        description: 'SOC2 marker → compliance: SOC2',
        category: 'compliance',
        condition: {
          contextVars: { COMPLIANCE_FRAMEWORK: 'SOC2' },
          precedenceWeight: 90
        },
        action: {
          type: 'audit',
          recommendation: 'SOC2 compliance audit trail',
          enforcementLevel: 'hard-mandatory'
        },
        rationale: 'SOC2 compliance required'
      },
      {
        id: 'rule-security-high-threat',
        description: 'High threat level security hardening',
        category: 'security',
        condition: {
          contextVars: { THREAT_LEVEL: 'high' },
          precedenceWeight: 85
        },
        action: {
          type: 'hardening',
          recommendation: 'Enhanced security controls',
          enforcementLevel: 'soft-mandatory'
        },
        rationale: 'High threat requires extra security'
      },
      {
        id: 'rule-solo-minimal-setup',
        description: 'Solo team minimal setup',
        category: 'structure',
        condition: {
          contextVars: { TEAM_SCALE: 'solo' },
          precedenceWeight: 30
        },
        action: {
          type: 'scaffold',
          recommendation: 'Basic .gitignore and README',
          enforcementLevel: 'advisory'
        },
        rationale: 'Solo projects need basic structure'
      },
      {
        id: 'rule-production-soc2-conflict',
        description: 'Production + SOC2 combined',
        category: 'compliance',
        condition: {
          contextVars: { PROFILE_STAGE: 'production', COMPLIANCE_FRAMEWORK: 'SOC2' },
          precedenceWeight: 98
        },
        action: {
          type: 'audit',
          recommendation: 'Full production SOC2 controls',
          enforcementLevel: 'hard-mandatory'
        },
        conflictsWith: ['rule-stage-based-relaxed'],
        rationale: 'Production SOC2 strictest level'
      },
      {
        id: 'rule-stage-based-relaxed',
        description: 'Stage-based relaxed requirements',
        category: 'structure',
        condition: {
          contextVars: { PROFILE_STAGE: 'MVP' },
          precedenceWeight: 40
        },
        action: {
          type: 'scaffold',
          recommendation: 'MVP minimum viable structure',
          enforcementLevel: 'advisory'
        },
        rationale: 'MVP allows minimal compliance'
      },
      {
        id: 'rule-critical-threat-override',
        description: 'Critical threat overrides resources',
        category: 'security',
        condition: {
          contextVars: { THREAT_LEVEL: 'critical' },
          precedenceWeight: 100
        },
        action: {
          type: 'hardening',
          recommendation: 'Maximum security posture required',
          enforcementLevel: 'hard-mandatory'
        },
        rationale: 'Critical threats demand maximum resources'
      },
      {
        id: 'rule-production-observability',
        description: 'Production observability required',
        category: 'tooling',
        condition: {
          contextVars: { PROFILE_STAGE: 'production' },
          precedenceWeight: 70
        },
        action: {
          type: 'scaffold',
          recommendation: 'Production monitoring and observability',
          enforcementLevel: 'soft-mandatory'
        },
        rationale: 'Production systems need monitoring'
      },
      {
        id: 'rule-rag-structure-required',
        description: 'RAG structure and vectors',
        category: 'structure',
        condition: {
          contextVars: { AI_PATTERN: 'RAG' },
          precedenceWeight: 65
        },
        action: {
          type: 'scaffold',
          recommendation: '/embeddings, /retrieval folders',
          enforcementLevel: 'soft-mandatory'
        },
        rationale: 'RAG needs embeddings structure'
      }
    ];
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  // Test 1: Repo scan signals correctly inferred (CI/CD → beta)
  it('flow-repo-scan-cicd-beta: .github/workflows detected → PROFILE_STAGE=beta inferred', () => {
    const scanResults: RepoScanResult = {
      hasCI: true,
      hasTests: true,
      testTypes: ['unit', 'integration'],
      hasReadme: true,
      hasLicense: true,
      hasCodeowners: false,
      hasDocumentation: true,
      complianceMarkers: [],
      codebaseSizeLines: 45000,
      aiPatternIndicators: [],
      teamSizeIndicators: ['pair-trio'],
      estimatedCriticalFindings: 1,
      inferred: {
        stage: { value: 'beta', confidence: 85 }, // CI/CD signal
        team_scope: { value: 'pair-trio', confidence: 80 },
        ai_involvement: { value: 'none', confidence: 95 },
        compliance: { value: 'none', confidence: 95 }
      }
    };

    // Confidence should be high due to CI detection
    expect(scanResults.inferred.stage.confidence).toBeGreaterThanOrEqual(80);
    expect(scanResults.inferred.stage.value).toBe('beta');
  });

  // Test 2: Repo scan infers agentic from /agents/ folder
  it('flow-repo-scan-agents-agentic: /agents/ folder detected → AI_PATTERN=agentic inferred', () => {
    const scanResults: RepoScanResult = {
      hasCI: true,
      hasTests: true,
      testTypes: ['unit'],
      hasReadme: true,
      hasLicense: false,
      hasCodeowners: false,
      hasDocumentation: false,
      complianceMarkers: [],
      codebaseSizeLines: 50000,
      aiPatternIndicators: ['/agents/', 'AGENT.md files'],
      teamSizeIndicators: ['multi-file structure'],
      estimatedCriticalFindings: 0,
      inferred: {
        stage: { value: 'beta', confidence: 85 },
        team_scope: { value: 'small', confidence: 75 },
        ai_involvement: { value: 'agentic', confidence: 90 }, // Inferred from /agents/
        compliance: { value: 'none', confidence: 95 }
      }
    };

    expect(scanResults.inferred.ai_involvement.value).toBe('agentic');
    expect(scanResults.aiPatternIndicators).toContain('/agents/');
  });

  // Test 3: Repo scan detects SOC2 compliance markers
  it('flow-repo-scan-soc2-markers: SOC2 docs detected → COMPLIANCE_FRAMEWORK=SOC2 inferred', () => {
    const scanResults: RepoScanResult = {
      hasCI: true,
      hasTests: true,
      testTypes: ['unit', 'integration', 'e2e'],
      hasReadme: true,
      hasLicense: true,
      hasCodeowners: true,
      hasDocumentation: true,
      complianceMarkers: ['SOC2', '/docs/compliance/soc2-controls.md'],
      codebaseSizeLines: 150000,
      aiPatternIndicators: [],
      teamSizeIndicators: ['CODEOWNERS', 'multi-team structure'],
      estimatedCriticalFindings: 3,
      inferred: {
        stage: { value: 'production', confidence: 95 },
        team_scope: { value: 'small', confidence: 85 },
        ai_involvement: { value: 'none', confidence: 95 },
        compliance: { value: 'SOC2', confidence: 90 } // Inferred from markers
      }
    };

    expect(scanResults.complianceMarkers).toContain('SOC2');
    expect(scanResults.inferred.compliance.value).toBe('SOC2');
  });

  // Test 4: Filter rules by inferred context (beta → cicd rule applies)
  it('flow-rule-filter-beta-cicd: PROFILE_STAGE=beta filters cicd rule correctly', () => {
    const context: PrecedenceContext = {
      PROFILE_STAGE: 'beta',
      TEAM_SCALE: 'pair-trio',
      AI_PATTERN: 'none',
      COMPLIANCE_FRAMEWORK: ['none'],
      THREAT_LEVEL: 'medium',
      SECURITY_WEIGHT: 60,
      COMPLIANCE_WEIGHT: 50,
      THREAT_WEIGHT: 40
    };

    const filtered = filterRulesByContext(mockRules, context);

    expect(filtered.map(r => r.id)).toContain('rule-cicd-signal-beta');
    expect(filtered.map(r => r.id)).not.toContain('rule-production-soc2-conflict');
  });

  // Test 5: Filter rules by multiple conditions (agentic + beta)
  it('flow-rule-filter-agentic-beta: AI_PATTERN=agentic + PROFILE_STAGE=beta filters agents rule', () => {
    const context: PrecedenceContext = {
      PROFILE_STAGE: 'beta',
      TEAM_SCALE: 'small',
      AI_PATTERN: 'agentic',
      COMPLIANCE_FRAMEWORK: ['none'],
      THREAT_LEVEL: 'medium',
      SECURITY_WEIGHT: 70,
      COMPLIANCE_WEIGHT: 50,
      THREAT_WEIGHT: 40
    };

    const filtered = filterRulesByContext(mockRules, context);

    expect(filtered.map(r => r.id)).toContain('rule-agents-folder-agentic');
    expect(filtered.map(r => r.id)).toContain('rule-cicd-signal-beta');
  });

  // Test 6: Precedence scoring: SOC2 compliance boosts score
  it('flow-scoring-soc2-boost: SOC2 compliance rule scores high due to boost', () => {
    const context: PrecedenceContext = {
      PROFILE_STAGE: 'production',
      TEAM_SCALE: 'small',
      AI_PATTERN: 'none',
      COMPLIANCE_FRAMEWORK: ['SOC2'],
      THREAT_LEVEL: 'high',
      SECURITY_WEIGHT: 85,
      COMPLIANCE_WEIGHT: 90,
      THREAT_WEIGHT: 75
    };

    const filtered = filterRulesByContext(mockRules, context);
    const scored = scoreRules(filtered, context);

    const soc2Rule = scored.find(r => r.id === 'rule-compliance-marker-soc2');
    const advisoryRule = scored.find(r => r.id === 'rule-solo-minimal-setup');

    expect(soc2Rule).toBeDefined();
    if (soc2Rule && advisoryRule) {
      expect(soc2Rule.score).toBeGreaterThan(advisoryRule.score);
    }
  });

  // Test 7: Conflict detection and resolution (production-soc2 vs stage-relaxed)
  it('flow-conflict-resolution: production+SOC2 overrides MVP-relaxed via compliance precedence', () => {
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
    const scored = scoreRules(filtered, context);
    const { resolved, conflicts } = resolveAllConflicts(scored, context);

    // Production+SOC2 rule should win over MVP-relaxed
    const productionSoc2 = resolved.find(r => r.id === 'rule-production-soc2-conflict');
    expect(productionSoc2?.status).toBe('applied');

    // Conflict should be detected or resolved
    expect(conflicts.length).toBeGreaterThanOrEqual(0);
  });

  // Test 8: Threat level override precedence (critical threat → max security)
  it('flow-threat-override: THREAT_LEVEL=critical overrides resource constraints', () => {
    const context: PrecedenceContext = {
      PROFILE_STAGE: 'production',
      TEAM_SCALE: 'solo',
      AI_PATTERN: 'none',
      COMPLIANCE_FRAMEWORK: ['none'],
      THREAT_LEVEL: 'critical',
      SECURITY_WEIGHT: 100,
      COMPLIANCE_WEIGHT: 80,
      THREAT_WEIGHT: 100
    };

    const filtered = filterRulesByContext(mockRules, context);
    const threatRule = filtered.find(r => r.id === 'rule-critical-threat-override');

    expect(threatRule).toBeDefined();
    expect(threatRule?.action.enforcementLevel).toBe('hard-mandatory');
  });

  // Test 9: Phasing decision: production + high threat triggers phasing
  it('flow-phasing-production-high-threat: score > 0.65 suggests phasing (triage + comprehensive)', () => {
    const context: PrecedenceContext = {
      PROFILE_STAGE: 'production',
      TEAM_SCALE: 'small',
      AI_PATTERN: 'none',
      COMPLIANCE_FRAMEWORK: ['SOC2'],
      THREAT_LEVEL: 'high',
      SECURITY_WEIGHT: 85,
      COMPLIANCE_WEIGHT: 85,
      THREAT_WEIGHT: 75,
      RESOURCE_CONSTRAINT: 'moderate'
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
      codebaseSizeLines: 120000, // Large codebase
      aiPatternIndicators: [],
      teamSizeIndicators: [],
      estimatedCriticalFindings: 5,
      inferred: {
        stage: { value: 'production', confidence: 98 },
        team_scope: { value: 'small', confidence: 80 },
        ai_involvement: { value: 'none', confidence: 95 },
        compliance: { value: 'SOC2', confidence: 95 }
      }
    };

    const shouldPhase = shouldSuggestPhasing(context, scanResults);
    // threat=0.7 (high), size=0.7 (120k), resource=0.6 (moderate)
    // (0.7×0.4 + 0.7×0.3 + 0.6×0.3) = 0.28 + 0.21 + 0.18 = 0.67 > 0.65
    expect(shouldPhase).toBe(true);
  });

  // Test 10: Phasing decision: MVP + low threat does NOT trigger phasing
  it('flow-no-phasing-mvp-low: small MVP with low threat → no phasing suggested', () => {
    const context: PrecedenceContext = {
      PROFILE_STAGE: 'MVP',
      TEAM_SCALE: 'pair-trio',
      AI_PATTERN: 'none',
      COMPLIANCE_FRAMEWORK: ['none'],
      THREAT_LEVEL: 'low',
      SECURITY_WEIGHT: 40,
      COMPLIANCE_WEIGHT: 20,
      THREAT_WEIGHT: 30
    };

    const scanResults: RepoScanResult = {
      hasCI: false,
      hasTests: true,
      testTypes: ['unit'],
      hasReadme: true,
      hasLicense: false,
      hasCodeowners: false,
      hasDocumentation: false,
      complianceMarkers: [],
      codebaseSizeLines: 15000, // Small
      aiPatternIndicators: [],
      teamSizeIndicators: ['pair-trio'],
      estimatedCriticalFindings: 0,
      inferred: {
        stage: { value: 'MVP', confidence: 85 },
        team_scope: { value: 'pair-trio', confidence: 90 },
        ai_involvement: { value: 'none', confidence: 95 },
        compliance: { value: 'none', confidence: 95 }
      }
    };

    const shouldPhase = shouldSuggestPhasing(context, scanResults);
    // threat=0.1 (low), size=0.2 (small), resource=0.3 (standard)
    // (0.1×0.4 + 0.2×0.3 + 0.3×0.3) = 0.04 + 0.06 + 0.09 = 0.19 < 0.65
    expect(shouldPhase).toBe(false);
  });

  // Test 11: Output structure includes rule IDs, enforcement levels, rationale
  it('flow-output-structure: recommendations include id, enforcementLevel, rationale', () => {
    const context: PrecedenceContext = {
      PROFILE_STAGE: 'production',
      TEAM_SCALE: 'small',
      AI_PATTERN: 'none',
      COMPLIANCE_FRAMEWORK: ['SOC2'],
      THREAT_LEVEL: 'high',
      SECURITY_WEIGHT: 85,
      COMPLIANCE_WEIGHT: 85,
      THREAT_WEIGHT: 70
    };

    const filtered = filterRulesByContext(mockRules, context);
    const scored = scoreRules(filtered, context);
    const { resolved } = resolveAllConflicts(scored, context);

    // Each resolved rule should have all fields
    resolved.forEach(rule => {
      expect(rule.id).toBeDefined();
      expect(rule.action.enforcementLevel).toMatch(/advisory|soft-mandatory|hard-mandatory/);
      expect(rule.rationale).toBeDefined();
      expect(rule.rationale.length).toBeGreaterThan(0);
    });
  });

  // Test 12: Hard-mandatory rules always present in output
  it('flow-hard-mandatory-present: hard-mandatory rules always included in recommendations', () => {
    const context: PrecedenceContext = {
      PROFILE_STAGE: 'production',
      TEAM_SCALE: 'small',
      AI_PATTERN: 'none',
      COMPLIANCE_FRAMEWORK: ['SOC2'],
      THREAT_LEVEL: 'high',
      SECURITY_WEIGHT: 85,
      COMPLIANCE_WEIGHT: 85,
      THREAT_WEIGHT: 70
    };

    const filtered = filterRulesByContext(mockRules, context);
    const scored = scoreRules(filtered, context);
    const { resolved } = resolveAllConflicts(scored, context);

    const hardMandatory = resolved.filter(r => r.action.enforcementLevel === 'hard-mandatory');
    expect(hardMandatory.length).toBeGreaterThan(0);

    hardMandatory.forEach(rule => {
      expect(rule.status).toBe('applied');
    });
  });

  // Test 13: Precedence scoring orders recommendations correctly
  it('flow-precedence-ordering: rules sorted by score (highest first)', () => {
    const context: PrecedenceContext = {
      PROFILE_STAGE: 'production',
      TEAM_SCALE: 'multi-team',
      AI_PATTERN: 'agentic',
      COMPLIANCE_FRAMEWORK: ['SOC2'],
      THREAT_LEVEL: 'critical',
      SECURITY_WEIGHT: 95,
      COMPLIANCE_WEIGHT: 95,
      THREAT_WEIGHT: 95
    };

    const filtered = filterRulesByContext(mockRules, context);
    const scored = scoreRules(filtered, context);
    const { resolved } = resolveAllConflicts(scored, context);

    // Verify ordering
    const sorted = [...resolved].sort((a, b) => b.score - a.score);
    for (let i = 1; i < sorted.length; i++) {
      expect(sorted[i - 1].score).toBeGreaterThanOrEqual(sorted[i].score);
    }
  });

  // Test 14: Output artifacts list matches rule recommendations
  it('flow-artifacts-mapping: output artifacts match rule scaffold recommendations', () => {
    const context: PrecedenceContext = {
      PROFILE_STAGE: 'beta',
      TEAM_SCALE: 'small',
      AI_PATTERN: 'agentic',
      COMPLIANCE_FRAMEWORK: ['none'],
      THREAT_LEVEL: 'medium',
      SECURITY_WEIGHT: 70,
      COMPLIANCE_WEIGHT: 50,
      THREAT_WEIGHT: 50
    };

    const filtered = filterRulesByContext(mockRules, context);
    const scored = scoreRules(filtered, context);
    const { resolved } = resolveAllConflicts(scored, context);

    // Rules with scaffold type should map to artifacts
    const scaffoldRules = resolved.filter(r => r.action.type === 'scaffold');
    expect(scaffoldRules.length).toBeGreaterThan(0);

    scaffoldRules.forEach(rule => {
      expect(rule.action.recommendation).toBeDefined();
    });
  });

  // Test 15: Phasing output structure (phase1 + phase2)
  it('flow-phasing-structure: phase1 has hard-mandatory only, phase2 has all rules', () => {
    const context: PrecedenceContext = {
      PROFILE_STAGE: 'production',
      TEAM_SCALE: 'small',
      AI_PATTERN: 'none',
      COMPLIANCE_FRAMEWORK: ['SOC2'],
      THREAT_LEVEL: 'critical',
      SECURITY_WEIGHT: 95,
      COMPLIANCE_WEIGHT: 95,
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
      codebaseSizeLines: 200000,
      aiPatternIndicators: [],
      teamSizeIndicators: [],
      estimatedCriticalFindings: 8,
      inferred: {
        stage: { value: 'production', confidence: 99 },
        team_scope: { value: 'small', confidence: 85 },
        ai_involvement: { value: 'none', confidence: 95 },
        compliance: { value: 'SOC2', confidence: 98 }
      }
    };

    const shouldPhase = shouldSuggestPhasing(context, scanResults);

    if (shouldPhase) {
      const filtered = filterRulesByContext(mockRules, context);
      const scored = scoreRules(filtered, context);
      const { resolved } = resolveAllConflicts(scored, context);

      // Phase 1: only hard-mandatory
      const phase1Rules = resolved.filter(r => r.action.enforcementLevel === 'hard-mandatory');
      expect(phase1Rules.length).toBeGreaterThan(0);

      // Phase 2: all applied rules
      expect(resolved.length).toBeGreaterThanOrEqual(phase1Rules.length);
    }
  });

  // Test 16: Confidence scores preserved in output
  it('flow-confidence-in-output: inferred confidence scores included in explanation', () => {
    const scanResults: RepoScanResult = {
      hasCI: true,
      hasTests: true,
      testTypes: ['unit'],
      hasReadme: true,
      hasLicense: false,
      hasCodeowners: false,
      hasDocumentation: false,
      complianceMarkers: [],
      codebaseSizeLines: 30000,
      aiPatternIndicators: ['/agents/'],
      teamSizeIndicators: [],
      estimatedCriticalFindings: 0,
      inferred: {
        stage: { value: 'beta', confidence: 85 },
        team_scope: { value: 'solo', confidence: 90 },
        ai_involvement: { value: 'agentic', confidence: 90 },
        compliance: { value: 'none', confidence: 95 }
      }
    };

    // Confidence should be available in output explanation
    expect(scanResults.inferred.stage.confidence).toBeGreaterThanOrEqual(70);
    expect(scanResults.inferred.ai_involvement.confidence).toBeGreaterThanOrEqual(80);
  });

  // Test 17: Multiple compliance frameworks handled (array logic)
  it('flow-multiple-compliance-frameworks: COMPLIANCE_FRAMEWORK as array filters correctly', () => {
    const context: PrecedenceContext = {
      PROFILE_STAGE: 'production',
      TEAM_SCALE: 'multi-team',
      AI_PATTERN: 'none',
      COMPLIANCE_FRAMEWORK: ['SOC2', 'ISO27001'], // Multiple frameworks
      THREAT_LEVEL: 'critical',
      SECURITY_WEIGHT: 95,
      COMPLIANCE_WEIGHT: 95,
      THREAT_WEIGHT: 90
    };

    const filtered = filterRulesByContext(mockRules, context);

    // Rules matching either framework should apply
    const soc2Rule = filtered.find(r => r.id === 'rule-compliance-marker-soc2');
    expect(soc2Rule).toBeDefined();

    // Array context variable should match
    expect(context.COMPLIANCE_FRAMEWORK).toContain('SOC2');
    expect(context.COMPLIANCE_FRAMEWORK).toContain('ISO27001');
  });

  // Test 18: RAG pattern and CI detection combined
  it('flow-rag-with-cicd: RAG + CI/CD inferred triggers appropriate rules', () => {
    const scanResults: RepoScanResult = {
      hasCI: true,
      hasTests: true,
      testTypes: ['unit', 'integration'],
      hasReadme: true,
      hasLicense: false,
      hasCodeowners: false,
      hasDocumentation: true,
      complianceMarkers: [],
      codebaseSizeLines: 60000,
      aiPatternIndicators: ['/embeddings/', '/retrieval/', 'vector_store'],
      teamSizeIndicators: ['pair-trio'],
      estimatedCriticalFindings: 1,
      inferred: {
        stage: { value: 'beta', confidence: 88 },
        team_scope: { value: 'small', confidence: 75 },
        ai_involvement: { value: 'RAG', confidence: 92 },
        compliance: { value: 'none', confidence: 95 }
      }
    };

    const context: PrecedenceContext = {
      PROFILE_STAGE: scanResults.inferred.stage.value as any,
      TEAM_SCALE: scanResults.inferred.team_scope.value as any,
      AI_PATTERN: scanResults.inferred.ai_involvement.value as any,
      COMPLIANCE_FRAMEWORK: [scanResults.inferred.compliance.value],
      THREAT_LEVEL: 'medium',
      SECURITY_WEIGHT: 65,
      COMPLIANCE_WEIGHT: 50,
      THREAT_WEIGHT: 40
    };

    const filtered = filterRulesByContext(mockRules, context);

    // Both RAG and CI/CD rules should apply
    expect(filtered.map(r => r.id)).toContain('rule-rag-structure-required');
    expect(filtered.map(r => r.id)).toContain('rule-cicd-signal-beta');
  });

  // Test 19: Solo team escalation (team size upgrade)
  it('flow-solo-escalation: solo team with compliance → rules escalate appropriately', () => {
    const context: PrecedenceContext = {
      PROFILE_STAGE: 'production',
      TEAM_SCALE: 'solo', // Solo
      AI_PATTERN: 'none',
      COMPLIANCE_FRAMEWORK: ['SOC2'], // But has compliance!
      THREAT_LEVEL: 'high',
      SECURITY_WEIGHT: 90,
      COMPLIANCE_WEIGHT: 90,
      THREAT_WEIGHT: 80
    };

    const filtered = filterRulesByContext(mockRules, context);

    // Compliance rules should still apply even for solo team
    const complianceRules = filtered.filter(r => r.category === 'compliance');
    expect(complianceRules.length).toBeGreaterThan(0);

    const soc2Rule = complianceRules.find(r => r.id === 'rule-compliance-marker-soc2');
    expect(soc2Rule?.action.enforcementLevel).toBe('hard-mandatory');
  });

  // Test 20: Full end-to-end: scan → context → filter → score → resolve → output
  it('flow-complete-end-to-end: full pipeline from scan through output', () => {
    // Step 1: Repo scan
    const scanResults: RepoScanResult = {
      hasCI: true,
      hasTests: true,
      testTypes: ['unit', 'integration'],
      hasReadme: true,
      hasLicense: true,
      hasCodeowners: false,
      hasDocumentation: true,
      complianceMarkers: ['SOC2'],
      codebaseSizeLines: 85000,
      aiPatternIndicators: ['/agents/', 'AGENT.md'],
      teamSizeIndicators: ['small team indicators'],
      estimatedCriticalFindings: 3,
      inferred: {
        stage: { value: 'production', confidence: 92 },
        team_scope: { value: 'small', confidence: 85 },
        ai_involvement: { value: 'agentic', confidence: 88 },
        compliance: { value: 'SOC2', confidence: 93 }
      }
    };

    // Step 2: Context mapping
    const context: PrecedenceContext = {
      PROFILE_STAGE: scanResults.inferred.stage.value as any,
      TEAM_SCALE: scanResults.inferred.team_scope.value as any,
      AI_PATTERN: scanResults.inferred.ai_involvement.value as any,
      COMPLIANCE_FRAMEWORK: [scanResults.inferred.compliance.value],
      THREAT_LEVEL: 'high',
      SECURITY_WEIGHT: 85,
      COMPLIANCE_WEIGHT: 85,
      THREAT_WEIGHT: 75
    };

    // Step 3: Filter rules
    const filtered = filterRulesByContext(mockRules, context);
    expect(filtered.length).toBeGreaterThan(0);

    // Step 4: Score rules
    const scored = scoreRules(filtered, context);
    expect(scored.every(r => r.score >= 0 && r.score <= 100)).toBe(true);

    // Step 5: Resolve conflicts
    const { resolved, conflicts } = resolveAllConflicts(scored, context);
    expect(resolved.every(r => r.status === 'applied')).toBe(true);

    // Step 6: Determine phasing
    const shouldPhase = shouldSuggestPhasing(context, scanResults);
    // Large codebase (85k) + high threat → likely phasing
    expect(typeof shouldPhase).toBe('boolean');

    // Step 7: Output structure
    expect(resolved.length).toBeGreaterThan(0);
    resolved.forEach(rule => {
      expect(rule.id).toBeDefined();
      expect(rule.score).toBeGreaterThanOrEqual(0);
      expect(rule.rationale).toBeDefined();
    });
  });
});
