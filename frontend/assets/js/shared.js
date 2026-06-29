/* ============================================
   ToolsWala - Shared JavaScript Utilities
   ============================================ */

// API Configuration
const API_CONFIG = {
  baseURL: '/api',
  timeout: 30000,
  retryAttempts: 3,
  retryDelay: 1000
};

// Fetch wrapper with error handling and retries
async function fetchWithRetry(url, options = {}, attempts = 0) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_CONFIG.timeout);

    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    if (attempts < API_CONFIG.retryAttempts && error.name !== 'AbortError') {
      await sleep(API_CONFIG.retryDelay * (attempts + 1));
      return fetchWithRetry(url, options, attempts + 1);
    }
    throw error;
  }
}

// Sleep utility
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Error handler with user-friendly messages
function handleError(error, context = '') {
  console.error(`[ToolsWala Error${context ? ` - ${context}` : ''}]`, error);
  
  let message = 'Something went wrong. Please try again.';
  
  if (error.name === 'AbortError') {
    message = 'Request timed out. Please check your connection and try again.';
  } else if (error.message.includes('Failed to fetch')) {
    message = 'Unable to connect to server. Please check your internet connection.';
  }
  
  showErrorToast(message);
  return message;
}

// Toast notifications
function showSuccessToast(message, duration = 3000) {
  showToast(message, 'success', duration);
}

function showErrorToast(message, duration = 5000) {
  showToast(message, 'error', duration);
}

function showToast(message, type = 'info', duration = 3000) {
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <div class="toast-content">
      <span class="toast-icon">${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>
      <span class="toast-message">${message}</span>
    </div>
  `;
  
  toast.style.cssText = `
    position: fixed;
    bottom: 2rem;
    right: 2rem;
    padding: 1rem 1.5rem;
    background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#6366f1'};
    color: white;
    border-radius: 0.75rem;
    box-shadow: 0 10px 40px rgba(0,0,0,0.3);
    z-index: 10000;
    animation: slideInRight 0.3s ease-out;
    max-width: 400px;
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = 'slideOutRight 0.3s ease-out';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// Add toast animations to document
const toastStyles = document.createElement('style');
toastStyles.textContent = `
  @keyframes slideInRight {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  @keyframes slideOutRight {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
`;
document.head.appendChild(toastStyles);

// Loading state management
function setLoading(element, isLoading, options = {}) {
  if (isLoading) {
    element.dataset.originalContent = element.innerHTML;
    element.disabled = true;
    element.innerHTML = options.loadingHtml || `
      <span class="spinner"></span>
      <span>${options.loadingText || 'Loading...'}</span>
    `;
  } else {
    element.disabled = false;
    element.innerHTML = element.dataset.originalContent || options.successHtml || '';
  }
}

// Format file size
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Copy to clipboard
async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    showSuccessToast('Copied to clipboard!');
    return true;
  } catch (err) {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      showSuccessToast('Copied to clipboard!');
      return true;
    } catch (err) {
      handleError(err, 'Copy to clipboard');
      return false;
    } finally {
      textArea.remove();
    }
  }
}

// Download file helper
function downloadFile(data, filename, mimeType = 'application/octet-stream') {
  const blob = data instanceof Blob ? data : new Blob([data], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Debounce function
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Throttle function
function throttle(func, limit) {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

// Local storage helpers
const storage = {
  get(key, defaultValue = null) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
      console.error('Storage get error:', e);
      return defaultValue;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error('Storage set error:', e);
      return false;
    }
  },
  remove(key) {
    try {
      localStorage.removeItem(key);
      return true;
    } catch (e) {
      console.error('Storage remove error:', e);
      return false;
    }
  }
};

// Check if element is in viewport
function isInViewport(element) {
  const rect = element.getBoundingClientRect();
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
    rect.right <= (window.innerWidth || document.documentElement.clientWidth)
  );
}

// Smooth scroll to element
function smoothScrollTo(element, offset = 0) {
  const targetPosition = element.getBoundingClientRect().top + window.pageYOffset - offset;
  window.scrollTo({
    top: targetPosition,
    behavior: 'smooth'
  });
}

// ============================================
// Form Validation Utilities
// ============================================

const validators = {
  required(value) {
    if (typeof value === 'string') return value.trim().length > 0;
    if (Array.isArray(value)) return value.length > 0;
    return value !== null && value !== undefined;
  },
  
  email(value) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  },
  
  minLength(min) {
    return (value) => {
      if (!value) return true;
      return value.length >= min;
    };
  },
  
  maxLength(max) {
    return (value) => {
      if (!value) return true;
      return value.length <= max;
    };
  },
  
  pattern(regex) {
    return (value) => {
      if (!value) return true;
      return regex.test(value);
    };
  },
  
  number(min = -Infinity, max = Infinity) {
    return (value) => {
      if (!value) return true;
      const num = parseFloat(value);
      return !isNaN(num) && num >= min && num <= max;
    };
  },
  
  url(value) {
    try {
      new URL(value);
      return true;
    } catch {
      return false;
    }
  }
};

// Validate a single field
function validateField(field, rules = []) {
  const value = field.type === 'checkbox' ? field.checked : field.value;
  const errors = [];
  
  for (const rule of rules) {
    const isValid = typeof rule.validator === 'function' 
      ? rule.validator(value)
      : validators[rule.type]?.(value);
    
    if (!isValid) {
      errors.push(rule.message || `Invalid ${field.name || 'field'}`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    value
  };
}

// Validate entire form
function validateForm(formElement, validationRules = {}) {
  const results = {};
  let isFormValid = true;
  
  const fields = formElement.querySelectorAll('input, select, textarea');
  
  fields.forEach(field => {
    const fieldName = field.name || field.id;
    if (!fieldName) return;
    
    const rules = validationRules[fieldName] || [];
    const result = validateField(field, rules);
    
    results[fieldName] = result;
    
    // Update field UI
    field.classList.toggle('valid', result.isValid);
    field.classList.toggle('invalid', !result.isValid);
    field.setAttribute('aria-invalid', !result.isValid);
    
    // Show/hide error message
    const errorContainer = field.parentElement.querySelector('.error-message') || 
                          formElement.querySelector(`[data-error-for="${fieldName}"]`);
    
    if (errorContainer) {
      if (!result.isValid) {
        errorContainer.textContent = result.errors.join(', ');
        errorContainer.style.display = 'block';
      } else {
        errorContainer.textContent = '';
        errorContainer.style.display = 'none';
      }
    }
    
    if (!result.isValid) {
      isFormValid = false;
    }
  });
  
  return {
    isValid: isFormValid,
    fields: results
  };
}

// Add real-time validation to form fields
function enableRealTimeValidation(formElement, validationRules = {}) {
  const fields = formElement.querySelectorAll('input, select, textarea');
  
  fields.forEach(field => {
    const fieldName = field.name || field.id;
    if (!fieldName || !validationRules[fieldName]) return;
    
    field.addEventListener('blur', () => {
      const result = validateField(field, validationRules[fieldName]);
      
      field.classList.toggle('valid', result.isValid);
      field.classList.toggle('invalid', !result.isValid);
      field.setAttribute('aria-invalid', !result.isValid);
      
      const errorContainer = field.parentElement.querySelector('.error-message') ||
                            formElement.querySelector(`[data-error-for="${fieldName}"]`);
      
      if (errorContainer) {
        if (!result.isValid) {
          errorContainer.textContent = result.errors.join(', ');
          errorContainer.style.display = 'block';
        } else {
          errorContainer.textContent = '';
          errorContainer.style.display = 'none';
        }
      }
    });
  });
}

// Initialize on DOM ready
function onDOMReady(callback) {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', callback);
  } else {
    callback();
  }
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    API_CONFIG,
    fetchWithRetry,
    sleep,
    handleError,
    showSuccessToast,
    showErrorToast,
    showToast,
    setLoading,
    formatFileSize,
    copyToClipboard,
    downloadFile,
    debounce,
    throttle,
    storage,
    isInViewport,
    smoothScrollTo,
    onDOMReady,
    validators,
    validateField,
    validateForm,
    enableRealTimeValidation
  };
}
