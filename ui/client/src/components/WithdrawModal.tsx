import { useState } from "react";
import { X, Check, Loader2, ChevronRight, Info } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  availableProfit?: number;
}

const AVAILABLE_PROFIT = 1247.50;

export function WithdrawModal({ open, onClose, availableProfit = AVAILABLE_PROFIT }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [pct, setPct] = useState<25 | 50 | 75 | 100 | "custom">(50);
  const [customAmt, setCustomAmt] = useState("");
  const [method, setMethod] = useState<"bank" | "crypto" | "wallet">("bank");
  const [bankType, setBankType] = useState<"ach" | "interac">("ach");
  const [routing, setRouting] = useState("");
  const [account, setAccount] = useState("");
  const [interacEmail, setInteracEmail] = useState("");
  const [walletAddr, setWalletAddr] = useState("");
  const [chain, setChain] = useState("ETH");
  const [twoFaCode, setTwoFaCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  if (!open) return null;

  const amount =
    pct === "custom"
      ? Number(customAmt) || 0
      : (availableProfit * pct) / 100;

  function handleConfirm() {
    setLoading(true);
    // TODO: Replace with real withdrawal API + actual 2FA verification
    // Demo code: "123456" — use real email OTP in production
    setTimeout(() => {
      setLoading(false);
      setDone(true);
    }, 1800);
  }

  function handleClose() {
    setStep(1);
    setPct(50);
    setCustomAmt("");
    setMethod("bank");
    setBankType("ach");
    setRouting("");
    setAccount("");
    setInteracEmail("");
    setWalletAddr("");
    setChain("ETH");
    setTwoFaCode("");
    setLoading(false);
    setDone(false);
    onClose();
  }

  const isStep2Valid =
    method === "bank"
      ? bankType === "interac"
        ? interacEmail.includes("@")
        : routing.length >= 9 && account.length >= 6
      : method === "crypto"
      ? walletAddr.length > 10
      : true;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div
        className="w-full max-w-sm rounded-2xl border border-white/[0.08] overflow-hidden"
        style={{ background: "rgba(10,10,15,0.97)", backdropFilter: "blur(24px)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            {[1, 2, 3].map(s => (
              <div key={s} className={`w-2 h-2 rounded-full transition-all ${
                done || s < step ? "bg-emerald-400" :
                s === step ? "bg-[#06B6D4]" : "bg-white/[0.12]"
              }`} />
            ))}
          </div>
          <p className="font-display font-semibold text-sm text-white/80">
            {done ? "Withdrawal Initiated" : step === 1 ? "Withdraw Profits" : step === 2 ? "Withdrawal Method" : "Confirm & Verify"}
          </p>
          <button onClick={handleClose} className="text-white/25 hover:text-white/60">
            <X size={16} />
          </button>
        </div>

        <div className="p-5">
          {/* ── STEP 1: Amount ── */}
          {step === 1 && (
            <div className="space-y-4">
              {/* Available balance */}
              <div className="glass rounded-xl p-4 border border-emerald-500/15">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-white/30 uppercase tracking-wider">Available Profit</p>
                    <p className="font-mono font-bold text-2xl text-emerald-400 mt-0.5">
                      ${availableProfit.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                  <div className="relative">
                    <button
                      onMouseEnter={() => setShowTooltip(true)}
                      onMouseLeave={() => setShowTooltip(false)}
                      className="text-white/20 hover:text-white/50"
                    >
                      <Info size={14} />
                    </button>
                    {showTooltip && (
                      <div className="absolute right-0 bottom-full mb-2 w-52 glass rounded-xl p-3 border border-white/[0.08] z-10">
                        <p className="text-[11px] text-white/60 leading-relaxed">
                          Only profits are withdrawable. Your initial deposit stays in your trading account to continue generating returns. Platform fee (15%) has already been deducted.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <p className="text-[10px] text-white/25 mt-1">Platform fee already deducted · Initial deposit not withdrawable</p>
              </div>

              {/* Preset percentages */}
              <div className="grid grid-cols-4 gap-2">
                {([25, 50, 75, 100] as const).map(p => (
                  <button
                    key={p}
                    onClick={() => { setPct(p); setCustomAmt(""); }}
                    className={`py-2.5 rounded-xl text-xs font-semibold transition-all ${
                      pct === p
                        ? "bg-[#06B6D4] text-white"
                        : "bg-white/[0.04] text-white/60 border border-white/[0.08] hover:bg-white/[0.08]"
                    }`}
                  >
                    {p === 100 ? "All" : `${p}%`}
                  </button>
                ))}
              </div>

              {/* Custom */}
              <div>
                <button
                  onClick={() => setPct("custom")}
                  className="text-xs text-[#06B6D4] hover:text-[#22D3EE] mb-2"
                >
                  Custom amount
                </button>
                {pct === "custom" && (
                  <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5">
                    <span className="text-white/40 text-sm">$</span>
                    <input
                      type="number"
                      min="1"
                      max={availableProfit}
                      value={customAmt}
                      onChange={e => setCustomAmt(e.target.value)}
                      placeholder={`Max $${availableProfit.toFixed(2)}`}
                      className="flex-1 bg-transparent text-sm text-white/80 outline-none font-mono placeholder-white/20"
                      autoFocus
                    />
                  </div>
                )}
              </div>

              {/* Preview */}
              {amount > 0 && (
                <div className="text-center text-xs text-white/40">
                  Withdrawing <span className="font-mono font-semibold text-white/70">${amount.toFixed(2)}</span>
                </div>
              )}

              <button
                onClick={() => setStep(2)}
                disabled={amount < 1}
                className="w-full py-3 rounded-xl text-sm font-semibold bg-[#06B6D4] hover:bg-[#0891B2] text-white disabled:opacity-30 flex items-center justify-center gap-2"
              >
                Continue <ChevronRight size={14} />
              </button>
            </div>
          )}

          {/* ── STEP 2: Method ── */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {(["bank", "crypto", "wallet"] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => setMethod(m)}
                    className={`py-2 rounded-xl text-xs font-medium transition-all ${
                      method === m
                        ? "bg-[#06B6D4]/20 text-[#06B6D4] border border-[#06B6D4]/30"
                        : "bg-white/[0.04] text-white/40 border border-white/[0.08] hover:text-white/60"
                    }`}
                  >
                    {m === "bank" ? "Bank" : m === "crypto" ? "Crypto" : "In-App Wallet"}
                  </button>
                ))}
              </div>

              {/* Bank form */}
              {method === "bank" && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setBankType("ach")}
                      className={`flex-1 py-1.5 rounded-lg text-xs ${bankType === "ach" ? "text-[#06B6D4] bg-[#06B6D4]/10 border border-[#06B6D4]/20" : "text-white/30 border border-white/[0.06]"}`}
                    >
                      ACH Transfer
                    </button>
                    <button
                      onClick={() => setBankType("interac")}
                      className={`flex-1 py-1.5 rounded-lg text-xs ${bankType === "interac" ? "text-[#06B6D4] bg-[#06B6D4]/10 border border-[#06B6D4]/20" : "text-white/30 border border-white/[0.06]"}`}
                    >
                      Interac e-Transfer
                    </button>
                  </div>

                  {bankType === "ach" ? (
                    <>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={routing}
                        onChange={e => setRouting(e.target.value.replace(/\D/g, "").slice(0, 9))}
                        placeholder="Routing number (9 digits)"
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white/70 font-mono outline-none focus:border-[#06B6D4]/40 placeholder-white/20"
                      />
                      <input
                        type="text"
                        inputMode="numeric"
                        value={account}
                        onChange={e => setAccount(e.target.value.replace(/\D/g, ""))}
                        placeholder="Account number"
                        className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white/70 font-mono outline-none focus:border-[#06B6D4]/40 placeholder-white/20"
                      />
                    </>
                  ) : (
                    <input
                      type="email"
                      value={interacEmail}
                      onChange={e => setInteracEmail(e.target.value)}
                      placeholder="Email for Interac e-Transfer"
                      className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white/70 outline-none focus:border-[#06B6D4]/40 placeholder-white/20"
                    />
                  )}
                </div>
              )}

              {/* Crypto */}
              {method === "crypto" && (
                <div className="space-y-3">
                  <select
                    value={chain}
                    onChange={e => setChain(e.target.value)}
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white/70 outline-none"
                  >
                    <option value="ETH">Ethereum (ETH)</option>
                    <option value="BSC">BNB Chain (BSC)</option>
                    <option value="MATIC">Polygon (MATIC)</option>
                  </select>
                  <input
                    type="text"
                    value={walletAddr}
                    onChange={e => setWalletAddr(e.target.value)}
                    placeholder="0x... wallet address"
                    className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-2.5 text-sm text-white/70 font-mono outline-none focus:border-[#06B6D4]/40 placeholder-white/20"
                  />
                </div>
              )}

              {/* In-app wallet */}
              {method === "wallet" && (
                <div className="glass rounded-xl p-4 text-center">
                  <p className="text-sm text-white/70 font-medium">Transfer to your in-app wallet</p>
                  <p className="text-xs text-white/35 mt-1">Funds will be credited instantly to your /wallet balance</p>
                </div>
              )}

              <button
                onClick={() => setStep(3)}
                disabled={!isStep2Valid}
                className="w-full py-3 rounded-xl text-sm font-semibold bg-[#06B6D4] hover:bg-[#0891B2] text-white disabled:opacity-30 flex items-center justify-center gap-2"
              >
                Continue <ChevronRight size={14} />
              </button>

              <button onClick={() => setStep(1)} className="w-full text-xs text-white/20 hover:text-white/40">
                ← Back
              </button>
            </div>
          )}

          {/* ── STEP 3: Confirm + 2FA ── */}
          {step === 3 && !done && (
            <div className="space-y-4">
              {/* Summary */}
              <div className="glass rounded-xl p-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-white/40">Amount</span>
                  <span className="font-mono font-semibold text-emerald-400">${amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40">Method</span>
                  <span className="text-white/60 capitalize">
                    {method === "bank" ? (bankType === "interac" ? "Interac e-Transfer" : "ACH Bank Transfer") : method === "crypto" ? `Crypto (${chain})` : "In-App Wallet"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-white/40">Processing time</span>
                  <span className="text-white/60">
                    {method === "bank" ? "1–3 business days" : method === "crypto" ? "Instant" : "Instant"}
                  </span>
                </div>
              </div>

              {/* 2FA field */}
              <div>
                <p className="text-xs text-white/40 mb-2 text-center">
                  Enter the 6-digit code sent to your email
                </p>
                <p className="text-[10px] text-white/15 font-mono text-center mb-2">
                  {/* Demo mode: code is "123456" — use real email OTP in production */}
                  Demo: enter 123456
                </p>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={twoFaCode}
                  onChange={e => setTwoFaCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-center text-xl font-mono tracking-[0.4em] text-white/80 outline-none focus:border-[#06B6D4]/40 placeholder-white/20"
                  autoFocus
                />
              </div>

              <button
                onClick={handleConfirm}
                disabled={loading || twoFaCode.length !== 6}
                className="w-full py-3 rounded-xl text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-white disabled:opacity-30 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 size={14} className="animate-spin" />}
                {loading ? "Processing..." : `Confirm Withdrawal $${amount.toFixed(2)}`}
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
                style={{ animation: "check-pop-w 0.5s cubic-bezier(0.34,1.56,0.64,1)" }}
              >
                <Check size={28} className="text-emerald-400" />
              </div>
              <div className="text-center space-y-1">
                <p className="font-display font-bold text-base text-white/90">Withdrawal Initiated</p>
                <p className="text-sm text-white/60">
                  Your ${amount.toFixed(2)} withdrawal is processing
                </p>
                <p className="text-xs text-white/30">
                  {method === "bank" ? "1–3 business days for bank transfer" : "Instant for crypto"}
                </p>
              </div>
              <button
                onClick={handleClose}
                className="w-full py-2.5 rounded-xl text-sm font-medium text-white/60 border border-white/[0.08] hover:bg-white/[0.04]"
              >
                Done
              </button>
              <style>{`
                @keyframes check-pop-w {
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
