/* ============================================
   ToolsWala - Command Palette
   Fast tool launcher with keyboard shortcuts
   ============================================ */

class CommandPalette {
  constructor(options = {}) {
    this.options = {
      triggerKeys: ['cmd+k', 'ctrl+k', '/'],
      searchPlaceholder: 'Search tools...',
      maxResults: 8,
      ...options
    };
    
    this.isOpen = false;
    this.tools = [];
    this.filteredTools = [];
    this.selectedIndex = 0;
    
    this.init();
  }
  
  async init() {
    await this.loadTools();
    this.createPalette();
    this.bindEvents();
    this.setupKeyboardShortcuts();
  }
  
  async loadTools() {
    try {
      const response = await fetch('/data/tools.json');
      const data = await response.json();
      this.tools = data.tools || [];
    } catch (error) {
      console.error('Failed to load tools:', error);
      this.tools = [];
    }
  }
  
  createPalette() {
    const palette = document.createElement('div');
    palette.id = 'command-palette';
    palette.className = 'command-palette';
    palette.innerHTML = `
      <div class="command-palette-overlay"></div>
      <div class="command-palette-container">
        <div class="command-palette-header">
          <svg class="search-icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <path d="m21 21-4.35-4.35"></path>
          </svg>
          <input 
            type="text" 
            id="command-search" 
            placeholder="${this.options.searchPlaceholder}"
            autocomplete="off"
            spellcheck="false"
          >
          <kbd class="shortcut-hint">ESC</kbd>
        </div>
        <div class="command-palette-results" id="command-results">
          <div class="results-loading">
            <div class="loading-spinner"></div>
            <span>Loading tools...</span>
          </div>
        </div>
        <div class="command-palette-footer">
          <span class="footer-text">
            <kbd>↑↓</kbd> Navigate &nbsp;
            <kbd>↵</kbd> Select &nbsp;
            <kbd>ESC</kbd> Close
          </span>
        </div>
      </div>
    `;
    
    document.body.appendChild(palette);
    
    // Add styles
    this.addStyles();
  }
  
  addStyles() {
    const styles = document.createElement('style');
    styles.textContent = `
      .command-palette {
        display: none;
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 10000;
      }
      
      .command-palette.active {
        display: flex;
        align-items: flex-start;
        justify-content: center;
        padding-top: 15vh;
      }
      
      .command-palette-overlay {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        backdrop-filter: blur(4px);
        opacity: 0;
        transition: opacity 0.2s ease;
      }
      
      .command-palette.active .command-palette-overlay {
        opacity: 1;
      }
      
      .command-palette-container {
        position: relative;
        width: 100%;
        max-width: 600px;
        margin: 0 1rem;
        background: #1e293b;
        border-radius: 1rem;
        box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
        border: 1px solid rgba(255, 255, 255, 0.1);
        transform: scale(0.95) translateY(-20px);
        opacity: 0;
        transition: all 0.2s ease;
        overflow: hidden;
      }
      
      .command-palette.active .command-palette-container {
        transform: scale(1) translateY(0);
        opacity: 1;
      }
      
      .command-palette-header {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 1rem 1.25rem;
        border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      }
      
      .search-icon {
        color: #64748b;
        flex-shrink: 0;
      }
      
      #command-search {
        flex: 1;
        background: transparent;
        border: none;
        color: #f1f5f9;
        font-size: 1rem;
        outline: none;
      }
      
      #command-search::placeholder {
        color: #64748b;
      }
      
      .shortcut-hint {
        padding: 0.25rem 0.5rem;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 0.375rem;
        font-size: 0.75rem;
        color: #94a3b8;
        font-family: monospace;
      }
      
      .command-palette-results {
        max-height: 400px;
        overflow-y: auto;
        padding: 0.5rem;
      }
      
      .results-loading {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.75rem;
        padding: 2rem;
        color: #64748b;
      }
      
      .loading-spinner {
        width: 20px;
        height: 20px;
        border: 2px solid rgba(255, 255, 255, 0.1);
        border-top-color: #6366f1;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
      
      @keyframes spin {
        to { transform: rotate(360deg); }
      }
      
      .result-item {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.75rem 1rem;
        border-radius: 0.5rem;
        cursor: pointer;
        transition: all 0.15s ease;
        text-decoration: none;
        color: inherit;
      }
      
      .result-item:hover,
      .result-item.selected {
        background: rgba(99, 102, 241, 0.15);
      }
      
      .result-item.selected {
        background: rgba(99, 102, 241, 0.2);
      }
      
      .result-icon {
        width: 40px;
        height: 40px;
        border-radius: 0.5rem;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-shrink: 0;
        font-size: 1.25rem;
      }
      
      .result-content {
        flex: 1;
        min-width: 0;
      }
      
      .result-title {
        font-weight: 600;
        color: #f1f5f9;
        margin-bottom: 0.125rem;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      
      .result-description {
        font-size: 0.875rem;
        color: #94a3b8;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      
      .result-arrow {
        color: #64748b;
        opacity: 0;
        transition: opacity 0.15s ease;
      }
      
      .result-item:hover .result-arrow,
      .result-item.selected .result-arrow {
        opacity: 1;
      }
      
      .no-results {
        text-align: center;
        padding: 3rem 1rem;
        color: #64748b;
      }
      
      .no-results-icon {
        font-size: 2rem;
        margin-bottom: 0.5rem;
      }
      
      .command-palette-footer {
        padding: 0.75rem 1.25rem;
        border-top: 1px solid rgba(255, 255, 255, 0.1);
        background: rgba(0, 0, 0, 0.2);
      }
      
      .footer-text {
        font-size: 0.75rem;
        color: #64748b;
      }
      
      .footer-text kbd {
        padding: 0.125rem 0.375rem;
        background: rgba(255, 255, 255, 0.1);
        border-radius: 0.25rem;
        font-family: monospace;
        margin-right: 0.25rem;
      }
    `;
    
    document.head.appendChild(styles);
  }
  
  bindEvents() {
    const overlay = document.querySelector('.command-palette-overlay');
    const searchInput = document.getElementById('command-search');
    
    overlay.addEventListener('click', () => this.close());
    
    searchInput.addEventListener('input', (e) => {
      this.filterTools(e.target.value);
    });
    
    searchInput.addEventListener('keydown', (e) => {
      this.handleKeydown(e);
    });
  }
  
  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      const key = e.key.toLowerCase();
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;
      
      // Check for trigger keys
      if ((modifier && key === 'k') || (key === '/' && document.activeElement.tagName !== 'INPUT')) {
        e.preventDefault();
        this.toggle();
      }
      
      // Close on Escape
      if (key === 'escape' && this.isOpen) {
        this.close();
      }
    });
  }
  
  handleKeydown(e) {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.selectedIndex = Math.min(this.selectedIndex + 1, this.filteredTools.length - 1);
        this.updateSelection();
        break;
        
      case 'ArrowUp':
        e.preventDefault();
        this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
        this.updateSelection();
        break;
        
      case 'Enter':
        e.preventDefault();
        if (this.filteredTools[this.selectedIndex]) {
          this.selectTool(this.filteredTools[this.selectedIndex]);
        }
        break;
    }
  }
  
  filterTools(query) {
    const searchTerm = query.toLowerCase().trim();
    
    if (!searchTerm) {
      this.filteredTools = this.tools.slice(0, this.options.maxResults);
    } else {
      this.filteredTools = this.tools.filter(tool => 
        tool.name.toLowerCase().includes(searchTerm) ||
        tool.description.toLowerCase().includes(searchTerm) ||
        tool.category.toLowerCase().includes(searchTerm)
      ).slice(0, this.options.maxResults);
    }
    
    this.selectedIndex = 0;
    this.renderResults();
  }
  
  renderResults() {
    const resultsContainer = document.getElementById('command-results');
    
    if (this.filteredTools.length === 0) {
      resultsContainer.innerHTML = `
        <div class="no-results">
          <div class="no-results-icon">🔍</div>
          <p>No tools found</p>
          <p style="font-size: 0.875rem; margin-top: 0.5rem;">Try a different search term</p>
        </div>
      `;
      return;
    }
    
    resultsContainer.innerHTML = this.filteredTools.map((tool, index) => `
      <a href="/tools/${tool.slug}/" class="result-item ${index === this.selectedIndex ? 'selected' : ''}" data-index="${index}">
        <div class="result-icon" style="background: ${tool.color}20; color: ${tool.color}">
          ${this.getIcon(tool.icon)}
        </div>
        <div class="result-content">
          <div class="result-title">${this.highlightMatch(tool.name)}</div>
          <div class="result-description">${tool.description}</div>
        </div>
        <svg class="result-arrow" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 18l6-6-6-6"></path>
        </svg>
      </a>
    `).join('');
    
    // Add click handlers
    resultsContainer.querySelectorAll('.result-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const index = parseInt(item.dataset.index);
        this.selectTool(this.filteredTools[index]);
      });
    });
  }
  
  updateSelection() {
    const items = document.querySelectorAll('.result-item');
    items.forEach((item, index) => {
      item.classList.toggle('selected', index === this.selectedIndex);
    });
    
    // Scroll selected item into view
    const selectedItem = items[this.selectedIndex];
    if (selectedItem) {
      selectedItem.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }
  
  selectTool(tool) {
    window.location.href = `/tools/${tool.slug}/`;
  }
  
  highlightMatch(text) {
    const query = document.getElementById('command-search').value.toLowerCase();
    if (!query) return text;
    
    const index = text.toLowerCase().indexOf(query);
    if (index === -1) return text;
    
    return text.substring(0, index) + 
      `<mark style="background: rgba(99, 102, 241, 0.3); color: inherit; padding: 0 0.125rem; border-radius: 0.125rem;">${text.substring(index, index + query.length)}</mark>` +
      text.substring(index + query.length);
  }
  
  getIcon(iconName) {
    const icons = {
      'qr-code': '◫',
      'file-text': '📄',
      'image': '🖼️',
      'link': '🔗',
      'shield': '🛡️',
      'palette': '🎨',
      'grid': '⊞',
      'sparkles': '✨',
      'edit': '✏️',
      'tool': '🔧',
      'lock': '🔒',
      'brush': '🖌️'
    };
    return icons[iconName] || '🔷';
  }
  
  toggle() {
    this.isOpen ? this.close() : this.open();
  }
  
  open() {
    this.isOpen = true;
    document.getElementById('command-palette').classList.add('active');
    document.getElementById('command-search').value = '';
    document.getElementById('command-search').focus();
    this.filteredTools = this.tools.slice(0, this.options.maxResults);
    this.selectedIndex = 0;
    this.renderResults();
    document.body.style.overflow = 'hidden';
  }
  
  close() {
    this.isOpen = false;
    document.getElementById('command-palette').classList.remove('active');
    document.body.style.overflow = '';
  }
}

// Initialize command palette
let commandPalette;
document.addEventListener('DOMContentLoaded', () => {
  commandPalette = new CommandPalette();
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CommandPalette };
}
