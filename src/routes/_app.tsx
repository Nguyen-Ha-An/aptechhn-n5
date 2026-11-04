import { createFileRoute, Navigate, Outlet } from '@tanstack/react-router';
import { useSession } from '@/features/auth';
import { AppShell } from '@/components/AppShell';
import { FullPageSkeleton } from '@/components/FullPageSkeleton';

export const Route = createFileRoute('/_app')({
  component: AppLayout,
});

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
