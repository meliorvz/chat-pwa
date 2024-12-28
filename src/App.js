import React, { useState, useEffect, useRef } from 'react';
import { 
  Container, 
  Box, 
  TextField, 
  Button, 
  Paper, 
  Typography,
  AppBar,
  Toolbar,
  IconButton,
  Drawer,
  List,
  ListItem,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  // eslint-disable-next-line no-unused-vars
  Select,
  // eslint-disable-next-line no-unused-vars
  MenuItem,
  // eslint-disable-next-line no-unused-vars
  FormControl,
  // eslint-disable-next-line no-unused-vars
  InputLabel
} from '@mui/material';
import { Settings, Send, Menu } from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import OpenAI from 'openai';
import { openDB } from 'idb';
import './styles/terminal.css';

const DB_NAME = 'chat-diy-db';
const STORE_NAME = 'api-keys';

const MODELS = {
  'claude-haiku': {
    backend: 'anthropic',
    modelId: 'claude-3-haiku-20240307',
    label: 'Claude Haiku',
    parameters: {
      temperature: 0.7,
      max_tokens: 4096
    }
  },
  'claude-sonnet': {
    backend: 'anthropic',
    modelId: 'claude-3-5-sonnet-latest',
    label: 'Claude Sonnet',
    parameters: {
      temperature: 0.7,
      max_tokens: 4096
    }
  },
  'gpt-4o': {
    backend: 'openai',
    modelId: 'gpt-4o',
    label: 'GPT-4o',
    parameters: {
      temperature: 0.7,
      max_tokens: 4096
    },
    parameterMap: {
      max_tokens: 'max_tokens'
    }
  },
  'o1-mini': {
    backend: 'openai',
    modelId: 'o1-mini',
    label: 'o1 Mini',
    parameters: {
      temperature: 1,
      max_tokens: 2048
    },
    parameterMap: {
      max_tokens: 'max_completion_tokens'
    }
  },
  'grok-beta': {
    backend: 'xai',
    modelId: 'grok-beta',
    label: 'Grok Beta',
    parameters: {
      temperature: 0.6,
      max_tokens: 2048
    }
  },
  'grok-2-1212': {
    backend: 'xai',
    modelId: 'grok-2-1212',
    label: 'Grok 2',
    parameters: {
      temperature: 0.5,
      max_tokens: 1024
    }
  },
  'llama-3.1-small': {
    backend: 'perplexity',
    modelId: 'llama-3.1-sonar-small-128k-online',
    label: 'Perplexity (Llama 3.1 8B)',
    parameters: {
      temperature: 0.7,
      max_tokens: 4096
    }
  },
  'llama-3.1-large': {
    backend: 'perplexity',
    modelId: 'llama-3.1-sonar-large-128k-online', 
    label: 'Perplexity (Llama 3.1 70B)',
    parameters: {
      temperature: 0.7,
      max_tokens: 4096
    }
  },
  'llama-3.1-huge': {
    backend: 'perplexity',
    modelId: 'llama-3.1-sonar-huge-128k-online',
    label: 'Perplexity (Llama 3.1 405B)',
    parameters: {
      temperature: 0.7,
      max_tokens: 4096
    }
  },
  'deepseek-chat': {
    backend: 'deepseek',
    modelId: 'deepseek-chat',
    label: 'DeepSeek',
    parameters: {
      temperature: 0.7,
      max_tokens: 4096
    }
  }
};

async function initDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      db.createObjectStore(STORE_NAME);
    },
  });
}

const ModelButton = ({ modelKey, onClick }) => (
  <Button
    onClick={onClick}
    sx={{ 
      backgroundColor: 'var(--text-color)',
      color: 'var(--background-color)',
      fontFamily: 'var(--font-family)',
      fontSize: '1rem',
      minWidth: 'auto',
      padding: '0 4px',
      height: '1.4rem',
      lineHeight: 1,
      border: 'none',
      borderRadius: 0,
      textTransform: 'none',
      margin: '2px',
      '&:hover': {
        backgroundColor: 'var(--text-color)',
        opacity: 0.9
      }
    }}
  >
    [{modelKey}]
  </Button>
);

const CopyButton = ({ content }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Button 
      onClick={handleCopy}
      className="copy-button"
    >
      [{copied ? 'copied' : 'copy'}]
    </Button>
  );
};

const BlockWrapper = ({ children, content }) => {
  return (
    <div className="block-wrapper">
      {React.cloneElement(children, {
        children: (
          <>
            <CopyButton content={content} />
            {children.props.children}
          </>
        )
      })}
    </div>
  );
};

const CodeBlock = ({ children }) => {
  const content = children.props.children;
  return (
    <BlockWrapper content={content}>
      <pre>{children}</pre>
    </BlockWrapper>
  );
};

const TableBlock = ({ children }) => {
  const content = children.props.children;
  return (
    <BlockWrapper content={content}>
      <table>{children}</table>
    </BlockWrapper>
  );
};

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [currentModel, setCurrentModel] = useState('deepseek-chat');
  const [apiKeys, setApiKeys] = useState({
    openai: '',
    anthropic: '',
    xai: '',
    perplexity: '',
    deepseek: ''
  });
  const [isFocused, setIsFocused] = useState(false);
  
  const messagesEndRef = useRef(null);
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // Load API keys from IndexedDB
    const loadApiKeys = async () => {
      const db = await initDB();
      const keys = await db.get(STORE_NAME, 'api-keys');
      if (keys) {
        setApiKeys(keys);
      }
    };
    loadApiKeys();
  }, []);

  const saveApiKeys = async (newKeys) => {
    const db = await initDB();
    await db.put(STORE_NAME, newKeys, 'api-keys');
    setApiKeys(newKeys);
  };

  const handleModelSwitch = (modelKey) => {
    // Add user message
    setMessages(prev => [...prev, {
      role: 'user',
      content: modelKey
    }]);

    // Add system response
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: `Switched to ${MODELS[modelKey].label}`,
      model: {
        label: 'SYSTEM',
        id: 'system'
      }
    }]);

    setCurrentModel(modelKey);
  };

  const handleModelButtonClick = () => {
    // Group models by backend
    const modelsByBackend = Object.entries(MODELS).reduce((acc, [key, model]) => {
      if (!acc[model.backend]) {
        acc[model.backend] = [];
      }
      acc[model.backend].push({ key, ...model });
      return acc;
    }, {});

    // Create formatted model list with React components
    const ModelList = () => (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {Object.entries(modelsByBackend).map(([backend, models]) => (
          <Box key={backend} sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {models.map(model => (
              <ModelButton
                key={model.key}
                modelKey={model.key}
                onClick={() => handleModelSwitch(model.key)}
              />
            ))}
          </Box>
        ))}
      </Box>
    );

    // Add system message
    setMessages(prev => [...prev, {
      role: 'assistant',
      content: (
        <Box>
          <Typography sx={{ mb: 2 }}>Available models:</Typography>
          <ModelList />
          <Typography sx={{ mt: 2 }}>Click a model or type /{`<model-name>`} to switch</Typography>
        </Box>
      ),
      model: {
        label: 'SYSTEM',
        id: 'system'
      }
    }]);
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    
    // Check if input is a model switch command (now requires "/" prefix)
    const modelCommand = input.trim();
    if (modelCommand.startsWith('/')) {
      const modelKey = modelCommand.slice(1); // Remove the "/" prefix
      if (MODELS[modelKey]) {
        handleModelSwitch(modelKey);
        setInput('');
        return;
      }
    }
    
    const model = MODELS[currentModel];
    const userMessage = { role: 'user', content: input };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      let response;
      
      // Format messages for API calls - convert React components to strings
      const formattedMessages = messages
        .filter(msg => msg.role !== 'assistant' || typeof msg.content === 'string')
        .map(msg => ({
          role: msg.role,
          content: typeof msg.content === 'string' ? msg.content : ''
        }));
      
      // Add the current user message
      formattedMessages.push(userMessage);
      
      if (model.backend === 'openai') {
        const openai = new OpenAI({ 
          apiKey: apiKeys.openai, 
          dangerouslyAllowBrowser: true 
        });

        // Map parameters according to model's parameter map
        const apiParams = {};
        Object.entries(model.parameters).forEach(([key, value]) => {
          const mappedKey = model.parameterMap?.[key] || key;
          apiParams[mappedKey] = value;
        });

        const completion = await openai.chat.completions.create({
          model: model.modelId,
          messages: formattedMessages,
          ...apiParams
        });
        response = completion.choices[0].message;
      } else if (model.backend === 'anthropic') {
        try {
          const apiResponse = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': apiKeys.anthropic,
              'anthropic-version': '2023-06-01',
              'anthropic-dangerous-direct-browser-access': 'true'
            },
            body: JSON.stringify({
              model: model.modelId,
              max_tokens: model.parameters.max_tokens,
              temperature: model.parameters.temperature,
              messages: formattedMessages.map(msg => ({
                role: msg.role === 'assistant' ? 'assistant' : 'user',
                content: [{ 
                  type: 'text', 
                  text: msg.content 
                }]
              }))
            })
          });

          if (!apiResponse.ok) {
            const errorData = await apiResponse.json().catch(() => null);
            throw new Error(errorData?.error?.message || `HTTP error! status: ${apiResponse.status}`);
          }

          const completion = await apiResponse.json();
          
          if (completion.content && completion.content[0] && completion.content[0].text) {
            response = { 
              role: 'assistant', 
              content: completion.content[0].text 
            };
          } else {
            throw new Error('Invalid response format from Anthropic API');
          }
        } catch (error) {
          console.error('Anthropic API error:', error);
          throw error;
        }
      } else if (model.backend === 'xai') {
        try {
          const apiResponse = await fetch('https://api.x.ai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKeys.xai}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: model.modelId,
              messages: [
                { 
                  role: "system", 
                  content: "You are Grok, a chatbot inspired by the Hitchhiker's Guide to the Galaxy." 
                },
                ...formattedMessages
              ],
              temperature: model.parameters.temperature,
              max_tokens: model.parameters.max_tokens,
              stream: false
            })
          });

          if (!apiResponse.ok) {
            const errorData = await apiResponse.json().catch(() => null);
            throw new Error(errorData?.error?.message || `HTTP error! status: ${apiResponse.status}`);
          }

          const completion = await apiResponse.json();
          
          if (completion.choices && completion.choices[0] && completion.choices[0].message) {
            response = completion.choices[0].message;
          } else {
            throw new Error('Invalid response format from XAI API');
          }
        } catch (error) {
          console.error('XAI API error:', error);
          throw error;
        }
      } else if (model.backend === 'perplexity') {
        try {
          const apiResponse = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKeys.perplexity}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: model.modelId,
              messages: formattedMessages.map(msg => ({
                role: msg.role === 'assistant' ? 'assistant' : 'user',
                content: msg.content
              })),
              temperature: model.parameters.temperature,
              max_tokens: model.parameters.max_tokens
            })
          });

          if (!apiResponse.ok) {
            const errorData = await apiResponse.json().catch(() => null);
            throw new Error(errorData?.error?.message || `HTTP error! status: ${apiResponse.status}`);
          }

          const completion = await apiResponse.json();
          
          if (completion.choices && completion.choices[0] && completion.choices[0].message) {
            response = completion.choices[0].message;
          } else {
            throw new Error('Invalid response format from Perplexity API');
          }
        } catch (error) {
          console.error('Perplexity API error:', error);
          throw error;
        }
      } else if (model.backend === 'deepseek') {
        const openai = new OpenAI({ 
          baseURL: 'https://api.deepseek.com',
          apiKey: apiKeys.deepseek,
          dangerouslyAllowBrowser: true 
        });

        const completion = await openai.chat.completions.create({
          model: model.modelId,
          messages: formattedMessages,
          temperature: model.parameters.temperature,
          max_tokens: model.parameters.max_tokens
        });
        
        response = completion.choices[0].message;
      }

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: response.content || response,
        model: {
          label: model.label,
          id: currentModel
        }
      }]);
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${error.message}`,
        model: {
          label: model.label,
          id: currentModel
        }
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column', 
      backgroundColor: 'var(--background-color)',
      color: 'var(--text-color)',
      fontFamily: 'var(--font-family)'
    }}>
      <AppBar position="static" sx={{ 
        backgroundColor: 'var(--background-color)', 
        borderBottom: 'var(--border-thickness) solid var(--border-color)',
        boxShadow: 'none'
      }}>
        <Toolbar variant="dense" sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Button
            onClick={handleModelButtonClick}
            sx={{ 
              backgroundColor: 'var(--text-color)',
              color: 'var(--background-color)',
              fontFamily: 'var(--font-family)',
              fontSize: '1rem',
              minWidth: 'auto',
              padding: '0 4px',
              height: '1.4rem',
              lineHeight: 1,
              border: 'none',
              borderRadius: 0,
              textTransform: 'lowercase',
              '&:hover': {
                backgroundColor: 'var(--text-color)',
                opacity: 0.9
              }
            }}
          >
            [change model]
          </Button>
          <Typography variant="h6" sx={{ 
            fontFamily: 'var(--font-family)',
            color: 'var(--text-color)',
            fontSize: '1rem',
            letterSpacing: '0.02em',
            flexGrow: 0
          }}>
            $ chat_terminal
          </Typography>
          <Button
            onClick={() => setSettingsOpen(true)}
            sx={{ 
              backgroundColor: 'var(--text-color)',
              color: 'var(--background-color)',
              fontFamily: 'var(--font-family)',
              fontSize: '1rem',
              minWidth: 'auto',
              padding: '0 4px',
              height: '1.4rem',
              lineHeight: 1,
              border: 'none',
              borderRadius: 0,
              textTransform: 'lowercase',
              '&:hover': {
                backgroundColor: 'var(--text-color)',
                opacity: 0.9
              }
            }}
          >
            [api keys]
          </Button>
        </Toolbar>
      </AppBar>

      <Box sx={{ 
        flex: 1, 
        overflowY: 'auto', 
        p: 2, 
        backgroundColor: 'var(--background-color)',
        fontFamily: 'var(--font-family)'
      }} className="terminal-output">
        {messages.map((message, index) => (
          <Box
            key={index}
            className="terminal-line"
          >
            {message.role === 'user' ? (
              <Typography component="div" sx={{ 
                fontFamily: 'var(--font-family)',
                mb: 1
              }}>
                You: {message.content}
              </Typography>
            ) : (
              <Box className="message">
                <Typography 
                  component="div" 
                  sx={{ 
                    fontFamily: 'var(--font-family)',
                    fontSize: '0.9rem',
                    mb: 1,
                    opacity: 0.7
                  }}
                >
                  {message.model?.label || MODELS[currentModel].label}
                </Typography>
                {typeof message.content === 'string' ? (
                  <ReactMarkdown
                    components={{
                      pre: CodeBlock,
                      table: TableBlock
                    }}
                  >
                    {message.content}
                  </ReactMarkdown>
                ) : (
                  message.content
                )}
              </Box>
            )}
          </Box>
        ))}
        <div ref={messagesEndRef} />
      </Box>

      <Box sx={{ 
        p: 2, 
        borderTop: 'var(--border-thickness) solid var(--border-color)', 
        backgroundColor: 'var(--background-color)'
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography sx={{ 
            fontFamily: 'var(--font-family)',
            color: 'var(--text-color)',
            opacity: 0.7,
            userSelect: 'none',
            mr: 1
          }}>
            $
          </Typography>
          <Box sx={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
            <TextField
              fullWidth
              variant="standard"
              placeholder={isFocused ? "" : "Type your command..."}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              disabled={isLoading}
              multiline={false}
              className="terminal-input"
              InputProps={{
                disableUnderline: true,
                sx: {
                  fontFamily: 'var(--font-family)',
                  fontSize: '1rem',
                  height: '24px',
                  lineHeight: '24px'
                }
              }}
            />
            {!isLoading && isFocused && (
              <Box 
                component="span"
                className="input-cursor"
                sx={{ 
                  position: 'absolute',
                  left: `${input.length}ch`,
                  height: '1.2em',
                  top: '50%',
                  transform: 'translateY(-50%)'
                }}
              />
            )}
          </Box>
        </Box>
      </Box>

      <Dialog 
        open={settingsOpen} 
        onClose={() => setSettingsOpen(false)}
        PaperProps={{
          sx: {
            backgroundColor: 'var(--background-color)',
            color: 'var(--text-color)',
            border: 'var(--border-thickness) solid var(--border-color)',
            fontFamily: 'var(--font-family)'
          }
        }}
      >
        <DialogTitle sx={{ fontFamily: 'var(--font-family)' }}>API Settings</DialogTitle>
        <DialogContent>
          {Object.entries(apiKeys).map(([key, value]) => (
            <TextField
              key={key}
              fullWidth
              margin="normal"
              label={`${key.toUpperCase()} API Key`}
              type="password"
              value={value}
              onChange={(e) => setApiKeys(prev => ({ ...prev, [key]: e.target.value }))}
              className="terminal-input"
              variant="standard"
              InputProps={{
                sx: { fontFamily: 'var(--font-family)' }
              }}
              InputLabelProps={{
                sx: { fontFamily: 'var(--font-family)' }
              }}
            />
          ))}
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setSettingsOpen(false)}
            sx={{ 
              color: 'var(--text-color)',
              fontFamily: 'var(--font-family)',
              '&:hover': {
                backgroundColor: 'var(--background-color-alt)'
              }
            }}
          >
            Cancel
          </Button>
          <Button 
            onClick={() => {
              saveApiKeys(apiKeys);
              setSettingsOpen(false);
            }}
            sx={{ 
              color: 'var(--text-color)',
              fontFamily: 'var(--font-family)',
              '&:hover': {
                backgroundColor: 'var(--background-color-alt)'
              }
            }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default App;
