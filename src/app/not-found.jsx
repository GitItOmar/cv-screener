'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Home, Upload, Users, ArrowLeft } from 'lucide-react';

export default function NotFound() {
  return (
    <div className='min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4'>
      <Card className='w-full max-w-md text-center shadow-lg'>
        <CardContent className='pt-12 pb-8 px-8'>
          {/* Large 404 */}
          <div className='text-8xl font-bold text-slate-300 mb-4'>404</div>

          {/* Error message */}
          <h1 className='text-2xl font-semibold text-slate-900 mb-3'>Page Not Found</h1>
          <p className='text-slate-600 mb-8 leading-relaxed'>
            The page you&apos;re looking for doesn&apos;t exist or has been moved. Let&apos;s get
            you back on track.
          </p>

          {/* Navigation options */}
          <div className='space-y-3 mb-6'>
            <Button asChild className='w-full' size='lg'>
              <Link href='/' className='flex items-center justify-center gap-2'>
                <Home className='w-4 h-4' />
                Back to Homepage
              </Link>
            </Button>

            <div className='grid grid-cols-2 gap-3'>
              <Button asChild variant='outline' size='sm'>
                <Link href='/upload' className='flex items-center justify-center gap-2'>
                  <Upload className='w-4 h-4' />
                  Upload CVs
                </Link>
              </Button>

              <Button asChild variant='outline' size='sm'>
                <Link href='/review' className='flex items-center justify-center gap-2'>
                  <Users className='w-4 h-4' />
                  Review
                </Link>
              </Button>
            </div>
          </div>

          {/* Go back option */}
          <Button
            variant='ghost'
            size='sm'
            onClick={() => window.history.back()}
            className='text-slate-500 hover:text-slate-700'
          >
            <ArrowLeft className='w-4 h-4 mr-2' />
            Go Back
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
