/* eslint-disable no-console */
/**
 * LifeOS AI — Database seed (Phase 1).
 * Creates a demo user with preferences, a motivation baseline and a sample plan
 * so the Definition-of-Done flow (log in → view dashboard) works out of the box.
 *
 * Idempotent: safe to run repeatedly (uses upserts keyed on natural keys).
 */
import { PrismaClient, TaskCategory, TaskSize, EisenhowerQuadrant, TaskStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const DEMO_EMAIL = 'demo@lifeos.ai';
const DEMO_PASSWORD = 'Demo123!';

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: { passwordHash, displayName: 'Demo User' },
    create: {
      email: DEMO_EMAIL,
      passwordHash,
      displayName: 'Demo User',
      preferences: {
        create: {
          workdayStart: '09:00',
          workdayEnd: '18:00',
          timezone: 'UTC',
          reminderLeadMin: 15,
        },
      },
      motivation: {
        create: {
          totalXp: 120,
          level: 2,
          motivationScore: 78,
          currentStreak: 3,
          longestStreak: 5,
        },
      },
    },
    include: { preferences: true, motivation: true },
  });

  console.log(`Seeded user ${user.email} (id=${user.id})`);

  // Only seed a sample plan if the user has no tasks yet.
  const existingTasks = await prisma.task.count({ where: { userId: user.id } });
  if (existingTasks === 0) {
    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const plan = await prisma.dailyPlan.create({
      data: {
        userId: user.id,
        planDate: today,
        rawInput: 'Client meeting at 10am, finish presentation, gym in the evening, pick up medicines.',
        summary: 'A focused workday with one meeting, deep-work on the presentation, and evening errands.',
        hasConflicts: false,
      },
    });

    const at = (h: number, m = 0) => {
      const d = new Date(today);
      d.setUTCHours(h, m, 0, 0);
      return d;
    };

    await prisma.task.createMany({
      data: [
        {
          userId: user.id,
          planId: plan.id,
          title: 'Client meeting',
          category: TaskCategory.WORK,
          size: TaskSize.MEDIUM,
          urgency: 90,
          importance: 85,
          quadrant: EisenhowerQuadrant.URGENT_IMPORTANT,
          estimatedMinutes: 60,
          suggestedStart: at(10),
          suggestedEnd: at(11),
          status: TaskStatus.PLANNED,
          aiConfidence: 0.92,
          aiRecommendation: 'Review the agenda 10 minutes before the call.',
          source: 'ai_planner',
          xpValue: 25,
        },
        {
          userId: user.id,
          planId: plan.id,
          title: 'Complete presentation',
          category: TaskCategory.WORK,
          size: TaskSize.LARGE,
          urgency: 70,
          importance: 90,
          quadrant: EisenhowerQuadrant.IMPORTANT_NOT_URGENT,
          estimatedMinutes: 120,
          suggestedStart: at(11, 30),
          suggestedEnd: at(13, 30),
          status: TaskStatus.PLANNED,
          aiConfidence: 0.8,
          aiRecommendation: 'Block distraction-free time right after the meeting.',
          source: 'ai_planner',
          xpValue: 50,
        },
        {
          userId: user.id,
          planId: plan.id,
          title: 'Pick up medicines',
          category: TaskCategory.ERRANDS,
          size: TaskSize.SMALL,
          urgency: 60,
          importance: 55,
          quadrant: EisenhowerQuadrant.URGENT_NOT_IMPORTANT,
          estimatedMinutes: 20,
          suggestedStart: at(17),
          suggestedEnd: at(17, 20),
          status: TaskStatus.PLANNED,
          aiConfidence: 0.75,
          source: 'ai_planner',
          xpValue: 10,
        },
        {
          userId: user.id,
          planId: plan.id,
          title: 'Gym',
          category: TaskCategory.HEALTH,
          size: TaskSize.MEDIUM,
          urgency: 40,
          importance: 70,
          quadrant: EisenhowerQuadrant.IMPORTANT_NOT_URGENT,
          estimatedMinutes: 60,
          suggestedStart: at(18, 30),
          suggestedEnd: at(19, 30),
          status: TaskStatus.PLANNED,
          aiConfidence: 0.7,
          aiRecommendation: 'Hydrate and keep it light after a long workday.',
          source: 'ai_planner',
          xpValue: 25,
        },
      ],
    });

    console.log(`Seeded daily plan ${plan.id} with 4 tasks.`);
  }

  console.log('\nLogin with:');
  console.log(`  email:    ${DEMO_EMAIL}`);
  console.log(`  password: ${DEMO_PASSWORD}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
