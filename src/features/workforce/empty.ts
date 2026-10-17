import type { DemoData } from "./model";
export function emptyData(): DemoData {
  return {
    schemaVersion: 1,
    nextId: "1",
    workers: [],
    employments: [],
    stages: [],
    documents: [],
    entries: [],
    healthChecks: [],
    corrections: [],
    operationReceipts: {},
  };
}
