import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireAccount } from "./lib/requireAccount";

export const current = mutation({
  args: {},
  returns: v.object({
    email: v.union(v.string(), v.null()),
    name: v.union(v.string(), v.null()),
  }),
  handler: async (ctx) => {
    const { user } = await requireAccount(ctx);
    return { email: user.email ?? null, name: user.name ?? null };
  },
});
