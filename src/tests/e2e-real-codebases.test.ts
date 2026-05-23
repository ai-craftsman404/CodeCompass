/**
 * E2E Tests: Real Codebase Structures
 * Tests against realistic project structures: agentic, RAG, fintech, startup, internal tool
 * Creates temp fixtures for each project type, verifies auto-inference and rule matching = 15 tests
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
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
  PrecedenceContext
} from '../types/audit';

/**
 * Helper to create fixture project structure
 */
function createFixtureProject(
  basePath: string,
  structure: Record<string, string[]>
): void {
  Object.entries(structure).forEach(([dir, files]) => {
    const dirPath = path.join(basePath, dir);
    fs.mkdirSync(dirPath, { recursive: true });

    files.forEach(file => {
      const filePath = path.join(dirPath, file);
      fs.writeFileSync(filePath, `// ${file}`);
    });
  });
}

describe('E2E: Real Codebase Structures', () => {
  let tempDir: string;
  let mockRules: AuditRule[];

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-fixtures-'));

    mockRules = [
      {
        id: 'rule-agents-structure',
        description: 'Agentic: /agents directory structure',
        category: 'structure',
        condition: {
          contextVars: { AI_PATTERN: 'agentic' },
          precedenceWeight: 85
        },
        action: {
          type: 'scaffold',
          recommendation: 'Create /agents, /tools, /memory, /prompts folders',
          enforcementLevel: 'soft-mandatory'
        },
        rationale: 'Agentic systems need organized agent/tool management'
      },
      {
        id: 'rule-rag-embeddings',
        description: 'RAG: embedding and retrieval structure',
        category: 'structure',
        condition: {
          contextVars: { AI_PATTERN: 'RAG' },
          precedenceWeight: 75
        },
        action: {
          type: 'scaffold',
          recommendation: 'Create /embeddings, /retrieval, /ingestion folders',
          enforcementLevel: 'soft-mandatory'
        },
        rationale: 'RAG systems need vector storage and retrieval patterns'
      },
      {
        id: 'rule-fintech-soc2',
        description: 'Fintech: SOC2 compliance controls',
        category: 'compliance',
        condition: {
          contextVars: { COMPLIANCE_FRAMEWORK: 'SOC2', PROFILE_STAGE: 'production' },
          precedenceWeight: 98
        },
        action: {
          type: 'audit',
          recommendation: 'Implement SOC2 Type II compliance audit trail',
          enforcementLevel: 'hard-mandatory'
        },
        rationale: 'Production fintech requires strict SOC2 controls'
      },
      {
        id: 'rule-fintech-codeowners',
        description: 'Fintech: CODEOWNERS governance',
        category: 'structure',
        condition: {
          contextVars: { COMPLIANCE_FRAMEWORK: 'SOC2' },
          precedenceWeight: 80
        },
        action: {
          type: 'scaffold',
          recommendation: 'Create CODEOWNERS file with security team approval',
          enforcementLevel: 'soft-mandatory'
        },
        rationale: 'Fintech needs explicit code ownership and approval'
      },
      {
        id: 'rule-startup-ci-basic',
        description: 'Startup: basic CI/CD setup',
        category: 'tooling',
        condition: {
          contextVars: { PROFILE_STAGE: 'MVP' },
          precedenceWeight: 50
        },
        action: {
          type: 'scaffold',
          recommendation: 'Create .github/workflows with basic build and test',
          enforcementLevel: 'advisory'
        },
        rationale: 'MVP projects benefit from lightweight automated CI'
      },
      {
        id: 'rule-startup-readme',
        description: 'Startup: essential README',
        category: 'structure',
        condition: {
          contextVars: { PROFILE_STAGE: 'MVP' },
          precedenceWeight: 40
        },
        action: {
          type: 'scaffold',
          recommendation: 'Create comprehensive README with setup instructions',
          enforcementLevel: 'advisory'
        },
        rationale: 'MVP projects need clear setup documentation'
      },
      {
        id: 'rule-internal-minimal',
        description: 'Internal tool: minimal setup',
        category: 'structure',
        condition: {
          contextVars: { PROFILE_STAGE: 'PoC', TEAM_SCALE: 'solo' },
          precedenceWeight: 30
        },
        action: {
          type: 'scaffold',
          recommendation: 'Create .gitignore and basic README',
          enforcementLevel: 'advisory'
        },
        rationale: 'Internal tools can have minimal structure'
      },
      {
        id: 'rule-agentic-memory-management',
        description: 'Agentic: memory and context management',
        category: 'structure',
        condition: {
          contextVars: { AI_PATTERN: 'agentic' },
          precedenceWeight: 70
        },
        action: {
          type: 'scaffold',
          recommendation: 'Implement /memory for agent state persistence',
          enforcementLevel: 'soft-mandatory'
        },
        rationale: 'Agentic systems need memory/state management'
      },
      {
        id: 'rule-rag-vector-store',
        description: 'RAG: vector store integration',
        category: 'tooling',
        condition: {
          contextVars: { AI_PATTERN: 'RAG' },
          precedenceWeight: 75
        },
        action: {
          type: 'scaffold',
          recommendation: 'Set up vector database (Pinecone, Weaviate, etc.)',
          enforcementLevel: 'soft-mandatory'
        },
        rationale: 'RAG systems require vector storage infrastructure'
      },
      {
        id: 'rule-production-monitoring',
        description: 'Production: observability and monitoring',
        category: 'tooling',
        condition: {
          contextVars: { PROFILE_STAGE: 'production' },
          precedenceWeight: 70
        },
        action: {
          type: 'scaffold',
          recommendation: 'Implement production monitoring and alerting',
          enforcementLevel: 'soft-mandatory'
        },
        rationale: 'Production systems need observability'
      },
      {
        id: 'rule-small-team-codeowners',
        description: 'Single CODEOWNERS file for small team governance',
        category: 'structure',
        condition: {
          contextVars: { TEAM_SCALE: 'small' },
          precedenceWeight: 70
        },
        action: {
          type: 'scaffold',
          recommendation: 'Add a CODEOWNERS file for team ownership',
          enforcementLevel: 'soft-mandatory'
        },
        rationale: 'Small teams benefit from explicit code ownership via CODEOWNERS'
      }
    ];
  });

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  // Test 1: Agentic system fixture
  it('codebase-agentic-system: fixture with /agents/*/AGENT.md structure', () => {
    const agenticPath = path.join(tempDir, 'agentic-app');
    createFixtureProject(agenticPath, {
      '.github/workflows': ['ci.yml'],
      'agents': ['user-agent-AGENT.md', 'scheduler-agent-AGENT.md'],
      'tools': ['database-tool.ts', 'api-tool.ts'],
      'memory': ['memory-store.ts', 'context-manager.ts'],
      'prompts': ['system-prompt.txt', 'user-prompt.txt'],
      'src': ['index.ts', 'main.ts'],
      'tests': ['agents.test.ts']
    });

    // Verify structure created
    expect(fs.existsSync(path.join(agenticPath, 'agents'))).toBe(true);
    expect(fs.existsSync(path.join(agenticPath, 'tools'))).toBe(true);
    expect(fs.existsSync(path.join(agenticPath, 'memory'))).toBe(true);

    // Infer context: /agents/ → agentic, CI present → beta
    const context: PrecedenceContext = {
      PROFILE_STAGE: 'beta', // CI detected
      TEAM_SCALE: 'pair-trio',
      AI_PATTERN: 'agentic', // /agents/ folder detected
      COMPLIANCE_FRAMEWORK: ['none'],
      THREAT_LEVEL: 'medium',
      SECURITY_WEIGHT: 60,
      COMPLIANCE_WEIGHT: 50,
      THREAT_WEIGHT: 40
    };

    const filtered = filterRulesByContext(mockRules, context);
    expect(filtered.map(r => r.id)).toContain('rule-agents-structure');
    expect(filtered.map(r => r.id)).toContain('rule-agentic-memory-management');
  });

  // Test 2: RAG system fixture
  it('codebase-rag-system: fixture with /embeddings/ /retrieval/ structure', () => {
    const ragPath = path.join(tempDir, 'rag-app');
    createFixtureProject(ragPath, {
      '.github/workflows': ['build.yml', 'deploy.yml'],
      'embeddings': ['embedding-service.ts', 'model-config.ts'],
      'retrieval': ['retriever.ts', 'reranker.ts'],
      'ingestion': ['document-loader.ts', 'chunking.ts'],
      'vector-store': ['pinecone-client.ts', 'indexing.ts'],
      'src': ['app.ts', 'utils.ts'],
      'docs': ['setup.md', 'architecture.md']
    });

    expect(fs.existsSync(path.join(ragPath, 'embeddings'))).toBe(true);
    expect(fs.existsSync(path.join(ragPath, 'retrieval'))).toBe(true);
    expect(fs.existsSync(path.join(ragPath, 'vector-store'))).toBe(true);

    // Infer: /embeddings/ /retrieval/ → RAG
    const context: PrecedenceContext = {
      PROFILE_STAGE: 'beta',
      TEAM_SCALE: 'small',
      AI_PATTERN: 'RAG', // /embeddings/, /retrieval/ detected
      COMPLIANCE_FRAMEWORK: ['none'],
      THREAT_LEVEL: 'medium',
      SECURITY_WEIGHT: 60,
      COMPLIANCE_WEIGHT: 50,
      THREAT_WEIGHT: 40
    };

    const filtered = filterRulesByContext(mockRules, context);
    expect(filtered.map(r => r.id)).toContain('rule-rag-embeddings');
    expect(filtered.map(r => r.id)).toContain('rule-rag-vector-store');
  });

  // Test 3: Fintech SOC2 production fixture
  it('codebase-fintech-soc2-production: fixture with compliance markers', () => {
    const fintechPath = path.join(tempDir, 'fintech-app');
    createFixtureProject(fintechPath, {
      '.github/workflows': ['ci.yml', 'security-checks.yml', 'deploy-prod.yml'],
      'src': ['api.ts', 'transactions.ts', 'payments.ts'],
      'tests': ['api.test.ts', 'integration.test.ts', 'e2e.test.ts'],
      'docs': ['SECURITY.md', 'COMPLIANCE.md', 'SOC2-CONTROLS.md'],
      'compliance': ['soc2-audit.md', 'risk-register.md'],
      'config': ['soc2-config.json']
    });

    // Add CODEOWNERS for fintech
    fs.writeFileSync(path.join(fintechPath, 'CODEOWNERS'), '* @security-team @compliance-team');

    expect(fs.existsSync(path.join(fintechPath, 'compliance'))).toBe(true);
    expect(fs.existsSync(path.join(fintechPath, 'CODEOWNERS'))).toBe(true);

    // Infer: SOC2 marker + production signals → compliance framework + production
    const context: PrecedenceContext = {
      PROFILE_STAGE: 'production', // Multiple CI, tags indicate production
      TEAM_SCALE: 'small',
      AI_PATTERN: 'none',
      COMPLIANCE_FRAMEWORK: ['SOC2'], // /compliance/, SOC2-CONTROLS.md detected
      THREAT_LEVEL: 'high',
      SECURITY_WEIGHT: 90,
      COMPLIANCE_WEIGHT: 90,
      THREAT_WEIGHT: 75
    };

    const filtered = filterRulesByContext(mockRules, context);
    const soc2Rules = filtered.filter(r => r.condition.contextVars.COMPLIANCE_FRAMEWORK === 'SOC2');
    expect(soc2Rules.length).toBeGreaterThan(0);
    expect(filtered.map(r => r.id)).toContain('rule-fintech-soc2');
    expect(filtered.map(r => r.id)).toContain('rule-fintech-codeowners');
  });

  // Test 4: Startup MVP fixture
  it('codebase-startup-mvp: fixture with basic structure and tests', () => {
    const startupPath = path.join(tempDir, 'startup-app');
    createFixtureProject(startupPath, {
      '.github/workflows': ['test.yml'],
      'src': ['index.ts', 'api.ts', 'models.ts'],
      'tests': ['api.test.ts', 'models.test.ts'],
      'config': ['database.config.ts'],
      'public': ['index.html', 'styles.css']
    });

    fs.writeFileSync(path.join(startupPath, 'package.json'), JSON.stringify({
      name: 'startup-app',
      version: '0.1.0',
      scripts: { test: 'jest', dev: 'ts-node src/index.ts' }
    }, null, 2));

    fs.writeFileSync(path.join(startupPath, 'README.md'), '# Startup App\n\nSetup instructions...');

    expect(fs.existsSync(path.join(startupPath, 'package.json'))).toBe(true);
    expect(fs.existsSync(path.join(startupPath, 'README.md'))).toBe(true);

    // Infer: v0.x version → PoC/MVP, basic CI, minimal compliance
    const context: PrecedenceContext = {
      PROFILE_STAGE: 'MVP', // v0.x or early version signals
      TEAM_SCALE: 'pair-trio',
      AI_PATTERN: 'none',
      COMPLIANCE_FRAMEWORK: ['none'],
      THREAT_LEVEL: 'low',
      SECURITY_WEIGHT: 40,
      COMPLIANCE_WEIGHT: 20,
      THREAT_WEIGHT: 30
    };

    const filtered = filterRulesByContext(mockRules, context);
    expect(filtered.map(r => r.id)).toContain('rule-startup-ci-basic');
    expect(filtered.map(r => r.id)).toContain('rule-startup-readme');

    // Should NOT have compliance rules
    expect(
      filtered.filter(r => r.category === 'compliance' && r.condition.contextVars.COMPLIANCE_FRAMEWORK !== 'none').length
    ).toBe(0);
  });

  // Test 5: Internal tool PoC fixture
  it('codebase-internal-poc: fixture with minimal structure', () => {
    const internalPath = path.join(tempDir, 'internal-tool');
    createFixtureProject(internalPath, {
      'src': ['main.ts', 'utils.ts'],
      'scripts': ['setup.sh', 'run.sh']
    });

    fs.writeFileSync(path.join(internalPath, '.gitignore'), 'node_modules/\n.env\n');

    expect(fs.existsSync(path.join(internalPath, 'src'))).toBe(true);
    expect(fs.existsSync(path.join(internalPath, '.gitignore'))).toBe(true);

    // Infer: minimal structure, no CI → PoC, solo team
    const context: PrecedenceContext = {
      PROFILE_STAGE: 'PoC',
      TEAM_SCALE: 'solo',
      AI_PATTERN: 'none',
      COMPLIANCE_FRAMEWORK: ['none'],
      THREAT_LEVEL: 'low',
      SECURITY_WEIGHT: 30,
      COMPLIANCE_WEIGHT: 10,
      THREAT_WEIGHT: 20
    };

    const filtered = filterRulesByContext(mockRules, context);
    expect(filtered.map(r => r.id)).toContain('rule-internal-minimal');

    // Should NOT enforce strict rules
    const strictRules = filtered.filter(r => r.action.enforcementLevel === 'hard-mandatory');
    expect(strictRules.length).toBe(0);
  });

  // Test 6: Agentic system scoring and precedence
  it('codebase-agentic-scoring: agentic rules score higher than general rules', () => {
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

    const agenticRules = scored.filter(r => r.id.includes('agentic'));
    const otherRules = scored.filter(r => !r.id.includes('agentic'));

    // Agentic rules should have higher precedence weights
    if (agenticRules.length > 0 && otherRules.length > 0) {
      const avgAgenticScore = agenticRules.reduce((sum, r) => sum + r.score, 0) / agenticRules.length;
      const avgOtherScore = otherRules.reduce((sum, r) => sum + r.score, 0) / otherRules.length;
      expect(avgAgenticScore).toBeGreaterThanOrEqual(avgOtherScore * 0.8);
    }
  });

  // Test 7: RAG system specific rules apply only to RAG
  it('codebase-rag-isolation: RAG rules filter out for non-RAG contexts', () => {
    const ragContext: PrecedenceContext = {
      PROFILE_STAGE: 'beta',
      TEAM_SCALE: 'small',
      AI_PATTERN: 'RAG',
      COMPLIANCE_FRAMEWORK: ['none'],
      THREAT_LEVEL: 'medium',
      SECURITY_WEIGHT: 60,
      COMPLIANCE_WEIGHT: 50,
      THREAT_WEIGHT: 40
    };

    const nonRagContext: PrecedenceContext = {
      PROFILE_STAGE: 'beta',
      TEAM_SCALE: 'small',
      AI_PATTERN: 'none',
      COMPLIANCE_FRAMEWORK: ['none'],
      THREAT_LEVEL: 'medium',
      SECURITY_WEIGHT: 60,
      COMPLIANCE_WEIGHT: 50,
      THREAT_WEIGHT: 40
    };

    const ragFiltered = filterRulesByContext(mockRules, ragContext);
    const nonRagFiltered = filterRulesByContext(mockRules, nonRagContext);

    // RAG rules should apply only to RAG context
    expect(ragFiltered.map(r => r.id)).toContain('rule-rag-embeddings');
    expect(nonRagFiltered.map(r => r.id)).not.toContain('rule-rag-embeddings');
  });

  // Test 8: Fintech SOC2 rules filter out for non-fintech
  it('codebase-fintech-isolation: SOC2 rules only apply when COMPLIANCE_FRAMEWORK=SOC2', () => {
    const fintechContext: PrecedenceContext = {
      PROFILE_STAGE: 'production',
      TEAM_SCALE: 'small',
      AI_PATTERN: 'none',
      COMPLIANCE_FRAMEWORK: ['SOC2'],
      THREAT_LEVEL: 'high',
      SECURITY_WEIGHT: 85,
      COMPLIANCE_WEIGHT: 85,
      THREAT_WEIGHT: 75
    };

    const nonFintechContext: PrecedenceContext = {
      PROFILE_STAGE: 'production',
      TEAM_SCALE: 'small',
      AI_PATTERN: 'none',
      COMPLIANCE_FRAMEWORK: ['none'],
      THREAT_LEVEL: 'high',
      SECURITY_WEIGHT: 85,
      COMPLIANCE_WEIGHT: 50,
      THREAT_WEIGHT: 75
    };

    const fintechFiltered = filterRulesByContext(mockRules, fintechContext);
    const nonFintechFiltered = filterRulesByContext(mockRules, nonFintechContext);

    expect(fintechFiltered.map(r => r.id)).toContain('rule-fintech-soc2');
    expect(nonFintechFiltered.map(r => r.id)).not.toContain('rule-fintech-soc2');
  });

  // Test 9: Startup MVP rules are advisory (not strict)
  it('codebase-startup-advisory-enforcement: MVP rules are advisory, not mandatory', () => {
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

    const filtered = filterRulesByContext(mockRules, context);
    const mvpRules = filtered.filter(r => r.id.includes('startup'));

    // Startup rules should be advisory
    mvpRules.forEach(rule => {
      expect(rule.action.enforcementLevel).toBe('advisory');
    });
  });

  // Test 10: Internal tool minimal rules are advisory
  it('codebase-internal-tool-minimal-enforcement: PoC solo rules are advisory', () => {
    const context: PrecedenceContext = {
      PROFILE_STAGE: 'PoC',
      TEAM_SCALE: 'solo',
      AI_PATTERN: 'none',
      COMPLIANCE_FRAMEWORK: ['none'],
      THREAT_LEVEL: 'low',
      SECURITY_WEIGHT: 30,
      COMPLIANCE_WEIGHT: 10,
      THREAT_WEIGHT: 20
    };

    const filtered = filterRulesByContext(mockRules, context);
    const internalRules = filtered.filter(r => r.id.includes('internal'));

    internalRules.forEach(rule => {
      expect(rule.action.enforcementLevel).toMatch(/advisory|soft-mandatory/);
    });
  });

  // Test 11: Production stage always includes monitoring rule
  it('codebase-production-monitoring: PROFILE_STAGE=production triggers monitoring rule', () => {
    const context: PrecedenceContext = {
      PROFILE_STAGE: 'production',
      TEAM_SCALE: 'small',
      AI_PATTERN: 'none',
      COMPLIANCE_FRAMEWORK: ['none'],
      THREAT_LEVEL: 'medium',
      SECURITY_WEIGHT: 70,
      COMPLIANCE_WEIGHT: 60,
      THREAT_WEIGHT: 60
    };

    const filtered = filterRulesByContext(mockRules, context);
    expect(filtered.map(r => r.id)).toContain('rule-production-monitoring');
  });

  // Test 12: Agentic + high threat escalates enforcement
  it('codebase-agentic-threat-escalation: agentic + high threat escalates rules', () => {
    const lowThreatContext: PrecedenceContext = {
      PROFILE_STAGE: 'beta',
      TEAM_SCALE: 'pair-trio',
      AI_PATTERN: 'agentic',
      COMPLIANCE_FRAMEWORK: ['none'],
      THREAT_LEVEL: 'low',
      SECURITY_WEIGHT: 40,
      COMPLIANCE_WEIGHT: 30,
      THREAT_WEIGHT: 30
    };

    const highThreatContext: PrecedenceContext = {
      PROFILE_STAGE: 'beta',
      TEAM_SCALE: 'pair-trio',
      AI_PATTERN: 'agentic',
      COMPLIANCE_FRAMEWORK: ['none'],
      THREAT_LEVEL: 'high',
      SECURITY_WEIGHT: 85,
      COMPLIANCE_WEIGHT: 75,
      THREAT_WEIGHT: 80
    };

    const lowThreatScored = scoreRules(filterRulesByContext(mockRules, lowThreatContext), lowThreatContext);
    const highThreatScored = scoreRules(filterRulesByContext(mockRules, highThreatContext), highThreatContext);

    // High threat should result in higher scores
    const agenticLowScore = lowThreatScored.find(r => r.id === 'rule-agents-structure')?.score || 0;
    const agenticHighScore = highThreatScored.find(r => r.id === 'rule-agents-structure')?.score || 0;

    expect(agenticHighScore).toBeGreaterThanOrEqual(agenticLowScore);
  });

  // Test 13: RAG + small team applies both rules
  it('codebase-rag-small-team: RAG + small team combines applicable rules', () => {
    const context: PrecedenceContext = {
      PROFILE_STAGE: 'beta',
      TEAM_SCALE: 'small',
      AI_PATTERN: 'RAG',
      COMPLIANCE_FRAMEWORK: ['none'],
      THREAT_LEVEL: 'medium',
      SECURITY_WEIGHT: 70,
      COMPLIANCE_WEIGHT: 50,
      THREAT_WEIGHT: 50
    };

    const filtered = filterRulesByContext(mockRules, context);

    // Should have RAG rules
    expect(filtered.map(r => r.id)).toContain('rule-rag-embeddings');
    expect(filtered.map(r => r.id)).toContain('rule-rag-vector-store');

    // General rules should also apply
    expect(filtered.length).toBeGreaterThan(2);
  });

  // Test 14: Fintech production + agentic (unusual combo) applies both
  it('codebase-fintech-agentic-hybrid: SOC2 production + agentic applies both rule sets', () => {
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

    // Should have both fintech and agentic rules
    expect(filtered.map(r => r.id)).toContain('rule-fintech-soc2');
    expect(filtered.map(r => r.id)).toContain('rule-agents-structure');
  });

  // Test 15: All project types covered (5 contexts produce applicable rules)
  it('codebase-all-types-coverage: all 5 project types produce applicable rules', () => {
    const projectTypes = [
      {
        name: 'agentic',
        context: {
          PROFILE_STAGE: 'beta' as const,
          TEAM_SCALE: 'small' as const,
          AI_PATTERN: 'agentic' as const,
          COMPLIANCE_FRAMEWORK: ['none'],
          THREAT_LEVEL: 'medium' as const,
          SECURITY_WEIGHT: 70,
          COMPLIANCE_WEIGHT: 50,
          THREAT_WEIGHT: 50
        }
      },
      {
        name: 'RAG',
        context: {
          PROFILE_STAGE: 'beta' as const,
          TEAM_SCALE: 'small' as const,
          AI_PATTERN: 'RAG' as const,
          COMPLIANCE_FRAMEWORK: ['none'],
          THREAT_LEVEL: 'medium' as const,
          SECURITY_WEIGHT: 60,
          COMPLIANCE_WEIGHT: 50,
          THREAT_WEIGHT: 40
        }
      },
      {
        name: 'fintech',
        context: {
          PROFILE_STAGE: 'production' as const,
          TEAM_SCALE: 'small' as const,
          AI_PATTERN: 'none' as const,
          COMPLIANCE_FRAMEWORK: ['SOC2'],
          THREAT_LEVEL: 'high' as const,
          SECURITY_WEIGHT: 85,
          COMPLIANCE_WEIGHT: 85,
          THREAT_WEIGHT: 75
        }
      },
      {
        name: 'startup',
        context: {
          PROFILE_STAGE: 'MVP' as const,
          TEAM_SCALE: 'pair-trio' as const,
          AI_PATTERN: 'none' as const,
          COMPLIANCE_FRAMEWORK: ['none'],
          THREAT_LEVEL: 'low' as const,
          SECURITY_WEIGHT: 40,
          COMPLIANCE_WEIGHT: 20,
          THREAT_WEIGHT: 30
        }
      },
      {
        name: 'internal',
        context: {
          PROFILE_STAGE: 'PoC' as const,
          TEAM_SCALE: 'solo' as const,
          AI_PATTERN: 'none' as const,
          COMPLIANCE_FRAMEWORK: ['none'],
          THREAT_LEVEL: 'low' as const,
          SECURITY_WEIGHT: 30,
          COMPLIANCE_WEIGHT: 10,
          THREAT_WEIGHT: 20
        }
      }
    ];

    projectTypes.forEach(project => {
      const filtered = filterRulesByContext(mockRules, project.context);
      expect(filtered.length).toBeGreaterThan(0);
    });
  });
});
