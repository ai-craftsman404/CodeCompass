/**
 * Phasing logic: determine if audit should be phased into triage + comprehensive
 * IMPLEMENTATION STUB - Tests drive implementation
 */
import { PrecedenceContext } from '../types/audit';

/**
 * Get threat score (0-1 normalized)
 * Can be called with context or with threat level string directly
 */
export function getThreatScore(contextOrLevel: PrecedenceContext | string | undefined): number {
  let level: string;

  if (typeof contextOrLevel === 'string') {
    // Direct threat level string
    level = contextOrLevel;
  } else if (contextOrLevel && typeof contextOrLevel === 'object') {
    // Context object
    level = (contextOrLevel as Record<string, unknown>).THREAT_LEVEL as string || 'none';
  } else {
    // Null or undefined
    level = 'none';
  }

  const threatMap: Record<string, number> = {
    none: 0,
    low: 0.1,
    medium: 0.4,
    high: 0.7,
    critical: 1.0
  };
  return threatMap[level] || 0;
}

/**
 * Get codebase size score (0-1 normalized)
 * Can be called with context or with line count directly
 * Brackets: <= 50k = 0.2, > 50k = 0.5, > 100k = 0.7, > 500k = 1.0
 */
export function getSizeScore(contextOrLines: PrecedenceContext | number): number {
  let sizeLines: number | undefined;

  if (typeof contextOrLines === 'number') {
    // Direct line count
    sizeLines = contextOrLines;
  } else {
    // Context object
    sizeLines = (contextOrLines as Record<string, unknown>).codebaseSizeLines as number | undefined;
  }

  if (!sizeLines) return 0.2; // default to small codebase

  // Bracket-based scoring
  if (sizeLines > 500000) return 1.0;
  if (sizeLines > 100000) return 0.7;
  if (sizeLines > 50000) return 0.5;
  return 0.2; // <= 50k
}

/**
 * Get resource constraint score (0-1 normalized)
 * Can be called with context or with constraint string directly
 */
export function getResourceScore(contextOrConstraint: PrecedenceContext | string | undefined): number {
  let constraint: string;

  if (typeof contextOrConstraint === 'string') {
    // Direct constraint string
    constraint = contextOrConstraint;
  } else if (contextOrConstraint && typeof contextOrConstraint === 'object') {
    // Context object
    constraint = (contextOrConstraint as Record<string, unknown>).RESOURCE_CONSTRAINT as string || 'standard';
  } else {
    // Null or undefined
    constraint = 'standard';
  }

  const resourceMap: Record<string, number> = {
    unlimited: 0,
    none: 0,
    minimal: 0.3,
    standard: 0.3,
    moderate: 0.6,
    severe: 1.0
  };
  return resourceMap[constraint] ?? 0.3; // default to standard (0.3)
}

/**
 * Determine if phasing should be suggested
 * Formula: (threat × 0.40) + (size × 0.30) + (resource × 0.30) > 0.65
 */
export function shouldSuggestPhasing(context: PrecedenceContext, scanResults?: Record<string, unknown>): boolean {
  // Merge scanResults into context if provided
  const mergedContext = scanResults ? { ...context, ...scanResults } : context;

  const threatScore = getThreatScore(mergedContext);
  const sizeScore = getSizeScore(mergedContext);
  const resourceScore = getResourceScore(mergedContext);

  const phasingScore = (threatScore * 0.40) + (sizeScore * 0.30) + (resourceScore * 0.30);
  return phasingScore > 0.65;
}

/**
 * Phase structure: Triage (Phase 1) + Comprehensive (Phase 2)
 */
export interface Phase {
  phase: 1 | 2;
  label: string;
  duration: string;
  objectives: string[];
  output: string;
  rules: Array<{ id: string; category: string }>;
}

/**
 * Phasing output structure
 */
export interface PhasingOutput {
  phase1: Phase | null;
  phase2: Phase;
}

/**
 * Determine phased recommendations
 * @param resolved Array of resolved rules
 * @param suggestPhasing Whether phasing is suggested (boolean)
 * @returns {PhasingOutput} Phase 1 (if phasing) + Phase 2 structure
 */
export function determinePhasedRecommendations(
  resolved: Array<{ id: string; category: string; action?: { enforcementLevel?: string } }>,
  suggestPhasing: boolean
): PhasingOutput {
  if (suggestPhasing) {
    // Phase 1: Hard-mandatory only (Triage: 1-2 hours)
    const hardMandatoryRules = resolved.filter(r => r.status !== 'overridden' && r.action?.enforcementLevel === 'hard-mandatory');
    const phase1: Phase = {
      phase: 1,
      label: 'Triage (1-2 hours)',
      duration: '1-2 hours',
      output: 'Quick-fix guide with critical findings and risk rankings',
      objectives: [
        'Identify critical violations and security hotspots',
        'Create quick-fix action list',
        'Risk prioritization for Phase 2'
      ],
      rules: hardMandatoryRules.map(r => ({ id: r.id, category: r.category }))
    };

    // Phase 2: All applied rules (Comprehensive: 1-3 days)
    const phase2: Phase = {
      phase: 2,
      label: 'Comprehensive (1-3 days)',
      duration: '1-3 days',
      output: 'Full remediation roadmap with compliance artifacts and documentation',
      objectives: [
        'Complete audit against all applicable rules',
        'Generate full remediation roadmap',
        'Document compliance artifacts'
      ],
      rules: resolved.filter(r => r.status !== 'overridden').map(r => ({ id: r.id, category: r.category }))
    };

    return { phase1, phase2 };
  } else {
    // Single phase: Full audit
    const phase2: Phase = {
      phase: 2,
      label: 'Full Audit',
      duration: '2-4 hours',
      output: 'Comprehensive audit report with all findings and recommendations',
      objectives: [
        'Complete audit against all applicable rules',
        'Generate comprehensive recommendations',
        'Document findings and artifacts'
      ],
      rules: resolved.filter(r => r.status !== 'overridden').map(r => ({ id: r.id, category: r.category }))
    };

    return { phase1: null, phase2 };
  }
}
