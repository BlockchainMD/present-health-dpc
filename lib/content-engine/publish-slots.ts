/**
 * Staggered publish slot calculator.
 *
 * Instead of publishing all engine-generated articles at once, we spread them
 * across predefined time slots throughout the day. This signals consistent,
 * organic publishing cadence to search engines rather than bulk bursts.
 *
 * Slots (CT / America/Chicago):
 *   09:00, 13:00, 17:00, 21:00
 *
 * The engine creates articles with status=PUBLISHED and a future publishedAt.
 * The site already treats `publishedAt > now` as "not yet visible", so no
 * schema changes are needed — this is purely a scheduling concern.
 */

// Slot hours in UTC.  CT is UTC-6 (CST) / UTC-5 (CDT).
// We use UTC-6 as a stable baseline (CST).  The half-hour shift during CDT
// is acceptable given the non-real-time nature of content publishing.
const SLOT_HOURS_UTC = [15, 19, 23, 3]; // 09:00, 13:00, 17:00, 21:00 CT (CST=UTC-6)

/**
 * Returns the next `count` publish slots, all guaranteed to be in the future
 * with at least a 5-minute buffer from `now`.
 *
 * Articles from the same engine run receive different slots, spreading them
 * over one or more days naturally.
 */
export function getNextPublishSlots(count: number, now = new Date()): Date[] {
    const slots: Date[] = [];
    const bufferMs = 5 * 60 * 1000; // 5-minute buffer
    let dayOffset = 0;

    while (slots.length < count && dayOffset < 14) {
        const baseUtc = new Date(now);
        baseUtc.setUTCDate(baseUtc.getUTCDate() + dayOffset);

        for (const hour of SLOT_HOURS_UTC) {
            if (slots.length >= count) break;

            const slot = new Date(
                Date.UTC(
                    baseUtc.getUTCFullYear(),
                    baseUtc.getUTCMonth(),
                    baseUtc.getUTCDate(),
                    hour, 0, 0, 0
                )
            );

            if (slot.getTime() > now.getTime() + bufferMs) {
                slots.push(slot);
            }
        }

        dayOffset++;
    }

    return slots;
}

/**
 * Returns the next single publish slot after `after`.
 * Useful for assigning one slot at a time.
 */
export function getNextPublishSlot(after = new Date()): Date {
    return getNextPublishSlots(1, after)[0] ?? new Date(after.getTime() + 4 * 60 * 60 * 1000);
}
