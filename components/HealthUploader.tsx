'use client';

import { useState, useRef } from 'react';

export default function HealthUploader() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/health/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setUploadMessage(
          `Successfully imported ${data.activitiesSaved} activities from Apple Health!`
        );
        // Reset file input
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        // Trigger page refresh to show new activities
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        setUploadMessage(`Error: ${data.error || 'Failed to upload file'}`);
      }
    } catch (error) {
      setUploadMessage('Error uploading file. Please try again.');
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm border border-gray-200">
      <h3 className="text-lg font-semibold mb-2 text-gray-900">
        Upload Apple Health Data
      </h3>
      <p className="text-sm text-gray-600 mb-4">
        Export your Apple Health data from the Health app (Settings → Health → Export Health Data),
        then upload the ZIP file here.
      </p>

      <div className="space-y-3">
        <input
          ref={fileInputRef}
          type="file"
          accept=".zip"
          onChange={handleFileSelect}
          disabled={isUploading}
          className="block w-full text-sm text-gray-500
            file:mr-4 file:py-2 file:px-4
            file:rounded-lg file:border-0
            file:text-sm file:font-semibold
            file:bg-orange-50 file:text-orange-700
            hover:file:bg-orange-100
            disabled:opacity-50 disabled:cursor-not-allowed"
        />

        {isUploading && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-500"></div>
            Processing Apple Health data...
          </div>
        )}

        {uploadMessage && (
          <div
            className={`p-3 rounded-lg text-sm ${
              uploadMessage.includes('Error')
                ? 'bg-red-50 text-red-700'
                : 'bg-green-50 text-green-700'
            }`}
          >
            {uploadMessage}
          </div>
        )}
      </div>
    </div>
  );
}

