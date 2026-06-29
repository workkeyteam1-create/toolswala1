/**
 * CORS Headers Utility
 * Handles Cross-Origin Resource Sharing for API requests
 */

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With',
  'Access-Control-Max-Age': '86400',
};

/**
 * Create a JSON response with CORS headers
 * @param {*} data - The data to serialize
 * @param {number} status - HTTP status code
 * @returns {Response}
 */
export function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

/**
 * Create an error response
 * @param {string} message - Error message
 * @param {number} status - HTTP status code
 * @returns {Response}
 */
export function errorResponse(message, status = 400) {
  return jsonResponse(
    {
      error: true,
      message,
    },
    status
  );
}

/**
 * Parse JSON from request body
 * @param {Request} request - The request object
 * @returns {Promise<Object>}
 */
export async function parseJSON(request) {
  try {
    return await request.json();
  } catch {
    throw new Error('Invalid JSON');
  }
}

/**
 * Validate API key from headers
 * @param {Request} request - The request object
 * @param {Object} env - Environment variables
 * @returns {boolean}
 */
export function validateApiKey(request, env) {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return false;
  }

  const apiKey = authHeader.substring(7);
  return apiKey === env.API_KEY;
}

/**
 * Rate limiting helper (simple in-memory, use KV for production)
 * @param {string} identifier - Client identifier (IP or API key)
 * @param {Object} env - Environment variables with KV binding
 * @param {number} limit - Max requests per window
 * @param {number} window - Time window in seconds
 * @returns {Promise<{allowed: boolean, remaining: number}>}
 */
export async function checkRateLimit(identifier, env, limit = 100, window = 3600) {
  if (!env.RATE_LIMIT_KV) {
    // No KV binding, allow all
    return { allowed: true, remaining: limit };
  }

  const key = `ratelimit:${identifier}`;
  const now = Date.now();
  const windowMs = window * 1000;

  try {
    const data = await env.RATE_LIMIT_KV.get(key, { type: 'json' });
    
    if (!data || now - data.timestamp > windowMs) {
      // New window
      await env.RATE_LIMIT_KV.put(key, JSON.stringify({ count: 1, timestamp: now }), { expirationTtl: window + 60 });
      return { allowed: true, remaining: limit - 1 };
    }

    if (data.count >= limit) {
      return { allowed: false, remaining: 0 };
    }

    // Increment counter
    data.count++;
    await env.RATE_LIMIT_KV.put(key, JSON.stringify(data), { expirationTtl: window + 60 });
    
    return { allowed: true, remaining: limit - data.count };
  } catch {
    return { allowed: true, remaining: limit };
  }
}
