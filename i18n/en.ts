/**
 * English translations for FocusLearn
 */

export const en = {
  // App
  app: {
    name: 'FocusLearn',
    tagline: 'Study OS',
  },

  // Navigation / Sidebar
  nav: {
    dashboard: 'Dashboard',
    inbox: 'Inbox',
    todo: 'Todo',
    tasks: 'Tasks',
    projects: 'Projects',
    notes: 'Notes',
    flashcards: 'Flashcards',
    timer: 'Timer',
    sessions: 'Sessions',
    analytics: 'Analytics',
    settings: 'Settings',
    chat: 'AI Chat',
    search: 'Search...',
  },

  // Dashboard
  dashboard: {
    title: 'Dashboard',
    subtitle: 'Your study overview',
    greeting: 'Welcome back',
    greetingMorning: 'Good morning',
    greetingAfternoon: 'Good afternoon',
    greetingEvening: 'Good evening',
    todaysTasks: "Today's Tasks",
    recentSessions: 'Recent Sessions',
    quickStats: 'Quick Stats',
    focusMinutes: 'Focus Minutes',
    tasksCompleted: 'Tasks Completed',
    streakDays: 'Day Streak',
    avgQuizScore: 'Avg Quiz Score',
    // Dashboard cards
    todaysFocus: "Today's Focus",
    currentStreak: 'Current Streak',
    cardsDue: 'Cards Due',
    startFocusSession: 'Start Focus Session',
    viewAll: 'View All',
    noTasksToday: 'No tasks for today',
    addTasksToSee: 'Add tasks with due dates to see them here',
    addTask: 'Add Task',
    flashcardReview: 'Flashcard Review',
    allCaughtUp: 'All caught up!',
    noFlashcardsDue: 'No flashcards due for review today',
    cardsDueToday: 'cards due today',
    startReviewSession: 'Start Review Session',
    currentCycle: 'Current Cycle',
    manage: 'Manage',
    progress: 'Progress',
    tasks: 'tasks',
    noActiveCycle: 'No active cycle',
    createCycleDesc: 'Create a weekly cycle to track your sprint',
    triage: 'Triage',
    inboxZero: 'Inbox zero!',
    quickCapturesHere: 'Quick captures will appear here',
    moreItems: 'more items',
    noSessionsYet: 'No sessions yet',
    startSessionDesc: 'Start a focus session to begin tracking your progress',
    startSession: 'Start Session',
    thisWeek: 'This Week',
    minutesFocused: 'minutes focused across',
    sessionsText: 'sessions',
    viewAnalytics: 'View Analytics',
    // Todo widget
    todoToday: 'Todo Today',
    noTodosToday: 'No todos for today',
    addFirstTodo: 'Add your first todo to get started',
    quickNoteCapture: 'Quick Note',
  },

  // Timer
  timer: {
    title: 'Focus Timer',
    subtitle: 'Configure and start your study session',
    pomodoroSessions: 'Pomodoro sessions',
    subject: 'Subject',
    focusDuration: 'Focus Duration',
    breakDuration: 'Break Duration',
    planBreak: 'Plan Your Break (Optional)',
    startSession: 'Start Focus Session',
    pause: 'Pause',
    resume: 'Resume',
    stop: 'Stop',
    zen: 'Zen',
    logDistraction: 'Log Distraction',
    complete: 'complete',
    sessionComplete: 'Focus session completed!',
    keyboardHint: 'Keyboard: Space = Pause/Resume, Z = Zen Mode, R = Reset',
    exitZen: 'Exit Zen',
    // Open-ended mode
    sessionMode: 'Session Mode',
    timed: 'Timed',
    openEnded: 'Open-ended',
    timedDesc: 'Set a duration and count down',
    openEndedDesc: 'No time limit - stop when ready',
    stopAnytime: 'You can stop anytime',
    elapsedTime: 'Elapsed Time',
    endSession: 'End Session',
    endSessionPrompt: 'End your focus session?',
    focusRating: 'How focused were you?',
    skipQuiz: 'Skip Quiz',
    takeQuiz: 'Take Quiz',
    // Todo linking
    linkTodo: 'Link Todo',
    selectTodo: 'Select a todo to focus on',
    noTodoLinked: 'No todo linked',
    linkedTo: 'Linked to',
  },

  // Quiz
  quiz: {
    title: 'Quiz',
    subtitle: 'Test your knowledge',
    question: 'Question',
    submit: 'Submit Answers',
    score: 'Score',
    passed: 'Great job!',
    failed: 'Keep practicing!',
    retry: 'Retry Quiz',
    skip: 'Skip',
    continueBtn: 'Continue',
    explanation: 'Explanation',
    correct: 'Correct!',
    incorrect: 'Incorrect',
  },

  // Tasks
  tasks: {
    title: 'Tasks',
    subtitle: 'Manage your work',
    newTask: 'New Task',
    todo: 'To Do',
    inProgress: 'In Progress',
    done: 'Done',
    priority: 'Priority',
    dueDate: 'Due Date',
    estimate: 'Estimate',
    noTasks: 'No tasks yet',
    addFirst: 'Add your first task',
  },

  // Todo (Notion-like checklist)
  todo: {
    title: 'Todo',
    subtitle: 'Your daily checklist',
    addPlaceholder: 'Add a new todo...',
    noTodos: 'No todos yet',
    addFirstTodo: 'Add your first todo',
    addFirstTodoDesc: 'Press Enter to add a new item',
    all: 'All',
    active: 'Active',
    completed: 'Completed',
    clearCompleted: 'Clear Completed',
    itemsLeft: 'items left',
    itemLeft: 'item left',
    priority: {
      low: 'Low',
      medium: 'Medium',
      high: 'High',
      urgent: 'Urgent',
    },
    dueToday: 'Due today',
    overdue: 'Overdue',
    noDueDate: 'No due date',
    setDueDate: 'Set due date',
    editTitle: 'Edit title',
    deleteTodo: 'Delete todo',
  },

  // Projects
  projects: {
    title: 'Projects',
    subtitle: 'Subjects & cycles',
    newProject: 'New Project',
    noProjects: 'No projects yet',
  },

  // Notes
  notes: {
    title: 'Notes',
    subtitle: 'Your knowledge base',
    newNote: 'New Note',
    noNotes: 'No notes yet',
    startWriting: 'Start writing',
    quickNote: 'Quick Note',
    quickNotePlaceholder: 'Write a quick note...',
  },

  // Flashcards
  flashcards: {
    title: 'Flashcards',
    subtitle: 'Spaced repetition',
    newDeck: 'New Deck',
    dueToday: 'Due Today',
    review: 'Review',
    noDecks: 'No flashcard decks yet',
    createFirst: 'Create your first deck',
    easy: 'Easy',
    medium: 'Medium',
    hard: 'Hard',
    again: 'Again',
  },

  // Sessions
  sessions: {
    title: 'Session History',
    subtitle: 'Review past sessions',
    noSessions: 'No sessions yet',
    startFirst: 'Complete your first focus session',
    duration: 'Duration',
    distractions: 'Distractions',
    mode: 'Mode',
    rating: 'Focus Rating',
  },

  // Analytics
  analytics: {
    title: 'Analytics',
    subtitle: 'Track your progress',
    totalFocus: 'Total Focus Time',
    avgSession: 'Avg Session',
    bestHour: 'Best Study Hour',
    topDistraction: 'Top Distraction',
    weeklyProgress: 'Weekly Progress',
  },

  // Settings
  settings: {
    title: 'Settings',
    subtitle: 'Configure your workspace',
    // Sections
    appearance: 'Appearance',
    profile: 'Profile',
    language: 'Language',
    timerConfig: 'Timer Configuration',
    aiFeatures: 'AI Features',
    dataManagement: 'Data Management',
    // Theme
    theme: 'Theme',
    themeLight: 'Light',
    themeDark: 'Dark',
    themeSystem: 'System',
    // Profile
    yourName: 'Your Name',
    namePlaceholder: 'Enter your name',
    nameHint: 'Shown in greetings and AI chat context',
    // Language
    languageSelect: 'Display Language',
    english: 'English',
    vietnamese: 'Vietnamese',
    // Timer
    focusDuration: 'Focus Duration (min)',
    shortBreak: 'Short Break (min)',
    longBreak: 'Long Break (min)',
    cyclesBeforeLong: 'Cycles Before Long Break',
    // AI
    aiEnabled: 'AI Enabled',
    aiDisabled: 'AI Disabled',
    aiConfigured: 'AI features are available',
    aiMissing: 'Configure API key in repository environment',
    aiActive: 'Active',
    aiInactive: 'Inactive',
    aiDescription: 'AI features include quiz generation, flashcard creation, and study coaching.',
    aiHelpTooltip: 'Set up the Gemini API key in your repository environment variables to enable AI features.',
    getApiKey: 'Get your API key from',
    // Data
    dataDescription: 'Export your progress to transfer devices or keep a backup. All data is stored locally in your browser.',
    exportData: 'Export Data',
    importData: 'Import Data',
    clearData: 'Clear All Data',
    clearConfirm: 'Are you sure you want to clear all data? This cannot be undone.',
    storageUsed: 'Storage used',
    schemaVersion: 'Schema version',
    importSuccess: 'Data imported successfully',
    importFailed: 'Failed to import data',
    exportSuccess: 'Data exported',
    // Summary
    dataSummary: 'Data Summary',
  },

  // AI Chat
  chat: {
    title: 'AI Chat',
    subtitle: 'Your study assistant',
    newChat: 'New Chat',
    today: 'Today',
    yesterday: 'Yesterday',
    older: 'Older',
    searchChats: 'Search chats...',
    typeMessage: 'Type a message...',
    send: 'Send',
    generating: 'Generating...',
    thinking: 'Thinking...',
    enterToSend: 'Enter to send, Shift+Enter for new line',
    // Context panel
    studyContext: 'Study Context',
    contextEnabled: 'Context Enabled',
    userInfo: 'User Info',
    activeTask: 'Active Task',
    noActiveTask: 'No active task',
    todayTodos: "Today's Todos",
    noTodos: 'No todos',
    todayTasksSummary: "Today's Tasks",
    noTasks: 'No tasks',
    flashcardsDue: 'Flashcards Due',
    recentSessions: 'Recent Sessions',
    noRecentSessions: 'No recent sessions',
    wrongTopics: 'Topics to Review',
    recentDistractions: 'Recent Distractions',
    none: 'None',
    // Quick actions
    quickActions: 'Quick Actions',
    explainConcept: 'Explain concept',
    studyPlan: 'Make a 30-min study plan',
    practiceQuestions: 'Generate practice questions',
    summarizeNotes: 'Summarize my notes',
    quizMe: 'Quiz me now',
    // Context toggles
    includeTasks: 'Include Today Tasks',
    includeProject: 'Include Current Subject',
    includeQuizMistakes: 'Include Recent Quiz Mistakes',
    includeDistractions: 'Include Recent Distractions',
    includeNotes: 'Include Selected Notes',
    // States
    aiUnavailable: 'AI currently unavailable',
    offlineMode: 'Offline Mode',
    offlineMessage: 'AI is in offline mode. Try the quick actions above for template study guidance.',
    noChats: 'No conversations yet',
    startConversation: 'Start your first conversation',
    startNewChat: 'Start a new chat',
    deleteChat: 'Delete Chat',
    deleteConfirm: 'Delete this conversation?',
    rename: 'Rename',
    renameChat: 'Rename Chat',
    miniChat: 'Quick Chat',
    copy: 'Copy',
    copySuccess: 'Copied to clipboard',
    retry: 'Retry',
    errorResponse: 'Something went wrong. Please try again.',
    aiUnreachableToast: "Couldn't reach AI. Try again.",
    aiUnreachableMessage: "Couldn't reach AI. Try again.",
  },

  // Inbox
  inbox: {
    title: 'Inbox',
    subtitle: 'Quick capture & triage',
    quickCapture: 'Quick Capture',
    noItems: 'Inbox is empty',
    captureIdeas: 'Capture ideas quickly',
    convertToTask: 'Convert to Task',
    convertToNote: 'Convert to Note',
    archive: 'Archive',
  },

  // Break activities
  break: {
    water: 'Water',
    stretch: 'Stretch',
    breathe: 'Breathe',
    walk: 'Walk',
    eyes: 'Rest Eyes',
    snack: 'Snack',
  },

  // Distractions
  distractions: {
    title: 'Log Distraction',
    description: 'What distracted you? This helps identify patterns.',
    phone: 'Phone',
    socialMedia: 'Social Media',
    noise: 'Noise',
    people: 'People',
    thoughts: 'Wandering Thoughts',
    hunger: 'Hunger/Thirst',
    tired: 'Tired',
    other: 'Other',
  },

  // Common
  common: {
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    close: 'Close',
    confirm: 'Confirm',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    min: 'min',
    minutes: 'minutes',
    hours: 'hours',
    days: 'days',
    of: 'of',
    and: 'and',
    review: 'Review',
  },

  // Empty states
  empty: {
    noData: 'No data yet',
    getStarted: 'Get started',
  },

  // Offline templates for AI chat
  offline: {
    explainConcept: "I'd be happy to explain a concept! When I'm connected, I can provide detailed explanations on any topic. For now, try breaking down the concept into smaller parts and review your notes.",
    studyPlan: "Here's a template 30-minute study plan:\n\n1. **0-5 min**: Review previous material\n2. **5-20 min**: Active learning (read, practice problems)\n3. **20-25 min**: Self-test or flashcards\n4. **25-30 min**: Summarize key points\n\nAdjust based on your subject and goals!",
    practiceQuestions: "I can generate practice questions when connected. For now, try:\n\n1. Turn your notes into questions\n2. Explain concepts to yourself\n3. Create flashcards from key terms\n4. Practice past quiz questions",
    summarizeNotes: "To summarize notes effectively:\n\n1. Identify the main topic\n2. List 3-5 key points\n3. Note any formulas or definitions\n4. Write connections to other topics\n\nI can help summarize specific content when connected!",
    quizMe: "I'll quiz you when connected! For now, try:\n\n1. Cover your notes and recall key points\n2. Use your flashcard decks\n3. Explain a concept without looking\n4. Answer end-of-chapter questions",
  },
} as const;

// Deep type that converts literal strings to just string
type DeepString<T> = {
  [K in keyof T]: T[K] extends string ? string : DeepString<T[K]>;
};

export type TranslationKeys = DeepString<typeof en>;
