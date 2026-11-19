"use client";
import { useState, type Ref } from "react";
import { Download, LoaderCircle } from "lucide-react";
import type { ImageEntry } from "@/hooks/use-image-queue";
import { formatBytes, formatGrowth, plural } from "@/lib/display";
import { zipFiles } from "@/lib/zip";
import { Button } from "@/components/ui/button";

export const ZIP_NAME = "assetsanitize-cleaned.zip";

export function Results({
  entries,
  emphasize,
  ref,
}: {
  entries: ImageEntry[];
  /** True when downloading is the main thing left to do, so one download button is filled. */
  emphasize: boolean;
  ref?: Ref<HTMLElement>;
}) {
  const [zipping, setZipping] = useState(false);
  const completed = entries.filter(
    (entry) => entry.status === "done" && entry.resultUrl && entry.resultBlob,
  );
  if (!completed.length) return null;

  async function downloadAll() {
    setZipping(true);
    try {
      const archive = await zipFiles(
        completed.map((entry) => ({
          name: entry.outputName,
          blob: entry.resultBlob!,
        })),
      );
      const url = URL.createObjectURL(archive);
      const link = document.createElement("a");
      link.href = url;
      link.download = ZIP_NAME;
      link.hidden = true;
      document.body.append(link);
      link.click();
      link.remove();
      // Some browsers start the download after the click returns, so release the URL a moment later.
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } finally {
      setZipping(false);
    }
  }

  return (
    <section
      ref={ref}
      id="results"
      className="results-panel"
      aria-labelledby="results-heading"
    >
      <div className="section-heading">
        <h2 id="results-heading">Cleaned images</h2>
        <span>
          {completed.length === 1
            ? "1 verified PNG"
            : `${completed.length} verified PNGs`}
        </span>
        {completed.length > 1 ? (
          <Button
            variant={emphasize ? "default" : "outline"}
            disabled={zipping}
            onClick={() => void downloadAll()}
          >
            {zipping ? (
              <LoaderCircle className="spin" data-icon="inline-start" />
            ) : (
              <Download data-icon="inline-start" />
            )}
            Download all
          </Button>
        ) : null}
      </div>
      <ul className="result-list">
        {completed.map((entry) => (
          <li className="result-row" key={entry.id}>
            <div className="result-thumb">
              <img src={entry.resultUrl} alt="" />
            </div>
            <div className="result-description">
              <h3>{entry.outputName}</h3>
              <p>
                from {entry.originalName} · {entry.resultWidth} ×{" "}
                {entry.resultHeight} px · {formatBytes(entry.resultBytes!)}
              </p>
              <p className="size-comparison">
                {entry.resultBytes! > entry.inputBytes
                  ? `${formatGrowth(entry.resultBytes!, entry.inputBytes)} the size of the ${formatBytes(entry.inputBytes)} source. PNG files are often larger.`
                  : `Source: ${formatBytes(entry.inputBytes)}. Image reconstructed as PNG.`}
              </p>
            </div>
            <Button
              asChild
              variant={
                emphasize && completed.length === 1 ? "default" : "outline"
              }
            >
              <a
                href={entry.resultUrl}
                download={entry.outputName}
                tabIndex={0}
                aria-label={`Download ${entry.outputName}`}
              >
                <Download data-icon="inline-start" />
                Download PNG
              </a>
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}
