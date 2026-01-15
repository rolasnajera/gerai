import { describe, it, expect } from 'vitest';
import { add } from './math';

describe('math utils', () => {
  it('adds two numbers', () => {
    expect(add(2, 3)).toBe(5);
  });
});
