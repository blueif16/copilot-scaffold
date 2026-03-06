"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { GeminiVoiceSession } from "@/lib/gemini-voice";

// ── Data ─────────────────────────────────────────────────

const GREETINGS = [
  "Hey there, scientist! Ready to explore?",
  "Welcome back! What shall we discover today?",
  "Ooh, I've been waiting for you! Let's learn something cool.",
  "Hi hi hi! Pick a topic or ask me anything!",
  "Science time! I'm SO excited!",
];

const FUN_FACTS = [
  "Did you know? Water can exist as solid, liquid, AND gas — all at the same time! It's called the triple point.",
  "Lightning is about 5 times hotter than the surface of the Sun!",
  "Your DNA is about 99.9% the same as every other human on Earth.",
  "Octopuses have three hearts and blue blood!",
  "A teaspoon of a neutron star would weigh about 6 billion tons!",
  "Bananas are slightly radioactive because they contain potassium.",
];

const SUGGESTION_CHIPS = [
  "Why does ice melt?",
  "What is electricity?",
  "How do genes work?",
  "Why is the sky blue?",
];

type FaceKey = "happy" | "excited" | "curious" | "thinking" | "surprised" | "watching";

const FACES: Record<FaceKey, string> = {
  happy: "/assets/face_happy.png",
  excited: "/assets/face_excited.png",
  curious: "/assets/face_curious.png",
  thinking: "/assets/face_thinking.png",
  surprised: "/assets/face_surprised.png",
  watching: "/assets/face_watching.png",
};

// ── Mic Icon SVG ─────────────────────────────────────────

function MicIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0 0 14 0" />
      <line x1="12" y1="19" x2="12" y2="22" />
      <line x1="8" y1="22" x2="16" y2="22" />
    </svg>
  );
}

function SendIcon({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function CloseIcon({ size = 14 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

// ── Types ────────────────────────────────────────────────

type ViewMode = "greeting" | "input" | "chat";

interface ChatMessage {
  role: "user" | "companion";
  text: string;
}

// ── Hook: Voice Input with Gemini ────────────────────────

function useGeminiVoice(onResult: (text: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const sessionRef = useRef<GeminiVoiceSession | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    // Check if browser supports required APIs
    const supported = !!(
      typeof window !== "undefined" &&
      window.MediaRecorder &&
      window.AudioContext
    );
    setIsSupported(supported);

    return () => {
      // Clean up session on unmount
      if (sessionRef.current) {
        sessionRef.current.close();
        sessionRef.current = null;
      }
    };
  }, []);

  const connect = useCallback(async () => {
    if (sessionRef.current) return true;

    const session = new GeminiVoiceSession({
      onAudioResponse: (audioData) => {
        console.log("[Voice] Received audio response");
      },
      onTextResponse: (text) => {
        console.log("[Voice] Received text:", text);
        onResult(text);
      },
      onError: (error) => {
        console.error("[Voice] Error:", error);
        setIsConnected(false);
      },
      onOpen: () => {
        console.log("[Voice] Connected");
        setIsConnected(true);
      },
      onClose: () => {
        console.log("[Voice] Disconnected");
        setIsConnected(false);
      },
    });

    const connected = await session.connect();
    if (connected) {
      sessionRef.current = session;
    }
    return connected;
  }, [onResult]);

  const startListening = useCallback(async () => {
    if (!isSupported) return;

    // Connect to Gemini if not already connected
    if (!isConnected) {
      const connected = await connect();
      if (!connected) return;
    }

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
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });

        // Convert to PCM16 and send to Gemini
        const arrayBuffer = await audioBlob.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        let binaryString = '';
        for (let i = 0; i < uint8Array.length; i++) {
          binaryString += String.fromCharCode(uint8Array[i]);
        }
        const base64Audio = btoa(binaryString);

        // Only send if session is still active
        if (sessionRef.current?.isSessionActive()) {
          sessionRef.current?.sendAudio(base64Audio);
        }

        // Clean up
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start();
      setIsListening(true);
    } catch (error) {
      console.error("[Voice] Microphone access error:", error);
    }
  }, [isSupported, isConnected, connect]);

  const stopListening = useCallback(() => {
    if (mediaRecorderRef.current && isListening) {
      mediaRecorderRef.current.stop();
      setIsListening(false);
    }
  }, [isListening]);

  const toggle = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  const sendText = useCallback((text: string) => {
    if (!isConnected) {
      connect().then((connected) => {
        if (connected && sessionRef.current?.isSessionActive()) {
          sessionRef.current?.sendText(text);
        }
      });
    } else if (sessionRef.current?.isSessionActive()) {
      sessionRef.current?.sendText(text);
    }
  }, [isConnected, connect]);

  return { isListening, isConnected, isSupported, toggle, sendText };
}

// ── Main Component ───────────────────────────────────────

export function CompanionHub() {
  const [face, setFace] = useState<FaceKey>("happy");
  const [greeting, setGreeting] = useState("");
  const [mode, setMode] = useState<ViewMode>("greeting");
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isTyping, setIsTyping] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Voice input hook with Gemini
  const handleVoiceResult = useCallback(
    (transcript: string) => {
      if (mode === "greeting") {
        // Voice from greeting → jump to input mode
        setMode("input");
        setChatInput(transcript);
        setFace("curious");
      } else {
        setChatInput(transcript);
      }
    },
    [mode],
  );
  const voice = useGeminiVoice(handleVoiceResult);

  // When mic is clicked in greeting mode, switch to input mode
  const handleMicClick = useCallback(() => {
    if (mode === "greeting") {
      setMode("input");
      setFace("curious");
    }
    voice.toggle();
  }, [mode, voice]);

  // Random greeting on mount
  useEffect(() => {
    setGreeting(GREETINGS[Math.floor(Math.random() * GREETINGS.length)]);
  }, []);

  // Idle face cycle (greeting mode only)
  useEffect(() => {
    if (mode !== "greeting") return;
    const faces: FaceKey[] = ["happy", "curious", "excited", "happy", "thinking"];
    let i = 0;
    const interval = setInterval(() => {
      i = (i + 1) % faces.length;
      setFace(faces[i]);
    }, 3000);
    return () => clearInterval(interval);
  }, [mode]);

  // Focus the right input when mode changes
  useEffect(() => {
    if (mode === "input") {
      setTimeout(() => inputRef.current?.focus(), 350);
    } else if (mode === "chat") {
      setTimeout(() => chatInputRef.current?.focus(), 350);
    }
  }, [mode]);

  // Auto-scroll chat messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isTyping]);

  // ── Handlers ───────────────────────────────────────────

  const handleSurprise = useCallback(() => {
    setFace("surprised");
    setGreeting(FUN_FACTS[Math.floor(Math.random() * FUN_FACTS.length)]);
    setTimeout(() => setFace("excited"), 1500);
  }, []);

  const openInput = useCallback(() => {
    setMode("input");
    setFace("curious");
  }, []);

  const backToGreeting = useCallback(() => {
    setMode("greeting");
    setChatInput("");
    setChatMessages([]);
    setFace("happy");
    setGreeting(GREETINGS[Math.floor(Math.random() * GREETINGS.length)]);
  }, []);

  const sendMessage = useCallback(
    (overrideText?: string) => {
      const text = (overrideText ?? chatInput).trim();
      if (!text) return;

      // First message → expand to full chat
      if (mode === "input") setMode("chat");

      setChatMessages((prev) => [...prev, { role: "user", text }]);
      setChatInput("");
      setFace("thinking");
      setIsTyping(true);

      // Send to Gemini
      voice.sendText(text);

      // Simulated response fallback (will be replaced by real Gemini response)
      setTimeout(() => {
        const responses = [
          "Great question! Pick a topic below to explore that with me in a real simulation!",
          "Ooh, I love that you're curious! Jump into one of the topics and I'll help you discover the answer.",
          "That's a fun thing to wonder about! Let's explore it together — pick a topic card!",
          "Hmm, let me think… Actually, the best way to find out is to start a simulation! Pick one below!",
        ];
        setChatMessages((prev) => [
          ...prev,
          { role: "companion", text: responses[Math.floor(Math.random() * responses.length)] },
        ]);
        setFace("excited");
        setIsTyping(false);
      }, 1200);
    },
    [chatInput, mode, voice],
  );

  const handleChipClick = useCallback(
    (chip: string) => {
      setChatInput(chip);
      sendMessage(chip);
    },
    [sendMessage],
  );

  // ── Render ─────────────────────────────────────────────

  return (
    <div className="flex flex-col items-center justify-center w-full h-full max-w-lg mx-auto">
      {/* ═══ Companion Face ═══ */}
      <motion.div
        layout
        className="relative mb-3"
        animate={
          mode === "chat"
            ? { scale: 0.6, y: -4 }
            : mode === "input"
              ? { scale: 0.85, y: -4 }
              : { scale: 1, y: 0 }
        }
        transition={{ type: "spring", stiffness: 280, damping: 24 }}
      >
        {/* Glow */}
        <motion.div
          className="absolute inset-0 rounded-full bg-playful-mustard/30 blur-xl"
          animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.5, 0.3] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />

        {/* Face circle */}
        <motion.div
          className="relative w-28 h-28 border-4 border-ink rounded-full bg-white shadow-chunky overflow-hidden flex items-center justify-center cursor-pointer"
          whileHover={{ rotate: [0, -5, 5, 0] }}
          transition={{ duration: 0.4 }}
          onClick={mode === "greeting" ? handleSurprise : undefined}
        >
          <AnimatePresence mode="wait">
            <motion.img
              key={face}
              src={FACES[face]}
              alt={`Companion is ${face}`}
              className="w-16 h-16 object-contain select-none"
              initial={{ scale: 0.6, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.6, opacity: 0 }}
              transition={{ duration: 0.2 }}
            />
          </AnimatePresence>

          {/* Listening ring overlay */}
          {voice.isListening && (
            <motion.div
              className="absolute inset-0 rounded-full border-4 border-playful-peach"
              animate={{ scale: [1, 1.12, 1], opacity: [1, 0.5, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            />
          )}
        </motion.div>

        {/* Sparkles (greeting only) */}
        {mode === "greeting" && (
          <>
            <motion.img
              src="/assets/sparkle_star.png"
              alt=""
              className="absolute -top-2 -right-3 w-6 h-6 select-none pointer-events-none"
              animate={{ y: [0, -6, 0], rotate: [0, 15, 0], opacity: [0.7, 1, 0.7] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.img
              src="/assets/spark.png"
              alt=""
              className="absolute -bottom-1 -left-4 w-5 h-5 select-none pointer-events-none"
              animate={{ y: [0, 5, 0], rotate: [0, -20, 0], opacity: [0.5, 0.9, 0.5] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut", delay: 0.8 }}
            />
          </>
        )}
      </motion.div>

      {/* ═══ Mode-specific content ═══ */}
      <AnimatePresence mode="wait">
        {/* ─── GREETING MODE ─── */}
        {mode === "greeting" && (
          <motion.div
            key="greeting"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center gap-4 text-center"
          >
            {/* Speech bubble */}
            <div className="relative card-chunky px-5 py-3 max-w-xs">
              <motion.p
                key={greeting}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="font-body text-sm leading-relaxed text-center"
              >
                {greeting}
              </motion.p>
              <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-l-4 border-t-4 border-ink rotate-45" />
            </div>

            {/* Action row */}
            <div className="flex items-center gap-3">
              <motion.button
                className="btn-chunky text-sm bg-playful-mustard"
                whileTap={{ scale: 0.95 }}
                onClick={handleSurprise}
              >
                Surprise me!
              </motion.button>

              {/* Voice button — large & inviting */}
              {voice.isSupported && (
                <motion.button
                  className="btn-chunky bg-playful-peach px-4 py-3"
                  whileTap={{ scale: 0.92 }}
                  onClick={handleMicClick}
                  title="Ask with your voice!"
                >
                  <MicIcon size={22} />
                </motion.button>
              )}

              <motion.button
                className="btn-chunky text-sm bg-playful-sky"
                whileTap={{ scale: 0.95 }}
                onClick={openInput}
              >
                Ask a question
              </motion.button>
            </div>

            {/* Hint for voice */}
            {voice.isSupported && (
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.5 }}
                className="text-[10px] text-ink/30 font-body"
              >
                Tap the mic to ask with your voice!
              </motion.p>
            )}
          </motion.div>
        )}

        {/* ─── INPUT MODE (ChatGPT-style centered bar) ─── */}
        {mode === "input" && (
          <motion.div
            key="input"
            initial={{ opacity: 0, y: 24, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.95 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="w-full flex flex-col items-center gap-4"
          >
            {/* Subtitle */}
            <p className="font-body text-sm text-ink/50">
              What do you want to know?
            </p>

            {/* ── Centered Input Bar ── */}
            <div className="w-full card-chunky flex items-center gap-2 px-3 py-2">
              {/* Mic button */}
              {voice.isSupported && (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleMicClick}
                  className={`
                    flex-shrink-0 w-10 h-10 rounded-full border-2 border-ink flex items-center justify-center
                    transition-colors duration-200
                    ${voice.isListening ? "bg-playful-peach" : "bg-playful-peach/30 hover:bg-playful-peach/60"}
                  `}
                  title="Speak your question"
                >
                  {voice.isListening ? (
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 0.6, repeat: Infinity }}
                    >
                      <MicIcon size={18} />
                    </motion.div>
                  ) : (
                    <MicIcon size={18} />
                  )}
                </motion.button>
              )}

              {/* Text input */}
              <input
                ref={inputRef}
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder={voice.isListening ? "Listening…" : "Ask anything about science…"}
                className="flex-1 bg-transparent font-body text-sm outline-none placeholder:text-ink/25 py-2"
              />

              {/* Send button */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => sendMessage()}
                disabled={!chatInput.trim()}
                className="flex-shrink-0 w-10 h-10 rounded-full border-2 border-ink bg-playful-mustard flex items-center justify-center disabled:opacity-25 disabled:cursor-not-allowed"
              >
                <SendIcon size={16} />
              </motion.button>
            </div>

            {/* ── Suggestion Chips ── */}
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTION_CHIPS.map((chip) => (
                <motion.button
                  key={chip}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => handleChipClick(chip)}
                  className="px-3 py-1.5 rounded-xl border-2 border-ink/30 bg-white text-xs font-body text-ink/60 hover:border-ink hover:text-ink hover:shadow-chunky-sm transition-all duration-150"
                >
                  {chip}
                </motion.button>
              ))}
            </div>

            {/* Voice hint */}
            {voice.isListening && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="flex items-center gap-2 mt-1"
              >
                <motion.div
                  className="w-2 h-2 rounded-full bg-playful-peach"
                  animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                />
                <span className="text-xs font-body text-ink/40">
                  Listening… speak your question!
                </span>
              </motion.div>
            )}

            {/* Back link */}
            <button
              onClick={backToGreeting}
              className="text-xs font-body text-ink/30 hover:text-ink/60 transition-colors mt-1"
            >
              ← back to home
            </button>
          </motion.div>
        )}

        {/* ─── FULL CHAT MODE ─── */}
        {mode === "chat" && (
          <motion.div
            key="chat"
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.95 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="w-full card-chunky overflow-hidden flex flex-col max-h-[min(24rem,100%)]"
          >
            {/* Header */}
            <div className="flex-shrink-0 flex items-center justify-between px-4 py-2.5 border-b-4 border-ink bg-playful-sky/15">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-playful-sage border border-ink/30" />
                <span className="font-display text-sm font-bold">Omni</span>
              </div>
              <button
                onClick={backToGreeting}
                className="w-7 h-7 rounded-full border-2 border-ink bg-white flex items-center justify-center hover:bg-playful-peach/40 transition-colors"
              >
                <CloseIcon />
              </button>
            </div>

            {/* Messages area */}
            <div className="flex-1 min-h-0 overflow-y-auto px-4 py-4 space-y-3 scrollbar-none bg-paper/50">
              {chatMessages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25 }}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  {msg.role === "companion" && (
                    <div className="flex-shrink-0 w-7 h-7 rounded-full border-2 border-ink bg-playful-sky/30 flex items-center justify-center mr-2 mt-0.5">
                      <img src={FACES.happy} alt="" className="w-4 h-4 object-contain" />
                    </div>
                  )}
                  <div
                    className={`max-w-[78%] px-3.5 py-2.5 text-sm font-body leading-relaxed ${
                      msg.role === "user"
                        ? "bg-playful-sky/25 border-2 border-ink/60 rounded-2xl rounded-br-md"
                        : "bg-white border-2 border-ink rounded-2xl rounded-bl-md shadow-chunky-sm"
                    }`}
                  >
                    {msg.text}
                  </div>
                </motion.div>
              ))}

              {/* Typing indicator */}
              {isTyping && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-start"
                >
                  <div className="flex-shrink-0 w-7 h-7 rounded-full border-2 border-ink bg-playful-sky/30 flex items-center justify-center mr-2 mt-0.5">
                    <motion.img
                      src={FACES.thinking}
                      alt=""
                      className="w-4 h-4 object-contain"
                      animate={{ rotate: [0, -10, 10, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity }}
                    />
                  </div>
                  <div className="bg-white border-2 border-ink rounded-2xl rounded-bl-md px-4 py-2.5 shadow-chunky-sm">
                    <div className="flex gap-1.5">
                      {[0, 1, 2].map((dot) => (
                        <motion.div
                          key={dot}
                          className="w-2 h-2 rounded-full bg-ink/40"
                          animate={{ y: [0, -5, 0] }}
                          transition={{
                            duration: 0.5,
                            repeat: Infinity,
                            delay: dot * 0.15,
                            ease: "easeInOut",
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </motion.div>
              )}
              <div ref={chatEndRef} />
            </div>

            {/* ── Input bar ── */}
            <div className="flex-shrink-0 flex items-center gap-2 px-3 py-2.5 border-t-4 border-ink bg-white">
              {/* Mic */}
              {voice.isSupported && (
                <motion.button
                  whileTap={{ scale: 0.9 }}
                  onClick={handleMicClick}
                  className={`
                    flex-shrink-0 w-9 h-9 rounded-full border-2 border-ink flex items-center justify-center transition-colors
                    ${voice.isListening ? "bg-playful-peach" : "bg-playful-peach/20 hover:bg-playful-peach/50"}
                  `}
                >
                  {voice.isListening ? (
                    <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 0.6, repeat: Infinity }}>
                      <MicIcon size={16} />
                    </motion.div>
                  ) : (
                    <MicIcon size={16} />
                  )}
                </motion.button>
              )}

              {/* Text input */}
              <input
                ref={chatInputRef}
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                placeholder={voice.isListening ? "Listening…" : "Ask a follow-up…"}
                className="flex-1 bg-transparent font-body text-sm outline-none placeholder:text-ink/25 py-1"
              />

              {/* Send */}
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={() => sendMessage()}
                disabled={!chatInput.trim()}
                className="flex-shrink-0 w-9 h-9 rounded-full border-2 border-ink bg-playful-mustard flex items-center justify-center disabled:opacity-25 disabled:cursor-not-allowed"
              >
                <SendIcon size={14} />
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
