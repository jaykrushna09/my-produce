
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
  ClipboardList,
  Sparkles,
  Paperclip,
  CalendarDays,
  MapPin,
  Ship,
  FileSignature,
  Mail,
  Scale
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
import { Badge } from '@/components/ui/badge';
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
  addDoc,
  updateDoc
} from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, useUser, useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import * as XLSX from 'xlsx';
import { extractContractData } from '@/ai/flows/extract-contract-flow';

type ViewState = 'dashboard' | 'configuration' | 'customer-mapping' | 'material-mapping' | 'port-of-loading' | 'port-of-destination' | 'contracts' | 'contract-details';

export default function MyProduceDashboard() {
  const router = useRouter();
  const db = useFirestore();
  const auth = useAuth();
  const { user, loading: userLoading } = useUser();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const attachmentRef = useRef<HTMLInputElement>(null);
  
  const [activeView, setActiveView] = useState<ViewState>('dashboard');
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Contract Modal State
  const [isNewContractOpen, setIsNewContractOpen] = useState(false);
  const [newContract, setNewContract] = useState({
    customerName: '',
    contractRef: '',
    senderEmail: '',
    weekNumber: '',
    farm: 'TADECO',
    pol: '',
    totalVolume: '',
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
  const POL_PATH = 'app_configuration/pol_mapping/pol_saving';
  const POD_PATH = 'app_configuration/pod_mapping/pod_saving';
  const CONTRACT_PATH = 'app_data/contracts/contract_saving';

  const customerMappingsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, CUSTOMER_PATH), orderBy('Customer', 'asc'));
  }, [db]);
  
  const materialMappingsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, MATERIAL_PATH), orderBy('SAPC_Code', 'asc'));
  }, [db]);

  const polMappingsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, POL_PATH), orderBy('portName', 'asc'));
  }, [db]);

  const podMappingsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, POD_PATH), orderBy('portName', 'asc'));
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
  const { data: polMappings, loading: polLoading } = useCollection(polMappingsQuery);
  const { data: podMappings, loading: podLoading } = useCollection(podMappingsQuery);
  const { data: contracts, loading: contractsLoading } = useCollection(contractsQuery);
  const { data: contractItems, loading: itemsLoading } = useCollection(contractItemsQuery);

  const filteredData = useMemo(() => {
    const term = searchTerm.toLowerCase();
    if (activeView === 'material-mapping') {
      return materialMappings.filter(m => 
        String(m.SAPC_Code || '').toLowerCase().includes(term) ||
        String(m.SAPC_Desc || '').toLowerCase().includes(term) ||
        String(m.KindOfPack || '').toLowerCase().includes(term)
      );
    }
    if (activeView === 'customer-mapping') {
      return customerMappings.filter(m => 
        String(m.Customer || '').toLowerCase().includes(term) ||
        String(m.CustomerID || '').toLowerCase().includes(term)
      );
    }
    if (activeView === 'port-of-loading') {
      return polMappings.filter(m => String(m.portName || '').toLowerCase().includes(term));
    }
    if (activeView === 'port-of-destination') {
      return podMappings.filter(m => String(m.portName || '').toLowerCase().includes(term));
    }
    if (activeView === 'contracts') {
      return contracts.filter(c => 
        String(c.customerName || '').toLowerCase().includes(term) ||
        String(c.contractRef || '').toLowerCase().includes(term) ||
        String(c.weekNumber || '').toLowerCase().includes(term)
      );
    }
    return [];
  }, [customerMappings, materialMappings, polMappings, podMappings, contracts, activeView, searchTerm]);

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
        ...newContract,
        status: 'pending',
        receivedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setIsNewContractOpen(false);
      setNewContract({ customerName: '', contractRef: '', senderEmail: '', weekNumber: '', farm: 'TADECO', pol: '', totalVolume: '', notes: '' });
      toast({ title: "Contract Created", description: "New contract has been added to the system." });
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  const handleAiExtraction = async () => {
    if (!newContract.notes) {
      toast({ variant: "destructive", title: "Input Required", description: "No context provided for extraction." });
      return;
    }

    setIsExtracting(true);
    try {
      const result = await extractContractData({ text: newContract.notes });
      if (result.header) {
        setNewContract(prev => ({
          ...prev,
          weekNumber: result.header.weekNumber || prev.weekNumber,
          farm: result.header.farm || prev.farm,
          pol: result.header.pol || prev.pol,
          customerName: result.header.customerName || prev.customerName,
          senderEmail: result.header.senderEmail || prev.senderEmail,
          contractRef: result.header.subject || prev.contractRef,
          totalVolume: result.header.totalVolume || prev.totalVolume
        }));
        toast({ title: "AI Extraction Successful", description: "Contract details have been pre-filled." });
      }
    } catch (err: any) {
      toast({ variant: "destructive", title: "AI Failed", description: "Could not extract details." });
    } finally {
      setIsExtracting(false);
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
        
        let targetTabName = "";
        let targetPath = "";
        
        if (activeView === 'material-mapping') {
          targetTabName = "Material Mapping";
          targetPath = MATERIAL_PATH;
        } else if (activeView === 'customer-mapping') {
          targetTabName = "Customer Mapping";
          targetPath = CUSTOMER_PATH;
        } else if (activeView === 'port-of-loading' || activeView === 'port-of-destination') {
          targetTabName = "Pack Type";
          targetPath = activeView === 'port-of-loading' ? POL_PATH : POD_PATH;
        }

        const sheetName = wb.SheetNames.find(name => 
          name.toLowerCase().replace(/\s/g, '') === targetTabName.toLowerCase().replace(/\s/g, '')
        );

        if (!sheetName) {
          throw new Error(`Sheet "${targetTabName}" not found in Excel file.`);
        }
        
        const ws = wb.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(ws) as any[];
        
        if (jsonData.length === 0) {
          throw new Error("No data found in the selected sheet.");
        }

        const batch = writeBatch(db);
        let count = 0;

        jsonData.forEach((row: any) => {
          const findKey = (keys: string[]) => {
            const rowKeys = Object.keys(row);
            for (const k of keys) {
              const match = rowKeys.find(rk => rk.toLowerCase().replace(/[\s_]/g, '') === k.toLowerCase().replace(/[\s_]/g, ''));
              if (match) return row[match];
            }
            return null;
          };

          if (activeView === 'material-mapping') {
            const sapcCode = findKey(['SAPC_Code', 'SAPC Code', 'Code']);
            if (sapcCode) {
              batch.set(doc(db, targetPath, String(sapcCode).trim()), {
                SAPC_Code: String(sapcCode).trim(),
                KindOfPack: String(findKey(['KindOfPack', 'Kind of Pack', 'Pack']) || 'N/A'),
                SAPC_Type: String(findKey(['SAPC_Type', 'SAPC Type', 'Type']) || 'N/A'),
                SAPC_Desc: String(findKey(['SAPC_Desc', 'SAPC Description', 'Description']) || 'N/A'),
                updatedAt: serverTimestamp()
              });
              count++;
            }
          } else if (activeView === 'customer-mapping') {
            const customerId = findKey(['CustomerID', 'Customer ID', 'ID']);
            const customerName = findKey(['Customer', 'Customer Name', 'Name']);
            if (customerId || customerName) {
              const docId = String(customerId || customerName).trim();
              batch.set(doc(db, targetPath, docId), {
                CustomerID: String(customerId || docId).trim(),
                Customer: String(customerName || 'N/A').trim(),
                SAPC_Code: String(findKey(['SAPC_Code', 'SAPC Code', 'Code']) || 'N/A'),
                SAPC_Desc: String(findKey(['SAPC_Desc', 'SAPC Description', 'Description']) || 'N/A'),
                updatedAt: serverTimestamp()
              });
              count++;
            }
          } else if (activeView === 'port-of-loading') {
            const pol = findKey(['PORT_OF_LOADING', 'PORT OF LOADING', 'POL']);
            if (pol) {
              const portName = String(pol).trim();
              if (portName) {
                batch.set(doc(db, targetPath, portName), {
                  portName: portName,
                  updatedAt: serverTimestamp()
                });
                count++;
              }
            }
          } else if (activeView === 'port-of-destination') {
            const pod = findKey(['PORT_OF_DESTINATION', 'PORT OF DESTINATION', 'POD']);
            if (pod) {
              const portName = String(pod).trim();
              if (portName) {
                batch.set(doc(db, targetPath, portName), {
                  portName: portName,
                  updatedAt: serverTimestamp()
                });
                count++;
              }
            }
          }
        });

        if (count > 0) {
          await batch.commit();
          toast({ title: "Import Successful", description: `Uploaded ${count} unique records to ${activeView}.` });
        } else {
          toast({ variant: "destructive", title: "Import Failed", description: "No valid records were identified. Check your column headers." });
        }
      } catch (err: any) {
        toast({ variant: "destructive", title: "Import Error", description: err.message });
      } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
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
            <DialogContent className="max-w-3xl overflow-y-auto max-h-[90vh]">
              <DialogHeader>
                <DialogTitle>Create New Production Contract</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4 py-4">
                <div className="space-y-2">
                  <Label>Customer Name</Label>
                  <Select 
                    onValueChange={(value) => setNewContract({...newContract, customerName: value})}
                    value={newContract.customerName}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Customer" />
                    </SelectTrigger>
                    <SelectContent>
                      {customerMappings.map((c: any) => (
                        <SelectItem key={c.id} value={c.Customer}>{c.Customer}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Week Number</Label>
                  <Input value={newContract.weekNumber} onChange={(e) => setNewContract({...newContract, weekNumber: e.target.value})} placeholder="e.g. WK16" />
                </div>
                
                <div className="space-y-2">
                  <Label>Email Sender</Label>
                  <Input value={newContract.senderEmail} onChange={(e) => setNewContract({...newContract, senderEmail: e.target.value})} placeholder="akwalser@goodfarmer.com" />
                </div>
                <div className="space-y-2">
                  <Label>Contract/Subject Reference</Label>
                  <Input value={newContract.contractRef} onChange={(e) => setNewContract({...newContract, contractRef: e.target.value})} placeholder="Loading advice for week 16" />
                </div>

                <div className="space-y-2">
                  <Label>Farm</Label>
                  <Select 
                    onValueChange={(value) => setNewContract({...newContract, farm: value})}
                    value={newContract.farm}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Farm" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="TADECO">TADECO</SelectItem>
                      <SelectItem value="ANFLOCOR">ANFLOCOR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>POL (Port of Loading)</Label>
                  <Select 
                    onValueChange={(value) => setNewContract({...newContract, pol: value})}
                    value={newContract.pol}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select POL" />
                    </SelectTrigger>
                    <SelectContent>
                      {polMappings.map((p: any) => (
                        <SelectItem key={p.id} value={p.portName}>{p.portName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Total Volume (Vans/Boxes)</Label>
                  <Input value={newContract.totalVolume} onChange={(e) => setNewContract({...newContract, totalVolume: e.target.value})} placeholder="92vans ARH/CP18" />
                </div>

                <div className="col-span-2 space-y-2">
                  <Label>Attach Original PDF</Label>
                  <div className="flex items-center gap-2 border-2 border-dashed rounded-lg p-4 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer" onClick={() => attachmentRef.current?.click()}>
                    <Paperclip className="h-4 w-4 text-gray-400" />
                    <span className="text-sm text-gray-500 font-medium">Click to upload PDF Advice</span>
                    <input type="file" className="hidden" ref={attachmentRef} accept=".pdf" />
                  </div>
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
              <TableHead className="font-bold">WK NO</TableHead>
              <TableHead className="font-bold">Customer</TableHead>
              <TableHead className="font-bold">Sender / Reference</TableHead>
              <TableHead className="font-bold">Volume</TableHead>
              <TableHead className="font-bold">Farm / POL</TableHead>
              <TableHead className="font-bold">Status</TableHead>
              <TableHead className="text-right font-bold">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contractsLoading ? (
              <TableRow><TableCell colSpan={7} className="h-48 text-center"><Loader2 className="h-10 w-10 animate-spin mx-auto text-anflocor-green opacity-40" /></TableCell></TableRow>
            ) : filteredData.length === 0 ? (
              <TableRow><TableCell colSpan={7} className="h-48 text-center text-gray-400 font-medium">No contracts found.</TableCell></TableRow>
            ) : filteredData.map((c: any) => (
              <TableRow key={c.id} className="hover:bg-gray-50/50 cursor-pointer" onClick={() => { setSelectedContractId(c.id); setActiveView('contract-details'); }}>
                <TableCell><Badge variant="outline" className="font-bold text-anflocor-green">{c.weekNumber || 'N/A'}</Badge></TableCell>
                <TableCell className="font-bold text-gray-900">{c.customerName}</TableCell>
                <TableCell>
                  <div className="text-xs font-medium text-gray-900 flex items-center gap-1"><Mail className="h-3 w-3" /> {c.senderEmail}</div>
                  <div className="text-[10px] text-gray-400 line-clamp-1">{c.contractRef}</div>
                </TableCell>
                <TableCell className="text-xs font-bold text-indigo-700">{c.totalVolume || '-'}</TableCell>
                <TableCell className="text-xs font-medium text-gray-600">
                  <div className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {c.farm}</div>
                  <div className="flex items-center gap-1 text-gray-400"><Ship className="h-3 w-3" /> {c.pol}</div>
                </TableCell>
                <TableCell>
                  <span className={cn(
                    "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                    c.status === 'active' ? "bg-green-100 text-green-700" : "bg-yellow-100 text-yellow-700"
                  )}>
                    {c.status}
                  </span>
                </TableCell>
                <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                  <Button variant="ghost" size="icon" onClick={() => deleteDoc(doc(db!, CONTRACT_PATH, c.id))}><Trash2 className="h-4 w-4 text-gray-400 hover:text-red-500" /></Button>
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

    const handleBulkAiFill = async () => {
      if (!contract.notes) {
        toast({ variant: "destructive", title: "Error", description: "No context found for this contract to parse items." });
        return;
      }
      setIsExtracting(true);
      try {
        const result = await extractContractData({ text: contract.notes });
        if (result.items && result.items.length > 0) {
          const batch = writeBatch(db!);
          result.items.forEach(item => {
            const itemRef = doc(collection(db!, `${CONTRACT_PATH}/${selectedContractId}/items`));
            batch.set(itemRef, {
              ...item,
              updatedAt: serverTimestamp()
            });
          });
          await batch.commit();
          toast({ title: "Items Extracted", description: `Successfully added ${result.items.length} line items from text.` });
        }
      } catch (err) {
        toast({ variant: "destructive", title: "AI Error", description: "Could not parse items from text." });
      } finally {
        setIsExtracting(false);
      }
    };

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" onClick={() => setActiveView('contracts')} className="rounded-full"><ArrowLeft className="h-5 w-5" /></Button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold text-gray-900">{contract.customerName}</h2>
                <Badge className="bg-anflocor-green">{contract.weekNumber}</Badge>
              </div>
              <p className="text-sm text-gray-500">REF: {contract.contractRef} | VOL: {contract.totalVolume}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handleBulkAiFill} disabled={isExtracting} className="border-anflocor-green text-anflocor-green">
              {isExtracting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
              Extract Items
            </Button>
            <Button className="bg-anflocor-green"><FileSignature className="h-4 w-4 mr-2" /> Finalise Advice</Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Card className="lg:col-span-1 h-fit bg-gray-50/50">
            <CardHeader className="pb-2"><CardTitle className="text-sm uppercase tracking-wider text-gray-400">Header Info</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label className="text-[10px] text-gray-400 uppercase">SENDER</Label>
                <p className="text-xs font-bold text-gray-700 flex items-center gap-1"><Mail className="h-3 w-3" /> {contract.senderEmail || 'Unknown'}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-gray-400 uppercase">TOTAL VOLUME</Label>
                <p className="text-xs font-bold text-indigo-700 flex items-center gap-1"><Scale className="h-3 w-3" /> {contract.totalVolume || 'Not Specified'}</p>
              </div>
              <div className="space-y-1">
                <Label className="text-[10px] text-gray-400 uppercase">FARM / POL</Label>
                <p className="text-xs font-bold text-gray-700">{contract.farm} / {contract.pol}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="lg:col-span-3">
            <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
              <div>
                <CardTitle className="text-lg">Specification Line Items</CardTitle>
                <CardDescription>Detailed breakdown extracted from the advice email.</CardDescription>
              </div>
              <Button size="sm" variant="outline" onClick={() => {
                 addDoc(collection(db!, `${CONTRACT_PATH}/${selectedContractId}/items`), {
                  pod: 'NEW PORT',
                  total: 0,
                  specs: 'A456',
                  limitation: '',
                  palletized: 'Breakbulk',
                  shippingLines: '',
                  etd: '',
                  customerContractNumber: '',
                  updatedAt: serverTimestamp()
                });
              }}><Plus className="h-4 w-4 mr-1" /> Add Row</Button>
            </CardHeader>
            <Table>
              <TableHeader className="bg-gray-50/50">
                <TableRow>
                  <TableHead className="text-[10px] font-bold">POD</TableHead>
                  <TableHead className="text-[10px] font-bold">TOTAL</TableHead>
                  <TableHead className="text-[10px] font-bold">SPECS</TableHead>
                  <TableHead className="text-[10px] font-bold">LIMITATION</TableHead>
                  <TableHead className="text-[10px] font-bold">PALLETISED</TableHead>
                  <TableHead className="text-[10px] font-bold">SHIPPING LINE</TableHead>
                  <TableHead className="text-[10px] font-bold">ETD</TableHead>
                  <TableHead className="text-[10px] font-bold">CONTRACT #</TableHead>
                  <TableHead className="text-right text-[10px] font-bold">ACTIONS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {itemsLoading ? (
                  <TableRow><TableCell colSpan={9} className="h-32 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-anflocor-green" /></TableCell></TableRow>
                ) : contractItems.length === 0 ? (
                  <TableRow><TableCell colSpan={9} className="h-32 text-center text-gray-400">No items. Use "Extract Items" to auto-parse the context.</TableCell></TableRow>
                ) : contractItems.map((item: any) => (
                  <TableRow key={item.id} className="text-xs">
                    <TableCell className="font-bold text-indigo-700">{item.pod}</TableCell>
                    <TableCell className="font-mono text-center">{item.total}</TableCell>
                    <TableCell className="bg-gray-50/50 font-medium">{item.specs}</TableCell>
                    <TableCell className="max-w-[150px] truncate italic text-gray-500" title={item.limitation}>{item.limitation}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[9px] uppercase">{item.palletized}</Badge></TableCell>
                    <TableCell className="font-bold">{item.shippingLines}</TableCell>
                    <TableCell className="text-orange-600 font-medium">{item.etd}</TableCell>
                    <TableCell className="font-mono text-[9px] text-gray-400 max-w-[120px] truncate">{item.customerContractNumber}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteDoc(doc(db!, `${CONTRACT_PATH}/${selectedContractId}/items`, item.id))}><Trash2 className="h-3 w-3" /></Button>
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

  const configOptions = [
    { id: 'contracts', title: "Contract Management", description: "Manage customer contracts and loading advice from emails.", icon: <FileText className="h-5 w-5" />, color: "bg-indigo-700" },
    { id: 'customer-mapping', title: "Customer Mapping", description: "Map customers using SAPC codes and IDs.", icon: <Users className="h-5 w-5" />, color: "bg-blue-600" },
    { id: 'material-mapping', title: "Material Mapping", description: "Associate materials with SAP codes and Pack Types.", icon: <Box className="h-5 w-5" />, color: "bg-emerald-600" },
    { id: 'port-of-loading', title: "Port of Loading", description: "Configure origin ports.", icon: <Anchor className="h-5 w-5" />, color: "bg-sky-600" },
    { id: 'port-of-destination', title: "Port of Destination", description: "Manage destinations.", icon: <Navigation className="h-5 w-5" />, color: "bg-rose-600" },
    { id: 'brand-mapping', title: "Brand Mapping", description: "Configure brand labels.", icon: <Tag className="h-5 w-5" />, color: "bg-slate-600" },
    { id: 'profit-center-mapping', title: "Profit Center Mapping", description: "Assign production blocks.", icon: <DollarSign className="h-5 w-5" />, color: "bg-amber-600" },
    { id: 'pack-type', title: "Pack Type", description: "Define packaging specs.", icon: <Package className="h-5 w-5" />, color: "bg-orange-600" }
  ];

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
    const isPolView = activeView === 'port-of-loading';
    const isPodView = activeView === 'port-of-destination';
    
    let loading = false;
    if (isMaterialView) loading = materialLoading;
    else if (isPolView) loading = polLoading;
    else if (isPodView) loading = podLoading;
    else loading = customerLoading;

    return (
      <section className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" onClick={() => setActiveView('configuration')} className="rounded-full hover:bg-gray-100 transition-colors"><ArrowLeft className="h-5 w-5" /></Button>
            <h2 className="text-2xl font-bold text-gray-900">
              {isMaterialView ? 'Material Mapping' : 
               isPolView ? 'Port of Loading' : 
               isPodView ? 'Port of Destination' : 'Customer Mapping'}
            </h2>
          </div>
          <div className="flex items-center space-x-2">
            <div className="relative w-48 lg:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input placeholder="Search records..." className="pl-10" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
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
                ) : (isPolView || isPodView) ? (
                  <>
                    <TableHead className="font-bold text-gray-600">Port Name</TableHead>
                    <TableHead className="font-bold text-gray-600">Last Updated</TableHead>
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
                  ) : (isPolView || isPodView) ? (
                    <>
                      <TableCell className="font-bold text-gray-900">{m.portName}</TableCell>
                      <TableCell className="text-gray-400 text-xs">{m.updatedAt?.toDate()?.toLocaleString() || 'N/A'}</TableCell>
                    </>
                  ) : (
                    <>
                      <TableCell className="font-mono text-xs font-bold text-anflocor-green">{m.CustomerID}</TableCell>
                      <TableCell className="font-medium">{m.Customer}</TableCell>
                      <TableCell><span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-50 text-blue-700">{m.SAPC_Code}</span></TableCell>
                      <TableCell className="text-gray-500 text-sm">{m.SAPC_Desc}</TableCell>
                    </>
                  )}
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => deleteDoc(doc(db!, 
                      isMaterialView ? MATERIAL_PATH : 
                      isPolView ? POL_PATH : 
                      isPodView ? POD_PATH : CUSTOMER_PATH, m.id))} className="text-gray-400 hover:text-red-500">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
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
               activeView === 'port-of-loading' ? 'Port of Loading' :
               activeView === 'port-of-destination' ? 'Port of Destination' :
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
