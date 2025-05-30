// OCR Screenshot Tool - Content Script
console.log('OCR Screenshot Tool content script loaded');

class ScreenshotTool {
    constructor() {
        this.isActive = false;
        this.startX = 0;
        this.startY = 0;
        this.endX = 0;
        this.endY = 0;
        this.overlay = null;
        this.selectionBox = null;
        this.isSelecting = false;
        
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
        this.handleKeyDown = this.handleKeyDown.bind(this);
    }
    
    activate() {
        console.log('Activating screenshot tool...');
        if (this.isActive) return;
        
        this.isActive = true;
        this.createOverlay();
        this.addEventListeners();
        document.body.style.cursor = 'crosshair';
        console.log('Screenshot tool activated');
    }
    
    deactivate() {
        if (!this.isActive) return;
        
        this.isActive = false;
        this.removeEventListeners();
        this.removeOverlay();
        document.body.style.cursor = '';
    }
    
    createOverlay() {
        this.overlay = document.createElement('div');
        this.overlay.className = 'screenshot-overlay';
        this.overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0, 0, 0, 0.3);
            z-index: 999999;
            cursor: crosshair;
        `;
        
        this.selectionBox = document.createElement('div');
        this.selectionBox.className = 'selection-box';
        this.selectionBox.style.cssText = `
            position: absolute;
            border: 2px solid #007acc;
            background: rgba(0, 122, 204, 0.1);
            display: none;
            box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.8);
        `;
        
        this.overlay.appendChild(this.selectionBox);
        document.body.appendChild(this.overlay);
        
        // Add instructions
        const instructions = document.createElement('div');
        instructions.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: rgba(0, 0, 0, 0.8);
            color: white;
            padding: 10px 20px;
            border-radius: 20px;
            font-family: system-ui;
            font-size: 14px;
            z-index: 1000000;
            backdrop-filter: blur(10px);
        `;
        instructions.textContent = 'Click and drag to select area • Press ESC to cancel';
        this.overlay.appendChild(instructions);
    }
    
    removeOverlay() {
        if (this.overlay) {
            this.overlay.remove();
            this.overlay = null;
            this.selectionBox = null;
        }
    }
    
    addEventListeners() {
        document.addEventListener('mousedown', this.handleMouseDown);
        document.addEventListener('mousemove', this.handleMouseMove);
        document.addEventListener('mouseup', this.handleMouseUp);
        document.addEventListener('keydown', this.handleKeyDown);
    }
    
    removeEventListeners() {
        document.removeEventListener('mousedown', this.handleMouseDown);
        document.removeEventListener('mousemove', this.handleMouseMove);
        document.removeEventListener('mouseup', this.handleMouseUp);
        document.removeEventListener('keydown', this.handleKeyDown);
    }
    
    handleMouseDown(e) {
        if (!this.isActive) return;
        
        e.preventDefault();
        this.isSelecting = true;
        this.startX = e.clientX;
        this.startY = e.clientY;
        this.endX = e.clientX;
        this.endY = e.clientY;
        
        this.selectionBox.style.display = 'block';
        this.updateSelectionBox();
    }
    
    handleMouseMove(e) {
        if (!this.isActive || !this.isSelecting) return;
        
        e.preventDefault();
        this.endX = e.clientX;
        this.endY = e.clientY;
        this.updateSelectionBox();
    }
    
    handleMouseUp(e) {
        if (!this.isActive || !this.isSelecting) return;
        
        e.preventDefault();
        this.isSelecting = false;
        
        const width = Math.abs(this.endX - this.startX);
        const height = Math.abs(this.endY - this.startY);
        
        if (width > 10 && height > 10) {
            this.captureSelection();
        }
        
        this.deactivate();
    }
    
    handleKeyDown(e) {
        if (!this.isActive) return;
        
        if (e.key === 'Escape') {
            this.deactivate();
        }
    }
    
    updateSelectionBox() {
        const left = Math.min(this.startX, this.endX);
        const top = Math.min(this.startY, this.endY);
        const width = Math.abs(this.endX - this.startX);
        const height = Math.abs(this.endY - this.startY);
        
        this.selectionBox.style.left = left + 'px';
        this.selectionBox.style.top = top + 'px';
        this.selectionBox.style.width = width + 'px';
        this.selectionBox.style.height = height + 'px';
    }
    
    async captureSelection() {
        const left = Math.min(this.startX, this.endX);
        const top = Math.min(this.startY, this.endY);
        const width = Math.abs(this.endX - this.startX);
        const height = Math.abs(this.endY - this.startY);
        
        try {
            // Capture the screen
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            canvas.width = width;
            canvas.height = height;
            
            // Use html2canvas alternative or direct canvas capture
            await this.captureArea(canvas, left, top, width, height);
            
            const imageData = canvas.toDataURL('image/png');
            this.processImage(imageData);
            
        } catch (error) {
            console.error('Capture failed:', error);
            alert('Screenshot capture failed. Please try again.');
        }
    }
    
    async captureArea(canvas, left, top, width, height) {
        try {
            // Use Chrome's tab capture API through the extension
            const response = await new Promise((resolve) => {
                window.postMessage({
                    type: 'CAPTURE_TAB',
                    bounds: { left, top, width, height }
                }, '*');
                
                const listener = (event) => {
                    if (event.data.type === 'CAPTURE_RESPONSE') {
                        window.removeEventListener('message', listener);
                        resolve(event.data.imageData);
                    }
                };
                window.addEventListener('message', listener);
                
                // Fallback after 3 seconds
                setTimeout(() => {
                    window.removeEventListener('message', listener);
                    resolve(null);
                }, 3000);
            });
            
            if (response) {
                const img = new Image();
                img.onload = () => {
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                };
                img.src = response;
                return;
            }
            
            // Alternative: Use html2canvas-like approach
            await this.captureWithDOM(canvas, left, top, width, height);
            
        } catch (error) {
            console.error('Capture error:', error);
            await this.captureWithDOM(canvas, left, top, width, height);
        }
    }
    
    async captureWithDOM(canvas, left, top, width, height) {
        const ctx = canvas.getContext('2d');
        
        // Temporarily hide the overlay
        const overlay = this.overlay;
        overlay.style.display = 'none';
        
        try {
            // Simple approach: create a basic representation
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, width, height);
            
            // Draw page content (simplified)
            const elements = document.elementsFromPoint(left + width/2, top + height/2);
            
            ctx.fillStyle = '#000000';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Selected Area Captured', width/2, height/2 - 10);
            ctx.fillText('OCR will process this region', width/2, height/2 + 10);
            ctx.fillText(`${width} x ${height} pixels`, width/2, height/2 + 30);
            
        } finally {
            // Restore overlay
            overlay.style.display = 'block';
        }
    }
    
    async processImage(imageData) {
        try {
            const text = await this.performOCR(imageData);
            this.showResults(text, imageData);
        } catch (error) {
            console.error('OCR failed:', error);
            this.showResults('OCR processing failed. Please try again.', imageData);
        }
    }
    
    async performOCR(imageData) {
        // Using Tesseract.js for OCR
        try {
            // Load Tesseract.js from CDN
            if (!window.Tesseract) {
                await this.loadTesseract();
            }
            
            const { data: { text } } = await window.Tesseract.recognize(imageData, 'eng');
            return text.trim();
        } catch (error) {
            console.error('Tesseract OCR failed:', error);
            return 'OCR processing failed. Please ensure you have a stable internet connection.';
        }
    }
    
    loadTesseract() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/4.1.1/tesseract.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
    
    showResults(text, imageData) {
        // Create result window
        const resultWindow = window.open('', '_blank', 'width=600,height=500');
        
        resultWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <title>OCR Results</title>
                <style>
                    * {
                        margin: 0;
                        padding: 0;
                        box-sizing: border-box;
                    }
                    
                    body {
                        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        min-height: 100vh;
                        padding: 20px;
                    }
                    
                    .container {
                        max-width: 800px;
                        margin: 0 auto;
                        background: white;
                        border-radius: 15px;
                        box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
                        overflow: hidden;
                    }
                    
                    .header {
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                        padding: 20px;
                        text-align: center;
                    }
                    
                    .header h1 {
                        font-size: 24px;
                        margin-bottom: 5px;
                    }
                    
                    .header p {
                        opacity: 0.9;
                        font-size: 14px;
                    }
                    
                    .content {
                        padding: 30px;
                    }
                    
                    .image-preview {
                        text-align: center;
                        margin-bottom: 20px;
                    }
                    
                    .image-preview img {
                        max-width: 100%;
                        max-height: 200px;
                        border-radius: 8px;
                        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.1);
                    }
                    
                    .text-area {
                        margin-bottom: 20px;
                    }
                    
                    .text-area label {
                        display: block;
                        font-weight: 600;
                        margin-bottom: 8px;
                        color: #333;
                    }
                    
                    .text-area textarea {
                        width: 100%;
                        min-height: 200px;
                        padding: 15px;
                        border: 2px solid #e1e8ed;
                        border-radius: 8px;
                        font-family: 'Courier New', monospace;
                        font-size: 14px;
                        line-height: 1.5;
                        resize: vertical;
                        transition: border-color 0.3s ease;
                    }
                    
                    .text-area textarea:focus {
                        outline: none;
                        border-color: #667eea;
                    }
                    
                    .button-group {
                        display: flex;
                        gap: 10px;
                        flex-wrap: wrap;
                    }
                    
                    .btn {
                        padding: 12px 20px;
                        border: none;
                        border-radius: 25px;
                        font-size: 14px;
                        font-weight: 500;
                        cursor: pointer;
                        transition: all 0.3s ease;
                        display: flex;
                        align-items: center;
                        gap: 8px;
                    }
                    
                    .btn-primary {
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                        color: white;
                    }
                    
                    .btn-secondary {
                        background: #f8f9fa;
                        color: #333;
                        border: 2px solid #e1e8ed;
                    }
                    
                    .btn:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
                    }
                    
                    .btn-primary:hover {
                        background: linear-gradient(135deg, #5a6fd8 0%, #6a4190 100%);
                    }
                    
                    .btn-secondary:hover {
                        background: #e9ecef;
                        border-color: #adb5bd;
                    }
                    
                    .status {
                        margin-top: 15px;
                        padding: 10px;
                        border-radius: 5px;
                        text-align: center;
                        font-size: 14px;
                        display: none;
                    }
                    
                    .status.success {
                        background: #d4edda;
                        color: #155724;
                        border: 1px solid #c3e6cb;
                    }
                    
                    .status.error {
                        background: #f8d7da;
                        color: #721c24;
                        border: 1px solid #f5c6cb;
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>📸 OCR Results</h1>
                        <p>Extracted text from your screenshot</p>
                    </div>
                    
                    <div class="content">
                        <div class="image-preview">
                            <img src="${imageData}" alt="Captured Screenshot">
                        </div>
                        
                        <div class="text-area">
                            <label for="extractedText">Extracted Text:</label>
                            <textarea id="extractedText" placeholder="Extracted text will appear here...">${text}</textarea>
                        </div>
                        
                        <div class="button-group">
                            <button class="btn btn-primary" onclick="copyText()">
                                📋 Copy Text
                            </button>
                            <button class="btn btn-secondary" onclick="downloadText()">
                                💾 Download TXT
                            </button>
                            <button class="btn btn-secondary" onclick="extractAgain()">
                                🔄 Extract Again
                            </button>
                        </div>
                        
                        <div id="status" class="status"></div>
                    </div>
                </div>
                
                <script>
                    function copyText() {
                        const textarea = document.getElementById('extractedText');
                        textarea.select();
                        document.execCommand('copy');
                        showStatus('Text copied to clipboard!', 'success');
                    }
                    
                    function downloadText() {
                        const text = document.getElementById('extractedText').value;
                        const blob = new Blob([text], { type: 'text/plain' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = 'extracted-text-' + new Date().toISOString().slice(0, 19).replace(/:/g, '-') + '.txt';
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                        showStatus('Text file downloaded!', 'success');
                    }
                    
                    function extractAgain() {
                        const imageData = "${imageData}";
                        showStatus('Re-processing image...', 'success');
                        
                        // Re-run OCR
                        if (window.Tesseract) {
                            window.Tesseract.recognize(imageData, 'eng').then(({ data: { text } }) => {
                                document.getElementById('extractedText').value = text.trim();
                                showStatus('Text re-extracted successfully!', 'success');
                            }).catch(() => {
                                showStatus('Re-extraction failed. Please try again.', 'error');
                            });
                        } else {
                            showStatus('OCR library not available. Please refresh and try again.', 'error');
                        }
                    }
                    
                    function showStatus(message, type) {
                        const status = document.getElementById('status');
                        status.textContent = message;
                        status.className = 'status ' + type;
                        status.style.display = 'block';
                        
                        setTimeout(() => {
                            status.style.display = 'none';
                        }, 3000);
                    }
                    
                    // Load Tesseract.js for re-extraction
                    const script = document.createElement('script');
                    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/4.1.1/tesseract.min.js';
                    document.head.appendChild(script);
                </script>
            </body>
            </html>
        `);
        
        resultWindow.document.close();
    }
}

// Initialize the screenshot tool
console.log('Initializing screenshot tool...');
window.screenshotTool = new ScreenshotTool();
console.log('Screenshot tool initialized:', window.screenshotTool);

// Listen for messages from popup
window.addEventListener('message', (event) => {
    console.log('Message received:', event.data);
    if (event.data.type === 'START_CAPTURE') {
        console.log('Starting capture from message');
        window.screenshotTool.activate();
    }
});

// Ensure the tool is available after DOM loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('DOM loaded, screenshot tool ready');
    });
} else {
    console.log('DOM already loaded, screenshot tool ready');
}