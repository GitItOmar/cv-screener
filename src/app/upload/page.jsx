'use client';

import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import toast from 'react-hot-toast';
import {
  Upload,
  FileText,
  Brain,
  Zap,
  Shield,
  X,
  CheckCircle,
  AlertCircle,
  Clock,
} from 'lucide-react';
import Link from 'next/link';
import { jobSettingsStorage } from '@/lib/jobSettingsStorage';

// File constraints
const FILE_CONSTRAINTS = {
  acceptedTypes: ['.pdf', '.docx'],
  maxSize: 1024 * 1024, // 1MB
  maxCount: 200,
};

export default function UploadPage() {
  // Core state
  const [files, setFiles] = useState([]);
  const [processingState, setProcessingState] = useState({
    isProcessing: false,
    isComplete: false,
  });
  const [gdprConsent, setGdprConsent] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Refs and hooks
  const fileInputRef = useRef(null);

  // Helper functions
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const isValidFile = (file) => {
    const extension = `.${file.name.split('.').pop().toLowerCase()}`;
    const isValidType = FILE_CONSTRAINTS.acceptedTypes.includes(extension);
    const isValidSize = file.size <= FILE_CONSTRAINTS.maxSize;

    if (!isValidType) return { valid: false, reason: 'Unsupported file type' };
    if (!isValidSize) return { valid: false, reason: 'File too large (max 1MB)' };
    return { valid: true };
  };

  const getStatusBadgeVariant = (status) => {
    const variants = {
      done: 'default',
      failed: 'destructive',
      processing: 'secondary',
      pending: 'outline',
    };
    return variants[status] || 'outline';
  };

  const handleFilesAdded = (newFiles) => {
    const filesToAdd = [];
    const rejectedFiles = [];

    Array.from(newFiles).forEach((file) => {
      // Check file count limit
      if (files.length + filesToAdd.length >= FILE_CONSTRAINTS.maxCount) {
        rejectedFiles.push({ name: file.name, reason: 'File limit exceeded' });
        return;
      }

      // Validate file
      const validation = isValidFile(file);
      if (!validation.valid) {
        rejectedFiles.push({ name: file.name, reason: validation.reason });
        return;
      }

      // Check for duplicates
      const isDuplicate = files.some((f) => f.name === file.name && f.size === file.size);
      if (isDuplicate) {
        rejectedFiles.push({ name: file.name, reason: 'Duplicate file' });
        return;
      }

      filesToAdd.push({
        id: `${Date.now()}_${Math.random().toString(36).substring(2, 11)}`,
        file,
        name: file.name,
        size: file.size,
        status: 'pending',
      });
    });

    // Add valid files
    if (filesToAdd.length > 0) {
      setFiles((prev) => [...prev, ...filesToAdd]);
    }

    // Show errors for rejected files
    if (rejectedFiles.length > 0) {
      const message = rejectedFiles
        .slice(0, 3)
        .map((f) => `${f.name}: ${f.reason}`)
        .join(', ');

      toast.error(`Some files were rejected: ${message + (rejectedFiles.length > 3 ? '...' : '')}`);
    }
  };

  // Drag and drop handlers
  const handleDragEnter = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setIsDragOver(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    handleFilesAdded(e.dataTransfer.files);
  };

  const handleFileInputChange = (e) => {
    handleFilesAdded(e.target.files);
    e.target.value = ''; // Reset input for re-selection
  };

  const removeFile = (fileId) => {
    const file = files.find((f) => f.id === fileId);
    if (file) {
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      toast.success(`File removed: ${file.name}`);
    }
  };

  const processFile = async (fileData) => {
    const formData = new FormData();
    formData.append('file', fileData.file);

    // Include job settings if they exist
    const savedSettings = jobSettingsStorage.load();
    if (savedSettings) {
      const jobRequirements = jobSettingsStorage.toJobRequirements(savedSettings);
      formData.append('jobSettings', JSON.stringify(jobRequirements));
    }

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Processing failed' }));
      throw new Error(error.error || 'Processing failed');
    }

    return response.json();
  };

  const processAllFiles = async () => {
    if (!gdprConsent || files.length === 0) return;

    setProcessingState({ isProcessing: true, isComplete: false });

    // Process each file
    const results = await Promise.allSettled(
      files.map(async (fileData) => {
        // Update status to processing
        setFiles((prev) =>
          prev.map((f) => (f.id === fileData.id ? { ...f, status: 'processing' } : f)),
        );

        try {
          // Process file through API
          const result = await processFile(fileData);

          // Update file with result
          setFiles((prev) =>
            prev.map((f) => (f.id === fileData.id ? { ...f, status: 'done', data: result } : f)),
          );

          // Prepare candidate data for session storage
          if (result.extractedData && result.evaluation) {
            return {
              id: `candidate_${fileData.id}`,
              fileInfo: {
                name: fileData.name,
                size: fileData.size,
                uploadedAt: result.uploadedAt,
              },
              extractedData: result.extractedData,
              evaluation: result.evaluation,
              evaluationError: result.evaluationError,
              summarization: result.summarization,
              summarizationError: result.summarizationError,
              rawText: result.rawText,
              timestamp: new Date().toISOString(),
            };
          }
          return null;
        } catch (error) {
          // Update file with error
          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileData.id ? { ...f, status: 'failed', error: error.message } : f,
            ),
          );
          return null;
        }
      }),
    );

    // Store successful candidates in session storage
    const successfulCandidates = results
      .filter((r) => r.status === 'fulfilled' && r.value)
      .map((r) => r.value);

    if (successfulCandidates.length > 0 && typeof window !== 'undefined') {
      try {
        window.sessionStorage.setItem('processedCandidates', JSON.stringify(successfulCandidates));
      } catch (error) {
        console.warn('Failed to store candidates:', error);
      }
    }

    setProcessingState({ isProcessing: false, isComplete: true });
  };

  const resetUploader = () => {
    setFiles([]);
    setProcessingState({ isProcessing: false, isComplete: false });
    setGdprConsent(false);
  };

  // Computed values
  const fileStats = {
    pending: files.filter((f) => f.status === 'pending').length,
    processing: files.filter((f) => f.status === 'processing').length,
    done: files.filter((f) => f.status === 'done').length,
    failed: files.filter((f) => f.status === 'failed').length,
    total: files.length,
  };

  const progress =
    fileStats.total > 0 ? ((fileStats.done + fileStats.failed) / fileStats.total) * 100 : 0;

  const canProcess = gdprConsent && files.length > 0 && !processingState.isProcessing;

  return (
    <div className='min-h-screen bg-gray-50'>
      {/* Header */}
      <header className='bg-white border-b'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4'>
          <div className='flex items-center justify-between'>
            <h1 className='text-xl font-semibold text-gray-900'>CVScreener</h1>
            <div className='flex items-center gap-4'>
              <Button variant='outline' size='sm' asChild>
                <Link href='/settings'>Settings</Link>
              </Button>
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink asChild>
                      <Link href='/'>Home</Link>
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>Upload</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>
          </div>
        </div>
      </header>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        <div className='grid lg:grid-cols-3 gap-8'>
          {/* Left Panel - Info */}
          <div className='lg:col-span-1'>
            <Card>
              <CardHeader>
                <CardTitle className='text-lg'>How it works</CardTitle>
              </CardHeader>
              <CardContent className='space-y-6'>
                <div className='flex items-start space-x-3'>
                  <div className='flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center'>
                    <Upload className='w-4 h-4 text-blue-600' />
                  </div>
                  <div>
                    <h3 className='font-medium text-gray-900'>1. Bulk Upload</h3>
                    <p className='text-sm text-gray-600 mt-1'>
                      Drop CVs in PDF, DOC, or ZIP format
                    </p>
                  </div>
                </div>

                <div className='flex items-start space-x-3'>
                  <div className='flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center'>
                    <Brain className='w-4 h-4 text-purple-600' />
                  </div>
                  <div>
                    <h3 className='font-medium text-gray-900'>2. AI Pre-Screen</h3>
                    <p className='text-sm text-gray-600 mt-1'>
                      Our AI analyzes skills, experience, and fit
                    </p>
                  </div>
                </div>

                <div className='flex items-start space-x-3'>
                  <div className='flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center'>
                    <Zap className='w-4 h-4 text-green-600' />
                  </div>
                  <div>
                    <h3 className='font-medium text-gray-900'>3. Swipe Review</h3>
                    <p className='text-sm text-gray-600 mt-1'>
                      Quick yes/no decisions on pre-scored candidates
                    </p>
                  </div>
                </div>

                <Separator />

                <Alert>
                  <Shield className='h-4 w-4' />
                  <AlertDescription className='text-sm'>
                    <strong>GDPR & Security:</strong> Files are processed securely and can be
                    deleted at any time. We comply with all data protection regulations.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Uploader */}
          <div className='lg:col-span-2'>
            {!processingState.isComplete ? (
              <Card>
                <CardHeader>
                  <CardTitle>Bulk upload CVs</CardTitle>
                  <CardDescription>
                    Drop PDFs/DOCs. We&apos;ll pre-screen with AI so you can review faster.
                  </CardDescription>
                </CardHeader>
                <CardContent className='space-y-6'>
                  {/* Dropzone */}
                  <div
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                      isDragOver
                        ? 'border-blue-400 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                    onDragEnter={handleDragEnter}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <Upload className='mx-auto h-12 w-12 text-gray-400 mb-4' />
                    <p className='text-lg font-medium text-gray-900 mb-2'>
                      Drop files here or click to browse
                    </p>
                    <p className='text-sm text-gray-600 mb-4'>
                      Supports PDF, DOC, DOCX • Max 1MB per file • Up to 200 files
                    </p>
                    <Button onClick={() => fileInputRef.current?.click()} aria-label='Add files'>
                      Add files
                    </Button>
                    <input
                      ref={fileInputRef}
                      type='file'
                      multiple
                      accept={FILE_CONSTRAINTS.acceptedTypes.join(',')}
                      onChange={handleFileInputChange}
                      className='hidden'
                    />
                  </div>

                  {/* File List */}
                  {files.length > 0 && (
                    <div className='space-y-4'>
                      <div className='flex items-center justify-between'>
                        <h3 className='font-medium text-gray-900'>Files ({files.length})</h3>
                        <Button variant='outline' size='sm' onClick={resetUploader}>
                          Clear all
                        </Button>
                      </div>

                      <div className='border rounded-lg'>
                        <div className='max-h-64 overflow-y-auto'>
                          {files.map((fileData, index) => (
                            <div
                              key={fileData.id}
                              className={`p-4 ${index !== files.length - 1 ? 'border-b' : ''}`}
                            >
                              <div className='flex items-center justify-between'>
                                <div className='flex items-center space-x-3 flex-1 min-w-0'>
                                  <FileText className='w-5 h-5 text-gray-400 flex-shrink-0' />
                                  <div className='flex-1 min-w-0'>
                                    <p className='text-sm font-medium text-gray-900 truncate'>
                                      {fileData.name}
                                    </p>
                                    <p className='text-xs text-gray-500'>
                                      {formatFileSize(fileData.size)}
                                    </p>
                                  </div>
                                </div>

                                <div className='flex items-center space-x-3'>
                                  <Badge variant={getStatusBadgeVariant(fileData.status)}>
                                    {fileData.status === 'done' && (
                                      <CheckCircle className='w-3 h-3 mr-1' />
                                    )}
                                    {fileData.status === 'failed' && (
                                      <AlertCircle className='w-3 h-3 mr-1' />
                                    )}
                                    {fileData.status === 'processing' && (
                                      <Clock className='w-3 h-3 mr-1' />
                                    )}
                                    {fileData.status.charAt(0).toUpperCase() +
                                      fileData.status.slice(1)}
                                  </Badge>

                                  <Button
                                    variant='ghost'
                                    size='sm'
                                    onClick={() => removeFile(fileData.id)}
                                    disabled={processingState.isProcessing}
                                  >
                                    <X className='w-4 h-4' />
                                  </Button>
                                </div>
                              </div>

                              {fileData.status === 'processing' && (
                                <div className='mt-2'>
                                  <Progress value={50} className='h-1' />
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Controls */}
                  <div className='sticky bottom-0 bg-white border-t pt-4 -mx-6 px-6 -mb-6 pb-6'>
                    <div className='space-y-4'>
                      {/* Progress indicator */}
                      {processingState.isProcessing && (
                        <div className='space-y-2'>
                          <div className='flex justify-between text-sm'>
                            <span>Processing Files</span>
                            <span>{Math.round(progress)}%</span>
                          </div>
                          <Progress value={progress} />
                          <div className='flex justify-between text-xs text-gray-600'>
                            <span>Pending: {fileStats.pending}</span>
                            <span>Processing: {fileStats.processing}</span>
                            <span>Done: {fileStats.done}</span>
                            <span>Failed: {fileStats.failed}</span>
                          </div>
                        </div>
                      )}

                      {/* GDPR Consent */}
                      <div className='flex items-start space-x-2'>
                        <Checkbox
                          id='gdpr-consent'
                          checked={gdprConsent}
                          onCheckedChange={setGdprConsent}
                        />
                        <label htmlFor='gdpr-consent' className='text-sm text-gray-700 leading-5'>
                          I confirm we have permission to process these CVs (GDPR compliance)
                        </label>
                      </div>

                      {/* Action Buttons */}
                      <div className='flex space-x-3'>
                        <Button onClick={processAllFiles} disabled={!canProcess} className='flex-1'>
                          Process All ({files.length})
                        </Button>
                        <Button variant='outline' onClick={resetUploader}>
                          Clear
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              /* Success Summary */
              <Card>
                <CardHeader>
                  <CardTitle className='flex items-center space-x-2'>
                    <CheckCircle className='w-5 h-5 text-green-600' />
                    <span>Upload Complete!</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className='space-y-6'>
                  <div className='grid grid-cols-2 gap-4'>
                    <div className='text-center p-4 bg-green-50 rounded-lg'>
                      <div className='text-2xl font-bold text-green-600'>{fileStats.done}</div>
                      <div className='text-sm text-green-700'>Successful</div>
                    </div>
                    <div className='text-center p-4 bg-red-50 rounded-lg'>
                      <div className='text-2xl font-bold text-red-600'>{fileStats.failed}</div>
                      <div className='text-sm text-red-700'>Failed</div>
                    </div>
                  </div>

                  <div className='text-center text-sm text-gray-600'>Processing complete</div>

                  <div className='flex space-x-3'>
                    <Button asChild className='flex-1'>
                      <Link href='/review'>Start Reviewing</Link>
                    </Button>
                    <Button variant='outline' onClick={resetUploader}>
                      Upload more
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
      {/* Screen reader announcements */}
      <div aria-live='polite' className='sr-only'>
        {processingState.isProcessing &&
          `Processing ${fileStats.processing} files. ${fileStats.done} completed, ${fileStats.failed} failed.`}
        {processingState.isComplete &&
          `Processing complete. ${fileStats.done} files processed successfully.`}
      </div>
    </div>
  );
}
