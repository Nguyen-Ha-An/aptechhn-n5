import React, { useState } from 'react';
import { useGlobal } from '../context/GlobalContext';
import { generateFlashcards } from '../services/geminiService';
import Button from '../components/Button';
import { Plus, Play } from 'lucide-react';
import { SUBJECTS } from '../constants';

const Flashcards: React.FC = () => {
  const { data, updateData } = useGlobal();
  const [creating, setCreating] = useState(false);
  const [topic, setTopic] = useState("");
  const [subject, setSubject] = useState(SUBJECTS[0]);
  const [activeDeckIndex, setActiveDeckIndex] = useState<number | null>(null);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);

  // Filter cards due for review
  const getDueCards = (deckIdx: number) => {
    const today = new Date().toISOString().split('T')[0];
    return data.decks[deckIdx].cards.filter(c => c.nextReviewDate <= today);
  };

  const handleCreate = async () => {
    setCreating(true);
    const newDeck = await generateFlashcards(subject, topic, 5);
    const deck = {
        id: crypto.randomUUID(),
        title: newDeck.deckTitle,
        subject: subject,
        cards: newDeck.cards.map(c => ({
            id: crypto.randomUUID(),
            ...c,
            easeFactor: 2.5,
            interval: 0,
            reviews: 0,
            nextReviewDate: new Date().toISOString().split('T')[0]
        }))
    };
    updateData(prev => ({ ...prev, decks: [...prev.decks, deck] }));
    setCreating(false);
    setTopic("");
  };

  const handleGrade = (quality: number) => {
    if (activeDeckIndex === null) return;
    
    // SM-2 Algorithm Implementation
    const deck = data.decks[activeDeckIndex];
    const dueCards = getDueCards(activeDeckIndex);
    const card = dueCards[reviewIndex];
    
    // Calculate new values
    let { interval, reviews, easeFactor } = card;
    
    if (quality >= 3) {
        if (reviews === 0) interval = 1;
        else if (reviews === 1) interval = 6;
        else interval = Math.round(interval * easeFactor);
        reviews++;
    } else {
        reviews = 0;
        interval = 1;
    }
    
    easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (easeFactor < 1.3) easeFactor = 1.3;

    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + interval);
    
    const updatedCard = { ...card, interval, reviews, easeFactor, nextReviewDate: nextDate.toISOString().split('T')[0] };
    
    // Update State
    const updatedCards = deck.cards.map(c => c.id === card.id ? updatedCard : c);
    const updatedDecks = [...data.decks];
    updatedDecks[activeDeckIndex] = { ...deck, cards: updatedCards };
    
    updateData(prev => ({ ...prev, decks: updatedDecks }));

    setShowBack(false);
    if (reviewIndex < dueCards.length - 1) {
        setReviewIndex(prev => prev + 1);
    } else {
        alert("Review Session Complete!");
        setActiveDeckIndex(null);
        setReviewIndex(0);
    }
  };

  if (activeDeckIndex !== null) {
      const due = getDueCards(activeDeckIndex);
      if (due.length === 0) return <div className="p-10 text-center">No cards due for review today! <Button onClick={() => setActiveDeckIndex(null)} className="ml-4">Back</Button></div>;
      
      const card = due[reviewIndex];

      return (
          <div className="h-full flex flex-col items-center justify-center p-6 max-w-xl mx-auto space-y-8">
             <div className="w-full h-64 bg-white rounded-2xl shadow-lg border border-gray-200 flex items-center justify-center p-8 text-center cursor-pointer transition-all hover:shadow-xl" onClick={() => setShowBack(!showBack)}>
                 <div className="prose">
                     <p className="text-gray-400 uppercase text-xs font-bold tracking-widest mb-4">{showBack ? 'Answer' : 'Question'}</p>
                     <h2 className="text-2xl font-bold text-gray-800">{showBack ? card.back : card.front}</h2>
                     {showBack && card.example && <p className="mt-4 text-sm text-gray-500 italic">"{card.example}"</p>}
                 </div>
             </div>
             
             {showBack && (
                 <div className="grid grid-cols-4 gap-2 w-full">
                     <button onClick={() => handleGrade(0)} className="p-3 bg-red-100 text-red-700 rounded-lg font-bold text-sm">Again</button>
                     <button onClick={() => handleGrade(3)} className="p-3 bg-orange-100 text-orange-700 rounded-lg font-bold text-sm">Hard</button>
                     <button onClick={() => handleGrade(4)} className="p-3 bg-blue-100 text-blue-700 rounded-lg font-bold text-sm">Good</button>
                     <button onClick={() => handleGrade(5)} className="p-3 bg-green-100 text-green-700 rounded-lg font-bold text-sm">Easy</button>
                 </div>
             )}
             
             <p className="text-xs text-gray-400">Card {reviewIndex + 1} of {due.length}</p>
          </div>
      )
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Flashcard Decks</h1>
      
      {/* Create New */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-8 flex flex-col md:flex-row gap-4 items-end">
         <div className="flex-1 w-full">
             <label className="text-xs font-bold text-gray-500">Subject</label>
             <select className="w-full border rounded p-2" value={subject} onChange={e=>setSubject(e.target.value)}>
                 {SUBJECTS.map(s => <option key={s}>{s}</option>)}
             </select>
         </div>
         <div className="flex-[2] w-full">
             <label className="text-xs font-bold text-gray-500">Topic</label>
             <input className="w-full border rounded p-2" placeholder="e.g. Calculus Derivatives" value={topic} onChange={e=>setTopic(e.target.value)} />
         </div>
         <Button onClick={handleCreate} disabled={creating || !topic}>
             {creating ? 'Generating...' : <span className="flex items-center"><Plus size={16} className="mr-2"/> Create Deck</span>}
         </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.decks.map((deck, idx) => {
              const dueCount = getDueCards(idx).length;
              return (
                  <div key={deck.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 hover:border-indigo-200 transition">
                      <h3 className="font-bold text-lg truncate">{deck.title}</h3>
                      <p className="text-sm text-gray-500 mb-4">{deck.cards.length} cards • {deck.subject}</p>
                      <div className="flex justify-between items-center">
                          <span className={`text-xs font-bold px-2 py-1 rounded ${dueCount > 0 ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-400'}`}>
                              {dueCount} due
                          </span>
                          <Button size="sm" onClick={() => setActiveDeckIndex(idx)} disabled={dueCount === 0} variant={dueCount > 0 ? 'primary' : 'outline'}>
                              Review
                          </Button>
                      </div>
                  </div>
              )
          })}
      </div>
    </div>
  );
};

export default Flashcards;