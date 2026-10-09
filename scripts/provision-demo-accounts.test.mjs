// @vitest-environment jsdom

import { mkdtemp, rm, stat } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import {
  createFileCredentialStore,
  DEMO_ACCOUNT_EMAILS,
  provisionDemoAccounts,
  validateDemoProjectTarget,
} from "./provision-demo-accounts.mjs";

const projectRef = "0123456789abcdefghij";

function memoryStore() {
  let state = null;
  return {
    getState: () => (state ? structuredClone(state) : null),
    store: {
      async load(ref) {
        return state ? structuredClone(state) : { version: 1, projectRef: ref, accounts: {} };
      },
      async save(value) {
        state = structuredClone(value);
      },
    },
  };
}

function mockAdmin() {
  const users = new Map();
  let id = 1;
  const makeUser = (attributes) => {
    const user = {
      id: `00000000-0000-4000-8000-${String(id++).padStart(12, "0")}`,
      email: attributes.email,
      email_confirmed_at: attributes.email_confirm ? "2026-01-01T00:00:00Z" : null,
      app_metadata: attributes.app_metadata,
    };
    users.set(user.email, user);
    return user;
  };
  return {
    users,
    makeUser,
    admin: {
      listUsers: vi.fn(async ({ page, perPage }) => ({
        data: { users: [...users.values()].slice((page - 1) * perPage, page * perPage) },
        error: null,
      })),
      createUser: vi.fn(async (attributes) => ({ data: { user: makeUser(attributes) }, error: null })),
    },
  };
}

function passwordFactory() {
  let sequence = 0;
  return () => `${"p".repeat(35)}${String(sequence++).padStart(8, "0")}`;
}

describe("demo account provisioning safeguards", () => {
  it("requires an exact HTTPS project URL and explicit matching ref", () => {
    expect(validateDemoProjectTarget({
      url: `https://${projectRef}.supabase.co`,
      configuredProjectRef: projectRef,
      confirmedProjectRef: projectRef,
    })).toBe(projectRef);
    expect(() => validateDemoProjectTarget({
      url: "https://prodexample12345678.supabase.co",
      configuredProjectRef: projectRef,
      confirmedProjectRef: projectRef,
    })).toThrow(/match the confirmed/);
    expect(() => validateDemoProjectTarget({
      url: `https://${projectRef}.supabase.co`,
      configuredProjectRef: projectRef,
      confirmedProjectRef: "abcdefghijklmnopqrst",
    })).toThrow(/confirm the exact ref/);
  });

  it("creates only the five fixed accounts with confirmed email and trusted app metadata", async () => {
    const { admin } = mockAdmin();
    const { store, getState } = memoryStore();
    const result = await provisionDemoAccounts({ admin, projectRef, store, passwordFactory: passwordFactory() });

    expect(result.createdEmails).toEqual(DEMO_ACCOUNT_EMAILS);
    expect(result.reusedEmails).toEqual([]);
    expect(admin.createUser).toHaveBeenCalledTimes(5);
    const attributes = admin.createUser.mock.calls.map(([value]) => value);
    expect(attributes.map(({ email }) => email)).toEqual(DEMO_ACCOUNT_EMAILS);
    expect(attributes.every(({ email_confirm }) => email_confirm === true)).toBe(true);
    expect(attributes.every(({ app_metadata }) => app_metadata.fyb_demo === true)).toBe(true);
    expect(attributes.every(({ user_metadata }) => user_metadata === undefined)).toBe(true);
    expect(new Set(attributes.map(({ password }) => password)).size).toBe(5);
    expect(attributes.every(({ password }) => password.length >= 32)).toBe(true);
    expect(getState().accounts[DEMO_ACCOUNT_EMAILS[0]].userId).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("recovers a partial run without duplicating users or replacing pending credentials", async () => {
    const { admin, users, makeUser } = mockAdmin();
    const { store, getState } = memoryStore();
    const passwords = passwordFactory();
    let loseSecondResponse = true;
    admin.createUser.mockImplementation(async (attributes) => {
      const user = makeUser(attributes);
      if (attributes.email === DEMO_ACCOUNT_EMAILS[1] && loseSecondResponse) {
        loseSecondResponse = false;
        return { data: { user: null }, error: new Error("simulated lost response") };
      }
      return { data: { user }, error: null };
    });

    await expect(provisionDemoAccounts({ admin, projectRef, store, passwordFactory: passwords }))
      .rejects.toThrow(/private pending credential was preserved/);
    const pendingPassword = getState().accounts[DEMO_ACCOUNT_EMAILS[1]].password;
    expect(users.has(DEMO_ACCOUNT_EMAILS[1])).toBe(true);
    expect(getState().accounts[DEMO_ACCOUNT_EMAILS[1]].userId).toBeNull();

    const result = await provisionDemoAccounts({ admin, projectRef, store, passwordFactory: passwords });
    expect(result.reusedEmails).toEqual(DEMO_ACCOUNT_EMAILS.slice(0, 2));
    expect(result.createdEmails).toEqual(DEMO_ACCOUNT_EMAILS.slice(2));
    expect(admin.createUser.mock.calls.filter(([value]) => value.email === DEMO_ACCOUNT_EMAILS[1])).toHaveLength(1);
    expect(getState().accounts[DEMO_ACCOUNT_EMAILS[1]].password).toBe(pendingPassword);
    expect(getState().accounts[DEMO_ACCOUNT_EMAILS[1]].userId).toBe(users.get(DEMO_ACCOUNT_EMAILS[1]).id);
  });

  it("refuses an existing user without local credentials or the expected trusted markers", async () => {
    const { admin, users } = mockAdmin();
    users.set(DEMO_ACCOUNT_EMAILS[4], {
      id: "00000000-0000-4000-8000-000000000501",
      email: DEMO_ACCOUNT_EMAILS[4],
      email_confirmed_at: "2026-01-01T00:00:00Z",
      app_metadata: { fyb_demo: true },
    });
    const { store } = memoryStore();
    await expect(provisionDemoAccounts({ admin, projectRef, store })).rejects.toThrow(/without a private credential record/);
    expect(admin.createUser).not.toHaveBeenCalled();
  });

  it("refuses to reuse a local password when an existing user's demo marker differs", async () => {
    const { admin, makeUser } = mockAdmin();
    const { store } = memoryStore();
    const seedId = randomUUID();
    await store.save({
      version: 1,
      projectRef,
      accounts: {
        [DEMO_ACCOUNT_EMAILS[0]]: { password: "p".repeat(43), seedId, userId: null },
      },
    });
    makeUser({
      email: DEMO_ACCOUNT_EMAILS[0],
      email_confirm: true,
      app_metadata: { fyb_demo: true, fyb_demo_seed_id: randomUUID() },
    });

    await expect(provisionDemoAccounts({ admin, projectRef, store }))
      .rejects.toThrow(/does not match this project's confirmed demo record/);
    expect(admin.createUser).not.toHaveBeenCalled();
  });

  it("stores rerun credentials in a mode-0700 directory and mode-0600 file", async () => {
    const temporaryDirectory = await mkdtemp(join(tmpdir(), "fyb-demo-test-"));
    try {
      const filePath = join(temporaryDirectory, ".local", "accounts.json");
      const store = createFileCredentialStore(filePath);
      const state = await store.load(projectRef);
      state.accounts[DEMO_ACCOUNT_EMAILS[0]] = {
        password: "p".repeat(43),
        seedId: "00000000-0000-4000-8000-000000000001",
        userId: null,
      };
      await store.save(state);
      expect((await stat(join(temporaryDirectory, ".local"))).mode & 0o777).toBe(0o700);
      expect((await stat(filePath)).mode & 0o777).toBe(0o600);
      expect((await store.load(projectRef)).accounts[DEMO_ACCOUNT_EMAILS[0]].password).toBe("p".repeat(43));
    } finally {
      await rm(temporaryDirectory, { recursive: true, force: true });
    }
  });
});
