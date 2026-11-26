import { Component, type ErrorInfo, type ReactNode } from 'react';

interface State { error: Error | null }

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('PARADOX render failure', error, info);
  }

  render(): ReactNode {
    if (this.state.error) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.2em] text-danger">Visualization error</p>
          <p className="max-w-md text-sm text-muted">{this.state.error.message}</p>
          <button type="button" onClick={() => this.setState({ error: null })} className="border border-line px-3 py-1.5 font-mono text-xs text-cyan hover:border-cyan/50">Retry render</button>
        </div>
      );
    }
    return this.props.children;
  }
}
