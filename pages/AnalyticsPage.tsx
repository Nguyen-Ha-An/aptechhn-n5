/**
 * Analytics Page - Charts and Insights
 * Visualize focus patterns, progress, and achievements
 */

import React, { useMemo, useState } from 'react';
import { useGlobal } from '../context/GlobalContext';
import { Card, Badge, Progress } from '../components/ui';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  TrendingUp,
  Target,
  Clock,
  Flame,
  Award,
  Calendar,
  AlertTriangle,
  BookOpen,
  CheckCircle,
  Zap,
} from 'lucide-react';

type TimeRange = '7d' | '30d' | '90d' | 'all';

const CHART_COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e'];

export const AnalyticsPage: React.FC = () => {
  const { state } = useGlobal();
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');

  // Get date range
  const getDateRange = (range: TimeRange) => {
    const end = new Date();
    const start = new Date();
    switch (range) {
      case '7d':
        start.setDate(start.getDate() - 7);
        break;
      case '30d':
        start.setDate(start.getDate() - 30);
        break;
      case '90d':
        start.setDate(start.getDate() - 90);
        break;
      default:
        start.setFullYear(2020); // All time
    }
    return { start, end };
  };

  // Filter sessions by date range
  const filteredSessions = useMemo(() => {
    const { start, end } = getDateRange(timeRange);
    return state.sessions.filter((s) => {
      const date = new Date(s.startTime);
      return date >= start && date <= end;
    });
  }, [state.sessions, timeRange]);

  // Calculate overview stats
  const overviewStats = useMemo(() => {
    const focusSessions = filteredSessions.filter((s) => s.type === 'focus');
    const totalMinutes = focusSessions.reduce((acc, s) => acc + s.durationSeconds / 60, 0);
    const totalDistractions = focusSessions.reduce(
      (acc, s) => acc + (s.distractions?.length || 0),
      0
    );

    // Calculate streak
    const uniqueDays = Array.from(
      new Set(focusSessions.map((s) => s.startTime.split('T')[0]))
    ).sort().reverse();

    let streak = 0;
    if (uniqueDays.length > 0) {
      const today = new Date().toISOString().split('T')[0];
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      if (uniqueDays[0] === today || uniqueDays[0] === yesterdayStr) {
        streak = 1;
        let currentDate = new Date(uniqueDays[0]);
        for (let i = 1; i < uniqueDays.length; i++) {
          currentDate.setDate(currentDate.getDate() - 1);
          const expected = currentDate.toISOString().split('T')[0];
          if (uniqueDays[i] === expected) {
            streak++;
          } else {
            break;
          }
        }
      }
    }

    // Average session length
    const avgSession = focusSessions.length > 0 ? totalMinutes / focusSessions.length : 0;

    // Quiz average
    const quizSessions = filteredSessions.filter((s) => s.quizScore !== null);
    const avgQuiz = quizSessions.length > 0
      ? quizSessions.reduce((acc, s) => acc + (s.quizScore || 0), 0) / quizSessions.length
      : null;

    return {
      totalSessions: focusSessions.length,
      totalMinutes: Math.round(totalMinutes),
      totalHours: Math.round(totalMinutes / 60 * 10) / 10,
      avgSession: Math.round(avgSession),
      streak,
      totalDistractions,
      avgQuiz: avgQuiz !== null ? Math.round(avgQuiz) : null,
      tasksCompleted: state.tasks.filter((t) => t.status === 'done').length,
    };
  }, [filteredSessions, state.tasks]);

  // Daily focus chart data
  const dailyFocusData = useMemo(() => {
    const { start, end } = getDateRange(timeRange);
    const days: { [key: string]: number } = {};

    // Initialize all days in range
    const current = new Date(start);
    while (current <= end) {
      const key = current.toISOString().split('T')[0];
      days[key] = 0;
      current.setDate(current.getDate() + 1);
    }

    // Sum focus minutes per day
    filteredSessions
      .filter((s) => s.type === 'focus')
      .forEach((s) => {
        const key = s.startTime.split('T')[0];
        if (days[key] !== undefined) {
          days[key] += s.durationSeconds / 60;
        }
      });

    // Convert to chart format
    const data = Object.entries(days).map(([date, minutes]) => ({
      date: new Date(date).toLocaleDateString([], { month: 'short', day: 'numeric' }),
      fullDate: date,
      minutes: Math.round(minutes),
    }));

    // For longer ranges, aggregate by week
    if (timeRange === '90d' || timeRange === 'all') {
      const weeklyData: { [key: string]: { minutes: number; count: number } } = {};
      data.forEach((d) => {
        const weekStart = new Date(d.fullDate);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const key = weekStart.toISOString().split('T')[0];
        if (!weeklyData[key]) {
          weeklyData[key] = { minutes: 0, count: 0 };
        }
        weeklyData[key].minutes += d.minutes;
        weeklyData[key].count++;
      });
      return Object.entries(weeklyData).map(([date, val]) => ({
        date: new Date(date).toLocaleDateString([], { month: 'short', day: 'numeric' }),
        fullDate: date,
        minutes: Math.round(val.minutes),
      }));
    }

    return data;
  }, [filteredSessions, timeRange]);

  // Subject breakdown
  const subjectData = useMemo(() => {
    const subjects: { [key: string]: number } = {};

    filteredSessions
      .filter((s) => s.type === 'focus')
      .forEach((s) => {
        const subject = s.subject || 'General';
        if (!subjects[subject]) subjects[subject] = 0;
        subjects[subject] += s.durationSeconds / 60;
      });

    return Object.entries(subjects)
      .map(([name, minutes]) => ({
        name,
        minutes: Math.round(minutes),
        hours: Math.round(minutes / 60 * 10) / 10,
      }))
      .sort((a, b) => b.minutes - a.minutes)
      .slice(0, 6);
  }, [filteredSessions]);

  // Distraction breakdown
  const distractionData = useMemo(() => {
    const categories: { [key: string]: number } = {};

    filteredSessions
      .filter((s) => s.type === 'focus' && s.distractions)
      .forEach((s) => {
        s.distractions!.forEach((d) => {
          if (!categories[d.category]) categories[d.category] = 0;
          categories[d.category]++;
        });
      });

    return Object.entries(categories)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [filteredSessions]);

  // Achievements unlocked
  const unlockedAchievements = state.achievements.filter((a) => a.unlockedAt);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-indigo-600" />
            Analytics
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Track your study patterns and progress
          </p>
        </div>

        {/* Time Range Selector */}
        <div className="flex gap-2">
          {(['7d', '30d', '90d', 'all'] as TimeRange[]).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                timeRange === range
                  ? 'bg-indigo-100 text-indigo-700 font-medium'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {range === '7d' && '7 Days'}
              {range === '30d' && '30 Days'}
              {range === '90d' && '90 Days'}
              {range === 'all' && 'All Time'}
            </button>
          ))}
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <Clock className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{overviewStats.totalHours}h</p>
              <p className="text-xs text-gray-500">Total Focus</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-teal-100 rounded-lg">
              <Target className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{overviewStats.totalSessions}</p>
              <p className="text-xs text-gray-500">Sessions</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Flame className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{overviewStats.streak}</p>
              <p className="text-xs text-gray-500">Day Streak</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{overviewStats.tasksCompleted}</p>
              <p className="text-xs text-gray-500">Tasks Done</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Daily Focus Chart */}
        <Card className="p-4">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            Focus Over Time
          </h3>
          <div className="h-64">
            {dailyFocusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyFocusData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 12, fill: '#9ca3af' }}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 12, fill: '#9ca3af' }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number) => [`${value} min`, 'Focus Time']}
                  />
                  <Bar
                    dataKey="minutes"
                    fill="#6366f1"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                No data for this period
              </div>
            )}
          </div>
        </Card>

        {/* Subject Distribution */}
        <Card className="p-4">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-gray-400" />
            Time by Subject
          </h3>
          <div className="h-64">
            {subjectData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={subjectData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="minutes"
                  >
                    {subjectData.map((entry, index) => (
                      <Cell
                        key={entry.name}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#fff',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                    }}
                    formatter={(value: number, name: string, props: { payload: { hours: number } }) => [
                      `${props.payload.hours}h`,
                      name,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-gray-400">
                No data for this period
              </div>
            )}
          </div>
          {/* Legend */}
          {subjectData.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-4">
              {subjectData.map((subject, index) => (
                <div key={subject.name} className="flex items-center gap-1.5 text-xs">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }}
                  />
                  <span className="text-gray-600">{subject.name}</span>
                  <span className="text-gray-400">({subject.hours}h)</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Distractions */}
        <Card className="p-4">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            Distractions
          </h3>
          {distractionData.length > 0 ? (
            <div className="space-y-3">
              {distractionData.map((item) => (
                <div key={item.name} className="flex items-center justify-between">
                  <span className="text-sm text-gray-700">{item.name}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-24">
                      <Progress
                        value={item.count}
                        max={Math.max(...distractionData.map((d) => d.count))}
                        color="warning"
                      />
                    </div>
                    <span className="text-sm text-gray-500 w-8 text-right">{item.count}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-32 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <Zap className="w-8 h-8 mx-auto mb-2 text-green-400" />
                <p>No distractions logged!</p>
              </div>
            </div>
          )}
        </Card>

        {/* Achievements */}
        <Card className="p-4">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Award className="w-4 h-4 text-yellow-500" />
            Achievements
          </h3>
          <div className="space-y-3">
            {state.achievements.slice(0, 5).map((achievement) => {
              const unlocked = !!achievement.unlockedAt;
              return (
                <div
                  key={achievement.id}
                  className={`flex items-center gap-3 p-2 rounded-lg ${
                    unlocked ? 'bg-yellow-50' : 'bg-gray-50 opacity-60'
                  }`}
                >
                  <span className="text-2xl">{achievement.icon}</span>
                  <div className="flex-1">
                    <p className={`text-sm font-medium ${unlocked ? 'text-gray-900' : 'text-gray-500'}`}>
                      {achievement.name}
                    </p>
                    <p className="text-xs text-gray-400">{achievement.description}</p>
                  </div>
                  {unlocked && (
                    <Badge variant="success" size="sm">Unlocked</Badge>
                  )}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-gray-400 text-center mt-4">
            {unlockedAchievements.length} of {state.achievements.length} unlocked
          </p>
        </Card>
      </div>

      {/* Insights */}
      <Card className="p-4">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Zap className="w-4 h-4 text-indigo-500" />
          Insights
        </h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div className="bg-indigo-50 rounded-lg p-4">
            <p className="text-sm text-indigo-700 font-medium mb-1">Average Session</p>
            <p className="text-2xl font-bold text-indigo-900">{overviewStats.avgSession} min</p>
            <p className="text-xs text-indigo-600 mt-1">
              {overviewStats.avgSession >= 25 ? 'Great focus duration!' : 'Try longer sessions for deeper focus'}
            </p>
          </div>

          <div className="bg-teal-50 rounded-lg p-4">
            <p className="text-sm text-teal-700 font-medium mb-1">Quiz Performance</p>
            <p className="text-2xl font-bold text-teal-900">
              {overviewStats.avgQuiz !== null ? `${overviewStats.avgQuiz}%` : 'N/A'}
            </p>
            <p className="text-xs text-teal-600 mt-1">
              {overviewStats.avgQuiz !== null && overviewStats.avgQuiz >= 80
                ? 'Excellent retention!'
                : 'Keep practicing to improve'}
            </p>
          </div>

          <div className="bg-purple-50 rounded-lg p-4">
            <p className="text-sm text-purple-700 font-medium mb-1">Focus Efficiency</p>
            <p className="text-2xl font-bold text-purple-900">
              {overviewStats.totalSessions > 0
                ? Math.round(
                    100 - (overviewStats.totalDistractions / overviewStats.totalSessions) * 10
                  )
                : 100}%
            </p>
            <p className="text-xs text-purple-600 mt-1">
              {overviewStats.totalDistractions === 0
                ? 'Perfect focus!'
                : `${overviewStats.totalDistractions} distractions logged`}
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default AnalyticsPage;
