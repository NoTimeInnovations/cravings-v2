/**
 * Truncates text and adds ellipsis if it exceeds the specified length
 * @param text - The input text to truncate
 * @param maxLength - Maximum allowed length before truncation
 * @param ellipsis - The ellipsis string to append (defaults to '...')
 * @returns The truncated text with ellipsis if needed
 */
export function truncateWithEllipsis(
    text: string, 
    maxLength: number, 
    ellipsis: string = '...'
  ): string {
    if (text.length <= maxLength) {
      return text;
    }
    return text.slice(0, maxLength) + ellipsis;
  }