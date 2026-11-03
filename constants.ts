/**
 * Constants for FocusLearn Study OS
 */

import { QuizData } from './types';

// Available subjects for focus sessions
export const SUBJECTS = ['Math', 'English', 'Physics', 'History', 'General'];

// Project colors
export const PROJECT_COLORS = [
  '#6366f1', // Indigo
  '#22c55e', // Green
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#f97316', // Orange
];

// Focus tips shown during timer sessions
export const FOCUS_TIPS = [
  "Turn off phone notifications.",
  "Keep water nearby.",
  "Focus on one thing at a time.",
  "Take deep breaths during breaks.",
  "Visualize the completed task.",
  "Break large tasks into smaller chunks.",
  "Set a clear intention for this session.",
  "Eliminate visual distractions.",
  "Stay curious about what you're learning.",
  "Your future self will thank you.",
];

// Break activities for break planner
export const BREAK_ACTIVITIES = [
  { id: 'water', label: 'Drink water', icon: 'Droplets' },
  { id: 'stretch', label: 'Stretch', icon: 'Dumbbell' },
  { id: 'breathe', label: 'Deep breathing', icon: 'Wind' },
  { id: 'walk', label: 'Walk around', icon: 'Footprints' },
  { id: 'eyes', label: 'Rest eyes', icon: 'Eye' },
  { id: 'snack', label: 'Healthy snack', icon: 'Apple' },
];

// Distraction categories
export const DISTRACTION_CATEGORIES = [
  { id: 'phone', label: 'Phone', icon: 'Smartphone' },
  { id: 'social', label: 'Social Media', icon: 'MessageCircle' },
  { id: 'web', label: 'Web Browsing', icon: 'Globe' },
  { id: 'people', label: 'People', icon: 'Users' },
  { id: 'noise', label: 'Noise', icon: 'Volume2' },
  { id: 'thoughts', label: 'Wandering Thoughts', icon: 'Brain' },
  { id: 'hunger', label: 'Hunger/Thirst', icon: 'UtensilsCrossed' },
  { id: 'other', label: 'Other', icon: 'MoreHorizontal' },
];

// Task priority configuration
export const TASK_PRIORITIES = {
  urgent: { label: 'Urgent', color: 'red', icon: 'AlertCircle' },
  high: { label: 'High', color: 'orange', icon: 'ArrowUp' },
  medium: { label: 'Medium', color: 'blue', icon: 'Minus' },
  low: { label: 'Low', color: 'gray', icon: 'ArrowDown' },
};

// Task status configuration
export const TASK_STATUSES = {
  inbox: { label: 'Inbox', color: 'gray', icon: 'Inbox' },
  todo: { label: 'Todo', color: 'blue', icon: 'Circle' },
  in_progress: { label: 'In Progress', color: 'amber', icon: 'Clock' },
  done: { label: 'Done', color: 'green', icon: 'CheckCircle' },
};

// Markdown slash commands for notes
export const SLASH_COMMANDS = [
  { command: '/h1', label: 'Heading 1', insert: '# ' },
  { command: '/h2', label: 'Heading 2', insert: '## ' },
  { command: '/h3', label: 'Heading 3', insert: '### ' },
  { command: '/todo', label: 'Todo item', insert: '- [ ] ' },
  { command: '/bullet', label: 'Bullet list', insert: '- ' },
  { command: '/number', label: 'Numbered list', insert: '1. ' },
  { command: '/quote', label: 'Quote', insert: '> ' },
  { command: '/code', label: 'Code block', insert: '```\n\n```' },
  { command: '/divider', label: 'Divider', insert: '\n---\n' },
  { command: '/link', label: 'Link', insert: '[[' },
];

// Comprehensive fallback question bank
export const FALLBACK_QUIZZES: Record<string, QuizData> = {
  'Math': {
    title: "Math Quiz (Offline)",
    questions: [
      { q: "What is 15 + 27?", choices: { A: "42", B: "43", C: "41", D: "44" }, answer: "A", explanation: "15 + 27 = 42" },
      { q: "What is 8 × 7?", choices: { A: "54", B: "56", C: "58", D: "49" }, answer: "B", explanation: "8 × 7 = 56" },
      { q: "What is the square root of 81?", choices: { A: "8", B: "7", C: "9", D: "10" }, answer: "C", explanation: "√81 = 9 because 9 × 9 = 81" },
      { q: "What is 100 ÷ 4?", choices: { A: "20", B: "25", C: "30", D: "15" }, answer: "B", explanation: "100 ÷ 4 = 25" },
      { q: "What is 3² + 4²?", choices: { A: "25", B: "12", C: "7", D: "49" }, answer: "A", explanation: "3² + 4² = 9 + 16 = 25" },
      { q: "What is 50% of 80?", choices: { A: "30", B: "40", C: "45", D: "35" }, answer: "B", explanation: "50% of 80 = 0.5 × 80 = 40" },
      { q: "What is the perimeter of a square with side 5?", choices: { A: "15", B: "25", C: "20", D: "10" }, answer: "C", explanation: "Perimeter = 4 × side = 4 × 5 = 20" },
      { q: "What is 12 - (-5)?", choices: { A: "7", B: "17", C: "-7", D: "12" }, answer: "B", explanation: "12 - (-5) = 12 + 5 = 17" },
      { q: "What is 2⁴?", choices: { A: "8", B: "12", C: "16", D: "32" }, answer: "C", explanation: "2⁴ = 2 × 2 × 2 × 2 = 16" },
      { q: "If x + 5 = 12, what is x?", choices: { A: "5", B: "6", C: "7", D: "17" }, answer: "C", explanation: "x = 12 - 5 = 7" },
      { q: "What is the area of a rectangle 6×4?", choices: { A: "20", B: "24", C: "10", D: "28" }, answer: "B", explanation: "Area = length × width = 6 × 4 = 24" },
      { q: "What is 1/4 + 1/4?", choices: { A: "1/8", B: "1/2", C: "2/4", D: "1" }, answer: "B", explanation: "1/4 + 1/4 = 2/4 = 1/2" },
    ]
  },
  'English': {
    title: "English Quiz (Offline)",
    questions: [
      { q: "Which word is a noun?", choices: { A: "Run", B: "Beautiful", C: "Library", D: "Quickly" }, answer: "C", explanation: "Library is a noun (a place)" },
      { q: "What is the plural of 'child'?", choices: { A: "Childs", B: "Children", C: "Childes", D: "Child" }, answer: "B", explanation: "The irregular plural of child is children" },
      { q: "Which is the correct spelling?", choices: { A: "Recieve", B: "Receive", C: "Receeve", D: "Recive" }, answer: "B", explanation: "Receive follows 'i before e except after c'" },
      { q: "What is a synonym for 'happy'?", choices: { A: "Sad", B: "Joyful", C: "Angry", D: "Tired" }, answer: "B", explanation: "Joyful means the same as happy" },
      { q: "Which word is an adjective?", choices: { A: "Run", B: "Quickly", C: "Beautiful", D: "House" }, answer: "C", explanation: "Beautiful describes a noun (adjective)" },
      { q: "What is the past tense of 'go'?", choices: { A: "Goed", B: "Gone", C: "Went", D: "Going" }, answer: "C", explanation: "Went is the irregular past tense of go" },
      { q: "Which sentence is correct?", choices: { A: "She don't like it", B: "She doesn't like it", C: "She not like it", D: "She no like it" }, answer: "B", explanation: "Third person singular uses 'doesn't'" },
      { q: "What is an antonym for 'hot'?", choices: { A: "Warm", B: "Cold", C: "Burning", D: "Heated" }, answer: "B", explanation: "Cold is the opposite of hot" },
      { q: "Which is a compound word?", choices: { A: "Running", B: "Sunshine", C: "Beautiful", D: "Quickly" }, answer: "B", explanation: "Sunshine = sun + shine" },
      { q: "What punctuation ends a question?", choices: { A: "Period", B: "Exclamation", C: "Question mark", D: "Comma" }, answer: "C", explanation: "Questions end with a question mark (?)" },
    ]
  },
  'Physics': {
    title: "Physics Quiz (Offline)",
    questions: [
      { q: "What is the SI unit of force?", choices: { A: "Joule", B: "Watt", C: "Newton", D: "Pascal" }, answer: "C", explanation: "Force is measured in Newtons (N)" },
      { q: "What is the speed of light (approx)?", choices: { A: "300,000 km/s", B: "150,000 km/s", C: "1,000 km/s", D: "30,000 km/s" }, answer: "A", explanation: "Light travels at approximately 300,000 km/s" },
      { q: "What does F=ma represent?", choices: { A: "Energy equation", B: "Newton's Second Law", C: "Ohm's Law", D: "Power formula" }, answer: "B", explanation: "F=ma is Newton's Second Law of Motion" },
      { q: "What is the unit of energy?", choices: { A: "Newton", B: "Watt", C: "Joule", D: "Ampere" }, answer: "C", explanation: "Energy is measured in Joules (J)" },
      { q: "What type of energy does a moving car have?", choices: { A: "Potential", B: "Kinetic", C: "Thermal", D: "Chemical" }, answer: "B", explanation: "Moving objects have kinetic energy" },
      { q: "What is the formula for velocity?", choices: { A: "v = d/t", B: "v = d×t", C: "v = t/d", D: "v = d+t" }, answer: "A", explanation: "Velocity = distance ÷ time" },
      { q: "What force pulls objects toward Earth?", choices: { A: "Friction", B: "Magnetism", C: "Gravity", D: "Tension" }, answer: "C", explanation: "Gravity pulls objects toward Earth's center" },
      { q: "What is the unit of electric current?", choices: { A: "Volt", B: "Ohm", C: "Watt", D: "Ampere" }, answer: "D", explanation: "Electric current is measured in Amperes (A)" },
      { q: "What does a prism do to white light?", choices: { A: "Absorbs it", B: "Reflects it", C: "Disperses it", D: "Blocks it" }, answer: "C", explanation: "A prism disperses white light into spectrum colors" },
      { q: "What is the acceleration due to gravity?", choices: { A: "9.8 m/s²", B: "10.5 m/s²", C: "8.5 m/s²", D: "11 m/s²" }, answer: "A", explanation: "Earth's gravitational acceleration is ~9.8 m/s²" },
    ]
  },
  'History': {
    title: "History Quiz (Offline)",
    questions: [
      { q: "In what year did World War II end?", choices: { A: "1943", B: "1944", C: "1945", D: "1946" }, answer: "C", explanation: "WWII ended in 1945 with Japan's surrender" },
      { q: "Who was the first US President?", choices: { A: "Jefferson", B: "Lincoln", C: "Washington", D: "Adams" }, answer: "C", explanation: "George Washington was the first US President (1789-1797)" },
      { q: "What empire built the Colosseum?", choices: { A: "Greek", B: "Roman", C: "Egyptian", D: "Persian" }, answer: "B", explanation: "The Romans built the Colosseum in 70-80 AD" },
      { q: "When was the Declaration of Independence signed?", choices: { A: "1774", B: "1775", C: "1776", D: "1777" }, answer: "C", explanation: "The Declaration was signed on July 4, 1776" },
      { q: "Who discovered America in 1492?", choices: { A: "Magellan", B: "Columbus", C: "Vespucci", D: "Cabot" }, answer: "B", explanation: "Christopher Columbus reached the Americas in 1492" },
      { q: "What ancient wonder was in Egypt?", choices: { A: "Hanging Gardens", B: "Colossus", C: "Great Pyramid", D: "Lighthouse" }, answer: "C", explanation: "The Great Pyramid of Giza is in Egypt" },
      { q: "When did the French Revolution begin?", choices: { A: "1776", B: "1789", C: "1799", D: "1804" }, answer: "B", explanation: "The French Revolution began in 1789" },
      { q: "What wall fell in 1989?", choices: { A: "Great Wall", B: "Berlin Wall", C: "Hadrian's Wall", D: "Wall Street" }, answer: "B", explanation: "The Berlin Wall fell on November 9, 1989" },
      { q: "Who was the first man on the Moon?", choices: { A: "Buzz Aldrin", B: "Neil Armstrong", C: "John Glenn", D: "Yuri Gagarin" }, answer: "B", explanation: "Neil Armstrong walked on the Moon on July 20, 1969" },
      { q: "What year did the Titanic sink?", choices: { A: "1910", B: "1911", C: "1912", D: "1913" }, answer: "C", explanation: "The Titanic sank on April 15, 1912" },
    ]
  },
  'General': {
    title: "General Knowledge (Offline)",
    questions: [
      { q: "What is the largest planet in our solar system?", choices: { A: "Saturn", B: "Jupiter", C: "Neptune", D: "Uranus" }, answer: "B", explanation: "Jupiter is the largest planet" },
      { q: "What is H2O commonly known as?", choices: { A: "Salt", B: "Sugar", C: "Water", D: "Acid" }, answer: "C", explanation: "H2O is the chemical formula for water" },
      { q: "How many continents are there?", choices: { A: "5", B: "6", C: "7", D: "8" }, answer: "C", explanation: "There are 7 continents on Earth" },
      { q: "What is the capital of Japan?", choices: { A: "Kyoto", B: "Osaka", C: "Tokyo", D: "Nagoya" }, answer: "C", explanation: "Tokyo is Japan's capital city" },
      { q: "What organ pumps blood in the body?", choices: { A: "Brain", B: "Lungs", C: "Liver", D: "Heart" }, answer: "D", explanation: "The heart pumps blood throughout the body" },
      { q: "What is the largest ocean?", choices: { A: "Atlantic", B: "Indian", C: "Pacific", D: "Arctic" }, answer: "C", explanation: "The Pacific Ocean is the largest ocean" },
      { q: "What gas do plants absorb?", choices: { A: "Oxygen", B: "Nitrogen", C: "Carbon dioxide", D: "Hydrogen" }, answer: "C", explanation: "Plants absorb CO2 for photosynthesis" },
      { q: "How many days are in a leap year?", choices: { A: "364", B: "365", C: "366", D: "367" }, answer: "C", explanation: "Leap years have 366 days (Feb 29)" },
      { q: "What is the hardest natural substance?", choices: { A: "Gold", B: "Iron", C: "Diamond", D: "Platinum" }, answer: "C", explanation: "Diamond is the hardest natural substance" },
      { q: "What is the largest mammal?", choices: { A: "Elephant", B: "Blue Whale", C: "Giraffe", D: "Hippopotamus" }, answer: "B", explanation: "The blue whale is the largest mammal" },
    ]
  },
};

// Fallback flashcards
export const FALLBACK_FLASHCARDS = [
  { front: "Photosynthesis", back: "Process by which plants make food using sunlight." },
  { front: "Mitochondria", back: "Powerhouse of the cell - produces ATP energy." },
  { front: "Pythagorean Theorem", back: "a² + b² = c² (for right triangles)" },
  { front: "Newton's First Law", back: "An object at rest stays at rest; an object in motion stays in motion." },
  { front: "Compound Sentence", back: "Two independent clauses joined by a coordinating conjunction." },
];
