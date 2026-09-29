import { loginAction } from '../actions';

export const metadata = { title: 'Sign in' };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="login">
      <h1>Back-office sign in</h1>
      {error ? (
        <p role="alert" className="alert">
          {error === 'auth.invalidCredentials' ? 'Email or password is incorrect.' : error === 'auth.rateLimited' ? 'Too many attempts — wait a minute.' : 'Sign-in failed.'}
        </p>
      ) : null}
      <form action={loginAction} className="stack">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="username" required />
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required />
        <button type="submit" className="primary">
          Sign in
        </button>
      </form>
    </main>
  );
}
