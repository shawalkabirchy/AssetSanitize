"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  ArrowUpFromLine,
  Check,
  CircleAlert,
  CodeXml,
  FileImage,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  X,
} from "lucide-react";
import { cn } from "cn";
import { useImageQueue, type QueueProgress } from "@/hooks/use-image-queue";
import { formatBytes, plural, STATUS_LABELS } from "@/lib/display";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ImageInspector } from "./image-inspector";
import { Results } from "./results";

const SOURCE_URL = "https://github.com/shawalkabirchy/AssetSanitize";

/** The favicon's aperture mark, so the header and the browser tab match. */
function Logo() {
  return (
    <svg viewBox="0 0 64 64" aria-hidden="true">
      <rect width="64" height="64" rx="15" fill="var(--primary)" />
      <g
        fill="none"
        stroke="#fff"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="32" cy="32" r="20" />
        <path d="m32 12 11 20-11 20-11-20Zm-18 10h23m13 20H27M21 32l11-20m11 20L32 52" />
      </g>
    </svg>
  );
}

function progressLabel(progress: QueueProgress | null) {
  if (!progress) return "Working…";
  const verb = progress.operation === "clean" ? "Cleaning" : "Inspecting";
  if (progress.total < 2) return `${verb}…`;
  return `${verb} ${Math.min(progress.completed + 1, progress.total)} of ${progress.total}…`;
}

export function Workspace() {
  const queue = useImageQueue();
  const input = useRef<HTMLInputElement>(null);
  const chooseButton = useRef<HTMLButtonElement>(null);
  const results = useRef<HTMLElement>(null);
  const sampleRequest = useRef<AbortController | null>(null);
  const receiveFiles = useRef<(files: File[]) => void>(() => {});
  const [selectedId, setSelectedId] = useState<string>();
  const [dragging, setDragging] = useState(false);
  const [sampleLoading, setSampleLoading] = useState(false);
  const [supported, setSupported] = useState(true);
  const [revealResults, setRevealResults] = useState(false);
  const hasEntries = queue.entries.length > 0;
  const selected =
    queue.entries.find((entry) => entry.id === selectedId) ?? queue.entries[0];
  const ready = queue.entries.filter(
    (entry) => entry.status === "ready",
  ).length;
  const done = queue.entries.filter((entry) => entry.status === "done").length;
  const unavailable = queue.busy || sampleLoading || !supported;

  useEffect(() => {
    setSupported(
      typeof Worker === "function" &&
        typeof createImageBitmap === "function" &&
        typeof HTMLCanvasElement.prototype.toBlob === "function",
    );
    return () => sampleRequest.current?.abort();
  }, []);

  // Window listeners read the latest queue through this ref, so they are attached once. A layout
  // effect refreshes it before the browser can deliver another event, so a drop right after a
  // run finishes never sees the stale "busy" state.
  useLayoutEffect(() => {
    receiveFiles.current = (files) => {
      if (!files.length) return;
      if (unavailable) {
        if (queue.busy)
          queue.setNotice(
            "Wait for the current images to finish, then add more.",
          );
        return;
      }
      void queue.add(files);
    };
  });

  // A file dropped anywhere is added. Without this, a drop outside the upload box makes the
  // browser open the file and discard everything held in this tab.
  useEffect(() => {
    let depth = 0;
    const carriesFiles = (event: DragEvent) =>
      Array.from(event.dataTransfer?.types ?? []).includes("Files");
    const enter = (event: DragEvent) => {
      if (!carriesFiles(event)) return;
      event.preventDefault();
      depth++;
      setDragging(true);
    };
    const over = (event: DragEvent) => {
      if (!carriesFiles(event)) return;
      event.preventDefault();
      if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
      setDragging(true);
    };
    const leave = (event: DragEvent) => {
      if (!carriesFiles(event)) return;
      depth = Math.max(0, depth - 1);
      if (!depth) setDragging(false);
    };
    const drop = (event: DragEvent) => {
      if (!carriesFiles(event)) return;
      event.preventDefault();
      depth = 0;
      setDragging(false);
      receiveFiles.current(Array.from(event.dataTransfer?.files ?? []));
    };
    const paste = (event: ClipboardEvent) => {
      const data = event.clipboardData;
      // Some browsers list a pasted image only under items, not files.
      const files = data?.files.length
        ? Array.from(data.files)
        : Array.from(data?.items ?? [])
            .filter((item) => item.kind === "file")
            .map((item) => item.getAsFile())
            .filter((file): file is File => file !== null);
      if (!files.length) return;
      event.preventDefault();
      receiveFiles.current(files);
    };
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragover", over);
    window.addEventListener("dragleave", leave);
    window.addEventListener("drop", drop);
    window.addEventListener("paste", paste);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragover", over);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("drop", drop);
      window.removeEventListener("paste", paste);
    };
  }, []);

  // After a clean run, bring the downloads into view. CSS turns the smooth scroll off under reduced motion.
  useEffect(() => {
    if (!revealResults) return;
    setRevealResults(false);
    results.current?.scrollIntoView({ block: "nearest" });
  }, [revealResults]);

  async function loadSample() {
    if (unavailable) return;
    const controller = new AbortController();
    sampleRequest.current = controller;
    setSampleLoading(true);
    try {
      const response = await fetch("/samples/studio-sample.jpg", {
        signal: controller.signal,
      });
      if (!response.ok) throw new Error("Sample unavailable");
      const file = new File([await response.blob()], "studio-sample.jpg", {
        type: "image/jpeg",
      });
      if (!controller.signal.aborted) await queue.add([file]);
    } catch {
      if (!controller.signal.aborted)
        queue.setNotice(
          "The sample could not be loaded. Check your connection or choose an image from your device.",
        );
    } finally {
      if (sampleRequest.current === controller) {
        setSampleLoading(false);
        sampleRequest.current = null;
      }
    }
  }
  async function cleanAll() {
    if (await queue.clean()) setRevealResults(true);
  }
  function clear() {
    sampleRequest.current?.abort();
    sampleRequest.current = null;
    setSampleLoading(false);
    queue.clear();
    setSelectedId(undefined);
    if (input.current) input.current.value = "";
    // The workspace closes, so keep keyboard focus on the next useful control.
    requestAnimationFrame(() => chooseButton.current?.focus());
  }

  const allDone = hasEntries && done === queue.entries.length;
  return (
    <>
      <a href="#workspace" className="skip-link" tabIndex={0}>
        Skip to image workspace
      </a>
      <header className="site-header">
        <div className="page-shell header-inner">
          <a href="/" className="wordmark" aria-label="AssetSanitize home">
            <Logo />
            <span>AssetSanitize</span>
          </a>
          <nav aria-label="Main navigation" className="site-nav">
            <Dialog>
              <DialogTrigger asChild>
                <button type="button" className="nav-link">
                  <span>How it works</span>
                </button>
              </DialogTrigger>
              <DialogContent className="rounded-[var(--r-lg)]">
                <DialogHeader>
                  <DialogTitle>How AssetSanitize cleans an image</DialogTitle>
                  <DialogDescription className="text-base">
                    Metadata is extra information saved alongside the pixels,
                    such as where a photo was taken, the camera and its serial
                    number, and the time.
                  </DialogDescription>
                </DialogHeader>
                <ol className="help-steps">
                  <li>
                    <strong>Inspect.</strong> Choose static JPEG or PNG images.
                    Recognized metadata is read on your device.
                  </li>
                  <li>
                    <strong>Reconstruct.</strong> Visible pixels are drawn into
                    a fresh canvas and encoded as PNG, without copying source
                    metadata or profiles.
                  </li>
                  <li>
                    <strong>Verify.</strong> The output must pass PNG structure
                    and metadata checks before download is enabled.
                  </li>
                </ol>
                <p className="help-limit">
                  This does not redact faces, text, addresses, or identifying
                  details inside the image. PNGs can be larger and colors can
                  change. No archival color fidelity is promised.
                </p>
                <p className="help-limit">
                  Files remain in this tab’s memory. Clear all or refresh to
                  release them. Nothing is uploaded or saved to browser storage.
                  Limits: 10 files, 20 MiB each, 100 MiB total, 24 million
                  pixels per image. Try a sample loads a synthetic image with
                  demonstration metadata.
                </p>
              </DialogContent>
            </Dialog>
            <a
              href={SOURCE_URL}
              target="_blank"
              rel="noreferrer"
              className="nav-link source-link"
              aria-label="View source code on GitHub"
            >
              <CodeXml aria-hidden="true" />
              <span>Source code</span>
            </a>
          </nav>
        </div>
      </header>
      <main id="workspace" tabIndex={-1} className="page-shell main-content">
        <div className="intro">
          <h1>Remove EXIF and GPS data from photos</h1>
          <p>
            See the location, camera and time stored in your JPEG or PNG files,
            then download clean, verified copies. Up to 10 images at once,
            processed on your device.
          </p>
        </div>
        {!supported ? (
          <Alert variant="destructive" className="mb-6">
            <CircleAlert />
            <AlertDescription>
              This browser is missing local image-processing features. Use a
              current Chrome, Edge, Firefox, or Safari. Files cannot be added
              here.
            </AlertDescription>
          </Alert>
        ) : null}
        <section
          aria-labelledby="upload-heading"
          className={cn(
            "upload-zone",
            hasEntries && "is-compact",
            dragging && !unavailable && "is-dragging",
          )}
        >
          <div className="upload-inner">
            <span className="upload-icon">
              <ArrowUpFromLine aria-hidden="true" />
            </span>
            <div className="upload-copy">
              <h2 id="upload-heading">
                {dragging && !unavailable
                  ? "Drop to add images"
                  : hasEntries
                    ? "Add more images"
                    : "Drop JPEG or PNG images here"}
              </h2>
              {hasEntries ? (
                <p id="file-limits">
                  Drop or paste them anywhere on this page. Up to 10 images,
                  20 MiB each, 100 MiB in total.
                </p>
              ) : (
                <p>You can also paste an image from the clipboard.</p>
              )}
            </div>
            <div className="upload-actions">
              {!hasEntries ? (
                <Button
                  size="lg"
                  variant="outline"
                  disabled={unavailable}
                  onClick={loadSample}
                >
                  {sampleLoading ? (
                    <LoaderCircle className="spin" data-icon="inline-start" />
                  ) : null}
                  Try a sample
                </Button>
              ) : null}
              <Button
                ref={chooseButton}
                size={hasEntries ? "default" : "lg"}
                variant={hasEntries ? "outline" : "default"}
                disabled={unavailable}
                onClick={() => input.current?.click()}
              >
                {hasEntries ? "Add images" : "Choose images"}
              </Button>
            </div>
            {!hasEntries ? (
              <p id="file-limits" className="upload-limits">
                Up to 10 images · 20 MiB each · 100 MiB total · 24 MP per image
              </p>
            ) : null}
            <input
              ref={input}
              id="image-files"
              aria-label="Choose images"
              aria-describedby="file-limits queue-notice"
              type="file"
              accept="image/jpeg,image/png"
              multiple
              className="sr-only"
              tabIndex={-1}
              disabled={unavailable}
              onChange={(event) => {
                void queue.add(Array.from(event.target.files ?? []));
                event.target.value = "";
              }}
            />
          </div>
        </section>
        <div
          id="queue-notice"
          role="status"
          aria-live="polite"
          className={cn("queue-notice", !queue.notice && "sr-only")}
        >
          {queue.notice}
        </div>
        {hasEntries && selected ? (
          <section
            className="workspace-panel"
            aria-label="Image workspace"
            aria-busy={queue.busy}
          >
            <aside className="image-queue" aria-labelledby="queue-heading">
              <div className="queue-heading">
                <h2 id="queue-heading">Your images</h2>
                <span>{queue.entries.length} of 10</span>
              </div>
              <ul className="queue-list">
                {queue.entries.map((entry) => (
                  <li key={entry.id}>
                    <button
                      className={cn(
                        "queue-item",
                        selected.id === entry.id && "is-selected",
                      )}
                      aria-pressed={selected.id === entry.id}
                      onClick={() => setSelectedId(entry.id)}
                    >
                      <span className="queue-icon">
                        {entry.status === "done" ? (
                          <Check aria-hidden="true" />
                        ) : (
                          <FileImage aria-hidden="true" />
                        )}
                      </span>
                      <span className="queue-item-copy">
                        <strong>{entry.originalName}</strong>
                        <span
                          className={cn(
                            "queue-status",
                            entry.status === "failed" && "status-error",
                          )}
                        >
                          {["inspecting", "processing", "verifying"].includes(
                            entry.status,
                          ) ? (
                            <LoaderCircle className="spin" aria-hidden="true" />
                          ) : null}
                          {STATUS_LABELS[entry.status]}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
              <div className="queue-bottom">
                <span>
                  {formatBytes(
                    queue.entries.reduce(
                      (sum, entry) => sum + entry.inputBytes,
                      0,
                    ),
                  )}{" "}
                  of 100 MiB
                </span>
                <Button variant="ghost" size="sm" onClick={clear}>
                  Clear all
                </Button>
              </div>
            </aside>
            <div className="workspace-main">
              <ImageInspector
                entry={selected}
                busy={queue.busy}
                onRetry={(id) => void queue.retry(id)}
                onRemove={(id) => queue.remove(id)}
              />
              <div className="action-bar">
                <LockKeyhole aria-hidden="true" />
                <p className="action-copy">
                  <strong>Your files stay on your device.</strong>
                  <span>Nothing is uploaded or stored.</span>
                </p>
                <div className="action-controls">
                  {queue.busy ? (
                    <>
                      <span className="action-status">
                        <LoaderCircle className="spin" aria-hidden="true" />
                        {progressLabel(queue.progress)}
                      </span>
                      {/* Distinct keys: one button must not fade from Cancel into Clean. */}
                      <Button
                        key="cancel"
                        variant="outline"
                        onClick={queue.cancel}
                      >
                        <X data-icon="inline-start" />
                        Cancel
                      </Button>
                    </>
                  ) : ready ? (
                    <>
                      <span className="action-status">
                        {plural(ready, "image")} ready
                      </span>
                      <Button
                        key="clean"
                        size="lg"
                        disabled={!supported || sampleLoading}
                        onClick={() => void cleanAll()}
                      >
                        <ShieldCheck data-icon="inline-start" />
                        Clean images
                      </Button>
                    </>
                  ) : (
                    <span className="action-status">
                      {allDone
                        ? "All images are cleaned. Download them below."
                        : "Retry or remove the images that were not cleaned."}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </section>
        ) : (
          <p className="privacy-line">
            <LockKeyhole aria-hidden="true" />
            <span>
              Your files stay on your device. Nothing is uploaded or stored.
            </span>
          </p>
        )}
        <p className="sr-only" role="status" aria-live="polite">
          {queue.busy
            ? `${progressLabel(queue.progress)} Processing on your device. Cancellation is available.`
            : `${plural(ready, "image")} ready to clean. ${plural(done, "verified result")} available.`}
        </p>
        <Results
          ref={results}
          entries={queue.entries}
          emphasize={!ready && !queue.busy}
        />
      </main>
      <footer className="site-footer page-shell">
        <p>
          <LockKeyhole aria-hidden="true" />
          <span>
            Removes source metadata, not visible text, faces, or identifying
            details in the image.
          </span>
        </p>
        <p>
          A self-initiated project by{" "}
          <a href="https://consolelog.studio/" target="_blank" rel="noreferrer">
            ConsoleLog Studio
          </a>
        </p>
      </footer>
    </>
  );
}
