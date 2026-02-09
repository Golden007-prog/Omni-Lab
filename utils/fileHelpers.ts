/**
 * File Helper Utilities
 * Convert browser File objects to formats required by GoogleGenerativeAI
 */

import { Part } from "@google/generative-ai";

// =============================================================================
// TYPES
// =============================================================================

export interface FileProcessingResult {
  success: boolean;
  data?: ProcessedFileData;
  error?: string;
}

export interface ProcessedFileData {
  name: string;
  mimeType: string;
  size: number;
  base64Data: string;
  inlinePart: Part;
}

export interface UploadedFile {
  uri: string;
  mimeType: string;
  name: string;
  displayName?: string;
}

// Supported MIME types for Gemini
export const SUPPORTED_MIME_TYPES = {
  // Images
  "image/png": true,
  "image/jpeg": true,
  "image/webp": true,
  "image/heic": true,
  "image/heif": true,
  
  // Documents
  "application/pdf": true,
  "text/plain": true,
  "text/html": true,
  "text/css": true,
  "text/javascript": true,
  "application/json": true,
  "text/markdown": true,
  "text/csv": true,
  "text/xml": true,
  "application/xml": true,
  
  // Code
  "text/x-python": true,
  "application/x-python-code": true,
  "text/x-java-source": true,
  "text/x-c": true,
  "text/x-c++": true,
  
  // Audio
  "audio/wav": true,
  "audio/mp3": true,
  "audio/mpeg": true,
  "audio/aiff": true,
  "audio/aac": true,
  "audio/ogg": true,
  "audio/flac": true,
  
  // Video
  "video/mp4": true,
  "video/mpeg": true,
  "video/mov": true,
  "video/avi": true,
  "video/x-flv": true,
  "video/mpg": true,
  "video/webm": true,
  "video/wmv": true,
  "video/3gpp": true,
} as const;

// =============================================================================
// FILE CONVERSION FUNCTIONS
// =============================================================================

/**
 * Convert a browser File object to base64 string
 */
export async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the data URL prefix (e.g., "data:image/png;base64,")
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    
    reader.onerror = () => {
      reject(new Error(`Failed to read file: ${file.name}`));
    };
    
    reader.readAsDataURL(file);
  });
}

/**
 * Convert a browser File object to ArrayBuffer
 */
export async function fileToArrayBuffer(file: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      resolve(reader.result as ArrayBuffer);
    };
    
    reader.onerror = () => {
      reject(new Error(`Failed to read file: ${file.name}`));
    };
    
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Process a browser File into the format required by GoogleGenerativeAI inline data
 */
export async function processFileForInlineData(
  file: File
): Promise<FileProcessingResult> {
  try {
    // Validate MIME type
    const mimeType = file.type || getMimeTypeFromExtension(file.name);
    
    if (!isSupportedMimeType(mimeType)) {
      return {
        success: false,
        error: `Unsupported file type: ${mimeType}. Supported types include images, PDFs, text files, and common code files.`,
      };
    }

    // Convert to base64
    const base64Data = await fileToBase64(file);

    // Create inline part for Gemini API
    const inlinePart: Part = {
      inlineData: {
        mimeType: mimeType,
        data: base64Data,
      },
    };

    return {
      success: true,
      data: {
        name: file.name,
        mimeType: mimeType,
        size: file.size,
        base64Data: base64Data,
        inlinePart: inlinePart,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error processing file",
    };
  }
}

/**
 * Convert multiple files to inline parts array
 */
export async function processMultipleFiles(
  files: File[]
): Promise<{ parts: Part[]; errors: string[] }> {
  const parts: Part[] = [];
  const errors: string[] = [];

  for (const file of files) {
    const result = await processFileForInlineData(file);
    
    if (result.success && result.data) {
      parts.push(result.data.inlinePart);
    } else if (result.error) {
      errors.push(`${file.name}: ${result.error}`);
    }
  }

  return { parts, errors };
}

// =============================================================================
// FILE API UPLOAD (for large files)
// =============================================================================

/**
 * Upload a file using Google AI File Manager API
 * Note: This requires the @google/generative-ai package's FileManager
 * which may need server-side implementation for production
 */
export async function uploadFileToGemini(
  file: File,
  apiKey: string
): Promise<UploadedFile> {
  // For browser-based apps, we need to use the REST API directly
  // since FileManager is designed for Node.js
  
  const formData = new FormData();
  formData.append("file", file);

  // Upload to Google AI Files API
  const uploadResponse = await fetch(
    `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`,
    {
      method: "POST",
      body: formData,
    }
  );

  if (!uploadResponse.ok) {
    const error = await uploadResponse.text();
    throw new Error(`File upload failed: ${error}`);
  }

  const uploadResult = await uploadResponse.json();
  
  return {
    uri: uploadResult.file.uri,
    mimeType: uploadResult.file.mimeType,
    name: uploadResult.file.name,
    displayName: file.name,
  };
}

/**
 * Check upload status for resumable uploads
 */
export async function getFileStatus(
  fileName: string,
  apiKey: string
): Promise<{ state: string; uri?: string }> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/files/${fileName}?key=${apiKey}`
  );

  if (!response.ok) {
    throw new Error("Failed to get file status");
  }

  const result = await response.json();
  return {
    state: result.state,
    uri: result.uri,
  };
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Check if a MIME type is supported
 */
export function isSupportedMimeType(mimeType: string): boolean {
  return mimeType in SUPPORTED_MIME_TYPES;
}

/**
 * Get MIME type from file extension
 */
export function getMimeTypeFromExtension(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase() || "";
  
  const extensionMap: Record<string, string> = {
    // Images
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    heic: "image/heic",
    heif: "image/heif",
    
    // Documents
    pdf: "application/pdf",
    txt: "text/plain",
    html: "text/html",
    htm: "text/html",
    css: "text/css",
    js: "text/javascript",
    json: "application/json",
    md: "text/markdown",
    csv: "text/csv",
    xml: "application/xml",
    
    // Code
    py: "text/x-python",
    java: "text/x-java-source",
    c: "text/x-c",
    cpp: "text/x-c++",
    h: "text/x-c",
    
    // Audio
    wav: "audio/wav",
    mp3: "audio/mpeg",
    aiff: "audio/aiff",
    aac: "audio/aac",
    ogg: "audio/ogg",
    flac: "audio/flac",
    
    // Video
    mp4: "video/mp4",
    mpeg: "video/mpeg",
    mov: "video/mov",
    avi: "video/avi",
    flv: "video/x-flv",
    webm: "video/webm",
    wmv: "video/wmv",
  };

  return extensionMap[ext] || "application/octet-stream";
}

/**
 * Format file size for display
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

/**
 * Check if file size is within limits
 * Inline data limit: ~20MB
 * File API limit: 2GB
 */
export function isWithinInlineLimit(bytes: number): boolean {
  const INLINE_LIMIT = 20 * 1024 * 1024; // 20MB
  return bytes <= INLINE_LIMIT;
}

/**
 * Read a text file as string
 */
export async function readTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      resolve(reader.result as string);
    };
    
    reader.onerror = () => {
      reject(new Error(`Failed to read file: ${file.name}`));
    };
    
    reader.readAsText(file);
  });
}

/**
 * Create a data URL from file for preview
 */
export async function createPreviewUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = () => {
      resolve(reader.result as string);
    };
    
    reader.onerror = () => {
      reject(new Error(`Failed to create preview: ${file.name}`));
    };
    
    reader.readAsDataURL(file);
  });
}
