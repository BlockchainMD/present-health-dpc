type AlertPayload = {
    title: string;
    message: string;
    severity?: 'INFO' | 'WARN' | 'ERROR';
    metadata?: Record<string, any>;
};

export async function sendAlert(payload: AlertPayload) {
    const webhook = process.env.CONTENT_ENGINE_ALERT_WEBHOOK;
    if (!webhook) return;

    const body = buildPayload(payload);

    try {
        await fetch(webhook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
    } catch (error) {
        console.error('[ContentEngineAlert] Failed to send alert', error);
    }
}

function buildPayload(payload: AlertPayload) {
    const { title, message, severity = 'ERROR', metadata } = payload;
    const text = `${title}\n${message}`;

    return {
        text,
        attachments: metadata
            ? [
                {
                    color: severity === 'ERROR' ? '#d73a49' : severity === 'WARN' ? '#ffab00' : '#2ea043',
                    fields: Object.entries(metadata).map(([key, value]) => ({
                        title: key,
                        value: typeof value === 'string' ? value : JSON.stringify(value),
                        short: true
                    }))
                }
            ]
            : undefined
    };
}
