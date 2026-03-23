import { z } from "zod";
import { router, publicProcedure } from "./trpc";

export const appRouter = router({
  health: publicProcedure.query(() => ({
    status: "ok",
    timestamp: new Date().toISOString(),
  })),

  // Example mutation
  echo: publicProcedure
    .input(z.object({ message: z.string() }))
    .mutation(({ input }) => ({
      message: input.message,
    })),
});

export type AppRouter = typeof appRouter;
