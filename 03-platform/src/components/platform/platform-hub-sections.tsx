/**
 * UX-001 / NAV-001 — Compact hub secondary navigation (lists, not button farms).
 */

import Link from "next/link";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export type PlatformHubSectionLink = {
  href: string;
  label: string;
  description?: string;
};

export type PlatformHubSection = {
  title: string;
  description?: string;
  links: PlatformHubSectionLink[];
};

type PlatformHubSectionsProps = {
  sections: PlatformHubSection[];
};

export function PlatformHubSections({ sections }: PlatformHubSectionsProps) {
  if (sections.length === 0) {
    return null;
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {sections.map((section) => (
        <Card key={section.title}>
          <CardHeader className="pb-2">
            <CardTitle className="text-base">{section.title}</CardTitle>
            {section.description ? (
              <CardDescription>{section.description}</CardDescription>
            ) : null}
          </CardHeader>
          <CardContent className="p-0">
            <ul>
              {section.links.map((link) => (
                <li key={link.href} className="border-t first:border-t-0">
                  <Link
                    href={link.href}
                    prefetch={false}
                    className="block px-4 py-3 transition-colors hover:bg-muted/40"
                  >
                    <p className="text-sm font-medium">{link.label}</p>
                    {link.description ? (
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        {link.description}
                      </p>
                    ) : null}
                  </Link>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
