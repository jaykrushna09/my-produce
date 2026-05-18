"use client";

import React, { useState, useRef, useMemo, useEffect } from 'react';
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
  Search,
  FileText,
  Plus,
  Edit,
  FileCheck,
  ClipboardList
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
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { 
  collection, 
  doc, 
  setDoc,
  writeBatch, 
  serverTimestamp,
  query,
  orderBy,
  deleteDoc,
  addDoc
} from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, useUser, useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import * as XLSX from 'xlsx';

type ViewState = 'dashboard' | 'configuration' | 'customer-mapping' | 'material-mapping' | 'contracts' | 'contract-details';

export default function MyProduceDashboard() {
  const router = useRouter();
  const db = useFirestore();
  const auth = useAuth();
  const { user, loading: userLoading } = useUser();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [activeView, setActiveView] = useState<ViewState>('dashboard');
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Contract Modal State
  const [isNewContractOpen, setIsNewContractOpen] = useState(false);
  const [newContract, setNewContract] = useState({
    customerName: '',
    contractRef: '',
    notes: ''
  });

  // Protect the route
  useEffect(() => {
    if (!userLoading && !user) {
      router.push('/');
    }
  }, [user, userLoading, router]);

  const CUSTOMER_PATH = 'app_configuration/customer_mapping/customer_saving';
  const MATERIAL_PATH = 'app_configuration/material_mapping/material_saving';
  const CONTRACT_PATH = 'app_configuration/contracts/contract_saving';

  const customerMappingsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, CUSTOMER_PATH), orderBy('Customer', 'asc'));
  }, [db]);
  
  const materialMappingsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, MATERIAL_PATH), orderBy('SAPC_Code', 'asc'));
  }, [db]);

  const contractsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, CONTRACT_PATH), orderBy('receivedAt', 'desc'));
  }, [db]);

  const contractItemsQuery = useMemoFirebase(() => {
    if (!db || !selectedContractId) return null;
    return query(collection(db, `${CONTRACT_PATH}/${selectedContractId}/items`));
  }, [db, selectedContractId]);
  
  const { data: customerMappings, loading: customerLoading } = useCollection(customerMappingsQuery);
  const { data: materialMappings, loading: materialLoading } = useCollection(materialMappingsQuery);
  const { data: contracts, loading: contractsLoading } = useCollection(contractsQuery);
  const { data: contractItems, loading: itemsLoading } = useCollection(contractItemsQuery);

  const filteredData = useMemo(() => {
    if (activeView === 'material-mapping') {
      return materialMappings.filter(m => 
        String(m.SAPC_Code || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(m.SAPC_Desc || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(m.KindOfPack || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (activeView === 'customer-mapping') {
      return customerMappings.filter(m => 
        String(m.Customer || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(m.CustomerID || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (activeView === 'contracts') {
      return contracts.filter(c => 
        String(c.customerName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(c.contractRef || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    return [];
  }, [customerMappings, materialMappings, contracts, activeView, searchTerm]);

  const configOptions = [
    { id: 'contracts', title: "Contract Management", description: "Manage customer contracts and orders from emails.", icon: <FileText className="h-5 w-5" />, color: "bg-indigo-700" },
    { id: 'customer-mapping', title: "Customer Mapping", description: "Map customers using SAPC codes and IDs.", icon: <Users className="h-5 w-5" />, color: "bg-blue-600" },
    { id: 'material-mapping', title: "Material Mapping", description: "Associate materials with SAP codes and Pack Types.", icon: <Box className="h-5 w-5" />, color: "bg-emerald-600" },
    { id: 'brand-mapping', title: "Brand Mapping", description: "Configure brand labels.", icon: <Tag className="h-5 w-5" />, color: "bg-slate-600" },
    { id: 'profit-center-mapping', title: "Profit Center Mapping", description: "Assign production blocks.", icon: <DollarSign className="h-5 w-5" />, color: "bg-amber-600" },
    { id: 'pack-type', title: "Pack Type", description: "Define packaging specs.", icon: <Package className="h-5 w-5" />, color: "bg-orange-600" },
    { id: 'port-of-loading', title: "Port of Loading", description: "Configure origin ports.", icon: <Anchor className="h-5 w-5" />, color: "bg-sky-600" },
    { id: 'port-of-destination', title: "Port of Destination", description: "Manage destinations.", icon: <Navigation className="h-5 w-5" />, color: "bg-rose-600" }
  ];

  const handleSignOut = async () => {
    if (auth) {
      await signOut(auth);
      router.push('/');
    }
  };

  const handleCreateContract = async () => {
    if (!db || !newContract.customerName) {
      toast({ variant: "destructive", title: "Error", description: "Please select a customer." });
      return;
    }
    try {
      const contractId = `CTR-${Date.now()}`;
      await setDoc(doc(db, CONTRACT_PATH, contractId), {
        contractId,
        customerName: newContract.customerName,
        contractRef: newContract.contractRef || 'N/A',
        notes: newContract.notes,
        status: 'pending',
        receivedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setIsNewContractOpen(false);
      setNewContract({ customerName: '', contractRef: '', notes: '' });
      toast({ title: "Contract Created", description: "New contract has been added to the system." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !db) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = evt.target?.result;
        if (!data) throw new Error("Failed to read file.");

        const wb = XLSX.read(data, { type: 'array' });
        const isMaterial = activeView === 'material-mapping';
        const targetTabName = isMaterial ? 'Material Mapping' : 'Customer Mapping';
        const targetPath = isMaterial ? MATERIAL_PATH : CUSTOMER_PATH;
        
        const sheetName = wb.SheetNames.find(name => 
          name.toLowerCase().replace(/\s/g, '') === targetTabName.toLowerCase().replace(/\s/g, '')
        ) || wb.SheetNames[0];
        
        const ws = wb.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(ws) as any[];

        const batch = writeBatch(db);
        jsonData.forEach((row: any) => {
          // Robust header matching
          const sapcCode = row.SAPC_Code || row.Code || row['SAPC Code'] || row['SAPC_Code'];
          const kindOfPack = row.KindOfPack || row['Kind of Pack'] || row.PackType || row['Pack Type'];
          const sapcType = row.SAPC_Type || row['SAPC Type'] || row.Type;
          const sapcDesc = row.SAPC_Desc || row['SAPC Description'] || row.Description || row.Desc;
          const customerName = row.Customer || row['Customer Name'] || row.Name;
          const customerId = row.CustomerID || row['Customer ID'] || row.ID;

          const docId = isMaterial ? String(sapcCode || Math.random()) : String(customerId || customerName || Math.random());
          const docRef = doc(db, targetPath, docId);
          
          if (isMaterial) {
            batch.set(docRef, {
              SAPC_Code: String(sapcCode || 'N/A'),
              KindOfPack: String(kindOfPack || 'N/A'),
              SAPC_Type: String(sapcType || 'N/A'),
              SAPC_Desc: String(sapcDesc || 'N/A'),
              updatedAt: serverTimestamp()
            });
          } else {
            batch.set(docRef, {
              CustomerID: String(customerId || docId),
              Customer: String(customerName || 'N/A'),
              SAPC_Code: String(sapcCode || 'N/A'),
              SAPC_Desc: String(sapcDesc || 'N/A'),
              updatedAt: serverTimestamp()
            });
          }
        });
        await batch.commit();
        toast({ title: "Import Successful", description: `Uploaded ${jsonData.length} records to ${targetTabName}.` });
      } catch (err: any) {
        toast({ variant: "destructive", title: "Import Failed", description: err.message });
      } finally {
        setIsUploading(false);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const renderContractsView = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => setActiveView('configuration')} className="rounded-full"><ArrowLeft className="h-5 w-5" /></Button>
          <h2 className="text-2xl font-bold text-gray-900">Contract Management</h2>
        </div>
        <div className="flex items-center space-x-2">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input placeholder="Search contracts..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <Dialog open={isNewContractOpen} onOpenChange={setIsNewContractOpen}>
            <DialogTrigger asChild>
              <Button className="bg-anflocor-green hover:bg-anflocor-green/90 text-white"><Plus className="mr-2 h-4 w-4" /> New Contract</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Production Contract</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Customer Name</Label>
                  <Select 
                    onValueChange={(value) => setNewContract({...newContract, customerName: value})}
                    value={newContract.customerName}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a mapped customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customerMappings.length === 0 ? (
                        <div className="p-2 text-xs text-muted-foreground">No customers mapped. Please import customers first.</div>
                      ) : (
                        customerMappings.map((c: any) => (
                          <SelectItem key={c.id} value={c.Customer}>{c.Customer}</SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Customer Reference / Email Subject</Label>
                  <Input value={newContract.contractRef} onChange={(e) => setNewContract({...newContract, contractRef: e.target.value})} placeholder="e.g. Order #2024-001" />
                </div>
                <div className="space-y-2">
                  <Label>Contract Notes</Label>
                  <Textarea value={newContract.notes} onChange={(e) => setNewContract({...newContract, notes: e.target.value})} placeholder="Paste email content or additional notes here..." />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsNewContractOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateContract} className="bg-anflocor-green">Create Contract</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="border-gray-200 shadow-sm overflow-hidden bg-white">
        <Table>
          <TableHeader className="bg-gray-50">
            <TableRow>
              <TableHead className="font-bold">Date Received</TableHead>
              <TableHead className="font-bold">Customer</TableHead>
              <TableHead className="font-bold">Reference</TableHead>
              <TableHead className="font-bold">Status</TableHead>
              <TableHead className="text-right font-bold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contractsLoading ? (
              <TableRow><TableCell colSpan={5} className="h-48 text-center"><Loader2 className="h-10 w-10 animate-spin mx-auto text-anflocor-green opacity-40" /></TableCell></TableRow>
            ) : filteredData.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="h-48 text-center text-gray-400 font-medium">No contracts found. Create one to begin.</TableCell></TableRow>
            ) : filteredData.map((c: any) => (
              <TableRow key={c.id} className="hover:bg-gray-50/50 cursor-pointer" onClick={() => { setSelectedContractId(c.id); setActiveView('contract-details'); }}>
                <TableCell className="text-gray-600 text-sm">
                  {c.receivedAt?.toDate().toLocaleDateString() || 'Pending'}
                </TableCell>
                <TableCell className="font-bold text-gray-900">{c.customerName}</TableCell>
                <TableCell className="text-gray-500 text-sm">{c.contractRef}</TableCell>
                <TableCell>
                  <span className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                    c.status === 'active' ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                  )}>
                    {c.status}
                  </span>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); deleteDoc(doc(db!, CONTRACT_PATH, c.id)); }}><Trash2 className="h-4 w-4 text-gray-400 hover:text-red-500" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );

  const renderContractDetails = () => {
    const contract = contracts.find(c => c.id === selectedContractId);
    if (!contract) return null;

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" onClick={() => setActiveView('contracts')} className="rounded-full"><ArrowLeft className="h-5 w-5" /></Button>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{contract.customerName}</h2>
            <p className="text-sm text-gray-500">Contract Reference: {contract.contractRef}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-1 h-fit">
            <CardHeader><CardTitle className="text-lg">Contract Overview</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between items-center text-sm border-b pb-2">
                <span className="text-gray-500">Status</span>
                <span className="font-bold uppercase text-anflocor-green">{contract.status}</span>
              </div>
              <div className="flex justify-between items-center text-sm border-b pb-2">
                <span className="text-gray-500">Received</span>
                <span className="font-medium">{contract.receivedAt?.toDate().toLocaleString()}</span>
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-gray-500 uppercase tracking-wider">Internal Notes</Label>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-md whitespace-pre-wrap">{contract.notes || 'No notes provided.'}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
              <div>
                <CardTitle className="text-lg">Specification Line Items</CardTitle>
                <CardDescription>Manage production orders for this contract.</CardDescription>
              </div>
              <Button size="sm" className="bg-anflocor-green" onClick={() => {
                const materialCode = prompt("Enter Material Code:");
                if (materialCode) {
                  addDoc(collection(db!, `${CONTRACT_PATH}/${selectedContractId}/items`), {
                    materialCode,
                    quantity: 0,
                    specifications: 'Default specs...',
                    updatedAt: serverTimestamp()
                  });
                }
              }}><Plus className="h-4 w-4 mr-1" /> Add Item</Button>
            </CardHeader>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Material</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Specifications</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itemsLoading ? (
                  <TableRow><TableCell colSpan={4} className="h-32 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-anflocor-green" /></TableCell></TableRow>
                ) : contractItems.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="h-32 text-center text-gray-400">No items added to this contract yet.</TableCell></TableRow>
                ) : contractItems.map((item: any) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs font-bold">{item.materialCode}</TableCell>
                    <TableCell className="font-medium">{item.quantity}</TableCell>
                    <TableCell className="text-xs text-gray-500 italic max-w-xs truncate">{item.specifications}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon"><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteDoc(doc(db!, `${CONTRACT_PATH}/${selectedContractId}/items`, item.id))}><Trash2 className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </div>
      </div>
    );
  };

  const renderContent = () => {
    if (activeView === 'dashboard') {
      return (
        <section className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="flex items-center space-x-2 mb-6">
            <div className="h-8 w-1 bg-anflocor-green rounded-full" />
            <h2 className="text-xl font-bold text-gray-800">Production Overview</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="bg-white border-l-4 border-l-indigo-700">
              <CardHeader className="pb-2"><CardDescription className="text-xs font-bold uppercase">Pending Contracts</CardDescription></CardHeader>
              <CardContent><p className="text-3xl font-black text-gray-900">{contracts.filter(c => c.status === 'pending').length}</p></CardContent>
            </Card>
            <Card className="bg-white border-l-4 border-l-emerald-600">
              <CardHeader className="pb-2"><CardDescription className="text-xs font-bold uppercase">Active Mappings</CardDescription></CardHeader>
              <CardContent><p className="text-3xl font-black text-gray-900">{materialMappings.length + customerMappings.length}</p></CardContent>
            </Card>
            <Card className="bg-white border-l-4 border-l-amber-600">
              <CardHeader className="pb-2"><CardDescription className="text-xs font-bold uppercase">Latest Activity</CardDescription></CardHeader>
              <CardContent><p className="text-xs text-gray-500 font-medium">New contract from {contracts[0]?.customerName || 'N/A'}</p></CardContent>
            </Card>
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
              <Card key={option.id} onClick={() => setActiveView(option.id as any)} className="group hover:ring-2 hover:ring-anflocor-green/20 transition-all cursor-pointer">
                <CardHeader className="p-5">
                  <div className={`${option.color} text-white p-2.5 rounded-lg w-fit shadow-md group-hover:scale-110 transition-transform`}>{option.icon}</div>
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

    if (activeView === 'contracts') return renderContractsView();
    if (activeView === 'contract-details') return renderContractDetails();

    const isMaterialView = activeView === 'material-mapping';
    const loading = isMaterialView ? materialLoading : customerLoading;

    return (
      <section className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" onClick={() => setActiveView('configuration')} className="rounded-full hover:bg-gray-100 transition-colors"><ArrowLeft className="h-5 w-5" /></Button>
            <h2 className="text-2xl font-bold text-gray-900">{isMaterialView ? 'Material Mapping' : 'Customer Mapping'}</h2>
          </div>
          <div className="flex items-center space-x-2">
            <div className="relative w-48 lg:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder={`Search ${isMaterialView ? 'materials' : 'customers'}...`} className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
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
                {isMaterialView ? (
                  <>
                    <TableHead className="font-bold text-gray-600">SAPC Code</TableHead>
                    <TableHead className="font-bold text-gray-600">Kind of Pack</TableHead>
                    <TableHead className="font-bold text-gray-600">SAPC Type</TableHead>
                    <TableHead className="font-bold text-gray-600">SAPC Description</TableHead>
                  </>
                ) : (
                  <>
                    <TableHead className="font-bold text-gray-600">Customer ID</TableHead>
                    <TableHead className="font-bold text-gray-600">Customer</TableHead>
                    <TableHead className="font-bold text-gray-600">SAPC Code</TableHead>
                    <TableHead className="font-bold text-gray-600">SAPC Description</TableHead>
                  </>
                )}
                <TableHead className="text-right font-bold text-gray-600">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={5} className="h-48 text-center"><Loader2 className="h-10 w-10 animate-spin mx-auto text-anflocor-green opacity-40" /></TableCell></TableRow>
              ) : filteredData.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="h-48 text-center text-gray-400 font-medium">No records found.</TableCell></TableRow>
              ) : filteredData.map((m: any) => (
                <TableRow key={m.id} className="hover:bg-gray-50/50">
                  {isMaterialView ? (
                    <>
                      <TableCell className="font-mono text-xs font-bold text-anflocor-green">{m.SAPC_Code}</TableCell>
                      <TableCell className="text-xs text-gray-600 font-medium">{m.KindOfPack}</TableCell>
                      <TableCell><span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-50 text-emerald-700">{m.SAPC_Type}</span></TableCell>
                      <TableCell className="text-gray-500 text-sm">{m.SAPC_Desc}</TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell className="font-mono text-xs font-bold text-anflocor-green">{m.CustomerID}</TableCell>
                      <TableCell className="font-medium">{m.Customer}</TableCell>
                      <TableCell><span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-50 text-blue-700">{m.SAPC_Code}</span></TableCell>
                      <TableCell className="text-gray-500 text-sm">{m.SAPC_Desc}</TableCell>
                    </>
                  )}
                  <TableCell className="text-right"><Button variant="ghost" size="icon" onClick={() => deleteDoc(doc(db!, isMaterialView ? MATERIAL_PATH : CUSTOMER_PATH, m.id))} className="text-gray-400 hover:text-red-500"><Trash2 className="h-4 w-4" /></Button></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </section>
    );
  };

  const currentUserLabel = user?.displayName || user?.email?.split('@')[0] || 'User';

  return (
    <div className="flex h-screen bg-gray-50/50">
      <aside className="w-64 bg-anflocor-green text-white flex flex-col shrink-0 shadow-xl">
        <div className="p-6 flex items-center space-x-3 border-b border-white/10">
          <div className="bg-white/10 p-2 rounded-lg"><Leaf className="h-6 w-6" /></div>
          <span className="text-xl font-bold tracking-tighter">myProduce</span>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <Button variant="ghost" onClick={() => setActiveView('dashboard')} className={cn("w-full justify-start text-white hover:bg-white/10 transition-all", activeView === 'dashboard' && "bg-white/10 shadow-inner")}><LayoutDashboard className="mr-3 h-5 w-5" />Dashboard</Button>
          <Button variant="ghost" onClick={() => setActiveView('contracts')} className={cn("w-full justify-start text-white hover:bg-white/10 transition-all", (activeView === 'contracts' || activeView === 'contract-details') && "bg-white/10 shadow-inner")}><FileCheck className="mr-3 h-5 w-5" />Contracts</Button>
          <Button variant="ghost" onClick={() => setActiveView('configuration')} className={cn("w-full justify-start text-white hover:bg-white/10 transition-all", activeView === 'configuration' && "bg-white/10 shadow-inner")}><Settings className="mr-3 h-5 w-5" />Configuration</Button>
        </nav>
        <div className="p-4 border-t border-white/10">
          <Button onClick={handleSignOut} variant="ghost" className="w-full justify-start text-white/70 hover:text-red-400 transition-colors"><LogOut className="mr-3 h-5 w-5" />Sign Out</Button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-8">
        <header className="mb-8 flex justify-between items-end border-b pb-6">
          <div>
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
              {activeView === 'dashboard' ? 'Dashboard' : 
               activeView === 'configuration' ? 'System Configuration' : 
               activeView === 'contracts' ? 'Contract Management' :
               activeView === 'contract-details' ? 'Contract Details' :
               activeView === 'material-mapping' ? 'Material Mapping' : 'Customer Mapping'}
            </h1>
            <p className="text-gray-500 font-semibold mt-1">TADECO Agricultural Production Portal</p>
          </div>
          <div className="flex items-center space-x-3 text-sm text-gray-400 font-medium">
            <User className="h-4 w-4" />
            <span>{currentUserLabel} (Administrator)</span>
          </div>
        </header>
        {renderContent()}
      </main>
    </div>
  );
}
