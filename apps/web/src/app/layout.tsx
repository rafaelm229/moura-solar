import '@moura-solar/design-tokens/tokens.css';
import '../ui/primitives.css';
import '../features/identity/identity.css';
import '../features/commercial/commercial.css';
import '../features/design/design.css';
import '../features/proposal/proposal.css';
import '../features/contract/contract.css';
import '../features/financial/financial.css';
import './styles.css';

import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';

export const metadata: Metadata = {
  title: 'Moura Solar Platform',
  description: 'Operação integrada da Moura Solar',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#090B0A',
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="pt-BR" data-theme="dark">
      <body>{children}</body>
    </html>
  );
}
