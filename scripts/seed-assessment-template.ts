import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const result = await prisma.autoResponseTemplate.upsert({
    where: { source: 'ASSESSMENT_LEAD' },
    create: {
      source: 'ASSESSMENT_LEAD',
      enabled: true,
      delayMinutes: 0,
      subjectTemplate: 'Welcome to your personalized health insights',
      bodyTemplate: `Hi {{firstName}},

Welcome to your personalized health insights from Present Health.

You've already seen your full report — now we'll keep the insights coming. As we publish new articles matched to your health profile, we'll send them straight to your inbox.

Here's a recap of your assessment results:

{{summary}}

{{#if doctorFlags}}
Topics to consider discussing with your doctor:
{{doctorFlags}}
{{/if}}

{{#if recommendedSlugs}}
Articles we've matched to your profile:
{{recommendedSlugs}}
{{/if}}

Ready to experience healthcare that actually has time for you?

Present Health DPC offers:
- Same-day and next-day appointments
- Transparent flat-fee pricing — no surprise bills
- Direct physician access via text, phone, and video
- Telehealth-first, available in multiple states

Learn more at: https://presenthealthmd.com/join

To your health,
The Present Health Team

---
You signed up for personalized health insights at https://presenthealthmd.com. This is not medical advice. Please consult your physician before making any health decisions.
To unsubscribe, reply with "unsubscribe" in the subject line.`,
      followUpEnabled: true,
      followUpDelayHours: 72,
      followUpSubjectTemplate: 'Have you considered Direct Primary Care?',
      followUpBodyTemplate: `Hi {{firstName}},

We noticed you completed a health assessment with us a few days ago. We hope the personalized insights were helpful.

If you're looking for a primary care experience that actually has time for you, Present Health DPC might be exactly what you need.

With a Present Health membership, you get:
- Unlimited telehealth visits with your personal physician
- Same-day or next-day appointments — no waiting weeks
- Direct messaging with your doctor anytime
- Transparent monthly membership — no confusing copays or surprise bills
- Comprehensive preventive care tailored to your health goals

Based on your assessment, we think you'd particularly benefit from our approach to personalized, preventive primary care.

Book a free discovery call or join today at: https://presenthealthmd.com/join

To your health,
The Present Health Team

---
This is not medical advice.
To unsubscribe, reply with "unsubscribe" in the subject line.`,
    },
    update: {
      enabled: true,
    },
  });

  console.log('Assessment template seeded:', result.id);
}

main()
  .catch((err) => {
    console.error('Seed failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
