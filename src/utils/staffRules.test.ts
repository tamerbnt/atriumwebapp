import test from 'node:test';
import assert from 'node:assert/strict';
import {
  validateStaffCredentials,
  isSoleActiveOwner,
  canAccessStaffScreen,
  canViewSensitivePayroll,
  normalizePhone,
  getCategoryPerformanceMetricLabel,
  canCreateStaff,
  getEffectiveUserRole,
} from './staffRules';
import { StaffMember } from '../types/index';

const MOCK_STAFF_LIST: StaffMember[] = [
  {
    id: 'stf_owner_01',
    tenantId: 'acc_01',
    facilityId: 'branch_01',
    fullName: 'Amine Bentouati',
    email: 'amine.owner@atrium.dz',
    phoneNumber: '0550 12 34 56',
    role: 'Owner',
    roleRank: 8,
    isActive: true,
    status: 'active',
    hireDate: '2024-01-01',
    salary: 250000,
    paymentDay: 28,
    pinCode: '1234',
    cardId: 'RFID-OWNER-01',
    allowedModules: ['all'],
  },
  {
    id: 'stf_mgr_01',
    tenantId: 'acc_01',
    facilityId: 'branch_01',
    fullName: 'Samir Bouteflika',
    email: 'samir.manager@atrium.dz',
    phoneNumber: '0555 40 50 60',
    role: 'Manager',
    roleRank: 4,
    isActive: true,
    status: 'active',
    hireDate: '2024-03-01',
    salary: 120000,
    paymentDay: 28,
    pinCode: '5566',
    cardId: 'RFID-MGR-01',
    allowedModules: ['all'],
  },
  {
    id: 'stf_op_01',
    tenantId: 'acc_01',
    facilityId: 'branch_01',
    fullName: 'Ryan Mehdi',
    email: 'ryan.cashier@atrium.dz',
    phoneNumber: '0661 55 44 33',
    role: 'Cashier',
    roleRank: 2,
    isActive: true,
    status: 'active',
    hireDate: '2024-06-01',
    salary: 65000,
    paymentDay: 28,
    pinCode: '9988',
    cardId: 'RFID-CSH-01',
    allowedModules: ['shop'],
  },
];

test('Staff Rules: normalizes phone numbers accurately', () => {
  assert.equal(normalizePhone('0550 12 34 56'), '0550123456');
  assert.equal(normalizePhone('+213 (0) 550-12-34-56'), '2130550123456');
});

test('Staff Rules: validates a correct new staff member without conflicts', () => {
  const newStaff: Partial<StaffMember> = {
    fullName: 'Yacine Belkacem',
    email: 'yacine.btp@atrium.dz',
    phoneNumber: '0770 99 88 77',
    pinCode: '4321',
    cardId: 'RFID-NEW-01',
    paymentDay: 28,
    canLoginPin: true,
  };

  const result = validateStaffCredentials(newStaff, MOCK_STAFF_LIST);
  assert.equal(result.isValid, true);
  assert.equal(Object.keys(result.errors).length, 0);
});

test('Staff Rules: rejects duplicate email', () => {
  const duplicate: Partial<StaffMember> = {
    fullName: 'Another Person',
    email: 'AMINE.OWNER@atrium.dz',
    phoneNumber: '0770 11 22 33',
  };
  const result = validateStaffCredentials(duplicate, MOCK_STAFF_LIST);
  assert.equal(result.isValid, false);
  assert.ok(result.errors.email);
});

test('Staff Rules: rejects duplicate phone number even with different spacing', () => {
  const duplicate: Partial<StaffMember> = {
    fullName: 'Phone Conflict',
    email: 'unique@atrium.dz',
    phoneNumber: '0550-12-34-56', // Matches 0550 12 34 56
  };
  const result = validateStaffCredentials(duplicate, MOCK_STAFF_LIST);
  assert.equal(result.isValid, false);
  assert.ok(result.errors.phoneNumber);
});

test('Staff Rules: rejects duplicate 4-digit PIN code', () => {
  const duplicate: Partial<StaffMember> = {
    fullName: 'PIN Conflict',
    email: 'pin@atrium.dz',
    phoneNumber: '0770 33 44 55',
    pinCode: '1234', // Matches owner's pin
    canLoginPin: true,
  };
  const result = validateStaffCredentials(duplicate, MOCK_STAFF_LIST);
  assert.equal(result.isValid, false);
  assert.ok(result.errors.pinCode);
});

test('Staff Rules: rejects duplicate RFID badge card ID', () => {
  const duplicate: Partial<StaffMember> = {
    fullName: 'Badge Conflict',
    email: 'badge@atrium.dz',
    phoneNumber: '0770 44 55 66',
    cardId: 'RFID-MGR-01', // Matches manager's cardId
  };
  const result = validateStaffCredentials(duplicate, MOCK_STAFF_LIST);
  assert.equal(result.isValid, false);
  assert.ok(result.errors.cardId);
});

test('Staff Rules: validates Algerian CCP account calculation and flags bad key', () => {
  const badCcp: Partial<StaffMember> = {
    fullName: 'CCP Test',
    email: 'ccp@atrium.dz',
    phoneNumber: '0770 66 77 88',
    paymentMethod: 'ccp',
    ccpNumber: '0019876543',
    ccpKey: '99', // Incorrect key
  };
  const result = validateStaffCredentials(badCcp, MOCK_STAFF_LIST);
  assert.equal(result.isValid, false);
  assert.ok(result.errors.ccpKey);
});

test('Staff Rules: rejects payment day outside 1-31', () => {
  const badDay: Partial<StaffMember> = {
    fullName: 'Day Test',
    email: 'day@atrium.dz',
    phoneNumber: '0770 77 88 99',
    paymentDay: 35,
  };
  const result = validateStaffCredentials(badDay, MOCK_STAFF_LIST);
  assert.equal(result.isValid, false);
  assert.ok(result.errors.paymentDay);
});

test('Staff Rules: Sole Active Owner Guard detects sole owner', () => {
  assert.equal(isSoleActiveOwner('stf_owner_01', MOCK_STAFF_LIST), true);
  assert.equal(isSoleActiveOwner('stf_mgr_01', MOCK_STAFF_LIST), false);
  assert.equal(isSoleActiveOwner('stf_op_01', MOCK_STAFF_LIST), false);
});

test('Staff Rules: Sole Active Owner Guard allows action if second active owner exists', () => {
  const twoOwnersList: StaffMember[] = [
    ...MOCK_STAFF_LIST,
    {
      id: 'stf_owner_02',
      tenantId: 'acc_01',
      facilityId: 'branch_01',
      fullName: 'Second Owner',
      email: 'owner2@atrium.dz',
      phoneNumber: '0770 00 11 22',
      role: 'Owner',
      roleRank: 8,
      isActive: true,
      status: 'active',
      hireDate: '2024-02-01',
      salary: 200000,
      paymentDay: 28,
      allowedModules: ['all'],
    },
  ];
  assert.equal(isSoleActiveOwner('stf_owner_01', twoOwnersList), false);
});

test('Staff Rules: Strict RBAC allows owner in all categories', () => {
  assert.equal(canAccessStaffScreen('membership_session', 'Owner'), true);
  assert.equal(canAccessStaffScreen('appointment_service', 'gerant'), true);
  assert.equal(canAccessStaffScreen('pos_inventory', 'Owner'), true);
  assert.equal(canAccessStaffScreen('construction_contractor', 'Owner'), true);
  assert.equal(canAccessStaffScreen('medical_clinic', 'Owner'), true);
});

test('Staff Rules: Strict RBAC locks out non-owners in simple dual-role categories', () => {
  // Gym
  assert.equal(canAccessStaffScreen('membership_session', 'Coach'), false);
  assert.equal(canAccessStaffScreen('membership_session', 'Cashier'), false);
  // Salon
  assert.equal(canAccessStaffScreen('appointment_service', 'Stylist'), false);
  // POS Retail
  assert.equal(canAccessStaffScreen('pos_inventory', 'Cashier'), false);
  // Education
  assert.equal(canAccessStaffScreen('education_cohort', 'Teacher'), false);
  // Freelance
  assert.equal(canAccessStaffScreen('freelance_solo', 'Assistant'), false);
});

test('Staff Rules: Strict RBAC allows operational team leads in multi-role categories', () => {
  // BTP / Construction
  assert.equal(canAccessStaffScreen('construction_contractor', 'ConducteurTravaux'), true);
  assert.equal(canAccessStaffScreen('construction_contractor', 'ChefChantier'), true);
  assert.equal(canAccessStaffScreen('construction_contractor', 'Ouvrier'), false);

  // Medical Clinic
  assert.equal(canAccessStaffScreen('medical_clinic', 'MedecinChef'), true);
  assert.equal(canAccessStaffScreen('medical_clinic', 'Doctor'), true);
  assert.equal(canAccessStaffScreen('medical_clinic', 'Infirmier'), false);

  // Auto Garage
  assert.equal(canAccessStaffScreen('auto_garage', 'ChefAtelier'), true);
  assert.equal(canAccessStaffScreen('auto_garage', 'Mecanicien'), false);

  // Logistics
  assert.equal(canAccessStaffScreen('logistics_delivery', 'Dispatcher'), true);
  assert.equal(canAccessStaffScreen('logistics_delivery', 'Chauffeur'), false);

  // Agency
  assert.equal(canAccessStaffScreen('project_milestone', 'ProjectManager'), true);
  assert.equal(canAccessStaffScreen('project_milestone', 'Creative'), false);
});

test('Staff Rules: restricts sensitive payroll and CCP view exclusively to owners', () => {
  assert.equal(canViewSensitivePayroll('Owner'), true);
  assert.equal(canViewSensitivePayroll('gerant'), true);
  assert.equal(canViewSensitivePayroll('ConducteurTravaux'), false);
  assert.equal(canViewSensitivePayroll('ChefAtelier'), false);
  assert.equal(canViewSensitivePayroll('Manager'), false);
  assert.equal(canViewSensitivePayroll('Cashier'), false);
});

test('Staff Rules: Category Performance Metric Labels returns appropriate KPI metrics', () => {
  const med = getCategoryPerformanceMetricLabel('medical_clinic');
  assert.ok(med.labelFr.includes('Consultations'));

  const btp = getCategoryPerformanceMetricLabel('construction_contractor');
  assert.ok(btp.labelFr.includes('Chantier'));

  const gar = getCategoryPerformanceMetricLabel('auto_garage');
  assert.ok(gar.labelFr.includes('Réparation'));
});

test('Staff Rules: canCreateStaff enforces owner-only in dual-role and operational leads in multi-role', () => {
  // Dual-role
  assert.equal(canCreateStaff('membership_session', 'Owner'), true);
  assert.equal(canCreateStaff('membership_session', 'Coach'), false);
  assert.equal(canCreateStaff('pos_inventory', 'Cashier'), false);

  // Multi-role
  assert.equal(canCreateStaff('construction_contractor', 'ConducteurTravaux'), true);
  assert.equal(canCreateStaff('construction_contractor', 'ChefChantier'), false);
  assert.equal(canCreateStaff('auto_garage', 'ChefAtelier'), true);
  assert.equal(canCreateStaff('auto_garage', 'Mecanicien'), false);
  assert.equal(canCreateStaff('logistics_delivery', 'Dispatcher'), true);
  assert.equal(canCreateStaff('logistics_delivery', 'Chauffeur'), false);
});

test('Staff Rules: getEffectiveUserRole properly resolves category switcher states', () => {
  // Dual role switcher
  assert.equal(getEffectiveUserRole('membership_session', { activeMembershipRole: 'staff' }), 'Staff');
  assert.equal(getEffectiveUserRole('membership_session', { activeMembershipRole: 'owner' }), 'Owner');
  assert.equal(getEffectiveUserRole('education_cohort', { activeEducationRole: 'staff' }), 'Staff');

  // Multi-role switcher
  assert.equal(getEffectiveUserRole('auto_garage', { activeGarageRole: 'mecanicien' }), 'mecanicien');
  assert.equal(getEffectiveUserRole('construction_contractor', { activeContractorRole: 'conducteur' }), 'conducteur');
  assert.equal(getEffectiveUserRole('logistics_delivery', { activeLogisticsRole: 'dispatcher' }), 'dispatcher');
});
