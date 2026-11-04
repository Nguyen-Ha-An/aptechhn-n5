import { useState, useRef, useEffect, useCallback } from 'react';
import ReactMarkdown from 'react-markdown';
import { useQueryClient } from '@tanstack/react-query';
import { useMessages } from './queries';
import { streamChat, type ChatStreamErrorType } from './streamChat';
import { ChatComposer } from './ChatComposer';
import { Button, ErrorState, Skeleton } from '@/components/ui';
import { qk } from '@/lib/queryKeys';

interface PendingMessage {
  content: string;
  attachNoteIds: string[];
  includeToday: boolean;
}

interface ChatThreadProps {
  conversationId: string;
  className?: string;
}

export function ChatThread({ conversationId, className = '' }: ChatThreadProps) {
  const queryClient = useQueryClient();
  const { data: messages, isLoading, isError, error, refetch } = useMessages(conversationId);

  const [composerKey, setComposerKey] = useState(0);
  const [initialComposerMessage, setInitialComposerMessage] = useState('');

  const [pendingMessage, setPendingMessage] = useState<PendingMessage | null>(null);
  const [streamingText, setStreamingText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamError, setStreamError] = useState<ChatStreamErrorType | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);
  const scrollEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    if (typeof scrollEndRef.current?.scrollIntoView === 'function') {
      scrollEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, streamingText, pendingMessage, scrollToBottom]);

  // Cleanup abort controller on unmount or conversation change
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, [conversationId]);

  const executeSend = async (msg: PendingMessage) => {
    setPendingMessage(msg);
    setStreamingText('');
    setStreamError(null);
    setIsStreaming(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      await streamChat({
        conversationId,
        message: msg.content,
        attachNoteIds: msg.attachNoteIds,
        includeToday: msg.includeToday,
        signal: controller.signal,
        onDelta: (delta) => {
          setStreamingText((prev) => prev + delta);
        },
        onDone: () => {
          queryClient.invalidateQueries({ queryKey: qk.messages(conversationId) });
          queryClient.invalidateQueries({ queryKey: qk.conversations });
          setPendingMessage(null);
          setStreamingText('');
          setIsStreaming(false);
        },
      });
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') {
        setIsStreaming(false);
        return;
      }
      const errType = (err as { type?: ChatStreamErrorType })?.type ?? 'network';
      setStreamError(errType);
      setIsStreaming(false);
    } finally {
      abortControllerRef.current = null;
    }
  };

  const handleSend = (content: string, attachNoteIds: string[], includeToday: boolean) => {
    executeSend({ content, attachNoteIds, includeToday });
  };

  const handleRetry = () => {
    if (!pendingMessage) return;
    executeSend(pendingMessage);
  };

  const handleStop = () => {
    abortControllerRef.current?.abort();
    setIsStreaming(false);
  };

  const handleSelectExamplePrompt = (prompt: string) => {
    setInitialComposerMessage(prompt);
    setComposerKey((k) => k + 1);
  };

  if (isLoading) {
    return (
      <div className={`flex flex-col h-full p-4 space-y-4 ${className}`}>
        <Skeleton rows={3} />
        <Skeleton rows={4} />
      </div>
    );
  }

  if (isError) {
    return (
      <div className={`flex flex-col h-full p-4 ${className}`}>
        <ErrorState
          title="Could not load messages"
          message={error instanceof Error ? error.message : 'Please check your connection.'}
          onRetry={() => refetch()}
        />
      </div>
    );
  }

  const messageList = messages ?? [];
  const isEmpty = messageList.length === 0 && !pendingMessage;

  return (
    <div className={`flex flex-col h-full bg-paper ${className}`}>
      {/* Scrollable message thread */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {isEmpty ? (
          <div className="flex flex-col items-center justify-center h-full min-h-[240px] text-center my-auto p-4">
            <p className="max-w-md font-serif text-base text-ink mb-4">
              Ask about your notes, plan your day, or get an explanation.
            </p>
            <div className="flex flex-col sm:flex-row flex-wrap justify-center gap-2 max-w-lg">
              <Button
                variant="secondary"
                size="sm"
                onClick={() =>
                  handleSelectExamplePrompt('Make a study plan for today from my todos')
                }
              >
                Make a study plan for today from my todos
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleSelectExamplePrompt('Summarize the pages I attach')}
              >
                Summarize the pages I attach
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => handleSelectExamplePrompt('Quiz me on the attached page')}
              >
                Quiz me on the attached page
              </Button>
            </div>
          </div>
        ) : (
          <>
            {messageList.map((msg) => {
              const isUser = msg.role === 'user';
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`rounded-[6px] p-3 text-sm max-w-[85%] ${
                      isUser
                        ? 'bg-surface text-ink whitespace-pre-wrap'
                        : 'text-ink leading-relaxed'
                    }`}
                  >
                    {isUser ? (
                      msg.content
                    ) : (
                      <MarkdownContent content={msg.content} />
                    )}
                  </div>
                </div>
              );
            })}

            {/* Pending User Message */}
            {pendingMessage && (
              <div className="flex flex-col items-end">
                <div className="rounded-[6px] bg-surface p-3 text-sm text-ink max-w-[85%] whitespace-pre-wrap">
                  {pendingMessage.content}
                </div>

                {/* Error displayed inline under user's pending message */}
                {streamError && (
                  <div className="mt-2 flex flex-col items-end gap-1.5 text-xs text-danger">
                    {streamError === 'quota' ? (
                      <p>You have reached today's AI limit. It resets at midnight.</p>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span>The reply failed.</span>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={handleRetry}
                        >
                          Retry
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Streaming Assistant Response */}
            {isStreaming && (
              <div className="flex flex-col items-start">
                <div className="rounded-[6px] p-3 text-sm text-ink leading-relaxed max-w-[85%]">
                  {streamingText ? (
                    <MarkdownContent content={streamingText} />
                  ) : (
                    <span className="text-xs text-muted animate-pulse">Thinking...</span>
                  )}
                </div>
              </div>
            )}
          </>
        )}
        <div ref={scrollEndRef} />
      </div>

      {/* Composer */}
      <ChatComposer
        key={composerKey}
        initialMessage={initialComposerMessage}
        onSend={handleSend}
        onStop={handleStop}
        isStreaming={isStreaming}
      />
    </div>
  );
}

function MarkdownContent({ content }: { content: string }) {
  return (
    <div className="space-y-2 text-sm leading-relaxed break-words">
      <ReactMarkdown
        components={{
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="text-accent underline underline-offset-2 hover:opacity-80"
            >
              {children}
            </a>
          ),
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="mb-2 list-disc pl-5 space-y-1">{children}</ul>,
          ol: ({ children }) => <ol className="mb-2 list-decimal pl-5 space-y-1">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          code: ({ children, className }) => {
            const isBlock = className?.includes('language-');
            return isBlock ? (
              <pre className="overflow-x-auto rounded-[6px] border border-rule bg-surface p-2.5 font-mono text-xs my-2">
                <code>{children}</code>
              </pre>
            ) : (
              <code className="rounded border border-rule bg-surface px-1.5 py-0.5 font-mono text-xs">
                {children}
              </code>
            );
          },
          blockquote: ({ children }) => (
            <blockquote className="border-l-2 border-rule pl-3 italic text-muted my-2">
              {children}
            </blockquote>
          ),
          h1: ({ children }) => (
            <h1 className="font-serif text-lg font-semibold mt-3 mb-1 text-ink">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="font-serif text-base font-semibold mt-2.5 mb-1 text-ink">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="font-serif text-sm font-semibold mt-2 mb-1 text-ink">{children}</h3>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
