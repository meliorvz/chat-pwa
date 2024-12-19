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
  Select,
  MenuItem,
  FormControl,
  InputLabel
} from '@mui/material';
import { Settings, Send, Menu } from '@mui/icons-material';
import ReactMarkdown from 'react-markdown';
import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
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
      maxTokens: 4096,
    }
  },
  'claude-sonnet': {
    backend: 'anthropic',
    modelId: 'claude-3-sonnet-20240307',
    label: 'Claude Sonnet',
    parameters: {
      temperature: 0.7,
      maxTokens: 4096,
    }
  },
  'gpt-4': {
    backend: 'openai',
    modelId: 'gpt-4-turbo-preview',
    label: 'GPT-4 Turbo',
    parameters: {
      temperature: 0.7,
      maxTokens: 4096,
    }
  },
  'gpt-3.5-turbo': {
    backend: 'openai',
    modelId: 'gpt-3.5-turbo',
    label: 'GPT-3.5 Turbo',
    parameters: {
      temperature: 0.7,
      maxTokens: 4096,
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
  const [currentModel, setCurrentModel] = useState('gpt-3.5-turbo');
  const [apiKeys, setApiKeys] = useState({
    openai: '',
    anthropic: ''
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
        const openai = new OpenAI({ apiKey: apiKeys.openai });
        const completion = await openai.chat.completions.create({
          model: model.modelId,
          messages: [...messages, userMessage],
          ...model.parameters
        });
        response = completion.choices[0].message;
      } else if (model.backend === 'anthropic') {
        const anthropic = new Anthropic({ apiKey: apiKeys.anthropic });
        const completion = await anthropic.messages.create({
          model: model.modelId,
          messages: [...messages, userMessage],
          ...model.parameters
        });
        response = { role: 'assistant', content: completion.content[0].text };
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
