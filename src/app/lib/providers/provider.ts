export interface BarcodeProduct {
  barcode: string;
  name: string;
  category: string;
  brand?: string;
  image?: string;
  description?: string;
  source: string;
}

export interface BarcodeProvider {
  lookup(barcode: string): Promise<BarcodeProduct | null>;
}