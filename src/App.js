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
  InputLabel,
  createTheme,
  ThemeProvider
} from '@mui/material';
import { Settings, Send, Menu } from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
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
    },
    pricing: {
      input: 0.0008,   // $0.80/M tokens
      output: 0.004    // $4.00/M tokens
    }
  },
  'claude-sonnet': {
    backend: 'anthropic',
    modelId: 'claude-3-5-sonnet-latest',
    label: 'Claude Sonnet',
    parameters: {
      temperature: 0.7,
      max_tokens: 4096
    },
    pricing: {
      input: 0.003,    // $3.00/M tokens
      output: 0.015    // $15.00/M tokens
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
    },
    pricing: {
      input: 0.0025,   // $2.50/M tokens
      output: 0.01     // $10.00/M tokens
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
    },
    pricing: {
      input: 0.003,    // $3.00/M tokens
      output: 0.012    // $12.00/M tokens
    }
  },
  'grok-beta': {
    backend: 'xai',
    modelId: 'grok-beta',
    label: 'Grok Beta',
    parameters: {
      temperature: 0.6,
      max_tokens: 2048
    },
    pricing: {
      input: 0.005,    // $5.00/M tokens
      output: 0.015    // $15.00/M tokens
    }
  },
  'grok-2': {
    backend: 'xai',
    modelId: 'grok-2',
    label: 'Grok 2',
    parameters: {
      temperature: 0.5,
      max_tokens: 1024
    },
    pricing: {
      input: 0.002,    // $2.00/M tokens
      output: 0.01     // $10.00/M tokens
    }
  },
  'llama-3.1-small': {
    backend: 'perplexity',
    modelId: 'llama-3.1-sonar-small-128k-online',
    label: 'Perplexity (Llama 3.1 8B)',
    parameters: {
      temperature: 0.7,
      max_tokens: 4096
    },
    pricing: {
      input: 0.0002,   // $0.20/M tokens + $5/1K requests
      output: 0.0002   // $0.20/M tokens + $5/1K requests
    }
  },
  'llama-3.1-large': {
    backend: 'perplexity',
    modelId: 'llama-3.1-sonar-large-128k-online', 
    label: 'Perplexity (Llama 3.1 70B)',
    parameters: {
      temperature: 0.7,
      max_tokens: 4096
    },
    pricing: {
      input: 0.001,    // $1.00/M tokens + $5/1K requests
      output: 0.001    // $1.00/M tokens + $5/1K requests
    }
  },
  'llama-3.1-huge': {
    backend: 'perplexity',
    modelId: 'llama-3.1-sonar-huge-128k-online',
    label: 'Perplexity (Llama 3.1 405B)',
    parameters: {
      temperature: 0.7,
      max_tokens: 4096
    },
    pricing: {
      input: 0.005,    // $5.00/M tokens + $5/1K requests
      output: 0.005    // $5.00/M tokens + $5/1K requests
    }
  },
  'deepseek-chat': {
    backend: 'deepseek',
    modelId: 'deepseek-chat',
    label: 'DeepSeek',
    parameters: {
      temperature: 0.7,
      max_tokens: 4096
    },
    pricing: {
      input: 0.00027,  // $0.27/M tokens
      output: 0.0011   // $1.10/M tokens
    }
  },
  'deepseek-reasoner': {
    backend: 'deepseek',
    modelId: 'deepseek-reasoner',
    label: 'DeepSeek Reasoner',
    parameters: {
      max_tokens: 8192  // Maximum allowed is 8K
    },
    pricing: {
      input: 0.00055,   // $0.55/M tokens
      output: 0.00219   // $2.19/M tokens
    }
  },
  'gemini-2.0-flash-exp': {
    backend: 'gemini',
    modelId: 'gemini-2.0-flash-exp',
    label: 'Gemini 2.0 Flash',
    parameters: {
      temperature: 0.7,
      max_tokens: 4096
    },
    pricing: {
      input: 0,    // Currently free - pricing TBA
      output: 0    // Currently free - pricing TBA
    }
  },
  'gemini-1.5-flash': {
    backend: 'gemini',
    modelId: 'gemini-1.5-flash',
    label: 'Gemini 1.5 Flash',
    parameters: {
      temperature: 0.7,
      max_tokens: 4096
    },
    pricing: {
      input: 0,    // Currently free - pricing TBA
      output: 0    // Currently free - pricing TBA
    }
  },
  'gemini-1.5-flash-8b': {
    backend: 'gemini',
    modelId: 'gemini-1.5-flash-8b',
    label: 'Gemini 1.5 Flash 8B',
    parameters: {
      temperature: 0.7,
      max_tokens: 4096
    },
    pricing: {
      input: 0,    // Currently free - pricing TBA
      output: 0    // Currently free - pricing TBA
    }
  },
  'gemini-1.5-pro': {
    backend: 'gemini',
    modelId: 'gemini-1.5-pro',
    label: 'Gemini 1.5 Pro',
    parameters: {
      temperature: 0.7,
      max_tokens: 4096
    },
    pricing: {
      input: 0,    // Currently free - pricing TBA
      output: 0    // Currently free - pricing TBA
    }
  }
};

// Helper function to calculate cost
const calculateCost = (inputTokens, outputTokens, model) => {
  const inputCost = (inputTokens / 1000) * model.pricing.input;
  const outputCost = (outputTokens / 1000) * model.pricing.output;
  
  // Add Perplexity's fixed request fee
  const fixedCost = model.backend === 'perplexity' ? 0.005 : 0; // $5/1K requests = $0.005 per request
  
  return {
    total: inputCost + outputCost + fixedCost,
    input: inputCost,
    output: outputCost,
    fixedCost,
    inputTokens,
    outputTokens
  };
};

async function initDB() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      db.createObjectStore(STORE_NAME);
    },
  });
}

const ModelButton = ({ modelKey, onClick, isAvailable }) => (
  <Button
    onClick={onClick}
    disabled={!isAvailable}
    sx={{ 
      backgroundColor: isAvailable ? 'var(--text-color)' : 'var(--background-color-alt)',
      color: isAvailable ? 'var(--background-color)' : 'var(--text-color)',
      fontFamily: 'var(--font-family)',
      fontSize: '1rem',
      minWidth: 'auto',
      padding: '0 4px',
      height: '1.4rem',
      lineHeight: 1,
      border: isAvailable ? 'none' : '1px solid var(--border-color)',
      borderRadius: 0,
      textTransform: 'none',
      margin: '2px',
      textDecoration: isAvailable ? 'none' : 'line-through',
      opacity: isAvailable ? 1 : 0.7,
      '&:hover': {
        backgroundColor: isAvailable ? 'var(--text-color)' : 'var(--background-color-alt)',
        opacity: isAvailable ? 0.9 : 0.7
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

// Create custom theme
const theme = createTheme({
  typography: {
    fontFamily: 'var(--font-family)',
    fontSize: 16,
    button: {
      textTransform: 'none',
    }
  },
  components: {
    MuiTypography: {
      styleOverrides: {
        root: {
          fontFamily: 'var(--font-family)',
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          fontFamily: 'var(--font-family)',
        }
      }
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          fontFamily: 'var(--font-family)',
        }
      }
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          fontFamily: 'var(--font-family)',
        }
      }
    }
  }
});

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
    deepseek: '',
    gemini: ''
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
        // Ensure all required keys exist
        const updatedKeys = {
          openai: '',
          anthropic: '',
          xai: '',
          perplexity: '',
          deepseek: '',
          gemini: '',
          ...keys
        };
        setApiKeys(updatedKeys);
        
        // Only show welcome message if messages array is empty
        if (messages.length === 0) {
          // Count how many API keys are set
          const setKeys = Object.values(keys).filter(key => key.length > 0);
          
          // Generate welcome message based on API key status
          if (setKeys.length === 0) {
            // SCENARIO A: First time user, no API keys
            setMessages([{
              role: 'assistant',
              content: `# Welcome to ChatDIY! 🚀

ChatDIY enables you to interact with various AI models through their APIs in a cost-efficient, pay-per-use manner. Unlike subscription-based services, you only pay for what you use.

## How to Get Started

1. You'll need to obtain API keys from the providers of the models you want to use:
    * OpenAI (GPT-4, etc.): [Get API key](https://platform.openai.com/api-keys)
    * Anthropic (Claude): [Get API key](https://console.anthropic.com/account/keys)
    * xAI (Grok): [Get API key](https://console.x.ai/)
    * Perplexity (Llama): [Get API key](https://www.perplexity.ai/settings/api)
    * DeepSeek: [Get API key](https://platform.deepseek.com/api)
    * Gemini: [Get API key](https://aistudio.google.com) ***CURRENTLY FREE!***
2. Click the [api] button in the top right to add your API keys
3. Select a model using the [model] button
4. Start chatting!

## Tips
* Switch models anytime using the [model] button or type /<model-name>
* Use Shift+Enter for multi-line messages
* Code blocks and tables can be copied using the [copy] button`,
              model: {
                label: 'SYSTEM',
                id: 'system'
              }
            }]);
          } else if (setKeys.length < Object.keys(keys).length) {
            // SCENARIO B: Returning user, some API keys set
            const availableModels = Object.entries(MODELS)
              .filter(([_, model]) => keys[model.backend]?.length > 0)
              .map(([key, model]) => `- ${model.label} (\`${key}\`)`);
            
            const unavailableModels = Object.entries(MODELS)
              .filter(([_, model]) => !keys[model.backend]?.length)
              .map(([_, model]) => model.backend)
              .filter((value, index, self) => self.indexOf(value) === index);

            setMessages([{
              role: 'assistant',
              content: `# Welcome Back! 🎉

## Available Models
${availableModels.join('\n')}

${unavailableModels.length > 0 ? `\n## Not Yet Set Up
Add API keys for ${unavailableModels.join(', ')} to access more models.
Click [api] to add them.` : ''}

Current model: ${MODELS[currentModel].label}`,
              model: {
                label: 'SYSTEM',
                id: 'system'
              }
            }]);
          } else {
            // SCENARIO C: All API keys set
            setMessages([{
              role: 'assistant',
              content: `# Welcome Back! 🎉
Currently using ${MODELS[currentModel].label}. Use [model] to switch models.`,
              model: {
                label: 'SYSTEM',
                id: 'system'
              }
            }]);
          }
        }
      } else if (messages.length === 0) {
        // First time user, show Scenario A message
        setMessages([{
          role: 'assistant',
          content: `# Welcome to ChatDIY! 🚀

ChatDIY enables you to interact with various AI models through their APIs in a cost-efficient, pay-per-use manner. Unlike subscription-based services, you only pay for what you use.

## How to Get Started

1. You'll need to obtain API keys from the providers of the models you want to use:
    * OpenAI (GPT-4, etc.): [Get API key](https://platform.openai.com/api-keys)
    * Anthropic (Claude): [Get API key](https://console.anthropic.com/account/keys)
    * xAI (Grok): [Get API key](https://x.ai)
    * Perplexity (Llama): [Get API key](https://www.perplexity.ai/settings/api)
    * DeepSeek: [Get API key](https://platform.deepseek.com/api)
    * Gemini: [Get API key](https://aistudio.google.com)  ***CURRENTLY FREE!***
2. Click the [api] button in the top right to add your API keys
3. Select a model using the [model] button
4. Start chatting!

## Tips
* Switch models anytime using the [model] button or type /<model-name>
* Use Shift+Enter for multi-line messages
* Code blocks and tables can be copied using the [copy] button`,
          model: {
            label: 'SYSTEM',
            id: 'system'
          }
        }]);
      }
    };
    loadApiKeys();
  }, []); // Remove currentModel dependency

  const saveApiKeys = async (newKeys) => {
    const db = await initDB();
    await db.put(STORE_NAME, newKeys, 'api-keys');
    setApiKeys(newKeys);
  };

  const handleModelSwitch = (modelKey) => {
    // Add model switch messages to existing history
    setMessages(prev => [...prev, 
      {
        role: 'user',
        content: modelKey
      },
      {
        role: 'assistant',
        content: `Switched to ${MODELS[modelKey].label}`,
        model: {
          label: 'SYSTEM',
          id: 'system'
        }
      }
    ]);

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
                isAvailable={apiKeys[model.backend]?.length > 0}
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
          <Typography sx={{ 
            mb: 2,
            fontFamily: 'var(--font-family)',
            fontSize: 'var(--font-size)'
          }}>Available models:</Typography>
          <ModelList />
          <Typography sx={{ 
            mt: 2,
            fontFamily: 'var(--font-family)',
            fontSize: 'var(--font-size)'
          }}>Click a model or type /{`<model-name>`} to switch</Typography>
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
        .filter(msg => 
          // Exclude system messages, React component messages, and model switch messages
          (msg.role !== 'assistant' || (typeof msg.content === 'string' && msg.model?.id !== 'system')) &&
          // Exclude model switch messages (messages that are just model keys)
          !(msg.role === 'user' && Object.keys(MODELS).includes(msg.content))
        )
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
        response.usage = {
          inputTokens: completion.usage.prompt_tokens,
          outputTokens: completion.usage.completion_tokens,
          cost: calculateCost(completion.usage.prompt_tokens, completion.usage.completion_tokens, model)
        };
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
              content: completion.content[0].text,
              usage: {
                inputTokens: completion.usage?.input_tokens || Math.ceil(formattedMessages.reduce((acc, msg) => acc + msg.content.length / 4, 0)),
                outputTokens: completion.usage?.output_tokens || Math.ceil(completion.content[0].text.length / 4),
                cost: null // Will be calculated below
              }
            };
            response.usage.cost = calculateCost(response.usage.inputTokens, response.usage.outputTokens, model);
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
              messages: formattedMessages,
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
            // Estimate tokens since xAI doesn't provide token counts
            response.usage = {
              inputTokens: Math.ceil(formattedMessages.reduce((acc, msg) => acc + msg.content.length / 4, 0)),
              outputTokens: Math.ceil(response.content.length / 4),
              cost: null // Will be calculated below
            };
            response.usage.cost = calculateCost(response.usage.inputTokens, response.usage.outputTokens, model);
          } else {
            throw new Error('Invalid response format from XAI API');
          }
        } catch (error) {
          console.error('XAI API error:', error);
          throw error;
        }
      } else if (model.backend === 'perplexity') {
        try {
          // Format messages to ensure proper alternation
          const formattedPerplexityMessages = [];
          let lastRole = null;
          
          for (const msg of formattedMessages) {
            // Skip consecutive messages with the same role
            if (msg.role === lastRole) continue;
            
            formattedPerplexityMessages.push({
              role: msg.role === 'assistant' ? 'assistant' : 'user',
              content: msg.content
            });
            
            lastRole = msg.role;
          }
          
          // If the last message was not from the user, remove it
          if (formattedPerplexityMessages[formattedPerplexityMessages.length - 1]?.role === 'assistant') {
            formattedPerplexityMessages.pop();
          }

          const apiResponse = await fetch('https://api.perplexity.ai/chat/completions', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKeys.perplexity}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              model: model.modelId,
              messages: formattedPerplexityMessages,
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
            response.usage = {
              inputTokens: completion.usage?.prompt_tokens || Math.ceil(formattedPerplexityMessages.reduce((acc, msg) => acc + msg.content.length / 4, 0)),
              outputTokens: completion.usage?.completion_tokens || Math.ceil(response.content.length / 4),
              cost: null // Will be calculated below
            };
            response.usage.cost = calculateCost(response.usage.inputTokens, response.usage.outputTokens, model);
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
          max_tokens: model.parameters.max_tokens
        });
        
        response = completion.choices[0].message;
        
        // For DeepSeek Reasoner, display reasoning content but don't include it in message history
        if (model.modelId === 'deepseek-reasoner' && response.reasoning_content) {
          // Store the original content for message history
          const originalContent = response.content;
          
          // Format display content with collapsible Chain of Thought
          response.display_content = `<details>
<summary>Chain of Thought (click to expand)</summary>

\`\`\`markdown
${response.reasoning_content}
\`\`\`
</details>

${response.content}`;
          
          // Keep original content for message history
          response.content = originalContent;
        }
        
        response.usage = {
          inputTokens: completion.usage?.prompt_tokens || Math.ceil(formattedMessages.reduce((acc, msg) => acc + msg.content.length / 4, 0)),
          outputTokens: completion.usage?.completion_tokens || Math.ceil(response.content.length / 4),
          cost: null // Will be calculated below
        };
        response.usage.cost = calculateCost(response.usage.inputTokens, response.usage.outputTokens, model);
      } else if (model.backend === 'gemini') {
        const { GoogleGenerativeAI } = require("@google/generative-ai");

        const genAI = new GoogleGenerativeAI(apiKeys.gemini);
        const geminiModel = genAI.getGenerativeModel({ model: model.modelId });

        // Convert chat history to Gemini format
        const chatHistory = formattedMessages.slice(0, -1).map(msg => ({
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text: msg.content }]
        }));

        const result = await geminiModel.generateContent({
          contents: [
            ...chatHistory,
            {
              role: 'user',
              parts: [{ text: userMessage.content }]
            }
          ],
          generationConfig: {
            temperature: model.parameters.temperature,
            maxOutputTokens: model.parameters.max_tokens,
          },
        });

        const responseText = result.response.text();
        
        // Estimate token counts since Gemini doesn't provide them directly
        const inputTokens = Math.ceil(formattedMessages.reduce((acc, msg) => acc + msg.content.length / 4, 0));
        const outputTokens = Math.ceil(responseText.length / 4);

        response = {
          role: 'assistant',
          content: responseText,
          usage: {
            inputTokens,
            outputTokens,
            cost: calculateCost(inputTokens, outputTokens, model)
          }
        };
      }

      setMessages(prev => [...prev, {
        role: 'assistant',
        // Use display_content if available (for DeepSeek Reasoner), otherwise use regular content
        content: response.display_content || response.content || response,
        model: {
          label: model.label,
          id: currentModel
        },
        usage: response.usage
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
    <ThemeProvider theme={theme}>
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
          <Toolbar variant="dense" sx={{ 
            display: 'flex', 
            justifyContent: 'center',
            position: 'relative'
          }}>
            <Button
              onClick={handleModelButtonClick}
              sx={{ 
                position: 'absolute',
                left: 0,
                backgroundColor: 'var(--text-color)',
                color: 'var(--background-color)',
                fontFamily: 'var(--font-family)',
                fontSize: {
                  xs: '16px',
                  sm: '1rem'
                },
                minWidth: 'auto',
                padding: '0 2px',
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
              [model]
            </Button>
            <Typography variant="h6" sx={{ 
              fontFamily: 'var(--font-family)',
              color: 'var(--text-color)',
              fontSize: {
                xs: '16px',
                sm: '1rem'
              },
              letterSpacing: '0.02em',
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)'
            }}>
              $ chat_terminal
            </Typography>
            <Button
              onClick={() => setSettingsOpen(true)}
              sx={{ 
                position: 'absolute',
                right: 0,
                backgroundColor: 'var(--text-color)',
                color: 'var(--background-color)',
                fontFamily: 'var(--font-family)',
                fontSize: {
                  xs: '16px',
                  sm: '1rem'
                },
                minWidth: 'auto',
                padding: '0 2px',
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
              [api]
            </Button>
          </Toolbar>
        </AppBar>

        <Box sx={{ 
          flex: 1, 
          overflowY: 'auto', 
          p: 2,
          pb: { xs: '120px', sm: '100px' },
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
                  fontSize: {
                    xs: '16px',
                    sm: '1rem'
                  },
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
                      fontSize: '1rem',
                      mb: 1,
                      opacity: 0.7,
                      textTransform: 'uppercase',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <span>
                      {message.model?.label || MODELS[currentModel].label}
                    </span>
                    {message.usage?.cost && (
                      <span style={{ 
                        fontSize: '0.8rem',
                        opacity: 0.7,
                        textTransform: 'none'
                      }}>
                        {message.usage.inputTokens + message.usage.outputTokens} tokens; {
                          message.usage.cost.total < 0.0001 
                            ? '<0.01¢'
                            : `${(message.usage.cost.total * 100).toFixed(2)}¢`
                        }
                      </span>
                    )}
                  </Typography>
                  {typeof message.content === 'string' ? (
                    <ReactMarkdown
                      components={{
                        pre: CodeBlock,
                        table: TableBlock,
                        details: ({ node, ...props }) => <details {...props} />,
                        summary: ({ node, ...props }) => <summary {...props} />
                      }}
                      rehypePlugins={[rehypeRaw]}
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
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          p: 2,
          borderTop: 'var(--border-thickness) solid var(--border-color)', 
          backgroundColor: 'var(--background-color)',
          zIndex: 1000,
          '@media (max-width: 600px)': {
            p: 1.5
          }
        }}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
            <Typography sx={{ 
              fontFamily: 'var(--font-family)',
              color: 'var(--text-color)',
              opacity: 0.7,
              userSelect: 'none',
              fontSize: {
                xs: '16px',
                sm: '1rem'
              },
              lineHeight: '24px',
              mt: '0px'
            }}>
              $
            </Typography>
            <Box sx={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'flex-start', overflow: 'hidden' }}>
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
                multiline
                maxRows={8}
                className="terminal-input"
                InputProps={{
                  disableUnderline: true,
                  sx: {
                    fontFamily: 'var(--font-family)',
                    fontSize: {
                      xs: '16px',
                      sm: '1rem'
                    },
                    minHeight: '24px',
                    lineHeight: '24px',
                    color: 'var(--text-color)',
                    pr: '32px',
                    '& textarea': {
                      paddingRight: '32px !important'
                    }
                  }
                }}
                inputProps={{
                  autoComplete: 'off',
                  autoCorrect: 'off',
                  autoCapitalize: 'off',
                  spellCheck: 'false'
                }}
              />
              <Button
                onClick={handleSend}
                disabled={isLoading}
                sx={{ 
                  position: 'absolute',
                  right: 0,
                  top: '0px',
                  backgroundColor: 'var(--text-color)',
                  color: 'var(--background-color)',
                  fontFamily: 'var(--font-family)',
                  fontSize: {
                    xs: '16px',
                    sm: '1rem'
                  },
                  minWidth: 'auto',
                  padding: '0 2px',
                  height: '24px',
                  lineHeight: '24px',
                  border: 'none',
                  borderRadius: 0,
                  textTransform: 'lowercase',
                  opacity: isLoading ? 0.5 : 1,
                  '&:hover': {
                    backgroundColor: 'var(--text-color)',
                    opacity: 0.9
                  }
                }}
              >
                [&gt;]
              </Button>
              {!isLoading && isFocused && (
                <Box 
                  component="span"
                  className="input-cursor"
                  sx={{ 
                    position: 'absolute',
                    left: `${input.length}ch`,
                    height: '24px',
                    width: '0.6em',
                    top: '0px',
                    transform: 'none'
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
                  disableUnderline: true,
                  sx: { 
                    fontFamily: 'var(--font-family)',
                    borderBottom: 'var(--border-thickness) solid var(--text-color)',
                    '&:hover': {
                      borderBottom: 'var(--border-thickness) solid var(--text-color)'
                    },
                    '&.Mui-focused': {
                      borderBottom: 'var(--border-thickness) solid var(--text-color)'
                    }
                  }
                }}
                InputLabelProps={{
                  sx: { 
                    fontFamily: 'var(--font-family)',
                    color: 'var(--text-color)',
                    '&.Mui-focused': {
                      color: 'var(--text-color)'
                    }
                  }
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
    </ThemeProvider>
  );
}

export default App;
