/**
 * Gemini AI Service for quiz generation
 * Uses process.env.GEMINI_API_KEY for API authentication
 * Falls back to local question bank when API is unavailable
 */

import { GoogleGenAI, Type } from "@google/genai";
import { QuizData, QuizQuestion, FlashcardDeck } from "../types";
import { FALLBACK_QUIZZES, FALLBACK_FLASHCARDS } from "../constants";

// Initialize Gemini AI client with API key from environment
// IMPORTANT: Never hardcode API keys - use environment variables
const getAi = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn("GEMINI_API_KEY not found in environment variables");
    return null;
  }
  return new GoogleGenAI({ apiKey });
};

// JSON schema for quiz response - ensures strict format from Gemini
const QUIZ_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    questions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          q: { type: Type.STRING },
          choices: {
            type: Type.OBJECT,
            properties: {
              A: { type: Type.STRING },
              B: { type: Type.STRING },
              C: { type: Type.STRING },
              D: { type: Type.STRING }
            },
            required: ["A", "B", "C", "D"]
          },
          answer: { type: Type.STRING, enum: ["A", "B", "C", "D"] },
          explanation: { type: Type.STRING }
        },
        required: ["q", "choices", "answer", "explanation"]
      }
    }
  },
  required: ["title", "questions"]
};

/**
 * Generic JSON fetcher with error handling
 * Attempts to generate content from Gemini and parse as JSON
 * Returns fallback value if generation or parsing fails
 */
async function fetchJson<T>(
  model: string,
  prompt: string,
  schema: any,
  fallback: T
): Promise<T> {
  const ai = getAi();
  if (!ai) return fallback;

  try {
    // Request strict JSON output from Gemini for reliable parsing
    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: schema,
      },
    });

    const text = response.text;
    if (!text) throw new Error("Empty AI response");

    // Parse and validate JSON response
    const parsed = JSON.parse(text) as T;
    return parsed;
  } catch (e) {
    // Log error and return fallback for graceful degradation
    console.warn("AI generation failed, using fallback questions:", e);
    return fallback;
  }
}

/**
 * Selects random questions from fallback bank
 * Used when API is unavailable or returns invalid data
 */
function selectRandomQuestions(questions: QuizQuestion[], count: number): QuizQuestion[] {
  const shuffled = [...questions].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, Math.min(count, shuffled.length));
}

/**
 * Generate a 10-question quiz for a given subject
 * Primary function for post-focus-session quizzes
 *
 * @param subject - The subject area (Math, English, Physics, History, or Custom topic)
 * @param difficulty - Quiz difficulty level (always "easy" per requirements)
 * @returns QuizData with title and 10 questions
 */
export const generateQuiz = async (
  subject: string,
  difficulty: 'easy' | 'medium' | 'hard' = 'easy'
): Promise<QuizData> => {
  // Construct prompt requesting strict JSON format
  const prompt = `Generate a 10-question multiple-choice quiz about "${subject}".
Difficulty: ${difficulty}.
Each question must have exactly 4 choices (A, B, C, D) with only one correct answer.
Make questions educational and appropriate for students.
Ensure questions are accurate and have clear, unambiguous correct answers.
Return ONLY valid JSON matching the schema provided.`;

  // Get fallback quiz for this subject
  const fallbackQuiz = FALLBACK_QUIZZES[subject] || FALLBACK_QUIZZES['General'];
  const fallbackData: QuizData = {
    title: fallbackQuiz.title,
    questions: selectRandomQuestions(fallbackQuiz.questions, 10)
  };

  return fetchJson<QuizData>(
    "gemini-2.0-flash",
    prompt,
    QUIZ_SCHEMA,
    fallbackData
  );
};

/**
 * Generate a 5-question retry quiz based on incorrect topics
 * Used when user fails the main quiz (< 80%) and gets one retry
 *
 * @param subject - The subject area
 * @param incorrectQuestions - List of questions the user got wrong
 * @returns QuizData with 5 new questions on the same topics
 */
export const generateRetryQuiz = async (
  subject: string,
  incorrectQuestions: QuizQuestion[]
): Promise<QuizData> => {
  // Extract topics from incorrect questions for targeted retry
  const topics = incorrectQuestions.map(q => q.q).join("; ");

  const prompt = `Generate a 5-question multiple-choice quiz about "${subject}".
The student struggled with these topics: ${topics}
Create 5 NEW questions (different from the originals) testing similar concepts.
Difficulty: easy.
Each question must have exactly 4 choices (A, B, C, D) with only one correct answer.
Return ONLY valid JSON matching the schema provided.`;

  // Fallback: select 5 random questions from the subject's question bank
  const fallbackQuiz = FALLBACK_QUIZZES[subject] || FALLBACK_QUIZZES['General'];
  const fallbackData: QuizData = {
    title: `${subject} Retry Quiz (Offline)`,
    questions: selectRandomQuestions(fallbackQuiz.questions, 5)
  };

  return fetchJson<QuizData>(
    "gemini-2.0-flash",
    prompt,
    QUIZ_SCHEMA,
    fallbackData
  );
};

/**
 * Generate flashcards for a given topic
 * Used in the flashcards feature
 */
export const generateFlashcards = async (
  subject: string,
  topic: string,
  count: number
): Promise<{deckTitle: string, cards: any[]}> => {
  const schema = {
    type: Type.OBJECT,
    properties: {
      deckTitle: { type: Type.STRING },
      cards: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            front: { type: Type.STRING },
            back: { type: Type.STRING },
            example: { type: Type.STRING }
          },
          required: ["front", "back"]
        }
      }
    },
    required: ["deckTitle", "cards"]
  };

  const prompt = `Create ${count} flashcards for Subject: "${subject}", Topic: "${topic}".
Front should be a term or question, Back should be the definition or answer.`;

  return fetchJson(
    "gemini-2.0-flash",
    prompt,
    schema,
    { deckTitle: `${subject} (Offline)`, cards: FALLBACK_FLASHCARDS }
  );
};

/**
 * Generate study tips based on user performance
 */
export const generateCoachTips = async (
  subject: string,
  distractions: string[],
  score: number
): Promise<{tips: string[]}> => {
  const schema = {
    type: Type.OBJECT,
    properties: { tips: { type: Type.ARRAY, items: { type: Type.STRING } } },
    required: ["tips"]
  };

  const prompt = `Student studied ${subject}. Quiz score: ${score}%.
Distractions reported: ${distractions.join(', ') || 'None'}.
Give 3 short, actionable study tips.`;

  return fetchJson(
    "gemini-2.0-flash",
    prompt,
    schema,
    { tips: ["Focus on one concept at a time.", "Take regular breaks.", "Review your mistakes."] }
  );
};

/**
 * Chat with AI coach for study advice
 */
export const chatWithCoach = async (message: string): Promise<string> => {
  const ai = getAi();
  if (!ai) return "I'm currently offline. Please check your API key.";

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.0-flash",
      contents: `You are a helpful study coach.
User asks: "${message}".
Keep answer under 50 words. Be encouraging.
Do not give medical advice.`,
    });
    return response.text || "I couldn't think of a response.";
  } catch (e) {
    return "Sorry, I'm having trouble connecting right now.";
  }
};
