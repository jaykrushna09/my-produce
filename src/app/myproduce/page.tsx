
"use client";

import React, { useState, useRef, useMemo } from 'react';
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
  ArrowLeft,
  Loader2,
  Trash2,
  Search
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
  const [searchTerm, setSearchTerm] = useState('');

  const customerMappingsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, 'customerMappings'), orderBy('Customer', 'asc'));
  }, [db]);
  
  const { data: customerMappings, loading: mappingsLoading } = useCollection(customerMappingsQuery);

  const filteredMappings = useMemo(() => {
    if (!customerMappings) return [];
    return customerMappings.filter((m: any) => 
      m.Customer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.CustomerID?.toString().toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.SAPC_Code?.toString().toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [customerMappings, searchTerm]);

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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !db) return;

    setIsUploading(true);
    const reader = new FileReader();

    reader.onload = (evt) => {
      try {
        const data = evt.target?.result;
        const wb = XLSX.read(data, { type: 'array' });
        
        // Robust sheet name search
        const sheetName = wb.SheetNames.find(name => {
          const normalized = name.trim().toLowerCase().replace(/[\s_]/g, '');
          return normalized === "customermapping";
        });
        
        const ws = sheetName ? wb.Sheets[sheetName] : null;

        if (!ws) {
          toast({ 
            variant: "destructive", 
            title: "Sheet Not Found", 
            description: 'Please ensure your Excel has a sheet exactly named "Customer Mapping".' 
          });
          setIsUploading(false);
          return;
        }

        const jsonData = XLSX.utils.sheet_to_json(ws) as any[];
        if (jsonData.length === 0) {
          toast({ 
            variant: "destructive", 
            title: "Empty Sheet", 
            description: "No data found in the 'Customer Mapping' sheet." 
          });
          setIsUploading(false);
          return;
        }

        const batch = writeBatch(db);
        let count = 0;
        
        jsonData.forEach((row) => {
          const getVal = (possibleKeys: string[]) => {
            const actualKey = Object.keys(row).find(k => 
              possibleKeys.some(pk => k.trim().toLowerCase().replace(/[\s_]/g, '') === pk.toLowerCase())
            );
            return actualKey ? row[actualKey] : null;
          };

          const id = getVal(['customerid', 'id', 'custid']);
          const customer = getVal(['customer', 'customername', 'name']);
          const sapcCode = getVal(['sapccode', 'sap_code', 'code']);
          const sapcDesc = getVal(['sapcdesc', 'sapc_description', 'description']);

          if (id) {
            const docRef = doc(db, 'customerMappings', String(id).trim());
            const payload = {
              CustomerID: String(id).trim(),
              Customer: String(customer || 'N/A').trim(),
              SAPC_Code: String(sapcCode || 'N/A').trim(),
              SAPC_Desc: String(sapcDesc || 'N/A').trim(),
              updatedAt: serverTimestamp(),
            };
            batch.set(docRef, payload);
            count++;
          }
        });

        if (count === 0) {
          toast({ 
            variant: "destructive", 
            title: "Import Error", 
            description: "No valid rows found. Ensure you have a 'CustomerID' column." 
          });
          setIsUploading(false);
          return;
        }

        batch.commit()
          .then(() => {
            toast({ 
              title: "Success", 
              description: `Successfully imported ${count} customer mappings.` 
            });
          })
          .catch(async (err) => {
            const permissionError = new FirestorePermissionError({
              path: 'customerMappings',
              operation: 'write',
            });
            errorEmitter.emit('permission-error', permissionError);
          });

      } catch (err) {
        toast({ 
          variant: "destructive", 
          title: "Import Failed", 
          description: "Could not process Excel file. Check format." 
        });
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.onerror = () => {
      toast({ variant: "destructive", title: "File Error", description: "Failed to read file." });
      setIsUploading(false);
    };

    reader.readAsArrayBuffer(file);
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
              <p className="text-sm font-medium">Production statistics will appear here.</p>
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
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" onClick={() => setActiveView('configuration')} className="rounded-full hover:bg-gray-100 transition-colors"><ArrowLeft className="h-5 w-5" /></Button>
            <h2 className="text-2xl font-bold text-gray-900">Customer Mapping</h2>
          </div>
          <div className="flex items-center space-x-2">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input 
                placeholder="Search..." 
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Input type="file" accept=".xlsx, .xls" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
            <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="bg-anflocor-green hover:bg-anflocor-green/90 text-white font-semibold">
              {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />} 
              Import Excel
            </Button>
          </div>
        </div>
        <Card className="border-gray-200 shadow-sm overflow-hidden bg-white">
          <Table>
            <TableHeader className="bg-gray-50">
              <TableRow>
                <TableHead className="font-bold text-gray-600">Customer ID</TableHead>
                <TableHead className="font-bold text-gray-600">Customer</TableHead>
                <TableHead className="font-bold text-gray-600">SAPC Code</TableHead>
                <TableHead className="font-bold text-gray-600">SAPC Description</TableHead>
                <TableHead className="text-right font-bold text-gray-600">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mappingsLoading ? (
                <TableRow><TableCell colSpan={5} className="h-48 text-center"><Loader2 className="h-10 w-10 animate-spin mx-auto text-anflocor-green opacity-40" /></TableCell></TableRow>
              ) : filteredMappings.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="h-48 text-center text-gray-400 font-medium">
                  {searchTerm ? "No matching records found." : "No customer mappings found. Import Excel to get started."}
                </TableCell></TableRow>
              ) : filteredMappings.map((m: any) => (
                <TableRow key={m.id} className="hover:bg-gray-50/50">
                  <TableCell className="font-mono text-xs font-bold text-anflocor-green">{m.CustomerID}</TableCell>
                  <TableCell className="font-medium">{m.Customer}</TableCell>
                  <TableCell><span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-50 text-blue-700">{m.SAPC_Code}</span></TableCell>
                  <TableCell className="text-gray-500 text-sm">{m.SAPC_Desc}</TableCell>
                  <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => handleDeleteMapping(m.id)} className="text-gray-400 hover:text-red-500 transition-colors"><Trash2 className="h-4 w-4" /></Button></TableCell>
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
      <aside className="w-64 bg-anflocor-green text-white flex flex-col shrink-0 shadow-xl">
        <div className="p-6 flex items-center space-x-3 border-b border-white/10">
          <div className="bg-white/10 p-2 rounded-lg"><Leaf className="h-6 w-6" /></div>
          <span className="text-xl font-bold tracking-tighter">myProduce</span>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <Button variant="ghost" onClick={() => setActiveView('dashboard')} className={cn("w-full justify-start text-white hover:bg-white/10 transition-all", activeView === 'dashboard' && "bg-white/10 shadow-inner")}><LayoutDashboard className="mr-3 h-5 w-5" />Dashboard</Button>
          <Button variant="ghost" onClick={() => setActiveView('configuration')} className={cn("w-full justify-start text-white hover:bg-white/10 transition-all", (activeView === 'configuration' || activeView === 'customer-mapping') && "bg-white/10 shadow-inner")}><Settings className="mr-3 h-5 w-5" />Configuration</Button>
        </nav>
        <div className="p-4 border-t border-white/10">
          <Button onClick={() => router.push('/')} variant="ghost" className="w-full justify-start text-white/70 hover:text-red-400 transition-colors"><LogOut className="mr-3 h-5 w-5" />Sign Out</Button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-8">
        <header className="mb-8 flex justify-between items-end border-b pb-6">
          <div>
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
              {activeView === 'dashboard' ? 'Dashboard' : activeView === 'configuration' ? 'System Configuration' : 'Customer Mapping'}
            </h1>
            <p className="text-gray-500 font-semibold mt-1">TADECO Agricultural Production Portal</p>
          </div>
          <div className="flex items-center space-x-3 text-sm text-gray-400 font-medium">
            <User className="h-4 w-4" />
            <span>Angela L. (Administrator)</span>
          </div>
        </header>
        {renderContent()}
      </main>
    </div>
  );
}
