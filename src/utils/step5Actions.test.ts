import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveBatchSelection,
  evaluateClassEnrollment,
  planWeekDuplication,
  prepareDepositReceiptPrint,
  isInspectionEditable,
  buildRealEstateInspectionShareText,
  buildScrapNcrArtifacts,
} from './step5Actions.ts';

describe('Step 5 Pure Action Helpers', () => {
  it('handles 0, 1000+, and deleted/missing selections cleanly', () => {
    const items = Array.from({ length: 1200 }, (_, i) => ({ id: `rec_${i}`, name: `R${i}` }));

    const empty = resolveBatchSelection([], items, (r) => r.id);
    assert.equal(empty.isEmpty, true);
    assert.equal(empty.selectedItems.length, 0);

    const mixedIds = ['rec_0', 'deleted_999', 'rec_1', 'rec_0'];
    const mixed = resolveBatchSelection(mixedIds, items, (r) => r.id);
    assert.equal(mixed.selectedItems.length, 2);
    assert.deepEqual(mixed.missingIds, ['deleted_999']);

    const capped = resolveBatchSelection(
      items.map((x) => x.id),
      items,
      (r) => r.id,
      1000
    );
    assert.equal(capped.selectedItems.length, 1000);
    assert.equal(capped.truncatedCount, 200);
  });

  it('enforces class enrollment capacity, waitlist, and duplicate prevention (3.4)', () => {
    const fullCheck = evaluateClassEnrollment({
      eventId: 'ev_1',
      memberId: 'mem_2',
      capacity: 10,
      enrolledCount: 10,
      existingEnrollments: [{ eventId: 'ev_1', memberId: 'mem_1', status: 'enrolled' }],
    });
    assert.equal(fullCheck.allowed, true);
    assert.equal(fullCheck.assignedStatus, 'waitlisted');
    assert.equal(fullCheck.nextEnrolledCount, 10);

    const openCheck = evaluateClassEnrollment({
      eventId: 'ev_1',
      memberId: 'mem_3',
      capacity: 10,
      enrolledCount: 7,
      existingEnrollments: [],
    });
    assert.equal(openCheck.allowed, true);
    assert.equal(openCheck.assignedStatus, 'enrolled');
    assert.equal(openCheck.nextEnrolledCount, 8);

    const dupCheck = evaluateClassEnrollment({
      eventId: 'ev_1',
      memberId: 'mem_1',
      capacity: 10,
      enrolledCount: 7,
      existingEnrollments: [{ eventId: 'ev_1', memberId: 'mem_1', status: 'enrolled' }],
    });
    assert.equal(dupCheck.allowed, false);
    assert.equal(dupCheck.errorCode, 'DUPLICATE_ENROLLMENT');
  });

  it('detects room/coach conflicts during schedule week duplication (3.6)', () => {
    const existing = [
      {
        id: 'ev_1',
        title: 'Boxe',
        trainerOrStaff: 'Coach Ali',
        roomOrArea: 'Ring A',
        dayOfWeek: 0,
        startTime: '18:00',
        endTime: '19:00',
        capacity: 15,
        enrolledCount: 8,
        category: 'Class',
      },
    ];

    const sameDayConflict = planWeekDuplication(existing, {
      dayOffset: 0,
      generateId: (_s, i) => `dup_${i}`,
    });
    assert.equal(sameDayConflict.created.length, 0);
    assert.equal(sameDayConflict.conflicts.length, 1);
    assert.equal(sameDayConflict.conflicts[0].reason, 'room_conflict');

    const nextDay = planWeekDuplication(existing, {
      dayOffset: 1,
      generateId: (_s, i) => `dup_${i}`,
    });
    assert.equal(nextDay.created.length, 1);
    assert.equal(nextDay.created[0].dayOfWeek, 1);
    assert.equal(nextDay.created[0].enrolledCount, 0);
  });

  it('assigns sequential deposit receipt number once and flags Duplicata on reprints (3.9)', () => {
    let seq = 41;
    const alloc = () => `RC-${++seq}`;

    const first = prepareDepositReceiptPrint(undefined, 0, alloc);
    assert.equal(first.depositReceiptNumber, 'RC-42');
    assert.equal(first.printedCount, 1);
    assert.equal(first.isDuplicate, false);

    const second = prepareDepositReceiptPrint(first.depositReceiptNumber, first.printedCount, alloc);
    assert.equal(second.depositReceiptNumber, 'RC-42');
    assert.equal(second.printedCount, 2);
    assert.equal(second.isDuplicate, true);
  });

  it('locks real estate inspections after validation and formats Arabic RTL share text without public URLs (3.10/3.11)', () => {
    assert.equal(isInspectionEditable({ isLocked: false }), true);
    assert.equal(isInspectionEditable({ isLocked: true }), false);

    const arText = buildRealEstateInspectionShareText(
      {
        propertyTitle: 'شقة حيدرة F4',
        inspectionDate: '2026-11-25',
        generalCondition: 'Bon',
        isLocked: true,
        keysDeliveredCount: 3,
      },
      'ar'
    );
    assert.match(arText, /محضر معاينة عقارية/);
    assert.match(arText, /مصادق ومقفل/);
    assert.doesNotMatch(arText, /https?:\/\//);
  });

  it('creates Scrapped QC + NCR with cmupAdjustmentHeld locked to true (3.12)', () => {
    const { qcRecord, ncrRecord } = buildScrapNcrArtifacts({
      ncrId: 'ncr_1',
      qcId: 'qc_1',
      ncrNumber: 'NCR-2026-0001',
      inspectionNumber: 'QC-2026-0001',
      accountId: 'acc_test',
      businessId: 'biz_test',
      branchId: 'br_test',
      staffId: 'stf_test',
      orderId: 'of_1',
      orderNumber: 'OF-001',
      batchLotNumber: 'LOT-A1',
      productName: 'Profilé Alu 4m',
      inspectorName: 'Karim QC',
      scrappedQuantity: 12,
      reason: 'Défaut anodisation',
      inspectionDate: '2026-11-25',
    });

    assert.equal(qcRecord.verdict, 'Scrapped');
    assert.equal(qcRecord.rejectedQuantity, 12);
    assert.equal(ncrRecord.disposition, 'Scrapped');
    assert.equal(ncrRecord.cmupAdjustmentHeld, true);
  });
});
