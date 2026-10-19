import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  isFrameWorkerSupported,
  executeOffThreadFocalCrop,
  terminateFrameWorker,
} from "../camera-frame-worker-engine";

describe("camera-frame-worker-engine", () => {
  afterEach(() => {
    terminateFrameWorker();
  });

  describe("environment detection", () => {
    it("safely detects lack of Worker/OffscreenCanvas in Node environment without throwing", () => {
      const supported = isFrameWorkerSupported();
      expect(typeof supported).toBe("boolean");
      // In headless Node, Worker/OffscreenCanvas is typically absent
      expect(supported).toBe(false);
    });
  });

  describe("executeOffThreadFocalCrop contract & validation", () => {
    it("rejects immediately with clear error if video element has invalid or zero dimensions", async () => {
      const mockVideo = {
        videoWidth: 0,
        videoHeight: 0,
        readyState: 0,
      } as unknown as HTMLVideoElement;

      await expect(executeOffThreadFocalCrop(mockVideo)).rejects.toThrow(
        /invalid dimensions/i
      );
    });

    it("rejects immediately if video width or height is negative or undefined", async () => {
      const mockVideo = {
        videoWidth: -10,
        videoHeight: 720,
        readyState: 4,
      } as unknown as HTMLVideoElement;

      await expect(executeOffThreadFocalCrop(mockVideo)).rejects.toThrow(
        /invalid dimensions/i
      );
    });
  });

  describe("worker lifecycle", () => {
    it("terminateFrameWorker can be called safely even when no worker is active", () => {
      expect(() => terminateFrameWorker()).not.toThrow();
    });
  });
});
