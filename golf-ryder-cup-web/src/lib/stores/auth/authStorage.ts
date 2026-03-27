/**
 * Auth localStorage helpers — read/write/validate user records.
 *
 * Extracted from authStore to isolate persistence logic and make it
 * independently testable.
 */

import { z } from 'zod';
import { authLogger } from '../../utils/logger';
import { safeParse } from '../../utils/safeParse';
import type { StoredUserRecord, UserProfile } from './authTypes';

const STORAGE_KEY = 'golf-app-users';

/**
 * Zod schema that validates the shape of stored user records.
 *
 * We use `z.record(z.object(...).passthrough())` so that we validate
 * required fields exist while allowing additional optional fields
 * to survive round-trips (forward-compatibility).
 */
const storedUsersSchema = z.record(
  z.string(),
  z.object({
    profile: z.object({
      id: z.string(),
      firstName: z.string(),
      lastName: z.string(),
      // Email is optional because it may be resolved later during profile creation
      email: z.string().optional(),
    }).passthrough(),
    pin: z.string().nullish(),
  }),
);

// ————————————————————————————————————————
// Read helpers
// ————————————————————————————————————————

export function readStoredUsers(): Record<string, StoredUserRecord> {
  const storedUsers = localStorage.getItem(STORAGE_KEY);
  if (!storedUsers) {
    return {};
  }

  const parsed = safeParse(storedUsers, storedUsersSchema);
  if (!parsed) {
    authLogger.error('Stored user data failed validation — returning empty');
    return {};
  }

  return parsed as Record<string, StoredUserRecord>;
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
