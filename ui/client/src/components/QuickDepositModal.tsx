import { useState } from "react";
import { X, CreditCard, Bitcoin, Check, Loader2, ChevronRight } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
}

const PRESET_AMOUNTS = [50, 100, 500, 1000];

// Agent allocation preview (static demo)
const AGENT_ALLOC = [
  { name: "Luna", emoji: "🐱", pct: 40 },
  { name: "Shadow", emoji: "🐈‍⬛", pct: 35 },
  { name: "Cipher", emoji: "🐾", pct: 25 },
];

export function QuickDepositModal({ open, onClose }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [amount, setAmount] = useState<number | "">(100);
  const [customAmount, setCustomAmount] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [payMethod, setPayMethod] = useState<"card" | "apple" | "google" | "crypto">("card");
  const [cardNum, setCardNum] = useState("");
  const [cardExp, setCardExp] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  if (!open) return null;

  const finalAmount = isCustom ? (Number(customAmount) || 0) : (amount || 0);

  function handleConfirm() {
    setLoading(true);
    // TODO: Replace with Stripe Payment Intent API
    setTimeout(() => {
      setLoading(false);
      setDone(true);
    }, 1800);
  }

  function handleClose() {
    // Reset state on close
    setStep(1);
    setAmount(100);
    setIsCustom(false);
    setCustomAmount("");
    setPayMethod("card");
    setCardNum("");
    setCardExp("");
    setCardCvc("");
    setLoading(false);
    setDone(false);
    onClose();
  }

  function formatCard(v: string) {
    return v.replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
  }

  function formatExp(v: string) {
    const digits = v.replace(/\D/g, "").slice(0, 4);
    if (digits.length > 2) return digits.slice(0, 2) + "/" + digits.slice(2);
    return digits;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div
        className="w-full max-w-sm rounded-2xl border border-white/[0.08] overflow-hidden"
        style={{ background: "rgba(10,10,15,0.97)", backdropFilter: "blur(24px)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            {/* Step dots */}
            {[1, 2, 3].map(s => (
              <div key={s} className={`w-2 h-2 rounded-full transition-all ${
                done || s < step ? "bg-emerald-400" :
                s === step ? "bg-[#4F46E5]" : "bg-white/[0.12]"
              }`} />
            ))}
          </div>
          <p className="font-display font-semibold text-sm text-white/80">
            {done ? "Deposit Complete" : step === 1 ? "Add Funds" : step === 2 ? "Payment" : "Confirm Deposit"}
          </p>
          <button onClick={handleClose} className="text-white/25 hover:text-white/60">
            <X size={16} />
          </button>
        </div>

        <div className="p-5">
          {/* ── STEP 1: Amount ── */}
          {step === 1 && (
            <div className="space-y-4">
              <p className="text-xs text-white/40">Your funds will be allocated across your active agents</p>

              {/* Preset amounts */}
              <div className="grid grid-cols-4 gap-2">
                {PRESET_AMOUNTS.map(a => (
                  <button
                    key={a}
                    onClick={() => { setAmount(a); setIsCustom(false); }}
                    className={`py-2.5 rounded-xl text-sm font-semibold transition-all ${
                      !isCustom && amount === a
                        ? "bg-[#4F46E5] text-white"
                        : "bg-white/[0.04] text-white/60 border border-white/[0.08] hover:bg-white/[0.08]"
                    }`}
                  >
                    ${a}
                  </button>
                ))}
              </div>

              {/* Custom amount */}
              <div>
                <button
                  onClick={() => setIsCustom(!isCustom)}
                  className="text-xs text-[#818CF8] hover:text-[#4F46E5] mb-2"
                >
                  {isCustom ? "Use preset" : "Custom amount"}
                </button>
                {isCustom && (
                  <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5">
                    <span className="text-white/40 text-sm">$</span>
                    <input
                      type="number"
                      min="1"
                      value={customAmount}
                      onChange={e => setCustomAmount(e.target.value)}
                      placeholder="Enter amount"
                      className="flex-1 bg-transparent text-sm text-white/80 outline-none font-mono"
                      autoFocus
                    />
                  </div>
                )}
              </div>

              {/* Payment method icons */}
              <div className="pt-2 border-t border-white/[0.05]">
                <p className="text-[10px] text-white/25 mb-2 uppercase tracking-wider">Accepted payments</p>
                <div className="flex items-center gap-2">
                  {["Visa", "MC", "Apple Pay", "Google Pay", "USDC"].map(m => (
                    <span
                      key={m}
                      className="text-[9px] font-medium px-2 py-1 rounded bg-white/[0.04] border border-white/[0.06] text-white/35"
                    >
                      {m}
                    </span>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setStep(2)}
                disabled={finalAmount < 1}
                className="w-full py-3 rounded-xl text-sm font-semibold bg-[#4F46E5] hover:bg-[#4338CA] text-white disabled:opacity-30 flex items-center justify-center gap-2 mt-2"
              >
                Continue — ${finalAmount} <ChevronRight size={14} />
              </button>
            </div>
          )}

          {/* ── STEP 2: Payment ── */}
          {step === 2 && (
            <div className="space-y-4">
              {/* Method tabs */}
              <div className="flex gap-1">
                {(["card", "apple", "google", "crypto"] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => setPayMethod(m)}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-all ${
                      payMethod === m
                        ? "bg-[#4F46E5]/20 text-[#818CF8] border border-[#4F46E5]/30"
                        : "text-white/30 hover:text-white/60 border border-transparent"
                    }`}
                  >
                    {m === "card" ? "Card" : m === "apple" ? "Apple" : m === "google" ? "Google" : "Crypto"}
                  </button>
                ))}
              </div>

              {/* Card form */}
              {payMethod === "card" && (
                <div className="space-y-3">
                  <div>
                    <label className="text-[10px] text-white/30 uppercase tracking-wider block mb-1.5">Card Number</label>
                    <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 focus-within:border-[#4F46E5]/50">
                      <CreditCard size={14} className="text-white/25 flex-shrink-0" />
                      <input
                        type="text"
                        inputMode="numeric"
                        value={cardNum}
                        onChange={e => setCardNum(formatCard(e.target.value))}
                        placeholder="1234 5678 9012 3456"
                        className="flex-1 bg-transparent text-sm text-white/80 font-mono outline-none placeholder-white/20"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-white/30 uppercase tracking-wider block mb-1.5">Expiry</label>
                      <input
                        type="text"
                        value={cardExp}
                        onChange={e => setCardExp(formatExp(e.target.value))}
                        placeholder="MM/YY"
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white/80 font-mono outline-none focus:border-[#4F46E5]/50 placeholder-white/20"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-white/30 uppercase tracking-wider block mb-1.5">CVC</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={4}
                        value={cardCvc}
                        onChange={e => setCardCvc(e.target.value.replace(/\D/g, ""))}
                        placeholder="123"
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white/80 font-mono outline-none focus:border-[#4F46E5]/50 placeholder-white/20"
                      />
                    </div>
                  </div>
                  {/* TODO: Replace with Stripe Payment Intent API */}
                  <p className="text-[10px] text-white/20 font-mono">🔒 Secured by Stripe (demo mode)</p>
                </div>
              )}

              {/* Apple Pay */}
              {payMethod === "apple" && (
                <button
                  onClick={() => setStep(3)}
                  className="w-full py-3.5 rounded-xl font-semibold text-sm bg-black text-white border border-white/20 hover:bg-gray-900"
                >
                  Pay with Apple Pay
                </button>
              )}

              {/* Google Pay */}
              {payMethod === "google" && (
                <button
                  onClick={() => setStep(3)}
                  className="w-full py-3.5 rounded-xl font-semibold text-sm bg-white text-gray-900 hover:bg-gray-100"
                >
                  Pay with Google Pay
                </button>
              )}

              {/* Crypto USDC */}
              {payMethod === "crypto" && (
                <div className="space-y-3">
                  <div className="glass rounded-xl p-4 text-center">
                    {/* QR code placeholder */}
                    <div className="w-32 h-32 mx-auto bg-white/[0.04] border border-white/[0.06] rounded-xl flex items-center justify-center mb-2">
                      <Bitcoin size={32} className="text-white/20" />
                    </div>
                    <p className="text-[10px] text-white/40 mb-1">Send USDC on Base network</p>
                    <p className="font-mono text-[10px] text-white/60 break-all">0x1a2b3c4d5e6f...demo</p>
                    <p className="text-xs font-semibold text-[#F59E0B] mt-2">${finalAmount} USDC</p>
                  </div>
                  <p className="text-[10px] text-white/25 text-center">Deposit credited after 1 confirmation (~12 seconds on Base)</p>
                </div>
              )}

              {payMethod === "card" && (
                <button
                  onClick={() => setStep(3)}
                  disabled={!cardNum || !cardExp || !cardCvc}
                  className="w-full py-3 rounded-xl text-sm font-semibold bg-[#4F46E5] hover:bg-[#4338CA] text-white disabled:opacity-30 flex items-center justify-center gap-2"
                >
                  Continue <ChevronRight size={14} />
                </button>
              )}

              <button
                onClick={() => setStep(1)}
                className="w-full text-xs text-white/20 hover:text-white/40"
              >
                ← Back
              </button>
            </div>
          )}

          {/* ── STEP 3: Confirm ── */}
          {step === 3 && !done && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="glass rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">Deposit amount</span>
                  <span className="font-mono font-semibold text-white/80">${finalAmount}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-white/40">Payment method</span>
                  <span className="text-white/60 capitalize">{payMethod === "card" ? `Card ···${cardNum.slice(-4) || "xxxx"}` : payMethod}</span>
                </div>
              </div>

              {/* Allocation breakdown */}
              <div className="glass rounded-xl p-4 space-y-2">
                <p className="text-[10px] text-white/30 uppercase tracking-wider mb-3">Will be split across your agents</p>
                {AGENT_ALLOC.map(a => (
                  <div key={a.name} className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1.5">
                      <span className="text-base leading-none">{a.emoji}</span>
                      <span className="text-white/60">{a.name}</span>
                      <span className="text-white/25">{a.pct}%</span>
                    </div>
                    <span className="font-mono text-white/70">${((finalAmount * a.pct) / 100).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={handleConfirm}
                disabled={loading}
                className="w-full py-3 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-white disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : null}
                {loading ? "Processing..." : `Confirm Deposit $${finalAmount}`}
              </button>

              <button onClick={() => setStep(2)} className="w-full text-xs text-white/20 hover:text-white/40">
                ← Back
              </button>
            </div>
          )}

          {/* ── SUCCESS ── */}
          {done && (
            <div className="flex flex-col items-center gap-4 py-4">
              <div
                className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center"
                style={{ animation: "check-pop 0.5s cubic-bezier(0.34,1.56,0.64,1)" }}
              >
                <Check size={28} className="text-emerald-400" />
              </div>
              <div className="text-center">
                <p className="font-display font-bold text-base text-white/90">Deposit Confirmed!</p>
                <p className="text-xs text-white/40 mt-1">
                  ${finalAmount} has been allocated across your agents
                </p>
              </div>
              <button
                onClick={handleClose}
                className="w-full py-2.5 rounded-xl text-sm font-medium text-white/60 border border-white/[0.08] hover:bg-white/[0.04]"
              >
                Done
              </button>
              <style>{`
                @keyframes check-pop {
                  from { transform: scale(0.3); opacity: 0; }
                  to   { transform: scale(1); opacity: 1; }
                }
              `}</style>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
