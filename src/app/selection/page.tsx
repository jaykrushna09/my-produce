
"use client";

import React from 'react';
import { Leaf, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function SelectionPage() {
  const router = useRouter();

  const options = [
    {
      id: 'mytime',
      title: 'TADECO myTime',
      description: 'Time Management System',
      action: () => router.push('/mytime')
    },
    {
      id: 'myproduce',
      title: 'TADECO myProduce',
      description: 'Production Management System',
      action: () => router.push('/myproduce')
    }
  ];

  return (
    <main className="min-h-screen flex flex-col md:flex-row">
      {/* Left Side: Brand Identity (Matches Login Page) */}
      <div className="flex-1 bg-anflocor-green flex flex-col items-center justify-center p-8 text-white">
        <div className="space-y-6 text-center">
          <p className="text-xl font-medium tracking-wide">Welcome!</p>
          <div className="flex flex-col items-center space-y-2">
            <div className="border-[3px] border-white rounded-tr-3xl rounded-bl-3xl p-4 mb-2">
              <Leaf className="h-16 w-16" strokeWidth={1.5} />
            </div>
            <h1 className="text-6xl md:text-7xl font-bold tracking-tighter uppercase">
              ANFLOCOR
            </h1>
          </div>
        </div>
      </div>

      {/* Right Side: Selection Interaction */}
      <div className="flex-[1.2] bg-white flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="space-y-4">
            <h2 className="text-4xl font-bold text-gray-900 tracking-tight">
              Welcome back Angela L!
            </h2>
            <p className="text-gray-600 text-sm leading-relaxed max-w-sm font-medium">
              Select a portal for international logistics or agricultural production workflows.
            </p>
          </div>

          <div className="space-y-4">
            {options.map((option) => (
              <div 
                key={option.id}
                onClick={option.action}
                className="flex items-center p-5 border border-gray-100 rounded-xl shadow-sm hover:shadow-md hover:border-gray-200 transition-all cursor-pointer group bg-white"
              >
                <div className="bg-anflocor-green p-3 rounded-xl mr-5 text-white">
                  <Leaf className="h-6 w-6" strokeWidth={2} />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-gray-900">{option.title}</h3>
                  <p className="text-gray-400 text-sm font-medium">
                    {option.description}
                  </p>
                </div>
                <div className="ml-4">
                  <ArrowRight className="h-5 w-5 text-gray-300 group-hover:text-anflocor-green group-hover:translate-x-1 transition-all" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
