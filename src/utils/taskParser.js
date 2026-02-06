/**
 * taskParser.js
 * 
 * Pipeline-based task parser with improved regex cleaning.
 * 
 * Pipeline: Normalization → Segmentation → Extraction → Cleaning
 */

const CATEGORIES = {
    WORK: 'Work',
    HOME: 'Home',
};

// Priority keyword dictionaries
const PRIORITY_KEYWORDS = {
    URGENT: ['urgent', 'asap', 'immediately', 'critical', 'high priority', 'must do', 'critical issue'],
    HIGH: ['important', 'tonight', 'today', 'urgent', 'before it\'s', 'overdue', 'deadline', 'by end of day', 'eod'],
    LOW: ['whenever', 'low priority', 'maybe', 'sometime', 'eventually']
};

// Category keyword dictionaries - expanded based on examples
const CATEGORY_KEYWORDS = {
    WORK: ['email', 'meeting', 'call', 'presentation', 'boss', 'client', 'code',
        'budget', 'slide', 'project', 'deadline', 'report', 'office', 'business',
        'interview', 'hire', 'deploy', 'patch', 'bug', 'production', 'expense', 'agenda',
        'slides', 'client meeting', 'work', 'conference', 'presentation'],
    HOME: ['mom', 'dad', 'mother', 'father', 'gym', 'groceries', 'kids', 'dinner', 'party', 'doctor',
        'family', 'wife', 'husband', 'son', 'daughter', 'parent', 'brother', 'sister',
        'laundry', 'clean', 'cook', 'bank', 'bill', 'medicine', 'workout', 'trip', 'vacation',
        'home', 'house', 'driving license', 'credit card', 'blood pressure', 'appointment',
        'mom', 'airport', 'cab', 'electricity', 'workspace', 'resume']
};

// Word expansions for better parsing
const WORD_EXPANSIONS = {
    'mom': 'mother',
    'dad': 'father',
    'tmw': 'tomorrow'
};

// Filler words/phrases to remove during normalization
const FILLER_PHRASES = [
    'there is a need to',
    'there\'s a need to',
    'there is need to',
    'i need to',
    'i have to',
    'i want to',
    'i should',
    'we need to',
    'we have to',
    'we should',
    'please',
    'remind me to',
    'can you',
    'could you'
];

/**
 * Returns the current reference date.
 */
const getNow = () => new Date();

/**
 * Format date to DD-MMM
 */
const formatDate = (date) => {
    if (!date) return 'Not specified';
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = d.toLocaleString('default', { month: 'short' });
    return `${day}-${month}`;
};

/**
 * STEP 1: Normalization
 * Convert to lowercase, remove extra spaces, standardize filler words, expand shortcuts
 */
const normalize = (text) => {
    let normalized = text.trim();

    // Expand common shortcuts/words
    Object.entries(WORD_EXPANSIONS).forEach(([shortForm, expanded]) => {
        const regex = new RegExp(`\\b${shortForm}\\b`, 'gi');
        normalized = normalized.replace(regex, expanded);
    });

    // Remove filler phrases (case insensitive)
    FILLER_PHRASES.forEach(phrase => {
        const regex = new RegExp(`\\b${phrase}\\b`, 'gi');
        normalized = normalized.replace(regex, '');
    });

    // Collapse multiple spaces
    normalized = normalized.replace(/\s+/g, ' ').trim();

    return normalized;
};

/**
 * STEP 2: Segmentation
 * Split input into individual task segments based on delimiters
 */
const segment = (text) => {
    // Delimiters: " and ", ". ", ", ", " also ", " then "
    let segmented = text
        .replace(/\s+and\s+/gi, '|')
        .replace(/\.\s+/g, '|')
        .replace(/,\s+/g, '|')
        .replace(/\s+also\s+/gi, '|')
        .replace(/\s+then\s+/gi, '|')
        .replace(/\n+/g, '|');

    // Split and filter empty segments
    return segmented
        .split('|')
        .map(s => s.trim())
        .filter(s => s.length > 2);
};

/**
 * STEP 3a: Extract Priority
 * Returns: { priority: string, cleaned: string }
 */
const extractPriority = (text) => {
    const lowerText = text.toLowerCase();
    let priority = 'Medium'; // Default
    let cleaned = text;

    // Check URGENT keywords
    for (const keyword of PRIORITY_KEYWORDS.URGENT) {
        const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
        if (regex.test(lowerText)) {
            priority = 'High';
            cleaned = cleaned.replace(regex, '');
            break;
        }
    }

    // Check HIGH keywords (if not already urgent)
    if (priority !== 'High') {
        for (const keyword of PRIORITY_KEYWORDS.HIGH) {
            const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
            if (regex.test(lowerText)) {
                priority = 'High';
                cleaned = cleaned.replace(regex, '');
                break;
            }
        }
    }

    // Check LOW keywords
    if (priority === 'Medium') {
        for (const keyword of PRIORITY_KEYWORDS.LOW) {
            const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
            if (regex.test(lowerText)) {
                priority = 'Low';
                cleaned = cleaned.replace(regex, '');
                break;
            }
        }
    }

    return { priority, cleaned: cleaned.replace(/\s+/g, ' ').trim() };
};

/**
 * STEP 3b: Extract Category/Tag
 * Returns: { category: string, cleaned: string }
 */
const extractCategory = (text) => {
    const lowerText = text.toLowerCase();
    let category = CATEGORIES.HOME; // Default
    let workScore = 0;
    let homeScore = 0;

    // Count WORK keywords
    CATEGORY_KEYWORDS.WORK.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'i');
        if (regex.test(lowerText)) workScore++;
    });

    // Count HOME keywords
    CATEGORY_KEYWORDS.HOME.forEach(keyword => {
        const regex = new RegExp(`\\b${keyword}\\b`, 'i');
        if (regex.test(lowerText)) homeScore++;
    });

    // WORK wins if it has more hits
    if (workScore > 0 && workScore > homeScore) {
        category = CATEGORIES.WORK;
    }

    return { category, cleaned: text };
};

/**
 * STEP 3c: Extract Date
 * Returns: { date: Date|null, cleaned: string }
 */
const extractDate = (text) => {
    const lowerText = text.toLowerCase();
    const now = getNow();
    let date = null;
    let cleaned = text;

    // 1. Time-of-day qualifiers (extract for urgency, not for date calculation)
    const hasUrgentTiming = /\b(tonight|this morning|by end of day|end of day|eod|today|asap)\b/i.test(lowerText);

    // 2. Shortcut: "EOD" -> Today
    if (/\beod\b/i.test(lowerText)) {
        date = new Date(now);
        cleaned = cleaned.replace(/\beod\b/gi, '');
    }

    // 3. Relative: "in next X days" (e.g., "in next 2 days")
    else if (/in next (\d+) days?/i.test(lowerText)) {
        const match = lowerText.match(/in next (\d+) days?/i);
        const days = parseInt(match[1]);
        date = new Date(now);
        date.setDate(date.getDate() + days);
        cleaned = cleaned.replace(/in next \d+ days?/gi, '');
    }

    // 4. Weekend reference
    else if (/\b(this\s+)?(weekend)\b/i.test(lowerText)) {
        date = new Date(now);
        const currentDay = now.getDay();
        let daysToAdd = 6 - currentDay; // Saturday
        if (currentDay === 0 || currentDay === 6) daysToAdd = 2; // If already on weekend, add 2 days
        if (daysToAdd <= 0) daysToAdd += 7;
        date.setDate(now.getDate() + daysToAdd);
        cleaned = cleaned.replace(/\b(this\s+)?(weekend)\b/gi, '');
    }

    // 5. This month reference
    else if (/\b(this\s+)?month|sometime\s+this\s+month\b/i.test(lowerText)) {
        date = new Date(now);
        const mid = 15; // Mid-month default
        date.setDate(mid);
        if (date < now) {
            date.setDate(Math.min(28, now.getDate() + 5)); // Avoid end of month
        }
        cleaned = cleaned.replace(/\b(this\s+)?month|sometime\s+this\s+month\b/gi, '');
    }

    // 6. Next week reference
    else if (/\b(next\s+week)\b/i.test(lowerText)) {
        date = new Date(now);
        date.setDate(now.getDate() + 7);
        cleaned = cleaned.replace(/\b(next\s+week)\b/gi, '');
    }

    // 7. Summer/seasonal reference - set to mid-June as placeholder
    else if (/\b(summer\s+)?(holiday|vacation|travel)\b/i.test(lowerText)) {
        date = null; // Will stay as null, converted to "Not specified"
        cleaned = cleaned.replace(/\b(summer\s+)?(holiday|vacation|travel)\b/gi, '');
    }

    // 8. Relative Days: today, tomorrow, tonight
    else if (/\b(today|tonight)\b/i.test(lowerText)) {
        date = new Date(now);
        cleaned = cleaned.replace(/\b(today|tonight)\b/gi, '');
    }
    else if (/\b(tomorrow)\b/i.test(lowerText)) {
        date = new Date(now);
        date.setDate(date.getDate() + 1);
        cleaned = cleaned.replace(/\b(tomorrow)\b/gi, '');
    }

    // 9. Weekdays: "on monday", "next tuesday", "by friday"
    else if (/\b(on|next|by)?\s*(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i.test(lowerText)) {
        const match = lowerText.match(/\b(on|next|by)?\s*(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i);
        const dayName = match[2].toLowerCase();
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const targetDay = days.indexOf(dayName);

        date = new Date(now);
        const currentDay = now.getDay();
        let daysToAdd = targetDay - currentDay;

        // If the target day is today or in the past, assume next week
        if (daysToAdd <= 0) {
            daysToAdd += 7;
        }

        date.setDate(now.getDate() + daysToAdd);
        cleaned = cleaned.replace(/\b(on|next|by)?\s*(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/gi, '');
    }

    // 10. Explicit Date: "3rd Jan", "Jan 15", "15 Feb", "15th February"
    else if (/\b(\d{1,2})(st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\b/i.test(lowerText)) {
        const match = lowerText.match(/\b(\d{1,2})(st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*/i);
        const day = parseInt(match[1]);
        const monthStr = match[3].toLowerCase();
        const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
        const monthIndex = months.indexOf(monthStr.substring(0, 3));

        if (monthIndex !== -1) {
            let year = now.getFullYear();
            date = new Date(year, monthIndex, day);

            // If date is in the past, assume next year
            if (date < now) {
                year++;
                date = new Date(year, monthIndex, day);
            }
        }

        cleaned = cleaned.replace(/\b\d{1,2}(st|nd|rd|th)?\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*/gi, '');
    }
    else if (/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})(st|nd|rd|th)?\b/i.test(lowerText)) {
        const match = lowerText.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})(st|nd|rd|th)?\b/i);
        const monthStr = match[1].toLowerCase();
        const day = parseInt(match[2]);
        const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
        const monthIndex = months.indexOf(monthStr.substring(0, 3));

        if (monthIndex !== -1) {
            let year = now.getFullYear();
            date = new Date(year, monthIndex, day);

            // If date is in the past, assume next year
            if (date < now) {
                year++;
                date = new Date(year, monthIndex, day);
            }
        }

        cleaned = cleaned.replace(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}(st|nd|rd|th)?\b/gi, '');
    }

    // 11. If date is null (not found in text), leave it null for "Not specified"
    // Otherwise return the found date

    return { date, cleaned: cleaned.replace(/\s+/g, ' ').trim() };
};

/**
 * STEP 4: Clean the remaining text
 * Remove extra words like "by", "on", etc. and capitalize
 */
const finalClean = (text) => {
    let cleaned = text;

    // Remove common prepositions/conjunctions that might be left over
    cleaned = cleaned.replace(/\b(by|on|at|in|for|the|a|an|to|of|and|or)\b/gi, '');

    // Remove time-of-day references and timing words
    cleaned = cleaned.replace(/\b(morning|afternoon|evening|night|today|tonight|tomorrow|this|next|this\s+week|next\s+week|weekend)\b/gi, '');

    // Remove duration references that weren't caught
    cleaned = cleaned.replace(/\b(before\s+it'?s|sometime|eventually)\b/gi, '');

    // Collapse spaces and trim
    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    // Remove leading/trailing punctuation
    cleaned = cleaned.replace(/^[,.\-:;]+|[,.\-:;]+$/g, '').trim();

    // Capitalize first letter
    if (cleaned.length > 0) {
        cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
    }

    return cleaned;
};

/**
 * Process a single task segment through the extraction pipeline
 */
const processSegment = (segment) => {
    const lowerSegment = segment.toLowerCase();

    // Extract metadata in order
    let { priority, cleaned: afterPriority } = extractPriority(segment);
    const { category, cleaned: afterCategory } = extractCategory(afterPriority);
    const { date, cleaned: afterDate } = extractDate(afterCategory);

    // Final cleaning for description
    const description = finalClean(afterDate);

    // Fallback to original if description is too short
    const finalDescription = description.length < 3 ? segment : description;

    // Boost urgency if timing keywords present
    if (priority === 'Medium') {
        if (/\b(tonight|end of day|eod|today|urgent|asap)\b/i.test(lowerSegment)) {
            priority = 'High';
        }
    }

    return {
        description: finalDescription,
        dueDate: date ? formatDate(date) : 'Not specified',
        category: category,
        urgency: priority,
        completed: false,
        id: Date.now() + Math.random().toString(36).substr(2, 9)
    };
};

/**
 * Main entry point: Parse tasks from input text
 */
export const parseTasks = (input) => {
    // Pipeline: Normalize → Segment → Extract → Clean
    const normalized = normalize(input);
    const segments = segment(normalized);
    const tasks = segments.map(seg => processSegment(seg));

    return tasks;
};

export default parseTasks;
