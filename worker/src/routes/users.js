/**
 * Users API Routes Handler
 * Handles all /api/users/* routes
 */

import { jsonResponse, errorResponse, parseJSON, validateApiKey } from '../utils/cors.js';

// Mock users data (in production, use D1 or external DB)
const USERS_DATA = new Map();

/**
 * Handle users routes
 * @param {Request} request - The incoming request
 * @param {Object} env - Environment variables
 * @param {Object} ctx - Execution context
 * @returns {Promise<Response>}
 */
export async function handleUserRoutes(request, env, ctx) {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  // POST /api/users/register - Register new user
  if (path === '/api/users/register' && method === 'POST') {
    try {
      const body = await parseJSON(request);
      return await handleRegister(body, env);
    } catch {
      return errorResponse('Invalid JSON body', 400);
    }
  }

  // POST /api/users/login - User login
  if (path === '/api/users/login' && method === 'POST') {
    try {
      const body = await parseJSON(request);
      return await handleLogin(body, env);
    } catch {
      return errorResponse('Invalid JSON body', 400);
    }
  }

  // GET /api/users/profile - Get user profile (requires auth)
  if (path === '/api/users/profile' && method === 'GET') {
    return await handleGetProfile(request, env);
  }

  // PUT /api/users/profile - Update user profile (requires auth)
  if (path === '/api/users/profile' && method === 'PUT') {
    try {
      const body = await parseJSON(request);
      return await handleUpdateProfile(request, body, env);
    } catch {
      return errorResponse('Invalid JSON body', 400);
    }
  }

  // Method not allowed
  return errorResponse('Method not allowed', 405);
}

/**
 * Register new user
 * @param {Object} body - Registration data
 * @param {Object} env - Environment variables
 * @returns {Promise<Response>}
 */
async function handleRegister(body, env) {
  const { email, password, name } = body;

  if (!email || !password || !name) {
    return errorResponse('Missing required fields: email, password, name', 400);
  }

  // Check if user exists
  if (USERS_DATA.has(email)) {
    return errorResponse('User already exists', 409);
  }

  // Create user (in production, hash password!)
  const user = {
    id: crypto.randomUUID(),
    email,
    name,
    createdAt: new Date().toISOString(),
    preferences: {},
  };

  USERS_DATA.set(email, { ...user, password });

  return jsonResponse(
    {
      success: true,
      message: 'User registered successfully',
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    },
    201
  );
}

/**
 * User login
 * @param {Object} body - Login credentials
 * @param {Object} env - Environment variables
 * @returns {Promise<Response>}
 */
async function handleLogin(body, env) {
  const { email, password } = body;

  if (!email || !password) {
    return errorResponse('Missing email or password', 400);
  }

  const user = USERS_DATA.get(email);

  if (!user || user.password !== password) {
    return errorResponse('Invalid credentials', 401);
  }

  // Generate JWT token (in production, use proper JWT library)
  const token = btoa(JSON.stringify({ email, exp: Date.now() + 86400000 }));

  return jsonResponse({
    success: true,
    message: 'Login successful',
    data: {
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      },
    },
  });
}

/**
 * Get user profile
 * @param {Request} request - The request object
 * @param {Object} env - Environment variables
 * @returns {Promise<Response>}
 */
async function handleGetProfile(request, env) {
  const email = extractEmailFromToken(request);

  if (!email) {
    return errorResponse('Unauthorized', 401);
  }

  const user = USERS_DATA.get(email);

  if (!user) {
    return errorResponse('User not found', 404);
  }

  return jsonResponse({
    success: true,
    data: {
      id: user.id,
      email: user.email,
      name: user.name,
      createdAt: user.createdAt,
      preferences: user.preferences,
    },
  });
}

/**
 * Update user profile
 * @param {Request} request - The request object
 * @param {Object} body - Update data
 * @param {Object} env - Environment variables
 * @returns {Promise<Response>}
 */
async function handleUpdateProfile(request, body, env) {
  const email = extractEmailFromToken(request);

  if (!email) {
    return errorResponse('Unauthorized', 401);
  }

  const user = USERS_DATA.get(email);

  if (!user) {
    return errorResponse('User not found', 404);
  }

  // Update allowed fields
  if (body.name) user.name = body.name;
  if (body.preferences) user.preferences = { ...user.preferences, ...body.preferences };

  USERS_DATA.set(email, user);

  return jsonResponse({
    success: true,
    message: 'Profile updated successfully',
    data: {
      id: user.id,
      email: user.email,
      name: user.name,
      preferences: user.preferences,
    },
  });
}

/**
 * Extract email from authorization token
 * @param {Request} request - The request object
 * @returns {string|null}
 */
function extractEmailFromToken(request) {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  try {
    const token = authHeader.substring(7);
    const decoded = JSON.parse(atob(token));
    
    if (decoded.exp < Date.now()) {
      return null; // Token expired
    }
    
    return decoded.email;
  } catch {
    return null;
  }
}
