import { describe, expect, it } from 'vitest';
import { StorageService } from '../src/proposal/storage.service';

describe('SPEC-013 Storage Engine & Magic Bytes Validation (Lote 4)', () => {
  const storage = new StorageService({
    get: (key: string) => {
      if (key === 'S3_ENDPOINT') return 'http://localhost:9000';
      if (key === 'S3_BUCKET') return 'test-bucket';
      return 'test';
    },
  } as any);

  it('validates authentic PDF buffer starting with %PDF-', () => {
    const validPdf = Buffer.from('%PDF-1.4 sample pdf content for testing');
    expect(storage.validateMagicBytes(validPdf, 'application/pdf')).toBe(true);
  });

  it('rejects fake PDF that starts with text or malicious payload', () => {
    const fakePdf = Buffer.from('<html><script>alert(1)</script></html>');
    expect(storage.validateMagicBytes(fakePdf, 'application/pdf')).toBe(false);

    const binaryGarbage = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04]);
    expect(storage.validateMagicBytes(binaryGarbage, 'application/pdf')).toBe(false);
  });

  it('validates PNG header signature (89 50 4E 47 0D 0A 1A 0A)', () => {
    const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
    expect(storage.validateMagicBytes(pngHeader, 'image/png')).toBe(true);

    const corruptedPng = Buffer.from([0x89, 0x50, 0x00, 0x00]);
    expect(storage.validateMagicBytes(corruptedPng, 'image/png')).toBe(false);
  });

  it('validates JPEG header signature (FF D8 FF)', () => {
    const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    expect(storage.validateMagicBytes(jpegHeader, 'image/jpeg')).toBe(true);

    const fakeJpeg = Buffer.from([0xff, 0x00, 0x00]);
    expect(storage.validateMagicBytes(fakeJpeg, 'image/jpeg')).toBe(false);
  });

  it('validates WEBP header signature (RIFF....WEBP)', () => {
    const webpHeader = Buffer.concat([
      Buffer.from('RIFF'),
      Buffer.from([0x20, 0x00, 0x00, 0x00]),
      Buffer.from('WEBP'),
      Buffer.from('VP8 '),
    ]);
    expect(storage.validateMagicBytes(webpHeader, 'image/webp')).toBe(true);

    const invalidRiff = Buffer.from('RIFF1234NOTWEBP');
    expect(storage.validateMagicBytes(invalidRiff, 'image/webp')).toBe(false);
  });

  it('sanitizes malicious file names, directory traversal, and odd chars', () => {
    expect(storage.sanitizeFileName('../../../etc/passwd')).toBe('passwd');
    expect(storage.sanitizeFileName('conta/../../secreta.pdf')).toBe('secreta.pdf');
    expect(storage.sanitizeFileName('Relatório Final & Proposta (Versão 1).pdf')).toBe(
      'Relatorio_Final_Proposta_Versao_1_.pdf',
    );
    expect(storage.sanitizeFileName('arquivo COM ESPAÇOS e !@#$.png')).toBe(
      'arquivo_COM_ESPACOS_e_.png',
    );
  });

  it('computes deterministic SHA-256 hash', () => {
    const content = Buffer.from('Moura Solar Dossiê Test Content');
    const hash1 = storage.computeHash(content);
    const hash2 = storage.computeHash(content);
    expect(hash1).toHaveLength(64);
    expect(hash1).toBe(hash2);
  });
});
