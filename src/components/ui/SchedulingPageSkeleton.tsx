import React from 'react';

const SchedulingPageSkeleton: React.FC = () => {
  return (
    <div className="p-4 md:p-6 animate-pulse">
      <div className="mb-4">
        <div className="h-8 bg-gray-200 rounded w-1/4"></div>
      </div>
      <div className="mb-4">
        <div className="h-10 bg-gray-200 rounded w-1/2"></div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
        <div>
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
        <div>
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
        <div>
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-2"></div>
          <div className="h-10 bg-gray-200 rounded"></div>
        </div>
      </div>
      <div className="mt-4">
        <div className="h-12 bg-gray-200 rounded w-1/4"></div>
      </div>
    </div>
  );
};

export default SchedulingPageSkeleton;
