import { createFileRoute } from '@tanstack/react-router';
import { PageHeader } from '@/components/PageHeader';
import { EmptyState } from '@/components/ui';
import { formatLongDate, browserTimeZone } from '@/lib/dates';
import { useProfile } from '@/features/profile/queries';

export const Route = createFileRoute('/_app/')({
  component: TodayPage,
});

function TodayPage() {
  const { data: profile } = useProfile();
  const tz = profile?.timezone || browserTimeZone();
  const dateTitle = formatLongDate(new Date(), tz);

  return (
    <div>
      <PageHeader title={dateTitle} />
      <EmptyState
        title="Today"
        body="This page is being rebuilt."
      />
    </div>
  );
}
