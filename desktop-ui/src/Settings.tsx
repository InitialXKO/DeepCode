import React, { useState, useEffect } from 'react';
import { invoke } from '@tauri-apps/api/tauri';
import './Settings.css';
import yaml from 'js-yaml';

interface SettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ConfigData {
  default_search_server: string;
  document_segmentation: {
    enabled: boolean;
    size_threshold_chars: number;
  };
  openai: {
    default_model: string;
    base_max_tokens?: number;
    max_tokens_policy?: string;
    retry_max_tokens?: number;
  };
  mcp?: {
    servers?: {
      brave?: { env?: { BRAVE_API_KEY?: string } };
      'bocha-mcp'?: { env?: { BOCHA_API_KEY?: string } };
    }
  };
  [key: string]: any;
}

interface SecretsData {
  openai: {
    api_key: string;
    base_url: string;
  };
  anthropic?: {
    api_key: string;
  };
  [key: string]: any;
}

const Settings: React.FC<SettingsProps> = ({ isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState('api-keys');
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  // Configuration State
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [secrets, setSecrets] = useState<SecretsData | null>(null);

  // Form State
  const [openaiKey, setOpenaiKey] = useState('');
  const [openaiBaseUrl, setOpenaiBaseUrl] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [braveKey, setBraveKey] = useState('');
  const [bochaKey, setBochaKey] = useState('');

  const [searchServer, setSearchServer] = useState('brave');
  const [docSegEnabled, setDocSegEnabled] = useState(false);
  const [docSegThreshold, setDocSegThreshold] = useState(50000);
  const [defaultModel, setDefaultModel] = useState('anthropic/claude-3.5-sonnet');

  useEffect(() => {
    if (isOpen) {
      loadConfiguration();
    }
  }, [isOpen]);

  const loadConfiguration = async () => {
    setIsLoading(true);
    setStatusMsg(null);
    try {
      // Load Config
      const configContent = await invoke<string>('read_config');
      const parsedConfig = yaml.load(configContent) as ConfigData;
      setConfig(parsedConfig);

      // Load Secrets
      const secretsContent = await invoke<string>('read_secrets');
      const parsedSecrets = yaml.load(secretsContent) as SecretsData;
      setSecrets(parsedSecrets);

      // Populate Form State
      setSearchServer(parsedConfig.default_search_server || 'brave');
      setDocSegEnabled(parsedConfig.document_segmentation?.enabled || false);
      setDocSegThreshold(parsedConfig.document_segmentation?.size_threshold_chars || 50000);
      setDefaultModel(parsedConfig.openai?.default_model || 'anthropic/claude-3.5-sonnet');

      // Populate Secrets
      setOpenaiKey(parsedSecrets.openai?.api_key || '');
      setOpenaiBaseUrl(parsedSecrets.openai?.base_url || '');
      setAnthropicKey(parsedSecrets.anthropic?.api_key || '');

      // Populate API Keys from Config (Brave/Bocha are in config, not secrets in the example)
      // Note: The README says to put them in config, but secrets might be better.
      // Following existing structure where they are in config env vars.
      if (parsedConfig.mcp?.servers?.brave?.env?.BRAVE_API_KEY) {
        setBraveKey(parsedConfig.mcp.servers.brave.env.BRAVE_API_KEY);
      }
      if (parsedConfig.mcp?.servers?.['bocha-mcp']?.env?.BOCHA_API_KEY) {
        setBochaKey(parsedConfig.mcp.servers['bocha-mcp'].env.BOCHA_API_KEY);
      }

    } catch (error) {
      console.error('Failed to load configuration:', error);
      setStatusMsg({ type: 'error', text: `Failed to load configuration: ${error}` });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    setIsLoading(true);
    setStatusMsg(null);
    try {
      if (!config || !secrets) return;

      // Update Config Object
      const newConfig = { ...config };
      newConfig.default_search_server = searchServer;

      if (!newConfig.document_segmentation) {
        newConfig.document_segmentation = { enabled: false, size_threshold_chars: 50000 };
      }
      newConfig.document_segmentation.enabled = docSegEnabled;
      newConfig.document_segmentation.size_threshold_chars = Number(docSegThreshold);

      if (!newConfig.openai) {
        newConfig.openai = { default_model: defaultModel };
      }
      newConfig.openai.default_model = defaultModel;

      // Update Brave Key
      if (newConfig.mcp?.servers?.brave) {
        if (!newConfig.mcp.servers.brave.env) newConfig.mcp.servers.brave.env = {};
        newConfig.mcp.servers.brave.env.BRAVE_API_KEY = braveKey;
      }

      // Update Bocha Key
      if (newConfig.mcp?.servers?.['bocha-mcp']) {
        if (!newConfig.mcp.servers['bocha-mcp'].env) newConfig.mcp.servers['bocha-mcp'].env = {};
        newConfig.mcp.servers['bocha-mcp'].env.BOCHA_API_KEY = bochaKey;
      }

      // Update Secrets Object
      const newSecrets = { ...secrets };
      if (!newSecrets.openai) newSecrets.openai = { api_key: '', base_url: '' };
      newSecrets.openai.api_key = openaiKey;
      newSecrets.openai.base_url = openaiBaseUrl;

      if (!newSecrets.anthropic) newSecrets.anthropic = { api_key: '' };
      newSecrets.anthropic.api_key = anthropicKey;

      // Save to Files
      await invoke('write_config', { content: yaml.dump(newConfig) });
      await invoke('write_secrets', { content: yaml.dump(newSecrets) });

      setStatusMsg({ type: 'success', text: 'Configuration saved successfully!' });

      // Reload to ensure sync
      await loadConfiguration();

    } catch (error) {
      console.error('Failed to save configuration:', error);
      setStatusMsg({ type: 'error', text: `Failed to save configuration: ${error}` });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="settings-overlay">
      <div className="settings-container">
        <div className="settings-header">
          <h2>Settings</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>

        <div className="settings-tabs">
          <button
            className={`tab-btn ${activeTab === 'api-keys' ? 'active' : ''}`}
            onClick={() => setActiveTab('api-keys')}
          >
            API Keys
          </button>
          <button
            className={`tab-btn ${activeTab === 'search' ? 'active' : ''}`}
            onClick={() => setActiveTab('search')}
          >
            Search Settings
          </button>
          <button
            className={`tab-btn ${activeTab === 'processing' ? 'active' : ''}`}
            onClick={() => setActiveTab('processing')}
          >
            Processing
          </button>
        </div>

        <div className="settings-content">
          {activeTab === 'api-keys' && (
            <>
              <div className="form-group">
                <label>OpenAI API Key</label>
                <input
                  type="password"
                  value={openaiKey}
                  onChange={(e) => setOpenaiKey(e.target.value)}
                  placeholder="sk-..."
                />
              </div>
              <div className="form-group">
                <label>OpenAI Base URL (Optional)</label>
                <input
                  type="text"
                  value={openaiBaseUrl}
                  onChange={(e) => setOpenaiBaseUrl(e.target.value)}
                  placeholder="https://api.openai.com/v1"
                />
              </div>
              <div className="form-group">
                <label>Anthropic API Key</label>
                <input
                  type="password"
                  value={anthropicKey}
                  onChange={(e) => setAnthropicKey(e.target.value)}
                  placeholder="sk-ant-..."
                />
              </div>
              <div className="form-group">
                <label>Brave Search API Key</label>
                <input
                  type="password"
                  value={braveKey}
                  onChange={(e) => setBraveKey(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Bocha-MCP API Key</label>
                <input
                  type="password"
                  value={bochaKey}
                  onChange={(e) => setBochaKey(e.target.value)}
                />
              </div>
            </>
          )}

          {activeTab === 'search' && (
            <>
              <div className="form-group">
                <label>Default Search Server</label>
                <select
                  value={searchServer}
                  onChange={(e) => setSearchServer(e.target.value)}
                >
                  <option value="brave">Brave Search (Recommended)</option>
                  <option value="bocha-mcp">Bocha-MCP</option>
                </select>
                <span className="help-text">Select the primary search provider for web queries.</span>
              </div>
            </>
          )}

          {activeTab === 'processing' && (
            <>
              <div className="form-group">
                <label>Default Model</label>
                <select
                  value={defaultModel}
                  onChange={(e) => setDefaultModel(e.target.value)}
                >
                  <option value="anthropic/claude-3.5-sonnet">Claude 3.5 Sonnet</option>
                  <option value="openai/gpt-4o">GPT-4o</option>
                  <option value="google/gemini-1.5-pro">Gemini 1.5 Pro</option>
                  <option value="deepseek/deepseek-chat">DeepSeek Chat</option>
                </select>
              </div>

              <div className="form-group">
                <label>Document Segmentation</label>
                <label className="toggle-switch">
                  <input
                    type="checkbox"
                    checked={docSegEnabled}
                    onChange={(e) => setDocSegEnabled(e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                  <span>Enable intelligent segmentation for large documents</span>
                </label>
              </div>

              {docSegEnabled && (
                <div className="form-group">
                  <label>Size Threshold (Characters)</label>
                  <input
                    type="number"
                    value={docSegThreshold}
                    onChange={(e) => setDocSegThreshold(Number(e.target.value))}
                  />
                  <span className="help-text">Documents larger than this will be segmented.</span>
                </div>
              )}
            </>
          )}

          {statusMsg && (
            <div className={`status-message ${statusMsg.type}`}>
              {statusMsg.type === 'success' ? '✅' : '❌'} {statusMsg.text}
            </div>
          )}
        </div>

        <div className="settings-footer">
          <button className="btn btn-secondary" onClick={loadConfiguration} disabled={isLoading}>Reset</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
