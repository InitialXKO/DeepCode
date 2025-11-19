import React, { useState } from 'react';
import { ApiResponse } from './types';
import './ResultsDisplay.css';

interface ResultsDisplayProps {
    result: ApiResponse;
}

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ result }) => {
    const [activeTab, setActiveTab] = useState<'analysis' | 'download' | 'implementation' | 'files'>('implementation');

    if (!result) return null;

    const renderTabContent = () => {
        switch (activeTab) {
            case 'analysis':
                return (
                    <div className="tab-content analysis-content">
                        <h3>Analysis Phase</h3>
                        <div className="result-card">
                            <pre>{result.analysis_result || 'No analysis results available.'}</pre>
                        </div>
                    </div>
                );
            case 'download':
                return (
                    <div className="tab-content download-content">
                        <h3>Download Phase</h3>
                        <div className="result-card">
                            <pre>{result.download_result || 'No download results available.'}</pre>
                        </div>
                    </div>
                );
            case 'implementation':
                return (
                    <div className="tab-content implementation-content">
                        <h3>Implementation Phase</h3>
                        <div className="result-card">
                            <pre>{JSON.stringify(result.repo_result, null, 2) || 'No implementation results available.'}</pre>
                        </div>
                    </div>
                );
            case 'files':
                return (
                    <div className="tab-content files-content">
                        <h3>Generated Files</h3>
                        <div className="file-list">
                            {/* Placeholder for file list - in a real app, this would list generated files */}
                            <div className="file-item">
                                <span className="file-icon">📄</span>
                                <span className="file-name">implementation_plan.md</span>
                                <button className="download-btn">Download</button>
                            </div>
                            <div className="file-item">
                                <span className="file-icon">📦</span>
                                <span className="file-name">generated_code.zip</span>
                                <button className="download-btn">Download</button>
                            </div>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="results-display">
            <div className="results-header">
                <h2>Processing Results</h2>
                <div className="status-badge success">
                    <span className="dot"></span> Completed
                </div>
            </div>

            <div className="tabs-container">
                <div className="tabs-header">
                    <button
                        className={`tab-btn ${activeTab === 'analysis' ? 'active' : ''}`}
                        onClick={() => setActiveTab('analysis')}
                    >
                        📊 Analysis
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'download' ? 'active' : ''}`}
                        onClick={() => setActiveTab('download')}
                    >
                        ⬇️ Download
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'implementation' ? 'active' : ''}`}
                        onClick={() => setActiveTab('implementation')}
                    >
                        💻 Implementation
                    </button>
                    <button
                        className={`tab-btn ${activeTab === 'files' ? 'active' : ''}`}
                        onClick={() => setActiveTab('files')}
                    >
                        📂 Files
                    </button>
                </div>
                <div className="tabs-body">
                    {renderTabContent()}
                </div>
            </div>
        </div>
    );
};

export default ResultsDisplay;
