/**
 * Format date to a readable string (YYYY-MM-DD HH:MM:SS)
 */
export function formatDate(date: Date | null): string | null {
  if (!date) return null;

  try {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");

    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
  } catch (e) {
    return null;
  }
}

/**
 * Safely parse a date string, returning null if invalid
 */
export function safeParseDate(dateStr: string | undefined): Date | null {
  if (!dateStr) return null;

  try {
    // The title attribute contains the full date in format: "Mar 2, 2025 · 6:47 PM UTC"
    // Parse the entire string including time
    const fullDateStr = dateStr.trim();

    // Create a date object from the full string
    const date = new Date(fullDateStr);

    // Check if the date is valid
    if (!isNaN(date.getTime())) {
      return date;
    }

    // If direct parsing fails, try to parse it manually
    // Format: "Mar 2, 2025 · 6:47 PM UTC"
    const parts = fullDateStr.split("·");
    if (parts.length >= 2) {
      const datePart = parts[0].trim(); // "Mar 2, 2025"
      const timePart = parts[1].trim(); // "6:47 PM UTC"

      // Extract time components
      const timeMatch = timePart.match(/(\d+):(\d+)\s+(AM|PM)/i);
      if (timeMatch) {
        let hours = parseInt(timeMatch[1]);
        const minutes = parseInt(timeMatch[2]);
        const isPM = timeMatch[3].toUpperCase() === "PM";

        // Convert to 24-hour format
        if (isPM && hours < 12) hours += 12;
        if (!isPM && hours === 12) hours = 0;

        // Parse the date part
        const dateObj = new Date(datePart);
        if (!isNaN(dateObj.getTime())) {
          // Set the time components
          dateObj.setHours(hours, minutes, 0, 0);
          return dateObj;
        }
      }
    }

    return null;
  } catch (e) {
    console.error(`Error parsing date: ${e}`);
    return null;
  }
}

/**
 * Format timestamp to remove duplicate month names
 */
export function formatTimestamp(timestamp: string): string {
  // Remove duplicate month names (e.g., "Mar 13Mar 13" -> "Mar 13")
  const regex = /([A-Z][a-z]{2} \d{1,2})\1/;
  return timestamp.replace(regex, "$1");
}

/**
 * Convert relative timestamp to a proper date
 */
export function getDateFromTimestamp(
  timestamp: string,
  dateStr: string | undefined
): Date | null {
  // First try to parse the full date from the title attribute
  const parsedDate = safeParseDate(dateStr);
  if (parsedDate) return parsedDate;

  // If that fails, try to parse from the timestamp
  const formattedTimestamp = formatTimestamp(timestamp);

  try {
    // Handle relative timestamps like "Mar 13"
    if (/^[A-Z][a-z]{2} \d{1,2}$/.test(formattedTimestamp)) {
      const [month, day] = formattedTimestamp.split(" ");
      const currentYear = new Date().getFullYear();

      // Map month name to month number
      const months: Record<string, number> = {
        Jan: 0,
        Feb: 1,
        Mar: 2,
        Apr: 3,
        May: 4,
        Jun: 5,
        Jul: 6,
        Aug: 7,
        Sep: 8,
        Oct: 9,
        Nov: 10,
        Dec: 11,
      };

      if (months[month] !== undefined) {
        const date = new Date(currentYear, months[month], parseInt(day));

        // If the resulting date is in the future, subtract a year
        if (date > new Date()) {
          date.setFullYear(date.getFullYear() - 1);
        }

        return date;
      }
    }

    // Handle timestamps like "10h" (10 hours ago)
    if (/^\d+h$/.test(formattedTimestamp)) {
      const hours = parseInt(formattedTimestamp);
      const date = new Date();
      date.setHours(date.getHours() - hours);
      return date;
    }

    return null;
  } catch (e) {
    return null;
  }
}
