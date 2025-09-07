export default function getTimestampWithTimezone(date : Date) {
    const offset = -date.getTimezoneOffset(); // Offset in minutes
    const sign = offset >= 0 ? '+' : '-';
    const hours = Math.floor(Math.abs(offset) / 60);
    const minutes = Math.abs(offset) % 60;
    const timezone = `${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  
    return date.toISOString().replace('Z', timezone);
  }