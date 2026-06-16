import { router } from '../trpc';
import { timerRouter } from './timer';
import { soundRouter } from './sound';
import { userRouter } from './user';
import { noteRouter } from './note';

export const appRouter = router({
  timer: timerRouter,
  sound: soundRouter,
  user: userRouter,
  note: noteRouter,
});

export type AppRouter = typeof appRouter;
