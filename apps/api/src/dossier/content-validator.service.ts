import { Injectable } from '@nestjs/common';
import { spawn } from 'node:child_process';
import { fail } from '../identity/security';

export function decodeDocumentBase64(base64: string): Buffer {
  const maxSize = 20 * 1024 * 1024;
  if (base64.length > Math.ceil(maxSize / 3) * 4)
    fail('FILE_SIZE_INVALID', 'O arquivo deve ter entre 1 byte e 20 MiB.', 413);
  // A repeated four-character group overflows V8's regexp stack near the upload limit.
  if (base64.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(base64))
    fail('INVALID_FILE', 'Arquivo base64 inválido.', 422);
  const buffer = Buffer.from(base64, 'base64');
  if (!buffer.length || buffer.length > maxSize)
    fail('FILE_SIZE_INVALID', 'O arquivo deve ter entre 1 byte e 20 MiB.', 413);
  if (buffer.toString('base64') !== base64) fail('INVALID_FILE', 'Arquivo base64 inválido.', 422);
  return buffer;
}

@Injectable()
export class ContentValidatorService {
  async validate(buffer: Buffer, mime: string) {
    if (mime === 'application/pdf') {
      const info = await new Promise<string>((resolve, reject) => {
        const child = spawn('pdfinfo', ['-'], { stdio: ['pipe', 'pipe', 'ignore'] });
        let output = '';
        const timer = setTimeout(() => child.kill('SIGKILL'), 5000);
        child.on('error', reject);
        child.stdin.on('error', () => {});
        child.stdout.on('data', (chunk) => {
          output += chunk.toString();
          if (output.length > 64 * 1024) child.kill('SIGKILL');
        });
        child.on('close', (code) => {
          clearTimeout(timer);
          if (code === 0) resolve(output);
          else reject(new Error('PDF_INVALID'));
        });
        child.stdin.end(buffer);
      }).catch(() => fail('PDF_INVALID', 'PDF inválido ou verificação indisponível.', 422));
      const pages = Number(info.match(/^Pages:\s+(\d+)/m)?.[1]);
      if (
        !pages ||
        pages > 50 ||
        /^Encrypted:\s+yes/m.test(info) ||
        /^JavaScript:\s+yes/m.test(info)
      )
        fail('PDF_UNSAFE', 'PDF protegido, ativo ou com mais de 50 páginas não é permitido.', 422);
    } else if (mime === 'image/png') {
      let offset = 8;
      let header = false;
      let data = false;
      let end = false;
      while (offset + 12 <= buffer.length) {
        const size = buffer.readUInt32BE(offset);
        if (offset + size + 12 > buffer.length) break;
        const chunk = buffer.subarray(offset + 4, offset + size + 8);
        let crc = 0xffffffff;
        for (const byte of chunk) {
          crc ^= byte;
          for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
        }
        if ((crc ^ 0xffffffff) >>> 0 !== buffer.readUInt32BE(offset + size + 8))
          fail('IMAGE_INVALID', 'Imagem PNG corrompida.', 422);
        const type = chunk.subarray(0, 4).toString('ascii');
        if (!header && type !== 'IHDR') fail('IMAGE_INVALID', 'Imagem PNG sem cabeçalho.', 422);
        if (type === 'IHDR') {
          if (
            size !== 13 ||
            !chunk.readUInt32BE(4) ||
            !chunk.readUInt32BE(8) ||
            chunk.readUInt32BE(4) * chunk.readUInt32BE(8) > 40_000_000
          )
            fail('IMAGE_INVALID', 'Dimensões da imagem inválidas.', 422);
          header = true;
        }
        if (type === 'IDAT') data = true;
        offset += size + 12;
        if (type === 'IEND') {
          end = size === 0;
          break;
        }
      }
      if (!header || !data || !end || offset !== buffer.length)
        fail('IMAGE_INVALID', 'Imagem PNG incompleta.', 422);
    } else if (mime === 'image/jpeg') {
      if (buffer.length < 10 || buffer.readUInt16BE(buffer.length - 2) !== 0xffd9)
        fail('IMAGE_INVALID', 'Imagem JPEG incompleta.', 422);
      let offset = 2;
      let frame = false;
      let scan = false;
      while (offset + 4 <= buffer.length) {
        if (buffer[offset] !== 0xff) break;
        const marker = buffer[offset + 1]!;
        const size = buffer.readUInt16BE(offset + 2);
        if (size < 2 || offset + size + 2 > buffer.length) break;
        if ([0xc0, 0xc1, 0xc2].includes(marker)) {
          if (size < 8) break;
          const height = buffer.readUInt16BE(offset + 5);
          const width = buffer.readUInt16BE(offset + 7);
          if (!width || !height || width * height > 40_000_000) break;
          frame = true;
        }
        if (marker === 0xda) {
          scan = true;
          break;
        }
        offset += size + 2;
      }
      if (!frame || !scan) fail('IMAGE_INVALID', 'Imagem JPEG corrompida.', 422);
    }
  }
}
