/**
 * FormPreview Component
 * Displays extracted form fields and their filled values
 */

import React from 'react';
import { FiCheckCircle, FiCircle, FiDownload } from 'react-icons/fi';

const FormPreview = ({ formSchema, filledFields, isComplete, onExport, isExporting }) => {
  if (!formSchema) {
    return null;
  }

  const fields = formSchema.fields || [];
  const totalFields = fields.length;
  const filledCount = Object.keys(filledFields).length;
  const progress = totalFields > 0 ? (filledCount / totalFields) * 100 : 0;

  return (
    <div className="glass-card p-6 animate-slide-up">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">Form Preview</h2>
        <p className="text-white/70 text-sm">
          {totalFields} field{totalFields !== 1 ? 's' : ''} detected
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium">Progress</span>
          <span className="text-sm text-white/70">{filledCount} / {totalFields}</span>
        </div>
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
      </div>

      {/* Fields List */}
      <div className="space-y-3 mb-6 max-h-[400px] overflow-y-auto pr-2">
        {fields.map((field, index) => {
          const isFilled = !!filledFields[field.id];
          const value = filledFields[field.id];

          return (
            <div
              key={field.id}
              className={`p-4 rounded-xl border transition-all duration-300 ${
                isFilled
                  ? 'bg-green-500/10 border-green-500/30'
                  : 'bg-white/5 border-white/20'
              }`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {isFilled ? (
                    <FiCheckCircle className="w-5 h-5 text-green-400 flex-shrink-0" />
                  ) : (
                    <FiCircle className="w-5 h-5 text-white/30 flex-shrink-0" />
                  )}
                  <span className="font-medium">{field.label}</span>
                </div>
                <span className={`field-badge ${isFilled ? 'filled' : 'empty'}`}>
                  {field.type}
                </span>
              </div>
              {isFilled && (
                <div className="ml-7 mt-2">
                  <p className="text-primary-300 font-medium break-words">{value}</p>
                </div>
              )}
              {!isFilled && field.required && (
                <div className="ml-7 mt-1">
                  <span className="text-xs text-red-400">Required</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Export Button */}
      {isComplete && (
        <button
          onClick={onExport}
          className="btn-primary w-full glow"
          disabled={isExporting}
        >
          {isExporting ? (
            <>
              <span className="spinner mr-2"></span>
              Generating PDF...
            </>
          ) : (
            <>
              <FiDownload className="inline mr-2" />
              Export Filled PDF
            </>
          )}
        </button>
      )}
    </div>
  );
};

export default FormPreview;
