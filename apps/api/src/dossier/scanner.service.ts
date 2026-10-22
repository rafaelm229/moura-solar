import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createConnection } from 'node:net';

@Injectable()
export class ScannerService {
  constructor(private readonly config: ConfigService) {}

  async scan(buffer: Buffer): Promise<{ result: 'CLEAN' | 'INFECTED'; version: string }> {
    const host = this.config.get<string>('CLAMD_HOST');
    if (!host) throw new Error('SCANNER_UNAVAILABLE');
    const port = Number(this.config.get<string>('CLAMD_PORT') ?? '3310');
    const version = await this.command(host, port, 'zVERSION\0');
    if (!version.startsWith('ClamAV ')) throw new Error('SCANNER_UNAVAILABLE');
    const reply = await this.command(host, port, 'zINSTREAM\0', buffer);
    if (reply.trim() === 'stream: OK') return { result: 'CLEAN', version: version.trim() };
    if (reply.endsWith(' FOUND')) return { result: 'INFECTED', version: version.trim() };
    throw new Error('SCANNER_UNAVAILABLE');
  }

  private command(host: string, port: number, command: string, buffer?: Buffer): Promise<string> {
    return new Promise((resolve, reject) => {
      const socket = createConnection({ host, port });
      let reply = '';
      const timer = setTimeout(() => socket.destroy(new Error('SCANNER_TIMEOUT')), 15_000);
      socket.on('error', reject);
      socket.on('close', () => clearTimeout(timer));
      socket.on('data', (chunk) => {
        reply += chunk.toString();
        if (reply.includes('\0') || reply.includes('\n')) {
          socket.destroy();
          resolve(reply.replace(/[\0\n]+$/g, ''));
        }
      });
      socket.on('end', () => {
        if (!reply) reject(new Error('SCANNER_UNAVAILABLE'));
        else resolve(reply.replace(/[\0\n]+$/g, ''));
      });
      socket.on('connect', () => {
        socket.write(command);
        if (buffer) {
          for (let offset = 0; offset < buffer.length; offset += 64 * 1024) {
            const chunk = buffer.subarray(offset, offset + 64 * 1024);
            const size = Buffer.alloc(4);
            size.writeUInt32BE(chunk.length);
            socket.write(size);
            socket.write(chunk);
          }
          socket.write(Buffer.alloc(4));
        }
      });
    });
  }
}
