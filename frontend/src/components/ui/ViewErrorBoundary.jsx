import React from 'react';
import { AlertTriangle, RefreshCw, Terminal, ChevronDown, ChevronUp } from 'lucide-react';

export class ViewErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      showStack: false
    };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error(`[ViewErrorBoundary] Error rendering view: ${this.props.viewName || 'Unknown'}`, error, errorInfo);
    this.setState({ errorInfo });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      showStack: false
    });
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      const viewName = this.props.viewName || 'Module';
      const errorMsg = this.state.error?.toString() || 'Unknown runtime error encountered';
      const stack = this.state.errorInfo?.componentStack || this.state.error?.stack || '';

      return (
        <div className="p-8 max-w-4xl mx-auto my-12 animate-fade-in">
          <div className="hud-panel rounded-2xl border border-rose-500/40 bg-rose-950/20 backdrop-blur-xl p-8 shadow-2xl shadow-rose-950/50">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 shrink-0">
                <AlertTriangle className="w-8 h-8" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <span className="px-2 py-0.5 text-[10px] font-mono tracking-widest uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded">
                    VIEW RENDER ERROR
                  </span>
                  <span className="text-xs font-mono text-slate-400">
                    TARGET: {viewName.toUpperCase()}
                  </span>
                </div>
                <h2 className="text-xl font-bold font-mono text-white mt-2">
                  The current view failed to render.
                </h2>
                <p className="text-sm text-slate-400 mt-1">
                  An unexpected client-side exception occurred while mounting or updating the view. Other system views and live services remain unaffected.
                </p>

                {/* Error message box */}
                <div className="mt-4 p-3 bg-black/60 border border-rose-500/30 rounded-lg font-mono text-xs text-rose-300 flex items-start gap-2 break-all">
                  <Terminal className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>

                {/* Actions */}
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <button
                    onClick={this.handleReset}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 border border-rose-500/40 font-mono text-xs transition-colors cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Retry View
                  </button>

                  {stack && (
                    <button
                      onClick={() => this.setState(prev => ({ showStack: !prev.showStack }))}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-slate-200 font-mono text-xs transition-colors cursor-pointer"
                    >
                      {this.state.showStack ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      {this.state.showStack ? 'Hide Diagnostics' : 'Inspect Stack Trace'}
                    </button>
                  )}
                </div>

                {/* Component Stack Trace */}
                {this.state.showStack && stack && (
                  <div className="mt-4 p-3 bg-black/80 border border-white/10 rounded-lg font-mono text-[11px] text-slate-400 overflow-x-auto max-h-60">
                    <pre className="whitespace-pre-wrap">{stack}</pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ViewErrorBoundary;
