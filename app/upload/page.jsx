'use client';

import { useState, useRef, useCallback } from 'react';
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
import { useToast } from '@/hooks/use-toast';
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

const ACCEPTED_TYPES = ['.pdf', '.doc', '.docx', '.zip', '.csv'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 200;

export default function UploadPage() {
  const [files, setFiles] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [gdprConsent, setGdprConsent] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [uploadStats, setUploadStats] = useState({
    succeeded: 0,
    failed: 0,
    total: 0,
    startTime: null,
  });
  const fileInputRef = useRef(null);
  const { toast } = useToast();

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const validateFile = (file) => {
    const extension = '.' + file.name.split('.').pop().toLowerCase();
    if (!ACCEPTED_TYPES.includes(extension)) {
      return { valid: false, error: 'Unsupported file type' };
    }
    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: 'File too large (max 10MB)' };
    }
    return { valid: true };
  };

  const addFiles = useCallback(
    (newFiles) => {
      const validFiles = [];
      const errors = [];

      Array.from(newFiles).forEach((file) => {
        if (files.length + validFiles.length >= MAX_FILES) {
          errors.push(`Maximum ${MAX_FILES} files allowed`);
          return;
        }

        const validation = validateFile(file);
        if (!validation.valid) {
          errors.push(`${file.name}: ${validation.error}`);
          return;
        }

        // Check for duplicates (simple name + size check)
        const isDuplicate = [...files, ...validFiles].some(
          (existingFile) => existingFile.name === file.name && existingFile.size === file.size,
        );

        if (isDuplicate) {
          errors.push(`${file.name}: Duplicate file`);
          return;
        }

        validFiles.push({
          id: Date.now() + Math.random(),
          file,
          name: file.name,
          type: file.type,
          size: file.size,
          status: 'queued',
          progress: 0,
        });
      });

      if (validFiles.length > 0) {
        setFiles((prev) => [...prev, ...validFiles]);
      }

      if (errors.length > 0) {
        toast({
          title: "Some files couldn't be added",
          description: errors.slice(0, 3).join(', ') + (errors.length > 3 ? '...' : ''),
          variant: 'destructive',
        });
      }
    },
    [files, toast],
  );

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
    const droppedFiles = e.dataTransfer.files;
    addFiles(droppedFiles);
  };

  const handleFileSelect = (e) => {
    const selectedFiles = e.target.files;
    addFiles(selectedFiles);
    e.target.value = ''; // Reset input
  };

  const removeFile = (fileId) => {
    const fileToRemove = files.find((f) => f.id === fileId);
    setFiles((prev) => prev.filter((f) => f.id !== fileId));

    toast({
      title: 'File removed',
      description: `${fileToRemove.name} was removed`,
      action: (
        <Button
          variant='outline'
          size='sm'
          onClick={() => {
            setFiles((prev) => [...prev, fileToRemove]);
          }}
        >
          Undo
        </Button>
      ),
    });
  };

  const uploadFileToVercel = async (fileData) => {
    const formData = new FormData();
    formData.append('file', fileData.file);

    const response = await fetch('/api/upload', {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Upload failed');
    }

    const result = await response.json();
    return result;
  };

  const uploadAll = async () => {
    if (!gdprConsent || files.length === 0) return;

    setIsUploading(true);
    setUploadStats({
      succeeded: 0,
      failed: 0,
      total: files.length,
      startTime: Date.now(),
    });

    const uploadPromises = files.map(async (fileData) => {
      try {
        // Update status to uploading
        setFiles((prev) =>
          prev.map((f) => (f.id === fileData.id ? { ...f, status: 'uploading', progress: 0 } : f)),
        );

        // Simulate progress updates
        const progressInterval = setInterval(() => {
          setFiles((prev) =>
            prev.map((f) =>
              f.id === fileData.id
                ? {
                    ...f,
                    progress: Math.min(f.progress + Math.random() * 20, 90),
                  }
                : f,
            ),
          );
        }, 200);

        // Upload to Vercel Blob
        const result = await uploadFileToVercel(fileData);

        clearInterval(progressInterval);

        // Update with success
        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileData.id
              ? {
                  ...f,
                  status: 'done',
                  progress: 100,
                  blobUrl: result.url,
                  blobPathname: result.pathname,
                  uploadedAt: result.uploadedAt,
                }
              : f,
          ),
        );

        setUploadStats((prev) => ({ ...prev, succeeded: prev.succeeded + 1 }));
      } catch (error) {
        console.error(`Upload failed for ${fileData.name}:`, error);

        setFiles((prev) =>
          prev.map((f) =>
            f.id === fileData.id
              ? { ...f, status: 'failed', progress: 0, error: error.message }
              : f,
          ),
        );

        setUploadStats((prev) => ({ ...prev, failed: prev.failed + 1 }));
      }
    });

    await Promise.all(uploadPromises);
    setIsUploading(false);
    setUploadComplete(true);
  };

  const clearAll = () => {
    setFiles([]);
    setUploadComplete(false);
    setUploadStats({ succeeded: 0, failed: 0, total: 0, startTime: null });
  };

  const queuedCount = files.filter((f) => f.status === 'queued').length;
  const uploadingCount = files.filter((f) => f.status === 'uploading').length;
  const succeededCount = files.filter((f) => f.status === 'done').length;
  const failedCount = files.filter((f) => f.status === 'failed').length;
  const overallProgress =
    files.length > 0 ? ((succeededCount + failedCount) / files.length) * 100 : 0;

  const canUpload = gdprConsent && files.length > 0 && !isUploading;

  return (
    <div className='min-h-screen bg-gray-50'>
      {/* Header */}
      <header className='bg-white border-b'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4'>
          <div className='flex items-center justify-between'>
            <h1 className='text-xl font-semibold text-gray-900'>CVScreener</h1>
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
            {!uploadComplete ? (
              <Card>
                <CardHeader>
                  <CardTitle>Bulk upload CVs</CardTitle>
                  <CardDescription>
                    Drop PDFs/DOCs or ZIP/CSV. We'll pre-screen with AI so you can review faster.
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
                      Supports PDF, DOC, DOCX, ZIP, CSV • Max 10MB per file • Up to 200 files
                    </p>
                    <Button onClick={() => fileInputRef.current?.click()} aria-label='Add files'>
                      Add files
                    </Button>
                    <input
                      ref={fileInputRef}
                      type='file'
                      multiple
                      accept={ACCEPTED_TYPES.join(',')}
                      onChange={handleFileSelect}
                      className='hidden'
                    />
                  </div>

                  {/* File List */}
                  {files.length > 0 && (
                    <div className='space-y-4'>
                      <div className='flex items-center justify-between'>
                        <h3 className='font-medium text-gray-900'>Files ({files.length})</h3>
                        <Button variant='outline' size='sm' onClick={clearAll}>
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
                                  <Badge
                                    variant={
                                      fileData.status === 'done'
                                        ? 'default'
                                        : fileData.status === 'failed'
                                          ? 'destructive'
                                          : fileData.status === 'uploading'
                                            ? 'secondary'
                                            : 'outline'
                                    }
                                  >
                                    {fileData.status === 'done' && (
                                      <CheckCircle className='w-3 h-3 mr-1' />
                                    )}
                                    {fileData.status === 'failed' && (
                                      <AlertCircle className='w-3 h-3 mr-1' />
                                    )}
                                    {fileData.status === 'uploading' && (
                                      <Clock className='w-3 h-3 mr-1' />
                                    )}
                                    {fileData.status.charAt(0).toUpperCase() +
                                      fileData.status.slice(1)}
                                  </Badge>

                                  <Button
                                    variant='ghost'
                                    size='sm'
                                    onClick={() => removeFile(fileData.id)}
                                    disabled={isUploading}
                                  >
                                    <X className='w-4 h-4' />
                                  </Button>
                                </div>
                              </div>

                              {fileData.status === 'uploading' && (
                                <div className='mt-2'>
                                  <Progress value={fileData.progress} className='h-1' />
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
                      {/* Overall Progress */}
                      {isUploading && (
                        <div className='space-y-2'>
                          <div className='flex justify-between text-sm'>
                            <span>Overall Progress</span>
                            <span>{Math.round(overallProgress)}%</span>
                          </div>
                          <Progress value={overallProgress} />
                          <div className='flex justify-between text-xs text-gray-600'>
                            <span>Queued: {queuedCount}</span>
                            <span>Uploading: {uploadingCount}</span>
                            <span>Succeeded: {succeededCount}</span>
                            <span>Failed: {failedCount}</span>
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
                        <Button onClick={uploadAll} disabled={!canUpload} className='flex-1'>
                          Upload All ({files.length})
                        </Button>
                        <Button variant='outline' onClick={clearAll}>
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
                      <div className='text-2xl font-bold text-green-600'>{succeededCount}</div>
                      <div className='text-sm text-green-700'>Successful</div>
                    </div>
                    <div className='text-center p-4 bg-red-50 rounded-lg'>
                      <div className='text-2xl font-bold text-red-600'>{failedCount}</div>
                      <div className='text-sm text-red-700'>Failed</div>
                    </div>
                  </div>

                  <div className='text-center text-sm text-gray-600'>
                    Processing completed in{' '}
                    {uploadStats.startTime
                      ? Math.round((Date.now() - uploadStats.startTime) / 1000)
                      : 0}{' '}
                    seconds
                  </div>

                  <div className='flex space-x-3'>
                    <Button asChild className='flex-1'>
                      <Link href='/review'>Start Reviewing</Link>
                    </Button>
                    <Button variant='outline' onClick={clearAll}>
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
        {isUploading &&
          `Uploading ${uploadingCount} files. ${succeededCount} completed, ${failedCount} failed.`}
        {uploadComplete && `Upload complete. ${succeededCount} files processed successfully.`}
      </div>
    </div>
  );
}
