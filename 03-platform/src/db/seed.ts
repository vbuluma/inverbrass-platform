/**
 * Purpose:
 * Seed all platform reference catalogues required for BP-001 onboarding.
 *
 * Connection policy:
 * Uses a single postgres client and always closes it so seed does not
 * contribute to EMAXCONNSESSION on Supabase session poolers.
 */

import "@/lib/env/load-env";

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { createPostgresOptions } from "@/db/client";
import {
  formatSeedSummary,
  seedIamReferenceData,
} from "@/db/seeds/iam-seed";
import { seedBusinessMembershipStatuses } from "@/db/seeds/business-membership-statuses-seed";
import { seedBusinessTypes } from "@/db/seeds/business-types-seed";
import { seedCountries } from "@/db/seeds/countries-seed";
import { seedCurrencies } from "@/db/seeds/currencies-seed";
import { seedIndustries } from "@/db/seeds/industries-seed";
import { seedLanguages } from "@/db/seeds/languages-seed";
import { seedOrganizationTypes } from "@/db/seeds/organization-types-seed";
import { seedPartyStatuses } from "@/db/seeds/party-statuses-seed";
import { seedPartyTypes } from "@/db/seeds/party-types-seed";
import { seedRoleTypes } from "@/db/seeds/role-types-seed";
import { seedContactTypes } from "@/db/seeds/contact-types-seed";
import { seedAddressTypes } from "@/db/seeds/address-types-seed";
import { seedOrganizationalUnitTypes } from "@/db/seeds/organizational-unit-types-seed";
import { seedRelationshipTypes } from "@/db/seeds/relationship-types-seed";
import { seedDocumentTypes } from "@/db/seeds/document-types-seed";
import { seedGroupMembershipRoles } from "@/db/seeds/group-membership-roles-seed";
import { seedGroupTypes } from "@/db/seeds/group-types-seed";
import { seedConsentSources } from "@/db/seeds/consent-sources-seed";
import { seedRegulatoryDocumentRequirements } from "@/db/seeds/regulatory-document-requirements-seed";
import { seedIdentifierTypes } from "@/db/seeds/identifier-types-seed";
import { seedRequiredIdentifiers } from "@/db/seeds/required-identifiers-seed";
import { seedVerificationMethods } from "@/db/seeds/verification-methods-seed";
import { seedSecurityQuestions } from "@/db/seeds/security-questions-seed";
import { seedProductTypes } from "@/db/seeds/product-types-seed";
import { seedProductStatuses } from "@/db/seeds/product-statuses-seed";
import { seedProductClassificationTypes } from "@/db/seeds/product-classification-types-seed";
import { seedPricingMethods } from "@/db/seeds/pricing-methods-seed";
import { seedOfferingGovernanceReferenceData } from "@/db/seeds/offering-governance-defaults-seed";
import { seedCrmTypes } from "@/db/seeds/crm-types-seed";
import { seedCrmStatuses } from "@/db/seeds/crm-statuses-seed";
import { seedLeadDisqualificationReasons } from "@/db/seeds/lead-disqualification-reasons-seed";
import { seedLeadSources } from "@/db/seeds/lead-sources-seed";
import { seedLeadStatuses } from "@/db/seeds/lead-statuses-seed";
import { seedOpportunityReference } from "@/db/seeds/opportunity-reference-seed";
import { seedAccountReference } from "@/db/seeds/account-reference-seed";
import { seedPaymentCatalogues } from "@/db/seeds/payment-catalogue-seed";
import { seedInvoicePaymentTerms } from "@/db/seeds/invoice-payment-terms-seed";
import { seedDocumentNumberingPolicies } from "@/db/seeds/document-numbering-policy-seed";

async function runSeed() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error("DATABASE_URL is missing.");
  }

  console.log("Connecting to database (single session client)...");

  const sql = postgres(connectionString, createPostgresOptions());
  const db = drizzle(sql);

  try {
    console.log("Seeding IAM reference data...");
    const iamResults = await seedIamReferenceData(db);
    console.log("IAM seed complete.");
    console.log(formatSeedSummary(iamResults));

    console.log("Seeding business membership statuses...");
    const membershipStatusResults = await seedBusinessMembershipStatuses(db);
    console.log(
      `membershipStatuses: inserted=${membershipStatusResults.inserted}, updated=${membershipStatusResults.updated}, skipped=${membershipStatusResults.skipped}`
    );

    console.log("Seeding industries...");
    const industryResults = await seedIndustries(db);
    console.log(
      `industries: inserted=${industryResults.inserted}, updated=${industryResults.updated}, skipped=${industryResults.skipped}`
    );

    console.log("Seeding business types...");
    const businessTypeResults = await seedBusinessTypes(db);
    console.log(
      `businessTypes: inserted=${businessTypeResults.inserted}, updated=${businessTypeResults.updated}, skipped=${businessTypeResults.skipped}`
    );

    console.log("Seeding countries...");
    const countryResults = await seedCountries(db);
    console.log(
      `countries: inserted=${countryResults.inserted}, updated=${countryResults.updated}, skipped=${countryResults.skipped}`
    );

    console.log("Seeding security question catalog...");
    const securityQuestionResults = await seedSecurityQuestions(db);
    console.log(
      `securityQuestions: inserted=${securityQuestionResults.inserted}, updated=${securityQuestionResults.updated}, skipped=${securityQuestionResults.skipped}`
    );

    console.log("Seeding currency catalog...");
    const currencyResults = await seedCurrencies(db);
    console.log(
      `currencies: inserted=${currencyResults.inserted}, updated=${currencyResults.updated}, skipped=${currencyResults.skipped}`
    );

    console.log("Seeding party types...");
    const partyTypeResults = await seedPartyTypes(db);
    console.log(
      `partyTypes: inserted=${partyTypeResults.inserted}, updated=${partyTypeResults.updated}, skipped=${partyTypeResults.skipped}`
    );

    console.log("Seeding party statuses...");
    const partyStatusResults = await seedPartyStatuses(db);
    console.log(
      `partyStatuses: inserted=${partyStatusResults.inserted}, updated=${partyStatusResults.updated}, skipped=${partyStatusResults.skipped}`
    );

    console.log("Seeding organization types...");
    const organizationTypeResults = await seedOrganizationTypes(db);
    console.log(
      `organizationTypes: inserted=${organizationTypeResults.inserted}, updated=${organizationTypeResults.updated}, skipped=${organizationTypeResults.skipped}`
    );

    console.log("Seeding languages...");
    const languageResults = await seedLanguages(db);
    console.log(
      `languages: inserted=${languageResults.inserted}, updated=${languageResults.updated}, skipped=${languageResults.skipped}`
    );

    console.log("Seeding party role types...");
    const roleTypeResults = await seedRoleTypes(db);
    console.log(
      `roleTypes: inserted=${roleTypeResults.inserted}, updated=${roleTypeResults.updated}, skipped=${roleTypeResults.skipped}`
    );

    console.log("Seeding contact types...");
    const contactTypeResults = await seedContactTypes(db);
    console.log(
      `contactTypes: inserted=${contactTypeResults.inserted}, updated=${contactTypeResults.updated}, skipped=${contactTypeResults.skipped}`
    );

    console.log("Seeding address types...");
    const addressTypeResults = await seedAddressTypes(db);
    console.log(
      `addressTypes: inserted=${addressTypeResults.inserted}, updated=${addressTypeResults.updated}, skipped=${addressTypeResults.skipped}`
    );

    console.log("Seeding relationship types...");
    const relationshipTypeResults = await seedRelationshipTypes(db);
    console.log(
      `relationshipTypes: inserted=${relationshipTypeResults.inserted}, updated=${relationshipTypeResults.updated}, skipped=${relationshipTypeResults.skipped}`
    );

    console.log("Seeding organizational unit types...");
    const organizationalUnitTypeResults = await seedOrganizationalUnitTypes(db);
    console.log(
      `organizationalUnitTypes: inserted=${organizationalUnitTypeResults.inserted}, updated=${organizationalUnitTypeResults.updated}, skipped=${organizationalUnitTypeResults.skipped}`
    );

    console.log("Seeding group types...");
    const groupTypeResults = await seedGroupTypes(db);
    console.log(
      `groupTypes: inserted=${groupTypeResults.inserted}, updated=${groupTypeResults.updated}, skipped=${groupTypeResults.skipped}`
    );

    console.log("Seeding group membership roles...");
    const groupMembershipRoleResults = await seedGroupMembershipRoles(db);
    console.log(
      `groupMembershipRoles: inserted=${groupMembershipRoleResults.inserted}, updated=${groupMembershipRoleResults.updated}, skipped=${groupMembershipRoleResults.skipped}`
    );

    console.log("Seeding document types...");
    const documentTypeResults = await seedDocumentTypes(db);
    console.log(
      `documentTypes: inserted=${documentTypeResults.inserted}, updated=${documentTypeResults.updated}, skipped=${documentTypeResults.skipped}`
    );

    console.log("Seeding ENG-003b regulatory document requirements...");
    const regulatoryResults = await seedRegulatoryDocumentRequirements(db);
    console.log(
      `requiredDocument: inserted=${regulatoryResults.inserted}, updated=${regulatoryResults.updated}, skipped=${regulatoryResults.skipped}`
    );

    console.log("Seeding identifier types...");
    const identifierTypeResults = await seedIdentifierTypes(db);
    console.log(
      `identifierTypes: inserted=${identifierTypeResults.inserted}, updated=${identifierTypeResults.updated}, skipped=${identifierTypeResults.skipped}`
    );

    console.log("Seeding ENG-003b required identifiers...");
    const requiredIdentifierResults = await seedRequiredIdentifiers(db);
    console.log(
      `requiredIdentifier: inserted=${requiredIdentifierResults.inserted}, updated=${requiredIdentifierResults.updated}, skipped=${requiredIdentifierResults.skipped}`
    );

    console.log("Seeding ENG-003b consent sources...");
    const consentSourceResults = await seedConsentSources(db);
    console.log(
      `consentSources: inserted=${consentSourceResults.inserted}, updated=${consentSourceResults.updated}, skipped=${consentSourceResults.skipped}`
    );

    console.log("Seeding verification methods...");
    const verificationMethodResults = await seedVerificationMethods(db);
    console.log(
      `verificationMethods: inserted=${verificationMethodResults.inserted}, updated=${verificationMethodResults.updated}, skipped=${verificationMethodResults.skipped}`
    );

    console.log("Seeding product types...");
    const productTypeResults = await seedProductTypes(db);
    console.log(
      `productTypes: inserted=${productTypeResults.inserted}, updated=${productTypeResults.updated}, skipped=${productTypeResults.skipped}`
    );

    console.log("Seeding product statuses...");
    const productStatusResults = await seedProductStatuses(db);
    console.log(
      `productStatuses: inserted=${productStatusResults.inserted}, updated=${productStatusResults.updated}, skipped=${productStatusResults.skipped}`
    );

    console.log("Seeding product classification types...");
    const classificationTypeResults = await seedProductClassificationTypes(db);
    console.log(
      `productClassificationTypes: inserted=${classificationTypeResults.inserted}, updated=${classificationTypeResults.updated}, skipped=${classificationTypeResults.skipped}`
    );

    console.log("Seeding pricing methods...");
    const pricingMethodResults = await seedPricingMethods(
      db as unknown as Parameters<typeof seedPricingMethods>[0]
    );
    console.log(
      `pricingMethods: inserted=${pricingMethodResults.inserted}, skipped=${pricingMethodResults.skipped}`
    );

    console.log("Seeding offering governance statuses...");
    await seedOfferingGovernanceReferenceData(
      db as unknown as Parameters<typeof seedOfferingGovernanceReferenceData>[0]
    );
    console.log("offeringGovernanceStatuses: ensured");

    console.log("Seeding CRM types...");
    const crmTypeResults = await seedCrmTypes(db);
    console.log(
      `crmTypes: inserted=${crmTypeResults.inserted}, updated=${crmTypeResults.updated}, skipped=${crmTypeResults.skipped}`
    );

    console.log("Seeding CRM statuses...");
    const crmStatusResults = await seedCrmStatuses(db);
    console.log(
      `crmStatuses: inserted=${crmStatusResults.inserted}, updated=${crmStatusResults.updated}, skipped=${crmStatusResults.skipped}`
    );

    console.log("Seeding lead statuses...");
    const leadStatusResults = await seedLeadStatuses(db);
    console.log(
      `leadStatuses: inserted=${leadStatusResults.inserted}, updated=${leadStatusResults.updated}, skipped=${leadStatusResults.skipped}`
    );

    console.log("Seeding lead sources...");
    const leadSourceResults = await seedLeadSources(db);
    console.log(
      `leadSources: inserted=${leadSourceResults.inserted}, updated=${leadSourceResults.updated}, skipped=${leadSourceResults.skipped}`
    );

    console.log("Seeding lead disqualification reasons...");
    const leadReasonResults = await seedLeadDisqualificationReasons(db);
    console.log(
      `leadDisqualificationReasons: inserted=${leadReasonResults.inserted}, updated=${leadReasonResults.updated}, skipped=${leadReasonResults.skipped}`
    );

    console.log("Seeding opportunity reference data...");
    const opportunityRefResults = await seedOpportunityReference(db);
    console.log(
      `opportunityReference: inserted=${opportunityRefResults.inserted}, updated=${opportunityRefResults.updated}, skipped=${opportunityRefResults.skipped}`
    );

    console.log("Seeding account reference data...");
    const accountRefResults = await seedAccountReference(db);
    console.log(
      `accountReference: inserted=${accountRefResults.inserted}, updated=${accountRefResults.updated}, skipped=${accountRefResults.skipped}`
    );

    console.log("Seeding payment catalogues...");
    const paymentCatalogueResults = await seedPaymentCatalogues(db);
    console.log(
      `paymentMethods: inserted=${paymentCatalogueResults.methods.inserted}, updated=${paymentCatalogueResults.methods.updated}, skipped=${paymentCatalogueResults.methods.skipped}`
    );
    console.log(
      `paymentNetworks: inserted=${paymentCatalogueResults.networks.inserted}, updated=${paymentCatalogueResults.networks.updated}, skipped=${paymentCatalogueResults.networks.skipped}`
    );
    console.log(
      `paymentProviders: inserted=${paymentCatalogueResults.providers.inserted}, updated=${paymentCatalogueResults.providers.updated}, skipped=${paymentCatalogueResults.providers.skipped}`
    );
    console.log(
      `paymentChannels: inserted=${paymentCatalogueResults.channels.inserted}, updated=${paymentCatalogueResults.channels.updated}, skipped=${paymentCatalogueResults.channels.skipped}`
    );
    console.log(
      `paymentChannelCapabilities: inserted=${paymentCatalogueResults.capabilities.inserted}, updated=${paymentCatalogueResults.capabilities.updated}, skipped=${paymentCatalogueResults.capabilities.skipped}`
    );

    console.log("Seeding invoice payment terms...");
    const invoiceTermResults = await seedInvoicePaymentTerms(db);
    console.log(
      `invoicePaymentTerms: inserted=${invoiceTermResults.inserted}, updated=${invoiceTermResults.updated}, skipped=${invoiceTermResults.skipped}`
    );

    console.log("Seeding document numbering policies...");
    const numberingResults = await seedDocumentNumberingPolicies(db);
    console.log(
      `documentNumberingPolicies: inserted=${numberingResults.inserted}, updated=${numberingResults.updated}, skipped=${numberingResults.skipped}`
    );

    console.log("✅ Seed completed.");
  } catch (error) {
    console.error("Seed failed:");
    console.error(error);
    process.exitCode = 1;
  } finally {
    await sql.end({ timeout: 5 });
  }
}

runSeed();
