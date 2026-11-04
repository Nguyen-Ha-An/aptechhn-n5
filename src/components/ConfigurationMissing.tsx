export function ConfigurationMissing() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-paper px-4 py-12 text-ink">
      <div className="w-full max-w-md rounded-[10px] border border-rule bg-surface/50 p-8 text-center">
        <h1 className="font-serif text-2xl font-bold tracking-tight text-ink">
          Configuration missing
        </h1>
        <p className="mt-3 text-sm text-muted">
          FocusLearn requires Supabase configuration to run. Please define
          VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in your environment.
        </p>
      </div>
    </main>
  );
}
