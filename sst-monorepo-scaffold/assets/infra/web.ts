import { bff } from "./bff";

export const web = new sst.aws.StaticSite("Web", {
  path: "packages/web",
  build: {
    command: "npm run build",
    output: "dist",
  },
  dev: {
    url: "http://localhost:3000",
    command: "npx vite --port 3000",
  },
  environment: {
    VITE_API_URL: bff.url,
  },
  domain:
    $app.stage === "production"
      ? {
          name: "{{DOMAIN}}",
          dns: sst.aws.dns(),
        }
      : $dev
        ? undefined
        : {
            name: `${$app.stage}.{{DOMAIN}}`,
            dns: sst.aws.dns(),
          },
});
