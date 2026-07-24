/**
 * Purpose:
 * Repository for business_setup_progress persistence via Drizzle.
 *
 * WHY:
 * Progress audit fields (completed_by, completed_at, wizard_version) belong in
 * one persistence boundary consumed by BusinessSetupService.
 *
 * RATIONALE:
 * Repository keeps SQL/Drizzle details out of the service while preserving
 * atomic progress updates used for resume (BR-006, BR-009).
 *
 * Implementation Package:
 * IP-006 – Business Activation & Configuration Wizard
 */

import { eq } from "drizzle-orm";

import { getDb } from "@/db/client";
import { businessSetupProgress } from "@/db/schema/business-setup-progress";
import {
  SETUP_STEPS,
  SETUP_WIZARD_VERSION,
} from "@/modules/business/onboarding/constants";

export type SetupProgressRecord = typeof businessSetupProgress.$inferSelect;

export class BusinessSetupProgressRepository {
  /**
   * WHAT: Load progress for a business, creating a starter row when absent.
   * WHY: First visit to setup must always have a resumable progress record.
   */
  async ensureProgress(businessId: string): Promise<SetupProgressRecord> {
    const db = getDb();
    const [existing] = await db
      .select()
      .from(businessSetupProgress)
      .where(eq(businessSetupProgress.businessId, businessId))
      .limit(1);

    if (existing) {
      return existing;
    }

    const [created] = await db
      .insert(businessSetupProgress)
      .values({
        businessId,
        currentStep: SETUP_STEPS.WELCOME,
        completedSteps: [],
        wizardVersion: SETUP_WIZARD_VERSION,
      })
      .returning();

    return created;
  }

  async findByBusinessId(
    businessId: string
  ): Promise<SetupProgressRecord | null> {
    const db = getDb();
    const [existing] = await db
      .select()
      .from(businessSetupProgress)
      .where(eq(businessSetupProgress.businessId, businessId))
      .limit(1);

    return existing ?? null;
  }

  /**
   * WHAT: Persist step completion audit and resume pointer.
   * WHY: Supports BR-006 save-after-step and BR-009 resume.
   */
  async saveStepProgress(input: {
    businessId: string;
    currentStep: string;
    lastCompletedStep: string;
    completedSteps: string[];
    completedBy: string;
    completedAt: Date;
  }): Promise<void> {
    const db = getDb();

    await db
      .update(businessSetupProgress)
      .set({
        currentStep: input.currentStep,
        lastCompletedStep: input.lastCompletedStep,
        completedSteps: input.completedSteps,
        completedBy: input.completedBy,
        completedAt: input.completedAt,
        wizardVersion: SETUP_WIZARD_VERSION,
        updatedAt: new Date(),
      })
      .where(eq(businessSetupProgress.businessId, input.businessId));
  }

  /**
   * WHAT: Mark wizard activated with full step completion.
   * WHY: Activation finalizes progress for BR-012 DRAFT → ACTIVE.
   */
  async markActivated(input: {
    businessId: string;
    completedSteps: string[];
    completedBy: string;
    activatedAt: Date;
  }): Promise<void> {
    const db = getDb();

    await db
      .update(businessSetupProgress)
      .set({
        currentStep: SETUP_STEPS.COMPLETED,
        lastCompletedStep: SETUP_STEPS.REVIEW,
        completedSteps: input.completedSteps,
        completedBy: input.completedBy,
        completedAt: input.activatedAt,
        activatedAt: input.activatedAt,
        wizardVersion: SETUP_WIZARD_VERSION,
        updatedAt: new Date(),
      })
      .where(eq(businessSetupProgress.businessId, input.businessId));
  }

  /**
   * WHAT: Replace progress fields after country change resets currency steps.
   * WHY: Country edits invalidate currency completion (BR-002).
   */
  async replaceProgress(input: {
    businessId: string;
    currentStep: string;
    completedSteps: string[];
    lastCompletedStep: string | null;
    completedBy: string;
    completedAt: Date;
  }): Promise<void> {
    const db = getDb();
    const existing = await this.findByBusinessId(input.businessId);

    if (existing) {
      await db
        .update(businessSetupProgress)
        .set({
          currentStep: input.currentStep,
          completedSteps: input.completedSteps,
          lastCompletedStep: input.lastCompletedStep,
          completedBy: input.completedBy,
          completedAt: input.completedAt,
          wizardVersion: SETUP_WIZARD_VERSION,
          updatedAt: new Date(),
        })
        .where(eq(businessSetupProgress.businessId, input.businessId));
      return;
    }

    await db.insert(businessSetupProgress).values({
      businessId: input.businessId,
      currentStep: input.currentStep,
      completedSteps: input.completedSteps,
      lastCompletedStep: input.lastCompletedStep,
      completedBy: input.completedBy,
      completedAt: input.completedAt,
      wizardVersion: SETUP_WIZARD_VERSION,
    });
  }
}

export function createBusinessSetupProgressRepository(): BusinessSetupProgressRepository {
  return new BusinessSetupProgressRepository();
}
