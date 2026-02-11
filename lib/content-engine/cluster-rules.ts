export type ClusterPlaybook = {
    priorityDrivers: string[];
    redFlags: string[];
    specialSituations: string[];
    practicalPlan: string[];
    ctaBullets: string[];
    faqTargets: string[];
    observationalLimitRequired?: boolean;
};

export const LIFESTYLE_CLUSTERS = new Set([
    'sleep',
    'nutrition',
    'fitness',
    'longevity',
    'energy'
]);

const PLAYBOOK: Record<string, ClusterPlaybook> = {
    sleep: {
        priorityDrivers: [
            'Sleep duration and consistency',
            'Sleep quality and wake after sleep onset',
            'Sleep apnea risk (snoring, pauses, daytime sleepiness)',
            'Caffeine and alcohol timing',
            'Stress and insomnia patterns'
        ],
        redFlags: [
            'Excessive daytime sleepiness or falling asleep unintentionally',
            'Loud snoring or witnessed breathing pauses',
            'Falling asleep while driving',
            'Severe insomnia with functional impairment'
        ],
        specialSituations: [
            'Shift work or rotating schedules',
            'Insomnia or racing thoughts at night',
            'Parenting or caregiving time constraints'
        ],
        practicalPlan: [
            'Shift bedtime gradually (15-30 minutes every few days)',
            'Get morning light soon after waking',
            'Set a caffeine cutoff in the early afternoon',
            'Create a consistent wind-down routine'
        ],
        ctaBullets: [
            'Insomnia evaluation and sleep planning',
            'Sleep apnea screening and testing coordination',
            'Blood pressure and metabolic risk review'
        ],
        faqTargets: [
            'What if I work shifts?',
            'How do I know if sleep apnea is a concern?',
            'How much does sleep consistency matter?'
        ],
        observationalLimitRequired: true
    },
    metabolic: {
        priorityDrivers: [
            'Weight trends and waist measures',
            'Glucose and insulin resistance patterns',
            'Lipids and blood pressure',
            'Sleep and activity level',
            'Nutrition patterns and medications'
        ],
        redFlags: [
            'Very high glucose symptoms (excess thirst, confusion)',
            'Dehydration or confusion',
            'Chest pain or shortness of breath'
        ],
        specialSituations: [
            'Medication considerations and side effects',
            'Lab monitoring cadence (general)',
            'Barriers: time, access, habits'
        ],
        practicalPlan: [
            'Small, repeatable nutrition changes',
            'Activity plan with realistic frequency',
            'Sleep-first improvements',
            'Follow-up labs to track trends'
        ],
        ctaBullets: [
            'Labs review and metabolic risk plan',
            'Medication reconciliation',
            'Longitudinal coaching and follow-up'
        ],
        faqTargets: [
            'Which markers matter most for metabolic risk?',
            'How fast do changes show up in labs?'
        ]
    },
    heart: {
        priorityDrivers: [
            'Blood pressure control',
            'Lipids and metabolic risk',
            'Smoking and nicotine exposure',
            'Sleep apnea risk',
            'Activity level, diet, family history'
        ],
        redFlags: [
            'Chest pain or pressure',
            'Shortness of breath at rest',
            'Fainting or near-fainting',
            'New neurologic deficits',
            'Rapid irregular heartbeat with symptoms'
        ],
        specialSituations: [
            'Home blood pressure monitoring basics',
            'Medication adherence and refills',
            'High stress or poor sleep patterns'
        ],
        practicalPlan: [
            'Blood pressure logging plan',
            'Sodium and alcohol moderation',
            'Walking or aerobic routine',
            'Sleep consistency plan'
        ],
        ctaBullets: [
            'Hypertension management',
            'Lipid review and risk assessment',
            'Coordination for imaging/testing when needed'
        ],
        faqTargets: [
            'How often should I check blood pressure at home?',
            'Which heart risk factors are most modifiable?'
        ]
    },
    respiratory: {
        priorityDrivers: [
            'Triggers (smoke, allergens, environment)',
            'Infection versus chronic patterns',
            'Inhaler technique concept (general)',
            'Sleep and OSA overlap',
            'Home and workplace air quality'
        ],
        redFlags: [
            'Severe shortness of breath',
            'Blue lips or low oxygen symptoms',
            'Inability to speak full sentences',
            'Stridor or severe wheezing',
            'Worsening symptoms not responding to usual rescue plan'
        ],
        specialSituations: [
            'Asthma-like versus COPD-like patterns (general)',
            'Vaping or smoking cessation support'
        ],
        practicalPlan: [
            'Trigger reduction and air quality checks',
            'Supportive care for infections (general)',
            'Know when to seek urgent care'
        ],
        ctaBullets: [
            'Chronic cough evaluation',
            'Asthma control review',
            'Smoking cessation support and referrals'
        ],
        faqTargets: [
            'How do I tell triggers from infections?',
            'When is cough considered chronic?'
        ]
    },
    digestive: {
        priorityDrivers: [
            'Diet triggers and meal timing',
            'Hydration and fiber',
            'Medications that irritate GI',
            'Stress and bowel patterns'
        ],
        redFlags: [
            'Black/tarry stools or vomiting blood',
            'Severe persistent abdominal pain',
            'Jaundice',
            'Dehydration or unexplained weight loss'
        ],
        specialSituations: [
            'Reflux versus lower GI patterns (general)',
            'Travel or antibiotic-associated issues'
        ],
        practicalPlan: [
            'Symptom diary and trigger tracking',
            'Fiber and hydration steps',
            'Meal timing adjustments',
            'Know when to escalate'
        ],
        ctaBullets: [
            'Evaluation plan and next-step testing',
            'Labs/stool test coordination',
            'Medication review'
        ],
        faqTargets: [
            'How long should I track symptoms before seeking care?',
            'What are common reflux triggers?'
        ]
    },
    'mental-health': {
        priorityDrivers: [
            'Sleep and stress load',
            'Substance or alcohol use',
            'Support system and routine',
            'Medical contributors (thyroid, anemia) in general terms'
        ],
        redFlags: [
            'Suicidal thoughts or self-harm',
            'Harm to others',
            'Psychosis or severe confusion',
            'Severe functional impairment'
        ],
        specialSituations: [
            'Workplace stress and burnout',
            'Comorbid insomnia',
            'Postpartum concerns when relevant'
        ],
        practicalPlan: [
            'Immediate coping steps and grounding',
            'How to seek professional help',
            'Build a support check-in plan'
        ],
        ctaBullets: [
            'Evaluation and care planning',
            'Referral coordination',
            'Longitudinal support and follow-up'
        ],
        faqTargets: [
            'When should I consider professional support?',
            'How does sleep affect mood?'
        ]
    },
    musculoskeletal: {
        priorityDrivers: [
            'Recent activity or load changes',
            'Ergonomics and posture',
            'Sleep and recovery',
            'Prior injuries and inflammation patterns',
            'Neurologic symptoms screening'
        ],
        redFlags: [
            'Weakness or numbness with bowel/bladder changes',
            'Fever with back pain',
            'Severe trauma or inability to bear weight'
        ],
        specialSituations: [
            'Athletes versus desk workers',
            'Acute injury versus chronic pain'
        ],
        practicalPlan: [
            'Graded activity and pacing',
            'Simple mobility and strength concepts',
            'Heat/ice guidance (general)',
            'When imaging or referral is needed'
        ],
        ctaBullets: [
            'Evaluation for persistent pain',
            'PT coordination',
            'Imaging referral when indicated'
        ],
        faqTargets: [
            'How long should I rest after an injury?',
            'When does back pain need imaging?'
        ]
    },
    brain: {
        priorityDrivers: [
            'Headache pattern and timing',
            'Sleep and hydration',
            'Caffeine and medication overuse',
            'Stress and neurologic symptom screening'
        ],
        redFlags: [
            'FAST stroke symptoms',
            'Worst headache of life',
            'New neurologic deficits or seizures',
            'Confusion or head trauma with worsening symptoms'
        ],
        specialSituations: [
            'Concussion considerations',
            'New headaches in older adults'
        ],
        practicalPlan: [
            'Track triggers and pattern changes',
            'Hydration and sleep consistency',
            'Know when to escalate'
        ],
        ctaBullets: [
            'Headache evaluation',
            'Risk factor management',
            'Referral coordination'
        ],
        faqTargets: [
            'What headache patterns are concerning?',
            'How can I track triggers effectively?'
        ]
    },
    energy: {
        priorityDrivers: [
            'Sleep quantity and quality',
            'Anemia/thyroid/vitamin considerations (general)',
            'Mood and stress screening (general)',
            'Activity pacing and nutrition'
        ],
        redFlags: [
            'Chest pain or fainting',
            'Severe shortness of breath',
            'Rapid weight loss',
            'Fevers or night sweats'
        ],
        specialSituations: [
            'Shift work or burnout',
            'Postpartum or chronic illness considerations'
        ],
        practicalPlan: [
            'Sleep-first steps and routine',
            'Basic activity pacing',
            'Discuss labs if fatigue persists'
        ],
        ctaBullets: [
            'Fatigue workup and labs review',
            'Longitudinal follow-up plan'
        ],
        faqTargets: [
            'How long should fatigue last before evaluation?',
            'What labs are commonly considered?'
        ],
        observationalLimitRequired: true
    },
    nutrition: {
        priorityDrivers: [
            'Consistency over perfection',
            'Protein and fiber adequacy',
            'Ultra-processed foods',
            'Hydration and meal timing',
            'Cultural preferences'
        ],
        redFlags: [
            'Rapid unintentional weight loss',
            'Dehydration',
            'Possible eating disorder signs (general)'
        ],
        specialSituations: [
            'Diabetes/metabolic overlap',
            'Pregnancy or kids when relevant'
        ],
        practicalPlan: [
            '3-5 concrete swaps',
            'Shopping and meal prep tactics',
            'Start-here checklist'
        ],
        ctaBullets: [
            'Personalized plan tied to labs/conditions',
            'Accountability and follow-up'
        ],
        faqTargets: [
            'What is the easiest change to start with?',
            'How much protein or fiber do I need?'
        ],
        observationalLimitRequired: true
    },
    fitness: {
        priorityDrivers: [
            'Baseline activity level',
            'Progression and recovery',
            'Strength and cardio balance',
            'Injury prevention and sleep'
        ],
        redFlags: [
            'Exertional chest pain',
            'Syncope or near-fainting',
            'Severe shortness of breath',
            'Joint instability'
        ],
        specialSituations: [
            'Beginners and older adults',
            'Post-injury or postpartum'
        ],
        practicalPlan: [
            'Progressive plan with frequency and intensity',
            'Warm-up and cool-down',
            'Rest and recovery days'
        ],
        ctaBullets: [
            'Safe start plan and clearance evaluation when needed'
        ],
        faqTargets: [
            'How often should I train as a beginner?',
            'How do I avoid overtraining?'
        ],
        observationalLimitRequired: true
    },
    'women-health': {
        priorityDrivers: [
            'Life stage context (puberty, reproductive, peri/meno)',
            'Bleeding patterns and cycle changes',
            'Contraception context (general)',
            'Bone health and sleep'
        ],
        redFlags: [
            'Severe pelvic pain',
            'Heavy bleeding with dizziness',
            'Pregnancy-related urgent symptoms',
            'Possible ectopic/preeclampsia signs (general)'
        ],
        specialSituations: [
            'Pregnancy and postpartum considerations'
        ],
        practicalPlan: [
            'Symptom tracking and timing',
            'Screening prompts',
            'When to seek care'
        ],
        ctaBullets: [
            'Counseling and labs review',
            'Menopause symptom evaluation',
            'Referral coordination'
        ],
        faqTargets: [
            'When should cycle changes be evaluated?',
            'What symptoms merit urgent care?'
        ]
    },
    'men-health': {
        priorityDrivers: [
            'Cardiometabolic risk',
            'Sleep and stress',
            'Mental health and mood',
            'Sexual health and urinary symptoms (general)'
        ],
        redFlags: [
            'Testicular pain or swelling',
            'Urinary retention or blood in urine',
            'Chest pain'
        ],
        specialSituations: [
            'Medication contributors (general)',
            'Stress and mood link'
        ],
        practicalPlan: [
            'Lifestyle basics and screening',
            'Know evaluation triggers'
        ],
        ctaBullets: [
            'Risk assessment and labs review',
            'Longitudinal plan'
        ],
        faqTargets: [
            'What symptoms should prompt evaluation?',
            'How does stress affect men’s health?'
        ]
    },
    kids: {
        priorityDrivers: [
            'Age-based risk framing (infants vs older kids)',
            'Hydration and fever patterns',
            'Breathing and rash context'
        ],
        redFlags: [
            'Difficulty breathing',
            'Dehydration or lethargy',
            'Seizures or stiff neck',
            'Non-blanching rash',
            'Young infants with fever should be evaluated urgently'
        ],
        specialSituations: [
            'Daycare exposure',
            'Asthma history',
            'Dehydration risk'
        ],
        practicalPlan: [
            'Supportive care (fluids, rest)',
            'Monitoring guidance',
            'When to seek care'
        ],
        ctaBullets: [
            'Parental guidance visits',
            'Triage and coordination for in-person assessment'
        ],
        faqTargets: [
            'When does a fever need urgent care?',
            'What signs of dehydration should I watch for?'
        ]
    },
    longevity: {
        priorityDrivers: [
            'Sleep, activity, nutrition basics',
            'Social connection',
            'Prevention and screening'
        ],
        redFlags: [
            'New concerning symptoms should prompt care'
        ],
        specialSituations: [
            'Older adults vs busy adults',
            'Chronic disease overlap'
        ],
        practicalPlan: [
            'Small, sustainable habits',
            'Prevention checklist'
        ],
        ctaBullets: [
            'Prevention planning',
            'Labs and screening review',
            'Risk factor management'
        ],
        faqTargets: [
            'What matters most for healthy aging?',
            'How do I build sustainable habits?'
        ],
        observationalLimitRequired: true
    },
    preventive: {
        priorityDrivers: [
            'Screening by age and risk (general)',
            'Vaccines (general)',
            'Blood pressure, weight, smoking, mental health'
        ],
        redFlags: [
            'Concerning symptoms between screenings (general)',
            'New lumps or unexplained bleeding'
        ],
        specialSituations: [
            'Family history considerations',
            'Pregnancy and older adults'
        ],
        practicalPlan: [
            'Prevention checklist format',
            'Know what to ask at visits'
        ],
        ctaBullets: [
            'Annual prevention planning',
            'Coordination for screening orders/referrals'
        ],
        faqTargets: [
            'What screenings should I discuss with a clinician?',
            'How often should prevention be reviewed?'
        ]
    },
    'care-navigation': {
        priorityDrivers: [
            'Self-care vs telehealth vs urgent care vs ER decision steps',
            'How to prepare for visits',
            'What info to collect'
        ],
        redFlags: [
            'Chest pain, severe shortness of breath, stroke signs'
        ],
        specialSituations: [
            'Telehealth limits',
            'When in-person evaluation is required'
        ],
        practicalPlan: [
            'Decision tree in prose + checklist',
            'How to document symptoms'
        ],
        ctaBullets: [
            'Navigation, coordination, and follow-up support'
        ],
        faqTargets: [
            'When should I go to urgent care vs ER?',
            'What info should I bring to a visit?'
        ]
    },
    workplace: {
        priorityDrivers: [
            'Ergonomics and movement breaks',
            'Sleep and stress load',
            'Workload boundaries',
            'Injury prevention'
        ],
        redFlags: [
            'Chest pain, severe shortness of breath, neurologic deficits',
            'Severe depression or anxiety crisis'
        ],
        specialSituations: [
            'Remote work vs onsite',
            'Shift work'
        ],
        practicalPlan: [
            'Workstation checklist',
            'Daily break routine'
        ],
        ctaBullets: [
            'Stress and sleep evaluation',
            'Chronic pain support'
        ],
        faqTargets: [
            'How often should I take movement breaks?',
            'What is a simple ergonomic setup?'
        ]
    },
    travel: {
        priorityDrivers: [
            'Sleep and jet lag',
            'Hydration and GI prevention',
            'Mobility and DVT risk (general)',
            'Medication planning (general)'
        ],
        redFlags: [
            'Severe dehydration or high fever',
            'Chest pain or shortness of breath after travel',
            'New neurologic deficits'
        ],
        specialSituations: [
            'Chronic conditions and travel',
            'Pregnancy, kids, immunocompromised (general)'
        ],
        practicalPlan: [
            'Pre-travel checklist',
            'During travel habits',
            'After travel monitoring'
        ],
        ctaBullets: [
            'Pre-travel consult',
            'Medication reconciliation',
            'Care planning while away'
        ],
        faqTargets: [
            'How can I reduce jet lag?',
            'What should I pack for health needs?'
        ]
    },
    skin: {
        priorityDrivers: [
            'Irritants and allergens',
            'Infection vs inflammation patterns (general)',
            'Skin care basics and sun protection'
        ],
        redFlags: [
            'Rapidly spreading rash with fever',
            'Signs of anaphylaxis',
            'Suspected serious skin infection',
            'Changing or bleeding mole'
        ],
        specialSituations: [
            'Kids vs adults',
            'Occupational exposures'
        ],
        practicalPlan: [
            'Trigger avoidance',
            'Gentle care basics',
            'When to escalate'
        ],
        ctaBullets: [
            'Rash evaluation via telehealth',
            'Photo guidance and referral coordination'
        ],
        faqTargets: [
            'When is a rash urgent?',
            'How should I track a changing spot?'
        ]
    },
    immune: {
        priorityDrivers: [
            'Sleep, stress, nutrition basics',
            'Vaccination status (general)',
            'Chronic disease and medications that affect immunity'
        ],
        redFlags: [
            'High fever with severe symptoms',
            'Confusion or difficulty breathing',
            'Severe dehydration'
        ],
        specialSituations: [
            'Frequent infections',
            'Immunocompromised precautions (general)'
        ],
        practicalPlan: [
            'Prevention basics',
            'When to seek care'
        ],
        ctaBullets: [
            'Prevention planning and vaccine counseling',
            'Evaluation of recurrent infections'
        ],
        faqTargets: [
            'What does “frequent infections” mean?',
            'How can I reduce risk without supplements?'
        ]
    },
    general: {
        priorityDrivers: [
            'Track symptoms and triggers',
            'Sleep, hydration, and stress basics',
            'Avoid over-interpretation without evaluation'
        ],
        redFlags: [
            'Severe or rapidly worsening symptoms',
            'Chest pain, severe shortness of breath, neurologic deficits'
        ],
        specialSituations: [
            'Uncertainty about severity',
            'Persistent symptoms despite self-care'
        ],
        practicalPlan: [
            'Symptom tracking and simple self-care',
            'Clear escalation thresholds'
        ],
        ctaBullets: [
            'Personalized guidance and evaluation'
        ],
        faqTargets: [
            'When should I seek care?',
            'What info should I track?'
        ]
    }
};

const OVERLAP_CUES: Record<string, string> = {
    sleep: 'Sleep consistency and possible sleep apnea can influence other risk factors.',
    heart: 'Cardiovascular risk factors like blood pressure can intersect with this topic.',
    brain: 'New neurologic symptoms should raise the urgency level.',
    respiratory: 'Breathing patterns and air quality can amplify symptoms.',
    kids: 'Age-specific risk means lower thresholds for urgent evaluation.',
    'mental-health': 'Stress and mood can intensify symptoms or slow recovery.',
    'women-health': 'Life stage factors (cycle, pregnancy, menopause) can shift the picture.',
    metabolic: 'Glucose and insulin markers often shift alongside lifestyle changes.',
    immune: 'Immune status and recent infections can alter symptom patterns.',
    digestive: 'Gut symptoms may change with stress, meds, or travel.',
    skin: 'Skin changes can reflect exposure, irritation, or infection.',
    musculoskeletal: 'Movement patterns and ergonomics can be key drivers.',
    'men-health': 'Stress, sleep, and cardiometabolic factors often overlap.',
    nutrition: 'Food quality and consistency often drive symptom trends.',
    fitness: 'Training load and recovery can explain flare-ups.',
    longevity: 'Prevention basics matter more than hacks.',
    preventive: 'Screening and prevention planning can uncover risk early.',
    travel: 'Travel disrupts sleep, hydration, and routine.',
    workplace: 'Workload and environment often shape symptoms.',
    'care-navigation': 'Choosing the right level of care is part of the solution.'
};

export function getClusterPlaybook(cluster: string): ClusterPlaybook {
    return PLAYBOOK[cluster] || PLAYBOOK.general;
}

export function getOverlapNotes(secondary: string[]) {
    return secondary.map((cluster) => OVERLAP_CUES[cluster]).filter(Boolean);
}
