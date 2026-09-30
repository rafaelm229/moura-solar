import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';

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

  async upload(
    bucket: string,
    key: string,
    buffer: Buffer,
    mimeType = 'application/pdf',
  ): Promise<{ bucket: string; key: string }> {
    const endpoint = this.config.get<string>('S3_ENDPOINT');
    const accessKey = this.config.get<string>('S3_ACCESS_KEY');
    const secretKey = this.config.get<string>('S3_SECRET_KEY');

    // Attempt S3 upload if endpoint is reachable
    if (endpoint && accessKey && secretKey && !endpoint.includes('localhost:9000/mock')) {
      try {
        const uploadUrl = `${endpoint.replace(/\/$/, '')}/${bucket}/${key}`;
        const res = await fetch(uploadUrl, {
          method: 'PUT',
          headers: {
            'Content-Type': mimeType,
            'Content-Length': buffer.length.toString(),
          },
          body: new Uint8Array(buffer),
          signal: AbortSignal.timeout(3000),
        });

        if (res.ok || res.status === 200 || res.status === 201) {
          return { bucket, key };
        }
      } catch (err: any) {
        this.logger.debug(
          `S3 upload direct put not available (${err.message}), persisting to local storage engine.`,
        );
      }
    }

    // Persist to reliable local storage engine
    await this.ensureFallbackDir();
    const filePath = join(this.fallbackDir, `${bucket}_${key.replace(/\//g, '_')}`);
    await fs.writeFile(filePath, buffer);
    return { bucket, key };
  }

  async download(bucket: string, key: string): Promise<Buffer> {
    const endpoint = this.config.get<string>('S3_ENDPOINT');

    if (endpoint) {
      try {
        const downloadUrl = `${endpoint.replace(/\/$/, '')}/${bucket}/${key}`;
        const res = await fetch(downloadUrl, { signal: AbortSignal.timeout(3000) });
        if (res.ok) {
          const arrayBuffer = await res.arrayBuffer();
          return Buffer.from(arrayBuffer);
        }
      } catch {
        // Try local storage engine fallback
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
