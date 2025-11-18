// DOM Elements
const modeSel = document.getElementById('mode');
const vol = document.getElementById('volume');

// Audio context and state
let audioContext = null;
let gainNode = null;
let currentSource = null;
let isPlaying = false;
let audioBufferCache = {};

// Audio file URLs
const audioFiles = {
  melody: '/audio/melody.mp3.mp3',
  nature: '/audio/nature.mp3.mp3',
  piano: '/audio/piano.mp3.mp3',
  brees: '/audio/brees.mp3',
  comfort: '/audio/comfort.mp3',
  DeepHealing: '/audio/DeepHealing.mp3',
  desert: '/audio/desert.mp3',
  meditation: '/audio/meditation.mp3',
  waves: '/audio/waves.mp3'
};

// Add status message function
function addChatMessage(sender, message, isPlaying = false) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `status-message ${sender}`;
    messageDiv.style.margin = '5px 0';
    messageDiv.style.padding = '8px 12px';
    messageDiv.style.borderRadius = '4px';
    messageDiv.style.display = 'inline-block';
    messageDiv.style.maxWidth = '100%';
    messageDiv.style.boxSizing = 'border-box';
    messageDiv.style.wordWrap = 'break-word';
    messageDiv.textContent = message;
    
    if (isPlaying) {
        const playingIcon = document.createElement('span');
        playingIcon.textContent = ' ';
        messageDiv.appendChild(playingIcon);
    }
    
    let statusContainer = document.getElementById('statusContainer');
    if (!statusContainer) {
        statusContainer = document.createElement('div');
        statusContainer.id = 'statusContainer';
        statusContainer.style.marginTop = '20px';
        statusContainer.style.padding = '10px';
        statusContainer.style.backgroundColor = '#f0f0f0';
        statusContainer.style.borderRadius = '5px';
        statusContainer.style.minHeight = '50px';
        statusContainer.style.overflow = 'hidden';
        document.querySelector('.container').appendChild(statusContainer);
    }
    
    // Keep the container but replace its content
    while (statusContainer.firstChild) {
        statusContainer.removeChild(statusContainer.firstChild);
    }
    statusContainer.appendChild(messageDiv);
}

// Load audio file with caching
async function loadAudioBuffer(url) {
    if (audioBufferCache[url]) {
        return audioBufferCache[url];
    }

    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        
        // Cache the buffer
        audioBufferCache[url] = audioBuffer;
        return audioBuffer;
    } catch (error) {
        console.error('Error loading audio:', error);
        throw error;
    }
}

// Stop all audio playback
async function stopAll() {
    try {
        if (currentSource) {
            currentSource.stop();
            currentSource.disconnect();
            currentSource = null;
        }
        isPlaying = false;
        
        // Update UI
        const playButton = document.getElementById('playSelected');
        if (playButton) {
            playButton.textContent = '▶️ Play';
        }
        
        addChatMessage('bot', '⏹️ Playback stopped');
        return true;
    } catch (error) {
        console.error('Error stopping audio:', error);
        return false;
    }
}

// Play selected music
async function playSelectedMusic() {
    console.log('playSelectedMusic called');
    
    try {
        // Initialize audio context on first play
        if (!audioContext) {
            console.log('Creating new audio context...');
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
            gainNode = audioContext.createGain();
            gainNode.gain.value = vol ? parseFloat(vol.value) : 0.5;
            gainNode.connect(audioContext.destination);
            console.log('Audio context created, state:', audioContext.state);
        }

        // Ensure audio context is running
        if (audioContext.state === 'suspended') {
            console.log('Resuming audio context...');
            await audioContext.resume();
            console.log('Audio context resumed, state:', audioContext.state);
        }

        const mode = modeSel.value;
        const audioUrl = audioFiles[mode];
        
        if (!audioUrl) {
            addChatMessage('bot', `❌ Error: Could not find audio for ${mode}`);
            return;
        }

        console.log('Loading audio from:', audioUrl);
        addChatMessage('bot', '🔊 Loading audio...');

        // Stop any currently playing audio
        await stopAll();

        // Load the audio buffer
        console.log('Loading audio buffer...');
        const audioBuffer = await loadAudioBuffer(audioUrl);
        
        // Create new audio source
        console.log('Creating audio source...');
        const source = audioContext.createBufferSource();
        source.buffer = audioBuffer;
        source.loop = true;
        
        // Connect to gain node and then to destination
        source.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        // Store the source and start playback
        console.log('Starting playback...');
        currentSource = source;
        source.start(0);
        isPlaying = true;
        
        // Update UI to show playing state
        const playButton = document.getElementById('playSelected');
        if (playButton) {
            playButton.textContent = '⏹️ Stop';
        }

        const trackName = modeSel.options[modeSel.selectedIndex].text;
        console.log('Now playing:', trackName);
        addChatMessage('bot', `🎵 Now playing: ${trackName}`, true);
        
        source.onended = () => {
            console.log('Playback finished');
            currentSource = null;
            isPlaying = false;
            addChatMessage('bot', '⏹️ Playback finished');
        };
        
        console.log('Playback started successfully');
        
    } catch (error) {
        console.error('Error in playSelectedMusic:', error);
        addChatMessage('bot', '❌ Error: ' + (error.message || 'Failed to play audio'));
        isPlaying = false;
    }
}

// Initialize the page
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM fully loaded');
    
    // Add welcome message
    addChatMessage('bot', 'Welcome to Sanctuary Music! 🎵\nSelect a sound and click Play to begin.');

    // Initialize UI elements
    const playButton = document.getElementById('playSelected');
    const stopButton = document.getElementById('stopButton');
    const volumeControl = document.getElementById('volume');

    // Play button
    if (playButton) {
        playButton.addEventListener('click', async (e) => {
            e.preventDefault();
            if (isPlaying) {
                await stopAll();
            } else {
                await playSelectedMusic();
            }
        });
    }

    // Stop button
    if (stopButton) {
        stopButton.addEventListener('click', async (e) => {
            e.preventDefault();
            await stopAll();
        });
    }

    // Volume control
    if (volumeControl) {
        volumeControl.addEventListener('input', (e) => {
            if (gainNode) {
                gainNode.gain.value = parseFloat(e.target.value);
            }
        });
    }
});