(globalThis as any).requestAnimationFrame = () => 1;
(globalThis as any).cancelAnimationFrame = () => {};

import { describe, it, expect, beforeEach } from 'vitest';
import { SidebarBody, PushBody, SidebarHoverBody } from '../components/Shell/shellBodies';
import { __resetMotionEnvForTests } from '../motion/env';

beforeEach(() => __resetMotionEnvForTests());

const mockNode = (extra: object = {}): any => {
  const attrs: Record<string, string> = {};
  const props: Record<string, string> = {};
  const style: any = {
    setProperty: (k: string, v: string) => { props[k] = v; },
    getPropertyValue: (k: string) => props[k] || '',
    transform: '',
    opacity: '',
    visibility: '',
    height: '',
  };
  return {
    attrs,
    style,
    isConnected: true,
    setAttribute: (k: string, v: string) => { attrs[k] = v; },
    removeAttribute: (k: string) => { delete attrs[k]; },
    hasAttribute: (k: string) => k in attrs,
    ...extra,
  };
};

(globalThis as any).getComputedStyle = (el: any) => ({
  direction: 'ltr',
  getPropertyValue: (k: string) =>
    el.style?.getPropertyValue?.(k) || (k === '--atr-rail' ? '60px' : k === '--atr-rail-open' ? '236px' : ''),
});

describe('shellBodies', () => {
  describe('SidebarBody', () => {
    it('initializes to 0 (rail) or 1 (expanded) and updates --open', () => {
      const root = mockNode();
      const body = new SidebarBody(root, false);
      expect(body.target).toBe(0);
      body.snap();
      body.render();
      expect(root.style.getPropertyValue('--open')).toBe('0');

      body.setOpen(true);
      expect(body.target).toBe(1);
      // step forward
      for (let i = 0; i < 60; i++) body.step(1 / 60);
      body.render();
      const val = parseFloat(root.style.getPropertyValue('--open'));
      expect(val).toBeGreaterThan(0.9);
      body.dispose();
    });
  });

  describe('PushBody', () => {
    it('cancels layout jump with inverted transform on expansion and settles cleanly', () => {
      const root = mockNode();
      root.style.setProperty('--atr-rail', '60px');
      root.style.setProperty('--atr-rail-open', '236px');

      const content = mockNode();

      const push = new PushBody(content, root, false);
      push.measure();
      expect(push.W).toBe(176);

      // Start expansion: at target=1 and p=0, transform must cancel the +176px layout jump (-176px)
      push.setOpen(true);
      push.render();
      expect(content.style.transform).toBe('translate3d(-176px,0,0)');

      // Step towards completion
      for (let i = 0; i < 120; i++) push.step(1 / 60);
      push.render();
      expect(push.settled()).toBe(true);

      push.onSleep();
      // At rest: transform is stripped, 0 CPU/GPU overhead
      expect(content.style.transform).toBe('');
      expect(root.hasAttribute('data-push-settled')).toBe(true);

      push.dispose();
    });

    it('cancels layout jump on collapse and returns to 0', () => {
      const root = mockNode();
      root.style.setProperty('--atr-rail', '60px');
      root.style.setProperty('--atr-rail-open', '236px');

      const content = mockNode();

      const push = new PushBody(content, root, true);
      push.measure();
      push.snap();
      push.onSleep();

      // Start collapse: target=0, at p=1 transform is +176px
      push.setOpen(false);
      push.render();
      expect(content.style.transform).toBe('translate3d(176px,0,0)');

      for (let i = 0; i < 120; i++) push.step(1 / 60);
      push.render();
      expect(push.settled()).toBe(true);

      push.onSleep();
      expect(content.style.transform).toBe('');

      push.dispose();
    });
  });

  describe('SidebarHoverBody', () => {
    it('appears at hovered row without flying in from 0, tracks pointer, stretches and fades out', () => {
      const hl = mockNode();

      const hover = new SidebarHoverBody(hl);
      expect(hover.hover).toBeNull();

      // First hover on row at y=120px, height 40px
      hover.setHover([120, 40]);
      // Snap position on first entry
      expect(hover.hy.x).toBe(120);
      expect(hover.hh.x).toBe(40);

      hover.step(1 / 60);
      hover.render();
      expect(hl.style.visibility).toBe('visible');
      expect(parseFloat(hl.style.opacity)).toBeGreaterThan(0);

      // Move to next row at y=166px
      hover.setHover([166, 40]);
      for (let i = 0; i < 60; i++) hover.step(1 / 60);
      hover.render();
      expect(hover.hy.x).toBeCloseTo(166, 1);

      // Pointer leaves
      hover.setHover(null);
      for (let i = 0; i < 60; i++) hover.step(1 / 60);
      hover.render();
      expect(parseFloat(hl.style.opacity)).toBeCloseTo(0, 2);

      hover.onSleep();
      expect(hl.style.visibility).toBe('hidden');

      hover.dispose();
    });
  });
});
