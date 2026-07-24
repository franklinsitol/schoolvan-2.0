import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  public handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6 text-center">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-2xl flex items-center justify-center mb-4 shadow-sm">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Ops! Algo deu errado ao carregar a tela</h2>
          <p className="text-sm text-gray-500 max-w-md mb-6">
            Ocorreu um erro temporário de exibição. Clique no botão abaixo para recarregar com segurança.
          </p>
          <button
            onClick={this.handleReset}
            className="px-6 py-3 bg-gray-900 text-yellow-400 font-bold rounded-2xl hover:bg-gray-800 transition-all shadow-md flex items-center gap-2 cursor-pointer"
          >
            <RefreshCw size={18} /> Recarregar Aplicação
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
