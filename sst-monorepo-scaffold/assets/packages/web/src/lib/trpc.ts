import { createTRPCClient, httpBatchLink } from "@trpc/client";
import type { AppRouter } from "{{ORG_SCOPE}}/bff";

export const trpc = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${import.meta.env.VITE_API_URL}/trpc`,
    }),
  ],
});
