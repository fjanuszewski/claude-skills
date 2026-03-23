import { awsLambdaRequestHandler } from "@trpc/server/adapters/aws-lambda";
import { appRouter } from "./app.router";

export type { AppRouter } from "./app.router";

export const handler = awsLambdaRequestHandler({
  router: appRouter,
  createContext: () => ({}),
});
