import { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Rendered instead of children when a child throws. Defaults to nothing. */
  fallback?: ReactNode;
  /** Prefix used in the console log to identify the failing area. */
  logLabel?: string;
}

interface State {
  hasError: boolean;
}

/** Isolates a subtree so a local failure can never blank out the whole app. */
class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(`[${this.props.logLabel ?? "ErrorBoundary"}]`, error, info.componentStack);
  }

  render() {
    if (this.state.hasError) return <>{this.props.fallback ?? null}</>;
    return <>{this.props.children}</>;
  }
}

export default ErrorBoundary;
