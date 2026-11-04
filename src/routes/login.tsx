import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/login')({
  component: LoginPage,
});

function LoginPage() {
  return (
    <main className="p-6">
      <h1 className="font-serif text-2xl font-semibold text-ink">Login</h1>
    </main>
  );
}
