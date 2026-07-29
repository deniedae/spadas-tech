"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Upload, X, Camera } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ImageDropzoneProps {
  files: File[];
  onFilesChange: (files: File[]) => void;
  max?: number;
  disabled?: boolean;
}

export default function ImageDropzone({
  files,
  onFilesChange,
  max = 10,
  disabled = false,
}: ImageDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [previews, setPreviews] = useState<{ url: string; name: string }[]>([]);

  useEffect(() => {
    const next = files.map((f) => ({ url: URL.createObjectURL(f), name: f.name }));
    setPreviews(next);
    return () => next.forEach((p) => URL.revokeObjectURL(p.url));
  }, [files]);

  const addFiles = useCallback(
    (incoming: FileList | null) => {
      if (!incoming || disabled) return;
      const allowed = Array.from(incoming)
        .filter((f) => f.type.startsWith("image/"))
        .slice(0, max - files.length);
      if (allowed.length === 0) return;
      onFilesChange([...files, ...allowed]);
    },
    [files, onFilesChange, max, disabled],
  );

  const removeAt = (idx: number) => onFilesChange(files.filter((_, i) => i !== idx));
  const full = files.length >= max;

  return (
    <div className="space-y-4">
      <div
        role="button"
        tabIndex={0}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !disabled) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          addFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-border bg-muted/30 px-6 py-10 text-center transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
          dragging && "border-primary bg-primary/5",
          disabled && "cursor-not-allowed opacity-60",
          !disabled && "cursor-pointer hover:border-primary/50 hover:bg-muted/50",
        )}
      >
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Upload className="h-5 w-5" />
        </div>
        <p className="text-sm font-medium">
          {full ? `Maximum of ${max} images reached` : "Drag & drop product photos here"}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          PNG or JPG, up to {max} images{!full && " — or click to browse"}
        </p>

        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          disabled={disabled}
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {!full && (
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          disabled={disabled}
          className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline disabled:opacity-50"
        >
          <Camera className="h-4 w-4" /> Take a photo
        </button>
      )}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        disabled={disabled}
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {previews.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5">
          {previews.map((p, i) => (
            <div
              key={p.url}
              className="group relative aspect-square overflow-hidden rounded-xl border border-border bg-muted shadow-sm"
            >
              <img src={p.url} alt={p.name} className="h-full w-full object-cover" />
              <button
                type="button"
                onClick={() => removeAt(i)}
                aria-label={`Remove image ${i + 1}`}
                className="absolute right-1.5 top-1.5 inline-flex h-7 w-7 items-center justify-center rounded-lg bg-background/80 text-foreground shadow-sm backdrop-blur opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
              >
                <X className="h-4 w-4" />
              </button>
              {i === 0 && (
                <span className="absolute bottom-1.5 left-1.5 rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">
                  Cover
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
