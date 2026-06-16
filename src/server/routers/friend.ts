import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';

export const friendRouter = router({
  search: protectedProcedure
    .input(z.object({ email: z.string().email() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.prisma.user.findUnique({
        where: { email: input.email },
        select: { id: true, name: true, email: true, image: true },
      });
      if (!user || user.id === ctx.userId) return null;
      const existing = await ctx.prisma.friendship.findFirst({
        where: {
          OR: [
            { userId: ctx.userId, friendId: user.id },
            { userId: user.id, friendId: ctx.userId },
          ],
        },
      });
      return { ...user, friendshipStatus: existing?.status ?? null, friendshipInitiator: existing?.userId ?? null };
    }),

  sendRequest: protectedProcedure
    .input(z.object({ friendId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      if (input.friendId === ctx.userId) throw new TRPCError({ code: 'BAD_REQUEST' });
      const existing = await ctx.prisma.friendship.findFirst({
        where: {
          OR: [
            { userId: ctx.userId, friendId: input.friendId },
            { userId: input.friendId, friendId: ctx.userId },
          ],
        },
      });
      if (existing) throw new TRPCError({ code: 'CONFLICT', message: 'Request already exists' });
      return ctx.prisma.friendship.create({
        data: { userId: ctx.userId, friendId: input.friendId },
      });
    }),

  accept: protectedProcedure
    .input(z.object({ friendshipId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const f = await ctx.prisma.friendship.findUnique({ where: { id: input.friendshipId } });
      if (!f || f.friendId !== ctx.userId) throw new TRPCError({ code: 'FORBIDDEN' });
      return ctx.prisma.friendship.update({
        where: { id: input.friendshipId },
        data: { status: 'accepted' },
      });
    }),

  decline: protectedProcedure
    .input(z.object({ friendshipId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const f = await ctx.prisma.friendship.findUnique({ where: { id: input.friendshipId } });
      if (!f || (f.friendId !== ctx.userId && f.userId !== ctx.userId)) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }
      return ctx.prisma.friendship.delete({ where: { id: input.friendshipId } });
    }),

  pendingRequests: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.friendship.findMany({
      where: { friendId: ctx.userId, status: 'pending' },
      include: { user: { select: { id: true, name: true, email: true, image: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }),
});
