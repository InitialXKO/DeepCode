import React from 'react';
import './ProgressDisplay.css';

interface WorkflowStep {
    icon: string;
    title: string;
    description: string;
}

interface ProgressDisplayProps {
    workflowSteps: WorkflowStep[];
    currentStep: number;
    statusText: string;
    progress: number;
    status: 'active' | 'completed' | 'error';
}

const ProgressDisplay: React.FC<ProgressDisplayProps> = ({ workflowSteps, currentStep, statusText, progress, status }) => {

    const getStepClass = (index: number) => {
        if (index < currentStep) return 'completed';
        if (index === currentStep) return status;
        return 'pending';
    };

    return (
        <div className="progress-display-container">
            <h3>🚀 AI Processing Workflow</h3>
            <div className="steps-grid">
                {workflowSteps.map((step, index) => (
                    <div key={index} className={`step-card ${getStepClass(index)}`}>
                        <div className="step-icon">{index < currentStep ? '✅' : step.icon}</div>
                        <div className="step-title">{step.title}</div>
                        <div className="step-description">{step.description}</div>
                    </div>
                ))}
            </div>
            <div className="progress-bar-container">
                <div className="progress-bar" style={{ width: `${progress}%` }}></div>
            </div>
            <div className="status-text">
                {status === 'error' ? `❌ Error: ${statusText}` : `ℹ️ ${statusText}`}
            </div>
        </div>
    );
};

export default ProgressDisplay;
