/**
 * Projects Page - Subject Management & Cycles
 */

import React, { useState, useMemo } from 'react';
import { useGlobal } from '../context/GlobalContext';
import { Card, Button, Input, Badge, EmptyState, Modal, Progress } from '../components/ui';
import { Project, Cycle } from '../types';
import { PROJECT_COLORS } from '../constants';
import {
  FolderKanban,
  Plus,
  Calendar,
  Trash2,
  Edit2,
  CheckSquare,
  Clock,
  ChevronRight,
} from 'lucide-react';

export const ProjectsPage: React.FC = () => {
  const { state, addProject, updateProject, deleteProject, addCycle, updateCycle, showToast } = useGlobal();

  const [showNewProject, setShowNewProject] = useState(false);
  const [showNewCycle, setShowNewCycle] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', color: PROJECT_COLORS[0], description: '' });
  const [newCycle, setNewCycle] = useState({ name: '', startDate: '', endDate: '' });

  // Calculate project stats
  const projectStats = useMemo(() => {
    return state.projects.map((project) => {
      const tasks = state.tasks.filter((t) => t.projectId === project.id);
      const completed = tasks.filter((t) => t.status === 'done').length;
      const sessions = state.sessions.filter((s) => s.projectId === project.id);
      const focusMinutes = sessions.reduce((acc, s) => acc + s.durationSeconds / 60, 0);

      return {
        project,
        taskCount: tasks.length,
        completedTasks: completed,
        focusMinutes: Math.round(focusMinutes),
      };
    });
  }, [state.projects, state.tasks, state.sessions]);

  // Get active and past cycles
  const activeCycles = state.cycles.filter((c) => c.isActive);
  const pastCycles = state.cycles.filter((c) => !c.isActive).slice(-5);

  const handleCreateProject = () => {
    if (!newProject.name.trim()) return;
    addProject({
      name: newProject.name.trim(),
      color: newProject.color,
      icon: 'BookOpen',
      description: newProject.description,
      isDefault: false,
    });
    setNewProject({ name: '', color: PROJECT_COLORS[0], description: '' });
    setShowNewProject(false);
    showToast('Project created', 'success');
  };

  const handleCreateCycle = () => {
    if (!newCycle.name.trim() || !newCycle.startDate || !newCycle.endDate) return;

    // Deactivate other cycles
    state.cycles.forEach((c) => {
      if (c.isActive) updateCycle(c.id, { isActive: false });
    });

    addCycle({
      name: newCycle.name.trim(),
      startDate: new Date(newCycle.startDate).toISOString(),
      endDate: new Date(newCycle.endDate).toISOString(),
      isActive: true,
    });

    setNewCycle({ name: '', startDate: '', endDate: '' });
    setShowNewCycle(false);
    showToast('Cycle created', 'success');
  };

  const handleDeleteProject = (id: string) => {
    const project = state.projects.find((p) => p.id === id);
    if (project?.isDefault) {
      showToast('Cannot delete default projects', 'error');
      return;
    }
    deleteProject(id);
    showToast('Project deleted', 'info');
  };

  // Calculate cycle progress
  const getCycleProgress = (cycle: Cycle) => {
    const cycleTasks = state.tasks.filter((t) => t.cycleId === cycle.id);
    const completed = cycleTasks.filter((t) => t.status === 'done').length;
    return {
      total: cycleTasks.length,
      completed,
      percent: cycleTasks.length > 0 ? Math.round((completed / cycleTasks.length) * 100) : 0,
    };
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* Projects Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-indigo-600" />
            Projects
          </h2>
          <Button size="sm" onClick={() => setShowNewProject(true)}>
            <Plus className="w-4 h-4" />
            New Project
          </Button>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projectStats.map(({ project, taskCount, completedTasks, focusMinutes }) => (
            <Card key={project.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: project.color }}
                  />
                  <h3 className="font-semibold text-gray-900">{project.name}</h3>
                  {project.isDefault && (
                    <Badge variant="outline" size="sm">Default</Badge>
                  )}
                </div>
                {!project.isDefault && (
                  <button
                    onClick={() => handleDeleteProject(project.id)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <p className="text-sm text-gray-500 mb-4 line-clamp-2">
                {project.description || 'No description'}
              </p>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2 text-gray-600">
                  <CheckSquare className="w-4 h-4 text-gray-400" />
                  <span>{completedTasks}/{taskCount} tasks</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <span>{focusMinutes} min</span>
                </div>
              </div>

              {taskCount > 0 && (
                <div className="mt-3">
                  <Progress
                    value={completedTasks}
                    max={taskCount}
                    color={completedTasks === taskCount ? 'success' : 'primary'}
                  />
                </div>
              )}
            </Card>
          ))}
        </div>
      </section>

      {/* Cycles Section */}
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-purple-600" />
            Cycles
          </h2>
          <Button size="sm" variant="outline" onClick={() => setShowNewCycle(true)}>
            <Plus className="w-4 h-4" />
            New Cycle
          </Button>
        </div>

        {/* Active Cycle */}
        {activeCycles.length > 0 ? (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Active Cycle</h3>
            {activeCycles.map((cycle) => {
              const progress = getCycleProgress(cycle);
              return (
                <Card key={cycle.id} className="p-4 border-2 border-purple-200 bg-purple-50">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-semibold text-gray-900">{cycle.name}</h4>
                      <p className="text-sm text-gray-500">
                        {new Date(cycle.startDate).toLocaleDateString()} -{' '}
                        {new Date(cycle.endDate).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge variant="primary">{progress.percent}%</Badge>
                  </div>
                  <Progress value={progress.percent} color="primary" />
                  <p className="text-xs text-gray-500 mt-2">
                    {progress.completed} of {progress.total} tasks completed
                  </p>
                </Card>
              );
            })}
          </div>
        ) : (
          <EmptyState
            icon={<Calendar className="w-12 h-12" />}
            title="No active cycle"
            description="Create a weekly cycle to track your sprint progress"
            action={{ label: 'Create Cycle', onClick: () => setShowNewCycle(true) }}
          />
        )}

        {/* Past Cycles */}
        {pastCycles.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-2">Past Cycles</h3>
            <div className="space-y-2">
              {pastCycles.map((cycle) => {
                const progress = getCycleProgress(cycle);
                return (
                  <Card key={cycle.id} className="p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-700">{cycle.name}</h4>
                        <p className="text-xs text-gray-400">
                          {new Date(cycle.startDate).toLocaleDateString()} -{' '}
                          {new Date(cycle.endDate).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant={progress.percent === 100 ? 'success' : 'default'}>
                        {progress.completed}/{progress.total}
                      </Badge>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* New Project Modal */}
      <Modal open={showNewProject} onClose={() => setShowNewProject(false)} title="New Project">
        <div className="space-y-4">
          <Input
            label="Name"
            placeholder="e.g., Computer Science"
            value={newProject.name}
            onChange={(e) => setNewProject({ ...newProject, name: e.target.value })}
          />

          <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">Color</label>
            <div className="flex gap-2">
              {PROJECT_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => setNewProject({ ...newProject, color })}
                  className={`w-8 h-8 rounded-full transition-transform ${
                    newProject.color === color ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' : ''
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">Description</label>
            <textarea
              value={newProject.description}
              onChange={(e) => setNewProject({ ...newProject, description: e.target.value })}
              className="w-full h-20 p-2 border border-gray-200 rounded-md text-sm resize-none"
              placeholder="Optional description..."
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setShowNewProject(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateProject} disabled={!newProject.name.trim()}>
              Create Project
            </Button>
          </div>
        </div>
      </Modal>

      {/* New Cycle Modal */}
      <Modal open={showNewCycle} onClose={() => setShowNewCycle(false)} title="New Cycle">
        <div className="space-y-4">
          <Input
            label="Name"
            placeholder="e.g., Week 1 Sprint"
            value={newCycle.name}
            onChange={(e) => setNewCycle({ ...newCycle, name: e.target.value })}
          />

          <Input
            label="Start Date"
            type="date"
            value={newCycle.startDate}
            onChange={(e) => setNewCycle({ ...newCycle, startDate: e.target.value })}
          />

          <Input
            label="End Date"
            type="date"
            value={newCycle.endDate}
            onChange={(e) => setNewCycle({ ...newCycle, endDate: e.target.value })}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setShowNewCycle(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCreateCycle}
              disabled={!newCycle.name.trim() || !newCycle.startDate || !newCycle.endDate}
            >
              Create Cycle
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ProjectsPage;
