import { useState, useEffect, useRef } from 'react';
import { Editor } from '@monaco-editor/react';
import { Resizable } from '@/components/Resizable';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/Tabs';
import { Button } from '@/components/Button';
import { SaveProjectSheet } from '@/components/SaveProjectSheet';
import { useGenerateProject } from '@/helpers/useGenerateProject';
import { useDebounce } from '@/helpers/useDebounce';
import styles from './generator.module.css';
import { Toaster } from '@/components/SonnerToaster';

export function Page() {
  // State for holding the code from the editors
  const [htmlCode, setHtmlCode] = useState('<h1>Hello, World!</h1>');
  const [cssCode, setCssCode] = useState('h1 { color: #333; }');
  const [jsCode, setJsCode] = useState("console.log('Welcome!');");

  // State for the save project sheet
  const [isSheetOpen, setSheetOpen] = useState(false);

  // Ref for the preview iframe
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Debounce the code inputs to avoid re-rendering the iframe on every keystroke
  const debouncedHtml = useDebounce(htmlCode, 300);
  const debouncedCss = useDebounce(cssCode, 300);
  const debouncedJs = useDebounce(jsCode, 300);

  // Hook for project generation logic
  const {
    isGenerating,
    generatedProject,
    generateProject,
    error,
    clearProject,
  } = useGenerateProject();

  // Effect to update the iframe whenever the debounced code changes
  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const document = iframe.contentDocument;
    if (!document) return;

    // Write the combined HTML, CSS, and JS to the iframe
    document.open();
    document.write(`
      <html>
        <head>
          <style>${debouncedCss}</style>
        </head>
        <body>
          ${debouncedHtml}
          <script>${debouncedJs}<\/script>
        </body>
      </html>
    `);
    document.close();
  }, [debouncedHtml, debouncedCss, debouncedJs]); // Rerun effect when debounced values change

  return (
    <div className={styles.generatorPage}>
      <header className={styles.header}>
        <h2>Website Generator</h2>
        <Button onClick={() => setSheetOpen(true)}>Save Project</Button>
      </header>

      {/* Resizable component for side-by-side view */}
      <Resizable className={styles.resizableContainer}>
        {/* Left Panel: Code Editors */}
        <Resizable.Panel defaultSize={50}>
          <Tabs defaultValue="html" className={styles.tabs}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="html">HTML</TabsTrigger>
              <TabsTrigger value="css">CSS</TabsTrigger>
              <TabsTrigger value="javascript">JavaScript</TabsTrigger>
            </TabsList>

            {/* HTML Editor */}
            <TabsContent value="html" className={styles.tabsContent}>
              <Editor
                height="100%"
                language="html"
                theme="vs-dark"
                value={htmlCode}
                onChange={(value) => setHtmlCode(value || '')}
                options={{ minimap: { enabled: false } }}
              />
            </TabsContent>

            {/* CSS Editor */}
            <TabsContent value="css" className={styles.tabsContent}>
              <Editor
                height="100%"
                language="css"
                theme="vs-dark"
                value={cssCode}
                onChange={(value) => setCssCode(value || '')}
                options={{ minimap: { enabled: false } }}
              />
            </TabsContent>

            {/* JavaScript Editor */}
            <TabsContent value="javascript" className={styles.tabsContent}>
              <Editor
                height="100%"
                language="javascript"
                theme="vs-dark"
                value={jsCode}
                onChange={(value) => setJsCode(value || '')}
                options={{ minimap: { enabled: false } }}
              />
            </TabsContent>
          </Tabs>
        </Resizable.Panel>

        <Resizable.Handle />

        {/* Right Panel: Live Preview */}
        <Resizable.Panel defaultSize={50}>
           <div className={styles.previewContainer}>
            <h3 className={styles.previewHeader}>Live Preview</h3>
            <iframe
              ref={iframeRef}
              className={styles.previewIframe}
              title="Preview"
              sandbox="allow-scripts"
            />
           </div>
        </Resizable.Panel>
      </Resizable>

      {/* Sheet for saving the project */}
      <SaveProjectSheet
        isOpen={isSheetOpen}
        onOpenChange={setSheetOpen}
        htmlCode={htmlCode}
        cssCode={cssCode}
        jsCode={jsCode}
      />
      <Toaster />
    </div>
  );
}

export default Page;
