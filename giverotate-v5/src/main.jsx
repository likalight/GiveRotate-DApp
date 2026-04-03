import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }
  componentDidCatch(error, info) {
    console.error('App error:', error, info)
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0a0c0b', color:'#e6ebe7', fontFamily:'sans-serif', flexDirection:'column', gap:16 }}>
          <div style={{ fontSize:40 }}>⚠</div>
          <div style={{ fontWeight:700, fontSize:20 }}>Something went wrong</div>
          <div style={{ color:'#849084', fontSize:14 }}>Please refresh the page to continue</div>
          <button onClick={() => { this.setState({ hasError:false }); window.location.reload() }}
            style={{ padding:'10px 24px', background:'#00d67f', color:'#000', border:'none', borderRadius:8, fontWeight:700, cursor:'pointer', fontSize:14 }}>
            Refresh Page
          </button>
        </div>
      )
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
)
