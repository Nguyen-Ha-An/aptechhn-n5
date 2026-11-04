import { createFileRoute } from '@tanstack/react-router';
import { ProgressPage } from '@/features/progress/ProgressPage';

export const Route = createFileRoute('/_app/progress/')({
  component: ProgressPage,
});
