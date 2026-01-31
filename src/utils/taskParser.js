/**
 * taskParser.js
 * 
 * Handles natural language processing for task extraction.
 * 
 * Capabilities:
 * - Multi-task splitting (by 'and', 'also', 'then', punctuation)
 * - Date extraction (relative dates, explicit dates)
 * - Category inference (strictly Home vs Work)
 * - Urgency classification
 */

const CATEGORIES = {
    WORK: 'Work',
    HOME: 'Home',
};

// Map granular concepts to the two main categories
const KEYWORD_MAPPING = {
    [CATEGORIES.WORK]: [
        // Work
        'email', 'meeting', 'slide', 'presentation', 'client', 'project', 'deadline', 'boss', 'colleague',
        'bug', 'patch', 'deploy', 'code', 'resume', 'job', 'agenda', 'report', 'office', 'work', 'business',
        'interview', 'hire', 'plan'
    ],
    [CATEGORIES.HOME]: [
        // Personal/Home
        'groceries', 'buy', 'shop', 'clean', 'house', 'home', 'laundry', 'cook', 'dinner', 'lunch',
        // Finance (Personal)
        'bank', 'money', 'pay', 'bill', 'credit', 'card', 'expense', 'insurance', 'loan', 'cost', 'price', 'wallet',
        // Health
        'doctor', 'appointment', 'medicine', 'pill', 'workout', 'gym', 'health', 'blood', 'pressure', 'dentist',
        // Family
        'mom', 'dad', 'mother', 'father', 'brother', 'sister', 'family', 'kids', 'child', 'wife', 'husband', 'son', 'daughter', 'parent',
        // Admin
        'license', 'passport', 'id', 'renew', 'registration', 'form', 'application',
        // Travel (Usually personal unless 'business trip')
        'trip', 'flight', 'airport', 'hotel', 'ticket', 'vacation', 'holiday', 'book', 'cab', 'uber', 'travel'
    ]
};

/**
 * Returns the current reference date.
 * Allows dependency injection for testing.
 */
const getNow = () => new Date();

/**
 * Format date to DD-MMM-YYYY
 */
const formatDate = (date) => {
    if (!date) return 'Not specified';
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, '0');
    const month = d.toLocaleString('default', { month: 'short' });
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
};

/**
 * Parse a single task string into a structured object.
 */
const extractTaskMetadata = (text) => {
    let description = text.trim();
    let dueDate = null;
    let urgency = 'Low';
    let category = CATEGORIES.HOME; // Default

    const now = getNow();
    const lowerText = text.toLowerCase();

    // --- Description Cleaning Logic ---
    let cleanDesc = text;

    // 1. Remove common prefixes (expanded list)
    const prefixes = [
        /^there is a need to /i,
        /^there's a need to /i,
        /^there is need to /i,
        /^i need to /i,
        /^i have to /i,
        /^please /i,
        /^need to /i,
        /^remind me to /i,
        /^i want to /i,
        /^i should /i,
        /^we need to /i,
        /^we have to /i,
        /^we should /i
    ];
    prefixes.forEach(p => cleanDesc = cleanDesc.replace(p, ''));

    // --- Date Parsing ---
    // Heuristic based on user examples

    // "Today", "Tonight"
    if (/\b(today|tonight)\b/.test(lowerText)) {
        dueDate = new Date(now);
        urgency = 'High';
        cleanDesc = cleanDesc.replace(/\b(today|tonight)\b/gi, '');
    }
    // "Tomorrow"
    else if (/\b(tomorrow)\b/.test(lowerText)) {
        dueDate = new Date(now);
        dueDate.setDate(dueDate.getDate() + 1);
        urgency = 'Medium';
        cleanDesc = cleanDesc.replace(/\b(tomorrow)\b/gi, '');
    }
    // "Next week" -> +7 days
    else if (/\bnext week\b/.test(lowerText)) {
        dueDate = new Date(now);
        dueDate.setDate(dueDate.getDate() + 7);
        urgency = 'Medium';
        cleanDesc = cleanDesc.replace(/\bnext week\b/gi, '');
    }
    // "Next [Day]" e.g. "Next Monday"
    else if (/\bnext (monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/.test(lowerText)) {
        const match = lowerText.match(/\bnext (monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/);
        const dayName = match[1];
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const targetDay = days.indexOf(dayName);

        dueDate = new Date(now);
        dueDate.setDate(now.getDate() + ((targetDay + 7 - now.getDay()) % 7 || 7));
        urgency = 'Medium';
        cleanDesc = cleanDesc.replace(new RegExp(match[0], 'gi'), '');
    }
    // "By Friday"
    else if (/\bby (monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/.test(lowerText)) {
        const match = lowerText.match(/\bby (monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/);
        const dayName = match[1];
        const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
        const targetDay = days.indexOf(dayName);
        dueDate = new Date(now);
        dueDate.setDate(now.getDate() + ((targetDay + 7 - now.getDay()) % 7 || 7));
        urgency = 'Medium';
        cleanDesc = cleanDesc.replace(new RegExp(match[0], 'gi'), '');
    }
    // "Weekend"
    else if (/\bweekend\b/.test(lowerText)) {
        dueDate = new Date(now);
        const daysUntilMonday = (8 - now.getDay()) % 7 || 7; // Next Monday
        dueDate.setDate(now.getDate() + daysUntilMonday);
        urgency = 'Medium';
        cleanDesc = cleanDesc.replace(/\bweekend\b/gi, '');
    }
    // "Sometime this month"
    else if (/\bthis month\b/.test(lowerText)) {
        if (now.getDate() > 20) {
            dueDate = new Date(now.getFullYear(), now.getMonth() + 1, 15);
        } else {
            dueDate = new Date(now.getFullYear(), now.getMonth() + 1, 0); // End of month
        }
        urgency = 'Medium';
        cleanDesc = cleanDesc.replace(/\b(sometime )?this month\b/gi, '');
    }
    // Explicit Date: 3-Feb or 3 Feb or 10 feb
    else {
        const dateMatch = lowerText.match(/\b(?:by|on)?\s?(\d{1,2})[ -]([a-z]{3})\b/);
        if (dateMatch) {
            const day = parseInt(dateMatch[1]);
            const monthStr = dateMatch[2];
            const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
            const monthIndex = months.indexOf(monthStr.substring(0, 3));

            if (monthIndex !== -1) {
                let year = now.getFullYear();
                const proposedDate = new Date(year, monthIndex, day);

                // If date is in the past, assume next year
                if (proposedDate < now && proposedDate.getDate() !== now.getDate()) {
                    year++;
                }

                dueDate = new Date(year, monthIndex, day);
                urgency = 'Medium';
                // Clean the exact match string
                cleanDesc = cleanDesc.replace(new RegExp(dateMatch[0], 'gi'), '');
            }
        }
    }

    // Explicit overrides from urgency keywords
    if (/\b(asap|urgent|urgently|right now)\b/.test(lowerText)) {
        urgency = 'High';
        if (!dueDate) dueDate = new Date(now);
        cleanDesc = cleanDesc.replace(/\b(asap|urgent|urgently|right now)\b/gi, '');
    }

    // Additional cleaning for time-of-day phrases requested
    cleanDesc = cleanDesc.replace(/\b(evening|morning|afternoon|night)\b/gi, '');

    // Final cleanup of description
    cleanDesc = cleanDesc
        .replace(/\s+/g, ' ') // Collapse spaces
        .trim();

    // Capitalize
    cleanDesc = cleanDesc.charAt(0).toUpperCase() + cleanDesc.slice(1);

    // If description becomes empty after cleaning (rare), fallback to original
    if (cleanDesc.length < 2) cleanDesc = description;

    // --- Category ---
    let workHits = 0;
    let homeHits = 0;

    KEYWORD_MAPPING[CATEGORIES.WORK].forEach(w => {
        const regex = new RegExp(`\\b${w}\\b`, 'i');
        if (regex.test(lowerText)) workHits++;
    });
    KEYWORD_MAPPING[CATEGORIES.HOME].forEach(w => {
        const regex = new RegExp(`\\b${w}\\b`, 'i');
        if (regex.test(lowerText)) homeHits++;
    });

    if (workHits > 0 && workHits >= homeHits) {
        category = CATEGORIES.WORK;
    } else {
        category = CATEGORIES.HOME;
    }

    return {
        description: cleanDesc,
        dueDate: dueDate ? formatDate(dueDate) : 'Not specified',
        category: category,
        urgency: urgency,
        completed: false,
        id: Date.now() + Math.random().toString(36).substr(2, 9)
    };
};

/**
 * Main entry point.
 * Splits text into multiple tasks and processes each.
 */
export const parseTasks = (input) => {
    let normalized = input
        .replace(/\b(and also|then|plus|also)\b/gi, '|')
        .replace(/, need to/gi, '|') // Handle ", need to"
        .replace(/, and/gi, '|')     // Handle ", and"
        .replace(/(\. )/g, '|')
        .replace(/(\n)/g, '|');

    let chunks = normalized.split('|').map(s => s.trim()).filter(s => s.length > 2);

    const tasks = [];
    chunks.forEach(chunk => {
        if (chunk.includes(' and ')) {
            const parts = chunk.split(' and ');
            parts.forEach(p => {
                if (p.trim().length > 3) tasks.push(extractTaskMetadata(p));
            });
        } else {
            tasks.push(extractTaskMetadata(chunk));
        }
    });

    return tasks;
};

export default parseTasks;
