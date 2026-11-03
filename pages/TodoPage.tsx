/**
 * Todo Page - Notion-like checklist
 * Features: Quick add, inline editing, filters, priorities, due dates
 */

import React, { useState, useRef, useEffect } from 'react';
import { useGlobal } from '../context/GlobalContext';
import { useT, useLanguage } from '../i18n';
import { Card, Button, Badge, SegmentedControl, EmptyState, Input } from '../components/ui';
import { TodoItem, TodoPriority } from '../types';
import {
  Plus,
  CheckCircle2,
  Circle,
  Trash2,
  Calendar,
  Flag,
  ListTodo,
  X,
} from 'lucide-react';

type FilterType = 'all' | 'active' | 'completed';

export const TodoPage: React.FC = () => {
  const { state, addTodo, updateTodo, deleteTodo, toggleTodo, clearCompletedTodos } = useGlobal();
  const t = useT();
  const language = useLanguage();

  const [filter, setFilter] = useState<FilterType>('all');
  const [newTodoTitle, setNewTodoTitle] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);

  // Filter todos
  const filteredTodos = state.todos.filter((todo) => {
    if (filter === 'active') return !todo.done;
    if (filter === 'completed') return todo.done;
    return true;
  });

  // Sort: undone first, then by creation date (newest first)
  const sortedTodos = [...filteredTodos].sort((a, b) => {
    if (a.done !== b.done) return a.done ? 1 : -1;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  const activeTodosCount = state.todos.filter((t) => !t.done).length;
  const completedTodosCount = state.todos.filter((t) => t.done).length;

  // Handle adding a new todo
  const handleAddTodo = () => {
    const title = newTodoTitle.trim();
    if (!title) return;
    addTodo(title);
    setNewTodoTitle('');
    inputRef.current?.focus();
  };

  // Handle key press in input
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAddTodo();
    }
  };

  // Start editing a todo
  const startEditing = (todo: TodoItem) => {
    setEditingId(todo.id);
    setEditingTitle(todo.title);
  };

  // Save edited todo
  const saveEdit = () => {
    if (editingId && editingTitle.trim()) {
      updateTodo(editingId, { title: editingTitle.trim() });
    }
    setEditingId(null);
    setEditingTitle('');
  };

  // Handle edit key press
  const handleEditKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      saveEdit();
    } else if (e.key === 'Escape') {
      setEditingId(null);
      setEditingTitle('');
    }
  };

  // Focus edit input when editing starts
  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  // Get priority color
  const getPriorityColor = (priority: TodoPriority) => {
    switch (priority) {
      case 'urgent': return 'text-red-500';
      case 'high': return 'text-orange-500';
      case 'medium': return 'text-blue-500';
      case 'low': return 'text-gray-400';
    }
  };

  // Get priority label
  const getPriorityLabel = (priority: TodoPriority) => {
    return t.todo.priority[priority];
  };

  // Check if due date is today or overdue
  const getDueDateStatus = (dueDate: string | null) => {
    if (!dueDate) return null;
    const today = new Date().toISOString().split('T')[0];
    if (dueDate < today) return 'overdue';
    if (dueDate === today) return 'today';
    return 'upcoming';
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  // Update todo priority
  const cyclePriority = (todo: TodoItem) => {
    const priorities: TodoPriority[] = ['low', 'medium', 'high', 'urgent'];
    const currentIndex = priorities.indexOf(todo.priority);
    const nextIndex = (currentIndex + 1) % priorities.length;
    updateTodo(todo.id, { priority: priorities[nextIndex] });
  };

  // Set due date for today
  const setDueToday = (todoId: string) => {
    const today = new Date().toISOString().split('T')[0];
    updateTodo(todoId, { dueDate: today });
  };

  const filterOptions = [
    { value: 'all' as FilterType, label: t.todo.all },
    { value: 'active' as FilterType, label: t.todo.active },
    { value: 'completed' as FilterType, label: t.todo.completed },
  ];

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ListTodo className="w-6 h-6 text-indigo-600" />
          {t.todo.title}
        </h1>
        <p className="text-gray-500 text-sm mt-1">{t.todo.subtitle}</p>
      </div>

      {/* Quick Add */}
      <Card className="p-4 mb-6">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              type="text"
              value={newTodoTitle}
              onChange={(e) => setNewTodoTitle(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={t.todo.addPlaceholder}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 placeholder-gray-400"
            />
          </div>
          <Button onClick={handleAddTodo} disabled={!newTodoTitle.trim()}>
            <Plus className="w-5 h-5" />
          </Button>
        </div>
      </Card>

      {/* Filters */}
      <div className="flex items-center justify-between mb-4">
        <SegmentedControl
          options={filterOptions}
          value={filter}
          onChange={setFilter}
        />
        {completedTodosCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearCompletedTodos}>
            <Trash2 className="w-4 h-4" />
            {t.todo.clearCompleted}
          </Button>
        )}
      </div>

      {/* Todo List */}
      {sortedTodos.length === 0 ? (
        <EmptyState
          icon={<ListTodo className="w-16 h-16" />}
          title={t.todo.noTodos}
          description={t.todo.addFirstTodoDesc}
          action={{
            label: t.todo.addFirstTodo,
            onClick: () => inputRef.current?.focus(),
          }}
        />
      ) : (
        <div className="space-y-2">
          {sortedTodos.map((todo) => {
            const dueDateStatus = getDueDateStatus(todo.dueDate);

            return (
              <div
                key={todo.id}
                className={`group flex items-center gap-3 p-3 bg-white rounded-lg border border-gray-100 hover:border-gray-200 hover:shadow-sm transition-all ${
                  todo.done ? 'opacity-60' : ''
                }`}
              >
                {/* Checkbox */}
                <button
                  onClick={() => toggleTodo(todo.id)}
                  className={`flex-shrink-0 transition-colors ${
                    todo.done ? 'text-green-500' : 'text-gray-300 hover:text-gray-400'
                  }`}
                >
                  {todo.done ? (
                    <CheckCircle2 className="w-6 h-6" />
                  ) : (
                    <Circle className="w-6 h-6" />
                  )}
                </button>

                {/* Title */}
                <div className="flex-1 min-w-0">
                  {editingId === todo.id ? (
                    <input
                      ref={editInputRef}
                      type="text"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onKeyDown={handleEditKeyPress}
                      onBlur={saveEdit}
                      className="w-full px-2 py-1 border border-indigo-300 rounded focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  ) : (
                    <span
                      onClick={() => !todo.done && startEditing(todo)}
                      className={`block truncate cursor-pointer ${
                        todo.done ? 'line-through text-gray-400' : 'text-gray-900'
                      }`}
                    >
                      {todo.title}
                    </span>
                  )}

                  {/* Due date badge */}
                  {todo.dueDate && (
                    <span
                      className={`text-xs mt-1 inline-flex items-center gap-1 ${
                        dueDateStatus === 'overdue'
                          ? 'text-red-500'
                          : dueDateStatus === 'today'
                          ? 'text-amber-500'
                          : 'text-gray-400'
                      }`}
                    >
                      <Calendar className="w-3 h-3" />
                      {dueDateStatus === 'overdue'
                        ? t.todo.overdue
                        : dueDateStatus === 'today'
                        ? t.todo.dueToday
                        : formatDate(todo.dueDate)}
                    </span>
                  )}
                </div>

                {/* Actions (visible on hover) */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {/* Priority flag */}
                  <button
                    onClick={() => cyclePriority(todo)}
                    className={`p-1.5 rounded hover:bg-gray-100 transition-colors ${getPriorityColor(todo.priority)}`}
                    title={getPriorityLabel(todo.priority)}
                  >
                    <Flag className="w-4 h-4" />
                  </button>

                  {/* Set due date to today */}
                  {!todo.dueDate && (
                    <button
                      onClick={() => setDueToday(todo.id)}
                      className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                      title={t.todo.setDueDate}
                    >
                      <Calendar className="w-4 h-4" />
                    </button>
                  )}

                  {/* Delete */}
                  <button
                    onClick={() => deleteTodo(todo.id)}
                    className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                    title={t.todo.deleteTodo}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Priority indicator (always visible) */}
                {todo.priority !== 'medium' && (
                  <Badge
                    variant={
                      todo.priority === 'urgent'
                        ? 'danger'
                        : todo.priority === 'high'
                        ? 'warning'
                        : 'default'
                    }
                    size="sm"
                  >
                    {getPriorityLabel(todo.priority)}
                  </Badge>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Footer stats */}
      {state.todos.length > 0 && (
        <div className="mt-6 text-center text-sm text-gray-400">
          {activeTodosCount} {activeTodosCount === 1 ? t.todo.itemLeft : t.todo.itemsLeft}
        </div>
      )}
    </div>
  );
};

export default TodoPage;
