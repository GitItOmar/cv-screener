import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Upload, MousePointer, Check, Shield, Brain, ShuffleIcon as Swipe } from 'lucide-react';

export default function HomePage() {
  return (
    <div className='min-h-screen flex flex-col'>
      {/* Main Content */}
      <main className='flex-1 px-4 py-12'>
        {/* Hero Section */}
        <div className='max-w-4xl mx-auto text-center space-y-8 mb-16'>
          <div className='space-y-6'>
            <h1 className='text-4xl md:text-6xl font-bold tracking-tight text-gray-900'>
              Screen 100+ CVs in minutes.
            </h1>
            <p className='text-xl text-gray-600 leading-relaxed max-w-2xl mx-auto'>
              Bulk upload CVs, let AI apply best-practice screening, then swipe left/right to
              finalize.
            </p>
          </div>

          {/* Primary CTAs */}
          <div className='flex flex-col sm:flex-row gap-4 justify-center items-center'>
            <Button asChild size='lg' className='px-8 py-4 text-lg font-semibold'>
              <Link href='/upload' className='inline-flex items-center gap-2'>
                <Upload className='w-5 h-5' />
                Upload CVs in Bulk
              </Link>
            </Button>
            <Button
              variant='outline'
              size='lg'
              asChild
              className='px-8 py-4 text-lg font-semibold bg-transparent'
            >
              <Link href='/review' className='inline-flex items-center gap-2'>
                <MousePointer className='w-5 h-5' />
                Start Reviewing
              </Link>
            </Button>
          </div>

          <p className='text-sm text-gray-500'>No setup. GDPR-ready.</p>
        </div>

        {/* 3-Step Process */}
        <div className='max-w-6xl mx-auto mb-16'>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-6'>
            <Card className='text-center'>
              <CardHeader>
                <div className='mx-auto w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4'>
                  <Upload className='w-6 h-6 text-blue-600' />
                </div>
                <CardTitle className='text-xl'>Bulk Upload</CardTitle>
              </CardHeader>
              <CardContent>
                <p className='text-gray-600'>
                  Drag & drop, CSV/PDF/DOCX support for hundreds of CVs at once.
                </p>
              </CardContent>
            </Card>

            <Card className='text-center'>
              <CardHeader>
                <div className='mx-auto w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4'>
                  <Brain className='w-6 h-6 text-green-600' />
                </div>
                <CardTitle className='text-xl'>AI Pre-Screen</CardTitle>
              </CardHeader>
              <CardContent>
                <p className='text-gray-600'>
                  Best-practice scoring, skills matching, and red-flag detection.
                </p>
              </CardContent>
            </Card>

            <Card className='text-center'>
              <CardHeader>
                <div className='mx-auto w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4'>
                  <Swipe className='w-6 h-6 text-purple-600' />
                </div>
                <CardTitle className='text-xl'>Swipe Review</CardTitle>
              </CardHeader>
              <CardContent>
                <p className='text-gray-600'>
                  Keyboard shortcuts, undo functionality, shortlist and export.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Value Section */}
        <div className='max-w-6xl mx-auto mb-16'>
          <div className='grid grid-cols-1 lg:grid-cols-2 gap-12 items-center'>
            {/* Left Column - Benefits */}
            <div className='space-y-6'>
              <h2 className='text-3xl font-bold text-gray-900'>Why hiring teams choose us</h2>
              <div className='space-y-4'>
                <div className='flex items-start gap-3'>
                  <Check className='w-5 h-5 text-green-600 mt-1 flex-shrink-0' />
                  <span className='text-gray-700'>Cut time-to-screen by 70%</span>
                </div>
                <div className='flex items-start gap-3'>
                  <Check className='w-5 h-5 text-green-600 mt-1 flex-shrink-0' />
                  <span className='text-gray-700'>Consistent criteria across all candidates</span>
                </div>
                <div className='flex items-start gap-3'>
                  <Check className='w-5 h-5 text-green-600 mt-1 flex-shrink-0' />
                  <span className='text-gray-700'>Human-in-the-loop controls</span>
                </div>
              </div>
            </div>

            {/* Right Column - Score Preview */}
            <div className='flex justify-center'>
              <Card className='w-full max-w-sm'>
                <CardHeader>
                  <CardTitle className='text-lg'>Score Preview</CardTitle>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <div className='space-y-2'>
                    <div className='flex justify-between text-sm'>
                      <span>Overall Match</span>
                      <span>85%</span>
                    </div>
                    <Progress value={85} className='h-2' />
                  </div>
                  <div className='flex flex-wrap gap-2'>
                    <Badge variant='secondary'>React</Badge>
                    <Badge variant='secondary'>TypeScript</Badge>
                    <Badge variant='outline'>5+ years</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Social Proof */}
        <div className='max-w-4xl mx-auto mb-16 text-center'>
          <div className='space-y-8'>
            <div className='flex flex-wrap justify-center items-center gap-8 opacity-60'>
              <div className='text-2xl font-bold text-gray-400'>COMPANY A</div>
              <div className='text-2xl font-bold text-gray-400'>STARTUP B</div>
              <div className='text-2xl font-bold text-gray-400'>CORP C</div>
              <div className='text-2xl font-bold text-gray-400'>TECH D</div>
            </div>
            <div className='flex justify-center items-center gap-4'>
              <Shield className='w-5 h-5 text-green-600' />
              <Badge variant='outline' className='text-sm'>
                GDPR Compliant
              </Badge>
              <Badge variant='outline' className='text-sm'>
                Data Encrypted
              </Badge>
            </div>
          </div>
        </div>

        {/* CTA Band */}
        <div className='max-w-4xl mx-auto mb-16'>
          <Card className='bg-gray-50 border-0'>
            <CardContent className='text-center py-12 space-y-6'>
              <h2 className='text-3xl font-bold text-gray-900'>Ready to speed up screening?</h2>
              <div className='flex flex-col sm:flex-row gap-4 justify-center'>
                <Button asChild size='lg' className='px-8 py-4 text-lg font-semibold'>
                  <Link href='/upload' className='inline-flex items-center gap-2'>
                    <Upload className='w-5 h-5' />
                    Upload CVs in Bulk
                  </Link>
                </Button>
                <Button
                  variant='outline'
                  size='lg'
                  asChild
                  className='px-8 py-4 text-lg font-semibold bg-transparent'
                >
                  <Link href='/review' className='inline-flex items-center gap-2'>
                    <MousePointer className='w-5 h-5' />
                    Start Reviewing
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* FAQ Section */}
        <div className='max-w-3xl mx-auto mb-16'>
          <h2 className='text-3xl font-bold text-center text-gray-900 mb-8'>
            Frequently Asked Questions
          </h2>
          <Accordion type='single' collapsible className='w-full'>
            <AccordionItem value='formats'>
              <AccordionTrigger>What formats do you support?</AccordionTrigger>
              <AccordionContent>
                We support PDF, DOCX, and CSV files. You can upload individual files or bulk upload
                via CSV with candidate information and resume links.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value='ai-scoring'>
              <AccordionTrigger>How does the AI score work?</AccordionTrigger>
              <AccordionContent>
                Our AI analyzes CVs against your job requirements, scoring candidates on skills
                match, experience level, and identifying potential red flags. All scoring criteria
                are transparent and customizable.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value='undo'>
              <AccordionTrigger>Can I undo decisions?</AccordionTrigger>
              <AccordionContent>
                Yes! Every swipe decision can be undone. You can also bulk actions and review your
                decision history at any time.
              </AccordionContent>
            </AccordionItem>
            <AccordionItem value='security'>
              <AccordionTrigger>Is data secure/GDPR compliant?</AccordionTrigger>
              <AccordionContent>
                Absolutely. We&apos;re fully GDPR compliant with end-to-end encryption, automatic
                data deletion policies, and comprehensive audit trails. Your candidate data is never
                shared or used for training.
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </main>
      {/* Footer */}
      <footer className='border-t border-gray-200 py-8 px-4'>
        <div className='max-w-2xl mx-auto text-center space-y-2'>
          <p className='text-sm text-gray-600'>
            © {new Date().getFullYear()} Our Company. All rights reserved.
          </p>
          <p className='text-sm text-gray-500'>
            Questions? Contact us at{' '}
            <a
              href='mailto:careers@company.com'
              className='text-blue-600 hover:text-blue-800 underline'
            >
              careers@company.com
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
