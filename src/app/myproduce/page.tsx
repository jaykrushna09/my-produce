
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
  Info
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
import { extractContractData } from '@/ai/flows/extract-contract-flow';
import { format, setISOWeek, startOfISOWeek, endOfISOWeek, addWeeks } from 'date-fns';

type ViewState = 'dashboard' | 'configuration' | 'customer-mapping' | 'material-mapping' | 'port-of-loading' | 'port-of-destination' | 'loading-advice' | 'contract-details' | 'cutting-order';

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
  const [isExtracting, setIsExtracting] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [weekFilter, setWeekFilter] = useState<string>('all');
  const [customerFilter, setCustomerFilter] = useState<string>('all');
  
  // Booking Update State
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [isBulkUpdate, setIsBulkUpdate] = useState(false);

  // New multi-row LA State
  const [isNewLAOpen, setIsNewLAOpen] = useState(false);
  const [newLAHeader, setNewLAHeader] = useState({
    customerName: '',
    weekNumber: ''
  });
  const [laRows, setLaRows] = useState<LARow[]>([{
    id: Math.random().toString(36).substr(2, 9),
    farm: 'TADECO',
    pol: '',
    pod: '',
    shippingLine: '',
    cutOffDate: '',
    etd: '',
    totalVans: 0,
    skuCode: '',
    palletizedType: 'Palletized'
  }]);

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
  
  const { data: customerMappings } = useCollection(customerMappingsQuery);
  const { data: materialMappings } = useCollection(materialMappingsQuery);
  const { data: polMappings } = useCollection(polMappingsQuery);
  const { data: podMappings } = useCollection(podMappingsQuery);
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
    if (activeView === 'loading-advice') {
      return contracts.filter(c => {
        const matchesSearch = String(c.customerName || '').toLowerCase().includes(term) ||
          String(c.contractRef || '').toLowerCase().includes(term) ||
          String(c.weekNumber || '').toLowerCase().includes(term);
        const matchesWeek = weekFilter === 'all' || c.weekNumber === weekFilter;
        const matchesCustomer = customerFilter === 'all' || c.customerName === customerFilter;
        return matchesSearch && matchesWeek && matchesCustomer;
      });
    }
    return [];
  }, [customerMappings, materialMappings, polMappings, podMappings, contracts, activeView, searchTerm, weekFilter, customerFilter]);

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

  const addLARow = () => {
    setLaRows([...laRows, {
      id: Math.random().toString(36).substr(2, 9),
      farm: 'TADECO',
      pol: '',
      pod: '',
      shippingLine: '',
      cutOffDate: '',
      etd: '',
      totalVans: 0,
      skuCode: '',
      palletizedType: 'Palletized'
    }]);
  };

  const removeLARow = (id: string) => {
    if (laRows.length > 1) {
      setLaRows(laRows.filter(r => r.id !== id));
    }
  };

  const updateLARow = (id: string, updates: Partial<LARow>) => {
    setLaRows(laRows.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const handleSubmitBatch = async () => {
    if (!db || !newLAHeader.customerName || !newLAHeader.weekNumber) {
      toast({ variant: "destructive", title: "Error", description: "Please select customer and week." });
      return;
    }

    try {
      const batch = writeBatch(db);
      const contractId = `LA-${Date.now()}`;
      
      const totalVans = laRows.reduce((sum, r) => sum + r.totalVans, 0);

      // Save Header
      batch.set(doc(db, CONTRACT_PATH, contractId), {
        contractId,
        customerName: newLAHeader.customerName,
        weekNumber: newLAHeader.weekNumber,
        totalVans,
        status: 'pending',
        receivedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Save Line Items
      laRows.forEach(row => {
        const itemRef = doc(collection(db, `${CONTRACT_PATH}/${contractId}/items`));
        batch.set(itemRef, {
          itemId: itemRef.id,
          pod: row.pod,
          pol: row.pol,
          farm: row.farm,
          total: row.totalVans,
          specs: row.skuCode,
          shippingLines: row.shippingLine,
          etd: row.etd,
          cutOffDate: row.cutOffDate,
          palletized: row.palletizedType,
          updatedAt: serverTimestamp()
        });
      });

      await batch.commit();
      setIsNewLAOpen(false);
      setNewLAHeader({ customerName: '', weekNumber: '' });
      setLaRows([{
        id: Math.random().toString(36).substr(2, 9),
        farm: 'TADECO',
        pol: '',
        pod: '',
        shippingLine: '',
        cutOffDate: '',
        etd: '',
        totalVans: 0,
        skuCode: '',
        palletizedType: 'Palletized'
      }]);
      toast({ title: "Batch Submitted", description: `Loading Advice created with ${laRows.length} rows.` });
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
          } else if (activeView === 'port-of-loading' || activeView === 'port-of-destination') {
            const colName = activeView === 'port-of-loading' ? 'PORT_OF_LOADING' : 'PORT_OF_DESTINATION';
            const portVal = findKey([colName, colName.replace(/_/g, ' '), activeView === 'port-of-loading' ? 'POL' : 'POD']);
            if (portVal) {
              const portName = String(portVal).trim();
              batch.set(doc(db, targetPath, portName), {
                portName: portName,
                updatedAt: serverTimestamp()
              });
              count++;
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

  const getWeekRangeDisplay = (weekStr: string) => {
    const num = parseInt(weekStr.replace(/\D/g, ''));
    if (isNaN(num) || num < 1 || num > 53) return null;
    try {
      const year = new Date().getFullYear();
      const baseDate = new Date(year, 0, 4); 
      const dateInWeek = setISOWeek(baseDate, num);
      const start = startOfISOWeek(dateInWeek);
      const end = endOfISOWeek(dateInWeek);
      return `${format(start, 'MMM dd')} - ${format(end, 'MMM dd, yyyy')}`;
    } catch (e) {
      return null;
    }
  };

  const weekOptions = useMemo(() => {
    const options = [];
    const currentWeek = parseInt(format(new Date(), 'I'));
    for (let i = -2; i < 10; i++) {
      const w = currentWeek + i;
      if (w > 0 && w <= 53) options.push(`WK${w.toString().padStart(2, '0')}`);
    }
    return options;
  }, []);

  const renderLoadingAdviceView = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Filters Bar */}
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

      {/* Breadcrumbs & Title */}
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
          <Button variant="outline" className="text-xs font-bold border-gray-200">CREATE/VIEW BOOKINGS</Button>
          <Button variant="outline" className="text-xs font-bold border-gray-200" onClick={() => setActiveView('cutting-order')}>CREATE/VIEW COS</Button>
          
          <Dialog open={isNewLAOpen} onOpenChange={setIsNewLAOpen}>
            <DialogTrigger asChild>
              <Button className="bg-anflocor-green hover:bg-anflocor-green/90 text-white font-bold text-xs"><Plus className="mr-2 h-4 w-4" /> NEW LA</Button>
            </DialogTrigger>
            <DialogContent className="max-w-[95vw] w-full p-0 overflow-hidden">
              <div className="bg-white rounded-lg shadow-xl">
                <div className="p-6 border-b">
                  <DialogTitle className="text-xl font-bold">New Loading Advice</DialogTitle>
                  <DialogDescription className="text-gray-500 mt-1 flex items-center gap-2">
                    <Info className="h-4 w-4" /> Multiple entries added here will be linked under a single transaction ID.
                  </DialogDescription>
                </div>

                <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                  {/* Header Selection */}
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

                  {/* Rows Table */}
                  <div className="border rounded-lg overflow-x-auto">
                    <Table>
                      <TableHeader className="bg-gray-50">
                        <TableRow>
                          <TableHead className="text-[10px] font-black uppercase">Farm</TableHead>
                          <TableHead className="text-[10px] font-black uppercase">Port of Loading</TableHead>
                          <TableHead className="text-[10px] font-black uppercase">Port of Destination</TableHead>
                          <TableHead className="text-[10px] font-black uppercase">Shipping Line</TableHead>
                          <TableHead className="text-[10px] font-black uppercase">Cut-off Date</TableHead>
                          <TableHead className="text-[10px] font-black uppercase">ETD</TableHead>
                          <TableHead className="text-[10px] font-black uppercase text-center">Total Vans</TableHead>
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
                                <SelectTrigger className="h-8 text-xs min-w-[100px] border-gray-200">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="TADECO">TADECO</SelectItem>
                                  <SelectItem value="ANFLOCOR">ANFLOCOR</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="p-2">
                              <Select value={row.pol} onValueChange={(val) => updateLARow(row.id, { pol: val })}>
                                <SelectTrigger className="h-8 text-xs min-w-[120px] border-gray-200">
                                  <SelectValue placeholder="City/Port" />
                                </SelectTrigger>
                                <SelectContent>
                                  {polMappings.map((p: any) => (
                                    <SelectItem key={p.id} value={p.portName}>{p.portName}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="p-2">
                              <Select value={row.pod} onValueChange={(val) => updateLARow(row.id, { pod: val })}>
                                <SelectTrigger className="h-8 text-xs min-w-[120px] border-gray-200">
                                  <SelectValue placeholder="City/Port" />
                                </SelectTrigger>
                                <SelectContent>
                                  {podMappings.map((p: any) => (
                                    <SelectItem key={p.id} value={p.portName}>{p.portName}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="p-2">
                              <Input 
                                className="h-8 text-xs border-gray-200 min-w-[100px]" 
                                placeholder="Select L"
                                value={row.shippingLine}
                                onChange={(e) => updateLARow(row.id, { shippingLine: e.target.value })}
                              />
                            </TableCell>
                            <TableCell className="p-2">
                              <Input 
                                type="date"
                                className="h-8 text-xs border-gray-200"
                                value={row.cutOffDate}
                                onChange={(e) => updateLARow(row.id, { cutOffDate: e.target.value })}
                              />
                            </TableCell>
                            <TableCell className="p-2">
                              <Input 
                                type="date"
                                className="h-8 text-xs border-gray-200"
                                value={row.etd}
                                onChange={(e) => updateLARow(row.id, { etd: e.target.value })}
                              />
                            </TableCell>
                            <TableCell className="p-2">
                              <Input 
                                type="number"
                                className="h-8 text-xs border-gray-200 w-16 text-center"
                                value={row.totalVans}
                                onChange={(e) => updateLARow(row.id, { totalVans: parseInt(e.target.value) || 0 })}
                              />
                            </TableCell>
                            <TableCell className="p-2">
                              <Input 
                                className="h-8 text-xs border-gray-200 min-w-[100px]" 
                                placeholder="SKU Cod"
                                value={row.skuCode}
                                onChange={(e) => updateLARow(row.id, { skuCode: e.target.value })}
                              />
                            </TableCell>
                            <TableCell className="p-2">
                              <Select value={row.palletizedType} onValueChange={(val: any) => updateLARow(row.id, { palletizedType: val })}>
                                <SelectTrigger className="h-8 text-xs min-w-[120px] border-gray-200">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Palletized">Palletized</SelectItem>
                                  <SelectItem value="Non Palletized">Non Palletized</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="p-2 text-right">
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400" onClick={() => removeLARow(row.id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
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
            <Button variant="outline" size="sm" className="h-8 text-xs font-bold gap-1"><Download className="h-3 w-3" /> Export</Button>
          </div>
        </CardHeader>
        <Table>
          <TableHeader className="bg-gray-100/50">
            <TableRow className="h-10 hover:bg-transparent">
              <TableHead className="text-[10px] font-black uppercase text-gray-500">WEEK NO.</TableHead>
              <TableHead className="text-[10px] font-black uppercase text-gray-500">CUSTOMER</TableHead>
              <TableHead className="text-[10px] font-black uppercase text-gray-500 text-center">TOTAL VANS</TableHead>
              <TableHead className="text-[10px] font-black uppercase text-gray-500">RECEIVED AT</TableHead>
              <TableHead className="text-[10px] font-black uppercase text-gray-500">STATUS</TableHead>
              <TableHead className="text-[10px] font-black uppercase text-gray-500 text-right">ACTIONS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contractsLoading ? (
              <TableRow><TableCell colSpan={6} className="h-48 text-center"><Loader2 className="h-10 w-10 animate-spin mx-auto text-anflocor-green opacity-40" /></TableCell></TableRow>
            ) : filteredData.length === 0 ? (
              <TableRow><TableCell colSpan={6} className="h-48 text-center text-gray-400 font-medium">No records found.</TableCell></TableRow>
            ) : filteredData.map((c: any) => (
              <TableRow key={c.id} className="hover:bg-gray-50/80 cursor-pointer h-16 group" onClick={() => { setSelectedContractId(c.id); setActiveView('contract-details'); }}>
                <TableCell className="font-bold text-gray-900">{c.weekNumber || 'N/A'}</TableCell>
                <TableCell className="text-sm font-bold text-gray-700">{c.customerName}</TableCell>
                <TableCell className="text-sm font-black text-center text-indigo-700">{c.totalVans || 0}</TableCell>
                <TableCell className="text-xs text-gray-500">{c.receivedAt?.toDate()?.toLocaleDateString() || 'N/A'}</TableCell>
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

  const renderContractDetails = () => {
    const contract = contracts.find(c => c.id === selectedContractId);
    if (!contract) return null;

    const handleUpdateBooking = (item: any) => {
      setEditingItem(item);
      setIsBulkUpdate(false);
      setIsBookingModalOpen(true);
    };

    const handleBulkUpdateBooking = () => {
      if (selectedItemIds.length === 0) return;
      setEditingItem({ vesselName: '', bookingNumber: '', total: 0 });
      setIsBulkUpdate(true);
      setIsBookingModalOpen(true);
    };

    const handleSplitRow = async (item: any) => {
      if (!db) return;
      try {
        const half = Math.floor(item.total / 2);
        const remaining = item.total - half;
        
        const batch = writeBatch(db);
        batch.update(doc(db, `${CONTRACT_PATH}/${selectedContractId}/items`, item.id), {
          total: half,
          updatedAt: serverTimestamp()
        });
        
        const newRef = doc(collection(db, `${CONTRACT_PATH}/${selectedContractId}/items`));
        batch.set(newRef, {
          ...item,
          id: newRef.id,
          total: remaining,
          bookingNumber: '', 
          vesselName: '',
          updatedAt: serverTimestamp()
        });
        
        await batch.commit();
        toast({ title: "Row Split", description: "Requirement split into two rows for flexible booking." });
      } catch (err: any) {
        toast({ variant: "destructive", title: "Split Failed", description: err.message });
      }
    };

    const saveBookingInfo = async () => {
      if (!editingItem || !db) return;
      try {
        const batch = writeBatch(db);
        const idsToUpdate = isBulkUpdate ? selectedItemIds : [editingItem.id];
        
        idsToUpdate.forEach(id => {
          const itemRef = doc(db, `${CONTRACT_PATH}/${selectedContractId}/items`, id);
          const updateData: any = {
            bookingNumber: editingItem.bookingNumber || '',
            vesselName: editingItem.vesselName || '',
            updatedAt: serverTimestamp()
          };
          
          if (!isBulkUpdate && editingItem.total !== undefined) {
            updateData.total = Number(editingItem.total);
          }
          
          batch.update(itemRef, updateData);
        });
        
        await batch.commit();
        setIsBookingModalOpen(false);
        setEditingItem(null);
        setSelectedItemIds([]);
        toast({ title: "Updated", description: `Logistics updated for ${idsToUpdate.length} item(s).` });
      } catch (err: any) {
        toast({ variant: "destructive", title: "Update Failed", description: err.message });
      }
    };

    const toggleItemSelection = (itemId: string) => {
      setSelectedItemIds(prev => 
        prev.includes(itemId) ? prev.filter(id => id !== itemId) : [...prev, itemId]
      );
    };

    const toggleAllSelection = () => {
      if (selectedItemIds.length === contractItems.length) {
        setSelectedItemIds([]);
      } else {
        setSelectedItemIds(contractItems.map((item: any) => item.id));
      }
    };

    const handleBulkDelete = async () => {
      if (selectedItemIds.length === 0 || !db) return;
      if (!confirm(`Are you sure you want to delete ${selectedItemIds.length} items?`)) return;
      
      try {
        const batch = writeBatch(db);
        selectedItemIds.forEach(id => {
          batch.delete(doc(db, `${CONTRACT_PATH}/${selectedContractId}/items`, id));
        });
        await batch.commit();
        setSelectedItemIds([]);
        toast({ title: "Deleted", description: "Selected items have been removed." });
      } catch (err: any) {
        toast({ variant: "destructive", title: "Delete Failed", description: err.message });
      }
    };

    const handleFinalize = async () => {
      if (!db || !selectedContractId) return;
      try {
        await updateDoc(doc(db, CONTRACT_PATH, selectedContractId), {
          status: 'completed',
          updatedAt: serverTimestamp()
        });
        toast({ title: "Contract Finalized", description: "Generating Cutting Order..." });
        setActiveView('cutting-order');
      } catch (err: any) {
        toast({ variant: "destructive", title: "Error", description: err.message });
      }
    };

    const totalVansBooked = contractItems.reduce((acc: number, item: any) => acc + (item.total || 0), 0);

    return (
      <div className="space-y-6 animate-in fade-in duration-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" onClick={() => setActiveView('loading-advice')} className="rounded-full"><ArrowLeft className="h-5 w-5" /></Button>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold text-gray-900">{contract.customerName}</h2>
                <Badge className="bg-anflocor-green">{contract.weekNumber}</Badge>
              </div>
              <p className="text-sm text-gray-500">HEADER TOTAL: {contract.totalVans || 0} VANS</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button className="bg-anflocor-green" onClick={handleFinalize} disabled={contractItems.length === 0}>
              <FileSignature className="h-4 w-4 mr-2" /> {contract.status === 'completed' ? 'View Cutting Order' : 'Finalise Advice'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-12 space-y-4">
            {selectedItemIds.length > 0 && (
              <div className="flex items-center justify-between p-3 bg-indigo-50 border border-indigo-100 rounded-lg animate-in slide-in-from-top-2">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-indigo-900">{selectedItemIds.length} items selected</span>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedItemIds([])} className="h-8 text-indigo-600 px-2"><X className="h-4 w-4 mr-1" /> Clear</Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={handleBulkUpdateBooking} className="bg-indigo-600 hover:bg-indigo-700 text-white"><Ship className="h-4 w-4 mr-2" /> Bulk Assign Vessel</Button>
                  <Button size="sm" variant="destructive" onClick={handleBulkDelete}><Trash2 className="h-4 w-4 mr-2" /> Delete Selected</Button>
                </div>
              </div>
            )}

            <Card className="overflow-hidden">
              <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
                <div>
                  <CardTitle className="text-lg">Logistics Planning</CardTitle>
                  <CardDescription>Allocate vessel bookings to requirements. Split rows for multiple ships.</CardDescription>
                </div>
                <Button size="sm" variant="outline" onClick={() => {
                  addDoc(collection(db!, `${CONTRACT_PATH}/${selectedContractId}/items`), {
                    pod: 'NEW PORT',
                    total: 0,
                    specs: '',
                    limitation: '',
                    palletized: 'Palletized',
                    shippingLines: '',
                    etd: '',
                    farm: 'TADECO',
                    pol: '',
                    cutOffDate: '',
                    updatedAt: serverTimestamp()
                  });
                }}><Plus className="h-4 w-4 mr-1" /> Add Requirement</Button>
              </CardHeader>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-gray-50/80">
                    <TableRow>
                      <TableHead className="w-[40px]">
                        <Checkbox 
                          checked={contractItems.length > 0 && selectedItemIds.length === contractItems.length}
                          onCheckedChange={toggleAllSelection}
                        />
                      </TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-gray-500">WEEK NO.</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-gray-500">FARM</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-gray-500">PORT OF LOADING</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-gray-500">PORT OF DESTINATION</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-gray-500">SHIPPING LINE</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-gray-500">CUT-OFF DATE</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-gray-500">ETD</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-gray-500 text-center">TOTAL VANS</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-gray-500">SKU</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-gray-500">PALLETIZATION</TableHead>
                      <TableHead className="text-[10px] font-black uppercase text-gray-500">LOGISTICS (BOOKING / VESSEL)</TableHead>
                      <TableHead className="text-right text-[10px] font-black uppercase text-gray-500">ACTIONS</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {itemsLoading ? (
                      <TableRow><TableCell colSpan={13} className="h-32 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-anflocor-green" /></TableCell></TableRow>
                    ) : contractItems.length === 0 ? (
                      <TableRow><TableCell colSpan={13} className="h-32 text-center text-gray-400">No items found.</TableCell></TableRow>
                    ) : contractItems.map((item: any) => (
                      <TableRow key={item.id} className="text-xs group hover:bg-gray-50/50">
                        <TableCell>
                          <Checkbox 
                            checked={selectedItemIds.includes(item.id)}
                            onCheckedChange={() => toggleItemSelection(item.id)}
                          />
                        </TableCell>
                        <TableCell className="font-bold text-gray-900">{contract.weekNumber}</TableCell>
                        <TableCell className="font-medium">{item.farm || 'TADECO'}</TableCell>
                        <TableCell className="text-gray-600">{item.pol || 'N/A'}</TableCell>
                        <TableCell className="font-bold text-gray-900">{item.pod}</TableCell>
                        <TableCell className="text-gray-600 font-medium">{item.shippingLines || 'TBA'}</TableCell>
                        <TableCell className="text-gray-400">{item.cutOffDate || '--'}</TableCell>
                        <TableCell className="text-gray-900 font-medium">{item.etd || 'TBA'}</TableCell>
                        <TableCell className="font-black text-center text-gray-900 text-base">{item.total}</TableCell>
                        <TableCell className="font-bold text-indigo-600">{item.specs || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] px-1 h-5">{item.palletized || 'Palletized'}</Badge>
                        </TableCell>
                        <TableCell>
                          {item.bookingNumber || item.vesselName ? (
                            <div className="flex flex-col">
                              <span className="text-[11px] font-black text-emerald-700 uppercase leading-none">{item.bookingNumber || 'NO BOOKING'}</span>
                              <span className="text-[9px] text-gray-400 font-bold italic mt-1 leading-none">{item.vesselName || 'NO VESSEL'}</span>
                            </div>
                          ) : (
                            <Button variant="ghost" size="sm" className="h-7 text-[9px] font-black border border-dashed border-gray-200 text-indigo-500" onClick={() => handleUpdateBooking(item)}>
                              ADD BOOKING
                            </Button>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-7 w-7 opacity-0 group-hover:opacity-100" 
                              title="Split volume"
                              onClick={() => handleSplitRow(item)}
                            >
                              <Split className="h-3.5 w-3.5 text-indigo-400" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => handleUpdateBooking(item)}>
                              <Edit2 className="h-3.5 w-3.5 text-gray-400" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => deleteDoc(doc(db!, `${CONTRACT_PATH}/${selectedContractId}/items`, item.id))}>
                              <Trash2 className="h-3.5 w-3.5 text-gray-400 hover:text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                  <TableFooter>
                    <TableRow className="bg-gray-50/80">
                      <TableCell colSpan={8} className="text-right font-black text-[10px] uppercase text-gray-400">Total Allocated</TableCell>
                      <TableCell className="text-center font-black text-indigo-700 text-lg">{totalVansBooked}</TableCell>
                      <TableCell colSpan={4} className="text-left text-[10px] text-gray-400 font-bold uppercase tracking-tight">
                        {totalVansBooked !== contract.totalVans ? 
                          `Attention: ${Math.abs(contract.totalVans - totalVansBooked)} vans ${totalVansBooked > contract.totalVans ? 'over' : 'short'} from LA Header.` : 
                          "Allocation matches LA requirement exactly."}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>
            </Card>
          </div>
        </div>

        <Dialog open={isBookingModalOpen} onOpenChange={setIsBookingModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{isBulkUpdate ? `Bulk Update (${selectedItemIds.length} items)` : 'Update Logistics Booking'}</DialogTitle>
              <DialogDescription>
                Assign vessel and booking reference to {isBulkUpdate ? 'selected items' : `requirement for ${editingItem?.pod}`}.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {!isBulkUpdate && (
                <div className="space-y-2">
                  <Label htmlFor="vans">Vans Count for this Booking</Label>
                  <div className="relative">
                    <Package className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input 
                      id="vans" 
                      type="number"
                      placeholder="Number of vans" 
                      className="pl-10 font-bold"
                      value={editingItem?.total || 0}
                      onChange={(e) => setEditingItem({...editingItem, total: e.target.value})}
                    />
                  </div>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="vessel">Vessel Name</Label>
                <div className="relative">
                  <Ship className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input 
                    id="vessel" 
                    placeholder="e.g. MSC SINDY" 
                    className="pl-10"
                    value={editingItem?.vesselName || ''}
                    onChange={(e) => setEditingItem({...editingItem, vesselName: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="booking">Booking Number / BL Ref</Label>
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input 
                    id="booking" 
                    placeholder="e.g. PHICHNCLGOOD90" 
                    className="pl-10 font-mono uppercase"
                    value={editingItem?.bookingNumber || ''}
                    onChange={(e) => setEditingItem({...editingItem, bookingNumber: e.target.value})}
                  />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsBookingModalOpen(false)}>Cancel</Button>
              <Button onClick={saveBookingInfo} className="bg-anflocor-green"><Save className="h-4 w-4 mr-2" /> {isBulkUpdate ? 'Apply to Selected' : 'Save Changes'}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  };

  const renderCuttingOrder = () => {
    const contract = contracts.find(c => c.id === selectedContractId);
    if (!contract) return null;

    // Group items by Vessel and Booking
    const groupedItems: Record<string, any[]> = {};
    contractItems.forEach(item => {
      const key = `${item.vesselName || 'TBA'} - ${item.bookingNumber || 'UNBOOKED'}`;
      if (!groupedItems[key]) groupedItems[key] = [];
      groupedItems[key].push(item);
    });

    const handlePrint = () => {
      window.print();
    };

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div className="flex items-center justify-between no-print">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" onClick={() => setActiveView('loading-advice')} className="rounded-full"><ArrowLeft className="h-5 w-5" /></Button>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Cutting Order Preview</h2>
              <p className="text-sm text-gray-500">Formal advice for harvesting and packing teams.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handlePrint}><Printer className="h-4 w-4 mr-2" /> Print Document</Button>
            <Button className="bg-anflocor-green"><FileSpreadsheet className="h-4 w-4 mr-2" /> Export to Excel</Button>
          </div>
        </div>

        {/* Formal Document Container */}
        <div className="bg-white border shadow-lg max-w-[21cm] mx-auto p-[2cm] min-h-[29.7cm] text-gray-900 font-sans print:shadow-none print:border-none print:mx-0 print:p-0">
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-anflocor-green pb-6 mb-8">
            <div className="flex items-center gap-3">
              <div className="bg-anflocor-green p-2 rounded-lg text-white">
                <Leaf className="h-8 w-8" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-tighter uppercase text-anflocor-green">ANFLOCOR / TADECO</h1>
                <p className="text-[10px] font-bold text-gray-400">TAGUM AGRICULTURAL DEVELOPMENT COMPANY, INC.</p>
              </div>
            </div>
            <div className="text-right">
              <h2 className="text-xl font-bold text-gray-900">CUTTING ORDER</h2>
              <div className="text-xs font-bold text-gray-500 uppercase mt-1">
                WK: {contract.weekNumber} | {getWeekRangeDisplay(contract.weekNumber || '')}
              </div>
            </div>
          </div>

          {/* Document Summary */}
          <div className="grid grid-cols-2 gap-y-4 gap-x-12 mb-8 p-4 bg-gray-50 rounded-lg border border-gray-100">
            <div className="space-y-1">
              <Label className="text-[9px] text-gray-400 font-black uppercase">Customer</Label>
              <p className="text-sm font-bold">{contract.customerName}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-[9px] text-gray-400 font-black uppercase">Allocation</Label>
              <p className="text-sm font-bold">{contract.totalVans} VANS</p>
            </div>
            <div className="space-y-1">
              <Label className="text-[9px] text-gray-400 font-black uppercase">Issue Date</Label>
              <p className="text-sm font-bold">{new Date().toLocaleDateString()}</p>
            </div>
          </div>

          {/* Logistics Groups */}
          <div className="space-y-10">
            {Object.entries(groupedItems).map(([logisticsKey, items]) => (
              <div key={logisticsKey} className="space-y-3">
                <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
                  <Ship className="h-4 w-4 text-anflocor-green" />
                  <h3 className="text-sm font-black uppercase tracking-widest text-gray-900">{logisticsKey}</h3>
                  <Badge variant="outline" className="ml-auto text-[10px] font-bold border-gray-300">
                    {items.reduce((acc, curr) => acc + curr.total, 0)} VANS TOTAL
                  </Badge>
                </div>
                <Table>
                  <TableHeader className="bg-gray-100">
                    <TableRow className="h-8">
                      <TableHead className="text-[9px] font-black uppercase text-gray-600">Destination (POD)</TableHead>
                      <TableHead className="text-[9px] font-black uppercase text-gray-600 text-center">Vans</TableHead>
                      <TableHead className="text-[9px] font-black uppercase text-gray-600">Specifications / SKU</TableHead>
                      <TableHead className="text-[9px] font-black uppercase text-gray-600">ETD / Shipping Line</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item, idx) => (
                      <TableRow key={idx} className="h-10 border-b border-gray-100 hover:bg-transparent">
                        <TableCell className="text-xs font-bold">{item.pod}</TableCell>
                        <TableCell className="text-xs font-black text-center">{item.total}</TableCell>
                        <TableCell className="text-[11px] leading-tight">
                          <div className="font-bold">{item.specs || 'REGULAR SPEC'}</div>
                        </TableCell>
                        <TableCell className="text-[11px] leading-tight">
                          <div className="font-bold">{item.etd || 'TBA'}</div>
                          <div className="text-[9px] text-gray-400">{item.shippingLines || 'N/A'}</div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ))}
          </div>

          {/* Footer / Signatures */}
          <div className="mt-20 grid grid-cols-3 gap-12 pt-12">
            <div className="space-y-4 text-center">
              <div className="border-b border-gray-900 pb-1"></div>
              <Label className="text-[9px] font-bold uppercase text-gray-400">PPLA Coordinator</Label>
            </div>
            <div className="space-y-4 text-center">
              <div className="border-b border-gray-900 pb-1"></div>
              <Label className="text-[9px] font-bold uppercase text-gray-400">ECD Checker</Label>
            </div>
            <div className="space-y-4 text-center">
              <div className="border-b border-gray-900 pb-1"></div>
              <Label className="text-[9px] font-bold uppercase text-gray-400">Authorized Signature</Label>
            </div>
          </div>
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
              <CardHeader className="pb-2"><CardDescription className="text-xs font-bold uppercase">Pending manifests</CardDescription></CardHeader>
              <CardContent><p className="text-3xl font-black text-gray-900">{contracts.filter(c => c.status === 'pending').length}</p></CardContent>
            </Card>
            <Card className="bg-white border-l-4 border-l-emerald-600">
              <CardHeader className="pb-2"><CardDescription className="text-xs font-bold uppercase">Active Mappings</CardDescription></CardHeader>
              <CardContent><p className="text-3xl font-black text-gray-900">{materialMappings.length + customerMappings.length}</p></CardContent>
            </Card>
            <Card className="bg-white border-l-4 border-l-amber-600">
              <CardHeader className="pb-2"><CardDescription className="text-xs font-bold uppercase">Latest Activity</CardDescription></CardHeader>
              <CardContent><p className="text-xs text-gray-500 font-medium">New manifest from {contracts[0]?.customerName || 'N/A'}</p></CardContent>
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

    if (activeView === 'loading-advice') return renderLoadingAdviceView();
    if (activeView === 'contract-details') return renderContractDetails();
    if (activeView === 'cutting-order') return renderCuttingOrder();

    return (
      <section className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon" onClick={() => setActiveView('configuration')} className="rounded-full hover:bg-gray-100 transition-colors"><ArrowLeft className="h-5 w-5" /></Button>
            <h2 className="text-2xl font-bold text-gray-900">
              {activeView === 'material-mapping' ? 'Material Mapping' : 
               activeView === 'port-of-loading' ? 'Port of Loading' : 
               activeView === 'port-of-destination' ? 'Port of Destination' : 'Customer Mapping'}
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
                {activeView === 'material-mapping' ? (
                  <>
                    <TableHead className="font-bold text-gray-600">SAPC Code</TableHead>
                    <TableHead className="font-bold text-gray-600">Kind of Pack</TableHead>
                    <TableHead className="font-bold text-gray-600">SAPC Type</TableHead>
                    <TableHead className="font-bold text-gray-600">SAPC Description</TableHead>
                  </>
                ) : (activeView === 'port-of-loading' || activeView === 'port-of-destination') ? (
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
              {filteredData.length === 0 ? (
                <TableRow><TableCell colSpan={5} className="h-48 text-center text-gray-400 font-medium">No records found.</TableCell></TableRow>
              ) : filteredData.map((m: any) => (
                <TableRow key={m.id} className="hover:bg-gray-50/50">
                  {activeView === 'material-mapping' ? (
                    <>
                      <TableCell className="font-mono text-xs font-bold text-anflocor-green">{m.SAPC_Code}</TableCell>
                      <TableCell className="text-xs text-gray-600 font-medium">{m.KindOfPack}</TableCell>
                      <TableCell><span className="px-2 py-0.5 rounded text-xs font-bold bg-emerald-50 text-emerald-700">{m.SAPC_Type}</span></TableCell>
                      <TableCell className="text-gray-500 text-sm">{m.SAPC_Desc}</TableCell>
                    </>
                  ) : (activeView === 'port-of-loading' || activeView === 'port-of-destination') ? (
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
                      activeView === 'material-mapping' ? MATERIAL_PATH : 
                      activeView === 'port-of-loading' ? POL_PATH : 
                      activeView === 'port-of-destination' ? POD_PATH : CUSTOMER_PATH, m.id))} className="text-gray-400 hover:text-red-500">
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
      <aside className="w-64 bg-anflocor-green text-white flex flex-col shrink-0 shadow-xl no-print">
        <div className="p-6 flex items-center space-x-3 border-b border-white/10">
          <div className="bg-white/10 p-2 rounded-lg"><Leaf className="h-6 w-6" /></div>
          <span className="text-xl font-bold tracking-tighter">myProduce</span>
        </div>
        <nav className="flex-1 p-4 space-y-1">
          <Button variant="ghost" onClick={() => setActiveView('dashboard')} className={cn("w-full justify-start text-white hover:bg-white/10 transition-all", activeView === 'dashboard' && "bg-white/10 shadow-inner")}><LayoutDashboard className="mr-3 h-5 w-5" />Dashboard</Button>
          <Button variant="ghost" onClick={() => setActiveView('loading-advice')} className={cn("w-full justify-start text-white hover:bg-white/10 transition-all", (activeView === 'loading-advice' || activeView === 'contract-details' || activeView === 'cutting-order') && "bg-white/10 shadow-inner")}><FileCheck className="mr-3 h-5 w-5" />Loading Advice</Button>
          <Button variant="ghost" onClick={() => setActiveView('configuration')} className={cn("w-full justify-start text-white hover:bg-white/10 transition-all", activeView === 'configuration' && "bg-white/10 shadow-inner")}><Settings className="mr-3 h-5 w-5" />Configuration</Button>
        </nav>
        <div className="p-4 border-t border-white/10">
          <Button onClick={handleSignOut} variant="ghost" className="w-full justify-start text-white/70 hover:text-red-400 transition-colors"><LogOut className="mr-3 h-5 w-5" />Sign Out</Button>
        </div>
      </aside>
      <main className="flex-1 overflow-y-auto p-8 print:p-0">
        <header className="mb-8 flex justify-between items-end border-b pb-6 no-print">
          <div>
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
              {activeView === 'dashboard' ? 'Dashboard' : 
               activeView === 'configuration' ? 'System Configuration' : 
               activeView === 'loading-advice' ? 'Loading Advice' :
               activeView === 'contract-details' ? 'Loading Advice Details' :
               activeView === 'cutting-order' ? 'Cutting Order' :
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
      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          body {
            background-color: white !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          main {
            padding: 0 !important;
          }
          @page {
            margin: 1cm;
          }
        }
      `}</style>
    </div>
  );
}
