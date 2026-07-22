export interface MarketAnalysis {
  averagePrice: number;
  lowestPrice: number;
  highestPrice: number;
  suggestedPrice: number;
  confidence: number;
  sampleSize: number;
  source: string;
}

export async function getMarketAnalysis(
  barcode: string,
  title: string
): Promise<MarketAnalysis | null> {
  // Placeholder until we connect a real provider
  return null;
}