import { useState, useRef } from 'react';
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { PageHeader } from '@/components/PageHeader';
import { Button, ConfirmDialog, ErrorState } from '@/components/ui';
import { useSession } from '@/features/auth';
import { useProfile } from '@/features/profile/queries';
import { parseLegacy } from '@/features/import/parseLegacy';
import { mapLegacy, type MapLegacyResult } from '@/features/import/mapLegacy';
import { executeImport, ImportError } from '@/features/import/executeImport';
import { toast } from 'sonner';

export const Route = createFileRoute('/_app/settings/import')({
  component: LegacyImportPage,
});

function LegacyImportPage() {
  const { user } = useSession();
  const { data: profile, refetch: refetchProfile } = useProfile();
  const navigate = useNavigate();

  const [parseError, setParseError] = useState<string | null>(null);
  const [mappedData, setMappedData] = useState<MapLegacyResult | null>(null);
  const [importing, setImporting] = useState(false);
  const [progressText, setProgressText] = useState<string>('');
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const [showDuplicateConfirm, setShowDuplicateConfirm] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setParseError(null);
    setImportError(null);
    setMappedData(null);
    setImportSuccess(false);

    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = parseLegacy(text);
        const mapped = mapLegacy(parsed, user?.id);
        setMappedData(mapped);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to parse export file.';
        setParseError(message);
      }
    };
    reader.onerror = () => {
      setParseError('Failed to read file from disk.');
    };
    reader.readAsText(file);
  };

  const startImport = async () => {
    if (!mappedData || !user?.id) return;

    setImporting(true);
    setImportError(null);
    setProgressText('Starting import...');

    try {
      await executeImport(mappedData, {
        userId: user.id,
        onProgress: (status) => setProgressText(status),
      });

      setImportSuccess(true);
      await refetchProfile();
      toast.success('Your data was imported successfully.');
    } catch (err) {
      if (err instanceof ImportError) {
        setImportError(err.message);
      } else {
        const msg = err instanceof Error ? err.message : 'An unexpected error occurred during import.';
        setImportError(msg);
      }
    } finally {
      setImporting(false);
      setProgressText('');
    }
  };

  const handleImportClick = () => {
    if (profile?.legacy_imported_at) {
      setShowDuplicateConfirm(true);
    } else {
      void startImport();
    }
  };

  return (
    <div className="space-y-8">
      <PageHeader
        title="Import from old FocusLearn"
        meta="Import your notes, todos, focus sessions, and chat history from a previous export file."
      />

      {profile?.legacy_imported_at && (
        <div className="rounded-md border border-rule bg-surface p-4 text-sm text-ink-muted">
          <p className="font-medium text-ink">Previous import detected</p>
          <p className="mt-1">
            You previously imported legacy data into this account. Re-importing may create duplicate items.
          </p>
        </div>
      )}

      {importSuccess ? (
        <div className="rounded-md border border-rule bg-surface p-6 space-y-4">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-ink">Import Complete</h2>
            <p className="text-sm text-ink-muted">
              All items have been successfully imported into your FocusLearn notebook.
            </p>
          </div>
          <div className="pt-2 flex items-center gap-3">
            <Button
              variant="primary"
              onClick={() => void navigate({ to: '/' })}
            >
              Go to Today
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setImportSuccess(false);
                setMappedData(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
            >
              Import another file
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="space-y-2">
            <label
              htmlFor="legacy-file-input"
              className="block text-sm font-medium text-ink"
            >
              Choose your export file (.json)
            </label>
            <input
              id="legacy-file-input"
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileChange}
              disabled={importing}
              className="block w-full text-sm text-ink file:mr-4 file:py-2 file:px-4 file:rounded-md file:border file:border-rule file:text-sm file:font-medium file:bg-surface file:text-ink hover:file:bg-paper cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            />
          </div>

          {parseError && (
            <ErrorState
              title="Could not read export file"
              message={parseError}
              onRetry={() => {
                setParseError(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
            />
          )}

          {importError && (
            <ErrorState
              title="Import stopped"
              message={importError}
              onRetry={() => void startImport()}
            />
          )}

          {mappedData && !importSuccess && (
            <div className="space-y-6">
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-ink">Items to Import</h2>
                <div className="overflow-hidden rounded-md border border-rule bg-surface">
                  <table className="w-full text-left text-sm text-ink">
                    <thead className="border-b border-rule bg-paper text-xs uppercase tracking-wider text-ink-muted">
                      <tr>
                        <th className="px-4 py-2.5">Category</th>
                        <th className="px-4 py-2.5 text-right">Count</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-rule">
                      <tr>
                        <td className="px-4 py-2">Todos</td>
                        <td className="px-4 py-2 text-right font-medium">{mappedData.counts.todos}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2">Notes</td>
                        <td className="px-4 py-2 text-right font-medium">{mappedData.counts.notes}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2">Note links</td>
                        <td className="px-4 py-2 text-right font-medium">{mappedData.counts.note_links}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2">Focus sessions</td>
                        <td className="px-4 py-2 text-right font-medium">{mappedData.counts.focus_sessions}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2">Distractions</td>
                        <td className="px-4 py-2 text-right font-medium">{mappedData.counts.distractions}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2">Conversations</td>
                        <td className="px-4 py-2 text-right font-medium">{mappedData.counts.conversations}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2">Chat messages</td>
                        <td className="px-4 py-2 text-right font-medium">{mappedData.counts.messages}</td>
                      </tr>
                      <tr>
                        <td className="px-4 py-2">Achievements</td>
                        <td className="px-4 py-2 text-right font-medium">{mappedData.counts.achievements}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {mappedData.skipped.length > 0 && (
                <div className="space-y-3">
                  <h2 className="text-sm font-semibold text-ink">Skipped Categories</h2>
                  <div className="overflow-hidden rounded-md border border-rule bg-surface">
                    <table className="w-full text-left text-sm text-ink">
                      <thead className="border-b border-rule bg-paper text-xs uppercase tracking-wider text-ink-muted">
                        <tr>
                          <th className="px-4 py-2.5">Category</th>
                          <th className="px-4 py-2.5 text-right">Count</th>
                          <th className="px-4 py-2.5">Reason</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-rule">
                        {mappedData.skipped.map((item, index) => (
                          <tr key={index}>
                            <td className="px-4 py-2 font-medium">{item.category}</td>
                            <td className="px-4 py-2 text-right">{item.count}</td>
                            <td className="px-4 py-2 text-ink-muted text-xs">{item.reason}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-4 pt-2">
                <Button
                  variant="primary"
                  loading={importing}
                  disabled={importing || mappedData.counts.total === 0}
                  onClick={handleImportClick}
                >
                  Import {mappedData.counts.total} items
                </Button>
                {importing && (
                  <span className="text-sm text-ink-muted" role="status">
                    {progressText}
                  </span>
                )}
                <Link
                  to="/settings"
                  className="text-sm text-ink-muted hover:text-ink hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-sm px-1"
                >
                  Cancel
                </Link>
              </div>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={showDuplicateConfirm}
        onOpenChange={setShowDuplicateConfirm}
        title="Confirm Re-import"
        description="You previously imported data into this account. Re-running the import will create new items and may result in duplicates. Do you wish to proceed?"
        confirmText="Proceed with import"
        cancelText="Cancel"
        variant="primary"
        onConfirm={() => {
          setShowDuplicateConfirm(false);
          void startImport();
        }}
        onCancel={() => setShowDuplicateConfirm(false)}
      />
    </div>
  );
}
