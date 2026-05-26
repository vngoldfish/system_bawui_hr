import crypto from 'crypto';

/**
 * Hash a password using PBKDF2 with a random salt.
 * Returns salt:hash format.
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Verify a candidate password against a stored salted PBKDF2 hash.
 */
export function verifyPassword(password: string, storedValue: string): boolean {
  if (!storedValue || !storedValue.includes(':')) {
    return false;
  }
  const [salt, originalHash] = storedValue.split(':');
  if (!salt || !originalHash) return false;
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return hash === originalHash;
}
