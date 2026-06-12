import { z } from 'zod';
import { router, protectedProcedure } from '../trpc';
import { TRPCError } from '@trpc/server';

const soundChannelSchema = z.object({
  soundKey: z.string(),
  volume: z.number().min(0).max(1),
  enabled: z.boolean(),
});

export const soundRouter = router({
  saveMix: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(80),
        channels: z.array(soundChannelSchema).min(1),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.prisma.soundMix.create({
        data: {
          userId: ctx.userId,
          name: input.name,
          channels: {
            create: input.channels,
          },
        },
        include: { channels: true },
      });
    }),

  getMixes: protectedProcedure.query(async ({ ctx }) => {
    return ctx.prisma.soundMix.findMany({
      where: { userId: ctx.userId },
      orderBy: { createdAt: 'desc' },
      include: { channels: true },
    });
  }),

  deleteMix: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const mix = await ctx.prisma.soundMix.findUnique({
        where: { id: input.id },
        select: { userId: true },
      });

      if (!mix) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Mix not found' });
      }

      if (mix.userId !== ctx.userId) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      await ctx.prisma.soundMix.delete({ where: { id: input.id } });
      return { success: true };
    }),

  setDefault: protectedProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const userId = ctx.userId;

      const mix = await ctx.prisma.soundMix.findUnique({
        where: { id: input.id },
        select: { userId: true },
      });

      if (!mix) {
        throw new TRPCError({ code: 'NOT_FOUND', message: 'Mix not found' });
      }

      if (mix.userId !== userId) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      await ctx.prisma.$transaction([
        ctx.prisma.soundMix.updateMany({
          where: { userId, isDefault: true },
          data: { isDefault: false },
        }),
        ctx.prisma.soundMix.update({
          where: { id: input.id },
          data: { isDefault: true },
        }),
      ]);

      return { success: true };
    }),
});
