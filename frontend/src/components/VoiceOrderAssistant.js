import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Modal,
  Box,
  SpaceBetween,
  Button,
  Alert,
  Header,
  Container,
  ColumnLayout,
  Link,
  ExpandableSection
} from '@cloudscape-design/components';
import webSpeechService from '../services/WebSpeechService';

const getMicStyle = (isRecording, isProcessing) => ({
  width: 70,
  height: 70,
  borderRadius: '50%',
  border: '3px solid ' + (isRecording ? '#ff3b30' : isProcessing ? '#888' : '#0073bb'),
  cursor: isProcessing ? 'not-allowed' : 'pointer',
  background: isRecording
    ? 'linear-gradient(135deg, #ff3b30, #c0392b)'
    : isProcessing
      ? '#e0e0e0'
      : 'linear-gradient(135deg, #0073bb, #005e97)',
  boxShadow: isRecording
    ? '0 0 0 8px rgba(255,59,48,0.3), 0 4px 16px rgba(0,0,0,0.25)'
    : '0 4px 16px rgba(0,0,0,0.2)',
  color: '#fff',
  fontSize: 36,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'all 0.25s ease',
  outline: 'none',
  userSelect: 'none',
  WebkitUserSelect: 'none',
  margin: '0 auto',
  animation: isRecording ? 'mic-pulse 1.2s infinite' : 'none',
});

const VoiceOrderAssistant = ({ visible, onDismiss, onOrderCreated }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [orderData, setOrderData] = useState({});
  const [conversationHistory, setConversationHistory] = useState([]);
  const [readyToSubmit, setReadyToSubmit] = useState(false);
  const [error, setError] = useState(null);
  const [lastHeard, setLastHeard] = useState('');
  const [micOk, setMicOk] = useState(null);
  const [showBill, setShowBill] = useState(false);
  const [submittedOrder, setSubmittedOrder] = useState(null);

  // Hackathon Features: Multilingual & Emotion
  const [selectedLanguage, setSelectedLanguage] = useState('en-US');
  const [currentEmotion, setCurrentEmotion] = useState({ label: 'Calm & Neutral', icon: 'self_improvement', color: '#6366f1' });
  const [emotionHistory, setEmotionHistory] = useState([]);
  const [isSystemSpeaking, setIsSystemSpeaking] = useState(false);

  const canvasRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animFrameRef = useRef(null);
  const scrollRef = useRef(null);

  // Auto-scroll conversation
  useEffect(() => {
    if (scrollRef.current) {
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 100);
    }
  }, [conversationHistory]);

  // Waveform visualizer
  useEffect(() => {
    if (isRecording) {
      navigator.mediaDevices.getUserMedia({ audio: true }).then(stream => {
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 64;
        const src = ctx.createMediaStreamSource(stream);
        src.connect(analyser);
        audioContextRef.current = ctx;
        analyserRef.current = analyser;

        const draw = () => {
          const canvas = canvasRef.current;
          if (!canvas || !analyserRef.current) return;
          const cCtx = canvas.getContext('2d');
          const bufLen = analyser.frequencyBinCount;
          const data = new Uint8Array(bufLen);
          analyser.getByteFrequencyData(data);

          // === HACKATHON: REAL-TIME EMOTIONAL SENTIMENT ANALYSIS ===
          let totalEnergy = 0;
          let lowFreq = 0;  // Bass (0-10)
          let midFreq = 0;  // Speech core (10-30)
          let highFreq = 0; // Stress/sharp sounds (30+)

          cCtx.clearRect(0, 0, canvas.width, canvas.height);
          const barW = (canvas.width / bufLen) * 1.5;
          let x = 0;

          for (let i = 0; i < bufLen; i++) {
            const v = data[i];
            totalEnergy += v;
            if (i < 10) lowFreq += v;
            else if (i < 30) midFreq += v;
            else highFreq += v;

            const normalizedV = v / 255;
            const h = normalizedV * canvas.height * 0.9;
            const grad = cCtx.createLinearGradient(0, canvas.height, 0, canvas.height - h);
            grad.addColorStop(0, 'rgba(99,102,241,0.8)');
            grad.addColorStop(1, 'rgba(236,72,153,0.8)');
            cCtx.fillStyle = grad;
            cCtx.fillRect(x, canvas.height - h, barW - 1, h);
            x += barW;
          }

          // Emotion Heuristics every ~30 frames
          if (Math.random() < 0.05 && totalEnergy > 500) {
            let emotion = { label: 'Calm & Neutral', icon: 'self_improvement', color: '#6366f1' };

            const avgEnergy = totalEnergy / bufLen;
            if (avgEnergy > 150 && highFreq > midFreq * 1.5) {
              emotion = { label: 'Urgent / Stressed', icon: 'warning_amber', color: '#ef4444' };
            } else if (avgEnergy > 120 && lowFreq > highFreq) {
              emotion = { label: 'Energetic / Confident', icon: 'bolt', color: '#f59e0b' };
            } else if (avgEnergy < 50) {
              emotion = { label: 'Quiet / Hesitant', icon: 'volume_down', color: '#8b5cf6' };
            } else if (totalEnergy > 1000) {
              emotion = { label: 'Engaged', icon: 'graphic_eq', color: '#10b981' };
            }
            setCurrentEmotion(emotion);
          }
          // ==========================================================

          animFrameRef.current = requestAnimationFrame(draw);
        };
        draw();
      }).catch(() => { });
    } else {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (audioContextRef.current) { audioContextRef.current.close().catch(() => { }); audioContextRef.current = null; }
      // Reset emotion when stopped
      setCurrentEmotion({ label: 'Calm & Neutral', icon: 'self_improvement', color: '#6366f1' });
    }
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isRecording]);

  useEffect(() => {
    webSpeechService._onSpeakingStateChange = (state) => {
      setIsSystemSpeaking(state);
    };

    if (visible) {
      const initVoice = async () => {
        // Start checking permission and initializing backend in parallel
        const micPromise = webSpeechService.checkMicPermission();
        const convPromise = webSpeechService.startConversation();

        try {
          const micOk = await micPromise;
          setMicOk(micOk);

          if (micOk) {
            const result = await convPromise;
            const greeting = result.text || result.assistant_text || '';
            if (greeting) {
              setConversationHistory([{
                role: 'assistant',
                text: greeting,
                timestamp: new Date().toISOString()
              }]);
            }
          } else {
            setError('Microphone access denied. Please click the camera/mic icon in the browser address bar and allow access, then restart.');
          }
        } catch (err) {
          console.error('Initialization error:', err);
          setError('Communication error. Verify your connection.');
        } finally {
          setIsProcessing(false);
        }
      };

      initVoice();
    }
    return () => {
      webSpeechService._onSpeakingStateChange = null;
      webSpeechService.stopListening();
      webSpeechService.stopAudio();
      if (webSpeechService.conversationId) webSpeechService.endConversation();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  const isHighlighted = (field) => {
    if (!lastHeard) return false;
    const lowerHeard = lastHeard.toLowerCase();
    switch (field) {
      case 'product': return lowerHeard.includes('product') || lowerHeard.includes('item') || lowerHeard.includes('buy');
      case 'brand': return lowerHeard.includes('brand') || lowerHeard.includes('company');
      case 'quantity': return lowerHeard.includes('quantity') || lowerHeard.includes('amount') || /\b([0-9]+|one|two|three|four|five|six|seven|eight|nine|ten)\b/.test(lowerHeard);
      case 'customer': return lowerHeard.includes('name') || lowerHeard.includes('customer');
      case 'address': return lowerHeard.includes('address') || lowerHeard.includes('deliver') || lowerHeard.includes('street');
      default: return false;
    }
  };

  const getProductUrl = (data = orderData) => {
    if (!data.product_name) return null;
    const queryParts = [data.brand, data.product_name, data.specifications].filter(Boolean);
    const q = encodeURIComponent(queryParts.join(' '));
    const r = (data.retailer || '').toLowerCase();
    if (r.includes('walmart')) return `https://www.walmart.com/search?q=${q}`;
    if (r.includes('target')) return `https://www.target.com/s?searchTerm=${q}`;
    return `https://www.amazon.com/s?k=${q}`;
  };

  const clearSession = () => {
    webSpeechService.stopListening();
    webSpeechService.stopAudio();
    if (webSpeechService.conversationId) webSpeechService.endConversation();
    setOrderData({});
    setConversationHistory([]);
    setLastHeard('');
    setReadyToSubmit(false);
    setShowBill(false);
    setSubmittedOrder(null);
    setError(null);
  };

  const startConversation = useCallback(async () => {
    setError(null);
    setIsRecording(false);
    setIsProcessing(false); // Do not lock UI with AI is thinking on startup
    setReadyToSubmit(false);
    setLastHeard('');
    setOrderData({});
    setConversationHistory([]);

    try {
      const result = await webSpeechService.startConversation();
      const greeting = result.text || result.assistant_text || '';
      if (greeting) {
        setConversationHistory([{
          role: 'assistant',
          text: greeting,
          timestamp: new Date().toISOString()
        }]);
      }
    } catch (err) {
      setError('Could not connect to backend. Make sure the server is running on port 8000.');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleMicClick = () => {
    if (isProcessing) return;
    if (micOk === false) {
      setError('Microphone is not allowed. Enable it in browser settings and refresh.');
      return;
    }

    if (isRecording) {
      // User clicked stop — let WebSpeechService handle sending
      webSpeechService.stopListening();
      // Don't set isProcessing here — the callbacks will handle it
      setIsRecording(false);
      return;
    }

    setIsRecording(true);
    setError(null);
    setLastHeard('');

    webSpeechService.startListening(
      (result) => {
        // SUCCESS: AI responded
        setIsRecording(false);
        setIsProcessing(false);
        if (result.user_text) setLastHeard(result.user_text);
        setOrderData(result.order_data || {});
        setReadyToSubmit(result.ready_to_submit || false);
        setConversationHistory(prev => [
          ...prev,
          { role: 'user', text: result.user_text || '[spoken]', timestamp: new Date().toISOString() },
          { role: 'assistant', text: result.assistant_text || '', timestamp: new Date().toISOString() }
        ]);
      },
      (errCode) => {
        // ERROR: Something went wrong
        setIsRecording(false);
        setIsProcessing(false);
        if (errCode === 'no-speech') {
          setError("I didn't hear anything. Click the mic and speak clearly.");
          webSpeechService.speak("I didn't hear anything. Please click the mic and try again.");
        } else if (errCode === 'not-allowed' || errCode === 'audio-capture') {
          setMicOk(false);
          setError('Microphone access denied. Allow mic in browser and refresh.');
        } else {
          setError(`Error: ${errCode}. Please try again.`);
        }
      },
      () => {
        // END: Speech captured, AI is processing
        setIsRecording(false);
        setIsProcessing(true);
      }
    );
  };

  const submitOrder = async () => {
    setIsProcessing(true);
    try {
      const result = await webSpeechService.submitVoiceOrder();
      const url = getProductUrl();
      if (url) window.open(url, '_blank');
      onOrderCreated(result.order_id);

      // Generate the Bill
      setSubmittedOrder({
        ...orderData,
        order_id: result.order_id || `ORD-${Math.floor(1000 + Math.random() * 9000)}`,
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString(),
        total: (Math.random() * 80 + 20).toFixed(2) // Fake total between $20 and $100 for realism
      });
      setShowBill(true);

    } catch (err) {
      setError('Failed to submit: ' + (err?.response?.data?.detail || err.message));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDismiss = () => {
    webSpeechService.stopListening();
    webSpeechService.stopAudio();
    webSpeechService.endConversation();
    onDismiss();
  };

  const currentProductUrl = getProductUrl();

  return (
    <Modal
      visible={visible}
      onDismiss={handleDismiss}
      header={<Header variant="h2">🎙️ AIVA Voice Assistant</Header>}
      size="large"
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            {showBill ? (
              <Button variant="primary" onClick={handleDismiss}>Close Receipt</Button>
            ) : (
              <>
                <Button onClick={clearSession}>🗑️ Clear Order</Button>
                <Button variant="link" onClick={handleDismiss}>Cancel</Button>
                <Button variant="primary" onClick={submitOrder} disabled={!readyToSubmit || isProcessing}>
                  ✅ Submit Order &amp; Open Store
                </Button>
              </>
            )}
          </SpaceBetween>
        </Box>
      }
    >
      <style>{`
        @keyframes mic-pulse {
          0%   { box-shadow: 0 0 0 0 rgba(255,59,48,0.5), 0 4px 16px rgba(0,0,0,0.25); }
          70%  { box-shadow: 0 0 0 16px rgba(255,59,48,0), 0 4px 16px rgba(0,0,0,0.25); }
          100% { box-shadow: 0 0 0 0 rgba(255,59,48,0), 0 4px 16px rgba(0,0,0,0.25); }
        }
      `}</style>

      <SpaceBetween size="l">
        {error && (
          <Alert type="error" dismissible onDismiss={() => setError(null)}>
            {error}
          </Alert>
        )}

        {showBill ? (
          <Container header={<Header variant="h2">🧾 Official Order Receipt</Header>}>
            <Box padding="l">
              <SpaceBetween size="m">
                <Box variant="h1" textAlign="center" color="text-status-success">✅ Order Successfully Placed!</Box>

                <ColumnLayout columns={2} variant="text-grid">
                  <div>
                    <Box variant="awsui-key-label">Order Number</Box>
                    <Box><strong>{submittedOrder.order_id}</strong></Box>
                  </div>
                  <div>
                    <Box variant="awsui-key-label">Date & Time</Box>
                    <Box>{submittedOrder.date} at {submittedOrder.time}</Box>
                  </div>
                  <div>
                    <Box variant="awsui-key-label">Customer Name</Box>
                    <Box>{submittedOrder.customer_name}</Box>
                  </div>
                  <div>
                    <Box variant="awsui-key-label">Delivery Address</Box>
                    <Box>{submittedOrder.street}</Box>
                  </div>
                </ColumnLayout>

                <div style={{ borderTop: '1px dashed #ccc', margin: '16px 0' }} />

                <ColumnLayout columns={2}>
                  <div>
                    <Box variant="awsui-key-label">Item Description</Box>
                    <Box variant="strong" marginTop="xs">
                      {submittedOrder.quantity || 1}x {submittedOrder.brand} {submittedOrder.product_name}
                    </Box>
                    <Box variant="small" color="text-status-inactive">
                      {submittedOrder.specifications}
                    </Box>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <Box variant="awsui-key-label">Price</Box>
                    <Box variant="strong" marginTop="xs">${submittedOrder.total}</Box>
                  </div>
                </ColumnLayout>

                <div style={{ borderTop: '2px solid #333', margin: '16px 0' }} />

                <ColumnLayout columns={2}>
                  <Box variant="h3">Total Paid</Box>
                  <Box variant="h3" textAlign="right">${submittedOrder.total}</Box>
                </ColumnLayout>
              </SpaceBetween>
            </Box>
          </Container>
        ) : (
          <>
            {/* HACKATHON: Language & Emotion Bar — Light Theme */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', background: '#f1f5f9', padding: '10px 16px', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span className="material-icons" style={{ color: '#6366f1', fontSize: '20px' }}>translate</span>
                <select
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                  style={{ background: '#ffffff', border: '1px solid #cbd5e1', color: '#1e293b', fontSize: '14px', outline: 'none', cursor: 'pointer', fontWeight: '600', padding: '4px 8px', borderRadius: '8px' }}
                >
                  <option value="en-US">🇺🇸 English</option>
                  <option value="es-ES">🇪🇸 Español</option>
                  <option value="hi-IN">🇮🇳 हिन्दी</option>
                  <option value="fr-FR">🇫🇷 Français</option>
                </select>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: `${currentEmotion.color}15`, padding: '6px 14px', borderRadius: '20px', border: `1px solid ${currentEmotion.color}40` }}>
                <span className="material-icons" style={{ color: currentEmotion.color, fontSize: '16px' }}>{currentEmotion.icon}</span>
                <span style={{ color: currentEmotion.color, fontSize: '12px', fontWeight: 'bold', letterSpacing: '0.5px', textTransform: 'uppercase' }}>{currentEmotion.label}</span>
              </div>
            </div>

            {/* Conversation History (Always Visible Above Mic) */}
            <div
              ref={scrollRef}
              style={{
                height: 250,
                overflowY: 'auto',
                padding: '16px',
                background: '#ffffff',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.05)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px',
                marginBottom: '1rem'
              }}
            >
              {conversationHistory.length === 0
                ? <Box variant="small" color="text-label" textAlign="center">Click the microphone to start your mission!</Box>
                : conversationHistory.map((m, i) => (
                  <div
                    key={i}
                    style={{
                      alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                      maxWidth: '85%',
                      padding: '10px 14px',
                      borderRadius: m.role === 'user' ? '18px 18px 2px 18px' : '18px 18px 18px 2px',
                      background: m.role === 'user' ? '#6366f1' : '#f1f5f9',
                      color: m.role === 'user' ? '#ffffff' : '#1e293b',
                      fontSize: '14px',
                      lineHeight: '1.5',
                      boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                      position: 'relative'
                    }}
                  >
                    <div style={{
                      fontSize: '11px',
                      fontWeight: '700',
                      marginBottom: '4px',
                      opacity: 0.9,
                      color: m.role === 'user' ? '#e0e7ff' : '#64748b'
                    }}>
                      {m.role === 'user' ? '🧑 You' : '🤖 AIVA Agent'}
                    </div>
                    {m.text}
                  </div>
                ))
              }
            </div>

            <Container>
              <Box textAlign="center">
                {lastHeard && (
                  <Box variant="p" margin={{ bottom: 's' }}>
                    🗣️ You said: "<strong>{lastHeard}</strong>"
                  </Box>
                )}

                {/* Waveform Visualizer */}
                <div className="waveform-container" style={{ margin: '0.5rem auto' }}>
                  {isRecording ? (
                    <canvas ref={canvasRef} width={150} height={40} style={{ borderRadius: '12px' }} />
                  ) : isProcessing ? (
                    <div className="waveform-ring" style={{ width: 60, height: 60 }}></div>
                  ) : null}
                </div>

                {/* Haptic Glow Ring active when AI talks */}
                <div className={isSystemSpeaking ? 'system-speaking' : ''}>
                  <button
                    onClick={handleMicClick}
                    disabled={isProcessing || micOk === false || isSystemSpeaking}
                    style={getMicStyle(isRecording, isProcessing || isSystemSpeaking)}
                    title={isRecording ? 'Click to stop' : 'Click to speak'}
                    aria-label={isRecording ? 'Stop speaking' : 'Start speaking'}
                  >
                    {isRecording ? '🔴' : isSystemSpeaking ? '🔊' : isProcessing ? '⏳' : '🎙️'}
                  </button>
                </div>

                <Box variant="p" margin={{ top: 's' }}>
                  {isProcessing
                    ? '⏳ AI is thinking...'
                    : isSystemSpeaking
                      ? '🔊 AIVA is speaking...'
                      : isRecording
                        ? '🔴 Listening — click again when done speaking'
                        : '👆 Click mic, speak, then click again to send'}
                </Box>

                {/* Contextual Idea Bubbles */}
                {!isRecording && !isProcessing && !isSystemSpeaking && (
                  <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '16px', flexWrap: 'wrap' }}>
                    <span className="idea-bubble"><span className="material-icons" style={{ fontSize: '14px' }}>tips_and_updates</span> "Add 2 quantity"</span>
                    <span className="idea-bubble"><span className="material-icons" style={{ fontSize: '14px' }}>tips_and_updates</span> "Change brand to Apple"</span>
                    <span className="idea-bubble"><span className="material-icons" style={{ fontSize: '14px' }}>tips_and_updates</span> "Set delivery to home"</span>
                  </div>
                )}

                <Box margin={{ top: 'xs' }}>
                  <Button onClick={startConversation} disabled={isProcessing} variant="link">
                    🔄 Restart Assistant
                  </Button>
                </Box>
              </Box>
            </Container>

            <Container header={<Header variant="h3">📦 Order Details</Header>}>
              <ColumnLayout columns={3} className="magical-zoom-container">
                <div className={isHighlighted('product') ? 'magical-zoom' : ''}>
                  <Box variant="awsui-key-label">Product</Box>
                  <Box variant="strong">{orderData.product_name || <span style={{ color: '#aaa' }}>...</span>}</Box>
                  {currentProductUrl && (
                    <Box margin={{ top: 'xs' }}>
                      <Link external href={currentProductUrl}>View on {orderData.retailer || 'Amazon'} ↗</Link>
                    </Box>
                  )}
                </div>
                <div className={isHighlighted('brand') ? 'magical-zoom' : ''}>
                  <Box variant="awsui-key-label">Brand</Box>
                  <Box variant="strong">{orderData.brand || <span style={{ color: '#aaa' }}>...</span>}</Box>
                </div>
                <div>
                  <Box variant="awsui-key-label">Details / Specs</Box>
                  <Box variant="strong">{orderData.specifications || <span style={{ color: '#aaa' }}>...</span>}</Box>
                </div>
                <div className={isHighlighted('quantity') ? 'magical-zoom' : ''}>
                  <Box variant="awsui-key-label">Quantity</Box>
                  <Box variant="strong">{orderData.quantity || <span style={{ color: '#aaa' }}>...</span>}</Box>
                </div>
                <div className={isHighlighted('customer') ? 'magical-zoom' : ''}>
                  <Box variant="awsui-key-label">Customer</Box>
                  <Box variant="strong">{orderData.customer_name || <span style={{ color: '#aaa' }}>...</span>}</Box>
                </div>
                <div className={isHighlighted('address') ? 'magical-zoom' : ''}>
                  <Box variant="awsui-key-label">Delivery Address</Box>
                  <Box variant="strong">{orderData.street || <span style={{ color: '#aaa' }}>...</span>}</Box>
                </div>
              </ColumnLayout>
            </Container>
          </>
        )}
      </SpaceBetween>
    </Modal>
  );
};

export default VoiceOrderAssistant;
