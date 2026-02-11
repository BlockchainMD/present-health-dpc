export type DisclaimerContent = {
    shortText: string;
    fullText: string;
    emergencyText: string;
};

export const DEFAULT_DISCLAIMER: DisclaimerContent = {
    shortText: 'Educational content — not medical advice.',
    fullText:
        'This content is for general education and does not replace professional medical advice, diagnosis, or treatment. If you are worried about your symptoms, seek care from a qualified clinician. Decisions should be based on your personal health history and current symptoms.',
    emergencyText:
        'If you have severe or sudden symptoms, chest pain, trouble breathing, confusion, or signs of stroke, call emergency services.'
};
