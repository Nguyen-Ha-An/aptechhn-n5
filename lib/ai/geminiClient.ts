/**
 * Gemini AI Client for FocusLearn
 * Handles AI features with graceful degradation when API key is missing
 * Uses Gemini REST API via fetch.
 */

import { QuizData, QuizQuestion } from '../../types';
import { FALLBACK_QUIZZES, FALLBACK_FLASHCARDS } from '../../constants';

const DEFAULT_MODEL = 'gemini-2.5-flash';
const GEMINI_BASE_URL = 'https://generativelanguage.googleapis.com/v1beta/models';

// Toast callback for showing messages
let toastCallback: ((message: string, type: 'info' | 'error' | 'success') => void) | null = null;

export function setToastCallback(callback: typeof toastCallback) {
  toastCallback = callback;
}

function showToast(message: string, type: 'info' | 'error' | 'success' = 'info') {
  if (toastCallback) {
    toastCallback(message, type);
  } else {
    console.log(`[${type.toUpperCase()}] ${message}`);
  }
}

/**
 * Get Gemini API key from environment variables
 * Detects build tool (Vite/CRA/Next) and uses appropriate env access
 */
export function getApiKey(): string | null {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return (
      import.meta.env.VITE_GEMINI_API_KEY ||
      import.meta.env.VITE_GOOGLE_API_KEY ||
      import.meta.env.GEMINI_API_KEY ||
      null
    );
  }

  if (typeof process !== 'undefined' && process.env) {
    return (
      process.env.REACT_APP_GEMINI_API_KEY ||
      process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
      process.env.GEMINI_API_KEY ||
      null
    );
  }

  return null;
}

/**
 * Check if AI features are enabled
 */
export function isAiEnabled(): boolean {
  const key = getApiKey();
  return !!key && key.length > 0;
}

type GeminiMessage = {
  role: 'user' | 'model';
  parts: { text: string }[];
};

interface GeminiRequestOptions {
  model?: string;
  contents: GeminiMessage[];
  systemPrompt?: string;
  generationConfig?: {
    temperature?: number;
    maxOutputTokens?: number;
  };
}

async function requestGemini({ model = DEFAULT_MODEL, contents, systemPrompt, generationConfig }: GeminiRequestOptions) {
  const apiKey = getApiKey();
  const modelsToTry = [
    model,
    'gemini-2.5-flash',
    'gemini-2.0-flash',
    'gemini-1.5-flash',
  ].filter((value, index, array) => array.indexOf(value) === index);
  const keyParam = apiKey || '';
  const urlKeyLabel = keyParam ? '***' : '';

  if (!apiKey) {
    console.error('[AI] Missing API key from env at runtime');
  }

  const body = {
    contents,
    systemInstruction: systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined,
    generationConfig: generationConfig || {
      temperature: 0.6,
      maxOutputTokens: 800,
    },
  };

  for (const modelName of modelsToTry) {
    const requestUrl = `${GEMINI_BASE_URL}/${modelName}:generateContent?key=${keyParam}`;
    const logUrl = `${GEMINI_BASE_URL}/${modelName}:generateContent?key=${urlKeyLabel}`;
    console.log('[AI] request url', logUrl);

    const response = await fetch(requestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      console.log('[AI] model succeeded', { model: modelName });
      return response.json();
    }

    if (response.status === 404) {
      console.warn('[AI] model failed', { model: modelName, status: response.status });
      continue;
    }

    const errorText = await response.text();
    console.warn('[AI] model failed', { model: modelName, status: response.status });
    throw new Error(`Gemini request failed: ${response.status} ${errorText}`);
  }

  throw new Error('Gemini request failed: no available model responded');
}

function extractGeminiText(data: any): string {
  const parts = data?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return '';
  return parts.map((part: any) => part?.text || '').join('').trim();
}

function extractJson<T>(text: string): T | null {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1)) as T;
  } catch (error) {
    return null;
  }
}

function buildSystemPrompt(language: 'en' | 'vi' = 'en', context?: string): string {
  const langText = language === 'vi' ? 'Vietnamese' : 'English';
  return `You are FocusLearn, a study assistant. Respond in ${langText}. Be concise and practical.
When asked to explain, use simple examples. When asked for a plan, give time-boxed steps.
If the request is ambiguous, ask 1–2 clarifying questions.
Avoid medical or therapy advice. If asked, gently redirect to professional help.
${context ? `\nStudy context:\n${context}` : ''}`.trim();
}

/**
 * Generic JSON fetcher with error handling and retry
 */
async function callGeminiJson<T>(prompt: string, fallback: T, retries: number = 1): Promise<T> {
  if (!isAiEnabled()) {
    return fallback;
  }

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const data = await requestGemini({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.4, maxOutputTokens: 800 },
      });
      const text = extractGeminiText(data);
      if (!text) throw new Error('Empty AI response');
      const parsed = extractJson<T>(text);
      if (parsed) return parsed;
      throw new Error('Failed to parse JSON');
    } catch (e) {
      console.warn(`AI generation attempt ${attempt + 1} failed:`, e);
      if (attempt === retries) {
        return fallback;
      }
    }
  }

  return fallback;
}

/**
 * Select random questions from fallback bank
 */
function selectRandomQuestions(questions: QuizQuestion[], count: number): QuizQuestion[] {
  const shuffled = [...questions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/**
 * Generate a quiz for a subject
 */
export async function generateQuiz(
  subject: string,
  difficulty: 'easy' | 'medium' | 'hard' = 'easy'
): Promise<QuizData> {
  const fallbackQuiz = FALLBACK_QUIZZES[subject] || FALLBACK_QUIZZES['General'];
  const fallbackData: QuizData = {
    title: fallbackQuiz.title,
    questions: selectRandomQuestions(fallbackQuiz.questions, 10),
  };

  const prompt = `Generate a 10-question multiple-choice quiz about "${subject}".
Difficulty: ${difficulty}.
Each question must have exactly 4 choices (A, B, C, D) with only one correct answer.
Make questions educational and appropriate for students.
Ensure questions are accurate and have clear, unambiguous correct answers.
Return ONLY valid JSON with the shape: { title: string, questions: [{ q, choices: {A,B,C,D}, answer, explanation }] }.`;

  return callGeminiJson<QuizData>(prompt, fallbackData);
}

/**
 * Generate a retry quiz based on incorrect questions
 */
export async function generateRetryQuiz(
  subject: string,
  incorrectQuestions: QuizQuestion[]
): Promise<QuizData> {
  const fallbackQuiz = FALLBACK_QUIZZES[subject] || FALLBACK_QUIZZES['General'];
  const fallbackData: QuizData = {
    title: `${subject} Retry Quiz (Offline)`,
    questions: selectRandomQuestions(fallbackQuiz.questions, 5),
  };

  const topics = incorrectQuestions.map((q) => q.q).join('; ');
  const prompt = `Generate a 5-question multiple-choice quiz about "${subject}".
The student struggled with these topics: ${topics}
Create 5 NEW questions (different from the originals) testing similar concepts.
Difficulty: easy.
Each question must have exactly 4 choices (A, B, C, D) with only one correct answer.
Return ONLY valid JSON with the shape: { title: string, questions: [{ q, choices: {A,B,C,D}, answer, explanation }] }.`;

  return callGeminiJson<QuizData>(prompt, fallbackData);
}

/**
 * Generate flashcards for a topic
 */
export async function generateFlashcards(
  subject: string,
  topic: string,
  count: number
): Promise<{ deckTitle: string; cards: any[] }> {
  const fallback = { deckTitle: `${subject} (Offline)`, cards: FALLBACK_FLASHCARDS };

  if (!isAiEnabled()) {
    showToast('AI unavailable - using template flashcards', 'info');
    return fallback;
  }

  const prompt = `Create ${count} flashcards for Subject: "${subject}", Topic: "${topic}".
Return ONLY valid JSON with the shape: { deckTitle: string, cards: [{ front, back, example? }] }.
Front should be a term or question, Back should be the definition or answer.`;

  return callGeminiJson(prompt, fallback);
}

/**
 * Generate study coach tips
 */
export async function generateCoachTips(
  subject: string,
  distractions: string[],
  score: number
): Promise<{ tips: string[] }> {
  const fallback = {
    tips: [
      'Focus on one concept at a time.',
      'Take regular breaks to maintain concentration.',
      'Review your mistakes to improve.',
    ],
  };

  if (!isAiEnabled()) {
    return fallback;
  }

  const prompt = `Student studied ${subject}. Quiz score: ${score}%.
Distractions reported: ${distractions.join(', ') || 'None'}.
Return ONLY valid JSON with the shape: { tips: string[] }. Provide 3 short, actionable study tips.`;

  return callGeminiJson(prompt, fallback);
}

/**
 * Chat message type for conversations
 */
interface ChatMessageInput {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Send a chat message with full conversation context
 */
export async function sendChatMessage(
  messages: ChatMessageInput[],
  options: {
    language?: 'en' | 'vi';
    context?: string;
  } = {}
): Promise<string> {
  const systemPrompt = buildSystemPrompt(options.language || 'en', options.context);

  const conversationParts: GeminiMessage[] = messages.map((msg) => ({
    role: msg.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: msg.content }],
  }));

  console.log('[AI] sendChat start', {
    hasKey: !!getApiKey(),
    model: DEFAULT_MODEL,
    msgCount: conversationParts.length,
  });

  const data = await requestGemini({
    contents: conversationParts,
    systemPrompt,
    generationConfig: { temperature: 0.6, maxOutputTokens: 800 },
  });

  const text = extractGeminiText(data);
  if (!text) {
    return options.language === 'vi' ? 'Tôi không thể tạo phản hồi ngay bây giờ.' : "I couldn't generate a response right now.";
  }

  return text;
}

/**
 * Chat with AI coach (legacy function for compatibility)
 */
export async function chatWithCoach(message: string): Promise<string> {
  return sendChatMessage([{ role: 'user', content: message }]);
}

/**
 * Generate study suggestions based on user data
 */
export async function generateStudySuggestions(
  todayTasks: number,
  recentWrongAnswers: string[],
  topDistractions: string[]
): Promise<{ suggestions: string[] }> {
  const fallback = {
    suggestions: [
      'Start with your most challenging subject while your energy is high.',
      'Break large tasks into 25-minute focus sessions.',
      'Review flashcards for topics you struggled with recently.',
    ],
  };

  if (!isAiEnabled()) {
    return fallback;
  }

  const prompt = `Create 3 personalized study suggestions.
Tasks pending today: ${todayTasks}
Recent topics struggled with: ${recentWrongAnswers.slice(0, 3).join(', ') || 'None'}
Common distractions: ${topDistractions.join(', ') || 'None'}
Return ONLY valid JSON with the shape: { suggestions: string[] }. Keep each suggestion under 20 words.`;

  return callGeminiJson(prompt, fallback);
}
