import "server-only";
export function activeChecklistVersion() {
  return process.env.CASE_POLICY_VERSION ?? "INTERNAL-1";
}
export function employerRecordsResults() {
  return process.env.EXTERNAL_RESULTS_BY_EMPLOYER !== "false";
}
