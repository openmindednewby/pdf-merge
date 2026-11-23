import { PDFDocument } from 'pdf-lib';

import { PdfMergeError } from './PdfMergeError';
import { PdfMergeFailure } from './PdfMergeFailure';
import { MergePart, MergePartMime } from './types';

const SUPPORTED_MIMES: ReadonlySet<string> = new Set<MergePartMime>(['application/pdf', 'image/png', 'image/jpeg']);

/** Merges PDFs and PNG/JPEG images, in input order, into one PDF. */
export async function mergeToPdf(parts: readonly MergePart[]): Promise<Uint8Array> {
  assertMergeable(parts);
  const output = await PDFDocument.create();
  for (const part of parts) {
    await appendPart(output, part);
  }
  return output.save();
}

function assertMergeable(parts: readonly MergePart[]): void {
  if (parts.length === 0) {
    throw new PdfMergeError(PdfMergeFailure.EmptyInput, 'mergeToPdf needs at least one part');
  }
  const unsupported = parts.find((part) => !SUPPORTED_MIMES.has(part.mime));
  if (unsupported !== undefined) {
    throw new PdfMergeError(PdfMergeFailure.UnsupportedMime, `Unsupported mime: ${String(unsupported.mime)}`);
  }
}

async function appendPart(output: PDFDocument, part: MergePart): Promise<void> {
  if (part.mime === 'application/pdf') {
    await appendPdf(output, part.bytes);
    return;
  }
  await appendImage(output, part);
}

async function appendPdf(output: PDFDocument, bytes: Uint8Array): Promise<void> {
  const source = await PDFDocument.load(bytes);
  const pages = await output.copyPages(source, source.getPageIndices());
  pages.forEach((page) => output.addPage(page));
}

async function appendImage(output: PDFDocument, part: MergePart): Promise<void> {
  const image = part.mime === 'image/png' ? await output.embedPng(part.bytes) : await output.embedJpg(part.bytes);
  const page = output.addPage([image.width, image.height]);
  page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
}
