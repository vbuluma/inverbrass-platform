/**
 * ENG-003k — Dynamic Business Terminology Engine.
 *
 * Resolves industry-native UI nouns for the entire platform presentation layer.
 * Database entities, routes, and API names remain unchanged.
 *
 * Navigation uses stable "Offerings". Industry-specific labels apply inside workspaces.
 */

import { resolveBundleLabel } from "@/core/industry-experience/bundle-terminology";
import {
  resolveClassificationLabel,
  resolveClassificationLabelSingular,
} from "@/core/industry-experience/classification-terminology";
import { resolveDigitalCatalogueLabel } from "@/core/industry-experience/digital-catalogue-terminology";
import {
  resolveEntityTerminology,
  type EntityTerminology,
} from "@/core/industry-experience/entity-terminology";
import {
  resolveOfferingCataloguePageTitle,
  resolveOfferingHubTitle,
  resolveOfferingNavLabel,
  resolveOfferingWorkspaceLabel,
} from "@/core/industry-experience/offering-terminology";
import {
  resolveOperationsTerminology,
  type OperationsTerminology,
} from "@/core/industry-experience/operations-terminology";
import { resolveVariantLabel } from "@/core/industry-experience/variant-terminology";

export type BusinessTerminology = {
  industryCode: string | null;
  navigation: {
    sidebarOfferings: string;
    breadcrumbOfferings: string;
    backToOfferings: string;
  };
  offerings: {
    /** Stable hub/module name — always "Offerings". */
    hubTitle: string;
    /** Industry workspace label for master records (Products, Medical Services, …). */
    plural: string;
    singular: string;
    /** @deprecated alias — use navigation.sidebarOfferings */
    navLabel: string;
    catalogueTitle: string;
    backLabel: string;
    createLabel: string;
    registerLabel: string;
    editLabel: string;
    searchPlaceholder: string;
    emptyTitle: string;
    assignedLabel: string;
    codeLabel: string;
    nameLabel: string;
    typeLabel: string;
    workspaceTitle: string;
  };
  categories: {
    plural: string;
    singular: string;
    assignLabel: string;
    primaryLabel: string;
    moduleName: string;
    createLabel: string;
    childLabel: string;
  };
  variants: {
    plural: string;
    singular: string;
    moduleName: string;
    registerLabel: string;
    workspaceTitle: string;
  };
  bundles: {
    plural: string;
    singular: string;
    moduleName: string;
    registerLabel: string;
    workspaceTitle: string;
  };
  digitalCatalogue: {
    label: string;
    dashboardTitle: string;
    publishedLabel: string;
  };
  attributes: {
    moduleName: string;
    panelTitle: string;
  };
  units: {
    moduleName: string;
  };
  lifecycle: {
    moduleName: string;
    panelTitle: string;
  };
  pricing: {
    moduleName: string;
    dashboardTitle: string;
  };
  governance: {
    moduleName: string;
    dashboardTitle: string;
  };
  analytics: {
    moduleName: string;
    dashboardTitle: string;
  };
  documents: {
    moduleName: string;
  };
  relationships: {
    moduleName: string;
    searchPlaceholder: string;
  };
  entities: EntityTerminology;
  operations: OperationsTerminology;
};

function singularizePluralLabel(label: string): string {
  if (label.endsWith("ies")) {
    return `${label.slice(0, -3)}y`;
  }
  if (label.endsWith("s")) {
    return label.slice(0, -1);
  }
  return label;
}

export function resolveBusinessTerminology(
  industryCode: string | null | undefined
): BusinessTerminology {
  const navOfferings = resolveOfferingNavLabel();
  const hubTitle = resolveOfferingHubTitle();
  const workspacePlural = resolveOfferingWorkspaceLabel(industryCode);
  const workspaceSingular = singularizePluralLabel(workspacePlural);
  const categoriesPlural = resolveClassificationLabel(industryCode);
  const categoriesSingular = resolveClassificationLabelSingular(industryCode);
  const variantsPlural = resolveVariantLabel(industryCode);
  const variantsSingular = singularizePluralLabel(variantsPlural);
  const bundlesPlural = resolveBundleLabel(industryCode);
  const bundlesSingular = singularizePluralLabel(bundlesPlural);
  const digitalLabel = resolveDigitalCatalogueLabel(industryCode);
  const entities = resolveEntityTerminology(industryCode);
  const operations = resolveOperationsTerminology(industryCode);

  return {
    industryCode: industryCode ?? null,
    navigation: {
      sidebarOfferings: navOfferings,
      breadcrumbOfferings: navOfferings,
      backToOfferings: `Back to ${navOfferings}`,
    },
    offerings: {
      hubTitle,
      plural: workspacePlural,
      singular: workspaceSingular,
      navLabel: navOfferings,
      catalogueTitle: resolveOfferingCataloguePageTitle(industryCode),
      backLabel: `Back to ${navOfferings.toLowerCase()}`,
      createLabel: `Create ${workspaceSingular}`,
      registerLabel: `Register ${workspaceSingular}`,
      editLabel: `Edit ${workspaceSingular}`,
      searchPlaceholder: `Search ${workspacePlural.toLowerCase()} by code or name…`,
      emptyTitle: `No ${workspacePlural} Yet`,
      assignedLabel: `Assigned ${workspacePlural}`,
      codeLabel: `${workspaceSingular} Code`,
      nameLabel: `${workspaceSingular} Name`,
      typeLabel: `${workspaceSingular} Type`,
      workspaceTitle: `${workspaceSingular} Workspace`,
    },
    categories: {
      plural: categoriesPlural,
      singular: categoriesSingular,
      assignLabel: `Assign ${categoriesSingular}`,
      primaryLabel: `Primary ${categoriesSingular}`,
      moduleName: "Catalogue Structure",
      createLabel: `Create ${categoriesSingular}`,
      childLabel: `Child ${categoriesPlural}`,
    },
    variants: {
      plural: variantsPlural,
      singular: variantsSingular,
      moduleName: variantsPlural,
      registerLabel: `Register ${variantsSingular}`,
      workspaceTitle: `${variantsSingular} Workspace`,
    },
    bundles: {
      plural: bundlesPlural,
      singular: bundlesSingular,
      moduleName: bundlesPlural,
      registerLabel: `Register ${bundlesSingular}`,
      workspaceTitle: `${bundlesSingular} Workspace`,
    },
    digitalCatalogue: {
      label: digitalLabel,
      dashboardTitle: `${digitalLabel} Catalogue`,
      publishedLabel: `Published ${workspacePlural}`,
    },
    attributes: {
      moduleName: `${workspaceSingular} Attributes`,
      panelTitle: "Attributes",
    },
    units: {
      moduleName: "Units of Measure",
    },
    lifecycle: {
      moduleName: "Lifecycle",
      panelTitle: "Lifecycle",
    },
    pricing: {
      moduleName: "Pricing",
      dashboardTitle: `${workspaceSingular} Pricing`,
    },
    governance: {
      moduleName: "Governance",
      dashboardTitle: `${workspaceSingular} Governance`,
    },
    analytics: {
      moduleName: "Analytics",
      dashboardTitle: `${workspaceSingular} Analytics`,
    },
    documents: {
      moduleName: "Documents",
    },
    relationships: {
      moduleName: "Relationships",
      searchPlaceholder: `Search ${workspacePlural.toLowerCase()}…`,
    },
    entities,
    operations,
  };
}

export const DEFAULT_BUSINESS_TERMINOLOGY =
  resolveBusinessTerminology(null);

/** Resolve terminology from onboarding/catalog industry selection. */
export function resolveBusinessTerminologyFromIndustryId(
  industries: Array<{ id: string; code: string }>,
  industryId: string | null | undefined
): BusinessTerminology {
  if (!industryId) {
    return DEFAULT_BUSINESS_TERMINOLOGY;
  }
  const industry = industries.find((row) => row.id === industryId);
  return resolveBusinessTerminology(industry?.code ?? null);
}
