"use client";
import { Check, Download, ImageIcon } from "lucide-react";
import type { ImageEntry } from "@/hooks/use-image-queue";
import { formatBytes } from "@/lib/display";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
} from "@/components/ui/empty";

export function Results({ entries }: { entries: ImageEntry[] }) {
  const completed = entries.filter(
    (entry) => entry.status === "done" && entry.resultUrl,
  );
  return (
    <section className="results-panel" aria-labelledby="results-heading">
      <div className="section-heading">
        <h2 id="results-heading">Cleaned images</h2>
        <span>
          {completed.length
            ? `${completed.length} verified ${completed.length === 1 ? "PNG" : "PNGs"}`
            : "Ready when you are"}
        </span>
      </div>
      {completed.length ? (
        <ul className="result-list">
          {completed.map((entry) => (
            <li className="result-row" key={entry.id}>
              <div className="result-check">
                <Check aria-hidden="true" />
              </div>
              <div className="result-description">
                <h3>{entry.outputName}</h3>
                <p>
                  PNG · {formatBytes(entry.resultBytes!)} · {entry.resultWidth}{" "}
                  × {entry.resultHeight} px
                </p>
                <p className="size-comparison">
                  {entry.resultBytes! > entry.inputBytes
                    ? `Larger than the ${formatBytes(entry.inputBytes)} source. PNG size can increase.`
                    : `Source: ${formatBytes(entry.inputBytes)}. Image reconstructed as PNG.`}
                </p>
              </div>
              <Button asChild variant="outline">
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
      ) : (
        <Empty className="results-empty">
          <EmptyHeader>
            <EmptyMedia>
              <ImageIcon aria-hidden="true" />
            </EmptyMedia>
            <EmptyDescription>Verified PNGs will appear here.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      )}
    </section>
  );
}
