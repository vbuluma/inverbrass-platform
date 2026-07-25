/**
 * Purpose:
 * Next.js application configuration for the InverBrass platform app.
 *
 * Design rationale:
 * Keeps framework options centralized. Instrumentation is enabled so IP-006A
 * startup validation can run when the Node.js runtime boots.
 *
 * Business rationale:
 * Missing reference data must be detectable early without changing approved
 * onboarding behaviour.
 *
 * Implementation Package:
 * IP-006A – Platform Initialization & Security Hardening
 */

import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Next.js loads src/instrumentation.ts when this flag is available.
  // Validation itself never crashes the process.
};

export default nextConfig;
