// Type definitions for DeepCode Desktop UI

export interface Question {
    question: string;
    category: string;
    importance: 'High' | 'Medium' | 'Low';
    hint?: string;
}

export interface ProcessingHistoryEntry {
    id: string;
    timestamp: string;
    status: 'success' | 'error' | 'processing';
    input_type: 'file' | 'url' | 'chat';
    input_source?: string;
    result?: string;
    error?: string;
}

export interface SystemDiagnostics {
    python_version: string;
    platform: string;
    modules: {
        [key: string]: boolean;
    };
    event_loop_status: string;
}

export enum RequirementAnalysisStep {
    Input = 'input',
    Questions = 'questions',
    Summary = 'summary',
    Editing = 'editing'
}

export interface WorkflowConfig {
    enable_indexing: boolean;
}

export interface ApiResponse {
    status: 'success' | 'error';
    analysis_result?: string;
    download_result?: string;
    repo_result?: {
        result: string;
        files: string[];
    };
    error?: string;
    traceback?: string;
}
