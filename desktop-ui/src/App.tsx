import React, { useState } from 'react';
import './App.css';
import Settings from './Settings';

// Define the structure of the API response for better type checking
interface ApiResponse {
  status: 'success' | 'error';
  repo_result?: {
    result: string;
    files: string[];
  };
  error?: string;
  traceback?: string;
}

function App() {
  // --- State Management ---
  const [inputType, setInputType] = useState<'chat' | 'url' | 'file'>('chat');
  const [textInput, setTextInput] = useState<string>('');
  const [fileInput, setFileInput] = useState<File | null>(null);
  const [taskStatus, setTaskStatus] = useState<'idle' | 'processing' | 'success' | 'error'>('idle');
  const [apiResult, setApiResult] = useState<ApiResponse | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // --- Event Handlers ---
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setTextInput(e.target.value);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFileInput(e.target.files[0]);
    }
  };

  const handleSubmit = async () => {
    setTaskStatus('processing');
    setApiResult(null);

    let response: Response;
    try {
      if (inputType === 'file' && fileInput) {
        const formData = new FormData();
        formData.append('file', fileInput);
        response = await fetch('http://localhost:8000/process/file', {
          method: 'POST',
          body: formData,
        });
      } else if (textInput.trim() !== '') {
        response = await fetch('http://localhost:8000/process/text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            input_source: textInput,
            input_type: inputType,
          }),
        });
      } else {
        alert('Please provide an input.');
        setTaskStatus('idle');
        return;
      }

      const data: ApiResponse = await response.json();

      if (!response.ok || data.status === 'error') {
        throw new Error(data.error || 'An unknown error occurred.');
      }

      setApiResult(data);
      setTaskStatus('success');

    } catch (err: any) {
      setApiResult({ status: 'error', error: err.message });
      setTaskStatus('error');
    }
  };

  // --- UI Rendering ---
  const renderInput = () => {
    switch (inputType) {
      case 'file':
        return (
          <input
            type="file"
            onChange={handleFileChange}
            className="file-input"
            accept=".pdf,.doc,.docx,.txt"
          />
        );
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

    if (taskStatus === 'success' && apiResult.repo_result) {
      return (
        <div className="result-success">
          <h3>Processing Successful!</h3>
          <p><strong>Result:</strong> {apiResult.repo_result.result}</p>
          <h4>Generated Files:</h4>
          <ul>
            {apiResult.repo_result.files.map((file, index) => (
              <li key={index}>{file}</li>
            ))}
          </ul>
        </div>
      );
    }

    if (taskStatus === 'error' && apiResult.error) {
      return (
        <div className="result-error">
          <h3>An Error Occurred</h3>
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
      <header>
        <div className="header-content">
          <h1>DeepCode Desktop</h1>
          <button
            className="settings-btn"
            onClick={() => setIsSettingsOpen(true)}
            title="Settings"
          >
            ⚙️
          </button>
        </div>
        <p>Your AI-powered research and coding assistant.</p>
      </header>

      <main>
        <div className="input-selector">
          <button onClick={() => setInputType('chat')} className={inputType === 'chat' ? 'active' : ''}>Chat</button>
          <button onClick={() => setInputType('url')} className={inputType === 'url' ? 'active' : ''}>URL</button>
          <button onClick={() => setInputType('file')} className={inputType === 'file' ? 'active' : ''}>File</button>
        </div>

        <div className="input-area">
          {renderInput()}
        </div>

        <button onClick={handleSubmit} disabled={taskStatus === 'processing'} className="submit-btn">
          {taskStatus === 'processing' ? 'Processing...' : '🚀 Start Processing'}
        </button>

        <div className="status-area">
          {taskStatus === 'processing' && <div className="loader"></div>}
          {renderResult()}
        </div>
      </main>

      <Settings isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </div>
  );
}

export default App;
