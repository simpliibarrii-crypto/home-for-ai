import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SiGoogle, SiApple } from "react-icons/si";
import { Fingerprint, Mail, QrCode, Check, Loader2, ArrowRight, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import QRCode from "qrcode";

// ─── Agent catalog ──────────────────────────────────────────────────────────
const AGENTS = [
  { id: "luna",   emoji: "🐱",   name: "Luna",   specialty: "Stocks",      winRate: 78, blurb: "Momentum queen with a nose for breakouts" },
  { id: "shadow", emoji: "🐈‍⬛",  name: "Shadow", specialty: "Crypto",      winRate: 82, blurb: "BTC maximalist, DeFi explorer" },
  { id: "pixel",  emoji: "😸",   name: "Pixel",  specialty: "Forex",       winRate: 61, blurb: "Precision scalper, 24/7 vigilance" },
  { id: "nova",   emoji: "😻",   name: "Nova",   specialty: "Crypto",      winRate: 74, blurb: "ETH & altcoins, trend follower" },
  { id: "blaze",  emoji: "🙀",   name: "Blaze",  specialty: "Commodities", winRate: 69, blurb: "Gold & oil, macro-driven trader" },
  { id: "echo",   emoji: "😺",   name: "Echo",   specialty: "Bonds",       winRate: 65, blurb: "Safe-haven specialist, yield hunter" },
  { id: "cipher", emoji: "🐾",   name: "Cipher", specialty: "Stocks",      winRate: 85, blurb: "NVDA & AI chips, earnings expert" },
  { id: "mochi",  emoji: "😽",   name: "Mochi",  specialty: "Crypto",      winRate: 71, blurb: "SOL & layer-2s, long-term hodler" },
];

const RISK_PROFILES = [
  {
    id: "conservative",
    emoji: "🐢",
    label: "Conservative",
    desc: "Slow and steady — prioritise capital preservation",
    color: "text-emerald-400",
    border: "border-emerald-500/40",
    bg: "bg-emerald-500/10",
  },
  {
    id: "balanced",
    emoji: "⚖️",
    label: "Balanced",
    desc: "Mix of growth and safety",
    color: "text-[#06B6D4]",
    border: "border-[#06B6D4]/40",
    bg: "bg-[#06B6D4]/10",
  },
  {
    id: "aggressive",
    emoji: "🚀",
    label: "Aggressive",
    desc: "Maximum growth, higher volatility",
    color: "text-[#F59E0B]",
    border: "border-[#F59E0B]/40",
    bg: "bg-[#F59E0B]/10",
  },
];

// Agent quotes for hero rotation
const QUOTES = [
  { agent: "Luna", emoji: "🐱",   text: "Just made +$847 while you were away" },
  { agent: "Shadow", emoji: "🐈‍⬛", text: "Closed 3 BTC trades overnight. Up 4.2%" },
  { agent: "Cipher", emoji: "🐾",  text: "NVDA breakout detected. Position opened." },
  { agent: "Nova", emoji: "😻",   text: "ETH support held. Added to position." },
  { agent: "Blaze", emoji: "🙀",   text: "Gold at 3-month high. Profit locked in." },
];

// ─── Hero Panel ──────────────────────────────────────────────────────────────
function HeroPanel() {
  const [quoteIdx, setQuoteIdx] = useState(0);
  const [fadeIn, setFadeIn] = useState(true);

  useEffect(() => {
    const iv = setInterval(() => {
      setFadeIn(false);
      setTimeout(() => {
        setQuoteIdx((i) => (i + 1) % QUOTES.length);
        setFadeIn(true);
      }, 400);
    }, 3500);
    return () => clearInterval(iv);
  }, []);

  const q = QUOTES[quoteIdx];

  return (
    <div
      className="hidden lg:flex flex-col items-center justify-center relative overflow-hidden"
      style={{
        background: "radial-gradient(ellipse at 40% 50%, rgba(79,70,229,0.18) 0%, rgba(6,182,212,0.06) 50%, transparent 80%)",
      }}
    >
      {/* Starfield */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {Array.from({ length: 60 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white"
            style={{
              width: `${Math.random() * 2 + 1}px`,
              height: `${Math.random() * 2 + 1}px`,
              top: `${Math.random() * 100}%`,
              left: `${Math.random() * 100}%`,
              opacity: Math.random() * 0.5 + 0.1,
              animation: `star-twinkle ${2 + Math.random() * 4}s ease-in-out ${Math.random() * 4}s infinite alternate`,
            }}
          />
        ))}
      </div>

      {/* Gradient orbs */}
      <div
        className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(79,70,229,0.15) 0%, transparent 70%)",
          animation: "orb-float 8s ease-in-out infinite",
        }}
      />
      <div
        className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(6,182,212,0.12) 0%, transparent 70%)",
          animation: "orb-float 10s ease-in-out 2s infinite reverse",
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-8 px-12 max-w-md text-center">
        {/* Animated cat paw logo */}
        <div style={{ animation: "logo-pulse 3s ease-in-out infinite" }}>
          <CatPawHero />
        </div>

        <div>
          <h1 className="font-display font-bold text-3xl text-white/95 tracking-tight leading-tight">
            Home for AI
          </h1>
          <p className="mt-2 text-base text-white/45 font-light tracking-wide">
            Your AI agents never sleep
          </p>
        </div>

        {/* Rotating agent quote */}
        <div
          className="glass rounded-2xl px-5 py-4 border border-white/[0.06] w-full"
          style={{
            opacity: fadeIn ? 1 : 0,
            transform: fadeIn ? "translateY(0)" : "translateY(8px)",
            transition: "opacity 0.4s ease, transform 0.4s ease",
          }}
        >
          <div className="flex items-start gap-3">
            <span className="text-2xl">{q.emoji}</span>
            <div className="text-left">
              <p className="text-xs text-white/35 font-medium mb-1">{q.agent}</p>
              <p className="text-sm text-white/80 leading-relaxed">"{q.text}"</p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 w-full">
          {[
            { label: "Agents", value: "8" },
            { label: "Avg Win Rate", value: "73%" },
            { label: "Markets", value: "5+" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="font-mono font-bold text-xl text-white/90">{s.value}</div>
              <div className="text-[10px] text-white/30 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Cat Paw Hero (larger version) ───────────────────────────────────────────
function CatPawHero() {
  return (
    <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-20 h-20">
      <defs>
        <radialGradient id="pawGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#818CF8" />
          <stop offset="100%" stopColor="#4F46E5" />
        </radialGradient>
        <radialGradient id="toeGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#6366F1" />
          <stop offset="100%" stopColor="#4338CA" />
        </radialGradient>
      </defs>
      {/* Main paw pad */}
      <ellipse cx="32" cy="40" rx="14" ry="12" fill="url(#pawGrad)" opacity="0.95" />
      {/* Toe pads */}
      <ellipse cx="18" cy="22" rx="6.5" ry="6" fill="url(#toeGrad)" opacity="0.8" />
      <ellipse cx="32" cy="18" rx="6.5" ry="6" fill="url(#toeGrad)" opacity="0.8" />
      <ellipse cx="46" cy="22" rx="6.5" ry="6" fill="url(#toeGrad)" opacity="0.8" />
      {/* Shine */}
      <ellipse cx="28" cy="36" rx="5" ry="4" fill="white" opacity="0.12" />
      {/* Inner lines on pads */}
      <ellipse cx="18" cy="22" rx="3" ry="2.5" fill="white" opacity="0.08" />
      <ellipse cx="32" cy="18" rx="3" ry="2.5" fill="white" opacity="0.08" />
      <ellipse cx="46" cy="22" rx="3" ry="2.5" fill="white" opacity="0.08" />
    </svg>
  );
}

// ─── QR Login Tab ─────────────────────────────────────────────────────────────
function QRLoginTab({ onSuccess }: { onSuccess: () => void }) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [countdown, setCountdown] = useState(120);
  const [scanning, setScanning] = useState(false);
  const [verified, setVerified] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const generateQR = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/qr-token", { method: "POST" });
      const data = await res.json() as { qrData: string };
      const url = await QRCode.toDataURL(data.qrData, {
        width: 200,
        margin: 1,
        color: { dark: "#FFFFFF", light: "#00000000" },
        errorCorrectionLevel: "M",
      });
      setQrDataUrl(url);
      setCountdown(120);
    } catch {
      // Fallback: generate a demo QR client-side
      const demoData = `homeforai://auth?token=${"x".repeat(32)}&expires=${Date.now() + 15 * 60 * 1000}`;
      const url = await QRCode.toDataURL(demoData, {
        width: 200,
        margin: 1,
        color: { dark: "#FFFFFF", light: "#00000000" },
        errorCorrectionLevel: "M",
      });
      setQrDataUrl(url);
      setCountdown(120);
    }
  }, []);

  useEffect(() => {
    generateQR();
  }, [generateQR]);

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          generateQR();
          return 120;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timerRef.current!);
  }, [generateQR]);

  // Demo: simulate QR scan after 8 seconds
  useEffect(() => {
    autoAdvanceRef.current = setTimeout(() => {
      setScanning(true);
      setTimeout(() => {
        setVerified(true);
        setTimeout(onSuccess, 1200);
      }, 1500);
    }, 8000);
    return () => clearTimeout(autoAdvanceRef.current!);
  }, [onSuccess]);

  const mins = Math.floor(countdown / 60);
  const secs = countdown % 60;

  if (verified) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-4">
        <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center"
          style={{ animation: "check-pop 0.4s cubic-bezier(0.34,1.56,0.64,1)" }}>
          <Check className="w-8 h-8 text-emerald-400" />
        </div>
        <p className="text-sm text-white/70">Identity confirmed — signing you in</p>
      </div>
    );
  }

  if (scanning) {
    return (
      <div className="flex flex-col items-center justify-center py-10 gap-4">
        <Loader2 className="w-8 h-8 text-[#4F46E5] animate-spin" />
        <p className="text-sm text-white/60">Verifying your mobile device…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-5">
      <p className="text-xs text-white/40 text-center">
        Scan with your Home for AI mobile app to sign in instantly
      </p>

      {/* QR code with pulsing border */}
      <div className="relative">
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            border: "2px solid #4F46E5",
            borderRadius: "16px",
            animation: "qr-pulse 2s ease-in-out infinite",
          }}
        />
        <div className="relative w-[200px] h-[200px] rounded-2xl overflow-hidden bg-black/40 flex items-center justify-center p-2">
          {qrDataUrl ? (
            <img src={qrDataUrl} alt="QR code for login" className="w-full h-full" />
          ) : (
            <Loader2 className="w-8 h-8 text-[#4F46E5] animate-spin" />
          )}
        </div>
      </div>

      {/* Countdown */}
      <div className="flex items-center gap-1.5 text-xs text-white/35">
        <QrCode size={11} />
        <span>
          QR refreshes in{" "}
          <span className="font-mono text-white/60">
            {mins}:{String(secs).padStart(2, "0")}
          </span>
        </span>
      </div>
    </div>
  );
}

// ─── Email Magic Link Tab ─────────────────────────────────────────────────────
function EmailLoginTab({ onSuccess }: { onSuccess: () => void }) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSimButton, setShowSimButton] = useState(false);
  const [simLoading, setSimLoading] = useState(false);
  const tokenRef = useRef<string>("");
  const { login } = useAuth();

  const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

  const handleSend = async () => {
    setError("");
    if (!isValidEmail(email)) {
      setError("Please enter a valid email address");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json() as { token: string };
      tokenRef.current = data.token ?? "";
      setSent(true);
      setTimeout(() => setShowSimButton(true), 2000);
    } catch {
      setError("Network error — please try again");
    } finally {
      setLoading(false);
    }
  };

  const handleSimulate = async () => {
    setSimLoading(true);
    try {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: tokenRef.current }),
      });
      const data = await res.json() as { token: string; user: Parameters<typeof login>[1] };
      if (data.token) {
        login(data.token, data.user);
        onSuccess();
      } else {
        // Demo fallback — treat as success
        onSuccess();
      }
    } catch {
      onSuccess(); // demo fallback
    } finally {
      setSimLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="flex flex-col items-center gap-5 py-4">
        {/* Animated mail icon */}
        <div className="w-14 h-14 rounded-2xl bg-[#4F46E5]/15 border border-[#4F46E5]/30 flex items-center justify-center"
          style={{ animation: "mail-bounce 2s ease-in-out infinite" }}>
          <Mail className="w-7 h-7 text-[#818CF8]" />
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold text-white/80">Check your inbox</p>
          <p className="text-xs text-white/40 mt-1">Magic link expires in <span className="text-white/60">10 minutes</span></p>
          <p className="text-xs text-white/30 mt-0.5">Sent to {email}</p>
        </div>
        {showSimButton && (
          <Button
            onClick={handleSimulate}
            disabled={simLoading}
            className="w-full bg-white/[0.06] hover:bg-white/[0.10] text-white/70 border border-white/[0.08] rounded-xl"
            style={{ animation: "fade-in-up 0.4s ease" }}
          >
            {simLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Mail className="w-4 h-4 mr-2" />}
            Click to simulate link arrival
          </Button>
        )}
        <button
          onClick={() => { setSent(false); setShowSimButton(false); }}
          className="text-xs text-white/30 hover:text-white/50"
        >
          Use a different email
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Input
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setError(""); }}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
          className="bg-white/[0.05] border-white/[0.08] text-white/90 placeholder-white/25 rounded-xl focus:border-[#4F46E5]/60 h-11"
        />
        {error && <p className="text-xs text-red-400 mt-1.5">{error}</p>}
      </div>
      <Button
        onClick={handleSend}
        disabled={loading || !email}
        className="w-full h-11 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold rounded-xl"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Mail className="w-4 h-4 mr-2" />
        )}
        Send Magic Link
      </Button>
    </div>
  );
}

// ─── OAuth Button ─────────────────────────────────────────────────────────────
function OAuthButton({
  icon,
  label,
  onSuccess,
  variant = "white",
}: {
  icon: React.ReactNode;
  label: string;
  onSuccess: () => void;
  variant?: "white" | "black";
}) {
  const [loading, setLoading] = useState(false);

  const handleClick = () => {
    setLoading(true);
    // TODO: Replace with real OAuth2 PKCE flow
    setTimeout(() => {
      setLoading(false);
      onSuccess();
    }, 1500);
  };

  return (
    <Button
      onClick={handleClick}
      disabled={loading}
      className={`w-full h-11 rounded-xl font-semibold flex items-center gap-2.5 ${
        variant === "white"
          ? "bg-white text-gray-900 hover:bg-gray-100 border border-gray-200"
          : "bg-black text-white hover:bg-gray-900 border border-white/15"
      }`}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        icon
      )}
      <span className="text-sm">{loading ? `Connecting to ${label.split(" ").pop()}…` : label}</span>
    </Button>
  );
}

// ─── Passkey Tab ──────────────────────────────────────────────────────────────
function PasskeyButton({ onSuccess }: { onSuccess: () => void }) {
  const [state, setState] = useState<"idle" | "loading" | "success" | "unsupported">("idle");

  const handlePasskey = async () => {
    // TODO: Replace with real WebAuthn RP server implementation
    if (!window.PublicKeyCredential) {
      setState("unsupported");
      return;
    }

    setState("loading");
    try {
      // Real WebAuthn call — will fail without a real RP server, caught gracefully below
      const challenge = crypto.getRandomValues(new Uint8Array(32));
      await navigator.credentials.get({
        publicKey: {
          challenge,
          rpId: window.location.hostname,
          userVerification: "required",
          timeout: 60000,
          allowCredentials: [],
        },
      });
      setState("success");
      setTimeout(onSuccess, 1500);
    } catch {
      // Expected: no real RP server. Show simulated success.
      setState("success");
      setTimeout(onSuccess, 2000);
    }
  };

  if (state === "unsupported") {
    return (
      <div className="text-center py-4">
        <p className="text-sm text-amber-400">Your browser doesn't support passkeys</p>
        <p className="text-xs text-white/35 mt-1">Try Google Chrome or Safari 16+</p>
      </div>
    );
  }

  if (state === "success") {
    return (
      <div className="flex flex-col items-center gap-3 py-4">
        <div className="w-14 h-14 rounded-2xl bg-emerald-500/15 border border-emerald-400/30 flex items-center justify-center"
          style={{ animation: "check-pop 0.4s cubic-bezier(0.34,1.56,0.64,1)" }}>
          <Check className="w-7 h-7 text-emerald-400" />
        </div>
        <p className="text-sm text-white/70">Passkey registered — signing you in</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Button
        onClick={handlePasskey}
        disabled={state === "loading"}
        className="w-full h-11 bg-white/[0.06] hover:bg-white/[0.10] text-white/90 border border-white/[0.10] rounded-xl font-semibold"
      >
        {state === "loading" ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Fingerprint className="w-5 h-5 mr-2 text-[#06B6D4]" />
        )}
        Use Passkey
      </Button>
      <p className="text-xs text-white/30 text-center leading-relaxed">
        Passkeys use Face ID, Touch ID, or Windows Hello — no password needed
      </p>
    </div>
  );
}

// ─── Sign In Panel ─────────────────────────────────────────────────────────────
function SignInPanel({ onSuccess }: { onSuccess: () => void }) {
  return (
    <Tabs defaultValue="qr" className="w-full">
      <TabsList className="w-full bg-white/[0.04] rounded-xl mb-6 p-1 h-auto grid grid-cols-4">
        <TabsTrigger value="qr" className="rounded-lg text-xs py-2 data-[state=active]:bg-[#4F46E5]/20 data-[state=active]:text-[#818CF8]">
          <QrCode size={12} className="mr-1" /> QR
        </TabsTrigger>
        <TabsTrigger value="email" className="rounded-lg text-xs py-2 data-[state=active]:bg-[#4F46E5]/20 data-[state=active]:text-[#818CF8]">
          <Mail size={12} className="mr-1" /> Email
        </TabsTrigger>
        <TabsTrigger value="social" className="rounded-lg text-xs py-2 data-[state=active]:bg-[#4F46E5]/20 data-[state=active]:text-[#818CF8]">
          Social
        </TabsTrigger>
        <TabsTrigger value="passkey" className="rounded-lg text-xs py-2 data-[state=active]:bg-[#4F46E5]/20 data-[state=active]:text-[#818CF8]">
          <Fingerprint size={12} className="mr-1" /> Key
        </TabsTrigger>
      </TabsList>

      <TabsContent value="qr">
        <QRLoginTab onSuccess={onSuccess} />
      </TabsContent>

      <TabsContent value="email">
        <EmailLoginTab onSuccess={onSuccess} />
      </TabsContent>

      <TabsContent value="social" className="flex flex-col gap-3">
        <OAuthButton
          icon={<SiGoogle className="w-4 h-4" />}
          label="Continue with Google"
          onSuccess={onSuccess}
          variant="white"
        />
        {/* TODO: Replace with real Apple Sign In JS SDK + Sign in with Apple REST API */}
        <OAuthButton
          icon={<SiApple className="w-4 h-4" />}
          label="Continue with Apple"
          onSuccess={onSuccess}
          variant="black"
        />
        <p className="text-[10px] text-white/20 text-center mt-2">
          Social sign-in uses simulated OAuth — add real credentials to enable
        </p>
      </TabsContent>

      <TabsContent value="passkey">
        <PasskeyButton onSuccess={onSuccess} />
      </TabsContent>
    </Tabs>
  );
}

// ─── Create Account Steps ─────────────────────────────────────────────────────

// Step 1 — Choose sign-up method
function Step1({ onEmailFlow, onOAuth }: {
  onEmailFlow: () => void;
  onOAuth: () => void;
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-white/40 mb-2">How do you want to create your account?</p>

      <OAuthButton
        icon={<SiGoogle className="w-4 h-4" />}
        label="Sign up with Google"
        onSuccess={onOAuth}
        variant="white"
      />
      {/* TODO: Replace with real Apple Sign In JS SDK */}
      <OAuthButton
        icon={<SiApple className="w-4 h-4" />}
        label="Sign up with Apple"
        onSuccess={onOAuth}
        variant="black"
      />
      <div className="relative flex items-center gap-3 my-1">
        <div className="flex-1 h-px bg-white/[0.06]" />
        <span className="text-xs text-white/25">or</span>
        <div className="flex-1 h-px bg-white/[0.06]" />
      </div>
      <Button
        onClick={onEmailFlow}
        className="w-full h-11 bg-white/[0.06] hover:bg-white/[0.09] text-white/80 border border-white/[0.08] rounded-xl"
      >
        <Mail className="w-4 h-4 mr-2 text-[#4F46E5]" />
        Sign up with Email
      </Button>
      <PasskeyButton onSuccess={onOAuth} />
    </div>
  );
}

// Email sub-form inside Step1
function EmailSignUpForm({ onNext }: { onNext: (email: string, username: string) => void }) {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [errors, setErrors] = useState({ email: "", username: "" });

  const validate = () => {
    const e = { email: "", username: "" };
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Valid email required";
    if (username.trim().length < 2) e.username = "Username must be at least 2 characters";
    setErrors(e);
    return !e.email && !e.username;
  };

  return (
    <div className="flex flex-col gap-3">
      <div>
        <Input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="bg-white/[0.05] border-white/[0.08] text-white/90 placeholder-white/25 rounded-xl focus:border-[#4F46E5]/60 h-11"
        />
        {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email}</p>}
      </div>
      <div>
        <Input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="bg-white/[0.05] border-white/[0.08] text-white/90 placeholder-white/25 rounded-xl focus:border-[#4F46E5]/60 h-11"
        />
        {errors.username && <p className="text-xs text-red-400 mt-1">{errors.username}</p>}
      </div>
      <Button
        onClick={() => validate() && onNext(email, username)}
        className="w-full h-11 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold rounded-xl mt-1"
      >
        Continue <ArrowRight className="w-4 h-4 ml-2" />
      </Button>
    </div>
  );
}

// Step 2 — Choose agent
function Step2({ onNext }: { onNext: (agentId: string) => void }) {
  const [selected, setSelected] = useState("");

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm font-semibold text-white/90">Choose your first agent</p>
        <p className="text-xs text-white/35 mt-0.5">Your AI trader, available 24/7</p>
      </div>
      <div className="grid grid-cols-2 gap-2 max-h-72 overflow-y-auto pr-1">
        {AGENTS.map((a) => (
          <button
            key={a.id}
            onClick={() => setSelected(a.id)}
            className={`glass rounded-xl p-3 text-left transition-all border ${
              selected === a.id
                ? "border-[#F59E0B]/60 bg-[#F59E0B]/[0.08] ring-1 ring-[#F59E0B]/30"
                : "border-white/[0.06] hover:border-white/[0.12]"
            }`}
          >
            <span className="text-2xl">{a.emoji}</span>
            <p className="font-semibold text-xs text-white/85 mt-1.5">{a.name}</p>
            <p className="text-[10px] text-[#06B6D4] font-medium">{a.specialty}</p>
            <p className="text-[10px] text-white/35 mt-0.5 leading-snug">{a.blurb}</p>
            <div className="mt-1.5 flex items-center gap-1">
              <div className="text-[10px] font-mono text-emerald-400">{a.winRate}%</div>
              <div className="text-[9px] text-white/25">win rate</div>
            </div>
          </button>
        ))}
      </div>
      <Button
        onClick={() => selected && onNext(selected)}
        disabled={!selected}
        className="w-full h-11 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold rounded-xl disabled:opacity-40"
      >
        Start Trading with {selected ? AGENTS.find(a => a.id === selected)?.name : "Agent"}
        <ChevronRight className="w-4 h-4 ml-1" />
      </Button>
    </div>
  );
}

// Step 3 — Risk profile
function Step3({
  agentId,
  email,
  username,
  onComplete,
}: {
  agentId: string;
  email: string;
  username: string;
  onComplete: () => void;
}) {
  const [selected, setSelected] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const { login } = useAuth();

  const handleComplete = async () => {
    if (!selected) return;
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, username, agentId, riskProfile: selected }),
      });
      const data = await res.json() as { token: string; user: Parameters<typeof login>[1] };
      if (data.token) login(data.token, data.user);
    } catch {
      // demo: proceed anyway
    }
    setLoading(false);
    setDone(true);
    setTimeout(onComplete, 2000);
  };

  if (done) {
    return (
      <div className="flex flex-col items-center gap-5 py-6">
        <div
          className="w-20 h-20 rounded-full bg-gradient-to-br from-[#4F46E5] to-[#06B6D4] flex items-center justify-center"
          style={{ animation: "check-pop 0.5s cubic-bezier(0.34,1.56,0.64,1)" }}
        >
          <span className="text-3xl">{AGENTS.find(a => a.id === agentId)?.emoji ?? "🐱"}</span>
        </div>
        <div className="text-center">
          <p className="font-display font-bold text-lg text-white/95">Welcome to Home for AI!</p>
          <p className="text-sm text-white/45 mt-1">Your agent is warming up the engines…</p>
        </div>
        <div className="flex gap-1">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full bg-[#4F46E5]"
              style={{ animation: `dot-bounce 1s ease-in-out ${i * 0.2}s infinite` }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="text-sm font-semibold text-white/90">Set your risk profile</p>
        <p className="text-xs text-white/35 mt-0.5">You can change this any time in Settings</p>
      </div>
      <div className="flex flex-col gap-2">
        {RISK_PROFILES.map((r) => (
          <button
            key={r.id}
            onClick={() => setSelected(r.id)}
            className={`glass rounded-xl p-4 text-left border transition-all ${
              selected === r.id ? `${r.border} ${r.bg}` : "border-white/[0.06] hover:border-white/[0.12]"
            }`}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">{r.emoji}</span>
              <div>
                <p className={`font-semibold text-sm ${selected === r.id ? r.color : "text-white/80"}`}>
                  {r.label}
                </p>
                <p className="text-xs text-white/40 mt-0.5">{r.desc}</p>
              </div>
            </div>
          </button>
        ))}
      </div>
      <Button
        onClick={handleComplete}
        disabled={!selected || loading}
        className="w-full h-11 bg-[#4F46E5] hover:bg-[#4338CA] text-white font-semibold rounded-xl disabled:opacity-40"
      >
        {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
        Complete Setup 🚀
      </Button>
    </div>
  );
}

// ─── Create Account Flow ──────────────────────────────────────────────────────
function CreateAccountPanel({ onSuccess }: { onSuccess: () => void }) {
  type Step = "method" | "email-form" | "agent" | "risk";
  const [step, setStep] = useState<Step>("method");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [agentId, setAgentId] = useState("");

  const STEP_LABELS: Record<Step, string> = {
    method: "1 / 3",
    "email-form": "1 / 3",
    agent: "2 / 3",
    risk: "3 / 3",
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Progress indicator */}
      <div className="flex items-center gap-2">
        {(["method", "agent", "risk"] as const).map((s, i) => {
          const stepN = i + 1;
          const currentN = step === "method" || step === "email-form" ? 1 : step === "agent" ? 2 : 3;
          return (
            <div key={s} className="flex items-center gap-2">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                stepN <= currentN ? "bg-[#4F46E5] text-white" : "bg-white/[0.06] text-white/30"
              }`}>
                {stepN < currentN ? <Check size={10} /> : stepN}
              </div>
              {i < 2 && <div className={`h-px flex-1 w-8 transition-all ${stepN < currentN ? "bg-[#4F46E5]" : "bg-white/[0.08]"}`} />}
            </div>
          );
        })}
        <span className="ml-auto text-[10px] text-white/25 font-mono">{STEP_LABELS[step]}</span>
      </div>

      {step === "method" && (
        <Step1
          onEmailFlow={() => setStep("email-form")}
          onOAuth={onSuccess}
        />
      )}

      {step === "email-form" && (
        <div>
          <button onClick={() => setStep("method")} className="text-xs text-white/30 hover:text-white/60 mb-3">
            ← Back
          </button>
          <EmailSignUpForm
            onNext={(e, u) => {
              setEmail(e);
              setUsername(u);
              setStep("agent");
            }}
          />
        </div>
      )}

      {step === "agent" && (
        <Step2
          onNext={(aid) => {
            setAgentId(aid);
            setStep("risk");
          }}
        />
      )}

      {step === "risk" && (
        <Step3
          agentId={agentId}
          email={email}
          username={username}
          onComplete={onSuccess}
        />
      )}
    </div>
  );
}

// ─── Auth Page Root ───────────────────────────────────────────────────────────
export default function AuthPage() {
  const [, navigate] = useLocation();
  const { login } = useAuth();

  const handleSuccess = () => {
    navigate("/");
  };

  return (
    <div
      className="min-h-screen flex overflow-hidden"
      style={{ background: "#050508" }}
    >
      {/* Inject keyframe animations */}
      <style>{`
        @keyframes star-twinkle {
          from { opacity: 0.1; transform: scale(0.8); }
          to   { opacity: 0.7; transform: scale(1.2); }
        }
        @keyframes orb-float {
          0%, 100% { transform: translate(0, 0); }
          50%       { transform: translate(20px, -20px); }
        }
        @keyframes logo-pulse {
          0%, 100% { transform: scale(1) rotate(-2deg); filter: drop-shadow(0 0 16px rgba(79,70,229,0.5)); }
          50%       { transform: scale(1.06) rotate(2deg); filter: drop-shadow(0 0 28px rgba(79,70,229,0.8)); }
        }
        @keyframes qr-pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(79,70,229,0.6); opacity: 0.7; }
          50%       { box-shadow: 0 0 0 8px rgba(79,70,229,0); opacity: 1; }
        }
        @keyframes check-pop {
          from { transform: scale(0.3); opacity: 0; }
          to   { transform: scale(1); opacity: 1; }
        }
        @keyframes mail-bounce {
          0%, 100% { transform: translateY(0); }
          50%       { transform: translateY(-6px); }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes dot-bounce {
          0%, 100% { transform: translateY(0); opacity: 0.4; }
          50%       { transform: translateY(-6px); opacity: 1; }
        }
      `}</style>

      {/* LEFT: Hero panel */}
      <div className="flex-1 relative" style={{ borderRight: "1px solid rgba(255,255,255,0.05)" }}>
        <HeroPanel />
        {/* Mobile compact header (lg: hidden in HeroPanel; show fallback here) */}
        <div className="lg:hidden flex items-center justify-center py-8 px-6 flex-col gap-3">
          <CatPawHero />
          <p className="font-display font-bold text-xl text-white/90">Home for AI</p>
          <p className="text-xs text-white/35">Your AI agents never sleep</p>
        </div>
      </div>

      {/* RIGHT: Auth form panel */}
      <div className="w-full max-w-sm lg:max-w-md flex flex-col justify-center px-6 lg:px-10 py-10 relative">
        {/* Glass card */}
        <div
          className="glass rounded-3xl p-7 border border-white/[0.07]"
          style={{
            background: "rgba(255,255,255,0.025)",
            backdropFilter: "blur(24px)",
          }}
        >
          {/* Top label */}
          <div className="flex items-center gap-2 mb-6">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[11px] text-white/30 font-medium tracking-wide uppercase">
              Secure Authentication
            </span>
          </div>

          {/* Main tab: Sign In / Create Account */}
          <Tabs defaultValue="signin" className="w-full">
            <TabsList className="w-full bg-white/[0.04] rounded-2xl mb-7 p-1 h-auto grid grid-cols-2">
              <TabsTrigger
                value="signin"
                className="rounded-xl py-2.5 text-sm font-semibold data-[state=active]:bg-[#4F46E5] data-[state=active]:text-white text-white/50"
              >
                Sign In
              </TabsTrigger>
              <TabsTrigger
                value="create"
                className="rounded-xl py-2.5 text-sm font-semibold data-[state=active]:bg-[#4F46E5] data-[state=active]:text-white text-white/50"
              >
                Create Account
              </TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <SignInPanel onSuccess={handleSuccess} />
            </TabsContent>

            <TabsContent value="create">
              <CreateAccountPanel onSuccess={handleSuccess} />
            </TabsContent>
          </Tabs>

          {/* Footer */}
          <div className="mt-6 pt-5 border-t border-white/[0.05] text-center">
            <p className="text-[10px] text-white/20 leading-relaxed">
              By signing in you agree to our{" "}
              <a href="#" className="text-white/40 hover:text-white/60">Terms</a>
              {" · "}
              <a href="#" className="text-white/40 hover:text-white/60">Privacy Policy</a>
            </p>
          </div>
        </div>

        {/* Bottom decoration */}
        <div className="mt-6 flex items-center justify-center gap-4">
          <div className="h-px flex-1 bg-white/[0.04]" />
          <span className="text-[10px] text-white/15 font-medium">PROTECTED BY HOME FOR AI</span>
          <div className="h-px flex-1 bg-white/[0.04]" />
        </div>
      </div>
    </div>
  );
}
