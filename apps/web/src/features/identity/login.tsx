'use client';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { api, result, type Context } from './client';
import { Feedback } from './feedback';
export function Login({ onLogin }: { onLogin: (context: Context) => void }) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<{ email: string; password: string }>();
  const mutation = useMutation({
    mutationFn: (body: { email: string; password: string }) =>
      result(api.POST('/api/v1/identity/login', { body })),
    onSuccess: onLogin,
  });
  return (
    <main className="auth-layout">
      <section className="auth-card">
        <p className="eyebrow">MOURA SOLAR</p>
        <h1>Entre na plataforma</h1>
        <p>Acompanhe sua operação de qualquer aparelho.</p>
        <form onSubmit={handleSubmit((body) => mutation.mutate(body))}>
          <label>
            E-mail
            <input
              type="email"
              autoComplete="username"
              {...register('email', { required: true })}
            />
          </label>
          <label>
            Senha
            <input
              type="password"
              autoComplete="current-password"
              {...register('password', { required: true, minLength: 12 })}
            />
          </label>
          {Object.keys(errors).length > 0 && (
            <p role="alert">Preencha o e-mail e a senha de pelo menos 12 caracteres.</p>
          )}
          <Feedback error={mutation.error} />
          <button disabled={mutation.isPending}>
            {mutation.isPending ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
        <p className="help">
          Esqueceu sua senha? Solicite um link de recuperação ao administrador da Moura Solar.
        </p>
      </section>
    </main>
  );
}
export function AcceptAccess({ token, onDone }: { token: string; onDone: () => void }) {
  const { register, handleSubmit } = useForm<{ password: string }>();
  const mutation = useMutation({
    mutationFn: (body: { password: string }) =>
      result(api.POST('/api/v1/identity/accept-link', { body: { ...body, token } })),
    onSuccess: () => {
      history.replaceState(null, '', '/');
      onDone();
    },
  });
  return (
    <main className="auth-layout">
      <section className="auth-card">
        <p className="eyebrow">MOURA SOLAR</p>
        <h1>Defina sua senha</h1>
        <p>Use pelo menos 12 caracteres. Este link só pode ser usado uma vez.</p>
        <form onSubmit={handleSubmit((body) => mutation.mutate(body))}>
          <label>
            Nova senha
            <input
              required
              minLength={12}
              maxLength={128}
              type="password"
              autoComplete="new-password"
              {...register('password')}
            />
          </label>
          <Feedback error={mutation.error} />
          <button disabled={mutation.isPending}>
            {mutation.isPending ? 'Salvando…' : 'Salvar senha'}
          </button>
        </form>
      </section>
    </main>
  );
}
