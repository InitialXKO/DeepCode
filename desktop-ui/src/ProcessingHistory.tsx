import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import './ProcessingHistory.css';
import { ProcessingHistoryEntry } from './types';

interface ProcessingHistoryProps {
    isOpen: boolean;
    onClose: () => void;
}

const ProcessingHistory: React.FC<ProcessingHistoryProps> = ({ isOpen, onClose }) => {
    const [history, setHistory] = useState<ProcessingHistoryEntry[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen) {
            loadHistory();
        }
    }, [isOpen]);

    const loadHistory = async () => {
        setIsLoading(true);
        try {
            const response = await invoke<ProcessingHistoryEntry[]>('get_processing_history');
            setHistory(response);
        } catch (error) {
            console.error('Failed to load processing history:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleClearHistory = async () => {
        if (!confirm('Are you sure you want to clear all processing history?')) {
            return;
        }

        try {
            await invoke('clear_processing_history');
            setHistory([]);
        } catch (error) {
            console.error('Failed to clear history:', error);
        }
    };

    const toggleExpand = (id: string) => {
        setExpandedId(expandedId === id ? null : id);
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'success':
                return '✅';
            case 'error':
                return '❌';
            case 'processing':
                return '🔄';
            default:
                return '⚪';
        }
    };

    const getInputTypeIcon = (inputType: string) => {
        switch (inputType) {
            case 'file':
                return '📁';
            case 'url':
                return '🌐';
            case 'chat':
                return '💬';
            default:
                return '📄';
        }
    };

    if (!isOpen) return null;

    return (
        <div className="history-overlay">
            <div className="history-container">
                <div className="history-header">
                    <h2>📊 Processing History</h2>
                    <button className="close-btn" onClick={onClose}>&times;</button>
                </div>

                <div className="history-content">
                    {isLoading ? (
                        <div className="loading-state">
                            <div className="loader"></div>
                            <p>Loading history...</p>
                        </div>
                    ) : history.length === 0 ? (
                        <div className="empty-state">
                            <div className="empty-icon">📭</div>
                            <h3>No processing history yet</h3>
                            <p>Your completed tasks will appear here</p>
                        </div>
                    ) : (
                        <>
                            <div className="history-stats">
                                <div className="stat-item">
                                    <span className="stat-label">Total Tasks:</span>
                                    <span className="stat-value">{history.length}</span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-label">Successful:</span>
                                    <span className="stat-value success">
                                        {history.filter(h => h.status === 'success').length}
                                    </span>
                                </div>
                                <div className="stat-item">
                                    <span className="stat-label">Failed:</span>
                                    <span className="stat-value error">
                                        {history.filter(h => h.status === 'error').length}
                                    </span>
                                </div>
                            </div>

                            <div className="history-list">
                                {history.slice().reverse().map((entry) => (
                                    <div key={entry.id} className={`history-item ${entry.status}`}>
                                        <div
                                            className="history-item-header"
                                            onClick={() => toggleExpand(entry.id)}
                                        >
                                            <div className="item-info">
                                                <span className="status-icon">{getStatusIcon(entry.status)}</span>
                                                <span className="input-type-icon">{getInputTypeIcon(entry.input_type)}</span>
                                                <span className="timestamp">{entry.timestamp}</span>
                                            </div>
                                            <button className="expand-btn">
                                                {expandedId === entry.id ? '▼' : '▶'}
                                            </button>
                                        </div>

                                        {expandedId === entry.id && (
                                            <div className="history-item-details">
                                                <div className="detail-row">
                                                    <strong>Status:</strong>
                                                    <span className={`status-badge ${entry.status}`}>
                                                        {entry.status.toUpperCase()}
                                                    </span>
                                                </div>
                                                <div className="detail-row">
                                                    <strong>Input Type:</strong>
                                                    <span>{entry.input_type}</span>
                                                </div>
                                                {entry.input_source && (
                                                    <div className="detail-row">
                                                        <strong>Input Source:</strong>
                                                        <span className="input-source">{entry.input_source}</span>
                                                    </div>
                                                )}
                                                {entry.result && (
                                                    <div className="detail-row full-width">
                                                        <strong>Result:</strong>
                                                        <pre className="result-content">{entry.result}</pre>
                                                    </div>
                                                )}
                                                {entry.error && (
                                                    <div className="detail-row full-width">
                                                        <strong>Error:</strong>
                                                        <pre className="error-content">{entry.error}</pre>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {history.length > 0 && (
                    <div className="history-footer">
                        <button className="btn-clear" onClick={handleClearHistory}>
                            🗑️ Clear History
                        </button>
                        <button className="btn-refresh" onClick={loadHistory}>
                            🔄 Refresh
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProcessingHistory;
