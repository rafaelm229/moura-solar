import { describe, expect, it } from 'vitest';
import {
  ContentValidatorService,
  decodeDocumentBase64,
} from '../src/dossier/content-validator.service';
import { ScannerService } from '../src/dossier/scanner.service';

describe('Document validation', () => {
  const validator = new ContentValidatorService();
  it('decodes the full 20 MiB limit without overflowing the regexp stack', () => {
    const bytes = Buffer.alloc(20 * 1024 * 1024, 0x41);
    expect(decodeDocumentBase64(bytes.toString('base64')).equals(bytes)).toBe(true);
    expect(() => decodeDocumentBase64(Buffer.alloc(bytes.length + 1).toString('base64'))).toThrow(
      '20 MiB',
    );
  });
  it('rejects malformed and noncanonical base64 padding', () => {
    for (const encoded of ['A===', 'AAA', 'AA=A', 'AB==', 'AA==\n'])
      expect(() => decodeDocumentBase64(encoded)).toThrow('base64 inválido');
  });
  it('rejects a truncated PNG despite its valid magic signature', async () => {
    await expect(
      validator.validate(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        'image/png',
      ),
    ).rejects.toThrow('incompleta');
  });
  it('rejects a JPEG with a header but no image frame and scan', async () => {
    await expect(
      validator.validate(
        Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 4, 0, 0, 0xff, 0xd9]),
        'image/jpeg',
      ),
    ).rejects.toThrow('corrompida');
  });
  it('fails closed without a configured scanner', async () => {
    const scanner = new ScannerService({ get: () => undefined } as any);
    await expect(scanner.scan(Buffer.from('content'))).rejects.toThrow('SCANNER_UNAVAILABLE');
  });
  it('rejects a PDF header which contains no parsable document', async () => {
    await expect(
      validator.validate(Buffer.from('%PDF-1.4\n%%EOF'), 'application/pdf'),
    ).rejects.toThrow('PDF inválido');
  });
});
