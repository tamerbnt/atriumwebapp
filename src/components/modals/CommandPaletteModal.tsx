import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search,
  Home,
  Users,
  Calendar,
  ShoppingBag,
  CreditCard,
  History,
  Settings,
  Sparkles,
  Sun,
  Moon,
  ArrowRight,
  User,
  Package,
  FileText,
  Clock,
  Layers,
  GraduationCap,
  DoorOpen,
  X,
  Command,
} from 'lucide-react';
import { useAtriumStore, ActiveScreen } from '../../services/store';

export interface CommandPaletteModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface PaletteItem {
  id: string;
  title: string;
  subtitle?: string;
  category: 'Navigation' | 'Records' | 'Actions';
  icon: React.ReactNode;
  onSelect: () => void;
}

export const CommandPaletteModal: React.FC<CommandPaletteModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    activeScreen,
    setScreen,
    currentBusiness,
    theme,
    setTheme,
    terminology,
    members,
    products,
    freelanceClients,
    freelanceInvoices,
    rentalRenters,
    rentalBookings,
    eduStudents,
    eduCohorts,
    openFastSwitch,
    openOnboarding,
    selectMember,
  } = useAtriumStore();

  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const category = currentBusiness?.category || 'pos_inventory';

  const items = useMemo<PaletteItem[]>(() => {
    const list: PaletteItem[] = [];

    // 1. Navigation items
    const navItems: Array<{ id: ActiveScreen; label: string; icon: React.ReactNode }> = [
      { id: 'dashboard', label: 'Dashboard & Command Center', icon: <Home size={15} /> },
      { id: 'members', label: `${terminology.members} CRM & Directory`, icon: <Users size={15} /> },
      { id: 'scheduler', label: `${terminology.scheduler} & Calendar`, icon: <Calendar size={15} /> },
      { id: 'shop', label: `${terminology.shop}`, icon: <ShoppingBag size={15} /> },
      { id: 'registrations', label: `${terminology.registration} Funnel`, icon: <FileText size={15} /> },
      { id: 'finance', label: 'Finance & Staff Management', icon: <CreditCard size={15} /> },
      { id: 'history', label: 'Transaction History & Audit Logs', icon: <History size={15} /> },
      { id: 'settings', label: 'Settings & License Entitlements', icon: <Settings size={15} /> },
    ];

    navItems.forEach((nav) => {
      list.push({
        id: `nav-${nav.id}`,
        title: nav.label,
        category: 'Navigation',
        icon: nav.icon,
        onSelect: () => {
          setScreen(nav.id);
          onClose();
        },
      });
    });

    // 2. Action items
    list.push({
      id: 'action-facility',
      title: 'Switch Facility / Branch',
      subtitle: 'Fast tenant & location switcher',
      category: 'Actions',
      icon: <Layers size={15} className="text-[#C4785A]" />,
      onSelect: () => {
        openFastSwitch();
        onClose();
      },
    });

    list.push({
      id: 'action-theme',
      title: theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode',
      category: 'Actions',
      icon: theme === 'dark' ? <Sun size={15} className="text-amber-400" /> : <Moon size={15} className="text-indigo-400" />,
      onSelect: () => {
        setTheme(theme === 'dark' ? 'light' : 'dark');
        onClose();
      },
    });

    list.push({
      id: 'action-wizard',
      title: 'Relaunch Setup Wizard',
      subtitle: 'Replay brand intro and business config',
      category: 'Actions',
      icon: <Sparkles size={15} className="text-[#C4785A]" />,
      onSelect: () => {
        openOnboarding();
        onClose();
      },
    });

    // 3. CRM Records depending on vertical
    if (category === 'education_cohort') {
      eduStudents.slice(0, 15).forEach((st) => {
        list.push({
          id: `student-${st.id}`,
          title: st.fullName,
          subtitle: `Student • ${st.guardianPhone || st.email || 'Enrolled'}`,
          category: 'Records',
          icon: <GraduationCap size={15} className="text-emerald-500" />,
          onSelect: () => {
            setScreen('members');
            onClose();
          },
        });
      });
      eduCohorts.slice(0, 5).forEach((co) => {
        list.push({
          id: `cohort-${co.id}`,
          title: co.name,
          subtitle: `Cohort • ${co.classroomName || 'Classroom'}`,
          category: 'Records',
          icon: <Calendar size={15} className="text-blue-500" />,
          onSelect: () => {
            setScreen('shop');
            onClose();
          },
        });
      });
    } else if (category === 'freelance_solo') {
      freelanceClients.slice(0, 15).forEach((cl) => {
        list.push({
          id: `client-${cl.id}`,
          title: cl.name,
          subtitle: `Client • ${cl.company || cl.email || ''}`,
          category: 'Records',
          icon: <User size={15} className="text-purple-500" />,
          onSelect: () => {
            setScreen('members');
            onClose();
          },
        });
      });
      freelanceInvoices.slice(0, 5).forEach((inv) => {
        list.push({
          id: `invoice-${inv.id}`,
          title: `Invoice ${inv.invoiceNumber}`,
          subtitle: `${inv.clientName} • ${inv.currency} ${inv.totalAmount.toLocaleString()} (${inv.status})`,
          category: 'Records',
          icon: <FileText size={15} className="text-emerald-500" />,
          onSelect: () => {
            setScreen('shop');
            onClose();
          },
        });
      });
    } else if (category === 'rental_booking') {
      rentalRenters.slice(0, 10).forEach((ren) => {
        list.push({
          id: `renter-${ren.id}`,
          title: ren.fullName,
          subtitle: `Renter • ${ren.phone || ren.companyName || ''}`,
          category: 'Records',
          icon: <DoorOpen size={15} className="text-amber-500" />,
          onSelect: () => {
            setScreen('members');
            onClose();
          },
        });
      });
    } else {
      members.slice(0, 15).forEach((mem) => {
        list.push({
          id: `mem-${mem.id}`,
          title: mem.fullName,
          subtitle: `${mem.status} • ${mem.phoneNumber || mem.email || ''}`,
          category: 'Records',
          icon: <User size={15} className="text-[#C4785A]" />,
          onSelect: () => {
            selectMember(mem.id);
            setScreen('members');
            onClose();
          },
        });
      });

      products.slice(0, 10).forEach((prod) => {
        list.push({
          id: `prod-${prod.id}`,
          title: prod.name,
          subtitle: `Product • ${prod.price} DZD • Stock: ${prod.stockQuantity}`,
          category: 'Records',
          icon: <Package size={15} className="text-blue-500" />,
          onSelect: () => {
            setScreen('shop');
            onClose();
          },
        });
      });
    }

    return list;
  }, [
    terminology,
    category,
    theme,
    members,
    products,
    freelanceClients,
    freelanceInvoices,
    rentalRenters,
    eduStudents,
    eduCohorts,
  ]);

  const filteredItems = useMemo(() => {
    if (!query.trim()) {
      return items.slice(0, 12);
    }
    const q = query.toLowerCase();
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.subtitle?.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q)
    );
  }, [items, query]);

  // Keyboard navigation inside palette
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % Math.max(1, filteredItems.length));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 + filteredItems.length) % Math.max(1, filteredItems.length));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (filteredItems[selectedIndex]) {
          filteredItems[selectedIndex].onSelect();
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, filteredItems, selectedIndex, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 sm:pt-24 p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-150">
      <div
        className="w-full max-w-xl rounded-3xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-2xl overflow-hidden flex flex-col max-h-[80vh] animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Bar */}
        <div className="p-4 border-b border-neutral-100 dark:border-neutral-800 flex items-center gap-3">
          <Search size={18} className="text-[#C4785A] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            placeholder="Type a screen, client, student, invoice, or action..."
            className="w-full bg-transparent text-sm text-neutral-900 dark:text-white placeholder:text-neutral-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Results List */}
        <div className="overflow-y-auto p-2 divide-y divide-neutral-50 dark:divide-neutral-800/40">
          {filteredItems.length === 0 ? (
            <div className="py-12 text-center text-xs text-neutral-400">
              No matching screens, records, or actions found for "{query}".
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const isSelected = index === selectedIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={item.onSelect}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={`w-full flex items-center justify-between p-3 rounded-2xl text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#FDF4F0] dark:bg-neutral-800 text-neutral-900 dark:text-white scale-[1.01]'
                      : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 dark:hover:bg-neutral-800/50'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-[#C4785A] text-white shadow-xs'
                          : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-500 dark:text-neutral-400'
                      }`}
                    >
                      {item.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate">{item.title}</div>
                      {item.subtitle && (
                        <div className="text-[11px] text-neutral-400 truncate -mt-0.5">
                          {item.subtitle}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-500 uppercase">
                      {item.category}
                    </span>
                    {isSelected && (
                      <ArrowRight size={13} className="text-[#C4785A] hidden sm:block" />
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Footer Shortcut Hints */}
        <div className="p-3 bg-neutral-50 dark:bg-neutral-950/60 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-[11px] text-neutral-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md font-mono text-[9px] shadow-2xs">
                ↑↓
              </kbd>
              Navigate
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md font-mono text-[9px] shadow-2xs">
                ↵
              </kbd>
              Select
            </span>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-md font-mono text-[9px] shadow-2xs">
                ESC
              </kbd>
              Close
            </span>
          </div>

          <div className="flex items-center gap-1 font-semibold text-[#C4785A]">
            <Command size={11} />
            <span>Atrium Quick Navigator</span>
          </div>
        </div>
      </div>
    </div>
  );
};
