'use client';

import { useState } from 'react';

export default function ShareableGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generateShareable = async () => {
    try {
      setIsGenerating(true);
      setError(null);

      const response = await fetch('/api/shareable');
      
      if (!response.ok) {
        throw new Error('Failed to generate graphic');
      }

      // Get the image blob
      const blob = await response.blob();
      
      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `fitness-wrapped-${new Date().getFullYear()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error generating shareable:', err);
      setError('Failed to generate graphic. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold mb-2 text-gray-900">
            Share Your Fitness Wrapped
          </h2>
          <p className="text-gray-600 text-sm">
            Generate a shareable Instagram Stories graphic with your fitness stats and heatmap
          </p>
        </div>
        <button
          onClick={generateShareable}
          disabled={isGenerating}
          className={`
            px-6 py-3 rounded-lg font-semibold text-white
            transition-all duration-200
            ${isGenerating
              ? 'bg-orange-400 cursor-not-allowed'
              : 'bg-orange-500 hover:bg-orange-600 hover:shadow-lg'
            }
            flex items-center gap-2
          `}
        >
          {isGenerating ? (
            <>
              <svg
                className="animate-spin h-5 w-5"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              Generating...
            </>
          ) : (
            <>
              <svg
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Generate & Download
            </>
          )}
        </button>
      </div>
      {error && (
        <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}
    </div>
  );
}

