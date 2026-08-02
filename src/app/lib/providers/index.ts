export interface BarcodeProvider {
  lookup(barcode: string): Promise<Record<string, unknown> | null>;
}

