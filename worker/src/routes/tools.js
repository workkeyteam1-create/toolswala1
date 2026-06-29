/**
 * Tools API Routes Handler
 * Handles all /api/tools/* routes
 */

import { jsonResponse, errorResponse, parseJSON } from '../utils/cors.js';

// Mock tools data (in production, this would come from a database or KV store)
const TOOLS_DATA = [
  {
    id: 'qr-generator',
    name: 'QR Code Generator',
    description: 'Generate custom QR codes with colors and logos',
    category: 'generator',
    icon: 'qr-code',
    color: '#6366f1',
    popular: true,
    url: '/tools/qr-generator',
  },
  {
    id: 'pdf-edit',
    name: 'PDF Editor',
    description: 'Edit, merge, split and convert PDF files online',
    category: 'pdf',
    icon: 'file-text',
    color: '#ef4444',
    popular: true,
    url: '/tools/pdf-edit',
  },
  {
    id: 'image-compressor',
    name: 'Image Compressor',
    description: 'Compress images without losing quality',
    category: 'image',
    icon: 'image',
    color: '#10b981',
    popular: false,
    url: '/tools/image-compressor',
  },
  {
    id: 'password-generator',
    name: 'Password Generator',
    description: 'Generate secure random passwords',
    category: 'security',
    icon: 'lock',
    color: '#f59e0b',
    popular: false,
    url: '/tools/password-generator',
  },
];

/**
 * Handle tools routes
 * @param {Request} request - The incoming request
 * @param {Object} env - Environment variables
 * @param {Object} ctx - Execution context
 * @returns {Promise<Response>}
 */
export async function handleToolsRoutes(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // GET /api/tools - List all tools
  if (path === '/api/tools' && method === 'GET') {
    return await handleGetAllTools(request, env);
  }

  // GET /api/tools/:id - Get single tool
  const toolMatch = path.match(/^\/api\/tools\/([a-zA-Z0-9-_]+)$/);
  if (toolMatch && method === 'GET') {
    const toolId = toolMatch[1];
    return await handleGetTool(toolId, env);
  }

  // GET /api/tools/categories - Get all categories
  if (path === '/api/tools/categories' && method === 'GET') {
    return await handleGetCategories(env);
  }

  // POST /api/tools/search - Search tools
  if (path === '/api/tools/search' && method === 'POST') {
    try {
      const body = await parseJSON(request);
      return await handleSearchTools(body, env);
    } catch {
      return errorResponse('Invalid JSON body', 400);
    }
  }

  // Method not allowed
  return errorResponse('Method not allowed', 405);
}

/**
 * Get all tools
 * @param {Request} request - The request object
 * @param {Object} env - Environment variables
 * @returns {Promise<Response>}
 */
async function handleGetAllTools(request, env) {
  const url = new URL(request.url);
  const category = url.searchParams.get('category');
  const popular = url.searchParams.get('popular');

  let tools = [...TOOLS_DATA];

  // Filter by category
  if (category) {
    tools = tools.filter((tool) => tool.category === category);
  }

  // Filter popular only
  if (popular === 'true') {
    tools = tools.filter((tool) => tool.popular);
  }

  return jsonResponse({
    success: true,
    count: tools.length,
    data: tools,
  });
}

/**
 * Get single tool by ID
 * @param {string} toolId - Tool identifier
 * @param {Object} env - Environment variables
 * @returns {Promise<Response>}
 */
async function handleGetTool(toolId, env) {
  const tool = TOOLS_DATA.find((t) => t.id === toolId);

  if (!tool) {
    return errorResponse('Tool not found', 404);
  }

  return jsonResponse({
    success: true,
    data: tool,
  });
}

/**
 * Get all unique categories
 * @param {Object} env - Environment variables
 * @returns {Promise<Response>}
 */
async function handleGetCategories(env) {
  const categories = [...new Set(TOOLS_DATA.map((tool) => tool.category))];

  return jsonResponse({
    success: true,
    count: categories.length,
    data: categories,
  });
}

/**
 * Search tools
 * @param {Object} query - Search query object
 * @param {Object} env - Environment variables
 * @returns {Promise<Response>}
 */
async function handleSearchTools(query, env) {
  const { q, category } = query;
  let results = [...TOOLS_DATA];

  // Text search
  if (q) {
    const searchLower = q.toLowerCase();
    results = results.filter(
      (tool) =>
        tool.name.toLowerCase().includes(searchLower) ||
        tool.description.toLowerCase().includes(searchLower)
    );
  }

  // Category filter
  if (category) {
    results = results.filter((tool) => tool.category === category);
  }

  return jsonResponse({
    success: true,
    count: results.length,
    data: results,
  });
}
