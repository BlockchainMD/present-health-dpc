export type SignalSeverity = 'INFO' | 'FLAG' | 'URGENT';

export type SignalDef = {
  key: string;
  cluster: string;
  label: string;
  severity: SignalSeverity;
  doctorText?: string;
};

export const SIGNALS: SignalDef[] = [
  // Sleep
  { key: 'sleep_poor', cluster: 'sleep', label: 'Poor sleep quality', severity: 'FLAG', doctorText: 'sleep quality and duration' },
  { key: 'sleep_insomnia', cluster: 'sleep', label: 'Insomnia symptoms', severity: 'FLAG', doctorText: 'insomnia or difficulty falling asleep' },
  { key: 'sleep_apnea_risk', cluster: 'sleep', label: 'Sleep apnea risk factors', severity: 'URGENT', doctorText: 'possible sleep apnea symptoms' },
  { key: 'sleep_snoring', cluster: 'sleep', label: 'Snoring', severity: 'INFO', doctorText: 'snoring and its potential causes' },

  // Cardiovascular
  { key: 'cardio_bp_high', cluster: 'cardiovascular', label: 'Elevated blood pressure concern', severity: 'URGENT', doctorText: 'blood pressure management' },
  { key: 'cardio_cholesterol', cluster: 'cardiovascular', label: 'Cholesterol concerns', severity: 'FLAG', doctorText: 'cholesterol levels and cardiovascular risk' },
  { key: 'cardio_family_history', cluster: 'cardiovascular', label: 'Family history of heart disease', severity: 'FLAG', doctorText: 'family history and cardiovascular risk screening' },
  { key: 'cardio_chest_pain', cluster: 'cardiovascular', label: 'Chest discomfort', severity: 'URGENT', doctorText: 'any chest discomfort or palpitations' },

  // Metabolic
  { key: 'metabolic_weight', cluster: 'metabolic', label: 'Weight management goals', severity: 'INFO' },
  { key: 'metabolic_diabetes_risk', cluster: 'metabolic', label: 'Diabetes risk factors', severity: 'FLAG', doctorText: 'blood sugar levels and diabetes prevention' },
  { key: 'metabolic_prediabetes', cluster: 'metabolic', label: 'Prediabetes history', severity: 'URGENT', doctorText: 'blood sugar monitoring and diabetes prevention' },
  { key: 'metabolic_fatigue', cluster: 'metabolic', label: 'Persistent fatigue', severity: 'FLAG', doctorText: 'unexplained fatigue and potential metabolic causes' },
  { key: 'metabolic_thyroid', cluster: 'metabolic', label: 'Thyroid concerns', severity: 'FLAG', doctorText: 'thyroid function' },

  // Mental health
  { key: 'mental_anxiety', cluster: 'mental', label: 'Anxiety symptoms', severity: 'FLAG', doctorText: 'anxiety management strategies' },
  { key: 'mental_depression', cluster: 'mental', label: 'Depression symptoms', severity: 'FLAG', doctorText: 'mood and mental health support options' },
  { key: 'mental_stress', cluster: 'mental', label: 'High stress levels', severity: 'INFO' },
  { key: 'mental_burnout', cluster: 'mental', label: 'Burnout signs', severity: 'FLAG', doctorText: 'burnout symptoms and recovery strategies' },

  // Gut / digestive
  { key: 'gut_ibs', cluster: 'gut', label: 'IBS symptoms', severity: 'FLAG', doctorText: 'digestive symptoms and gut health' },
  { key: 'gut_reflux', cluster: 'gut', label: 'Acid reflux or heartburn', severity: 'FLAG', doctorText: 'acid reflux and GERD management' },
  { key: 'gut_bloating', cluster: 'gut', label: 'Chronic bloating', severity: 'INFO' },
  { key: 'gut_irregularity', cluster: 'gut', label: 'Bowel irregularity', severity: 'INFO' },

  // Musculoskeletal
  { key: 'msk_back_pain', cluster: 'musculoskeletal', label: 'Back or neck pain', severity: 'FLAG', doctorText: 'back or neck pain management' },
  { key: 'msk_joint_pain', cluster: 'musculoskeletal', label: 'Joint pain or stiffness', severity: 'FLAG', doctorText: 'joint pain and potential causes' },
  { key: 'msk_injury_recovery', cluster: 'musculoskeletal', label: 'Recovering from injury', severity: 'INFO' },

  // Respiratory
  { key: 'resp_asthma', cluster: 'respiratory', label: 'Asthma or breathing concerns', severity: 'FLAG', doctorText: 'asthma management or breathing symptoms' },
  { key: 'resp_allergies', cluster: 'respiratory', label: 'Seasonal allergies', severity: 'INFO' },
  { key: 'resp_shortness_breath', cluster: 'respiratory', label: 'Shortness of breath', severity: 'URGENT', doctorText: 'unexplained shortness of breath' },

  // Preventive care
  { key: 'preventive_no_pcp', cluster: 'preventive', label: 'No primary care physician', severity: 'FLAG', doctorText: 'establishing primary care and preventive screenings' },
  { key: 'preventive_screenings_overdue', cluster: 'preventive', label: 'Screenings overdue', severity: 'FLAG', doctorText: 'age-appropriate health screenings' },
  { key: 'preventive_vaccines_incomplete', cluster: 'preventive', label: 'Vaccine gaps', severity: 'INFO' },
  { key: 'preventive_annual_checkup', cluster: 'preventive', label: 'Irregular annual checkups', severity: 'INFO' },

  // Nutrition
  { key: 'nutrition_poor_diet', cluster: 'nutrition', label: 'Diet quality concerns', severity: 'INFO' },
  { key: 'nutrition_supplements', cluster: 'nutrition', label: 'Supplement questions', severity: 'INFO' },
  { key: 'nutrition_hydration', cluster: 'nutrition', label: 'Hydration concerns', severity: 'INFO' },

  // Exercise
  { key: 'exercise_sedentary', cluster: 'exercise', label: 'Sedentary lifestyle', severity: 'FLAG', doctorText: 'safe ways to increase physical activity' },
  { key: 'exercise_goals', cluster: 'exercise', label: 'Exercise goals', severity: 'INFO' },

  // Women's health
  { key: 'womens_hormones', cluster: 'womens_health', label: 'Hormonal health concerns', severity: 'FLAG', doctorText: 'hormonal changes and management options' },
  { key: 'womens_menstrual', cluster: 'womens_health', label: 'Menstrual irregularities', severity: 'FLAG', doctorText: 'menstrual cycle changes' },
  { key: 'womens_menopause', cluster: 'womens_health', label: 'Perimenopause or menopause symptoms', severity: 'FLAG', doctorText: 'menopause symptom management' },
  { key: 'womens_pregnancy', cluster: 'womens_health', label: 'Pregnancy planning or postpartum', severity: 'FLAG', doctorText: 'preconception or postpartum care' },

  // Men's health
  { key: 'mens_testosterone', cluster: 'mens_health', label: 'Testosterone or energy concerns', severity: 'FLAG', doctorText: 'testosterone levels and men\'s hormonal health' },
  { key: 'mens_prostate', cluster: 'mens_health', label: 'Prostate health', severity: 'FLAG', doctorText: 'prostate screening and men\'s preventive care' },
  { key: 'mens_sexual_health', cluster: 'mens_health', label: 'Sexual health concerns', severity: 'FLAG', doctorText: 'men\'s sexual health' },

  // Longevity
  { key: 'longevity_interest', cluster: 'longevity', label: 'Longevity and healthspan interest', severity: 'INFO' },
  { key: 'longevity_biomarkers', cluster: 'longevity', label: 'Biomarker tracking interest', severity: 'INFO' },

  // DPC interest
  { key: 'dpc_interest', cluster: 'dpc', label: 'Interested in DPC membership', severity: 'INFO' },
  { key: 'dpc_frustration_access', cluster: 'dpc', label: 'Frustrated with healthcare access', severity: 'INFO' },
  { key: 'dpc_frustration_cost', cluster: 'dpc', label: 'Frustrated with healthcare cost', severity: 'INFO' },
];

export const SIGNAL_MAP: Record<string, SignalDef> = Object.fromEntries(
  SIGNALS.map((s) => [s.key, s])
);
