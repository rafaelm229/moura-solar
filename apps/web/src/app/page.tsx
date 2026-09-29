import type { HealthResponse } from '@moura-solar/contracts';

import { healthLabel } from '@/lib/health';

async function getHealth(): Promise<HealthResponse | null> {
  const apiUrl = process.env.API_INTERNAL_URL ?? 'http://localhost:3001/api/v1';

  try {
    const response = await fetch(`${apiUrl}/health/live`, { cache: 'no-store' });
    if (!response.ok) return null;
    return (await response.json()) as HealthResponse;
  } catch {
    return null;
  }
}

const foundations = [
  ['API', 'NestJS com contrato versionado'],
  ['Dados', 'PostgreSQL e Prisma'],
  ['Web', 'Next.js responsivo'],
  ['Qualidade', 'Testes e CI desde o início'],
];

export default async function HomePage() {
  const health = await getHealth();

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brandMark" aria-hidden="true">
          ☀
        </div>
        <div>
          <strong>Moura Solar</strong>
          <span>Plataforma operacional</span>
        </div>
      </header>

      <section className="hero">
        <p className="eyebrow">FUNDAÇÃO M0</p>
        <h1>Uma base única para toda a operação solar.</h1>
        <p className="summary">
          O novo sistema começa pela consistência: API central, banco compartilhado, regras
          auditáveis e experiência completa em qualquer tela.
        </p>

        <div className={`status ${health ? 'statusOnline' : 'statusOffline'}`} role="status">
          <span aria-hidden="true" />
          {healthLabel(health)}
        </div>
      </section>

      <section className="foundationGrid" aria-label="Fundação técnica">
        {foundations.map(([title, description]) => (
          <article className="foundationCard" key={title}>
            <p>{title}</p>
            <strong>{description}</strong>
          </article>
        ))}
      </section>

      <section className="nextStep">
        <div>
          <p className="eyebrow">PRÓXIMA ENTREGA</p>
          <h2>Identidade, equipe e permissões</h2>
          <p>Login seguro, sessões por aparelho e acesso definido pela API.</p>
        </div>
        <span className="milestone">M1</span>
      </section>
    </main>
  );
}
