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
  Calendar as CalendarIcon,
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
  Clock,
  ClipboardCheck,
  PackageCheck,
  Camera,
  Image as ImageIcon,
  LayoutGrid
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
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Tabs, 
  TabsContent, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
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
  pod: string;
  cutOffDate: string;
  etd: string;
  taskDate: string;
  sku: string;
  palletization: string;
  containerNo: string;
  shippingLine: string;
  bookingNo: string;
  atwStatus: 'PENDING' | 'READY' | 'LOADED';
}

interface BookingRow {
  id: string;
  bookingNo: string;
  shippingLine: string;
  vesselName: string;
  pod: string;
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

interface PalletItem {
  packType: string;
  qty: string;
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
  
  const [isNewLAOpen, setIsNewLAOpen] = useState(false);
  const [isNewBookingOpen, setIsNewBookingOpen] = useState(false);
  const [isNewTripOpen, setIsNewTripOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [selectedTripForTransfer, setSelectedTripForTransfer] = useState<any>(null);

  // VLS Specific State
  const [isVlsModalOpen, setIsVlsModalOpen] = useState(false);
  const [isPalletDetailsModalOpen, setIsPalletDetailsModalOpen] = useState(false);
  const [selectedPalletIndex, setSelectedPalletIndex] = useState<number | null>(null);
  const [vlsType, setVlsType] = useState<'palletized' | 'non-palletized'>('palletized');
  const [vlsManifest, setVlsManifest] = useState({
    datePrepared: format(new Date(), 'yyyy-MM-dd'),
    waybillNo: '',
    hauler: '',
    truckNo: '',
    plateNo: '',
    tripNo: '',
    vanNo: '',
    sealNo: '',
    gensetNo: '',
    tempSetting: ''
  });
  const [palletsData, setPalletsData] = useState<{[key: number]: PalletItem[]}>({});
  const [currentPalletRows, setCurrentPalletRows] = useState<PalletItem[]>([{ packType: '', qty: '' }]);
  
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
    ps: '1', containerNo: '', vanNo: '', sealNo: '',
    atwStatus: 'Y', atwReleased: format(new Date(), 'yyyy-MM-dd'),
    pmNo: '', driverName: '', signature: 'Pending',
    dateWithdrawn: format(new Date(), 'yyyy-MM-dd')
  }]);

  const [bindCoRows, setBindCoRows] = useState<CORow[]>([]);

  const CUSTOMER_PATH = 'app_configuration/customer_mapping/customer_saving';
  const POD_PATH = 'app_configuration/pod_mapping/pod_saving';
  const CONTRACT_PATH = 'app_data/contracts/contract_saving';
  const BOOKING_PATH = 'app_data/bookings/booking_saving';
  const TRIP_PATH = 'app_data/trips/trip_saving';

  const customerMappingsQuery = useMemoFirebase(() => {
    if (!db) return null;
    return query(collection(db, CUSTOMER_PATH), orderBy('Customer', 'asc'));
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

  const { data: customerMappings } = useCollection(customerMappingsQuery);
  const { data: podMappings } = useCollection(podMappingsQuery);
  const { data: contracts, loading: contractsLoading } = useCollection(contractsQuery);
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

  const addTripRow = () => {
    setTripRows([...tripRows, {
      id: Math.random().toString(36).substr(2, 9),
      ps: (tripRows.length + 1).toString(),
      containerNo: '', vanNo: '', sealNo: '',
      atwStatus: 'Y', atwReleased: format(new Date(), 'yyyy-MM-dd'),
      pmNo: '', driverName: '', signature: 'Pending',
      dateWithdrawn: format(new Date(), 'yyyy-MM-dd')
    }]);
  };

  const updateTripRow = (id: string, updates: Partial<TripRow>) => {
    setTripRows(tripRows.map(r => r.id === id ? { ...r, ...updates } : r));
  };

  const removeTripRow = (id: string) => {
    if (tripRows.length > 1) setTripRows(tripRows.filter(r => r.id !== id));
  };

  const handleNextTripStep = () => {
    if (!newTripHeader.customerName || !newTripHeader.weekNumber || !newTripHeader.pod) {
      toast({ variant: "destructive", title: "Missing Header", description: "Please complete the customer, week, and POD details." });
      return;
    }
    
    const mockItems: CORow[] = [{
      id: `MOCK-${Date.now()}-1`,
      ps: '1',
      pod: newTripHeader.pod || 'SHA',
      cutOffDate: format(new Date(), 'yyyy-MM-dd'),
      etd: format(new Date(), 'yyyy-MM-dd'),
      taskDate: format(new Date(), 'yyyy-MM-dd'),
      sku: 'SKU-001',
      palletization: 'PALLETIZE',
      containerNo: '',
      shippingLine: newTripHeader.shippingLine || '',
      bookingNo: newTripHeader.bookingNo || '',
      atwStatus: 'PENDING'
    }];

    setBindCoRows(mockItems);
    setTripStep(2);
  };

  const handleSubmitTripBatch = async () => {
    if (!db) return;
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
          pod: newTripHeader.pod,
          status: 'active',
          updatedAt: serverTimestamp()
        });
      });
      await batch.commit();
      toast({ title: "Trips Created", description: "Successfully logged new trip batch." });
      setIsNewTripOpen(false);
      setTripStep(1);
    } catch (err: any) {
      toast({ variant: "destructive", title: "Error", description: err.message });
    }
  };

  const handleOpenPalletDetails = (index: number) => {
    setSelectedPalletIndex(index);
    setCurrentPalletRows(palletsData[index] || [{ packType: '', qty: '' }]);
    setIsPalletDetailsModalOpen(true);
  };

  const handleSavePalletDetails = () => {
    if (selectedPalletIndex !== null) {
      const filteredRows = currentPalletRows.filter(r => r.packType && r.qty);
      setPalletsData({
        ...palletsData,
        [selectedPalletIndex]: filteredRows
      });
      setIsPalletDetailsModalOpen(false);
      toast({ title: "Pallet Saved", description: `Details for Pallet #${selectedPalletIndex + 1} updated.` });
    }
  };

  const renderTripsView = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center gap-4 mb-4">
        <Select value={weekFilter} onValueChange={setWeekFilter}>
          <SelectTrigger className="w-[300px] h-12 bg-white"><SelectValue placeholder="Select Week Number" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Weeks</SelectItem>{weekOptions.map(w => (<SelectItem key={w} value={w}>{w}</SelectItem>))}</SelectContent>
        </Select>
        <Select value={customerFilter} onValueChange={setCustomerFilter}>
          <SelectTrigger className="w-[300px] h-12 bg-white"><SelectValue placeholder="Select Customer" /></SelectTrigger>
          <SelectContent><SelectItem value="all">All Customers</SelectItem>{customerMappings.map((c: any) => (<SelectItem key={c.id} value={c.Customer}>{c.Customer}</SelectItem>))}</SelectContent>
        </Select>
        <div className="ml-auto flex items-center gap-4 text-gray-400">
          <Bell className="h-5 w-5 cursor-pointer" />
          <HelpCircle className="h-5 w-5 cursor-pointer" />
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-gray-900">
            <div className="h-8 w-8 rounded-full bg-gray-200 flex items-center justify-center"><User className="h-4 w-4" /></div>
            COORDINATOR
          </div>
        </div>
      </div>

      <div className="flex justify-between items-end">
        <div>
          <div className="flex items-center text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">
            <span>Logistics</span><ChevronRight className="h-3 w-3 mx-1" /><span>Trips</span>
          </div>
          <h1 className="text-3xl font-black text-gray-900">Trips</h1>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" className="h-10 px-6 font-bold uppercase text-xs tracking-widest border-gray-200">CREATE/VIEW TRIPS</Button>
          <Button className="h-10 px-6 bg-anflocor-green text-white font-bold uppercase text-xs tracking-widest gap-2" onClick={() => { setTripStep(1); setIsNewTripOpen(true); }}><Plus className="h-4 w-4" /> NEW TRIP</Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <Card className="bg-white border-none shadow-sm relative overflow-hidden h-[180px]">
          <div className="p-8">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-300 block mb-4">ACTIVE TRIPS</span>
            <div className="flex items-end gap-3">
              <span className="text-5xl font-black text-gray-900">{trips.length}</span>
              <div className="flex items-center gap-1 text-green-500 font-bold text-xs mb-2">
                <TrendingUp className="h-3 w-3" /> +12%
              </div>
            </div>
            <p className="text-[10px] text-gray-400 font-bold mt-2">Currently in transit or processing</p>
          </div>
          <Truck className="absolute bottom-4 right-4 h-24 w-24 text-gray-50 opacity-10 -rotate-12" />
        </Card>
        <Card className="bg-white border-none shadow-sm relative overflow-hidden h-[180px]">
          <div className="p-8">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-300 block mb-4">TRIPS PENDING</span>
            <span className="text-5xl font-black text-gray-900">28</span>
            <p className="text-[10px] text-gray-400 font-bold mt-4">Updated 5m ago</p>
          </div>
          <Clock className="absolute bottom-4 right-4 h-24 w-24 text-gray-50 opacity-10" />
        </Card>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b flex justify-between items-center">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">RECENT TRIP MANIFESTS</h3>
          <div className="flex gap-2">
            <Button variant="outline" className="h-8 px-3 text-[10px] font-black uppercase tracking-widest border-gray-100 gap-2"><Filter className="h-3 w-3" /> FILTER</Button>
            <Button variant="outline" className="h-8 px-3 text-[10px] font-black uppercase tracking-widest border-gray-100 gap-2"><Download className="h-3 w-3" /> EXPORT</Button>
          </div>
        </div>
        <Table>
          <TableHeader className="bg-gray-50/50">
            <TableRow>
              <TableHead className="w-12 text-center"><Checkbox /></TableHead>
              <TableHead className="text-[9px] font-black uppercase text-gray-400">VAN NO.</TableHead>
              <TableHead className="text-[9px] font-black uppercase text-gray-400">PM NO.</TableHead>
              <TableHead className="text-[9px] font-black uppercase text-gray-400">CONTAINER NO.</TableHead>
              <TableHead className="text-[9px] font-black uppercase text-gray-400">SEAL NO.</TableHead>
              <TableHead className="text-[9px] font-black uppercase text-gray-400">DRIVER</TableHead>
              <TableHead className="text-[9px] font-black uppercase text-gray-400">DATE ATW RELEASED</TableHead>
              <TableHead className="text-[9px] font-black uppercase text-gray-400">DATE WITHDRAWN</TableHead>
              <TableHead className="text-[9px] font-black uppercase text-gray-400 text-right">ACTIONS</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {trips.map((t: any) => (
              <TableRow key={t.id} className="h-16 hover:bg-gray-50/50">
                <TableCell className="text-center"><Checkbox /></TableCell>
                <TableCell className="font-bold">{t.vanNo}</TableCell>
                <TableCell className="text-xs text-gray-400">{t.pmNo}</TableCell>
                <TableCell className="font-bold">{t.containerNo}</TableCell>
                <TableCell className="text-xs">{t.sealNo}</TableCell>
                <TableCell className="font-bold text-xs uppercase">{t.driver}</TableCell>
                <TableCell className="text-[10px] text-gray-400">{t.dateAtwReleased}</TableCell>
                <TableCell className="text-[10px] text-gray-400">{t.dateWithdrawn}</TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-gray-400">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem 
                        className="gap-3 py-2.5 cursor-pointer font-medium"
                        onClick={() => { setSelectedTripForTransfer(t); setIsTransferModalOpen(true); }}
                      >
                        <Truck className="h-4 w-4 text-gray-500" /> Start Transfer
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem className="gap-3 py-2.5 cursor-pointer font-medium">
                        <FileText className="h-4 w-4 text-gray-500" /> Check Docs
                      </DropdownMenuItem>
                      <DropdownMenuItem className="gap-3 py-2.5 cursor-pointer font-medium">
                        <PackageCheck className="h-4 w-4 text-gray-500" /> Dispatch
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Start Transfer Modal */}
      <Dialog open={isTransferModalOpen} onOpenChange={setIsTransferModalOpen}>
        <DialogContent className="max-w-[700px] p-0 overflow-hidden bg-white border-none shadow-2xl">
          <div className="p-6 flex justify-between items-center border-b">
            <DialogTitle className="text-lg font-semibold text-gray-700">Start Transfer - {selectedTripForTransfer?.vanNo || 'V-4022'}</DialogTitle>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400" onClick={() => setIsTransferModalOpen(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="p-8 space-y-10">
            <div className="grid grid-cols-2 gap-12">
              <div className="space-y-8">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">INBOUND DRIVER NAME</Label>
                  <Input placeholder="Enter driver name" className="h-11 bg-gray-50/50 border-gray-100 font-medium text-sm" />
                </div>

                <div className="space-y-4">
                  <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">INSPECTION CHECKLIST</Label>
                  <div className="grid grid-cols-2 gap-y-3">
                    <div className="flex items-center space-x-3">
                      <Checkbox id="temp" className="border-gray-300 h-4 w-4 rounded-sm" />
                      <label htmlFor="temp" className="text-sm font-medium text-gray-600 cursor-pointer">Temperature</label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox id="leaks" className="border-gray-300 h-4 w-4 rounded-sm" />
                      <label htmlFor="leaks" className="text-sm font-medium text-gray-600 cursor-pointer">No Leaks</label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox id="drain" className="border-gray-300 h-4 w-4 rounded-sm" />
                      <label htmlFor="drain" className="text-sm font-medium text-gray-600 cursor-pointer">Check Drain Plug</label>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Checkbox id="odor" className="border-gray-300 h-4 w-4 rounded-sm" />
                      <label htmlFor="odor" className="text-sm font-medium text-gray-600 cursor-pointer">No Odor</label>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">OUTBOUND DRIVER NAME</Label>
                  <Input placeholder="Enter driver name" className="h-11 bg-gray-50/50 border-gray-100 font-medium text-sm" />
                </div>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">PHOTO CONFIRMATION</Label>
                  <div className="flex flex-wrap gap-2.5">
                    <div className="w-14 h-14 border-2 border-dashed border-gray-200 rounded flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors">
                      <Camera className="h-5 w-5 text-gray-300" />
                      <span className="text-[8px] font-black text-gray-400 mt-1 uppercase tracking-tighter">UPLOAD</span>
                    </div>
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="w-14 h-14 bg-gray-50 border border-gray-100 rounded flex items-center justify-center">
                        <ImageIcon className="h-5 w-5 text-gray-200" />
                      </div>
                    ))}
                  </div>
                  <p className="text-[9px] text-gray-400 italic font-medium">Up to 5 photos can be uploaded for loading verification.</p>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">DOCUMENT ACTIONS</Label>
              <div className="flex gap-4">
                <Button 
                  className="h-12 px-6 bg-black hover:bg-black/90 text-white font-bold text-xs tracking-widest gap-2 uppercase"
                  onClick={() => setIsVlsModalOpen(true)}
                >
                  + CREATE VLS
                </Button>
                <Button variant="outline" className="h-12 px-6 border-2 border-black text-black font-bold text-xs tracking-widest gap-2 bg-white hover:bg-gray-50 uppercase">+ CREATE DR</Button>
              </div>
            </div>
          </div>
          
          <div className="p-6 bg-gray-50/50 border-t flex justify-end">
            <Button className="h-12 px-10 bg-[#14532d] hover:bg-[#114626] text-white font-bold text-xs tracking-widest gap-2 shadow-sm rounded-sm uppercase" onClick={() => { 
              toast({ title: "Transfer Saved", description: "Inbound/Outbound details have been logged." });
              setIsTransferModalOpen(false);
            }}>
              <RefreshCcw className="h-4 w-4" /> SAVE
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Van Loading Summary (VLS) Modal */}
      <Dialog open={isVlsModalOpen} onOpenChange={setIsVlsModalOpen}>
        <DialogContent className="max-w-[90vw] w-full p-0 overflow-hidden h-[90vh] flex flex-col">
          <div className="p-6 border-b bg-white flex justify-between items-center shrink-0">
            <div className="flex items-center gap-3">
              <div className="bg-green-100 p-2 rounded-lg"><FileCheck className="h-6 w-6 text-anflocor-green" /></div>
              <DialogTitle className="text-xl font-bold text-gray-900">Create Van Loading Summary</DialogTitle>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setIsVlsModalOpen(false)}><X className="h-5 w-5" /></Button>
          </div>

          <div className="flex-1 overflow-y-auto p-8 bg-white space-y-8">
            <Tabs value={vlsType} onValueChange={(val: any) => setVlsType(val)} className="w-full">
              <TabsList className="bg-gray-100 p-1 w-fit mb-8">
                <TabsTrigger value="palletized" className="data-[state=active]:bg-white data-[state=active]:text-anflocor-green font-black uppercase text-[10px] tracking-widest px-8">PALLETIZED</TabsTrigger>
                <TabsTrigger value="non-palletized" className="data-[state=active]:bg-white data-[state=active]:text-anflocor-green font-black uppercase text-[10px] tracking-widest px-8">NON-PALLETIZED</TabsTrigger>
              </TabsList>

              <div className="space-y-10">
                <div className="space-y-6">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-4 bg-anflocor-green rounded-full"></div>
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">LOGISTICS MANIFEST INFO</h3>
                  </div>
                  <div className="grid grid-cols-4 gap-6">
                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-bold text-gray-400 uppercase">DATE PREPARED</Label>
                      <Input 
                        type="date"
                        value={vlsManifest.datePrepared} 
                        onChange={(e) => setVlsManifest({...vlsManifest, datePrepared: e.target.value})}
                        className="h-10" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-bold text-gray-400 uppercase">WAYBILL NO.</Label>
                      <Input 
                        value={vlsManifest.waybillNo} 
                        onChange={(e) => setVlsManifest({...vlsManifest, waybillNo: e.target.value})}
                        className="h-10" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-bold text-gray-400 uppercase">HAULER</Label>
                      <Input 
                        value={vlsManifest.hauler} 
                        onChange={(e) => setVlsManifest({...vlsManifest, hauler: e.target.value})}
                        className="h-10" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-bold text-gray-400 uppercase">TRUCK NO.</Label>
                      <Input 
                        value={vlsManifest.truckNo} 
                        onChange={(e) => setVlsManifest({...vlsManifest, truckNo: e.target.value})}
                        className="h-10" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-bold text-gray-400 uppercase">PLATE NO.</Label>
                      <Input 
                        value={vlsManifest.plateNo} 
                        onChange={(e) => setVlsManifest({...vlsManifest, plateNo: e.target.value})}
                        className="h-10" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-bold text-gray-400 uppercase">TRIP NO.</Label>
                      <Input 
                        value={vlsManifest.tripNo} 
                        onChange={(e) => setVlsManifest({...vlsManifest, tripNo: e.target.value})}
                        className="h-10" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-bold text-gray-400 uppercase">VAN NO.</Label>
                      <Input 
                        value={vlsManifest.vanNo} 
                        onChange={(e) => setVlsManifest({...vlsManifest, vanNo: e.target.value})}
                        className="h-10" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-bold text-gray-400 uppercase">SEAL NO.</Label>
                      <Input 
                        value={vlsManifest.sealNo} 
                        onChange={(e) => setVlsManifest({...vlsManifest, sealNo: e.target.value})}
                        className="h-10" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-bold text-gray-400 uppercase">GENSET NO.</Label>
                      <Input 
                        value={vlsManifest.gensetNo} 
                        onChange={(e) => setVlsManifest({...vlsManifest, gensetNo: e.target.value})}
                        className="h-10" 
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-bold text-gray-400 uppercase">TEMP. SETTING</Label>
                      <Input 
                        value={vlsManifest.tempSetting} 
                        onChange={(e) => setVlsManifest({...vlsManifest, tempSetting: e.target.value})}
                        className="h-10" 
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-12 pt-8 border-t">
                  <div className="col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-1 h-4 bg-anflocor-green rounded-full"></div>
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">LOADING DIAGRAM - TOP VIEW</h3>
                      </div>
                      <Badge variant="outline" className="text-[9px] font-bold text-gray-400">20 PALLETS CAPACITY</Badge>
                    </div>
                    
                    <div className="bg-gray-50 p-10 rounded-2xl border-2 border-dashed border-gray-200">
                      <div className="grid grid-cols-10 grid-rows-2 gap-4 h-64">
                        {Array.from({ length: 20 }).map((_, i) => (
                          <div 
                            key={i} 
                            onClick={() => handleOpenPalletDetails(i)}
                            className={cn(
                              "relative group cursor-pointer rounded-xl border-2 transition-all flex flex-col items-center justify-center gap-1",
                              palletsData[i]?.length > 0 
                                ? "bg-green-50 border-anflocor-green shadow-md shadow-green-100" 
                                : "bg-white border-gray-100 hover:border-anflocor-green/30 hover:bg-gray-50"
                            )}
                          >
                            <span className="text-[10px] font-black text-gray-300 group-hover:text-anflocor-green/40">#{i + 1}</span>
                            {palletsData[i]?.length > 0 ? (
                              <>
                                <Box className="h-6 w-6 text-anflocor-green" />
                                <span className="text-[8px] font-bold text-anflocor-green uppercase">LOADED</span>
                              </>
                            ) : (
                              <Plus className="h-5 w-5 text-gray-100 group-hover:text-anflocor-green/20" />
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="mt-8 flex justify-center gap-20">
                         <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-500 rounded-full"></div><span className="text-[10px] font-bold text-gray-400 uppercase">LOADED</span></div>
                         <div className="flex items-center gap-2"><div className="w-3 h-3 bg-gray-200 rounded-full"></div><span className="text-[10px] font-bold text-gray-400 uppercase">EMPTY</span></div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-4 bg-anflocor-green rounded-full"></div>
                      <h3 className="text-[10px] font-black uppercase tracking-widest text-gray-400">BREAKDOWN SUMMARY</h3>
                    </div>
                    <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 min-h-[400px]">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent border-b-2 border-gray-200">
                            <TableHead className="text-[9px] font-black uppercase text-gray-400 h-8">PACK TYPE</TableHead>
                            <TableHead className="text-[9px] font-black uppercase text-gray-400 h-8 text-right">QTY</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {Object.entries(palletsData).flatMap(([idx, items]) => 
                            items.map((item, subIdx) => (
                              <TableRow key={`${idx}-${subIdx}`} className="border-none h-10 group">
                                <TableCell className="font-medium text-xs text-gray-600">{item.packType}</TableCell>
                                <TableCell className="text-right font-black text-anflocor-green text-xs">{item.qty}</TableCell>
                              </TableRow>
                            ))
                          )}
                          {Object.keys(palletsData).length === 0 && (
                            <TableRow>
                              <TableCell colSpan={2} className="h-64 text-center">
                                <div className="flex flex-col items-center gap-2 opacity-20">
                                  <LayoutGrid className="h-10 w-10" />
                                  <span className="text-[10px] font-black uppercase">No pallets recorded</span>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                        <TableFooter className="bg-transparent border-t-2 border-gray-200">
                          <TableRow>
                            <TableCell className="text-[10px] font-black uppercase text-gray-400">TOTAL BOXES</TableCell>
                            <TableCell className="text-right font-black text-anflocor-green text-lg">
                              {Object.values(palletsData).flat().reduce((acc, curr) => acc + (parseInt(curr.qty) || 0), 0)}
                            </TableCell>
                          </TableRow>
                        </TableFooter>
                      </Table>
                    </div>
                  </div>
                </div>
              </div>
            </Tabs>
          </div>

          <div className="p-6 bg-gray-50 border-t flex justify-end gap-3 shrink-0">
            <Button variant="ghost" onClick={() => setIsVlsModalOpen(false)} className="text-[10px] font-black uppercase tracking-widest text-gray-400">DISCARD</Button>
            <Button className="h-12 px-12 bg-anflocor-green hover:bg-anflocor-green/90 text-white font-black text-[10px] tracking-widest uppercase gap-2" onClick={() => {
              toast({ title: "VLS Created", description: "Van Loading Summary has been generated and linked to trip." });
              setIsVlsModalOpen(false);
            }}>
              <FileSignature className="h-4 w-4" /> GENERATE VLS
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Pallet Details Modal (Sub-modal of VLS) */}
      <Dialog open={isPalletDetailsModalOpen} onOpenChange={setIsPalletDetailsModalOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden bg-white border-none shadow-2xl">
          <div className="p-6 border-b bg-gray-50 flex justify-between items-center">
             <div className="flex items-center gap-3">
               <div className="bg-white p-2 rounded-lg border shadow-sm"><Box className="h-5 w-5 text-anflocor-green" /></div>
               <DialogTitle className="text-sm font-bold uppercase tracking-tight">Pallet Details #{selectedPalletIndex !== null ? selectedPalletIndex + 1 : ''}</DialogTitle>
             </div>
             <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400" onClick={() => setIsPalletDetailsModalOpen(false)}><X className="h-4 w-4" /></Button>
          </div>
          
          <div className="p-8 space-y-6">
             <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                {currentPalletRows.map((row, idx) => (
                   <div key={idx} className="grid grid-cols-12 gap-3 items-end group">
                      <div className="col-span-7 space-y-1.5">
                         <Label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">PACK TYPE</Label>
                         <Input 
                            value={row.packType} 
                            onChange={(e) => setCurrentPalletRows(currentPalletRows.map((r, i) => i === idx ? { ...r, packType: e.target.value } : r))}
                            className="h-10 bg-gray-50 border-gray-100 font-bold text-xs" 
                            placeholder="e.g. SKU-001"
                         />
                      </div>
                      <div className="col-span-4 space-y-1.5">
                         <Label className="text-[9px] font-black text-gray-400 uppercase tracking-widest">QTY</Label>
                         <Input 
                            type="number"
                            value={row.qty} 
                            onChange={(e) => setCurrentPalletRows(currentPalletRows.map((r, i) => i === idx ? { ...r, qty: e.target.value } : r))}
                            className="h-10 bg-gray-50 border-gray-100 font-black text-xs text-center" 
                            placeholder="0"
                         />
                      </div>
                      <div className="col-span-1 pb-1">
                         <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-gray-200 hover:text-red-500 hover:bg-red-50"
                            onClick={() => setCurrentPalletRows(currentPalletRows.filter((_, i) => i !== idx))}
                            disabled={currentPalletRows.length === 1}
                         >
                            <Trash2 className="h-3.5 w-3.5" />
                         </Button>
                      </div>
                   </div>
                ))}
             </div>
             
             <Button 
                variant="outline" 
                className="w-full h-10 border-dashed border-gray-200 text-gray-400 text-[10px] font-black uppercase tracking-widest hover:text-anflocor-green hover:border-anflocor-green/40 hover:bg-green-50/30 gap-2"
                onClick={() => setCurrentPalletRows([...currentPalletRows, { packType: '', qty: '' }])}
             >
                <Plus className="h-3 w-3" /> ADD ROW
             </Button>
          </div>

          <div className="p-4 bg-gray-50 border-t flex gap-2">
             <Button variant="ghost" onClick={() => setIsPalletDetailsModalOpen(false)} className="flex-1 text-[10px] font-black uppercase">CANCEL</Button>
             <Button onClick={handleSavePalletDetails} className="flex-[2] bg-anflocor-green hover:bg-anflocor-green/90 text-white text-[10px] font-black uppercase h-10">SAVE PALLET</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isNewTripOpen} onOpenChange={(open) => { setIsNewTripOpen(open); if(!open) setTripStep(1); }}>
        <DialogContent className="max-w-[95vw] w-full p-0 overflow-hidden h-[90vh] flex flex-col">
          <div className="p-4 border-b bg-gray-50 border-l-4 border-l-green-600 shrink-0">
             <p className="text-sm font-medium">Please ensure all trip details match the physical manifest.</p>
          </div>
          
          <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-white">
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
                      <TableHead className="text-[9px] font-black uppercase">CONTAINER NO.</TableHead>
                      <TableHead className="text-[9px] font-black uppercase">VAN NO.</TableHead>
                      <TableHead className="text-[9px] font-black uppercase">SEAL NO.</TableHead>
                      <TableHead className="text-[9px] font-black uppercase text-center">ATW STATUS</TableHead>
                      <TableHead className="text-[9px] font-black uppercase">ATW RELEASED</TableHead>
                      <TableHead className="text-[9px] font-black uppercase">PM NO.</TableHead>
                      <TableHead className="text-[9px] font-black uppercase">DRIVER NAME</TableHead>
                      <TableHead className="text-[9px] font-black uppercase">SIGNATURE</TableHead>
                      <TableHead className="text-[9px] font-black uppercase">DATE WITHDRAWN</TableHead>
                      <TableHead className="text-[9px] font-black uppercase">ATTACHMENTS</TableHead>
                      <TableHead className="w-12 text-[9px] font-black uppercase">ACTIONS</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {tripRows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="text-center font-bold text-gray-400">{row.ps}</TableCell>
                        <TableCell><Input className="h-9 uppercase font-bold" value={row.containerNo} onChange={(e) => updateTripRow(row.id, { containerNo: e.target.value })}/></TableCell>
                        <TableCell><Input className="h-9 uppercase" value={row.vanNo} onChange={(e) => updateTripRow(row.id, { vanNo: e.target.value })}/></TableCell>
                        <TableCell><Input className="h-9 uppercase" value={row.sealNo} onChange={(e) => updateTripRow(row.id, { sealNo: e.target.value })}/></TableCell>
                        <TableCell className="text-center"><Badge variant="outline" className={cn("cursor-pointer font-bold", row.atwStatus === 'Y' ? "text-green-600 border-green-200 bg-green-50" : "text-red-600 border-red-200 bg-red-50")} onClick={() => updateTripRow(row.id, { atwStatus: row.atwStatus === 'Y' ? 'N' : 'Y' })}>{row.atwStatus}</Badge></TableCell>
                        <TableCell><Input type="date" className="h-9 text-[10px]" value={row.atwReleased} onChange={(e) => updateTripRow(row.id, { atwReleased: e.target.value })}/></TableCell>
                        <TableCell><Input className="h-9" placeholder="PM No." value={row.pmNo} onChange={(e) => updateTripRow(row.id, { pmNo: e.target.value })}/></TableCell>
                        <TableCell><Input className="h-9" placeholder="Driver Name" value={row.driverName} onChange={(e) => updateTripRow(row.id, { driverName: e.target.value })}/></TableCell>
                        <TableCell className="text-[10px] italic text-gray-400">Pending</TableCell>
                        <TableCell><Input type="date" className="h-9 text-[10px]" value={row.dateWithdrawn} onChange={(e) => updateTripRow(row.id, { dateWithdrawn: e.target.value })}/></TableCell>
                        <TableCell><Button variant="ghost" size="sm" className="h-8 text-anflocor-green gap-2 px-2"><Paperclip className="h-3 w-3" /> Upload</Button></TableCell>
                        <TableCell><Button variant="ghost" size="icon" onClick={() => removeTripRow(row.id)}><Trash2 className="h-4 w-4 text-red-300" /></Button></TableCell>
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
                      <TableHead className="w-12 text-[9px] font-black uppercase text-gray-400">#</TableHead>
                      <TableHead className="text-[9px] font-black uppercase text-gray-400">PS</TableHead>
                      <TableHead className="text-[9px] font-black uppercase text-gray-400">POD</TableHead>
                      <TableHead className="text-[9px] font-black uppercase text-gray-400">CUT-OFF DATE</TableHead>
                      <TableHead className="text-[9px] font-black uppercase text-gray-400">ETD</TableHead>
                      <TableHead className="text-[9px] font-black uppercase text-gray-400">TASK DATE</TableHead>
                      <TableHead className="text-[9px] font-black uppercase text-gray-400">SKU</TableHead>
                      <TableHead className="text-[9px] font-black uppercase text-gray-400">PALLETIZATION</TableHead>
                      <TableHead className="text-[9px] font-black uppercase text-gray-400">CONTAINER NO.</TableHead>
                      <TableHead className="w-12 text-[9px] font-black uppercase text-gray-400 text-center">ACTIONS</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bindCoRows.map((row, index) => (
                      <TableRow key={row.id}>
                        <TableCell className="text-[11px] font-bold text-gray-400">{index + 1}</TableCell>
                        <TableCell><Input className="h-9 bg-white border shadow-sm font-medium w-20" value={row.ps} onChange={(e) => setBindCoRows(bindCoRows.map(r => r.id === row.id ? { ...r, ps: e.target.value } : r))}/></TableCell>
                        <TableCell><Input className="h-9 bg-white border shadow-sm font-medium w-24" value={row.pod} readOnly/></TableCell>
                        <TableCell><Input type="date" className="h-9 bg-white border shadow-sm text-xs" value={row.cutOffDate} onChange={(e) => setBindCoRows(bindCoRows.map(r => r.id === row.id ? { ...r, cutOffDate: e.target.value } : r))}/></TableCell>
                        <TableCell><Input type="date" className="h-9 bg-white border shadow-sm text-xs" value={row.etd} onChange={(e) => setBindCoRows(bindCoRows.map(r => r.id === row.id ? { ...r, etd: e.target.value } : r))}/></TableCell>
                        <TableCell><Input type="date" className="h-9 bg-white border shadow-sm text-xs" value={row.taskDate} onChange={(e) => setBindCoRows(bindCoRows.map(r => r.id === row.id ? { ...r, taskDate: e.target.value } : r))}/></TableCell>
                        <TableCell><Input className="h-9 bg-white border shadow-sm font-medium w-24" value={row.sku} onChange={(e) => setBindCoRows(bindCoRows.map(r => r.id === row.id ? { ...r, sku: e.target.value } : r))}/></TableCell>
                        <TableCell><Input className="h-9 bg-white border shadow-sm font-medium w-28" value={row.palletization} onChange={(e) => setBindCoRows(bindCoRows.map(r => r.id === row.id ? { ...r, palletization: e.target.value } : r))}/></TableCell>
                        <TableCell>
                          <Select value={row.containerNo} onValueChange={(val) => setBindCoRows(bindCoRows.map(r => r.id === row.id ? { ...r, containerNo: val } : r))}>
                            <SelectTrigger className="h-9 bg-white border shadow-sm font-bold w-40"><SelectValue placeholder="Select Container" /></SelectTrigger>
                            <SelectContent>{tripRows.filter(tr => tr.containerNo).map(tr => (<SelectItem key={tr.id} value={tr.containerNo}>{tr.containerNo}</SelectItem>))}</SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50" onClick={() => setBindCoRows(bindCoRows.filter(r => r.id !== row.id))}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}
          </div>

          <div className="p-6 border-t bg-gray-50 flex justify-end gap-3 shrink-0">
            <Button variant="ghost" onClick={() => { setIsNewTripOpen(false); setTripStep(1); }} className="text-[10px] font-black uppercase">CANCEL</Button>
            {tripStep === 1 ? (
              <Button className="bg-anflocor-green text-white text-[10px] font-black uppercase px-8 h-10" onClick={handleNextTripStep}>NEXT STEP</Button>
            ) : (
              <Button className="bg-anflocor-green text-white text-[10px] font-black uppercase px-8 h-10 gap-2" onClick={handleSubmitTripBatch}>FINALIZE <CheckSquare className="h-4 w-4" /></Button>
            )}
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

  const renderLoadingAdviceView = () => (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="flex flex-wrap items-center gap-4 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <div className="w-64">
          <Select value={weekFilter} onValueChange={setWeekFilter}>
            <SelectTrigger><SelectValue placeholder="Select Week" /></SelectTrigger>
            <SelectContent><SelectItem value="all">All Weeks</SelectItem>{weekOptions.map(w => (<SelectItem key={w} value={w}>{w}</SelectItem>))}</SelectContent>
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
            ) : contracts.map((c: any) => (
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
      
      <Dialog open={isNewLAOpen} onOpenChange={setIsNewLAOpen}>
        <DialogContent className="max-w-[95vw]">
           <DialogHeader><DialogTitle>New Loading Advice</DialogTitle></DialogHeader>
           <div className="p-4 text-center text-gray-400">LA Entry form restored.</div>
           <DialogFooter><Button onClick={() => setIsNewLAOpen(false)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  const renderBookingsView = () => (
    <div className="space-y-6">
       <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
          <h2 className="text-2xl font-bold">Bookings</h2>
          <Button className="bg-anflocor-green text-white font-bold" onClick={() => setIsNewBookingOpen(true)}>NEW BOOKING</Button>
       </div>
       <Card className="overflow-hidden">
          <Table>
             <TableHeader className="bg-gray-50"><TableRow><TableHead>BOOKING NO</TableHead><TableHead>SHIPPING LINE</TableHead><TableHead>VESSEL</TableHead><TableHead>POD</TableHead></TableRow></TableHeader>
             <TableBody>
                {bookings.map((b: any) => (<TableRow key={b.id}><TableCell className="font-bold text-anflocor-green">{b.bookingNumber}</TableCell><TableCell>{b.shippingLine}</TableCell><TableCell>{b.vesselName}</TableCell><TableCell>{b.pod}</TableCell></TableRow>))}
             </TableBody>
          </Table>
       </Card>

       <Dialog open={isNewBookingOpen} onOpenChange={setIsNewBookingOpen}>
        <DialogContent className="max-w-[95vw] p-0 overflow-hidden h-[90vh] flex flex-col">
          <div className="p-4 border-b bg-gray-50 border-l-4 border-l-green-600 shrink-0">
             <p className="text-sm font-medium">Please ensure all manifest details match the confirmed booking documents.</p>
          </div>
          <div className="flex-1 overflow-y-auto p-8 space-y-8 bg-white">
            <div className="grid grid-cols-2 gap-8 border-b pb-8">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-gray-400">Customer</Label>
                <Input className="h-12 bg-gray-50 font-bold" placeholder="Select Customer" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-gray-400">Week No</Label>
                <Input className="h-12 bg-gray-50 font-bold" placeholder="Select Week" />
              </div>
            </div>
            <Table>
              <TableHeader className="bg-gray-100">
                <TableRow>
                  <TableHead className="w-12 text-center text-[9px] font-black uppercase">#</TableHead>
                  <TableHead className="text-[9px] font-black uppercase">BOOKING NO.</TableHead>
                  <TableHead className="text-[9px] font-black uppercase">SHIPPING LINE</TableHead>
                  <TableHead className="text-[9px] font-black uppercase">VESSEL</TableHead>
                  <TableHead className="text-[9px] font-black uppercase">POD</TableHead>
                  <TableHead className="text-[9px] font-black uppercase">ATTACHMENTS</TableHead>
                  <TableHead className="w-12 text-[9px] font-black uppercase">ACTIONS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow>
                  <TableCell className="text-center font-bold text-gray-400">1</TableCell>
                  <TableCell><Input className="h-9 bg-white border" /></TableCell>
                  <TableCell><Input className="h-9 bg-white border" /></TableCell>
                  <TableCell><Input className="h-9 bg-white border" /></TableCell>
                  <TableCell><Input className="h-9 bg-white border" /></TableCell>
                  <TableCell><Button variant="ghost" size="sm" className="h-8 text-anflocor-green gap-2 px-2"><Paperclip className="h-3 w-3" /> Upload</Button></TableCell>
                  <TableCell><Button variant="ghost" size="icon" className="text-red-300"><Trash2 className="h-4 w-4" /></Button></TableCell>
                </TableRow>
              </TableBody>
            </Table>
            <Button variant="ghost" className="text-anflocor-green text-xs font-bold"><Plus className="mr-2 h-4 w-4" /> Add Row</Button>
          </div>
          <div className="p-6 border-t bg-gray-50 flex justify-end gap-3 shrink-0">
            <Button variant="ghost" onClick={() => setIsNewBookingOpen(false)} className="text-[10px] font-black uppercase">CANCEL</Button>
            <Button className="bg-anflocor-green text-white text-[10px] font-black uppercase px-8 h-10">FINALIZE</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );

  const renderEditCuttingOrders = () => (
    <div className="p-12 text-center text-gray-400">Edit CO View implementation pending restoration.</div>
  );

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
        <div className="flex justify-end mb-4"><div className="flex items-center space-x-3 text-sm text-gray-400 font-medium"><User className="h-4 w-4" /><span>{user?.email} (Admin)</span></div></div>
        {renderContent()}
      </main>
    </div>
  );
}
