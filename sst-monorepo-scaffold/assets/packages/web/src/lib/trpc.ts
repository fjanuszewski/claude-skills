import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "{{ORG_SCOPE}}/bff";

export const trpc = createTRPCReact<AppRouter>();
