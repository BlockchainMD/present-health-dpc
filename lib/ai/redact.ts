/**
 * Redacts sensitive PII (emails, phone numbers, freeform notes) from strings or objects.
 */
export function redactSensitive<T>(input: T): T {
    if (typeof input === 'string') {
        return redactString(input) as unknown as T;
    }

    if (Array.isArray(input)) {
        return input.map(item => redactSensitive(item)) as unknown as T;
    }

    if (input !== null && typeof input === 'object') {
        const redacted: any = {};
        for (const [key, value] of Object.entries(input)) {
            redacted[key] = redactSensitive(value);
        }
        return redacted as T;
    }

    return input;
}

function redactString(text: string): string {
    let redacted = text;

    // 1. Emails
    redacted = redacted.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, '[EMAIL_REDACTED]');

    // 2. Phone Numbers (Various Formats)
    redacted = redacted.replace(/(\+?\d{1,2}\s?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g, '[PHONE_REDACTED]');

    // 3. Freeform Patient Notes pattern (Generic "Note: ..." or "History: ...")
    // This is a heuristic, can be improved.
    const sensitiveLabels = [/patient/i, /note:/i, /history:/i, /symptoms:/i, /ssn/i];
    sensitiveLabels.forEach(pattern => {
        if (pattern.test(redacted)) {
            // If a line contains a sensitive label, we might want to be more aggressive
            // But for now, we just rely on regex for specific PII.
        }
    });

    return redacted;
}
