"use client";
import {
  CircleAlert,
  FileImage,
  ImageIcon,
  RotateCcw,
  Trash2,
} from "lucide-react";
import type { ImageEntry } from "@/hooks/use-image-queue";
import { formatBytes, STATUS_LABELS } from "@/lib/display";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

export function ImageInspector({
  entry,
  busy,
  onRetry,
  onRemove,
}: {
  entry?: ImageEntry;
  busy: boolean;
  onRetry: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  if (!entry)
    return (
      <div className="inspector inspector-empty">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <FileImage aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>A closer look at your image.</EmptyTitle>
            <EmptyDescription>
              Select an image to preview it and see the metadata it carries.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  const dimensions = entry.resultWidth
    ? `${entry.resultWidth} × ${entry.resultHeight}`
    : entry.info
      ? `${entry.info.width} × ${entry.info.height}`
      : undefined;
  const retryable = entry.status === "failed" || entry.status === "cancelled";
  return (
    <div className="inspector" aria-label="Selected image">
      <div className="inspector-heading">
        <div className="min-w-0">
          <h2 className="filename">{entry.originalName}</h2>
          <p className="file-details">
            {dimensions ? `${dimensions} px · ` : ""}
            {formatBytes(entry.inputBytes)} source
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {retryable ? (
            <Button
              variant="outline"
              size="sm"
              disabled={busy}
              onClick={() => onRetry(entry.id)}
            >
              <RotateCcw data-icon="inline-start" />
              Retry
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="icon"
            aria-label={`Remove ${entry.originalName}`}
            disabled={busy}
            onClick={() => onRemove(entry.id)}
          >
            <Trash2 />
          </Button>
        </div>
      </div>
      {entry.error ? (
        <Alert variant="destructive" className="file-error">
          <CircleAlert />
          <AlertTitle>
            {entry.errorCode === "VERIFICATION_FAILED"
              ? "Failed verification"
              : "This image needs attention"}
          </AlertTitle>
          <AlertDescription>{entry.error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="inspection-grid">
        <figure className="preview-figure">
          <div className="preview-surface">
            {entry.resultUrl || entry.sourceUrl ? (
              <img
                key={entry.resultUrl ?? entry.sourceUrl}
                src={entry.resultUrl ?? entry.sourceUrl}
                alt={
                  entry.resultUrl
                    ? "Verified PNG preview. Visible image content is preserved."
                    : "Original image preview"
                }
                className="image-preview"
              />
            ) : (
              <div className="preview-placeholder">
                <ImageIcon aria-hidden="true" />
                <span>
                  {entry.status === "inspecting"
                    ? "Inspecting your image…"
                    : "Preview unavailable"}
                </span>
              </div>
            )}
          </div>
          <figcaption>
            {entry.resultUrl ? "Verified PNG preview" : "Original preview"}
            <span>
              {entry.resultBytes
                ? formatBytes(entry.resultBytes)
                : entry.info
                  ? entry.info.type.toUpperCase()
                  : STATUS_LABELS[entry.status]}
            </span>
          </figcaption>
        </figure>
        <section className="metadata-panel" aria-labelledby="metadata-heading">
          <div className="metadata-heading">
            <h3 id="metadata-heading">Source metadata</h3>
            {entry.inspection ? (
              <Badge variant="secondary">{entry.inspection.count} fields</Badge>
            ) : null}
          </div>
          {entry.inspectionOutcome === "unable-to-inspect" ? (
            <p className="metadata-message">
              Unable to inspect. This does not mean the image has no metadata.
            </p>
          ) : entry.inspection?.outcome === "not-detected" ? (
            <p className="metadata-message">
              Not detected by this reader. Cleaning still reconstructs the image
              and verifies the PNG.
            </p>
          ) : entry.inspection ? (
            <div
              className="metadata-scroll"
              tabIndex={0}
              aria-label="Recognized source metadata"
            >
              {entry.inspection.groups.map((group) => (
                <div className="metadata-group" key={group.title}>
                  <h4>{group.title}</h4>
                  <dl>
                    {group.fields.map((field, index) => (
                      <div
                        className="metadata-field"
                        key={`${field.label}-${index}`}
                      >
                        <dt>{field.label}</dt>
                        <dd>{field.value}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ))}
            </div>
          ) : (
            <p className="metadata-message">
              {entry.status === "inspecting"
                ? "Reading recognized fields on your device…"
                : "Recognized fields will appear after inspection."}
            </p>
          )}
          {entry.status === "done" ? (
            <p className="verification-note">
              Output verified. These source fields were not carried into your
              PNG.
            </p>
          ) : null}
        </section>
      </div>
    </div>
  );
}
