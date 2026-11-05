import type {
  DownloadPlan, DownloadPlanInput, TransferPlanningPolicy,
} from "../types/download-plan.js";

export type {
  DownloadPlan, DownloadPlanInput, DownloadRequest, TransferPlanningPolicy,
} from "../types/download-plan.js";

export class DownloadPlanningError extends Error {
  readonly code: "invalid" | "overflow";
  constructor(code: "invalid" | "overflow", message: string);
}

export function createDownloadPlanner(policy: TransferPlanningPolicy): (input: DownloadPlanInput) => DownloadPlan;
