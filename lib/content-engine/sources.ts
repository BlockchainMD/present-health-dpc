import Parser from 'rss-parser';
import { TopicSignal } from './types';
import { normalizeTitle, cleanTopicTitle } from './taxonomy';

const parser = new Parser();

const NEWS_QUERIES = [
    'primary care',
    'preventive health',
    'sleep health',
    'metabolic health',
    'mental health',
    'longevity science',
    'cardiovascular health',
    'gut health',
    'healthspan',
    'exercise science'
];

const PUBMED_QUERIES = [
    'primary care prevention',
    'sleep quality adults',
    'exercise adherence',
    'metabolic syndrome lifestyle',
    'hypertension lifestyle',
    'longevity biomarkers',
    'circadian rhythm health'
];

const TRIALS_QUERIES = [
    'sleep',
    'longevity',
    'metabolic',
    'blood pressure',
    'exercise',
    'mindfulness'
];

const CURATED_TOPICS = [
    // Lab tests & bloodwork
    'What does high ALT mean on a liver panel?',
    'What is a normal TSH level and when should you worry?',
    'How to read a basic metabolic panel',
    'What does low ferritin mean for energy levels?',
    'Why your doctor orders a CBC and what it shows',
    'What does high CRP indicate on a blood test?',
    'Understanding your A1C: what every number means',
    'What does a lipid panel actually measure?',
    'Why vitamin D deficiency is so common and how to test for it',
    'What does high creatinine mean for kidney health?',
    'When should you get a thyroid panel done?',
    'How to interpret your testosterone levels at any age',
    'What is homocysteine and why your doctor might test it',
    'Understanding DHEA-S levels and what they indicate',
    'What does a urinalysis reveal about your health?',
    'When to ask your doctor for an iron panel vs just ferritin',
    'What does a high white blood cell count mean?',
    'What is the difference between LDL and HDL cholesterol?',
    'What does a fasting glucose of 100-125 actually mean?',
    'How to prepare for a fasting blood draw',
    'What does low albumin mean on a comprehensive metabolic panel?',
    'Understanding inflammation markers: ESR vs CRP',
    'What is a cortisol blood test and when is it ordered?',
    'How often should adults get routine bloodwork?',
    'What does a high triglyceride level mean for your health?',

    // Symptoms & conditions
    'Why do I wake up tired after 8 hours of sleep?',
    'The 3 most common causes of unexplained fatigue',
    'How stress physically shows up in your body',
    'Why your hands and feet get cold easily',
    'What causes brain fog and how to address it',
    'How to know if your headaches are tension or migraine',
    'What causes night sweats in adults who are not sick?',
    'Why do I feel dizzy when I stand up too fast?',
    'What is the difference between a cold and the flu?',
    'When is lower back pain serious enough to see a doctor?',
    'What causes frequent urination that is not a UTI?',
    'How to tell the difference between anxiety and heart palpitations',
    'Why do I get bloated after every meal?',
    'What causes chronic dry skin even in humid climates?',
    'When should you be concerned about a new mole?',
    'What causes tinnitus and can it be treated?',
    'Why do I get muscle cramps at night?',
    'What does it mean when your eye twitches frequently?',
    'How to know if joint pain is arthritis or something else',
    'Why do I bruise so easily?',
    'What causes recurrent canker sores in adults?',
    'How to distinguish heartburn from acid reflux vs GERD',
    'What are the early warning signs of type 2 diabetes?',
    'When is shortness of breath during exercise a red flag?',
    'Why do I feel worse in the afternoon every day?',

    // DPC basics
    'What is direct primary care and how does it work?',
    'Is direct primary care worth it without insurance?',
    'How DPC membership is different from concierge medicine',
    'Can you use an HSA to pay for direct primary care?',
    'What services are typically included in a DPC membership?',
    'How telehealth DPC works for patients outside major cities',
    'What to look for when choosing a primary care physician',
    'Why continuity of care matters more than most people think',
    'How DPC handles specialist referrals and lab orders',
    'The real cost comparison: DPC vs insurance copays over a year',
    'What questions to ask when joining a DPC practice',
    'How direct primary care handles urgent care needs',
    'Can you still have insurance and use DPC membership?',
    'What makes a good doctor-patient relationship in primary care',
    'How DPC membership can save money for healthy adults',

    // Longevity & healthspan
    'The real impact of walking 30 minutes a day on longevity',
    'What does current longevity science say about sleep?',
    'How muscle mass affects lifespan after age 40',
    'What biomarkers do longevity researchers actually track?',
    'Is caloric restriction really linked to longer life?',
    'How VO2 max predicts longevity better than most other metrics',
    'What does grip strength reveal about overall health?',
    'The connection between social connection and lifespan',
    'How chronic stress shortens telomeres and healthspan',
    'What is the difference between lifespan and healthspan?',
    'How zone 2 cardio training affects long-term health',
    'What does a high resting heart rate indicate for longevity?',
    'The role of protein in preserving muscle after 50',
    'How sleep quality changes as you age and what to do about it',
    'What is biological age and can you actually measure it?',
    'Does intermittent fasting affect longevity markers?',
    'How sauna use is connected to cardiovascular health',
    'What the Blue Zones research actually shows about diet',
    'How alcohol consumption affects aging beyond liver health',
    'Why preventive care in your 30s matters more than people think',

    // Preventive care & screenings
    'What preventive screenings should adults get in their 30s?',
    'What to ask your doctor at an annual physical exam',
    'How often adults need a colonoscopy based on risk level',
    'When should you get a baseline EKG done?',
    'What is a DEXA scan and who should consider one?',
    'How to prepare for a skin cancer screening',
    'What does a preventive cardiology workup include?',
    'When should adults start getting blood pressure checks?',
    'What vaccines are recommended for adults over 30?',
    'How to find out your family health history and use it wisely',
    'What is a coronary calcium score and who needs one?',
    'When should women start mammography screening?',
    'How to talk to your doctor about mental health at a checkup',
    'What preventive labs are worth getting if you feel fine?',
    'Why annual bloodwork matters even when you feel healthy',
    'What does an echocardiogram screen for?',
    'How often adults should have their eyes examined',
    'When to get a sleep study referral from your primary care doctor',

    // Nutrition & diet
    'What a high-protein breakfast changes in your day',
    'The most overlooked nutrient for office workers',
    'Is sitting the new smoking? A practical guide',
    'How to lower blood pressure through diet without extreme restriction',
    'What does a Mediterranean diet actually include?',
    'How fiber affects blood sugar beyond digestion',
    'What is metabolic flexibility and how do you improve it?',
    'How processed food affects inflammation markers in adults',
    'What is the glycemic index and does it matter for non-diabetics?',
    'How to get enough magnesium from food alone',
    'What does omega-3 deficiency look like?',
    'Should you take a daily multivitamin?',
    'How to eat to support thyroid function',
    'What eating late at night actually does to your metabolism',
    'How to read a nutrition label without obsessing over every number',
    'What causes sugar cravings and how to reduce them',
    'Is a plant-based diet healthier than a mixed diet for most adults?',
    'How meal timing affects energy levels throughout the day',
    'What does intermittent fasting do to your blood sugar over time?',
    'How to reduce sodium intake without making food taste boring',
    'What the research says about coffee and cardiovascular health',
    'How to increase protein intake without eating more meat',
    'What foods naturally support liver detoxification?',
    'How to build sustainable eating habits vs short-term diets',
    'What does the evidence say about taking vitamin C supplements?',

    // Sleep
    'How alcohol affects sleep quality even in small amounts',
    'What is sleep apnea and how do you know if you have it?',
    'The best sleep temperature for deep sleep',
    'How blue light from screens actually affects melatonin',
    'What is sleep hygiene and which habits matter most?',
    'How to know if you need a sleep study ordered',
    'What causes waking up between 2 and 4am repeatedly?',
    'How chronic sleep deprivation affects blood sugar',
    'What is the difference between insomnia and poor sleep quality?',
    'How caffeine disrupts sleep hours after you drink it',
    'What does REM sleep do for memory and mood?',
    'How to reset your circadian rhythm after shift work',
    'Does melatonin supplementation actually work for insomnia?',
    'How sleep affects immune function and illness recovery',
    'What is the 90-minute sleep cycle and does it matter?',
    'How napping affects nighttime sleep quality',
    'What causes excessive daytime sleepiness in healthy adults?',
    'How weighted blankets affect anxiety and sleep quality',

    // Exercise & movement
    'How to build a sustainable exercise habit that lasts',
    'Should you track your heart rate during every workout?',
    'The difference between muscle soreness and a real injury',
    'Simple ways to improve post-workout recovery',
    'How much exercise per week is actually needed for health?',
    'What is zone 2 training and why coaches recommend it?',
    'How strength training benefits adults over 40 beyond aesthetics',
    'What is the best type of exercise for blood pressure?',
    'How sitting all day at work undoes exercise benefits',
    'What does research say about walking versus running for health?',
    'How to exercise safely when you are out of shape',
    'What is the recommended amount of mobility work per week?',
    'How exercise affects sleep quality and duration',
    'What is RPE and how to use it for workout intensity',
    'How to tell if you are overtraining',
    'What cardio does for mental health beyond weight loss',
    'How resistance training affects insulin sensitivity',
    'What is NEAT and why it matters more than gym time',
    'How long it takes to lose cardiovascular fitness after stopping',
    'Why stretching alone is not enough for flexibility',

    // Mental health
    'How to tell the difference between sadness and clinical depression',
    'What are the physical symptoms of anxiety in adults?',
    'How chronic stress affects cortisol and physical health',
    'What is the connection between gut health and mood?',
    'How to know when to see a therapist versus a psychiatrist',
    'What does burnout feel like and how to recover from it',
    'How exercise compares to antidepressants for mild depression',
    'What is cognitive behavioral therapy and what does it treat?',
    'How sleep deprivation affects mental health in adults',
    'What is the difference between generalized anxiety and panic attacks?',
    'How to talk to a doctor about mental health for the first time',
    'What lifestyle changes are evidence-based for anxiety relief?',
    'How alcohol worsens anxiety and depression over time',
    'What is the mental health impact of social media use in adults?',
    'How to build emotional resilience according to current research',

    // Medications & supplements
    'What are the most common drug-nutrient interactions adults should know?',
    'How to safely stop taking a medication you have been on for years',
    'What is the difference between brand name and generic medication?',
    'Should you take probiotics while on antibiotics?',
    'How long do antibiotics take to work for common infections?',
    'What is the risk of taking ibuprofen daily for pain?',
    'How to know if a supplement has quality third-party testing',
    'What is NAD+ supplementation and what does the evidence show?',
    'How magnesium glycinate differs from other magnesium forms',
    'What does creatine supplementation do beyond muscle building?',
    'When is it appropriate to take a statin vs trying lifestyle first?',
    'What is the evidence for ashwagandha for stress reduction?',
    'How long does it take for SSRIs to take effect?',
    'What supplements are worth taking for adults over 40?',
    'How to manage medication side effects without stopping treatment',
    'What are the real risks of long-term PPI use for acid reflux?',
    'How blood pressure medications differ by class and mechanism',
    'What is metformin and who is a candidate for it?',
    'How to store medications properly at home',
    'What is the difference between a statin and a fibrate?',

    // Women's health
    'What are perimenopause symptoms and when do they start?',
    'How to track your menstrual cycle for health insights',
    'What does a normal versus abnormal period look like?',
    'How hormonal birth control affects long-term fertility',
    'What is PCOS and how is it diagnosed and managed?',
    'How to know if your period pain is endometriosis',
    'What changes in vaginal health are normal with aging?',
    'How bone density changes after menopause and what helps',
    'What is the evidence for hormone replacement therapy today?',
    'How breast density affects mammography screening accuracy',
    'What does iron deficiency look like for women who menstruate?',
    'How pregnancy affects autoimmune conditions like thyroid disease',
    'What are common postpartum health issues beyond depression?',
    'How to support hormonal health in your 30s and 40s',
    'What annual health screenings are specific to women?',
    'How to prepare for a well-woman exam appointment',
    'What are the signs of ovarian cysts versus ovarian cancer?',

    // Men's health
    'What are early warning signs of low testosterone in men?',
    'How to talk to a doctor about erectile dysfunction',
    'When should men start prostate screenings?',
    'How cardiovascular disease risk differs for men versus women',
    'What is the connection between testosterone and metabolic health?',
    'How sleep apnea affects testosterone in men',
    'What does a men's health annual exam include?',
    'How to reduce your prostate cancer risk through lifestyle',
    'What causes hair loss in men and what can be done about it?',
    'How to approach fertility testing as a man',
    'What is BPH and when does it require treatment?',
    'How alcohol affects testosterone levels over time',

    // Gut health & digestion
    'What does "healthy gut" actually mean according to research?',
    'How the gut microbiome affects immune function',
    'What is the connection between gut health and skin?',
    'How to improve gut diversity through diet',
    'What is SIBO and how is it diagnosed?',
    'What causes irritable bowel syndrome and how is it managed?',
    'How fermented foods affect the gut microbiome',
    'What is leaky gut and what does the evidence say?',
    'How stress damages gut health over time',
    'What foods commonly cause bloating and how to identify your triggers',
    'How to know if digestive symptoms need a gastroenterology referral',
    'What is the difference between IBS and IBD?',
    'How antibiotic use affects gut microbiome long-term',
    'What does constipation tell you about your health?',
    'How bile affects digestion and what happens when it is disrupted',

    // Cardiovascular health
    'How to lower blood pressure without extreme diets',
    'What is the difference between a normal and high resting heart rate?',
    'How to know if your chest pain is cardiac in origin',
    'What causes heart palpitations in otherwise healthy adults?',
    'How atrial fibrillation is detected and managed',
    'What does a high LDL mean for someone without other risk factors?',
    'How to reduce your lifetime cardiovascular risk in your 30s',
    'What is arterial stiffness and can it be reversed?',
    'How sleep quality affects blood pressure',
    'What is the difference between a heart attack and cardiac arrest?',
    'How smoking affects cardiovascular health beyond lung damage',
    'What are the signs of peripheral arterial disease?',
    'How heart rate variability reflects overall health and stress',
    'What is the connection between oral health and heart disease?',
    'How to interpret a basic EKG result your doctor ordered',
];

export async function fetchTopicSignals(options?: {
    sources?: {
        trends?: boolean;
        news?: boolean;
        pubmed?: boolean;
        trials?: boolean;
        nih?: boolean;
        cdc?: boolean;
        curated?: boolean;
    };
    limit?: number;
}): Promise<TopicSignal[]> {
    const sources = options?.sources || {};
    const limit = options?.limit || 50;

    const includeTrends = sources.trends !== false;
    const includeNews = sources.news !== false;
    const includePubmed = sources.pubmed !== false;
    const includeTrials = sources.trials !== false;
    const includeNih = sources.nih !== false;
    const includeCdc = sources.cdc === true;
    const includeCurated = sources.curated !== false;

    const all: TopicSignal[] = [];

    if (includeTrends) {
        all.push(...await fetchGoogleTrends());
    }
    if (includeNews) {
        all.push(...await fetchGoogleNews(NEWS_QUERIES));
    }
    if (includePubmed) {
        all.push(...await fetchPubMed(PUBMED_QUERIES));
    }
    if (includeTrials) {
        all.push(...await fetchClinicalTrials(TRIALS_QUERIES));
    }
    if (includeNih) {
        all.push(...await fetchNihNews());
    }
    if (includeCdc) {
        all.push(...await fetchCdcNews());
    }
    if (includeCurated) {
        all.push(...fetchCuratedTopics());
    }

    const seen = new Set<string>();
    const deduped: TopicSignal[] = [];
    for (const item of all) {
        const key = normalizeTitle(item.title);
        if (!key || seen.has(key)) continue;
        seen.add(key);
        deduped.push(item);
        if (deduped.length >= limit) break;
    }

    return deduped;
}

async function fetchGoogleTrends(): Promise<TopicSignal[]> {
    try {
        const feed = await parser.parseURL('https://trends.google.com/trends/trendingsearches/daily/rss?geo=US');
        return feed.items.map(item => ({
            title: cleanTopicTitle(item.title || 'Untitled trend'),
            url: item.link || '',
            publishedAt: item.pubDate || new Date().toISOString(),
            source: 'Google Trends',
            kind: 'trend'
        }));
    } catch (error) {
        console.warn('Trends fetch failed', error);
        return [];
    }
}

async function fetchGoogleNews(queries: string[]): Promise<TopicSignal[]> {
    const results: TopicSignal[] = [];

    for (const query of queries) {
        try {
            const encodedQuery = encodeURIComponent(query);
            const feed = await parser.parseURL(`https://news.google.com/rss/search?q=${encodedQuery}&hl=en-US&gl=US&ceid=US:en`);
            feed.items.slice(0, 3).forEach(item => {
                const title = cleanTopicTitle(item.title || 'Untitled news');
                const url = item.link || '';
                if (isBlockedNewsSource(title, url)) return;
                results.push({
                    title,
                    url,
                    publishedAt: item.pubDate || new Date().toISOString(),
                    source: `Google News (${query})`,
                    kind: 'news'
                });
            });
        } catch (error) {
            console.warn('News fetch failed for', query, error);
        }
    }

    return results;
}

async function fetchPubMed(queries: string[]): Promise<TopicSignal[]> {
    const results: TopicSignal[] = [];

    for (const query of queries) {
        try {
            const encodedQuery = encodeURIComponent(query);
            const feed = await parser.parseURL(`https://pubmed.ncbi.nlm.nih.gov/?term=${encodedQuery}&format=rss`);
            feed.items.slice(0, 3).forEach(item => {
                results.push({
                    title: cleanTopicTitle(item.title || 'Untitled study'),
                    url: item.link || '',
                    publishedAt: item.pubDate || new Date().toISOString(),
                    source: `PubMed (${query})`,
                    kind: 'research'
                });
            });
        } catch (error) {
            console.warn('PubMed fetch failed for', query, error);
        }
    }

    return results;
}

async function fetchClinicalTrials(queries: string[]): Promise<TopicSignal[]> {
    const results: TopicSignal[] = [];

    for (const query of queries) {
        try {
            const encoded = encodeURIComponent(query);
            const url = `https://clinicaltrials.gov/api/v2/studies?query.term=${encoded}&pageSize=3&countTotal=false`;
            const response = await fetch(url);
            if (!response.ok) continue;
            const data = await response.json();
            const studies = data?.studies || [];
            for (const study of studies) {
                const title = study?.protocolSection?.identificationModule?.briefTitle;
                const nctId = study?.protocolSection?.identificationModule?.nctId;
                if (!title) continue;
                results.push({
                    title: cleanTopicTitle(title),
                    url: nctId ? `https://clinicaltrials.gov/study/${nctId}` : '',
                    publishedAt: new Date().toISOString(),
                    source: `ClinicalTrials.gov (${query})`,
                    kind: 'trial'
                });
            }
        } catch (error) {
            console.warn('ClinicalTrials fetch failed for', query, error);
        }
    }

    return results;
}

async function fetchNihNews(): Promise<TopicSignal[]> {
    try {
        const feed = await parser.parseURL('https://www.nih.gov/news-events/news-releases/rss.xml');
        return feed.items.slice(0, 5).map(item => ({
            title: cleanTopicTitle(item.title || 'NIH update'),
            url: item.link || '',
            publishedAt: item.pubDate || new Date().toISOString(),
            source: 'NIH News Releases',
            kind: 'news'
        }));
    } catch (error) {
        console.warn('NIH news fetch failed', error);
        return [];
    }
}

async function fetchCdcNews(): Promise<TopicSignal[]> {
    try {
        const feed = await parser.parseURL('https://tools.cdc.gov/api/v2/resources/media/403372.rss');
        return feed.items.slice(0, 5).map(item => ({
            title: cleanTopicTitle(item.title || 'CDC update'),
            url: item.link || '',
            publishedAt: item.pubDate || new Date().toISOString(),
            source: 'CDC Newsroom',
            kind: 'news'
        }));
    } catch (error) {
        console.warn('CDC news fetch failed', error);
        return [];
    }
}

function fetchCuratedTopics(): TopicSignal[] {
    return CURATED_TOPICS.map(topic => ({
        title: cleanTopicTitle(topic),
        url: '',
        publishedAt: new Date().toISOString(),
        source: 'Curated',
        kind: 'curated'
    }));
}

function isBlockedNewsSource(title: string, url: string): boolean {
    const combined = `${title} ${url}`.toLowerCase();
    const blocked = [
        'prnewswire',
        'pr newswire',
        'businesswire',
        'globenewswire',
        'prweb',
        'marketwatch',
        'seekingalpha',
        'investor'
    ];
    return blocked.some(term => combined.includes(term));
}
