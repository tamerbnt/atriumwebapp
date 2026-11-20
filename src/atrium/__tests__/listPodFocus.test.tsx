(globalThis as any).requestAnimationFrame = () => 1;
(globalThis as any).cancelAnimationFrame = () => {};

import React from 'react';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  setListPodExpandedAction,
  toggleListPodExpandedAction,
  useAtriumSelector,
} from '../../services/store';
import {
  ScreenHeaderBar,
  ScreenKpiBanner,
  ScreenPod,
  ScreenCollectionToolbar,
  ScreenFocusProvider,
  ListAdvancedMenuButton,
  printPodElement,
} from '../../components/ui/kinetic';
import {
  PodFlipGlideBody,
  UpperPodRevealBody,
  UpperGhostExitBody,
  buildCollapseGhostClone,
} from '../../components/ui/kinetic/podFocusMotion';
import { configureMotion, __resetMotionEnvForTests } from '../motion/env';

interface MockNode {
  attrs: Record<string, string>;
  style: Record<string, any>;
  isConnected: boolean;
  childrenList: MockNode[];
  setAttribute: (k: string, v: string) => void;
  getAttribute: (k: string) => string | null;
  removeAttribute: (k: string) => void;
  hasAttribute: (k: string) => boolean;
  querySelectorAll: (selector: string) => MockNode[];
  cloneNode: (deep?: boolean) => MockNode;
  remove: () => void;
}

function createMockNode(initialAttrs: Record<string, string> = {}, childrenList: MockNode[] = []): MockNode {
  const attrs: Record<string, string> = { ...initialAttrs };
  const props: Record<string, string> = {};
  const style: Record<string, any> = {
    setProperty: (k: string, v: string) => {
      props[k] = v;
    },
    getPropertyValue: (k: string) => props[k] || '',
    transform: '',
    opacity: '',
    willChange: '',
    position: '',
    zIndex: '',
    left: '',
    top: '',
    width: '',
    height: '',
    margin: '',
    pointerEvents: '',
  };

  const node: MockNode = {
    attrs,
    style,
    isConnected: true,
    childrenList,
    setAttribute: (k: string, v: string) => {
      attrs[k] = v;
    },
    getAttribute: (k: string) => (k in attrs ? attrs[k] : null),
    removeAttribute: (k: string) => {
      delete attrs[k];
    },
    hasAttribute: (k: string) => k in attrs,
    querySelectorAll: () => {
      const flat: MockNode[] = [];
      const walk = (list: MockNode[]) => {
        for (const c of list) {
          flat.push(c);
          if (c.childrenList.length > 0) walk(c.childrenList);
        }
      };
      walk(node.childrenList);
      return flat;
    },
    cloneNode: (deep?: boolean) => {
      const clonedChildren = deep ? node.childrenList.map((c) => c.cloneNode(true)) : [];
      return createMockNode({ ...attrs }, clonedChildren);
    },
    remove: () => {
      node.isConnected = false;
    },
  };

  return node;
}

function installMockStorage() {
  const map = new Map<string, string>();
  const storage = {
    getItem: (k: string) => (map.has(k) ? map.get(k)! : null),
    setItem: (k: string, v: string) => {
      map.set(k, String(v));
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
    clear: () => {
      map.clear();
    },
    key: (i: number) => Array.from(map.keys())[i] ?? null,
    get length() {
      return map.size;
    },
  };
  (globalThis as any).localStorage = storage;
  return storage;
}

describe('List Pod Focus Expansion & Advanced Menu', () => {
  const prevWindow = (globalThis as any).window;
  const prevDocument = (globalThis as any).document;
  const prevLocalStorage = (globalThis as any).localStorage;
  let mockStorage: ReturnType<typeof installMockStorage>;

  beforeEach(() => {
    __resetMotionEnvForTests();
    mockStorage = installMockStorage();
    setListPodExpandedAction(false);
  });

  afterEach(() => {
    setListPodExpandedAction(false);
    __resetMotionEnvForTests();
    (globalThis as any).window = prevWindow;
    (globalThis as any).document = prevDocument;
    (globalThis as any).localStorage = prevLocalStorage;
  });

  it('persists isListPodExpanded globally in store and localStorage', () => {
    let val = true;
    const Probe: React.FC = () => {
      val = useAtriumSelector((s) => s.isListPodExpanded);
      return null;
    };

    renderToStaticMarkup(<Probe />);
    expect(val).toBe(false);

    toggleListPodExpandedAction();
    renderToStaticMarkup(<Probe />);
    expect(val).toBe(true);
    expect(mockStorage.getItem('atrium_list_pod_expanded')).toBe('true');

    setListPodExpandedAction(false);
    renderToStaticMarkup(<Probe />);
    expect(val).toBe(false);
    expect(mockStorage.getItem('atrium_list_pod_expanded')).toBe('false');
  });

  it('renders three-dot button next to Export, collapses KPI banner when expanded, and preserves ScreenHeaderBar', () => {
    const TestScreen: React.FC = () => (
      <div data-list-pod-root="true">
        <ScreenFocusProvider eligible={true}>
          <div className="space-y-6">
            <ScreenHeaderBar title="Adhérents" icon={<span />} />
            <ScreenKpiBanner
              heading="KPI Banner Heading"
              language="fr"
              primaryCard={{ label: 'Actifs', badgeText: 'actif', count: 12 }}
              secondaryCard={{ label: 'Expirés', badgeText: 'expirés', count: 3 }}
              darkCard={{
                label: 'Total',
                badgeCount: 15,
                valueCount: 15,
                caption: 'Club principal',
              }}
            />
            <ScreenPod>
              <ScreenCollectionToolbar
                title="Répertoire"
                language="fr"
                searchQuery="Amine"
                onSearchChange={() => {}}
                statusOptions={[
                  { value: 'all', label: 'Tous' },
                  { value: 'active', label: 'Actifs' },
                ]}
                statusValue="active"
                onStatusChange={() => {}}
                viewMode="list"
                onViewModeChange={() => {}}
                onExport={() => {}}
                onResetAllFilters={() => {}}
              />
              <div>Rows content</div>
            </ScreenPod>
          </div>
        </ScreenFocusProvider>
      </div>
    );

    const normalHtml = renderToStaticMarkup(<TestScreen />);
    expect(normalHtml).toContain('Adhérents');
    expect(normalHtml).toContain('KPI Banner Heading');
    expect(normalHtml).toContain('aria-label="Options avancées de la liste"');
    expect(normalHtml).toContain('Exporter');
    expect(normalHtml).not.toContain('data-list-pod-active="true"');

    // Expand globally
    setListPodExpandedAction(true);
    const expandedHtml = renderToStaticMarkup(<TestScreen />);
    expect(expandedHtml).toContain('Adhérents');
    expect(expandedHtml).not.toContain('KPI Banner Heading');
    expect(expandedHtml).toContain('data-list-pod-active="true"');
    expect(expandedHtml).toContain('flex-1 min-h-0 flex flex-col');
    expect(expandedHtml).toContain('aria-label="Options avancées de la liste"');
  });

  it('never renders three-dot menu or collapses pods when eligible={false} (Home / Dashboard / Settings) even if nested eligible={true}', () => {
    setListPodExpandedAction(true);

    const DashboardOrHome: React.FC = () => (
      <ScreenFocusProvider eligible={false}>
        <ScreenFocusProvider eligible={true}>
          <div>
            <ScreenHeaderBar title="Tableau de bord" icon={<span />} />
            <ScreenKpiBanner
              heading="Dashboard Summary"
              language="fr"
              primaryCard={{ label: 'A', badgeText: 'a', count: 1 }}
              secondaryCard={{ label: 'B', badgeText: 'b', count: 2 }}
              darkCard={{ label: 'C', badgeCount: 3, valueCount: 4, caption: 'Cap' }}
            />
            <ScreenPod>
              <ScreenCollectionToolbar
                title="Widget"
                language="fr"
                searchQuery=""
                onSearchChange={() => {}}
                viewMode="list"
                onViewModeChange={() => {}}
                onExport={() => {}}
              />
            </ScreenPod>
          </div>
        </ScreenFocusProvider>
      </ScreenFocusProvider>
    );

    const html = renderToStaticMarkup(<DashboardOrHome />);
    expect(html).toContain('Tableau de bord');
    expect(html).toContain('Dashboard Summary');
    expect(html).not.toContain('Options avancées de la liste');
    expect(html).not.toContain('data-list-pod-active="true"');
  });

  it('renders localized FR / EN / Arabic RTL aria labels for ListAdvancedMenuButton', () => {
    const frHtml = renderToStaticMarkup(
      <ScreenFocusProvider eligible={true}>
        <ScreenPod>
          <ListAdvancedMenuButton language="fr" />
        </ScreenPod>
      </ScreenFocusProvider>
    );
    expect(frHtml).toContain('aria-label="Options avancées de la liste"');

    const enHtml = renderToStaticMarkup(
      <ScreenFocusProvider eligible={true}>
        <ScreenPod>
          <ListAdvancedMenuButton language="en" />
        </ScreenPod>
      </ScreenFocusProvider>
    );
    expect(enHtml).toContain('aria-label="Advanced list options"');

    const arHtml = renderToStaticMarkup(
      <ScreenFocusProvider eligible={true}>
        <ScreenPod>
          <ListAdvancedMenuButton language="ar" canResetFilters={true} onResetAllFilters={() => {}} />
        </ScreenPod>
      </ScreenFocusProvider>
    );
    expect(arHtml).toContain('aria-label="خيارات متقدمة للقائمة"');
  });

  it('drives PodFlipGlideBody, UpperPodRevealBody, and UpperGhostExitBody springs and cleans up in onSleep()', () => {
    const podEl = createMockNode() as unknown as HTMLElement;
    const flipBody = new PodFlipGlideBody(podEl);

    flipBody.glideFrom(180);
    expect(podEl.style.willChange).toBe('transform');
    expect(podEl.style.position).toBe('relative');
    expect(podEl.style.zIndex).toBe('2');
    expect(podEl.style.transform).toBe('translate3d(0,180px,0)');

    for (let i = 0; i < 120; i++) flipBody.step(1 / 60);
    flipBody.render();
    expect(flipBody.settled()).toBe(true);
    flipBody.onSleep();
    expect(podEl.style.transform).toBe('');
    expect(podEl.style.willChange).toBe('');
    expect(podEl.style.position).toBe('');
    expect(podEl.style.zIndex).toBe('');
    flipBody.dispose();

    // Respects instant motion tier
    configureMotion({ tier: 'off' });
    flipBody.glideFrom(120);
    expect(podEl.style.transform).toBe('');
    __resetMotionEnvForTests();

    const bannerEl = createMockNode() as unknown as HTMLElement;
    const revealBody = new UpperPodRevealBody(bannerEl);
    revealBody.reveal();
    expect(bannerEl.style.opacity).toBe('0');
    expect(bannerEl.style.transform).toBe('translate3d(0,-14px,0)');

    for (let i = 0; i < 120; i++) revealBody.step(1 / 60);
    revealBody.render();
    expect(revealBody.settled()).toBe(true);
    expect(parseFloat(bannerEl.style.opacity)).toBeGreaterThan(0.99);
    revealBody.onSleep();
    expect(bannerEl.style.opacity).toBe('');
    expect(bannerEl.style.transform).toBe('');
    expect(bannerEl.style.willChange).toBe('');
    revealBody.dispose();

    const ghostLayer = createMockNode() as unknown as HTMLElement;
    const exitBody = new UpperGhostExitBody(ghostLayer);
    exitBody.play();
    expect(ghostLayer.style.opacity).toBe('1');
    expect(ghostLayer.style.transform).toBe('translate3d(0,0px,0)');

    for (let i = 0; i < 120; i++) exitBody.step(1 / 60);
    exitBody.render();
    expect(exitBody.settled()).toBe(true);
    expect(parseFloat(ghostLayer.style.opacity)).toBeLessThan(0.01);
    exitBody.onSleep();
    expect(ghostLayer.isConnected).toBe(false);
    exitBody.dispose();
  });

  it('buildCollapseGhostClone sanitizes ids and data-sq, and printPodElement isolates pod until afterprint', () => {
    const child = createMockNode({ id: 'card-1', 'data-sq': 'card' });
    const source = createMockNode(
      { id: 'kpi-banner-1', 'data-sq': 'panel', 'aria-live': 'polite' },
      [child]
    ) as unknown as HTMLElement;

    const clone = buildCollapseGhostClone(
      source,
      { left: 40, top: 80, width: 500, height: 180 } as DOMRect,
      { left: 20, top: 20, width: 1000, height: 800 } as DOMRect
    );

    expect(clone.getAttribute('id')).toBeNull();
    expect(clone.getAttribute('aria-live')).toBeNull();
    expect(clone.getAttribute('data-sq')).toBeNull();
    expect(clone.getAttribute('data-sq-ghost')).toBe('true');
    expect(clone.getAttribute('aria-hidden')).toBe('true');

    const clonedChildren = (clone as unknown as MockNode).childrenList;
    expect(clonedChildren[0].getAttribute('id')).toBeNull();
    expect(clonedChildren[0].getAttribute('data-sq')).toBeNull();
    expect(clonedChildren[0].getAttribute('data-sq-ghost')).toBe('true');

    expect(clone.style.top).toBe('60px');
    expect(clone.style.left).toBe('20px');
    expect(clone.style.width).toBe('500px');
    expect(clone.style.height).toBe('180px');
    expect(clone.style.pointerEvents).toBe('none');

    const docEl = createMockNode();
    const listeners = new Map<string, Set<() => void>>();
    const printSpy = vi.fn();

    (globalThis as any).document = {
      documentElement: docEl,
      querySelectorAll: () => [],
    };
    (globalThis as any).window = {
      print: printSpy,
      setTimeout: () => 1,
      addEventListener: (ev: string, fn: () => void) => {
        if (!listeners.has(ev)) listeners.set(ev, new Set());
        listeners.get(ev)!.add(fn);
      },
      removeEventListener: (ev: string, fn: () => void) => {
        listeners.get(ev)?.delete(fn);
      },
    };

    const targetPod = createMockNode() as unknown as HTMLElement;
    printPodElement(targetPod);

    expect(targetPod.getAttribute('data-printing-pod')).toBe('true');
    expect(docEl.getAttribute('data-printing-active-pod')).toBe('true');
    expect(printSpy).toHaveBeenCalledTimes(1);

    listeners.get('afterprint')?.forEach((fn) => fn());
    expect(targetPod.getAttribute('data-printing-pod')).toBeNull();
    expect(docEl.getAttribute('data-printing-active-pod')).toBeNull();
  });
});
