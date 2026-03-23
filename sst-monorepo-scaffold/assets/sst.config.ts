/// <reference path="./.sst/platform/config.d.ts" />

// Stages:
//   local      → npx sst dev
//   staging    → npx sst deploy --stage staging
//   production → npx sst deploy --stage production

export default $config({
  app(input) {
    return {
      name: "{{PROJECT_NAME}}",
      removal: input?.stage === "production" ? "retain" : "remove",
      protect: input?.stage === "production",
      home: "aws",
      providers: {
        aws: {
          profile: "{{AWS_PROFILE}}",
          region: "{{AWS_REGION}}",
        },
      },
    };
  },
  async run() {
    const { bff } = await import("./infra/bff");

    return {
      apiUrl: bff.url,
    };
  },
});
