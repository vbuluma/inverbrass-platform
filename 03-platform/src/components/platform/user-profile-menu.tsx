"use client";

import Link from "next/link";
import {
  ArrowLeftRightIcon,
  CircleHelpIcon,
  InfoIcon,
  LogOutIcon,
  SettingsIcon,
  UserIcon,
} from "lucide-react";
import { useState } from "react";

import { PlaceholderNotice } from "@/components/platform/placeholder-notice";
import { signOutAndRedirectAction } from "@/core/navigation/actions/platform-navigation-actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PLACEHOLDER_MESSAGES } from "@/lib/navigation/platform-nav-config";
import type { PlatformChromeContext } from "@/lib/navigation/types";

type UserProfileMenuProps = Pick<
  PlatformChromeContext,
  "userDisplayName" | "userInitials" | "canSwitchBusiness" | "businessCount"
>;

export function UserProfileMenu({
  userDisplayName,
  userInitials,
  canSwitchBusiness,
  businessCount,
}: UserProfileMenuProps) {
  const [aboutOpen, setAboutOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [switchPlaceholderOpen, setSwitchPlaceholderOpen] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="gap-2 pl-1.5"
              aria-label="User profile menu"
            >
              <span className="flex size-7 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                {userInitials}
              </span>
              <span className="hidden max-w-[8rem] truncate sm:inline">
                {userDisplayName}
              </span>
            </Button>
          }
        />
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuGroup>
            <DropdownMenuLabel>{userDisplayName}</DropdownMenuLabel>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem
              render={
                <Link href="/profile/personal" prefetch={false}>
                  <UserIcon aria-hidden />
                  My Profile
                </Link>
              }
            />
            <DropdownMenuItem
              render={
                <Link href="/profile/preferences" prefetch={false}>
                  <SettingsIcon aria-hidden />
                  Preferences
                </Link>
              }
            />
            {canSwitchBusiness ? (
              <DropdownMenuItem
                render={
                  <Link href="/select-business" prefetch={false}>
                    <ArrowLeftRightIcon aria-hidden />
                    Switch Business
                  </Link>
                }
              />
            ) : (
              <DropdownMenuItem onClick={() => setSwitchPlaceholderOpen(true)}>
                <ArrowLeftRightIcon aria-hidden />
                Switch Business
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => setHelpOpen(true)}>
              <CircleHelpIcon aria-hidden />
              Help
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setAboutOpen(true)}>
              <InfoIcon aria-hidden />
              About InverBrass
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem
              variant="destructive"
              onClick={() => signOutAndRedirectAction()}
            >
              <LogOutIcon aria-hidden />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      <PlaceholderNotice
        title="Help"
        message={PLACEHOLDER_MESSAGES.help}
        open={helpOpen}
        onOpenChange={setHelpOpen}
      />
      <PlaceholderNotice
        title="About InverBrass"
        message={PLACEHOLDER_MESSAGES.about}
        open={aboutOpen}
        onOpenChange={setAboutOpen}
      />
      {!canSwitchBusiness && businessCount <= 1 ? (
        <PlaceholderNotice
          title="Switch Business"
          message={PLACEHOLDER_MESSAGES["switch-business-single"]}
          open={switchPlaceholderOpen}
          onOpenChange={setSwitchPlaceholderOpen}
        />
      ) : null}
    </>
  );
}
