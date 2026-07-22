export interface BarcodeProvider {
  lookup(barcode: string): Promise<any | null>;
}

