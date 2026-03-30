import { Save } from 'lucide-react';

interface ProfileEditSaveBarProps {
  isSaving: boolean;
  isLoading: boolean;
  onSave: () => void;
  onCancel: () => void;
}

export function ProfileEditSaveBar({
  isSaving,
  isLoading,
  onSave,
  onCancel,
}: ProfileEditSaveBarProps) {
  return (
    <div className="fixed inset-x-0 z-40 bg-canvas border-t border-rule p-[var(--space-4)] bottom-[calc(env(safe-area-inset-bottom,_0px)_+_80px)]">
      <div className="max-w-[28rem] mx-auto flex gap-[var(--space-3)]">
        {/* Cancel Button */}
        <button
          onClick={onCancel}
          className="press-scale shrink-0 py-[var(--space-3)] px-[var(--space-5)] rounded-[var(--radius-full)] border border-rule bg-canvas-raised text-ink-secondary font-sans text-[length:var(--text-sm)] font-semibold cursor-pointer min-h-touch transition-all duration-fast"
        >
          Cancel
        </button>

        {/* Save Button */}
        <button
          onClick={onSave}
          disabled={isSaving || isLoading}
          className="btn-premium press-scale flex-1"
          style={{
            opacity: isSaving || isLoading ? 0.6 : 1,
            cursor: isSaving || isLoading ? 'not-allowed' : 'pointer',
          }}
        >
          {isSaving ? (
            <span className="flex items-center justify-center gap-[var(--space-2)]">
              <span className="w-4 h-4 border-2 border-[color:var(--canvas)]/30 border-t-[color:var(--canvas)] rounded-[var(--radius-full)] animate-[spin_0.6s_linear_infinite]" />
              Saving...
            </span>
          ) : (
            <span className="flex items-center justify-center gap-[var(--space-2)]">
              <Save className="w-4 h-4" />
              Save Changes
            </span>
          )}
        </button>
      </div>
    </div>
  );
}
