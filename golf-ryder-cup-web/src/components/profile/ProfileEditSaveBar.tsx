import { Save } from 'lucide-react';
import { Button } from '@/components/ui/Button';

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
        <Button
          variant="primary"
          onClick={onSave}
          disabled={isSaving || isLoading}
          isLoading={isSaving}
          loadingText="Saving..."
          leftIcon={!isSaving ? <Save className="w-4 h-4" /> : undefined}
          className="press-scale flex-1"
        >
          Save Changes
        </Button>
      </div>
    </div>
  );
}
