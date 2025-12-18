/**
 * Timezone Utilities for Amazon Standard Time (UTC-4 / America/Manaus)
 * 
 * All date/time operations in the system should use these utilities
 * to ensure consistency across the application.
 */

// Amazon Standard Time is UTC-4 (America/Manaus)
const AMAZON_TIMEZONE_OFFSET = -4 * 60 * 60000; // -4 hours in milliseconds

/**
 * Get current date/time in Amazon timezone (UTC-4)
 * @returns Date object adjusted to Amazon timezone
 */
export function getAmazonTime(): Date {
  const now = new Date();
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utcTime + AMAZON_TIMEZONE_OFFSET);
}

/**
 * Convert any Date to Amazon timezone
 * @param date - Date to convert
 * @returns Date object adjusted to Amazon timezone
 */
export function toAmazonTime(date: Date): Date {
  const utcTime = date.getTime() + (date.getTimezoneOffset() * 60000);
  return new Date(utcTime + AMAZON_TIMEZONE_OFFSET);
}

/**
 * Get start of day in Amazon timezone
 * @param date - Optional date (defaults to now)
 * @returns Date object set to 00:00:00 in Amazon timezone
 */
export function getAmazonStartOfDay(date?: Date): Date {
  const amazonTime = date ? toAmazonTime(date) : getAmazonTime();
  amazonTime.setHours(0, 0, 0, 0);
  return amazonTime;
}

/**
 * Get end of day in Amazon timezone
 * @param date - Optional date (defaults to now)
 * @returns Date object set to 23:59:59.999 in Amazon timezone
 */
export function getAmazonEndOfDay(date?: Date): Date {
  const amazonTime = date ? toAmazonTime(date) : getAmazonTime();
  amazonTime.setHours(23, 59, 59, 999);
  return amazonTime;
}

/**
 * Get current day of week in Amazon timezone (0 = Sunday, 6 = Saturday)
 * @returns Day of week number
 */
export function getAmazonDayOfWeek(): number {
  return getAmazonTime().getDay();
}

/**
 * Get current time in minutes since midnight in Amazon timezone
 * @returns Minutes since midnight (0-1439)
 */
export function getAmazonMinutesSinceMidnight(): number {
  const amazonTime = getAmazonTime();
  return amazonTime.getHours() * 60 + amazonTime.getMinutes();
}

/**
 * Format date to ISO string for database storage
 * Ensures the date is in Amazon timezone before converting
 * @param date - Date to format
 * @returns ISO string representation
 */
export function toAmazonISOString(date: Date): string {
  return toAmazonTime(date).toISOString();
}

/**
 * Create a new Date object representing "now" in Amazon timezone
 * This should be used for all new database records
 * @returns Date object in Amazon timezone
 */
export function nowInAmazonTime(): Date {
  return getAmazonTime();
}

/**
 * Get timezone info for logging/debugging
 * @returns Object with timezone information
 */
export function getTimezoneInfo() {
  const now = new Date();
  const amazonTime = getAmazonTime();
  
  return {
    timezone: 'America/Manaus (Amazon Standard Time)',
    offset: 'UTC-4',
    systemTime: now.toISOString(),
    amazonTime: amazonTime.toISOString(),
    dayOfWeek: amazonTime.getDay(),
    minutesSinceMidnight: amazonTime.getHours() * 60 + amazonTime.getMinutes(),
  };
}
