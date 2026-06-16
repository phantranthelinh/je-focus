import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';

export const noteRouter = router({
  save: protectedProcedure
    .input(z.object({ content: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.prisma.textNote.upsert({
        where: { userId: ctx.userId },
        create: { userId: ctx.userId, content: input.content },
        update: { content: input.content },
      });
    }),

  get: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.textNote.findUnique({ where: { userId: ctx.userId } });
  }),
});
