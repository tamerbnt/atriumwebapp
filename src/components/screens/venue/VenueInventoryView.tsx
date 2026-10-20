import React, { useState } from 'react';
import {
  Plus,
  DoorOpen,
  Users,
  Maximize2,
  DollarSign,
  Tag,
  Sparkles,
  Trash2,
  Edit2,
  Check,
  X,
  Search,
} from 'lucide-react';
import { useAtriumStore } from '../../../services/store';
import { RentableUnit, RentableUnitType, RentableUnitStatus } from '../../../types/index';
import { formatCurrencyAmount } from '../../../utils/rules';
import { BookingModal } from './BookingModal';
import { Seek } from '../../ui/Seek';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';

export const VenueInventoryView: React.FC = () => {
  const {
    rentableUnits,
    createRentableUnit,
    updateRentableUnit,
    deleteRentableUnit,
    showToast,
  } = useAtriumStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTypeFilter, setSelectedTypeFilter] = useState<'All' | RentableUnitType>('All');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [unitToEdit, setUnitToEdit] = useState<RentableUnit | null>(null);

  // Booking modal trigger
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [selectedUnitForBooking, setSelectedUnitForBooking] = useState<string | undefined>(undefined);

  // New Unit Form State
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [type, setType] = useState<RentableUnitType>('Hall');
  const [capacity, setCapacity] = useState(50);
  const [surfaceAreaSqm, setSurfaceAreaSqm] = useState(120);
  const [hourlyRate, setHourlyRate] = useState(8000);
  const [dailyRate, setDailyRate] = useState(60000);
  const [amenitiesStr, setAmenitiesStr] = useState('High-Speed Wifi, Climate Control AC, Sound System');
  const [description, setDescription] = useState('');
  const [colorHex, setColorHex] = useState('#8B5CF6');

  const filteredUnits = rentableUnits.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedTypeFilter === 'All' || u.type === selectedTypeFilter;
    return matchesSearch && matchesType;
  });

  const handleOpenAdd = () => {
    setUnitToEdit(null);
    setName('');
    setCode(`ROOM-${Math.floor(100 + Math.random() * 900)}`);
    setType('Room');
    setCapacity(30);
    setSurfaceAreaSqm(80);
    setHourlyRate(5000);
    setDailyRate(35000);
    setAmenitiesStr('Wifi, Presentation Screen, AC');
    setDescription('');
    setColorHex('#3B82F6');
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (unit: RentableUnit) => {
    setUnitToEdit(unit);
    setName(unit.name);
    setCode(unit.code);
    setType(unit.type);
    setCapacity(unit.capacity);
    setSurfaceAreaSqm(unit.surfaceAreaSqm || 50);
    setHourlyRate(unit.hourlyRate);
    setDailyRate(unit.dailyRate);
    setAmenitiesStr(unit.amenities.join(', '));
    setDescription(unit.description);
    setColorHex(unit.colorHex || '#8B5CF6');
    setIsAddModalOpen(true);
  };

  const handleSaveUnit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast({
        type: 'warning',
        title: 'Missing Space Name',
        message: 'Please provide a name for this unit (e.g. Grand Ballroom, Studio A).',
      });
      return;
    }
    if (!code.trim()) {
      showToast({
        type: 'warning',
        title: 'Missing Space Code',
        message: 'Please provide a unique reference code (e.g. HALL-01).',
      });
      return;
    }

    const amenities = amenitiesStr
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (unitToEdit) {
      updateRentableUnit(unitToEdit.id, {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        type,
        capacity,
        surfaceAreaSqm,
        hourlyRate,
        dailyRate,
        amenities,
        description: description.trim(),
        colorHex,
      });
    } else {
      createRentableUnit({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        type,
        capacity,
        surfaceAreaSqm,
        hourlyRate,
        dailyRate,
        currency: 'DZD',
        amenities,
        status: 'Available',
        description: description.trim() || 'Bookable space and venue unit.',
        colorHex,
      });
    }

    setIsAddModalOpen(false);
  };

  const handleToggleStatus = (unit: RentableUnit) => {
    const nextStatus: RentableUnitStatus =
      unit.status === 'Available'
        ? 'Occupied'
        : unit.status === 'Occupied'
        ? 'Maintenance'
        : 'Available';
    updateRentableUnit(unit.id, { status: nextStatus });
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Spaces & Assets Catalog
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Manage bookable event halls, photo studios, meeting rooms, padel courts & desk pods
          </p>
        </div>

        <button
          onClick={handleOpenAdd}
          className="px-5 py-2.5 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-2 self-start sm:self-auto"
        >
          <Plus size={16} />
          Add Space / Unit
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <Seek
          value={searchQuery}
          onChange={setSearchQuery}
          placeholder="Search spaces by name, code or amenities..."
          openWidth={320}
          shutSize={40}
        />

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {(['All', 'Hall', 'Studio', 'Room', 'Court', 'Desk'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setSelectedTypeFilter(t)}
              className={`px-3 py-1.5 rounded-xl font-medium transition-colors whitespace-nowrap shrink-0 ${
                selectedTypeFilter === t
                  ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900'
                  : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200'
              }`}
            >
              {t === 'All' ? 'All' : `${t}s`}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Rentable Units */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUnits.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-neutral-50 dark:bg-neutral-800/30 rounded-3xl border border-neutral-200 dark:border-neutral-800">
            <DoorOpen size={36} className="mx-auto text-neutral-400 mb-2" />
            <h3 className="text-base font-semibold text-neutral-900 dark:text-white">
              No spaces found
            </h3>
            <p className="text-xs text-neutral-400 mt-1">
              Add your first bookable room, hall or studio using the button above.
            </p>
          </div>
        ) : (
          filteredUnits.map((unit) => (
            <div
              key={unit.id}
              className="p-6 rounded-3xl bg-white dark:bg-neutral-800/60 border border-[#E9EEF0] dark:border-neutral-800 flex flex-col justify-between hover:border-neutral-300 dark:hover:border-neutral-700 transition-all shadow-2xs"
            >
              <div>
                {/* Header row */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: unit.colorHex || '#8B5CF6' }}
                    />
                    <span className="text-xs font-mono font-semibold text-neutral-500 uppercase">
                      {unit.code}
                    </span>
                    <span className="text-[11px] text-neutral-400">· {unit.type}</span>
                  </div>

                  <button
                    onClick={() => handleToggleStatus(unit)}
                    className={`px-2.5 py-1 rounded-full text-[10px] font-semibold tracking-wide uppercase transition-colors ${
                      unit.status === 'Available'
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 hover:bg-emerald-200'
                        : unit.status === 'Occupied'
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300 hover:bg-purple-200'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 hover:bg-amber-200'
                    }`}
                    title="Click to toggle status"
                  >
                    {unit.status}
                  </button>
                </div>

                <h3 className="font-bold text-base text-neutral-900 dark:text-white">
                  {unit.name}
                </h3>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-2">
                  {unit.description}
                </p>

                {/* Specs */}
                <div className="grid grid-cols-2 gap-2 mt-4 p-3 bg-neutral-50 dark:bg-neutral-800/40 rounded-2xl text-xs">
                  <div>
                    <span className="text-neutral-400 block text-[10px] uppercase font-medium">Capacity</span>
                    <span className="font-semibold text-neutral-900 dark:text-white tabular-nums">
                      {unit.capacity} Guests
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[10px] uppercase font-medium">Surface</span>
                    <span className="font-semibold text-neutral-900 dark:text-white tabular-nums">
                      {unit.surfaceAreaSqm || '--'} m²
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[10px] uppercase font-medium">Hourly Rate</span>
                    <span className="font-semibold text-neutral-900 dark:text-white tabular-nums">
                      {formatCurrencyAmount(unit.hourlyRate, unit.currency)}
                    </span>
                  </div>
                  <div>
                    <span className="text-neutral-400 block text-[10px] uppercase font-medium">Full Day</span>
                    <span className="font-semibold text-neutral-900 dark:text-white tabular-nums">
                      {formatCurrencyAmount(unit.dailyRate, unit.currency)}
                    </span>
                  </div>
                </div>

                {/* Amenities pills */}
                {unit.amenities.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {unit.amenities.map((amenity, idx) => (
                      <span
                        key={idx}
                        className="text-[10px] bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300 px-2 py-0.5 rounded-md"
                      >
                        {amenity}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="mt-5 pt-3 border-t border-neutral-100 dark:border-neutral-700/50 flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleOpenEdit(unit)}
                    className="p-2 text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-700 transition-colors"
                    title="Edit Space"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Are you sure you want to delete ${unit.name}?`)) {
                        deleteRentableUnit(unit.id);
                      }
                    }}
                    className="p-2 text-neutral-400 hover:text-red-500 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                    title="Delete Space"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <button
                  onClick={() => {
                    setSelectedUnitForBooking(unit.id);
                    setIsBookingModalOpen(true);
                  }}
                  className="px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 rounded-xl text-xs font-semibold transition-colors"
                >
                  Book Space
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add / Edit Unit Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white dark:bg-[#18181B] rounded-[28px] border border-[#E9EEF0] dark:border-neutral-800 shadow-2xl max-w-xl w-full p-6 space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800">
              <h3 className="text-lg font-bold text-neutral-900 dark:text-white">
                {unitToEdit ? 'Edit Space Specifications' : 'Add New Bookable Space'}
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-neutral-400 hover:text-neutral-700 rounded-lg"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveUnit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <LabelInput
                    id="space-name"
                    label="Space Name"
                    placeholder="e.g. Daylight Cyclorama Studio"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div>
                  <LabelInput
                    id="space-code"
                    label="Unit Code (e.g. STU-02)"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                  />
                </div>

                <LabelSelect
                  field="Category"
                  label="Space Category"
                  value={type}
                  onChange={(val) => setType(typeof val === 'string' ? (val as RentableUnitType) : (val.target?.value || val))}
                  options={[
                    { value: 'Hall', label: 'Event / Banquet Hall' },
                    { value: 'Studio', label: 'Photo / Video Studio' },
                    { value: 'Room', label: 'Meeting / Boardroom' },
                    { value: 'Court', label: 'Sports / Padel Court' },
                    { value: 'Desk', label: 'Coworking Desk Pod' },
                    { value: 'Equipment', label: 'Asset & Gear Kit' },
                  ]}
                  height={44}
                  corner={14}
                />

                <div>
                  <LabelInput
                    id="space-capacity"
                    label="Guest Capacity (Max)"
                    type="number"
                    value={capacity}
                    onChange={(e) => setCapacity(Number(e.target.value))}
                    required
                  />
                </div>

                <div>
                  <LabelInput
                    id="space-surface"
                    label="Surface Area (m²)"
                    type="number"
                    value={surfaceAreaSqm}
                    onChange={(e) => setSurfaceAreaSqm(Number(e.target.value))}
                  />
                </div>

                <div>
                  <LabelInput
                    id="space-hourly-rate"
                    label="Hourly Rate (DZD)"
                    type="number"
                    value={hourlyRate}
                    onChange={(e) => setHourlyRate(Number(e.target.value))}
                    required
                  />
                </div>

                <div>
                  <LabelInput
                    id="space-daily-rate"
                    label="Full Day Rate (DZD)"
                    type="number"
                    value={dailyRate}
                    onChange={(e) => setDailyRate(Number(e.target.value))}
                  />
                </div>

                <div className="col-span-2">
                  <LabelInput
                    id="space-amenities"
                    label="Amenities (comma-separated)"
                    placeholder="e.g. Line array sound, 4K screen, Dressing room, Catering kitchen"
                    value={amenitiesStr}
                    onChange={(e) => setAmenitiesStr(e.target.value)}
                  />
                </div>

                <div className="col-span-2">
                  <label className="block font-medium text-neutral-700 dark:text-neutral-300 mb-1">
                    Description
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Describe layout, acoustics, equipment provided..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="w-full px-3 py-2 bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-neutral-200 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-neutral-600 hover:text-neutral-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[var(--color-accent)] hover:bg-[var(--color-accent-hover)] text-white font-semibold rounded-xl"
                >
                  {unitToEdit ? 'Save Changes' : 'Create Space'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Booking Modal */}
      <BookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
        initialUnitId={selectedUnitForBooking}
      />
    </div>
  );
};
