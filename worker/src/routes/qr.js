/**
 * QR Code API Routes Handler
 * Handles all /api/qr/* routes by proxying to external QR API
 */

import { jsonResponse, errorResponse, parseJSON } from '../utils/cors.js';

// External QR API endpoint (using goqr.me API)
const QR_API_BASE = 'https://api.qrserver.com/v1';

/**
 * Handle QR routes
 * @param {Request} request - The incoming request
 * @param {Object} env - Environment variables
 * @param {Object} ctx - Execution context
 * @returns {Promise<Response>}
 */
export async function handleQRRoutes(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // POST /api/qr/generate - Generate QR code
  if (path === '/api/qr/generate' && method === 'POST') {
    try {
      const body = await parseJSON(request);
      return await handleGenerateQR(body, env);
    } catch {
      return errorResponse('Invalid JSON body', 400);
    }
  }

  // GET /api/qr/generate - Generate QR code via GET (for direct image access)
  if (path === '/api/qr/generate' && method === 'GET') {
    return await handleGenerateQRGet(url.searchParams, env);
  }

  // Method not allowed
  return errorResponse('Method not allowed', 405);
}

/**
 * Generate QR code from POST request
 * @param {Object} params - QR generation parameters
 * @param {Object} env - Environment variables
 * @returns {Promise<Response>}
 */
async function handleGenerateQR(params, env) {
  const {
    data,
    size = 300,
    format = 'png',
    color = '000000',
    bgColor = 'ffffff',
    ecc = 'M',
    margin = 1,
  } = params;

  // Validate required parameters
  if (!data || typeof data !== 'string') {
    return errorResponse('Missing or invalid "data" parameter', 400);
  }

  // Validate size
  const sizeNum = parseInt(size, 10);
  if (isNaN(sizeNum) || sizeNum < 50 || sizeNum > 2000) {
    return errorResponse('Size must be between 50 and 2000 pixels', 400);
  }

  // Validate ECC level
  const validECC = ['L', 'M', 'Q', 'H'];
  if (!validECC.includes(ecc)) {
    return errorResponse('ECC must be one of: L, M, Q, H', 400);
  }

  // Build QR Server API URL
  const qrUrl = `${QR_API_BASE}/create-qr-code/${size}x${size}/${format}?data=${encodeURIComponent(data)}&color=${color}&bgcolor=${bgColor}&ecc=${ecc}&margin=${margin}`;

  try {
    // Fetch the QR code image from external API
    const response = await fetch(qrUrl, {
      method: 'GET',
      headers: {
        'Content-Type': `image/${format}`,
      },
    });

    if (!response.ok) {
      return errorResponse('Failed to generate QR code', 500);
    }

    // Get the image as array buffer
    const imageBuffer = await response.arrayBuffer();

    // Return the image with appropriate content type
    return new Response(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': `image/${format}`,
        'Cache-Control': 'public, max-age=86400',
        ...corsHeaders,
      },
    });
  } catch (error) {
    console.error('QR generation error:', error);
    return errorResponse('Error generating QR code', 500);
  }
}

/**
 * Generate QR code from GET request
 * @param {URLSearchParams} searchParams - Query parameters
 * @param {Object} env - Environment variables
 * @returns {Promise<Response>}
 */
async function handleGenerateQRGet(searchParams, env) {
  const data = searchParams.get('data');
  const size = searchParams.get('size') || 300;
  const format = searchParams.get('format') || 'png';
  const color = searchParams.get('color') || '000000';
  const bgColor = searchParams.get('bgColor') || 'ffffff';
  const ecc = searchParams.get('ecc') || 'M';
  const margin = searchParams.get('margin') || 1;

  return await handleGenerateQR(
    { data, size, format, color, bgColor, ecc, margin },
    env
  );
}

// Import corsHeaders for use in this file
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Max-Age': '86400',
};
