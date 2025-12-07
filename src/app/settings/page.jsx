'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Settings, FileText, Target, CheckCircle, Info, Trash2, Plus, X } from 'lucide-react';
import Link from 'next/link';
import { jobSettingsStorage } from '@/lib/jobSettingsStorage';

export default function SettingsPage() {
  const [jobDescription, setJobDescription] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [yearsExperience, setYearsExperience] = useState(1);
  const [requiredKeywords, setRequiredKeywords] = useState('');
  const [preferredKeywords, setPreferredKeywords] = useState('');
  const [preferredLocations, setPreferredLocations] = useState('');
  const [isRemote, setIsRemote] = useState(false);
  // New structure: array of {language: string, level: string}
  const [languageRequirements, setLanguageRequirements] = useState([]);
  const [educationFields, setEducationFields] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);

  // Load existing settings on mount
  useEffect(() => {
    const settings = jobSettingsStorage.load();
    if (settings) {
      setJobDescription(settings.jobDescription || '');
      setJobTitle(settings.jobTitle || '');
      setYearsExperience(settings.yearsExperience || 0);
      setRequiredKeywords(jobSettingsStorage.formatKeywords(settings.requiredKeywords || []));
      setPreferredKeywords(jobSettingsStorage.formatKeywords(settings.preferredKeywords || []));
      setPreferredLocations(jobSettingsStorage.formatKeywords(settings.preferredLocations || []));
      setIsRemote(settings.isRemote || false);
      // Load language requirements (new structure)
      setLanguageRequirements(settings.languageRequirements || []);
      setEducationFields(jobSettingsStorage.formatKeywords(settings.educationFields || []));
      setLastSaved(settings.updatedAt);
    }
  }, []);

  // Track unsaved changes
  useEffect(() => {
    const settings = jobSettingsStorage.load();
    const savedLangReqs = settings?.languageRequirements || [];
    const langReqsChanged = JSON.stringify(languageRequirements) !== JSON.stringify(savedLangReqs);

    const hasChanges =
      jobDescription !== (settings?.jobDescription || '') ||
      jobTitle !== (settings?.jobTitle || '') ||
      yearsExperience !== (settings?.yearsExperience || 0) ||
      requiredKeywords !== jobSettingsStorage.formatKeywords(settings?.requiredKeywords || []) ||
      preferredKeywords !== jobSettingsStorage.formatKeywords(settings?.preferredKeywords || []) ||
      preferredLocations !==
        jobSettingsStorage.formatKeywords(settings?.preferredLocations || []) ||
      isRemote !== (settings?.isRemote || false) ||
      langReqsChanged ||
      educationFields !== jobSettingsStorage.formatKeywords(settings?.educationFields || []);

    setHasUnsavedChanges(hasChanges);
  }, [
    jobDescription,
    jobTitle,
    yearsExperience,
    requiredKeywords,
    preferredKeywords,
    preferredLocations,
    isRemote,
    languageRequirements,
    educationFields,
  ]);

  const handleSave = () => {
    const settings = {
      jobDescription,
      jobTitle,
      yearsExperience,
      requiredKeywords: jobSettingsStorage.parseKeywords(requiredKeywords),
      preferredKeywords: jobSettingsStorage.parseKeywords(preferredKeywords),
      preferredLocations: isRemote ? [] : jobSettingsStorage.parseKeywords(preferredLocations),
      isRemote,
      languageRequirements: languageRequirements.filter((lr) => lr.language.trim()),
      educationFields: jobSettingsStorage.parseKeywords(educationFields),
    };

    const success = jobSettingsStorage.save(settings);

    if (success) {
      setLastSaved(new Date().toISOString());
      setHasUnsavedChanges(false);
      toast.success('Job settings saved successfully!');
    } else {
      toast.error('Failed to save settings. Please try again.');
    }
  };

  const handleClear = () => {
    if (window.confirm('Are you sure you want to clear all job settings?')) {
      const success = jobSettingsStorage.clear();

      if (success) {
        setJobDescription('');
        setJobTitle('');
        setYearsExperience(0);
        setRequiredKeywords('');
        setPreferredKeywords('');
        setPreferredLocations('');
        setIsRemote(false);
        setLanguageRequirements([]);
        setEducationFields('');
        setLastSaved(null);
        setHasUnsavedChanges(false);
        toast.success('Settings cleared successfully!');
      } else {
        toast.error('Failed to clear settings. Please try again.');
      }
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return 'Never';
    const date = new Date(isoString);
    return date.toLocaleString();
  };

  // Language requirements helpers
  const addLanguageRequirement = () => {
    setLanguageRequirements([...languageRequirements, { language: '', level: 'Professional' }]);
  };

  const updateLanguageRequirement = (index, field, value) => {
    const updated = [...languageRequirements];
    updated[index] = { ...updated[index], [field]: value };
    setLanguageRequirements(updated);
  };

  const removeLanguageRequirement = (index) => {
    setLanguageRequirements(languageRequirements.filter((_, i) => i !== index));
  };

  const hasSettings = jobSettingsStorage.exists();
  const keywordCount =
    jobSettingsStorage.parseKeywords(requiredKeywords).length +
    jobSettingsStorage.parseKeywords(preferredKeywords).length;

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
                  <BreadcrumbPage>Settings</BreadcrumbPage>
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
                <CardTitle className='text-lg'>Job Settings</CardTitle>
              </CardHeader>
              <CardContent className='space-y-6'>
                <div className='flex items-start space-x-3'>
                  <div className='flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center'>
                    <FileText className='w-4 h-4 text-blue-600' />
                  </div>
                  <div>
                    <h3 className='font-medium text-gray-900'>Job Description</h3>
                    <p className='text-sm text-gray-600 mt-1'>
                      Paste the full job description in markdown format. This helps the AI
                      understand the role context.
                    </p>
                  </div>
                </div>

                <div className='flex items-start space-x-3'>
                  <div className='flex-shrink-0 w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center'>
                    <Target className='w-4 h-4 text-purple-600' />
                  </div>
                  <div>
                    <h3 className='font-medium text-gray-900'>Keywords</h3>
                    <p className='text-sm text-gray-600 mt-1'>
                      List required and preferred skills, technologies, or qualifications as
                      comma-separated values.
                    </p>
                  </div>
                </div>

                <div className='flex items-start space-x-3'>
                  <div className='flex-shrink-0 w-8 h-8 bg-green-100 rounded-full flex items-center justify-center'>
                    <Settings className='w-4 h-4 text-green-600' />
                  </div>
                  <div>
                    <h3 className='font-medium text-gray-900'>Auto-Apply</h3>
                    <p className='text-sm text-gray-600 mt-1'>
                      These settings will automatically replace the default job requirements during
                      CV evaluation.
                    </p>
                  </div>
                </div>

                <Separator />

                <Alert>
                  <Info className='h-4 w-4' />
                  <AlertDescription className='text-sm'>
                    <strong>Settings Storage:</strong> Your job settings are saved locally in your
                    browser and will persist across sessions.
                  </AlertDescription>
                </Alert>

                {/* Current Stats */}
                <div className='space-y-2'>
                  <h4 className='text-sm font-medium text-gray-900'>Current Configuration</h4>
                  <div className='space-y-1 text-xs text-gray-600'>
                    <div className='flex justify-between'>
                      <span>Status:</span>
                      {hasSettings ? (
                        <Badge variant='default' className='h-5'>
                          Active
                        </Badge>
                      ) : (
                        <Badge variant='outline' className='h-5'>
                          Not Set
                        </Badge>
                      )}
                    </div>
                    <div className='flex justify-between'>
                      <span>Total Keywords:</span>
                      <span className='font-medium'>{keywordCount}</span>
                    </div>
                    <div className='flex justify-between'>
                      <span>Last Saved:</span>
                      <span className='font-medium'>{formatDate(lastSaved)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Panel - Settings Form */}
          <div className='lg:col-span-2'>
            <Card>
              <CardHeader>
                <CardTitle>Configure Job Requirements</CardTitle>
                <CardDescription>
                  Customize the job description and keywords for CV evaluation
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-6'>
                {/* Job Description */}
                <div>
                  <label className='block text-sm font-medium text-gray-900 mb-2'>
                    Job Description (Markdown)
                  </label>
                  <textarea
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none font-mono text-sm'
                    rows={12}
                    placeholder='# Position Title

## About the Role
Paste your job description here in markdown format...

## Requirements
- Requirement 1
- Requirement 2

## Responsibilities
- Responsibility 1
- Responsibility 2'
                  />
                  <p className='text-xs text-gray-500 mt-2'>
                    Supports markdown formatting. This will be used to provide context for AI
                    evaluation.
                  </p>
                </div>

                <Separator />

                {/* Position Details */}
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <div>
                    <label className='block text-sm font-medium text-gray-900 mb-2'>
                      Job Title
                    </label>
                    <input
                      type='text'
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                      placeholder='e.g., Senior React Developer'
                    />
                    <p className='text-xs text-gray-500 mt-2'>
                      The position title used in evaluation prompts
                    </p>
                  </div>
                  <div>
                    <label className='block text-sm font-medium text-gray-900 mb-2'>
                      Years of Experience Required
                    </label>
                    <input
                      type='number'
                      min='0'
                      max='20'
                      value={yearsExperience}
                      onChange={(e) => {
                        const value = parseInt(e.target.value);
                        setYearsExperience(isNaN(value) ? 0 : value);
                      }}
                      className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                      placeholder='1'
                    />
                    <p className='text-xs text-gray-500 mt-2'>
                      Minimum years of experience required
                    </p>
                  </div>
                </div>

                <Separator />

                {/* Remote Work Toggle */}
                <div className='flex items-center space-x-3'>
                  <input
                    type='checkbox'
                    id='isRemote'
                    checked={isRemote}
                    onChange={(e) => setIsRemote(e.target.checked)}
                    className='w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2'
                  />
                  <label htmlFor='isRemote' className='text-sm font-medium text-gray-900'>
                    Remote Work Position
                  </label>
                  <span className='text-xs text-gray-500'>
                    (Location will not be considered in evaluation)
                  </span>
                </div>

                {/* Location - Disabled when remote */}
                <div className={isRemote ? 'opacity-50' : ''}>
                  <label className='block text-sm font-medium text-gray-900 mb-2'>
                    Preferred Locations
                  </label>
                  <input
                    type='text'
                    value={preferredLocations}
                    onChange={(e) => setPreferredLocations(e.target.value)}
                    disabled={isRemote}
                    className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed'
                    placeholder={
                      isRemote
                        ? 'Not applicable for remote positions'
                        : 'e.g., USA, Europe, Germany'
                    }
                  />
                  <p className='text-xs text-gray-500 mt-2'>
                    {isRemote
                      ? 'Location is disabled for remote positions'
                      : 'Comma-separated list of preferred candidate locations'}
                  </p>
                </div>

                {/* Language Requirements - Per Language Proficiency */}
                <div>
                  <div className='flex items-center justify-between mb-2'>
                    <label className='block text-sm font-medium text-gray-900'>
                      Language Requirements
                    </label>
                    <Button
                      type='button'
                      variant='outline'
                      size='sm'
                      onClick={addLanguageRequirement}
                    >
                      <Plus className='w-4 h-4 mr-1' />
                      Add Language
                    </Button>
                  </div>

                  {languageRequirements.length === 0 ? (
                    <p className='text-sm text-gray-500 italic py-4 text-center border border-dashed border-gray-300 rounded-lg'>
                      No language requirements set. Click &quot;Add Language&quot; to add one.
                    </p>
                  ) : (
                    <div className='space-y-3'>
                      {languageRequirements.map((langReq, index) => (
                        <div
                          key={index}
                          className='flex items-center gap-3 p-3 bg-gray-50 rounded-lg border'
                        >
                          <div className='flex-1'>
                            <input
                              type='text'
                              value={langReq.language}
                              onChange={(e) =>
                                updateLanguageRequirement(index, 'language', e.target.value)
                              }
                              className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                              placeholder='e.g., English, German, Spanish'
                            />
                          </div>
                          <div className='w-48'>
                            <select
                              value={langReq.level}
                              onChange={(e) =>
                                updateLanguageRequirement(index, 'level', e.target.value)
                              }
                              className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white'
                            >
                              <option value='Basic'>Basic (A1-B1)</option>
                              <option value='Intermediate'>Intermediate (B2)</option>
                              <option value='Professional'>Professional (C1)</option>
                              <option value='Native'>Native / Fluent (C2)</option>
                            </select>
                          </div>
                          <Button
                            type='button'
                            variant='ghost'
                            size='sm'
                            onClick={() => removeLanguageRequirement(index)}
                            className='text-red-500 hover:text-red-700 hover:bg-red-50'
                          >
                            <X className='w-4 h-4' />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                  <p className='text-xs text-gray-500 mt-2'>
                    Add each required language with its minimum proficiency level
                  </p>
                </div>

                <Separator />

                {/* Education Fields */}
                <div>
                  <label className='block text-sm font-medium text-gray-900 mb-2'>
                    Preferred Education Fields (Optional)
                  </label>
                  <input
                    type='text'
                    value={educationFields}
                    onChange={(e) => setEducationFields(e.target.value)}
                    className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                    placeholder='e.g., Computer Science, Software Engineering, Information Technology'
                  />
                  <p className='text-xs text-gray-500 mt-2'>
                    Comma-separated list of preferred degree fields
                  </p>
                </div>

                <Separator />

                {/* Required Keywords */}
                <div>
                  <label className='block text-sm font-medium text-gray-900 mb-2'>
                    Required Keywords
                  </label>
                  <textarea
                    value={requiredKeywords}
                    onChange={(e) => setRequiredKeywords(e.target.value)}
                    className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none'
                    rows={4}
                    placeholder='JavaScript, React, Node.js, Git, REST APIs'
                  />
                  <p className='text-xs text-gray-500 mt-2'>
                    Comma-separated list of must-have skills, technologies, or qualifications
                  </p>
                  {requiredKeywords && (
                    <div className='flex flex-wrap gap-2 mt-3'>
                      {jobSettingsStorage.parseKeywords(requiredKeywords).map((keyword, index) => (
                        <Badge key={index} variant='default'>
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                {/* Preferred Keywords */}
                <div>
                  <label className='block text-sm font-medium text-gray-900 mb-2'>
                    Preferred Keywords (Optional)
                  </label>
                  <textarea
                    value={preferredKeywords}
                    onChange={(e) => setPreferredKeywords(e.target.value)}
                    className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none'
                    rows={3}
                    placeholder='TypeScript, GraphQL, Docker, AWS, CI/CD'
                  />
                  <p className='text-xs text-gray-500 mt-2'>
                    Comma-separated list of nice-to-have skills (bonus points)
                  </p>
                  {preferredKeywords && (
                    <div className='flex flex-wrap gap-2 mt-3'>
                      {jobSettingsStorage.parseKeywords(preferredKeywords).map((keyword, index) => (
                        <Badge key={index} variant='secondary'>
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>

                <Separator />

                {/* Action Buttons */}
                <div className='sticky bottom-0 bg-white border-t pt-4 -mx-6 px-6 -mb-6 pb-6'>
                  <div className='space-y-3'>
                    {hasUnsavedChanges && (
                      <Alert>
                        <Info className='h-4 w-4' />
                        <AlertDescription className='text-sm'>
                          You have unsaved changes. Click &quot;Save Settings&quot; to apply them.
                        </AlertDescription>
                      </Alert>
                    )}

                    <div className='flex gap-3'>
                      <Button onClick={handleSave} className='flex-1' disabled={!hasUnsavedChanges}>
                        <CheckCircle className='w-4 h-4 mr-2' />
                        Save Settings
                      </Button>
                      <Button variant='outline' asChild>
                        <Link href='/upload'>Go to Upload</Link>
                      </Button>
                    </div>

                    {hasSettings && (
                      <Button variant='destructive' onClick={handleClear} className='w-full'>
                        <Trash2 className='w-4 h-4 mr-2' />
                        Clear All Settings
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
