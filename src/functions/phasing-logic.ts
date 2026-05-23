/**
 * Phasing logic: determine if audit should be phased into triage + comprehensive
 * IMPLEMENTATION STUB - Tests drive implementation
 */
import { PrecedenceContext } from '../types/audit';

/**
 * Get threat score (0-1 normalized)
 * Can be called with context or with threat level string directly
 */
export function getThreatScore(contextOrLevel: PrecedenceContext | string): number {
  let level: string;

  if (typeof contextOrLevel === 'string') {
    // Direct threat level string
    level = contextOrLevel;
  } else {
    // Context object
    level = contextOrLevel.THREAT_LEVEL || 'none';
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
export function getResourceScore(contextOrConstraint: PrecedenceContext | string): number {
  let constraint: string;

  if (typeof contextOrConstraint === 'string') {
    // Direct constraint string
    constraint = contextOrConstraint;
  } else {
    // Context object
    constraint = contextOrConstraint.RESOURCE_CONSTRAINT || 'standard';
  }

  const resourceMap: Record<string, number> = {
    unlimited: 0,
    none: 0,
    minimal: 0.3,
    standard: 0.3,
    moderate: 0.6,
    severe: 1.0
  };
  return resourceMap[constraint] || 0.3; // default to standard (0.3)
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
