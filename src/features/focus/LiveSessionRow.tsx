import { Link } from '@tanstack/react-router';
import { useFocus } from './useFocusSession';

export function LiveSessionRow() {
  const { state, formattedTime } = useFocus();

  if (state.phase !== 'focusing' && state.phase !== 'paused' && state.phase !== 'break') {
    return null;
  }

  let label = '';
  let dotClassName = 'h-2 w-2 rounded-full shrink-0';

  if (state.phase === 'focusing') {
    label = `Focusing ${formattedTime}`;
    dotClassName += ' bg-accent animate-pulse';
  } else if (state.phase === 'paused') {
    label = `Paused ${formattedTime}`;
    dotClassName += ' bg-muted';
  } else if (state.phase === 'break') {
    label = `Break ${formattedTime}`;
    dotClassName += ' bg-accent';
  }

  return (
    <Link
      to="/focus"
      className="flex items-center gap-2.5 rounded-[6px] px-3 py-2 text-sm text-ink bg-surface hover:bg-paper border border-rule transition-colors duration-120 mb-2 focus-visible:outline-2 focus-visible:outline-accent"
      aria-label={`Active focus session: ${label}`}
    >
      <span className={dotClassName} aria-hidden="true" />
      <span className="truncate font-sans font-medium tabular-nums">{label}</span>
    </Link>
  );
}

export function LiveSessionSlot() {
  return <LiveSessionRow />;
}
