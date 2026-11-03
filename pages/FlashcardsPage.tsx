/**
 * Flashcards Page - Enhanced with Review Queue and Quiz Integration
 * SM-2 spaced repetition algorithm for optimal learning
 */

import React, { useState, useMemo } from 'react';
import { useGlobal } from '../context/GlobalContext';
import { Card, Button, Input, Badge, EmptyState, Modal, Progress, Select } from '../components/ui';
import { Flashcard, FlashcardDeck } from '../types';
import { isAiEnabled, generateFlashcards } from '../lib/ai/geminiClient';
import {
  BookOpen,
  Plus,
  Play,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Sparkles,
  Layers,
  CheckCircle,
  Clock,
  Trash2,
  Edit2,
} from 'lucide-react';

type ViewMode = 'decks' | 'review' | 'study-all';

export const FlashcardsPage: React.FC = () => {
  const { state, addDeck, updateDeck, deleteDeck, showToast } = useGlobal();

  const [viewMode, setViewMode] = useState<ViewMode>('decks');
  const [activeDeck, setActiveDeck] = useState<FlashcardDeck | null>(null);
  const [reviewQueue, setReviewQueue] = useState<Flashcard[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [showBack, setShowBack] = useState(false);

  // Create deck modal
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newDeckName, setNewDeckName] = useState('');
  const [newDeckSubject, setNewDeckSubject] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiTopic, setAiTopic] = useState('');

  // Add card modal
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [newCardFront, setNewCardFront] = useState('');
  const [newCardBack, setNewCardBack] = useState('');
  const [newCardExample, setNewCardExample] = useState('');

  // Get all due cards across all decks
  const allDueCards = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const due: { card: Flashcard; deckId: string; deckTitle: string }[] = [];

    state.decks.forEach((deck) => {
      deck.cards.forEach((card) => {
        if (card.nextReviewDate <= today) {
          due.push({ card, deckId: deck.id, deckTitle: deck.title });
        }
      });
    });

    return due;
  }, [state.decks]);

  // Get due cards for a specific deck
  const getDueCardsForDeck = (deck: FlashcardDeck) => {
    const today = new Date().toISOString().split('T')[0];
    return deck.cards.filter((c) => c.nextReviewDate <= today);
  };

  // Project options for deck subject
  const projectOptions = state.projects.map((p) => ({ value: p.name, label: p.name }));

  // Start review for a specific deck
  const startDeckReview = (deck: FlashcardDeck) => {
    const dueCards = getDueCardsForDeck(deck);
    if (dueCards.length === 0) {
      showToast('No cards due for review', 'info');
      return;
    }
    setActiveDeck(deck);
    setReviewQueue(dueCards);
    setCurrentIndex(0);
    setShowBack(false);
    setViewMode('review');
  };

  // Start review for all due cards
  const startAllDueReview = () => {
    if (allDueCards.length === 0) {
      showToast('No cards due for review', 'info');
      return;
    }
    setActiveDeck(null);
    setReviewQueue(allDueCards.map((d) => d.card));
    setCurrentIndex(0);
    setShowBack(false);
    setViewMode('study-all');
  };

  // SM-2 Algorithm for grading
  const handleGrade = (quality: number) => {
    const card = reviewQueue[currentIndex];
    if (!card) return;

    // Find the deck containing this card
    const deck = state.decks.find((d) => d.cards.some((c) => c.id === card.id));
    if (!deck) return;

    // SM-2 calculation
    let { interval, reviews, easeFactor } = card;

    if (quality >= 3) {
      // Correct response
      if (reviews === 0) interval = 1;
      else if (reviews === 1) interval = 6;
      else interval = Math.round(interval * easeFactor);
      reviews++;
    } else {
      // Incorrect - reset
      reviews = 0;
      interval = 1;
    }

    // Update ease factor
    easeFactor = easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
    if (easeFactor < 1.3) easeFactor = 1.3;

    // Calculate next review date
    const nextDate = new Date();
    nextDate.setDate(nextDate.getDate() + interval);
    const nextReviewDate = nextDate.toISOString().split('T')[0];

    // Update the card in the deck
    const updatedCards = deck.cards.map((c) =>
      c.id === card.id ? { ...c, interval, reviews, easeFactor, nextReviewDate } : c
    );
    updateDeck(deck.id, { cards: updatedCards });

    // Move to next card
    setShowBack(false);
    if (currentIndex < reviewQueue.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      showToast('Review session complete!', 'success');
      setViewMode('decks');
      setReviewQueue([]);
      setCurrentIndex(0);
    }
  };

  // Create a new deck
  const handleCreateDeck = async () => {
    if (!newDeckName.trim()) return;

    const deck: Omit<FlashcardDeck, 'id' | 'createdAt' | 'lastReviewedAt'> = {
      title: newDeckName.trim(),
      subject: newDeckSubject || 'General',
      projectId: null,
      cards: [],
    };

    addDeck(deck);
    showToast('Deck created', 'success');
    setShowCreateModal(false);
    setNewDeckName('');
    setNewDeckSubject('');
  };

  // Generate deck with AI
  const handleGenerateWithAI = async () => {
    if (!aiTopic.trim() || !isAiEnabled()) return;

    setIsGenerating(true);
    try {
      const result = await generateFlashcards(newDeckSubject || 'General', aiTopic, 10);
      if (result) {
        const deck: Omit<FlashcardDeck, 'id' | 'createdAt' | 'lastReviewedAt'> = {
          title: result.deckTitle || aiTopic,
          subject: newDeckSubject || 'General',
          projectId: null,
          cards: result.cards.map((c: { front: string; back: string; example?: string }) => ({
            id: `card_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            front: c.front,
            back: c.back,
            example: c.example,
            easeFactor: 2.5,
            interval: 0,
            reviews: 0,
            nextReviewDate: new Date().toISOString().split('T')[0],
          })),
        };
        addDeck(deck);
        showToast(`Created deck with ${deck.cards.length} cards`, 'success');
        setShowCreateModal(false);
        setAiTopic('');
        setNewDeckSubject('');
      }
    } catch (err) {
      showToast('Failed to generate flashcards', 'error');
    } finally {
      setIsGenerating(false);
    }
  };

  // Add card to deck
  const handleAddCard = () => {
    if (!activeDeck || !newCardFront.trim() || !newCardBack.trim()) return;

    const newCard: Flashcard = {
      id: `card_${Date.now()}`,
      front: newCardFront.trim(),
      back: newCardBack.trim(),
      example: newCardExample.trim() || undefined,
      easeFactor: 2.5,
      interval: 0,
      reviews: 0,
      nextReviewDate: new Date().toISOString().split('T')[0],
    };

    updateDeck(activeDeck.id, { cards: [...activeDeck.cards, newCard] });
    showToast('Card added', 'success');
    setShowAddCardModal(false);
    setNewCardFront('');
    setNewCardBack('');
    setNewCardExample('');
  };

  // Delete deck
  const handleDeleteDeck = (deckId: string) => {
    deleteDeck(deckId);
    showToast('Deck deleted', 'info');
  };

  // ============================================
  // Review View
  // ============================================
  if (viewMode === 'review' || viewMode === 'study-all') {
    const currentCard = reviewQueue[currentIndex];

    if (!currentCard) {
      return (
        <div className="p-6 max-w-lg mx-auto text-center">
          <h2 className="text-xl font-bold mb-4">No cards to review</h2>
          <Button onClick={() => setViewMode('decks')}>Back to Decks</Button>
        </div>
      );
    }

    return (
      <div className="h-full flex flex-col items-center justify-center p-6 max-w-xl mx-auto">
        {/* Header */}
        <div className="w-full flex items-center justify-between mb-6">
          <Button variant="ghost" onClick={() => setViewMode('decks')}>
            <ChevronLeft className="w-4 h-4" />
            Back
          </Button>
          <Badge variant="primary">
            {currentIndex + 1} / {reviewQueue.length}
          </Badge>
        </div>

        {/* Flashcard */}
        <div
          onClick={() => setShowBack(!showBack)}
          className="w-full h-72 bg-white rounded-2xl shadow-lg border border-gray-200 flex items-center justify-center p-8 text-center cursor-pointer hover:shadow-xl transition-all"
        >
          <div>
            <p className="text-gray-400 uppercase text-xs font-bold tracking-widest mb-4">
              {showBack ? 'Answer' : 'Question'}
            </p>
            <h2 className="text-2xl font-bold text-gray-800">
              {showBack ? currentCard.back : currentCard.front}
            </h2>
            {showBack && currentCard.example && (
              <p className="mt-4 text-sm text-gray-500 italic">"{currentCard.example}"</p>
            )}
          </div>
        </div>

        <p className="text-xs text-gray-400 mt-4">Click card to flip</p>

        {/* Grade Buttons */}
        {showBack && (
          <div className="grid grid-cols-4 gap-2 w-full mt-6">
            <button
              onClick={() => handleGrade(0)}
              className="p-3 bg-red-100 text-red-700 rounded-lg font-bold text-sm hover:bg-red-200 transition-colors"
            >
              Again
            </button>
            <button
              onClick={() => handleGrade(3)}
              className="p-3 bg-orange-100 text-orange-700 rounded-lg font-bold text-sm hover:bg-orange-200 transition-colors"
            >
              Hard
            </button>
            <button
              onClick={() => handleGrade(4)}
              className="p-3 bg-blue-100 text-blue-700 rounded-lg font-bold text-sm hover:bg-blue-200 transition-colors"
            >
              Good
            </button>
            <button
              onClick={() => handleGrade(5)}
              className="p-3 bg-green-100 text-green-700 rounded-lg font-bold text-sm hover:bg-green-200 transition-colors"
            >
              Easy
            </button>
          </div>
        )}

        {/* Progress */}
        <div className="w-full mt-6">
          <Progress value={currentIndex + 1} max={reviewQueue.length} color="primary" />
        </div>
      </div>
    );
  }

  // ============================================
  // Decks View
  // ============================================
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-600" />
            Flashcards
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Spaced repetition for effective learning
          </p>
        </div>
        <Button onClick={() => setShowCreateModal(true)}>
          <Plus className="w-4 h-4" />
          Create Deck
        </Button>
      </div>

      {/* Due Today Banner */}
      {allDueCards.length > 0 && (
        <Card className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Clock className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">
                  {allDueCards.length} cards due today
                </h3>
                <p className="text-sm text-gray-500">
                  Across {new Set(allDueCards.map((d) => d.deckId)).size} decks
                </p>
              </div>
            </div>
            <Button onClick={startAllDueReview}>
              <Play className="w-4 h-4" />
              Review All
            </Button>
          </div>
        </Card>
      )}

      {/* Decks Grid */}
      {state.decks.length === 0 ? (
        <EmptyState
          icon={<Layers className="w-12 h-12" />}
          title="No flashcard decks"
          description="Create your first deck to start learning with spaced repetition"
          action={{ label: 'Create Deck', onClick: () => setShowCreateModal(true) }}
        />
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {state.decks.map((deck) => {
            const dueCount = getDueCardsForDeck(deck).length;
            return (
              <Card key={deck.id} className="p-4 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 truncate">{deck.title}</h3>
                    <p className="text-xs text-gray-500">{deck.subject}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteDeck(deck.id)}
                    className="text-gray-400 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                  <span>{deck.cards.length} cards</span>
                  <Badge
                    variant={dueCount > 0 ? 'primary' : 'default'}
                    size="sm"
                  >
                    {dueCount} due
                  </Badge>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant={dueCount > 0 ? 'primary' : 'outline'}
                    onClick={() => startDeckReview(deck)}
                    disabled={dueCount === 0}
                    className="flex-1"
                  >
                    <Play className="w-4 h-4" />
                    Review
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setActiveDeck(deck);
                      setShowAddCardModal(true);
                    }}
                  >
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Deck Modal */}
      <Modal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create Flashcard Deck"
      >
        <div className="space-y-4">
          <Input
            label="Deck Name"
            placeholder="e.g., Calculus Derivatives"
            value={newDeckName}
            onChange={(e) => setNewDeckName(e.target.value)}
          />

          <Select
            label="Subject"
            options={[{ value: '', label: 'Select subject...' }, ...projectOptions]}
            value={newDeckSubject}
            onChange={(e) => setNewDeckSubject(e.target.value)}
          />

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateDeck} disabled={!newDeckName.trim()}>
              Create Empty Deck
            </Button>
          </div>

          {isAiEnabled() && (
            <>
              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-white px-3 text-sm text-gray-500">or generate with AI</span>
                </div>
              </div>

              <Input
                label="AI Topic"
                placeholder="e.g., Newton's Laws of Motion"
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
              />

              <Button
                onClick={handleGenerateWithAI}
                disabled={!aiTopic.trim() || isGenerating}
                fullWidth
                variant="secondary"
              >
                <Sparkles className="w-4 h-4" />
                {isGenerating ? 'Generating...' : 'Generate with AI'}
              </Button>
            </>
          )}
        </div>
      </Modal>

      {/* Add Card Modal */}
      <Modal
        open={showAddCardModal}
        onClose={() => setShowAddCardModal(false)}
        title="Add Flashcard"
      >
        <div className="space-y-4">
          <Input
            label="Front (Question)"
            placeholder="What is the derivative of x²?"
            value={newCardFront}
            onChange={(e) => setNewCardFront(e.target.value)}
          />

          <Input
            label="Back (Answer)"
            placeholder="2x"
            value={newCardBack}
            onChange={(e) => setNewCardBack(e.target.value)}
          />

          <Input
            label="Example (Optional)"
            placeholder="If f(x) = x², then f'(x) = 2x"
            value={newCardExample}
            onChange={(e) => setNewCardExample(e.target.value)}
          />

          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setShowAddCardModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleAddCard}
              disabled={!newCardFront.trim() || !newCardBack.trim()}
            >
              Add Card
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default FlashcardsPage;
