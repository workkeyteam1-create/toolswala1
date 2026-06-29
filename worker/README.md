# ToolsWala Worker

Cloudflare Worker backend for the ToolsWala platform - your one-stop solution for online tools.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- [Wrangler CLI](https://developers.cloudflare.com/workers/wrangler/install-and-update/) installed globally
- Cloudflare account (free tier works)

### Installation

```bash
# Install dependencies
npm install

# Login to Cloudflare
npx wrangler login

# Run development server
npm run dev
```

The worker will be available at `http://localhost:8787`

## 📁 Project Structure

```
worker/
├── src/
│   ├── index.js          # Main router and entry point
│   ├── routes/
│   │   ├── tools.js      # Tools API endpoints
│   │   ├── users.js      # User authentication & profile
│   │   └── files.js      # File upload/download handling
│   └── utils/
│       └── cors.js       # CORS & utility functions
├── wrangler.toml         # Worker configuration
└── package.json          # Dependencies & scripts
```

## 🔌 API Endpoints

### Health Check
- `GET /api/health` - Check worker status

### Tools API
- `GET /api/tools` - List all tools
  - Query params: `?category=generator&popular=true`
- `GET /api/tools/:id` - Get single tool details
- `GET /api/tools/categories` - Get all categories
- `POST /api/tools/search` - Search tools
  - Body: `{ "q": "qr", "category": "generator" }`

### Users API
- `POST /api/users/register` - Register new user
  - Body: `{ "email": "...", "password": "...", "name": "..." }`
- `POST /api/users/login` - User login
  - Body: `{ "email": "...", "password": "..." }`
- `GET /api/users/profile` - Get user profile (requires auth)
  - Header: `Authorization: Bearer <token>`
- `PUT /api/users/profile` - Update profile (requires auth)

### Files API
- `POST /api/files/upload` - Upload file (multipart/form-data)
- `GET /api/files/:id` - Get file metadata
- `GET /api/files/:id/download` - Download file
- `DELETE /api/files/:id` - Delete file

## 🛠️ Development Commands

```bash
# Start local development server
npm run dev

# Deploy to Cloudflare (staging)
npm run deploy -- --env staging

# Deploy to production
npm run deploy -- --env production

# View real-time logs
npm run tail

# Lint code
npm run lint
```

## 🔐 Environment Variables

Configure in `wrangler.toml` or via Cloudflare dashboard:

```toml
[vars]
DEBUG = "false"
API_KEY = "your-secret-api-key"

[[kv_namespaces]]
binding = "RATE_LIMIT_KV"
id = "your-kv-namespace-id"

[[r2_buckets]]
binding = "FILE_BUCKET"
bucket_name = "toolswala-files"
```

## 📦 Production Deployment

1. **Configure Wrangler**
   ```bash
   npx wrangler login
   ```

2. **Update wrangler.toml** with your bindings (KV, R2, D1)

3. **Deploy**
   ```bash
   npm run deploy
   ```

4. **Verify deployment**
   ```bash
   curl https://toolswala-worker.your-subdomain.workers.dev/api/health
   ```

## 🔒 Security Features

- ✅ CORS headers configured
- ✅ Rate limiting support (with KV binding)
- ✅ API key validation
- ✅ Input validation on all endpoints
- ✅ Error handling with debug mode

## 🚧 Production Considerations

Before deploying to production:

1. **Database**: Replace in-memory storage with D1 or external database
2. **File Storage**: Configure R2 bucket for actual file storage
3. **Authentication**: Implement proper JWT with secure signing
4. **Rate Limiting**: Enable KV-based rate limiting
5. **Logging**: Add structured logging with Logpush
6. **Monitoring**: Set up Workers Analytics

## 📝 License

MIT License - see LICENSE file for details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

Built with ⚡ Cloudflare Workers
