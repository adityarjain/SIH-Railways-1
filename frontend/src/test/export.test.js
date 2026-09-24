import { describe, it, expect } from 'vitest';
import { toCsv } from '../utils/export';

describe('CSV export', () => {
  it('quotes commas, quotes and newlines', () => {
    expect(toCsv(['a', 'b'], [['x,y', 'say "hi"'], ['line\nbreak', 3]]))
      .toBe('a,b\r\n"x,y","say ""hi"""\r\n"line\nbreak",3');
  });

  it('neutralises spreadsheet formulas', () => {
    expect(toCsv(['c'], [['=SUM(A1)'], ['@cmd'], ['+1']])).toBe("c\r\n'=SUM(A1)\r\n'@cmd\r\n'+1");
  });

  it('writes empty cells for null and undefined', () => {
    expect(toCsv(['a', 'b'], [[null, undefined]])).toBe('a,b\r\n,');
  });
});
