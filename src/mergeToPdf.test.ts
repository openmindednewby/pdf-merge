import { PDFDocument, StandardFonts } from 'pdf-lib';

import { mergeToPdf } from './mergeToPdf';
import { PdfMergeError } from './PdfMergeError';
import { PdfMergeFailure } from './PdfMergeFailure';
import { MergePart, MergePartMime } from './types';

interface PdfJsTextItem {
  str?: string;
}

interface PdfJsLike {
  getDocument(source: { data: Uint8Array }): {
    promise: Promise<{ getPage(pageNumber: number): Promise<{ getTextContent(): Promise<{ items: PdfJsTextItem[] }> }> }>;
  };
}

const pdfjs = require('pdfjs-dist/legacy/build/pdf.js') as PdfJsLike;

const PAGE_HEIGHT = 100;
const SAMPLE_TEXT = 'Selectable text 42';
const ONE_PIXEL_PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
const ONE_PIXEL_JPEG =
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=';

async function makePdf(widths: number[]): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  widths.forEach((width) => doc.addPage([width, PAGE_HEIGHT]));
  return doc.save();
}

async function pageSizes(bytes: Uint8Array): Promise<{ width: number; height: number }[]> {
  const doc = await PDFDocument.load(bytes);
  return doc.getPages().map((page) => page.getSize());
}

async function makeTextPdf(text: string): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  doc.addPage([300, PAGE_HEIGHT]).drawText(text, { x: 10, y: 50, size: 12, font });
  return doc.save();
}

async function firstPageText(bytes: Uint8Array): Promise<string> {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(bytes) }).promise;
  const content = await (await doc.getPage(1)).getTextContent();
  return content.items.map((item) => item.str ?? '').join('');
}

function fromBase64(value: string): Uint8Array {
  return new Uint8Array(Buffer.from(value, 'base64'));
}

async function failureOf(parts: MergePart[]): Promise<PdfMergeFailure | undefined> {
  try {
    await mergeToPdf(parts);
    return undefined;
  } catch (error) {
    return error instanceof PdfMergeError ? error.reason : undefined;
  }
}

describe('mergeToPdf', () => {
  it('with two PDFs, returns their pages summed in input order', async () => {
    const first = await makePdf([100]);
    const second = await makePdf([200, 300]);

    const merged = await mergeToPdf([
      { bytes: first, mime: 'application/pdf' },
      { bytes: second, mime: 'application/pdf' },
    ]);

    expect((await pageSizes(merged)).map((size) => size.width)).toEqual([100, 200, 300]);
  });

  it('with a PNG, returns one page sized to the image', async () => {
    const png = fromBase64(ONE_PIXEL_PNG);

    const merged = await mergeToPdf([{ bytes: png, mime: 'image/png' }]);

    expect(await pageSizes(merged)).toEqual([{ width: 1, height: 1 }]);
  });

  it('with a JPEG after a PDF, returns the PDF page then one image page', async () => {
    const pdf = await makePdf([400]);
    const jpeg = fromBase64(ONE_PIXEL_JPEG);

    const merged = await mergeToPdf([
      { bytes: pdf, mime: 'application/pdf' },
      { bytes: jpeg, mime: 'image/jpeg' },
    ]);

    expect(await pageSizes(merged)).toEqual([
      { width: 400, height: PAGE_HEIGHT },
      { width: 1, height: 1 },
    ]);
  });

  it('with a PDF holding text, keeps that text readable in the merged PDF', async () => {
    const source = await makeTextPdf(SAMPLE_TEXT);

    const merged = await mergeToPdf([{ bytes: source, mime: 'application/pdf' }]);

    expect(await firstPageText(merged)).toBe(SAMPLE_TEXT);
  });

  it('with no parts, rejects with EmptyInput', async () => {
    const parts: MergePart[] = [];

    const failure = await failureOf(parts);

    expect(failure).toBe(PdfMergeFailure.EmptyInput);
  });

  it('with an unsupported mime, rejects with UnsupportedMime', async () => {
    const pdf = await makePdf([100]);
    const parts: MergePart[] = [
      { bytes: pdf, mime: 'application/pdf' },
      { bytes: fromBase64(ONE_PIXEL_PNG), mime: 'image/gif' as unknown as MergePartMime },
    ];

    const failure = await failureOf(parts);

    expect(failure).toBe(PdfMergeFailure.UnsupportedMime);
  });
});
