import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import './App.css';
import Settings from './Settings';
import GuidedAnalysis from './GuidedAnalysis';
import ProcessingHistory from './ProcessingHistory';
import SystemDiagnostics from './SystemDiagnostics';
import ResultsDisplay from './ResultsDisplay';
import FileInput from './FileInput'; // Import the new component
import ProgressDisplay from './ProgressDisplay'; // Import the new component
import { ApiResponse } from './types';

function App() {
  // --- State Management ---
  const [inputMode, setInputMode] = useState<'direct' | 'guided'>('direct');
  const [inputType, setInputType] = useState<'chat' | 'url' | 'file'>('chat');
  const [textInput, setTextInput] = useState<string>('');
  const [fileInput, setFileInput] = useState<File | null>(null);
  const [taskStatus, setTaskStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [apiResult, setApiResult] = useState<ApiResponse | null>(null);

  // UI State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const [showGuidedAnalysis, setShowGuidedAnalysis] = useState(false);
  const [enableIndexing, setEnableIndexing] = useState(true);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');

  const workflowSteps = [
    { icon: '🚀', title: 'Initialize', description: 'Setting up AI engine' },
    { icon: '📊', title: 'Analyze', description: 'Analyzing paper content' },
    { icon: '📥', title: 'Download', description: 'Processing document' },
    { icon: '📋', title: 'Plan', description: 'Generating code plan' },
    { icon: '🔍', title: 'References', description: 'Analyzing references' },
    { icon: '📦', title: 'Repos', description: 'Downloading repositories' },
    { icon: '🗂️', title: 'Index', description: 'Building code index' },
    { icon: '⚙️', title: 'Implement', description: 'Implementing code' },
  ];

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8000/ws/progress');

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      setProgress(data.progress);
      setStatusText(data.message);
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
    };

    return () => {
      ws.close();
    };
  }, []);

  // --- Event Handlers ---
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTextInput(e.target.value);
  };

  const handleFileSelect = (file: File) => {
    setFileInput(file);
  };

  const handleSubmit = async (requirements?: string) => {
    setTaskStatus('processing');
    setApiResult(null);
    setShowGuidedAnalysis(false);

    const inputSource = requirements || textInput;

    let response: any; // Allow for different response types
    try {
      if (inputType === 'file' && fileInput) {
        // Use Tauri command for file processing
        response = await invoke('process_file', { filePath: (fileInput as any).path });
      } else if (inputSource.trim() !== '') {
        // Use fetch for text/url processing
        const fetchResponse = await fetch('http://localhost:8000/process/text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            input_source: inputSource,
            input_type: inputType,
            enable_indexing: enableIndexing,
          }),
        });
        response = await fetchResponse.json();
      } else {
        alert('Please provide an input.');
        setTaskStatus('idle');
        return;
      }

      const data: ApiResponse = typeof response === 'string' ? JSON.parse(response) : response;

      if (data.status === 'error') {
        throw new Error(data.error || 'An unknown error occurred.');
      }

      setApiResult(data);
      setTaskStatus('success');

    } catch (err: any) {
      setApiResult({ status: 'error', error: err.message });
      setTaskStatus('error');
    }
  };

  const handleGuidedComplete = (requirements: string) => {
    setTextInput(requirements);
    handleSubmit(requirements);
  };

  const handleGuidedCancel = () => {
    setShowGuidedAnalysis(false);
  };

  const handleInputModeChange = (mode: 'direct' | 'guided') => {
    setInputMode(mode);
    if (mode === 'guided') {
      setShowGuidedAnalysis(true);
    } else {
      setShowGuidedAnalysis(false);
    }
  };

  // --- UI Rendering ---
  const renderInput = () => {
    switch (inputType) {
      case 'file':
        return <FileInput onFileChange={handleFileSelect} selectedFile={fileInput} />;
      case 'chat':
      case 'url':
      default:
        return (
          <textarea
            value={textInput}
            onChange={handleTextChange}
            placeholder={inputType === 'chat' ? 'Describe your coding requirements...' : 'Enter a URL...'}
            rows={5}
            className="text-input"
          />
        );
    }
  };

  const renderResult = () => {
    if (!apiResult) return null;

    if (taskStatus === 'success') {
      return <ResultsDisplay result={apiResult} />;
    }

    if (taskStatus === 'error' && apiResult.error) {
      return (
        <div className="result-error">
          <h3>❌ An Error Occurred</h3>
          <p>{apiResult.error}</p>
          {apiResult.traceback && (
            <pre className="traceback">{apiResult.traceback}</pre>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="container">
      {/* Modern Header */}
      <header className="modern-header">
        <div className="header-content">
          <div className="logo-section">
            <div className="logo-animation">
              <span className="logo-text">◊ DeepCode</span>
            </div>
            <div className="tagline">
              <span className="highlight">AI Research Engine</span>
              <span className="separator">•</span>
              <span className="org">Desktop Edition</span>
            </div>
          </div>
          <div className="header-actions">
            <button
              className="icon-btn"
              onClick={() => setIsHistoryOpen(true)}
              title="Processing History"
            >
              📊
            </button>
            <button
              className="icon-btn"
              onClick={() => setIsDiagnosticsOpen(true)}
              title="System Diagnostics"
            >
              🔧
            </button>
            <button
              className="icon-btn"
              onClick={() => setIsSettingsOpen(true)}
              title="Settings"
            >
              ⚙️
            </button>
            <div className="status-badge">
              <span className="status-dot"></span>
              <span className="status-text">ONLINE</span>
            </div>
          </div>
        </div>
      </header>

      {/* Feature Showcase */}
      <div className="capability-matrix">
        <div className="capability-node">
          <div className="node-core">
            <div className="core-label">RESEARCH</div>
          </div>
          <div className="node-description">
            <h3>Paper2Code & Text2Code</h3>
            <p>Neural document processing and algorithmic synthesis</p>
          </div>
        </div>
      </div>

      {/* Processing Pipeline */}
      <div className="processing-pipeline">
        <div className="pipeline-stage">
          <div className="stage-core">REQUIREMENTS</div>
          <div className="stage-description">Input Requirements</div>
        </div>
        <div className="pipeline-flow">→</div>
        <div className="pipeline-stage">
          <div className="stage-core">PLANNING</div>
          <div className="stage-description">Design & Planning</div>
        </div>
        <div className="pipeline-flow">→</div>
        <div className="pipeline-stage">
          <div className="stage-core">IMPLEMENTATION</div>
          <div className="stage-description">Code Implementation</div>
        </div>
        <div className="pipeline-flow">→</div>
        <div className="pipeline-stage">
          <div className="stage-core">VALIDATION</div>
          <div className="stage-description">Validation & Refinement</div>
        </div>
      </div>

      <main>
        {/* Workflow Configuration */}
        <div className="workflow-config">
          <label className="config-item">
            <input
              type="checkbox"
              checked={enableIndexing}
              onChange={(e) => setEnableIndexing(e.target.checked)}
            />
            <span>🗂️ Enable Codebase Indexing</span>
          </label>
          {enableIndexing ? (
            <span className="config-status success">✅ Full workflow with indexing enabled</span>
          ) : (
            <span className="config-status info">⚡ Fast mode - indexing disabled</span>
          )}
        </div>

        {/* Input Mode Selector */}
        {inputType === 'chat' && !showGuidedAnalysis && (
          <div className="input-mode-selector">
            <h3>🎯 Choose Your Input Mode</h3>
            <div className="mode-buttons">
              <button
                className={`mode-btn ${inputMode === 'direct' ? 'active' : ''}`}
                onClick={() => handleInputModeChange('direct')}
              >
                <span className="mode-icon">🚀</span>
                <span className="mode-title">Direct Input</span>
                <span className="mode-desc">Enter requirements directly</span>
              </button>
              <button
                className={`mode-btn ${inputMode === 'guided' ? 'active' : ''}`}
                onClick={() => handleInputModeChange('guided')}
              >
                <span className="mode-icon">🧠</span>
                <span className="mode-title">Guided Analysis</span>
                <span className="mode-desc">AI asks questions to help you clarify needs</span>
              </button>
            </div>
          </div>
        )}

        {/* Guided Analysis Component */}
        {showGuidedAnalysis && (
          <GuidedAnalysis
            onComplete={handleGuidedComplete}
            onCancel={handleGuidedCancel}
          />
        )}

        {/* Direct Input Interface */}
        {!showGuidedAnalysis && (
          <>
            <div className="input-selector">
              <button onClick={() => setInputType('chat')} className={inputType === 'chat' ? 'active' : ''} aria-label="Chat Input">
                💬 Chat
              </button>
              <button onClick={() => setInputType('url')} className={inputType === 'url' ? 'active' : ''} aria-label="URL Input">
                🌐 URL
              </button>
              <button onClick={() => setInputType('file')} className={inputType === 'file' ? 'active' : ''} aria-label="File Input">
                📁 File
              </button>
            </div>

            <div className="input-area">
              {renderInput()}
            </div>

            <button
              onClick={() => handleSubmit()}
              disabled={taskStatus === 'processing'}
              className="submit-btn"
            >
              {taskStatus === 'processing' ? '🔄 Processing...' : '🚀 Start Processing'}
            </button>
          </>
        )}

        <div className="status-area">
          {taskStatus === 'processing' ? (
            <ProgressDisplay
              workflowSteps={workflowSteps}
              currentStep={Math.floor(progress / 12.5)}
              statusText={statusText}
              progress={progress}
              status="active"
            />
          ) : renderResult()}
        </div>
      </main>

      {/* Modal Components */}
      <Settings isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
      <ProcessingHistory isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} />
      <SystemDiagnostics isOpen={isDiagnosticsOpen} onClose={() => setIsDiagnosticsOpen(false)} />
    </div>
  );
}

export default App;
