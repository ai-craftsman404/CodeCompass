/**
 * Recommendation Engine for Audit Skill
 * Orchestrates: rule filtering → scoring → conflict resolution → phasing → output rendering
 */

import fs from 'fs';
import path from 'path';
import {
  AuditRule,
  PrecedenceContext,
  ScoredRule,
  ResolvedRule,
  AuditOutput,
  AuditRecommendation,
  PhasedRecommendations,
  Phase,
  RepoScanResult
} from './types/audit';
import {
  resolveAllConflicts,
  validateConflictResolution
} from './functions/conflict-resolution';
import {
  applyPrecedenceMatrix
} from './functions/precedence-scoring';

/**
 * Load all rules from .claude/audit-rules/templates/
 */
export async function loadAllRules(rulesDir: string): Promise<AuditRule[]> {
  const rules: AuditRule[] = [];
  const templateDir = path.join(rulesDir, 'templates');

  if (!fs.existsSync(templateDir)) {
    throw new Error(`Rules directory not found: ${templateDir}`);
  }

  // Load all JSON files from templates/
  const files = fs.readdirSync(templateDir).filter(f => f.endsWith('.json') && f !== 'index.json');

  for (const file of files) {
    const filePath = path.join(templateDir, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const fileRules = JSON.parse(content);

    // Handle both array and single object formats
    const ruleArray = Array.isArray(fileRules) ? fileRules : [fileRules];
    rules.push(...ruleArray);
  }

  return rules;
}

/**
 * Filter rules to only those applicable to the current context
 */
export function filterRulesByContext(rules: AuditRule[], context: PrecedenceContext): AuditRule[] {
  return rules.filter(rule => {
    const { contextVars } = rule.condition;

    // Check each condition variable
    for (const [varName, expectedValues] of Object.entries(contextVars)) {
      const contextValue = context[varName as keyof PrecedenceContext];
      const expected = Array.isArray(expectedValues) ? expectedValues : [expectedValues];

      // If context variable is array (like COMPLIANCE_FRAMEWORK), check if any match
      if (Array.isArray(contextValue)) {
        const hasMatch = contextValue.some(v => expected.includes(String(v)));
        if (!hasMatch) return false;
      } else {
        // Otherwise exact match
        if (!expected.includes(String(contextValue))) return false;
      }
    }

    return true;
  });
}

/**
 * Score each rule based on precedence matrix and context
 */
export function scoreRules(rules: AuditRule[], context: PrecedenceContext): ScoredRule[] {
  return rules.map(rule => ({
    ...rule,
    score: applyPrecedenceMatrix(rule, context)
  }));
}

/**
 * Determine if phasing (triage + full audit) should be suggested
 */
export function shouldSuggestPhasing(context: PrecedenceContext, scanResults: RepoScanResult): boolean {
  // Weighted formula: (threat × 0.40) + (size × 0.30) + (resource × 0.30) > 0.65

  const threatScore = getThreatScore(context.THREAT_LEVEL);
  const sizeScore = getSizeScore(scanResults.codebaseSizeLines);
  const resourceScore = getResourceScore(context.RESOURCE_CONSTRAINT || 'standard');

  const phasingScore = threatScore * 0.4 + sizeScore * 0.3 + resourceScore * 0.3;

  return phasingScore > 0.65;
}

function getThreatScore(threatLevel: string): number {
  const scores: Record<string, number> = {
    'critical': 1.0,
    'high': 0.7,
    'medium': 0.4,
    'low': 0.1,
    'none': 0.0
  };
  return scores[threatLevel] || 0.0;
}

function getSizeScore(lines: number): number {
  if (lines > 500000) return 1.0;
  if (lines > 100000) return 0.7;
  if (lines > 50000) return 0.5;
  return 0.2;
}

function getResourceScore(constraint: string): number {
  const scores: Record<string, number> = {
    'severe': 1.0,
    'moderate': 0.6,
    'standard': 0.3,
    'unlimited': 0.0
  };
  return scores[constraint] || 0.3;
}

/**
 * Organize resolved rules into phased approach (optional phase 1 + mandatory phase 2)
 */
export function determinePhasedRecommendations(
  resolved: ResolvedRule[],
  shouldPhase: boolean
): PhasedRecommendations {
  if (!shouldPhase) {
    // Single comprehensive phase
    return {
      phase1: null,
      phase2: {
        phase: 2,
        label: 'Full Audit',
        duration: 'Depends on scope (1-3 days typical)',
        objectives: ['Complete audit of all applicable rules'],
        successCriteria: ['All rules reviewed', 'Recommendations documented', 'Prioritization clear'],
        rules: resolved,
        output: 'Complete audit report with all findings and remediation roadmap'
      }
    };
  }

  // Split into triage (hard-mandatory) + comprehensive (all)
  const hardMandatory = resolved.filter(r => r.action.enforcementLevel === 'hard-mandatory');
  const allRules = resolved;

  return {
    phase1: {
      phase: 1,
      label: 'Triage (Quick Assessment)',
      duration: '1-2 hours',
      objectives: [
        'Identify critical violations',
        'Quick fix guide for blocking issues',
        'Risk prioritization'
      ],
      successCriteria: [
        'Hard-mandatory rules reviewed',
        'Risk ranking complete',
        'Phase 2 schedule determined'
      ],
      rules: hardMandatory,
      output: 'Quick fix guide + risk ranking + phase 2 schedule'
    },
    phase2: {
      phase: 2,
      label: 'Comprehensive Audit',
      duration: 'Full scope (1-3 days typical)',
      objectives: [
        'Complete evaluation of all applicable rules',
        'Detailed remediation roadmap',
        'Long-term architecture guidance'
      ],
      successCriteria: [
        'All rules reviewed',
        'Recommendations prioritized',
        'Implementation timeline defined'
      ],
      rules: allRules,
      output: 'Full audit report with comprehensive remediation roadmap'
    }
  };
}

/**
 * Render individual recommendation for user output
 */
export function renderRecommendation(
  rule: ResolvedRule,
  phaseNum: 1 | 2,
  context: PrecedenceContext
): AuditRecommendation {
  return {
    ruleId: rule.id,
    category: rule.category,
    enforcementLevel: rule.action.enforcementLevel,
    description: rule.action.recommendation,
    scaffold: rule.action.files
      ? {
        folder: rule.category,
        files: rule.action.files
      }
      : undefined,
    appliedBecause: {
      matchedContextVars: Object.entries(rule.condition.contextVars)
        .map(([key, values]) => `${key}=${Array.isArray(values) ? values.join('|') : values}`)
        .filter(v => {
          const varName = v.split('=')[0];
          return context[varName as keyof PrecedenceContext] !== undefined;
        }),
      precedenceScore: rule.score,
      overriddenRules: rule.overriddenBy ? [rule.overriddenBy] : undefined
    },
    phase: phaseNum,
    artifacts: rule.action.files ? rule.action.files.map(f => f.path) : undefined
  };
}

/**
 * Main recommendation generation engine
 */
export async function generateRecommendations(
  projectPath: string,
  context: PrecedenceContext,
  scanResults: RepoScanResult,
  rulesDir: string
): Promise<AuditOutput> {
  // Phase 1: Load all rules
  const allRules = await loadAllRules(rulesDir);

  // Phase 2: Filter to applicable rules
  const applicableRules = filterRulesByContext(allRules, context);

  // Phase 3: Score rules by precedence
  const scoredRules = scoreRules(applicableRules, context);

  // Phase 4: Resolve conflicts
  const { resolved, conflicts } = resolveAllConflicts(scoredRules, context);

  // Phase 5: Validate conflict resolution
  const validation = validateConflictResolution(resolved);
  if (!validation.valid) {
    console.warn('Conflict resolution validation warnings:', validation.errors);
  }

  // Phase 6: Determine phasing
  const shouldPhase = shouldSuggestPhasing(context, scanResults);
  const phasing = determinePhasedRecommendations(resolved, shouldPhase);

  // Phase 7: Render recommendations
  const recommendations: AuditRecommendation[] = [];

  if (phasing.phase1) {
    for (const rule of phasing.phase1.rules) {
      recommendations.push(renderRecommendation(rule, 1, context));
    }
  }

  for (const rule of phasing.phase2.rules) {
    recommendations.push(renderRecommendation(rule, 2, context));
  }

  // Phase 8: Collect artifacts
  const artifacts: string[] = [];
  for (const rec of recommendations) {
    if (rec.artifacts) {
      artifacts.push(...rec.artifacts);
    }
  }

  // Phase 9: Generate output
  return {
    phasing,
    recommendations,
    artifacts,
    explanation: {
      contextVars: context,
      conflictsResolved: conflicts.map(c => ({
        ruleA: c.loser.id,
        ruleB: c.winner.id,
        winner: c.winner.id,
        reason: c.reason
      })),
      phasingReason: shouldPhase
        ? `Critical threat (${context.THREAT_LEVEL}) + large codebase (${scanResults.codebaseSizeLines} lines) + resource constraints suggest phasing approach`
        : undefined
    }
  };
}

