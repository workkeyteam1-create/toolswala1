/**
 * Files API Routes Handler
 * Handles all /api/files/* routes for file upload, processing, and download
 */

import { jsonResponse, errorResponse } from '../utils/cors.js';

// Mock file storage metadata (in production, use R2 for actual file storage)
const FILES_METADATA = new Map();

/**
 * Handle files routes
 * @param {Request} request - The incoming request
 * @param {Object} env - Environment variables
 * @param {Object} ctx - Execution context
 * @returns {Promise<Response>}
 */
export async function handleFileRoutes(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // POST /api/files/upload - Upload a file
  if (path === '/api/files/upload' && method === 'POST') {
    return await handleUpload(request, env, ctx);
  }

  // GET /api/files/:id - Get file metadata
  const fileMatch = path.match(/^\/api\/files\/([a-zA-Z0-9-_]+)$/);
  if (fileMatch && method === 'GET') {
    const fileId = fileMatch[1];
    return await handleGetFile(fileId, env);
  }

  // DELETE /api/files/:id - Delete a file
  if (fileMatch && method === 'DELETE') {
    const fileId = fileMatch[1];
    return await handleDeleteFile(fileId, env);
  }

  // GET /api/files/:id/download - Download a file
  const downloadMatch = path.match(/^\/api\/files\/([a-zA-Z0-9-_]+)\/download$/);
  if (downloadMatch && method === 'GET') {
    const fileId = downloadMatch[1];
    return await handleDownload(fileId, env);
  }

  // Method not allowed
  return errorResponse('Method not allowed', 405);
}

/**
 * Handle file upload
 * @param {Request} request - The request object
 * @param {Object} env - Environment variables
 * @param {Object} ctx - Execution context
 * @returns {Promise<Response>}
 */
async function handleUpload(request, env, ctx) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!file) {
      return errorResponse('No file provided', 400);
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'text/plain',
    ];
    
    if (!allowedTypes.includes(file.type)) {
      return errorResponse('File type not allowed', 400);
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return errorResponse('File too large (max 10MB)', 400);
    }

    // Generate unique file ID
    const fileId = crypto.randomUUID();
    const fileName = file.name;
    const fileType = file.type;
    const fileSize = file.size;

    // In production, upload to R2:
    // await env.FILE_BUCKET.put(`${fileId}/${fileName}`, file.stream(), {
    //   httpMetadata: { contentType: fileType }
    // });

    // Store metadata
    const metadata = {
      id: fileId,
      name: fileName,
      type: fileType,
      size: fileSize,
      uploadedAt: new Date().toISOString(),
      // In production, store R2 key
      storageKey: `${fileId}/${fileName}`,
    };

    FILES_METADATA.set(fileId, metadata);

    return jsonResponse(
      {
        success: true,
        message: 'File uploaded successfully',
        data: metadata,
      },
      201
    );
  } catch (error) {
    console.error('Upload error:', error);
    return errorResponse('Failed to process upload', 500);
  }
}

/**
 * Get file metadata
 * @param {string} fileId - File identifier
 * @param {Object} env - Environment variables
 * @returns {Promise<Response>}
 */
async function handleGetFile(fileId, env) {
  const metadata = FILES_METADATA.get(fileId);

  if (!metadata) {
    return errorResponse('File not found', 404);
  }

  return jsonResponse({
    success: true,
    data: metadata,
  });
}

/**
 * Delete a file
 * @param {string} fileId - File identifier
 * @param {Object} env - Environment variables
 * @returns {Promise<Response>}
 */
async function handleDeleteFile(fileId, env) {
  const metadata = FILES_METADATA.get(fileId);

  if (!metadata) {
    return errorResponse('File not found', 404);
  }

  // In production, delete from R2:
  // await env.FILE_BUCKET.delete(metadata.storageKey);

  FILES_METADATA.delete(fileId);

  return jsonResponse({
    success: true,
    message: 'File deleted successfully',
  });
}

/**
 * Download a file
 * @param {string} fileId - File identifier
 * @param {Object} env - Environment variables
 * @returns {Promise<Response>}
 */
async function handleDownload(fileId, env) {
  const metadata = FILES_METADATA.get(fileId);

  if (!metadata) {
    return errorResponse('File not found', 404);
  }

  // In production, get from R2:
  // const object = await env.FILE_BUCKET.get(metadata.storageKey);
  // if (!object) {
  //   return errorResponse('File not found in storage', 404);
  // }
  // return new Response(object.body, {
  //   headers: {
  //     'Content-Type': metadata.type,
  //     'Content-Disposition': `attachment; filename="${metadata.name}"`,
  //   },
  // });

  // Mock response for demo
  return jsonResponse({
    success: true,
    message: 'Download would start here in production',
    data: {
      downloadUrl: `/api/files/${fileId}/download`,
      metadata,
    },
  });
}
