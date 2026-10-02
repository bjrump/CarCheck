import { AuthConfig } from "convex/server";

export default {
  providers: [
    {
      domain: process.env.CLERK_JWT_ISSUER_DOMAIN!,
      applicationID: "convex",
    },
    ...(process.env.CLERK_LEGACY_ISSUER_DOMAIN
      ? [
          {
            domain: process.env.CLERK_LEGACY_ISSUER_DOMAIN,
            applicationID: "convex",
          },
        ]
      : []),
  ],
} satisfies AuthConfig;
