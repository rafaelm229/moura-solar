import assert from 'node:assert';
import test from 'node:test';
import {
  checkWcagAA,
  colors,
  controls,
  getContrastRatio,
  motion,
  radii,
  shadows,
  spacing,
  typography,
} from '../dist/index.js';

test('design tokens structure and values align with SPEC-003 v0.2', () => {
  assert.strictEqual(colors.background.base, '#090B0A');
  assert.strictEqual(colors.surface.default, '#111412');
  assert.strictEqual(colors.surface.card, '#161A17');
  assert.strictEqual(colors.surface.elevated, '#1C211D');
  assert.strictEqual(colors.border.default, '#29302B');
  assert.strictEqual(colors.border.subtle, '#1E2420');
  assert.strictEqual(colors.brand.solar, '#FFD400');
  assert.strictEqual(colors.brand.green, '#26D866');
  assert.strictEqual(colors.brand.institutional, '#087443');
  assert.strictEqual(colors.text.primary, '#F5F7F5');
  assert.strictEqual(colors.text.secondary, '#9BA49E');
  assert.strictEqual(colors.text.disabled, '#626A65');
  assert.strictEqual(colors.text.onSolar, '#090B0A');

  assert.strictEqual(radii.sm, '6px');
  assert.strictEqual(radii.md, '8px');
  assert.strictEqual(radii.lg, '10px');
  assert.strictEqual(radii.xl, '16px');
  assert.strictEqual(radii.sheet, '20px');

  assert.strictEqual(controls.compact, '36px');
  assert.strictEqual(controls.default, '44px');
  assert.strictEqual(controls.field, '48px');

  assert.ok(typography.family.sans.includes('Inter'));
  assert.ok(typography.family.mono.includes('JetBrains Mono'));
  assert.ok(spacing[1] === '4px');
  assert.ok(shadows.glowSolar.includes('255, 212, 0'));
  assert.ok(motion.feedback.includes('150ms'));
});

test('contrast compliance meets WCAG 2.2 Level AA requirements', () => {
  // 1. Primary text on base background (> 17:1)
  const primaryOnBase = getContrastRatio(colors.text.primary, colors.background.base);
  assert.ok(
    primaryOnBase >= 15,
    `Primary text on base background ratio ${primaryOnBase.toFixed(2)} should be >= 15:1`,
  );
  assert.strictEqual(checkWcagAA(colors.text.primary, colors.background.base), true);

  // 2. Primary text on card surface (> 14:1)
  const primaryOnCard = getContrastRatio(colors.text.primary, colors.surface.card);
  assert.ok(
    primaryOnCard >= 14,
    `Primary text on card surface ratio ${primaryOnCard.toFixed(2)} should be >= 14:1`,
  );
  assert.strictEqual(checkWcagAA(colors.text.primary, colors.surface.card), true);

  // 3. Secondary text (labels, auxiliary, th) on base background (>= 4.5:1, actually ~7.7:1)
  const secondaryOnBase = getContrastRatio(colors.text.secondary, colors.background.base);
  assert.ok(
    secondaryOnBase >= 7.0,
    `Secondary text on base background ratio ${secondaryOnBase.toFixed(2)} should be >= 7:1`,
  );
  assert.strictEqual(checkWcagAA(colors.text.secondary, colors.background.base), true);

  // 4. Secondary text on card surface (>= 4.5:1, actually ~6.5:1)
  const secondaryOnCard = getContrastRatio(colors.text.secondary, colors.surface.card);
  assert.ok(
    secondaryOnCard >= 6.0,
    `Secondary text on card surface ratio ${secondaryOnCard.toFixed(2)} should be >= 6:1`,
  );
  assert.strictEqual(checkWcagAA(colors.text.secondary, colors.surface.card), true);

  // 5. OnSolar text on brand solar (> 13:1)
  const onSolarRatio = getContrastRatio(colors.text.onSolar, colors.brand.solar);
  assert.ok(
    onSolarRatio >= 13,
    `OnSolar text on brand solar ratio ${onSolarRatio.toFixed(2)} should be >= 13:1`,
  );
  assert.strictEqual(checkWcagAA(colors.text.onSolar, colors.brand.solar), true);

  // 6. Disabled text is strictly below 4.5:1 on base, validating SPEC-003 rule
  const disabledOnBase = getContrastRatio(colors.text.disabled, colors.background.base);
  assert.ok(
    disabledOnBase < 4.5,
    `Disabled text ratio ${disabledOnBase.toFixed(2)} is < 4.5:1, confirming it must NEVER be used for readable auxiliary text`,
  );
});
