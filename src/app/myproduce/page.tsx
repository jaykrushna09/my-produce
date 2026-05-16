"use client";

import React from 'react';
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
  Database,
  Users,
  Shield
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function MyProduceDashboard() {
  const router = useRouter();

  const configOptions = [
    {
      title: "Master Data",
      description: "Manage crops, varieties, and block mappings.",
      icon: <Database className="h-5 w-5" />,
      color: "bg-blue-500"
    },
    {
      title: "User Permissions",
      description: "Configure access roles for production staff.",
      icon: <Users className="h-5 w-5" />,
      color: "bg-purple-500"
    },
    {
      title: "System Settings",
      description: "General configuration and integration parameters.",
      icon: <Settings className="h-5 w-5" />,
      color: "bg-anflocor-green"
    },
    {
      title: "Security Protocols",
      description: "Define field-level security and audit logs.",
      icon: <Shield className="h-5 w-5" />,
      color: "bg-orange-500"
    }
  ];

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-anflocor-green text-white flex flex-col">
        <div className="p-6 flex items-center space-x-3 border-b border-white/10">
          <Leaf className="h-8 w-8 text-white" />
          <span className="text-xl font-bold tracking-tighter">myProduce</span>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <Button variant="ghost" className="w-full justify-start text-white hover:bg-white/10 hover:text-white bg-white/5">
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
            <Button variant="ghost" className="w-full justify-start text-white/70 hover:bg-white/10 hover:text-white">
              <Settings className="mr-3 h-5 w-5" />
              Configuration
            </Button>
          </div>
        </nav>

        <div className="p-4 border-t border-white/10">
          <div className="flex items-center p-2 mb-4">
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
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-500">Welcome to TADECO myProduce Portal</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-400 uppercase tracking-widest">Enterprise Edition</p>
          </div>
        </header>

        {/* Configuration Section */}
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800 flex items-center">
              <Settings className="mr-2 h-5 w-5 text-anflocor-green" />
              Configuration Options
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {configOptions.map((option, idx) => (
              <Card key={idx} className="group hover:shadow-lg transition-all border-gray-100 cursor-pointer">
                <CardHeader className="space-y-4">
                  <div className={`${option.color} text-white p-3 rounded-lg w-fit shadow-sm group-hover:scale-110 transition-transform`}>
                    {option.icon}
                  </div>
                  <div>
                    <CardTitle className="text-lg">{option.title}</CardTitle>
                    <CardDescription className="mt-1">{option.description}</CardDescription>
                  </div>
                </CardHeader>
                <CardContent>
                  <Button variant="link" className="p-0 h-auto text-anflocor-green font-semibold group-hover:translate-x-1 transition-transform">
                    Configure <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* Placeholder for other dashboard content */}
        <section className="mt-12 grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 border-gray-100 shadow-sm bg-white">
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
              <CardDescription>Track latest updates in agricultural production.</CardDescription>
            </CardHeader>
            <CardContent className="h-64 flex items-center justify-center text-gray-400 bg-gray-50/50 rounded-md mx-6 mb-6">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 mx-auto mb-2 opacity-20" />
                <p>Activity stream visualization placeholder</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-100 shadow-sm bg-white">
            <CardHeader>
              <CardTitle>Quick Links</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button variant="outline" className="w-full justify-between">
                Field Audit <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" className="w-full justify-between">
                Yield Prediction <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" className="w-full justify-between">
                Resource Allocation <ChevronRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
