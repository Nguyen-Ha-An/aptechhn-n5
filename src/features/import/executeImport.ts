import { supabase } from '@/lib/supabase';
import type { MapLegacyResult } from './mapLegacy';

export class ImportError extends Error {
  table: string;
  constructor(table: string, message: string) {
    super(`Failed while importing ${table}: ${message}. Already imported items remain in your account.`);
    this.name = 'ImportError';
    this.table = table;
  }
}

export interface ExecuteImportOptions {
  userId: string;
  onProgress?: (status: string) => void;
  batchSize?: number;
}

async function insertInBatches<T extends Record<string, unknown>>(
  tableName: string,
  rows: T[],
  batchSize: number,
  onProgress?: (status: string) => void,
): Promise<void> {
  if (rows.length === 0) return;

  const totalBatches = Math.ceil(rows.length / batchSize);
  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const batchNum = Math.floor(i / batchSize) + 1;
    onProgress?.(`Importing ${tableName} (${batchNum}/${totalBatches})...`);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from(tableName as any) as any).insert(batch);
    if (error) {
      throw new ImportError(tableName, error.message);
    }
  }
}

export async function executeImport(
  mapped: MapLegacyResult,
  options: ExecuteImportOptions,
): Promise<void> {
  const { userId, onProgress, batchSize = 500 } = options;
  const { payloads } = mapped;

  // 1. Notes first (with new uuids)
  if (payloads.notes.length > 0) {
    onProgress?.('Importing notes...');
    await insertInBatches('notes', payloads.notes, batchSize, onProgress);
  }

  // 2. Note links
  if (payloads.note_links.length > 0) {
    onProgress?.('Linking pages...');
    await insertInBatches('note_links', payloads.note_links, batchSize, onProgress);
  }

  // 3. Todos
  if (payloads.todos.length > 0) {
    onProgress?.('Importing todos...');
    await insertInBatches('todos', payloads.todos, batchSize, onProgress);
  }

  // 4. Focus sessions
  if (payloads.focus_sessions.length > 0) {
    onProgress?.('Importing focus sessions...');
    await insertInBatches('focus_sessions', payloads.focus_sessions, batchSize, onProgress);
  }

  // 5. Distractions
  if (payloads.distractions.length > 0) {
    onProgress?.('Importing distractions...');
    await insertInBatches('distractions', payloads.distractions, batchSize, onProgress);
  }

  // 6. Conversations
  if (payloads.conversations.length > 0) {
    onProgress?.('Importing chat conversations...');
    await insertInBatches('conversations', payloads.conversations, batchSize, onProgress);
  }

  // 7. Messages
  if (payloads.messages.length > 0) {
    onProgress?.('Importing chat messages...');
    await insertInBatches('messages', payloads.messages, batchSize, onProgress);
  }

  // 8. Achievements
  if (payloads.achievements.length > 0) {
    onProgress?.('Importing achievements...');
    await insertInBatches('user_achievements', payloads.achievements, batchSize, onProgress);
  }

  // 9. Update profile legacy_imported_at
  onProgress?.('Finalizing import...');
  const importedAt = new Date().toISOString();
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ legacy_imported_at: importedAt })
    .eq('id', userId);

  if (profileError) {
    throw new ImportError('profiles', profileError.message);
  }
}
