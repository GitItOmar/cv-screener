'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export default function CandidateCardSkeleton() {
  return (
    <Card className='w-full max-w-2xl mx-auto shadow-lg'>
      <CardHeader className='pb-4'>
        <div className='flex items-start justify-between'>
          <div className='flex items-center space-x-4'>
            {/* Avatar skeleton */}
            <Skeleton className='h-16 w-16 rounded-full' />

            {/* Name and Role skeleton */}
            <div className='space-y-2'>
              <Skeleton className='h-7 w-48' />
              <Skeleton className='h-4 w-32' />
            </div>
          </div>

          {/* Score Badge skeleton */}
          <div className='flex flex-col items-end space-y-2'>
            <Skeleton className='h-8 w-16 rounded-md' />
            <Skeleton className='h-6 w-24 rounded-md' />
          </div>
        </div>

        {/* Progress indicator skeleton */}
        <Skeleton className='mt-4 h-4 w-32' />
      </CardHeader>

      <CardContent className='space-y-4'>
        {/* Quick Stats skeleton */}
        <div className='flex flex-wrap gap-4'>
          <Skeleton className='h-4 w-32' />
          <Skeleton className='h-4 w-28' />
          <Skeleton className='h-4 w-36' />
        </div>

        {/* Top Skills skeleton */}
        <div className='space-y-2'>
          <Skeleton className='h-4 w-20' />
          <div className='flex flex-wrap gap-2'>
            <Skeleton className='h-6 w-16 rounded-md' />
            <Skeleton className='h-6 w-20 rounded-md' />
            <Skeleton className='h-6 w-14 rounded-md' />
            <Skeleton className='h-6 w-18 rounded-md' />
            <Skeleton className='h-6 w-16 rounded-md' />
          </div>
        </div>

        {/* AI Confidence skeleton */}
        <div className='pt-2 border-t'>
          <div className='flex items-center justify-between'>
            <Skeleton className='h-4 w-24' />
            <div className='flex items-center space-x-2'>
              <Skeleton className='h-2 w-32 rounded-full' />
              <Skeleton className='h-4 w-10' />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
