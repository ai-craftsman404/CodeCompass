/**
 * Re-exports from the authoritative conflict-resolution module.
 * This file exists for backwards compatibility with e2e tests.
 */
export {
  detectConflictsBetweenRules,
  resolveConflict,
  resolveAllConflicts,
  validateConflictResolution
} from './functions/conflict-resolution';

export { applyPrecedenceMatrix } from './functions/precedence-scoring';
