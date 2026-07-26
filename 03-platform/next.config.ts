/**
 * Purpose:
 * Next.js application configuration for the InverBrass platform app.
 *
 * Design rationale:
 * Keeps framework options centralized. Instrumentation is enabled so IP-006A
 * startup validation can run when the Node.js runtime boots.
 * allowedDevOrigins permits LAN HMR access during local development.
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
  // Allow network-host HMR in local development (e.g. phone/LAN testing).
  allowedDevOrigins: ["192.168.100.70", "localhost"],
};

export default nextConfig;
