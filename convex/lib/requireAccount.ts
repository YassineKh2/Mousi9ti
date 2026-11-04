import { getAuthSessionId, getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError } from "convex/values";
import type { MutationCtx } from "../_generated/server";

export async function requireAccount(ctx: MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  const userId = await getAuthUserId(ctx);
  const sessionId = await getAuthSessionId(ctx);
  if (!identity || !userId || !sessionId) {
    throw new ConvexError("Authentication required");
  }
  const session = await ctx.db.get("authSessions", sessionId);
  if (
    !session ||
    session.userId !== userId ||
    session.expirationTime <= Date.now()
  ) {
    throw new ConvexError("Session is no longer available");
  }
  const user = await ctx.db.get("users", userId);
  if (!user) throw new ConvexError("Account is no longer available");
  return {
    ownerId: user._id,
    tokenIdentifier: identity.tokenIdentifier,
    user,
    session,
  };
}
