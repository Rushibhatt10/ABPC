import React from "react";

/**
 * @typedef {object} AppErrorBoundaryProps
 * @property {React.ReactNode} children
 * @property {string} [moduleName]
 */

/**
 * Keeps a single broken module from taking down the whole admin app.
 */
export default class AppErrorBoundary extends React.Component {
  /**
   * @param {AppErrorBoundaryProps} props
   */
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error(`[ErrorBoundary] ${this.props.moduleName || "module"} crashed`, error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-800">
          <h2 className="text-lg font-black">Something went wrong</h2>
          <p className="mt-2 text-sm">
            {this.props.moduleName || "This section"} failed to load. Refresh the page or try again in a moment.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}
