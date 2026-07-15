"use client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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

export default function PhotoUploader({ sheepId, hasPhoto }: { sheepId: number; hasPhoto: boolean }) {
  const router = useRouter();
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

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
    start(async () => {
      const fd = new FormData();
      fd.set("sheep_id", String(sheepId));
      fd.set("file", new File([blob], `${sheepId}.jpg`, { type: "image/jpeg" }));
      const res = await uploadSheepPhoto({}, fd);
      if (res.error) setError(res.error);
      else router.refresh();
    });
  }

  return (
    <>
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
        {pending ? t("photo.uploading") : hasPhoto ? t("photo.change") : t("photo.add")}
      </button>
      {error && <span className="form-err">{t(error)}</span>}
    </>
  );
}
