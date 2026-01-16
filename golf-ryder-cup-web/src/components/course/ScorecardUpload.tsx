'use client';

import { useState, useCallback, useRef } from 'react';
import { Upload, FileImage, Loader2, Check, AlertCircle, X, Camera } from 'lucide-react';
import type { HoleData } from './HoleDataEditor';

/**
 * SCORECARD UPLOAD
 *
 * Upload a photo or PDF of a golf scorecard and automatically
 * extract hole data using AI vision.
 */

export interface TeeSetData {
  name: string;
  color?: string;
  rating?: number;
  slope?: number;
  yardages: (number | null)[];
}

export interface ScorecardData {
  courseName?: string;
  teeName?: string;
  rating?: number;
  slope?: number;
  holes: HoleData[];
  teeSets?: TeeSetData[];
}

interface ScorecardUploadProps {
  onDataExtracted: (data: ScorecardData) => void;
  onClose: () => void;
}

type UploadStatus = 'idle' | 'uploading' | 'processing' | 'success' | 'error';

export function ScorecardUpload({ onDataExtracted, onClose }: ScorecardUploadProps) {
  const [status, setStatus] = useState<UploadStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [extractedData, setExtractedData] = useState<ScorecardData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    setStatus('uploading');
    setError(null);

    // Validate file type - now images only (PDF not supported by AI vision)
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];

    // Check if PDF and show helpful message
    if (file.type === 'application/pdf') {
      setStatus('error');
      setError('PDF files are not supported. Please take a photo of your scorecard or screenshot the PDF first.');
      return;
    }

    if (!validTypes.includes(file.type)) {
      setStatus('error');
      setError('Please upload an image (JPEG, PNG, HEIC, or WebP)');
      return;
    }

    // Check file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setStatus('error');
      setError('File too large. Maximum size is 10MB');
      return;
    }

    try {
      // Read file as base64
      const reader = new FileReader();
      const base64Promise = new Promise<string>((resolve, reject) => {
        reader.onload = () => {
          const result = reader.result as string;
          // Extract base64 data (remove data URL prefix)
          const base64 = result.split(',')[1];
          resolve(base64);
        };
        reader.onerror = reject;
      });
      reader.readAsDataURL(file);

      // Show preview for images
      if (file.type.startsWith('image/')) {
        setPreview(URL.createObjectURL(file));
      } else {
        setPreview(null);
      }

      const base64Data = await base64Promise;

      setStatus('processing');

      // Call the OCR API
      const response = await fetch('/api/scorecard-ocr', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: base64Data,
          mimeType: file.type,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to process scorecard');
      }

      setExtractedData(result.data);
      setStatus('success');

      if (result.message) {
        // Demo mode notice
        console.log(result.message);
      }
    } catch (err) {
      console.error('Error processing scorecard:', err);
      setStatus('error');
      setError(err instanceof Error ? err.message : 'Failed to process scorecard');
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  }, [processFile]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  }, [processFile]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const handleUseData = useCallback(() => {
    if (extractedData) {
      onDataExtracted(extractedData);
    }
  }, [extractedData, onDataExtracted]);

  const resetUpload = useCallback(() => {
    setStatus('idle');
    setError(null);
    setPreview(null);
    setExtractedData(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }}
    >
      <div
        className="w-full max-w-lg rounded-2xl shadow-xl"
        style={{ background: 'var(--surface-card)', maxHeight: '90vh', overflow: 'auto' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--rule)' }}>
          <div className="flex items-center gap-3">
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: 'var(--radius-md)',
                background: 'linear-gradient(135deg, var(--masters) 0%, var(--masters-deep) 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Camera size={20} style={{ color: 'var(--color-accent)' }} />
            </div>
            <div>
              <h3 className="type-title-sm">Scan Scorecard</h3>
              <p className="type-caption" style={{ color: 'var(--ink-tertiary)' }}>
                Upload a photo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg transition-colors"
            style={{ color: 'var(--ink-tertiary)' }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          {status === 'idle' && (
            <>
              {/* Upload Area */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-colors hover:border-[var(--masters)]"
                style={{ borderColor: 'var(--rule)', background: 'var(--surface-elevated)' }}
              >
                <Upload size={48} className="mx-auto mb-4" style={{ color: 'var(--ink-tertiary)' }} />
                <p className="type-body font-medium mb-2">Drop scorecard image here</p>
                <p className="type-caption mb-4" style={{ color: 'var(--ink-tertiary)' }}>
                  or click to browse
                </p>
                <div className="flex items-center justify-center gap-4 text-xs" style={{ color: 'var(--ink-muted)' }}>
                  <span className="flex items-center gap-1">
                    <FileImage size={14} />
                    JPEG, PNG, HEIC
                  </span>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* Tips */}
              <div className="mt-4 p-3 rounded-lg" style={{ background: 'var(--surface-elevated)' }}>
                <p className="type-meta font-medium mb-2">Tips for best results:</p>
                <ul className="type-caption space-y-1" style={{ color: 'var(--ink-secondary)' }}>
                  <li>- Take a clear, well-lit photo of the scorecard</li>
                  <li>- Make sure all hole numbers, pars, and handicaps are visible</li>
                  <li>- Include the tee name and rating/slope if available</li>
                </ul>
              </div>
            </>
          )}

          {(status === 'uploading' || status === 'processing') && (
            <div className="py-12 text-center">
              <Loader2 size={48} className="mx-auto mb-4 animate-spin" style={{ color: 'var(--masters)' }} />
              <p className="type-body font-medium">
                {status === 'uploading' ? 'Uploading...' : 'Analyzing scorecard...'}
              </p>
              <p className="type-caption mt-2" style={{ color: 'var(--ink-tertiary)' }}>
                This may take a few seconds
              </p>
              {preview && (
                <div className="mt-4 mx-auto max-w-[200px]">
                  <img src={preview} alt="Preview" className="rounded-lg w-full" />
                </div>
              )}
            </div>
          )}

          {status === 'error' && (
            <div className="py-8">
              <div className="text-center mb-6">
                <AlertCircle size={48} className="mx-auto mb-4" style={{ color: 'var(--error)' }} />
                <p className="type-body font-medium" style={{ color: 'var(--error)' }}>
                  Upload Failed
                </p>
                <p className="type-caption mt-2" style={{ color: 'var(--ink-tertiary)' }}>
                  {error}
                </p>
              </div>
              <button
                onClick={resetUpload}
                className="btn btn-primary w-full"
              >
                Try Again
              </button>
            </div>
          )}

          {status === 'success' && extractedData && (
            <div className="py-4">
              <div className="text-center mb-4">
                <Check size={48} className="mx-auto mb-3" style={{ color: 'var(--success)' }} />
                <p className="type-body font-medium">Scorecard Analyzed!</p>
              </div>

              {/* Preview extracted data */}
              <div className="p-4 rounded-lg mb-4" style={{ background: 'var(--surface-elevated)' }}>
                {extractedData.courseName && (
                  <p className="type-title-sm mb-2">{extractedData.courseName}</p>
                )}
                <div className="flex flex-wrap gap-3 mb-3">
                  {extractedData.teeName && (
                    <span className="type-meta px-2 py-1 rounded" style={{ background: 'var(--surface-card)' }}>
                      {extractedData.teeName} Tees
                    </span>
                  )}
                  {extractedData.rating && (
                    <span className="type-meta px-2 py-1 rounded" style={{ background: 'var(--surface-card)' }}>
                      Rating: {extractedData.rating}
                    </span>
                  )}
                  {extractedData.slope && (
                    <span className="type-meta px-2 py-1 rounded" style={{ background: 'var(--surface-card)' }}>
                      Slope: {extractedData.slope}
                    </span>
                  )}
                </div>

                {/* Hole summary */}
                <div className="overflow-x-auto">
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11px' }}>
                    <thead>
                      <tr style={{ background: 'var(--surface-card)' }}>
                        <th style={{ padding: '4px', textAlign: 'center' }}>Hole</th>
                        {Array.from({ length: 9 }, (_, i) => (
                          <th key={i} style={{ padding: '4px', textAlign: 'center' }}>{i + 1}</th>
                        ))}
                        <th style={{ padding: '4px', textAlign: 'center', fontWeight: 600 }}>Out</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ padding: '4px', fontWeight: 500 }}>Par</td>
                        {extractedData.holes.slice(0, 9).map((h, i) => (
                          <td key={i} style={{ padding: '4px', textAlign: 'center' }}>{h.par}</td>
                        ))}
                        <td style={{ padding: '4px', textAlign: 'center', fontWeight: 600 }}>
                          {extractedData.holes.slice(0, 9).reduce((s, h) => s + h.par, 0)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <p className="type-caption mt-3 text-center" style={{ color: 'var(--ink-tertiary)' }}>
                  Total Par: {extractedData.holes.reduce((s, h) => s + h.par, 0)} |
                  {' '}{extractedData.holes.filter(h => h.yardage).length > 0
                    ? `${extractedData.holes.reduce((s, h) => s + (h.yardage || 0), 0)} yards`
                    : 'No yardage data'}
                </p>
              </div>

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={resetUpload}
                  className="btn btn-secondary flex-1"
                >
                  Scan Another
                </button>
                <button
                  onClick={handleUseData}
                  className="btn-premium flex-1"
                >
                  Use This Data
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ScorecardUpload;
