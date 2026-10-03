import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'node:fs';
import { basename, join } from 'node:path';
import { createHash, createHmac } from 'node:crypto';

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly fallbackDir = join(process.cwd(), '.storage', 'proposals');

  constructor(private readonly config: ConfigService) {
    this.ensureFallbackDir();
  }

  private async ensureFallbackDir() {
    try {
      await fs.mkdir(this.fallbackDir, { recursive: true });
    } catch {
      // Ignored
    }
  }

  private signRequest(params: {
    method: string;
    url: string;
    body?: Buffer | Uint8Array;
    headers?: Record<string, string>;
    accessKey: string;
    secretKey: string;
    region?: string;
  }): Record<string, string> {
    const { method, url, body, headers = {}, accessKey, secretKey, region = 'us-east-1' } = params;
    const parsedUrl = new URL(url);
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.substring(0, 8);

    const payloadHash = body
      ? createHash('sha256').update(body).digest('hex')
      : 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855';

    const reqHeaders: Record<string, string> = {
      ...headers,
      host: parsedUrl.host,
      'x-amz-content-sha256': payloadHash,
      'x-amz-date': amzDate,
    };

    const sortedHeaderKeys = Object.keys(reqHeaders)
      .map((k) => k.toLowerCase())
      .sort();
    const canonicalHeaders = sortedHeaderKeys
      .map((k) => `${k}:${(reqHeaders[k] ?? '').trim()}\n`)
      .join('');
    const signedHeaders = sortedHeaderKeys.join(';');

    const canonicalUri = parsedUrl.pathname;
    const canonicalQuery = parsedUrl.search
      ? parsedUrl.search.slice(1).split('&').sort().join('&')
      : '';

    const canonicalRequest = [
      method.toUpperCase(),
      canonicalUri,
      canonicalQuery,
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n');

    const credentialScope = `${dateStamp}/${region}/s3/aws4_request`;
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      createHash('sha256').update(canonicalRequest).digest('hex'),
    ].join('\n');

    const kDate = createHmac('sha256', `AWS4${secretKey}`).update(dateStamp).digest();
    const kRegion = createHmac('sha256', kDate).update(region).digest();
    const kService = createHmac('sha256', kRegion).update('s3').digest();
    const signingKey = createHmac('sha256', kService).update('aws4_request').digest();
    const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex');

    const authHeader = `AWS4-HMAC-SHA256 Credential=${accessKey}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

    return {
      ...reqHeaders,
      authorization: authHeader,
    };
  }

  computeHash(buffer: Buffer): string {
    return createHash('sha256').update(buffer).digest('hex');
  }

  sanitizeFileName(fileName: string): string {
    const base = basename(fileName.replace(/\\/g, '/'));
    return base
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_+/g, '_');
  }

  validateMagicBytes(buffer: Buffer, mimeType: string): boolean {
    if (!buffer || buffer.length < 4) return false;
    const lower = mimeType.toLowerCase();
    if (lower === 'application/pdf') {
      return buffer.subarray(0, 5).toString('ascii') === '%PDF-';
    }
    if (lower === 'image/jpeg' || lower === 'image/jpg') {
      return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
    }
    if (lower === 'image/png') {
      return (
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47 &&
        buffer[4] === 0x0d &&
        buffer[5] === 0x0a &&
        buffer[6] === 0x1a &&
        buffer[7] === 0x0a
      );
    }
    if (lower === 'image/webp') {
      return (
        buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
        buffer.subarray(8, 12).toString('ascii') === 'WEBP'
      );
    }
    // For docx/zip archives
    if (lower === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      return buffer[0] === 0x50 && buffer[1] === 0x4b;
    }
    return true;
  }

  async upload(
    bucket: string,
    key: string,
    buffer: Buffer,
    mimeType = 'application/pdf',
  ): Promise<{
    bucket: string;
    key: string;
    sha256: string;
    byteSize: number;
    backend: 'MINIO' | 'S3' | 'LEGACY_LOCAL';
  }> {
    const sha256 = this.computeHash(buffer);
    const byteSize = buffer.length;
    const endpoint = this.config.get<string>('S3_ENDPOINT');
    const accessKey = this.config.get<string>('S3_ACCESS_KEY');
    const secretKey = this.config.get<string>('S3_SECRET_KEY');

    // Attempt S3 upload if credentials and endpoint are configured
    if (endpoint && accessKey && secretKey && !endpoint.includes('localhost:9000/mock')) {
      try {
        const uploadUrl = `${endpoint.replace(/\/$/, '')}/${bucket}/${key}`;
        const headers = this.signRequest({
          method: 'PUT',
          url: uploadUrl,
          body: buffer,
          headers: {
            'content-type': mimeType,
            'content-length': buffer.length.toString(),
          },
          accessKey,
          secretKey,
        });

        const res = await fetch(uploadUrl, {
          method: 'PUT',
          headers,
          body: new Uint8Array(buffer),
          signal: AbortSignal.timeout(5000),
        });

        // If bucket doesn't exist yet, attempt to create it and retry upload once
        if (res.status === 404) {
          const createBucketUrl = `${endpoint.replace(/\/$/, '')}/${bucket}`;
          const createBucketHeaders = this.signRequest({
            method: 'PUT',
            url: createBucketUrl,
            accessKey,
            secretKey,
          });
          const createRes = await fetch(createBucketUrl, {
            method: 'PUT',
            headers: createBucketHeaders,
            signal: AbortSignal.timeout(3000),
          });
          if (createRes.ok || createRes.status === 200) {
            const retryHeaders = this.signRequest({
              method: 'PUT',
              url: uploadUrl,
              body: buffer,
              headers: {
                'content-type': mimeType,
                'content-length': buffer.length.toString(),
              },
              accessKey,
              secretKey,
            });
            const retryRes = await fetch(uploadUrl, {
              method: 'PUT',
              headers: retryHeaders,
              body: new Uint8Array(buffer),
              signal: AbortSignal.timeout(5000),
            });
            if (retryRes.ok || retryRes.status === 200 || retryRes.status === 201) {
              const backend = endpoint.includes('minio') ? 'MINIO' : 'S3';
              return { bucket, key, sha256, byteSize, backend };
            }
          }
        }

        if (res.ok || res.status === 200 || res.status === 201) {
          const backend = endpoint.includes('minio') ? 'MINIO' : 'S3';
          return { bucket, key, sha256, byteSize, backend };
        }

        this.logger.warn(`S3 upload returned HTTP ${res.status}: ${res.statusText}`);
      } catch (err: any) {
        this.logger.warn(
          `S3 upload not available (${err.message}), persisting to local storage engine.`,
        );
      }
    }

    // Persist to reliable local storage engine fallback
    await this.ensureFallbackDir();
    const filePath = join(this.fallbackDir, `${bucket}_${key.replace(/\//g, '_')}`);
    await fs.writeFile(filePath, buffer);
    return { bucket, key, sha256, byteSize, backend: 'LEGACY_LOCAL' };
  }

  async download(bucket: string, key: string): Promise<Buffer> {
    const endpoint = this.config.get<string>('S3_ENDPOINT');
    const accessKey = this.config.get<string>('S3_ACCESS_KEY');
    const secretKey = this.config.get<string>('S3_SECRET_KEY');

    if (endpoint && accessKey && secretKey && !endpoint.includes('localhost:9000/mock')) {
      try {
        const downloadUrl = `${endpoint.replace(/\/$/, '')}/${bucket}/${key}`;
        const headers = this.signRequest({
          method: 'GET',
          url: downloadUrl,
          accessKey,
          secretKey,
        });

        const res = await fetch(downloadUrl, {
          method: 'GET',
          headers,
          signal: AbortSignal.timeout(5000),
        });

        if (res.ok) {
          const arrayBuffer = await res.arrayBuffer();
          return Buffer.from(arrayBuffer);
        }
      } catch (err: any) {
        this.logger.debug(`S3 download failed (${err.message}), falling back to disk.`);
      }
    }

    const filePath = join(this.fallbackDir, `${bucket}_${key.replace(/\//g, '_')}`);
    try {
      return await fs.readFile(filePath);
    } catch {
      throw new Error(`Arquivo não encontrado no armazenamento: ${bucket}/${key}`);
    }
  }
}
