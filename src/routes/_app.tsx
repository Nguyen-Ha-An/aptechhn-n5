import { createFileRoute, Navigate, Outlet } from '@tanstack/react-router';
import { useSession } from '@/features/auth';
import { AppShell } from '@/components/AppShell';

export const Route = createFileRoute('/_app')({
  component: AppLayout,
});

function FullPageSkeleton() {
  return (
    <div
      className="flex min-h-screen w-full bg-paper text-ink"
      aria-busy="true"
      role="status"
      aria-label="Loading workspace"
    >
      {/* Sidebar Skeleton */}
      <div className="hidden md:flex w-[248px] flex-col border-r border-rule bg-surface p-4 space-y-4 shrink-0">
        <div className="h-6 w-28 rounded-[4px] bg-rule/60 animate-pulse" />
        <div className="space-y-2 mt-4">
          <div className="h-7 w-full rounded-[6px] bg-rule/40 animate-pulse" />
          <div className="h-7 w-full rounded-[6px] bg-rule/40 animate-pulse" />
          <div className="h-7 w-full rounded-[6px] bg-rule/40 animate-pulse" />
          <div className="h-7 w-full rounded-[6px] bg-rule/40 animate-pulse" />
        </div>
      </div>

      {/* Main Column Skeleton */}
      <div className="flex-1 max-w-[720px] mx-auto w-full px-5 py-6 md:py-12 space-y-6">
        <div className="border-b border-rule pb-4">
          <div className="h-8 w-56 rounded-[4px] bg-rule/60 animate-pulse" />
        </div>
        <div className="space-y-3">
          <div className="h-4 w-full rounded-[4px] bg-rule/40 animate-pulse" />
          <div className="h-4 w-5/6 rounded-[4px] bg-rule/40 animate-pulse" />
          <div className="h-4 w-2/3 rounded-[4px] bg-rule/40 animate-pulse" />
        </div>
      </div>
    </div>
  );
}

function AppLayout() {
  const { status } = useSession();

  if (status === 'loading') {
    return <FullPageSkeleton />;
  }

  if (status === 'signed-out') {
    return <Navigate to="/login" replace />;
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
