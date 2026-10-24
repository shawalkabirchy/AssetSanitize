"use client";

import { useEffect, useRef, useState } from "react";
import { admitFiles, ImageError, type ImageInfo } from "@/lib/image-format";
import type { Inspection } from "@/lib/metadata";
import type {
  FileStatus,
  WorkerReply,
  WorkerRequest,
} from "@/lib/worker-types";
import { encodeOnCanvas } from "@/lib/canvas-fallback";

export type ImageEntry = {
  id: string;
  file: File;
  originalName: string;
  inputBytes: number;
  outputName: string;
  status: FileStatus;
  info?: ImageInfo;
  inspection?: Inspection;
  inspectionOutcome?: Inspection["outcome"] | "unable-to-inspect";
  sourceUrl?: string;
  resultBlob?: Blob;
  resultUrl?: string;
  resultBytes?: number;
  resultWidth?: number;
  resultHeight?: number;
  errorCode?: string;
  error?: string;
};

function release(entry: ImageEntry) {
  if (entry.sourceUrl) URL.revokeObjectURL(entry.sourceUrl);
  if (entry.resultUrl) URL.revokeObjectURL(entry.resultUrl);
}

export function useImageQueue() {
  const [entries, setEntries] = useState<ImageEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const current = useRef<ImageEntry[]>([]);
  const working = useRef(false);
  const generation = useRef(0);
  const sequence = useRef(0);
  const worker = useRef<Worker | null>(null);
  const abortJob = useRef<(() => void) | null>(null);

  function change(update: (entries: ImageEntry[]) => ImageEntry[]) {
    current.current = update(current.current);
    setEntries(current.current);
  }
  function patch(id: string, update: Partial<ImageEntry>) {
    change((items) =>
      items.map((entry) => (entry.id === id ? { ...entry, ...update } : entry)),
    );
  }

  function request(
    entry: ImageEntry,
    operation: WorkerRequest["operation"],
    token: number,
    encoded?: WorkerRequest["encoded"],
  ): Promise<WorkerReply> {
    return new Promise((resolve, reject) => {
      const jobId = crypto.randomUUID();
      const instance = new Worker(
        new URL("../workers/image.worker.ts", import.meta.url),
        { type: "module" },
      );
      worker.current = instance;
      const finish = () => {
        clearTimeout(timeout);
        instance.terminate();
        if (worker.current === instance) {
          worker.current = null;
          abortJob.current = null;
        }
      };
      const timeout = setTimeout(() => {
        finish();
        reject(
          new ImageError(
            "PROCESSING_TIMEOUT",
            "This image took too long to process. Try a smaller file.",
          ),
        );
      }, 120_000);
      abortJob.current = () => {
        finish();
        reject(new ImageError("CANCELLED", "Cancelled"));
      };
      instance.onmessage = ({ data }: MessageEvent<WorkerReply>) => {
        if (data.jobId !== jobId || token !== generation.current) return;
        if (data.kind === "progress") patch(entry.id, { status: data.status });
        else {
          finish();
          resolve(data);
        }
      };
      instance.onerror = (event) => {
        event.preventDefault();
        finish();
        reject(
          new ImageError(
            "PROCESSING_FAILED",
            "The processing worker stopped. Retry or choose a smaller image.",
          ),
        );
      };
      try {
        instance.postMessage({
          jobId,
          operation,
          file: entry.file,
          encoded,
        } satisfies WorkerRequest);
      } catch {
        finish();
        reject(
          new ImageError(
            "PROCESSING_FAILED",
            "This image could not be passed to the local worker.",
          ),
        );
      }
    });
  }

  async function run(ids: string[], operation: WorkerRequest["operation"]) {
    if (working.current || !ids.length) return;
    working.current = true;
    setBusy(true);
    setNotice("");
    const token = ++generation.current;
    try {
      for (const id of ids) {
        if (token !== generation.current) break;
        const entry = current.current.find((entry) => entry.id === id);
        if (!entry) continue;
        patch(id, {
          status: operation === "inspect" ? "inspecting" : "processing",
          error: undefined,
          errorCode: undefined,
        });
        try {
          // WebKit builds without OffscreenCanvas still use the worker for inspection and final verification.
          const encoded =
            operation === "clean" && typeof OffscreenCanvas !== "function"
              ? await encodeOnCanvas(entry.file)
              : undefined;
          if (token !== generation.current) break;
          const response = await request(entry, operation, token, encoded);
          if (token !== generation.current) break;
          if (response.kind === "failed")
            throw new ImageError(response.code, response.message);
          if (response.kind === "inspected") {
            patch(id, {
              status: "ready",
              info: response.info,
              inspection: response.inspection,
              inspectionOutcome: response.inspection.outcome,
              sourceUrl: URL.createObjectURL(entry.file),
            });
          } else if (response.kind === "cleaned") {
            patch(id, {
              status: "done",
              resultBlob: response.blob,
              resultBytes: response.blob.size,
              resultUrl: URL.createObjectURL(response.blob),
              resultWidth: response.width,
              resultHeight: response.height,
            });
          }
        } catch (error) {
          if (token !== generation.current) break;
          const known = error instanceof ImageError;
          patch(id, {
            status: "failed",
            errorCode: known ? error.code : "PROCESSING_FAILED",
            error: known
              ? error.message
              : "Could not process this image. Retry or remove it.",
            ...(operation === "inspect"
              ? { inspectionOutcome: "unable-to-inspect" as const }
              : {}),
          });
        }
      }
    } finally {
      if (token === generation.current) {
        working.current = false;
        setBusy(false);
      }
    }
  }

  function add(files: File[]) {
    if (working.current) return;
    const { accepted, rejected } = admitFiles(
      current.current.map((entry) => entry.file),
      files,
    );
    const additions = accepted.map((file) => ({
      id: crypto.randomUUID(),
      file,
      originalName: file.name,
      inputBytes: file.size,
      outputName: `cleaned-${String(++sequence.current).padStart(2, "0")}.png`,
      status: "queued" as const,
    }));
    change((items) => [...items, ...additions]);
    const promise = run(
      additions.map((entry) => entry.id),
      "inspect",
    );
    setNotice(rejected.join(" "));
    return promise;
  }
  function clean() {
    return run(
      current.current
        .filter((entry) => entry.status === "ready")
        .map((entry) => entry.id),
      "clean",
    );
  }
  function cancel() {
    generation.current++;
    abortJob.current?.();
    worker.current?.terminate();
    worker.current = null;
    working.current = false;
    setBusy(false);
    change((items) =>
      items.map((entry) =>
        ["queued", "inspecting", "ready", "processing", "verifying"].includes(
          entry.status,
        )
          ? { ...entry, status: "cancelled" }
          : entry,
      ),
    );
    setNotice(
      "Processing cancelled. Verified results are still available. Retry a cancelled image to continue.",
    );
  }
  function clear() {
    cancel();
    current.current.forEach(release);
    change(() => []);
    sequence.current = 0;
    setNotice("Workspace cleared. Your files and results have been released.");
  }
  function remove(id: string) {
    if (working.current) return;
    const entry = current.current.find((entry) => entry.id === id);
    if (entry) release(entry);
    change((items) => items.filter((entry) => entry.id !== id));
  }
  async function retry(id: string) {
    if (working.current) return;
    const entry = current.current.find((entry) => entry.id === id);
    if (!entry) return;
    const wasInspected = !!entry.inspection;
    release(entry);
    patch(id, {
      status: "queued",
      sourceUrl: undefined,
      resultUrl: undefined,
      resultBlob: undefined,
      resultBytes: undefined,
      inspection: undefined,
      inspectionOutcome: undefined,
    });
    await run([id], "inspect");
    if (
      wasInspected &&
      current.current.find((entry) => entry.id === id)?.status === "ready"
    )
      await run([id], "clean");
  }

  useEffect(
    () => () => {
      generation.current++;
      abortJob.current?.();
      worker.current?.terminate();
      current.current.forEach(release);
    },
    [],
  );

  return {
    entries,
    busy,
    notice,
    setNotice,
    add,
    clean,
    cancel,
    clear,
    remove,
    retry,
  };
}
