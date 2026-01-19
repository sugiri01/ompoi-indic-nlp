import { useState, useRef, useEffect } from 'react';
import { Send, Mic, Plus, Clock, FileText, Grid, TrendingUp, MoreVertical, Bell, ArrowUp, Download, Search, Link, Smile, Image, Paperclip, Music, Settings, HelpCircle, Volume2, Square } from 'lucide-react';

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sourceLang, setSourceLang] = useState('eng_Latn');
  const [targetLang, setTargetLang] = useState('hin_Deva');
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [playingMessageId, setPlayingMessageId] = useState(null);
  const bottomRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const currentAudioRef = useRef(null);

  const languages = [
    { code: 'eng_Latn', name: 'English' },
    { code: 'hin_Deva', name: 'Hindi' },
    { code: 'tam_Taml', name: 'Tamil' },
    { code: 'tel_Telu', name: 'Telugu' },
    { code: 'mal_Mlym', name: 'Malayalam' },
    { code: 'kan_Knda', name: 'Kannada' },
    { code: 'ben_Beng', name: 'Bengali' },
    { code: 'guj_Gujr', name: 'Gujarati' },
  ];

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = { role: 'user', text: input, lang: sourceLang };
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    setMessages(prev => [...prev, { role: 'bot', text: 'Thinking...', isLoading: true }]);

    try {
      const response = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMsg.text,
          source_lang: userMsg.lang,
          target_lang: targetLang
        })
      });

      if (!response.ok) throw new Error("API Error");

      const data = await response.json();

      setMessages(prev => {
        const newMsgs = prev.filter(m => !m.isLoading);
        return [...newMsgs, { role: 'bot', text: data.response, original: data.original, lang: targetLang, id: Date.now() }];
      });

    } catch (e) {
      console.error(e);
      setMessages(prev => {
        const newMsgs = prev.filter(m => !m.isLoading);
        return [...newMsgs, { role: 'bot', text: "Error connecting to OMPOI Backend. Please ensure backend is running.", lang: 'en' }];
      });
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        await transcribeAudio(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };

  const transcribeAudio = async (audioBlob) => {
    setIsTranscribing(true);
    try {
      const formData = new FormData();
      formData.append('file', audioBlob, 'recording.webm');

      const response = await fetch('http://localhost:8000/transcribe', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Transcription failed');

      const data = await response.json();
      setInput(data.text);
    } catch (error) {
      console.error('Transcription error:', error);
      alert('Failed to transcribe audio. Please try again.');
    } finally {
      setIsTranscribing(false);
    }
  };

  const playTTS = async (text, language, messageId) => {
    try {
      // Stop any currently playing audio
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
        setPlayingMessageId(null);
      }

      setPlayingMessageId(messageId);

      const response = await fetch('http://localhost:8000/text-to-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language })
      });

      if (!response.ok) throw new Error('TTS failed');

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;

      audio.onended = () => {
        setPlayingMessageId(null);
        currentAudioRef.current = null;
        URL.revokeObjectURL(audioUrl);
      };

      await audio.play();
    } catch (error) {
      console.error('TTS error:', error);
      setPlayingMessageId(null);
      alert('Failed to play audio. Please try again.');
    }
  };

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#1a1a1a', color: '#e0e0e0' }}>
      {/* Narrow Sidebar - 68px */}
      <div className="w-[68px] flex flex-col items-center py-4 border-r" style={{ backgroundColor: '#0f0f0f', borderColor: '#2a2a2a' }}>
        {/* Logo */}
        <div className="w-8 h-8 mb-6 cursor-pointer">
          <svg viewBox="0 0 32 32" fill="none">
            <path d="M16 2L4 8v8c0 7.732 5.373 15.015 12 16.75 6.627-1.735 12-9.018 12-16.75V8L16 2z"
              stroke="#fff" strokeWidth="2" fill="none" />
            <path d="M12 16l3 3 6-6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        {/* Add Button */}
        <NavItem icon={<Plus size={24} />} onClick={() => setMessages([])} />

        <div className="w-8 h-px my-2" style={{ backgroundColor: '#2a2a2a' }} />

        {/* Navigation Items */}
        <NavItem icon={<Clock size={24} />} label="History" />
        <NavItem icon={<FileText size={24} />} label="Discover" />
        <NavItem icon={<Grid size={24} />} label="Spacials" />
        <NavItem icon={<TrendingUp size={24} />} label="Finance" />
        <NavItem icon={<MoreVertical size={24} />} label="More" />

        {/* Bottom Nav */}
        <div className="mt-auto w-full">
          <div className="w-8 h-px mx-auto mb-2" style={{ backgroundColor: '#2a2a2a' }} />
          <NavItem icon={<Bell size={24} />} hasNotification />
          <NavItem
            icon={<div className="w-6 h-6 rounded-full" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border: '2px solid #3b82f6' }} />}
            label="Account"
          />
          <NavItem icon={<ArrowUp size={24} />} label="Upgrade" hasDot />
          <NavItem icon={<Download size={24} />} label="Install" hasDot />
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative">
        {/* Chat Area */}
        <div className="flex-1 overflow-y-auto">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center p-10">
              {/* Brand */}
              <div className="mb-10 flex items-center gap-1">
                <span className="text-5xl font-light tracking-tight text-white">OMPOI</span>
                <span className="text-3xl font-semibold text-black px-3 py-1 rounded-lg" style={{ backgroundColor: '#20d4d4' }}>
                  Indic
                </span>
              </div>

              {/* Language Selectors */}
              <div className="flex gap-4 mb-8">
                <div className="flex flex-col gap-1">
                  <label className="text-xs" style={{ color: '#888' }}>From</label>
                  <select
                    value={sourceLang}
                    onChange={(e) => setSourceLang(e.target.value)}
                    className="bg-gray-700 border border-gray-600 rounded-lg text-white text-sm px-3 py-2 outline-none"
                  >
                    {languages.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                  </select>
                </div>

                <div className="flex items-end pb-2">
                  <svg className="w-5 h-5" style={{ color: '#888' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-xs" style={{ color: '#888' }}>To</label>
                  <select
                    value={targetLang}
                    onChange={(e) => setTargetLang(e.target.value)}
                    className="bg-gray-700 border border-gray-600 rounded-lg text-white text-sm px-3 py-2 outline-none"
                  >
                    {languages.map(l => <option key={l.code} value={l.code}>{l.name}</option>)}
                  </select>
                </div>
              </div>

              {/* Corner Icons */}
              <div className="absolute bottom-4 right-4 flex gap-3">
                <Settings size={20} className="opacity-50 hover:opacity-100 cursor-pointer transition-opacity" style={{ color: '#888' }} />
                <HelpCircle size={20} className="opacity-50 hover:opacity-100 cursor-pointer transition-opacity" style={{ color: '#888' }} />
              </div>
            </div>
          ) : (
            <div className="w-full">
              {messages.map((msg, idx) => (
                <div
                  key={idx}
                  className="py-8 px-4 border-b"
                  style={{
                    backgroundColor: msg.role === 'bot' ? '#232323' : 'transparent',
                    borderColor: '#2a2a2a'
                  }}
                >
                  <div className="max-w-3xl mx-auto flex gap-4">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-sm font-semibold"
                      style={{ backgroundColor: msg.role === 'bot' ? '#20d4d4' : '#667eea', color: '#000' }}
                    >
                      {msg.role === 'bot' ? 'O' : 'U'}
                    </div>
                    <div className="flex-1 pt-1">
                      {msg.isLoading ? (
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                        </div>
                      ) : (
                        <>
                          <div className="leading-7">{msg.text}</div>
                          {msg.original && msg.role === 'bot' && (
                            <div className="text-xs mt-1" style={{ color: '#888' }}>
                              Original: {msg.original}
                            </div>
                          )}
                          {msg.role === 'bot' && !msg.isLoading && (
                            <button
                              onClick={() => playTTS(msg.text, msg.lang, msg.id)}
                              className="mt-2 flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-sm"
                              style={{
                                backgroundColor: playingMessageId === msg.id ? '#20d4d4' : '#2a2a2a',
                                borderColor: playingMessageId === msg.id ? '#20d4d4' : '#3a3a3a',
                                color: playingMessageId === msg.id ? '#000' : '#888'
                              }}
                            >
                              {playingMessageId === msg.id ? (
                                <>
                                  <Square size={14} />
                                  <span>Playing...</span>
                                </>
                              ) : (
                                <>
                                  <Volume2 size={14} />
                                  <span>Listen</span>
                                </>
                              )}
                            </button>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Input Area - Always Visible at Bottom */}
        <div className="border-t p-4" style={{ borderColor: '#2a2a2a', backgroundColor: '#1a1a1a' }}>
          <div className="max-w-3xl mx-auto">
            <div className="rounded-xl p-4 border transition-all" style={{ backgroundColor: '#232323', borderColor: input ? '#20d4d4' : '#3a3a3a' }}>
              <input
                className="w-full bg-transparent border-none outline-none text-base mb-3"
                style={{ color: '#e0e0e0' }}
                placeholder="Ask anything. Type '@' for mentions and '/' for shortcuts."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
              />

              <div className="flex justify-between items-center">
                {/* Left Controls */}
                <div className="flex gap-2">
                  <ControlButton icon={<Search size={18} />} />
                  <ControlButton icon={<Link size={18} />} />
                  <ControlButton icon={<Grid size={18} />} />
                </div>

                {/* Right Controls */}
                <div className="flex gap-2">
                  <ControlButton icon={<Smile size={18} />} />
                  <ControlButton icon={<Image size={18} />} />
                  <ControlButton icon={<Paperclip size={18} />} />
                  <ControlButton
                    icon={isRecording ? <Square size={18} /> : <Mic size={18} />}
                    onClick={toggleRecording}
                    active={isRecording}
                    isRecording={isRecording}
                  />
                  <ControlButton
                    icon={<Send size={18} />}
                    onClick={handleSend}
                    active={input.trim().length > 0}
                    disabled={isTranscribing}
                  />
                </div>
              </div>
              {isTranscribing && (
                <div className="mt-2 text-xs" style={{ color: '#20d4d4' }}>
                  Transcribing audio...
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Nav Item Component
function NavItem({ icon, label, onClick, hasNotification, hasDot }) {
  return (
    <div
      className="w-full flex flex-col items-center py-3 cursor-pointer transition-colors hover:bg-gray-800 relative"
      onClick={onClick}
    >
      {hasNotification && <div className="absolute top-2 right-3 w-2 h-2 rounded-full" style={{ backgroundColor: '#3b82f6' }} />}
      {hasDot && <div className="absolute top-2 right-3 w-2 h-2 rounded-full" style={{ backgroundColor: '#ef4444' }} />}
      <div style={{ color: '#888' }} className="mb-1">{icon}</div>
      {label && <span className="text-[11px]" style={{ color: '#888' }}>{label}</span>}
    </div>
  );
}

// Control Button Component
function ControlButton({ icon, onClick, active, disabled, isRecording }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-all ${isRecording ? 'animate-pulse' : ''}`}
      style={{
        backgroundColor: active ? '#20d4d4' : '#2a2a2a',
        borderColor: active ? '#20d4d4' : '#3a3a3a',
        color: active ? '#000' : '#888',
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'not-allowed' : 'pointer'
      }}
    >
      {icon}
    </button>
  );
}

export default App;
