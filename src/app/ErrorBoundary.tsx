import { Component, type ReactNode } from "react";

interface Props {
  label: string;
  children: ReactNode;
}

interface State {
  crashed: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { crashed: false };

  static getDerivedStateFromError(): State {
    return { crashed: true };
  }

  componentDidCatch(error: unknown) {
    console.error("Crashed:", error);
  }

  render() {
    if (!this.state.crashed) return this.props.children;

    return (
      <div className="state" role="alert">
        <p className="error-text">{this.props.label} stopped working.</p>
        <p className="muted">The rest of the page still works.</p>
        <button onClick={() => this.setState({ crashed: false })}>
          Try again
        </button>
      </div>
    );
  }
}
