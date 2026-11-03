import React, { useState, useEffect } from 'react';
import { useGlobal } from '../context/GlobalContext';
import { generateQuiz } from '../services/geminiService';
import { QuizData, AppScreen } from '../types';
import Button from '../components/Button';
import { useNavigate } from 'react-router-dom';
import { HelpCircle, Save } from 'lucide-react';

const QuizPage: React.FC = () => {
  const { data, updateData, addCoins, purchaseItem } = useGlobal();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState<QuizData | null>(null);
  const [loading, setLoading] = useState(true);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [hintsUsed, setHintsUsed] = useState<Record<number, boolean>>({});

  useEffect(() => {
    // Determine subject from last focus session or random
    const lastSession = [...data.history].reverse().find(h => h.type === 'focus');
    const subject = lastSession?.subject || 'General';

    // Adaptive Difficulty
    const recentQuizzes = data.history.filter(h => h.type === 'quiz').slice(-3);
    let difficulty: 'easy'|'medium'|'hard' = 'easy';
    if (recentQuizzes.length >= 3) {
        const avg = recentQuizzes.reduce((a, b) => a + (b.score || 0), 0) / 3;
        if (avg >= 92) difficulty = 'hard';
        else if (avg >= 85) difficulty = 'medium';
    }

    generateQuiz(subject, difficulty).then(q => {
        setQuiz(q);
        setLoading(false);
    });
  }, []);

  const useHint = (idx: number, correctAnswer: string) => {
    if (hintsUsed[idx]) return;
    if (purchaseItem('item:hint', 0)) { // Assuming they have one in inventory, logic in context needs tweak to consume item.
       // Check if user has token. 
       const hasToken = data.profile.inventory.includes('item:hint');
       if(hasToken) {
           updateData(prev => {
               const idx = prev.profile.inventory.indexOf('item:hint');
               const newInv = [...prev.profile.inventory];
               if(idx > -1) newInv.splice(idx, 1);
               return { ...prev, profile: { ...prev.profile, inventory: newInv } };
           });
           setHintsUsed(prev => ({...prev, [idx]: true}));
       } else {
           alert("No Hint Tokens! Buy one in the shop.");
       }
    } else {
         alert("No coins/tokens");
    }
  };

  const saveToFlashcards = (q: any) => {
    updateData(prev => ({
        ...prev,
        decks: [...prev.decks, { // Simplified: Add to a "Review" deck or create one
            id: 'review-deck',
            title: 'Review Deck',
            subject: 'Mixed',
            cards: [{
                id: crypto.randomUUID(),
                front: q.q,
                back: `${q.answer}: ${q.choices[q.answer]}. ${q.explanation}`,
                easeFactor: 2.5,
                interval: 0,
                reviews: 0,
                nextReviewDate: new Date().toISOString().split('T')[0]
            }]
        }]
    }));
    alert("Saved to Flashcards!");
  };

  const handleSubmit = () => {
    if(!quiz) return;
    let correct = 0;
    quiz.questions.forEach((q, i) => { if(answers[i] === q.answer) correct++; });
    const score = (correct / quiz.questions.length) * 100;
    
    // Save Result
    updateData(prev => ({
        ...prev,
        history: [...prev.history, {
            id: crypto.randomUUID(),
            date: new Date().toISOString(),
            type: 'quiz',
            durationSeconds: 0,
            score: score,
            subject: 'Quiz'
        }]
    }));

    if(score >= 80) addCoins(15);
    setSubmitted(true);
  };

  if (loading) return <div className="h-full flex items-center justify-center text-indigo-600">Generating Quiz...</div>;
  if (!quiz) return <div>Error loading quiz</div>;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6 pb-20">
      <h1 className="text-2xl font-bold">{quiz.title}</h1>
      
      {quiz.questions.map((q, i) => {
         const isCorrect = submitted && answers[i] === q.answer;
         const isWrong = submitted && answers[i] !== q.answer;
         
         return (
            <div key={i} className={`p-6 bg-white rounded-xl shadow-sm border ${isCorrect ? 'border-green-500' : (isWrong ? 'border-red-500' : 'border-gray-100')}`}>
                <div className="flex justify-between">
                    <p className="font-medium text-lg mb-4">{q.q}</p>
                    {!submitted && <button onClick={() => useHint(i, q.answer)} className="text-amber-500 hover:text-amber-600"><HelpCircle size={20}/></button>}
                </div>

                <div className="space-y-2">
                    {Object.entries(q.choices).map(([key, val]) => {
                        const isHintedOut = hintsUsed[i] && key !== q.answer && key !== 'A'; // Fake hint logic: keep Answer and A (or random)
                        // Better hint logic: eliminate 2 wrong options.
                        // For MVP, if hinted, we grey out wrong answers visually.
                        
                        return (
                            <label key={key} className={`flex items-center p-3 rounded border cursor-pointer hover:bg-gray-50 ${answers[i] === key ? 'bg-indigo-50 border-indigo-500' : 'border-gray-200'} ${hintsUsed[i] && key !== q.answer ? 'opacity-30' : ''}`}>
                                <input type="radio" name={`q${i}`} value={key} onChange={() => !submitted && setAnswers({...answers, [i]: key})} checked={answers[i]===key} disabled={submitted} className="mr-3"/>
                                <span>{val}</span>
                            </label>
                        )
                    })}
                </div>
                
                {submitted && (
                    <div className="mt-4 p-3 bg-gray-50 rounded text-sm text-gray-700">
                        <p className="font-bold">{q.answer} is correct.</p>
                        <p>{q.explanation}</p>
                        {isWrong && (
                            <button onClick={() => saveToFlashcards(q)} className="mt-2 text-indigo-600 flex items-center space-x-1 text-xs font-bold">
                                <Save size={14} /> <span>Save to Flashcards</span>
                            </button>
                        )}
                    </div>
                )}
            </div>
         );
      })}

      {!submitted ? (
          <Button onClick={handleSubmit} fullWidth>Submit Quiz</Button>
      ) : (
          <div className="flex space-x-4">
              <Button onClick={() => navigate('/coach')} fullWidth variant="secondary">Reflect with Coach</Button>
              <Button onClick={() => navigate('/')} fullWidth variant="outline">Back Home</Button>
          </div>
      )}
    </div>
  );
};

export default QuizPage;