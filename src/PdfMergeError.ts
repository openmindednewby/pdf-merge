import { PdfMergeFailure } from './PdfMergeFailure';

export class PdfMergeError extends Error {
  public readonly reason: PdfMergeFailure;

  public constructor(reason: PdfMergeFailure, message: string) {
    super(message);
    this.name = 'PdfMergeError';
    this.reason = reason;
  }
}
