// utils/stringUtils.ts

/**
 * Generates initials from a full name.
 * e.g., "Priya Mehta" -> "PM", "Admin User" -> "AU", "Rajesh" -> "R"
 * @param name The full name of the user.
 * @returns A string of initials, typically 1 or 2 characters.
 */
export const getInitials = (name: string = ''): string => {
  if (!name || typeof name !== 'string') return '?';
  const nameParts = name.trim().split(' ');
  if (nameParts.length > 1) {
    return (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase();
  }
  if (nameParts.length === 1 && nameParts[0].length > 0) {
    return nameParts[0][0].toUpperCase();
  }
  return '?';
};
