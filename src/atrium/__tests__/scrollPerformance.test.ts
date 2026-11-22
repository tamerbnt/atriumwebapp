import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { areRowPropsEqual, type KineticRowProps } from '../../components/ui/kinetic/KineticRow';

describe('Scroll Performance & Fluid Physics Verification', () => {
  describe('KineticRow memoization & scroll reconciliation', () => {
    const baseRow = {
      id: 'mem_1',
      title: 'Amina Mansouri',
      subline: 'Pack Annuel · Actif',
      categoryLabel: 'Fitness',
      statusLabel: 'Actif',
      statusVariant: 'active' as const,
      metricPrimary: '340 Jours restants',
      metricSecondary: '12 séances',
      branchName: 'Alger Centre',
      isPinned: false,
    };

    const baseProps: KineticRowProps = {
      row: baseRow,
      viewMode: 'list',
      isSelected: false,
      isOpen: false,
      isExpanded: false,
      isPinned: false,
    };

    it('bails out of re-render when row data has identical values in a new object reference', () => {
      const clonedRow = { ...baseRow };
      const nextProps: KineticRowProps = {
        ...baseProps,
        row: clonedRow, // new object reference, same values
      };

      expect(areRowPropsEqual(baseProps, nextProps)).toBe(true);
    });

    it('triggers re-render when selection, expansion or open state changes', () => {
      expect(areRowPropsEqual(baseProps, { ...baseProps, isSelected: true })).toBe(false);
      expect(areRowPropsEqual(baseProps, { ...baseProps, isOpen: true })).toBe(false);
      expect(areRowPropsEqual(baseProps, { ...baseProps, isExpanded: true })).toBe(false);
      expect(areRowPropsEqual(baseProps, { ...baseProps, isPinned: true })).toBe(false);
      expect(areRowPropsEqual(baseProps, { ...baseProps, viewMode: 'grid' })).toBe(false);
    });

    it('triggers re-render when row fields mutate', () => {
      expect(
        areRowPropsEqual(baseProps, {
          ...baseProps,
          row: { ...baseRow, statusLabel: 'Expiré', statusVariant: 'expired' },
        })
      ).toBe(false);

      expect(
        areRowPropsEqual(baseProps, {
          ...baseProps,
          row: { ...baseRow, metricPrimary: '0 Jours' },
        })
      ).toBe(false);

      expect(
        areRowPropsEqual(baseProps, {
          ...baseProps,
          row: { ...baseRow, title: 'Karim Mansouri' },
        })
      ).toBe(false);
    });
  });

  describe('Global CSS scroll behavior guarantees', () => {
    const indexCssPath = path.resolve(__dirname, '../../index.css');
    const indexCss = fs.readFileSync(indexCssPath, 'utf8');

    it('ensures html has scroll-behavior: auto (no queued wheel tick lag)', () => {
      expect(indexCss).toMatch(/html\s*\{[^}]*scroll-behavior:\s*auto;/);
      expect(indexCss).not.toMatch(/html\s*\{[^}]*scroll-behavior:\s*smooth;/);
    });

    it('ensures scroll containers avoid scroll-behavior: smooth and overscroll traps', () => {
      // Find the physics scroll rule
      const scrollRuleMatch = indexCss.match(
        /\/\* Fluid scroll physics and touch momentum on all scrollable elements \*\/[\s\S]*?\{([^}]+)\}/
      );
      expect(scrollRuleMatch).not.toBeNull();
      const ruleBody = scrollRuleMatch![1];

      expect(ruleBody).toContain('scroll-behavior: auto');
      expect(ruleBody).not.toContain('scroll-behavior: smooth');
      expect(ruleBody).toContain('overscroll-behavior: auto');
      expect(ruleBody).not.toContain('overscroll-behavior: contain');
    });
  });

  describe('KineticCollectionStage scroll attributes', () => {
    const stagePath = path.resolve(__dirname, '../../components/ui/kinetic/KineticCollectionStage.tsx');
    const stageCode = fs.readFileSync(stagePath, 'utf8');

    it('ensures .scr has overscroll-auto and data-no-rubber-band', () => {
      expect(stageCode).toContain('data-no-rubber-band="true"');
      expect(stageCode).toContain('overscroll-auto');
      expect(stageCode).not.toContain('pb-[70px] overscroll-contain');
    });
  });

  describe('Fluid scrollbar event listeners', () => {
    const fluidPath = path.resolve(__dirname, '../../utils/fluidScrollbar.ts');
    const fluidCode = fs.readFileSync(fluidPath, 'utf8');

    it('only listens to real scroll events and avoids wheel/touchmove attribute thrashing', () => {
      expect(fluidCode).toContain("window.addEventListener('scroll', onScrollActivity");
      expect(fluidCode).not.toContain("window.addEventListener('wheel', onScrollActivity");
      expect(fluidCode).not.toContain("window.addEventListener('touchmove', onScrollActivity");
    });
  });

  describe('UniversalDataCollection scroll delegation', () => {
    const udcPath = path.resolve(__dirname, '../../components/ui/collection/UniversalDataCollection.tsx');
    const udcCode = fs.readFileSync(udcPath, 'utf8');

    it('exposes and forwards scrollContainerRef to KineticCollectionStage', () => {
      expect(udcCode).toContain('scrollContainerRef?: React.RefObject<HTMLDivElement | null>;');
      expect(udcCode).toContain('scrollContainerRef={scrollContainerRef}');
    });
  });
});
