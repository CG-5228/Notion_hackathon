import { randomBytes, randomUUID } from "node:crypto";
import { constants as fsConstants } from "node:fs";
import { chmod, lstat, mkdir, open, rename, unlink } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { createClient } from "@supabase/supabase-js";

export const DEMO_ACCOUNT_EMAILS = Object.freeze(
  Array.from({ length: 5 }, (_, index) => `fyb-demo-${index + 1}@mail.dcu.ie`),
);

const EMAIL_SET = new Set(DEMO_ACCOUNT_EMAILS);
const PROJECT_REF_PATTERN = /^[a-z0-9]{20}$/;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PASSWORD_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const CREDENTIAL_VERSION = 1;
const USERS_PER_PAGE = 100;

export function validateDemoProjectTarget({ url, configuredProjectRef, confirmedProjectRef }) {
  const ref = typeof configuredProjectRef === "string" ? configuredProjectRef.trim() : "";
  const confirmation = typeof confirmedProjectRef === "string" ? confirmedProjectRef.trim() : "";
  if (!PROJECT_REF_PATTERN.test(ref) || confirmation !== ref) {
    throw new Error("Set SUPABASE_DEMO_PROJECT_REF and confirm the exact ref with --confirm-project-ref.");
  }

  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error("SUPABASE_URL must be the HTTPS URL for the confirmed isolated demo project.");
  }
  if (
    parsed.protocol !== "https:" ||
    parsed.hostname !== `${ref}.supabase.co` ||
    parsed.port !== "" ||
    parsed.username !== "" ||
    parsed.password !== "" ||
    parsed.pathname !== "/" ||
    parsed.search !== "" ||
    parsed.hash !== ""
  ) {
    throw new Error("SUPABASE_URL must match the confirmed isolated Supabase project ref exactly.");
  }
  return ref;
}

function validateCredentialState(value, projectRef) {
  if (
    !value ||
    value.version !== CREDENTIAL_VERSION ||
    value.projectRef !== projectRef ||
    !value.accounts ||
    typeof value.accounts !== "object" ||
    Array.isArray(value.accounts)
  ) {
    throw new Error("The private demo credential file is invalid or belongs to another project.");
  }

  const accounts = {};
  const passwords = new Set();
  const seedIds = new Set();
  for (const [email, entry] of Object.entries(value.accounts)) {
    if (
      !EMAIL_SET.has(email) ||
      !entry ||
      typeof entry.password !== "string" ||
      !PASSWORD_PATTERN.test(entry.password) ||
      !UUID_PATTERN.test(entry.seedId) ||
      (entry.userId !== null && !UUID_PATTERN.test(entry.userId)) ||
      passwords.has(entry.password) ||
      seedIds.has(entry.seedId)
    ) {
      throw new Error("The private demo credential file has an invalid account record.");
    }
    passwords.add(entry.password);
    seedIds.add(entry.seedId);
    accounts[email] = { password: entry.password, seedId: entry.seedId, userId: entry.userId };
  }
  return { version: CREDENTIAL_VERSION, projectRef, accounts };
}

export function createFileCredentialStore(filePath) {
  const resolvedFile = resolve(filePath);
  const directory = dirname(resolvedFile);

  async function ensurePrivateDirectory() {
    await mkdir(directory, { recursive: true, mode: 0o700 });
    let info = await lstat(directory);
    if (info.isSymbolicLink() || !info.isDirectory()) {
      throw new Error("The local credential directory must be a real directory.");
    }
    await chmod(directory, 0o700);
    info = await lstat(directory);
    if ((info.mode & 0o777) !== 0o700) {
      throw new Error("Could not restrict the local credential directory to mode 0700.");
    }
  }

  return {
    async load(projectRef) {
      await ensurePrivateDirectory();
      let info;
      try {
        info = await lstat(resolvedFile);
      } catch (error) {
        if (error?.code === "ENOENT") {
          return { version: CREDENTIAL_VERSION, projectRef, accounts: {} };
        }
        throw error;
      }
      if (info.isSymbolicLink() || !info.isFile()) {
        throw new Error("The local credential path must be a regular file, not a link.");
      }
      await chmod(resolvedFile, 0o600);
      const handle = await open(resolvedFile, fsConstants.O_RDONLY | (fsConstants.O_NOFOLLOW ?? 0));
      let contents;
      try {
        contents = await handle.readFile({ encoding: "utf8" });
      } finally {
        await handle.close();
      }
      let parsed;
      try {
        parsed = JSON.parse(contents);
      } catch {
        throw new Error("The local credential file cannot be read; refusing to continue.");
      }
      return validateCredentialState(parsed, projectRef);
    },

    async save(value) {
      await ensurePrivateDirectory();
      const clean = validateCredentialState(value, value?.projectRef);
      const temporaryFile = join(directory, `.fyb-demo-${process.pid}-${randomUUID()}.tmp`);
      try {
        const handle = await open(
          temporaryFile,
          fsConstants.O_WRONLY | fsConstants.O_CREAT | fsConstants.O_EXCL | (fsConstants.O_NOFOLLOW ?? 0),
          0o600,
        );
        try {
          await handle.writeFile(`${JSON.stringify(clean, null, 2)}\n`, { encoding: "utf8" });
          await handle.sync();
        } finally {
          await handle.close();
        }
        await chmod(temporaryFile, 0o600);
        await rename(temporaryFile, resolvedFile);
        await chmod(resolvedFile, 0o600);
        const info = await lstat(resolvedFile);
        if (info.isSymbolicLink() || !info.isFile() || (info.mode & 0o777) !== 0o600) {
          throw new Error("Could not restrict the local credential file to mode 0600.");
        }
      } catch (error) {
        await unlink(temporaryFile).catch(() => undefined);
        throw error;
      }
    },
  };
}

async function listTargetUsers(admin) {
  const found = new Map();
  for (let page = 1; page <= 10_000; page += 1) {
    let response;
    try {
      response = await admin.listUsers({ page, perPage: USERS_PER_PAGE });
    } catch {
      throw new Error("Could not inspect existing Auth users; no accounts were changed.");
    }
    const users = response?.data?.users;
    if (response?.error || !Array.isArray(users)) {
      throw new Error("Could not inspect existing Auth users; no accounts were changed.");
    }
    for (const user of users) {
      const email = typeof user?.email === "string" ? user.email.trim().toLowerCase() : "";
      if (!EMAIL_SET.has(email)) continue;
      if (found.has(email)) throw new Error("Duplicate target email returned by Auth; refusing to continue.");
      found.set(email, user);
    }
    if (users.length < USERS_PER_PAGE) return found;
  }
  throw new Error("Auth user pagination exceeded the safety limit; no accounts were changed.");
}

function assertExpectedDemoUser(user, email, credential) {
  if (
    typeof user?.id !== "string" ||
    !UUID_PATTERN.test(user.id) ||
    typeof user.email !== "string" ||
    user.email.trim().toLowerCase() !== email ||
    !user.email_confirmed_at ||
    user.app_metadata?.fyb_demo !== true ||
    user.app_metadata?.fyb_demo_seed_id !== credential.seedId ||
    (credential.userId !== null && user.id !== credential.userId)
  ) {
    throw new Error(`Existing account ${email} does not match this project's confirmed demo record; refusing to reuse or modify it.`);
  }
  return user;
}

function uniqueValue(factory, used, label) {
  for (let attempt = 0; attempt < 16; attempt += 1) {
    const value = factory();
    if (typeof value === "string" && value.length >= 32 && !used.has(value)) {
      used.add(value);
      return value;
    }
  }
  throw new Error(`Could not generate a unique ${label}; no account was changed.`);
}

export async function provisionDemoAccounts({
  admin,
  projectRef,
  store,
  passwordFactory = () => randomBytes(32).toString("base64url"),
  seedIdFactory = randomUUID,
}) {
  if (!admin?.listUsers || !admin?.createUser || !store?.load || !store?.save) {
    throw new Error("The server-side Auth admin client and private credential store are required.");
  }

  const credentials = validateCredentialState(await store.load(projectRef), projectRef);
  const users = await listTargetUsers(admin);
  for (const email of DEMO_ACCOUNT_EMAILS) {
    const existing = users.get(email);
    const credential = credentials.accounts[email];
    if (existing) {
      if (!credential) {
        throw new Error(`Account ${email} already exists without a private credential record; refusing to overwrite it.`);
      }
      assertExpectedDemoUser(existing, email, credential);
    } else if (credential?.userId) {
      throw new Error(`Previously provisioned account ${email} is missing; refusing to recreate it.`);
    }
  }

  const usedPasswords = new Set(Object.values(credentials.accounts).map(({ password }) => password));
  const usedSeedIds = new Set(Object.values(credentials.accounts).map(({ seedId }) => seedId));
  const createdEmails = [];
  const reusedEmails = [];

  for (const email of DEMO_ACCOUNT_EMAILS) {
    let credential = credentials.accounts[email];
    const existing = users.get(email);
    if (existing) {
      if (credential.userId === null) {
        credential.userId = existing.id;
        await store.save(credentials);
      }
      reusedEmails.push(email);
      continue;
    }
    if (!credential) {
      const password = uniqueValue(passwordFactory, usedPasswords, "password");
      const seedId = seedIdFactory();
      if (!UUID_PATTERN.test(seedId) || usedSeedIds.has(seedId)) {
        throw new Error("Could not generate a unique demo marker; no account was changed.");
      }
      usedSeedIds.add(seedId);
      credential = { password, seedId, userId: null };
      credentials.accounts[email] = credential;
      await store.save(credentials);
    }

    let response;
    try {
      response = await admin.createUser({
        email,
        password: credential.password,
        email_confirm: true,
        app_metadata: { fyb_demo: true, fyb_demo_seed_id: credential.seedId },
      });
    } catch {
      throw new Error(`Auth could not create ${email}; its private pending credential was preserved for a safe retry.`);
    }
    if (response?.error) {
      throw new Error(`Auth could not create ${email}; its private pending credential was preserved for a safe retry.`);
    }
    const user = assertExpectedDemoUser(response?.data?.user, email, credential);
    credential.userId = user.id;
    await store.save(credentials);
    users.set(email, user);
    createdEmails.push(email);
  }

  return { createdEmails, reusedEmails };
}

function parseProjectConfirmation(args) {
  if (args.length !== 2 || args[0] !== "--confirm-project-ref" || !PROJECT_REF_PATTERN.test(args[1])) {
    throw new Error("Usage: npm run demo:accounts -- --confirm-project-ref <20-character-demo-project-ref>");
  }
  return args[1];
}

async function main() {
  const confirmedProjectRef = parseProjectConfirmation(process.argv.slice(2));
  const url = process.env.SUPABASE_URL?.trim();
  const projectRef = validateDemoProjectTarget({
    url,
    configuredProjectRef: process.env.SUPABASE_DEMO_PROJECT_REF,
    confirmedProjectRef,
  });
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!serviceRoleKey) {
    throw new Error("Set SUPABASE_SERVICE_ROLE_KEY in the ignored server-only .env.demo file.");
  }

  const supabase = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });
  const credentialPath = resolve(process.cwd(), ".local", "fyb-demo-accounts.json");
  const result = await provisionDemoAccounts({
    admin: supabase.auth.admin,
    projectRef,
    store: createFileCredentialStore(credentialPath),
  });
  console.info(`Demo accounts ready for isolated project ${projectRef}: ${result.createdEmails.length} created, ${result.reusedEmails.length} matched.`);
  console.info("Private credentials are stored under .local/ with restricted permissions; passwords were not printed.");
  console.info("These are synthetic identities; admin confirmation does not prove mailbox ownership.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`Demo account provisioning stopped safely: ${message}`);
    process.exitCode = 1;
  });
}
