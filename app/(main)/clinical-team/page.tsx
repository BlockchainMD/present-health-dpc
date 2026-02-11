import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Clinical Team & Medical Review Process | Present Health',
    description: 'Learn how the Present Health Clinical Team reviews and maintains medical content.'
};

export default function ClinicalTeamPage() {
    return (
        <div className="min-h-screen bg-background">
            <div className="container px-4 md:px-6 mx-auto py-24 max-w-4xl">
                <div className="space-y-6">
                    <h1 className="text-4xl font-bold tracking-tight">Clinical Team & Medical Review Process</h1>
                    <div className="prose prose-lg text-muted-foreground">
                        <p>
                            Present Health content is reviewed by a clinical team to ensure clarity, safety, and
                            alignment with current medical understanding. Our goal is to provide educational guidance
                            that helps readers make informed decisions and know when to seek care.
                        </p>
                        <p>
                            Clinical review focuses on risk framing, red-flag symptoms, and appropriate escalation
                            guidance. We avoid individualized diagnosis or medication instructions and emphasize
                            cautious, evidence-aligned language.
                        </p>
                        <h2>What clinical review includes</h2>
                        <ul>
                            <li>Checking that safety and emergency guidance is present.</li>
                            <li>Ensuring claims use cautious language and avoid guarantees.</li>
                            <li>Verifying practical steps are appropriate for a general audience.</li>
                            <li>Confirming escalation guidance for urgent or concerning symptoms.</li>
                        </ul>
                        <p>
                            Content is educational and does not replace professional medical care. If you have urgent
                            symptoms, seek in-person evaluation or call emergency services.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
