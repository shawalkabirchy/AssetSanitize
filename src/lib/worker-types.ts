import type { ImageInfo } from "./image-format";
import type { Inspection } from "./metadata";

export type FileStatus =
  | "queued"
  | "inspecting"
  | "ready"
  | "processing"
  | "verifying"
  | "done"
  | "failed"
  | "cancelled";
export type CanvasEncoding = { blob: Blob; width: number; height: number };
export type WorkerRequest = {
  jobId: string;
  operation: "inspect" | "clean";
  file: File;
  encoded?: CanvasEncoding;
};
export type WorkerReply =
  | { jobId: string; kind: "progress"; status: "processing" | "verifying" }
  | {
      jobId: string;
      kind: "inspected";
      info: ImageInfo;
      inspection: Inspection;
    }
  | {
      jobId: string;
      kind: "cleaned";
      blob: Blob;
      width: number;
      height: number;
    }
  | { jobId: string; kind: "failed"; code: string; message: string };
