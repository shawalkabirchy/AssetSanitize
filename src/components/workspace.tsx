"use client";
import { useEffect, useRef, useState } from "react";
import {
  Aperture,
  ArrowUpFromLine,
  Check,
  CircleAlert,
  FileImage,
  CodeXml,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  X,
} from "lucide-react";
import { cn } from "cn";
import { useImageQueue } from "@/hooks/use-image-queue";
import { formatBytes, STATUS_LABELS } from "@/lib/display";
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
export function Workspace() {
  const queue = useImageQueue();
  const input = useRef<HTMLInputElement>(null);
  const sampleRequest = useRef<AbortController | null>(null);
  const [selectedId, setSelectedId] = useState<string>();
  const [dragging, setDragging] = useState(false);
  const [sampleLoading, setSampleLoading] = useState(false);
  const [supported, setSupported] = useState(true);
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
  function clear() {
    sampleRequest.current?.abort();
    sampleRequest.current = null;
    setSampleLoading(false);
    queue.clear();
    setSelectedId(undefined);
    if (input.current) input.current.value = "";
  }
  return (
    <>
      <a href="#workspace" className="skip-link" tabIndex={0}>
        Skip to image workspace
      </a>
      <header className="site-header">
        <div className="page-shell header-inner">
          <a href="/" className="wordmark" aria-label="AssetSanitize home">
            <Aperture aria-hidden="true" />
            <span>AssetSanitize</span>
          </a>
          <nav
            aria-label="Main navigation"
            className="flex items-center gap-2 sm:gap-5"
          >
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="ghost">How it works</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>A fresh image. Less attached.</DialogTitle>
                  <DialogDescription>
                    Image metadata is extra information saved alongside the
                    pixels.
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
                  pixels per image.
                </p>
              </DialogContent>
            </Dialog>
            <a
              href={SOURCE_URL}
              target="_blank"
              rel="noreferrer"
              className="source-link"
              aria-label="View source code on GitHub"
            >
              <CodeXml aria-hidden="true" />
              <span>Source code</span>
            </a>
          </nav>
        </div>
      </header>
      <main className="page-shell main-content">
        <div className="intro">
          <h1>Share the image. Leave the metadata.</h1>
          <p>Inspect and remove identifying metadata, right in your browser.</p>
        </div>
        {!supported ? (
          <Alert variant="destructive">
            <CircleAlert />
            <AlertDescription>
              This browser is missing local image-processing features. Use a
              current Chrome, Edge, Firefox, or Safari. Files cannot be uploaded
              here.
            </AlertDescription>
          </Alert>
        ) : null}
        <section
          aria-label="Add images"
          className={cn("upload-zone", dragging && "is-dragging")}
          onDragOver={(event) => {
            event.preventDefault();
            if (!unavailable) setDragging(true);
          }}
          onDragLeave={(event) => {
            if (
              !(event.relatedTarget instanceof Node) ||
              !event.currentTarget.contains(event.relatedTarget)
            )
              setDragging(false);
          }}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            if (!unavailable)
              void queue.add(Array.from(event.dataTransfer.files));
          }}
        >
          <div className="upload-inner">
            <ArrowUpFromLine className="upload-icon" aria-hidden="true" />
            <div className="upload-copy">
              <h2>Drop your images here</h2>
              <p id="file-limits">JPEG or PNG · Up to 10 images</p>
              <span>20 MiB each · 100 MiB total · 24 MP per image</span>
            </div>
            <div className="upload-actions">
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
              <Button
                size="lg"
                disabled={unavailable}
                onClick={() => input.current?.click()}
              >
                Choose images
              </Button>
            </div>
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
        <section
          id="workspace"
          tabIndex={-1}
          className="workspace-panel"
          aria-label="Image workspace"
          aria-busy={queue.busy}
        >
          <aside className="image-queue" aria-labelledby="queue-heading">
            <div className="queue-heading">
              <h2 id="queue-heading">Your images</h2>
              <span>{queue.entries.length}/10</span>
            </div>
            {queue.entries.length ? (
              <ul className="queue-list">
                {queue.entries.map((entry) => (
                  <li key={entry.id}>
                    <button
                      className={cn(
                        "queue-item",
                        selected?.id === entry.id && "is-selected",
                      )}
                      aria-pressed={selected?.id === entry.id}
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
            ) : (
              <p className="queue-empty">
                A clean slate.
                <br /> Add an image to get started.
              </p>
            )}
            <div className="queue-bottom">
              <span>
                {formatBytes(
                  queue.entries.reduce(
                    (sum, entry) => sum + entry.inputBytes,
                    0,
                  ),
                )}{" "}
                / 100 MiB
              </span>
              <Button
                variant="ghost"
                size="sm"
                disabled={!queue.entries.length && !sampleLoading}
                onClick={clear}
              >
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
            <Alert role="status" className="privacy-action">
              <LockKeyhole aria-hidden="true" />
              <AlertDescription>
                <strong>Your files stay on your device.</strong>
                <span>Nothing is uploaded or stored.</span>
              </AlertDescription>
              <div className="clean-action">
                {queue.busy ? (
                  <Button variant="outline" onClick={queue.cancel}>
                    <X data-icon="inline-start" />
                    Cancel
                  </Button>
                ) : (
                  <Button
                    size="lg"
                    disabled={!ready || !supported || sampleLoading}
                    onClick={() => queue.clean()}
                  >
                    <ShieldCheck data-icon="inline-start" />
                    Clean images
                  </Button>
                )}
              </div>
            </Alert>
          </div>
        </section>
        <p className="sr-only" role="status" aria-live="polite">
          {queue.busy
            ? "Processing on your device. Cancellation is available."
            : `${ready} images ready to clean. ${done} verified results available.`}
        </p>
        <Results entries={queue.entries} />
        <p className="sample-note">
          Try a sample uses a synthetic image with demonstration metadata. Your
          own images are never sent anywhere.
        </p>
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
