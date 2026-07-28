import Link from "next/link";

import { PLACEHOLDER_MESSAGES } from "@/lib/navigation/platform-nav-config";

type AuthPageLinksProps = {
  showRegister?: boolean;
};

export function AuthPageLinks({ showRegister = true }: AuthPageLinksProps) {
  return (
    <nav
      aria-label="Authentication links"
      className="space-y-3 text-center text-sm text-muted-foreground"
    >
      <ul className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
        <li>
          <Link
            href="/forgot-password"
            className="font-medium text-primary underline-offset-4 hover:underline"
          >
            Forgot Password
          </Link>
        </li>
        {showRegister ? (
          <>
            <li aria-hidden="true">·</li>
            <li>
              <Link
                href="/register"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                Register Business
              </Link>
            </li>
          </>
        ) : null}
        <li aria-hidden="true">·</li>
        <li>
          <span title={PLACEHOLDER_MESSAGES.help}>Help</span>
        </li>
      </ul>
      <ul className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
        <li>
          <span title={PLACEHOLDER_MESSAGES.privacy}>Privacy Policy</span>
        </li>
        <li aria-hidden="true">·</li>
        <li>
          <span title={PLACEHOLDER_MESSAGES.terms}>Terms</span>
        </li>
        <li aria-hidden="true">·</li>
        <li>
          <span title={PLACEHOLDER_MESSAGES["back-home"]}>Back to Home</span>
        </li>
      </ul>
    </nav>
  );
}
