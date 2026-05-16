"use client";

import React, { useState } from 'react';
import { 
  LayoutDashboard, 
  Settings, 
  Package, 
  Truck, 
  BarChart3, 
  User,
  LogOut,
  Leaf,
  ChevronRight,
  Users,
  Box,
  Tag,
  DollarSign,
  Barcode,
  Anchor,
  Navigation
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function MyProduceDashboard() {
  const router = useRouter();
  const [activeView, setActiveView] = useState<'dashboard' | 'configuration'>('dashboard');

  const configOptions = [
    {
      title: "Customer Mapping",
      description: "Map customers to specific production channels.",
      icon: <Users className="h-5 w-5" />,
      color: "bg-blue-600"
    },
    {
      title: "Material Mapping",
      description: "Associate raw materials with production units.",
      icon: <Box className="h-5 w-5" />,
      color: "bg-emerald-600"
    },
    {
      title: "Brand Mapping",
      description: "Configure brand labels for various products.",
      icon: <Tag className="h-5 w-5" />,
      color: "bg-indigo-600"
    },
    {
      title: "Profit Center Mapping",
      description: "Assign production blocks to profit centers.",
      icon: <DollarSign className="h-5 w-5" />,
      color: "bg-amber-600"
    },
    {
      title: "Pack Type",
      description: "Define standard packaging specifications.",
      icon: <Package className="h-5 w-5" />,
      color: "bg-orange-600"
    },
    {
      title: "SKUs",
      description: "Manage Stock Keeping Units and product codes.",
      icon: <Barcode className="h-5 w-5" />,
      color: "bg-purple-600"
    },
    {
      title: "Port of Loading",
      description: "Configure origin ports for logistics.",
      icon: <Anchor className="h-5 w-5" />,
      color: "bg-sky-600"
    },
    {
      title: "Port of Destination",
      description: "Manage international delivery destinations.",
      icon: <Navigation className="h-5 w-5" />,
      color: "bg-rose-600"
    }
  ];

  return (
    <div className="flex h-screen bg-gray-50/50">
      {/* Sidebar */}
      <aside className="w-64 bg-anflocor-green text-white flex flex-col shrink-0">
        <div className="p-6 flex items-center space-x-3 border-b border-white/10">
          <Leaf className="h-8 w-8 text-white" />
          <span className="text-xl font-bold tracking-tighter">myProduce</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          <Button 
            variant="ghost" 
            onClick={() => setActiveView('dashboard')}
            className={cn(
              "w-full justify-start text-white hover:bg-white/10 hover:text-white transition-all",
              activeView === 'dashboard' ? "bg-white/10" : "text-white/70"
            )}
          >
            <LayoutDashboard className="mr-3 h-5 w-5" />
            Dashboard
          </Button>
          <Button variant="ghost" className="w-full justify-start text-white/70 hover:bg-white/10 hover:text-white">
            <Package className="mr-3 h-5 w-5" />
            Inventory
          </Button>
          <Button variant="ghost" className="w-full justify-start text-white/70 hover:bg-white/10 hover:text-white">
            <Truck className="mr-3 h-5 w-5" />
            Logistics
          </Button>
          <Button variant="ghost" className="w-full justify-start text-white/70 hover:bg-white/10 hover:text-white">
            <BarChart3 className="mr-3 h-5 w-5" />
            Reports
          </Button>
          <div className="pt-4 mt-4 border-t border-white/10">
            <Button 
              variant="ghost" 
              onClick={() => setActiveView('configuration')}
              className={cn(
                "w-full justify-start text-white hover:bg-white/10 hover:text-white transition-all",
                activeView === 'configuration' ? "bg-white/10" : "text-white/70"
              )}
            >
              <Settings className="mr-3 h-5 w-5" />
              Configuration
            </Button>
          </div>
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center p-2 mb-4 bg-white/5 rounded-lg">
            <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center mr-3">
              <User className="h-5 w-5" />
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-sm font-medium truncate">Angela L.</p>
              <p className="text-xs text-white/50 truncate">Manager</p>
            </div>
          </div>
          <Button 
            onClick={() => router.push('/')}
            variant="ghost" 
            className="w-full justify-start text-white/70 hover:bg-red-500/20 hover:text-red-400"
          >
            <LogOut className="mr-3 h-5 w-5" />
            Sign Out
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8">
        <header className="mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
              {activeView === 'dashboard' ? 'Dashboard' : 'System Configuration'}
            </h1>
            <p className="text-gray-500 font-medium">TADECO Agricultural Production Portal</p>
          </div>
          <div className="bg-anflocor-green/5 px-4 py-2 rounded-full border border-anflocor-green/10">
            <p className="text-xs font-bold text-anflocor-green uppercase tracking-widest">Enterprise Edition</p>
          </div>
        </header>

        {activeView === 'dashboard' ? (
          /* Analytics Summary View */
          <section className="animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex items-center space-x-2 mb-6">
              <div className="h-8 w-1 bg-anflocor-green rounded-full" />
              <h2 className="text-xl font-bold text-gray-800 flex items-center">
                Production Overview
              </h2>
            </div>
            
            <Card className="border-gray-200/60 shadow-sm bg-white overflow-hidden">
              <div className="bg-gray-50/50 p-4 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-bold text-gray-700">Real-time Metrics</h3>
                <BarChart3 className="h-4 w-4 text-gray-400" />
              </div>
              <CardContent className="p-12 flex flex-col items-center justify-center text-gray-400">
                <div className="relative mb-4">
                  <div className="absolute inset-0 bg-anflocor-green/5 blur-3xl rounded-full" />
                  <BarChart3 className="h-16 w-16 opacity-10 relative z-10" />
                </div>
                <p className="text-sm font-medium">Production statistics and operational data will appear here.</p>
                <Button variant="outline" className="mt-6 border-anflocor-green/20 text-anflocor-green hover:bg-anflocor-green/5">
                  Generate Summary Report
                </Button>
              </CardContent>
            </Card>
          </section>
        ) : (
          /* Configuration Grid View */
          <section className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex items-center space-x-2">
              <div className="h-8 w-1 bg-anflocor-green rounded-full" />
              <h2 className="text-xl font-bold text-gray-800 flex items-center">
                Configuration Mappings
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {configOptions.map((option, idx) => (
                <Card key={idx} className="group hover:ring-2 hover:ring-anflocor-green/20 hover:shadow-md transition-all border-gray-200/60 cursor-pointer overflow-hidden">
                  <CardHeader className="p-5">
                    <div className={`${option.color} text-white p-2.5 rounded-lg w-fit shadow-sm group-hover:scale-105 transition-transform duration-300`}>
                      {option.icon}
                    </div>
                    <div className="pt-4">
                      <CardTitle className="text-base font-bold text-gray-900">{option.title}</CardTitle>
                      <CardDescription className="text-xs mt-1.5 leading-relaxed line-clamp-2">
                        {option.description}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="p-5 pt-0">
                    <Button variant="link" className="p-0 h-auto text-anflocor-green text-xs font-bold group-hover:translate-x-1 transition-transform">
                      ACCESS MAPPING <ChevronRight className="ml-1 h-3 w-3" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
