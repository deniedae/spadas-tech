/**
 * Spadas End-to-End Scan Lifecycle Telemetry & Trace Engine
 * Instruments every scan with a unique scanId, granular stage timestamps,
 * stale-result rejection tracking, and empty-response protection metrics.
 */

export type ScanDecision =
  | "ACCEPTED_NEW_HIT"
  | "REJECTED_DUPLICATE_STALE"
  | "REJECTED_EMPTY_RESPONSE"
  | "REJECTED_LOW_CONFIDENCE"
  | "REJECTED_HARD_KILL_FILTER"
  | "FALLBACK_RETAINED_PREVIOUS"
  | "ABORTED_IN_FLIGHT";

export type ScanMode = "snap" | "sweep" | "barcode" | "deep" | "live";

export interface ScanTraceRecord {
  scanId: string;
  mode: ScanMode;
  timestamps: {
    t_capture_start: number;
    t_capture_end: number;
    t_request_dispatched: number;
    t_response_received: number;
    t_parse_completed: number;
    t_state_decision: number;
    t_render_committed: number;
  };
  latencies: {
    captureMs: number;
    networkMs: number;
    parseMs: number;
    decisionMs: number;
    renderMs: number;
    totalEndToEndMs: number;
  };
  decision: ScanDecision;
  decisionReason: string;
  productName?: string;
  brand?: string;
  confidence?: number;
  previousValidHitRetained: boolean;
}

// In-memory circular buffer for active telemetry diagnostics (last 50 scans)
const TRACE_BUFFER_LIMIT = 50;
const traceHistory: ScanTraceRecord[] = [];

export class ScanTrace {
  public readonly scanId: string;
  public readonly mode: ScanMode;
  private t_capture_start: number;
  private t_capture_end = 0;
  private t_request_dispatched = 0;
  private t_response_received = 0;
  private t_parse_completed = 0;
  private t_state_decision = 0;
  private t_render_committed = 0;

  private decision: ScanDecision = "ACCEPTED_NEW_HIT";
  private decisionReason = "Pending evaluation";
  private productName?: string;
  private brand?: string;
  private confidence?: number;
  private previousValidHitRetained = false;

  constructor(mode: ScanMode = "sweep") {
    this.scanId = `scan-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    this.mode = mode;
    this.t_capture_start = performance.now();
  }

  public markCaptureEnd(): void {
    this.t_capture_end = performance.now();
  }

  public markRequestDispatched(): void {
    this.t_request_dispatched = performance.now();
  }

  public markResponseReceived(): void {
    this.t_response_received = performance.now();
  }

  public markParseCompleted(): void {
    this.t_parse_completed = performance.now();
  }

  public markStateDecision(
    decision: ScanDecision,
    reason: string,
    meta?: { productName?: string; brand?: string; confidence?: number; previousRetained?: boolean }
  ): void {
    this.t_state_decision = performance.now();
    this.decision = decision;
    this.decisionReason = reason;
    if (meta?.productName) this.productName = meta.productName;
    if (meta?.brand) this.brand = meta.brand;
    if (typeof meta?.confidence === "number") this.confidence = meta.confidence;
    if (meta?.previousRetained !== undefined) this.previousValidHitRetained = meta.previousRetained;
  }

  public markRenderCommitted(): ScanTraceRecord {
    this.t_render_committed = performance.now();

    const record: ScanTraceRecord = {
      scanId: this.scanId,
      mode: this.mode,
      timestamps: {
        t_capture_start: this.t_capture_start,
        t_capture_end: this.t_capture_end || this.t_capture_start,
        t_request_dispatched: this.t_request_dispatched || this.t_capture_end,
        t_response_received: this.t_response_received || this.t_request_dispatched,
        t_parse_completed: this.t_parse_completed || this.t_response_received,
        t_state_decision: this.t_state_decision || this.t_parse_completed,
        t_render_committed: this.t_render_committed,
      },
      latencies: {
        captureMs: Math.max(0, Math.round((this.t_capture_end - this.t_capture_start) * 100) / 100),
        networkMs: Math.max(0, Math.round((this.t_response_received - this.t_request_dispatched) * 100) / 100),
        parseMs: Math.max(0, Math.round((this.t_parse_completed - this.t_response_received) * 100) / 100),
        decisionMs: Math.max(0, Math.round((this.t_state_decision - this.t_parse_completed) * 100) / 100),
        renderMs: Math.max(0, Math.round((this.t_render_committed - this.t_state_decision) * 100) / 100),
        totalEndToEndMs: Math.max(0, Math.round((this.t_render_committed - this.t_capture_start) * 100) / 100),
      },
      decision: this.decision,
      decisionReason: this.decisionReason,
      productName: this.productName,
      brand: this.brand,
      confidence: this.confidence,
      previousValidHitRetained: this.previousValidHitRetained,
    };

    // Store in circular telemetry buffer
    traceHistory.unshift(record);
    if (traceHistory.length > TRACE_BUFFER_LIMIT) {
      traceHistory.pop();
    }

    if (process.env.NODE_ENV !== "production") {
      console.log(`[ScanTrace:${record.scanId}] End-to-End: ${record.latencies.totalEndToEndMs}ms | Decision: ${record.decision} | Reason: ${record.decisionReason}`);
    }

    return record;
  }
}

/**
 * Returns latest telemetry traces for diagnostics and benchmarking.
 */
export function getRecentScanTraces(): ScanTraceRecord[] {
  return [...traceHistory];
}
