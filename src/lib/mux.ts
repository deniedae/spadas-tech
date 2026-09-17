import Mux from "@mux/mux-node";

/**
 * Returns an authenticated Mux client if credentials are configured in the environment.
 */
export function getMuxClient(): Mux | null {
  const tokenId = process.env.MUX_TOKEN_ID;
  const tokenSecret = process.env.MUX_TOKEN_SECRET;

  if (!tokenId || !tokenSecret) {
    return null;
  }

  return new Mux({
    tokenId,
    tokenSecret,
  });
}

/**
 * Checks if Mux is configured in environment variables.
 */
export function isMuxConfigured(): boolean {
  return Boolean(process.env.MUX_TOKEN_ID && process.env.MUX_TOKEN_SECRET);
}

export interface DirectUploadResult {
  uploadUrl: string;
  uploadId: string;
}

/**
 * Creates a direct upload URL for client-side uploads to Mux.
 * Allows uploading large video files directly from browser without serverless payload limits.
 */
export async function createDirectUpload(): Promise<DirectUploadResult> {
  const mux = getMuxClient();
  if (!mux) {
    throw new Error("Mux is not configured. Please set MUX_TOKEN_ID and MUX_TOKEN_SECRET in your .env.local file.");
  }

  const upload = await mux.video.uploads.create({
    new_asset_settings: {
      playback_policy: ["public"],
      encoding_tier: "baseline",
    },
    cors_origin: "*",
  });

  if (!upload.url) {
    throw new Error("Mux did not return a valid direct upload URL");
  }

  return {
    uploadUrl: upload.url,
    uploadId: upload.id,
  };
}

/**
 * Retrieves the status and playback ID of a direct upload or its resulting asset.
 */
export async function getUploadStatus(uploadId: string) {
  const mux = getMuxClient();
  if (!mux) {
    throw new Error("Mux is not configured.");
  }

  const upload = await mux.video.uploads.retrieve(uploadId);

  if (upload.asset_id) {
    const asset = await mux.video.assets.retrieve(upload.asset_id);
    const playbackId = asset.playback_ids?.[0]?.id ?? null;
    return {
      status: asset.status, // 'preparing' | 'ready' | 'errored'
      uploadStatus: upload.status,
      assetId: asset.id,
      playbackId,
      duration: asset.duration,
      aspectRatio: asset.aspect_ratio,
    };
  }

  return {
    status: "waiting",
    uploadStatus: upload.status,
    assetId: null,
    playbackId: null,
    duration: null,
    aspectRatio: null,
  };
}
