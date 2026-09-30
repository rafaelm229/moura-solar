import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  devIndicators: false,
  async rewrites() {
    return [
      {
        source: '/api/v1/:path*',
        destination: `${process.env.API_INTERNAL_URL ?? 'http://localhost:3001/api/v1'}/:path*`,
      },
    ];
  },
  transpilePackages: [
    '@moura-solar/api-client',
    '@moura-solar/contracts',
    '@moura-solar/design-tokens',
  ],
};

export default nextConfig;
