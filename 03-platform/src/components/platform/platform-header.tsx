"use client";

import Link from "next/link";
import {
  BellIcon,
  CircleHelpIcon,
  MenuIcon,
  SearchIcon,
} from "lucide-react";
import { useState } from "react";

import { BusinessSwitcher } from "@/components/platform/business-switcher";
import { PlaceholderNotice } from "@/components/platform/placeholder-notice";
import { UserProfileMenu } from "@/components/platform/user-profile-menu";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  PLACEHOLDER_MESSAGES,
  PLATFORM_BRAND,
} from "@/lib/navigation/platform-nav-config";
import type { PlatformChromeContext } from "@/lib/navigation/types";

type PlatformHeaderProps = PlatformChromeContext & {
  onMenuClick?: () => void;
  showMenuButton?: boolean;
};

export function PlatformHeader({
  businessName,
  canSwitchBusiness,
  businessCount,
  userDisplayName,
  userInitials,
  showMenuButton = false,
  onMenuClick,
}: PlatformHeaderProps) {
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-backdrop-filter:bg-background/80">
        <div className="mx-auto flex h-14 items-center gap-2 px-3 sm:gap-3 sm:px-4 lg:px-6">
          {showMenuButton ? (
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="lg:hidden"
              onClick={onMenuClick}
              aria-label="Open navigation menu"
            >
              <MenuIcon aria-hidden />
            </Button>
          ) : null}

          <Link
            href="/home"
            prefetch={false}
            className="flex shrink-0 items-center gap-2 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <span className="flex size-8 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
              IB
            </span>
            <span className="hidden flex-col leading-none sm:flex">
              <span className="text-sm font-semibold">{PLATFORM_BRAND.name}</span>
              <span className="text-[10px] text-muted-foreground">
                {PLATFORM_BRAND.tagline}
              </span>
            </span>
          </Link>

          <Separator orientation="vertical" className="mx-1 hidden h-6 sm:block" />

          <div className="hidden min-w-0 md:block">
            <BusinessSwitcher
              businessName={businessName}
              canSwitchBusiness={canSwitchBusiness}
              businessCount={businessCount}
              compact
            />
          </div>

          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="hidden max-w-xs flex-1 sm:flex"
              aria-label="Open search"
            >
              <div className="relative w-full max-w-[14rem] lg:max-w-xs">
                <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  readOnly
                  placeholder="Search..."
                  className="h-8 cursor-pointer pl-8 text-sm"
                  tabIndex={-1}
                />
              </div>
            </button>

            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="sm:hidden"
              onClick={() => setSearchOpen(true)}
              aria-label="Search"
            >
              <SearchIcon aria-hidden />
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => setNotificationsOpen(true)}
              aria-label="Notifications"
            >
              <BellIcon aria-hidden />
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="hidden sm:inline-flex"
              onClick={() => setHelpOpen(true)}
              aria-label="Help"
            >
              <CircleHelpIcon aria-hidden />
            </Button>

            <UserProfileMenu
              userDisplayName={userDisplayName}
              userInitials={userInitials}
              canSwitchBusiness={canSwitchBusiness}
              businessCount={businessCount}
            />
          </div>
        </div>

        <div className="border-t border-border px-3 py-2 md:hidden">
          <BusinessSwitcher
            businessName={businessName}
            canSwitchBusiness={canSwitchBusiness}
            businessCount={businessCount}
          />
        </div>
      </header>

      <PlaceholderNotice
        title="Search"
        message={PLACEHOLDER_MESSAGES.search}
        open={searchOpen}
        onOpenChange={setSearchOpen}
      />
      <PlaceholderNotice
        title="Notifications"
        message={PLACEHOLDER_MESSAGES.notifications}
        open={notificationsOpen}
        onOpenChange={setNotificationsOpen}
      />
      <PlaceholderNotice
        title="Help"
        message={PLACEHOLDER_MESSAGES.help}
        open={helpOpen}
        onOpenChange={setHelpOpen}
      />
    </>
  );
}
