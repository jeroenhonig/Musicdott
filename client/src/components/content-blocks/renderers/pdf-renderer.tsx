import React from "react";
import PdfEmbed from "@/components/lessons/pdf-embed";
import { NormalizedContentBlock } from "@/utils/content-block-parser";

export default function PdfRenderer({ block }: { block: NormalizedContentBlock }) {
  const pdfData = block.data?.pdf;

  if (!pdfData) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
        No PDF data found.
      </div>
    );
  }

  const handleOpen = () => {
    const url = typeof pdfData === "string" ? pdfData : pdfData?.url;
    if (url) {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  };

  // Normalize pdfData to the expected shape
  const normalizedPdfData =
    typeof pdfData === "string"
      ? { url: pdfData, filename: block.title || "document.pdf", title: block.title }
      : pdfData;

  return (
    <div className="space-y-2">
      <PdfEmbed pdfData={normalizedPdfData} editable={false} />
      {normalizedPdfData?.url && (
        <div className="flex justify-end">
          <button
            onClick={handleOpen}
            className="text-sm text-blue-600 hover:text-blue-800 underline"
          >
            Open PDF
          </button>
        </div>
      )}
    </div>
  );
}
