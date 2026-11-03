/**
 * Quiz Component
 * Displays 10 multiple-choice questions after focus session
 * Handles scoring, review, and retry logic
 *
 * Reward Rules:
 * - Score >= 80% (8/10): Break unlocked
 * - Score < 80%: Review incorrect questions, get ONE retry (5 questions)
 * - Retry >= 80% (4/5): Break unlocked
 * - Retry < 80%: Session ends, return to home
 */

import React, { useState, useEffect } from 'react';
import { QuizData, QuizQuestion } from '../types';
import Button from './Button';

interface QuizProps {
  quizData: QuizData | null;
  isLoading: boolean;
  isRetry: boolean;
  onQuizComplete: (score: number, passed: boolean, incorrectQuestions: QuizQuestion[]) => void;
  onRequestRetry: () => void;
  onHome: () => void;
}

const Quiz: React.FC<QuizProps> = ({
  quizData,
  isLoading,
  isRetry,
  onQuizComplete,
  onRequestRetry,
  onHome
}) => {
  // Track user's selected answers
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);
  const [incorrectQuestions, setIncorrectQuestions] = useState<QuizQuestion[]>([]);

  // Reset state when new quiz data loads
  useEffect(() => {
    setAnswers({});
    setSubmitted(false);
    setScore(0);
    setIncorrectQuestions([]);
  }, [quizData]);

  // Loading state - show spinner while generating quiz
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full space-y-4 p-4">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
        <p className="text-gray-600 font-medium">
          {isRetry ? 'Generating retry quiz...' : 'Generating your quiz with AI...'}
        </p>
        <p className="text-gray-400 text-sm">This may take a moment</p>
      </div>
    );
  }

  // Error state - quiz failed to load
  if (!quizData || quizData.questions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-6">
        <div className="text-6xl mb-4">:(</div>
        <p className="text-red-500 font-medium mb-4">Failed to load quiz.</p>
        <p className="text-gray-500 text-sm mb-6">
          Please check your internet connection or try again.
        </p>
        <Button onClick={onHome}>Back to Home</Button>
      </div>
    );
  }

  // Handle answer selection
  const handleSelect = (qIndex: number, choice: string) => {
    if (submitted) return; // Prevent changes after submission
    setAnswers(prev => ({ ...prev, [qIndex]: choice }));
  };

  // Calculate score and determine pass/fail
  const handleSubmit = () => {
    let correctCount = 0;
    const wrongQuestions: QuizQuestion[] = [];

    quizData.questions.forEach((q, idx) => {
      if (answers[idx] === q.answer) {
        correctCount++;
      } else {
        wrongQuestions.push(q);
      }
    });

    // Calculate percentage score (0-100)
    const percentScore = (correctCount / quizData.questions.length) * 100;
    setScore(percentScore);
    setIncorrectQuestions(wrongQuestions);
    setSubmitted(true);
  };

  // Determine if user passed (>= 80%)
  const passed = score >= 80;

  // Calculate required correct answers for display
  const totalQuestions = quizData.questions.length;
  const correctAnswers = Math.round((score / 100) * totalQuestions);
  const requiredToPass = Math.ceil(totalQuestions * 0.8);

  // --- Results View ---
  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto p-4 space-y-6 pb-28">
        {/* Score Banner */}
        <div
          className={`text-center p-6 rounded-xl shadow-md text-white ${
            passed ? 'bg-gradient-to-r from-green-500 to-emerald-600' : 'bg-gradient-to-r from-amber-500 to-orange-500'
          }`}
        >
          <h2 className="text-3xl font-bold mb-2">
            {passed ? 'Break Unlocked!' : 'Keep Trying!'}
          </h2>
          <p className="text-5xl font-bold my-4">{Math.round(score)}%</p>
          <p className="text-lg opacity-90">
            {correctAnswers} / {totalQuestions} correct
          </p>
          <p className="text-sm opacity-75 mt-2">
            {passed
              ? 'Great job! You earned your break.'
              : `Need ${requiredToPass}/${totalQuestions} (80%) to unlock break`}
          </p>
        </div>

        {/* Review Section Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-700">
            {passed ? 'Review Your Answers' : 'Review Incorrect Answers'}
          </h3>
          <span className="text-sm text-gray-400">
            {incorrectQuestions.length} incorrect
          </span>
        </div>

        {/* Question Review List */}
        <div className="space-y-4">
          {quizData.questions.map((q, idx) => {
            const userAnswer = answers[idx];
            const isCorrect = userAnswer === q.answer;

            // Show all questions if passed, only incorrect if failed
            if (passed || !isCorrect) {
              return (
                <div
                  key={idx}
                  className={`bg-white p-4 rounded-lg shadow-sm border-l-4 ${
                    isCorrect ? 'border-green-500' : 'border-red-500'
                  }`}
                >
                  <p className="font-medium text-gray-800 mb-3">
                    <span className="text-gray-400 mr-2">Q{idx + 1}.</span>
                    {q.q}
                  </p>

                  <div className="space-y-2 text-sm">
                    {/* User's Answer */}
                    <div className={`flex items-start ${isCorrect ? 'text-green-700' : 'text-red-600'}`}>
                      <span className="font-medium mr-2">Your answer:</span>
                      <span>
                        {userAnswer
                          ? `${userAnswer}: ${q.choices[userAnswer as keyof typeof q.choices]}`
                          : 'No answer selected'}
                      </span>
                    </div>

                    {/* Correct Answer (only show if wrong) */}
                    {!isCorrect && (
                      <div className="flex items-start text-green-700 font-semibold">
                        <span className="mr-2">Correct:</span>
                        <span>{q.answer}: {q.choices[q.answer]}</span>
                      </div>
                    )}

                    {/* Explanation */}
                    <div className="bg-gray-50 p-3 rounded-lg mt-2 text-gray-600 italic">
                      {q.explanation}
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          })}
        </div>

        {/* Action Buttons - Fixed at bottom */}
        <div className="fixed bottom-0 left-0 w-full bg-white border-t p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
          <div className="max-w-2xl mx-auto flex justify-center space-x-4">
            {passed ? (
              <Button
                onClick={() => onQuizComplete(score, true, incorrectQuestions)}
                fullWidth
                className="max-w-xs text-lg"
              >
                Start Break
              </Button>
            ) : (
              <>
                {!isRetry ? (
                  <Button
                    onClick={onRequestRetry}
                    variant="secondary"
                    fullWidth
                    className="max-w-xs"
                  >
                    Retry Quiz (5 Questions)
                  </Button>
                ) : (
                  <div className="text-sm text-gray-500 flex items-center px-4">
                    No more retries available this session.
                  </div>
                )}
                <Button
                  onClick={() => onQuizComplete(score, false, incorrectQuestions)}
                  variant="outline"
                  fullWidth
                  className="max-w-xs"
                >
                  End Session
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }

  // --- Quiz Questions View ---
  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6 pb-28">
      {/* Header */}
      <div className="flex justify-between items-center mb-4 sticky top-0 bg-gray-50 py-4 z-10">
        <div>
          <h2 className="text-xl font-bold text-gray-800">{quizData.title}</h2>
          <p className="text-sm text-gray-500">
            {Object.keys(answers).length} / {quizData.questions.length} answered
          </p>
        </div>
        <span
          className={`px-3 py-1 rounded-full text-xs font-bold ${
            isRetry
              ? 'bg-amber-100 text-amber-700'
              : 'bg-indigo-100 text-indigo-700'
          }`}
        >
          {isRetry ? 'Retry Mode (5Q)' : `${quizData.questions.length} Questions`}
        </span>
      </div>

      {/* Questions */}
      {quizData.questions.map((q, qIdx) => (
        <div
          key={qIdx}
          className="bg-white p-6 rounded-xl shadow-sm border border-gray-100"
        >
          <p className="text-lg font-medium text-gray-800 mb-4">
            <span className="text-indigo-600 font-bold mr-2">{qIdx + 1}.</span>
            {q.q}
          </p>

          <div className="space-y-3">
            {Object.entries(q.choices).map(([key, text]) => (
              <label
                key={key}
                className={`flex items-center p-3 rounded-lg border cursor-pointer transition-all ${
                  answers[qIdx] === key
                    ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-500 ring-opacity-50'
                    : 'border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name={`q-${qIdx}`}
                  value={key}
                  checked={answers[qIdx] === key}
                  onChange={() => handleSelect(qIdx, key)}
                  className="w-4 h-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
                />
                <span className="ml-3 text-gray-700">
                  <span className="font-bold text-gray-400 mr-2">{key}.</span>
                  {text}
                </span>
              </label>
            ))}
          </div>
        </div>
      ))}

      {/* Submit Button - Fixed at bottom */}
      <div className="fixed bottom-0 left-0 w-full bg-white border-t p-4 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
        <div className="max-w-2xl mx-auto">
          <Button
            onClick={handleSubmit}
            fullWidth
            className="text-lg"
            disabled={Object.keys(answers).length < quizData.questions.length}
          >
            {Object.keys(answers).length < quizData.questions.length
              ? `Answer All Questions (${Object.keys(answers).length}/${quizData.questions.length})`
              : 'Submit Answers'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Quiz;
