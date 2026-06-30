import { useState, useEffect } from "react";
import { Bell, X, Check } from "lucide-react";

// Track in memory (localStorage blocked in sandboxed iframe)
let _pushPrompted = false;

export function PushNotificationToast() {
  const [visible, setVisible] = useState(false);
  const [state, setState] = useState<"idle" | "granted" | "denied">("idle");

  useEffect(() => {
    // Only show once, and only if the browser supports notifications and user is logged in
    const alreadyPrompted = _pushPrompted;
    if (alreadyPrompted) return;

    // Delay a bit after login to feel natural
    const timer = setTimeout(() => {
      if ("Notification" in window && Notification.permission === "default") {
        setVisible(true);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const handleEnable = async () => {
    try {
      const permission = await Notification.requestPermission();
      if (permission === "granted") {
        setState("granted");
        _pushPrompted = true;
        // Also persist to user settings
        try {
          await fetch("/api/settings", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key: "pushNotificationsEnabled", value: "true" }),
          });
        } catch { /* non-critical */ }
        setTimeout(() => setVisible(false), 2000);
      } else {
        setState("denied");
        _pushPrompted = true;
        setTimeout(() => setVisible(false), 1500);
      }
    } catch {
      setState("denied");
      setVisible(false);
    }
  };

  const handleDismiss = () => {
    _pushPrompted = true;
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4"
      style={{
        animation: "slide-up-toast 0.4s cubic-bezier(0.34,1.56,0.64,1)",
      }}
    >
      <div
        className="rounded-2xl p-4 border border-white/[0.08] flex items-center gap-3 shadow-2xl"
        style={{ background: "rgba(15,15,20,0.95)", backdropFilter: "blur(20px)" }}
      >
        <div className="w-9 h-9 rounded-xl bg-[#4F46E5]/15 border border-[#4F46E5]/30 flex items-center justify-center flex-shrink-0">
          {state === "granted" ? (
            <Check size={16} className="text-emerald-400" />
          ) : (
            <Bell size={16} className="text-[#818CF8]" />
          )}
        </div>

        {state === "idle" && (
          <>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-white/80 leading-snug">
                Enable notifications to get alerts when your agents make profitable trades
              </p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button
                onClick={handleEnable}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#4F46E5] text-white hover:bg-[#4338CA] transition-all"
              >
                Enable
              </button>
              <button
                onClick={handleDismiss}
                className="p-1.5 rounded-lg text-white/20 hover:text-white/50 hover:bg-white/[0.04]"
              >
                <X size={13} />
              </button>
            </div>
          </>
        )}

        {state === "granted" && (
          <p className="text-xs text-emerald-400 font-medium">You're all set!</p>
        )}

        {state === "denied" && (
          <p className="text-xs text-white/40">No problem — you can enable this in Settings anytime</p>
        )}
      </div>

      <style>{`
        @keyframes slide-up-toast {
          from { opacity: 0; transform: translateX(-50%) translateY(20px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}
