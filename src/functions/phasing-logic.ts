/**
 * Phasing logic: determine if audit should be phased into triage + comprehensive
 * IMPLEMENTATION STUB - Tests drive implementation
 */
import { PrecedenceContext } from '../types/audit';

/**
 * Get threat score (0-1 normalized)
 */
export function getThreatScore(context: PrecedenceContext): number {
  const threatMap: Record<string, number> = {
    none: 0,
    low: 0.2,
    medium: 0.4,
    high: 0.65,
    critical: 1.0
  };
  return threatMap[context.THREAT_LEVEL] || 0;
}

/**
 * Get codebase size score (0-1 normalized)
 * Assumes codebaseSizeLines is provided in context
 */
export function getSizeScore(context: PrecedenceContext): number {
  const sizeLines = (context as Record<string, unknown>).codebaseSizeLines as number | undefined;
  if (!sizeLines) return 0;
  // 100k lines = 0.5, 250k lines = 1.0
  return Math.min(1, sizeLines / 250000);
}

/**
 * Get resource constraint score (0-1 normalized)
 */
export function getResourceScore(context: PrecedenceContext): number {
  const constraint = context.RESOURCE_CONSTRAINT || 'none';
  const resourceMap: Record<string, number> = {
    none: 0,
    minimal: 0.3,
    moderate: 0.6,
    severe: 1.0
  };
  return resourceMap[constraint] || 0;
}

/**
 * Determine if phasing should be suggested
 * Formula: (threat × 0.40) + (size × 0.30) + (resource × 0.30) > 0.65
 */
export function shouldSuggestPhasing(context: PrecedenceContext): boolean {
  const threatScore = getThreatScore(context);
  const sizeScore = getSizeScore(context);
  const resourceScore = getResourceScore(context);

  const phasingScore = (threatScore * 0.40) + (sizeScore * 0.30) + (resourceScore * 0.30);
  return phasingScore > 0.65;
}
