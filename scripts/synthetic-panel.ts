/**
 * Synthetic consumer panel — Semantic Similarity Rating (SSR)
 * Method: Maier et al. 2025, arXiv:2510.08338 ("LLMs Reproduce Human Purchase
 * Intent via Semantic Similarity Elicitation of Likert Ratings").
 *
 * Persona-conditioned LLM respondents react in free text to a marketing
 * concept; responses are embedded and scored against Likert anchor statements
 * via cosine similarity -> probability distribution over 1-5 purchase intent.
 *
 * USE FOR RANKING CONCEPTS ONLY. Per the paper: relative rankings reach
 * ~90% correlation attainment vs human panels; absolute rates are NOT
 * trustworthy (real conversion is measured by live experiments, e.g. EXP-001).
 *
 * Usage: npx tsx scripts/synthetic-panel.ts --config campaigns/message-test-001.json [--reps 3]
 */
import OpenAI from "openai";
import fs from "node:fs";
import path from "node:path";

type Concept = { id: string; headline: string; pitch: string; priceLine: string };
type Persona = { id: string; description: string };
type Config = { name: string; question: string; concepts: Concept[]; personas: Persona[] };

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const ANCHOR_SETS: string[][] = [
    [
        "I would definitely not sign up for this. It is not for me at all.",
        "I probably would not sign up for this.",
        "I might or might not sign up for this. I am not sure.",
        "I probably would sign up for this.",
        "I would definitely sign up for this. It is exactly what I need.",
    ],
    [
        "No chance I would pay for this service.",
        "I am unlikely to pay for this service.",
        "I am undecided about paying for this service.",
        "I am likely to pay for this service.",
        "I am certain I would pay for this service.",
    ],
];

const SOFTMAX_TAU = 0.03;

function cosine(a: number[], b: number[]) {
    let dot = 0, na = 0, nb = 0;
    for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i]; }
    return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

function softmax(xs: number[], tau: number) {
    const m = Math.max(...xs);
    const exps = xs.map((x) => Math.exp((x - m) / tau));
    const s = exps.reduce((p, c) => p + c, 0);
    return exps.map((e) => e / s);
}

async function embed(texts: string[]): Promise<number[][]> {
    const res = await openai.embeddings.create({ model: "text-embedding-3-small", input: texts });
    return res.data.map((d) => d.embedding);
}

async function elicit(persona: Persona, concept: Concept, question: string): Promise<string> {
    const res = await openai.chat.completions.create({
        model: "gpt-5.2",
        reasoning_effort: "low",
        messages: [
            {
                role: "system",
                content:
                    `You are roleplaying a specific, realistic consumer. Stay fully in character. ` +
                    `Respond as this person would in a market research survey: candid, first person, 2-4 sentences, ` +
                    `including hesitations or objections this person would genuinely have. Persona: ${persona.description}`,
            },
            {
                role: "user",
                content:
                    `You see this offer:\n\nHeadline: "${concept.headline}"\n${concept.pitch}\nPrice: ${concept.priceLine}\n\n${question}`,
            },
        ],
    });
    return res.choices[0]?.message?.content?.trim() || "";
}

async function main() {
    const args = process.argv.slice(2);
    const cfgPath = args[args.indexOf("--config") + 1];
    const reps = args.includes("--reps") ? parseInt(args[args.indexOf("--reps") + 1], 10) : 3;
    const cfg: Config = JSON.parse(fs.readFileSync(cfgPath, "utf8"));

    const anchorEmbeds: number[][][] = [];
    for (const set of ANCHOR_SETS) anchorEmbeds.push(await embed(set));

    type Row = { concept: string; persona: string; text: string; dist: number[]; mean: number };
    const rows: Row[] = [];
    const jobs: Array<() => Promise<void>> = [];

    for (const concept of cfg.concepts)
        for (const persona of cfg.personas)
            for (let r = 0; r < reps; r++)
                jobs.push(async () => {
                    const text = await elicit(persona, concept, cfg.question);
                    if (!text) return;
                    const [respEmbed] = await embed([text]);
                    // Average SSR distribution across anchor sets (paper: averaging mitigates anchor sensitivity)
                    const dist = [0, 0, 0, 0, 0];
                    for (const anchors of anchorEmbeds) {
                        const sims = anchors.map((a) => cosine(respEmbed, a));
                        const p = softmax(sims, SOFTMAX_TAU);
                        for (let i = 0; i < 5; i++) dist[i] += p[i] / anchorEmbeds.length;
                    }
                    const mean = dist.reduce((acc, p, i) => acc + p * (i + 1), 0);
                    rows.push({ concept: concept.id, persona: persona.id, text, dist, mean });
                });

    // Bounded concurrency
    const POOL = 8;
    let idx = 0;
    await Promise.all(
        Array.from({ length: POOL }, async () => {
            while (idx < jobs.length) {
                const j = jobs[idx++];
                try { await j(); } catch (e) { console.error("job failed:", (e as Error).message); }
            }
        })
    );

    // Aggregate per concept
    const byConcept = new Map<string, Row[]>();
    for (const row of rows) {
        if (!byConcept.has(row.concept)) byConcept.set(row.concept, []);
        byConcept.get(row.concept)!.push(row);
    }
    const summary = [...byConcept.entries()]
        .map(([id, rs]) => {
            const mean = rs.reduce((a, r) => a + r.mean, 0) / rs.length;
            const top2 = rs.reduce((a, r) => a + r.dist[3] + r.dist[4], 0) / rs.length;
            return { concept: id, n: rs.length, meanPI: +mean.toFixed(3), top2box: +(top2 * 100).toFixed(1) };
        })
        .sort((a, b) => b.meanPI - a.meanPI);

    const outDir = path.join(path.dirname(cfgPath), "results");
    fs.mkdirSync(outDir, { recursive: true });
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    fs.writeFileSync(path.join(outDir, `${cfg.name}-${stamp}.json`), JSON.stringify({ summary, rows }, null, 2));

    console.log(`\n=== ${cfg.name} — ranked by synthetic purchase intent (n=${rows.length} responses) ===`);
    console.table(summary);
    console.log("REMINDER: rankings are the signal; absolute rates are not validated (arXiv:2510.08338).");
}

main().catch((e) => { console.error(e); process.exit(1); });
