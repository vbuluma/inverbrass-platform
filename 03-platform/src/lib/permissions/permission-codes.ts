import { permissions } from "@/db/seeds/permissions";

type PermissionCodeTree = {
  readonly [capability: string]: {
    readonly [resource: string]: {
      readonly [action: string]: string;
    };
  };
};

function buildPermissionCodes(): PermissionCodeTree {
  const tree: Record<string, Record<string, Record<string, string>>> = {};

  for (const permission of permissions) {
    tree[permission.module] ??= {};
    tree[permission.module][permission.resource] ??= {};
    tree[permission.module][permission.resource][permission.action] =
      permission.code;
  }

  return tree;
}

export const PermissionCodes = buildPermissionCodes();

export type PermissionCode =
  (typeof permissions)[number]["code"];

export const AllPermissionCodes = permissions.map(
  (permission) => permission.code
) as readonly PermissionCode[];
