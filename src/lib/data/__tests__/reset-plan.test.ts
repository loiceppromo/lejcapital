import { describe, it, expect } from 'vitest';
import { RESET_DELETION_ORDER, RESET_DEPENDENCIES } from '../reset-plan';

describe('reset deletion order', () => {
  it('lists every model exactly once', () => {
    const unique = new Set(RESET_DELETION_ORDER);
    expect(unique.size).toBe(RESET_DELETION_ORDER.length);
  });

  it('has a dependency entry for every model in the order', () => {
    for (const model of RESET_DELETION_ORDER) {
      expect(RESET_DEPENDENCIES[model]).toBeDefined();
    }
  });

  it('deletes every child before any parent it references (FK-safe)', () => {
    const indexOf = (m: string) => RESET_DELETION_ORDER.indexOf(m as never);
    for (const [model, deps] of Object.entries(RESET_DEPENDENCIES)) {
      const childIdx = indexOf(model);
      for (const parent of deps) {
        const parentIdx = indexOf(parent);
        // parent must be deleted AFTER the child that references it
        expect(
          parentIdx,
          `${model} (idx ${childIdx}) references ${parent} (idx ${parentIdx}); parent must come later`,
        ).toBeGreaterThan(childIdx);
      }
    }
  });

  it('does not clear preserved tables', () => {
    const preserved = ['user', 'auditLog', 'marketRegimeConfig', 'returnAssumption'];
    for (const p of preserved) {
      expect(RESET_DELETION_ORDER).not.toContain(p);
    }
  });
});
