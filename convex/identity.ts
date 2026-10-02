import { ConvexError, v } from "convex/values";
import { internal } from "./_generated/api";
import { action, internalMutation, internalQuery } from "./_generated/server";

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export const findAlias = internalQuery({
  args: { identity: v.string() },
  handler: (ctx, args) =>
    ctx.db
      .query("ownerAliases")
      .withIndex("by_identity", (q) => q.eq("identity", args.identity))
      .unique(),
});

export const bindOwner = internalMutation({
  args: { identity: v.string(), owner: v.string() },
  handler: async (ctx, args) => {
    const current = await ctx.db
      .query("ownerAliases")
      .withIndex("by_identity", (q) => q.eq("identity", args.identity))
      .unique();
    if (current) {
      if (current.owner !== args.owner)
        throw new Error("Conflicting ownership mapping");
      return;
    }
    const claimed = await ctx.db
      .query("ownerAliases")
      .withIndex("by_owner", (q) => q.eq("owner", args.owner))
      .unique();
    if (claimed) throw new Error("Legacy owner already assigned");
    const newCars = await ctx.db
      .query("cars")
      .withIndex("by_user", (q) => q.eq("userId", args.identity))
      .collect();
    for (const car of newCars)
      await ctx.db.patch(car._id, { userId: args.owner });
    await ctx.db.insert("ownerAliases", args);
  },
});

/** Only Clerk's server API can attest the Google account behind the new session. */
export const prepare = action({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Nicht authentifiziert");
    if (identity.issuer !== process.env.CLERK_JWT_ISSUER_DOMAIN) return;
    const mapping: unknown = JSON.parse(
      process.env.CLERK_LEGACY_GOOGLE_OWNERS ?? "{}",
    );
    if (!record(mapping)) throw new Error("Invalid legacy owner configuration");
    if (!Object.keys(mapping).length) return;
    const alias = await ctx.runQuery(internal.identity.findAlias, {
      identity: identity.tokenIdentifier,
    });
    if (alias) return;
    const secret = process.env.CLERK_SECRET_KEY;
    if (!secret) throw new Error("Clerk server credentials missing");
    const signal = AbortSignal.timeout(10_000);
    const response = await fetch(
      `https://api.clerk.com/v1/users/${encodeURIComponent(identity.subject)}`,
      {
        headers: { Authorization: `Bearer ${secret}` },
        signal,
      },
    ).catch((error: unknown) => {
      if (signal.aborted) return null;
      throw error;
    });
    if (!response?.ok)
      throw new ConvexError(
        "Dein Konto konnte nicht geprüft werden. Bitte versuche es erneut.",
      );
    const user: unknown = await response.json();
    if (
      !record(user) ||
      user.id !== identity.subject ||
      !Array.isArray(user.external_accounts)
    ) {
      throw new Error("Invalid Clerk user response");
    }
    const owners = new Set<string>();
    for (const account of user.external_accounts) {
      if (
        !record(account) ||
        account.provider !== "oauth_google" ||
        typeof account.provider_user_id !== "string" ||
        !record(account.verification) ||
        account.verification.status !== "verified"
      )
        continue;
      const googleId = account.provider_user_id;
      if (!Object.prototype.hasOwnProperty.call(mapping, googleId)) continue;
      const owner = mapping[googleId];
      if (typeof owner !== "string" || !owner)
        throw new Error("Invalid legacy owner mapping");
      owners.add(owner);
    }
    if (owners.size > 1) throw new Error("Ambiguous legacy ownership");
    const owner = owners.values().next().value;
    if (owner) {
      const separator = owner.indexOf("|");
      const ownerIssuer = owner.slice(0, separator);
      const ownerSubject = owner.slice(separator + 1);
      if (
        separator <= 0 ||
        !ownerSubject ||
        ownerSubject.includes("|") ||
        ownerIssuer === identity.issuer ||
        ownerIssuer !== process.env.CLERK_LEGACY_ISSUER_DOMAIN
      )
        throw new Error("Invalid legacy owner mapping");
      await ctx.runMutation(internal.identity.bindOwner, {
        identity: identity.tokenIdentifier,
        owner,
      });
    }
  },
});
