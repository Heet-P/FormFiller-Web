/**
 * Main App Component
 * Orchestrates the entire form filling flow
 */

import React, { useState } from 'react';
import FileUpload from './components/FileUpload';
import ChatInterface from './components/ChatInterface';
import FormPreview from './components/FormPreview';
import { uploadForm, sendMessage, exportPDF } from './services/api';
import { FiAlertCircle } from 'react-icons/fi';

function App() {
  // State management
  const [sessionId, setSessionId] = useState(null);
  const [formSchema, setFormSchema] = useState(null);
  const [filledFields, setFilledFields] = useState({});
  const [messages, setMessages] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isChatLoading, setIsChatLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Handle file upload
   */
  const handleFileSelect = async (file) => {
    setIsUploading(true);
    setError(null);

    try {
      const response = await uploadForm(file);
      const data = response.data;

      // Set session data
      setSessionId(data.sessionId);
      setFormSchema(data.formSchema);
      setFilledFields({});
      setIsComplete(false);

      // Add first AI message
      if (data.firstQuestion) {
        setMessages([
          {
            role: 'assistant',
            content: data.firstQuestion.question,
            validationError: false
          }
        ]);
      }
    } catch (err) {
      console.error('Upload error:', err);
      setError(
        err.response?.data?.message || 
        'Failed to process form. Please try again.'
      );
    } finally {
      setIsUploading(false);
    }
  };

  /**
   * Handle chat message
   */
  const handleSendMessage = async (message) => {
    // Add user message to chat
    setMessages(prev => [...prev, {
      role: 'user',
      content: message
    }]);

    setIsChatLoading(true);
    setError(null);

    try {
      const response = await sendMessage(sessionId, message);
      const data = response.data;

      // Add AI response
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.question,
        validationError: data.validationError || false
      }]);

      // Update filled fields if valid
      if (!data.validationError && data.fieldId) {
        setFilledFields(prev => ({
          ...prev,
          [data.fieldId]: message
        }));
      }

      // Check if complete
      if (data.isComplete) {
        setIsComplete(true);
      }
    } catch (err) {
      console.error('Chat error:', err);
      setError(
        err.response?.data?.message || 
        'Failed to send message. Please try again.'
      );
    } finally {
      setIsChatLoading(false);
    }
  };

  /**
   * Handle PDF export
   */
  const handleExport = async () => {
    setIsExporting(true);
    setError(null);

    try {
      const response = await exportPDF(sessionId);
      
      // Create download link
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'filled_form.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      // Show success message
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '✅ PDF downloaded successfully! Thank you for using Intelligent Form Filler.'
      }]);
    } catch (err) {
      console.error('Export error:', err);
      setError(
        err.response?.data?.message || 
        'Failed to export PDF. Please try again.'
      );
    } finally {
      setIsExporting(false);
    }
  };

  /**
   * Reset application
   */
  const handleReset = () => {
    setSessionId(null);
    setFormSchema(null);
    setFilledFields({});
    setMessages([]);
    setIsComplete(false);
    setError(null);
  };

  return (
    <div className="min-h-screen p-6">
      {/* Header */}
      <header className="max-w-7xl mx-auto mb-8 text-center">
        <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary-400 via-accent-400 to-primary-400 bg-clip-text text-transparent animate-gradient">
          Intelligent Form Filler
        </h1>
        <p className="text-xl text-white/70">
          AI-Powered Assistant for Bureaucratic Forms
        </p>
      </header>

      {/* Error Alert */}
      {error && (
        <div className="max-w-7xl mx-auto mb-6">
          <div className="glass-card p-4 border-red-500/50 bg-red-500/10">
            <div className="flex items-center gap-3">
              <FiAlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
              <p className="text-red-300">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-7xl mx-auto">
        {!sessionId ? (
          /* Upload Screen */
          <FileUpload 
            onFileSelect={handleFileSelect} 
            isLoading={isUploading} 
          />
        ) : (
          /* Chat & Preview Screen */
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Chat Interface - 2 columns */}
            <div className="lg:col-span-2">
              <ChatInterface
                messages={messages}
                onSendMessage={handleSendMessage}
                isLoading={isChatLoading}
                isComplete={isComplete}
              />
              {/* Reset Button */}
              <button
                onClick={handleReset}
                className="btn-secondary w-full mt-4"
              >
                Start New Form
              </button>
            </div>

            {/* Form Preview - 1 column */}
            <div className="lg:col-span-1">
              <FormPreview
                formSchema={formSchema}
                filledFields={filledFields}
                isComplete={isComplete}
                onExport={handleExport}
                isExporting={isExporting}
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="max-w-7xl mx-auto mt-12 text-center text-white/50 text-sm">
        <p>Powered by NVIDIA NIMs API • Built with React & Tailwind CSS</p>
      </footer>
    </div>
  );
}

export default App;
