import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { Button } from '../components/Button';
import { Textarea } from '../components/Textarea';
import { Spinner } from '../components/Spinner';
import { SaveProjectSheet } from '../components/SaveProjectSheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/Tabs';
import { useGenerateProject } from '../helpers/useGenerateProject';
import { useDebounce } from '../helpers/useDebounce';
import { 
  Bot, 
  User, 
  Code, 
  Eye, 
  X, 
  Clock, 
  AlertTriangle,
  Sparkles,
  RefreshCw,
  Save
} from 'lucide-react';
import { toast } from 'sonner';
import styles from './generator.module.css';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface GeneratedFile {
  filePath: string;
  fileContent: string;
  fileType: string;
}

const GeneratorPage = () => {
  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [prompt, setPrompt] = useState('');
  const [showCodePanel, setShowCodePanel] = useState(false);
  
  // Generated files state
  const [generatedFiles, setGeneratedFiles] = useState<GeneratedFile[]>([]);
  const [htmlCode, setHtmlCode] = useState('');
  const [cssCode, setCssCode] = useState('');
  const [jsCode, setJsCode] = useState('');
  
  // Save project state
  const [isSheetOpen, setSheetOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  
  // Timer state for loading
  const [loadingStartTime, setLoadingStartTime] = useState<Date | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  
  // Refs
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Debounced code for preview updates
  const debouncedHtml = useDebounce(htmlCode, 300);
  const debouncedCss = useDebounce(cssCode, 300);
  const debouncedJs = useDebounce(jsCode, 300);
  
  // API hook
  const generateMutation = useGenerateProject();

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Timer effect for loading state
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (generateMutation.isPending && loadingStartTime) {
      interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - loadingStartTime.getTime()) / 1000));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [generateMutation.isPending, loadingStartTime]);

  // Update preview when code changes
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const document = iframe.contentDocument;
    if (!document) return;

    // Create the complete HTML document
    const fullHtml = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Preview</title>
        <style>${debouncedCss}</style>
      </head>
      <body>
        ${debouncedHtml}
        <script>${debouncedJs}</script>
      </body>
      </html>
    `;

    document.open();
    document.write(fullHtml);
    document.close();
  }, [debouncedHtml, debouncedCss, debouncedJs]);

  // Process generated files and extract code
  const processGeneratedFiles = (files: GeneratedFile[]) => {
    setGeneratedFiles(files);
    
    let newHtml = '';
    let newCss = '';
    let newJs = '';
    
    files.forEach(file => {
      const content = file.fileContent;
      const type = file.fileType.toLowerCase();
      
      if (type === 'html' || file.filePath.endsWith('.html')) {
        newHtml = content;
      } else if (type === 'css' || file.filePath.endsWith('.css')) {
        newCss = content;
      } else if (type === 'javascript' || type === 'js' || file.filePath.endsWith('.js')) {
        newJs = content;
      }
    });
    
    setHtmlCode(newHtml);
    setCssCode(newCss);
    setJsCode(newJs);
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: prompt,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setLoadingStartTime(new Date());
    setElapsedTime(0);

    try {
      const result = await generateMutation.mutateAsync({
        prompt: prompt.trim(),
        saveProject: false,
      });

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `Generated ${result.files.length} files successfully!`,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
      processGeneratedFiles(result.files);
      setPrompt('');
      toast.success('Website generated successfully!');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to generate website';
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: `Error: ${errorMessage}`,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, assistantMessage]);
      toast.error(errorMessage);
    } finally {
      setLoadingStartTime(null);
      setElapsedTime(0);
    }
  };

  const handleSaveProject = async (title: string) => {
    if (generatedFiles.length === 0) {
      toast.error('No generated files to save');
      return;
    }

    setIsSaving(true);
    try {
      await generateMutation.mutateAsync({
        prompt: messages.find(m => m.type === 'user')?.content || 'Generated website',
        saveProject: true,
        title,
      });
      
      toast.success('Project saved successfully!');
      setSheetOpen(false);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to save project';
      toast.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleExamplePrompt = (examplePrompt: string) => {
    setPrompt(examplePrompt);
  };

  const handleRetry = () => {
    if (messages.length > 0) {
      const lastUserMessage = [...messages].reverse().find(m => m.type === 'user');
      if (lastUserMessage) {
        setPrompt(lastUserMessage.content);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const examplePrompts = [
    "Create a modern landing page for a coffee shop with a hero section, menu preview, and contact form",
    "Build a personal portfolio website with a dark theme, project showcase, and smooth animations",
    "Design a simple blog layout with a sidebar, article cards, and responsive navigation",
    "Make a product showcase page for a tech startup with pricing cards and testimonials"
  ];

  return (
    <>
      <Helmet>
        <title>Website Generator - Floot</title>
        <meta name="description" content="Generate websites instantly with AI. Describe your idea and get a live preview with full code access." />
      </Helmet>
      
      <div className={styles.pageWrapper}>
        {/* Chat Panel */}
        <div className={styles.chatPanel}>
          <div className={styles.chatHeader}>
            <div className={styles.chatHeaderContent}>
              <Bot size={20} />
              <h2 className={styles.chatTitle}>AI Generator</h2>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setShowCodePanel(!showCodePanel)}
              className={styles.codeToggle}
            >
              <Code size={16} />
            </Button>
          </div>

          <div className={styles.chatMessages}>
            {messages.length === 0 ? (
              <div className={styles.welcomeState}>
                <Sparkles size={48} className={styles.welcomeIcon} />
                <h3 className={styles.welcomeTitle}>Welcome to Floot Generator</h3>
                <p className={styles.welcomeText}>
                  Describe the website you want to create, and I'll generate the code and preview for you instantly.
                </p>
                
                <div className={styles.examplePrompts}>
                  <p className={styles.exampleTitle}>Try these examples:</p>
                  {examplePrompts.map((example, index) => (
                    <button
                      key={index}
                      className={styles.examplePrompt}
                      onClick={() => handleExamplePrompt(example)}
                    >
                      {example}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <div key={message.id} className={`${styles.chatMessage} ${styles[message.type]}`}>
                    <div className={styles.messageHeader}>
                      <div className={styles.messageIcon}>
                        {message.type === 'user' ? <User size={14} /> : <Bot size={14} />}
                      </div>
                      <span className={styles.messageTime}>
                        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className={styles.messageContent}>
                      {message.content}
                    </div>
                  </div>
                ))}

                {generateMutation.isPending && (
                  <div className={styles.chatMessage}>
                    <div className={styles.messageHeader}>
                      <div className={`${styles.messageIcon} ${styles.assistant}`}>
                        <Bot size={14} />
                      </div>
                    </div>
                    <div className={styles.loadingContent}>
                      <div className={styles.loadingText}>
                        <div className={styles.loadingMessage}>
                          <Spinner size="sm" /> Generating your website...
                        </div>
                        {elapsedTime > 15 && (
                          <div className={styles.timeoutWarning}>
                            <AlertTriangle size={14} />
                            This is taking longer than usual. The AI is working on a complex request.
                          </div>
                        )}
                        <div className={styles.estimatedTime}>
                          <Clock size={12} />
                          {formatTime(elapsedTime)}
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => generateMutation.reset()}
                        className={styles.cancelButton}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {generateMutation.isError && (
                  <div className={styles.retryContainer}>
                    <p className={styles.retryText}>
                      Something went wrong. You can try again or modify your prompt.
                    </p>
                    <div className={styles.retryActions}>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleRetry}
                        className={styles.retryButton}
                      >
                        <RefreshCw size={14} />
                        Retry
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className={styles.chatInput}>
            <div className={styles.inputContainer}>
              <Textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe the website you want to create..."
                className={styles.promptTextarea}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleGenerate();
                  }
                }}
                disabled={generateMutation.isPending}
              />
              <div className={styles.inputActions}>
                {generatedFiles.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSheetOpen(true)}
                    disabled={generateMutation.isPending}
                  >
                    <Save size={14} />
                    Save
                  </Button>
                )}
                <Button
                  onClick={handleGenerate}
                  disabled={!prompt.trim() || generateMutation.isPending}
                  size="sm"
                >
                  {generateMutation.isPending ? <Spinner size="sm" /> : <Sparkles size={14} />}
                  Generate
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Preview Panel */}
        <div className={styles.previewPanel}>
          <div className={styles.previewHeader}>
            <div className={styles.previewHeaderContent}>
              <Eye size={16} />
              Live Preview
              {generateMutation.isPending && loadingStartTime && (
                <div className={styles.previewTimer}>
                  <Clock size={12} />
                  {formatTime(elapsedTime)}
                </div>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setShowCodePanel(!showCodePanel)}
              className={styles.previewCodeToggle}
            >
              <Code size={16} />
            </Button>
          </div>

          <div className={styles.previewContent}>
            {generateMutation.isPending ? (
              <div className={styles.previewLoading}>
                <Spinner size="lg" />
                <p>Generating your website...</p>
                {elapsedTime > 15 && (
                  <div className={styles.previewTimeoutWarning}>
                    <AlertTriangle size={14} />
                    This is taking longer than usual. Please wait...
                  </div>
                )}
              </div>
            ) : generatedFiles.length === 0 ? (
              <div className={styles.previewEmpty}>
                <Eye size={48} className={styles.previewEmptyIcon} />
                <h3>No Preview Yet</h3>
                <p>Generate a website to see the live preview here.</p>
              </div>
            ) : (
              <iframe
                ref={iframeRef}
                className={styles.previewIframe}
                title="Website Preview"
                sandbox="allow-scripts allow-same-origin"
              />
            )}
          </div>
        </div>

        {/* Code Panel Overlay */}
        {showCodePanel && (
          <div className={styles.codeOverlay} onClick={() => setShowCodePanel(false)}>
            <div className={styles.codePanel} onClick={(e) => e.stopPropagation()}>
              <div className={styles.codePanelHeader}>
                <div className={styles.codePanelTitle}>
                  <Code size={16} />
                  Generated Code
                </div>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setShowCodePanel(false)}
                >
                  <X size={16} />
                </Button>
              </div>
              
              <div className={styles.codePanelContent}>
                {generatedFiles.length === 0 ? (
                  <div className={styles.emptyState}>
                    No code generated yet
                  </div>
                ) : (
                  <Tabs defaultValue="html" className={styles.codeTabs}>
                    <TabsList>
                      {htmlCode && <TabsTrigger value="html">HTML</TabsTrigger>}
                      {cssCode && <TabsTrigger value="css">CSS</TabsTrigger>}
                      {jsCode && <TabsTrigger value="javascript">JavaScript</TabsTrigger>}
                    </TabsList>
                    
                    {htmlCode && (
                      <TabsContent value="html" className={styles.codeContent}>
                        <pre className={styles.codeBlock}>{htmlCode}</pre>
                      </TabsContent>
                    )}
                    
                    {cssCode && (
                      <TabsContent value="css" className={styles.codeContent}>
                        <pre className={styles.codeBlock}>{cssCode}</pre>
                      </TabsContent>
                    )}
                    
                    {jsCode && (
                      <TabsContent value="javascript" className={styles.codeContent}>
                        <pre className={styles.codeBlock}>{jsCode}</pre>
                      </TabsContent>
                    )}
                  </Tabs>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Save Project Sheet */}
      <SaveProjectSheet
        isOpen={isSheetOpen}
        onOpenChange={setSheetOpen}
        onSave={handleSaveProject}
        isSaving={isSaving}
      />
    </>
  );
};

export default GeneratorPage;