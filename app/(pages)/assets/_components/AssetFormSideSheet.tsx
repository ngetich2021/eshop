// app/assets/_components/AssetFormSideSheet.tsx
"use client";

import { ArrowLeft, Loader2, Eye, Upload, X, Link } from "lucide-react";
import { useRef, useEffect, useState } from "react";
import { useActionState } from "react";
import { saveAssetAction, uploadToCloudinaryAction } from "./actions";

type ActionResult = { success: boolean; error?: string };

type AssetToEdit = {
  id: string;
  itemName: string;
  imageUrl: string | null;
  cost: number;
  shopId: string;
};

type Props = {
  mode: "add" | "edit" | "view";
  assetToEdit?: AssetToEdit | null;
  shopId: string;
  onSuccess: () => void;
  onClose: () => void;
};

export default function AssetFormSideSheet({ mode, assetToEdit, shopId, onSuccess, onClose }: Props) {
  const isView = mode === "view";
  const isEdit = mode === "edit";
  const formRef = useRef<HTMLFormElement>(null);

  const [imageUrl, setImageUrl] = useState<string>(assetToEdit?.imageUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [urlInputMode, setUrlInputMode] = useState(false);
  const [urlDraft, setUrlDraft] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [state, submitAction, isPending] = useActionState<ActionResult, FormData>(
    async (prev, formData) => {
      formData.set("shopId", shopId);
      formData.set("imageUrl", imageUrl);
      return await saveAssetAction(prev, formData);
    },
    { success: false }
  );

  useEffect(() => { if (state?.success) onSuccess(); }, [state?.success, onSuccess]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview immediately before upload
    const localUrl = URL.createObjectURL(file);
    setImageUrl(localUrl);
    setUploading(true);
    setUploadError(null);

    const fd = new FormData();
    fd.append("file", file);
    const res = await uploadToCloudinaryAction(fd);

    setUploading(false);
    // Revoke the local object URL
    URL.revokeObjectURL(localUrl);

    if (res.success && res.url) {
      setImageUrl(res.url);
    } else {
      // Keep preview but show error — the form still has the local URL
      // which won't be persisted, so clear it to avoid saving a blob URL
      setImageUrl("");
      setUploadError(res.error ?? "Upload failed");
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleUrlSubmit = () => {
    const trimmed = urlDraft.trim();
    if (trimmed) {
      setImageUrl(trimmed);
      setUrlDraft("");
    }
    setUrlInputMode(false);
  };

  const inputCls = `w-full border border-gray-300 rounded-2xl px-5 py-3.5 text-base`;
  const viewCls = `${inputCls} bg-gray-50 cursor-not-allowed`;
  const editCls = `${inputCls} focus:border-green-400 focus:ring-2 focus:ring-green-100 outline-none`;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex justify-end">
      <div className="w-full max-w-[380px] md:max-w-[520px] lg:max-w-[680px] h-full bg-white shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center gap-4 border-b px-6 py-5">
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
            <ArrowLeft size={26} />
          </button>
          <h2 className="text-2xl font-semibold flex items-center gap-3">
            {isView ? <><Eye size={28} className="text-gray-600" /> View Asset</> : isEdit ? "Edit Asset" : "Add Asset"}
          </h2>
        </div>

        <form ref={formRef} action={submitAction} className="flex-1 overflow-y-auto p-6 md:p-8 lg:p-10 space-y-8">
          {assetToEdit?.id && <input type="hidden" name="assetId" value={assetToEdit.id} />}

          {state?.error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-2xl text-center font-medium">
              {state.error}
            </div>
          )}

          {/* Item Name */}
          <div>
            <label className="block mb-1.5 text-sm font-medium text-gray-700">Item Name:</label>
            <input
              name="itemName"
              defaultValue={assetToEdit?.itemName || ""}
              required
              readOnly={isView}
              placeholder="e.g. Dell Laptop"
              className={isView ? viewCls : editCls}
            />
          </div>

          {/* Cost */}
          <div>
            <label className="block mb-1.5 text-sm font-medium text-gray-700">Cost (KSh):</label>
            <input
              name="cost"
              type="number"
              defaultValue={assetToEdit?.cost || ""}
              readOnly={isView}
              className={isView ? viewCls : editCls}
            />
          </div>

          {/* Image */}
          <div>
            <label className="block mb-1.5 text-sm font-medium text-gray-700">Image:</label>

            {/* Preview */}
            {imageUrl && (
              <div className="relative mb-3 inline-block">
                <img
                  src={imageUrl}
                  alt="Asset preview"
                  className="w-36 h-36 rounded-xl object-cover border border-gray-200 shadow-sm"
                  onError={() => {
                    // If URL is invalid, clear it
                    if (imageUrl.startsWith("blob:")) return; // local preview — wait for upload
                    setUploadError("Image URL could not be loaded");
                    setImageUrl("");
                  }}
                />
                {uploading && (
                  <div className="absolute inset-0 rounded-xl bg-black/40 flex items-center justify-center">
                    <Loader2 size={24} className="animate-spin text-white" />
                  </div>
                )}
                {!isView && !uploading && (
                  <button
                    type="button"
                    onClick={() => setImageUrl("")}
                    className="absolute -top-2 -right-2 p-1 bg-red-500 text-white rounded-full shadow"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            )}

            {!isView && (
              <div className="space-y-2">
                {/* Upload from device */}
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => fileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
                  >
                    {uploading ? (
                      <><Loader2 size={16} className="animate-spin" /> Uploading...</>
                    ) : (
                      <><Upload size={16} /> {imageUrl ? "Change Image" : "Upload Image"}</>
                    )}
                  </button>
                </div>

                {/* Paste URL instead */}
                {!urlInputMode ? (
                  <button
                    type="button"
                    onClick={() => setUrlInputMode(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-dashed border-gray-300 text-sm font-medium text-gray-500 hover:bg-gray-50"
                  >
                    <Link size={14} /> Or paste image URL
                  </button>
                ) : (
                  <div className="flex gap-2 items-center">
                    <input
                      value={urlDraft}
                      onChange={(e) => setUrlDraft(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleUrlSubmit())}
                      placeholder="https://example.com/image.jpg"
                      className="flex-1 border border-gray-300 rounded-xl px-3 py-2 text-sm focus:border-green-400 outline-none"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={handleUrlSubmit}
                      className="px-3 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700"
                    >
                      Set
                    </button>
                    <button
                      type="button"
                      onClick={() => { setUrlInputMode(false); setUrlDraft(""); }}
                      className="px-3 py-2 border border-gray-300 rounded-xl text-sm hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                )}

                {uploadError && (
                  <p className="text-xs text-red-600 mt-1">{uploadError}</p>
                )}
                <p className="text-xs text-gray-400">
                  Upload from device (max 10 MB) or paste an image URL directly.
                </p>
              </div>
            )}

            {isView && !imageUrl && (
              <div className="w-36 h-36 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
                No image
              </div>
            )}
          </div>

          {!isView && (
            <button
              type="submit"
              disabled={isPending || uploading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white py-4 text-xl font-semibold rounded-2xl flex items-center justify-center gap-2"
            >
              {isPending ? <Loader2 size={24} className="animate-spin" /> : isEdit ? "Update Asset" : "Add Asset"}
            </button>
          )}
        </form>
      </div>
    </div>
  );
}