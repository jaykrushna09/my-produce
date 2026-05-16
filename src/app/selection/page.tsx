"use client";

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, ShoppingBasket, LogOut, Leaf } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function SelectionPage() {
  const router = useRouter();

  const handleLogout = () => {
    router.push('/');
  };

  const options = [
    {
      id: 'mytime',
      title: 'myTime',
      description: 'Attendance, Leave, and Time Tracking',
      icon: Clock,
      color: 'bg-blue-50 text-blue-600',
      action: () => router.push('/mytime')
    },
    {
      id: 'myproduce',
      title: 'myProduce',
      description: 'Inventory, Production, and Supply Chain',
      icon: ShoppingBasket,
      color: 'bg-orange-50 text-orange-600',
      action: () => router.push('/myproduce')
    }
  ];

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-anflocor-green text-white p-4 shadow-md">
        <div className="max-w-5xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Leaf className="h-6 w-6" />
            <span className="font-bold text-xl tracking-tight">ANFLOCOR</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm hidden sm:inline-block opacity-80">
              Employee Access
            </span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLogout}
              className="text-white hover:bg-white/10"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-4xl text-center space-y-2 mb-12">
          <h1 className="text-3xl font-bold text-gray-900">Select a Module</h1>
          <p className="text-muted-foreground">Choose the system you would like to access today.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
          {options.map((option) => (
            <Card 
              key={option.id}
              className="group cursor-pointer hover:shadow-xl transition-all duration-300 border-none shadow-sm overflow-hidden"
              onClick={option.action}
            >
              <CardContent className="p-0">
                <div className="flex flex-col items-center text-center p-12 space-y-6">
                  <div className={`p-6 rounded-full ${option.color} group-hover:scale-110 transition-transform duration-300`}>
                    <option.icon className="h-12 w-12" strokeWidth={1.5} />
                  </div>
                  <div className="space-y-2">
                    <h2 className="text-2xl font-bold text-gray-900">{option.title}</h2>
                    <p className="text-sm text-muted-foreground max-w-[200px] mx-auto">
                      {option.description}
                    </p>
                  </div>
                  <Button 
                    variant="outline" 
                    className="mt-4 border-anflocor-green text-anflocor-green hover:bg-anflocor-green hover:text-white"
                  >
                    Access System
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Footer */}
      <footer className="p-8 text-center text-xs text-muted-foreground uppercase tracking-widest">
        ANFLOCOR Group of Companies &copy; {new Date().getFullYear()}
      </footer>
    </main>
  );
}
