/**
 * AIVA WebSpeechService - Rewritten for reliability
 * 
 * Architecture: Click mic → speak → auto-sends when you pause.
 * Uses continuous=true + interimResults=true for maximum reliability.
 * The mic stays on until the user clicks stop OR a 12-second silence timeout fires.
 */

import axios from 'axios';
import { API_BASE_URL } from './api';

class WebSpeechService {
    constructor() {
        this.baseUrl = `${API_BASE_URL}/api/voice/conversation`;
        this.conversationId = null;
        this.isListening = false;
        this._isProcessing = false;

        // Native Speech Recognition
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (SR) {
            this.recognition = new SR();
            this.recognition.continuous = true;
            this.recognition.lang = 'en-US';
            this.recognition.interimResults = true;
            this.recognition.maxAlternatives = 1;
        } else {
            this.recognition = null;
        }

        // Native Speech Synthesis
        this.synth = window.speechSynthesis;
        if (this.synth && this.synth.onvoiceschanged !== undefined) {
            this.synth.onvoiceschanged = () => { };
        }

        this._onResult = null;
        this._onError = null;
        this._onEnd = null;
        this._silenceTimer = null;
        this._safetyTimer = null;
        this._lastTranscript = '';
        this._sent = false;
        this._onSpeakingStateChange = null;
        this._listenStartTime = 0;
        this._retryInProgress = false;
    }

    isSupported() {
        return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
    }

    async checkMicPermission() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            stream.getTracks().forEach(t => t.stop());
            return true;
        } catch (e) {
            console.error('Mic permission denied:', e);
            return false;
        }
    }

    _getBestVoice() {
        const voices = this.synth.getVoices();
        return voices.find(v => v.name.includes('Google') && v.lang === 'en-US') ||
            voices.find(v => v.name.includes('Microsoft') && v.lang.startsWith('en-US')) ||
            voices.find(v => v.lang.startsWith('en')) ||
            voices[0];
    }

    async startConversation() {
        try {
            const response = await axios.post(`${this.baseUrl}/start`);
            this.conversationId = response.data.conversation_id;
            const greeting = response.data.text || response.data.assistant_text ||
                "Hello! I'm your AIVA voice assistant. Click the microphone and tell me what you'd like to order.";
            this.speak(greeting);
            return { ...response.data, text: greeting };
        } catch (error) {
            console.error('Failed to start conversation:', error);
            throw error;
        }
    }

    _clearTimers() {
        if (this._silenceTimer) { clearTimeout(this._silenceTimer); this._silenceTimer = null; }
        if (this._safetyTimer) { clearTimeout(this._safetyTimer); this._safetyTimer = null; }
    }

    _finishWithTranscript() {
        if (this._sent) return;
        this._sent = true;
        this._clearTimers();
        this.isListening = false;
        try { this.recognition.stop(); } catch (e) { }

        if (this._lastTranscript) {
            console.log('[Voice] Sending transcript:', this._lastTranscript);
            // Signal UI: "AI is thinking..."
            if (this._onEnd) this._onEnd();
            this._sendToBackend(this._lastTranscript);
        } else {
            console.log('[Voice] No transcript captured.');
            if (this._onError) this._onError('no-speech');
        }
    }

    startListening(onResult, onError, onEnd, language = 'en-US') {
        if (!this.conversationId) {
            if (onError) onError('No active conversation. Please restart.');
            return;
        }
        if (!this.recognition) {
            if (onError) onError('Speech Recognition is not supported in this browser.');
            return;
        }

        // HACKATHON: Apply selected language
        this.recognition.lang = language;
        this.currentLanguage = language;
        if (this._isProcessing) return; // Don't start while AI is thinking

        this.stopAudio(); // Stop any TTS playback

        this._onResult = onResult;
        this._onError = onError;
        this._onEnd = onEnd;
        this._lastTranscript = '';
        this._sent = false;
        this._isProcessing = false;
        this._noSpeechRetries = 0;
        this._listenStartTime = Date.now();
        this._retryInProgress = false;
        this.isListening = true;

        // 20-second absolute safety timeout
        this._safetyTimer = setTimeout(() => {
            console.log('[Voice] Safety timeout — auto-stopping');
            this._finishWithTranscript();
        }, 20000);

        this.recognition.onstart = () => {
            console.log('[Voice] Listening...');
            this.isListening = true;
        };

        this.recognition.onerror = (event) => {
            console.error('[Voice] Recognition error:', event.error);
            if (event.error === 'aborted') return; // Ignore — we handle in onend
            if (event.error === 'no-speech') {
                const listenDuration = Date.now() - this._listenStartTime;
                console.log(`[Voice] no-speech after ${listenDuration}ms. Transcript: ${this._lastTranscript}`);

                // If we have ANY transcript, "no-speech" just means the user finished talking
                if (this._lastTranscript && this._lastTranscript.length > 0) {
                    console.log('[Voice] Success capture despite no-speech error');
                    this._finishWithTranscript();
                    return;
                }

                if (listenDuration < 1500 && !this._retryInProgress) {
                    console.log('[Voice] Premature no-speech — attempting single silent restart');
                    this._retryInProgress = true;
                    try { this.recognition.stop(); } catch (e) { }
                    return;
                }

                this._clearTimers();
                this.isListening = false;
                if (!this._sent) {
                    this._sent = true;
                    if (this._onError) this._onError('no-speech');
                }
                return;
            }
            // Other errors (not-allowed, audio-capture, etc.)
            this._clearTimers();
            this.isListening = false;
            if (!this._sent) {
                this._sent = true;
                if (this._onError) this._onError(event.error);
            }
        };

        this.recognition.onend = () => {
            console.log('[Voice] Recognition ended.');

            if (this._retryInProgress && !this._sent) {
                this._retryInProgress = false;
                this._listenStartTime = Date.now(); // Reset start time
                setTimeout(() => {
                    try {
                        if (!this._sent) {
                            console.log('[Voice] Silently restarting...');
                            this.recognition.start();
                        }
                    } catch (e) {
                        console.error('[Voice] Silent restart failed:', e);
                        this.isListening = false;
                        this._finishWithTranscript();
                    }
                }, 400); // 400ms delay to prevent flicker toast on mobile
                return;
            }

            this.isListening = false;
            // Only auto-finish if we haven't sent yet
            if (!this._sent) {
                this._finishWithTranscript();
            }
        };

        this.recognition.onresult = (event) => {
            let finalTranscript = '';
            let interimTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }

            // Always keep the best transcript we have
            if (finalTranscript.trim()) {
                this._lastTranscript = finalTranscript.trim();
            } else if (interimTranscript.trim()) {
                this._lastTranscript = interimTranscript.trim();
            }

            // Reset silence timer every time we get speech
            if (this._silenceTimer) clearTimeout(this._silenceTimer);

            // MOBILE: If we get a valid final transcript, we've heard them!
            if (finalTranscript.trim().length > 3) {
                console.log('[Voice] Strong capture detected:', finalTranscript.trim());
            }

            this._silenceTimer = setTimeout(() => {
                // 3.0 seconds of silence after last speech → auto-send
                console.log('[Voice] Silence detected — auto-sending');
                this._finishWithTranscript();
            }, 3000);
        };

        try {
            this.recognition.start();
        } catch (err) {
            console.error('[Voice] Could not start:', err);
            this.isListening = false;
            this._clearTimers();
            if (this._onError) this._onError('Could not start microphone.');
        }
    }

    async _sendToBackend(transcript) {
        this._isProcessing = true;

        // 20-second timeout so it NEVER hangs forever
        const timeoutId = setTimeout(() => {
            console.error('[Voice] Backend timed out');
            this._isProcessing = false;
            if (this._onError) this._onError('AI took too long. Please try again.');
        }, 20000);

        try {
            // HACKATHON: Live Multilingual Translation
            let englishTranscript = transcript;
            const isNonEnglish = this.currentLanguage && !this.currentLanguage.startsWith('en');

            if (isNonEnglish) {
                console.log(`[Voice] Translating user text from ${this.currentLanguage} to English...`);
                // Translate user's native language TO English for the backend
                const transRes = await axios.post(`${API_BASE_URL}/api/translate`, {
                    text: transcript,
                    target_language: 'en'
                });
                if (transRes.data.success) {
                    englishTranscript = transRes.data.translated_text;
                    console.log(`[Voice] Translated to English: ${englishTranscript}`);
                }
            }

            const response = await axios.post(
                `${this.baseUrl}/${this.conversationId}/process_text`,
                { text: englishTranscript } // Always send English to agent
            );

            clearTimeout(timeoutId);
            this._isProcessing = false;

            let assistantText = response.data.assistant_text || response.data.text || '';

            // HACKATHON: Translate AI English response BACK to user's native language
            if (isNonEnglish && assistantText) {
                console.log(`[Voice] Translating AI response to ${this.currentLanguage}...`);
                const aiTransRes = await axios.post(`${API_BASE_URL}/api/translate`, {
                    text: assistantText,
                    target_language: this.currentLanguage
                });
                if (aiTransRes.data.success) {
                    assistantText = aiTransRes.data.translated_text;
                    // Provide the translated text back to the UI
                    response.data.assistant_text = assistantText;
                    response.data.text = assistantText;
                }
            }

            if (assistantText) {
                this.speak(assistantText, this.currentLanguage);
            }

            if (this._onResult) {
                // Return the original native transcript to the UI so it looks correct in chat
                response.data.user_text = transcript;
                this._onResult(response.data);
            }
        } catch (err) {
            clearTimeout(timeoutId);
            this._isProcessing = false;
            console.error('[Voice] Backend error:', err);
            const errMsg = err.response?.data?.detail || 'Could not reach AI. Check your connection.';
            if (this._onError) this._onError(errMsg);
        }
    }

    stopListening() {
        this._clearTimers();
        if (!this._sent) {
            this._finishWithTranscript();
        } else {
            this.isListening = false;
            try { this.recognition.stop(); } catch (e) { }
        }
    }

    async submitVoiceOrder(automationMethod = 'strands', aiModel = 'anthropic.claude-3-5-haiku-20241022-v1:0') {
        if (!this.conversationId) throw new Error("No active conversation to submit");
        const response = await axios.post(
            `${this.baseUrl}/${this.conversationId}/submit?automation_method=${automationMethod}&ai_model=${aiModel}`
        );
        return response.data;
    }

    async endConversation() {
        const id = this.conversationId;
        this.conversationId = null;
        this._clearTimers();
        this.stopAudio();
        if (id) {
            try { await axios.delete(`${this.baseUrl}/${id}`); } catch (e) { }
        }
    }

    speak(text, language = 'en-US') {
        if (!text || !this.synth) return;

        // Flush TTS queue to prevent freeze
        this.synth.cancel();

        const doSpeak = () => {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.volume = 1.0;
            utterance.rate = 1.05;
            utterance.pitch = 1.0;

            const voices = this.synth.getVoices();
            let selectedVoice = null;

            const isEnglish = !language || language.startsWith('en');

            if (isEnglish) {
                // For English, use the ORIGINAL female voice preference
                selectedVoice = this._getBestVoice();
            } else {
                // For non-English, prefer a female voice in that language
                const langPrefix = language.split('-')[0];
                selectedVoice =
                    voices.find(v => v.lang === language && v.name.toLowerCase().includes('female')) ||
                    voices.find(v => v.lang.startsWith(langPrefix) && v.name.toLowerCase().includes('female')) ||
                    voices.find(v => v.lang === language) ||
                    voices.find(v => v.lang.startsWith(langPrefix)) ||
                    this._getBestVoice(); // Ultimate fallback
            }

            if (selectedVoice) {
                utterance.voice = selectedVoice;
            }

            utterance.onstart = () => {
                if (this._onSpeakingStateChange) this._onSpeakingStateChange(true);
            };

            utterance.onend = () => {
                if (this._onSpeakingStateChange) this._onSpeakingStateChange(false);
            };

            utterance.onerror = () => {
                if (this._onSpeakingStateChange) this._onSpeakingStateChange(false);
            };

            this.synth.speak(utterance);
        };

        if (this.synth.getVoices().length > 0) {
            doSpeak();
        } else {
            setTimeout(doSpeak, 200);
        }
    }

    stopAudio() {
        if (this.synth) this.synth.cancel();
        if (this._onSpeakingStateChange) this._onSpeakingStateChange(false);
    }
}

export const webSpeechService = new WebSpeechService();
export default webSpeechService;
