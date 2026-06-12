import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { AssessmentWidget } from '@/components/assessment/AssessmentWidget';

export const revalidate = 86400;

const CLUSTER_META: Record<string, { label: string; description: string; longDescription: string }> = {
  sleep: {
    label: 'Sleep & Energy Assessment',
    description: 'Assess your sleep quality and energy levels with a personalized 2-minute questionnaire.',
    longDescription: 'Good sleep is the foundation of health. Our sleep assessment covers sleep duration, quality, insomnia patterns, and potential sleep apnea risk factors — then generates personalized topics to explore with your doctor.',
  },
  cardiovascular: {
    label: 'Heart Health Assessment',
    description: 'Evaluate your cardiovascular risk factors including blood pressure, cholesterol, and family history.',
    longDescription: 'Cardiovascular disease is the leading cause of death in the US — but many risk factors are manageable with early awareness. Our heart health assessment identifies key topics to explore with your doctor.',
  },
  metabolic: {
    label: 'Metabolic Health Assessment',
    description: 'Understand your metabolic health: weight, energy, blood sugar, and thyroid concerns.',
    longDescription: 'Metabolic health encompasses how your body processes energy, manages blood sugar, and maintains a healthy weight. Our assessment helps identify areas where targeted discussions with your doctor could make a real difference.',
  },
  mental: {
    label: 'Mental Wellness Assessment',
    description: 'Assess your stress, anxiety, mood, and burnout levels with a confidential 2-minute check-in.',
    longDescription: 'Mental wellness is as important as physical health. Our check-in covers stress, anxiety, mood changes, and burnout — and connects you to relevant resources and topics to discuss with your care team.',
  },
  gut: {
    label: 'Gut Health Assessment',
    description: 'Identify digestive symptoms like bloating, reflux, IBS, and bowel irregularity.',
    longDescription: 'Digestive health affects energy, immunity, and overall wellbeing. Our gut assessment helps identify common digestive patterns and connects you with information about managing symptoms.',
  },
  musculoskeletal: {
    label: 'Joint & Movement Assessment',
    description: 'Assess back pain, joint discomfort, and musculoskeletal health.',
    longDescription: 'Musculoskeletal concerns are among the most common reasons people visit the doctor. Our assessment covers pain patterns, activity levels, and injury history to help guide your conversations.',
  },
  respiratory: {
    label: 'Respiratory Health Assessment',
    description: 'Evaluate asthma, allergies, and breathing concerns.',
    longDescription: 'Respiratory health impacts daily quality of life. Our assessment looks at breathing symptoms, allergy patterns, and risk factors to help you understand what might be worth discussing with a physician.',
  },
  preventive: {
    label: 'Preventive Care Assessment',
    description: 'Find out which screenings and preventive measures you may be due for.',
    longDescription: 'Preventive care catches problems before they become serious. Our assessment helps identify which annual screenings, labs, and checkups may be overdue for your age and health profile.',
  },
  nutrition: {
    label: 'Nutrition Assessment',
    description: 'Evaluate your diet quality, hydration, and supplement needs.',
    longDescription: 'Nutrition is a cornerstone of health. Our assessment helps identify patterns in your eating habits and flags areas where professional guidance might be valuable.',
  },
  exercise: {
    label: 'Fitness & Activity Assessment',
    description: 'Assess your current activity level and exercise goals.',
    longDescription: 'Physical activity is one of the most powerful tools for long-term health. Our assessment evaluates your current habits and identifies safe ways to improve — whether you are just starting or looking to optimize.',
  },
  womens_health: {
    label: "Women's Health Assessment",
    description: 'Assess hormonal health, menstrual patterns, menopause symptoms, and more.',
    longDescription: "Women's health encompasses a wide range of concerns across different life stages. Our assessment covers hormonal changes, menstrual health, perimenopause, and reproductive wellness.",
  },
  mens_health: {
    label: "Men's Health Assessment",
    description: "Assess testosterone, prostate health, and men's preventive care.",
    longDescription: "Men's health concerns are often underdiagnosed due to reluctance to seek care. Our assessment covers energy, hormonal health, prostate screening, and men's preventive care.",
  },
  longevity: {
    label: 'Longevity Assessment',
    description: 'Explore your healthspan goals: biomarkers, inflammation, cognitive health, and aging well.',
    longDescription: 'Longevity medicine focuses on adding healthy years to your life. Our assessment explores your goals around biomarker tracking, inflammation reduction, cognitive health, and evidence-based approaches to aging well.',
  },
};

type ClusterParams = Promise<{ cluster: string }>;

export async function generateMetadata({ params }: { params: ClusterParams }): Promise<Metadata> {
  const { cluster } = await params;
  const meta = CLUSTER_META[cluster];
  if (!meta) return {};

  return {
    title: `${meta.label} | Present Health DPC`,
    description: meta.description,
    alternates: { canonical: `https://presenthealthmd.com/assess/${cluster}` },
  };
}

export default async function AssessClusterPage({ params }: { params: ClusterParams }) {
  const { cluster } = await params;
  const meta = CLUSTER_META[cluster];

  if (!meta) notFound();

  return (
    <div className="container px-4 md:px-6 mx-auto py-24 max-w-3xl">
      <div className="mb-8">
        <Button variant="ghost" asChild className="-ml-4 text-muted-foreground">
          <Link href="/assess">
            <ArrowLeft className="mr-2 h-4 w-4" />
            All assessments
          </Link>
        </Button>
      </div>

      <header className="mb-10">
        <h1 className="text-4xl font-bold tracking-tight mb-4">{meta.label}</h1>
        <p className="text-lg text-muted-foreground">{meta.longDescription}</p>
        <p className="text-sm text-muted-foreground mt-3">
          Takes about 2 minutes · Free · No account required
        </p>
      </header>

      <AssessmentWidget cluster={cluster} />

      <p className="text-xs text-center text-muted-foreground mt-8">
        This assessment is for informational purposes only and is not a substitute for professional medical advice, diagnosis, or treatment. Always consult your physician.
      </p>
    </div>
  );
}
