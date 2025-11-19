import React, { useState } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import './GuidedAnalysis.css';
import { Question, RequirementAnalysisStep } from './types';

interface GuidedAnalysisProps {
    onComplete: (requirements: string) => void;
    onCancel: () => void;
}

const GuidedAnalysis: React.FC<GuidedAnalysisProps> = ({ onComplete, onCancel }) => {
    const [currentStep, setCurrentStep] = useState<RequirementAnalysisStep>(RequirementAnalysisStep.Input);
    const [initialRequirement, setInitialRequirement] = useState('');
    const [questions, setQuestions] = useState<Question[]>([]);
    const [answers, setAnswers] = useState<{ [key: string]: string }>({});
    const [detailedRequirements, setDetailedRequirements] = useState('');
    const [editFeedback, setEditFeedback] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Step 1: Initial Input
    const handleInitialSubmit = async () => {
        if (initialRequirement.trim().length < 10) {
            setError('Please provide at least a brief description (more than 10 characters)');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Call backend to generate questions
            const response = await invoke<Question[]>('generate_questions', {
                initialRequirement: initialRequirement.trim()
            });

            setQuestions(response);
            setCurrentStep(RequirementAnalysisStep.Questions);
        } catch (err: any) {
            setError(`Failed to generate questions: ${err}`);
        } finally {
            setIsLoading(false);
        }
    };

    // Step 2: Answer Questions
    const handleAnswerChange = (index: number, value: string) => {
        setAnswers(prev => ({
            ...prev,
            [index.toString()]: value
        }));
    };

    const handleGenerateRequirements = async () => {
        setIsLoading(true);
        setError(null);

        try {
            // Call backend to generate detailed requirements
            const response = await invoke<string>('generate_detailed_requirements', {
                initialRequirement: initialRequirement.trim(),
                answers: answers
            });

            setDetailedRequirements(response);
            setCurrentStep(RequirementAnalysisStep.Summary);
        } catch (err: any) {
            setError(`Failed to generate requirements: ${err}`);
        } finally {
            setIsLoading(false);
        }
    };

    // Step 3: Review and Confirm
    const handleConfirm = () => {
        onComplete(detailedRequirements);
    };

    const handleEdit = () => {
        setCurrentStep(RequirementAnalysisStep.Editing);
    };

    // Step 4: Edit Requirements
    const handleApplyEdit = async () => {
        if (!editFeedback.trim()) {
            setError('Please provide your modification request');
            return;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Call backend to edit requirements
            const response = await invoke<string>('edit_requirements', {
                currentRequirements: detailedRequirements,
                editFeedback: editFeedback.trim()
            });

            setDetailedRequirements(response);
            setEditFeedback('');
            setCurrentStep(RequirementAnalysisStep.Summary);
        } catch (err: any) {
            setError(`Failed to edit requirements: ${err}`);
        } finally {
            setIsLoading(false);
        }
    };

    const handleStartOver = () => {
        setCurrentStep(RequirementAnalysisStep.Input);
        setInitialRequirement('');
        setQuestions([]);
        setAnswers({});
        setDetailedRequirements('');
        setEditFeedback('');
        setError(null);
    };

    const renderProgressBar = () => {
        const steps = ['Input', 'Questions', 'Summary', 'Complete'];
        const currentIndex = Object.values(RequirementAnalysisStep).indexOf(currentStep);

        return (
            <div className="progress-bar">
                {steps.map((step, index) => (
                    <div key={step} className={`progress-step ${index <= currentIndex ? 'active' : ''}`}>
                        <div className="progress-circle">{index + 1}</div>
                        <div className="progress-label">{step}</div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="guided-analysis-container">
            <div className="guided-analysis-header">
                <h2>🧠 Guided Analysis Mode</h2>
                <p>Let our AI guide you through a series of questions to better understand your requirements.</p>
                {renderProgressBar()}
            </div>

            {error && (
                <div className="error-message">
                    ❌ {error}
                </div>
            )}

            <div className="guided-analysis-content">
                {/* Step 1: Initial Input */}
                {currentStep === RequirementAnalysisStep.Input && (
                    <div className="step-container step-input">
                        <div className="step-header">
                            <h3>📝 Step 1: Tell us your basic idea</h3>
                            <p>What would you like to build? (Brief description is fine)</p>
                        </div>

                        <textarea
                            value={initialRequirement}
                            onChange={(e) => setInitialRequirement(e.target.value)}
                            placeholder="Example: A web app for sentiment analysis of social media posts"
                            rows={6}
                            className="requirement-input"
                        />

                        <div className="step-actions">
                            <button onClick={onCancel} className="btn-secondary">Cancel</button>
                            <button
                                onClick={handleInitialSubmit}
                                disabled={isLoading || initialRequirement.trim().length < 10}
                                className="btn-primary"
                            >
                                {isLoading ? 'Generating Questions...' : '🚀 Generate Questions'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 2: Answer Questions */}
                {currentStep === RequirementAnalysisStep.Questions && (
                    <div className="step-container step-questions">
                        <div className="step-header">
                            <h3>🤔 Step 2: Answer questions to refine your requirements</h3>
                            <div className="initial-requirement-preview">
                                <strong>Your Initial Idea:</strong> {initialRequirement}
                            </div>
                        </div>

                        <div className="questions-list">
                            {questions.map((question, index) => (
                                <div key={index} className="question-card">
                                    <div className="question-header">
                                        <span className="question-category">{question.category}</span>
                                        <span className={`question-importance ${question.importance.toLowerCase()}`}>
                                            {question.importance} Priority
                                        </span>
                                    </div>
                                    <div className="question-text">{question.question}</div>
                                    {question.hint && (
                                        <div className="question-hint">💡 {question.hint}</div>
                                    )}
                                    <textarea
                                        value={answers[index.toString()] || ''}
                                        onChange={(e) => handleAnswerChange(index, e.target.value)}
                                        placeholder="Enter your answer here, or leave blank to skip..."
                                        rows={3}
                                        className="answer-input"
                                    />
                                </div>
                            ))}
                        </div>

                        <div className="answers-summary">
                            📊 You've answered {Object.keys(answers).filter(k => answers[k].trim()).length} out of {questions.length} questions.
                        </div>

                        <div className="step-actions">
                            <button onClick={() => setCurrentStep(RequirementAnalysisStep.Input)} className="btn-secondary">
                                ⬅️ Back
                            </button>
                            <button onClick={handleGenerateRequirements} disabled={isLoading} className="btn-primary">
                                {isLoading ? 'Generating...' : '📋 Generate Detailed Requirements'}
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Review Summary */}
                {currentStep === RequirementAnalysisStep.Summary && (
                    <div className="step-container step-summary">
                        <div className="step-header">
                            <h3>📋 Step 3: Review and confirm your detailed requirements</h3>
                            <p>Based on your input, here's the detailed requirements document we've generated.</p>
                        </div>

                        <div className="requirements-preview">
                            <div className="requirements-content">
                                {detailedRequirements.split('\n').map((line, index) => (
                                    <p key={index}>{line}</p>
                                ))}
                            </div>
                        </div>

                        <div className="step-actions">
                            <button onClick={handleStartOver} className="btn-secondary">🔄 Start Over</button>
                            <button onClick={handleEdit} className="btn-secondary">✏️ Edit Requirements</button>
                            <button onClick={handleConfirm} className="btn-primary">✅ Looks Good, Proceed</button>
                        </div>
                    </div>
                )}

                {/* Step 4: Edit Requirements */}
                {currentStep === RequirementAnalysisStep.Editing && (
                    <div className="step-container step-editing">
                        <div className="step-header">
                            <h3>✏️ Step 4: Edit your requirements</h3>
                            <p>Review the current requirements and tell us how you'd like to modify them.</p>
                        </div>

                        <div className="current-requirements">
                            <h4>📋 Current Requirements</h4>
                            <div className="requirements-content">
                                {detailedRequirements.split('\n').map((line, index) => (
                                    <p key={index}>{line}</p>
                                ))}
                            </div>
                        </div>

                        <div className="edit-section">
                            <h4>💭 How would you like to modify the requirements?</h4>
                            <textarea
                                value={editFeedback}
                                onChange={(e) => setEditFeedback(e.target.value)}
                                placeholder="For example:&#10;- Add user authentication feature&#10;- Change database from MySQL to PostgreSQL&#10;- Include mobile responsive design"
                                rows={5}
                                className="edit-input"
                            />
                        </div>

                        <div className="step-actions">
                            <button onClick={handleStartOver} className="btn-secondary">🔄 Start Over</button>
                            <button
                                onClick={() => {
                                    setEditFeedback('');
                                    setCurrentStep(RequirementAnalysisStep.Summary);
                                }}
                                className="btn-secondary"
                            >
                                ↩️ Back to Summary
                            </button>
                            <button
                                onClick={handleApplyEdit}
                                disabled={isLoading || !editFeedback.trim()}
                                className="btn-primary"
                            >
                                {isLoading ? 'Applying Changes...' : '🔄 Apply Changes'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default GuidedAnalysis;
