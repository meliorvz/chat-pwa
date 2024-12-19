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
    label: 'ChatGPT o1 Mini',
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
    label: 'Grok 2-1212',
    parameters: {
      temperature: 0.5,
      max_tokens: 1024
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

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [currentModel, setCurrentModel] = useState('o1-mini');
  const [apiKeys, setApiKeys] = useState({
    openai: '',
    anthropic: '',
    xai: ''
  });
  
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

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const model = MODELS[currentModel];
    const userMessage = { role: 'user', content: input };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      let response;
      
      if (model.backend === 'openai') {
        const openai = new OpenAI({ 
          apiKey: apiKeys.openai, 
          dangerouslyAllowBrowser: true 
        });
        
        // Format messages for OpenAI
        const formattedMessages = [...messages, userMessage].map(msg => ({
          role: msg.role,
          content: msg.content
        }));

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
              messages: [...messages, userMessage].map(msg => ({
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
                ...messages.map(msg => ({
                  role: msg.role,
                  content: msg.content
                })),
                userMessage
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
      }

      setMessages(prev => [...prev, response]);
    } catch (error) {
      console.error('Error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: `Error: ${error.message}`
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="fixed">
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            onClick={() => setDrawerOpen(true)}
          >
            <Menu />
          </IconButton>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            ChatDIY
          </Typography>
          <IconButton color="inherit" onClick={() => setSettingsOpen(true)}>
            <Settings />
          </IconButton>
        </Toolbar>
      </AppBar>

      <Drawer
        anchor="left"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        <List sx={{ width: 250 }}>
          {Object.entries(MODELS).map(([key, model]) => (
            <ListItem 
              button 
              key={key}
              selected={currentModel === key}
              onClick={() => {
                setCurrentModel(key);
                setDrawerOpen(false);
              }}
            >
              <ListItemText primary={model.label} />
            </ListItem>
          ))}
        </List>
      </Drawer>

      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)}>
        <DialogTitle>API Settings</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            margin="normal"
            label="OpenAI API Key"
            type="password"
            value={apiKeys.openai}
            onChange={(e) => setApiKeys(prev => ({ ...prev, openai: e.target.value }))}
          />
          <TextField
            fullWidth
            margin="normal"
            label="Anthropic API Key"
            type="password"
            value={apiKeys.anthropic}
            onChange={(e) => setApiKeys(prev => ({ ...prev, anthropic: e.target.value }))}
          />
          <TextField
            fullWidth
            margin="normal"
            label="XAI API Key"
            type="password"
            value={apiKeys.xai}
            onChange={(e) => setApiKeys(prev => ({ ...prev, xai: e.target.value }))}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>Cancel</Button>
          <Button onClick={() => {
            saveApiKeys(apiKeys);
            setSettingsOpen(false);
          }}>Save</Button>
        </DialogActions>
      </Dialog>

      <Container maxWidth="md" sx={{ mt: 8, mb: 2, height: '100vh', display: 'flex', flexDirection: 'column' }}>
        <Paper 
          elevation={3} 
          sx={{ 
            flex: 1, 
            mb: 2, 
            p: 2, 
            overflow: 'auto',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          {messages.map((message, index) => (
            <Box
              key={index}
              sx={{
                mb: 2,
                alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '80%'
              }}
            >
              <Paper
                elevation={1}
                sx={{
                  p: 2,
                  backgroundColor: message.role === 'user' ? 'primary.light' : 'grey.100'
                }}
              >
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </Paper>
            </Box>
          ))}
          <div ref={messagesEndRef} />
        </Paper>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={isLoading}
            multiline
            maxRows={4}
          />
          <Button
            variant="contained"
            onClick={handleSend}
            disabled={isLoading}
            sx={{ minWidth: 100 }}
          >
            <Send />
          </Button>
        </Box>
      </Container>
    </Box>
  );
}

export default App;
