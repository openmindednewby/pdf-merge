export type MergePartMime = 'application/pdf' | 'image/png' | 'image/jpeg';

export interface MergePart {
  bytes: Uint8Array;
  mime: MergePartMime;
}
