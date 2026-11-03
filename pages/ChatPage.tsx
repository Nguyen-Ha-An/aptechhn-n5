/**
 * AI Chat Page - Study Assistant with Context Awareness
 * Notion/Linear-inspired UI with conversation management
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useGlobal } from '../context/GlobalContext';
import { useT, useLanguage } from '../i18n';
import { sendChatMessage } from '../lib/ai/geminiClient';
import { Button, Badge, Input, Modal, Toggle } from '../components/ui';
import { Conversation, ChatMessage, ChatContextOptions } from '../types';
import {
  MessageCircle,
  Plus,
  Search,
  Send,
  Trash2,
  Edit3,
  User,
  Bot,
  Lightbulb,
  HelpCircle,
  FileText,
  Brain,
  CheckSquare,
  Clock,
  Target,
  MoreHorizontal,
  Loader2,
  Copy,
  RotateCcw,
} from 'lucide-react';

export const ChatPage: React.FC = () => {
  const {
    state,
    addConversation,
    updateConversation,
    deleteConversation,
    setActiveConversation,
    addMessageToConversation,
    getActiveConversation,
    getConversationMessages,
    showToast,
  } = useGlobal();
  const t = useT();
  const language = useLanguage();

  // Local state
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [showRenameModal, setShowRenameModal] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [retryInfo, setRetryInfo] = useState<{
    conversationId: string;
    userMessage: string;
    assistantMessageId: string;
  } | null>(null);
  const [contextOptions, setContextOptions] = useState<ChatContextOptions>({
    includeTasks: true,
    includeProject: true,
    includeQuizMistakes: true,
    includeDistractions: false,
    includeNotes: false,
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const activeConversation = getActiveConversation();
  const activeMessages = getConversationMessages(activeConversation?.id || null);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeMessages.length]);

  // Group conversations by date
  const groupedConversations = useMemo(() => {
    const now = new Date();
    const today = now.toDateString();
    const yesterday = new Date(now.setDate(now.getDate() - 1)).toDateString();

    const groups: { today: Conversation[]; yesterday: Conversation[]; older: Conversation[] } = {
      today: [],
      yesterday: [],
      older: [],
    };

    const filtered = searchQuery
      ? state.chat.conversations.filter((c) => {
        const matchesTitle = c.title.toLowerCase().includes(searchQuery.toLowerCase());
        const messages = state.chat.messagesByConvId[c.id] || [];
        const matchesMessage = messages.some((m) =>
          m.content.toLowerCase().includes(searchQuery.toLowerCase())
        );
        return matchesTitle || matchesMessage;
      })
      : state.chat.conversations;

    filtered.forEach((conv) => {
      const convDate = new Date(conv.updatedAt).toDateString();
      if (convDate === today) {
        groups.today.push(conv);
      } else if (convDate === yesterday) {
        groups.yesterday.push(conv);
      } else {
        groups.older.push(conv);
      }
    });

    return groups;
  }, [state.chat.conversations, state.chat.messagesByConvId, searchQuery]);

  // Build context string
  const buildContext = (): string => {
    const parts: string[] = [];

    if (state.settings.userName) {
      parts.push(`Student name: ${state.settings.userName}`);
    }

    parts.push(`Preferred language: ${language === 'vi' ? 'Vietnamese' : 'English'}`);

    if (contextOptions.includeTasks) {
      const todayTasks = state.tasks
        .filter((t) => t.status !== 'done')
        .slice(0, 5)
        .map((t) => `- ${t.title}${t.projectId ? ` (${state.projects.find((p) => p.id === t.projectId)?.name})` : ''}`);
      if (todayTasks.length > 0) {
        parts.push(`Today's tasks:\n${todayTasks.join('\n')}`);
      }
    }

    const activeTask = state.tasks.find((t) => t.status === 'in_progress');
    if (activeTask) {
      parts.push(`Active task: ${activeTask.title}`);
    }

    const todayTodos = state.todos.filter((todo) => !todo.done).slice(0, 5);
    if (todayTodos.length > 0) {
      parts.push(`Today's todos:\n${todayTodos.map((todo) => `- ${todo.title}`).join('\n')}`);
    }

    if (contextOptions.includeProject) {
      const recentSession = state.sessions.filter((s) => s.type === 'focus').slice(-1)[0];
      if (recentSession) {
        parts.push(`Currently studying: ${recentSession.subject}`);
      }
    }

    if (contextOptions.includeQuizMistakes) {
      const recentSessions = state.sessions.filter((s) => s.quizScore !== null && s.quizScore < 100).slice(-3);
      const wrongSubjects = [...new Set(recentSessions.map((s) => s.subject))];
      if (wrongSubjects.length > 0) {
        parts.push(`Subjects needing review: ${wrongSubjects.join(', ')}`);
      }
    }

    if (contextOptions.includeDistractions) {
      const recentDistractions = state.sessions
        .flatMap((s) => s.distractions)
        .slice(-5)
        .map((d) => d.category);
      const uniqueDistractions = [...new Set(recentDistractions)];
      if (uniqueDistractions.length > 0) {
        parts.push(`Recent distractions: ${uniqueDistractions.join(', ')}`);
      }
    }

    return parts.join('\n\n');
  };

  // Quick action handlers
  const quickActions = [
    { id: 'explain', label: t.chat.explainConcept, icon: <Lightbulb className="w-4 h-4" /> },
    { id: 'plan', label: t.chat.studyPlan, icon: <Clock className="w-4 h-4" /> },
    { id: 'questions', label: t.chat.practiceQuestions, icon: <HelpCircle className="w-4 h-4" /> },
    { id: 'summarize', label: t.chat.summarizeNotes, icon: <FileText className="w-4 h-4" /> },
    { id: 'quiz', label: t.chat.quizMe, icon: <Brain className="w-4 h-4" /> },
  ];

  const handleQuickAction = async (actionId: string) => {
    const action = quickActions.find((a) => a.id === actionId);
    if (!action) return;

    let convId = state.chat.activeConversationId;
    if (!convId) {
      const conv = addConversation(action.label);
      convId = conv.id;
    }

    // Add user message
    addMessageToConversation(convId, {
      role: 'user',
      content: action.label,
    });

    setIsLoading(true);

    try {
      const context = buildContext();
      const messages = (state.chat.messagesByConvId[convId] || []).map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));
      messages.push({ role: 'user', content: action.label });

      const response = await sendChatMessage(messages, { language, context });

      addMessageToConversation(convId, {
        role: 'assistant',
        content: response,
      });
      setRetryInfo(null);
    } catch (error) {
      console.error('[AI] sendChat failed', error);
      const errorMessage = addMessageToConversation(convId, {
        role: 'assistant',
        content: t.chat.aiUnreachableToast,
      });
      setRetryInfo({
        conversationId: convId,
        userMessage: action.label,
        assistantMessageId: errorMessage.id,
      });
      showToast(t.chat.aiUnreachableToast, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const message = inputValue.trim();
    setInputValue('');

    let convId = state.chat.activeConversationId;
    if (!convId) {
      const conv = addConversation(message.slice(0, 30) + (message.length > 30 ? '...' : ''));
      convId = conv.id;
    }

    // Add user message
    addMessageToConversation(convId, {
      role: 'user',
      content: message,
    });

    setIsLoading(true);

    try {
      const context = buildContext();
      const messages = (state.chat.messagesByConvId[convId] || []).map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));
      messages.push({ role: 'user', content: message });

      const response = await sendChatMessage(messages, { language, context });

      const assistantMessage = addMessageToConversation(convId, {
        role: 'assistant',
        content: response,
      });

      // Update conversation title if first message
      const conv = state.chat.conversations.find((c) => c.id === convId);
      const messageCount = (state.chat.messagesByConvId[convId]?.length || 0) + 1;
      if (conv && messageCount <= 1) {
        updateConversation(convId, { title: message.slice(0, 40) + (message.length > 40 ? '...' : '') });
      }

      setRetryInfo(null);
    } catch (error) {
      console.error('[AI] sendChat failed', error);
      const errorMessage = addMessageToConversation(convId, {
        role: 'assistant',
        content: t.chat.aiUnreachableToast,
      });
      setRetryInfo({
        conversationId: convId,
        userMessage: message,
        assistantMessageId: errorMessage.id,
      });
      showToast(t.chat.aiUnreachableToast, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = async () => {
    if (!retryInfo || isLoading) return;
    setIsLoading(true);
    try {
      const context = buildContext();
      const messages = (state.chat.messagesByConvId[retryInfo.conversationId] || []).map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));
      messages.push({ role: 'user', content: retryInfo.userMessage });
      const response = await sendChatMessage(messages, { language, context });
      addMessageToConversation(retryInfo.conversationId, {
        role: 'assistant',
        content: response,
      });
      setRetryInfo(null);
    } catch (error) {
      console.error('[AI] sendChat failed', error);
      const errorMessage = addMessageToConversation(retryInfo.conversationId, {
        role: 'assistant',
        content: t.chat.aiUnreachableToast,
      });
      setRetryInfo({
        conversationId: retryInfo.conversationId,
        userMessage: retryInfo.userMessage,
        assistantMessageId: errorMessage.id,
      });
      showToast(t.chat.aiUnreachableToast, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleNewChat = () => {
    addConversation(t.chat.newChat);
  };

  const handleDeleteChat = (id: string) => {
    deleteConversation(id);
    setShowDeleteModal(null);
    showToast(t.chat.deleteChat, 'success');
  };

  const handleRenameChat = () => {
    if (showRenameModal && renameValue.trim()) {
      updateConversation(showRenameModal, { title: renameValue.trim() });
      setShowRenameModal(null);
      setRenameValue('');
    }
  };

  // Calculate context data for panel
  const todayTasks = state.tasks.filter((t) => t.status !== 'done').slice(0, 5);
  const todayTodos = state.todos.filter((todo) => !todo.done).slice(0, 5);
  const activeTask = state.tasks.find((t) => t.status === 'in_progress') || null;
  const flashcardsDue = state.decks.reduce((acc, deck) => {
    const today = new Date().toISOString().split('T')[0];
    return acc + deck.cards.filter((c) => c.nextReviewDate <= today).length;
  }, 0);
  const recentSessions = state.sessions.filter((s) => s.type === 'focus').slice(-3);
  const wrongTopics = [...new Set(
    state.sessions
      .filter((s) => s.quizScore !== null && s.quizScore < 70)
      .slice(-5)
      .map((s) => s.subject)
  )];
  const recentDistractions = [...new Set(
    state.sessions
      .flatMap((s) => s.distractions)
      .slice(-10)
      .map((d) => d.category)
  )];

  return (
    <div className="h-full flex">
      {/* Conversation List (Left Panel) */}
      <div className="w-64 border-r border-gray-200 flex flex-col bg-gray-50">
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <Button onClick={handleNewChat} fullWidth>
            <Plus className="w-4 h-4" />
            {t.chat.newChat}
          </Button>
        </div>

        {/* Search */}
        <div className="p-3">
          <Input
            icon={<Search className="w-4 h-4" />}
            placeholder={t.chat.searchChats}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto px-2 pb-4">
          {groupedConversations.today.length > 0 && (
            <div className="mb-4">
              <p className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase">{t.chat.today}</p>
              {groupedConversations.today.map((conv) => (
                <ConversationItem
                  key={conv.id}
                  conversation={conv}
                  isActive={conv.id === state.chat.activeConversationId}
                  onClick={() => setActiveConversation(conv.id)}
                  onDelete={() => setShowDeleteModal(conv.id)}
                  onRename={() => {
                    setRenameValue(conv.title);
                    setShowRenameModal(conv.id);
                  }}
                />
              ))}
            </div>
          )}

          {groupedConversations.yesterday.length > 0 && (
            <div className="mb-4">
              <p className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase">{t.chat.yesterday}</p>
              {groupedConversations.yesterday.map((conv) => (
                <ConversationItem
                  key={conv.id}
                  conversation={conv}
                  isActive={conv.id === state.chat.activeConversationId}
                  onClick={() => setActiveConversation(conv.id)}
                  onDelete={() => setShowDeleteModal(conv.id)}
                  onRename={() => {
                    setRenameValue(conv.title);
                    setShowRenameModal(conv.id);
                  }}
                />
              ))}
            </div>
          )}

          {groupedConversations.older.length > 0 && (
            <div className="mb-4">
              <p className="px-2 py-1 text-xs font-semibold text-gray-500 uppercase">{t.chat.older}</p>
              {groupedConversations.older.map((conv) => (
                <ConversationItem
                  key={conv.id}
                  conversation={conv}
                  isActive={conv.id === state.chat.activeConversationId}
                  onClick={() => setActiveConversation(conv.id)}
                  onDelete={() => setShowDeleteModal(conv.id)}
                  onRename={() => {
                    setRenameValue(conv.title);
                    setShowRenameModal(conv.id);
                  }}
                />
              ))}
            </div>
          )}

          {state.chat.conversations.length === 0 && (
            <div className="text-center py-8 px-4">
              <MessageCircle className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">{t.chat.noChats}</p>
              <p className="text-xs text-gray-400 mt-1">{t.chat.startConversation}</p>
            </div>
          )}
        </div>
      </div>

      {/* Chat Area (Center) */}
      <div className="flex-1 flex flex-col">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {activeMessages.length === 0 ? (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="w-12 h-12 text-gray-200 mx-auto mb-3" />
                <p className="text-sm text-gray-500">{t.chat.startConversation}</p>
                <Button className="mt-4" onClick={handleNewChat}>
                  <Plus className="w-4 h-4" />
                  {t.chat.startNewChat}
                </Button>
              </div>
            </div>
          ) : (
            activeMessages.map((message) => (
              <MessageBubble
                key={message.id}
                message={message}
                showRetry={retryInfo?.assistantMessageId === message.id}
                onRetry={handleRetry}
              />
            ))
          )}
          {isLoading && (
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">{t.chat.generating}</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions */}
        <div className="px-4 py-2 border-t border-gray-100">
          <p className="text-xs font-medium text-gray-500 mb-2">{t.chat.quickActions}</p>
          <div className="flex flex-wrap gap-2">
            {quickActions.map((action) => (
              <button
                key={action.id}
                onClick={() => handleQuickAction(action.id)}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                {action.icon}
                {action.label}
              </button>
            ))}
          </div>
        </div>

        {/* Message Composer */}
        <div className="p-4 border-t border-gray-200 bg-white">
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t.chat.typeMessage}
              rows={2}
              className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading}
              size="lg"
            >
              {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            </Button>
          </div>
          <p className="text-xs text-gray-400 mt-1">
            {t.chat.enterToSend}
          </p>
        </div>
      </div>

      {/* Context Panel (Right) */}
      <div className="w-72 border-l border-gray-200 bg-gray-50 p-4 overflow-y-auto">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-indigo-500" />
          {t.chat.studyContext}
        </h3>

        {/* User Info */}
        {state.settings.userName && (
          <div className="mb-4 p-3 bg-white rounded-lg border border-gray-200">
            <p className="text-xs font-medium text-gray-500 mb-1">{t.chat.userInfo}</p>
            <p className="text-sm text-gray-900">{state.settings.userName}</p>
            <p className="text-xs text-gray-500">{language === 'vi' ? t.settings.vietnamese : t.settings.english}</p>
          </div>
        )}

        {/* Active Task */}
        <div className="mb-4 p-3 bg-white rounded-lg border border-gray-200">
          <p className="text-xs font-medium text-gray-500 mb-1">{t.chat.activeTask}</p>
          {activeTask ? (
            <p className="text-sm text-gray-700">{activeTask.title}</p>
          ) : (
            <p className="text-xs text-gray-400">{t.chat.noActiveTask}</p>
          )}
        </div>

        {/* Today's Todos */}
        <div className="mb-4">
          <p className="text-xs font-medium text-gray-500 mb-2">{t.chat.todayTodos}</p>
          <div className="space-y-1">
            {todayTodos.length > 0 ? (
              todayTodos.map((todo) => (
                <div key={todo.id} className="flex items-center gap-2 text-sm text-gray-700">
                  <CheckSquare className="w-3 h-3 text-gray-400" />
                  <span className="truncate">{todo.title}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-400">{t.chat.noTodos}</p>
            )}
          </div>
        </div>

        {/* Today's Tasks */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-500">{t.chat.todayTasksSummary}</p>
            <Toggle
              checked={contextOptions.includeTasks}
              onChange={(checked) => setContextOptions({ ...contextOptions, includeTasks: checked })}
            />
          </div>
          <div className="space-y-1">
            {todayTasks.length > 0 ? (
              todayTasks.map((task) => (
                <div key={task.id} className="flex items-center gap-2 text-sm text-gray-700">
                  <CheckSquare className="w-3 h-3 text-gray-400" />
                  <span className="truncate">{task.title}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-400">{t.chat.noTasks}</p>
            )}
          </div>
        </div>

        {/* Flashcards Due */}
        <div className="mb-4 p-3 bg-white rounded-lg border border-gray-200">
          <p className="text-xs font-medium text-gray-500 mb-1">{t.chat.flashcardsDue}</p>
          <p className="text-2xl font-bold text-indigo-600">{flashcardsDue}</p>
        </div>

        {/* Recent Sessions */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-500">{t.chat.recentSessions}</p>
            <Toggle
              checked={contextOptions.includeProject}
              onChange={(checked) => setContextOptions({ ...contextOptions, includeProject: checked })}
            />
          </div>
          <div className="space-y-2">
            {recentSessions.length > 0 ? (
              recentSessions.map((session) => (
                <div key={session.id} className="text-xs p-2 bg-white rounded border border-gray-200">
                  <p className="font-medium text-gray-700">{session.subject}</p>
                  <p className="text-gray-500">
                    {Math.round(session.durationSeconds / 60)} {t.common.min}
                    {session.quizScore !== null && ` • ${session.quizScore}%`}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-400">{t.chat.noRecentSessions}</p>
            )}
          </div>
        </div>

        {/* Wrong Topics */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-500">{t.chat.wrongTopics}</p>
            <Toggle
              checked={contextOptions.includeQuizMistakes}
              onChange={(checked) => setContextOptions({ ...contextOptions, includeQuizMistakes: checked })}
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {wrongTopics.length > 0 ? (
              wrongTopics.map((topic) => (
                <Badge key={topic} variant="warning" size="sm">{topic}</Badge>
              ))
            ) : (
              <p className="text-xs text-gray-400">{t.chat.none}</p>
            )}
          </div>
        </div>

        {/* Recent Distractions */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-gray-500">{t.chat.recentDistractions}</p>
            <Toggle
              checked={contextOptions.includeDistractions}
              onChange={(checked) => setContextOptions({ ...contextOptions, includeDistractions: checked })}
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {recentDistractions.length > 0 ? (
              recentDistractions.map((distraction) => (
                <Badge key={distraction} variant="danger" size="sm">{distraction}</Badge>
              ))
            ) : (
              <p className="text-xs text-gray-400">{t.chat.none}</p>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      <Modal
        open={!!showDeleteModal}
        onClose={() => setShowDeleteModal(null)}
        title={t.chat.deleteChat}
      >
        <p className="text-sm text-gray-600 mb-4">{t.chat.deleteConfirm}</p>
        <div className="flex gap-3">
          <Button variant="ghost" fullWidth onClick={() => setShowDeleteModal(null)}>
            {t.common.cancel}
          </Button>
          <Button variant="danger" fullWidth onClick={() => showDeleteModal && handleDeleteChat(showDeleteModal)}>
            {t.common.delete}
          </Button>
        </div>
      </Modal>

      {/* Rename Modal */}
      <Modal
        open={!!showRenameModal}
        onClose={() => setShowRenameModal(null)}
        title={t.chat.renameChat}
      >
        <Input
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          placeholder={t.chat.newChat}
          autoFocus
        />
        <div className="flex gap-3 mt-4">
          <Button variant="ghost" fullWidth onClick={() => setShowRenameModal(null)}>
            {t.common.cancel}
          </Button>
          <Button fullWidth onClick={handleRenameChat}>
            {t.common.save}
          </Button>
        </div>
      </Modal>
    </div>
  );
};

// Conversation List Item Component
interface ConversationItemProps {
  conversation: Conversation;
  isActive: boolean;
  onClick: () => void;
  onDelete: () => void;
  onRename: () => void;
}

const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  isActive,
  onClick,
  onDelete,
  onRename,
}) => {
  const [showMenu, setShowMenu] = useState(false);
  const t = useT();

  return (
    <div
      className={`group relative flex items-center gap-2 px-2 py-2 rounded-md cursor-pointer transition-colors ${
        isActive ? 'bg-indigo-100 text-indigo-700' : 'hover:bg-gray-200 text-gray-700'
      }`}
      onClick={onClick}
    >
      <MessageCircle className="w-4 h-4 flex-shrink-0" />
      <span className="flex-1 text-sm truncate">{conversation.title}</span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowMenu(!showMenu);
        }}
        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-300 rounded transition-opacity"
      >
        <MoreHorizontal className="w-4 h-4" />
      </button>

      {/* Dropdown Menu */}
      {showMenu && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
          <div className="absolute right-0 top-full mt-1 w-32 bg-white border border-gray-200 rounded-md shadow-lg z-20 py-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRename();
                setShowMenu(false);
              }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 flex items-center gap-2"
            >
              <Edit3 className="w-4 h-4" />
              {t.chat.rename}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
                setShowMenu(false);
              }}
              className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 text-red-600 flex items-center gap-2"
            >
              <Trash2 className="w-4 h-4" />
              {t.common.delete}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

const renderInlineMarkdown = (text: string) => {
  const parts: React.ReactNode[] = [];
  let remaining = text;
  const tokenRegex = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/;
  while (remaining.length > 0) {
    const match = remaining.match(tokenRegex);
    if (!match || match.index === undefined) {
      parts.push(remaining);
      break;
    }
    if (match.index > 0) {
      parts.push(remaining.slice(0, match.index));
    }
    const token = match[0];
    if (token.startsWith('**')) {
      parts.push(<strong key={`${token}-${parts.length}`}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith('`')) {
      parts.push(
        <code key={`${token}-${parts.length}`} className="px-1 py-0.5 rounded bg-gray-100 text-gray-800 text-xs">
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith('*')) {
      parts.push(<em key={`${token}-${parts.length}`}>{token.slice(1, -1)}</em>);
    }
    remaining = remaining.slice(match.index + token.length);
  }
  return parts;
};

const renderMarkdown = (content: string) => {
  return content.split('\n').map((line, i) => {
    if (line.startsWith('### ')) {
      return <h3 key={i} className="text-sm font-semibold mt-3 mb-2">{line.slice(4)}</h3>;
    }
    if (line.startsWith('## ')) {
      return <h2 key={i} className="text-base font-semibold mt-3 mb-2">{line.slice(3)}</h2>;
    }
    if (line.startsWith('# ')) {
      return <h1 key={i} className="text-lg font-semibold mt-3 mb-2">{line.slice(2)}</h1>;
    }
    if (line.startsWith('> ')) {
      return (
        <blockquote key={i} className="border-l-2 border-gray-300 pl-3 text-gray-600 italic">
          {renderInlineMarkdown(line.slice(2))}
        </blockquote>
      );
    }
    if (line.startsWith('- ')) {
      return (
        <p key={i} className="ml-4">
          • {renderInlineMarkdown(line.slice(2))}
        </p>
      );
    }
    if (line === '---') {
      return <hr key={i} className="my-3" />;
    }
    return (
      <p key={i} className="mb-2">
        {renderInlineMarkdown(line || '\u00A0')}
      </p>
    );
  });
};

// Message Bubble Component
interface MessageBubbleProps {
  message: ChatMessage;
  showRetry?: boolean;
  onRetry?: () => void;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ message, showRetry, onRetry }) => {
  const isUser = message.role === 'user';
  const t = useT();
  const { showToast } = useGlobal();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      showToast(t.chat.copySuccess, 'success');
    } catch (error) {
      showToast(t.common.error, 'error');
    }
  };

  return (
    <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
          isUser ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-200 text-gray-600'
        }`}
      >
        {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>
      <div className={`group max-w-[70%] ${isUser ? 'text-white' : 'text-gray-800'}`}>
        <div
          className={`px-4 py-3 rounded-lg ${
            isUser
              ? 'bg-indigo-600'
              : 'bg-white border border-gray-200'
          }`}
        >
          {isUser ? (
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
          ) : (
            <div className="text-sm space-y-1">{renderMarkdown(message.content)}</div>
          )}
          <p className={`text-xs mt-2 ${isUser ? 'text-indigo-200' : 'text-gray-400'}`}>
            {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
        {!isUser && (
          <div className="flex items-center gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleCopy}
              className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              <Copy className="w-3 h-3" />
              {t.chat.copy}
            </button>
            {showRetry && onRetry && (
              <button
                onClick={onRetry}
                className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                {t.chat.retry}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;
