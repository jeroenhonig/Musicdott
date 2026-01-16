/**
 * Username generation utility for student accounts
 * Handles normalization, conflict resolution, and length limits
 */

/**
 * Normalize string by removing accents and diacritics
 * Uses Unicode NFD normalization and strips combining characters
 */
function normalizeString(str: string): string {
  return str
    .normalize('NFD') // Decompose combined characters
    .replace(/[\u0300-\u036f]/g, '') // Remove combining diacritical marks
    .toLowerCase();
}

/**
 * Clean string for username by removing non-alphanumeric characters
 * Keeps only a-z, 0-9, hyphens, and dots
 */
function cleanForUsername(str: string): string {
  return str.replace(/[^a-z0-9.-]/g, '');
}

/**
 * Generate base username from first and last name
 * Format: firstname.lastname (normalized and cleaned)
 */
function generateBaseUsername(firstName: string, lastName: string): string {
  const normalizedFirst = normalizeString(firstName.trim());
  const normalizedLast = normalizeString(lastName.trim());
  
  const cleanFirst = cleanForUsername(normalizedFirst);
  const cleanLast = cleanForUsername(normalizedLast);
  
  if (!cleanFirst || !cleanLast) {
    throw new Error('Invalid names provided for username generation');
  }
  
  return `${cleanFirst}.${cleanLast}`;
}

/**
 * Truncate username to respect 30-character limit
 * Maintains format integrity while keeping within limit
 */
function truncateUsername(username: string, suffix: string = ''): string {
  const maxLength = 30;
  const totalNeeded = username.length + suffix.length;
  
  if (totalNeeded <= maxLength) {
    return username + suffix;
  }
  
  // Need to truncate the base username
  const availableForBase = maxLength - suffix.length;
  
  // Try to keep both parts but trim if needed
  const parts = username.split('.');
  if (parts.length === 2) {
    const [first, last] = parts;
    const halfAvailable = Math.floor(availableForBase / 2);
    
    const truncatedFirst = first.substring(0, halfAvailable);
    const truncatedLast = last.substring(0, availableForBase - truncatedFirst.length - 1); // -1 for dot
    
    return `${truncatedFirst}.${truncatedLast}${suffix}`;
  }
  
  // Fallback: just truncate the whole thing
  return username.substring(0, availableForBase) + suffix;
}

/**
 * Generate username with conflict resolution
 * 1. Try base username (firstname.lastname)
 * 2. Try with school suffix (-{schoolId})
 * 3. Try with numeric suffixes (-2, -3, etc.)
 */
export async function makeStudentUsername(
  firstName: string,
  lastName: string,
  schoolId: number,
  checkExistence: (username: string) => Promise<boolean>
): Promise<string> {
  if (!firstName?.trim() || !lastName?.trim()) {
    throw new Error('First name and last name are required for username generation');
  }
  
  const baseUsername = generateBaseUsername(firstName, lastName);
  
  // Try base username first
  const truncatedBase = truncateUsername(baseUsername);
  if (!(await checkExistence(truncatedBase))) {
    return truncatedBase;
  }
  
  // Try with school suffix
  const schoolSuffix = `-${schoolId}`;
  const withSchoolSuffix = truncateUsername(baseUsername, schoolSuffix);
  if (!(await checkExistence(withSchoolSuffix))) {
    return withSchoolSuffix;
  }
  
  // Try with numeric suffixes
  for (let i = 2; i <= 999; i++) {
    const numericSuffix = `-${i}`;
    const candidate = truncateUsername(baseUsername, numericSuffix);
    
    if (!(await checkExistence(candidate))) {
      return candidate;
    }
  }
  
  // If we get here, we've exhausted reasonable options
  throw new Error(`Unable to generate unique username for ${firstName} ${lastName} after 999 attempts`);
}

/**
 * Validate username format
 * Ensures username meets our standards
 */
export function validateUsername(username: string): boolean {
  if (!username || username.length === 0 || username.length > 30) {
    return false;
  }
  
  // Must contain only a-z, 0-9, dots, and hyphens
  if (!/^[a-z0-9.-]+$/.test(username)) {
    return false;
  }
  
  // Must not start or end with special characters
  if (/^[.-]|[.-]$/.test(username)) {
    return false;
  }
  
  // Must not have consecutive special characters
  if (/[.-]{2,}/.test(username)) {
    return false;
  }
  
  return true;
}

/**
 * Generate fallback username for edge cases
 * Used when normal generation fails
 */
export function generateFallbackUsername(schoolId: number): string {
  const timestamp = Date.now().toString().slice(-6); // Last 6 digits
  return `student-${schoolId}-${timestamp}`;
}