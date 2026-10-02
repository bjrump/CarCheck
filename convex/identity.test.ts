import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");
const issuer = "https://clerk.example.com";
const legacyOwner = "https://old.clerk.accounts.dev|old-user";
const carInput = {
  make: "VW",
  model: "Golf",
  year: 2020,
  mileage: 50000,
  insurance: null,
};

async function fixture() {
  const t = convexTest(schema, modules);
  const legacy = t.withIdentity({ tokenIdentifier: legacyOwner });
  const owner = t.withIdentity({
    issuer,
    subject: "new-user",
    tokenIdentifier: `${issuer}|new-user`,
  });
  const other = t.withIdentity({
    issuer,
    subject: "other-user",
    tokenIdentifier: `${issuer}|other-user`,
  });
  const carId = await legacy.mutation(api.cars.create, carInput);
  return { t, legacy, owner, other, carId };
}

function clerkUser(
  id = "new-user",
  googleId = "google-owner",
  status = "verified",
) {
  return {
    id,
    email_addresses: [{ email_address: "same@example.com" }],
    external_accounts: [
      {
        provider: "oauth_google",
        provider_user_id: googleId,
        verification: { status },
      },
    ],
  };
}

describe("Clerk production ownership migration", () => {
  beforeEach(() => {
    vi.stubEnv("CLERK_JWT_ISSUER_DOMAIN", issuer);
    vi.stubEnv("CLERK_LEGACY_ISSUER_DOMAIN", "https://old.clerk.accounts.dev");
    vi.stubEnv("CLERK_SECRET_KEY", "test-only-secret");
    vi.stubEnv(
      "CLERK_LEGACY_GOOGLE_OWNERS",
      JSON.stringify({ "google-owner": legacyOwner }),
    );
  });
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("preserves IDs and records, reuses ownership for new cars, and excludes another user", async () => {
    const { t, owner, other, carId } = await fixture();
    const fetch = vi.fn().mockResolvedValue(Response.json(clerkUser()));
    vi.stubGlobal("fetch", fetch);
    expect(await owner.query(api.cars.list)).toEqual([]);
    await owner.action(api.identity.prepare);
    await owner.action(api.identity.prepare);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch.mock.calls[0][0]).toBe(
      "https://api.clerk.com/v1/users/new-user",
    );
    expect((await owner.query(api.cars.list)).map((car) => car._id)).toEqual([
      carId,
    ]);
    await owner.mutation(api.cars.update, { id: carId, mileage: 51000 });
    const newCar = await owner.mutation(api.cars.create, carInput);
    expect(await t.run((ctx) => ctx.db.get(newCar))).toMatchObject({
      userId: legacyOwner,
    });
    expect(await other.query(api.cars.getById, { id: carId })).toBeNull();
    expect(await other.query(api.cars.list)).toEqual([]);
    await expect(
      other.mutation(api.cars.remove, { id: carId }),
    ).rejects.toThrow("Fahrzeug nicht gefunden");
  });

  it.each([
    [
      "different Google account with matching email",
      "different-google",
      "verified",
    ],
    ["unverified Google account", "google-owner", "unverified"],
  ])("does not reclaim vehicles for %s", async (_label, googleId, status) => {
    const { owner } = await fixture();
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json(clerkUser("new-user", googleId, status)),
        ),
    );
    await owner.action(api.identity.prepare);
    expect(await owner.query(api.cars.list)).toEqual([]);
  });

  it("fails closed on a Clerk outage and retries without losing records", async () => {
    const { owner, carId } = await fixture();
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(new Response(null, { status: 503 }))
        .mockResolvedValueOnce(Response.json(clerkUser())),
    );
    await expect(owner.action(api.identity.prepare)).rejects.toThrow(
      "konnte nicht geprüft",
    );
    expect(await owner.query(api.cars.list)).toEqual([]);
    await owner.action(api.identity.prepare);
    expect(await owner.query(api.cars.getById, { id: carId })).not.toBeNull();
  });

  it("aborts a stalled Clerk request and offers a safe retry", async () => {
    const { owner, carId } = await fixture();
    const controller = new AbortController();
    const timeout = vi
      .spyOn(AbortSignal, "timeout")
      .mockReturnValue(controller.signal);
    const fetch = vi.fn().mockImplementationOnce(
      (_url: string, options: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          options.signal?.addEventListener("abort", () =>
            reject(new DOMException("Timed out", "TimeoutError")),
          );
        }),
    );
    vi.stubGlobal("fetch", fetch);
    const pending = owner.action(api.identity.prepare);
    const rejection = expect(pending).rejects.toThrow("konnte nicht geprüft");
    await vi.waitFor(() => expect(fetch).toHaveBeenCalledTimes(1));
    expect(timeout).toHaveBeenCalledWith(10_000);
    controller.abort();
    await rejection;
    expect(await owner.query(api.cars.list)).toEqual([]);
    timeout.mockRestore();
    fetch.mockResolvedValueOnce(Response.json(clerkUser()));
    await owner.action(api.identity.prepare);
    expect(await owner.query(api.cars.getById, { id: carId })).not.toBeNull();
  });

  it("preserves other Clerk network errors", async () => {
    const { owner } = await fixture();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Network error")),
    );
    await expect(owner.action(api.identity.prepare)).rejects.toThrow(
      "Network error",
    );
  });

  it("rejects a server response for another subject", async () => {
    const { owner } = await fixture();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json(clerkUser("different-user"))),
    );
    await expect(owner.action(api.identity.prepare)).rejects.toThrow(
      "Invalid Clerk user response",
    );
  });

  it("cannot bind the same legacy owner to two production accounts", async () => {
    const { owner, other } = await fixture();
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(Response.json(clerkUser()))
        .mockResolvedValueOnce(Response.json(clerkUser("other-user"))),
    );
    await owner.action(api.identity.prepare);
    await expect(other.action(api.identity.prepare)).rejects.toThrow(
      "Legacy owner already assigned",
    );
    expect(await other.query(api.cars.list)).toEqual([]);
  });

  it("keeps vehicles created under the new identity before migration", async () => {
    const { owner, carId } = await fixture();
    const newCarId = await owner.mutation(api.cars.create, carInput);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json(clerkUser())),
    );
    await owner.action(api.identity.prepare);
    expect(
      new Set((await owner.query(api.cars.list)).map((car) => car._id)),
    ).toEqual(new Set([carId, newCarId]));
  });

  it("rejects a Google-linked account that maps to multiple legacy owners", async () => {
    const { owner } = await fixture();
    vi.stubEnv(
      "CLERK_LEGACY_GOOGLE_OWNERS",
      JSON.stringify({
        "google-owner": legacyOwner,
        "another-google": "old-issuer|other-owner",
      }),
    );
    const user = clerkUser();
    user.external_accounts.push({
      provider: "oauth_google",
      provider_user_id: "another-google",
      verification: { status: "verified" },
    });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json(user)));
    await expect(owner.action(api.identity.prepare)).rejects.toThrow(
      "Ambiguous legacy ownership",
    );
    expect(await owner.query(api.cars.list)).toEqual([]);
  });

  it.each([
    `${issuer}|other-user`,
    "https://unknown.clerk.accounts.dev|other-user",
    "malformed-owner",
    "|old-user",
    "https://old.clerk.accounts.dev|",
    "https://old.clerk.accounts.dev|old-user|extra",
  ])("rejects an invalid owner namespace: %s", async (invalidOwner) => {
    const { t, owner, other, carId } = await fixture();
    const otherCarId = await other.mutation(api.cars.create, carInput);
    vi.stubEnv(
      "CLERK_LEGACY_GOOGLE_OWNERS",
      JSON.stringify({
        "google-owner": invalidOwner,
      }),
    );
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(Response.json(clerkUser())),
    );
    await expect(owner.action(api.identity.prepare)).rejects.toThrow(
      "Invalid legacy owner mapping",
    );
    expect(await owner.query(api.cars.list)).toEqual([]);
    expect((await other.query(api.cars.list)).map((car) => car._id)).toEqual([
      otherCarId,
    ]);
    expect(await t.run((ctx) => ctx.db.get(carId))).toMatchObject({
      userId: legacyOwner,
    });
    expect(
      await t.run((ctx) => ctx.db.query("ownerAliases").collect()),
    ).toEqual([]);
  });

  it("leaves the old instance functional and rejects anonymous migration", async () => {
    const { t, legacy, carId } = await fixture();
    const fetch = vi.fn();
    vi.stubGlobal("fetch", fetch);
    await legacy.action(api.identity.prepare);
    expect(await legacy.query(api.cars.getById, { id: carId })).not.toBeNull();
    expect(fetch).not.toHaveBeenCalled();
    await expect(t.action(api.identity.prepare)).rejects.toThrow(
      "Nicht authentifiziert",
    );
  });
});
