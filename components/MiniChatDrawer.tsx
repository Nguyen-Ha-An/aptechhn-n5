/**
 * Mini Chat Drawer - Compact AI Chat for use during study sessions
 */

import React, { useState, useRef, useEffect } from 'react';
import { useGlobal } from '../context/GlobalContext';
import { useT, useLanguage } from '../i18n';
import { sendChatMessage } from '../lib/ai/geminiClient';
import { Button, Drawer } from './ui';
import { ChatMessage } from '../types';
import {
  Send,
  Loader2,
  User,
  Bot,
  Lightbulb,
  Brain,
} from 'lucide-react';

export const MiniChatDrawer: React.FC = () => {
  const {
    state,
    miniChatOpen,
    setMiniChatOpen,
    addConversation,
    addMessageToConversation,
    getActiveConversation,
    getConversationMessages,
    showToast,
  } = useGlobal();
  const t = useT();
  const language = useLanguage();

  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const activeConversation = getActiveConversation();
  const messages = getConversationMessages(activeConversation?.id || null).slice(-20);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, miniChatOpen]);

  // Quick actions for mini chat
  const quickActions = [
    { id: 'explain', label: t.chat.explainConcept, icon: <Lightbulb className="w-3 h-3" /> },
    { id: 'quiz', label: t.chat.quizMe, icon: <Brain className="w-3 h-3" /> },
  ];

  const buildContext = (): string => {
    const parts: string[] = [];
    if (state.settings.userName) {
      parts.push(`Student: ${state.settings.userName}`);
    }
    const recentSession = state.sessions.filter((s) => s.type === 'focus').slice(-1)[0];
    if (recentSession) {
      parts.push(`Currently studying: ${recentSession.subject}`);
    }
    return parts.join('\n');
  };

  const handleSendMessage = async (message?: string) => {
    const text = message || inputValue.trim();
    if (!text || isLoading) return;

    setInputValue('');

    let convId = state.chat.activeConversationId;
    if (!convId) {
      const conv = addConversation(text.slice(0, 30) + (text.length > 30 ? '...' : ''));
      convId = conv.id;
    }

    addMessageToConversation(convId, { role: 'user', content: text });
    setIsLoading(true);

    try {
      const context = buildContext();
      const chatMessages = (state.chat.messagesByConvId[convId] || []).map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));
      chatMessages.push({ role: 'user', content: text });

      const response = await sendChatMessage(chatMessages, { language, context });

      addMessageToConversation(convId, { role: 'assistant', content: response });
    } catch (error) {
      console.error('[AI] sendChat failed', error);
      addMessageToConversation(convId, { role: 'assistant', content: t.chat.aiUnreachableToast });
      showToast(t.chat.aiUnreachableToast, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!miniChatOpen) return null;

  return (
    <Drawer open={miniChatOpen} onClose={() => setMiniChatOpen(false)} title={t.chat.miniChat} width="md">
      <div className="flex flex-col h-full">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {messages.length === 0 ? (
            <div className="text-center py-8">
              <Bot className="w-10 h-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">{t.chat.startConversation}</p>
            </div>
          ) : (
            messages.map((message) => (
              <MiniMessageBubble key={message.id} message={message} />
            ))
          )}
          {isLoading && (
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-xs">{t.chat.generating}</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions */}
        <div className="px-3 py-2 border-t border-gray-100 flex gap-2">
          {quickActions.map((action) => (
            <button
              key={action.id}
              onClick={() => handleSendMessage(action.label)}
              disabled={isLoading}
              className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-full hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="p-3 border-t border-gray-200 bg-gray-50">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t.chat.typeMessage}
              className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
            <Button
              onClick={() => handleSendMessage()}
              disabled={!inputValue.trim() || isLoading}
              size="md"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </div>
    </Drawer>
  );
};

// Mini Message Bubble
interface MiniMessageBubbleProps {
  message: ChatMessage;
}

const MiniMessageBubble: React.FC<MiniMessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';

  return (
    <div className={`flex gap-2 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div
        className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${
          isUser ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-200 text-gray-600'
        }`}
      >
        {isUser ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
      </div>
      <div
        className={`max-w-[80%] px-3 py-2 rounded-lg text-sm ${
          isUser
            ? 'bg-indigo-600 text-white'
            : 'bg-white border border-gray-200 text-gray-800'
        }`}
      >
        <p className="whitespace-pre-wrap text-xs">{message.content}</p>
      </div>
    </div>
  );
};

export default MiniChatDrawer;
