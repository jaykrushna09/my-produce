"use client";

import React, { useState, useRef } from 'react';
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
  Navigation,
  Upload,
  FileSpreadsheet,
  Plus,
  ArrowLeft,
  Loader2,
  Trash2
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { 
  collection, 
  doc, 
  writeBatch, 
  serverTimestamp,
  query,
  orderBy,
  deleteDoc
} from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, errorEmitter, FirestorePermissionError } from '@/firebase';
import * as XLSX from 'xlsx';

type ViewState = 'dashboard' | 'configuration' | 'customer-mapping';

export default function MyProduceDashboard() {
  const router = useRouter();
  const db = useFirestore();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [activeView, setActiveView] = useState<ViewState>('dashboard');
  const [isUploading, setIsUploading] = useState(false);

  // Stabilize the query to prevent re-renders
  const customerMappingsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'customerMappings'), orderBy('customer', 'asc'));
  }, [db]);
  
  const { data: customerMappings, loading: mappingsLoading } = useCollection(customerMappingsQuery);

  const configOptions = [
    {
      id: 'customer-mapping',
      title: "Customer Mapping",
      description: "Map customers using SAPC codes and IDs.",
      icon: <Users className="h-5 w-5" />,
      color: "bg-blue-600"
    },
    { id: 'material-mapping', title: "Material Mapping", description: "Associate raw materials.", icon: <Box className="h-5 w-5" />, color: "bg-emerald-600" },
    { id: 'brand-mapping', title: "Brand Mapping", description: "Configure brand labels.", icon: <Tag className="h-5 w-5" />, color: "bg-indigo-600" },
    { id: 'profit-center-mapping', title: "Profit Center Mapping", description: "Assign production blocks.", icon: <DollarSign className="h-5 w-5" />, color: "bg-amber-600" },
    { id: 'pack-type', title: "Pack Type", description: "Define packaging specs.", icon: <Package className="h-5 w-5" />, color: "bg-orange-600" },
    { id: 'skus', title: "SKUs", description: "Manage Stock Keeping Units.", icon: <Barcode className="h-5 w-5" />, color: "bg-purple-600" },
    { id: 'port-of-loading', title: "Port of Loading", description: "Configure origin ports.", icon: <Anchor className="h-5 w-5" />, color: "bg-sky-600" },
    { id: 'port-of-destination', title: "Port of Destination", description: "Manage destinations.", icon: <Navigation className="h-5 w-5" />, color: "bg-rose-600" }
  ];

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !db) return;

    setIsUploading(true);
    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const ws = wb.Sheets["Customer Mapping"];

        if (!ws) {
          toast({ variant: "destructive", title: "Sheet Not Found", description: 'Missing "Customer Mapping" sheet.' });
          setIsUploading(false);
          return;
        }

        const data = XLSX.utils.sheet_to_json(ws) as any[];
        const batch = writeBatch(db);
        let count = 0;
        
        data.forEach((row) => {
          const id = row.CustomerID || row['Customer ID'] || row['customerID'];
          if (id) {
            const docRef = doc(db, 'customerMappings', String(id));
            const payload = {
              customerID: String(id),
              customer: String(row.Customer || 'N/A'),
              sapcCode: String(row.SAPC_Code || 'N/A'),
              sapcDesc: String(row.SAPC_Desc || 'N/A'),
              updatedAt: serverTimestamp(),
            };
            batch.set(docRef, payload);
            count++;
          }
        });

        // Use non-blocking commit
        batch.commit()
          .then(() => {
            toast({ title: "Import Successful", description: `Imported ${count} records.` });
          })
          .catch(async (err) => {
            const permissionError = new FirestorePermissionError({
              path: 'customerMappings',
              operation: 'write',
            });
            errorEmitter.emit('permission-error', permissionError);
          });

      } catch (err) {
        toast({ variant: "destructive", title: "Import Failed", description: "Error processing Excel." });
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.readAsBinaryString(file);
  };

  const handleDeleteMapping = (id: string) => {
    if (!db) return;
    const docRef = doc(db, 'customerMappings', id);
    deleteDoc(docRef).catch(async (err) => {
      const permissionError = new FirestorePermissionError({
        path: docRef.path,
        operation: 'delete',
      });
      errorEmitter.emit('permission-error', permissionError);
    });
  };

  const renderContent = () => {
    if (activeView === 'dashboard') {
      return (
        <section className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="flex items-center space-x-2 mb-6">
            <div className="h-8 w-1 bg-anflocor-green rounded-full" />
            <h2 className="text-xl font-bold text-gray-800">Production Overview</h2>
          </div>
          <Card className="border-gray-200 shadow-sm bg-white overflow-hidden">
            <CardContent className="p-12 flex flex-col items-center justify-center text-gray-400">
              <BarChart3 className="h-16 w-16 opacity-10 mb-4" />
              <p className="text-sm">Production statistics will appear here.</p>
            </CardContent>
          </Card>
        </section>
      );
    }

    if (activeView === 'configuration') {
      return (
        <section className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {configOptions.map((option) => (
              <Card key={option.id} onClick={() => option.id === 'customer-mapping' && setActiveView('customer-mapping')} className="group hover:ring-2 hover:ring-anflocor-green/20 transition-all cursor-pointer">
                <CardHeader className="p-5">
                  <div className={`${option.color} text-white p-2.5 rounded-lg w-fit`}>{option.icon}</div>
                  <CardTitle className="text-base font-bold mt-4">{option.title}</CardTitle>
                  <CardDescription className="text-xs line-clamp-2">{option.description}</CardDescription>
                </CardHeader>
                <CardContent className="p-5 pt-0">
                  <Button variant="link" className="p-0 h-auto text-anflocor-green text-xs font-bold">ACCESS <ChevronRight className="ml-1 h-3 w-3" /></Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      );
    }

    return (
      <section className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" onClick={() => setActiveView('configuration')} className="rounded-full"><ArrowLeft className="h-5 w-5" /></Button>
            <h2 className="text-2xl font-bold">Customer Mapping</h2>
          </div>
          <div className="flex items-center space-x-2">
            <Input type="file" accept=".xlsx, .xls" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
            <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="bg-anflocor-green hover:bg-anflocor-green/90 text-white">
              {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />} Upload Excel
            </Button>
          </div>
        </div>
        <Card className="border-gray-200 shadow-sm overflow-hidden bg-white">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead>Customer ID</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>SAPC Code</TableHead>
                <TableHead>SAPC Description</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mappingsLoading ? (
                <TableRow><TableCell colSpan={5} className="h-32 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto opacity-20" /></TableCell></TableRow>
              ) : customerMappings.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="h-32 text-center text-gray-400">No data found.</TableCell></TableRow>
              ) : customerMappings.map((m: any) => (
                <TableRow key={m.id}>
                  <TableCell className="font-mono text-xs font-bold text-anflocor-green">{m.customerID}</TableCell>
                  <TableCell>{m.customer}</TableCell>
                  <TableCell><span className="px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-700">{m.sapcCode}</span></TableCell>
                  <TableCell className="text-gray-500">{m.sapcDesc}</TableCell>
                  <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => handleDeleteMapping(m.id)} className="text-gray-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </section>
    );
  };

  return (
    <div className="flex h-screen bg-gray-50/50">
      <aside className="w-64 bg-anflocor-green text-white flex flex-col shrink-0">
        <div className="p-6 flex items-center space-x-3 border-b border-white/10"><Leaf className="h-8 w-8" /><span className="text-xl font-bold tracking-tighter">myProduce</span></div>
        <nav className="flex-1 p-4 space-y-1">
          <Button variant="ghost" onClick={() => setActiveView('dashboard')} className={cn("w-full justify-start text-white hover:bg-white/10", activeView === 'dashboard' && "bg-white/10")}><LayoutDashboard className="mr-3 h-5 w-5" />Dashboard</Button>
          <Button variant="ghost" onClick={() => setActiveView('configuration')} className={cn("w-full justify-start text-white hover:bg-white/10", (activeView === 'configuration' || activeView === 'customer-mapping') && "bg-white/10")}><Settings className="mr-3 h-5 w-5" />Configuration</Button>
        </nav>
        <div className="p-4 border-t border-white/10">
          <Button onClick={() => router.push('/')} variant="ghost" className="w-full justify-start text-white/70 hover:text-red-400"><LogOut className="mr-3 h-5 w-5" />Sign Out</Button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-8">
        <header className="mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
              {activeView === 'dashboard' ? 'Dashboard' : activeView === 'configuration' ? 'System Configuration' : 'Customer Mapping'}
            </h1>
            <p className="text-gray-500 font-medium">TADECO Agricultural Production Portal</p>
          </div>
        </header>
        {renderContent()}
      </main>
    </div>
  );
}
