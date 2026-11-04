import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { FocusPage } from '@/features/focus/FocusPage';

const focusSearchSchema = z.object({
  todo: z.string().optional(),
});

export const Route = createFileRoute('/_app/focus')({
  validateSearch: (search: Record<string, unknown>) => focusSearchSchema.parse(search),
  component: FocusRouteComponent,
});

function FocusRouteComponent() {
  const search = Route.useSearch();
  return <FocusPage initialTodoId={search.todo} />;
}
