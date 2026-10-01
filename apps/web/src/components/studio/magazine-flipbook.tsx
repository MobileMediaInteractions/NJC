"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { StudioMagazinePage } from "@harborline/backend/schema";

type ImageAsset = { id: string; filename: string; blobUrl: string; altText: string | null };

export function MagazineFlipbook({ title, pages, imageAssets, documentUrl }: { title: string; pages: StudioMagazinePage[]; imageAssets: ImageAsset[]; documentUrl?: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const pageFlipRef = useRef<import("page-flip").PageFlip | null>(null);
  const [loading, setLoading] = useState(Boolean(documentUrl));
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);
  const [pageCount, setPageCount] = useState(0);
  const [pdfNotice, setPdfNotice] = useState("");

  useEffect(() => {
    let cancelled = false;
    let objectUrls: string[] = [];
    async function initialize() {
      if (!rootRef.current) return;
      setError(""); setPdfNotice("");
      try {
        const { PageFlip } = await import("page-flip");
        const flip = new PageFlip(rootRef.current, {
          width: 420, height: 594, size: "stretch", minWidth: 280, maxWidth: 1500,
          minHeight: 396, maxHeight: 2121, maxShadowOpacity: 0.24, showCover: true,
          usePortrait: true, drawShadow: true, flippingTime: 850, mobileScrollSupport: false,
          startPage: 0, autoSize: true,
        });
        pageFlipRef.current = flip;
        flip.on("flip", (event) => setPage(Number(event.data ?? 0)));

        if (documentUrl) {
          setLoading(true);
          const pdfjs = await import("pdfjs-dist");
          pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();
          const pdf = await pdfjs.getDocument({ url: documentUrl, withCredentials: true }).promise;
          const maxPages = 120;
          const total = Math.min(pdf.numPages, maxPages);
          if (pdf.numPages > maxPages) setPdfNotice(`Showing the first ${maxPages} pages of ${pdf.numPages}. The source file remains unchanged.`);
          const rendered: string[] = [];
          for (let pageNo = 1; pageNo <= total; pageNo += 1) {
            if (cancelled) return;
            const sourcePage = await pdf.getPage(pageNo);
            const base = sourcePage.getViewport({ scale: 1 });
            const scale = Math.min(1.45, 1120 / base.width, 1584 / base.height);
            const viewport = sourcePage.getViewport({ scale });
            const canvas = document.createElement("canvas");
            canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height);
            const context = canvas.getContext("2d", { alpha: false });
            if (!context) throw new Error("This browser could not prepare a page preview.");
            await sourcePage.render({ canvas, canvasContext: context, viewport, background: "#fff" }).promise;
            const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error("A PDF page could not be rendered.")), "image/jpeg", 0.82));
            const url = URL.createObjectURL(blob); objectUrls.push(url); rendered.push(url);
            canvas.width = 1; canvas.height = 1;
          }
          if (cancelled) return;
          if (!rendered.length) throw new Error("This PDF contains no pages.");
          flip.loadFromImages(rendered);
          setPageCount(rendered.length); setPage(0); setLoading(false);
          return;
        }

        const sourcePages = rootRef.current.querySelectorAll<HTMLElement>(".magazine-source-page");
        if (!sourcePages.length) {
          setPageCount(0); setLoading(false);
          return;
        }
        flip.loadFromHTML(Array.from(sourcePages));
        setPageCount(sourcePages.length); setPage(0); setLoading(false);
      } catch (cause) {
        if (!cancelled) {
          setLoading(false);
          setError(cause instanceof Error ? cause.message : "The flipbook preview could not be opened.");
        }
      }
    }
    void initialize();
    return () => {
      cancelled = true;
      pageFlipRef.current?.destroy(); pageFlipRef.current = null;
      objectUrls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [documentUrl, pages, title, imageAssets]);

  return <section className="mag-flipbook-shell rounded-2xl border p-4 sm:p-6" aria-label={`${title} magazine preview`}>
    <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[.16em] text-muted-foreground">StPageFlip preview</p><h2 className="mt-1 text-lg font-bold">{title || "Untitled magazine"}</h2></div><div className="flex items-center gap-2"><Button type="button" size="icon" variant="outline" onClick={() => pageFlipRef.current?.turnToPrevPage()} disabled={loading || page <= 0} aria-label="Previous magazine page"><ArrowLeft /></Button><span className="min-w-20 text-center text-xs font-medium text-muted-foreground">{pageCount ? `${page + 1} / ${pageCount}` : "No pages"}</span><Button type="button" size="icon" variant="outline" onClick={() => pageFlipRef.current?.turnToNextPage()} disabled={loading || page + 1 >= pageCount} aria-label="Next magazine page"><ArrowRight /></Button></div></div>
    <div className="mag-flipbook-stage mt-4"><div ref={rootRef} className="mag-flipbook-canvas" />{loading ? <div className="mag-flipbook-overlay"><Loader2 className="size-7 animate-spin" /><span>Rendering magazine pages…</span></div> : null}{error ? <div className="mag-flipbook-overlay"><BookOpen className="size-7" /><span className="max-w-lg text-center">{error}</span></div> : null}{!documentUrl && !pages.length && !loading ? <div className="mag-flipbook-overlay"><BookOpen className="size-7" /><span>Add pages to preview this issue.</span></div> : null}</div>
    {pdfNotice ? <p className="mt-3 rounded-lg bg-amber-500/10 p-3 text-xs text-amber-900 dark:text-amber-100">{pdfNotice}</p> : null}
    {!documentUrl ? <div className="magazine-source-pages" aria-hidden="true">{pages.map((item) => { const image = imageAssets.find((asset) => asset.id === item.imageAssetId); return <article key={item.id} className="magazine-source-page" data-density="soft"><div className="mag-page-paper">{image ? <img className="mag-page-image" src={image.blobUrl} alt={image.altText ?? ""} /> : null}<div className="mag-page-copy">{item.kicker ? <p className="mag-page-kicker">{item.kicker}</p> : null}{item.title ? <h3>{item.title}</h3> : null}{item.body ? item.body.split(/\n{2,}/).map((paragraph, index) => <p key={index}>{paragraph}</p>) : null}</div><span className="mag-page-folio">The New Jersey Courier · {item.id.slice(0, 2).toUpperCase()}</span></div></article>; })}</div> : null}
  </section>;
}
