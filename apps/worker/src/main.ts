// O worker receberá consumidores somente quando o primeiro fluxo assíncrono for implementado.
// Mantê-lo inativo agora evita introduzir Redis antes de existir uma necessidade real.
console.log(
  JSON.stringify({
    level: 'info',
    service: 'moura-solar-worker',
    message: 'Worker foundation is ready; no consumers are enabled.',
    timestamp: new Date().toISOString(),
  }),
);
