import React, { useState } from 'react';
import { Building2, X } from 'lucide-react';
import { useAtriumStore, showToast } from '../../../services/store';
import { RealEstateProperty } from '../../../types';
import { LabelInput } from '../../ui/LabelInput';
import { LabelSelect } from '../../ui/LabelSelect';
import { AtriumButton } from '../../ui/AtriumButton';

interface RealEstatePropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (prop: RealEstateProperty) => void;
  propertyToEdit?: RealEstateProperty | null;
}

export const RealEstatePropertyModal: React.FC<RealEstatePropertyModalProps> = ({
  isOpen,
  onClose,
  onSave,
  propertyToEdit,
}) => {
  const { language, currentBusiness, currentBranch, currentUser } = useAtriumStore();
  const [title, setTitle] = useState(propertyToEdit?.title || '');
  const [propertyType, setPropertyType] = useState<'Apartment' | 'Villa' | 'Office' | 'Commercial' | 'Land' | 'Warehouse'>(propertyToEdit?.propertyType || 'Apartment');
  const [surfaceM2, setSurfaceM2] = useState(propertyToEdit ? String(propertyToEdit.surfaceM2) : '120');
  const [roomsCount, setRoomsCount] = useState(propertyToEdit ? String(propertyToEdit.roomsCount) : '3');
  const [address, setAddress] = useState(propertyToEdit?.address || '');
  const [cityWilaya, setCityWilaya] = useState(propertyToEdit?.cityWilaya || 'Alger');
  const [priceDzd, setPriceDzd] = useState(propertyToEdit ? String(propertyToEdit.priceDzd) : '150000');
  const [ownerName, setOwnerName] = useState(propertyToEdit?.ownerName || '');
  const [ownerPhone, setOwnerPhone] = useState(propertyToEdit?.ownerPhone || '');

  React.useEffect(() => {
    if (propertyToEdit) {
      setTitle(propertyToEdit.title);
      setPropertyType(propertyToEdit.propertyType);
      setSurfaceM2(String(propertyToEdit.surfaceM2));
      setRoomsCount(String(propertyToEdit.roomsCount));
      setAddress(propertyToEdit.address);
      setCityWilaya(propertyToEdit.cityWilaya);
      setPriceDzd(String(propertyToEdit.priceDzd));
      setOwnerName(propertyToEdit.ownerName);
      setOwnerPhone(propertyToEdit.ownerPhone);
    } else {
      setTitle('');
      setPropertyType('Apartment');
      setSurfaceM2('120');
      setRoomsCount('3');
      setAddress('');
      setCityWilaya('Alger');
      setPriceDzd('150000');
      setOwnerName('');
      setOwnerPhone('');
    }
  }, [propertyToEdit]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !address.trim() || !ownerName.trim()) {
      showToast('Veuillez renseigner le titre, l\'adresse et le propriétaire', 'error');
      return;
    }

    const saved: RealEstateProperty = {
      id: propertyToEdit ? propertyToEdit.id : `prop_${Date.now()}`,
      accountId: 'acc_01',
      businessId: currentBusiness?.id || 'biz_realestate',
      branchId: currentBranch?.id || 'branch_realestate_main',
      staffId: currentUser?.id || 'staff_01',
      title: title.trim(),
      propertyType,
      listingType: 'Rental',
      surfaceM2: parseFloat(surfaceM2) || 100,
      roomsCount: parseInt(roomsCount) || 3,
      address: address.trim(),
      cityWilaya: cityWilaya.trim() || 'Alger',
      priceDzd: parseFloat(priceDzd) || 100000,
      ownerName: ownerName.trim(),
      ownerPhone: ownerPhone.trim(),
      status: propertyToEdit?.status || 'Available',
      amenities: propertyToEdit?.amenities || ['Chauffage central', 'Cuisine équipée', 'Ascenseur'],
      createdAt: propertyToEdit?.createdAt || new Date().toISOString(),
    };


    onSave(saved);
    showToast(
      language === 'ar' ? 'تم إضافة العقار إلى المحفظة بنجاح' : 'Bien immobilier ajouté avec succès',
      'success'
    );
    onClose();
  };

  const typeOptions = [
    { value: 'Apartment', label: language === 'ar' ? 'شقة' : 'Appartement' },
    { value: 'Villa', label: language === 'ar' ? 'فيلا' : 'Villa' },
    { value: 'Office', label: language === 'ar' ? 'مكاتب' : 'Bureaux' },
    { value: 'Commercial', label: language === 'ar' ? 'محل تجاري' : 'Local Commercial' },
    { value: 'Warehouse', label: language === 'ar' ? 'مستودع' : 'Entrepôt / Dépôt' },
    { value: 'Land', label: language === 'ar' ? 'أرض' : 'Terrain' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-neutral-200 dark:border-neutral-800 space-y-5">
        <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#C4785A]/15 text-[#C4785A] flex items-center justify-center font-bold">
              <Building2 size={16} />
            </div>
            <h3 className="font-bold text-sm text-neutral-900 dark:text-white">
              {language === 'ar' ? 'إضافة عقار جديد للمحفظة' : 'Nouveau Bien Immobilier'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <LabelInput
            label={language === 'ar' ? 'عنوان الإعلان أو العقار' : 'Titre du bien'}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex: Appartement F4 Haut Standing Hydra"
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <LabelSelect
              label={language === 'ar' ? 'نوع العقار' : 'Type de bien'}
              value={propertyType}
              onChange={(val) => setPropertyType(val as any)}
              options={typeOptions}
            />
            <LabelInput
              label={language === 'ar' ? 'المساحة (m²)' : 'Surface (m²)'}
              type="number"
              value={surfaceM2}
              onChange={(e) => setSurfaceM2(e.target.value)}
            />
            <LabelInput
              label={language === 'ar' ? 'عدد الغرف' : 'Pièces'}
              type="number"
              value={roomsCount}
              onChange={(e) => setRoomsCount(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <LabelInput
              label={language === 'ar' ? 'العنوان والشارع' : 'Adresse'}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Résidence Les Pins..."
              required
            />
            <LabelInput
              label={language === 'ar' ? 'البلدية / الولاية' : 'Commune / Wilaya'}
              value={cityWilaya}
              onChange={(e) => setCityWilaya(e.target.value)}
              placeholder="Hydra, Alger"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <LabelInput
              label={language === 'ar' ? 'سعر الكراء (د.ج)' : 'Loyer mensuel (DA)'}
              type="number"
              value={priceDzd}
              onChange={(e) => setPriceDzd(e.target.value)}
              required
            />
            <LabelInput
              label={language === 'ar' ? 'اسم المالك' : 'Propriétaire'}
              value={ownerName}
              onChange={(e) => setOwnerName(e.target.value)}
              placeholder="Kamel Boumaza"
              required
            />
            <LabelInput
              label={language === 'ar' ? 'هاتف المالك' : 'Téléphone'}
              value={ownerPhone}
              onChange={(e) => setOwnerPhone(e.target.value)}
              placeholder="0550..."
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
            <AtriumButton variant="secondary" onClick={onClose}>
              {language === 'ar' ? 'إلغاء' : 'Annuler'}
            </AtriumButton>
            <AtriumButton type="submit" variant="primary" icon={<Building2 size={14} />}>
              {language === 'ar' ? 'حفظ العقار' : 'Enregistrer le Bien'}
            </AtriumButton>
          </div>
        </form>
      </div>
    </div>
  );
};
