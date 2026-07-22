// GBAN Shorts Creator Core Application Logic

// State Variables
let images = []; // Array of Image objects and their metadata
let bgmAudioBuffer = null; // Decoded custom BGM audio buffer
let activeSlideIndex = 0;
let isPlaying = false;
let canvas, ctx;
let animationFrameId = null;

// DOM Elements
const uploadZone = document.getElementById('upload-zone');
const fileInput = document.getElementById('file-input');
const previewList = document.getElementById('preview-list');
const scriptInput = document.getElementById('script-input');
const charCount = document.getElementById('char-count');
const bgmSelect = document.getElementById('bgm-select');
const customBgmContainer = document.getElementById('custom-bgm-container');
const customBgmInput = document.getElementById('custom-bgm-input');
const bgmVolume = document.getElementById('bgm-volume');
const bgmVolumeVal = bgmVolume.nextElementSibling;
const voiceSpeed = document.getElementById('voice-speed');
const voiceSpeedVal = voiceSpeed.nextElementSibling;
const voiceSelect = document.getElementById('voice-select');
const openaiKeyContainer = document.getElementById('openai-key-container');
const openaiKeyInput = document.getElementById('openai-key-input');
const saveKeyCheckbox = document.getElementById('save-key-checkbox');
const btnGenerate = document.getElementById('btn-generate');
const btnPreviewPlay = document.getElementById('btn-preview-play');
const btnDownload = document.getElementById('btn-download');
const renderingOverlay = document.getElementById('rendering-overlay');
const loadingStatus = document.getElementById('loading-status');
const progressBarFill = document.getElementById('progress-bar-fill');
const progressPercentage = document.getElementById('progress-percentage');
const infoDescription = document.getElementById('info-description');
const playOverlayBtn = document.getElementById('play-overlay-btn');

// New Subtitle & Duration Settings DOM Elements
const subtitlePosition = document.getElementById('subtitle-position');
const subtitleColorPreset = document.getElementById('subtitle-color-preset');
const customColorContainer = document.getElementById('custom-color-container');
const subtitleColor = document.getElementById('subtitle-color');
const subtitleColorVal = document.getElementById('subtitle-color-val');
const subtitleSize = document.getElementById('subtitle-size');
const subtitleSizeVal = subtitleSize.nextElementSibling;
const slideDuration = document.getElementById('slide-duration');
const slideDurationVal = slideDuration.nextElementSibling;

// Video Generation Variables
let generatedVideoBlob = null;
let generatedVideoUrl = null;
let slidesData = []; // Combined images and scripts for rendering
let totalVideoDuration = 0; // Total duration of the video in seconds

// Preload Official Gyeongsangbuk-do Emblem Logo Image
const gbLogoImg = new Image();
gbLogoImg.src = 'gb_logo.svg';

// Initialize Canvas
window.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('shorts-canvas');
    ctx = canvas.getContext('2d');
    drawPlaceholder();
    setupEventListeners();
});

// Draw a beautiful default placeholder on the simulator canvas
function drawPlaceholder() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Gradient Background
    const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    grad.addColorStop(0, '#0a231c');
    grad.addColorStop(1, '#05110e');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Decorative circles
    ctx.fillStyle = 'rgba(16, 185, 129, 0.05)';
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 3, 180, 0, Math.PI * 2);
    ctx.fill();
    
    // Draw Text info
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px "Noto Sans KR", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('AI 숏폼 퀵스튜디오', canvas.width / 2, canvas.height / 2 - 40);
    
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 24px "Noto Sans KR", sans-serif';
    ctx.fillText('사진을 첨부하고 대본을 입력하세요', canvas.width / 2, canvas.height / 2 + 10);
    
    ctx.fillStyle = '#9ca3af';
    ctx.font = '18px "Noto Sans KR", sans-serif';
    ctx.fillText('오른쪽 버튼으로 동영상이 제작됩니다', canvas.width / 2, canvas.height / 2 + 60);

    // Draw leaf icon
    ctx.fillStyle = '#10b981';
    ctx.font = '64px "Font Awesome 6 Free"';
    ctx.fillText('\uf06c', canvas.width / 2, canvas.height / 2 - 130);

    // Always draw fixed watermark at bottom center
    drawFixedWatermark(ctx);
}

// Set up all UI event listeners
function setupEventListeners() {
    // Character Counter & Live Preview
    scriptInput.addEventListener('input', () => {
        charCount.innerText = `${scriptInput.value.length}자`;
        updateLivePreview();
    });

    // BGM Selection changes
    bgmSelect.addEventListener('change', () => {
        if (bgmSelect.value === 'custom') {
            customBgmContainer.style.display = 'flex';
        } else {
            customBgmContainer.style.display = 'none';
        }
    });

    // Custom BGM upload loading
    customBgmInput.addEventListener('change', handleCustomBgmUpload);

    // Range Sliders
    bgmVolume.addEventListener('input', () => {
        bgmVolumeVal.innerText = `${Math.round(bgmVolume.value * 200)}%`;
    });
    
    // Voice Selection changes
    voiceSelect.addEventListener('change', () => {
        if (voiceSelect.value !== 'google' && voiceSelect.value !== 'none') {
            openaiKeyContainer.style.display = 'flex';
        } else {
            openaiKeyContainer.style.display = 'none';
        }
    });

    // Load saved API key on startup
    const savedKey = localStorage.getItem('openai_api_key');
    if (savedKey) {
        openaiKeyInput.value = savedKey;
        if (voiceSelect.value !== 'google' && voiceSelect.value !== 'none') {
            openaiKeyContainer.style.display = 'flex';
        }
    }

    voiceSpeed.addEventListener('input', () => {
        voiceSpeedVal.innerText = `${parseFloat(voiceSpeed.value).toFixed(1)}x`;
    });

    // Upload drag and drop
    uploadZone.addEventListener('click', () => fileInput.click());
    fileInput.addEventListener('change', handleFileSelect);

    uploadZone.addEventListener('dragover', (e) => {
        e.preventDefault();
        uploadZone.classList.add('dragover');
    });

    uploadZone.addEventListener('dragleave', () => {
        uploadZone.classList.remove('dragover');
    });

    uploadZone.addEventListener('drop', (e) => {
        e.preventDefault();
        uploadZone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            processImageFiles(e.dataTransfer.files);
        }
    });

    // Action Buttons
    btnGenerate.addEventListener('click', generateShortsVideo);
    btnPreviewPlay.addEventListener('click', togglePreviewPlayback);
    playOverlayBtn.addEventListener('click', togglePreviewPlayback);
    btnDownload.addEventListener('click', downloadVideo);

    // New Subtitle & Duration Sliders Listeners
    subtitlePosition.addEventListener('change', () => {
        updateLivePreview();
    });
    subtitleColorPreset.addEventListener('change', () => {
        if (subtitleColorPreset.value === 'custom') {
            customColorContainer.style.display = 'flex';
        } else {
            customColorContainer.style.display = 'none';
        }
        updateLivePreview();
    });
    subtitleColor.addEventListener('input', () => {
        subtitleColorVal.innerText = subtitleColor.value.toUpperCase();
        updateLivePreview();
    });
    subtitleSize.addEventListener('input', () => {
        subtitleSizeVal.innerText = `${subtitleSize.value}px`;
        updateLivePreview();
    });
    slideDuration.addEventListener('input', () => {
        slideDurationVal.innerText = `${parseFloat(slideDuration.value).toFixed(1)}초`;
        updateLivePreview();
    });
}

// Handle Custom BGM file loading
function handleCustomBgmUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(evt) {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        audioContext.decodeAudioData(evt.target.result)
            .then(buffer => {
                bgmAudioBuffer = buffer;
                alert('배경음악 파일이 성공적으로 로드되었습니다!');
            })
            .catch(err => {
                console.error('Audio decode error:', err);
                alert('오디오 파일을 해독하는 데 실패했습니다. 다른 파일을 선택하세요.');
            });
    };
    reader.readAsArrayBuffer(file);
}

// File input selection
function handleFileSelect(e) {
    if (e.target.files.length > 0) {
        processImageFiles(e.target.files);
    }
}

// Load and display selected images
function processImageFiles(files) {
    let loadedCount = 0;
    const filesArray = Array.from(files).filter(f => f.type.startsWith('image/'));
    
    if (filesArray.length === 0) return;

    filesArray.forEach(file => {
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                images.push({
                    img: img,
                    name: file.name,
                    id: Date.now() + Math.random().toString(36).substr(2, 5)
                });
                loadedCount++;
                if (loadedCount === filesArray.length) {
                    renderPreviews();
                }
            };
            img.src = e.target.result;
        };
        reader.readAsDataURL(file);
    });
}

// Render image preview thumbnails with drag and drop sorting
function renderPreviews() {
    previewList.innerHTML = '';
    images.forEach((item, index) => {
        const div = document.createElement('div');
        div.className = 'preview-item';
        div.draggable = true;
        div.dataset.index = index;

        div.innerHTML = `
            <img src="${item.img.src}" alt="${item.name}">
            <span class="preview-item-num">${index + 1}</span>
            <button class="preview-item-delete" onclick="deleteImage(${index})"><i class="fa-solid fa-xmark"></i></button>
        `;

        // Drag & Drop Sorting Events
        div.addEventListener('dragstart', handleDragStart);
        div.addEventListener('dragover', handleDragOver);
        div.addEventListener('drop', handleDrop);
        div.addEventListener('dragend', handleDragEnd);

        previewList.appendChild(div);
    });

    // Enable generate button if we have images
    btnGenerate.disabled = images.length < 1;
    
    // Draw first image on canvas if available
    if (images.length > 0) {
        updateLivePreview();
        infoDescription.innerText = `사진 ${images.length}장이 준비되었습니다. 대본을 입력하고 동영상을 생성해 보세요!`;
    } else {
        drawPlaceholder();
        infoDescription.innerText = '사진 3~4장을 업로드하고 숏폼을 만들어보세요!';
    }
}

// Draw a single image fitted in 9:16 vertical canvas
function drawImageOnCanvas(img) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Scale image to cover the canvas (Center Crop)
    const canvasRatio = canvas.width / canvas.height;
    const imgRatio = img.width / img.height;
    
    let drawWidth, drawHeight, drawX, drawY;
    
    if (imgRatio > canvasRatio) {
        drawHeight = canvas.height;
        drawWidth = canvas.height * imgRatio;
        drawX = (canvas.width - drawWidth) / 2;
        drawY = 0;
    } else {
        drawWidth = canvas.width;
        drawHeight = canvas.width / imgRatio;
        drawX = 0;
        drawY = (canvas.height - drawHeight) / 2;
    }
    
    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
}

// Delete image from preview list
window.deleteImage = function(index) {
    images.splice(index, 1);
    renderPreviews();
};

// Drag and drop reordering state
let dragSrcIndex = null;

function handleDragStart(e) {
    dragSrcIndex = this.dataset.index;
    this.style.opacity = '0.4';
    e.dataTransfer.effectAllowed = 'move';
}

function handleDragOver(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    // Add visual indicator
    const rect = this.getBoundingClientRect();
    const midX = rect.left + rect.width / 2;
    if (e.clientX < midX) {
        this.classList.add('drag-over-left');
        this.classList.remove('drag-over-right');
    } else {
        this.classList.add('drag-over-right');
        this.classList.remove('drag-over-left');
    }
}

function handleDragLeave(e) {
    this.classList.remove('drag-over-left', 'drag-over-right');
}

function handleDrop(e) {
    e.preventDefault();
    this.classList.remove('drag-over-left', 'drag-over-right');
    
    const targetIndex = this.dataset.index;
    if (dragSrcIndex !== null && dragSrcIndex !== targetIndex) {
        // Swap or move elements in array
        const draggedItem = images.splice(dragSrcIndex, 1)[0];
        images.splice(targetIndex, 0, draggedItem);
        renderPreviews();
    }
}

function handleDragEnd() {
    this.style.opacity = '1';
    const items = document.querySelectorAll('.preview-item');
    items.forEach(item => {
        item.classList.remove('drag-over-left', 'drag-over-right');
    });
}

// Update live preview on canvas when controls or inputs change
function updateLivePreview() {
    if (images.length === 0) {
        drawPlaceholder();
        return;
    }
    if (!isPlaying && (!renderingOverlay || renderingOverlay.style.display !== 'flex')) {
        const sentences = getScriptSentences();
        const numSlides = Math.max(images.length, sentences.length);
        slidesData = [];
        for (let i = 0; i < numSlides; i++) {
            slidesData.push({
                img: images[i % images.length].img,
                text: sentences[i] || "",
                startTime: i * parseFloat(slideDuration.value || 3.0),
                endTime: (i + 1) * parseFloat(slideDuration.value || 3.0)
            });
        }
        const activeIdx = Math.min(activeSlideIndex, slidesData.length - 1);
        renderFrameAtTime(slidesData[activeIdx].startTime + 0.1);
    }
}

// Process scripts input and split into sentences
function getScriptSentences() {
    const text = scriptInput.value.trim();
    if (!text) {
        // Default text if empty
        return ["경상북도농업기술원입니다. 멋진 우리 농작물과 연구 성과를 소개합니다."];
    }
    
    // Split by newlines so each line corresponds to a slide caption
    const rawLines = text.split(/\r?\n/);
    const sentences = [];
    
    rawLines.forEach(line => {
        // Strip list number prefixes like "1. ", "1) ", "- ", "• "
        let trimmed = line.trim().replace(/^(\d+[\.\)]|[-•*])\s*/, '');
        if (trimmed.length > 0) {
            sentences.push(trimmed);
        }
    });
    
    return sentences.length > 0 ? sentences : ["경상북도농업기술원입니다. 멋진 우리 농작물과 연구 성과를 소개합니다."];
}

// Synthesize Ambient background music loops using Web Audio API
// This saves BGM files and avoids CORS or loading issues!
function createSynthBgmSource(audioCtx, startTime = 0, tempo = 90) {
    const outputNode = audioCtx.createGain();
    outputNode.gain.value = parseFloat(bgmVolume.value);

    const isAmbient = bgmSelect.value === 'ambient';
    const isUpbeat = bgmSelect.value === 'upbeat';
    
    if (!isAmbient && !isUpbeat) {
        // None selected, output silent node
        outputNode.gain.value = 0;
        return outputNode;
    }

    const synthInterval = 60 / tempo; // Beat length in seconds

    // Ambient chords (Cmaj7 - Fmaj7 - Am7 - G7)
    // Upbeat melody & chords (Am - F - C - G)
    const ambientChords = [
        [48, 60, 64, 67, 71], // Cmaj7 (C3, C4, E4, G4, B4)
        [41, 57, 60, 64, 69], // Fmaj7 (F2, A3, C4, E4, A4)
        [45, 57, 60, 64, 67], // Am7 (A2, A3, C4, E4, G4)
        [43, 55, 59, 62, 67]  // G7 (G2, G3, B3, D4, G4)
    ];

    const upbeatChords = [
        [45, 57, 60, 64], // Am
        [41, 53, 57, 60], // F
        [48, 60, 64, 67], // C
        [43, 55, 59, 62]  // G
    ];

    const chords = isAmbient ? ambientChords : upbeatChords;
    let chordIndex = 0;

    // Trigger loop using a timer
    let time = 0;
    const maxTime = totalVideoDuration + 2;

    while (time < maxTime) {
        const activeChord = chords[chordIndex % chords.length];
        
        // Play Chords (soft pad sounds)
        activeChord.forEach((midiNote, idx) => {
            const freq = Math.pow(2, (midiNote - 69) / 12) * 440;
            
            // Oscillator
            const osc = audioCtx.createOscillator();
            osc.type = isAmbient ? 'triangle' : 'sine';
            osc.frequency.value = freq;
            
            // Lowpass filter for warm tone
            const filter = audioCtx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.value = isAmbient ? 600 : 1200;
            
            // Volume Envelope
            const oscGain = audioCtx.createGain();
            oscGain.gain.setValueAtTime(0, startTime + time);
            
            if (isAmbient) {
                // Slow attack and long release (pad sound)
                oscGain.gain.linearRampToValueAtTime(0.04 / activeChord.length, startTime + time + 1.5);
                oscGain.gain.setValueAtTime(0.04 / activeChord.length, startTime + time + synthInterval * 4 - 2.0);
                oscGain.gain.exponentialRampToValueAtTime(0.0001, startTime + time + synthInterval * 4);
            } else {
                // Pluck sound
                oscGain.gain.linearRampToValueAtTime(0.06 / activeChord.length, startTime + time + 0.1);
                oscGain.gain.exponentialRampToValueAtTime(0.0001, startTime + time + synthInterval * 2);
            }
            
            osc.connect(filter);
            filter.connect(oscGain);
            oscGain.connect(outputNode);
            
            osc.start(startTime + time);
            osc.stop(startTime + time + (isAmbient ? synthInterval * 4 : synthInterval * 2));
        });

        // Play drums/beat if upbeat BGM
        if (isUpbeat) {
            for (let b = 0; b < 8; b++) {
                const beatTime = time + b * (synthInterval / 2);
                
                // Kick drum on 1 and 5
                if (b === 0 || b === 4) {
                    const kickOsc = audioCtx.createOscillator();
                    const kickGain = audioCtx.createGain();
                    kickOsc.frequency.setValueAtTime(150, startTime + beatTime);
                    kickOsc.frequency.exponentialRampToValueAtTime(0.01, startTime + beatTime + 0.3);
                    
                    kickGain.gain.setValueAtTime(0.15, startTime + beatTime);
                    kickGain.gain.exponentialRampToValueAtTime(0.0001, startTime + beatTime + 0.3);
                    
                    kickOsc.connect(kickGain);
                    kickGain.connect(outputNode);
                    kickOsc.start(startTime + beatTime);
                    kickOsc.stop(startTime + beatTime + 0.3);
                }
                
                // Snare drum on 3 and 7 (using white noise)
                if (b === 2 || b === 6) {
                    const noiseBuffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.15, audioCtx.sampleRate);
                    const output = noiseBuffer.getChannelData(0);
                    for (let i = 0; i < noiseBuffer.length; i++) {
                        output[i] = Math.random() * 2 - 1;
                    }
                    const noise = audioCtx.createBufferSource();
                    noise.buffer = noiseBuffer;
                    
                    const noiseFilter = audioCtx.createBiquadFilter();
                    noiseFilter.type = 'bandpass';
                    noiseFilter.frequency.value = 1000;
                    
                    const noiseGain = audioCtx.createGain();
                    noiseGain.gain.setValueAtTime(0.05, startTime + beatTime);
                    noiseGain.gain.exponentialRampToValueAtTime(0.0001, startTime + beatTime + 0.15);
                    
                    noise.connect(noiseFilter);
                    noiseFilter.connect(noiseGain);
                    noiseGain.connect(outputNode);
                    
                    noise.start(startTime + beatTime);
                    noise.stop(startTime + beatTime + 0.15);
                }
            }
        }

        chordIndex++;
        time += synthInterval * 4;
    }

    return outputNode;
}

// Generate the Shorts Video (Main Render Sequence)
async function generateShortsVideo() {
    if (images.length === 0) {
        alert('사진을 최소 1장 이상 등록해 주세요.');
        return;
    }
    
    isPlaying = false;
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
    }

    // Disable action buttons during rendering
    btnPreviewPlay.disabled = true;
    btnDownload.disabled = true;
    
    // Clear old blob URL & preview video element to prevent caching old video
    if (generatedVideoUrl) {
        try {
            URL.revokeObjectURL(generatedVideoUrl);
        } catch(e) {}
        generatedVideoUrl = null;
        generatedVideoBlob = null;
    }

    if (window.previewVideoEl) {
        window.previewVideoEl.pause();
        window.previewVideoEl.src = '';
        try {
            document.body.removeChild(window.previewVideoEl);
        } catch(e) {}
        window.previewVideoEl = null;
    }
    
    // Show Loading/Rendering screen overlay
    renderingOverlay.style.display = 'flex';
    updateProgress(0, '대본 분석 및 자막 생성 중...');

    // 1. Process Sentences
    const sentences = getScriptSentences();
    
    // 2. Prepare Slides Mapping
    slidesData = [];
    const numSlides = Math.max(images.length, sentences.length);
    for (let i = 0; i < numSlides; i++) {
        slidesData.push({
            img: images[i % images.length].img,
            text: sentences[i] || ""
        });
    }

    // 3. Audio Context setup for Mixing
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    
    // 4. Fetch TTS Audio for each slide
    updateProgress(15, '한국어 AI 음성(TTS) 합성 중...');
    
    try {
        const userDuration = parseFloat(slideDuration.value) || 3.0;
        const voice = voiceSelect.value;

        const fetchPromises = slidesData.map(async (slide, idx) => {
            if (voice === 'none' || !slide.text) {
                // Create silence buffer with user specified duration
                const emptyBuffer = audioContext.createBuffer(1, audioContext.sampleRate * userDuration, audioContext.sampleRate);
                return { buffer: emptyBuffer, slideIndex: idx };
            }
            
            // Save or clear API key on generate
            const apiKey = openaiKeyInput.value.trim();
            
            if (voice !== 'google' && !apiKey) {
                throw new Error('OPENAI_KEY_REQUIRED');
            }

            if (saveKeyCheckbox.checked) {
                localStorage.setItem('openai_api_key', apiKey);
            } else {
                localStorage.removeItem('openai_api_key');
            }

            // Call Python proxy TTS backend
            const speed = parseFloat(voiceSpeed.value);
            const keyParam = `&key=${encodeURIComponent(apiKey)}&voice=${voice}`;
            const response = await fetch(`/api/tts?text=${encodeURIComponent(slide.text)}${keyParam}`);
            if (!response.ok) {
                throw new Error('TTS API failed');
            }
            const arrayBuffer = await response.arrayBuffer();
            const originalBuffer = await audioContext.decodeAudioData(arrayBuffer);
            
            // Adjust voice speed if necessary
            let finalBuffer = originalBuffer;
            if (Math.abs(speed - 1.0) > 0.05) {
                finalBuffer = adjustAudioBufferSpeed(audioContext, originalBuffer, speed);
            }
            
            return { buffer: finalBuffer, slideIndex: idx };
        });

        const ttsResults = await Promise.all(fetchPromises);
        updateProgress(50, '음성 파일 오디오 믹싱 중...');

        // Calculate timings and stitch TTS audios together
        let currentOffset = 0;
        const padding = 0.6; // 0.6 seconds padding between slides
        
        slidesData.forEach((slide, idx) => {
            const ttsResult = ttsResults.find(r => r.slideIndex === idx);
            
            // Dynamic duration: Use user-specified duration as minimum, but expand if TTS is longer
            let duration = userDuration;
            if (ttsResult && voice !== 'none' && ttsResult.buffer) {
                duration = Math.max(ttsResult.buffer.duration, userDuration);
            }
            
            slide.audioBuffer = (ttsResult && voice !== 'none') ? ttsResult.buffer : null;
            slide.startTime = currentOffset;
            slide.endTime = currentOffset + duration + padding;
            
            currentOffset = slide.endTime;
        });
        
        totalVideoDuration = currentOffset; // In seconds
        
        // 5. Setup Web Audio MediaStreamDestination for Recording
        const recDest = audioContext.createMediaStreamDestination();
        
        // Lock start timestamp relative to AudioContext clock to prevent desync
        const audioStartTime = audioContext.currentTime + 0.1;

        // Play TTS voices at designated times
        slidesData.forEach(slide => {
            if (slide.audioBuffer) {
                const voiceSource = audioContext.createBufferSource();
                voiceSource.buffer = slide.audioBuffer;
                
                // Route to recording destination
                voiceSource.connect(recDest);
                
                // Also route to user speakers so they can hear the generation in real time
                voiceSource.connect(audioContext.destination);
                
                // Play at the locked scheduled start time
                voiceSource.start(audioStartTime + slide.startTime);
            }
        });

        // 6. Play BGM (either custom uploaded or synthetic)
        let bgmSource = null;
        if (bgmSelect.value === 'custom' && bgmAudioBuffer) {
            // Custom Uploaded BGM
            bgmSource = audioContext.createBufferSource();
            bgmSource.buffer = bgmAudioBuffer;
            bgmSource.loop = true;
            
            const bgmGain = audioContext.createGain();
            bgmGain.gain.value = parseFloat(bgmVolume.value);
            
            bgmSource.connect(bgmGain);
            bgmGain.connect(recDest);
            bgmGain.connect(audioContext.destination);
            
            bgmSource.start(audioStartTime);
        } else {
            // Synthesized ambient or upbeat BGM locked to audioStartTime
            const synthBgmNode = createSynthBgmSource(audioContext, audioStartTime);
            synthBgmNode.connect(recDest);
            synthBgmNode.connect(audioContext.destination);
        }

        // 7. Setup Canvas MediaRecorder
        updateProgress(65, '숏폼 영상 비주얼 합성 중...');
        
        const canvasStream = canvas.captureStream(30); // 30 FPS
        const combinedStream = new MediaStream([
            ...canvasStream.getVideoTracks(),
            ...recDest.stream.getAudioTracks()
        ]);

        // Select mimeType for recorder (Prioritize MP4 for universal mobile compatibility)
        let options = { mimeType: 'video/mp4;codecs=avc1,mp4a' };
        if (!MediaRecorder.isTypeSupported(options.mimeType)) {
            options = { mimeType: 'video/mp4' };
            if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                options = { mimeType: 'video/webm;codecs=vp9,opus' };
                if (!MediaRecorder.isTypeSupported(options.mimeType)) {
                    options = { mimeType: 'video/webm' };
                }
            }
        }
        
        const recorder = new MediaRecorder(combinedStream, options);
        const recordedChunks = [];
        
        recorder.ondataavailable = function(e) {
            if (e.data && e.data.size > 0) {
                recordedChunks.push(e.data);
            }
        };

        recorder.onstop = function() {
            const finalType = recorder.mimeType || 'video/mp4';
            generatedVideoBlob = new Blob(recordedChunks, { type: finalType });
            generatedVideoUrl = URL.createObjectURL(generatedVideoBlob);
            
            // Clear old preview video element
            if (window.previewVideoEl) {
                window.previewVideoEl.pause();
                try {
                    document.body.removeChild(window.previewVideoEl);
                } catch(e) {}
                window.previewVideoEl = null;
            }
            
            // Rendering Finished
            renderingOverlay.style.display = 'none';
            btnPreviewPlay.disabled = false;
            btnDownload.disabled = false;
            
            // Clean up Audio Context
            bgmSource?.stop();
            if (audioContext.state !== 'closed') {
                audioContext.close();
            }
            
            // Set channel/description in simulator
            infoDescription.innerText = scriptInput.value.length > 50 
                ? scriptInput.value.substr(0, 50) + "..." 
                : scriptInput.value || "농업기술원 숏폼 생성 완료!";

            alert('숏폼 동영상이 성공적으로 생성되었습니다! 하단의 미리보기 재생 또는 다운로드 버튼을 눌러보세요.');
        };

        // 8. Run Animation and Record locked to AudioContext clock
        recorder.start();
        
        function drawFrame() {
            const elapsedSeconds = audioContext.currentTime - audioStartTime;
            
            if (elapsedSeconds >= totalVideoDuration) {
                recorder.stop();
                if (animationFrameId) {
                    cancelAnimationFrame(animationFrameId);
                }
                return;
            }
            
            // Draw Canvas Frame
            renderFrameAtTime(Math.max(0, elapsedSeconds));
            
            // Update Loading Status Progress
            const progress = (Math.max(0, elapsedSeconds) / totalVideoDuration) * 100;
            updateProgress(65 + (progress * 0.35), `비디오 프레임 렌더링 중 (${Math.round(progress)}%)...`);
            
            animationFrameId = requestAnimationFrame(drawFrame);
        }
        
        // Start animation loop
        drawFrame();

    } catch (err) {
        console.error("Rendering error:", err);
        renderingOverlay.style.display = 'none';
        if (audioContext && audioContext.state !== 'closed') {
            audioContext.close();
        }
        if (err.message === 'OPENAI_KEY_REQUIRED') {
            alert('오픈AI 고품질 목소리를 사용하시려면 OpenAI API Key를 입력하셔야 합니다.\n(무료 음성을 사용하시려면 목소리 선택에서 "기본 여성 목소리(무료)"를 선택해 주세요.)');
        } else {
            alert('동영상을 제작하는 도중 오류가 발생했습니다. 다시 시도해 주세요.');
        }
    }
}

// Adjust buffer speed using Web Audio (simple pitch-preserved speed adjustment via resampling)
function adjustAudioBufferSpeed(audioContext, buffer, speed) {
    const oldRate = buffer.sampleRate;
    const newRate = oldRate * speed;
    
    // Create new buffer with adjusted sampling rate
    const newBuffer = audioContext.createBuffer(
        buffer.numberOfChannels,
        Math.floor(buffer.length / speed),
        oldRate
    );
    
    for (let c = 0; c < buffer.numberOfChannels; c++) {
        const oldData = buffer.getChannelData(c);
        const newData = newBuffer.getChannelData(c);
        
        for (let i = 0; i < newData.length; i++) {
            const oldIdx = i * speed;
            const floorIdx = Math.floor(oldIdx);
            const ceilIdx = Math.min(floorIdx + 1, oldData.length - 1);
            const weight = oldIdx - floorIdx;
            
            // Linear interpolation
            newData[i] = (1 - weight) * oldData[floorIdx] + weight * oldData[ceilIdx];
        }
    }
    
    return newBuffer;
}

// Render a single Canvas frame based on current video timestamp
function renderFrameAtTime(time) {
    // Find current active slide
    let activeSlide = slidesData[0];
    let nextSlide = null;
    let slideIndex = 0;
    
    for (let i = 0; i < slidesData.length; i++) {
        if (time >= slidesData[i].startTime && time < slidesData[i].endTime) {
            activeSlide = slidesData[i];
            slideIndex = i;
            nextSlide = slidesData[i + 1] || null;
            break;
        }
    }

    activeSlideIndex = slideIndex;
    
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Dynamic Pan & Scan Calculation (shows full image over time)
    // Slide elapsed percentage
    const slideDuration = activeSlide.endTime - activeSlide.startTime;
    const slideElapsed = time - activeSlide.startTime;
    const progress = slideElapsed / slideDuration;
    
    // Draw Current Slide Image with pan
    const canvasRatio = canvas.width / canvas.height;
    const imgRatio = activeSlide.img.width / activeSlide.img.height;
    
    let drawWidth, drawHeight, drawX, drawY;
    if (imgRatio > canvasRatio) {
        // Landscape image: fill height, pan width from left to right (0 to negative offset)
        drawHeight = canvas.height;
        drawWidth = canvas.height * imgRatio;
        drawX = -progress * (drawWidth - canvas.width);
        drawY = 0;
    } else {
        // Portrait image: fill width, pan height from top to bottom (0 to negative offset)
        drawWidth = canvas.width;
        drawHeight = canvas.width / imgRatio;
        drawX = 0;
        drawY = -progress * (drawHeight - canvas.height);
    }
    
    ctx.save();
    ctx.drawImage(activeSlide.img, drawX, drawY, drawWidth, drawHeight);
    ctx.restore();

    // Cross-fade transition with next/previous slide
    const fadeDuration = 0.5; // 0.5 seconds transition
    if (slideElapsed < fadeDuration && slideIndex > 0) {
        // Fade in from previous slide (remains static at its final panned state)
        const prevSlide = slidesData[slideIndex - 1];
        const alpha = 1.0 - (slideElapsed / fadeDuration);
        
        ctx.save();
        ctx.globalAlpha = alpha;
        
        // Draw previous image in its final state (progress = 1.0)
        const prevImgRatio = prevSlide.img.width / prevSlide.img.height;
        let prevW, prevH, prevX, prevY;
        if (prevImgRatio > canvasRatio) {
            prevH = canvas.height;
            prevW = canvas.height * prevImgRatio;
            prevX = -(prevW - canvas.width); // Final state panned to the far right
            prevY = 0;
        } else {
            prevW = canvas.width;
            prevH = canvas.width / prevImgRatio;
            prevX = 0;
            prevY = -(prevH - canvas.height); // Final state panned to the far bottom
        }
        ctx.drawImage(prevSlide.img, prevX, prevY, prevW, prevH);
        ctx.restore();
    }

    // Subtitle Custom Parameters
    const pos = subtitlePosition.value || 'bottom';
    let color = subtitleColorPreset.value;
    if (color === 'custom') {
        color = subtitleColor.value || '#ffffff';
    }
    const size = parseInt(subtitleSize.value) || 34;
    const lineHeight = Math.round(size * 1.35);
    
    // Set Font before wrapping to measure correct text width
    ctx.fillStyle = color;
    ctx.font = `bold ${size}px "Noto Sans KR", sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    const lines = activeSlide.text ? wrapText(ctx, activeSlide.text, canvas.width - 100) : [];
    const totalTextHeight = lines.length * lineHeight;
    
    // 1. Render optimal background overlay based on subtitle position for maximum legibility
    if (activeSlide.text && lines.length > 0) {
        if (pos === 'top') {
            // Top Dark Gradient Overlay (fade down)
            const grad = ctx.createLinearGradient(0, 320, 0, 0);
            grad.addColorStop(0, 'rgba(0,0,0,0)');
            grad.addColorStop(0.4, 'rgba(0,0,0,0.6)');
            grad.addColorStop(1, 'rgba(0,0,0,0.92)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, canvas.width, 320);
        } else if (pos === 'middle') {
            // Middle Translucent Band (slim bar)
            ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
            const paddingY = 40;
            const boxHeight = totalTextHeight + paddingY;
            ctx.fillRect(0, (canvas.height / 2) - (boxHeight / 2), canvas.width, boxHeight);
        } else {
            // Bottom Dark Gradient Overlay (fade up - default)
            const grad = ctx.createLinearGradient(0, canvas.height - 350, 0, canvas.height);
            grad.addColorStop(0, 'rgba(0,0,0,0)');
            grad.addColorStop(0.4, 'rgba(0,0,0,0.6)');
            grad.addColorStop(1, 'rgba(0,0,0,0.95)');
            ctx.fillStyle = grad;
            ctx.fillRect(0, canvas.height - 350, canvas.width, 350);
        }
    } else {
        // Draw default bottom gradient when no text is present to maintain standard look
        const grad = ctx.createLinearGradient(0, canvas.height - 350, 0, canvas.height);
        grad.addColorStop(0, 'rgba(0,0,0,0)');
        grad.addColorStop(0.4, 'rgba(0,0,0,0.6)');
        grad.addColorStop(1, 'rgba(0,0,0,0.95)');
        ctx.fillStyle = grad;
        ctx.fillRect(0, canvas.height - 350, canvas.width, 350);
    }

    // 2. Render Subtitle Captions
    if (activeSlide.text && lines.length > 0) {
        ctx.fillStyle = color;
        ctx.font = `bold ${size}px "Noto Sans KR", sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // Calculate startY coordinate depending on anchor position
        let startY;
        if (pos === 'top') {
            // Safe zone below Notch/Title
            startY = 160 + (lineHeight / 2);
        } else if (pos === 'middle') {
            // Dead center
            startY = (canvas.height / 2) - (totalTextHeight / 2) + (lineHeight / 2);
        } else {
            // Bottom (default)
            startY = canvas.height - 180 - (totalTextHeight / 2) + (lineHeight / 2);
        }
        
        ctx.shadowColor = 'rgba(0, 0, 0, 0.9)';
        ctx.shadowBlur = 10;
        ctx.shadowOffsetX = 2;
        ctx.shadowOffsetY = 2;
        
        lines.forEach((line, idx) => {
            ctx.fillText(line, canvas.width / 2, startY + (idx * lineHeight));
        });
        
        // Reset shadow
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
    }

    // 3. Render Fixed Institution Watermark & Logo at Bottom Center (Always Displayed)
    drawFixedWatermark(ctx);
}

// Render Fixed Institution Watermark & Official Logo at Bottom Center
function drawFixedWatermark(ctx) {
    ctx.save();
    const watermarkY = canvas.height - 65;
    const logoText = "경상북도농업기술원";

    ctx.font = 'bold 19px "Noto Sans KR", sans-serif';
    const textWidth = ctx.measureText(logoText).width;
    const logoSize = 24; // 24x24 emblem
    const spacing = 10;
    const totalWidth = logoSize + spacing + textWidth;
    const pillPaddingX = 16;
    const boxWidth = totalWidth + (pillPaddingX * 2);
    const boxHeight = 38;
    const boxX = (canvas.width - boxWidth) / 2;
    const boxY = watermarkY - (boxHeight / 2);

    // Draw Translucent Rounded Pill Background
    ctx.fillStyle = 'rgba(5, 20, 15, 0.85)';
    ctx.strokeStyle = 'rgba(16, 185, 129, 0.55)';
    ctx.lineWidth = 1.5;
    
    if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 19);
        ctx.fill();
        ctx.stroke();
    } else {
        ctx.beginPath();
        ctx.fillRect(boxX, boxY, boxWidth, boxHeight);
        ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);
    }

    const startX = boxX + pillPaddingX;
    const logoY = watermarkY - (logoSize / 2);

    // Draw Official Gyeongsangbuk-do Emblem Logo Image
    if (gbLogoImg.complete && gbLogoImg.naturalWidth !== 0) {
        ctx.drawImage(gbLogoImg, startX, logoY, logoSize, logoSize);
    } else {
        // Fallback leaf icon if loading
        ctx.fillStyle = '#10b981';
        ctx.font = '900 19px "Font Awesome 6 Free"';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'middle';
        ctx.fillText('\uf06c', startX, watermarkY);
    }

    // Draw "경상북도농업기술원" Text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 19px "Noto Sans KR", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(logoText, startX + logoSize + spacing, watermarkY);

    ctx.restore();
}

// Wrap text to fit canvas width
function wrapText(context, text, maxWidth) {
    const words = text.split(' ');
    const lines = [];
    let currentLine = '';

    for (let n = 0; n < words.length; n++) {
        const testLine = currentLine + words[n] + ' ';
        const metrics = context.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
            lines.push(currentLine.trim());
            currentLine = words[n] + ' ';
        } else {
            currentLine = testLine;
        }
    }
    lines.push(currentLine.trim());
    return lines;
}

// Update UI rendering progress bar
function updateProgress(percentage, text) {
    progressBarFill.style.width = `${percentage}%`;
    progressPercentage.innerText = `${Math.round(percentage)}%`;
    loadingStatus.innerText = text;
}

// Toggle Play/Pause playback of generated video URL inside simulator
function togglePreviewPlayback() {
    if (!generatedVideoUrl) return;
    
    const playBtn = document.getElementById('btn-preview-play');
    const overlayBtn = document.getElementById('play-overlay-btn');
    
    // Create temporary video element on the fly to render on canvas
    if (!window.previewVideoEl) {
        window.previewVideoEl = document.createElement('video');
        window.previewVideoEl.src = generatedVideoUrl;
        window.previewVideoEl.style.display = 'none';
        document.body.appendChild(window.previewVideoEl);
        
        window.previewVideoEl.addEventListener('play', () => {
            isPlaying = true;
            playBtn.innerHTML = '<i class="fa-solid fa-pause"></i> 일시 정지';
            overlayBtn.classList.remove('visible');
            overlayBtn.classList.add('paused');
            
            // Loop canvas rendering
            function step() {
                if (window.previewVideoEl.paused || window.previewVideoEl.ended) {
                    isPlaying = false;
                    playBtn.innerHTML = '<i class="fa-solid fa-play"></i> 미리보기 재생';
                    overlayBtn.classList.remove('paused');
                    overlayBtn.classList.add('visible');
                    return;
                }
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(window.previewVideoEl, 0, 0, canvas.width, canvas.height);
                requestAnimationFrame(step);
            }
            requestAnimationFrame(step);
        });

        window.previewVideoEl.addEventListener('pause', () => {
            isPlaying = false;
            playBtn.innerHTML = '<i class="fa-solid fa-play"></i> 미리보기 재생';
            overlayBtn.classList.remove('paused');
            overlayBtn.classList.add('visible');
        });

        window.previewVideoEl.addEventListener('ended', () => {
            isPlaying = false;
            playBtn.innerHTML = '<i class="fa-solid fa-play"></i> 미리보기 재생';
            overlayBtn.classList.remove('paused');
            overlayBtn.classList.add('visible');
            window.previewVideoEl.currentTime = 0;
            
            // Draw placeholder or first image
            if (images.length > 0) {
                drawImageOnCanvas(images[0].img);
            }
        });
    }

    if (window.previewVideoEl.paused) {
        window.previewVideoEl.play();
    } else {
        window.previewVideoEl.pause();
    }
}

// Download the final generated video file in MP4 format
function downloadVideo() {
    if (!generatedVideoUrl) return;
    
    const a = document.createElement('a');
    a.href = generatedVideoUrl;
    
    // Save file name with current timestamp in MP4 format
    const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
    a.download = `GBAN_Shortform_${dateStr}.mp4`;
    
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}
