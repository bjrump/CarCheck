import type { UserIdentity } from "convex/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";

/** Keep vehicle ownership stable when a verified account moves between Clerk instances. */
export async function vehicleOwner(
  ctx: QueryCtx | MutationCtx,
  identity: UserIdentity,
) {
  const alias = await ctx.db
    .query("ownerAliases")
    .withIndex("by_identity", (q) => q.eq("identity", identity.tokenIdentifier))
    .unique();
  return alias?.owner ?? identity.tokenIdentifier;
}
