/**
 * Purpose:
 * Pure rules for BP-009 IP-11 multi-rater performance reviews and supplier self-assessment.
 */

import {
  PERFORMANCE_EVALUATION_STATUSES,
  PERFORMANCE_EVALUATOR_TYPES,
} from "@/modules/procurement/constants";
import { PROCUREMENT_ERROR_CODES, ProcurementError } from "@/modules/procurement/errors";
import type {
  PerformanceEvaluationRatingInput,
  PerformanceEvaluationRecord,
  PerformanceMeasureRecord,
} from "@/modules/procurement/types";
import { computeCompositeScore } from "@/modules/procurement/services/performance-rules";

export function assertEvaluationScores(
  ratings: PerformanceEvaluationRatingInput[],
  measures: PerformanceMeasureRecord[]
) {
  if (ratings.length === 0) {
    throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVALID_EVALUATION_SCORE, undefined, 400);
  }
  const activeCodes = new Set(measures.filter((row) => row.isActive).map((row) => row.code));
  for (const rating of ratings) {
    if (!activeCodes.has(rating.measureCode)) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVALID_EVALUATION_SCORE, undefined, 400, {
        field: rating.measureCode,
      });
    }
    if (rating.score < 0 || rating.score > 100) {
      throw new ProcurementError(PROCUREMENT_ERROR_CODES.INVALID_EVALUATION_SCORE, undefined, 400, {
        field: rating.measureCode,
      });
    }
  }
}

export function computeEvaluationComposite(
  ratings: PerformanceEvaluationRatingInput[],
  measures: PerformanceMeasureRecord[]
): string {
  const measureByCode = new Map(measures.map((row) => [row.code, row]));
  const rows = ratings.map((rating) => {
    const measure = measureByCode.get(rating.measureCode);
    return {
      score: rating.score,
      weight: Number(measure?.weight ?? "1"),
    };
  });
  return computeCompositeScore(rows);
}

export function averageRatingsByMeasure(
  evaluations: PerformanceEvaluationRecord[]
): Map<string, number> {
  const totals = new Map<string, { sum: number; count: number }>();
  for (const evaluation of evaluations) {
    if (evaluation.status !== PERFORMANCE_EVALUATION_STATUSES.SUBMITTED) {
      continue;
    }
    for (const rating of evaluation.ratings) {
      const current = totals.get(rating.measureCode) ?? { sum: 0, count: 0 };
      current.sum += rating.score;
      current.count += 1;
      totals.set(rating.measureCode, current);
    }
  }
  const averaged = new Map<string, number>();
  for (const [code, row] of totals) {
    averaged.set(code, Number((row.sum / row.count).toFixed(2)));
  }
  return averaged;
}

export function selectEvaluationsForAverage(input: {
  evaluations: PerformanceEvaluationRecord[];
  includeSupplierSelfEvalInAverage: boolean;
}) {
  const internal = input.evaluations.filter(
    (row) =>
      row.evaluatorType === PERFORMANCE_EVALUATOR_TYPES.INTERNAL &&
      row.status === PERFORMANCE_EVALUATION_STATUSES.SUBMITTED
  );
  const supplier = input.evaluations.find(
    (row) =>
      row.evaluatorType === PERFORMANCE_EVALUATOR_TYPES.SUPPLIER &&
      row.status === PERFORMANCE_EVALUATION_STATUSES.SUBMITTED
  );
  const included = [...internal];
  if (input.includeSupplierSelfEvalInAverage && supplier) {
    included.push(supplier);
  }
  return { included, internal, supplier: supplier ?? null };
}

export function blendMeasureScore(transactionalScore: number, evaluationScore: number | null) {
  if (evaluationScore === null) {
    return transactionalScore;
  }
  return Number(((transactionalScore + evaluationScore) / 2).toFixed(2));
}

export function buildEvaluationSummary(input: {
  evaluations: PerformanceEvaluationRecord[];
  includeSupplierSelfEvalInAverage: boolean;
  measures: PerformanceMeasureRecord[];
}) {
  const { included, internal, supplier } = selectEvaluationsForAverage({
    evaluations: input.evaluations,
    includeSupplierSelfEvalInAverage: input.includeSupplierSelfEvalInAverage,
  });
  const internalAverage = averageRatingsByMeasure(internal);
  const blendedAverage = averageRatingsByMeasure(included);
  const internalComposite =
    internal.length > 0
      ? computeEvaluationComposite(
          [...internalAverage.entries()].map(([measureCode, score]) => ({ measureCode, score })),
          input.measures
        )
      : null;
  const blendedComposite =
    included.length > 0
      ? computeEvaluationComposite(
          [...blendedAverage.entries()].map(([measureCode, score]) => ({ measureCode, score })),
          input.measures
        )
      : null;
  return {
    internalEvaluatorCount: internal.length,
    internalAverageComposite: internalComposite,
    supplierEvaluationSubmitted: Boolean(supplier),
    supplierCompositeScore: supplier?.compositeScore ?? null,
    supplierIncludedInAverage: input.includeSupplierSelfEvalInAverage && Boolean(supplier),
    blendedEvaluatorCount: included.length,
    blendedComposite,
    averagedByMeasure: blendedAverage,
  };
}

export function assertSupplierSelfEvalRequired(input: {
  supplierSelfEvalRequired: boolean;
  evaluations: PerformanceEvaluationRecord[];
}) {
  if (!input.supplierSelfEvalRequired) {
    return;
  }
  const supplierSubmitted = input.evaluations.some(
    (row) =>
      row.evaluatorType === PERFORMANCE_EVALUATOR_TYPES.SUPPLIER &&
      row.status === PERFORMANCE_EVALUATION_STATUSES.SUBMITTED
  );
  if (!supplierSubmitted) {
    throw new ProcurementError(PROCUREMENT_ERROR_CODES.EVALUATION_SUPPLIER_REQUIRED, undefined, 409);
  }
}
