/**
 * Tasks Page - Linear-inspired task management
 * Features: List view, status transitions, filters, task detail drawer
 */

import React, { useState, useMemo } from 'react';
import { useGlobal } from '../context/GlobalContext';
import { Card, Button, Input, Badge, EmptyState, Drawer, Select } from '../components/ui';
import { Task, TaskStatus, TaskPriority } from '../types';
import { TASK_PRIORITIES, TASK_STATUSES } from '../constants';
import {
  Plus,
  CheckSquare,
  Circle,
  Clock,
  CheckCircle,
  Filter,
  Calendar,
  ArrowUp,
  ArrowDown,
  Minus,
  AlertCircle,
  Trash2,
  MoreHorizontal,
  X,
  ChevronDown,
} from 'lucide-react';

const priorityIcons: Record<TaskPriority, React.ReactNode> = {
  urgent: <AlertCircle className="w-4 h-4 text-red-500" />,
  high: <ArrowUp className="w-4 h-4 text-orange-500" />,
  medium: <Minus className="w-4 h-4 text-blue-500" />,
  low: <ArrowDown className="w-4 h-4 text-gray-400" />,
};

const statusIcons: Record<TaskStatus, React.ReactNode> = {
  inbox: <Circle className="w-4 h-4 text-gray-400" />,
  todo: <Circle className="w-4 h-4 text-blue-500" />,
  in_progress: <Clock className="w-4 h-4 text-amber-500" />,
  done: <CheckCircle className="w-4 h-4 text-green-500" />,
};

export const TasksPage: React.FC = () => {
  const { state, addTask, updateTask, deleteTask, moveTask, showToast } = useGlobal();

  const [filter, setFilter] = useState<TaskStatus | 'all'>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [showNewTask, setShowNewTask] = useState(false);

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return state.tasks.filter((t) => {
      if (filter !== 'all' && t.status !== filter) return false;
      if (projectFilter !== 'all' && t.projectId !== projectFilter) return false;
      return true;
    });
  }, [state.tasks, filter, projectFilter]);

  // Group by status
  const groupedTasks = useMemo(() => {
    const groups: Record<TaskStatus, Task[]> = {
      inbox: [],
      todo: [],
      in_progress: [],
      done: [],
    };
    filteredTasks.forEach((t) => groups[t.status].push(t));
    return groups;
  }, [filteredTasks]);

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    addTask({
      title: newTaskTitle.trim(),
      description: '',
      status: 'todo',
      priority: 'medium',
      projectId: projectFilter !== 'all' ? projectFilter : null,
      cycleId: null,
      dueDate: null,
      estimateMinutes: null,
      tags: [],
    });

    setNewTaskTitle('');
    setShowNewTask(false);
    showToast('Task created', 'success');
  };

  const handleStatusChange = (taskId: string, newStatus: TaskStatus) => {
    moveTask(taskId, newStatus);
    if (selectedTask?.id === taskId) {
      setSelectedTask({ ...selectedTask, status: newStatus });
    }
  };

  const handleDelete = (taskId: string) => {
    deleteTask(taskId);
    setSelectedTask(null);
    showToast('Task deleted', 'info');
  };

  const projectOptions = [
    { value: 'all', label: 'All Projects' },
    ...state.projects.map((p) => ({ value: p.id, label: p.name })),
  ];

  const priorityOptions = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
    { value: 'urgent', label: 'Urgent' },
  ];

  const statusOptions = [
    { value: 'inbox', label: 'Inbox' },
    { value: 'todo', label: 'Todo' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'done', label: 'Done' },
  ];

  const renderTaskRow = (task: Task) => {
    const project = state.projects.find((p) => p.id === task.projectId);

    return (
      <div
        key={task.id}
        className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-0"
        onClick={() => setSelectedTask(task)}
      >
        {/* Status */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            const nextStatus: Record<TaskStatus, TaskStatus> = {
              inbox: 'todo',
              todo: 'in_progress',
              in_progress: 'done',
              done: 'todo',
            };
            handleStatusChange(task.id, nextStatus[task.status]);
          }}
          className="hover:scale-110 transition-transform"
        >
          {statusIcons[task.status]}
        </button>

        {/* Priority */}
        {priorityIcons[task.priority]}

        {/* Title */}
        <span
          className={`flex-1 text-sm ${
            task.status === 'done' ? 'text-gray-400 line-through' : 'text-gray-900'
          }`}
        >
          {task.title}
        </span>

        {/* Project */}
        {project && (
          <Badge variant="outline" size="sm">
            <span
              className="w-2 h-2 rounded-full mr-1"
              style={{ backgroundColor: project.color }}
            />
            {project.name}
          </Badge>
        )}

        {/* Due Date */}
        {task.dueDate && (
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-bold text-gray-900">Tasks</h1>
          <Button onClick={() => setShowNewTask(true)}>
            <Plus className="w-4 h-4" />
            Add Task
          </Button>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <div className="flex border border-gray-200 rounded-md overflow-hidden">
              {(['all', 'todo', 'in_progress', 'done'] as const).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilter(status)}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                    filter === status
                      ? 'bg-indigo-50 text-indigo-700'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {status === 'all' ? 'All' : TASK_STATUSES[status].label}
                </button>
              ))}
            </div>
          </div>

          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            className="h-8 px-2 text-sm border border-gray-200 rounded-md"
          >
            {projectOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Task List */}
      <div className="flex-1 overflow-y-auto">
        {filteredTasks.length === 0 ? (
          <EmptyState
            icon={<CheckSquare className="w-16 h-16" />}
            title="No tasks"
            description="Create your first task to get started"
            action={{ label: 'Add Task', onClick: () => setShowNewTask(true) }}
          />
        ) : filter === 'all' ? (
          // Grouped view
          <div className="divide-y divide-gray-200">
            {(Object.keys(groupedTasks) as TaskStatus[]).map((status) => {
              if (groupedTasks[status].length === 0) return null;
              return (
                <div key={status}>
                  <div className="px-4 py-2 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                    {statusIcons[status]}
                    <span className="text-sm font-medium text-gray-700">
                      {TASK_STATUSES[status].label}
                    </span>
                    <Badge variant="default" size="sm">
                      {groupedTasks[status].length}
                    </Badge>
                  </div>
                  {groupedTasks[status].map(renderTaskRow)}
                </div>
              );
            })}
          </div>
        ) : (
          // Flat list view
          <div>{filteredTasks.map(renderTaskRow)}</div>
        )}
      </div>

      {/* New Task Form */}
      {showNewTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
          <Card className="w-full max-w-lg p-4">
            <form onSubmit={handleAddTask}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">New Task</h3>
                <Button variant="ghost" size="icon" type="button" onClick={() => setShowNewTask(false)}>
                  <X className="w-4 h-4" />
                </Button>
              </div>
              <Input
                placeholder="Task title..."
                value={newTaskTitle}
                onChange={(e) => setNewTaskTitle(e.target.value)}
                autoFocus
                className="mb-4"
              />
              <div className="flex justify-end gap-2">
                <Button variant="ghost" type="button" onClick={() => setShowNewTask(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={!newTaskTitle.trim()}>
                  Create Task
                </Button>
              </div>
            </form>
          </Card>
        </div>
      )}

      {/* Task Detail Drawer */}
      <Drawer
        open={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        title="Task Details"
        width="md"
      >
        {selectedTask && (
          <div className="p-4 space-y-4">
            {/* Title */}
            <input
              value={selectedTask.title}
              onChange={(e) => {
                const updated = { ...selectedTask, title: e.target.value };
                setSelectedTask(updated);
                updateTask(selectedTask.id, { title: e.target.value });
              }}
              className="w-full text-lg font-semibold border-0 focus:ring-0 focus:outline-none"
            />

            {/* Status & Priority */}
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Status"
                options={statusOptions}
                value={selectedTask.status}
                onChange={(e) => {
                  handleStatusChange(selectedTask.id, e.target.value as TaskStatus);
                }}
              />
              <Select
                label="Priority"
                options={priorityOptions}
                value={selectedTask.priority}
                onChange={(e) => {
                  const updated = { ...selectedTask, priority: e.target.value as TaskPriority };
                  setSelectedTask(updated);
                  updateTask(selectedTask.id, { priority: e.target.value as TaskPriority });
                }}
              />
            </div>

            {/* Project */}
            <Select
              label="Project"
              options={[{ value: '', label: 'No project' }, ...state.projects.map((p) => ({ value: p.id, label: p.name }))]}
              value={selectedTask.projectId || ''}
              onChange={(e) => {
                const updated = { ...selectedTask, projectId: e.target.value || null };
                setSelectedTask(updated);
                updateTask(selectedTask.id, { projectId: e.target.value || null });
              }}
            />

            {/* Due Date */}
            <Input
              label="Due Date"
              type="date"
              value={selectedTask.dueDate || ''}
              onChange={(e) => {
                const updated = { ...selectedTask, dueDate: e.target.value || null };
                setSelectedTask(updated);
                updateTask(selectedTask.id, { dueDate: e.target.value || null });
              }}
            />

            {/* Description */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-1 block">Description</label>
              <textarea
                value={selectedTask.description}
                onChange={(e) => {
                  const updated = { ...selectedTask, description: e.target.value };
                  setSelectedTask(updated);
                  updateTask(selectedTask.id, { description: e.target.value });
                }}
                className="w-full h-32 p-3 border border-gray-200 rounded-md text-sm resize-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder="Add description..."
              />
            </div>

            {/* Actions */}
            <div className="pt-4 border-t">
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleDelete(selectedTask.id)}
              >
                <Trash2 className="w-4 h-4" />
                Delete Task
              </Button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
};

export default TasksPage;
