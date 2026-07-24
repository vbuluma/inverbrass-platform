/**
 * Purpose:
 * Shared environment loader for executable database and utility scripts.
 *
 * What this module does:
 * Loads local development secrets into `process.env` in a consistent order
 * before any script reads `DATABASE_URL` or related credentials.
 *
 * Why it exists:
 * `import "dotenv/config"` only loads `.env`. This project keeps local secrets
 * in `.env.local`. Without a shared loader, scripts fail with
 * `DATABASE_URL is missing` unless callers pass `--env-file=.env.local`.
 *
 * Design rationale:
 * - Load `.env.local` first so local developer overrides win over committed
 *   defaults in `.env`.
 * - Fall back to `.env` for shared non-secret defaults when a key is absent.
 * - Never overwrite keys already present in `process.env` so CI/CD and
 *   production platform env vars remain authoritative.
 * - Resolve file paths from `process.cwd()` so the loader works the same on
 *   Windows, macOS, and Linux when scripts run via `npm run ...`.
 *
 * Assumptions:
 * - Scripts are executed from the `03-platform` package root (npm scripts).
 * - Next.js application runtime continues to use Next's built-in env loading;
 *   this module is for Node scripts only (migrate, seed, drizzle-kit config).
 *
 * Production safety:
 * - Missing env files are ignored (no throw).
 * - Existing process environment is never overwritten (`override: false`).
 * - In production, inject secrets via the host environment; local files are optional.
 *
 * Maintenance notes:
 * - Import this module as the first side-effect import in every DB/utility script.
 * - Do not use this loader inside App Router / browser runtime modules.
 * - Prefer `loadEnv()` for explicit control; the default export also auto-runs
 *   when this file is imported for side effects.
 */

import { existsSync } from "node:fs";
import path from "node:path";

import { config as loadDotenvFile } from "dotenv";

export type LoadEnvResult = {
  loadedFrom: string[];
  cwd: string;
};

/**
 * What this function does:
 * Loads `.env.local` then `.env` into `process.env` without overwriting
 * variables that are already defined.
 *
 * Why it exists:
 * Provides one reusable entry point so migrate/seed/drizzle-kit do not each
 * invent different dotenv call patterns.
 *
 * Design rationale:
 * `override: false` preserves shell/CI/production env precedence. Absolute
 * paths via `path.resolve` keep behaviour stable across OS path separators.
 *
 * @returns Paths that were found and loaded (for diagnostics only).
 */
export function loadEnv(): LoadEnvResult {
  // ----------------------------------------------------
  // Resolve from the process working directory.
  // npm scripts (`db:migrate`, `db:seed`) run with cwd = package root.
  // ----------------------------------------------------
  const cwd = process.cwd();
  const loadedFrom: string[] = [];

  const localEnvPath = path.resolve(cwd, ".env.local");
  const defaultEnvPath = path.resolve(cwd, ".env");

  // ----------------------------------------------------
  // 1) .env.local first — local developer secrets (DATABASE_URL, etc.).
  // Why first: local values should fill keys before shared .env defaults.
  // override:false — do not clobber vars already set by the host/shell.
  // ----------------------------------------------------
  if (existsSync(localEnvPath)) {
    loadDotenvFile({
      path: localEnvPath,
      override: false,
    });
    loadedFrom.push(localEnvPath);
  }

  // ----------------------------------------------------
  // 2) .env fallback — optional shared defaults for the team.
  // Why second: only fills keys still missing after .env.local / process.env.
  // ----------------------------------------------------
  if (existsSync(defaultEnvPath)) {
    loadDotenvFile({
      path: defaultEnvPath,
      override: false,
    });
    loadedFrom.push(defaultEnvPath);
  }

  return { loadedFrom, cwd };
}

// ----------------------------------------------------
// Side-effect load on import.
// Why: scripts can `import "@/lib/env/load-env"` once at the top and rely on
// process.env being populated before any DATABASE_URL read.
// ----------------------------------------------------
loadEnv();
