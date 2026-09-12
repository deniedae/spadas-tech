import React, { Component, ReactNode } from "react";
import { ShieldAlert, RefreshCw, X } from "lucide-react";

// ── CameraErrorBoundary ────────────────────────────────────────────
interface ErrorBoundaryProps { children: ReactNode; }
interface ErrorBoundaryState { hasError: boolean; }

export class CameraErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(): ErrorBoundaryState { return { hasError: true }; }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[CameraErrorBoundary] Caught unhandled camera UI error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full box-border rounded-3xl border border-amber-500/40 bg-slate-950 p-6 text-center text-slate-200 shadow-2xl my-4 space-y-3">
          <ShieldAlert className="mx-auto h-12 w-12 text-amber-400" />
          <h4 className="font-bold text-lg text-slate-100">Scanner Recovered From Temporary Exception</h4>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            The AR camera feed caught an invalid frame payload or API error and reset safely without breaking the main app.
          </p>
          <button
            type="button"
            onClick={() => this.setState({ hasError: false })}
            className="inline-flex h-10 items-center gap-2 rounded-xl bg-cyan-600 px-5 text-xs font-bold text-white hover:bg-cyan-500 shadow-lg"
          >
            <RefreshCw className="h-4 w-4" /> Restart Camera Feed
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── ValuationCardErrorBoundary ─────────────────────────────────────
interface ValuationCardErrorBoundaryProps {
  children: ReactNode;
  onRetry?: () => void;
  onDismiss?: () => void;
}
interface ValuationCardErrorBoundaryState { hasError: boolean; }

export class ValuationCardErrorBoundary extends Component<ValuationCardErrorBoundaryProps, ValuationCardErrorBoundaryState> {
  constructor(props: ValuationCardErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(): ValuationCardErrorBoundaryState { return { hasError: true }; }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[ValuationCardErrorBoundary] Caught valuation card rendering error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full rounded-2xl bg-slate-950/95 border border-amber-500/50 p-3 shadow-xl backdrop-blur-xl flex items-center justify-between gap-2.5 animate-in fade-in zoom-in-95 select-none">
          <div className="flex items-center gap-2 min-w-0">
            <ShieldAlert className="h-4 w-4 text-amber-400 shrink-0" />
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-slate-100 truncate">Valuation data issue</span>
              <span className="text-[10px] text-slate-400 truncate">Isolated safely • Session preserved</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {this.props.onRetry && (
              <button
                type="button"
                onClick={() => { this.setState({ hasError: false }); this.props.onRetry?.(); }}
                className="inline-flex items-center gap-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black px-2.5 py-1 rounded-lg text-[10px] transition cursor-pointer active:scale-95"
              >
                <RefreshCw className="h-3 w-3" /><span>Retry</span>
              </button>
            )}
            {this.props.onDismiss && (
              <button
                type="button"
                onClick={() => { this.setState({ hasError: false }); this.props.onDismiss?.(); }}
                className="text-slate-400 hover:text-white p-1"
                title="Dismiss"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── CameraViewportErrorBoundary ────────────────────────────────────
interface CameraViewportErrorBoundaryProps {
  children: ReactNode;
  onRestart?: () => void;
}
interface CameraViewportErrorBoundaryState { hasError: boolean; }

export class CameraViewportErrorBoundary extends Component<CameraViewportErrorBoundaryProps, CameraViewportErrorBoundaryState> {
  constructor(props: CameraViewportErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(): CameraViewportErrorBoundaryState { return { hasError: true }; }
  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("[CameraViewportErrorBoundary] Caught viewport error:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center p-6 text-center bg-slate-950 text-slate-200 space-y-3">
          <ShieldAlert className="h-10 w-10 text-amber-400" />
          <h4 className="font-bold text-sm text-slate-100">Camera Viewport Recovered</h4>
          <p className="text-xs text-slate-400 max-w-xs">A camera frame rendering glitch occurred and was isolated safely.</p>
          <button
            type="button"
            onClick={() => { this.setState({ hasError: false }); this.props.onRestart?.(); }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-600 px-4 py-2 text-xs font-bold text-white hover:bg-cyan-500 shadow-lg cursor-pointer"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Resume Viewport
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
