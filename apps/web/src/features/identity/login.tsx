'use client';
import { useForm } from 'react-hook-form';
import { useMutation } from '@tanstack/react-query';
import { api, result, type Context } from './client';
import { Feedback } from './feedback';
import { Button } from '../../ui/Button';

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
        <div className="auth-brand">
          <div className="auth-logo-badge" aria-hidden="true">
            MS
          </div>
          <p className="auth-eyebrow eyebrow">MOURA SOLAR</p>
          <h1>Entre na plataforma</h1>
          <p className="auth-subtitle">Acompanhe sua operação de qualquer aparelho.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit((body) => mutation.mutate(body))}>
          <div className="auth-field">
            <label htmlFor="login-email" className="auth-field__label">
              E-mail
            </label>
            <input
              id="login-email"
              className="ui-input"
              type="email"
              autoComplete="username"
              {...register('email', { required: true })}
            />
          </div>

          <div className="auth-field">
            <label htmlFor="login-password" className="auth-field__label">
              Senha
            </label>
            <input
              id="login-password"
              className="ui-input"
              type="password"
              autoComplete="current-password"
              {...register('password', { required: true, minLength: 12 })}
            />
          </div>

          {Object.keys(errors).length > 0 && (
            <p role="alert" className="auth-alert-error">
              Preencha o e-mail e a senha de pelo menos 12 caracteres.
            </p>
          )}

          <Feedback error={mutation.error} />

          <Button type="submit" variant="primary" fullWidth disabled={mutation.isPending}>
            {mutation.isPending ? 'Entrando…' : 'Entrar'}
          </Button>
        </form>

        <p className="auth-help help">
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
        <div className="auth-brand">
          <div className="auth-logo-badge" aria-hidden="true">
            MS
          </div>
          <p className="auth-eyebrow eyebrow">MOURA SOLAR</p>
          <h1>Defina sua senha</h1>
          <p className="auth-subtitle">
            Use pelo menos 12 caracteres. Este link só pode ser usado uma vez.
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit((body) => mutation.mutate(body))}>
          <div className="auth-field">
            <label htmlFor="accept-password" className="auth-field__label">
              Nova senha
            </label>
            <input
              id="accept-password"
              className="ui-input"
              required
              minLength={12}
              maxLength={128}
              type="password"
              autoComplete="new-password"
              {...register('password')}
            />
          </div>

          <Feedback error={mutation.error} />

          <Button type="submit" variant="primary" fullWidth disabled={mutation.isPending}>
            {mutation.isPending ? 'Salvando…' : 'Salvar senha'}
          </Button>
        </form>
      </section>
    </main>
  );
}
