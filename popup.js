// Popup script for OCR Screenshot Tool

document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('captureBtn').addEventListener('click', async () => {
        try {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            // Inject the content script if not already injected
            try {
                await chrome.scripting.executeScript({
                    target: { tabId: tab.id },
                    func: () => {
                        if (!window.screenshotTool) {
                            console.log('Screenshot tool not found, page may need refresh');
                        }
                    }
                });
            } catch (e) {
                console.log('Script injection check failed:', e);
            }
            
            // Start capture
            await chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: startCapture
            });
            
            window.close();
        } catch (error) {
            console.error('Capture start failed:', error);
            alert('Failed to start capture. Please refresh the page and try again.');
        }
    });
});

function startCapture() {
    console.log('Starting capture...');
    if (window.screenshotTool) {
        window.screenshotTool.activate();
    } else {
        // Fallback: send message to potentially injected content script
        window.postMessage({ type: 'START_CAPTURE' }, '*');
        
        // Additional fallback: try to find and activate any screenshot tool
        setTimeout(() => {
            if (window.screenshotTool) {
                window.screenshotTool.activate();
            } else {
                alert('Screenshot tool not ready. Please refresh the page and try again.');
            }
        }, 100);
    }
}