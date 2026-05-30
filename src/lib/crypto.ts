import crypto from 'crypto';

const SECURE_ITERATIONS = 100000;
const LEGACY_ITERATIONS = 1000;

/**
 * Hash a password using PBKDF2 with a random salt.
 * Returns salt:iterations:hash format.
 */
export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, SECURE_ITERATIONS, 64, 'sha512').toString('hex');
  return `${salt}:${SECURE_ITERATIONS}:${hash}`;
}

/**
 * Verify a candidate password against a stored salted PBKDF2 hash.
 * Supports legacy two-part hash (salt:hash) and new three-part hash (salt:iterations:hash).
 */
export function verifyPassword(password: string, storedValue: string): boolean {
  if (!storedValue || !storedValue.includes(':')) {
    return false;
  }
  const parts = storedValue.split(':');
  
  if (parts.length === 3) {
    const [salt, iterStr, originalHash] = parts;
    const iterations = parseInt(iterStr, 10);
    if (!salt || isNaN(iterations) || !originalHash) return false;
    
    const hash = crypto.pbkdf2Sync(password, salt, iterations, 64, 'sha512').toString('hex');
    return hash === originalHash;
  } else if (parts.length === 2) {
    const [salt, originalHash] = parts;
    if (!salt || !originalHash) return false;
    
    const hash = crypto.pbkdf2Sync(password, salt, LEGACY_ITERATIONS, 64, 'sha512').toString('hex');
    return hash === originalHash;
  }
  
  return false;
}
