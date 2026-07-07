import type { Metadata } from 'next';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AssessmentWidget } from '@/components/assessment/AssessmentWidget';

export const revalidate = false;

export const metadata: Metadata = {
  title: 'Free Health Assessment | Present Health',
  description:
    'Take our 2-minute health assessment and get personalized insights on the topics that matter most to your health — from sleep and heart health to mental wellness and prevention.',
  alternates: { canonical: 'https://presenthealthmd.com/assess' },
};

const CLUSTERS = [
  { slug: 'sleep', label: 'Sleep & Energy', description: 'Quality sleep, insomnia, sleep apnea, energy levels', icon: '🌙' },
  { slug: 'cardiovascular', label: 'Heart Health', description: 'Blood pressure, cholesterol, cardiovascular risk', icon: '❤️' },
  { slug: 'metabolic', label: 'Metabolic Health', description: 'Weight, diabetes risk, thyroid, metabolism', icon: '⚡' },
  { slug: 'mental', label: 'Mental Wellness', description: 'Anxiety, stress, depression, burnout', icon: '🧠' },
  { slug: 'gut', label: 'Gut Health', description: 'IBS, acid reflux, bloating, digestive symptoms', icon: '🌿' },
  { slug: 'musculoskeletal', label: 'Joints & Movement', description: 'Back pain, joint pain, injury recovery', icon: '🦴' },
  { slug: 'respiratory', label: 'Respiratory Health', description: 'Asthma, allergies, breathing concerns', icon: '💨' },
  { slug: 'preventive', label: 'Preventive Care', description: 'Screenings, annual checkups, vaccines', icon: '🛡️' },
  { slug: 'nutrition', label: 'Nutrition', description: 'Diet quality, supplements, hydration', icon: '🥦' },
  { slug: 'exercise', label: 'Fitness & Activity', description: 'Exercise habits, sedentary lifestyle, fitness goals', icon: '🏃' },
  { slug: 'womens_health', label: "Women's Health", description: 'Hormones, menstrual health, menopause, pregnancy', icon: '🌸' },
  { slug: 'mens_health', label: "Men's Health", description: 'Testosterone, prostate health, sexual wellness', icon: '💪' },
  { slug: 'longevity', label: 'Longevity', description: 'Healthspan, biomarkers, aging well, chronic disease prevention', icon: '🌟' },
  
];

export default function AssessHubPage() {
  return (
    <div className="container px-4 md:px-6 mx-auto py-24 max-w-6xl">
      <div className="text-center mb-12">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
          Free Health Assessment
        </h1>
        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
          Answer a few questions and get a personalized summary of health topics to explore — tailored to your goals and concerns.
        </p>
        <p className="text-sm text-muted-foreground mt-2">Takes about 2 minutes. No account required.</p>
      </div>

      {/* General assessment widget */}
      <div className="max-w-2xl mx-auto mb-16">
        <AssessmentWidget />
      </div>

      {/* Cluster cards */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight mb-6 text-center">
          Or focus on a specific health area
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {CLUSTERS.map((c) => (
            <Link key={`${c.slug}-${c.label}`} href={`/assess/${c.slug}`}>
              <Card className="h-full border-border/60 hover:border-primary/40 hover:shadow-md transition-all cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl" aria-hidden="true">{c.icon}</span>
                    <CardTitle className="text-base">{c.label}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{c.description}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* CTA */}
      <div className="mt-16 rounded-2xl border border-border bg-muted/20 p-8 text-center">
        <h2 className="text-2xl font-bold tracking-tight mb-3">
          Want a doctor who actually has time for you?
        </h2>
        <p className="text-muted-foreground mb-6 max-w-xl mx-auto">
          Present Health offers telehealth-first direct primary care with same-week appointments, transparent flat-fee pricing, and direct physician access.
        </p>
        <Button size="lg" asChild className="">
          <Link href="/join">Join Present Health</Link>
        </Button>
      </div>

      <p className="text-xs text-center text-muted-foreground mt-8">
        This assessment is for informational purposes only and is not a substitute for professional medical advice, diagnosis, or treatment.
      </p>
    </div>
  );
}
