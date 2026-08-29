"use client";

import { useState } from "react";

export default function ImageKitTestPage() {
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [url, setUrl] = useState("");

  async function handleUpload() {
    if (!file) {
      setMessage("Please select an image.");
      return;
    }

    setMessage("Uploading...");
    setUrl("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", "/gosh/test");

    try {
      const response = await fetch("/api/upload/imagekit", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Upload failed");
      }

      setUrl(data.url);
      setMessage("Upload successful!");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Upload failed"
      );
    }
  }

  return (
    <main className="min-h-screen p-10">
      <h1 className="mb-6 text-2xl font-bold">
        ImageKit Upload Test
      </h1>

      <input
        type="file"
        accept="image/*"
        onChange={(event) => {
          setFile(event.target.files?.[0] ?? null);
        }}
      />

      <button
        type="button"
        onClick={handleUpload}
        className="mt-4 rounded bg-black px-5 py-2 text-white"
      >
        Upload
      </button>

      {message && (
        <p className="mt-4">
          {message}
        </p>
      )}

      {url && (
        <div className="mt-6">
          <p className="mb-2 font-medium">Uploaded image:</p>

          <img
            src={url}
            alt="Uploaded"
            className="max-w-md rounded-lg"
          />

          <p className="mt-3 break-all text-sm">
            {url}
          </p>
        </div>
      )}
    </main>
  );
}