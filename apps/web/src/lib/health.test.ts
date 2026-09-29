import { describe, expect, it } from 'vitest';

import { healthLabel } from './health';

describe('healthLabel', () => {
  it('does not report the API as online when health is unavailable', () => {
    expect(healthLabel(null)).toBe('API indisponível neste momento');
  });

  it('shows the reported API version', () => {
    expect(
      healthLabel({
        status: 'ok',
        service: 'moura-solar-api',
        version: '0.1.0',
        timestamp: '2026-09-28T00:00:00.000Z',
      }),
    ).toBe('API operacional · 0.1.0');
  });
});
