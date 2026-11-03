/**
 * Settings Page - App Configuration
 * Timer settings, appearance, profile, language, data management
 */

import React, { useRef } from 'react';
import { useGlobal } from '../context/GlobalContext';
import { exportData, importData } from '../lib/storage/store';
import { useT } from '../i18n';
import { Card, Button, Input, SegmentedControl } from '../components/ui';
import { Theme, Language } from '../types';
import {
  Settings,
  Timer,
  Database,
  Download,
  Upload,
  Sparkles,
  Trash2,
  Palette,
  User,
  Globe,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { state, updateSettings, setTheme, setLanguage, setUserName, showToast } = useGlobal();
  const fileRef = useRef<HTMLInputElement>(null);
  const t = useT();

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      if (ev.target?.result) {
        const success = importData(ev.target.result as string);
        if (success) {
          showToast(t.settings.importSuccess, 'success');
          window.location.reload();
        } else {
          showToast(t.settings.importFailed, 'error');
        }
      }
    };
    reader.readAsText(file);
  };

  const handleExport = () => {
    exportData();
    showToast(t.settings.exportSuccess, 'success');
  };

  const handleClearData = () => {
    if (window.confirm(t.settings.clearConfirm)) {
      localStorage.clear();
      window.location.reload();
    }
  };

  const themeOptions: { value: Theme; label: string; icon: React.ReactNode }[] = [
    { value: 'light', label: t.settings.themeLight, icon: <Sun className="w-4 h-4" /> },
    { value: 'dark', label: t.settings.themeDark, icon: <Moon className="w-4 h-4" /> },
  ];

  const languageOptions: { value: Language; label: string }[] = [
    { value: 'en', label: t.settings.english },
    { value: 'vi', label: t.settings.vietnamese },
  ];

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Settings className="w-6 h-6 text-indigo-600" />
          {t.settings.title}
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          {t.settings.subtitle}
        </p>
      </div>

      {/* Profile Settings */}
      <Card className="p-6 space-y-4">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <User className="w-5 h-5 text-gray-400" />
          {t.settings.profile}
        </h2>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            {t.settings.yourName}
          </label>
          <Input
            type="text"
            value={state.settings.userName}
            onChange={(e) => setUserName(e.target.value)}
            placeholder={t.settings.namePlaceholder}
            maxLength={24}
          />
          <p className="text-xs text-gray-400 mt-1">
            {t.settings.nameHint}
          </p>
        </div>
      </Card>

      {/* Appearance Settings */}
      <Card className="p-6 space-y-4">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <Palette className="w-5 h-5 text-gray-400" />
          {t.settings.appearance}
        </h2>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-3 block">
            {t.settings.theme}
          </label>
          <div className="flex gap-3">
            {themeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setTheme(option.value)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border-2 transition-all ${
                  state.settings.theme === option.value
                    ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                    : 'border-gray-200 hover:border-gray-300 text-gray-700'
                }`}
              >
                {option.icon}
                <span className="font-medium text-sm">{option.label}</span>
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* Language Settings */}
      <Card className="p-6 space-y-4">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <Globe className="w-5 h-5 text-gray-400" />
          {t.settings.language}
        </h2>

        <div>
          <label className="text-sm font-medium text-gray-700 mb-3 block">
            {t.settings.languageSelect}
          </label>
          <SegmentedControl
            options={languageOptions}
            value={state.settings.language}
            onChange={setLanguage}
          />
        </div>
      </Card>

      {/* Timer Settings */}
      <Card className="p-6 space-y-4">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <Timer className="w-5 h-5 text-gray-400" />
          {t.settings.timerConfig}
        </h2>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              {t.settings.focusDuration}
            </label>
            <input
              type="number"
              min="5"
              max="120"
              value={state.settings.timer.focusMinutes}
              onChange={(e) =>
                updateSettings({ focusMinutes: parseInt(e.target.value) || 25 })
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              {t.settings.shortBreak}
            </label>
            <input
              type="number"
              min="1"
              max="30"
              value={state.settings.timer.shortBreakMinutes}
              onChange={(e) =>
                updateSettings({ shortBreakMinutes: parseInt(e.target.value) || 5 })
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              {t.settings.longBreak}
            </label>
            <input
              type="number"
              min="5"
              max="60"
              value={state.settings.timer.longBreakMinutes}
              onChange={(e) =>
                updateSettings({ longBreakMinutes: parseInt(e.target.value) || 15 })
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 mb-1 block">
              {t.settings.cyclesBeforeLong}
            </label>
            <input
              type="number"
              min="2"
              max="8"
              value={state.settings.timer.cyclesBeforeLongBreak}
              onChange={(e) =>
                updateSettings({ cyclesBeforeLongBreak: parseInt(e.target.value) || 4 })
              }
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>
      </Card>

      {/* AI Features */}
      <Card className="p-6 space-y-4">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-gray-400" />
          {t.settings.aiFeatures}
        </h2>

        <p className="text-xs text-gray-400">
          {t.settings.aiDescription}{' '}
          {t.settings.getApiKey}{' '}
          <a
            href="https://ai.google.dev/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 hover:underline"
          >
            Google AI Studio
          </a>
        </p>
      </Card>

      {/* Data Management */}
      <Card className="p-6 space-y-4">
        <h2 className="font-semibold text-gray-900 flex items-center gap-2">
          <Database className="w-5 h-5 text-gray-400" />
          {t.settings.dataManagement}
        </h2>

        <p className="text-sm text-gray-500">
          {t.settings.dataDescription}
        </p>

        <div className="flex flex-wrap gap-3">
          <Button variant="outline" onClick={handleExport}>
            <Download className="w-4 h-4" />
            {t.settings.exportData}
          </Button>

          <div className="relative">
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload className="w-4 h-4" />
              {t.settings.importData}
            </Button>
            <input
              type="file"
              ref={fileRef}
              onChange={handleImport}
              accept=".json"
              className="hidden"
            />
          </div>

          <Button variant="danger" onClick={handleClearData}>
            <Trash2 className="w-4 h-4" />
            {t.settings.clearData}
          </Button>
        </div>

        <div className="text-xs text-gray-400 space-y-1 pt-2">
          <p>{t.settings.storageUsed}: ~{(JSON.stringify(state).length / 1024).toFixed(1)} KB</p>
          <p>{t.settings.schemaVersion}: {state.schemaVersion}</p>
        </div>
      </Card>

      {/* Stats Summary */}
      <Card className="p-6">
        <h2 className="font-semibold text-gray-900 mb-4">{t.settings.dataSummary}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <p className="text-gray-500">{t.tasks.title}</p>
            <p className="text-xl font-bold text-gray-900">{state.tasks.length}</p>
          </div>
          <div>
            <p className="text-gray-500">{t.notes.title}</p>
            <p className="text-xl font-bold text-gray-900">{state.notes.length}</p>
          </div>
          <div>
            <p className="text-gray-500">{t.flashcards.title}</p>
            <p className="text-xl font-bold text-gray-900">{state.decks.length}</p>
          </div>
          <div>
            <p className="text-gray-500">{t.sessions.title}</p>
            <p className="text-xl font-bold text-gray-900">{state.sessions.length}</p>
          </div>
        </div>
      </Card>

      {/* Footer */}
      <div className="text-center text-xs text-gray-400 pt-4">
        <p>FocusLearn v3.0 - {t.app.tagline}</p>
        <p className="mt-1">Built with React, TypeScript, and Tailwind CSS</p>
      </div>
    </div>
  );
};

export default SettingsPage;
