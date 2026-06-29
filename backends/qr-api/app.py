"""
ToolsWala - QR Code Generator API
Flask backend for QR code generation operations.
Deploy on Render.com

Features:
- Multiple input types (URL, Text, Email, Phone, SMS, vCard, WiFi, Geo, Event)
- Custom colors, gradients, sizes
- Logo overlay with auto error correction
- Multiple formats (PNG, SVG, PDF)
- Batch generation with ZIP download
- History storage (optional DB)
"""

from flask import Flask, request, jsonify, send_file, make_response
from flask_cors import CORS
import os
import io
import base64
import uuid
import zipfile
import json
import re
from datetime import datetime, timedelta
from functools import wraps
from PIL import Image, ImageDraw, ImageFilter
import qrcode
from qrcode.constants import ERROR_CORRECT_L, ERROR_CORRECT_M, ERROR_CORRECT_Q, ERROR_CORRECT_H
import segno
from reportlab.lib.pagesizes import letter
from reportlab.pdfgen import canvas as pdf_canvas
from reportlab.lib.utils import ImageReader
import pandas as pd

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configuration
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max upload
app.config['UPLOAD_FOLDER'] = '/tmp/uploads'
app.config['GENERATED_FOLDER'] = '/tmp/generated'
app.config['LOGO_FOLDER'] = '/tmp/logos'

# Ensure folders exist
for folder in [app.config['UPLOAD_FOLDER'], app.config['GENERATED_FOLDER'], app.config['LOGO_FOLDER']]:
    os.makedirs(folder, exist_ok=True)

# Error correction level mapping
ERROR_CORRECTION_MAP = {
    'L': ERROR_CORRECT_L,
    'M': ERROR_CORRECT_M,
    'Q': ERROR_CORRECT_Q,
    'H': ERROR_CORRECT_H
}

# Rate limiting simple implementation
rate_limit_store = {}

def rate_limit(max_requests=100, window_seconds=60):
    """Simple rate limiter decorator"""
    def decorator(f):
        @wraps(f)
        def wrapped(*args, **kwargs):
            client_ip = request.remote_addr
            current_time = datetime.now()
            
            if client_ip not in rate_limit_store:
                rate_limit_store[client_ip] = []
            
            # Clean old entries
            rate_limit_store[client_ip] = [
                t for t in rate_limit_store[client_ip] 
                if current_time - t < timedelta(seconds=window_seconds)
            ]
            
            if len(rate_limit_store[client_ip]) >= max_requests:
                return jsonify({
                    'success': False,
                    'error': 'Rate limit exceeded. Please try again later.'
                }), 429
            
            rate_limit_store[client_ip].append(current_time)
            return f(*args, **kwargs)
        return wrapped
    return decorator


def validate_color(color_str):
    """Validate hex color format"""
    if not color_str:
        return True
    pattern = r'^#[0-9A-Fa-f]{6}$|^[0-9A-Fa-f]{6}$'
    return bool(re.match(pattern, color_str))


def parse_color(color_str):
    """Parse color string to RGB tuple"""
    if not color_str:
        return None
    color_str = color_str.lstrip('#')
    return tuple(int(color_str[i:i+2], 16) for i in (0, 2, 4))


def validate_data_type(data_type, data):
    """Validate data based on type"""
    if data_type == 'url':
        pattern = r'^https?://[^\s]+$'
        return bool(re.match(pattern, data))
    elif data_type == 'email':
        pattern = r'^mailto:[^\s]+@[^\s]+\.[^\s]+$'
        return bool(re.match(pattern, data)) or bool(re.match(r'^[^\s]+@[^\s]+\.[^\s]+$', data))
    elif data_type == 'phone':
        pattern = r'^tel:\+[0-9\s\-()]+$'
        return bool(re.match(pattern, data)) or bool(re.match(r'^\+[0-9\s\-()]+$', data))
    elif data_type == 'sms':
        pattern = r'^sms:\+[0-9]+'
        return bool(re.match(pattern, data))
    elif data_type == 'wifi':
        # Simplified WiFi pattern - just check it starts with WIFI:
        return data.startswith('WIFI:')
    elif data_type == 'geo':
        pattern = r'^geo:-?\d+(\.\d+)?,-?\d+(\.\d+)?(,-?\d+(\.\d+)?)?$'
        return bool(re.match(pattern, data))
    elif data_type == 'vcard':
        return data.startswith('BEGIN:VCARD') and 'END:VCARD' in data
    elif data_type == 'event':
        return data.startswith('BEGIN:VEVENT') and 'END:VEVENT' in data
    return True  # Plain text always valid


def format_data_for_qr(data_type, data):
    """Format data according to type for QR encoding"""
    if data_type == 'email' and not data.startswith('mailto:'):
        return f'mailto:{data}'
    elif data_type == 'phone' and not data.startswith('tel:'):
        return f'tel:{data}'
    elif data_type == 'sms' and not data.startswith('sms:'):
        return f'sms:{data}'
    return data


def generate_qr_matrix(data, error_correction='M', version=None):
    """Generate QR code matrix using qrcode library"""
    qr = qrcode.QRCode(
        version=version,
        error_correction=ERROR_CORRECTION_MAP.get(error_correction, ERROR_CORRECT_M),
        box_size=10,
        border=4,
    )
    qr.add_data(data)
    qr.make(fit=True)
    return qr


def apply_style_to_qr(qr, style='square', fg_color=(0, 0, 0), bg_color=(255, 255, 255)):
    """Apply custom style to QR code"""
    # Get the QR matrix
    matrix = qr.get_matrix()
    size = len(matrix)
    
    # Create image
    img_size = size * 10
    img = Image.new('RGB', (img_size, img_size), bg_color)
    draw = ImageDraw.Draw(img)
    
    # Draw modules based on style
    for row_idx, row in enumerate(matrix):
        for col_idx, module in enumerate(row):
            if module:
                x = col_idx * 10
                y = row_idx * 10
                
                if style == 'rounded':
                    # Draw rounded rectangles
                    radius = 3
                    draw.rounded_rectangle(
                        [(x + 1, y + 1), (x + 9, y + 9)],
                        radius=radius,
                        fill=fg_color
                    )
                elif style == 'dots':
                    # Draw circles
                    center_x = x + 5
                    center_y = y + 5
                    draw.ellipse(
                        [(center_x - 4, center_y - 4), (center_x + 4, center_y + 4)],
                        fill=fg_color
                    )
                elif style == 'diamond':
                    # Draw diamonds
                    points = [
                        (x + 5, y + 1),
                        (x + 9, y + 5),
                        (x + 5, y + 9),
                        (x + 1, y + 5)
                    ]
                    draw.polygon(points, fill=fg_color)
                else:  # square
                    draw.rectangle([(x, y), (x + 9, y + 9)], fill=fg_color)
    
    return img


def overlay_logo(qr_image, logo_data, logo_size_ratio=0.25):
    """Overlay logo on QR code with proper error correction handling"""
    # Convert logo data to image
    if isinstance(logo_data, str):
        # Base64 encoded
        if ',' in logo_data:
            logo_data = logo_data.split(',')[1]
        logo_bytes = base64.b64decode(logo_data)
        logo_img = Image.open(io.BytesIO(logo_bytes))
    else:
        logo_img = logo_data
    
    # Convert to RGBA if necessary
    if logo_img.mode != 'RGBA':
        logo_img = logo_img.convert('RGBA')
    
    # Calculate logo size
    qr_width, qr_height = qr_image.size
    logo_size = int(min(qr_width, qr_height) * logo_size_ratio)
    logo_img = logo_img.resize((logo_size, logo_size), Image.Resampling.LANCZOS)
    
    # Calculate position (center)
    x = (qr_width - logo_size) // 2
    y = (qr_height - logo_size) // 2
    
    # Create a copy to paste on
    result = qr_image.copy()
    if result.mode != 'RGBA':
        result = result.convert('RGBA')
    
    # Paste logo with transparency
    result.paste(logo_img, (x, y), logo_img)
    
    return result


def generate_svg(data, error_correction='M', fg_color='#000000', bg_color='#FFFFFF'):
    """Generate SVG QR code using segno"""
    qr = segno.make_qr(data, error=error_correction)
    
    output = io.BytesIO()
    qr.save(
        out=output,
        kind='svg',
        scale=10,
        dark=fg_color,
        light=bg_color,
        border=4
    )
    return output.getvalue().decode('utf-8')


def generate_pdf(qr_image, filename='qrcode.pdf'):
    """Generate PDF with QR code"""
    buffer = io.BytesIO()
    
    c = pdf_canvas.Canvas(buffer, pagesize=letter)
    width, height = letter
    
    # Convert PIL image to bytes for reportlab
    img_buffer = io.BytesIO()
    qr_image.save(img_buffer, format='PNG')
    img_buffer.seek(0)
    
    img_reader = ImageReader(img_buffer)
    
    # Center the QR code on the page
    x = (width - 400) / 2
    y = (height - 400) / 2
    
    c.drawImage(img_reader, x, y, width=400, height=400)
    c.save()
    
    buffer.seek(0)
    return buffer


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'qr-api',
        'timestamp': datetime.utcnow().isoformat(),
        'version': '1.0.0'
    })


@app.route('/api/qr/generate', methods=['POST'])
@rate_limit(max_requests=100, window_seconds=60)
def generate_qr():
    """
    Generate a QR code.
    
    Expected JSON payload:
    {
        "data": "string",           # Required: Data to encode
        "data_type": "url",         # Optional: url, text, email, phone, sms, wifi, geo, vcard, event
        "size": 300,                # Optional: Size in pixels (default: 300, range: 100-1000)
        "format": "png",            # Optional: png, svg, pdf (default: png)
        "error_correction": "M",    # Optional: L, M, Q, H (default: M)
        "border": 4,                # Optional: Border size (default: 4)
        "fill_color": "#000000",    # Optional: QR code color (hex)
        "bg_color": "#FFFFFF",      # Optional: Background color (hex)
        "style": "square",          # Optional: square, rounded, dots, diamond
        "logo": "base64_string"     # Optional: Logo as base64 or URL
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'data' not in data:
            return jsonify({
                'success': False,
                'error': 'Missing required field: data'
            }), 400
        
        qr_data = data['data']
        data_type = data.get('data_type', 'text')
        size = min(max(int(data.get('size', 300)), 100), 1000)
        output_format = data.get('format', 'png').lower()
        error_correction = data.get('error_correction', 'M').upper()
        border = min(max(int(data.get('border', 4)), 0), 10)
        fill_color = data.get('fill_color', '#000000')
        bg_color = data.get('bg_color', '#FFFFFF')
        style = data.get('style', 'square')
        logo = data.get('logo')
        
        # Validate parameters
        if output_format not in ['png', 'svg', 'pdf']:
            return jsonify({
                'success': False,
                'error': 'Invalid format. Use "png", "svg", or "pdf"'
            }), 400
        
        if error_correction not in ['L', 'M', 'Q', 'H']:
            return jsonify({
                'success': False,
                'error': 'Invalid error correction level. Use L, M, Q, or H'
            }), 400
        
        if not validate_color(fill_color) or not validate_color(bg_color):
            return jsonify({
                'success': False,
                'error': 'Invalid color format. Use hex format like #000000'
            }), 400
        
        if style not in ['square', 'rounded', 'dots', 'diamond']:
            return jsonify({
                'success': False,
                'error': 'Invalid style. Use square, rounded, dots, or diamond'
            }), 400
        
        # Validate data type
        formatted_data = format_data_for_qr(data_type, qr_data)
        if not validate_data_type(data_type, formatted_data):
            return jsonify({
                'success': False,
                'error': f'Invalid data format for type: {data_type}'
            }), 400
        
        # Auto-upgrade error correction if logo is present
        if logo:
            error_correction = 'H'
        
        # Parse colors
        fg_rgb = parse_color(fill_color)
        bg_rgb = parse_color(bg_color)
        
        # Generate QR code
        if output_format == 'svg':
            svg_content = generate_svg(formatted_data, error_correction, fill_color, bg_color)
            
            # Return base64 encoded SVG
            svg_base64 = base64.b64encode(svg_content.encode()).decode()
            
            return jsonify({
                'success': True,
                'message': 'QR code generated successfully',
                'data': {
                    'format': 'svg',
                    'size': size,
                    'error_correction': error_correction,
                    'encoding': 'base64',
                    'image': svg_base64,
                    'download_url': '/api/qr/download/' + str(uuid.uuid4())
                },
                'metadata': {
                    'generated_at': datetime.utcnow().isoformat(),
                    'data_length': len(formatted_data),
                    'data_type': data_type
                }
            })
        
        # For PNG and PDF, use Pillow-based generation
        if style != 'square':
            # Generate styled QR
            qr = generate_qr_matrix(formatted_data, error_correction)
            qr_image = apply_style_to_qr(qr, style, fg_rgb, bg_rgb)
        else:
            # Standard QR code with colors
            qr = qrcode.QRCode(
                version=1,
                error_correction=ERROR_CORRECTION_MAP[error_correction],
                box_size=10,
                border=border,
            )
            qr.add_data(formatted_data)
            qr.make(fit=True)
            qr_image = qr.make_image(fill_color=fill_color, back_color=bg_color)
        
        # Resize to requested size
        qr_image = qr_image.resize((size, size), Image.Resampling.LANCZOS)
        
        # Overlay logo if provided
        if logo:
            try:
                qr_image = overlay_logo(qr_image, logo)
            except Exception as e:
                # Continue without logo if there's an error
                pass
        
        # Convert to base64
        buffer = io.BytesIO()
        qr_image.save(buffer, format='PNG')
        buffer.seek(0)
        img_base64 = base64.b64encode(buffer.read()).decode()
        
        # Generate PDF if requested
        pdf_base64 = None
        if output_format == 'pdf':
            pdf_buffer = generate_pdf(qr_image)
            pdf_base64 = base64.b64encode(pdf_buffer.read()).decode()
        
        response_data = {
            'success': True,
            'message': 'QR code generated successfully',
            'data': {
                'format': output_format,
                'size': size,
                'error_correction': error_correction,
                'encoding': 'base64',
                'image': img_base64,
            },
            'metadata': {
                'generated_at': datetime.utcnow().isoformat(),
                'data_length': len(formatted_data),
                'data_type': data_type,
                'style': style,
                'has_logo': logo is not None
            }
        }
        
        if pdf_base64:
            response_data['data']['pdf'] = pdf_base64
        
        return jsonify(response_data)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'type': type(e).__name__
        }), 500


@app.route('/api/qr/generate/file', methods=['POST'])
@rate_limit(max_requests=50, window_seconds=60)
def generate_qr_file():
    """
    Generate and return QR code as a downloadable file.
    
    Same parameters as /generate but returns file directly.
    """
    try:
        data = request.get_json()
        
        if not data or 'data' not in data:
            return jsonify({
                'success': False,
                'error': 'Missing required field: data'
            }), 400
        
        qr_data = data['data']
        data_type = data.get('data_type', 'text')
        size = min(max(int(data.get('size', 300)), 100), 1000)
        output_format = data.get('format', 'png').lower()
        error_correction = data.get('error_correction', 'M').upper()
        border = min(max(int(data.get('border', 4)), 0), 10)
        fill_color = data.get('fill_color', '#000000')
        bg_color = data.get('bg_color', '#FFFFFF')
        style = data.get('style', 'square')
        logo = data.get('logo')
        
        # Validate and format data
        formatted_data = format_data_for_qr(data_type, qr_data)
        
        # Auto-upgrade error correction if logo is present
        if logo:
            error_correction = 'H'
        
        # Parse colors
        fg_rgb = parse_color(fill_color)
        bg_rgb = parse_color(bg_color)
        
        # Generate QR code
        if style != 'square':
            qr = generate_qr_matrix(formatted_data, error_correction)
            qr_image = apply_style_to_qr(qr, style, fg_rgb, bg_rgb)
        else:
            qr = qrcode.QRCode(
                version=1,
                error_correction=ERROR_CORRECTION_MAP[error_correction],
                box_size=10,
                border=border,
            )
            qr.add_data(formatted_data)
            qr.make(fit=True)
            qr_image = qr.make_image(fill_color=fill_color, back_color=bg_color)
        
        # Resize
        qr_image = qr_image.resize((size, size), Image.Resampling.LANCZOS)
        
        # Overlay logo
        if logo:
            qr_image = overlay_logo(qr_image, logo)
        
        # Prepare response
        buffer = io.BytesIO()
        
        if output_format == 'svg':
            svg_content = generate_svg(formatted_data, error_correction, fill_color, bg_color)
            buffer.write(svg_content.encode())
            content_type = 'image/svg+xml'
            filename = 'qrcode.svg'
        elif output_format == 'pdf':
            pdf_buffer = generate_pdf(qr_image)
            buffer = pdf_buffer
            content_type = 'application/pdf'
            filename = 'qrcode.pdf'
        else:
            qr_image.save(buffer, format='PNG')
            content_type = 'image/png'
            filename = 'qrcode.png'
        
        buffer.seek(0)
        
        response = make_response(buffer.read())
        response.headers['Content-Type'] = content_type
        response.headers['Content-Disposition'] = f'attachment; filename={filename}'
        return response
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/qr/batch', methods=['POST'])
@rate_limit(max_requests=10, window_seconds=60)
def batch_generate():
    """
    Generate multiple QR codes in one request.
    
    Expected JSON payload:
    {
        "items": [
            {"data": "url1", "filename": "qr1"},
            {"data": "url2", "filename": "qr2"},
            ...
        ],
        "size": 200,
        "format": "png",
        "zip": true
    }
    
    Or CSV/Excel upload via multipart form data.
    """
    try:
        # Check if it's a file upload
        if 'file' in request.files:
            file = request.files['file']
            filename = file.filename.lower()
            
            # Read CSV or Excel
            if filename.endswith('.csv'):
                df = pd.read_csv(file)
            elif filename.endswith(('.xlsx', '.xls')):
                df = pd.read_excel(file)
            else:
                return jsonify({
                    'success': False,
                    'error': 'Unsupported file format. Use CSV or Excel.'
                }), 400
            
            # Convert to items list
            items = []
            for _, row in df.iterrows():
                item = {'data': str(row.iloc[0]) if len(row) > 0 else ''}
                if len(row) > 1:
                    item['filename'] = str(row.iloc[1])
                items.append(item)
        else:
            data = request.get_json()
            
            if not data or 'items' not in data:
                return jsonify({
                    'success': False,
                    'error': 'Missing required field: items'
                }), 400
            
            items = data['items']
        
        if not isinstance(items, list) or len(items) == 0:
            return jsonify({
                'success': False,
                'error': 'Items must be a non-empty array'
            }), 400
        
        if len(items) > 100:
            return jsonify({
                'success': False,
                'error': 'Maximum 100 items per batch'
            }), 400
        
        # Common parameters
        size = min(max(int(data.get('size', 200) if 'data' in locals() else 200), 100), 1000)
        output_format = data.get('format', 'png').lower() if 'data' in locals() else 'png'
        return_zip = data.get('zip', True) if 'data' in locals() else True
        
        # Generate QR codes
        generated_files = []
        
        for i, item in enumerate(items):
            if 'data' not in item:
                return jsonify({
                    'success': False,
                    'error': f'Item {i} missing "data" field'
                }), 400
            
            try:
                qr_data = item['data']
                filename = item.get('filename', f'qr_{i}')
                
                # Generate QR code
                qr = qrcode.QRCode(
                    version=1,
                    error_correction=ERROR_CORRECT_M,
                    box_size=10,
                    border=4,
                )
                qr.add_data(qr_data)
                qr.make(fit=True)
                qr_image = qr.make_image(fill_color='black', back_color='white')
                qr_image = qr_image.resize((size, size), Image.Resampling.LANCZOS)
                
                # Save to buffer
                buffer = io.BytesIO()
                qr_image.save(buffer, format='PNG')
                buffer.seek(0)
                
                generated_files.append({
                    'filename': f'{filename}.png',
                    'data': buffer
                })
            except Exception as e:
                generated_files.append({
                    'filename': f'qr_{i}_error.txt',
                    'data': io.BytesIO(str(e).encode())
                })
        
        # Return as ZIP or list
        if return_zip:
            zip_buffer = io.BytesIO()
            with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
                for file_info in generated_files:
                    zip_file.writestr(file_info['filename'], file_info['data'].read())
            
            zip_buffer.seek(0)
            
            response = make_response(zip_buffer.read())
            response.headers['Content-Type'] = 'application/zip'
            response.headers['Content-Disposition'] = 'attachment; filename=qrcodes.zip'
            return response
        else:
            # Return list of base64 encoded images
            results = []
            for file_info in generated_files:
                file_info['data'].seek(0)
                img_base64 = base64.b64encode(file_info['data'].read()).decode()
                results.append({
                    'filename': file_info['filename'],
                    'image': img_base64
                })
            
            return jsonify({
                'success': True,
                'message': f'Batch generated {len(results)} QR codes',
                'results': results
            })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/qr/upload-logo', methods=['POST'])
@rate_limit(max_requests=30, window_seconds=60)
def upload_logo():
    """
    Upload a logo for QR code overlay.
    
    Input: Multipart form data with logo image.
    Output: JSON with logo_id or base64_data.
    """
    try:
        if 'logo' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No logo file provided'
            }), 400
        
        file = request.files['logo']
        
        if file.filename == '':
            return jsonify({
                'success': False,
                'error': 'No file selected'
            }), 400
        
        # Validate file type
        allowed_extensions = {'png', 'jpg', 'jpeg', 'gif', 'webp'}
        ext = file.filename.rsplit('.', 1)[-1].lower()
        
        if ext not in allowed_extensions:
            return jsonify({
                'success': False,
                'error': f'Invalid file type. Allowed: {", ".join(allowed_extensions)}'
            }), 400
        
        # Validate file size (max 5MB)
        file.seek(0, 2)  # Seek to end
        file_size = file.tell()
        file.seek(0)  # Reset
        
        if file_size > 5 * 1024 * 1024:
            return jsonify({
                'success': False,
                'error': 'File too large. Maximum 5MB allowed'
            }), 400
        
        # Read and validate image
        try:
            img = Image.open(file.stream)
            img.verify()  # Verify it's a valid image
        except Exception:
            return jsonify({
                'success': False,
                'error': 'Invalid image file'
            }), 400
        
        # Reset file pointer
        file.seek(0)
        img = Image.open(file.stream)
        
        # Convert to PNG if necessary
        if img.mode in ('RGBA', 'LA') or (img.mode == 'P' and 'transparency' in img.info):
            img_format = 'PNG'
        else:
            img = img.convert('RGBA')
            img_format = 'PNG'
        
        # Save to buffer
        buffer = io.BytesIO()
        img.save(buffer, format=img_format)
        buffer.seek(0)
        
        # Encode to base64
        img_base64 = base64.b64encode(buffer.read()).decode()
        
        # Generate logo ID
        logo_id = str(uuid.uuid4())
        
        # Optionally save to disk
        logo_path = os.path.join(app.config['LOGO_FOLDER'], f'{logo_id}.png')
        buffer.seek(0)
        with open(logo_path, 'wb') as f:
            f.write(buffer.read())
        
        return jsonify({
            'success': True,
            'logo_id': logo_id,
            'base64_data': f'data:image/png;base64,{img_base64}',
            'filename': file.filename,
            'size': file_size,
            'format': img_format
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/qr/history', methods=['GET'])
def get_history():
    """
    Fetch user's past generated QR codes.
    Requires database integration (optional).
    """
    # Placeholder - implement with actual DB when needed
    return jsonify({
        'success': True,
        'message': 'History feature requires database integration',
        'data': [],
        'total': 0
    })


@app.route('/api/qr/validate', methods=['POST'])
def validate_qr():
    """
    Validate a QR code by decoding it.
    
    Input: Image file or base64 encoded image.
    Output: Decoded data and validation status.
    """
    try:
        import cv2
        from pyzbar import pyzbar
        import numpy as np
        
        if 'image' in request.files:
            file = request.files['image']
            img_array = np.frombuffer(file.read(), np.uint8)
            img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        elif 'image' in request.json:
            img_data = request.json['image']
            if ',' in img_data:
                img_data = img_data.split(',')[1]
            img_bytes = base64.b64decode(img_data)
            img_array = np.frombuffer(img_bytes, np.uint8)
            img = cv2.imdecode(img_array, cv2.IMREAD_COLOR)
        else:
            return jsonify({
                'success': False,
                'error': 'No image provided'
            }), 400
        
        # Decode QR code
        decoded_objects = pyzbar.decode(img)
        
        if not decoded_objects:
            return jsonify({
                'success': True,
                'valid': False,
                'message': 'No QR code detected in image',
                'data': None
            })
        
        results = []
        for obj in decoded_objects:
            results.append({
                'type': obj.type,
                'data': obj.data.decode('utf-8'),
                'points': [point.tolist() for point in obj.polygon]
            })
        
        return jsonify({
            'success': True,
            'valid': True,
            'message': 'QR code successfully decoded',
            'data': results
        })
        
    except ImportError:
        return jsonify({
            'success': False,
            'error': 'QR validation requires opencv-python and pyzbar packages'
        }), 500
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'success': False,
        'error': 'Endpoint not found'
    }), 404


@app.errorhandler(405)
def method_not_allowed(error):
    return jsonify({
        'success': False,
        'error': 'Method not allowed'
    }), 405


@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        'success': False,
        'error': 'Internal server error'
    }), 500


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
