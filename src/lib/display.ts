import type { FileStatus } from "./worker-types";
export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KiB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MiB`;
}
export const STATUS_LABELS: Record<FileStatus, string> = {
  queued: "Queued",
  inspecting: "Inspecting…",
  ready: "Ready to clean",
  processing: "Cleaning…",
  verifying: "Verifying…",
  done: "Verified",
  failed: "Needs attention",
  cancelled: "Cancelled",
};
