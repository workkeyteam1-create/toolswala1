# QR Code Generator API

A comprehensive QR code generation backend service built with Flask, designed for deployment on Render.com.

## Features

### Multiple Input Types
- **URL/Website** - Generate QR codes for websites
- **Plain Text** - Encode any text content
- **Email** (`mailto:`) - Create email action QR codes
- **Phone** (`tel:`) - Generate phone dialer QR codes
- **SMS** (`sms:`) - Create SMS message QR codes
- **vCard** (Contact) - Generate digital business cards
- **Wi-Fi** (`WIFI:`) - Create network connection QR codes
- **Geo Location** (`geo:`) - Generate location-based QR codes
- **Event** (vCalendar) - Create calendar event QR codes

### Customization Options
- **Size**: 100px to 1000px (selectable presets or custom)
- **Colors**: Foreground and background color support with hex values
- **Error Correction Levels**: L (7%), M (15%), Q (25%), H (30%)
- **Border/Quiet Zone**: Adjustable from 0-10 modules
- **Formats**: PNG, SVG (vector), PDF (for print)

### Advanced Features
- **Logo/Image Overlay**: Upload logos, auto-adjusts error correction to "H"
- **QR Code Styles**: Square, Rounded dots, Dots, Diamond patterns
- **Batch Generation**: Upload CSV/Excel, generate multiple QR codes, download as ZIP
- **History/Saved Codes**: Endpoint ready for database integration
- **Validation**: Built-in scanner endpoint to verify generated codes

## API Endpoints

### `POST /api/qr/generate`
Generate a single QR code.

**Request Body:**
```json
{
  "data": "https://example.com",
  "data_type": "url",
  "size": 300,
  "format": "png",
  "error_correction": "M",
  "border": 4,
  "fill_color": "#000000",
  "bg_color": "#FFFFFF",
  "style": "square",
  "logo": "base64_encoded_image"
}
```

**Response:**
```json
{
  "success": true,
  "message": "QR code generated successfully",
  "data": {
    "format": "png",
    "size": 300,
    "error_correction": "M",
    "encoding": "base64",
    "image": "iVBORw0KGgo..."
  },
  "metadata": {
    "generated_at": "2024-01-01T00:00:00Z",
    "data_length": 19,
    "data_type": "url",
    "style": "square",
    "has_logo": false
  }
}
```

### `POST /api/qr/generate/file`
Generate and return QR code as downloadable file.

### `POST /api/qr/batch`
Generate multiple QR codes in one request.

**Request Body (JSON):**
```json
{
  "items": [
    {"data": "https://site1.com", "filename": "site1"},
    {"data": "https://site2.com", "filename": "site2"}
  ],
  "size": 200,
  "format": "png",
  "zip": true
}
```

**Request Body (File Upload):**
Upload CSV or Excel file with data in first column.

### `POST /api/qr/upload-logo`
Upload a logo for QR code overlay.

### `GET /api/qr/history`
Fetch user's past generated QR codes (requires DB).

### `POST /api/qr/validate`
Validate a QR code by decoding it.

### `GET /api/health`
Health check endpoint.

## Deployment on Render

1. Connect your GitHub repository to Render
2. Create a new Web Service
3. Configure:
   - **Environment**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app`
   - **Port**: Set via `PORT` environment variable (default: 10000)

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| PORT | 10000 | Server port |
| PYTHON_VERSION | 3.11.0 | Python version |

## Rate Limiting

Built-in rate limiting is enabled:
- `/api/qr/generate`: 100 requests/minute
- `/api/qr/generate/file`: 50 requests/minute
- `/api/qr/batch`: 10 requests/minute
- `/api/qr/upload-logo`: 30 requests/minute

## Security Features

- Input validation for all parameters
- File type validation for uploads
- File size limits (16MB max upload, 5MB for logos)
- Color format validation
- Data type validation
- CORS enabled for frontend integration

## Local Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run the server
python app.py

# Or with gunicorn
gunicorn app:app --bind 0.0.0.0:5000
```

## Testing

```bash
# Test health endpoint
curl http://localhost:5000/api/health

# Generate a QR code
curl -X POST http://localhost:5000/api/qr/generate \
  -H "Content-Type: application/json" \
  -d '{"data": "https://example.com", "size": 300}'
```

## License

MIT License
