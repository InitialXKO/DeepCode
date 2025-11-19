import React, { useState } from 'react';
import { save } from '@tauri-apps/api/dialog';
import { invoke } from '@tauri-apps/api/tauri';
import { ApiResponse } from './types';
import './ResultsDisplay.css';

interface ResultsDisplayProps {
    result: ApiResponse;
}

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ result }) => {
    const [activeTab, setActiveTab] = useState<'analysis' | 'download' | 'implementation' | 'files'>('implementation');

    if (!result) return null;

    const handleExport = async () => {
        const filePath = await save({
            filters: [{
                name: 'JSON',
                extensions: ['json']
            }]
        });
        if (filePath) {
            await invoke('write_file', { filePath, content: JSON.stringify(result, null, 2) });
        }
    };

    const handleDownload = async (filePath: string) => {
        const content = await invoke<number[]>('read_file_binary', { filePath });
        const blob = new Blob([new Uint8Array(content)], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filePath.split('/').pop() || 'download';
        a.click();
        URL.revokeObjectURL(url);
    };

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
                const files = result.repo_result?.generated_files || [];
                return (
                    <div className="tab-content files-content">
                        <h3>Generated Files</h3>
                        <div className="file-list">
                            {files.length > 0 ? files.map((file: string, index: number) => (
                                <div key={index} className="file-item">
                                    <span className="file-icon">📄</span>
                                    <span className="file-name">{file.split('/').pop()}</span>
                                    <button className="download-btn" onClick={() => handleDownload(file)}>Download</button>
                                </div>
                            )) : <p>No files generated.</p>}
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
                <button className="export-btn" onClick={handleExport}>Export Results</button>
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
