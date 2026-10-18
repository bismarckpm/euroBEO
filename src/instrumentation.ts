export async function register(): Promise<void> {
  if (process.env.NEXT_PHASE === "phase-production-build") {
    return;
  }
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return;
  }

  const { loadEnv } = await import("./lib/env");
  loadEnv();
}
