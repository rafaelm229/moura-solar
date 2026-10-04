import { fieldNames, type Candidate, type CorpusDocument } from './types.js';

const fields = new Set<string>(fieldNames);
const keyPattern = /^[a-zA-Z0-9][a-zA-Z0-9._:-]{0,159}$/;
const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;
const allowedKeys = new Set(['key', 'field', 'value', 'unit', 'page', 'providerConfidence']);

function invariant(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function boundedText(value: unknown, maximum: number): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= maximum;
}

/**
 * Runtime boundary for provider-normalized data. Values remain opaque text: no
 * candidate can invoke commands, fetch URLs, choose fields or create defaults.
 */
export function validateNormalizedCandidates(
  document: Pick<CorpusDocument, 'pageCount'>,
  value: unknown,
): Candidate[] {
  invariant(Array.isArray(value), 'Normalized candidates must be an array');
  invariant(value.length <= 500, 'Normalized candidate limit exceeded');
  const keys = new Set<string>();
  return value.map((entry, index) => {
    invariant(
      entry !== null && typeof entry === 'object' && !Array.isArray(entry),
      `Normalized candidate ${index} must be an object`,
    );
    const input = entry as Record<string, unknown>;
    invariant(
      Object.keys(input).every((key) => allowedKeys.has(key)),
      `Normalized candidate ${index} contains an unknown property`,
    );
    invariant(
      keyPattern.test(String(input.key ?? '')),
      `Normalized candidate ${index} key is invalid`,
    );
    const key = input.key as string;
    invariant(!keys.has(key), `Duplicate normalized candidate key: ${key}`);
    invariant(
      typeof input.field === 'string' && fields.has(input.field),
      `Normalized candidate ${key} field is invalid`,
    );
    invariant(boundedText(input.value, 4_096), `Normalized candidate ${key} value is invalid`);
    invariant(
      Number.isInteger(input.page) &&
        Number(input.page) > 0 &&
        Number(input.page) <= document.pageCount,
      `Normalized candidate ${key} page is invalid`,
    );
    if (input.field.endsWith('referenceMonth'))
      invariant(monthPattern.test(input.value), `Normalized candidate ${key} month is invalid`);
    if (input.unit !== undefined)
      invariant(boundedText(input.unit, 32), `Normalized candidate ${key} unit is invalid`);

    let providerConfidence: Candidate['providerConfidence'];
    if (input.providerConfidence !== undefined) {
      invariant(
        input.providerConfidence !== null &&
          typeof input.providerConfidence === 'object' &&
          !Array.isArray(input.providerConfidence),
        `Normalized candidate ${key} confidence is invalid`,
      );
      const confidence = input.providerConfidence as Record<string, unknown>;
      invariant(
        Object.keys(confidence).every((property) => property === 'value' || property === 'scale'),
        `Normalized candidate ${key} confidence contains an unknown property`,
      );
      invariant(
        typeof confidence.value === 'number' && Number.isFinite(confidence.value),
        `Normalized candidate ${key} confidence value is invalid`,
      );
      invariant(
        boundedText(confidence.scale, 64),
        `Normalized candidate ${key} confidence scale is invalid`,
      );
      providerConfidence = { value: confidence.value, scale: confidence.scale };
    }
    keys.add(key);
    return {
      key,
      field: input.field as Candidate['field'],
      value: input.value,
      page: input.page as number,
      ...(input.unit !== undefined ? { unit: input.unit as string } : {}),
      ...(providerConfidence ? { providerConfidence } : {}),
    };
  });
}
