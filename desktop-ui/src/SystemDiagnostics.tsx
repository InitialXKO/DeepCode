import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import './SystemDiagnostics.css';
import { SystemDiagnostics as SystemDiagnosticsType } from './types';

interface SystemDiagnosticsProps {
    isOpen: boolean;
    onClose: () => void;
}

const SystemDiagnostics: React.FC<SystemDiagnosticsProps> = ({ isOpen, onClose }) => {
    const [diagnostics, setDiagnostics] = useState<SystemDiagnosticsType | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [resetMessage, setResetMessage] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            loadDiagnostics();
        }
    }, [isOpen]);

    const loadDiagnostics = async () => {
        setIsLoading(true);
        try {
            const response = await invoke<SystemDiagnosticsType>('get_system_diagnostics');
            setDiagnostics(response);
        } catch (error) {
            console.error('Failed to load system diagnostics:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleResetState = async () => {
        if (!confirm('Are you sure you want to reset the application state? This will clear all session data.')) {
            return;
        }

        try {
            await invoke('reset_application_state');
            await invoke('reset_application_state');
            setResetMessage('Application state reset successfully! Reloading...');
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } catch (error) {
            setResetMessage(`Failed to reset state: ${error}`);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="diagnostics-overlay">
            <div className="diagnostics-container">
                <div className="diagnostics-header">
                    <h2>🔧 System Diagnostics</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                <div className="diagnostics-content">
                    {isLoading ? (
                        <div className="loading-state">
                            <div className="loader"></div>
                            <p>Loading diagnostics...</p>
                        </div>
                    ) : diagnostics ? (
                        <>
                            {/* System Information */}
                            <section className="diag-section">
                                <h3>📊 Environment</h3>
                                <div className="info-grid">
                                    <div className="info-item">
                                        <span className="info-label">Python Version:</span>
                                        <span className="info-value">{diagnostics.python_version}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">Platform:</span>
                                        <span className="info-value">{diagnostics.platform}</span>
                                    </div>
                                    <div className="info-item">
                                        <span className="info-label">Event Loop:</span>
                                        <span className="info-value">{diagnostics.event_loop_status}</span>
                                    </div>
                                </div>
                            </section>

                            {/* Module Status */}
                            <section className="diag-section">
                                <h3>📦 Module Status</h3>
                                <div className="module-grid">
                                    {Object.entries(diagnostics.modules).map(([moduleName, isAvailable]) => (
                                        <div key={moduleName} className={`module-item ${isAvailable ? 'available' : 'missing'}`}>
                                            <span className="module-icon">{isAvailable ? '✅' : '❌'}</span>
                                            <span className="module-name">{moduleName}</span>
                                        </div>
                                    ))}
                                </div>
                            </section>

                            {/* Troubleshooting Tips */}
                            <section className="diag-section">
                                <h3>🛠️ Troubleshooting Tips</h3>
                                <div className="tips-container">
                                    <details className="tip-item">
                                        <summary>ScriptRunContext Warnings</summary>
                                        <div className="tip-content">
                                            <p><strong>What it means:</strong> Threading context warnings</p>
                                            <p><strong>Solution:</strong> These warnings are usually safe to ignore</p>
                                            <p><strong>Prevention:</strong> Restart the application if persistent</p>
                                        </div>
                                    </details>

                                    <details className="tip-item">
                                        <summary>Async Processing Errors</summary>
                                        <div className="tip-content">
                                            <p><strong>Symptoms:</strong> "Event loop" or "Thread" errors</p>
                                            <p><strong>Solution:</strong> The app uses multiple fallback methods</p>
                                            <p><strong>Action:</strong> Try refreshing or restarting</p>
                                        </div>
                                    </details>

                                    <details className="tip-item">
                                        <summary>File Upload Issues</summary>
                                        <div className="tip-content">
                                            <p><strong>Check:</strong> File size &lt; 200MB</p>
                                            <p><strong>Formats:</strong> PDF, DOCX, TXT, HTML, MD</p>
                                            <p><strong>Action:</strong> Try a different file format</p>
                                        </div>
                                    </details>

                                    <details className="tip-item">
                                        <summary>Processing Timeout</summary>
                                        <div className="tip-content">
                                            <p><strong>Normal:</strong> Large papers may take 5-10 minutes</p>
                                            <p><strong>Action:</strong> Wait patiently, check progress indicators</p>
                                            <p><strong>Limit:</strong> 5-minute maximum processing time</p>
                                        </div>
                                    </details>

                                    <details className="tip-item">
                                        <summary>Memory Issues</summary>
                                        <div className="tip-content">
                                            <p><strong>Symptoms:</strong> "Out of memory" errors</p>
                                            <p><strong>Solution:</strong> Close other applications</p>
                                            <p><strong>Action:</strong> Try smaller/simpler papers first</p>
                                        </div>
                                    </details>
                                </div>
                            </section>

                            {/* Reset Section */}
                            <section className="diag-section reset-section">
                                <h3>🔄 Application Reset</h3>
                                <p>If you're experiencing persistent issues, you can reset the application state.</p>
                                <button className="btn-reset" onClick={handleResetState}>
                                    🔄 Reset Application State
                                </button>
                                {resetMessage && (
                                    <div className={`reset-message ${resetMessage.includes('success') ? 'success' : 'error'}`}>
                                        {resetMessage}
                                    </div>
                                )}
                            </section>
                        </>
                    ) : (
                        <div className="error-state">
                            <p>Failed to load system diagnostics</p>
                            <button onClick={loadDiagnostics} className="btn-retry">Retry</button>
                        </div>
                    )}
                </div>

                <div className="diagnostics-footer">
                    <button className="btn-refresh" onClick={loadDiagnostics}>
                        🔄 Refresh
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SystemDiagnostics;
