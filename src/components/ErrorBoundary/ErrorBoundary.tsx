import React from 'react';

interface Props { children: React.ReactNode; }
interface State { hasError: boolean; message: string; }

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: unknown): State {
    return { hasError: true, message: error instanceof Error ? error.message : String(error) };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-primary)' }}>
          <h2 style={{ marginBottom: '0.5rem' }}>Настана грешка</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>{this.state.message}</p>
          <button
            onClick={() => this.setState({ hasError: false, message: '' })}
            style={{ background: 'var(--accent-gold)', color: '#0D1B3E', padding: '0.5rem 1.5rem', borderRadius: '6px', fontWeight: 600 }}
          >
            Обиди се повторно
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
