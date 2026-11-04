import { createFileRoute } from '@tanstack/react-router';
import { SessionsPage } from '@/features/progress/SessionsPage';

export const Route = createFileRoute('/_app/progress/sessions')({
  component: SessionsPage,
});
