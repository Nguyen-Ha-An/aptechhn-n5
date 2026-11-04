import { describe, it, expect } from 'vitest';
import { parseLegacy } from './parseLegacy';
import { mapLegacy } from './mapLegacy';
import legacyV5Fixture from './__fixtures__/legacy-v5.json';

describe('legacy import', () => {
  describe('parseLegacy', () => {
    it('rejects version 2 export', () => {
      const v2Data = {
        schemaVersion: 2,
        todos: [],
        tasks: [],
      };

      expect(() => parseLegacy(v2Data)).toThrow(/Unsupported export schema version/);
    });

    it('rejects invalid JSON string', () => {
      expect(() => parseLegacy('{ not valid json')).toThrow(/Invalid JSON/);
    });

    it('accepts v5 fixture successfully', () => {
      const parsed = parseLegacy(legacyV5Fixture);
      expect(parsed.schemaVersion).toBe(5);
      expect(parsed.todos).toHaveLength(3);
      expect(parsed.tasks).toHaveLength(2);
      expect(parsed.notes).toHaveLength(3);
      expect(parsed.sessions).toHaveLength(3);
      expect(parsed.conversations).toHaveLength(1);
    });

    it('accepts v3 and v4 exports', () => {
      const v3 = parseLegacy({ schemaVersion: 3, todos: [] });
      expect(v3.schemaVersion).toBe(3);

      const v4 = parseLegacy({ schemaVersion: 4, tasks: [] });
      expect(v4.schemaVersion).toBe(4);
    });
  });

  describe('mapLegacy', () => {
    it('outputs correct counts, link resolution, and priority mapping', () => {
      const parsed = parseLegacy(legacyV5Fixture);
      const result = mapLegacy(parsed);

      // Counts:
      // Todos: 3 todos + 2 tasks = 5 todos total
      expect(result.counts.todos).toBe(5);

      // Notes: 3 notes
      expect(result.counts.notes).toBe(3);

      // Note links: Note 1 links to Note 2 ("Chemistry 101"), Note 2 links to Note 1 ("Biology Notes")
      // Note 1 also has [[Missing Page]] which does not resolve to an id, so 2 links total
      expect(result.counts.note_links).toBe(2);

      // Focus sessions: 2 focus sessions (1 break session skipped)
      expect(result.counts.focus_sessions).toBe(2);

      // Distractions: Session 1 had 2, Session 3 had 1 = 3 distractions total
      expect(result.counts.distractions).toBe(3);

      // Conversations: 1 conversation
      expect(result.counts.conversations).toBe(1);

      // Messages: msg-1 is system (dropped), msg-4 is whitespace (dropped) -> 2 valid messages (msg-2 and msg-3)
      expect(result.counts.messages).toBe(2);

      // Achievements: first_session -> first_session, marathon -> focus_marathon, old_quiz_master dropped -> 2
      expect(result.counts.achievements).toBe(2);

      // Priority mapping:
      // Todo 1: priority 'urgent' -> mapped to 'high', done -> true, completed_at set
      const todo1 = result.payloads.todos.find((t) => t.title === 'Read Chapter 4');
      expect(todo1).toBeDefined();
      expect(todo1?.priority).toBe('high');
      expect(todo1?.done).toBe(true);
      expect(todo1?.completed_at).toBe('2026-11-01T10:00:00.000Z');

      // Todo 3: priority 'low' -> 'low', done -> false
      const todo3 = result.payloads.todos.find((t) => t.title === 'Email Professor');
      expect(todo3?.priority).toBe('low');
      expect(todo3?.done).toBe(false);
      expect(todo3?.completed_at).toBeNull();

      // Task 1: status 'done', priority 'high' -> todo done=true, priority='high'
      const task1Todo = result.payloads.todos.find((t) => t.title === 'Complete Lab Report');
      expect(task1Todo?.done).toBe(true);
      expect(task1Todo?.priority).toBe('high');
      expect(task1Todo?.completed_at).toBe('2026-11-02T16:00:00.000Z');

      // Task 2: status 'in_progress' -> todo done=false
      const task2Todo = result.payloads.todos.find(
        (t) => t.title === 'Prepare Presentation Slides',
      );
      expect(task2Todo?.done).toBe(false);
      expect(task2Todo?.completed_at).toBeNull();

      // Link resolution check in note content:
      const bioNote = result.payloads.notes.find((n) => n.title === 'Biology Notes')!;
      expect(bioNote).toBeDefined();
      const chemNote = result.payloads.notes.find((n) => n.title === 'Chemistry 101')!;
      expect(chemNote).toBeDefined();

      // Check note_links
      const link1 = result.payloads.note_links.find(
        (l) => l.source_id === bioNote.id && l.target_id === chemNote.id,
      );
      expect(link1).toBeDefined();

      const link2 = result.payloads.note_links.find(
        (l) => l.source_id === chemNote.id && l.target_id === bioNote.id,
      );
      expect(link2).toBeDefined();

      // Check content of Biology note: [[Missing Page]] stayed literal text
      const contentStr = JSON.stringify(bioNote.content);
      expect(contentStr).toContain('"attrs":{"id":"' + chemNote.id + '","label":"Chemistry 101"}');
      expect(contentStr).toContain('[[Missing Page]]');

      // Distractions category mapping
      expect(result.payloads.distractions[0]?.category).toBe('phone');
      expect(result.payloads.distractions[1]?.category).toBe('social');
      expect(result.payloads.distractions[2]?.category).toBe('noise');

      // Achievements mapped IDs
      const mappedAchIds = result.payloads.achievements.map((a) => a.achievement_id);
      expect(mappedAchIds).toContain('first_session');
      expect(mappedAchIds).toContain('focus_marathon');
      expect(mappedAchIds).not.toContain('old_quiz_master');

      // Skipped reports check
      const skippedCategories = result.skipped.map((s) => s.category);
      expect(skippedCategories).toContain('Projects');
      expect(skippedCategories).toContain('Cycles');
      expect(skippedCategories).toContain('Flashcards & Decks');
      expect(skippedCategories).toContain('Inbox');
      expect(skippedCategories).toContain('Break Sessions');
      expect(skippedCategories).toContain('Quiz Data');
      expect(skippedCategories).toContain('Achievements');
      expect(skippedCategories).toContain('System & Empty Messages');
    });
  });
});
