import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";

export interface CameraHardwareControls {
  torchEnabled: boolean;
  torchSupported: boolean;
  toggleTorch: () => Promise<void>;
  zoomLevel: number;
  setZoomLevel: (zoom: number) => void;
  zoomSupported: boolean;
  maxZoom: number;
}

/**
 * Custom hook managing WebRTC hardware constraints (torch/flashlight and optical zoom).
 * Safely inspects browser track capabilities before attempting to apply constraints.
 */
export function useCameraHardwareControls(stream: MediaStream | null): CameraHardwareControls {
  const [torchEnabled, setTorchEnabled] = useState<boolean>(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [torchSupported, setTorchSupported] = useState<boolean>(false);
  const [zoomSupported, setZoomSupported] = useState<boolean>(false);
  const [maxZoom, setMaxZoom] = useState<number>(3);

  // WebRTC Hardware Capability Check (Torch & Optical Zoom)
  useEffect(() => {
    if (!stream) {
      setTorchSupported(false);
      setZoomSupported(false);
      setTorchEnabled(false);
      setZoomLevel(1);
      return;
    }
    const track = stream.getVideoTracks()[0];
    if (track && typeof track.getCapabilities === "function") {
      try {
        const capabilities: any = track.getCapabilities();
        if ("torch" in capabilities) {
          setTorchSupported(true);
        }
        if ("zoom" in capabilities) {
          setZoomSupported(true);
          if (capabilities.zoom?.max) {
            setMaxZoom(Math.min(5, capabilities.zoom.max));
          }
        }
      } catch (err) {
        console.warn("[WebRTC] Capabilities check error:", err);
      }
    }
  }, [stream]);

  // Direct WebRTC Hardware Torch Toggle Handler
  const toggleTorch = useCallback(async () => {
    if (!torchSupported || !stream) {
      return;
    }
    const nextState = !torchEnabled;

    const track = stream.getVideoTracks()[0];
    if (track && typeof track.applyConstraints === "function") {
      try {
        await track.applyConstraints({
          advanced: [{ torch: nextState } as any],
        });
        setTorchEnabled(nextState);
        toast.success(nextState ? "🔦 Flashlight ON" : "Flashlight OFF");
      } catch (err) {
        console.warn("[WebRTC Torch Notice]: Torch unsupported on active lens:", err);
        setTorchSupported(false);
        setTorchEnabled(false);
      }
    } else {
      setTorchSupported(false);
      setTorchEnabled(false);
    }
  }, [torchSupported, stream, torchEnabled]);

  // Dynamically Apply Hardware Zoom Constraints
  useEffect(() => {
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (!track || typeof track.applyConstraints !== "function") return;

    if (zoomSupported) {
      track
        .applyConstraints({ advanced: [{ zoom: zoomLevel } as any] })
        .catch((err) => {
          console.warn("[WebRTC] zoom applyConstraints error:", err);
        });
    }
  }, [stream, zoomLevel, zoomSupported]);

  return {
    torchEnabled,
    torchSupported,
    toggleTorch,
    zoomLevel,
    setZoomLevel,
    zoomSupported,
    maxZoom,
  };
}
