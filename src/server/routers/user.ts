import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';

export const userRouter = router({
  profile: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.user.findUnique({
      where: { id: ctx.userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
        _count: {
          select: {
            timerSessions: true,
            soundMixes: true,
          },
        },
      },
    });
  }),

  updateProfile: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100).optional(),
        image: z.string().url().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.user.update({
        where: { id: ctx.userId },
        data: {
          ...(input.name !== undefined && { name: input.name }),
          ...(input.image !== undefined && { image: input.image }),
        },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          updatedAt: true,
        },
      });
    }),
});
