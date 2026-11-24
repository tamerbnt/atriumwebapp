import { describe, it, expect } from 'vitest';
import { computeAppointmentFinanceMetrics } from '../appointmentMetrics';
import type { Appointment, StylistPayout } from '../../types/index';

describe('computeAppointmentFinanceMetrics (4.1)', () => {
  it('starts cash, BaridiMob, and CIB totals strictly at 0 when no paid appointments exist', () => {
    const res = computeAppointmentFinanceMetrics([], [], () => 'Main');
    expect(res.cash).toBe(0);
    expect(res.baridiMob).toBe(0);
    expect(res.cib).toBe(0);
    expect(res.netSalonProfit).toBe(0);
  });

  it('aggregates only paid appointments by payment channel and ignores unpaid appointments', () => {
    const appointments = [
      { id: '1', price: 3500, isPaid: true, paymentMethod: 'Cash' },
      { id: '2', price: 4200, isPaid: true, paymentMethod: 'BaridiMob' },
      { id: '3', price: 6000, isPaid: true, paymentMethod: 'CIB' },
      { id: '4', price: 9900, isPaid: false, paymentMethod: 'Cash' },
    ] as unknown as Appointment[];

    const payouts = [
      {
        id: 'p1',
        totalServiceRevenue: 20000,
        retailSalesRevenue: 5000,
        totalPayout: 8000,
        status: 'Paid',
      },
    ] as unknown as StylistPayout[];

    const res = computeAppointmentFinanceMetrics(payouts, appointments, () => 'Alger Centre');
    expect(res.cash).toBe(3500);
    expect(res.baridiMob).toBe(4200);
    expect(res.cib).toBe(6000);
    expect(res.netSalonProfit).toBe(17000);
    expect(res.paidCount).toBe(1);
    expect(res.branchOptionsWithCounts).toEqual([{ value: 'Alger Centre', label: 'Alger Centre', count: 1 }]);
  });
});
