import type { ClosedCatalog, NormalizationTask } from "./schemas";

export type NormalizationRequest = {
  task: NormalizationTask;
  fragment: string;
  catalog: ClosedCatalog;
};

export type NormalizationProvider = {
  complete(request: NormalizationRequest): Promise<unknown>;
};

/** Un intento y un reintento. El último error se propaga. */
export async function withRetry<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch {
    return run();
  }
}
