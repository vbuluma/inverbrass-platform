import { and, eq, isNull } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";

import { permissionAction } from "@/db/schema/permission-action";
import { permission } from "@/db/schema/permission";
import { role } from "@/db/schema/role";
import { rolePermission } from "@/db/schema/role-permission";
import { permissionActions } from "@/db/seeds/permission-actions";
import {
  getPermissionActionCode,
  permissions,
} from "@/db/seeds/permissions";
import { platformRoles } from "@/db/seeds/platform-roles";
import { rolePermissionMatrix } from "@/db/seeds/role-permissions";

type SeedCounts = {
  inserted: number;
  updated: number;
  skipped: number;
};

function emptyCounts(): SeedCounts {
  return { inserted: 0, updated: 0, skipped: 0 };
}

export async function seedPermissionActions(
  db: PostgresJsDatabase
): Promise<SeedCounts> {
  const counts = emptyCounts();

  for (const row of permissionActions) {
    const [existing] = await db
      .select({ id: permissionAction.id })
      .from(permissionAction)
      .where(eq(permissionAction.code, row.code))
      .limit(1);

    if (!existing) {
      await db.insert(permissionAction).values(row);
      counts.inserted += 1;
      continue;
    }

    await db
      .update(permissionAction)
      .set({
        name: row.name,
        description: row.description,
        displayOrder: row.displayOrder,
        isActive: row.isActive,
        updatedAt: new Date(),
      })
      .where(eq(permissionAction.id, existing.id));

    counts.updated += 1;
  }

  return counts;
}

export async function seedPermissions(
  db: PostgresJsDatabase
): Promise<SeedCounts> {
  const counts = emptyCounts();

  const actionRows = await db
    .select({
      id: permissionAction.id,
      code: permissionAction.code,
    })
    .from(permissionAction);

  const actionIdByCode = new Map(
    actionRows.map((action) => [action.code, action.id])
  );

  for (const row of permissions) {
    const actionCode = getPermissionActionCode(row);
    const permissionActionId = actionIdByCode.get(actionCode);

    if (!permissionActionId) {
      throw new Error(
        `Missing permission action "${actionCode}" required by "${row.code}".`
      );
    }

    const [existing] = await db
      .select({ id: permission.id })
      .from(permission)
      .where(eq(permission.code, row.code))
      .limit(1);

    const values = {
      code: row.code,
      name: row.name,
      module: row.module,
      resource: row.resource,
      permissionActionId,
      description: row.description,
      displayOrder: row.displayOrder,
      isActive: row.isActive,
    };

    if (!existing) {
      await db.insert(permission).values(values);
      counts.inserted += 1;
      continue;
    }

    await db
      .update(permission)
      .set({
        ...values,
        updatedAt: new Date(),
      })
      .where(eq(permission.id, existing.id));

    counts.updated += 1;
  }

  return counts;
}

export async function seedPlatformRoles(
  db: PostgresJsDatabase
): Promise<SeedCounts> {
  const counts = emptyCounts();

  for (const row of platformRoles) {
    const [existing] = await db
      .select({ id: role.id })
      .from(role)
      .where(and(eq(role.code, row.code), isNull(role.businessId)))
      .limit(1);

    const values = {
      businessId: null,
      isSystem: row.isSystem,
      code: row.code,
      name: row.name,
      description: row.description,
      displayOrder: row.displayOrder,
      isActive: row.isActive,
    };

    if (!existing) {
      await db.insert(role).values(values);
      counts.inserted += 1;
      continue;
    }

    await db
      .update(role)
      .set({
        ...values,
        updatedAt: new Date(),
      })
      .where(eq(role.id, existing.id));

    counts.updated += 1;
  }

  return counts;
}

export async function seedRolePermissions(
  db: PostgresJsDatabase
): Promise<SeedCounts> {
  const counts = emptyCounts();

  const roleRows = await db
    .select({ id: role.id, code: role.code })
    .from(role)
    .where(isNull(role.businessId));

  const permissionRows = await db
    .select({ id: permission.id, code: permission.code })
    .from(permission);

  const roleIdByCode = new Map(roleRows.map((item) => [item.code, item.id]));
  const permissionIdByCode = new Map(
    permissionRows.map((item) => [item.code, item.id])
  );

  for (const [roleCode, permissionCodes] of Object.entries(
    rolePermissionMatrix
  )) {
    const roleId = roleIdByCode.get(roleCode);

    if (!roleId) {
      throw new Error(`Missing platform role "${roleCode}" for role permissions.`);
    }

    for (const permissionCode of permissionCodes) {
      const permissionId = permissionIdByCode.get(permissionCode);

      if (!permissionId) {
        throw new Error(
          `Missing permission "${permissionCode}" required by role "${roleCode}".`
        );
      }

      const [existing] = await db
        .select({ id: rolePermission.id })
        .from(rolePermission)
        .where(
          and(
            eq(rolePermission.roleId, roleId),
            eq(rolePermission.permissionId, permissionId)
          )
        )
        .limit(1);

      if (existing) {
        counts.skipped += 1;
        continue;
      }

      await db.insert(rolePermission).values({
        roleId,
        permissionId,
        grantedBy: null,
      });

      counts.inserted += 1;
    }
  }

  return counts;
}

export async function seedIamReferenceData(
  db: PostgresJsDatabase
): Promise<Record<string, SeedCounts>> {
  const results: Record<string, SeedCounts> = {};

  results.permissionActions = await seedPermissionActions(db);
  results.permissions = await seedPermissions(db);
  results.platformRoles = await seedPlatformRoles(db);
  results.rolePermissions = await seedRolePermissions(db);

  return results;
}

export function formatSeedSummary(
  results: Record<string, SeedCounts>
): string {
  return Object.entries(results)
    .map(([name, counts]) => {
      return `${name}: inserted=${counts.inserted}, updated=${counts.updated}, skipped=${counts.skipped}`;
    })
    .join("\n");
}
