/**
 * ToolsWala Cloudflare Worker
 * Main router and API handler
 */

// Import route handlers (would be separate files in larger projects)
import { handleToolsRoutes } from './routes/tools.js';
import { handleUserRoutes } from './routes/users.js';
import { handleFileRoutes } from './routes/files.js';
import { handleQRRoutes } from './routes/qr.js';
import { corsHeaders } from './utils/cors.js';

/**
 * Main request handler
 * @param {Request} request - The incoming request
 * @param {Object} env - Environment variables and bindings
 * @param {Object} ctx - Execution context
 * @returns {Promise<Response>}
 */
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method;

    // Handle CORS preflight requests
    if (method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    // Add common headers to all responses
    const addCommonHeaders = (response) => {
      Object.entries({
        'X-Powered-By': 'ToolsWala Worker',
        'X-Response-Time': Date.now().toString(),
      }).forEach(([key, value]) => {
        response.headers.set(key, value);
      });
      return response;
    };

    try {
      // Route matching
      let response;

      // API Routes
      if (path.startsWith('/api/tools')) {
        response = await handleToolsRoutes(request, env, ctx);
      } else if (path.startsWith('/api/users')) {
        response = await handleUserRoutes(request, env, ctx);
      } else if (path.startsWith('/api/files')) {
        response = await handleFileRoutes(request, env, ctx);
      } else if (path.startsWith('/api/qr')) {
        response = await handleQRRoutes(request, env, ctx);
      } else if (path === '/api/health') {
        response = new Response(
          JSON.stringify({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            version: '1.0.0',
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          }
        );
      } else if (path === '/') {
        // Serve frontend or welcome message
        response = new Response(
          JSON.stringify({
            name: 'ToolsWala API',
            version: '1.0.0',
            description: 'Your one-stop solution for online tools',
            endpoints: {
              tools: '/api/tools',
              users: '/api/users',
              files: '/api/files',
              qr: '/api/qr',
              health: '/api/health',
            },
          }),
          {
            status: 200,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          }
        );
      } else {
        // 404 for unmatched routes
        response = new Response(
          JSON.stringify({
            error: 'Not Found',
            message: `Route ${method} ${path} not found`,
          }),
          {
            status: 404,
            headers: {
              'Content-Type': 'application/json',
              ...corsHeaders,
            },
          }
        );
      }

      return addCommonHeaders(response);
    } catch (error) {
      // Global error handler
      console.error('Worker error:', error);

      const errorResponse = new Response(
        JSON.stringify({
          error: 'Internal Server Error',
          message: env.DEBUG === 'true' ? error.message : 'Something went wrong',
          stack: env.DEBUG === 'true' ? error.stack : undefined,
        }),
        {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
            ...corsHeaders,
          },
        }
      );

      return addCommonHeaders(errorResponse);
    }
  },
};
