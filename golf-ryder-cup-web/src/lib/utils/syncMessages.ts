export type SyncBlockedReason =
  | 'offline'
  | 'supabase-unconfigured'
  | 'auth-pending'
  | 'auth-required';

export const SYNC_BLOCKED_MESSAGES: Record<SyncBlockedReason, string> = {
  offline: 'Reconnect to retry cloud saving.',
  'supabase-unconfigured': 'Cloud saving is not configured yet. Changes stay saved on this device.',
  'auth-pending': 'Checking your sign-in before retrying cloud saving.',
  'auth-required': 'Cloud account sign-in is required to send changes.',
};

export function summarizeSyncError(error?: string): string {
  if (!error) return 'Sync could not finish.';
  if (/row level security|42501|permission/i.test(error)) {
    return 'Cloud permissions blocked this change.';
  }
  if (/foreign key|23503|violates.*constraint/i.test(error)) {
    return 'A related trip item needs to save first.';
  }
  if (/duplicate key|23505|unique/i.test(error)) {
    return 'Cloud already has this change.';
  }
  if (/network|fetch|timeout|offline/i.test(error)) {
    return 'Connection dropped while saving.';
  }
  if (/not found locally/i.test(error)) {
    return 'This saved change is no longer on this device.';
  }
  return error;
}

export function getSyncBlockedActionLabel(reason?: SyncBlockedReason): string {
  switch (reason) {
    case 'auth-required':
      return 'Sign in to sync';
    case 'auth-pending':
      return 'Checking sign-in';
    case 'supabase-unconfigured':
      return 'Cloud setup needed';
    case 'offline':
      return 'Offline';
    default:
      return 'Retry sync';
  }
}
