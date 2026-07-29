/**
 * Purpose:
 * Smoke-validate BP-002 / IP-008 Party Groups & Membership.
 *
 * READ-ONLY:
 * This script must never seed, repair, insert, update, or delete data.
 *
 * Usage:
 *   npx tsx scripts/bp002-ip008-party-groups-smoke-validation.ts
 *
 * Implementation Package:
 * BP-002 / IP-008 – Party Groups & Membership
 */

import "@/lib/env/load-env";

import { existsSync } from "node:fs";
import path from "node:path";

import { count, eq } from "drizzle-orm";

import { closeDb, getDb } from "@/db/client";
import { groupMembershipRole } from "@/db/schema/group-membership-role";
import { groupType } from "@/db/schema/group-type";
import { groupMembershipRoles } from "@/db/seeds/group-membership-roles";
import { groupTypes } from "@/db/seeds/group-types";
import {
  GROUP_WORKSPACE_TABS,
  PARTY_GROUP_MEMBER_STATUS_CODES,
  PARTY_GROUP_STATUS_CODES,
  PARTY_WORKSPACE_TABS,
} from "@/modules/party/constants";
import { isBusinessAppRoute } from "@/lib/navigation/business-app-routes";
import {
  canDeactivateGroup,
  canExitMembership,
  canReactivateGroup,
  canRejoinMembership,
  isActiveGroupMembership,
  normalizeGroupCode,
} from "@/modules/party/services/party-group-rules";
import { createPartyGroupService } from "@/modules/party/services/party-group-service";
import {
  addPartyGroupMemberSchema,
  addPartyToGroupSchema,
  createPartyGroupSchema,
  groupSearchQuerySchema,
  updatePartyGroupMemberSchema,
  updatePartyGroupSchema,
} from "@/modules/party/validators/party-group-validators";

const ROOT = path.resolve(__dirname, "..");

const REQUIRED_FILES = [
  "src/db/schema/group-type.ts",
  "src/db/schema/group-membership-role.ts",
  "src/db/schema/party-group.ts",
  "src/db/schema/party-group-member.ts",
  "src/db/seeds/group-types.ts",
  "src/db/seeds/group-types-seed.ts",
  "src/db/seeds/group-membership-roles.ts",
  "src/db/seeds/group-membership-roles-seed.ts",
  "drizzle/0021_bp002_ip008_party_groups.sql",
  "src/modules/party/repositories/party-group-repository.ts",
  "src/modules/party/repositories/party-group-member-repository.ts",
  "src/modules/party/services/party-group-service.ts",
  "src/modules/party/services/party-group-rules.ts",
  "src/modules/party/validators/party-group-validators.ts",
  "src/modules/party/actions/party-group-actions.ts",
  "src/modules/party/components/party-groups-panel.tsx",
  "src/modules/party/components/party-group-dashboard.tsx",
  "src/modules/party/components/party-group-workspace.tsx",
  "src/app/(authenticated)/(app)/groups/page.tsx",
  "src/app/(authenticated)/(app)/groups/[groupId]/page.tsx",
];

type SmokeResult = {
  name: string;
  ok: boolean;
  detail?: string;
};

function checkRequiredFiles(): SmokeResult[] {
  return REQUIRED_FILES.map((relativePath) => {
    const absolute = path.join(ROOT, relativePath);
    const ok = existsSync(absolute);
    return {
      name: `file:${relativePath}`,
      ok,
      detail: ok ? undefined : "Missing required Party Groups file.",
    };
  });
}

function checkValidators(): SmokeResult[] {
  const sampleUuid = "11111111-1111-4111-8111-111111111111";
  return [
    {
      name: "validator:createGroup happy path",
      ok: createPartyGroupSchema.safeParse({
        groupName: "North Farmers",
        groupCode: "FG-NORTH-01",
        groupTypeCode: "FARMER_GROUP",
      }).success,
    },
    {
      name: "validator:addMember happy path",
      ok: addPartyGroupMemberSchema.safeParse({
        partyId: sampleUuid,
        membershipRoleCode: "MEMBER",
      }).success,
    },
    {
      name: "validator:addPartyToGroup happy path",
      ok: addPartyToGroupSchema.safeParse({
        partyGroupId: sampleUuid,
        membershipRoleCode: "MEMBER",
      }).success,
    },
    {
      name: "validator:updateGroup",
      ok: updatePartyGroupSchema.safeParse({
        groupName: "Updated Name",
      }).success,
    },
    {
      name: "validator:updateMember",
      ok: updatePartyGroupMemberSchema.safeParse({
        membershipRoleCode: "SECRETARY",
      }).success,
    },
    {
      name: "validator:groupSearch rejects short query",
      ok: !groupSearchQuerySchema.safeParse({ query: "a" }).success,
    },
  ];
}

function checkRules(): SmokeResult[] {
  const sampleUuidA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
  const sampleUuidB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

  return [
    {
      name: "rules:canDeactivateGroup active",
      ok: canDeactivateGroup(PARTY_GROUP_STATUS_CODES.ACTIVE),
    },
    {
      name: "rules:canReactivateGroup inactive",
      ok: canReactivateGroup(PARTY_GROUP_STATUS_CODES.INACTIVE),
    },
    {
      name: "rules:canExitMembership active",
      ok: canExitMembership(PARTY_GROUP_MEMBER_STATUS_CODES.ACTIVE),
    },
    {
      name: "rules:canRejoinMembership exited",
      ok: canRejoinMembership(PARTY_GROUP_MEMBER_STATUS_CODES.EXITED),
    },
    {
      name: "rules:isActiveGroupMembership detects duplicate",
      ok: isActiveGroupMembership(sampleUuidA, sampleUuidB, {
        partyGroupId: sampleUuidA,
        partyId: sampleUuidB,
        statusCode: PARTY_GROUP_MEMBER_STATUS_CODES.ACTIVE,
      }),
    },
    {
      name: "rules:normalizeGroupCode",
      ok: normalizeGroupCode(" fg north 01 ") === "FG_NORTH_01",
    },
  ];
}

function checkNavigation(): SmokeResult[] {
  return [
    {
      name: "navigation:groups list uses business app shell",
      ok: isBusinessAppRoute("/groups"),
    },
    {
      name: "navigation:group workspace uses business app shell",
      ok: isBusinessAppRoute(
        "/groups/11111111-1111-4111-8111-111111111111"
      ),
    },
  ];
}

function checkTabs(): SmokeResult[] {
  const groupsTab = PARTY_WORKSPACE_TABS.find((tab) => tab.id === "groups");
  return [
    {
      name: "tabs:party workspace groups available",
      ok: groupsTab?.available === true,
      detail:
        groupsTab?.available === true
          ? undefined
          : "Groups tab must be available in Party Workspace.",
    },
    {
      name: "tabs:party workspace groups label",
      ok: groupsTab?.label === "Groups & Membership",
    },
    {
      name: "tabs:group workspace overview",
      ok: GROUP_WORKSPACE_TABS.some(
        (tab) => tab.id === "overview" && tab.available
      ),
    },
    {
      name: "tabs:group workspace members",
      ok: GROUP_WORKSPACE_TABS.some(
        (tab) => tab.id === "members" && tab.available
      ),
    },
  ];
}

async function checkCatalogues(): Promise<SmokeResult[]> {
  const db = getDb();
  try {
    const [groupTypeCount] = await db
      .select({ value: count() })
      .from(groupType);
    const [roleCount] = await db
      .select({ value: count() })
      .from(groupMembershipRole);

    const [sampleType] = await db
      .select({ code: groupType.code })
      .from(groupType)
      .where(eq(groupType.code, "FARMER_GROUP"))
      .limit(1);

    return [
      {
        name: "catalogue:group_type seeded",
        ok: Number(groupTypeCount?.value ?? 0) >= groupTypes.length,
        detail:
          Number(groupTypeCount?.value ?? 0) >= groupTypes.length
            ? undefined
            : "Run npm run db:seed to seed group types.",
      },
      {
        name: "catalogue:group_membership_role seeded",
        ok: Number(roleCount?.value ?? 0) >= groupMembershipRoles.length,
        detail:
          Number(roleCount?.value ?? 0) >= groupMembershipRoles.length
            ? undefined
            : "Run npm run db:seed to seed membership roles.",
      },
      {
        name: "catalogue:farmer_group exists",
        ok: sampleType?.code === "FARMER_GROUP",
      },
    ];
  } finally {
    await closeDb();
  }
}

function checkServiceFactory(): SmokeResult[] {
  const service = createPartyGroupService();
  return [
    {
      name: "service:factory creates PartyGroupService",
      ok: service instanceof Object && typeof service.getGroupDashboard === "function",
    },
  ];
}

async function main() {
  const results: SmokeResult[] = [
    ...checkRequiredFiles(),
    ...checkValidators(),
    ...checkRules(),
    ...checkNavigation(),
    ...checkTabs(),
    ...checkServiceFactory(),
    ...(await checkCatalogues()),
  ];

  const failed = results.filter((result) => !result.ok);

  console.log("BP-002 / IP-008 Party Groups & Membership — Smoke Validation");
  console.log("=".repeat(60));

  for (const result of results) {
    const status = result.ok ? "PASS" : "FAIL";
    console.log(`${status}  ${result.name}`);
    if (result.detail) {
      console.log(`       ${result.detail}`);
    }
  }

  console.log("=".repeat(60));
  console.log(
    `Results: ${results.length - failed.length}/${results.length} passed`
  );

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
