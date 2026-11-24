import type { Appointment, Branch, StylistPayout } from '../types/index';

export interface AppointmentFinanceMetrics {
  totalServicesRevenue: number;
  totalRetailRevenue: number;
  totalCommissionsDue: number;
  netSalonProfit: number;
  paidCount: number;
  pendingCount: number;
  approvedCount: number;
  cash: number;
  baridiMob: number;
  cib: number;
  branchOptionsWithCounts: Array<{ value: string; label: string; count: number }>;
}

/**
 * Pure aggregator for salon commissions and live paid-appointment channel breakdown.
 * Always initializes payment totals at 0 with zero fabricated baseline numbers.
 */
export function computeAppointmentFinanceMetrics(
  stylistPayouts: StylistPayout[],
  appointments: Appointment[],
  resolveBranchName: (payout: StylistPayout) => string
): AppointmentFinanceMetrics {
  let totalServicesRevenue = 0;
  let totalRetailRevenue = 0;
  let totalCommissionsDue = 0;
  let paidCount = 0;
  let pendingCount = 0;
  let approvedCount = 0;
  const branchCounts = new Map<string, number>();

  for (let i = 0; i < stylistPayouts.length; i++) {
    const p = stylistPayouts[i];
    totalServicesRevenue += Number(p.totalServiceRevenue || 0);
    totalRetailRevenue += Number(p.retailSalesRevenue || 0);
    totalCommissionsDue += Number(p.totalPayout || 0);
    if (p.status === 'Paid') paidCount++;
    else if (p.status === 'Approved') approvedCount++;
    else pendingCount++;
    const bName = resolveBranchName(p);
    branchCounts.set(bName, (branchCounts.get(bName) || 0) + 1);
  }

  const netSalonProfit = Math.max(0, totalServicesRevenue + totalRetailRevenue - totalCommissionsDue);

  let cash = 0;
  let baridiMob = 0;
  let cib = 0;
  for (let i = 0; i < appointments.length; i++) {
    const a = appointments[i];
    if (!a.isPaid || !a.paymentMethod) continue;
    const price = Number(a.price || 0);
    if (a.paymentMethod === 'Cash') {
      cash += price;
    } else if (a.paymentMethod === 'BaridiMob') {
      baridiMob += price;
    } else {
      cib += price;
    }
  }

  return {
    totalServicesRevenue,
    totalRetailRevenue,
    totalCommissionsDue,
    netSalonProfit,
    paidCount,
    pendingCount,
    approvedCount,
    cash,
    baridiMob,
    cib,
    branchOptionsWithCounts: Array.from(branchCounts.entries()).map(([name, count]) => ({
      value: name,
      label: name,
      count,
    })),
  };
}
