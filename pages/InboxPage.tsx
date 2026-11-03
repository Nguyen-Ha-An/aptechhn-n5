/**
 * Inbox Page - Quick Capture & Triage
 * Linear-inspired inbox for zero-friction entry
 */

import React, { useState } from 'react';
import { useGlobal } from '../context/GlobalContext';
import { Card, Button, Input, Badge, EmptyState, Modal, Select } from '../components/ui';
import {
  Inbox,
  Plus,
  CheckSquare,
  FileText,
  Trash2,
  ArrowRight,
  Clock,
} from 'lucide-react';

export const InboxPage: React.FC = () => {
  const {
    state,
    addInboxItem,
    convertInboxToTask,
    convertInboxToNote,
    archiveInboxItem,
    showToast,
  } = useGlobal();

  const [newCapture, setNewCapture] = useState('');
  const [triageModal, setTriageModal] = useState<{ id: string; content: string } | null>(null);
  const [taskData, setTaskData] = useState({
    projectId: '',
    priority: 'medium',
    dueDate: '',
  });

  const handleCapture = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCapture.trim()) return;
    addInboxItem(newCapture.trim());
    setNewCapture('');
    showToast('Added to inbox', 'success');
  };

  const handleConvertToTask = () => {
    if (!triageModal) return;
    convertInboxToTask(triageModal.id, {
      projectId: taskData.projectId || null,
      priority: taskData.priority as any,
      dueDate: taskData.dueDate || null,
    });
    setTriageModal(null);
    setTaskData({ projectId: '', priority: 'medium', dueDate: '' });
    showToast('Converted to task', 'success');
  };

  const handleConvertToNote = () => {
    if (!triageModal) return;
    convertInboxToNote(triageModal.id, {});
    setTriageModal(null);
    showToast('Converted to note', 'success');
  };

  const handleArchive = (id: string) => {
    archiveInboxItem(id);
    showToast('Item archived', 'info');
  };

  const projectOptions = [
    { value: '', label: 'No project' },
    ...state.projects.map((p) => ({ value: p.id, label: p.name })),
  ];

  const priorityOptions = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' },
  ];

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Inbox className="w-6 h-6 text-indigo-600" />
          Inbox
        </h1>
        <p className="text-gray-500 mt-1">
          Quick capture thoughts, then triage later
        </p>
      </div>

      {/* Quick Capture */}
      <form onSubmit={handleCapture} className="mb-6">
        <Card className="p-4">
          <div className="flex gap-3">
            <Input
              placeholder="Capture a thought, task, or idea..."
              value={newCapture}
              onChange={(e) => setNewCapture(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={!newCapture.trim()}>
              <Plus className="w-4 h-4" />
              Capture
            </Button>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Press Enter to quickly capture. Triage later to convert to tasks or notes.
          </p>
        </Card>
      </form>

      {/* Inbox Items */}
      {state.inbox.length === 0 ? (
        <EmptyState
          icon={<Inbox className="w-16 h-16" />}
          title="Inbox Zero"
          description="Your inbox is empty. Capture thoughts above to add them here."
        />
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-500">
              {state.inbox.length} items to triage
            </span>
          </div>

          {state.inbox.map((item) => (
            <Card key={item.id} className="p-4 hover:border-gray-300 transition-colors">
              <div className="flex items-start gap-4">
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className="text-gray-900">{item.content}</p>
                  <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(item.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setTriageModal({ id: item.id, content: item.content })}
                  >
                    <ArrowRight className="w-4 h-4" />
                    Triage
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleArchive(item.id)}
                  >
                    <Trash2 className="w-4 h-4 text-gray-400" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Triage Modal */}
      <Modal
        open={!!triageModal}
        onClose={() => setTriageModal(null)}
        title="Triage Item"
        size="md"
      >
        {triageModal && (
          <div className="space-y-4">
            {/* Preview */}
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-700">{triageModal.content}</p>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                fullWidth
                onClick={handleConvertToNote}
              >
                <FileText className="w-4 h-4" />
                Convert to Note
              </Button>
              <Button
                variant="ghost"
                fullWidth
                onClick={() => handleArchive(triageModal.id)}
              >
                <Trash2 className="w-4 h-4" />
                Archive
              </Button>
            </div>

            {/* Task Conversion */}
            <div className="border-t pt-4">
              <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                <CheckSquare className="w-4 h-4" />
                Convert to Task
              </h4>

              <div className="space-y-3">
                <Select
                  label="Project"
                  options={projectOptions}
                  value={taskData.projectId}
                  onChange={(e) => setTaskData({ ...taskData, projectId: e.target.value })}
                />

                <Select
                  label="Priority"
                  options={priorityOptions}
                  value={taskData.priority}
                  onChange={(e) => setTaskData({ ...taskData, priority: e.target.value })}
                />

                <Input
                  label="Due Date"
                  type="date"
                  value={taskData.dueDate}
                  onChange={(e) => setTaskData({ ...taskData, dueDate: e.target.value })}
                />

                <Button fullWidth onClick={handleConvertToTask}>
                  <CheckSquare className="w-4 h-4" />
                  Create Task
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default InboxPage;
