import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/')({
  component: IndexPage,
});

function IndexPage() {
  return (
    <main className="p-6">
      <h1 className="font-serif text-2xl font-semibold text-ink">FocusLearn</h1>
    </main>
  );
}
