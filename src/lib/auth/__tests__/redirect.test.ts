import { describe, expect, it } from 'vitest';
import { safePostAuthPath } from '../redirect';

describe('safePostAuthPath', () => {
  it('allows internal application paths', () => {
    expect(safePostAuthPath('/loans')).toBe('/loans');
  });

  it('rejects external and malformed redirect targets', () => {
    expect(safePostAuthPath('https://attacker.example')).toBe('/dashboard');
    expect(safePostAuthPath('//attacker.example')).toBe('/dashboard');
    expect(safePostAuthPath('\\attacker.example')).toBe('/dashboard');
    expect(safePostAuthPath(null)).toBe('/dashboard');
  });
});
