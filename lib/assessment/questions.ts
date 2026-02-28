export type QuestionOption = {
  label: string;
  signals: string[];
};

export type Question = {
  id: string;
  text: string;
  subtext?: string;
  type: 'single' | 'multi';
  cluster?: string;
  options: QuestionOption[];
  isUniversal?: boolean;
  followUpForSignal?: string;
};

// ─── Universal Questions (all users see these) ──────────────────────────────

const universalQuestions: Question[] = [
  {
    id: 'health_interests',
    text: 'Which health areas are most relevant to you right now?',
    subtext: 'Select all that apply.',
    type: 'multi',
    isUniversal: true,
    options: [
      { label: 'Sleep & energy', signals: ['sleep_poor'] },
      { label: 'Heart health', signals: ['cardio_family_history'] },
      { label: 'Weight & metabolism', signals: ['metabolic_weight'] },
      { label: 'Mental health & stress', signals: ['mental_stress'] },
      { label: 'Gut & digestion', signals: ['gut_bloating'] },
      { label: 'Joints & movement', signals: ['msk_joint_pain'] },
      { label: "Women's health", signals: ['womens_hormones'] },
      { label: "Men's health", signals: ['mens_testosterone'] },
      { label: 'Longevity & prevention', signals: ['longevity_interest'] },
    ],
  },
  {
    id: 'overall_health',
    text: 'How would you rate your overall health?',
    type: 'single',
    isUniversal: true,
    options: [
      { label: 'Excellent — I feel great most of the time', signals: [] },
      { label: 'Good — a few things I want to improve', signals: ['preventive_annual_checkup'] },
      { label: 'Fair — I have ongoing concerns', signals: ['preventive_screenings_overdue', 'metabolic_fatigue'] },
      { label: 'Poor — I struggle with my health regularly', signals: ['preventive_screenings_overdue', 'metabolic_fatigue', 'preventive_no_pcp'] },
    ],
  },
  {
    id: 'pcp_status',
    text: 'Do you have a primary care physician you see regularly?',
    type: 'single',
    isUniversal: true,
    options: [
      { label: 'Yes, I see them at least annually', signals: [] },
      { label: 'Yes, but I struggle to get timely appointments', signals: ['dpc_frustration_access', 'preventive_annual_checkup'] },
      { label: 'No — I use urgent care or ERs when needed', signals: ['preventive_no_pcp', 'dpc_frustration_access'] },
      { label: "No — I don't have one right now", signals: ['preventive_no_pcp'] },
    ],
  },
  {
    id: 'activity_level',
    text: 'How physically active are you on a typical week?',
    type: 'single',
    isUniversal: true,
    options: [
      { label: 'Very active — exercise 5+ days a week', signals: ['exercise_goals'] },
      { label: 'Moderately active — 3–4 days a week', signals: [] },
      { label: 'Lightly active — 1–2 days a week', signals: ['exercise_goals'] },
      { label: 'Mostly sedentary — little to no exercise', signals: ['exercise_sedentary'] },
    ],
  },
  {
    id: 'diet_quality',
    text: 'How would you describe your typical diet?',
    type: 'single',
    isUniversal: true,
    options: [
      { label: 'Very healthy — whole foods, minimal processed', signals: [] },
      { label: 'Mostly healthy — some room for improvement', signals: [] },
      { label: 'Mixed — I try but often fall short', signals: ['nutrition_poor_diet'] },
      { label: 'Poor — lots of processed or fast food', signals: ['nutrition_poor_diet', 'metabolic_weight'] },
    ],
  },
  {
    id: 'dpc_frustrations',
    text: 'What frustrates you most about the current healthcare system?',
    subtext: 'Select all that apply.',
    type: 'multi',
    isUniversal: true,
    options: [
      { label: 'Hard to get a timely appointment', signals: ['dpc_frustration_access'] },
      { label: 'High costs and surprise bills', signals: ['dpc_frustration_cost'] },
      { label: 'Rushed appointments — not enough time with my doctor', signals: ['dpc_frustration_access'] },
      { label: 'Hard to communicate outside of appointments', signals: ['dpc_frustration_access'] },
      { label: 'Confusing insurance and referrals', signals: ['dpc_frustration_cost'] },
      { label: "I'm generally satisfied with my care", signals: [] },
    ],
  },
];

// ─── Cluster-specific Questions ──────────────────────────────────────────────

const sleepQuestions: Question[] = [
  {
    id: 'sleep_hours',
    text: 'How many hours of sleep do you typically get per night?',
    type: 'single',
    cluster: 'sleep',
    options: [
      { label: '7–9 hours (recommended)', signals: [] },
      { label: '6–7 hours', signals: ['sleep_poor'] },
      { label: 'Less than 6 hours', signals: ['sleep_poor', 'sleep_insomnia'] },
      { label: 'More than 9 hours but still tired', signals: ['sleep_poor', 'sleep_apnea_risk'] },
    ],
  },
  {
    id: 'sleep_quality',
    text: 'How often do you wake up feeling rested?',
    type: 'single',
    cluster: 'sleep',
    options: [
      { label: 'Almost always', signals: [] },
      { label: 'Sometimes', signals: ['sleep_poor'] },
      { label: 'Rarely', signals: ['sleep_poor', 'sleep_insomnia'] },
      { label: 'Almost never', signals: ['sleep_poor', 'sleep_insomnia', 'sleep_apnea_risk'] },
    ],
  },
  {
    id: 'sleep_snoring',
    text: 'Do you snore or have you been told you stop breathing during sleep?',
    type: 'single',
    cluster: 'sleep',
    followUpForSignal: 'sleep_poor',
    options: [
      { label: 'No', signals: [] },
      { label: 'I snore occasionally', signals: ['sleep_snoring'] },
      { label: 'I snore often or loudly', signals: ['sleep_snoring', 'sleep_apnea_risk'] },
      { label: "I've been told I stop breathing during sleep", signals: ['sleep_apnea_risk'] },
    ],
  },
];

const heartQuestions: Question[] = [
  {
    id: 'cardio_history',
    text: 'Do you have a family history of heart disease, stroke, or high blood pressure?',
    type: 'single',
    cluster: 'cardiovascular',
    options: [
      { label: 'No known family history', signals: [] },
      { label: 'One parent or sibling affected', signals: ['cardio_family_history'] },
      { label: 'Multiple family members affected', signals: ['cardio_family_history', 'cardio_cholesterol'] },
      { label: "Not sure / don't know my family history", signals: ['cardio_family_history'] },
    ],
  },
  {
    id: 'cardio_bp',
    text: 'Have you ever been told your blood pressure is high?',
    type: 'single',
    cluster: 'cardiovascular',
    options: [
      { label: 'No — always been normal', signals: [] },
      { label: "Yes, but I'm managing it with lifestyle", signals: ['cardio_bp_high'] },
      { label: 'Yes, and I take medication for it', signals: ['cardio_bp_high'] },
      { label: "I haven't had it checked recently", signals: ['cardio_bp_high', 'preventive_screenings_overdue'] },
    ],
  },
  {
    id: 'cardio_symptoms',
    text: 'Do you ever experience chest discomfort, shortness of breath at rest, or heart palpitations?',
    type: 'single',
    cluster: 'cardiovascular',
    options: [
      { label: 'No, never', signals: [] },
      { label: 'Occasionally during intense exercise', signals: [] },
      { label: 'Sometimes at rest or with mild activity', signals: ['cardio_chest_pain', 'resp_shortness_breath'] },
      { label: 'Yes, fairly often', signals: ['cardio_chest_pain', 'resp_shortness_breath', 'cardio_bp_high'] },
    ],
  },
];

const metabolicQuestions: Question[] = [
  {
    id: 'metabolic_diabetes',
    text: 'Have you ever been diagnosed with or told you may have prediabetes or diabetes?',
    type: 'single',
    cluster: 'metabolic',
    options: [
      { label: 'No', signals: [] },
      { label: 'Prediabetes', signals: ['metabolic_prediabetes', 'metabolic_diabetes_risk'] },
      { label: 'Type 2 diabetes', signals: ['metabolic_prediabetes', 'metabolic_diabetes_risk'] },
      { label: "I haven't been tested recently", signals: ['metabolic_diabetes_risk', 'preventive_screenings_overdue'] },
    ],
  },
  {
    id: 'metabolic_energy',
    text: 'How is your energy throughout the day?',
    type: 'single',
    cluster: 'metabolic',
    options: [
      { label: 'Consistently good energy all day', signals: [] },
      { label: 'Afternoon slump but generally okay', signals: ['metabolic_fatigue'] },
      { label: 'Often tired even after sleeping', signals: ['metabolic_fatigue', 'metabolic_thyroid'] },
      { label: 'Exhausted most of the time', signals: ['metabolic_fatigue', 'metabolic_thyroid', 'sleep_poor'] },
    ],
  },
  {
    id: 'metabolic_weight_goal',
    text: 'Which best describes your current relationship with your weight?',
    type: 'single',
    cluster: 'metabolic',
    options: [
      { label: "I'm at a healthy weight and maintaining it", signals: [] },
      { label: 'I want to lose some weight', signals: ['metabolic_weight'] },
      { label: "I've tried many diets without lasting results", signals: ['metabolic_weight', 'nutrition_poor_diet'] },
      { label: "Weight isn't a concern for me", signals: [] },
    ],
  },
];

const mentalQuestions: Question[] = [
  {
    id: 'mental_mood',
    text: 'How have you been feeling emotionally over the past month?',
    type: 'single',
    cluster: 'mental',
    options: [
      { label: 'Generally positive and stable', signals: [] },
      { label: 'Stressed but managing', signals: ['mental_stress'] },
      { label: 'Frequently anxious or worried', signals: ['mental_anxiety', 'mental_stress'] },
      { label: 'Feeling down, hopeless, or unmotivated', signals: ['mental_depression', 'mental_burnout'] },
    ],
  },
  {
    id: 'mental_work_life',
    text: 'How is your work-life balance?',
    type: 'single',
    cluster: 'mental',
    options: [
      { label: 'Balanced — I have time for rest and hobbies', signals: [] },
      { label: 'Somewhat strained — work takes over sometimes', signals: ['mental_stress'] },
      { label: 'Poor — I feel overwhelmed regularly', signals: ['mental_stress', 'mental_burnout'] },
      { label: 'Burned out — I dread most days', signals: ['mental_burnout', 'mental_depression'] },
    ],
  },
];

const gutQuestions: Question[] = [
  {
    id: 'gut_symptoms',
    text: 'Do you regularly experience any of the following digestive issues?',
    subtext: 'Select all that apply.',
    type: 'multi',
    cluster: 'gut',
    options: [
      { label: 'Bloating or gas', signals: ['gut_bloating'] },
      { label: 'Heartburn or acid reflux', signals: ['gut_reflux'] },
      { label: 'Irregular bowel movements', signals: ['gut_irregularity'] },
      { label: 'Abdominal pain or cramping', signals: ['gut_ibs'] },
      { label: 'None of these', signals: [] },
    ],
  },
];

const womensQuestions: Question[] = [
  {
    id: 'womens_menstrual',
    text: 'Have you experienced changes in your menstrual cycle in the past year?',
    type: 'single',
    cluster: 'womens_health',
    options: [
      { label: 'No changes — cycle is regular', signals: [] },
      { label: 'Yes — irregular timing or flow', signals: ['womens_menstrual'] },
      { label: "I'm in perimenopause or menopause", signals: ['womens_menopause'] },
      { label: 'Not applicable', signals: [] },
    ],
  },
  {
    id: 'womens_hormones',
    text: 'Do you experience symptoms that may be hormone-related?',
    subtext: 'Select all that apply.',
    type: 'multi',
    cluster: 'womens_health',
    options: [
      { label: 'Hot flashes or night sweats', signals: ['womens_menopause', 'womens_hormones'] },
      { label: 'Mood swings', signals: ['womens_hormones'] },
      { label: 'Fatigue or brain fog', signals: ['womens_hormones', 'metabolic_fatigue'] },
      { label: 'Low libido', signals: ['womens_hormones'] },
      { label: 'None of these', signals: [] },
    ],
  },
];

const mensQuestions: Question[] = [
  {
    id: 'mens_energy_libido',
    text: 'In the past year, have you noticed changes in energy, libido, or mood?',
    type: 'single',
    cluster: 'mens_health',
    options: [
      { label: 'No significant changes', signals: [] },
      { label: 'Somewhat less energy than before', signals: ['mens_testosterone', 'metabolic_fatigue'] },
      { label: 'Noticeable decline in energy, libido, or mood', signals: ['mens_testosterone', 'mens_sexual_health'] },
      { label: 'Significant changes I want to address', signals: ['mens_testosterone', 'mens_sexual_health', 'metabolic_fatigue'] },
    ],
  },
  {
    id: 'mens_prostate',
    text: 'Are you over 40 or do you have any urinary concerns?',
    type: 'single',
    cluster: 'mens_health',
    options: [
      { label: 'No — under 40 with no issues', signals: [] },
      { label: 'Over 40 but no urinary symptoms', signals: ['preventive_screenings_overdue'] },
      { label: 'Yes — some urinary frequency or urgency', signals: ['mens_prostate'] },
      { label: "I'm concerned about prostate health", signals: ['mens_prostate', 'preventive_screenings_overdue'] },
    ],
  },
];

const preventiveQuestions: Question[] = [
  {
    id: 'preventive_screenings',
    text: 'Which preventive screenings are you due for or concerned about?',
    subtext: 'Select all that apply.',
    type: 'multi',
    cluster: 'preventive',
    options: [
      { label: 'Annual blood work / labs', signals: ['preventive_screenings_overdue'] },
      { label: 'Blood pressure or cholesterol check', signals: ['preventive_screenings_overdue', 'cardio_cholesterol'] },
      { label: 'Cancer screenings (colonoscopy, mammogram, etc.)', signals: ['preventive_screenings_overdue'] },
      { label: 'Skin or eye exams', signals: ['preventive_screenings_overdue'] },
      { label: "I'm up to date on screenings", signals: [] },
    ],
  },
];

const longevityQuestions: Question[] = [
  {
    id: 'longevity_goals',
    text: 'What longevity and healthspan goals are most important to you?',
    subtext: 'Select all that apply.',
    type: 'multi',
    cluster: 'longevity',
    options: [
      { label: 'Understanding my key health biomarkers', signals: ['longevity_biomarkers'] },
      { label: 'Reducing inflammation and chronic disease risk', signals: ['longevity_interest'] },
      { label: 'Optimizing nutrition and supplementation', signals: ['longevity_interest', 'nutrition_supplements'] },
      { label: 'Cognitive health and brain longevity', signals: ['longevity_interest'] },
      { label: 'General preventive care and aging well', signals: ['longevity_interest', 'preventive_annual_checkup'] },
    ],
  },
];

// ─── Cluster question map ─────────────────────────────────────────────────────

const CLUSTER_QUESTIONS: Record<string, Question[]> = {
  sleep: sleepQuestions,
  cardiovascular: heartQuestions,
  metabolic: metabolicQuestions,
  mental: mentalQuestions,
  gut: gutQuestions,
  womens_health: womensQuestions,
  mens_health: mensQuestions,
  preventive: preventiveQuestions,
  longevity: longevityQuestions,
};

// All questions in order
export const QUESTIONS: Question[] = [
  ...universalQuestions,
  ...sleepQuestions,
  ...heartQuestions,
  ...metabolicQuestions,
  ...mentalQuestions,
  ...gutQuestions,
  ...womensQuestions,
  ...mensQuestions,
  ...preventiveQuestions,
  ...longevityQuestions,
];

/**
 * Returns the ordered question list for a given cluster.
 * Always includes universal questions first, then cluster-specific ones.
 * If cluster is null, returns only universal questions.
 */
export function getQuestionsForCluster(cluster: string | null): Question[] {
  const clusterQs = cluster ? (CLUSTER_QUESTIONS[cluster] ?? []) : [];
  return [...universalQuestions, ...clusterQs];
}
