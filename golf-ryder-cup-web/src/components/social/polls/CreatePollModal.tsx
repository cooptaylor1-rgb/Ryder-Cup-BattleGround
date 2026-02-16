/**
 * Create Poll Modal
 *
 * Production-ready poll creation with templates and custom options.
 */

'use client';

import { useState, useCallback } from 'react';
import {
  X,
  Plus,
  Trash2,
  Clock,
  Utensils,
  Calendar,
  Trophy,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { createPoll, createFromTemplate, POLL_TEMPLATES } from '@/lib/services/pollService';
import type { PollType, PollCategory, Poll } from '@/lib/types/social';

interface CreatePollModalProps {
  tripId: string;
  creatorId: string;
  creatorName: string;
  playerNames?: string[]; // For player-specific polls
  onClose: () => void;
  onCreated: (poll: Poll) => void;
}

export function CreatePollModal({
  tripId,
  creatorId,
  creatorName,
  playerNames = [],
  onClose,
  onCreated,
}: CreatePollModalProps) {
  const [mode, setMode] = useState<'templates' | 'custom'>('templates');
  const [question, setQuestion] = useState('');
  const [description, setDescription] = useState('');
  const [options, setOptions] = useState<string[]>(['', '']);
  const [pollType, setPollType] = useState<PollType>('single');
  const [category] = useState<PollCategory>('other');
  const [allowAddOptions, setAllowAddOptions] = useState(false);
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [expiresIn, setExpiresIn] = useState<number | null>(null); // Hours
  const [isCreating, setIsCreating] = useState(false);

  const handleAddOption = useCallback(() => {
    if (options.length < 10) {
      setOptions([...options, '']);
    }
  }, [options]);

  const handleRemoveOption = useCallback((index: number) => {
    if (options.length > 2) {
      setOptions(options.filter((_, i) => i !== index));
    }
  }, [options]);

  const handleOptionChange = useCallback((index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  }, [options]);

  const handleCreateCustom = useCallback(async () => {
    const validOptions = options.filter(o => o.trim());
    if (!question.trim() || validOptions.length < 2) return;

    setIsCreating(true);
    try {
      const closesAt = expiresIn
        ? new Date(Date.now() + expiresIn * 60 * 60 * 1000).toISOString()
        : undefined;

      const poll = await createPoll(
        tripId,
        creatorId,
        creatorName,
        question.trim(),
        validOptions,
        pollType,
        category,
        {
          description: description.trim() || undefined,
          closesAt,
          allowAddOptions,
          isAnonymous,
        }
      );

      onCreated(poll);
      onClose();
    } catch (error) {
      console.error('Failed to create poll:', error);
    } finally {
      setIsCreating(false);
    }
  }, [
    tripId,
    creatorId,
    creatorName,
    question,
    description,
    options,
    pollType,
    category,
    expiresIn,
    allowAddOptions,
    isAnonymous,
    onCreated,
    onClose,
  ]);

  const handleSelectTemplate = useCallback(async (templateIndex: number) => {
    const template = POLL_TEMPLATES[templateIndex];
    if (!template) return;

    setIsCreating(true);
    try {
      // For player-specific templates, use player names
      const customOptions = template.options.length === 0 ? playerNames : undefined;

      const closesAt = new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(); // 4 hours

      const poll = await createFromTemplate(
        tripId,
        creatorId,
        creatorName,
        templateIndex,
        customOptions,
        closesAt
      );

      onCreated(poll);
      onClose();
    } catch (error) {
      console.error('Failed to create poll from template:', error);
    } finally {
      setIsCreating(false);
    }
  }, [tripId, creatorId, creatorName, playerNames, onCreated, onClose]);

  const categoryIcons: Record<PollCategory, typeof Utensils> = {
    dinner: Utensils,
    schedule: Calendar,
    rules: Trophy,
    activity: Sparkles,
    fun: Sparkles,
    other: HelpCircle,
  };

  const isValidCustom = question.trim() && options.filter(o => o.trim()).length >= 2;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[color:var(--ink)]/60 backdrop-blur-sm">
      <div className="card rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col animate-scale-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[var(--rule)]">
          <h2 className="type-h3">Create Poll</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-[var(--surface-secondary)] transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Mode Tabs */}
        <div className="flex border-b border-[var(--rule)]">
          <button
            onClick={() => setMode('templates')}
            className={cn(
              'flex-1 py-3 type-body font-medium transition-colors',
              mode === 'templates'
                ? 'text-[var(--accent)] border-b-2 border-[var(--accent)]'
                : 'text-[var(--ink-tertiary)] hover:text-[var(--ink-secondary)]'
            )}
          >
            Quick Templates
          </button>
          <button
            onClick={() => setMode('custom')}
            className={cn(
              'flex-1 py-3 type-body font-medium transition-colors',
              mode === 'custom'
                ? 'text-[var(--accent)] border-b-2 border-[var(--accent)]'
                : 'text-[var(--ink-tertiary)] hover:text-[var(--ink-secondary)]'
            )}
          >
            Custom Poll
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {mode === 'templates' ? (
            <div className="space-y-3">
              {POLL_TEMPLATES.map((template, index) => {
                const Icon = categoryIcons[template.category] || HelpCircle;
                const needsPlayers = template.options.length === 0;
                const disabled = needsPlayers && playerNames.length === 0;

                return (
                  <button
                    key={index}
                    onClick={() => !disabled && handleSelectTemplate(index)}
                    disabled={disabled || isCreating}
                    className={cn(
                      'w-full p-4 rounded-xl text-left transition-all',
                      disabled
                        ? 'opacity-50 cursor-not-allowed bg-[var(--surface-secondary)]'
                        : 'bg-[var(--surface-secondary)] hover:bg-[var(--surface)] hover:scale-[1.02]'
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-[color:var(--accent)]/10 text-[var(--accent)]">
                        <Icon size={20} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="type-body font-medium text-[var(--ink-primary)]">
                          {template.question}
                        </p>
                        <p className="type-caption text-[var(--ink-tertiary)] mt-1">
                          {needsPlayers
                            ? `Uses player names (${playerNames.length} available)`
                            : template.options.slice(0, 3).join(', ') + (template.options.length > 3 ? '...' : '')}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="space-y-6">
              {/* Question */}
              <div>
                <label className="type-caption text-[var(--ink-tertiary)] mb-2 block">
                  Question *
                </label>
                <input
                  type="text"
                  value={question}
                  onChange={e => setQuestion(e.target.value)}
                  placeholder="What do you want to ask?"
                  className="input-premium w-full"
                  maxLength={200}
                />
              </div>

              {/* Description */}
              <div>
                <label className="type-caption text-[var(--ink-tertiary)] mb-2 block">
                  Description (optional)
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Add more context..."
                  className="input-premium w-full resize-none"
                  rows={2}
                  maxLength={500}
                />
              </div>

              {/* Options */}
              <div>
                <label className="type-caption text-[var(--ink-tertiary)] mb-2 block">
                  Options * (min 2)
                </label>
                <div className="space-y-2">
                  {options.map((option, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="text"
                        value={option}
                        onChange={e => handleOptionChange(index, e.target.value)}
                        placeholder={`Option ${index + 1}`}
                        className="input-premium flex-1"
                        maxLength={100}
                      />
                      {options.length > 2 && (
                        <button
                          onClick={() => handleRemoveOption(index)}
                          className="p-2 text-[var(--ink-tertiary)] hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  ))}
                  {options.length < 10 && (
                    <button
                      onClick={handleAddOption}
                      className="w-full py-2 border-2 border-dashed border-[color:var(--rule)]/40 rounded-lg text-[var(--ink-tertiary)] hover:border-[var(--accent)] hover:text-[var(--accent)] transition-colors flex items-center justify-center gap-2 type-caption"
                    >
                      <Plus size={14} />
                      Add option
                    </button>
                  )}
                </div>
              </div>

              {/* Settings */}
              <div className="space-y-3">
                <label className="type-caption text-[var(--ink-tertiary)] block">
                  Settings
                </label>

                {/* Poll Type */}
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={pollType === 'single'}
                      onChange={() => setPollType('single')}
                      className="w-4 h-4 accent-[var(--accent)]"
                    />
                    <span className="type-caption">Single choice</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={pollType === 'multiple'}
                      onChange={() => setPollType('multiple')}
                      className="w-4 h-4 accent-[var(--accent)]"
                    />
                    <span className="type-caption">Multiple choice</span>
                  </label>
                </div>

                {/* Expiration */}
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-[var(--ink-tertiary)]" />
                  <select
                    value={expiresIn ?? ''}
                    onChange={e => setExpiresIn(e.target.value ? Number(e.target.value) : null)}
                    className="input-premium py-1.5 text-sm"
                  >
                    <option value="">No expiration</option>
                    <option value="1">1 hour</option>
                    <option value="4">4 hours</option>
                    <option value="24">24 hours</option>
                    <option value="48">2 days</option>
                  </select>
                </div>

                {/* Toggles */}
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowAddOptions}
                    onChange={e => setAllowAddOptions(e.target.checked)}
                    className="w-4 h-4 accent-[var(--accent)]"
                  />
                  <span className="type-caption">Allow others to add options</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isAnonymous}
                    onChange={e => setIsAnonymous(e.target.checked)}
                    className="w-4 h-4 accent-[var(--accent)]"
                  />
                  <span className="type-caption">Anonymous voting</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {mode === 'custom' && (
          <div className="p-4 border-t border-[var(--rule)]">
            <button
              onClick={handleCreateCustom}
              disabled={!isValidCustom || isCreating}
              className="btn-primary w-full"
            >
              {isCreating ? 'Creating...' : 'Create Poll'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default CreatePollModal;
