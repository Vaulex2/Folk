"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { uploadSheepPhoto } from "@/app/actions";
import { useI18n } from "@/components/I18nProvider";

const MAX_EDGE = 800;

/** Downscale to a small JPEG on the client so uploads stay well under the 1 MB action limit. */
async function downscale(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, w, h);
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("toBlob failed"))), "image/jpeg", 0.8);
  });
}

export default function PhotoUploader({
  sheepId,
  tag,
  photoUrl,
}: {
  sheepId: number;
  tag: string;
  photoUrl: string | null;
}) {
  const router = useRouter();
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // Shown immediately from the downscaled local file, before the upload round
  // trip resolves — swapping this in avoids a visible gap between picking a
  // photo and the avatar updating, without waiting on router.refresh()'s full
  // page re-fetch (getAllSheep + notes + matings + weights) just to show it.
  const [preview, setPreview] = useState<string | null>(null);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setError(null);
    let blob: Blob;
    try {
      blob = await downscale(file);
    } catch {
      setError("photo.errUpload");
      return;
    }
    setPreview(URL.createObjectURL(blob));
    start(async () => {
      const fd = new FormData();
      fd.set("sheep_id", String(sheepId));
      fd.set("file", new File([blob], `${sheepId}.jpg`, { type: "image/jpeg" }));
      const res = await uploadSheepPhoto({}, fd);
      if (res.error) {
        setError(res.error);
        setPreview(null);
      } else {
        router.refresh();
      }
    });
  }

  const shown = preview ?? photoUrl;

  return (
    <div className="photo-editor">
      <span className="avatar">
        {shown ? (
          preview ? (
            // Local blob: URI — next/image can't optimize it, and it's already
            // downscaled, so a plain <img> is correct here.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={shown} alt={tag} />
          ) : (
            <Image src={shown} alt={tag} width={84} height={84} />
          )
        ) : (
          tag
        )}
      </span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: "none" }}
        onChange={onChange}
      />
      <button
        className="btn btn-secondary"
        type="button"
        disabled={pending}
        onClick={() => inputRef.current?.click()}
      >
        {pending ? t("photo.uploading") : shown ? t("photo.change") : t("photo.add")}
      </button>
      {error && <span className="form-err">{t(error)}</span>}
    </div>
  );
}
