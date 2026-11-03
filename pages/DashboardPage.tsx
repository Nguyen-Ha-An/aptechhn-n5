/**
 * Dashboard Page - Study OS Overview
 * Shows: Now, Today's tasks, Due reviews, Current cycle, Recent sessions
 */

import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGlobal } from '../context/GlobalContext';
import { useT, useLanguage } from '../i18n';
import { Card, StatCard, Button, Badge, Progress, EmptyState } from '../components/ui';
import {
  Timer,
  CheckSquare,
  GraduationCap,
  Target,
  TrendingUp,
  Calendar,
  Clock,
  Play,
  ArrowRight,
  Flame,
  BookOpen,
  Brain,
  ListTodo,
  FileText,
  Plus,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const { state, getActiveCycle, addNote } = useGlobal();
  const t = useT();
  const language = useLanguage();

  const today = new Date().toISOString().split('T')[0];

  // Get greeting based on time of day
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return t.dashboard.greetingMorning;
    if (hour < 17) return t.dashboard.greetingAfternoon;
    return t.dashboard.greetingEvening;
  }, [t]);

  // Format current date
  const formattedDate = useMemo(() => {
    return new Date().toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  }, [language]);

  // Calculate stats
  const stats = useMemo(() => {
    // Today's tasks
    const todayTasks = state.tasks.filter(
      (task) => task.status !== 'done' && task.dueDate === today
    );
    const inProgressTasks = state.tasks.filter((task) => task.status === 'in_progress');

    // Today's todos (not done)
    const todayTodos = state.todos
      .filter((todo) => !todo.done)
      .slice(0, 5);

    // Due flashcards
    const dueCards = state.decks.reduce((acc, deck) => {
      return acc + deck.cards.filter((c) => c.nextReviewDate <= today).length;
    }, 0);

    // Today's focus time
    const todayMinutes = state.sessions
      .filter((s) => s.startTime.split('T')[0] === today && s.type === 'focus')
      .reduce((acc, s) => acc + s.durationSeconds / 60, 0);

    // Weekly focus time
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const weekMinutes = state.sessions
      .filter(
        (s) => new Date(s.startTime) >= weekStart && s.type === 'focus'
      )
      .reduce((acc, s) => acc + s.durationSeconds / 60, 0);

    // Streak calculation
    const focusDates = [...new Set(
      state.sessions
        .filter((s) => s.type === 'focus')
        .map((s) => s.startTime.split('T')[0])
    )].sort().reverse();

    let streak = 0;
    if (focusDates.length > 0) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      if (focusDates[0] === today || focusDates[0] === yesterdayStr) {
        streak = 1;
        let currentDate = new Date(focusDates[0]);
        for (let i = 1; i < focusDates.length; i++) {
          currentDate.setDate(currentDate.getDate() - 1);
          if (focusDates[i] === currentDate.toISOString().split('T')[0]) {
            streak++;
          } else {
            break;
          }
        }
      }
    }

    // Average quiz score
    const quizSessions = state.sessions.filter((s) => s.quizScore !== null);
    const avgQuizScore = quizSessions.length > 0
      ? Math.round(quizSessions.reduce((acc, s) => acc + (s.quizScore || 0), 0) / quizSessions.length)
      : 0;

    return {
      todayTasks,
      inProgressTasks,
      todayTodos,
      dueCards,
      todayMinutes: Math.round(todayMinutes),
      weekMinutes: Math.round(weekMinutes),
      streak,
      avgQuizScore,
      totalSessions: state.sessions.filter((s) => s.type === 'focus').length,
    };
  }, [state, today]);

  const activeCycle = getActiveCycle();

  // Cycle progress
  const cycleProgress = useMemo(() => {
    if (!activeCycle) return { completed: 0, total: 0, percent: 0 };
    const cycleTasks = state.tasks.filter((task) => task.cycleId === activeCycle.id);
    const completed = cycleTasks.filter((task) => task.status === 'done').length;
    return {
      completed,
      total: cycleTasks.length,
      percent: cycleTasks.length > 0 ? Math.round((completed / cycleTasks.length) * 100) : 0,
    };
  }, [state.tasks, activeCycle]);

  // Recent sessions
  const recentSessions = state.sessions
    .filter((s) => s.type === 'focus')
    .slice(-5)
    .reverse();

  // Handle quick note
  const handleQuickNote = () => {
    navigate('/notes');
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Welcome Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {greeting}
          </h1>
          <p className="text-gray-500 mt-1">
            {formattedDate}
          </p>
        </div>
        <Button onClick={() => navigate('/timer')}>
          <Play className="w-4 h-4" />
          {t.dashboard.startFocusSession}
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label={t.dashboard.todaysFocus}
          value={`${stats.todayMinutes} ${t.common.min}`}
          icon={<Timer className="w-5 h-5" />}
        />
        <StatCard
          label={t.dashboard.currentStreak}
          value={`${stats.streak} ${t.common.days}`}
          icon={<Flame className="w-5 h-5 text-orange-500" />}
        />
        <StatCard
          label={t.dashboard.cardsDue}
          value={stats.dueCards}
          icon={<GraduationCap className="w-5 h-5" />}
        />
        <StatCard
          label={t.dashboard.avgQuizScore}
          value={`${stats.avgQuizScore}%`}
          icon={<Target className="w-5 h-5" />}
        />
      </div>

      {/* Main Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Today's Todos */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <ListTodo className="w-4 h-4 text-indigo-600" />
              {t.dashboard.todoToday}
            </h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/todo')}>
              {t.dashboard.viewAll}
              <ArrowRight className="w-3 h-3" />
            </Button>
          </div>

          {stats.todayTodos.length === 0 ? (
            <EmptyState
              icon={<ListTodo className="w-12 h-12" />}
              title={t.dashboard.noTodosToday}
              description={t.dashboard.addFirstTodo}
              action={{ label: t.todo.addFirstTodo, onClick: () => navigate('/todo') }}
            />
          ) : (
            <div className="space-y-2">
              {stats.todayTodos.map((todo) => (
                <div
                  key={todo.id}
                  className="flex items-center gap-3 p-2 rounded-md hover:bg-gray-50 cursor-pointer"
                  onClick={() => navigate('/todo')}
                >
                  <div className="w-2 h-2 rounded-full bg-indigo-500" />
                  <span className="flex-1 text-sm truncate">{todo.title}</span>
                  {todo.priority !== 'medium' && (
                    <Badge
                      variant={todo.priority === 'urgent' ? 'danger' : todo.priority === 'high' ? 'warning' : 'default'}
                      size="sm"
                    >
                      {t.todo.priority[todo.priority]}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Review Cards */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <GraduationCap className="w-4 h-4 text-green-600" />
              {t.dashboard.flashcardReview}
            </h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/flashcards')}>
              {t.common.review}
              <ArrowRight className="w-3 h-3" />
            </Button>
          </div>

          {stats.dueCards === 0 ? (
            <EmptyState
              icon={<Brain className="w-12 h-12" />}
              title={t.dashboard.allCaughtUp}
              description={t.dashboard.noFlashcardsDue}
            />
          ) : (
            <div className="space-y-4">
              <div className="text-center py-4">
                <p className="text-4xl font-bold text-green-600">{stats.dueCards}</p>
                <p className="text-sm text-gray-500">{t.dashboard.cardsDueToday}</p>
              </div>
              <Button fullWidth onClick={() => navigate('/flashcards')}>
                <BookOpen className="w-4 h-4" />
                {t.dashboard.startReviewSession}
              </Button>
            </div>
          )}
        </Card>

        {/* Current Cycle */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-purple-600" />
              {t.dashboard.currentCycle}
            </h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/projects')}>
              {t.dashboard.manage}
              <ArrowRight className="w-3 h-3" />
            </Button>
          </div>

          {activeCycle ? (
            <div className="space-y-4">
              <div>
                <p className="font-medium">{activeCycle.name}</p>
                <p className="text-xs text-gray-500">
                  {new Date(activeCycle.startDate).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US')} -{' '}
                  {new Date(activeCycle.endDate).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US')}
                </p>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">{t.dashboard.progress}</span>
                  <span className="font-medium">{cycleProgress.completed}/{cycleProgress.total} {t.dashboard.tasks}</span>
                </div>
                <Progress value={cycleProgress.percent} />
              </div>
            </div>
          ) : (
            <EmptyState
              icon={<Calendar className="w-12 h-12" />}
              title={t.dashboard.noActiveCycle}
              description={t.dashboard.createCycleDesc}
            />
          )}
        </Card>

        {/* Quick Note */}
        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-blue-600" />
              {t.dashboard.quickNoteCapture}
            </h2>
            <Button variant="ghost" size="sm" onClick={() => navigate('/notes')}>
              {t.dashboard.viewAll}
              <ArrowRight className="w-3 h-3" />
            </Button>
          </div>

          <div className="space-y-4">
            <p className="text-sm text-gray-500">{t.notes.subtitle}</p>
            <Button fullWidth variant="outline" onClick={handleQuickNote}>
              <Plus className="w-4 h-4" />
              {t.notes.newNote}
            </Button>
            <div className="text-center text-sm text-gray-400">
              {state.notes.length} {t.notes.title.toLowerCase()}
            </div>
          </div>
        </Card>
      </div>

      {/* Recent Sessions */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-600" />
            {t.dashboard.recentSessions}
          </h2>
          <Button variant="ghost" size="sm" onClick={() => navigate('/sessions')}>
            {t.dashboard.viewAll}
            <ArrowRight className="w-3 h-3" />
          </Button>
        </div>

        {recentSessions.length === 0 ? (
          <EmptyState
            icon={<Timer className="w-12 h-12" />}
            title={t.dashboard.noSessionsYet}
            description={t.dashboard.startSessionDesc}
            action={{ label: t.dashboard.startSession, onClick: () => navigate('/timer') }}
          />
        ) : (
          <div className="grid md:grid-cols-5 gap-3">
            {recentSessions.map((session) => (
              <div
                key={session.id}
                className="p-3 bg-gray-50 rounded-lg text-center hover:bg-gray-100 cursor-pointer"
                onClick={() => navigate('/sessions')}
              >
                <p className="text-lg font-bold text-gray-900">
                  {Math.round(session.durationSeconds / 60)}{t.common.min}
                </p>
                <p className="text-xs text-gray-500">{session.subject}</p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(session.startTime).toLocaleDateString(language === 'vi' ? 'vi-VN' : 'en-US', { weekday: 'short' })}
                </p>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Weekly Summary */}
      <Card className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              {t.dashboard.thisWeek}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {stats.weekMinutes} {t.dashboard.minutesFocused} {stats.totalSessions} {t.dashboard.sessionsText}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/analytics')}>
            {t.dashboard.viewAnalytics}
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default DashboardPage;
