export function getClientContextFromHeaders(headers: Headers): {
  ipAddress?: string;
  userAgent?: string;
} {
  return {
    ipAddress:
      headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      headers.get("x-real-ip") ??
      undefined,
    userAgent: headers.get("user-agent") ?? undefined,
  };
}
