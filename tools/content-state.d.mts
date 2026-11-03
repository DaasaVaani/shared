import type {
  ContentDataset, ContentErrorCode, ContentLimits, ContentObjectReceipt,
  ContentPlan, ContentReference, ContentTargetPhase, ExpectedContent,
} from "../types/content.js";

export type {
  ContentDataset, ContentErrorCode, ContentLimits, ContentObjectReceipt,
  ContentPlan, ContentReference, ContentState, ContentTargetPhase, ExpectedContent,
} from "../types/content.js";

export class ContentError extends Error {
  readonly code: ContentErrorCode;
  constructor(code: ContentErrorCode, message: string);
}

export function initialContent(epoch: string): ContentDataset;
export function assertContent(dataset: unknown, limits: ContentLimits): asserts dataset is ContentDataset;
export function assertContentPlan(plan: unknown): asserts plan is ContentPlan;
export function contentKey(reference: ContentReference): string;
export function contentLogicalBytes(dataset: ContentDataset): number;
export function claimContentWriter(dataset: ContentDataset, expected: ExpectedContent, newEpoch: string, limits: ContentLimits): ContentDataset;
export function beginContentTarget(dataset: ContentDataset, expected: ExpectedContent, plan: ContentPlan, limits: ContentLimits): ContentDataset;
export function setContentTargetPhase(dataset: ContentDataset, expected: ExpectedContent, phase: ContentTargetPhase, limits: ContentLimits): ContentDataset;
export function recordContentObject(dataset: ContentDataset, expected: ExpectedContent, receipt: ContentObjectReceipt, limits: ContentLimits): ContentDataset;
export function planContentActivation(dataset: ContentDataset, expected: ExpectedContent, limits: ContentLimits): ContentDataset;
export function removeContentRoots(dataset: ContentDataset, expected: ExpectedContent, limits: ContentLimits): ContentDataset;
export function dropContentTarget(dataset: ContentDataset, expected: ExpectedContent, limits: ContentLimits): ContentDataset;
export function collectContent(dataset: ContentDataset, expected: ExpectedContent, releasedRetired: readonly ContentReference[], limits: ContentLimits): ContentDataset;
