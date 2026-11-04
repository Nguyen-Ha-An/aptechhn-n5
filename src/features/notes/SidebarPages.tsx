import { Plus } from '@phosphor-icons/react';

export function SidebarPages() {
  return (
    <div className="mt-6 px-3">
      <div className="flex items-center justify-between text-xs font-semibold text-muted mb-2">
        <span>Pages</span>
        <button
          type="button"
          disabled
          title="Available after Task 5"
          aria-label="New page"
          className="inline-flex h-6 w-6 items-center justify-center rounded-[4px] text-muted opacity-50 cursor-not-allowed"
        >
          <Plus size={14} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
