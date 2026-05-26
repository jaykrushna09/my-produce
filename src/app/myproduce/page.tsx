
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
  Scissors,
  TrendingUp,
  AlertCircle,
  History,
  Clock
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
  getDoc,
  where
} from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, useUser, useAuth } from '@/firebase';
import { signOut } from 'firebase/auth';
import * as XLSX from 'xlsx';
import { format, setISOWeek, startOfISOWeek, endOfISOWeek } from 'date-fns';

type ViewState = 'dashboard' | 'configuration' | 'customer-mapping' | 'material-mapping' | 'port-of-loading' | 'port-of-destination' | 'loading-advice' | 'contract-details' | 'cutting-order' | 'edit-cutting-orders' | 'bookings' | 'trips';

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

interface BookingRow {
  id: string;
  bookingNo: string;
  shippingLine: string;
  vesselName: string;
  pod: string;
  attachmentUrl?: string;
}

interface TripRow {
  id: string;
  ps: string;
  containerNo: string;
  vanNo: string;
  sealNo: string;
  atwStatus: 'Y' | 'N';
  atwReleased: string;
  pmNo: string;
  driverName: string;
  signature: 'Pending' | 'Signed';
  dateWithdrawn: string;
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
  
  // State for forms
  const [isNewLAOpen, setIsNewLAOpen] = useState(false);
  const [newLAHeader, setNewLAHeader] = useState({ customerName: '', weekNumber: '' });
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

  const [isNewBookingOpen, setIsNewBookingOpen] = useState(false);
  const [newBookingHeader, setNewBookingHeader] = useState({ customerName: '', weekNumber: '' });
  const [bookingRows, setBookingRows] = useState<BookingRow[]>([{
    id: Math.random().toString(36).substr(2, 9),
    bookingNo: '',
    shippingLine: '',
    vesselName: '',
    pod: ''
  }]);

  const [isNewTripOpen, setIsNewTripOpen] = useState(false);
  const [tripStep, setTripStep] = useState<1 | 2>(1);
  const [newTripHeader, setNewTripHeader] = useState({ 
    customerName: '', 
    weekNumber: '',
    bookingNo: '',
    shippingLine: '',
    vessel: '',
    pod: ''
  });
  const [tripRows, setTripRows] = useState<TripRow[]>([{
    id: Math.random().toString(36).substr(2, 9),
    ps: '1',
    containerNo: '',
    vanNo: '',
    sealNo: '',
    atwStatus: 'Y',
    atwReleased: format(new Date(), 'yyyy-MM-dd'),
    pmNo: '',
    driverName: '',
    signature: 'Pending',
    dateWithdrawn: format(new Date(), 'yyyy-MM-dd')
  }]);

  const [bindCoRows, setBindCoRows] = useState<CORow[]>([]);

  const [coRows, setCoRows] = useState<CORow[]>([]);

  const CUSTOMER_PATH = 'app_configuration/customer_mapping/customer_saving';
  const MATERIAL_PATH = 'app_configuration/material_mapping/material_saving';
  const POL_PATH = 'app_configuration/pol_mapping/pol_saving';
  const POD_PATH = 'app_configuration/pod_mapping/pod_saving';
  const CONTRACT_PATH = 'app_data/contracts/contract_saving';
  const BOOKING_PATH = 'app_data/bookings/booking_saving';
  const TRIP_PATH = 'app_data/trips/trip_saving';

  const customerMappingsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, CUSTOMER_PATH), orderBy('Customer', 'asc'));
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

  const bookingsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, BOOKING_PATH), orderBy('receivedAt', 'desc'));
  }, [db]);

  const tripsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, TRIP_PATH), orderBy('updatedAt', 'desc'));
  }, [db]);

  const contractItemsQuery = useMemoFirebase(() => {
    if (!db || !selectedContractId) return null;
    return query(collection(db, `${CONTRACT_PATH}/${selectedContractId}/items`));
  }, [db, selectedContractId]);

  const { data: customerMappings } = useCollection(customerMappingsQuery);
  const { data: polMappings } = useCollection(polMappingsQuery);
  const { data: podMappings } = useCollection(podMappingsQuery);
  const { data: contracts, loading: contractsLoading } = useCollection(contractsQuery);
  const { data: contractItems } = useCollection(contractItemsQuery);
  const { data: bookings, loading: bookingsLoading } = useCollection(bookingsQuery);
  const { data: trips, loading: tripsLoading } = useCollection(tripsQuery);

  const weekOptions = useMemo(() => {
    const options = [];
    for (let i = 1; i <= 52; i++) options.push(i.toString());
    return options;
  }, []);

  const handleSignOut = async () => {
    if (auth) {
      await signOut(auth);
      router.push('/');
    }
  };

  // LA Handlers
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
    if (laRows.length > 1) setLaRows(laRows.filter(r => r.id !== id));
  };

  const handleSubmitBatch = async () => {
    if (!db || !newLAHeader.customerName || !newLAHeader.weekNumber) {
      toast({ variant: "destructive", title: "Error", description: "Please complete the header details." });
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
        farm: 'TADECO', pol: 'DAVAO', pod: '', shippingLine: '',
        cutOffDate: '', etd: '', totalVans: 0, skuCode: '', palletizedType: 'Palletized'
      }]);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Submission Error", description: err.message });
    }
  };

  // Booking Handlers
  const addBookingRow = () => {
    setBookingRows([...bookingRows, {
      id: Math.random().toString(36).substr(2, 9),
      bookingNo: '', shippingLine: '', vesselName: '', pod: ''
    }]);
  };

  const updateBookingRow = (id: string, updates: Partial<BookingRow>) => {
    setBookingRows(bookingRows.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const removeBookingRow = (id: string) => {
    if (bookingRows.length > 1) setBookingRows(bookingRows.filter(r => r.id !== id));
  };

  const handleSubmitBookingBatch = async () => {
    if (!db || !newBookingHeader.customerName || !newBookingHeader.weekNumber) {
      toast({ variant: "destructive", title: "Error", description: "Please complete the header details." });
      return;
    }
    try {
      const batch = writeBatch(db);
      bookingRows.forEach((row, index) => {
        const uniqueId = `BK-${Date.now()}-${index}`;
        const docRef = doc(db, BOOKING_PATH, uniqueId);
        batch.set(docRef, {
          batchId: uniqueId,
          customerName: newBookingHeader.customerName,
          weekNumber: newBookingHeader.weekNumber,
          bookingNumber: row.bookingNo,
          shippingLine: row.shippingLine,
          vesselName: row.vesselName,
          pod: row.pod,
          receivedAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      });
      await batch.commit();
      toast({ title: "Success", description: "Booking records created successfully." });
      setIsNewBookingOpen(false);
      setBookingRows([{ id: Math.random().toString(36).substr(2, 9), bookingNo: '', shippingLine: '', vesselName: '', pod: '' }]);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  // Trip Handlers
  const addTripRow = () => {
    setTripRows([...tripRows, {
      id: Math.random().toString(36).substr(2, 9),
      ps: (tripRows.length + 1).toString(),
      containerNo: '',
      vanNo: '',
      sealNo: '',
      atwStatus: 'Y',
      atwReleased: format(new Date(), 'yyyy-MM-dd'),
      pmNo: '',
      driverName: '',
      signature: 'Pending',
      dateWithdrawn: format(new Date(), 'yyyy-MM-dd')
    }]);
  };

  const updateTripRow = (id: string, updates: Partial<TripRow>) => {
    setTripRows(tripRows.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const removeTripRow = (id: string) => {
    if (tripRows.length > 1) setTripRows(tripRows.filter(r => r.id !== id));
  };

  const handleNextTripStep = async () => {
    if (!newTripHeader.customerName || !newTripHeader.weekNumber || !newTripHeader.pod) {
      toast({ variant: "destructive", title: "Error", description: "Please complete the header details (Customer, Week, POD) before binding." });
      return;
    }

    // Prepare Step 2 rows based on existing Loading Advice items
    const matchingContracts = contracts.filter(c => 
      c.customerName === newTripHeader.customerName && 
      c.weekNumber === newTripHeader.weekNumber
    );

    let bindings: CORow[] = [];

    if (matchingContracts.length > 0) {
      // In a real environment, we'd fetch actual items here. 
      // For now, we'll generate mock bindings so the user can see the second step regardless.
      bindings = matchingContracts.map((c, i) => ({
        id: `BIND-${Date.now()}-${i}`,
        ps: 'PS',
        shippingLine: newTripHeader.shippingLine || '',
        bookingNo: newTripHeader.bookingNo || '',
        containerNo: '',
        atwStatus: 'PENDING',
        pod: newTripHeader.pod,
        cutOffDate: c.cutOffDate || format(new Date(), 'yyyy-MM-dd'),
        etd: c.etd || format(new Date(), 'yyyy-MM-dd'),
        sku: c.skuSummary || 'SKU-PROTOTYPE',
        palletization: c.palletizedType || 'Palletized'
      }));
    } else {
      // If no real LA found, generate at least one mock binding so the UI can be tested
      bindings = [{
        id: `MOCK-${Date.now()}`,
        ps: 'PS',
        shippingLine: newTripHeader.shippingLine || 'OOCL',
        bookingNo: newTripHeader.bookingNo || 'BK-MOCK-123',
        containerNo: '',
        atwStatus: 'PENDING',
        pod: newTripHeader.pod,
        cutOffDate: format(new Date(), 'yyyy-MM-dd'),
        etd: format(new Date(), 'yyyy-MM-dd'),
        sku: 'SKU-001',
        palletization: 'Palletized'
      }];
      toast({ title: "LA Not Found", description: "Using mock items for Step 2 visualization." });
    }
    
    setBindCoRows(bindings);
    setTripStep(2);
  };

  const handleSubmitTripBatch = async () => {
    if (!db || !newTripHeader.customerName || !newTripHeader.weekNumber) {
      toast({ variant: "destructive", title: "Error", description: "Please complete the header details." });
      return;
    }
    try {
      const batch = writeBatch(db);
      tripRows.forEach((row, index) => {
        const uniqueId = `TRIP-${Date.now()}-${index}`;
        const docRef = doc(db, TRIP_PATH, uniqueId);
        batch.set(docRef, {
          tripId: uniqueId,
          vanNo: row.vanNo,
          pmNo: row.pmNo,
          containerNo: row.containerNo,
          sealNo: row.sealNo,
          driver: row.driverName,
          dateAtwReleased: row.atwReleased,
          dateWithdrawn: row.dateWithdrawn,
          customerName: newTripHeader.customerName,
          weekNumber: newTripHeader.weekNumber,
          bookingNo: newTripHeader.bookingNo,
          shippingLine: newTripHeader.shippingLine,
          vessel: newTripHeader.vessel,
          pod: newTripHeader.pod,
          status: 'active',
          updatedAt: serverTimestamp()
        });
      });
      await batch.commit();
      toast({ title: "Success", description: "Trip records finalized." });
      setIsNewTripOpen(false);
      setTripStep(1);
      setTripRows([{
        id: Math.random().toString(36).substr(2, 9),
        ps: '1', containerNo: '', vanNo: '', sealNo: '',
        atwStatus: 'Y', atwReleased: format(new Date(), 'yyyy-MM-dd'),
        pmNo: '', driverName: '', signature: 'Pending',
        dateWithdrawn: format(new Date(), 'yyyy-MM-dd')
      }]);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  const filteredContracts = useMemo(() => {
    return contracts.filter(c => {
      const matchesSearch = String(c.customerName || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesWeek = weekFilter === 'all' || c.weekNumber === weekFilter;
      const matchesCustomer = customerFilter === 'all' || c.customerName === customerFilter;
      return matchesSearch && matchesWeek && matchesCustomer;
    });
  }, [contracts, searchTerm, weekFilter, customerFilter]);

  const uniqueWeeks = useMemo(() => {
    return Array.from(new Set(contracts.map(c => c.weekNumber))).filter(Boolean).sort();
  }, [contracts]);

  const renderEditCuttingOrders = () => {
    const contract = contracts.find(c => c.id === selectedContractId);
    if (!contract) return null;

    const podStats = (podMappings as any[]).map(p => {
      const target = contractItems.filter((i: any) => i.pod === p.portName).reduce((acc: number, curr: any) => acc + (curr.total || 0), 0);
      const allocated = coRows.filter(r => r.pod === p.portName && r.containerNo).length;
      return { name: p.portName, target, allocated };
    }).filter(s => s.target > 0);

    const totalTarget = podStats.reduce((acc, curr) => acc + curr.target, 0);

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500 max-w-[1400px] mx-auto pb-12">
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="p-6 border-b flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-green-50 p-2 rounded-lg text-anflocor-green"><Scissors className="h-6 w-6" /></div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Edit COs for this LA</h2>
                <p className="text-xs text-gray-500 font-medium">Batch entry for Cutting Orders linked to Loading Advice: <span className="font-bold text-gray-900">{contract.contractId}</span></p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setActiveView('loading-advice')} className="rounded-full text-gray-400"><X className="h-5 w-5" /></Button>
          </div>

          <div className="p-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Customer</Label>
                <div className="h-12 bg-gray-50 border border-gray-100 rounded-lg flex items-center px-4 font-bold text-gray-700 uppercase">{contract.customerName}</div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Week No</Label>
                <div className="h-12 bg-gray-50 border border-gray-100 rounded-lg flex items-center px-4 font-bold text-gray-700">{contract.weekNumber}</div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">POD</Label>
                <div className="h-12 bg-gray-50 border border-gray-100 rounded-lg flex items-center px-4 font-bold text-gray-700 uppercase">{contract.pod || '--'}</div>
              </div>
            </div>

            <div className="space-y-4 bg-gray-50/50 p-6 rounded-xl border border-gray-100/50">
              <Label className="text-[10px] font-black uppercase text-gray-400 tracking-widest">Containers Allocated</Label>
              <div className="flex flex-wrap items-center gap-4">
                {podStats.map(stat => (
                  <div key={stat.name} className="w-[180px] bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                    <span className="text-[9px] font-black uppercase text-gray-300 block mb-1">{stat.name}</span>
                    <span className="text-2xl font-bold text-gray-900">{stat.allocated}/{stat.target}</span>
                  </div>
                ))}
                <div className="ml-auto bg-black text-white rounded-lg p-5 min-w-[240px] shadow-lg">
                   <span className="text-[9px] font-black uppercase text-gray-500 block mb-1">Total Allocation</span>
                   <span className="text-lg font-bold">Total for week {contract.weekNumber || '0'} : {totalTarget}</span>
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
                    <TableHead className="w-32 text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {coRows.map((row, index) => (
                    <TableRow key={row.id} className="h-16 hover:bg-gray-50/50">
                      <TableCell className="text-center font-bold text-gray-400">{index + 1}</TableCell>
                      <TableCell>
                        <Select value={row.ps} onValueChange={(val) => setCoRows(coRows.map(r => r.id === row.id ? { ...r, ps: val } : r))}>
                          <SelectTrigger className="h-9 border-none bg-transparent shadow-none font-bold text-gray-700"><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="PS">PS</SelectItem><SelectItem value="REG">REG</SelectItem></SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <Select value={row.shippingLine} onValueChange={(val) => setCoRows(coRows.map(r => r.id === row.id ? { ...r, shippingLine: val } : r))}>
                          <SelectTrigger className="h-9 border-none bg-transparent shadow-none font-bold text-gray-700"><SelectValue /></SelectTrigger>
                          <SelectContent><SelectItem value="OOCL">OOCL</SelectItem><SelectItem value="MSC">MSC</SelectItem><SelectItem value="MAERSK">MAERSK</SelectItem></SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell><Input placeholder="Booking No" value={row.bookingNo} onChange={(e) => setCoRows(coRows.map(r => r.id === row.id ? { ...r, bookingNo: e.target.value } : r))} className="h-9 border-none bg-transparent shadow-none font-medium"/></TableCell>
                      <TableCell><Input placeholder="Container No" value={row.containerNo} onChange={(e) => setCoRows(coRows.map(r => r.id === row.id ? { ...r, containerNo: e.target.value } : r))} className="h-9 border-none bg-transparent shadow-none font-bold"/></TableCell>
                      <TableCell className="text-center">
                        <Badge className={cn("text-[9px] font-black px-2 cursor-pointer", row.atwStatus === 'PENDING' ? "bg-red-100 text-red-500" : "bg-green-100 text-green-600")} variant="outline" onClick={() => setCoRows(coRows.map(r => r.id === row.id ? { ...r, atwStatus: r.atwStatus === 'PENDING' ? 'READY' : 'PENDING' } : r))}>
                          {row.atwStatus}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Select value={row.pod} onValueChange={(val) => setCoRows(coRows.map(r => r.id === row.id ? { ...r, pod: val } : r))}>
                          <SelectTrigger className="h-9 border-none bg-transparent shadow-none font-bold text-gray-500 uppercase text-[11px]"><SelectValue /></SelectTrigger>
                          <SelectContent>{podMappings.map((p: any) => (<SelectItem key={p.id} value={p.portName}>{p.portName}</SelectItem>))}</SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-200 hover:text-red-400" onClick={() => setCoRows(coRows.filter(r => r.id !== row.id))}><Trash2 className="h-4 w-4" /></Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

          <div className="p-8 border-t bg-gray-50/50 flex items-center justify-end gap-4">
            <Button variant="outline" onClick={() => setActiveView('loading-advice')} className="h-12 px-8 font-bold text-gray-400 border-gray-200 uppercase text-xs">CANCEL</Button>
            <Button onClick={async () => {
              if (!db || !selectedContractId) return;
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
                  updatedAt: serverTimestamp()
                }, { merge: true });
              });
              await batch.commit();
              toast({ title: "COs Updated", description: "All cutting order allocations saved successfully." });
              setActiveView('loading-advice');
            }} className="h-12 px-12 bg-anflocor-green hover:bg-anflocor-green/90 text-white font-bold uppercase text-xs">SUBMIT</Button>
          </div>
        </div>
      </div>
    );
  };

  const renderLoadingAdviceView = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div className="w-64">
          <Select value={weekFilter} onValueChange={setWeekFilter}>
            <SelectTrigger><SelectValue placeholder="Select Week" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Weeks</SelectItem>{uniqueWeeks.map(w => (<SelectItem key={w} value={w}>{w}</SelectItem>))}</SelectContent>
          </Select>
        </div>
        <div className="w-64">
          <Select value={customerFilter} onValueChange={setCustomerFilter}>
            <SelectTrigger><SelectValue placeholder="Select Customer" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Customers</SelectItem>{customerMappings.map((c: any) => (<SelectItem key={c.id} value={c.Customer}>{c.Customer}</SelectItem>))}</SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Loading Advice</h2>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="text-xs font-bold" onClick={() => { 
            if (selectedContractId) {
              setCoRows(contractItems.map((item: any) => ({
                id: item.itemId || item.id,
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
              setActiveView('edit-cutting-orders');
            } else {
              toast({ variant: "destructive", title: "Select an LA", description: "Please select an advice record from the list first." });
            }
          }}>CREATE/VIEW COS</Button>
          <Button className="bg-anflocor-green hover:bg-anflocor-green/90 text-white font-bold text-xs" onClick={() => setIsNewLAOpen(true)}><Plus className="mr-2 h-4 w-4" /> NEW LA</Button>
        </div>
      </div>

      <Card className="border-gray-200 shadow-sm bg-white overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-100/50">
            <TableRow>
              <TableHead className="text-[10px] font-black uppercase">WEEK</TableHead>
              <TableHead className="text-[10px] font-black uppercase">CUSTOMER</TableHead>
              <TableHead className="text-[10px] font-black uppercase">FARM</TableHead>
              <TableHead className="text-[10px] font-black uppercase text-center">VANS</TableHead>
              <TableHead className="text-[10px] font-black uppercase">STATUS</TableHead>
              <TableHead className="text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {contractsLoading ? (
              <TableRow><TableCell colSpan={6} className="h-48 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-anflocor-green opacity-40" /></TableCell></TableRow>
            ) : filteredContracts.map((c: any) => (
              <TableRow key={c.id} className={cn("hover:bg-gray-50/80 cursor-pointer h-16 group", selectedContractId === c.id && "bg-green-50/50 border-l-4 border-l-anflocor-green")} onClick={() => setSelectedContractId(c.id)}>
                <TableCell className="font-bold">{c.weekNumber}</TableCell>
                <TableCell className="text-sm font-bold">{c.customerName}</TableCell>
                <TableCell className="text-xs">{c.farm}</TableCell>
                <TableCell className="text-center font-black text-indigo-700">{c.totalVans}</TableCell>
                <TableCell><Badge className={cn("text-[10px] font-black", c.status === 'completed' ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700")} variant="outline">{c.status?.toUpperCase()}</Badge></TableCell>
                <TableCell className="text-right"><Button variant="ghost" size="icon" className="opacity-0 group-hover:opacity-100"><ChevronRight className="h-4 w-4" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      
      {/* New LA Modal */}
      <Dialog open={isNewLAOpen} onOpenChange={setIsNewLAOpen}>
        <DialogContent className="max-w-[95vw] w-full p-0">
          <div className="p-6 border-b"><DialogTitle className="text-xl font-bold">New Loading Advice</DialogTitle></div>
          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-gray-400">Customer</Label>
                <Select value={newLAHeader.customerName} onValueChange={(val) => setNewLAHeader({...newLAHeader, customerName: val})}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="Select Customer" /></SelectTrigger>
                  <SelectContent>{customerMappings.map((c: any) => (<SelectItem key={c.id} value={c.Customer}>{c.Customer}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-gray-400">Week No</Label>
                <Select value={newLAHeader.weekNumber} onValueChange={(val) => setNewLAHeader({...newLAHeader, weekNumber: val})}>
                  <SelectTrigger className="h-10"><SelectValue placeholder="Select Week" /></SelectTrigger>
                  <SelectContent>{weekOptions.map(w => (<SelectItem key={w} value={w}>{w}</SelectItem>))}</SelectContent>
                </Select>
              </div>
            </div>
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="text-[10px] font-black uppercase">Farm</TableHead>
                  <TableHead className="text-[10px] font-black uppercase">POL</TableHead>
                  <TableHead className="text-[10px] font-black uppercase">POD</TableHead>
                  <TableHead className="text-[10px] font-black uppercase">Vans</TableHead>
                  <TableHead className="text-[10px] font-black uppercase">SKU</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {laRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell><Input className="h-8 text-xs" value={row.farm} onChange={(e) => updateLARow(row.id, { farm: e.target.value })}/></TableCell>
                    <TableCell><Input className="h-8 text-xs" value={row.pol} onChange={(e) => updateLARow(row.id, { pol: e.target.value })}/></TableCell>
                    <TableCell><Input className="h-8 text-xs" value={row.pod} onChange={(e) => updateLARow(row.id, { pod: e.target.value })}/></TableCell>
                    <TableCell><Input type="number" className="h-8 text-xs w-20" value={row.totalVans} onChange={(e) => updateLARow(row.id, { totalVans: parseInt(e.target.value) || 0 })}/></TableCell>
                    <TableCell><Input className="h-8 text-xs" value={row.skuCode} onChange={(e) => updateLARow(row.id, { skuCode: e.target.value })}/></TableCell>
                    <TableCell><Button variant="ghost" size="icon" onClick={() => removeLARow(row.id)} className="h-8 w-8 text-red-400"><Trash2 className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Button variant="ghost" className="text-anflocor-green text-xs font-bold" onClick={addLARow}><Plus className="h-4 w-4 mr-2" /> Add Row</Button>
          </div>
          <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setIsNewLAOpen(false)} className="text-[10px] font-black uppercase">CANCEL</Button>
            <Button className="bg-anflocor-green text-white text-[10px] font-black uppercase px-8" onClick={handleSubmitBatch}>SUBMIT</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );

  const renderBookingsView = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100">
        <h2 className="text-2xl font-bold">Bookings</h2>
        <Button className="bg-anflocor-green hover:bg-anflocor-green/90 text-white font-bold text-xs" onClick={() => setIsNewBookingOpen(true)}><Plus className="mr-2 h-4 w-4" /> NEW BOOKING</Button>
      </div>
      
      <Card className="border-gray-200 shadow-sm bg-white overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50/50">
            <TableRow>
              <TableHead className="text-[10px] font-black uppercase">BOOKING NO</TableHead>
              <TableHead className="text-[10px] font-black uppercase">SHIPPING LINE</TableHead>
              <TableHead className="text-[10px] font-black uppercase">VESSEL</TableHead>
              <TableHead className="text-[10px] font-black uppercase">POD</TableHead>
              <TableHead className="text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {bookingsLoading ? (
              <TableRow><TableCell colSpan={5} className="h-48 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-anflocor-green opacity-40" /></TableCell></TableRow>
            ) : bookings.map((b: any) => (
              <TableRow key={b.id} className="h-16">
                <TableCell className="font-bold text-anflocor-green">{b.bookingNumber}</TableCell>
                <TableCell className="text-sm">{b.shippingLine}</TableCell>
                <TableCell className="text-sm italic">{b.vesselName}</TableCell>
                <TableCell className="text-sm font-black uppercase">{b.pod}</TableCell>
                <TableCell className="text-right"><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* New Booking Modal */}
      <Dialog open={isNewBookingOpen} onOpenChange={setIsNewBookingOpen}>
        <DialogContent className="max-w-[95vw] w-full p-0">
          <div className="p-4 bg-gray-50 border-b border-l-4 border-l-green-600"><p className="text-sm font-medium">Please ensure all manifest details match the physical Bill of Lading.</p></div>
          <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-8">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-gray-400">Customer</Label>
                <Select value={newBookingHeader.customerName} onValueChange={(val) => setNewBookingHeader({...newBookingHeader, customerName: val})}>
                  <SelectTrigger className="h-12 bg-gray-50"><SelectValue placeholder="Select Customer" /></SelectTrigger>
                  <SelectContent>{customerMappings.map((c: any) => (<SelectItem key={c.id} value={c.Customer}>{c.Customer}</SelectItem>))}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-gray-400">Week No</Label>
                <Select value={newBookingHeader.weekNumber} onValueChange={(val) => setNewBookingHeader({...newBookingHeader, weekNumber: val})}>
                  <SelectTrigger className="h-12 bg-gray-50"><SelectValue placeholder="Select Week" /></SelectTrigger>
                  <SelectContent>{weekOptions.map(w => (<SelectItem key={w} value={w}>{w}</SelectItem>))}</SelectContent>
                </Select>
              </div>
            </div>
            <Table>
              <TableHeader className="bg-gray-100">
                <TableRow>
                  <TableHead className="text-[10px] font-black uppercase">Booking No.</TableHead>
                  <TableHead className="text-[10px] font-black uppercase">Shipping Line</TableHead>
                  <TableHead className="text-[10px] font-black uppercase">Vessel</TableHead>
                  <TableHead className="text-[10px] font-black uppercase">POD</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookingRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell><Input value={row.bookingNo} onChange={(e) => updateBookingRow(row.id, { bookingNo: e.target.value })} className="h-10"/></TableCell>
                    <TableCell><Input value={row.shippingLine} onChange={(e) => updateBookingRow(row.id, { shippingLine: e.target.value })} className="h-10"/></TableCell>
                    <TableCell><Input value={row.vesselName} onChange={(e) => updateBookingRow(row.id, { vesselName: e.target.value })} className="h-10"/></TableCell>
                    <TableCell><Input value={row.pod} onChange={(e) => updateBookingRow(row.id, { pod: e.target.value })} className="h-10"/></TableCell>
                    <TableCell><Button variant="ghost" size="icon" onClick={() => removeBookingRow(row.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <Button variant="ghost" className="text-anflocor-green text-xs font-bold" onClick={addBookingRow}><Plus className="h-4 w-4 mr-2" /> Add Row</Button>
          </div>
          <div className="p-6 border-t bg-gray-50 flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setIsNewBookingOpen(false)} className="text-[10px] font-black uppercase">CANCEL</Button>
            <Button className="bg-anflocor-green text-white text-[10px] font-black uppercase px-8" onClick={handleSubmitBookingBatch}>SUBMIT</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );

  const renderTripsView = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100">
        <div>
           <div className="flex items-center text-xs text-gray-400 gap-2 mb-1">
             <span>Logistics</span><ChevronRight className="h-3 w-3" /><span className="text-gray-900 font-medium">Trips</span>
           </div>
           <h2 className="text-2xl font-bold">Trips</h2>
        </div>
        <div className="flex gap-4">
           <Select value={weekFilter} onValueChange={setWeekFilter}><SelectTrigger className="w-40"><SelectValue placeholder="Week" /></SelectTrigger><SelectContent><SelectItem value="all">All Weeks</SelectItem>{weekOptions.map(w => (<SelectItem key={w} value={w}>{w}</SelectItem>))}</SelectContent></Select>
           <Button className="bg-anflocor-green hover:bg-anflocor-green/90 text-white font-bold text-xs" onClick={() => { setTripStep(1); setIsNewTripOpen(true); }}><Plus className="mr-2 h-4 w-4" /> NEW TRIP</Button>
        </div>
      </div>

      <Card className="border-gray-200 shadow-sm bg-white overflow-hidden">
        <Table>
          <TableHeader className="bg-gray-50/50">
            <TableRow>
              <TableHead className="text-[10px] font-black uppercase">VAN NO.</TableHead>
              <TableHead className="text-[10px] font-black uppercase">PM NO.</TableHead>
              <TableHead className="text-[10px] font-black uppercase">CONTAINER NO.</TableHead>
              <TableHead className="text-[10px] font-black uppercase">DRIVER</TableHead>
              <TableHead className="text-[10px] font-black uppercase">RELEASED</TableHead>
              <TableHead className="text-right"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tripsLoading ? (
              <TableRow><TableCell colSpan={6} className="h-48 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-anflocor-green opacity-40" /></TableCell></TableRow>
            ) : trips.map((t: any) => (
              <TableRow key={t.id} className="h-16">
                <TableCell className="font-bold">{t.vanNo}</TableCell>
                <TableCell className="text-sm text-gray-500">{t.pmNo}</TableCell>
                <TableCell className="font-bold">{t.containerNo}</TableCell>
                <TableCell className="text-sm font-medium">{t.driver}</TableCell>
                <TableCell className="text-xs text-gray-400">{t.dateAtwReleased}</TableCell>
                <TableCell className="text-right"><Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>

      {/* New Trip Modal */}
      <Dialog open={isNewTripOpen} onOpenChange={(open) => { setIsNewTripOpen(open); if(!open) setTripStep(1); }}>
        <DialogContent className="max-w-[95vw] w-full p-0 overflow-hidden">
          <div className="bg-white">
            <div className="p-4 border-b bg-gray-50 border-l-4 border-l-green-600">
               <p className="text-sm font-medium">Please ensure all trip details match the physical manifest.</p>
            </div>
            
            <ScrollArea className="max-h-[80vh]">
              <div className="p-8 space-y-8 pb-24">
                {/* Workflow Stepper */}
                <div className="flex items-center justify-center max-w-2xl mx-auto mb-8">
                  <div className="flex flex-col items-center">
                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center font-bold mb-2", tripStep === 1 ? "bg-anflocor-green text-white" : "bg-green-100 text-green-700")}>1</div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-anflocor-green">CONTAINERS</span>
                  </div>
                  <div className={cn("w-24 h-[2px] mx-4 mb-6", tripStep === 2 ? "bg-anflocor-green" : "bg-gray-100")}></div>
                  <div className="flex flex-col items-center">
                    <div className={cn("w-10 h-10 rounded-full flex items-center justify-center font-bold mb-2", tripStep === 2 ? "bg-anflocor-green text-white" : "bg-gray-200 text-gray-500")}>2</div>
                    <span className={cn("text-[10px] font-black uppercase tracking-widest", tripStep === 2 ? "text-anflocor-green" : "text-gray-500")}>BIND CUTTING ORDER</span>
                  </div>
                </div>

                {tripStep === 1 ? (
                  <>
                    <div className="grid grid-cols-2 gap-8 border-b pb-8">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-gray-400">Customer</Label>
                        <Select value={newTripHeader.customerName} onValueChange={(val) => setNewTripHeader({...newTripHeader, customerName: val})}>
                          <SelectTrigger className="h-12 bg-gray-50"><SelectValue placeholder="Select Customer" /></SelectTrigger>
                          <SelectContent>{customerMappings.map((c: any) => (<SelectItem key={c.id} value={c.Customer}>{c.Customer}</SelectItem>))}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-gray-400">Week Number</Label>
                        <Input className="h-12 bg-gray-50" value={newTripHeader.weekNumber} onChange={(e) => setNewTripHeader({...newTripHeader, weekNumber: e.target.value})} />
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4 bg-gray-50/50 p-6 rounded-xl border">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-black uppercase text-gray-300">Booking No</Label>
                        <Select value={newTripHeader.bookingNo} onValueChange={(val) => {
                          const b = bookings.find((bk: any) => bk.bookingNumber === val);
                          if (b) setNewTripHeader({...newTripHeader, bookingNo: val, shippingLine: b.shippingLine, vessel: b.vesselName, pod: b.pod });
                          else setNewTripHeader({...newTripHeader, bookingNo: val});
                        }}>
                          <SelectTrigger className="h-10"><SelectValue placeholder="--Select--" /></SelectTrigger>
                          <SelectContent>{bookings.map((b: any) => (<SelectItem key={b.id} value={b.bookingNumber}>{b.bookingNumber}</SelectItem>))}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-gray-300">Shipping Line</Label><Input className="h-10 bg-white" value={newTripHeader.shippingLine} readOnly /></div>
                      <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-gray-300">Vessel</Label><Input className="h-10 bg-white" value={newTripHeader.vessel} readOnly /></div>
                      <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-gray-300">POD</Label><Input className="h-10 bg-white" value={newTripHeader.pod} readOnly /></div>
                    </div>

                    <Table>
                      <TableHeader className="bg-gray-100">
                        <TableRow>
                          <TableHead className="w-12 text-center text-[9px] font-black uppercase">PS</TableHead>
                          <TableHead className="text-[9px] font-black uppercase">Container No.</TableHead>
                          <TableHead className="text-[9px] font-black uppercase">Van No.</TableHead>
                          <TableHead className="text-[9px] font-black uppercase text-center">ATW</TableHead>
                          <TableHead className="text-[9px] font-black uppercase">PM No.</TableHead>
                          <TableHead className="text-[9px] font-black uppercase">Driver</TableHead>
                          <TableHead className="w-12"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tripRows.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell className="text-center font-bold text-gray-400">{row.ps}</TableCell>
                            <TableCell><Input className="h-9 uppercase font-bold" value={row.containerNo} onChange={(e) => updateTripRow(row.id, { containerNo: e.target.value })}/></TableCell>
                            <TableCell><Input className="h-9 uppercase" value={row.vanNo} onChange={(e) => updateTripRow(row.id, { vanNo: e.target.value })}/></TableCell>
                            <TableCell className="text-center"><Badge variant="outline" className="cursor-pointer" onClick={() => updateTripRow(row.id, { atwStatus: row.atwStatus === 'Y' ? 'N' : 'Y' })}>{row.atwStatus}</Badge></TableCell>
                            <TableCell><Input className="h-9" value={row.pmNo} onChange={(e) => updateTripRow(row.id, { pmNo: e.target.value })}/></TableCell>
                            <TableCell><Input className="h-9" value={row.driverName} onChange={(e) => updateTripRow(row.id, { driverName: e.target.value })}/></TableCell>
                            <TableCell><Button variant="ghost" size="icon" onClick={() => removeTripRow(row.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                    <Button variant="ghost" className="text-anflocor-green text-xs font-bold" onClick={addTripRow}><Plus className="h-4 w-4 mr-2" /> Add Row</Button>
                  </>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-8">
                      <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-gray-400">Customer</Label><Input className="h-12 bg-gray-50 font-bold" value={newTripHeader.customerName} readOnly /></div>
                      <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-gray-400">Week Number</Label><Input className="h-12 bg-gray-50 font-bold" value={newTripHeader.weekNumber} readOnly /></div>
                      <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-gray-400">Shipping Line</Label><Input className="h-12 bg-gray-50 font-bold" value={newTripHeader.shippingLine} readOnly /></div>
                      <div className="space-y-2"><Label className="text-[10px] font-black uppercase text-gray-400">POD</Label><Input className="h-12 bg-gray-50 font-bold" value={newTripHeader.pod} readOnly /></div>
                    </div>

                    <div className="bg-gray-50 p-6 rounded-xl border flex flex-wrap gap-4 items-center">
                       <div className="w-[180px] bg-white border rounded-lg p-4 shadow-sm">
                          <span className="text-[9px] font-black uppercase text-gray-300 block mb-1">{newTripHeader.pod || 'PORT'}</span>
                          <span className="text-2xl font-bold">{bindCoRows.filter(r => r.containerNo).length}/{bindCoRows.length}</span>
                       </div>
                       <div className="ml-auto bg-black text-white rounded-lg p-5 min-w-[240px]">
                          <span className="text-[9px] font-black uppercase text-gray-500 block">Total for week {newTripHeader.weekNumber}</span>
                          <span className="text-lg font-bold">{bindCoRows.length} Containers</span>
                       </div>
                    </div>

                    <Table>
                      <TableHeader className="bg-gray-100">
                        <TableRow>
                          <TableHead className="w-12 text-[9px] font-black uppercase">#</TableHead>
                          <TableHead className="w-20 text-[9px] font-black uppercase">PS</TableHead>
                          <TableHead className="w-32 text-[9px] font-black uppercase">Cut-off</TableHead>
                          <TableHead className="text-[9px] font-black uppercase">Container No.</TableHead>
                          <TableHead className="w-12"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {bindCoRows.map((row, index) => (
                          <TableRow key={row.id}>
                            <TableCell className="text-[11px] font-bold text-gray-400">{index + 1}</TableCell>
                            <TableCell><Input className="h-9 bg-gray-50" value={row.ps} readOnly/></TableCell>
                            <TableCell><Input className="h-9 bg-gray-50" value={row.cutOffDate} readOnly/></TableCell>
                            <TableCell>
                              <Select value={row.containerNo} onValueChange={(val) => setBindCoRows(bindCoRows.map(r => r.id === row.id ? { ...r, containerNo: val } : r))}>
                                <SelectTrigger className="h-9 font-bold"><SelectValue placeholder="Select Container" /></SelectTrigger>
                                <SelectContent>{tripRows.map(tr => (<SelectItem key={tr.id} value={tr.containerNo}>{tr.containerNo}</SelectItem>))}</SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell><Button variant="ghost" size="icon" className="text-red-200"><Trash2 className="h-4 w-4" /></Button></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </>
                )}
              </div>
            </ScrollArea>

            <div className="p-6 border-t bg-gray-50 flex justify-end gap-3 absolute bottom-0 left-0 right-0 z-10">
              <Button variant="ghost" onClick={() => { setIsNewTripOpen(false); setTripStep(1); }} className="text-[10px] font-black uppercase">CANCEL</Button>
              {tripStep === 1 ? (
                <Button className="bg-anflocor-green text-white text-[10px] font-black uppercase px-8 h-10" onClick={handleNextTripStep}>NEXT STEP</Button>
              ) : (
                <Button className="bg-anflocor-green text-white text-[10px] font-black uppercase px-8 h-10 gap-2" onClick={handleSubmitTripBatch}>FINALIZE <CheckSquare className="h-4 w-4" /></Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );

  const renderContent = () => {
    if (activeView === 'dashboard') {
      return (
        <section className="animate-in fade-in slide-in-from-bottom-2 duration-500">
          <div className="flex items-center space-x-2 mb-6"><div className="h-8 w-1 bg-anflocor-green rounded-full" /><h2 className="text-xl font-bold text-gray-800">Production Overview</h2></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="bg-white border-l-4 border-l-indigo-700"><CardHeader className="pb-2"><CardDescription className="text-xs font-bold uppercase">Pending manifests</CardDescription></CardHeader><CardContent><p className="text-3xl font-black text-gray-900">{contracts.filter(c => c.status === 'pending').length}</p></CardContent></Card>
            <Card className="bg-white border-l-4 border-l-emerald-600"><CardHeader className="pb-2"><CardDescription className="text-xs font-bold uppercase">Active Bookings</CardDescription></CardHeader><CardContent><p className="text-3xl font-black text-gray-900">{bookings.length}</p></CardContent></Card>
            <Card className="bg-white border-l-4 border-l-amber-600"><CardHeader className="pb-2"><CardDescription className="text-xs font-bold uppercase">Active Trips</CardDescription></CardHeader><CardContent><p className="text-3xl font-black text-gray-900">{trips.length}</p></CardContent></Card>
          </div>
        </section>
      );
    }
    if (activeView === 'loading-advice') return renderLoadingAdviceView();
    if (activeView === 'edit-cutting-orders') return renderEditCuttingOrders();
    if (activeView === 'bookings') return renderBookingsView();
    if (activeView === 'trips') return renderTripsView();
    return <div className="p-12 text-center text-gray-400">View implementation pending.</div>;
  };

  const currentUserLabel = user?.displayName || user?.email?.split('@')[0] || 'User';

  return (
    <div className="flex h-screen bg-gray-50/50">
      <aside className="w-64 bg-anflocor-green text-white flex flex-col shrink-0 shadow-xl no-print">
        <div className="p-6 flex items-center space-x-3 border-b border-white/10"><div className="bg-white/10 p-2 rounded-lg"><Leaf className="h-6 w-6" /></div><span className="text-xl font-bold tracking-tighter">myProduce</span></div>
        <nav className="flex-1 p-4 space-y-1">
          <Button variant="ghost" onClick={() => setActiveView('dashboard')} className={cn("w-full justify-start text-white hover:bg-white/10", activeView === 'dashboard' && "bg-white/10")}><LayoutDashboard className="mr-3 h-5 w-5" />Dashboard</Button>
          <Button variant="ghost" onClick={() => setActiveView('loading-advice')} className={cn("w-full justify-start text-white hover:bg-white/10", (activeView === 'loading-advice' || activeView === 'edit-cutting-orders') && "bg-white/10")}><FileCheck className="mr-3 h-5 w-5" />Loading Advice</Button>
          <Button variant="ghost" onClick={() => setActiveView('bookings')} className={cn("w-full justify-start text-white hover:bg-white/10", activeView === 'bookings' && "bg-white/10")}><Ship className="mr-3 h-5 w-5" />Bookings</Button>
          <Button variant="ghost" onClick={() => setActiveView('trips')} className={cn("w-full justify-start text-white hover:bg-white/10", activeView === 'trips' && "bg-white/10")}><Truck className="mr-3 h-5 w-5" />Trips</Button>
          <Button variant="ghost" onClick={() => setActiveView('configuration')} className={cn("w-full justify-start text-white hover:bg-white/10", activeView === 'configuration' && "bg-white/10")}><Settings className="mr-3 h-5 w-5" />Configuration</Button>
        </nav>
        <div className="p-4 border-t border-white/10"><Button onClick={handleSignOut} variant="ghost" className="w-full justify-start text-white/70 hover:text-red-400"><LogOut className="mr-3 h-5 w-5" />Sign Out</Button></div>
      </aside>
      <main className="flex-1 overflow-y-auto p-8">
        <header className="mb-8 flex justify-between items-end border-b pb-6">
          <div>
            <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
              {activeView === 'dashboard' ? 'Dashboard' : 
               activeView === 'loading-advice' ? 'Loading Advice' :
               activeView === 'edit-cutting-orders' ? 'Edit Cutting Orders' : 
               activeView === 'bookings' ? 'Bookings' : 
               activeView === 'trips' ? 'Trips' : 'Portal'}
            </h1>
            <p className="text-gray-500 font-semibold mt-1">TADECO Agricultural Production Portal</p>
          </div>
          <div className="flex items-center space-x-3 text-sm text-gray-400 font-medium"><User className="h-4 w-4" /><span>{currentUserLabel} (Admin)</span></div>
        </header>
        {renderContent()}
      </main>
    </div>
  );
}
