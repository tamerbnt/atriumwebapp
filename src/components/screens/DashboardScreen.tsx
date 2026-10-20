import React, { useState, useMemo } from 'react';
import {
  Home,
  Plus,
  ArrowDown,
  ArrowUp,
  Clock,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ShoppingCart,
  TrendingUp,
  Sparkles,
  UserCheck,
  CreditCard,
  KeyRound,
  Check,
  Building2,
  Scissors,
  Calendar,
  Users,
  Eye,
  AlertCircle,
  Receipt,
  Package,
} from 'lucide-react';
import { useAtriumStore } from '../../services/store';
import { formatMoney } from '../../utils/rules';
import { AppointmentModal } from '../modals/AppointmentModal';
import { Appointment } from '../../types/index';
import { t } from '../../utils/i18n';

interface DashboardScreenProps {
  onAddMember: () => void;
  onOpenVoucherModal?: () => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  onAddMember,
  onOpenVoucherModal,
}) => {
  const {
    currentBusiness,
    currentBranch,
    businesses,
    branches,
    currentBusinessId,
    appointments,
    sales,
    products,
    staff,
    members,
    terminology,
    language,
    switchBusiness,
    switchBranch,
    setScreen,
    checkoutAppointment,
  } = useAtriumStore();

  const isSalon = currentBusiness.category === 'appointment_service';
  const isPOS = currentBusiness.category === 'pos_inventory';

  // Retail & POS Specific Analytics
  const posMetrics = useMemo(() => {
    const totalRev = sales.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalTransactions = sales.length;
    const avgBasket = totalTransactions > 0 ? Math.round(totalRev / totalTransactions) : 0;
    const lowStockCount = products.filter((p) => p.stockQuantity <= (p.reorderLevel || 5)).length;
    const outOfStockCount = products.filter((p) => p.stockQuantity <= 0).length;

    // Aggregated top selling products
    const productSoldMap: Record<string, { name: string; quantity: number; revenue: number }> = {};
    sales.forEach((s) => {
      s.items.forEach((it) => {
        if (!productSoldMap[it.productId]) {
          productSoldMap[it.productId] = { name: it.productName, quantity: 0, revenue: 0 };
        }
        productSoldMap[it.productId].quantity += it.quantity;
        productSoldMap[it.productId].revenue += it.totalPrice;
      });
    });
    const topProducts = Object.values(productSoldMap)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return {
      totalRev,
      totalTransactions,
      avgBasket,
      lowStockCount,
      outOfStockCount,
      topProducts,
    };
  }, [sales, products]);

  const [activityTab, setActivityTab] = useState<'Tous' | 'Passages' | 'Ventes'>('Tous');
  const [salonActivityTab, setSalonActivityTab] = useState<'Tous' | 'Rendezvous' | 'Ventes'>('Tous');
  const [isFacilityDropdownOpen, setIsFacilityDropdownOpen] = useState(false);
  const [isQuickActionsOpen, setIsQuickActionsOpen] = useState(false);
  const [currentTipIndex, setCurrentTipIndex] = useState(0);
  const [peopleInside, setPeopleInside] = useState(0);
  const [entreesJour, setEntreesJour] = useState(48);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [selectedAppointmentForEdit, setSelectedAppointmentForEdit] = useState<Appointment | null>(null);
  const [checkoutToast, setCheckoutToast] = useState<string | null>(null);

  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Salon specific metrics
  const salonMetrics = useMemo(() => {
    const todayApts = appointments.filter((a) => a.date === todayStr);
    const activeApts = todayApts.length > 0 ? todayApts : appointments;
    const inChair = activeApts.filter((a) => a.status === 'InChair');
    const completed = activeApts.filter((a) => a.status === 'Completed');
    const confirmed = activeApts.filter((a) => a.status === 'Confirmed');

    const appointmentRev = completed.reduce((sum, a) => sum + a.price, 0);
    const posRev = sales.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalDailyRev = appointmentRev + posRev;

    return {
      todayCount: activeApts.length,
      inChairCount: inChair.length,
      completedCount: completed.length,
      confirmedCount: confirmed.length,
      totalDailyRev,
      activeApts,
    };
  }, [appointments, sales, todayStr]);

  // Salon Stylists & Chair distribution
  const stylistChairs = useMemo(() => {
    const activeStaff = staff.filter((s) => s.isActive);
    return activeStaff.map((st, index) => {
      // Find what this stylist is working on today
      const inChairBooking = appointments.find(
        (a) => a.staffId === st.id && a.status === 'InChair'
      );
      const nextBooking = appointments.find(
        (a) => a.staffId === st.id && a.status === 'Confirmed'
      );
      const todayTotal = appointments.filter(
        (a) => a.staffId === st.id && a.date === todayStr
      ).length;

      return {
        stylist: st,
        chairNumber: index + 1,
        inChairBooking,
        nextBooking,
        todayTotal,
        status: inChairBooking ? ('InChair' as const) : nextBooking ? ('Booked' as const) : ('Available' as const),
      };
    });
  }, [staff, appointments, todayStr]);

  const handleQuickCheckout = (apt: Appointment) => {
    const sale = checkoutAppointment(apt.id, 'Cash');
    setCheckoutToast(`Checked out ${apt.clientName}! Sale #${sale.id.slice(-6).toUpperCase()} credited to ${apt.staffName}.`);
    setTimeout(() => setCheckoutToast(null), 4000);
  };

  const gymTips = useMemo(() => [
    {
      step: language === 'ar' ? 'الخطوة 1 / 5' : language === 'fr' ? 'ÉTAPE 1 / 5' : 'STEP 1 / 5',
      title: t('dash_tip_title', language),
      text: t('dash_tip_rfid', language),
      buttonText: language === 'ar' ? 'تهيئة RFID' : language === 'fr' ? 'Configurer RFID' : 'Configure RFID',
      action: onAddMember,
    },
    {
      step: language === 'ar' ? 'الخطوة 2 / 5' : language === 'fr' ? 'ÉTAPE 2 / 5' : 'STEP 2 / 5',
      title: t('dash_tip_title', language),
      text: t('dash_tip_alerts', language),
      buttonText: language === 'ar' ? 'إدارة التنبيهات' : language === 'fr' ? 'Gérer les alertes' : 'Manage Alerts',
      action: () => setScreen('members'),
    },
    {
      step: language === 'ar' ? 'الخطوة 3 / 5' : language === 'fr' ? 'ÉTAPE 3 / 5' : 'STEP 3 / 5',
      title: t('dash_tip_title', language),
      text: t('dash_tip_walkin', language),
      buttonText: language === 'ar' ? 'تسجيل دخول' : language === 'fr' ? 'Enregistrer un passage' : 'Record Walk-in',
      action: () => {
        setPeopleInside((p) => Math.min(100, p + 1));
        setEntreesJour((e) => e + 1);
      },
    },
    {
      step: language === 'ar' ? 'الخطوة 4 / 5' : language === 'fr' ? 'ÉTAPE 4 / 5' : 'STEP 4 / 5',
      title: t('dash_tip_title', language),
      text: language === 'ar' ? 'راجع مخزون منتجات نقطة البيع لتعزيز هوامش المبيعات والمكملات.' : language === 'fr' ? 'Analysez le stock des produits en boutique pour optimiser vos marges.' : 'Review daily POS product inventory to optimize supplement and retail margins.',
      buttonText: language === 'ar' ? 'فتح المتجر' : language === 'fr' ? 'Ouvrir la Boutique' : 'Open Shop',
      action: () => setScreen('shop'),
    },
    {
      step: language === 'ar' ? 'الخطوة 5 / 5' : language === 'fr' ? 'ÉTAPE 5 / 5' : 'STEP 5 / 5',
      title: t('dash_tip_title', language),
      text: language === 'ar' ? 'فعّل قسيمة الشراء الدائمة لفتح إدارة الفروع المتعددة.' : language === 'fr' ? 'Activez votre bon de licence perpétuelle pour débloquer le multi-agences.' : 'Activate your perpetual cash voucher to unlock multi-branch management.',
      buttonText: language === 'ar' ? 'تفعيل الترخيص' : language === 'fr' ? 'Activer la Licence' : 'Activate License',
      action: onOpenVoucherModal || onAddMember,
    },
  ], [language, onAddMember, onOpenVoucherModal, setScreen]);

  const salonTips = useMemo(() => [
    {
      step: language === 'ar' ? 'الخطوة 1 / 5' : language === 'fr' ? 'ÉTAPE 1 / 5' : 'STEP 1 / 5',
      title: language === 'ar' ? 'نصيحة الصالون' : language === 'fr' ? 'Conseil Salon' : 'Salon Master Tip',
      text: language === 'ar' ? 'أرسل تنبيهات SMS آلية قبل ساعتين من موعد الصبغة وجلسات العناية.' : language === 'fr' ? 'Envoyez des SMS de rappel 2h avant les rendez-vous coloration & spa.' : 'Send automated SMS reminders 2 hours before scheduled hair coloring & spa appointments.',
      buttonText: language === 'ar' ? 'جدول المصففين' : language === 'fr' ? 'Planning des coiffeurs' : 'Open Stylist Scheduler',
      action: () => setScreen('scheduler'),
    },
    {
      step: language === 'ar' ? 'الخطوة 2 / 5' : language === 'fr' ? 'ÉTAPE 2 / 5' : 'STEP 2 / 5',
      title: language === 'ar' ? 'نصيحة الصالون' : language === 'fr' ? 'Conseil Salon' : 'Salon Master Tip',
      text: language === 'ar' ? 'ارفع متوسط قيمة الفاتورة ببيع سيروم العناية فور الانتهاء من التصفيف عند الكرسي.' : language === 'fr' ? 'Augmentez le panier moyen en proposant des soins capillaires lors de l\'encaissement au fauteuil.' : 'Boost average ticket size by upselling post-treatment serums directly at chair checkout.',
      buttonText: language === 'ar' ? 'متجر الصالون' : language === 'fr' ? 'Boutique soins' : 'Manage Beauty Store',
      action: () => setScreen('shop'),
    },
    {
      step: language === 'ar' ? 'الخطوة 3 / 5' : language === 'fr' ? 'ÉTAPE 3 / 5' : 'STEP 3 / 5',
      title: language === 'ar' ? 'نصيحة الصالون' : language === 'fr' ? 'Conseil Salon' : 'Salon Master Tip',
      text: language === 'ar' ? 'حدد نسب العمولات وتوزيع الكراسي للمصففين في شاشة المالية والفريق.' : language === 'fr' ? 'Définissez les commissions et attributions de fauteuils dans Finances & Équipe.' : 'Configure chair assignment and commission tiers in Finance & Staff for senior colorists.',
      buttonText: language === 'ar' ? 'الفريق والرواتب' : language === 'fr' ? 'Équipe & Paie' : 'View Staff & Payroll',
      action: () => setScreen('finance'),
    },
    {
      step: language === 'ar' ? 'الخطوة 4 / 5' : language === 'fr' ? 'ÉTAPE 4 / 5' : 'STEP 4 / 5',
      title: language === 'ar' ? 'نصيحة الصالون' : language === 'fr' ? 'Conseil Salon' : 'Salon Master Tip',
      text: language === 'ar' ? 'اطلع على سجل علاجات العميل السابقة قبل البدء بجلسات الكيراتين وسحب اللون.' : language === 'fr' ? 'Consultez l\'historique des soins du client avant de débuter un lissage ou décoloration.' : 'Review client past treatment history before starting high-lift lightening and keratin smoothing.',
      buttonText: language === 'ar' ? 'دليل العملاء' : language === 'fr' ? 'Fichier clients' : 'Client Directory',
      action: () => setScreen('members'),
    },
    {
      step: language === 'ar' ? 'الخطوة 5 / 5' : language === 'fr' ? 'ÉTAPE 5 / 5' : 'STEP 5 / 5',
      title: language === 'ar' ? 'نصيحة الصالون' : language === 'fr' ? 'Conseil Salon' : 'Salon Master Tip',
      text: language === 'ar' ? 'أضف باقات العرائس المتعددة الخدمات لتسهيل حجوزات المناسبات.' : language === 'fr' ? 'Créez des forfaits mariée multi-prestations pour simplifier la réservation d\'événements.' : 'Add multi-service bridal packages in registration plans to streamline event bookings.',
      buttonText: language === 'ar' ? 'باقات الخدمات' : language === 'fr' ? 'Forfaits services' : 'Registration Pipeline',
      action: () => setScreen('registrations'),
    },
  ], [language, setScreen]);

  const posTips = useMemo(() => [
    {
      step: language === 'ar' ? 'الخطوة 1 / 4' : language === 'fr' ? 'ÉTAPE 1 / 4' : 'STEP 1 / 4',
      title: language === 'ar' ? 'تسريع نقطة البيع' : language === 'fr' ? 'Accélération Caisse' : 'POS Acceleration',
      text: language === 'ar' ? 'امسح الباركود مباشرة بقارئ الليزر USB أو البلوتوث لإضافة العناصر بلمسة واحدة.' : language === 'fr' ? 'Scannez directement avec douchette USB/Bluetooth pour ajouter les articles au ticket.' : 'Scan hardware barcodes directly from USB or Bluetooth laser scanners for instant 1-touch cart additions.',
      buttonText: language === 'ar' ? 'فتح الكاشير' : language === 'fr' ? 'Ouvrir la caisse' : 'Open POS Register',
      action: () => setScreen('shop'),
    },
    {
      step: language === 'ar' ? 'الخطوة 2 / 4' : language === 'fr' ? 'ÉTAPE 2 / 4' : 'STEP 2 / 4',
      title: language === 'ar' ? 'حماية المخزون' : language === 'fr' ? 'Gestion Stock' : 'Stock Protection',
      text: language === 'ar' ? 'حدد مستوى إعادة الطلب لكل صنف لتلقي تنبيهات استباقية قبل نفاد الكمية.' : language === 'fr' ? 'Définissez le seuil d\'alerte pour chaque référence afin d\'éviter les ruptures de stock.' : 'Set reorder alert levels for every SKU to receive proactive depletion warnings before running out of stock.',
      buttonText: language === 'ar' ? 'إدارة المخزون' : language === 'fr' ? 'Gérer le stock' : 'Manage Inventory',
      action: () => setScreen('shop'),
    },
    {
      step: language === 'ar' ? 'الخطوة 3 / 4' : language === 'fr' ? 'ÉTAPE 3 / 4' : 'STEP 3 / 4',
      title: language === 'ar' ? 'صندوق النقدية' : language === 'fr' ? 'Sécurité Tiroir-Caisse' : 'Cash Drawer Security',
      text: language === 'ar' ? 'راجع المقبوضات النقدية اليومية وحسابات الفكة لضمان تطابق الصندوق عند الإغلاق.' : language === 'fr' ? 'Vérifiez les encaissements espèces et le rendu monnaie pour équilibrer le tiroir-caisse.' : 'Review daily cash tenders and change calculations to ensure register drawer counts balance at shift close.',
      buttonText: language === 'ar' ? 'مراجعة السجل' : language === 'fr' ? 'Consulter journal' : 'Review History',
      action: () => setScreen('history'),
    },
    {
      step: language === 'ar' ? 'الخطوة 4 / 4' : language === 'fr' ? 'ÉTAPE 4 / 4' : 'STEP 4 / 4',
      title: language === 'ar' ? 'تخصيص الوصل' : language === 'fr' ? 'Personnalisation Ticket' : 'Receipt Customization',
      text: language === 'ar' ? 'أضف أرقام التعريف الجبائي والسجل التجاري ورسائل الشكر على وصولات القبض.' : language === 'fr' ? 'Ajoutez vos NIF/RC et messages de bienvenue personnalisés sur vos tickets de caisse.' : 'Add your fiscal NIF/RC numbers and customized thank-you messages to thermal checkout slips.',
      buttonText: language === 'ar' ? 'إعداد الوصل' : language === 'fr' ? 'Paramétrer ticket' : 'Setup Receipts',
      action: () => setScreen('shop'),
    },
  ], [language, setScreen]);

  const activeTips = isSalon ? salonTips : isPOS ? posTips : gymTips;

  const pillarHours = [
    '08:00',
    '09:00',
    '10:00',
    '11:00',
    '12:00',
    '14:00',
    '16:00',
    '17:00',
    '18:00',
    '19:00',
  ];

  // Dynamic pillar chart calculations from real sales/appointments
  const { pillarHeights, pillarColors, pillarTooltips } = useMemo(() => {
    const hourSlots = [8, 9, 10, 11, 12, 14, 16, 17, 18, 19];

    if (isPOS) {
      // Find today's sales or recent sales
      const now = new Date();
      const todaySales = sales.filter((s) => {
        const d = new Date(s.createdAt);
        return (
          !isNaN(d.getTime()) &&
          d.getFullYear() === now.getFullYear() &&
          d.getMonth() === now.getMonth() &&
          d.getDate() === now.getDate()
        );
      });

      const effectiveSales = todaySales.length > 0 ? todaySales : sales;
      const counts = hourSlots.map((h) => {
        return effectiveSales.filter((s) => new Date(s.createdAt).getHours() === h).length;
      });
      const revenues = hourSlots.map((h) => {
        return effectiveSales
          .filter((s) => new Date(s.createdAt).getHours() === h)
          .reduce((sum, s) => sum + s.totalAmount, 0);
      });

      const maxCount = Math.max(...counts, 1);
      const hasAny = counts.some((c) => c > 0);

      const heights = hasAny
        ? counts.map((c) => (c > 0 ? Math.min(100, Math.max(25, Math.round((c / maxCount) * 100))) : 16))
        : [35, 50, 70, 65, 90, 60, 40, 75, 30, 45];

      const colors = heights.map((h) => (h >= 75 ? '#C4785A' : h >= 45 ? '#E59E80' : '#EADCD2'));
      const tooltips = hourSlots.map(
        (_, i) => `${pillarHours[i]}: ${counts[i]} sales (${formatMoney(revenues[i])})`
      );

      return { pillarHeights: heights, pillarColors: colors, pillarTooltips: tooltips };
    }

    if (isSalon) {
      const counts = hourSlots.map((h) => {
        return salonMetrics.activeApts.filter((a) => {
          const hour = parseInt(a.startTime.split(':')[0], 10);
          return hour === h;
        }).length;
      });
      const maxCount = Math.max(...counts, 1);
      const hasAny = counts.some((c) => c > 0);

      const heights = hasAny
        ? counts.map((c) => (c > 0 ? Math.min(100, Math.max(25, Math.round((c / maxCount) * 100))) : 18))
        : [30, 60, 80, 70, 85, 65, 45, 90, 40, 50];

      const colors = heights.map((h) => (h >= 75 ? '#C4785A' : h >= 45 ? '#E59E80' : '#EADCD2'));
      const tooltips = hourSlots.map((_, i) => `${pillarHours[i]}: ${counts[i]} salon bookings`);

      return { pillarHeights: heights, pillarColors: colors, pillarTooltips: tooltips };
    }

    // Default gym flow
    const defaultHeights = [38, 55, 75, 70, 95, 62, 40, 78, 30, 48];
    const defaultColors = [
      '#C4785A',
      '#C4785A',
      '#C4785A',
      '#C4785A',
      '#C4785A',
      '#E59E80',
      '#EADCD2',
      '#EADCD2',
      '#EADCD2',
      '#EADCD2',
    ];
    const defaultTooltips = hourSlots.map(
      (_, i) => `${pillarHours[i]}: ${Math.round((defaultHeights[i] / 100) * 18)} visitors`
    );

    return { pillarHeights: defaultHeights, pillarColors: defaultColors, pillarTooltips: defaultTooltips };
  }, [sales, isPOS, isSalon, salonMetrics]);

  const gymActivities = [
    {
      id: 'act_01',
      type: 'Ventes',
      member: 'amira - A1',
      operation: 'Sale (1,500 DA)',
      status: 'completed',
      time: '20h ago',
    },
    {
      id: 'act_02',
      type: 'Ventes',
      member: 'Guest - water',
      operation: 'Sale (100 DA)',
      status: 'completed',
      time: '1d ago',
    },
    {
      id: 'act_03',
      type: 'Ventes',
      member: 'Guest - water',
      operation: 'Sale (100 DA)',
      status: 'completed',
      time: '2d ago',
    },
    {
      id: 'act_04',
      type: 'Ventes',
      member: 'Guest - protine',
      operation: 'Sale (1,000 DA)',
      status: 'completed',
      time: '2d ago',
    },
    {
      id: 'act_05',
      type: 'Passages',
      member: 'amira - A1',
      operation: 'Check-in (Entrée Badge)',
      status: 'admitted',
      time: '2h ago',
    },
    {
      id: 'act_06',
      type: 'Passages',
      member: 'saraa - A1',
      operation: 'Check-in (Entrée Badge)',
      status: 'admitted',
      time: '4h ago',
    },
  ];

  // Salon dynamic activities
  const salonActivities = useMemo(() => {
    const list: Array<{
      id: string;
      type: 'Rendezvous' | 'Ventes';
      client: string;
      operation: string;
      status: string;
      time: string;
      badgeColor: string;
    }> = [];

    // Add recent appointments
    appointments.slice(0, 5).forEach((apt) => {
      list.push({
        id: apt.id,
        type: 'Rendezvous',
        client: apt.clientName,
        operation: `${apt.serviceName} • Stylist: ${apt.staffName}`,
        status: apt.status === 'InChair' ? 'In Chair' : apt.status,
        time: `${apt.startTime} (${apt.durationMinutes}m)`,
        badgeColor:
          apt.status === 'InChair'
            ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
            : apt.status === 'Completed'
            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
            : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/60 dark:text-indigo-300',
      });
    });

    // Add recent sales
    sales.slice(0, 4).forEach((s) => {
      list.push({
        id: s.id,
        type: 'Ventes',
        client: s.memberName || 'Walk-in Client',
        operation: s.items.map((i) => `${i.quantity}x ${i.productName}`).join(', '),
        status: formatMoney(s.totalAmount),
        time: new Date(s.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300',
      });
    });

    return list;
  }, [appointments, sales]);

  const filteredGymActivities = gymActivities.filter((item) => {
    if (activityTab === 'Tous') return true;
    return item.type === activityTab;
  });

  const filteredSalonActivities = salonActivities.filter((item) => {
    if (salonActivityTab === 'Tous') return true;
    return item.type === salonActivityTab;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Toast Alert */}
      {checkoutToast && (
        <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-300 dark:border-emerald-700 rounded-2xl text-emerald-800 dark:text-emerald-200 text-xs font-semibold flex items-center justify-between shadow-md animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2">
            <Check size={16} className="text-emerald-600" />
            <span>{checkoutToast}</span>
          </div>
          <button
            type="button"
            onClick={() => setScreen('history')}
            className="underline hover:text-emerald-900 cursor-pointer text-[11px]"
          >
            View in Operations History →
          </button>
        </div>
      )}

      {/* Top Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-white">
              {language === 'ar' ? 'مرحباً بك مجدداً، تامر!' : language === 'fr' ? 'Bienvenue, Tamer !' : 'Welcome back, Tamer!'}
            </h1>
            {isSalon && (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FDF4F0] text-[#C4785A] border border-[#F5E2D8] flex items-center gap-1">
                <Scissors size={12} />
                <span>{language === 'ar' ? 'نسخة الصالون والسبا' : language === 'fr' ? 'Édition Salon & Spa' : 'Salon & Spa Edition'}</span>
              </span>
            )}
          </div>
          <p className="text-xs sm:text-sm text-neutral-500 dark:text-neutral-400 mt-0.5">
            {isSalon
              ? (language === 'ar' ? `إشغال الكراسي والمواعيد ومبيعات التجزئة لـ ${currentBranch?.name || 'الفرع الرئيسي'}` : language === 'fr' ? `Occupation en direct, rendez-vous et ventes pour ${currentBranch?.name || 'Salon Principal'}` : `Real-time chair occupancy, appointments & retail revenue for ${currentBranch?.name || 'Luxe Beauty Lounge'}`)
              : (language === 'ar' ? 'إليك نظرة شاملة على العمليات اليومية في منشأتك.' : language === 'fr' ? 'Voici le point sur l\'activité de votre établissement aujourd\'hui.' : `Here is what's happening at your facility today.`)}
          </p>
        </div>

        <div className="flex items-center gap-3 relative">
          {/* Facility Selector Pill */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsFacilityDropdownOpen(!isFacilityDropdownOpen)}
              className="h-10 px-4 rounded-full bg-[#F4EFEA] dark:bg-neutral-800/80 border border-[#E8DFD8] dark:border-neutral-700 flex items-center gap-2 cursor-pointer hover:bg-[#EFE8E1] dark:hover:bg-neutral-800 transition-colors shadow-2xs"
            >
              <Home size={15} className="text-[#C4785A]" />
              <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200">
                {currentBranch?.name || 'Atrium 1'}
              </span>
              <ChevronDown
                size={14}
                className={`text-neutral-500 transition-transform ${
                  isFacilityDropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {/* Facility Dropdown Menu */}
            {isFacilityDropdownOpen && (
              <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                  {t('fast_switch_title', language)}
                </div>
                {businesses.map((biz) => {
                  const isCurrent = biz.id === currentBusinessId;
                  const matchingBranch = branches.find((b) => b.businessId === biz.id);
                  return (
                    <button
                      key={biz.id}
                      type="button"
                      onClick={() => {
                        switchBusiness(biz.id);
                        if (matchingBranch) switchBranch(matchingBranch.id);
                        setIsFacilityDropdownOpen(false);
                      }}
                      className={`w-full px-3 py-2 text-left flex items-center justify-between text-xs transition-colors cursor-pointer ${
                        isCurrent
                          ? 'bg-[#FCEEE8] dark:bg-neutral-700 text-[#C4785A] font-bold'
                          : 'text-neutral-700 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700/50'
                      }`}
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Building2 size={14} className={isCurrent ? 'text-[#C4785A]' : 'text-neutral-400'} />
                        <span className="truncate">{biz.name}</span>
                      </div>
                      {isCurrent && <Check size={14} />}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Primary Quick Actions Button */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsQuickActionsOpen(!isQuickActionsOpen)}
              style={{
                backgroundColor: 'var(--color-accent)',
              }}
              className="h-10 px-5 rounded-full text-xs font-bold text-white flex items-center gap-2 cursor-pointer hover:opacity-90 active:scale-98 transition-all shadow-xs"
            >
              <Plus size={15} strokeWidth={2.5} />
              <span>{t('dash_quick_actions', language)}</span>
            </button>

            {/* Quick Actions Dropdown Menu */}
            {isQuickActionsOpen && (
              <div className="absolute right-0 mt-2 w-60 rounded-2xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 shadow-xl py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                {isSalon ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setIsQuickActionsOpen(false);
                        setSelectedAppointmentForEdit(null);
                        setIsAppointmentModalOpen(true);
                      }}
                      className="w-full px-3.5 py-2 text-left flex items-center gap-2.5 text-xs text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700/50 cursor-pointer"
                    >
                      <Scissors size={14} className="text-[#C4785A]" />
                      <span className="font-semibold">Book Salon Treatment</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsQuickActionsOpen(false);
                        setScreen('scheduler');
                      }}
                      className="w-full px-3.5 py-2 text-left flex items-center gap-2.5 text-xs text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700/50 cursor-pointer"
                    >
                      <Calendar size={14} className="text-amber-500" />
                      <span className="font-semibold">Stylist Multi-Chair Schedule</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsQuickActionsOpen(false);
                        setScreen('shop');
                      }}
                      className="w-full px-3.5 py-2 text-left flex items-center gap-2.5 text-xs text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700/50 cursor-pointer"
                    >
                      <ShoppingCart size={14} className="text-blue-500" />
                      <span className="font-semibold">Beauty Product Retail POS</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsQuickActionsOpen(false);
                        onAddMember();
                      }}
                      className="w-full px-3.5 py-2 text-left flex items-center gap-2.5 text-xs text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700/50 cursor-pointer"
                    >
                      <Users size={14} className="text-emerald-500" />
                      <span className="font-semibold">Register New Client</span>
                    </button>
                  </>
                ) : isPOS ? (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setIsQuickActionsOpen(false);
                        setScreen('shop');
                      }}
                      className="w-full px-3.5 py-2 text-left flex items-center gap-2.5 text-xs text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700/50 cursor-pointer"
                    >
                      <ShoppingCart size={14} className="text-[#C4785A]" />
                      <span className="font-semibold">Open POS Register</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsQuickActionsOpen(false);
                        setScreen('shop');
                      }}
                      className="w-full px-3.5 py-2 text-left flex items-center gap-2.5 text-xs text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700/50 cursor-pointer"
                    >
                      <Plus size={14} className="text-emerald-500" />
                      <span className="font-semibold">Add / Restock Items</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsQuickActionsOpen(false);
                        setScreen('history');
                      }}
                      className="w-full px-3.5 py-2 text-left flex items-center gap-2.5 text-xs text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700/50 cursor-pointer"
                    >
                      <CreditCard size={14} className="text-blue-500" />
                      <span className="font-semibold">Sales Ledger & Receipts</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsQuickActionsOpen(false);
                        onAddMember();
                      }}
                      className="w-full px-3.5 py-2 text-left flex items-center gap-2.5 text-xs text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700/50 cursor-pointer"
                    >
                      <Users size={14} className="text-indigo-500" />
                      <span className="font-semibold">Add Customer Account</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setIsQuickActionsOpen(false);
                        onAddMember();
                      }}
                      className="w-full px-3.5 py-2 text-left flex items-center gap-2.5 text-xs text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700/50 cursor-pointer"
                    >
                      <Plus size={14} className="text-[#C4785A]" />
                      <span className="font-semibold">Add New Member</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsQuickActionsOpen(false);
                        setPeopleInside((p) => Math.min(100, p + 1));
                        setEntreesJour((e) => e + 1);
                      }}
                      className="w-full px-3.5 py-2 text-left flex items-center gap-2.5 text-xs text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700/50 cursor-pointer"
                    >
                      <UserCheck size={14} className="text-emerald-500" />
                      <span className="font-semibold">Quick Walk-in Passage</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsQuickActionsOpen(false);
                        setScreen('shop');
                      }}
                      className="w-full px-3.5 py-2 text-left flex items-center gap-2.5 text-xs text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-700/50 cursor-pointer"
                    >
                      <ShoppingCart size={14} className="text-blue-500" />
                      <span className="font-semibold">Record POS Sale</span>
                    </button>
                  </>
                )}
                {onOpenVoucherModal && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsQuickActionsOpen(false);
                      onOpenVoucherModal();
                    }}
                    className="w-full px-3.5 py-2 text-left flex items-center gap-2.5 text-xs text-[#C4785A] hover:bg-[#FCEEE8] dark:hover:bg-neutral-700/50 cursor-pointer border-t border-neutral-100 dark:border-neutral-700 mt-1"
                  >
                    <KeyRound size={14} />
                    <span className="font-semibold">Redeem Lifetime Voucher</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: Summary / Performance (5 cols on lg) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Summary Group Container */}
          <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[26px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
            {/* Summary Header */}
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                  {isSalon ? (language === 'ar' ? 'نبض الصالون اليومي' : language === 'fr' ? 'Activité du Jour · Salon' : 'Salon Daily Pulse') : isPOS ? (language === 'ar' ? 'ملخص مبيعات الكاشير' : language === 'fr' ? 'Résumé des Ventes Caisse' : 'Register Sales Summary') : (language === 'ar' ? 'ملخص الأداء' : language === 'fr' ? 'Résumé de l\'activité' : 'Summary')}
                </h2>
                <p className="text-xs text-neutral-400 dark:text-neutral-500">
                  {isSalon
                    ? (language === 'ar' ? 'مؤشرات الحجوزات المباشرة والكراسي' : language === 'fr' ? 'Réservations en direct, fauteuils & indicateurs' : 'Live bookings, chairs & intake metrics')
                    : isPOS
                    ? (language === 'ar' ? 'إيرادات المبيعات وتذاكر الكاشير وتنبيهات المخزون' : language === 'fr' ? 'Chiffre d\'affaires en direct, tickets & alertes stock' : 'Real-time sales revenue, ticket counts & stock alerts')
                    : (language === 'ar' ? 'متابعة أداء المنشأة المباشر.' : language === 'fr' ? 'Suivez la performance en direct de votre établissement.' : 'Track live facility performance.')}
                </p>
              </div>
              <div className="h-7 px-3 rounded-full bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 flex items-center gap-1 cursor-pointer shadow-2xs">
                <span>{language === 'ar' ? 'يومي' : language === 'fr' ? 'Quotidien' : 'Daily'}</span>
                <ChevronDown size={12} className="text-neutral-400" />
              </div>
            </div>

            {/* Key KPI Tiles */}
            {isSalon ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white dark:bg-neutral-800 rounded-[20px] p-4 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs">
                  <div className="flex items-center gap-1.5 text-xs text-[#64748B] dark:text-neutral-400 font-medium">
                    <Scissors size={13} className="text-[#C4785A]" />
                    <span>{t('dash_salon_in_chair', language)}</span>
                  </div>
                  <div className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white mt-1 tabular-nums flex items-baseline gap-1.5">
                    {salonMetrics.inChairCount}
                    <span className="text-xs font-semibold text-amber-500 animate-pulse">{language === 'ar' ? 'نشط' : language === 'fr' ? 'en cours' : 'active'}</span>
                  </div>
                </div>

                <div className="bg-white dark:bg-neutral-800 rounded-[20px] p-4 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs">
                  <div className="flex items-center gap-1.5 text-xs text-[#64748B] dark:text-neutral-400 font-medium">
                    <Calendar size={13} className="text-emerald-500" />
                    <span>{t('dash_tab_appointments', language)}</span>
                  </div>
                  <div className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white mt-1 tabular-nums">
                    {salonMetrics.todayCount}{' '}
                    <span className="text-xs font-semibold text-neutral-400">{terminology.members.toLowerCase()}</span>
                  </div>
                </div>
              </div>
            ) : isPOS ? (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white dark:bg-neutral-800 rounded-[20px] p-4 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs">
                  <div className="flex items-center gap-1.5 text-xs text-[#64748B] dark:text-neutral-400 font-medium">
                    <TrendingUp size={13} className="text-[#C4785A]" />
                    <span>{t('dash_kpi_revenue', language)}</span>
                  </div>
                  <div className="text-2xl font-black tracking-tight text-emerald-600 dark:text-emerald-400 mt-1 tabular-nums font-mono">
                    {formatMoney(posMetrics.totalRev)}
                  </div>
                </div>

                <div className="bg-white dark:bg-neutral-800 rounded-[20px] p-4 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs">
                  <div className="flex items-center gap-1.5 text-xs text-[#64748B] dark:text-neutral-400 font-medium">
                    <ShoppingCart size={13} className="text-emerald-500" />
                    <span>{t('dash_tab_sales', language)}</span>
                  </div>
                  <div className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white mt-1 tabular-nums">
                    {posMetrics.totalTransactions}{' '}
                    <span className="text-xs font-semibold text-neutral-400">{language === 'ar' ? 'تذكرة' : language === 'fr' ? 'tickets' : 'tickets'}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white dark:bg-neutral-800 rounded-[20px] p-4 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs">
                  <div className="flex items-center gap-1.5 text-xs text-[#64748B] dark:text-neutral-400 font-medium">
                    <ArrowDown size={13} className="text-[#C4785A]" />
                    <span>{t('dash_people_inside', language)}</span>
                  </div>
                  <div className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white mt-1 tabular-nums">
                    {peopleInside}{' '}
                    <span className="text-xs font-semibold text-neutral-400">/ 100</span>
                  </div>
                </div>

                <div className="bg-white dark:bg-neutral-800 rounded-[20px] p-4 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs">
                  <div className="flex items-center gap-1.5 text-xs text-[#64748B] dark:text-neutral-400 font-medium">
                    <ArrowUp size={13} className="text-emerald-500" />
                    <span>{t('dash_daily_entries', language)}</span>
                  </div>
                  <div className="text-2xl font-black tracking-tight text-neutral-900 dark:text-white mt-1 tabular-nums">
                    {entreesJour}{' '}
                    <span className="text-xs font-semibold text-neutral-400">{language === 'ar' ? 'دخول' : language === 'fr' ? 'entrées' : 'check-ins'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Signature Pillar Bar Chart */}
            <div className="space-y-1.5 pt-1">
              <div className="flex justify-between items-center text-[11px] font-semibold text-neutral-500 px-1">
                <span>
                  {isSalon
                    ? 'Peak Treatment Booking Hours'
                    : isPOS
                    ? 'Hourly Register Sales Velocity'
                    : 'Hourly Traffic Distribution'}
                </span>
                <span className="text-[#C4785A] font-bold">Today</span>
              </div>
              <div className="h-28 flex items-end justify-between gap-2.5 px-1 pt-3">
                {pillarHeights.map((height, i) => (
                  <div
                    key={i}
                    className="flex-1 flex flex-col justify-end items-center h-full group relative cursor-pointer"
                    title={pillarTooltips[i]}
                  >
                    <div
                      style={{
                        height: `${height}%`,
                        backgroundColor: pillarColors[i],
                      }}
                      className="w-full rounded-full transition-all group-hover:opacity-80 group-hover:scale-y-105"
                    />
                  </div>
                ))}
              </div>
              <div className="flex justify-between text-[9px] text-neutral-400 px-1 font-mono">
                <span>08:00</span>
                <span>12:00</span>
                <span>16:00</span>
                <span>19:00</span>
              </div>
            </div>
          </div>

          {/* Bottom 2 Metrics (Salon, POS, or Gym) */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-4 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs">
              <div className="text-[11px] font-semibold text-[#64748B] dark:text-neutral-400 flex items-center gap-1.5">
                <Clock size={13} className="text-neutral-400" />
                <span>
                  {isSalon ? 'Chair Utilization' : isPOS ? 'Average Basket' : 'Moyenne Semaine'}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-1.5">
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                  ↗ {isPOS ? 'Healthy' : '+8.5%'}
                </span>
              </div>
              <div className="text-xl font-black text-neutral-900 dark:text-white mt-1 tabular-nums font-mono">
                {isSalon ? '82.4%' : isPOS ? formatMoney(posMetrics.avgBasket) : '18,400 DA'}
              </div>
            </div>

            <div className="p-4 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs">
              <div className="text-[11px] font-semibold text-[#64748B] dark:text-neutral-400 flex items-center gap-1.5">
                <TrendingUp size={13} className="text-neutral-400" />
                <span>
                  {isSalon ? 'Daily Salon Sales' : isPOS ? 'Low Stock Depletion' : 'Objectif Mensuel'}
                </span>
              </div>
              <div className="mt-1 flex items-center gap-1.5">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isPOS && posMetrics.lowStockCount > 0
                    ? 'text-red-700 bg-red-100 dark:bg-red-950 dark:text-red-300'
                    : 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40'
                }`}>
                  {isPOS
                    ? posMetrics.lowStockCount > 0
                      ? `⚠ ${posMetrics.lowStockCount} need reorder`
                      : '✓ Stock Balanced'
                    : '↗ On Track'}
                </span>
              </div>
              <div className="text-xl font-black text-neutral-900 dark:text-white mt-1 tabular-nums">
                {isSalon ? formatMoney(salonMetrics.totalDailyRev) : isPOS ? `${posMetrics.lowStockCount} items` : '84.5%'}
              </div>
            </div>
          </div>

          {/* Conseil Atrium Tip Card */}
          <div className="p-5 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs space-y-3">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold tracking-wider text-[#C4785A] bg-[#C4785A]/10 px-2 py-0.5 rounded-md uppercase">
                  {activeTips[currentTipIndex].step}
                </span>
                <span className="font-bold text-neutral-800 dark:text-neutral-200">
                  {activeTips[currentTipIndex].title}
                </span>
              </div>
              <div className="flex items-center gap-1 text-neutral-400 text-xs">
                <button
                  type="button"
                  onClick={() =>
                    setCurrentTipIndex((prev) => (prev > 0 ? prev - 1 : activeTips.length - 1))
                  }
                  className="p-1 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="text-[11px] font-semibold text-neutral-500">
                  {currentTipIndex + 1} / {activeTips.length}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setCurrentTipIndex((prev) => (prev < activeTips.length - 1 ? prev + 1 : 0))
                  }
                  className="p-1 hover:text-neutral-700 dark:hover:text-neutral-200 cursor-pointer"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>

            <p className="text-xs text-[#52525B] dark:text-neutral-300 leading-relaxed min-h-[34px]">
              {activeTips[currentTipIndex].text}
            </p>

            <button
              type="button"
              onClick={activeTips[currentTipIndex].action}
              className="w-full h-10 rounded-xl bg-[#FDF4F0] dark:bg-neutral-700/70 text-[#C4785A] hover:bg-[#FBECE6] text-xs font-bold flex items-center justify-center gap-1 transition-colors cursor-pointer"
            >
              <span>{activeTips[currentTipIndex].buttonText}</span>
              <ChevronRight size={13} />
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: Activity & Stylist Chairs (7 cols on lg) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Top Activity Card with 3 Metrics */}
          <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[26px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-neutral-900 dark:text-white">
                  {isSalon ? 'Salon Workstation Performance' : 'Activity'}
                </h2>
                <p className="text-xs text-neutral-400 dark:text-neutral-500">
                  {isSalon
                    ? 'Stylist productivity, active chairs & service turnover'
                    : 'Track your daily operational activity.'}
                </p>
              </div>
              {isSalon && (
                <button
                  type="button"
                  onClick={() => setScreen('scheduler')}
                  className="text-xs font-bold text-[#C4785A] hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <span>Open Full Scheduler</span>
                  <ChevronRight size={13} />
                </button>
              )}
            </div>

            {isSalon ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Tile 1: Revenue Today */}
                <div className="p-4 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[126px]">
                  <div>
                    <span className="text-[11px] font-semibold text-[#64748B] dark:text-neutral-400">
                      Salon Revenue Today
                    </span>
                    <div className="mt-0.5">
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                        ↗ +14.2% vs avg
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="text-xl font-black text-neutral-900 dark:text-white tabular-nums">
                      {formatMoney(salonMetrics.totalDailyRev)}
                    </div>
                    <div className="w-full h-0.5 bg-[#C4785A] mt-2.5 rounded-full opacity-80" />
                  </div>
                </div>

                {/* Tile 2: Active Stylists */}
                <div className="p-4 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[126px]">
                  <div>
                    <span className="text-[11px] font-semibold text-[#64748B] dark:text-neutral-400">
                      Active Stylists
                    </span>
                    <div className="mt-0.5">
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                        {stylistChairs.filter((c) => c.status === 'InChair').length} in service
                      </span>
                    </div>
                  </div>
                  <div className="relative">
                    <div className="text-xl font-black text-neutral-900 dark:text-white tabular-nums">
                      {stylistChairs.length} Chairs
                    </div>
                    {/* Stylist avatar circles */}
                    <div className="flex -space-x-1.5 mt-2">
                      {stylistChairs.slice(0, 4).map((c, idx) => (
                        <div
                          key={idx}
                          className="w-6 h-6 rounded-full bg-[#C4785A]/15 text-[#C4785A] text-[10px] font-bold flex items-center justify-center border-2 border-white dark:border-neutral-800"
                        >
                          {c.stylist.fullName.charAt(0)}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Tile 3: Pending & In-Chair in Dark Obsidian */}
                <div className="p-4 rounded-[20px] bg-[#18181B] border border-neutral-800 text-white flex flex-col justify-between h-[126px] shadow-sm">
                  <div>
                    <span className="text-[11px] font-medium text-neutral-300">
                      Next Bookings Ahead
                    </span>
                    <div className="mt-0.5">
                      <span className="text-[10px] font-bold text-amber-300 bg-amber-400/20 px-2 py-0.5 rounded-full">
                        {salonMetrics.confirmedCount} upcoming
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="text-xl font-black text-white tabular-nums">
                      {salonMetrics.confirmedCount}
                    </div>
                    <div className="w-full h-0.5 bg-amber-500 mt-2.5 rounded-full opacity-80" />
                  </div>
                </div>
              </div>
            ) : isPOS ? (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-4 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[126px]">
                    <div>
                      <span className="text-[11px] font-semibold text-[#64748B] dark:text-neutral-400">
                        Total POS Revenue
                      </span>
                      <div className="mt-0.5">
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                          ↗ 100% Settled
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="text-xl font-black font-mono text-emerald-600 dark:text-emerald-400 tabular-nums">
                        {formatMoney(posMetrics.totalRev)}
                      </div>
                      <div className="w-full h-0.5 bg-[#C4785A] mt-2.5 rounded-full opacity-80" />
                    </div>
                  </div>

                  <div className="p-4 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[126px]">
                    <div>
                      <span className="text-[11px] font-semibold text-[#64748B] dark:text-neutral-400">
                        Store Inventory SKUs
                      </span>
                      <div className="mt-0.5">
                        <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                          Catalog In Stock
                        </span>
                      </div>
                    </div>
                    <div className="relative">
                      <div className="text-xl font-black text-neutral-900 dark:text-white tabular-nums">
                        {products.length} Products
                      </div>
                      <div className="text-[10px] text-neutral-400 mt-1">
                        {products.reduce((a, b) => a + b.stockQuantity, 0)} units total
                      </div>
                    </div>
                  </div>

                  <div className="p-4 rounded-[20px] bg-[#18181B] border border-neutral-800 text-white flex flex-col justify-between h-[126px] shadow-sm">
                    <div>
                      <span className="text-[11px] font-medium text-neutral-300">
                        Depletion Warning
                      </span>
                      <div className="mt-0.5">
                        <span className="text-[10px] font-bold text-amber-300 bg-amber-400/20 px-2 py-0.5 rounded-full">
                          {posMetrics.lowStockCount} below reorder level
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="text-xl font-black text-white tabular-nums">
                        {posMetrics.lowStockCount} Alerts
                      </div>
                      <div className="w-full h-0.5 bg-amber-500 mt-2.5 rounded-full opacity-80" />
                    </div>
                  </div>
                </div>

                {/* Top Selling Products Leaderboard */}
                {posMetrics.topProducts.length > 0 && (
                  <div className="p-4 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2 font-bold text-neutral-900 dark:text-white">
                        <Sparkles size={14} className="text-[#C4785A]" />
                        <span>Top Selling Products & Revenue Drivers</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setScreen('shop')}
                        className="text-[11px] font-bold text-[#C4785A] hover:underline"
                      >
                        Manage All SKUs →
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                      {posMetrics.topProducts.map((tp, idx) => (
                        <div
                          key={idx}
                          className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-100 dark:border-neutral-800 flex items-center justify-between"
                        >
                          <div className="min-w-0 pr-2">
                            <div className="text-xs font-bold text-neutral-800 dark:text-neutral-200 truncate">
                              {tp.name}
                            </div>
                            <div className="text-[10px] text-neutral-400">
                              {tp.quantity} units sold
                            </div>
                          </div>
                          <div className="text-xs font-mono font-bold text-[#C4785A] shrink-0">
                            {formatMoney(tp.revenue)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-4 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[126px]">
                  <div>
                    <span className="text-[11px] font-semibold text-[#64748B] dark:text-neutral-400">
                      Revenue Today
                    </span>
                    <div className="mt-0.5">
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                        ↗ 0%
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="text-xl font-black text-neutral-900 dark:text-white tabular-nums font-mono">
                      {formatMoney(sales.reduce((sum, s) => sum + s.totalAmount, 0))}
                    </div>
                    <div className="w-full h-0.5 bg-[#C4785A] mt-2.5 rounded-full opacity-80" />
                  </div>
                </div>

                <div className="p-4 rounded-[20px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs flex flex-col justify-between h-[126px]">
                  <div>
                    <span className="text-[11px] font-semibold text-[#64748B] dark:text-neutral-400">
                      Active Members
                    </span>
                    <div className="mt-0.5">
                      <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
                        vs yesterday
                      </span>
                    </div>
                  </div>
                  <div className="relative">
                    <div className="text-xl font-black text-neutral-900 dark:text-white tabular-nums">
                      {members.filter((m) => m.status === 'Active').length}
                    </div>
                    <svg
                      className="w-full h-7 mt-1 text-emerald-500"
                      viewBox="0 0 100 25"
                      fill="none"
                    >
                      <path
                        d="M0 20 Q 25 24 50 14 T 100 5"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>
                </div>

                <div className="p-4 rounded-[20px] bg-[#18181B] border border-neutral-800 text-white flex flex-col justify-between h-[126px] shadow-sm">
                  <div>
                    <span className="text-[11px] font-medium text-neutral-300">
                      Expiring Soon
                    </span>
                    <div className="mt-0.5">
                      <span className="text-[10px] font-bold text-amber-300 bg-amber-400/20 px-2 py-0.5 rounded-full">
                        ↘ 0%
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="text-xl font-black text-white tabular-nums">
                      0
                    </div>
                    <div className="w-full h-0.5 bg-amber-500 mt-2.5 rounded-full opacity-80" />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Salon Specific: Stylist Chairs Live Workstation Board */}
          {isSalon && (
            <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[26px] p-5 space-y-3.5 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
                    <Scissors size={16} className="text-[#C4785A]" />
                    <span>Stylist Chairs & Live Workstations</span>
                  </h3>
                  <p className="text-xs text-neutral-400 dark:text-neutral-500">
                    Real-time status of each practitioner chair
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAppointmentForEdit(null);
                    setIsAppointmentModalOpen(true);
                  }}
                  className="px-3 py-1.5 rounded-full bg-[#C4785A] text-white text-xs font-bold hover:opacity-90 flex items-center gap-1 cursor-pointer transition-all shadow-xs"
                >
                  <Plus size={13} />
                  <span>New Booking / Walk-in</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {stylistChairs.map((chair) => {
                  const isInChair = chair.status === 'InChair';
                  const isBooked = chair.status === 'Booked';

                  return (
                    <div
                      key={chair.stylist.id}
                      className={`p-3.5 rounded-[18px] border transition-all ${
                        isInChair
                          ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-300/80 dark:border-amber-700/60'
                          : isBooked
                          ? 'bg-white dark:bg-neutral-800 border-[#E9EEF0] dark:border-neutral-700/60'
                          : 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-200/60 dark:border-emerald-800/50'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-[#C4785A]/15 text-[#C4785A] font-bold text-xs flex items-center justify-center">
                            {chair.chairNumber}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-neutral-900 dark:text-white block leading-tight">
                              Chair {chair.chairNumber} • {chair.stylist.fullName}
                            </span>
                            <span className="text-[10px] text-neutral-400">
                              {chair.stylist.role}
                            </span>
                          </div>
                        </div>

                        <span
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                            isInChair
                              ? 'bg-amber-500 text-white animate-pulse'
                              : isBooked
                              ? 'bg-indigo-600 text-white'
                              : 'bg-emerald-600 text-white'
                          }`}
                        >
                          {isInChair ? 'In Chair' : isBooked ? 'Booked' : 'Available'}
                        </span>
                      </div>

                      {isInChair && chair.inChairBooking && (
                        <div className="mt-2 p-2.5 bg-white/80 dark:bg-neutral-900/60 rounded-xl border border-amber-200/60 dark:border-amber-900/40 text-xs">
                          <div className="flex justify-between items-start">
                            <span className="font-bold text-neutral-900 dark:text-white truncate">
                              {chair.inChairBooking.clientName}
                            </span>
                            <span className="font-bold text-[#C4785A]">
                              {formatMoney(chair.inChairBooking.price)}
                            </span>
                          </div>
                          <p className="text-[11px] text-neutral-500 truncate mt-0.5">
                            {chair.inChairBooking.serviceName} ({chair.inChairBooking.startTime} - {chair.inChairBooking.endTime})
                          </p>
                          <div className="mt-2 flex items-center justify-between pt-1.5 border-t border-neutral-100 dark:border-neutral-800">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedAppointmentForEdit(chair.inChairBooking!);
                                setIsAppointmentModalOpen(true);
                              }}
                              className="text-[11px] font-semibold text-neutral-600 hover:text-neutral-900 cursor-pointer"
                            >
                              Manage Service
                            </button>
                            <button
                              type="button"
                              onClick={() => handleQuickCheckout(chair.inChairBooking!)}
                              className="px-2 py-0.5 rounded-md bg-[#C4785A] text-white text-[10px] font-bold hover:opacity-90 cursor-pointer flex items-center gap-1 shadow-2xs"
                            >
                              <CreditCard size={10} />
                              <span>1-Click Checkout</span>
                            </button>
                          </div>
                        </div>
                      )}

                      {isBooked && chair.nextBooking && (
                        <div className="mt-2 p-2.5 bg-neutral-50/80 dark:bg-neutral-900/40 rounded-xl border border-neutral-200/60 dark:border-neutral-800 text-xs">
                          <div className="flex justify-between items-start">
                            <span className="font-bold text-neutral-800 dark:text-neutral-200 truncate">
                              Next: {chair.nextBooking.clientName}
                            </span>
                            <span className="text-[11px] font-semibold text-neutral-500">
                              {chair.nextBooking.startTime}
                            </span>
                          </div>
                          <p className="text-[11px] text-neutral-500 truncate mt-0.5">
                            {chair.nextBooking.serviceName}
                          </p>
                        </div>
                      )}

                      {!isInChair && !isBooked && (
                        <div className="mt-2 p-2.5 rounded-xl border border-dashed border-emerald-300 dark:border-emerald-800/60 text-center">
                          <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium">
                            Chair is open for walk-in client
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedAppointmentForEdit(null);
                              setIsAppointmentModalOpen(true);
                            }}
                            className="mt-1 text-[11px] font-bold text-[#C4785A] hover:underline cursor-pointer"
                          >
                            + Seat Walk-in Now
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Activity Table Group */}
          <div className="bg-[#F8F9FA] dark:bg-neutral-800/40 rounded-[26px] p-5 space-y-4 border border-[#EDF1F3] dark:border-neutral-800/60 shadow-2xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white">
                  {isSalon ? 'Live Treatment & Sales Stream' : 'Recent Activity'}
                </h3>
                <p className="text-xs text-neutral-400 dark:text-neutral-500">
                  {isSalon
                    ? 'Real-time appointments, in-chair statuses, and POS checkouts'
                    : 'Track your daily operational activity.'}
                </p>
              </div>

              {/* Activity Filter Tabs */}
              {isSalon ? (
                <div className="h-8 p-0.5 rounded-full bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex items-center gap-0.5 text-xs font-semibold shadow-2xs">
                  {(['Tous', 'Rendezvous', 'Ventes'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setSalonActivityTab(tab)}
                      style={{
                        backgroundColor:
                          salonActivityTab === tab ? '#FDF4F0' : 'transparent',
                        color:
                          salonActivityTab === tab ? 'var(--color-accent)' : '#71717A',
                      }}
                      className={`px-3 py-1 rounded-full cursor-pointer transition-all ${
                        salonActivityTab === tab ? 'font-bold' : 'hover:text-neutral-900 dark:hover:text-white'
                      }`}
                    >
                      {tab === 'Rendezvous' ? 'Bookings' : tab === 'Ventes' ? 'Sales' : 'All'}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="h-8 p-0.5 rounded-full bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 flex items-center gap-0.5 text-xs font-semibold shadow-2xs">
                  {(['Tous', 'Passages', 'Ventes'] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setActivityTab(tab)}
                      style={{
                        backgroundColor:
                          activityTab === tab ? '#FDF4F0' : 'transparent',
                        color:
                          activityTab === tab ? 'var(--color-accent)' : '#71717A',
                      }}
                      className={`px-3 py-1 rounded-full cursor-pointer transition-all ${
                        activityTab === tab ? 'font-bold' : 'hover:text-neutral-900 dark:hover:text-white'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Rows */}
            <div className="space-y-2">
              <div className="grid grid-cols-12 px-4 py-2 text-[11px] font-bold text-neutral-400 dark:text-neutral-500 uppercase tracking-wider">
                <div className="col-span-5 flex items-center gap-1">
                  <span>{isSalon ? 'Client' : 'Membre'}</span>
                  <span className="text-[10px]">↕</span>
                </div>
                <div className="col-span-4">{isSalon ? 'Treatment / Service' : 'Opération'}</div>
                <div className="col-span-1 text-center">Statut</div>
                <div className="col-span-2 text-right">{isSalon ? 'Time / Total' : 'Heure'}</div>
              </div>

              <div className="space-y-2">
                {isSalon ? (
                  filteredSalonActivities.map((row) => (
                    <div
                      key={row.id}
                      className="grid grid-cols-12 items-center px-4 py-3 rounded-[16px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs hover:border-[#D5DFE3] dark:hover:border-neutral-600 transition-all"
                    >
                      <div className="col-span-5 flex items-center gap-2.5 min-w-0 pr-2">
                        <div className="w-8 h-8 rounded-full bg-[#FDF4F0] dark:bg-neutral-700/80 text-[#C4785A] flex items-center justify-center font-bold text-[11px] shrink-0 border border-[#F5E2D8] dark:border-neutral-600">
                          {row.type === 'Ventes' ? '$$' : <Scissors size={12} />}
                        </div>
                        <span className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                          {row.client}
                        </span>
                      </div>

                      <div className="col-span-4 text-xs text-[#52525B] dark:text-neutral-300 font-medium truncate pr-2">
                        {row.operation}
                      </div>

                      <div className="col-span-1 flex justify-center">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${row.badgeColor}`}>
                          {row.status}
                        </span>
                      </div>

                      <div className="col-span-2 text-right text-xs text-neutral-400 font-mono tabular-nums">
                        {row.time}
                      </div>
                    </div>
                  ))
                ) : isPOS ? (
                  sales.length === 0 ? (
                    <div className="py-8 text-center text-xs text-neutral-400 space-y-2">
                      <Receipt size={24} className="mx-auto opacity-40" />
                      <p>No register sales recorded yet today.</p>
                      <button
                        type="button"
                        onClick={() => setScreen('shop')}
                        className="px-4 py-1.5 rounded-full bg-[#C4785A] text-white text-xs font-bold hover:opacity-90"
                      >
                        Open POS Register
                      </button>
                    </div>
                  ) : (
                    sales.slice(0, 6).map((sale) => (
                      <div
                        key={sale.id}
                        onClick={() => setScreen('history')}
                        className="grid grid-cols-12 items-center px-4 py-3 rounded-[16px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs hover:border-[#C4785A] transition-all cursor-pointer group"
                      >
                        <div className="col-span-5 flex items-center gap-2.5 min-w-0 pr-2">
                          <div className="w-8 h-8 rounded-full bg-[#FDF4F0] dark:bg-neutral-700/80 text-[#C4785A] flex items-center justify-center font-bold text-[11px] shrink-0 border border-[#F5E2D8] dark:border-neutral-600">
                            <Receipt size={13} />
                          </div>
                          <div className="min-w-0">
                            <span className="text-xs font-bold text-neutral-900 dark:text-white truncate block group-hover:text-[#C4785A] transition-colors">
                              {sale.memberName || 'Walk-in Customer'}
                            </span>
                            <span className="text-[10px] text-neutral-400 font-mono">
                              #{sale.id.slice(-6).toUpperCase()} · {sale.items.length} {sale.items.length === 1 ? 'item' : 'items'}
                            </span>
                          </div>
                        </div>

                        <div className="col-span-4 text-xs text-[#52525B] dark:text-neutral-300 font-medium truncate pr-2">
                          {sale.items.map((i) => `${i.quantity}x ${i.productName}`).join(', ')}
                        </div>

                        <div className="col-span-1 flex justify-center">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold ${
                            sale.status === 'Refunded'
                              ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                          }`}>
                            {sale.paymentMethod}
                          </span>
                        </div>

                        <div className="col-span-2 text-right">
                          <div className="text-xs font-mono font-bold text-neutral-900 dark:text-white">
                            {formatMoney(sale.totalAmount)}
                          </div>
                          <div className="text-[10px] text-neutral-400 font-mono">
                            {new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>
                    ))
                  )
                ) : (
                  filteredGymActivities.map((row) => (
                    <div
                      key={row.id}
                      className="grid grid-cols-12 items-center px-4 py-3 rounded-[16px] bg-white dark:bg-neutral-800 border border-[#E9EEF0] dark:border-neutral-700/60 shadow-2xs hover:border-[#D5DFE3] dark:hover:border-neutral-600 transition-all"
                    >
                      <div className="col-span-5 flex items-center gap-2.5 min-w-0 pr-2">
                        <div className="w-8 h-8 rounded-full bg-[#FDF4F0] dark:bg-neutral-700/80 text-[#C4785A] flex items-center justify-center font-bold text-[11px] shrink-0 border border-[#F5E2D8] dark:border-neutral-600">
                          {row.type === 'Ventes' ? '$$' : 'IN'}
                        </div>
                        <span className="text-xs font-bold text-neutral-900 dark:text-white truncate">
                          {row.member}
                        </span>
                      </div>

                      <div className="col-span-4 text-xs text-[#52525B] dark:text-neutral-300 font-medium truncate pr-2">
                        {row.operation}
                      </div>

                      <div className="col-span-1 flex justify-center">
                        <div className="w-6 h-6 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                          {row.type === 'Ventes' ? (
                            <ShoppingCart size={13} />
                          ) : (
                            <UserCheck size={13} />
                          )}
                        </div>
                      </div>

                      <div className="col-span-2 text-right text-xs text-neutral-400 font-mono tabular-nums">
                        {row.time}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Appointment Modal for Booking or Editing from Dashboard */}
      {isAppointmentModalOpen && (
        <AppointmentModal
          isOpen={isAppointmentModalOpen}
          onClose={() => {
            setIsAppointmentModalOpen(false);
            setSelectedAppointmentForEdit(null);
          }}
          appointment={selectedAppointmentForEdit}
        />
      )}
    </div>
  );
};
