import { router, protectedProcedure } from '../trpc';

export const leaderboardRouter = router({
  global: protectedProcedure.query(async ({ ctx }) => {
    const rows = await ctx.prisma.timerSession.groupBy({
      by: ['userId'],
      _sum: { totalFocusSec: true },
      _count: true,
      orderBy: { _sum: { totalFocusSec: 'desc' } },
      take: 20,
    });

    const userIds = rows.map((r) => r.userId);
    const users = await ctx.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, image: true },
    });
    const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

    return rows.map((r, i) => ({
      rank: i + 1,
      userId: r.userId,
      name: userMap[r.userId]?.name ?? 'Anonymous',
      image: userMap[r.userId]?.image ?? null,
      totalSec: r._sum.totalFocusSec ?? 0,
      sessions: r._count,
      isMe: r.userId === ctx.userId,
    }));
  }),

  friends: protectedProcedure.query(async ({ ctx }) => {
    const friendships = await ctx.prisma.friendship.findMany({
      where: {
        OR: [
          { userId: ctx.userId, status: 'accepted' },
          { friendId: ctx.userId, status: 'accepted' },
        ],
      },
      select: { userId: true, friendId: true },
    });

    const friendIds = friendships.map((f) =>
      f.userId === ctx.userId ? f.friendId : f.userId
    );
    const participantIds = [ctx.userId, ...friendIds];

    if (participantIds.length === 0) return [];

    const rows = await ctx.prisma.timerSession.groupBy({
      by: ['userId'],
      where: { userId: { in: participantIds } },
      _sum: { totalFocusSec: true },
      _count: true,
      orderBy: { _sum: { totalFocusSec: 'desc' } },
    });

    const userIds = rows.map((r) => r.userId);
    const users = await ctx.prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, image: true },
    });
    const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

    return rows.map((r, i) => ({
      rank: i + 1,
      userId: r.userId,
      name: userMap[r.userId]?.name ?? 'Anonymous',
      image: userMap[r.userId]?.image ?? null,
      totalSec: r._sum.totalFocusSec ?? 0,
      sessions: r._count,
      isMe: r.userId === ctx.userId,
    }));
  }),
});
