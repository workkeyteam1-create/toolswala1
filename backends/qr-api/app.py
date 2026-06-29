"""
ToolsWala - QR Code Generator API
Flask backend for QR code generation operations.
Deploy on Render.com
"""

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os
import io
import base64
from datetime import datetime

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configuration
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB max upload
app.config['UPLOAD_FOLDER'] = '/tmp/uploads'

# Ensure upload folder exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)


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
def generate_qr():
    """
    Generate a QR code.
    
    Expected JSON payload:
    {
        "data": "string",           # Required: Data to encode
        "size": 200,                # Optional: Size in pixels (default: 200)
        "format": "png",            # Optional: png or svg (default: png)
        "error_correction": "M",    # Optional: L, M, Q, H (default: M)
        "border": 4,                # Optional: Border size (default: 4)
        "fill_color": "#000000",    # Optional: QR code color
        "bg_color": "#FFFFFF"       # Optional: Background color
    }
    
    Returns:
    - For PNG: Image file or base64 encoded string
    - For SVG: SVG string or file
    """
    try:
        data = request.get_json()
        
        if not data or 'data' not in data:
            return jsonify({
                'success': False,
                'error': 'Missing required field: data'
            }), 400
        
        qr_data = data['data']
        size = data.get('size', 200)
        output_format = data.get('format', 'png').lower()
        error_correction = data.get('error_correction', 'M').upper()
        border = data.get('border', 4)
        fill_color = data.get('fill_color', '#000000')
        bg_color = data.get('bg_color', '#FFFFFF')
        
        # Validate parameters
        if output_format not in ['png', 'svg']:
            return jsonify({
                'success': False,
                'error': 'Invalid format. Use "png" or "svg"'
            }), 400
        
        if error_correction not in ['L', 'M', 'Q', 'H']:
            return jsonify({
                'success': False,
                'error': 'Invalid error correction level. Use L, M, Q, or H'
            }), 400
        
        # TODO: Implement actual QR generation logic
        # This is a placeholder response showing the expected structure
        
        # Placeholder: In production, use qrcode library or similar
        # Example:
        # import qrcode
        # qr = qrcode.QRCode(
        #     version=1,
        #     error_correction=qrcode.constants.ERROR_CORRECT_M,
        #     box_size=size//20,
        #     border=border,
        # )
        # qr.add_data(qr_data)
        # qr.make(fit=True)
        # img = qr.make_image(fill_color=fill_color, back_color=bg_color)
        
        # Mock response for now
        mock_response = {
            'success': True,
            'message': 'QR code generated successfully (placeholder)',
            'data': {
                'format': output_format,
                'size': size,
                'error_correction': error_correction,
                'encoding': 'base64',
                # In production, this would be the actual image data
                'image': 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
                'download_url': '/api/qr/download/temp-id'
            },
            'metadata': {
                'generated_at': datetime.utcnow().isoformat(),
                'data_length': len(qr_data),
                'estimated_modules': 25  # Approximate QR module count
            }
        }
        
        return jsonify(mock_response)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'type': type(e).__name__
        }), 500


@app.route('/api/qr/generate/file', methods=['POST'])
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
        
        output_format = data.get('format', 'png').lower()
        
        # TODO: Generate actual QR code file
        # Create mock file for now
        mock_content = b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR\x00\x00\x00\x01\x00\x00\x00\x01\x08\x06\x00\x00\x00\x1f\x15\xc4\x89\x00\x00\x00\nIDATx\x9cc\x00\x01\x00\x00\x05\x00\x01\r\n-\xb4\x00\x00\x00\x00IEND\xaeB`\x82'
        
        buffer = io.BytesIO(mock_content)
        buffer.seek(0)
        
        content_type = 'image/png' if output_format == 'png' else 'image/svg+xml'
        filename = f"qrcode.{output_format}"
        
        return send_file(
            buffer,
            mimetype=content_type,
            as_attachment=True,
            download_name=filename
        )
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/qr/batch', methods=['POST'])
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
        "zip": true  # Return as zip file if true
    }
    """
    try:
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
        
        # TODO: Implement batch generation
        # For now, return placeholder response
        
        results = []
        for i, item in enumerate(items):
            if 'data' not in item:
                return jsonify({
                    'success': False,
                    'error': f'Item {i} missing "data" field'
                }), 400
            
            results.append({
                'index': i,
                'filename': item.get('filename', f'qr_{i}'),
                'status': 'pending',
                'message': 'Queued for generation'
            })
        
        return jsonify({
            'success': True,
            'message': f'Batch processing started for {len(items)} items',
            'total_items': len(items),
            'results': results,
            'estimated_time_seconds': len(items) * 0.5
        })
        
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
