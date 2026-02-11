import type { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Editorial Policy | Present Health',
    description: 'Learn how Present Health creates, reviews, and updates educational health content.'
};

export default function EditorialPolicyPage() {
    return (
        <div className="min-h-screen bg-background">
            <div className="container px-4 md:px-6 mx-auto py-24 max-w-4xl">
                <div className="space-y-6">
                    <h1 className="text-4xl font-bold tracking-tight">Editorial Policy</h1>
                    <div className="prose prose-lg text-muted-foreground">
                        <p>
                            Present Health publishes educational content to help readers understand health topics,
                            ask better questions, and know when to seek care. We prioritize clarity, safety, and
                            practical guidance.
                        </p>
                        <h2>Our standards</h2>
                        <ul>
                            <li>Use cautious language for health claims.</li>
                            <li>Avoid individualized medical advice or diagnosis.</li>
                            <li>Focus on actionable steps and care navigation.</li>
                            <li>Provide clear guidance on urgent symptoms.</li>
                        </ul>
                        <h2>Sources and evidence</h2>
                        <p>
                            When sources are available, we summarize evidence and avoid overstating findings. Many
                            lifestyle topics rely on observational evidence that cannot prove causation. We state
                            limitations when applicable.
                        </p>
                        <h2>Updates</h2>
                        <p>
                            Articles are reviewed and updated as needed to maintain clarity and relevance. Updates are
                            recorded in the “Reviewed by” block on each article page.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
