// Create the blocking overlay
const overlay = document.createElement('div');
overlay.style.position = 'fixed';
overlay.style.top = '0';
overlay.style.left = '0';
overlay.style.width = '100%';
overlay.style.height = '100%';
overlay.style.backgroundColor = 'white';
overlay.style.zIndex = '999999';
overlay.style.display = 'none';
overlay.style.justifyContent = 'center';
overlay.style.alignItems = 'center';
overlay.style.fontSize = '120px';
overlay.style.fontFamily = 'Arial, sans-serif';
overlay.style.textAlign = 'center';
overlay.style.padding = '20px';
overlay.style.opacity = '0';
overlay.style.transition = 'opacity 0.5s ease-in-out';
overlay.innerHTML = '⚠️';

document.body.appendChild(overlay);

// Create error sound using Web Audio API
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

function playErrorSound() {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = 400;
    oscillator.type = 'sawtooth';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.5);
}

function blockPage() {
    overlay.style.display = 'flex';
    overlay.style.opacity = '1';
    document.body.style.overflow = 'hidden';
    playErrorSound();
    
    // Fade out after 5 seconds
    setTimeout(() => {
        overlay.style.opacity = '0';
        setTimeout(() => {
            overlay.style.display = 'none';
            document.body.style.overflow = '';
        }, 500); // Wait for fade animation to complete
    }, 5000);
}

function checkText(text) {
    // Remove all spaces, special characters, and normalize the text
    const normalized = text.toLowerCase().replace(/[\s\-_.,!@#$%^&*()+=\[\]{};:'"|<>?\/\\]/g, '');
    
    // Check for "redd" or "reddi" or "reddit"
    if (normalized.includes('redd') || normalized.includes('reddi') || normalized.includes('reddit')) {
        return true;
    }
    return false;
}

function removeBannedWords(text) {
    // Remove variations of "reddit" (case insensitive)
    return text.replace(/r[\s\-_]*e[\s\-_]*d[\s\-_]*d[\s\-_]*(i[\s\-_]*)?(t[\s\-_]*)?/gi, '');
}

// Check on paste events
document.addEventListener('paste', (e) => {
    const pastedText = (e.clipboardData || window.clipboardData).getData('text');
    if (checkText(pastedText)) {
        e.preventDefault();
        const cleanedText = removeBannedWords(pastedText);
        
        if (e.target.isContentEditable) {
            document.execCommand('insertText', false, cleanedText);
        } else if (e.target.value !== undefined) {
            const start = e.target.selectionStart;
            const end = e.target.selectionEnd;
            const currentValue = e.target.value;
            e.target.value = currentValue.substring(0, start) + cleanedText + currentValue.substring(end);
            e.target.selectionStart = e.target.selectionEnd = start + cleanedText.length;
        }
        blockPage();
    }
});

// Check on input events (typing)
document.addEventListener('input', (e) => {
    // Check regular input fields
    if (e.target.value !== undefined) {
        if (checkText(e.target.value)) {
            const cursorPos = e.target.selectionStart;
            const cleanedValue = removeBannedWords(e.target.value);
            e.target.value = cleanedValue;
            e.target.selectionStart = e.target.selectionEnd = Math.max(0, cursorPos - (e.target.value.length - cleanedValue.length));
            blockPage();
        }
    }
    // Check contenteditable elements (like ChatGPT)
    if (e.target.isContentEditable) {
        const text = e.target.textContent || e.target.innerText;
        if (checkText(text)) {
            const selection = window.getSelection();
            const range = selection.getRangeAt(0);
            const cursorOffset = range.startOffset;
            
            const cleanedText = removeBannedWords(text);
            e.target.textContent = cleanedText;
            
            // Restore cursor position
            try {
                const newRange = document.createRange();
                const textNode = e.target.childNodes[0] || e.target;
                newRange.setStart(textNode, Math.min(cursorOffset, cleanedText.length));
                newRange.collapse(true);
                selection.removeAllRanges();
                selection.addRange(newRange);
            } catch (err) {
                // Cursor positioning failed, ignore
            }
            blockPage();
        }
    }
}, true);

// Check URL and search inputs on page load
function checkPageLoad() {
    // Check the URL for banned terms (covers search queries in URL)
    const url = window.location.href;
    const urlParams = new URLSearchParams(window.location.search);
    
    // Check various common search query parameters
    const searchParams = ['q', 'query', 'search', 'text', 'p', 'wd', 'keyword'];
    for (const param of searchParams) {
        const value = urlParams.get(param);
        if (value && checkText(value)) {
            blockPage();
            return;
        }
    }
    
    // Also check the full URL (in case the term is in the path)
    if (checkText(decodeURIComponent(url))) {
        blockPage();
        return;
    }
    
    // Check search input fields that may already have values
    // Common search input selectors across search engines
    const searchSelectors = [
        'input[name="q"]',           // Google, Bing
        'input[name="query"]',       // Various
        'input[name="search"]',      // Various
        'input[name="p"]',           // Yahoo
        'input[name="wd"]',          // Baidu
        'input[type="search"]',      // Generic search inputs
        'textarea[name="q"]',        // Google (sometimes uses textarea)
        '[role="searchbox"]',        // Accessible search boxes
        '[aria-label*="Search"]',    // Accessible search inputs
    ];
    
    for (const selector of searchSelectors) {
        const inputs = document.querySelectorAll(selector);
        for (const input of inputs) {
            const value = input.value || input.textContent;
            if (value && checkText(value)) {
                // Clear the banned content
                if (input.value !== undefined) {
                    input.value = removeBannedWords(input.value);
                }
                blockPage();
                return;
            }
        }
    }
}

// Run check on page load
checkPageLoad();

// Also run after a short delay to catch dynamically loaded content
setTimeout(checkPageLoad, 500);
setTimeout(checkPageLoad, 1500);
