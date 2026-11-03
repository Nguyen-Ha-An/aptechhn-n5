/**
 * Sessions Page - Focus Session History
 * View past sessions with filters and stats
 */

import React, { useState, useMemo } from 'react';
import { useGlobal } from '../context/GlobalContext';
import { Card, Button, Badge, EmptyState, Select } from '../components/ui';
import { Session } from '../types';
import {
  Clock,
  Calendar,
  Target,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Filter,
  TrendingUp,
  Timer,
} from 'lucide-react';

type TimeFilter = 'today' | 'week' | 'month' | 'all';
type SortOrder = 'newest' | 'oldest' | 'longest' | 'shortest';

export const SessionsPage: React.FC = () => {
  const { state } = useGlobal();

  const [timeFilter, setTimeFilter] = useState<TimeFilter>('week');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filter sessions by time range
  const filteredSessions = useMemo(() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    return state.sessions.filter((session) => {
      const sessionDate = new Date(session.startTime);

      switch (timeFilter) {
        case 'today':
          return sessionDate >= today;
        case 'week': {
          const weekAgo = new Date(today);
          weekAgo.setDate(weekAgo.getDate() - 7);
          return sessionDate >= weekAgo;
        }
        case 'month': {
          const monthAgo = new Date(today);
          monthAgo.setMonth(monthAgo.getMonth() - 1);
          return sessionDate >= monthAgo;
        }
        default:
          return true;
      }
    });
  }, [state.sessions, timeFilter]);

  // Sort sessions
  const sortedSessions = useMemo(() => {
    return [...filteredSessions].sort((a, b) => {
      switch (sortOrder) {
        case 'newest':
          return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
        case 'oldest':
          return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
        case 'longest':
          return b.durationSeconds - a.durationSeconds;
        case 'shortest':
          return a.durationSeconds - b.durationSeconds;
        default:
          return 0;
      }
    });
  }, [filteredSessions, sortOrder]);

  // Calculate stats for filtered sessions
  const stats = useMemo(() => {
    const focusSessions = filteredSessions.filter((s) => s.type === 'focus');
    const totalMinutes = focusSessions.reduce((acc, s) => acc + s.durationSeconds / 60, 0);
    const totalDistractions = focusSessions.reduce(
      (acc, s) => acc + (s.distractions?.length || 0),
      0
    );
    const avgDuration =
      focusSessions.length > 0 ? totalMinutes / focusSessions.length : 0;
    const quizSessions = filteredSessions.filter(
      (s) => s.type === 'quiz' && s.quizScore !== null
    );
    const avgScore =
      quizSessions.length > 0
        ? quizSessions.reduce((acc, s) => acc + (s.quizScore || 0), 0) / quizSessions.length
        : null;

    return {
      totalSessions: focusSessions.length,
      totalMinutes: Math.round(totalMinutes),
      avgDuration: Math.round(avgDuration),
      totalDistractions,
      avgQuizScore: avgScore !== null ? Math.round(avgScore) : null,
    };
  }, [filteredSessions]);

  // Format duration
  const formatDuration = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const h = Math.floor(m / 60);
    if (h > 0) {
      return `${h}h ${m % 60}m`;
    }
    return `${m}m`;
  };

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
    }
    return date.toLocaleDateString([], {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  // Get project name
  const getProjectName = (projectId: string | null) => {
    if (!projectId) return 'General';
    const project = state.projects.find((p) => p.id === projectId);
    return project?.name || 'Unknown';
  };

  // Get project color
  const getProjectColor = (projectId: string | null) => {
    if (!projectId) return '#6366f1';
    const project = state.projects.find((p) => p.id === projectId);
    return project?.color || '#6366f1';
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Clock className="w-6 h-6 text-indigo-600" />
            Session History
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Track your focus sessions and progress
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Target className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalSessions}</p>
              <p className="text-xs text-gray-500">Sessions</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 rounded-lg">
              <Timer className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalMinutes}</p>
              <p className="text-xs text-gray-500">Total minutes</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.avgDuration}</p>
              <p className="text-xs text-gray-500">Avg. duration</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.totalDistractions}</p>
              <p className="text-xs text-gray-500">Distractions</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500">Filter:</span>
        </div>
        <div className="flex gap-2">
          {(['today', 'week', 'month', 'all'] as TimeFilter[]).map((filter) => (
            <button
              key={filter}
              onClick={() => setTimeFilter(filter)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                timeFilter === filter
                  ? 'bg-indigo-100 text-indigo-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {filter === 'today' && 'Today'}
              {filter === 'week' && 'This Week'}
              {filter === 'month' && 'This Month'}
              {filter === 'all' && 'All Time'}
            </button>
          ))}
        </div>

        <div className="ml-auto">
          <Select
            options={[
              { value: 'newest', label: 'Newest First' },
              { value: 'oldest', label: 'Oldest First' },
              { value: 'longest', label: 'Longest First' },
              { value: 'shortest', label: 'Shortest First' },
            ]}
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as SortOrder)}
          />
        </div>
      </div>

      {/* Sessions List */}
      {sortedSessions.length === 0 ? (
        <EmptyState
          icon={<Clock className="w-12 h-12" />}
          title="No sessions found"
          description={
            timeFilter === 'all'
              ? 'Start your first focus session to track your progress'
              : 'No sessions in this time period'
          }
        />
      ) : (
        <div className="space-y-3">
          {sortedSessions.map((session) => {
            const isExpanded = expandedId === session.id;
            const hasDistractions =
              session.distractions && session.distractions.length > 0;

            return (
              <Card
                key={session.id}
                className={`transition-shadow ${isExpanded ? 'shadow-md' : ''}`}
              >
                <div
                  className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => setExpandedId(isExpanded ? null : session.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: getProjectColor(session.projectId) }}
                      />
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">
                            {session.subject || getProjectName(session.projectId)}
                          </span>
                          <Badge
                            variant={session.type === 'focus' ? 'primary' : 'secondary'}
                            size="sm"
                          >
                            {session.type}
                          </Badge>
                          {hasDistractions && (
                            <Badge variant="warning" size="sm">
                              {session.distractions!.length} distraction
                              {session.distractions!.length > 1 ? 's' : ''}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-500">
                          {formatDate(session.startTime)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          {formatDuration(session.durationSeconds)}
                        </p>
                        {session.quizScore !== null && (
                          <p className="text-xs text-gray-500">
                            Quiz: {session.quizScore}%
                          </p>
                        )}
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-2 border-t border-gray-100">
                    <div className="grid md:grid-cols-2 gap-4">
                      {/* Session Info */}
                      <div className="space-y-2">
                        <h4 className="text-sm font-medium text-gray-700">Details</h4>
                        <div className="text-sm space-y-1 text-gray-600">
                          <p>
                            <span className="text-gray-400">Started:</span>{' '}
                            {new Date(session.startTime).toLocaleString()}
                          </p>
                          <p>
                            <span className="text-gray-400">Ended:</span>{' '}
                            {new Date(session.endTime).toLocaleString()}
                          </p>
                          {session.linkedTaskId && (
                            <p>
                              <span className="text-gray-400">Linked Task:</span>{' '}
                              {state.tasks.find((t) => t.id === session.linkedTaskId)
                                ?.title || 'Unknown'}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Distractions */}
                      {hasDistractions && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-gray-700">
                            Distractions
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {session.distractions!.map((d) => (
                              <Badge key={d.id} variant="outline" size="sm">
                                {d.category}
                                {d.note && `: ${d.note}`}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Break Plan */}
                      {session.breakPlan && session.breakPlan.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-gray-700">
                            Break Plan
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {session.breakPlan.map((item, idx) => (
                              <Badge
                                key={idx}
                                variant={item.completed ? 'success' : 'default'}
                                size="sm"
                              >
                                {item.activity}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Notes */}
                      {session.notes && (
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium text-gray-700">Notes</h4>
                          <p className="text-sm text-gray-600">{session.notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default SessionsPage;
