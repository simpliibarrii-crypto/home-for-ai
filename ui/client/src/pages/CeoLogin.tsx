import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Eye, EyeOff, Loader2 } from "lucide-react";

// CEO Auth — strictly internal, not linked from any nav or public page.
// Password: CEO's phone number (hashed server-side with SHA-256 + salt)
// 2FA:  Simulated Apple device push — demo code "847291"
// TODO: Replace 2FA with Apple Push Notification + DeviceCheck API for real iOS-linked auth
// TODO: Replace password hash with bcrypt in production
// CEO: Change credentials before going live

export const CEO_TOKEN_KEY = "ceo_jwt_token";

export function getCeoToken(): string | null {
  return sessionStorage.getItem(CEO_TOKEN_KEY);
}

export function setCeoToken(token: string) {
  sessionStorage.setItem(CEO_TOKEN_KEY, token);
}

export function clearCeoToken() {
  sessionStorage.removeItem(CEO_TOKEN_KEY);
}

export default function CeoLoginPage() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<"phone" | "2fa" | "blocked">("phone");
  const [phone, setPhone] = useState("");
  const [showPhone, setShowPhone] = useState(false);
  const [twoFaCode, setTwoFaCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [failCount, setFailCount] = useState(0);

  // If already authenticated, go straight to dashboard
  useEffect(() => {
    if (getCeoToken()) navigate("/ceo/dashboard");
  }, []);

  function handlePhoneSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim()) return;
    setError("");
    setStep("2fa");
  }

  async function handleFinalSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (twoFaCode.length !== 6) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/ceo/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: phone.trim(), twoFaCode }),
      });
      const data = (await res.json()) as { token?: string; error?: string };

      if (res.status === 404 || !data.token) {
        const newCount = failCount + 1;
        setFailCount(newCount);
        if (newCount >= 3) {
          // After 3 failures show generic "not found" — do not reveal panel exists
          setStep("blocked");
        } else {
          setError("Authentication failed");
          setStep("phone");
          setPhone("");
          setTwoFaCode("");
        }
        return;
      }

      setCeoToken(data.token);
      navigate("/ceo/dashboard");
    } catch {
      setError("Connection error — try again");
    } finally {
      setLoading(false);
    }
  }

  // After 3 failures show plain 404 — no hint the CEO panel exists
  if (step === "blocked") {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "#050508" }}
      >
        <div className="text-center space-y-3">
          <p className="font-mono text-6xl font-bold text-white/10">404</p>
          <p className="text-white/30 text-sm">Page not found</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "#050508" }}
    >
      {/* Subtle background grid */}
      <div
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div
        className="relative w-full max-w-sm mx-4 rounded-2xl p-8 border border-white/[0.06]"
        style={{
          background: "rgba(255,255,255,0.025)",
          backdropFilter: "blur(24px)",
        }}
      >
        {/* Minimal Apple-style lock icon */}
        <div className="flex justify-center mb-7">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
            {/* Apple-style lock SVG */}
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <rect x="3" y="9" width="14" height="10" rx="2.5" fill="rgba(255,255,255,0.15)" />
              <path
                d="M6.5 9V6.5a3.5 3.5 0 0 1 7 0V9"
                stroke="rgba(255,255,255,0.3)"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <circle cx="10" cy="13.5" r="1.5" fill="rgba(255,255,255,0.4)" />
            </svg>
          </div>
        </div>

        {/* ── STEP 1: Phone number entry ── */}
        {step === "phone" && (
          <form onSubmit={handlePhoneSubmit} className="space-y-5">
            <div className="text-center mb-4">
              <p className="text-xs text-white/30 uppercase tracking-widest font-medium">
                Secure Access
              </p>
            </div>

            <div>
              <label className="block text-[10px] text-white/25 uppercase tracking-wider mb-2 font-medium">
                Phone number
              </label>
              <div className="relative">
                <input
                  type={showPhone ? "text" : "password"}
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  autoFocus
                  autoComplete="off"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-white/90 text-sm outline-none focus:border-white/20 pr-10 font-mono tracking-wider"
                  placeholder="••••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPhone(!showPhone)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/40"
                >
                  {showPhone ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
              </div>
            </div>

            {error && (
              <p className="text-xs text-red-400/60 text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={!phone.trim()}
              className="w-full py-3 rounded-xl text-sm font-medium text-white/60 bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.08] transition-all disabled:opacity-25"
            >
              Continue
            </button>
          </form>
        )}

        {/* ── STEP 2: Apple device push 2FA ── */}
        {step === "2fa" && (
          <form onSubmit={handleFinalSubmit} className="space-y-5">
            {/* Apple-style notification hint */}
            <div className="glass rounded-2xl p-4 border border-white/[0.07] mb-2">
              <div className="flex items-center gap-3">
                {/* Apple icon */}
                <div className="w-9 h-9 rounded-xl bg-black border border-white/10 flex items-center justify-center flex-shrink-0">
                  <svg
                    width="16"
                    height="18"
                    viewBox="0 0 814 1000"
                    fill="white"
                    xmlns="http://www.w3.org/2000/svg"
                    opacity="0.8"
                  >
                    <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76 0-103.7 40.8-165.9 40.8s-105-47.4-150.2-109c-51.7-69.7-93.7-173.2-93.7-272.1 0-174.6 114.6-267 227.8-267C311 151.9 373.3 196 420.8 196c46.7 0 116.5-48.4 194.3-48.4z" />
                    <path d="M549.8 66.5c25.3-29.9 43.9-71.5 43.9-113.1 0-5.8-.6-11.6-1.9-16.8-41.5 1.9-91.5 27.5-121.7 61.5C445.7-10.4 429.1 14.8 418.5 36c-11.3 22-18.2 45.2-18.2 66.5 0 6.5.6 13 1.3 15.1 3.2.6 8.4 1.3 13.6 1.3 37 0 84.1-24.7 134.6-52.4z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-semibold text-white/75">
                    A code has been sent to your Apple device
                  </p>
                  <p className="text-[10px] text-white/30 mt-0.5">
                    Check your iPhone for a push notification
                  </p>
                </div>
              </div>
            </div>

            <div>
              <p className="text-[10px] text-white/15 font-mono text-center mb-3">
                {/* TODO: Replace with Apple Push Notification + DeviceCheck API for real iOS-linked auth */}
                Demo mode — enter 847291
              </p>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                value={twoFaCode}
                onChange={(e) =>
                  setTwoFaCode(e.target.value.replace(/\D/g, ""))
                }
                autoFocus
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3.5 text-white/90 text-center text-2xl font-mono tracking-[0.5em] outline-none focus:border-white/20 placeholder-white/10"
                placeholder="000000"
              />
            </div>

            {error && (
              <p className="text-xs text-red-400/60 text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || twoFaCode.length !== 6}
              className="w-full py-3 rounded-xl text-sm font-medium text-white/60 bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.08] transition-all disabled:opacity-25 flex items-center justify-center gap-2"
            >
              {loading && <Loader2 size={13} className="animate-spin" />}
              Verify
            </button>

            <button
              type="button"
              onClick={() => {
                setStep("phone");
                setError("");
                setTwoFaCode("");
              }}
              className="w-full text-[11px] text-white/20 hover:text-white/40 transition-colors"
            >
              ← Back
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
