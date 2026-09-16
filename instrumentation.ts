export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.RAILWAY_ENVIRONMENT_ID) {
    const { startOfficeWorker } = await import("@/lib/office/worker");
    startOfficeWorker();
  }
}
