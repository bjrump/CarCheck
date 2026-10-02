"use client";

import { ReactNode, useState } from "react";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ClerkProvider, useAuth } from "@clerk/nextjs";
import { deDE } from "@clerk/localizations";

interface ConvexClientProviderProps {
  children: ReactNode;
}

export default function ConvexClientProvider({
  children,
}: ConvexClientProviderProps) {
  const [convex] = useState(
    () => new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!),
  );
  return (
    <ClerkProvider
      publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!}
      localization={deDE}
      appearance={{
        variables: {
          colorPrimary: "var(--primary)",
          colorPrimaryForeground: "var(--primary-foreground)",
          colorBackground: "var(--background)",
          colorForeground: "var(--foreground)",
          colorNeutral: "var(--foreground)",
          colorMutedForeground: "var(--muted-foreground)",
          colorInput: "var(--card)",
          colorInputForeground: "var(--foreground)",
          colorBorder: "var(--border)",
          borderRadius: "0.375rem",
        },
      }}
    >
      <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
