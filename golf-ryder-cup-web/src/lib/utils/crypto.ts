/**
 * Cryptographic utilities for secure PIN handling.
 *
 * Storage format (new):
 *   pbkdf2$<iterations>$<salt_b64>$<hash_b64>
 *
 * We also support legacy formats:
 * - 64-char hex SHA-256 (old)
 * - plain 4–6 digit PIN (very old; migrated on next successful verify)
 */

const PBKDF2_ITERATIONS = 150_000;
const PBKDF2_SALT_BYTES = 16;
const PBKDF2_HASH_BYTES = 32; // 256-bit

function bytesToB64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function b64ToBytes(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function pbkdf2(pin: string, saltBuffer: ArrayBuffer, iterations: number): Promise<Uint8Array> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', encoder.encode(pin), 'PBKDF2', false, [
    'deriveBits',
  ]);

  const bits = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: saltBuffer,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    PBKDF2_HASH_BYTES * 8
  );

  return new Uint8Array(bits);
}

export function isHashedPin(storedValue: string): boolean {
  if (!storedValue) return false;
  if (storedValue.startsWith('pbkdf2$')) return true;
  // Legacy SHA-256 hex
  return storedValue.length === 64 && /^[a-f0-9]+$/i.test(storedValue);
}

/**
 * Hash a PIN for storage.
 */
export async function hashPin(pin: string): Promise<string> {
  const salt = new Uint8Array(new ArrayBuffer(PBKDF2_SALT_BYTES));
  crypto.getRandomValues(salt);
  const hash = await pbkdf2(pin, salt.buffer as ArrayBuffer, PBKDF2_ITERATIONS);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${bytesToB64(salt)}$${bytesToB64(hash)}`;
}

/**
 * Verify a PIN against a stored hash (supports legacy formats).
 */
export async function verifyPin(pin: string, stored: string): Promise<boolean> {
  if (!stored) return false;

  if (stored.startsWith('pbkdf2$')) {
    const parts = stored.split('$');
    if (parts.length !== 4) return false;
    const iterations = Number(parts[1]);
    const salt = b64ToBytes(parts[2]);
    const expected = parts[3];
    const actual = bytesToB64(await pbkdf2(pin, salt.buffer as ArrayBuffer, iterations));
    return actual === expected;
  }

  // Legacy SHA-256 hex
  if (stored.length === 64 && /^[a-f0-9]+$/i.test(stored)) {
    const actual = await sha256Hex(pin);
    return actual === stored.toLowerCase();
  }

  // Very old plaintext PIN
  return stored === pin;
}
