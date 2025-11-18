// DOM Elements
const chatMessages = document.getElementById('chat');
const form = document.getElementById('form');
const messageInput = document.getElementById('message');
const thinkingIndicator = document.getElementById('thinking');

// Add message to chat
function addMessage(sender, text) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}`;
    
    // Check if the response is HTML or plain text
    if (text.startsWith('<') && text.endsWith('>')) {
        messageDiv.innerHTML = text;
    } else {
        messageDiv.textContent = text;
    }
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Form submission
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const message = messageInput.value.trim();
    if (!message) return;

    // Add user message
    addMessage('user', message);
    messageInput.value = '';

    // Show thinking indicator
    thinkingIndicator.style.display = 'block';
    chatMessages.scrollTop = chatMessages.scrollHeight;

    try {
        // Make API call to your backend
        const response = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        // Hide thinking indicator
        thinkingIndicator.style.display = 'none';

        // Process the response
        if (data && data.response) {
            addMessage('bot', data.response);
        } else if (data && data.parsed) {
            // Handle different response formats
            const p = data.parsed;
            if (p.raw) {
                addMessage('bot', p.raw);
            } else {
                let html = p.reply || "I'm here to help!";
                if (p.tone) html += `<div class="tone">Tone: ${p.tone}</div>`;
                if (p.tips && p.tips.length) {
                    html += '<div class="tips"><strong>Tips:</strong><ul>' + 
                            p.tips.map(tip => `<li>${tip}</li>`).join('') + 
                            '</ul></div>';
                }
                addMessage('bot', html);
            }
        } else {
            addMessage('bot', "I'm here to help! How can I assist you today?");
        }

    } catch (error) {
        console.error('Error:', error);
        thinkingIndicator.style.display = 'none';
        addMessage('bot', "I'm having trouble connecting to the server. Please try again later or check your internet connection.");
    }
});

// Allow Shift+Enter for new line, Enter to send
messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        form.dispatchEvent(new Event('submit'));
    }
});