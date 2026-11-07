/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

async function fixture() {
  const backend = convexTest(schema, modules);
  const records = await backend.run(async (ctx) => {
    const userA = await ctx.db.insert("users", {
      email: "a@example.com",
      name: "Account A",
    });
    const userB = await ctx.db.insert("users", {
      email: "b@example.com",
      name: "Account B",
    });
    const sessionA = await ctx.db.insert("authSessions", {
      userId: userA,
      expirationTime: Date.now() + 60000,
    });
    const sessionB = await ctx.db.insert("authSessions", {
      userId: userB,
      expirationTime: Date.now() + 60000,
    });
    return { userA, userB, sessionA, sessionB };
  });
  const identity = (userId: string, sessionId: string) =>
    backend.withIdentity({
      subject: `${userId}|${sessionId}`,
      issuer: "https://test.convex.site",
      tokenIdentifier: `https://test.convex.site|${userId}|${sessionId}`,
    });
  return { backend, ...records, identity };
}

describe("account authentication boundary", () => {
  it("rejects unauthenticated callers", async () => {
    const backend = convexTest(schema, modules);
    await expect(backend.mutation(api.account.current, {})).rejects.toThrow(
      "Authentication required",
    );
  });

  it("returns only the verified caller's minimal identity", async () => {
    const data = await fixture();
    expect(
      await data
        .identity(data.userA, data.sessionA)
        .mutation(api.account.current, {}),
    ).toEqual({ email: "a@example.com", name: "Account A" });
    expect(
      await data
        .identity(data.userB, data.sessionB)
        .mutation(api.account.current, {}),
    ).toEqual({ email: "b@example.com", name: "Account B" });
  });

  it("rejects client-supplied identity arguments rather than trusting them", async () => {
    const data = await fixture();
    await expect(
      data
        .identity(data.userA, data.sessionA)
        .mutation(api.account.current, { userId: data.userB } as never),
    ).rejects.toThrow();
  });

  it("rejects a session belonging to another user", async () => {
    const data = await fixture();
    await expect(
      data
        .identity(data.userA, data.sessionB)
        .mutation(api.account.current, {}),
    ).rejects.toThrow("Session is no longer available");
  });

  it("rejects revoked sessions even with a still-valid mocked JWT identity", async () => {
    const data = await fixture();
    await data.backend.run((ctx) =>
      ctx.db.delete("authSessions", data.sessionA),
    );
    await expect(
      data
        .identity(data.userA, data.sessionA)
        .mutation(api.account.current, {}),
    ).rejects.toThrow("Session is no longer available");
  });

  it("rejects expired sessions independently of client authentication state", async () => {
    const data = await fixture();
    await data.backend.run((ctx) =>
      ctx.db.patch("authSessions", data.sessionA, {
        expirationTime: Date.now() - 1,
      }),
    );
    await expect(
      data
        .identity(data.userA, data.sessionA)
        .mutation(api.account.current, {}),
    ).rejects.toThrow("Session is no longer available");
  });

  it("does not write account or application records when verifying identity", async () => {
    const data = await fixture();
    const before = await data.backend.run((ctx) =>
      ctx.db.get("users", data.userA),
    );
    await data
      .identity(data.userA, data.sessionA)
      .mutation(api.account.current, {});
    const after = await data.backend.run((ctx) =>
      ctx.db.get("users", data.userA),
    );
    expect(after).toEqual(before);
    expect(Object.keys(schema.tables).sort()).toEqual([
      "authAccounts",
      "authRateLimits",
      "authRefreshTokens",
      "authSessions",
      "authVerificationCodes",
      "authVerifiers",
      "users",
    ]);
  });
});
