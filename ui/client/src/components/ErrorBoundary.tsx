import React from "react";
import { RefreshCw } from "lucide-react";

interface State {
  hasError: boolean;
  isNetworkError: boolean;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  State
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, isNetworkError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    const isNetworkError =
      error.message?.includes("fetch") ||
      error.message?.includes("NetworkError") ||
      error.message?.includes("Failed to fetch") ||
      error.message?.includes("network");
    return { hasError: true, isNetworkError };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    // In production, send to Sentry / Datadog / etc.
    console.error("App Error:", error, info);
  }

  handleRetry = () => {
    this.setState({ hasError: false, isNetworkError: false });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          className="min-h-screen flex flex-col items-center justify-center gap-6 px-4"
          style={{ background: "#050508" }}
        >
          {/* Animated sleeping icon */}
          <div
            className="text-6xl select-none"
            style={{ animation: "float 3s ease-in-out infinite" }}
          >
            😴
          </div>

          <div className="text-center space-y-2">
            <h1 className="font-display font-bold text-xl text-white/80">
              Home for AI is taking a nap
            </h1>
            <p className="text-sm text-white/35">
              {this.state.isNetworkError
                ? "Can't reach the server — check your connection"
                : "Something unexpected happened"}
            </p>
            <p className="text-xs text-white/20">Back in a moment</p>
          </div>

          <button
            onClick={this.handleRetry}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium text-white/70 bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.08] transition-all"
          >
            <RefreshCw size={14} />
            Try again
          </button>

          <style>{`
            @keyframes float {
              0%, 100% { transform: translateY(0) rotate(-5deg); }
              50% { transform: translateY(-12px) rotate(5deg); }
            }
          `}</style>
        </div>
      );
    }

    return this.props.children;
  }
}
