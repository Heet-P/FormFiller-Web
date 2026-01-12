/**
 * ChatInterface Component
 * Conversational AI chat interface
 */

import React, { useState, useEffect, useRef } from 'react';
import { FiSend, FiMessageCircle } from 'react-icons/fi';
import { BsRobot } from 'react-icons/bs';

const ChatInterface = ({ messages, onSendMessage, isLoading, isComplete }) => {
  const [inputMessage, setInputMessage] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when chat starts
  useEffect(() => {
    if (messages.length > 0 && !isComplete) {
      inputRef.current?.focus();
    }
  }, [messages, isComplete]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputMessage.trim() && !isLoading && !isComplete) {
      onSendMessage(inputMessage.trim());
      setInputMessage('');
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <div className="glass-card flex flex-col h-[600px] animate-slide-up">
      {/* Header */}
      <div className="p-6 border-b border-white/20">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-gradient-to-r from-primary-500 to-accent-500 rounded-xl">
            <BsRobot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold">AI Form Assistant</h2>
            <p className="text-sm text-white/70">
              {isComplete ? 'Form completed!' : 'Answer questions to fill your form'}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-white/50 mt-20">
            <FiMessageCircle className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p>Upload a form to start the conversation</p>
          </div>
        ) : (
          <>
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`chat-message ${msg.role}`}
              >
                {msg.role === 'assistant' && (
                  <div className="flex items-start gap-3">
                    <BsRobot className="w-5 h-5 text-primary-400 mt-1 flex-shrink-0" />
                    <div className="flex-1">
                      <p className="text-white/90 leading-relaxed">{msg.content}</p>
                      {msg.validationError && (
                        <p className="text-red-400 text-sm mt-2">⚠️ Please provide valid input</p>
                      )}
                    </div>
                  </div>
                )}
                {msg.role === 'user' && (
                  <p className="text-white font-medium">{msg.content}</p>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="chat-message assistant">
                <div className="flex items-center gap-3">
                  <BsRobot className="w-5 h-5 text-primary-400" />
                  <div className="flex gap-2">
                    <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-2 h-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="p-6 border-t border-white/20">
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            ref={inputRef}
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={isComplete ? 'Form is complete!' : 'Type your answer...'}
            className="input-field flex-1"
            disabled={isLoading || isComplete || messages.length === 0}
          />
          <button
            type="submit"
            className="btn-primary px-8"
            disabled={isLoading || isComplete || !inputMessage.trim() || messages.length === 0}
          >
            <FiSend className="w-5 h-5" />
          </button>
        </form>
        {isComplete && (
          <p className="text-center text-green-400 text-sm mt-3">
            ✓ All fields filled! You can now export your form.
          </p>
        )}
      </div>
    </div>
  );
};

export default ChatInterface;
