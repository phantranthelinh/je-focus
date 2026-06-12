import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';

export const timerRouter = router({
  complete: protectedProcedure
    .input(
      z.object({
        preset: z.string(),
        focusMin: z.number().int().positive(),
        breakMin: z.number().int().nonnegative(),
        rounds: z.number().int().positive(),
        totalFocusSec: z.number().int().positive(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.timerSession.create({
        data: {
          userId: ctx.userId,
          preset: input.preset,
          focusMin: input.focusMin,
          breakMin: input.breakMin,
          rounds: input.rounds,
          totalFocusSec: input.totalFocusSec,
        },
      });
    }),

  history: protectedProcedure
    .input(
      z.object({
        cursor: z.string().optional(),
        limit: z.number().int().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      const items = await ctx.prisma.timerSession.findMany({
        where: { userId: ctx.userId },
        orderBy: { completedAt: 'desc' },
        take: input.limit + 1,
        ...(input.cursor ? { cursor: { id: input.cursor }, skip: 1 } : {}),
      });

      let nextCursor: string | undefined;
      if (items.length > input.limit) {
        const next = items.pop();
        nextCursor = next?.id;
      }

      return { items, nextCursor };
    }),

  stats: protectedProcedure.query(async ({ ctx }) => {
    const userId = ctx.userId;
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = new Date(startOfDay);
    startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const [today, week, month, total] = await Promise.all([
      ctx.prisma.timerSession.aggregate({
        where: { userId, completedAt: { gte: startOfDay } },
        _sum: { totalFocusSec: true },
        _count: true,
      }),
      ctx.prisma.timerSession.aggregate({
        where: { userId, completedAt: { gte: startOfWeek } },
        _sum: { totalFocusSec: true },
        _count: true,
      }),
      ctx.prisma.timerSession.aggregate({
        where: { userId, completedAt: { gte: startOfMonth } },
        _sum: { totalFocusSec: true },
        _count: true,
      }),
      ctx.prisma.timerSession.aggregate({
        where: { userId },
        _sum: { totalFocusSec: true },
        _count: true,
      }),
    ]);

    const recentSessions = await ctx.prisma.timerSession.findMany({
      where: { userId },
      orderBy: { completedAt: 'desc' },
      select: { completedAt: true },
      take: 365,
    });

    let streak = 0;
    const checkDate = new Date(startOfDay);

    while (true) {
      const dayStart = new Date(checkDate);
      const dayEnd = new Date(checkDate);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const hasSession = recentSessions.some(
        (s) => s.completedAt >= dayStart && s.completedAt < dayEnd
      );

      if (!hasSession) break;
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    return {
      today: { sessions: today._count, totalSec: today._sum.totalFocusSec ?? 0 },
      week: { sessions: week._count, totalSec: week._sum.totalFocusSec ?? 0 },
      month: { sessions: month._count, totalSec: month._sum.totalFocusSec ?? 0 },
      total: { sessions: total._count, totalSec: total._sum.totalFocusSec ?? 0 },
      streak,
    };
  }),

  dailyChart: protectedProcedure
    .input(z.object({ days: z.number().int().min(1).max(90).default(7) }))
    .query(async ({ ctx, input }) => {
      const userId = ctx.userId;
      const now = new Date();
      const result: Array<{ date: string; sessions: number; totalSec: number }> = [];

      for (let i = input.days - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i);
        const dayStart = new Date(d);
        const dayEnd = new Date(d);
        dayEnd.setDate(dayEnd.getDate() + 1);

        const agg = await ctx.prisma.timerSession.aggregate({
          where: { userId, completedAt: { gte: dayStart, lt: dayEnd } },
          _sum: { totalFocusSec: true },
          _count: true,
        });

        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');

        result.push({
          date: `${y}-${m}-${day}`,
          sessions: agg._count,
          totalSec: agg._sum.totalFocusSec ?? 0,
        });
      }

      return result;
    }),
});
