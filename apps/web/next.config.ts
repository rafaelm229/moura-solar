import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'standalone',
  transpilePackages: ['@moura-solar/contracts', '@moura-solar/design-tokens'],
};

export default nextConfig;
