/**
 * FileUpload Component
 * Drag-and-drop file upload with validation
 */

import React, { useState, useRef } from 'react';
import { FiUpload, FiFile, FiX } from 'react-icons/fi';

const FileUpload = ({ onFileSelect, isLoading }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileInput = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFile = (file) => {
    // Validate file type
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      alert('Invalid file type. Please upload a PNG, JPEG, or PDF file.');
      return;
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      alert('File is too large. Maximum size is 10MB.');
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = () => {
    if (selectedFile) {
      onFileSelect(selectedFile);
    }
  };

  const handleRemove = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto animate-fade-in">
      <div
        className={`glass-card p-8 transition-all duration-300 glow-hover ${
          isDragging ? 'border-primary-400 bg-primary-500/20 scale-105' : ''
        }`}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
      >
        <div className="text-center">
          {!selectedFile ? (
            <>
              <div className="mb-6">
                <FiUpload className="w-16 h-16 mx-auto text-primary-400 animate-pulse-slow" />
              </div>
              <h3 className="text-2xl font-bold mb-3 bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">
                Upload Your Form
              </h3>
              <p className="text-white/70 mb-6">
                Drag and drop your form here, or click to browse
              </p>
              <p className="text-sm text-white/50 mb-6">
                Supported formats: PNG, JPEG, PDF (Max 10MB)
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="btn-primary"
                disabled={isLoading}
              >
                Choose File
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".png,.jpg,.jpeg,.pdf"
                onChange={handleFileInput}
                className="hidden"
              />
            </>
          ) : (
            <>
              <div className="mb-6">
                <FiFile className="w-16 h-16 mx-auto text-green-400" />
              </div>
              <h3 className="text-xl font-bold mb-2">{selectedFile.name}</h3>
              <p className="text-white/70 mb-6">
                {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
              </p>
              <div className="flex gap-4 justify-center">
                <button
                  onClick={handleUpload}
                  className="btn-primary"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <span className="spinner mr-2"></span>
                      Processing...
                    </>
                  ) : (
                    'Process Form'
                  )}
                </button>
                <button
                  onClick={handleRemove}
                  className="btn-secondary"
                  disabled={isLoading}
                >
                  <FiX className="inline mr-2" />
                  Remove
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default FileUpload;
