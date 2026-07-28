"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, FileText, ZoomIn, ZoomOut } from "lucide-react";
import { DistributionPlayer } from "@/components/distribution/distribution-player";
import { distributionMediaKind } from "@/lib/distribution-input";

export function DistributionFileViewer({
  file,
}: {
  file: {
    id: string;
    filename: string;
    mimeType: string;
    size: number;
    itemTitle: string;
    progress: { positionMs: number } | null;
  };
}) {
  const kind = distributionMediaKind(file.mimeType);
  const source = `/api/v1/distribution/files/${file.id}/content`;
  const [zoom, setZoom] = useState(1);
  if (kind === "video" || kind === "audio") {
    return (
      <DistributionPlayer
        fileId={file.id}
        kind={kind}
        title={file.itemTitle}
        initialPositionMs={file.progress?.positionMs ?? 0}
      />
    );
  }
  if (kind === "image") {
    return (
      <section className="distribution-image-viewer">
        <div>
          <button
            onClick={() => setZoom((value) => Math.max(0.5, value - 0.25))}
            aria-label="Zoom out"
          >
            <ZoomOut />
          </button>
          <span>{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom((value) => Math.min(3, value + 0.25))}
            aria-label="Zoom in"
          >
            <ZoomIn />
          </button>
        </div>
        {/* This authenticated endpoint never exposes the private Blob URL. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={source}
          alt={file.itemTitle}
          style={{ transform: `scale(${zoom})` }}
        />
      </section>
    );
  }
  if (kind === "pdf") {
    return (
      <section className="distribution-document-viewer">
        <header>
          <FileText /> Secure PDF preview
        </header>
        <iframe
          src={source}
          title={file.itemTitle}
          sandbox=""
          referrerPolicy="no-referrer"
        />
      </section>
    );
  }
  if (kind === "text" && file.size <= 2_000_000) {
    return <SecureTextViewer source={source} />;
  }
  return (
    <section className="distribution-unsupported">
      <AlertTriangle />
      <h2>Preview unavailable</h2>
      <p>
        This file type is kept private and cannot be rendered safely in the
        browser. Use the authorized download option when one is available.
      </p>
    </section>
  );
}

function SecureTextViewer({ source }: { source: string }) {
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    void fetch(source, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error();
        return response.text();
      })
      .then(setText)
      .catch((reason) => {
        if (reason?.name !== "AbortError")
          setError("The text preview could not be loaded.");
      });
    return () => controller.abort();
  }, [source]);
  return (
    <section className="distribution-text-viewer">
      {error ? <p>{error}</p> : <pre>{text || "Loading secure preview…"}</pre>}
    </section>
  );
}
