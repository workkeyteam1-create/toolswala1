"""
ToolsWala - PDF Editor API
Flask backend for PDF manipulation operations.
Deploy on Render.com
"""

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
import os
import io
import uuid
from datetime import datetime
from functools import wraps

# Initialize Flask app
app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Configuration
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB max upload
app.config['UPLOAD_FOLDER'] = '/tmp/uploads'
app.config['OUTPUT_FOLDER'] = '/tmp/outputs'

# Ensure folders exist
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
os.makedirs(app.config['OUTPUT_FOLDER'], exist_ok=True)


def validate_file(file):
    """Validate uploaded file is a PDF"""
    if not file:
        return False, "No file provided"
    
    filename = file.filename.lower()
    if not filename.endswith('.pdf'):
        return False, "File must be a PDF"
    
    # Check MIME type
    if file.content_type not in ['application/pdf', 'application/x-pdf']:
        return False, "Invalid MIME type"
    
    return True, None


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'service': 'pdf-api',
        'timestamp': datetime.utcnow().isoformat(),
        'version': '1.0.0'
    })


@app.route('/api/pdf/upload', methods=['POST'])
def upload_pdf():
    """
    Upload a PDF file for processing.
    
    Returns a file_id that can be used for subsequent operations.
    """
    try:
        if 'file' not in request.files:
            return jsonify({
                'success': False,
                'error': 'No file provided'
            }), 400
        
        file = request.files['file']
        
        is_valid, error_msg = validate_file(file)
        if not is_valid:
            return jsonify({
                'success': False,
                'error': error_msg
            }), 400
        
        # Generate unique file ID
        file_id = str(uuid.uuid4())
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{file_id}.pdf")
        
        # Save file (in production, consider cloud storage)
        file.save(file_path)
        
        # Get file info
        file_size = os.path.getsize(file_path)
        
        return jsonify({
            'success': True,
            'message': 'PDF uploaded successfully',
            'data': {
                'file_id': file_id,
                'filename': file.filename,
                'size_bytes': file_size,
                'size_mb': round(file_size / (1024 * 1024), 2),
                'uploaded_at': datetime.utcnow().isoformat(),
                'expires_at': None  # Could implement expiration logic
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e),
            'type': type(e).__name__
        }), 500


@app.route('/api/pdf/<file_id>/info', methods=['GET'])
def get_pdf_info(file_id):
    """
    Get information about an uploaded PDF.
    
    Returns metadata like page count, file size, etc.
    """
    try:
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{file_id}.pdf")
        
        if not os.path.exists(file_path):
            return jsonify({
                'success': False,
                'error': 'File not found'
            }), 404
        
        file_size = os.path.getsize(file_path)
        
        # TODO: Extract actual PDF metadata using PyPDF2 or similar
        # Example:
        # from PyPDF2 import PdfReader
        # reader = PdfReader(file_path)
        # page_count = len(reader.pages)
        # metadata = reader.metadata
        
        # Mock response for now
        mock_info = {
            'success': True,
            'data': {
                'file_id': file_id,
                'filename': f"{file_id}.pdf",
                'size_bytes': file_size,
                'size_mb': round(file_size / (1024 * 1024), 2),
                'page_count': 5,  # Placeholder
                'pdf_version': '1.7',
                'is_encrypted': False,
                'metadata': {
                    'title': '',
                    'author': '',
                    'subject': '',
                    'creator': ''
                }
            }
        }
        
        return jsonify(mock_info)
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/pdf/<file_id>/merge', methods=['POST'])
def merge_pdfs(file_id):
    """
    Merge the uploaded PDF with other PDFs.
    
    Expected JSON payload:
    {
        "files": ["file_id_1", "file_id_2", ...],  # Other file IDs to merge
        "output_filename": "merged.pdf"  # Optional
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'files' not in data:
            return jsonify({
                'success': False,
                'error': 'Missing required field: files'
            }), 400
        
        files_to_merge = data['files']
        
        if not isinstance(files_to_merge, list) or len(files_to_merge) == 0:
            return jsonify({
                'success': False,
                'error': 'Files must be a non-empty array'
            }), 400
        
        # Verify base file exists
        base_file = os.path.join(app.config['UPLOAD_FOLDER'], f"{file_id}.pdf")
        if not os.path.exists(base_file):
            return jsonify({
                'success': False,
                'error': 'Base file not found'
            }), 404
        
        # Verify all files to merge exist
        for fid in files_to_merge:
            merge_file = os.path.join(app.config['UPLOAD_FOLDER'], f"{fid}.pdf")
            if not os.path.exists(merge_file):
                return jsonify({
                    'success': False,
                    'error': f'File {fid} not found'
                }), 404
        
        # TODO: Implement actual PDF merging
        # Example using PyPDF2:
        # from PyPDF2 import PdfMerger
        # merger = PdfMerger()
        # merger.append(base_file)
        # for fid in files_to_merge:
        #     merger.append(os.path.join(app.config['UPLOAD_FOLDER'], f"{fid}.pdf"))
        # output_id = str(uuid.uuid4())
        # output_path = os.path.join(app.config['OUTPUT_FOLDER'], f"{output_id}.pdf")
        # merger.write(output_path)
        # merger.close()
        
        output_id = str(uuid.uuid4())
        
        return jsonify({
            'success': True,
            'message': 'PDFs merged successfully (placeholder)',
            'data': {
                'output_id': output_id,
                'output_filename': data.get('output_filename', 'merged.pdf'),
                'source_files': [file_id] + files_to_merge,
                'download_url': f'/api/pdf/{output_id}/download',
                'created_at': datetime.utcnow().isoformat()
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/pdf/<file_id>/split', methods=['POST'])
def split_pdf(file_id):
    """
    Split a PDF into multiple files.
    
    Expected JSON payload:
    {
        "mode": "all" | "range" | "pages",  # Split mode
        "pages": [1, 3, 5],                 # For mode=pages
        "start": 1,                         # For mode=range
        "end": 5                            # For mode=range
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'mode' not in data:
            return jsonify({
                'success': False,
                'error': 'Missing required field: mode'
            }), 400
        
        mode = data['mode']
        
        if mode not in ['all', 'range', 'pages']:
            return jsonify({
                'success': False,
                'error': 'Invalid mode. Use "all", "range", or "pages"'
            }), 400
        
        # Verify file exists
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{file_id}.pdf")
        if not os.path.exists(file_path):
            return jsonify({
                'success': False,
                'error': 'File not found'
            }), 404
        
        # TODO: Implement actual PDF splitting
        
        # Mock response
        output_ids = [str(uuid.uuid4()) for _ in range(3)]
        
        return jsonify({
            'success': True,
            'message': 'PDF split successfully (placeholder)',
            'data': {
                'mode': mode,
                'output_files': [
                    {'id': oid, 'filename': f'split_{i+1}.pdf'}
                    for i, oid in enumerate(output_ids)
                ],
                'total_pages': 10,  # Placeholder
                'created_at': datetime.utcnow().isoformat()
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/pdf/<file_id>/compress', methods=['POST'])
def compress_pdf(file_id):
    """
    Compress a PDF to reduce file size.
    
    Expected JSON payload:
    {
        "quality": "low" | "medium" | "high",  # Compression level
        "target_size_mb": 5                     # Optional target size
    }
    """
    try:
        data = request.get_json()
        
        quality = data.get('quality', 'medium') if data else 'medium'
        
        if quality not in ['low', 'medium', 'high']:
            return jsonify({
                'success': False,
                'error': 'Invalid quality. Use "low", "medium", or "high"'
            }), 400
        
        # Verify file exists
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{file_id}.pdf")
        if not os.path.exists(file_path):
            return jsonify({
                'success': False,
                'error': 'File not found'
            }), 404
        
        original_size = os.path.getsize(file_path)
        
        # TODO: Implement actual PDF compression
        
        output_id = str(uuid.uuid4())
        compressed_size = int(original_size * 0.6)  # Mock 40% reduction
        
        return jsonify({
            'success': True,
            'message': 'PDF compressed successfully (placeholder)',
            'data': {
                'output_id': output_id,
                'original_size_bytes': original_size,
                'compressed_size_bytes': compressed_size,
                'reduction_percent': 40,
                'quality': quality,
                'download_url': f'/api/pdf/{output_id}/download',
                'created_at': datetime.utcnow().isoformat()
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/pdf/<file_id>/convert', methods=['POST'])
def convert_pdf(file_id):
    """
    Convert PDF to another format.
    
    Expected JSON payload:
    {
        "format": "docx" | "txt" | "html" | "jpg" | "png",
        "pages": [1, 2, 3]  # Optional: specific pages to convert
    }
    """
    try:
        data = request.get_json()
        
        if not data or 'format' not in data:
            return jsonify({
                'success': False,
                'error': 'Missing required field: format'
            }), 400
        
        output_format = data['format'].lower()
        
        valid_formats = ['docx', 'txt', 'html', 'jpg', 'png']
        if output_format not in valid_formats:
            return jsonify({
                'success': False,
                'error': f'Invalid format. Use one of: {", ".join(valid_formats)}'
            }), 400
        
        # Verify file exists
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{file_id}.pdf")
        if not os.path.exists(file_path):
            return jsonify({
                'success': False,
                'error': 'File not found'
            }), 404
        
        # TODO: Implement actual PDF conversion
        
        output_id = str(uuid.uuid4())
        
        return jsonify({
            'success': True,
            'message': f'PDF converted to {output_format} successfully (placeholder)',
            'data': {
                'output_id': output_id,
                'format': output_format,
                'pages_converted': data.get('pages', 'all'),
                'download_url': f'/api/pdf/{output_id}/download',
                'created_at': datetime.utcnow().isoformat()
            }
        })
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/pdf/<file_id>/download', methods=['GET'])
def download_pdf(file_id):
    """
    Download a processed PDF file.
    """
    try:
        file_path = os.path.join(app.config['OUTPUT_FOLDER'], f"{file_id}.pdf")
        
        # Fallback to upload folder if not in output
        if not os.path.exists(file_path):
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{file_id}.pdf")
        
        if not os.path.exists(file_path):
            return jsonify({
                'success': False,
                'error': 'File not found'
            }), 404
        
        return send_file(
            file_path,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=f"{file_id}.pdf"
        )
        
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/pdf/<file_id>', methods=['DELETE'])
def delete_pdf(file_id):
    """
    Delete an uploaded or processed PDF file.
    """
    try:
        upload_path = os.path.join(app.config['UPLOAD_FOLDER'], f"{file_id}.pdf")
        output_path = os.path.join(app.config['OUTPUT_FOLDER'], f"{file_id}.pdf")
        
        deleted = False
        
        if os.path.exists(upload_path):
            os.remove(upload_path)
            deleted = True
        
        if os.path.exists(output_path):
            os.remove(output_path)
            deleted = True
        
        if not deleted:
            return jsonify({
                'success': False,
                'error': 'File not found'
            }), 404
        
        return jsonify({
            'success': True,
            'message': 'File deleted successfully'
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
