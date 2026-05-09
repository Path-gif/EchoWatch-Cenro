import React from 'react'

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('App crashed:', error, info)
  }

  render() {
    if (!this.state.error) {
      return this.props.children
    }

    return (
      <div className="flex min-h-screen items-center justify-center bg-[#fcfdfc] px-4 py-8 text-[#212529]">
        <div className="w-full max-w-lg rounded-2xl border border-[#e0b4aa] bg-white p-6 shadow-[0_12px_28px_rgba(0,68,27,0.12)]">
          <p className="text-xs font-black uppercase tracking-[0.16em] text-[#8a2f20]">App Error</p>
          <h1 className="mt-2 text-2xl font-black text-[#00441b]">Something went wrong after loading this page.</h1>
          <p className="mt-3 text-sm leading-6 text-[#495057]">
            Please refresh the page. If this keeps happening, send this error message:
          </p>
          <pre className="mt-4 overflow-auto rounded-xl bg-[#fff3f0] p-4 text-xs font-semibold text-[#8a2f20]">
            {this.state.error?.message || String(this.state.error)}
          </pre>
          <button
            type="button"
            onClick={() => window.location.assign('/')}
            className="mt-5 min-h-12 rounded-full border border-[#003915] bg-[#00441b] px-5 text-sm font-black text-white"
          >
            Back to Landing Page
          </button>
        </div>
      </div>
    )
  }
}
