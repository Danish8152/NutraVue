// ============================================
// 📷 ENHANCED CAMERA & BARCODE SCANNER FIX
// ============================================
// Fixes: QuaggaJS integration, mobile camera, permissions, API pipeline
// Version: 2.0

/**
 * Enhanced Camera Manager
 * Handles all camera operations with proper error handling
 */
class EnhancedCameraManager {
    constructor() {
        this.stream = null;
        this.quaggaStarted = false;
        this.cameraInitialized = false;
        this.detectionActive = false;
        this.lastDetectedCode = null;
        this.lastDetectionTime = 0;
        this.detectionCooldown = 3000; // 3 seconds between scans
        
        this.elements = {
            video: document.getElementById('cameraVideo'),
            canvas: document.getElementById('cameraCanvas'),
            startBtn: document.getElementById('startCameraBtn'),
            captureBtn: document.getElementById('captureBtn'),
            stopBtn: document.getElementById('stopCameraBtn')
        };
        
        console.log('📷 Enhanced Camera Manager initialized');
    }

    /**
     * Request camera permission with user-friendly UI
     */
    async requestCameraPermission() {
        try {
            // Check if permissions API is available
            if (navigator.permissions) {
                const result = await navigator.permissions.query({ name: 'camera' });
                
                if (result.state === 'denied') {
                    this.showPermissionDeniedUI();
                    return false;
                }
                
                if (result.state === 'prompt') {
                    this.showPermissionPromptUI();
                }
            }
            
            return true;
        } catch (error) {
            console.warn('Permissions API not supported, proceeding with getUserMedia');
            return true;
        }
    }

    /**
     * Show permission denied UI
     */
    showPermissionDeniedUI() {
        const message = `
            <div style="text-align: center; padding: 20px;">
                <div style="font-size: 48px; margin-bottom: 16px;">🔒</div>
                <h3 style="color: #ef4444; margin-bottom: 12px;">Camera Access Required</h3>
                <p style="color: #6b7280; margin-bottom: 16px;">
                    To scan barcodes, please enable camera access in your browser settings.
                </p>
                <div style="background: #fef3c7; padding: 12px; border-radius: 8px; font-size: 0.9rem;">
                    <strong>How to enable:</strong><br>
                    1. Click the 🔒 icon in your address bar<br>
                    2. Find "Camera" permissions<br>
                    3. Select "Allow"<br>
                    4. Refresh the page
                </div>
            </div>
        `;
        
        if (typeof showToast === 'function') {
            showToast('❌ Camera access denied. Check browser settings.', 'error');
        }
        
        // Show in camera mode area
        const cameraMode = document.getElementById('cameraMode');
        if (cameraMode) {
            const infoDiv = document.createElement('div');
            infoDiv.innerHTML = message;
            infoDiv.style.cssText = 'margin: 20px 0;';
            cameraMode.appendChild(infoDiv);
        }
    }

    /**
     * Show permission prompt UI
     */
    showPermissionPromptUI() {
        if (typeof showToast === 'function') {
            showToast('📸 Please allow camera access to scan barcodes', 'info');
        }
    }

    /**
     * Start camera with enhanced error handling
     */
    async startCamera() {
        try {
            // Request permission first
            const hasPermission = await this.requestCameraPermission();
            if (!hasPermission) {
                return;
            }

            // Stop any existing stream
            this.stopCamera();

            // Camera constraints for mobile optimization
            const constraints = {
                video: {
                    facingMode: { ideal: 'environment' }, // Back camera on mobile
                    width: { ideal: 1280, max: 1920 },
                    height: { ideal: 720, max: 1080 },
                    aspectRatio: { ideal: 16/9 }
                }
            };

            console.log('📷 Requesting camera access...');
            this.stream = await navigator.mediaDevices.getUserMedia(constraints);

            if (!this.elements.video) {
                throw new Error('Video element not found');
            }

            // Set video source
            this.elements.video.srcObject = this.stream;
            
            // Wait for video to be ready
            await new Promise((resolve, reject) => {
                this.elements.video.onloadedmetadata = () => {
                    this.elements.video.play()
                        .then(resolve)
                        .catch(reject);
                };
                
                // Timeout after 10 seconds
                setTimeout(() => reject(new Error('Camera timeout')), 10000);
            });

            // Update UI
            this.updateCameraUI(true);
            
            // Initialize barcode detection
            await this.initQuaggaJS();
            
            this.cameraInitialized = true;
            console.log('✅ Camera started successfully');
            
            if (typeof showToast === 'function') {
                showToast('📸 Camera ready! Point at a barcode', 'success');
            }

        } catch (error) {
            console.error('Camera error:', error);
            this.handleCameraError(error);
        }
    }

    /**
     * Initialize QuaggaJS with optimized settings
     */
    async initQuaggaJS() {
        return new Promise((resolve, reject) => {
            // Check if Quagga is loaded
            if (typeof Quagga === 'undefined') {
                console.error('❌ QuaggaJS library not loaded');
                
                // Try to load it dynamically
                this.loadQuaggaJS()
                    .then(() => this.initQuaggaJS())
                    .then(resolve)
                    .catch(reject);
                return;
            }

            if (!this.elements.video) {
                reject(new Error('Video element not found'));
                return;
            }

            console.log('🔧 Initializing QuaggaJS...');

            const quaggaConfig = {
                inputStream: {
                    name: "Live",
                    type: "LiveStream",
                    target: this.elements.video,
                    constraints: {
                        facingMode: "environment",
                        width: { min: 640, ideal: 1280 },
                        height: { min: 480, ideal: 720 }
                    },
                    area: { // Scanning area (center of frame)
                        top: "20%",
                        right: "10%",
                        left: "10%",
                        bottom: "20%"
                    },
                    singleChannel: false // Use color for better detection
                },
                locator: {
                    patchSize: "medium",
                    halfSample: true
                },
                numOfWorkers: navigator.hardwareConcurrency || 4,
                frequency: 10, // Process 10 frames per second
                decoder: {
                    readers: [
                        "ean_reader",      // EAN-13 (most common)
                        "ean_8_reader",    // EAN-8
                        "code_128_reader", // Code 128
                        "code_39_reader",  // Code 39
                        "upc_reader",      // UPC-A
                        "upc_e_reader"     // UPC-E
                    ],
                    multiple: false // Only detect one barcode at a time
                },
                locate: true
            };

            Quagga.init(quaggaConfig, (err) => {
                if (err) {
                    console.error('QuaggaJS init error:', err);
                    reject(err);
                    return;
                }

                Quagga.start();
                this.quaggaStarted = true;
                this.detectionActive = true;
                console.log('✅ QuaggaJS started successfully');

                // Set up detection handler
                this.setupBarcodeDetection();
                
                // Set up visual feedback
                this.setupVisualFeedback();

                resolve();
            });
        });
    }

    /**
     * Load QuaggaJS library dynamically
     */
    async loadQuaggaJS() {
        return new Promise((resolve, reject) => {
            console.log('📦 Loading QuaggaJS library...');
            
            const script = document.createElement('script');
            script.src = 'https://cdn.jsdelivr.net/npm/@ericblade/quagga2@1.8.4/dist/quagga.min.js';
            script.onload = () => {
                console.log('✅ QuaggaJS loaded');
                resolve();
            };
            script.onerror = () => {
                console.error('❌ Failed to load QuaggaJS');
                reject(new Error('Failed to load QuaggaJS'));
            };
            
            document.head.appendChild(script);
        });
    }

    /**
     * Setup barcode detection with validation
     */
    setupBarcodeDetection() {
        Quagga.onDetected(async (result) => {
            if (!this.detectionActive) return;

            const code = result.codeResult.code;
            
            // Validate barcode
            if (!this.isValidBarcode(code)) {
                console.log('Invalid barcode detected:', code);
                return;
            }

            // Check cooldown (prevent multiple scans of same code)
            const now = Date.now();
            if (code === this.lastDetectedCode && 
                (now - this.lastDetectionTime) < this.detectionCooldown) {
                return;
            }

            // Check confidence level
            const confidence = this.calculateConfidence(result);
            if (confidence < 0.8) {
                console.log('Low confidence detection:', confidence);
                return;
            }

            console.log('✅ Barcode detected:', code, 'Confidence:', confidence);

            // Update last detection
            this.lastDetectedCode = code;
            this.lastDetectionTime = now;
            this.detectionActive = false;

            // Visual feedback
            this.showDetectionFeedback(true);

            // Play beep sound (optional)
            this.playBeep();

            // Stop camera
            this.stopCamera();

            // Trigger scan via health system or original function
            await this.processScan(code);
        });
    }

    /**
     * Setup visual feedback overlay
     */
    setupVisualFeedback() {
        Quagga.onProcessed((result) => {
            const drawingCtx = Quagga.canvas.ctx.overlay;
            const drawingCanvas = Quagga.canvas.dom.overlay;

            if (!drawingCtx || !drawingCanvas) return;

            drawingCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);

            // Draw detection box when barcode found
            if (result && result.boxes) {
                drawingCtx.strokeStyle = 'rgba(0, 255, 0, 0.5)';
                drawingCtx.lineWidth = 2;

                result.boxes.filter(box => box !== result.box).forEach(box => {
                    Quagga.ImageDebug.drawPath(box, {x: 0, y: 1}, drawingCtx, {
                        color: 'green',
                        lineWidth: 2
                    });
                });
            }

            // Draw main detection box
            if (result && result.box) {
                Quagga.ImageDebug.drawPath(result.box, {x: 0, y: 1}, drawingCtx, {
                    color: '#00FF00',
                    lineWidth: 3
                });
            }

            // Draw barcode line
            if (result && result.codeResult && result.codeResult.code) {
                drawingCtx.font = "24px Arial";
                drawingCtx.fillStyle = '#00FF00';
                drawingCtx.fillText(result.codeResult.code, 10, 30);
            }
        });
    }

    /**
     * Validate barcode format
     */
    isValidBarcode(code) {
        if (!code || typeof code !== 'string') return false;
        
        // Remove spaces
        const cleaned = code.replace(/\s/g, '');
        
        // Check if numeric and reasonable length
        if (!/^\d{8,14}$/.test(cleaned)) return false;
        
        // Basic checksum validation for EAN-13
        if (cleaned.length === 13) {
            return this.validateEAN13(cleaned);
        }
        
        return true;
    }

    /**
     * Validate EAN-13 checksum
     */
    validateEAN13(code) {
        if (code.length !== 13) return false;
        
        let sum = 0;
        for (let i = 0; i < 12; i++) {
            sum += parseInt(code[i]) * (i % 2 === 0 ? 1 : 3);
        }
        
        const checksum = (10 - (sum % 10)) % 10;
        return checksum === parseInt(code[12]);
    }

    /**
     * Calculate detection confidence
     */
    calculateConfidence(result) {
        if (!result || !result.codeResult) return 0;
        
        // Average the confidence of all decoders
        const decoders = result.codeResult.decoders || [];
        if (decoders.length === 0) return 0;
        
        const avgError = decoders.reduce((sum, decoder) => 
            sum + (decoder.error || 1), 0) / decoders.length;
        
        return Math.max(0, 1 - avgError);
    }

    /**
     * Process the scanned barcode
     */
    async processScan(code) {
        try {
            // Use health system if available
            if (typeof analyzeProduct === 'function') {
                console.log('🔄 Processing via Health System...');
                await analyzeProduct(code);
            }
            // Use original scan function
            else if (typeof scanProduct === 'function') {
                console.log('🔄 Processing via original scanner...');
                await scanProduct(code);
            }
            // Direct API call
            else if (typeof fetchProductWithHealthScore === 'function') {
                console.log('🔄 Processing via direct API...');
                const product = await fetchProductWithHealthScore(code);
                
                if (typeof healthUI !== 'undefined') {
                    healthUI.displayHealthAnalysis(product);
                }
            }
            else {
                throw new Error('No scan handler available');
            }
        } catch (error) {
            console.error('Scan processing error:', error);
            
            if (typeof showToast === 'function') {
                showToast(`❌ ${error.message}`, 'error');
            }
            
            // Re-enable camera for retry
            setTimeout(() => this.startCamera(), 2000);
        }
    }

    /**
     * Show detection feedback
     */
    showDetectionFeedback(success = true) {
        const video = this.elements.video;
        if (!video) return;

        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: ${success ? 'rgba(0, 255, 0, 0.3)' : 'rgba(255, 0, 0, 0.3)'};
            pointer-events: none;
            z-index: 1000;
            animation: flash 0.3s ease;
        `;

        video.parentElement.style.position = 'relative';
        video.parentElement.appendChild(overlay);

        setTimeout(() => overlay.remove(), 300);

        // Add flash animation
        if (!document.getElementById('flash-animation')) {
            const style = document.createElement('style');
            style.id = 'flash-animation';
            style.textContent = `
                @keyframes flash {
                    0%, 100% { opacity: 0; }
                    50% { opacity: 1; }
                }
            `;
            document.head.appendChild(style);
        }
    }

    /**
     * Play beep sound
     */
    playBeep() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);

            oscillator.frequency.value = 800;
            oscillator.type = 'sine';

            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);

            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
        } catch (error) {
            // Silently fail if audio not supported
        }
    }

    /**
     * Capture still image from camera
     */
    captureImage() {
        if (!this.elements.video || !this.elements.canvas) {
            console.error('Video or canvas element not found');
            return null;
        }

        const context = this.elements.canvas.getContext('2d');
        this.elements.canvas.width = this.elements.video.videoWidth;
        this.elements.canvas.height = this.elements.video.videoHeight;
        
        context.drawImage(this.elements.video, 0, 0);

        if (typeof showToast === 'function') {
            showToast('📸 Image captured!', 'success');
        }

        return this.elements.canvas.toDataURL('image/jpeg', 0.8);
    }

    /**
     * Stop camera and cleanup
     */
    stopCamera() {
        console.log('🛑 Stopping camera...');

        // Stop media stream
        if (this.stream) {
            this.stream.getTracks().forEach(track => {
                track.stop();
                console.log('Track stopped:', track.label);
            });
            this.stream = null;
        }

        // Stop Quagga
        if (this.quaggaStarted && typeof Quagga !== 'undefined') {
            Quagga.stop();
            this.quaggaStarted = false;
            this.detectionActive = false;
        }

        // Clear video source
        if (this.elements.video) {
            this.elements.video.srcObject = null;
        }

        // Update UI
        this.updateCameraUI(false);

        this.cameraInitialized = false;
        console.log('✅ Camera stopped');
    }

    /**
     * Update camera UI buttons
     */
    updateCameraUI(isActive) {
        if (this.elements.startBtn) {
            this.elements.startBtn.style.display = isActive ? 'none' : 'inline-flex';
        }
        if (this.elements.captureBtn) {
            this.elements.captureBtn.style.display = isActive ? 'inline-flex' : 'none';
        }
        if (this.elements.stopBtn) {
            this.elements.stopBtn.style.display = isActive ? 'inline-flex' : 'none';
        }
    }

    /**
     * Handle camera errors with user-friendly messages
     */
    handleCameraError(error) {
        let message = 'Camera error occurred';
        let details = '';

        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            message = 'Camera access denied';
            details = 'Please allow camera access in your browser settings';
            this.showPermissionDeniedUI();
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
            message = 'No camera found';
            details = 'Please ensure your device has a camera';
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
            message = 'Camera is already in use';
            details = 'Close other apps using the camera';
        } else if (error.name === 'OverconstrainedError') {
            message = 'Camera constraints not supported';
            details = 'Your camera may not support the required settings';
        } else if (error.message === 'Camera timeout') {
            message = 'Camera timeout';
            details = 'Camera took too long to initialize';
        }

        console.error(`❌ ${message}:`, error);

        if (typeof showToast === 'function') {
            showToast(`❌ ${message}. ${details}`, 'error');
        }

        this.updateCameraUI(false);
    }

    /**
     * Check camera support
     */
    isCameraSupported() {
        return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    }

    /**
     * Get camera info
     */
    async getCameraInfo() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const cameras = devices.filter(device => device.kind === 'videoinput');
            
            return {
                hasCamera: cameras.length > 0,
                cameraCount: cameras.length,
                cameras: cameras.map(cam => ({
                    id: cam.deviceId,
                    label: cam.label || 'Camera'
                }))
            };
        } catch (error) {
            console.error('Error getting camera info:', error);
            return { hasCamera: false, cameraCount: 0, cameras: [] };
        }
    }
}

// ============================================
// INTEGRATION WITH EXISTING APP
// ============================================

// Create global camera manager instance
const enhancedCamera = new EnhancedCameraManager();

// Override existing camera functions
if (typeof window.startCamera !== 'undefined') {
    window.startCamera = () => enhancedCamera.startCamera();
}

if (typeof window.stopCamera !== 'undefined') {
    window.stopCamera = () => enhancedCamera.stopCamera();
}

if (typeof window.captureImage !== 'undefined') {
    window.captureImage = () => enhancedCamera.captureImage();
}

// Hook up to existing buttons
window.addEventListener('load', () => {
    const startBtn = document.getElementById('startCameraBtn');
    const stopBtn = document.getElementById('stopCameraBtn');
    const captureBtn = document.getElementById('captureBtn');

    if (startBtn) {
        startBtn.addEventListener('click', () => enhancedCamera.startCamera());
    }

    if (stopBtn) {
        stopBtn.addEventListener('click', () => enhancedCamera.stopCamera());
    }

    if (captureBtn) {
        captureBtn.addEventListener('click', () => enhancedCamera.captureImage());
    }

    // Check camera support on load
    if (!enhancedCamera.isCameraSupported()) {
        console.warn('⚠️ Camera not supported on this device');
        if (typeof showToast === 'function') {
            showToast('⚠️ Camera not supported on this device', 'warning');
        }
    } else {
        enhancedCamera.getCameraInfo().then(info => {
            console.log('📷 Camera info:', info);
        });
    }
});

// Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EnhancedCameraManager, enhancedCamera };
}

console.log('✅ Enhanced Camera & Scanner module loaded');
