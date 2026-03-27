/**
 * Auth localStorage helpers — read/write/validate user records.
 *
 * Extracted from authStore to isolate persistence logic and make it
 * independently testable.
 */

import { authLogger } from '../../utils/logger';
import type { StoredUserRecord, UserProfile } from './authTypes';

const STORAGE_KEY = 'golf-app-users';

// ————————————————————————————————————————
// Read helpers
// ————————————————————————————————————————

export function readStoredUsers(): Record<string, StoredUserRecord> {
  const storedUsers = localStorage.getItem(STORAGE_KEY);
  if (!storedUsers) {
    return {};
  }

  try {
    return JSON.parse(storedUsers) as Record<string, StoredUserRecord>;
  } catch (parseError) {
    authLogger.error('Failed to parse stored users:', parseError);
    return {};
  }
}

export function writeStoredUsers(users: Record<string, StoredUserRecord>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(users));
}

// ————————————————————————————————————————
// Email helpers
// ————————————————————————————————————————

export function normalizeEmail(email?: string | null): string | null {
  const normalized = email?.trim().toLowerCase();
  return normalized ? normalized : null;
}

export function findStoredUserByEmail(email?: string | null): UserProfile | null {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    return null;
  }

  const users = readStoredUsers();
  const userEntry = Object.values(users).find(
    (user) => normalizeEmail(user.profile.email) === normalizedEmail
  );

  return userEntry?.profile ?? null;
}

export function ensureUniqueEmail(
  users: Record<string, StoredUserRecord>,
  email: string,
  excludedUserId?: string
): void {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail) {
    throw new Error('Email is required');
  }

  const existingUser = Object.values(users).find(
    (user) =>
      user.profile.id !== excludedUserId && normalizeEmail(user.profile.email) === normalizedEmail
  );

  if (existingUser) {
    throw new Error('An account with this email already exists');
  }
}

export function resolveProfileEmail(profileEmail: string | undefined, authEmail: string | null): string {
  const normalizedEmail = normalizeEmail(authEmail) ?? normalizeEmail(profileEmail);

  if (!normalizedEmail) {
    throw new Error('Email is required');
  }

  return normalizedEmail;
}

export function hasOfflinePin(record?: StoredUserRecord | null): boolean {
  return Boolean(record?.pin?.trim());
}
