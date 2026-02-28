/**
 * AI featured image generation for the content engine.
 *
 * Uses OpenAI DALL-E 3 (already installed) to generate a 1200×628px
 * health-appropriate photograph for each article.  The image is:
 *   1. Generated as base64 (no expiring URL)
 *   2. Resized / converted to WebP via sharp (already installed)
 *   3. Uploaded to Google Cloud Storage for permanent hosting
 *
 * Configuration (environment variables):
 *   GCS_IMAGE_BUCKET   — GCS bucket name (e.g. "presenthealth-media")
 *                        If unset, image generation is skipped gracefully.
 *   OPENAI_API_KEY     — Already required by the broader project
 *
 * On Cloud Run, the service account token is fetched automatically from the
 * GCP metadata server — no extra credentials file needed.
 */

import OpenAI from 'openai';
import sharp from 'sharp';

// Lazy-initialise the client so the module loads even without a key.
let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI {
    if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    return _openai;
}

// Cluster → photography brief that steers DALL-E toward safe, relevant imagery.
// All prompts deliberately avoid faces, text, and medical instruments to keep
// images appropriate and pass Google's health content quality guidelines.
const CLUSTER_THEMES: Record<string, string> = {
    sleep: 'a serene, sunlit bedroom with soft linen bedding, indoor plants, and golden morning light streaming through a window',
    metabolic: 'a vibrant spread of colorful vegetables, legumes, whole grains, and citrus on a rustic wooden table',
    cardiovascular: 'a person walking along a tree-lined park path at sunrise, heart health and movement',
    mental: 'a tranquil meditation corner with a small succulent, candle, soft cushions, and natural light',
    gut: 'a variety of fermented foods — kimchi, yogurt, kefir — alongside fresh fiber-rich vegetables on a kitchen counter',
    longevity: 'an active older adult gardening outdoors in bright daylight, vitality and well-being',
    exercise: 'yoga mat, resistance bands, and a water bottle arranged on a wood floor near a sunny window',
    nutrition: 'a balanced home-cooked meal with salmon, leafy greens, quinoa, and lemon on a clean plate',
    preventive: 'a warm, modern clinic waiting room with plants, natural light, and comfortable chairs',
    dpc: 'a telehealth setup showing a laptop on a clean desk with a stethoscope and a cup of tea beside it',
    womens_health: 'a woman doing light stretching in a sunlit room, wellness and vitality',
    mens_health: 'a man doing bodyweight exercises outdoors in a park on a clear morning',
    respiratory: 'open windows with fresh air, green outdoor views, and an inhaler-free desk space',
    endocrine: 'a colorful assortment of whole foods — nuts, leafy greens, seeds — known to support hormone health',
    dermatology: 'skin care routine items — gentle cleanser, SPF moisturizer, aloe vera plant — on a bathroom counter',
    musculoskeletal: 'foam roller and yoga blocks on a hardwood floor beside a stretch mat, recovery theme',
    neurology: 'a calm reading nook with books, a plant, soft lamp light, and a mug of herbal tea',
    immunology: 'fresh citrus, ginger, turmeric, and green vegetables on a bright white kitchen surface',
    pediatrics: 'a bright, clean play area with wooden toys and a child\'s height chart on a pastel wall',
    default: 'a bright, clean, modern home health space with plants, natural light, and minimalist wellness items',
};

function buildImagePrompt(title: string, cluster: string): string {
    const theme = CLUSTER_THEMES[cluster] || CLUSTER_THEMES.default;
    return (
        `A professional lifestyle health photograph for a medical wellness article titled "${title}". ` +
        `Scene: ${theme}. ` +
        `Style: photorealistic, warm and optimistic, editorial quality, 16:9 composition. ` +
        `Rules: absolutely no people\'s faces visible, no text or words, no medical devices or syringes, ` +
        `no prescription bottles, no distressing imagery. ` +
        `The image must feel credible, approachable, and suitable for a primary care health website.`
    );
}

/**
 * Generate a featured image for an article.
 *
 * Returns a permanent GCS URL on success, or null if generation/upload fails.
 * Failures are logged as warnings so the engine continues without an image
 * rather than failing the entire article creation.
 */
export async function generateFeaturedImage(params: {
    title: string;
    cluster: string;
    riskLevel: string;
    articleId?: string;
}): Promise<string | null> {
    // Skip for HIGH risk — these require human review anyway.
    if (params.riskLevel === 'HIGH') return null;

    // Skip if no bucket configured — fail gracefully.
    const bucket = process.env.GCS_IMAGE_BUCKET;
    if (!bucket) {
        return null;
    }

    const openai = getOpenAI();
    if (!process.env.OPENAI_API_KEY) return null;

    const prompt = buildImagePrompt(params.title, params.cluster);

    try {
        const response = await openai.images.generate({
            model: 'dall-e-3',
            prompt,
            n: 1,
            size: '1792x1024',  // closest 16:9 that DALL-E 3 supports
            quality: 'standard',
            response_format: 'b64_json',
        });

        const b64 = response.data?.[0]?.b64_json;
        if (!b64) {
            console.warn('[image] DALL-E returned no image data');
            return null;
        }

        const rawBuffer = Buffer.from(b64, 'base64');

        // Resize to the standard OG/Google Discover size and convert to WebP.
        const optimized = await sharp(rawBuffer)
            .resize(1200, 628, { fit: 'cover', position: 'centre' })
            .webp({ quality: 82 })
            .toBuffer();

        const suffix = params.articleId
            ? `article-${params.articleId}`
            : `article-${Date.now().toString(36)}`;
        const filename = `articles/${suffix}-${Date.now().toString(36)}.webp`;

        const gcsUrl = await uploadToGcs(optimized, filename, bucket);
        return gcsUrl;
    } catch (error: any) {
        console.warn('[image] Image generation failed:', error?.message || error);
        return null;
    }
}

async function uploadToGcs(
    buffer: Buffer,
    objectName: string,
    bucket: string
): Promise<string | null> {
    try {
        // On Cloud Run the metadata server provides a short-lived access token
        // for the service account — no SDK or credentials file required.
        const tokenRes = await fetch(
            'http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token',
            {
                headers: { 'Metadata-Flavor': 'Google' },
                signal: AbortSignal.timeout(3000),
            }
        );

        if (!tokenRes.ok) {
            console.warn('[image] GCS token fetch failed:', tokenRes.status);
            return null;
        }

        const { access_token } = await tokenRes.json() as { access_token: string };

        const uploadUrl = `https://storage.googleapis.com/upload/storage/v1/b/${encodeURIComponent(bucket)}/o?uploadType=media&name=${encodeURIComponent(objectName)}`;

        const uploadRes = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${access_token}`,
                'Content-Type': 'image/webp',
                'Content-Length': String(buffer.length),
            },
            // Node.js Buffer is accepted by fetch at runtime; cast to satisfy TS.
            body: buffer as unknown as BodyInit,
        });

        if (!uploadRes.ok) {
            const body = await uploadRes.text().catch(() => '');
            console.warn('[image] GCS upload failed:', uploadRes.status, body.slice(0, 200));
            return null;
        }

        // Return the public URL.  The bucket must have public read access or
        // use a signed URL strategy — for simplicity we use the public URL.
        return `https://storage.googleapis.com/${bucket}/${objectName}`;
    } catch (error: any) {
        console.warn('[image] GCS upload error:', error?.message || error);
        return null;
    }
}
