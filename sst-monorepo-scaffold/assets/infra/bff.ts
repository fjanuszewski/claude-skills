export const bff = new sst.aws.Function("Bff", {
  handler: "packages/bff/src/index.handler",
  url: {
    cors: {
      allowOrigins: [
        $app.stage === "production"
          ? "https://{{DOMAIN}}"
          : $app.stage === "staging"
            ? "https://staging.{{DOMAIN}}"
            : "*",
      ],
      allowHeaders: ["content-type"],
      allowMethods: ["GET", "POST"],
    },
  },
  memory: "512 MB",
  timeout: "60 seconds",
  environment: {
    STAGE: $app.stage,
    // local = sst dev | staging = deploy --stage staging | production = deploy --stage production
    NODE_ENV: $app.stage === "production" ? "production" : "development",
  },
});
