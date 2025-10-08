/* ===================================
   NotepadX JavaScript
   Handles all app functionality
   =================================== */

// ===== DOM ELEMENTS =====
// Get references to HTML elements we'll be working with
const notepad = document.getElementById('notepad');
const saveBtn = document.getElementById('saveBtn');
const clearBtn = document.getElementById('clearBtn');
const downloadBtn = document.getElementById('downloadBtn');
const statusMessage = document.getElementById('statusMessage');
const wordCountEl = document.getElementById('wordCount');
const searchInput = document.getElementById('searchInput');
const prevMatchBtn = document.getElementById('prevMatch');
const nextMatchBtn = document.getElementById('nextMatch');
const fontSizeSlider = document.getElementById('fontSize');
const fontSizeValue = document.getElementById('fontSizeValue');
const fontFamilySelect = document.getElementById('fontFamily');
const lineNumbers = document.getElementById('lineNumbers');

let lastSearch = '';
let lastIndex = -1;

// ===== CONSTANTS =====
// Key used to store notes in localStorage
const STORAGE_KEY = 'notepadx_content';
const FONT_SIZE_KEY = 'notepadx_font_size';
const FONT_FAMILY_KEY = 'notepadx_font_family';

// ===== INITIALIZATION =====
// This function runs when the page loads
function init() {
    // Load any previously saved notes from localStorage
    loadNote();
    
    // Set up event listeners for buttons
    saveBtn.addEventListener('click', saveNote);
    clearBtn.addEventListener('click', clearNote);
    downloadBtn.addEventListener('click', downloadNote);
    // Update word count and line numbers as the user types
    const updateContent = () => {
        updateWordCount();
        updateLineNumbers();
    };
    
    notepad.addEventListener('input', updateContent);
    notepad.addEventListener('keyup', updateContent);
    notepad.addEventListener('change', updateContent);
    notepad.addEventListener('paste', updateContent);
    
    // Sync line numbers scrolling with textarea
    notepad.addEventListener('scroll', syncScroll);
    
    // Initialize line numbers
    updateLineNumbers();

    // Wire up search controls if present
    if (searchInput) {
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                findNext();
            }
        });
    }
    if (nextMatchBtn) nextMatchBtn.addEventListener('click', findNext);
    if (prevMatchBtn) prevMatchBtn.addEventListener('click', findPrev);

    // Font size control (number input)
    if (fontSizeSlider) {
        const savedSize = loadFontSize();
        applyFontSize(savedSize);
        updateFontSizeUI(savedSize);

        const onSizeChange = (e) => {
            const raw = e.target.value;
            const parsed = parseInt(raw, 10);
            const size = Number.isFinite(parsed) ? parsed : savedSize;
            const clamped = clamp(size, 10, 48);
            applyFontSize(clamped);
            updateFontSizeUI(clamped);
            saveFontSize(clamped);
        };

        fontSizeSlider.addEventListener('input', onSizeChange);
        fontSizeSlider.addEventListener('change', onSizeChange);
    }

    // Font family control
    if (fontFamilySelect) {
        const savedFont = loadFontFamily();
        applyFontFamily(savedFont);
        fontFamilySelect.value = savedFont;

        fontFamilySelect.addEventListener('change', (e) => {
            const font = e.target.value;
            applyFontFamily(font);
            saveFontFamily(font);
        });
    }

    // Font family control
    if (fontFamilySelect) {
        const savedFont = loadFontFamily();
        applyFontFamily(savedFont);
        fontFamilySelect.value = savedFont;

        fontFamilySelect.addEventListener('change', (e) => {
            const font = e.target.value;
            applyFontFamily(font);
            saveFontFamily(font);
        });
    }
    
    // Auto-save feature: save notes every 5 seconds if there's content
    setInterval(autoSave, 5000);
}

// ===== LOAD FUNCTION =====
/**
 * Load saved notes from localStorage when the app starts
 */
function loadNote() {
    try {
        // Try to get saved content from localStorage
        const savedContent = localStorage.getItem(STORAGE_KEY);
        
        // If there's saved content, display it in the textarea
        if (savedContent) {
            notepad.value = savedContent;
            showStatus('Previous notes loaded successfully');
            updateWordCount();
            updateLineNumbers();
        }
    } catch (error) {
        // Handle any errors (e.g., localStorage not available)
        showStatus('Could not load previous notes.', true);
        console.error('Load error:', error);
    }
}

// ===== FONT SIZE HELPERS =====
function applyFontSize(size) {
    if (!notepad) return;
    const clamped = clamp(size, 10, 48);
    notepad.style.fontSize = `${clamped}px`;
    // Apply same font size to line numbers
    if (lineNumbers) lineNumbers.style.fontSize = `${clamped}px`;
}

function updateFontSizeUI(size) {
    if (fontSizeSlider) fontSizeSlider.value = String(size);
    if (fontSizeValue) fontSizeValue.textContent = `${size}px`;
}

function saveFontSize(size) {
    try { localStorage.setItem(FONT_SIZE_KEY, String(size)); } catch {}
}

function loadFontSize() {
    try {
        const stored = localStorage.getItem(FONT_SIZE_KEY);
        const parsed = stored ? parseInt(stored, 10) : 16;
        if (Number.isFinite(parsed)) return clamp(parsed, 10, 48);
        return 16;
    } catch { return 16; }
}

function clamp(n, min, max) { return Math.min(max, Math.max(min, n)); }

// ===== FONT FAMILY HELPERS =====
function applyFontFamily(font) {
    if (!notepad) return;
    notepad.style.fontFamily = font;
    // Apply same font family to line numbers
    if (lineNumbers) lineNumbers.style.fontFamily = font;
}

function saveFontFamily(font) {
    try { localStorage.setItem(FONT_FAMILY_KEY, font); } catch {}
}

function loadFontFamily() {
    try {
        const stored = localStorage.getItem(FONT_FAMILY_KEY);
        return stored || 'Arial, sans-serif';
    } catch { return 'Arial, sans-serif'; }
}

// ===== FONT FAMILY HELPERS =====
function applyFontFamily(font) {
    if (!notepad) return;
    notepad.style.fontFamily = font;
}

function saveFontFamily(font) {
    try { localStorage.setItem(FONT_FAMILY_KEY, font); } catch {}
}

function loadFontFamily() {
    try {
        const stored = localStorage.getItem(FONT_FAMILY_KEY);
        return stored || 'Arial, sans-serif';
    } catch { return 'Arial, sans-serif'; }
}

// ===== SAVE FUNCTION =====
/**
 * Save the current notes to localStorage
 */
function saveNote() {
    try {
        // Get the current text from the textarea
        const content = notepad.value;
        
        // Save it to localStorage
        localStorage.setItem(STORAGE_KEY, content);
        
        // Show success message
        showStatus('Notes saved successfully');
        updateWordCount();
    } catch (error) {
        // Handle any errors (e.g., storage quota exceeded)
        showStatus('Failed to save notes. Please try again.', true);
        console.error('Save error:', error);
    }
}

// ===== AUTO-SAVE FUNCTION =====
/**
 * Automatically save notes in the background
 * This runs every 5 seconds
 */
function autoSave() {
    const content = notepad.value;
    
    // Only auto-save if there's content
    if (content.trim().length > 0) {
        try {
            localStorage.setItem(STORAGE_KEY, content);
            // Silent save - no status message to avoid disrupting user
            // keep word count up-to-date on auto-save too
            updateWordCount();
        } catch (error) {
            console.error('Auto-save error:', error);
        }
    }
}

// ===== CLEAR FUNCTION =====
/**
 * Clear all text from the notepad
 * Asks for confirmation before clearing
 */
function clearNote() {
    // Ask user to confirm before clearing
    const confirmClear = confirm('Are you sure you want to clear all notes? This cannot be undone.');
    
    if (confirmClear) {
        // Clear the textarea
        notepad.value = '';
        
        // Remove saved content from localStorage
        localStorage.removeItem(STORAGE_KEY);
        
        // Show confirmation message
        showStatus('Notes cleared successfully');
        
        // Focus back on textarea
        notepad.focus();
        updateWordCount();
    }
}

// ===== DOWNLOAD FUNCTION =====
/**
 * Download the current notes as a .txt file
 */
function downloadNote() {
    // Get the current text content
    const content = notepad.value;
    
    // Check if there's content to download
    if (content.trim().length === 0) {
        showStatus('Nothing to download! Please write something first.', true);
        return;
    }
    
    try {
        // Create a Blob (binary large object) with the text content
        const blob = new Blob([content], { type: 'text/plain' });
        
        // Create a temporary download link
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        // Set download filename with current date
        const date = new Date().toISOString().slice(0, 10);
        link.download = `notepadx_${date}.txt`;
        
        // Set the URL and trigger download
        link.href = url;
        link.click();
        
        // Clean up: remove the temporary URL
        URL.revokeObjectURL(url);
        
        // Show success message
        showStatus('Notes downloaded successfully');
        updateWordCount();
    } catch (error) {
        // Handle any errors
        showStatus('Failed to download notes. Please try again.', true);
        console.error('Download error:', error);
    }
}

// ===== WORD COUNT FUNCTION =====
/**
 * Update the word count display based on textarea content
 */
function updateWordCount() {
    if (!wordCountEl) return;
    const text = notepad.value.trim();
    if (text.length === 0) {
        wordCountEl.textContent = 'Words: 0';
        return;
    }

    // Split by whitespace sequences to count words
    const words = text.split(/\s+/).filter(Boolean);
    wordCountEl.textContent = `Words: ${words.length}`;
}

// ===== SIMPLE SEARCH =====
/**
 * Find next occurrence of search term and select it in the textarea
 */
function findNext() {
    if (!searchInput) return;
    const term = searchInput.value;
    if (!term) return;

    const content = notepad.value;
    let startPos = 0;
    if (lastSearch === term && lastIndex >= 0) {
        startPos = lastIndex + 1; // search after previous match
    }

    const idx = content.toLowerCase().indexOf(term.toLowerCase(), startPos);
    if (idx >= 0) {
        notepad.focus();
        notepad.setSelectionRange(idx, idx + term.length);
        lastSearch = term;
        lastIndex = idx;
        showStatus(`Found at ${idx}`);
    } else {
        // wrap around search
        const wrapIdx = content.toLowerCase().indexOf(term.toLowerCase(), 0);
        if (wrapIdx >= 0) {
            notepad.focus();
            notepad.setSelectionRange(wrapIdx, wrapIdx + term.length);
            lastSearch = term;
            lastIndex = wrapIdx;
            showStatus('Wrapped to first match');
        } else {
            showStatus('No matches found', true);
            lastIndex = -1;
        }
    }
}

/**
 * Find previous occurrence of search term and select it in the textarea
 */
function findPrev() {
    if (!searchInput) return;
    const term = searchInput.value;
    if (!term) return;

    const content = notepad.value;
    let endPos = content.length;
    if (lastSearch === term && lastIndex > 0) {
        endPos = lastIndex - 1; // search before previous match
    }

    const idx = content.toLowerCase().lastIndexOf(term.toLowerCase(), endPos);
    if (idx >= 0) {
        notepad.focus();
        notepad.setSelectionRange(idx, idx + term.length);
        lastSearch = term;
        lastIndex = idx;
        showStatus(`Found at ${idx}`);
    } else {
        showStatus('No previous matches', true);
        lastIndex = -1;
    }
}

// ===== LINE NUMBERS =====
/**
 * Update line numbers based on textarea content
 */
function updateLineNumbers() {
    if (!lineNumbers || !notepad) return;
    
    const text = notepad.value;
    const lines = text.split('\n').length;
    
    // Generate line numbers
    let lineNumbersHtml = '';
    for (let i = 1; i <= lines; i++) {
        lineNumbersHtml += i + '\n';
    }
    
    lineNumbers.textContent = lineNumbersHtml;
}

/**
 * Sync line numbers scrolling with textarea
 */
function syncScroll() {
    if (!lineNumbers || !notepad) return;
    lineNumbers.scrollTop = notepad.scrollTop;
}

// ===== STATUS MESSAGE FUNCTION =====
/**
 * Display status messages to the user
 * @param {string} message - The message to display
 * @param {boolean} isError - Whether this is an error message
 */
function showStatus(message, isError = false) {
    // Set the message text
    statusMessage.textContent = message;
    
    // Apply appropriate styling
    statusMessage.className = 'status-message show';
    if (isError) {
        statusMessage.classList.add('error');
    }
    
    // Hide the message after 3 seconds
    setTimeout(() => {
        statusMessage.className = 'status-message';
        statusMessage.textContent = '';
    }, 3000);
}

// ===== KEYBOARD SHORTCUTS =====
/**
 * Handle keyboard shortcuts for common actions
 */
document.addEventListener('keydown', (event) => {
    // Ctrl+S or Cmd+S to save (prevent default browser save dialog)
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        saveNote();
    }
});

// ===== START THE APP =====
// Initialize the app when the DOM is fully loaded
document.addEventListener('DOMContentLoaded', init);
