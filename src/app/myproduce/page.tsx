
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
  Anchor,
  Navigation,
  Upload,
  ArrowLeft,
  Loader2,
  Trash2,
  Search,
  FileText,
  Plus,
  FileCheck,
  Sparkles,
  Paperclip,
  MapPin,
  Ship,
  FileSignature,
  Mail,
  Check,
  Calendar,
  Save,
  Edit2,
  CheckSquare,
  Square,
  MoreVertical,
  X,
  Split,
  Copy,
  Printer,
  Download,
  FileSpreadsheet,
  RefreshCcw,
  ChevronDown,
  ChevronLeft,
  Bell,
  HelpCircle,
  Filter,
  Info,
  Scissors
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
  TableRow,
  TableFooter
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogDescription
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
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
  updateDoc,
  getDoc
} from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, useUser, useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import * as XLSX from 'xlsx';
import { format, setISOWeek, startOfISOWeek, endOfISOWeek } from 'date-fns';

type ViewState = 'dashboard' | 'configuration' | 'customer-mapping' | 'material-mapping' | 'port-of-loading' | 'port-of-destination' | 'loading-advice' | 'contract-details' | 'cutting-order' | 'edit-cutting-orders';

interface LARow {
  id: string;
  farm: string;
  pol: string;
  pod: string;
  shippingLine: string;
  cutOffDate: string;
  etd: string;
  totalVans: number;
  skuCode: string;
  palletizedType: 'Palletized' | 'Non Palletized';
}

interface CORow {
  id: string;
  ps: string;
  shippingLine: string;
  bookingNo: string;
  containerNo: string;
  atwStatus: 'PENDING' | 'READY' | 'LOADED';
  pod: string;
  cutOffDate: string;
  etd: string;
  sku: string;
  palletization: string;
}

export default function MyProduceDashboard() {
  const router = useRouter();
  const db = useFirestore();
  const auth = useAuth();
  const { user, loading: userLoading } = useUser();
  const { toast } = useToast();
  
  const [activeView, setActiveView] = useState<ViewState>('dashboard');
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [weekFilter, setWeekFilter] = useState<string>('all');
  const [customerFilter, setCustomerFilter] = useState<string>('all');
  
  // New LA Form State
  const [isNewLAOpen, setIsNewLAOpen] = useState(false);
  const [newLAHeader, setNewLAHeader] = useState({
    customerName: '',
    weekNumber: ''
  });
  const [laRows, setLaRows] = useState<LARow[]>([{
    id: Math.random().toString(36).substr(2, 9),
    farm: 'TADECO',
    pol: 'DAVAO',
    pod: '',
    shippingLine: '',
    cutOffDate: '',
    etd: '',
    totalVans: 0,
    skuCode: '',
    palletizedType: 'Palletized'
  }]);

  // Cutting Order Rows State
  const [coRows, setCoRows] = useState<CORow[]>([]);

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
  
  const { data: customerMappings } = useCollection(customerMappingsQuery);
  const { data: materialMappings } = useCollection(materialMappingsQuery);
  const { data: polMappings } = useCollection(polMappingsQuery);
  const { data: podMappings } = useCollection(podMappingsQuery);
  const { data: contracts, loading: contractsLoading } = useCollection(contractsQuery);
  const { data: contractItems } = useCollection(contractItemsQuery);

  const weekOptions = useMemo(() => {
    const options = [];
    const currentYear = new Date().getFullYear();
    for (let i = 1; i <= 52; i++) {
      options.push(`WK ${i} - ${currentYear}`);
    }
    return options;
  }, []);

  // New LA Helpers
  const addLARow = () => {
    setLaRows([...laRows, {
      id: Math.random().toString(36).substr(2, 9),
      farm: 'TADECO',
      pol: 'DAVAO',
      pod: '',
      shippingLine: '',
      cutOffDate: '',
      etd: '',
      totalVans: 0,
      skuCode: '',
      palletizedType: 'Palletized'
    }]);
  };

  const updateLARow = (id: string, updates: Partial<LARow>) => {
    setLaRows(laRows.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const removeLARow = (id: string) => {
    if (laRows.length > 1) {
      setLaRows(laRows.filter(r => r.id !== id));
    }
  };

  const handleSubmitBatch = async () => {
    if (!db || !newLAHeader.customerName || !newLAHeader.weekNumber) {
      toast({ variant: "destructive", title: "Error", description: "Please select customer and week number." });
      return;
    }

    try {
      const batch = writeBatch(db);
      const contractId = `LA-${Date.now()}`;
      const contractRef = doc(db, CONTRACT_PATH, contractId);

      const totalVans = laRows.reduce((acc, curr) => acc + (curr.totalVans || 0), 0);
      const firstRow = laRows[0];

      batch.set(contractRef, {
        contractId,
        customerName: newLAHeader.customerName,
        weekNumber: newLAHeader.weekNumber,
        totalVans,
        farm: firstRow.farm,
        pol: firstRow.pol,
        pod: firstRow.pod,
        shippingLine: firstRow.shippingLine,
        cutOffDate: firstRow.cutOffDate,
        etd: firstRow.etd,
        skuSummary: firstRow.skuCode,
        palletizedType: firstRow.palletizedType,
        status: 'pending',
        receivedAt: serverTimestamp()
      });

      laRows.forEach(row => {
        const itemRef = doc(db, `${CONTRACT_PATH}/${contractId}/items`, row.id);
        batch.set(itemRef, {
          itemId: row.id,
          farm: row.farm,
          pol: row.pol,
          pod: row.pod,
          shippingLines: row.shippingLine,
          cutOffDate: row.cutOffDate,
          etd: row.etd,
          total: row.totalVans,
          specs: row.skuCode,
          palletized: row.palletizedType,
          atwStatus: 'PENDING',
          updatedAt: serverTimestamp()
        });
      });

      await batch.commit();
      toast({ title: "Success", description: "Loading Advice batch created successfully." });
      setIsNewLAOpen(false);
      setLaRows([{
        id: Math.random().toString(36).substr(2, 9),
        farm: 'TADECO',
        pol: 'DAVAO',
        pod: '',
        shippingLine: '',
        cutOffDate: '',
        etd: '',
        totalVans: 0,
        skuCode: '',
        palletizedType: 'Palletized'
      }]);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Submission Error", description: err.message });
    }
  };

  // Initialize CO Rows when entering edit mode
  useEffect(() => {
    if (activeView === 'edit-cutting-orders' && contractItems.length > 0) {
      setCoRows(contractItems.map((item: any) => ({
        id: item.id || Math.random().toString(36).substr(2, 9),
        ps: item.ps || 'PS',
        shippingLine: item.shippingLines || '',
        bookingNo: item.bookingNumber || '',
        containerNo: item.containerNo || '',
        atwStatus: item.atwStatus || 'PENDING',
        pod: item.pod || '',
        cutOffDate: item.cutOffDate || '',
        etd: item.etd || '',
        sku: item.specs || '',
        palletization: item.palletized || 'Palletized'
      })));
    }
  }, [activeView, contractItems]);

  const filteredData = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return contracts.filter(c => {
      const matchesSearch = String(c.customerName || '').toLowerCase().includes(term) ||
        String(c.contractId || '').toLowerCase().includes(term) ||
        String(c.weekNumber || '').toLowerCase().includes(term);
      const matchesWeek = weekFilter === 'all' || c.weekNumber === weekFilter;
      const matchesCustomer = customerFilter === 'all' || c.customerName === customerFilter;
      return matchesSearch && matchesWeek && matchesCustomer;
    });
  }, [contracts, searchTerm, weekFilter, customerFilter]);

  const uniqueWeeks = useMemo(() => {
    const weeks = Array.from(new Set(contracts.map(c => c.weekNumber))).filter(Boolean);
    return weeks.sort();
  }, [contracts]);

  const handleSignOut = async () => {
    if (auth) {
      await signOut(auth);
      router.push('/');
    }
  };

  const addCORow = () => {
    const firstRow = coRows[0];
    setCoRows([...coRows, {
      id: Math.random().toString(36).substr(2, 9),
      ps: 'PS',
      shippingLine: firstRow?.shippingLine || '',
      bookingNo: '',
      containerNo: '',
      atwStatus: 'PENDING',
      pod: firstRow?.pod || '',
      cutOffDate: firstRow?.cutOffDate || '',
      etd: firstRow?.etd || '',
      sku: firstRow?.sku || '',
      palletization: firstRow?.palletization || 'Palletized'
    }]);
  };

  const updateCORow = (id: string, updates: Partial<CORow>) => {
    setCoRows(coRows.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const removeCORow = (id: string) => {
    setCoRows(coRows.filter(r => r.id !== id));
  };

  const handleSubmitCOs = async () => {
    if (!db || !selectedContractId) return;
    try {
      const batch = writeBatch(db);
      coRows.forEach(row => {
        const itemRef = doc(db, `${CONTRACT_PATH}/${selectedContractId}/items`, row.id);
        batch.set(itemRef, {
          itemId: row.id,
          ps: row.ps,
          shippingLines: row.shippingLine,
          bookingNumber: row.bookingNo,
          containerNo: row.containerNo,
          atwStatus: row.atwStatus,
          pod: row.pod,
          cutOffDate: row.cutOffDate,
          etd: row.etd,
          specs: row.sku,
          palletized: row.palletization,
          updatedAt: serverTimestamp()
        }, { merge: true });
      });
      await batch.commit();
      toast({ title: "COs Updated", description: "All cutting order allocations saved successfully." });
      setActiveView('loading-advice');
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  const renderEditCuttingOrders = () => {
    const contract = contracts.find(c => c.id === selectedContractId);
    if (!contract) return null;

    const podStats = (podMappings as any[]).map(p => {
      const target = contractItems.filter((i: any) => i.pod === p.portName).reduce((acc: number, curr: any) => acc + (curr.total || 0), 0);
      const allocated = coRows.filter(r => r.pod === p.portName && r.containerNo).length;
      return { name: p.portName, target, allocated };
    }).filter(s => s.target > 0);

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 max-w-[1400px] mx-auto">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-green-50 p-2 rounded-lg text-anflocor-green">
                <Scissors className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Edit COs for this LA</h2>
                <p className="text-xs text-gray-500 font-medium">Batch entry for Cutting Orders linked to Loading Advice: <span className="font-bold text-gray-900">{contract.contractId}</span></p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setActiveView('loading-advice')} className="rounded-full text-gray-400"><X className="h-5 w-5" /></Button>
          </div>

          <div className="p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Customer</Label>
                <div className="h-12 bg-gray-50 border border-gray-100 rounded-lg flex items-center px-4 font-bold text-gray-700">{contract.customerName}</div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Week No</Label>
                <div className="h-12 bg-gray-50 border border-gray-100 rounded-lg flex items-center px-4 font-bold text-gray-700">{contract.weekNumber?.replace(/\D/g, '')}</div>
              </div>
            </div>

            <div className="space-y-4">
              <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Containers Allocated</Label>
              <div className="flex flex-wrap items-stretch gap-4">
                {podStats.map(stat => (
                  <div key={stat.name} className="flex-1 min-w-[180px] border border-gray-200 rounded-lg p-6 bg-white flex flex-col justify-center">
                    <span className="text-[10px] font-black uppercase text-gray-300 mb-2">{stat.name}</span>
                    <span className="text-2xl font-black text-gray-900">{stat.allocated}/{stat.target}</span>
                  </div>
                ))}
                <div className="flex-[1.5] min-w-[250px] bg-black text-white rounded-lg p-6 flex flex-col justify-center relative overflow-hidden">
                  <div className="relative z-10">
                    <span className="text-[10px] font-black uppercase text-gray-500 tracking-tighter">Total Allocation</span>
                    <h3 className="text-xl font-bold mt-1">Total for week {contract.weekNumber?.replace(/\D/g, '')} : {contract.totalVans}</h3>
                  </div>
                  <Sparkles className="absolute right-4 bottom-4 h-12 w-12 text-white/5" />
                </div>
              </div>
            </div>

            <div className="border rounded-xl overflow-hidden shadow-sm">
              <Table>
                <TableHeader className="bg-gray-50/80">
                  <TableRow className="h-12">
                    <TableHead className="w-12 text-[10px] font-black uppercase text-gray-400 text-center">#</TableHead>
                    <TableHead className="w-24 text-[10px] font-black uppercase text-gray-400">PS</TableHead>
                    <TableHead className="w-40 text-[10px] font-black uppercase text-gray-400">Shipping Line</TableHead>
                    <TableHead className="w-40 text-[10px] font-black uppercase text-gray-400">Booking No</TableHead>
                    <TableHead className="w-40 text-[10px] font-black uppercase text-gray-400">Container No</TableHead>
                    <TableHead className="w-32 text-[10px] font-black uppercase text-gray-400 text-center">ATW Status</TableHead>
                    <TableHead className="w-32 text-[10px] font-black uppercase text-gray-400">POD</TableHead>
                    <TableHead className="w-32 text-[10px] font-black uppercase text-gray-400">Cut-off Date</TableHead>
                    <TableHead className="w-32 text-[10px] font-black uppercase text-gray-400">ETD</TableHead>
                    <TableHead className="w-32 text-[10px] font-black uppercase text-gray-400">SKU</TableHead>
                    <TableHead className="w-32 text-[10px] font-black uppercase text-gray-400">Palletization</TableHead>
                    <TableHead className="w-12 text-[10px] font-black uppercase text-gray-400 text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coRows.map((row, index) => (
                    <TableRow key={row.id} className="h-16 hover:bg-gray-50/50">
                      <TableCell className="text-center font-bold text-gray-400">{index + 1}</TableCell>
                      <TableCell>
                        <Select value={row.ps} onValueChange={(val) => updateCORow(row.id, { ps: val })}>
                          <SelectTrigger className="h-9 border-none bg-transparent shadow-none font-bold text-gray-700"><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="PS">PS</SelectItem><SelectItem value="REG">REG</SelectItem></SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select value={row.shippingLine} onValueChange={(val) => updateCORow(row.id, { shippingLine: val })}>
                          <SelectTrigger className="h-9 border-none bg-transparent shadow-none font-bold text-gray-700"><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="OOCL">OOCL</SelectItem><SelectItem value="MSC">MSC</SelectItem><SelectItem value="MAERSK">MAERSK</SelectItem></SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell><Input placeholder="Booking No" value={row.bookingNo} onChange={(e) => updateCORow(row.id, { bookingNo: e.target.value })} className="h-9 border-none bg-transparent shadow-none placeholder:text-gray-200 font-medium"/></TableCell>
                      <TableCell><Input placeholder="Container No" value={row.containerNo} onChange={(e) => updateCORow(row.id, { containerNo: e.target.value })} className="h-9 border-none bg-transparent shadow-none placeholder:text-gray-200 font-bold"/></TableCell>
                      <TableCell className="text-center">
                        <Badge className={cn(
                          "text-[9px] font-black px-2 cursor-pointer",
                          row.atwStatus === 'PENDING' ? "bg-red-100 text-red-500" : "bg-green-100 text-green-600"
                        )} variant="outline" onClick={() => updateCORow(row.id, { atwStatus: row.atwStatus === 'PENDING' ? 'READY' : 'PENDING' })}>
                          {row.atwStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Select value={row.pod} onValueChange={(val) => updateCORow(row.id, { pod: val })}>
                          <SelectTrigger className="h-9 border-none bg-transparent shadow-none font-bold text-gray-500 uppercase text-[11px] tracking-tight"><SelectValue /></SelectTrigger>
                          <SelectContent>{podMappings.map((p: any) => (<SelectItem key={p.id} value={p.portName}>{p.portName}</SelectItem>))}</SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell><Input type="date" value={row.cutOffDate} onChange={(e) => updateCORow(row.id, { cutOffDate: e.target.value })} className="h-9 border-none bg-transparent shadow-none text-[11px] font-medium text-gray-400"/></TableCell>
                      <TableCell><Input type="date" value={row.etd} onChange={(e) => updateCORow(row.id, { etd: e.target.value })} className="h-9 border-none bg-transparent shadow-none text-[11px] font-medium text-gray-400"/></TableCell>
                      <TableCell><Input value={row.sku} onChange={(e) => updateCORow(row.id, { sku: e.target.value })} placeholder="SKU" className="h-9 border-none bg-transparent shadow-none text-[11px] font-bold text-gray-400"/></TableCell>
                      <TableCell>
                        <Select value={row.palletization} onValueChange={(val) => updateCORow(row.id, { palletization: val })}>
                          <SelectTrigger className="h-9 border-none bg-transparent shadow-none text-[11px] font-medium text-gray-500"><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="Palletized">Palletized</SelectItem><SelectItem value="Non-Palletized">Non-Palletized</SelectItem></SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-200 hover:text-red-400" onClick={() => removeCORow(row.id)}><Trash2 className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="h-16 hover:bg-transparent">
                    <TableCell colSpan={11}>
                      <Button variant="ghost" className="text-anflocor-green text-xs font-bold gap-2 p-0 h-auto hover:bg-transparent" onClick={addCORow}>
                        <Plus className="h-4 w-4" /> Add Row
                      </Button>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="p-8 border-t bg-gray-50/50 flex items-center justify-end gap-4">
            <Button variant="outline" onClick={() => setActiveView('loading-advice')} className="h-12 px-8 font-bold text-gray-400 border-gray-200 uppercase tracking-widest text-xs">CANCEL</Button>
            <Button onClick={handleSubmitCOs} className="h-12 px-12 bg-[#1B4D3E] hover:bg-[#163a2f] text-white font-bold uppercase tracking-widest text-xs">SUBMIT</Button>
          </div>
        </div>
      </div>
    );
  };

  const renderLoadingAdviceView = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm no-print">
        <div className="w-64">
          <Select value={weekFilter} onValueChange={setWeekFilter}>
            <SelectTrigger className="bg-gray-50/50 border-gray-100">
              <SelectValue placeholder="Select Week Number" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Weeks</SelectItem>
              {uniqueWeeks.map(w => (
                <SelectItem key={w} value={w}>{w}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-64">
          <Select value={customerFilter} onValueChange={setCustomerFilter}>
            <SelectTrigger className="bg-gray-50/50 border-gray-100">
              <SelectValue placeholder="Select Customer" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Customers</SelectItem>
              {customerMappings.map((c: any) => (
                <SelectItem key={c.id} value={c.Customer}>{c.Customer}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Bell className="h-5 w-5 text-gray-400 cursor-pointer" />
          <HelpCircle className="h-5 w-5 text-gray-400 cursor-pointer" />
          <div className="h-8 w-[1px] bg-gray-100 mx-2" />
          <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <div className="h-8 w-8 rounded-full bg-anflocor-green/10 flex items-center justify-center text-anflocor-green">
              <User className="h-4 w-4" />
            </div>
            <span>COORDINATOR</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center text-xs text-gray-400 gap-2 mb-1">
            <span>Logistics</span>
            <ChevronRight className="h-3 w-3" />
            <span className="text-gray-900 font-medium">Loading Advice</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900">Loading Advice</h2>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="text-xs font-bold border-gray-200" onClick={() => { 
            if (selectedContractId) setActiveView('edit-cutting-orders');
            else toast({ variant: "destructive", title: "Select an LA", description: "Please open an advice record first." });
          }}>CREATE/VIEW COS</Button>
          
          <Dialog open={isNewLAOpen} onOpenChange={setIsNewLAOpen}>
            <DialogTrigger asChild>
              <Button className="bg-anflocor-green hover:bg-anflocor-green/90 text-white font-bold text-xs"><Plus className="mr-2 h-4 w-4" /> NEW LA</Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] w-full p-0 overflow-hidden">
              <div className="bg-white rounded-lg shadow-xl">
                <div className="p-6 border-b">
                  <DialogTitle className="text-xl font-bold">New Loading Advice</DialogTitle>
                  <DialogDescription className="text-gray-500 mt-1 flex items-center gap-2">
                    <Info className="h-4 w-4" /> Define customer details and multiple loading requirements below.
                  </DialogDescription>
                </div>

                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-black uppercase text-gray-400">Customer</Label>
                      <Select value={newLAHeader.customerName} onValueChange={(val) => setNewLAHeader({...newLAHeader, customerName: val})}>
                        <SelectTrigger className="h-10">
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
                      <Label className="text-[10px] font-black uppercase text-gray-400">Week No</Label>
                      <Select value={newLAHeader.weekNumber} onValueChange={(val) => setNewLAHeader({...newLAHeader, weekNumber: val})}>
                        <SelectTrigger className="h-10">
                          <SelectValue placeholder="Select Week" />
                        </SelectTrigger>
                        <SelectContent>
                          {weekOptions.map(w => (
                            <SelectItem key={w} value={w}>{w}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="border rounded-lg overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-gray-50">
                        <TableRow>
                          <TableHead className="text-[10px] font-black uppercase">Farm</TableHead>
                          <TableHead className="text-[10px] font-black uppercase">POL</TableHead>
                          <TableHead className="text-[10px] font-black uppercase">POD</TableHead>
                          <TableHead className="text-[10px] font-black uppercase">Shipping Line</TableHead>
                          <TableHead className="text-[10px] font-black uppercase">Cut-off</TableHead>
                          <TableHead className="text-[10px] font-black uppercase">ETD</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-center">Vans</TableHead>
                          <TableHead className="text-[10px] font-black uppercase">SKU</TableHead>
                          <TableHead className="text-[10px] font-black uppercase">Palletization</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-right w-[50px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {laRows.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell className="p-2">
                              <Select value={row.farm} onValueChange={(val) => updateLARow(row.id, { farm: val })}>
                                <SelectTrigger className="h-8 text-xs min-w-[100px] border-gray-200"><SelectValue /></SelectTrigger>
                                <SelectContent><SelectItem value="TADECO">TADECO</SelectItem><SelectItem value="ANFLOCOR">ANFLOCOR</SelectItem></SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="p-2">
                              <Select value={row.pol} onValueChange={(val) => updateLARow(row.id, { pol: val })}>
                                <SelectTrigger className="h-8 text-xs min-w-[120px] border-gray-200"><SelectValue placeholder="POL" /></SelectTrigger>
                                <SelectContent>{polMappings.map((p: any) => (<SelectItem key={p.id} value={p.portName}>{p.portName}</SelectItem>))}</SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="p-2">
                              <Select value={row.pod} onValueChange={(val) => updateLARow(row.id, { pod: val })}>
                                <SelectTrigger className="h-8 text-xs min-w-[120px] border-gray-200"><SelectValue placeholder="POD" /></SelectTrigger>
                                <SelectContent>{podMappings.map((p: any) => (<SelectItem key={p.id} value={p.portName}>{p.portName}</SelectItem>))}</SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="p-2">
                              <Input className="h-8 text-xs border-gray-200 min-w-[100px]" placeholder="SL" value={row.shippingLine} onChange={(e) => updateLARow(row.id, { shippingLine: e.target.value })}/>
                            </TableCell>
                            <TableCell className="p-2"><Input type="date" className="h-8 text-xs border-gray-200" value={row.cutOffDate} onChange={(e) => updateLARow(row.id, { cutOffDate: e.target.value })}/></TableCell>
                            <TableCell className="p-2"><Input type="date" className="h-8 text-xs border-gray-200" value={row.etd} onChange={(e) => updateLARow(row.id, { etd: e.target.value })}/></TableCell>
                            <TableCell className="p-2"><Input type="number" className="h-8 text-xs border-gray-200 w-16 text-center" value={row.totalVans} onChange={(e) => updateLARow(row.id, { totalVans: parseInt(e.target.value) || 0 })}/></TableCell>
                            <TableCell className="p-2"><Input className="h-8 text-xs border-gray-200 min-w-[100px]" placeholder="SKU" value={row.skuCode} onChange={(e) => updateLARow(row.id, { skuCode: e.target.value })}/></TableCell>
                            <TableCell className="p-2">
                              <Select value={row.palletizedType} onValueChange={(val: any) => updateLARow(row.id, { palletizedType: val })}>
                                <SelectTrigger className="h-8 text-xs min-w-[120px] border-gray-200"><SelectValue /></SelectTrigger>
                                <SelectContent><SelectItem value="Palletized">Palletized</SelectItem><SelectItem value="Non Palletized">Non Palletized</SelectItem></SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="p-2 text-right">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400" onClick={() => removeLARow(row.id)}><Trash2 className="h-4 w-4" /></Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <Button variant="ghost" className="text-anflocor-green text-xs font-bold gap-2 p-0 h-auto" onClick={addLARow}>
                    <Plus className="h-4 w-4" /> Add Row
                  </Button>
                </div>

                <div className="p-6 border-t bg-gray-50 flex items-center justify-end gap-3 rounded-b-lg">
                  <Button variant="ghost" onClick={() => setIsNewLAOpen(false)} className="text-gray-400 font-bold uppercase text-[10px] tracking-wider">CANCEL</Button>
                  <Button className="bg-[#1B4D3E] hover:bg-[#163a2f] text-white font-bold uppercase text-[10px] tracking-widest px-8" onClick={handleSubmitBatch}>SUBMIT BATCH</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="border-gray-200 shadow-sm overflow-hidden bg-white">
        <CardHeader className="bg-white border-b py-3 px-6 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-bold text-gray-700 uppercase tracking-tight">Recent Loading Advice Manifests</CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs font-bold gap-1"><Filter className="h-3 w-3" /> Filter</Button>
          </div>
        </CardHeader>
        <Table>
          <TableHeader className="bg-gray-100/50">
            <TableRow className="h-10 hover:bg-transparent">
              <TableHead className="text-[10px] font-black uppercase text-gray-500">WEEK NO.</TableHead>
              <TableHead className="text-[10px] font-black uppercase text-gray-500">CUSTOMER</TableHead>
              <TableHead className="text-[10px] font-black uppercase text-gray-500">FARM</TableHead>
              <TableHead className="text-[10px] font-black uppercase text-gray-500">POL</TableHead>
              <TableHead className="text-[10px] font-black uppercase text-gray-500">POD</TableHead>
              <TableHead className="text-[10px] font-black uppercase text-gray-500">SL</TableHead>
              <TableHead className="text-[10px] font-black uppercase text-gray-500">CUT-OFF</TableHead>
              <TableHead className="text-[10px] font-black uppercase text-gray-500">ETD</TableHead>
              <TableHead className="text-[10px] font-black uppercase text-gray-500 text-center">VANS</TableHead>
              <TableHead className="text-[10px] font-black uppercase text-gray-500">SKU</TableHead>
              <TableHead className="text-[10px] font-black uppercase text-gray-500">PALLETIZED</TableHead>
              <TableHead className="text-[10px] font-black uppercase text-gray-500">STATUS</TableHead>
              <TableHead className="text-[10px] font-black uppercase text-gray-500 text-right">ACTIONS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contractsLoading ? (
              <TableRow><TableCell colSpan={13} className="h-48 text-center"><Loader2 className="h-10 w-10 animate-spin mx-auto text-anflocor-green opacity-40" /></TableCell></TableRow>
            ) : filteredData.length === 0 ? (
              <TableRow><TableCell colSpan={13} className="h-48 text-center text-gray-400 font-medium">No records found.</TableCell></TableRow>
            ) : filteredData.map((c: any) => (
              <TableRow key={c.id} className="hover:bg-gray-50/80 cursor-pointer h-16 group" onClick={() => { setSelectedContractId(c.id); setActiveView('loading-advice'); }}>
                <TableCell className="font-bold text-gray-900">{c.weekNumber || 'N/A'}</TableCell>
                <TableCell className="text-sm font-bold text-gray-700">{c.customerName}</TableCell>
                <TableCell className="text-xs font-medium text-gray-600">{c.farm || 'TADECO'}</TableCell>
                <TableCell className="text-xs text-gray-600">{c.pol || '--'}</TableCell>
                <TableCell className="text-xs font-bold text-gray-900">{c.pod || '--'}</TableCell>
                <TableCell className="text-xs text-gray-500 font-medium">{c.shippingLine || 'TBA'}</TableCell>
                <TableCell className="text-[10px] text-gray-400">{c.cutOffDate || '--'}</TableCell>
                <TableCell className="text-[10px] text-gray-900 font-medium">{c.etd || 'TBA'}</TableCell>
                <TableCell className="text-sm font-black text-center text-indigo-700">{c.totalVans || 0}</TableCell>
                <TableCell className="text-[10px] font-bold text-gray-500">{c.skuSummary || '--'}</TableCell>
                <TableCell><Badge variant="outline" className="text-[9px] px-1 h-4">{c.palletizedType || 'Palletized'}</Badge></TableCell>
                <TableCell>
                  <Badge className={cn(
                    "text-[10px] font-black",
                    c.status === 'completed' ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                  )} variant="outline">
                    {c.status?.toUpperCase()}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100"><ChevronRight className="h-4 w-4" /></Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );

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
              <CardHeader className="pb-2"><CardDescription className="text-xs font-bold uppercase">Pending manifests</CardDescription></CardHeader>
              <CardContent><p className="text-3xl font-black text-gray-900">{contracts.filter(c => c.status === 'pending').length}</p></CardContent>
            </Card>
            <Card className="bg-white border-l-4 border-l-emerald-600">
              <CardHeader className="pb-2"><CardDescription className="text-xs font-bold uppercase">Active Mappings</CardDescription></CardHeader>
              <CardContent><p className="text-3xl font-black text-gray-900">{materialMappings.length + customerMappings.length}</p></CardContent>
            </Card>
            <Card className="bg-white border-l-4 border-l-amber-600">
              <CardHeader className="pb-2"><CardDescription className="text-xs font-bold uppercase">Active Weeks</CardDescription></CardHeader>
              <CardContent><p className="text-3xl font-black text-gray-900">{uniqueWeeks.length}</p></CardContent>
            </Card>
          </div>
          <Card className="border-gray-200 shadow-sm bg-white overflow-hidden">
            <CardContent className="p-12 flex flex-col items-center justify-center text-gray-400"><BarChart3 className="h-16 w-16 opacity-10 mb-4" /><p className="text-sm font-medium">Production statistics will appear here.</p></CardContent>
          </Card>
        </section>
      );
    }

    if (activeView === 'loading-advice') return renderLoadingAdviceView();
    if (activeView === 'edit-cutting-orders') return renderEditCuttingOrders();

    return (
      <div className="p-12 text-center text-gray-400">View implementation pending.</div>
    );
  };

  const currentUserLabel = user?.displayName || user?.email?.split('@')[0] || 'User';

  return (
    <div className="flex h-screen bg-gray-50/50">
      <aside className="w-64 bg-anflocor-green text-white flex flex-col shrink-0 shadow-xl no-print">
        <div className="p-6 flex items-center space-x-3 border-b border-white/10"><div className="bg-white/10 p-2 rounded-lg"><Leaf className="h-6 w-6" /></div><span className="text-xl font-bold tracking-tighter">myProduce</span></div>
        <nav className="flex-1 p-4 space-y-1">
          <Button variant="ghost" onClick={() => setActiveView('dashboard')} className={cn("w-full justify-start text-white hover:bg-white/10 transition-all", activeView === 'dashboard' && "bg-white/10 shadow-inner")}><LayoutDashboard className="mr-3 h-5 w-5" />Dashboard</Button>
          <Button variant="ghost" onClick={() => setActiveView('loading-advice')} className={cn("w-full justify-start text-white hover:bg-white/10 transition-all", (activeView === 'loading-advice' || activeView === 'edit-cutting-orders') && "bg-white/10 shadow-inner")}><FileCheck className="mr-3 h-5 w-5" />Loading Advice</Button>
          <Button variant="ghost" onClick={() => setActiveView('configuration')} className={cn("w-full justify-start text-white hover:bg-white/10 transition-all", activeView === 'configuration' && "bg-white/10 shadow-inner")}><Settings className="mr-3 h-5 w-5" />Configuration</Button>
        </nav>
        <div className="p-4 border-t border-white/10"><Button onClick={handleSignOut} variant="ghost" className="w-full justify-start text-white/70 hover:text-red-400 transition-colors"><LogOut className="mr-3 h-5 w-5" />Sign Out</Button></div>
      </aside>
      <main className="flex-1 overflow-y-auto p-8 print:p-0">
        <header className="mb-8 flex justify-between items-end border-b pb-6 no-print">
          <div>
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
              {activeView === 'dashboard' ? 'Dashboard' : 
               activeView === 'loading-advice' ? 'Loading Advice' :
               activeView === 'edit-cutting-orders' ? 'Edit Cutting Orders' : 'System Overview'}
            </h1>
            <p className="text-gray-500 font-semibold mt-1">TADECO Agricultural Production Portal</p>
          </div>
          <div className="flex items-center space-x-3 text-sm text-gray-400 font-medium"><User className="h-4 w-4" /><span>{currentUserLabel} (Admin)</span></div>
        </header>
        {renderContent()}
      </main>
      <style jsx global>{`@media print { .no-print { display: none !important; } body { background-color: white !important; padding: 0 !important; margin: 0 !important; } main { padding: 0 !important; } @page { margin: 1cm; } }`}</style>
    </div>
  );
}
