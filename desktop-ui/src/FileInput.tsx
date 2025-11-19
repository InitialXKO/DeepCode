import React from 'react';
import './FileInput.css';

interface FileInputProps {
    onFileChange: (file: File) => void;
    selectedFile: File | null;
}

const FileInput: React.FC<FileInputProps> = ({ onFileChange, selectedFile }) => {
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            onFileChange(e.target.files[0]);
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <div className="file-input-container">
            <div className="file-drop-area">
                <input
                    type="file"
                    onChange={handleFileChange}
                    className="file-input-native"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.html,.htm,.txt,.md"
                    id="file-upload"
                />
                <label htmlFor="file-upload" className="file-input-label">
                    <span className="file-input-icon">📤</span>
                    <span className="file-input-text">
                        {selectedFile ? 'Change file' : 'Choose a file or drag it here'}
                    </span>
                </label>
            </div>
            {selectedFile && (
                <div className="file-info">
                    <p><strong>Selected File:</strong> {selectedFile.name}</p>
                    <p><strong>Size:</strong> {formatFileSize(selectedFile.size)}</p>
                    <p><strong>Type:</strong> {selectedFile.type || 'N/A'}</p>
                </div>
            )}
            <div className="supported-formats">
                <p><strong>Supported formats:</strong> PDF, DOCX, PPTX, XLSX, HTML, TXT, MD</p>
                <p>All files will be automatically converted to PDF for processing.</p>
            </div>
        </div>
    );
};

export default FileInput;
