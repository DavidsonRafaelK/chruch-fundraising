"use client";

import { Button } from "@repo/design-system/components/ui/button";
import { Input } from "@repo/design-system/components/ui/input";
import { Label } from "@repo/design-system/components/ui/label";
import { ImageIcon, Loader2Icon, UploadIcon, XIcon } from "lucide-react";
import { useId, useRef, useState } from "react";
import { toast } from "sonner";
import { getUploadSignature } from "@/app/actions/content/upload";

interface ImageFieldProps {
  name: string;
  label: string;
  defaultValue?: string | null;
  required?: boolean;
}

const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Uploads straight to Cloudinary with a server-minted signature, then keeps the
 * resulting URL in a hidden input so the surrounding FormData-based forms keep
 * working unchanged. Pasting a URL by hand still works, which is also the
 * fallback when Cloudinary is not configured.
 */
export const ImageField = ({
  name,
  label,
  defaultValue,
  required = false,
}: ImageFieldProps) => {
  const inputId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(defaultValue ?? "");
  const [uploading, setUploading] = useState(false);

  const upload = async (file: File) => {
    if (file.size > MAX_BYTES) {
      toast.error("Image must be 10MB or smaller");
      return;
    }

    setUploading(true);

    try {
      const result = await getUploadSignature();

      if (!result.ok) {
        toast.error(result.error);
        return;
      }

      const { cloudName, apiKey, timestamp, folder, signature, uploadUrl } =
        result.signature;

      const body = new FormData();
      body.append("file", file);
      body.append("api_key", apiKey);
      body.append("timestamp", String(timestamp));
      body.append("folder", folder);
      body.append("signature", signature);

      const response = await fetch(uploadUrl, { method: "POST", body });
      const payload = await response.json();

      if (!response.ok) {
        toast.error(payload?.error?.message ?? "Upload failed");
        return;
      }

      setValue(payload.secure_url);
      toast.success(`Uploaded to ${cloudName}`);
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);

      if (fileRef.current) {
        fileRef.current.value = "";
      }
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={inputId}>{label}</Label>

      <input name={name} type="hidden" value={value} />

      {value ? (
        <div className="relative overflow-hidden rounded-lg border">
          {/* biome-ignore lint/performance/noImgElement: images come from arbitrary hosts */}
          <img
            alt={label}
            className="h-40 w-full bg-muted object-cover"
            src={value}
          />
          <Button
            className="absolute top-2 right-2"
            onClick={() => setValue("")}
            size="icon"
            type="button"
            variant="secondary"
          >
            <XIcon className="h-4 w-4" />
            <span className="sr-only">Remove image</span>
          </Button>
        </div>
      ) : (
        <button
          className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-muted-foreground text-sm transition-colors hover:bg-muted/50 disabled:opacity-60"
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          type="button"
        >
          {uploading ? (
            <>
              <Loader2Icon className="h-5 w-5 animate-spin" />
              Uploading...
            </>
          ) : (
            <>
              <ImageIcon className="h-5 w-5" />
              Click to upload an image
            </>
          )}
        </button>
      )}

      <input
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];

          if (file) {
            void upload(file);
          }
        }}
        ref={fileRef}
        type="file"
      />

      <div className="flex gap-2">
        <Input
          id={inputId}
          onChange={(event) => setValue(event.target.value)}
          placeholder="Or paste an image URL"
          required={required}
          value={value}
        />
        <Button
          disabled={uploading}
          onClick={() => fileRef.current?.click()}
          size="icon"
          type="button"
          variant="outline"
        >
          <UploadIcon className="h-4 w-4" />
          <span className="sr-only">Upload {label}</span>
        </Button>
      </div>
    </div>
  );
};
