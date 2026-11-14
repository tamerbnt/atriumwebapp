import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertCircle } from 'lucide-react';
import {
  useAtriumSelector,
  selectCurrentPlansFromState,
  selectCurrentBranchFromState,
  selectTerminologyFromState,
  addMemberAction,
  updateMemberAction,
  showToast as showToastAction,
} from '../../services/store';
import { Member, Gender } from '../../types/index';
import {
  Sp,
  TUNES,
  subscribeFrame,
  subscribeCleanup,
  wake,
  checkReducedMotion,
} from '../screens/membership/motion/adherentsMotion';
import {
  ModalLifecycleState,
  MODAL_FOCUS_DELAY_MS,
  MODAL_REDUCED_FADE_MS,
  computeMemberModalMetrics,
  computeModalTransformOrigin,
  registerKineticMemberModalOpener,
  shouldCloseOnScrimMouseUp,
  shouldFinishClosing,
} from './memberModalMotion';
import { Button, LiquidButton } from '@/atrium';
import { LiveSegmentedControl } from '../ui/live/LiveSegmentedControl';
import { LabelInput } from '../ui/LabelInput';
import { LabelSelect } from '../ui/LabelSelect';
import { t } from '../../utils/i18n';

export interface MemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  memberToEdit?: Member | null;
  onCreatedSuccess?: (member: Member) => void;
  useKineticSpring?: boolean;
  originElement?: HTMLElement | null;
}

export const MemberModal: React.FC<MemberModalProps> = React.memo(({
  isOpen,
  onClose,
  memberToEdit,
  onCreatedSuccess,
  useKineticSpring = false,
  originElement,
}) => {
  const plans = useAtriumSelector(selectCurrentPlansFromState);
  const currentBranch = useAtriumSelector(selectCurrentBranchFromState);
  const terminology = useAtriumSelector(selectTerminologyFromState);
  const addMember = addMemberAction;
  const updateMember = updateMemberAction;
  const language = useAtriumSelector((s) => s.language);
  const showToast = showToastAction;

  const getDefaultCardId = () => `RFID-${Math.floor(100000 + Math.random() * 900000)}`;
  const getTodayIso = () => new Date().toISOString().split('T')[0];

  // Preserve displayed edit target while the 130ms closing animation runs
  const [activeMemberToEdit, setActiveMemberToEdit] = useState<Member | null>(memberToEdit ?? null);
  const retainedMemberRef = useRef<Member | null>(memberToEdit ?? null);

  // Legacy state path (used ONLY when useKineticSpring === false, outside membership members screen)
  const [legacyHidden, setLegacyHidden] = useState(!isOpen);
  const [legacyVal, setLegacyVal] = useState(0);
  const [legacyOrigin, setLegacyOrigin] = useState('center center');

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form values (pre-initialized so kinetic "New member" open needs zero form re-renders)
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [planId, setPlanId] = useState(() => plans[0]?.id || '');
  const [cardId, setCardId] = useState(() => getDefaultCardId());
  const [gender, setGender] = useState<Gender>('Male');
  const [dateOfBirth, setDateOfBirth] = useState('1995-01-01');
  const [startDate, setStartDate] = useState(() => getTodayIso());
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [source, setSource] = useState('Walk-in');
  const [notes, setNotes] = useState('');

  // Validation errors
  const [errors, setErrors] = useState<{ fullName?: string; email?: string }>({});

  const springRef = useRef<Sp | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const scrimRef = useRef<HTMLDivElement | null>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const nameInputRef = useRef<HTMLInputElement | null>(null);
  const emailInputRef = useRef<HTMLInputElement | null>(null);

  // Kinetic ref-driven lifecycle state (zero React state per frame)
  const lifecycleRef = useRef<ModalLifecycleState>('closed');
  const openedAtRef = useRef<number>(0);
  const focusTimerRef = useRef<number | null>(null);
  const reducedTimerRef = useRef<number | null>(null);
  const scrimMouseDownRef = useRef<boolean>(false);
  const inertElsRef = useRef<HTMLElement[]>([]);
  const scrollLockRef = useRef<{
    locked: boolean;
    prevOverflow: string;
    prevPaddingRight: string;
  }>({ locked: false, prevOverflow: '', prevPaddingRight: '' });

  // Track whether kinetic form is already clean/prepared for 'create' or a specific member ID
  const formPreparedKeyRef = useRef<string>('create');
  const formDirtyRef = useRef<boolean>(false);
  const prevKineticOpenRef = useRef<boolean>(false);
  const prevKineticEditIdRef = useRef<string | null>(null);

  const isOpenRef = useRef(isOpen);
  isOpenRef.current = isOpen;

  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const originPropRef = useRef(originElement);
  originPropRef.current = originElement;

  const legacyCloseReqRef = useRef(false);

  // Initialize spring dp (tune 28: k = 0.1248, d = 0.676)
  if (!springRef.current) {
    springRef.current = new Sp(0, TUNES.modal);
  }

  const applyFormForMember = useCallback(
    (target: Member | null) => {
      if (target) {
        setFullName(target.fullName || '');
        setEmail(target.email || '');
        setPhoneNumber(target.phoneNumber || '');
        setPlanId(target.membershipPlanId || plans[0]?.id || '');
        setCardId(target.cardId || '');
        setGender(target.gender || 'Male');
        setDateOfBirth(target.dateOfBirth || '');
        setStartDate(target.startDate || '');
        setEmergencyName(target.emergencyContactName || '');
        setEmergencyPhone(target.emergencyContactPhone || '');
        setSource(target.source || 'Walk-in');
        setNotes(target.notes || '');
        formPreparedKeyRef.current = target.id;
      } else {
        setFullName('');
        setEmail('');
        setPhoneNumber('');
        setPlanId(plans[0]?.id || '');
        setCardId(getDefaultCardId());
        setGender('Male');
        setDateOfBirth('1995-01-01');
        setStartDate(getTodayIso());
        setEmergencyName('');
        setEmergencyPhone('');
        setSource('Walk-in');
        setNotes('');
        formPreparedKeyRef.current = 'create';
      }
      formDirtyRef.current = false;
      setErrors({});
      setIsSubmitting(false);
    },
    [plans]
  );

  // Synchronous prop-sync for kinetic mode: commits form data BEFORE useLayoutEffect starts open animation
  if (useKineticSpring) {
    if (isOpen) {
      retainedMemberRef.current = memberToEdit ?? null;
      const targetKey = memberToEdit ? memberToEdit.id : 'create';
      const isOpeningNow = !prevKineticOpenRef.current;
      const editChanged = (memberToEdit?.id ?? null) !== prevKineticEditIdRef.current;
      if (
        (isOpeningNow || editChanged) &&
        (formPreparedKeyRef.current !== targetKey || formDirtyRef.current || Boolean(memberToEdit))
      ) {
        applyFormForMember(memberToEdit ?? null);
      }
    }
    prevKineticOpenRef.current = isOpen;
    prevKineticEditIdRef.current = memberToEdit?.id ?? null;
  }

  // Legacy activeMemberToEdit sync (non-kinetic path only)
  useEffect(() => {
    if (useKineticSpring) return;
    if (isOpen) {
      setActiveMemberToEdit(memberToEdit ?? null);
    }
  }, [useKineticSpring, isOpen, memberToEdit]);

  const lockScrollWithoutShift = useCallback(() => {
    if (scrollLockRef.current.locked || typeof document === 'undefined') return;
    const docEl = document.documentElement;
    // Skip root style mutation when documentElement already has no scrollable overflow (e.g. AppShell h-screen overflow-hidden)
    const scrollbarW = Math.max(0, window.innerWidth - docEl.clientWidth);
    if (scrollbarW === 0 && docEl.scrollHeight <= docEl.clientHeight) {
      return;
    }
    scrollLockRef.current = {
      locked: true,
      prevOverflow: docEl.style.overflow,
      prevPaddingRight: docEl.style.paddingRight,
    };
    docEl.style.overflow = 'hidden';
    if (scrollbarW > 0) {
      const computedPad = parseFloat(getComputedStyle(docEl).paddingRight || '0') || 0;
      docEl.style.paddingRight = `${computedPad + scrollbarW}px`;
    }
  }, []);

  const unlockScroll = useCallback(() => {
    if (!scrollLockRef.current.locked || typeof document === 'undefined') return;
    const docEl = document.documentElement;
    docEl.style.overflow = scrollLockRef.current.prevOverflow;
    docEl.style.paddingRight = scrollLockRef.current.prevPaddingRight;
    scrollLockRef.current.locked = false;
  }, []);

  const useKineticRef = useRef(useKineticSpring);
  useKineticRef.current = useKineticSpring;

  const setBackgroundInert = useCallback((inert: boolean) => {
    if (typeof document === 'undefined') return;
    const attr = useKineticRef.current ? 'aria-hidden' : 'inert';
    const val = useKineticRef.current ? 'true' : '';
    if (inert) {
      const targets: HTMLElement[] = [];
      const rootEl = scrimRef.current;
      Array.from(document.body.children).forEach((child) => {
        if (!(child instanceof HTMLElement)) return;
        if (child === rootEl) return;
        const tag = child.tagName;
        if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'LINK' || tag === 'TEMPLATE') return;
        if (!child.hasAttribute(attr)) {
          child.setAttribute(attr, val);
          targets.push(child);
        }
      });
      inertElsRef.current = targets;
    } else {
      inertElsRef.current.forEach((el) => {
        el.removeAttribute('inert');
        el.removeAttribute('aria-hidden');
      });
      inertElsRef.current = [];
    }
  }, []);

  const clearTimers = useCallback(() => {
    if (focusTimerRef.current !== null) {
      window.clearTimeout(focusTimerRef.current);
      focusTimerRef.current = null;
    }
    if (reducedTimerRef.current !== null) {
      window.clearTimeout(reducedTimerRef.current);
      reducedTimerRef.current = null;
    }
  }, []);

  const isTouchDevice = useCallback((): boolean => {
    if (typeof window === 'undefined' || !window.matchMedia) return false;
    return window.matchMedia('(pointer: coarse)').matches;
  }, []);

  const focusFirstField = useCallback(() => {
    const input = nameInputRef.current;
    if (!input) return;
    input.focus({ preventScroll: true });
  }, []);

  const restoreTriggerFocus = useCallback(() => {
    const opener = openerRef.current;
    if (opener && opener.isConnected && !scrimRef.current?.contains(opener)) {
      const cs = getComputedStyle(opener);
      if (cs.visibility !== 'hidden' && cs.display !== 'none') {
        opener.focus({ preventScroll: true });
        return;
      }
      // If opener was a hover-fan button (.act) that became visibility:hidden after hover left,
      // focus a visible control on the same row instead of dropping focus to document.body.
      const rowVisibleControl = opener
        .closest('.row')
        ?.querySelector<HTMLElement>('.nm, .rb');
      if (rowVisibleControl && getComputedStyle(rowVisibleControl).visibility !== 'hidden') {
        rowVisibleControl.focus({ preventScroll: true });
        return;
      }
    }
    const fallback = document.querySelector<HTMLElement>('[data-action="add-member"]');
    fallback?.focus({ preventScroll: true });
  }, []);

  const measureDialogLayoutOrigin = useCallback(
    (root: HTMLDivElement, dialog: HTMLDivElement, triggerEl: HTMLElement | null): string => {
      let dRect: { left: number; top: number; width: number; height: number };
      if (dialog.offsetParent === root || dialog.offsetParent === document.body) {
        dRect = {
          left: dialog.offsetLeft,
          top: dialog.offsetTop,
          width: dialog.offsetWidth,
          height: dialog.offsetHeight,
        };
      } else {
        const prevTransform = dialog.style.transform;
        dialog.style.transform = 'none';
        dRect = dialog.getBoundingClientRect();
        dialog.style.transform = prevTransform;
      }
      const tRect = triggerEl && triggerEl.isConnected ? triggerEl.getBoundingClientRect() : null;
      return computeModalTransformOrigin(
        tRect,
        dRect,
        window.innerWidth,
        window.innerHeight
      );
    },
    []
  );

  const finishKineticClosing = useCallback(() => {
    const root = scrimRef.current;
    const dialog = dialogRef.current;
    const s = springRef.current;
    if (s) {
      s.t = 0;
      s.x = 0;
      s.v = 0;
    }
    if (root) {
      root.hidden = true;
      root.removeAttribute('data-settled');
      root.style.opacity = '0';
      root.style.pointerEvents = 'none';
      root.style.transition = '';
      root.style.willChange = '';
      root.classList.remove('backdrop-blur-xs');
    }
    if (dialog) {
      dialog.style.transform = checkReducedMotion() ? 'scale(1)' : 'scale(0.72)';
      dialog.style.willChange = '';
    }
    lifecycleRef.current = 'closed';
    if (!isOpenRef.current) {
      const hadRetained = retainedMemberRef.current !== null;
      retainedMemberRef.current = null;
      if (hadRetained || formPreparedKeyRef.current !== 'create' || formDirtyRef.current) {
        applyFormForMember(null);
      }
    }
  }, [applyFormForMember]);

  const startKineticOpen = useCallback(() => {
    const root = scrimRef.current;
    const dialog = dialogRef.current;
    const s = springRef.current;
    if (!root || !dialog || !s) return;

    const state = lifecycleRef.current;
    if (state === 'opening' || state === 'open') return; // Ignore duplicate open()

    clearTimers();
    const reduced = checkReducedMotion();
    const touch = isTouchDevice();

    // Capture trigger element before moving focus into dialog
    const explicitOrigin = originPropRef.current;
    const activeEl = typeof document !== 'undefined' ? (document.activeElement as HTMLElement | null) : null;
    if (explicitOrigin && explicitOrigin.isConnected) {
      openerRef.current = explicitOrigin;
    } else if (activeEl && activeEl !== document.body && !root.contains(activeEl)) {
      openerRef.current = activeEl;
    } else {
      openerRef.current = document.querySelector<HTMLElement>('[data-action="add-member"]');
    }

    openedAtRef.current = performance.now();
    scrimMouseDownRef.current = false;

    if (state === 'closing') {
      // Re-entrancy: retarget mid-close keeping current dp.x and dp.v
      lifecycleRef.current = 'opening';
      lockScrollWithoutShift();
      setBackgroundInert(true);

      root.hidden = false;
      root.removeAttribute('data-settled');
      root.classList.remove('backdrop-blur-xs');
      root.style.pointerEvents = 'auto';
      root.style.willChange = 'opacity';
      dialog.style.willChange = reduced ? '' : 'transform';
      dialog.style.transformOrigin = measureDialogLayoutOrigin(root, dialog, openerRef.current);

      if (reduced) {
        dialog.style.transform = 'scale(1)';
        root.style.transition = `opacity ${MODAL_REDUCED_FADE_MS}ms linear`;
        root.style.opacity = '1';
        reducedTimerRef.current = window.setTimeout(() => {
          reducedTimerRef.current = null;
          if (lifecycleRef.current === 'opening') {
            root.style.willChange = '';
            root.style.transition = '';
            root.setAttribute('data-settled', 'true');
            lifecycleRef.current = 'open';
            if (touch) focusFirstField();
          }
        }, MODAL_REDUCED_FADE_MS);
      } else {
        root.style.transition = '';
        s.setTarget(100);
        wake();
      }
    } else {
      // Fresh open from closed state (single layout pass)
      lifecycleRef.current = 'opening';
      lockScrollWithoutShift();
      setBackgroundInert(true);

      root.removeAttribute('data-settled');
      root.classList.remove('backdrop-blur-xs');
      root.style.transition = '';
      root.style.opacity = '0';
      root.style.willChange = 'opacity';
      root.style.pointerEvents = 'auto';
      dialog.style.willChange = reduced ? '' : 'transform';
      dialog.style.transform = reduced ? 'scale(1)' : 'scale(0.72)';

      root.hidden = false;
      // measureDialogLayoutOrigin reads dialog.offsetLeft/offsetTop, flushing initial hidden->visible + scale(0.72) once
      dialog.style.transformOrigin = measureDialogLayoutOrigin(root, dialog, openerRef.current);

      if (reduced) {
        root.style.transition = `opacity ${MODAL_REDUCED_FADE_MS}ms linear`;
        root.style.opacity = '1';
        s.x = 100;
        s.v = 0;
        s.t = 100;
        reducedTimerRef.current = window.setTimeout(() => {
          reducedTimerRef.current = null;
          if (lifecycleRef.current === 'opening') {
            root.style.willChange = '';
            root.style.transition = '';
            root.setAttribute('data-settled', 'true');
            lifecycleRef.current = 'open';
            if (touch) focusFirstField();
          }
        }, MODAL_REDUCED_FADE_MS);
      } else {
        s.x = 0;
        s.v = 0;
        s.t = 100;
        wake();
      }
    }

    if (!touch) {
      focusTimerRef.current = window.setTimeout(() => {
        focusTimerRef.current = null;
        if (lifecycleRef.current === 'opening' || lifecycleRef.current === 'open') {
          focusFirstField();
        }
      }, MODAL_FOCUS_DELAY_MS);
    }
  }, [
    clearTimers,
    focusFirstField,
    isTouchDevice,
    lockScrollWithoutShift,
    measureDialogLayoutOrigin,
    setBackgroundInert,
  ]);

  const startKineticClose = useCallback(() => {
    const root = scrimRef.current;
    const dialog = dialogRef.current;
    const s = springRef.current;
    if (!root || !dialog || !s) return;

    const state = lifecycleRef.current;
    if (state === 'closed' || state === 'closing') return;

    clearTimers();
    lifecycleRef.current = 'closing';

    // Stop blocking underlying UI and remove backdrop blur immediately on close start
    root.style.pointerEvents = 'none';
    root.removeAttribute('data-settled');
    root.classList.remove('backdrop-blur-xs');

    // Unlock background & scroll BEFORE returning focus so trigger inside #root is focusable
    setBackgroundInert(false);
    unlockScroll();
    restoreTriggerFocus();

    // Synchronize parent state immediately so rapid re-open (open/close/open) always triggers
    if (isOpenRef.current) {
      onCloseRef.current();
    }

    const reduced = checkReducedMotion();
    if (reduced) {
      root.style.willChange = 'opacity';
      root.style.transition = `opacity ${MODAL_REDUCED_FADE_MS}ms linear`;
      root.style.opacity = '0';
      s.x = 0;
      s.v = 0;
      s.t = 0;
      reducedTimerRef.current = window.setTimeout(() => {
        reducedTimerRef.current = null;
        if (lifecycleRef.current === 'closing') {
          finishKineticClosing();
        }
      }, MODAL_REDUCED_FADE_MS);
    } else {
      root.style.transition = '';
      root.style.willChange = 'opacity';
      dialog.style.willChange = 'transform';
      // Retarget preserving current dp.x and dp.v
      s.setTarget(0);
      wake();
    }
  }, [clearTimers, finishKineticClosing, restoreTriggerFocus, setBackgroundInert, unlockScroll]);

  const lastModalDrawKeyRef = useRef<string>('');

  // Kinetic rAF frame & cleanup subscriptions (DOM refs only, zero React renders)
  useEffect(() => {
    if (!useKineticSpring) return;

    const drawModal = () => {
      const state = lifecycleRef.current;
      if (state === 'closed' || checkReducedMotion()) return;
      const root = scrimRef.current;
      const dialog = dialogRef.current;
      const s = springRef.current;
      if (!root || !dialog || !s) return;
      if (state === 'open' && s.rest()) return;

      const metrics = computeMemberModalMetrics(s.x, false);
      const opQ = Math.round(metrics.opacity * 100) / 100;
      const scQ = Math.round(metrics.scale * 1000) / 1000;
      const drawKey = `${opQ}|${scQ}`;
      if (drawKey === lastModalDrawKeyRef.current) return;
      lastModalDrawKeyRef.current = drawKey;

      root.style.opacity = String(opQ);
      dialog.style.transform = `scale3d(${scQ}, ${scQ}, 1)`;
    };

    const cleanModal = () => {
      const state = lifecycleRef.current;
      if (state === 'closed' || checkReducedMotion()) return;
      const root = scrimRef.current;
      const dialog = dialogRef.current;
      const s = springRef.current;
      if (!root || !dialog || !s) return;

      if (state === 'opening' && s.t === 100 && s.rest()) {
        s.snap();
        lastModalDrawKeyRef.current = '1|1';
        root.style.opacity = '1';
        dialog.style.transform = 'scale3d(1, 1, 1)';
        root.style.willChange = '';
        dialog.style.willChange = '';
        root.setAttribute('data-settled', 'true');
        lifecycleRef.current = 'open';
        if (isTouchDevice()) {
          focusFirstField();
        }
      } else if (state === 'closing' && shouldFinishClosing(s.x, s.t)) {
        lastModalDrawKeyRef.current = '';
        finishKineticClosing();
      }
    };

    const unsubDraw = subscribeFrame(drawModal);
    const unsubClean = subscribeCleanup(cleanModal);
    return () => {
      unsubDraw();
      unsubClean();
    };
  }, [useKineticSpring, finishKineticClosing, focusFirstField, isTouchDevice]);

  // Initialize closed DOM baseline on mount when kinetic spring is active
  useLayoutEffect(() => {
    if (!useKineticSpring || isOpenRef.current) return;
    const root = scrimRef.current;
    const dialog = dialogRef.current;
    if (root) {
      root.hidden = true;
      root.removeAttribute('data-settled');
      root.style.opacity = '0';
      root.style.pointerEvents = 'none';
    }
    if (dialog) {
      dialog.style.transform = checkReducedMotion() ? 'scale(1)' : 'scale(0.72)';
    }
  }, [useKineticSpring]);

  // Trigger kinetic open/close synchronously before paint when isOpen prop changes
  useLayoutEffect(() => {
    if (!useKineticSpring) return;
    if (isOpen) {
      startKineticOpen();
    } else if (lifecycleRef.current === 'opening' || lifecycleRef.current === 'open') {
      startKineticClose();
    }
  }, [useKineticSpring, isOpen, startKineticOpen, startKineticClose]);

  // Zero-re-render imperative opener subscription for kinetic mode
  useEffect(() => {
    if (!useKineticSpring) return;
    return registerKineticMemberModalOpener(({ member, originElement: reqOrigin }) => {
      originPropRef.current = reqOrigin ?? null;
      const targetMember = (member as Member | null) ?? null;
      retainedMemberRef.current = targetMember;

      if (targetMember) {
        applyFormForMember(targetMember);
      } else if (formPreparedKeyRef.current !== 'create' || formDirtyRef.current) {
        applyFormForMember(null);
      }

      startKineticOpen();
    });
  }, [useKineticSpring, applyFormForMember, startKineticOpen]);

  // Legacy subscription (ONLY used when useKineticSpring === false)
  useEffect(() => {
    if (useKineticSpring) return;
    const s = springRef.current!;
    const unsub = s.subscribe((v) => {
      setLegacyVal(v);
      if (s.t === 0 && s.rest() && legacyCloseReqRef.current) {
        setLegacyHidden(true);
        legacyCloseReqRef.current = false;

        if (openerRef.current && document.body.contains(openerRef.current)) {
          openerRef.current.focus();
        } else {
          const newBtn = document.querySelector<HTMLElement>('[data-action="add-member"]');
          newBtn?.focus();
        }

        onCloseRef.current();
      }
    });

    return () => unsub();
  }, [useKineticSpring]);

  const requestClose = useCallback(() => {
    if (useKineticSpring) {
      startKineticClose();
      return;
    }
    if (legacyCloseReqRef.current) return;
    legacyCloseReqRef.current = true;
    springRef.current?.setTarget(0);
  }, [useKineticSpring, startKineticClose]);

  // Legacy open/close lifecycle (ONLY when useKineticSpring === false)
  useEffect(() => {
    if (useKineticSpring) return;
    const s = springRef.current!;

    if (isOpen) {
      legacyCloseReqRef.current = false;
      setLegacyHidden(false);

      const activeEl = document.activeElement as HTMLElement | null;
      if (activeEl && activeEl !== document.body) {
        openerRef.current = activeEl;
      }

      if (openerRef.current) {
        const rect = openerRef.current.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;

        if (dialogRef.current) {
          const ox = cx - dialogRef.current.offsetLeft;
          const oy = cy - dialogRef.current.offsetTop;
          setLegacyOrigin(`${ox}px ${oy}px`);
        }
      } else {
        setLegacyOrigin('center center');
      }

      s.setTarget(100);

      const focusTimer = setTimeout(() => {
        nameInputRef.current?.focus();
      }, 30);

      setBackgroundInert(true);

      return () => {
        clearTimeout(focusTimer);
      };
    } else {
      if (!legacyCloseReqRef.current && !legacyHidden) {
        requestClose();
      }
    }
  }, [useKineticSpring, isOpen, requestClose, legacyHidden, setBackgroundInert]);

  useEffect(() => {
    if (useKineticSpring) return;
    if (legacyHidden) {
      setBackgroundInert(false);
    }
  }, [useKineticSpring, legacyHidden, setBackgroundInert]);

  // Populate or reset form fields (non-kinetic path only; kinetic path syncs pre-paint and resets after close)
  useEffect(() => {
    if (useKineticSpring || !isOpen) return;
    applyFormForMember(memberToEdit ?? null);
  }, [useKineticSpring, isOpen, memberToEdit, applyFormForMember]);

  // Keyboard navigation: single-level Escape close & Tab trap inside dialog
  useLayoutEffect(() => {
    if (!useKineticSpring && !isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (useKineticSpring) {
        if (lifecycleRef.current !== 'opening' && lifecycleRef.current !== 'open') return;
      } else if (legacyHidden) {
        return;
      }

      if (e.key === 'Escape') {
        if (useKineticSpring && dialogRef.current?.querySelector('[role="listbox"]')) {
          return;
        }
        e.preventDefault();
        if (useKineticSpring) {
          e.stopImmediatePropagation();
          e.stopPropagation();
        }
        requestClose();
        return;
      }

      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          )
        ).filter(
          (el) =>
            !el.hasAttribute('disabled') &&
            el.tabIndex >= 0 &&
            el.offsetParent !== null &&
            !el.closest('[hidden], [inert]')
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first || !dialogRef.current.contains(document.activeElement)) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last || !dialogRef.current.contains(document.activeElement)) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, useKineticSpring);
    return () => window.removeEventListener('keydown', handleKeyDown, useKineticSpring);
  }, [useKineticSpring, legacyHidden, isOpen, requestClose]);

  // Destroy spring & restore global document state on unmount
  useEffect(() => {
    return () => {
      clearTimers();
      springRef.current?.destroy();
      springRef.current = null;
      setBackgroundInert(false);
      unlockScroll();
    };
  }, [clearTimers, setBackgroundInert, unlockScroll]);

  // Form submit handler with validation
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    const newErrors: { fullName?: string; email?: string } = {};

    if (!fullName.trim()) {
      newErrors.fullName = 'Le nom est obligatoire.';
    }

    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!email.trim() || !emailRegex.test(email)) {
      newErrors.email = 'Veuillez saisir une adresse email valide.';
    }

    if (Object.keys(newErrors).length > 0) {
      formDirtyRef.current = true;
      setErrors(newErrors);
      if (newErrors.fullName) {
        nameInputRef.current?.focus();
      } else if (newErrors.email) {
        emailInputRef.current?.focus();
      }
      return;
    }

    formDirtyRef.current = true;
    setIsSubmitting(true);

    const selectedPlan = plans.find((p) => p.id === planId) || plans[0];
    const durationDays = selectedPlan ? selectedPlan.durationDays : 30;
    const start = new Date(startDate || Date.now());
    const expDate = new Date(start.getTime() + durationDays * 24 * 60 * 60 * 1000);
    const expirationDate = expDate.toISOString().split('T')[0];

    const targetEdit = useKineticSpring
      ? (retainedMemberRef.current || memberToEdit)
      : (activeMemberToEdit || memberToEdit);
    if (targetEdit) {
      const prevData = { ...targetEdit };
      const updatedFields: Partial<Member> = {
        fullName: fullName.trim(),
        email: email.trim(),
        phoneNumber: phoneNumber.trim(),
        cardId: cardId.trim(),
        gender,
        dateOfBirth,
        startDate,
        membershipPlanId: selectedPlan?.id,
        membershipPlanName: selectedPlan?.name,
        emergencyContactName: emergencyName.trim(),
        emergencyContactPhone: emergencyPhone.trim(),
        source,
        notes: notes.trim(),
      };

      updateMember(targetEdit.id, updatedFields);

      showToast({
        type: 'info',
        title: 'Adhérent modifié',
        message: `Fiche de ${fullName.trim()} mise à jour.`,
        action: {
          label: 'Annuler',
          onClick: () => {
            updateMember(targetEdit.id, prevData);
            showToast({
              type: 'info',
              title: 'Modification annulée',
              message: `Modifications sur ${prevData.fullName} annulées.`,
            });
          },
        },
      });

      requestClose();
    } else {
      const newMember = addMember({
        fullName: fullName.trim(),
        email: email.trim(),
        phoneNumber: phoneNumber.trim(),
        cardId: cardId.trim(),
        status: 'Active',
        startDate,
        expirationDate,
        membershipPlanId: selectedPlan?.id,
        membershipPlanName: selectedPlan?.name,
        remainingSessions: durationDays >= 90 ? 999 : 30,
        gender,
        dateOfBirth,
        source,
        emergencyContactName: emergencyName.trim(),
        emergencyContactPhone: emergencyPhone.trim(),
        notes: notes.trim(),
      });

      window.dispatchEvent(new CustomEvent('atrium-member-created', { detail: newMember }));
      onCreatedSuccess?.(newMember);

      showToast({
        type: 'success',
        title: 'Nouvel adhérent créé',
        message: `${newMember.fullName} a été inscrit avec succès.`,
      });

      requestClose();
    }
  };

  const legacyMetrics = !useKineticSpring
    ? computeMemberModalMetrics(legacyVal, false)
    : null;

  const displayedEdit = useKineticSpring ? retainedMemberRef.current : memberToEdit;

  const genderOptions = useMemo(
    () => [
      { value: 'Male', label: t('member_gender_male', language) },
      { value: 'Female', label: t('member_gender_female', language) },
      { value: 'Other', label: t('member_gender_other', language) },
    ],
    [language]
  );

  const planOptions = useMemo(
    () =>
      plans.map((p) => {
        const priceVal = typeof p.price === 'number' ? p.price : p.price?.amount ?? 0;
        return {
          value: p.id,
          label: p.name,
          sublabel: `${p.durationDays} j · ${priceVal.toLocaleString()} DZD`,
        };
      }),
    [plans]
  );

  const sourceOptions = useMemo(
    () => [
      { value: 'Walk-in', label: 'Passage direct' },
      { value: 'Instagram', label: 'Instagram' },
      { value: 'Facebook', label: 'Facebook' },
      { value: 'Referral', label: 'Parrainage' },
      { value: 'Website', label: 'Site web' },
      { value: 'VIP Partner', label: 'Partenaire' },
    ],
    []
  );

  const modalContent = (
    <div
      ref={scrimRef}
      role="presentation"
      hidden={useKineticSpring ? true : legacyHidden}
      className={`member-modal-root scrim fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 select-none ${
        useKineticSpring ? '' : 'backdrop-blur-xs'
      }`}
      style={useKineticSpring ? undefined : { opacity: legacyMetrics?.opacity ?? 0 }}
      onMouseDown={(e) => {
        if (!useKineticSpring) return;
        scrimMouseDownRef.current = e.target === scrimRef.current;
      }}
      onMouseUp={(e) => {
        if (!useKineticSpring) return;
        const mouseupOnScrim = e.target === scrimRef.current;
        const shouldClose = shouldCloseOnScrimMouseUp(
          scrimMouseDownRef.current,
          mouseupOnScrim,
          performance.now(),
          openedAtRef.current
        );
        scrimMouseDownRef.current = false;
        if (shouldClose) {
          requestClose();
        }
      }}
      onClick={(e) => {
        if (useKineticSpring) return;
        if (e.target === scrimRef.current) {
          requestClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="member-modal-title"
        className={`member-modal-dialog dialog relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-[28px] bg-white dark:bg-[#1A1A1A] p-6 border border-[#E6DED6] dark:border-neutral-800 text-left select-text ${
          useKineticSpring
            ? 'shadow-[0_18px_48px_rgba(0,0,0,0.28)]'
            : 'shadow-[0_24px_64px_rgba(0,0,0,0.35)]'
        }`}
        style={
          useKineticSpring
            ? undefined
            : {
                transform: legacyMetrics?.transform ?? 'scale(0.72)',
                transformOrigin: legacyOrigin,
              }
        }
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-[#E6DED6] dark:border-[#3A3734]">
          <div>
            <h3
              id="member-modal-title"
              className="text-xl font-bold font-['Barlow_Condensed',sans-serif] rtl:font-sans tracking-tight rtl:tracking-normal text-black dark:text-white"
            >
              {displayedEdit
                ? language === 'ar'
                  ? `تعديل ملف ${terminology.memberSingle}`
                  : `Modifier la fiche ${terminology.memberSingle.toLowerCase()}`
                : language === 'ar'
                ? `تسجيل ${terminology.memberSingle} جديد`
                : `Nouveau ${terminology.memberSingle.toLowerCase()}`}
            </h3>
            <p className="text-xs text-black/65 dark:text-white/65 mt-0.5">
              {currentBranch.name} · Atrium Health & Roster
            </p>
          </div>
          <button
            type="button"
            onClick={requestClose}
            aria-label="Fermer la boîte de dialogue"
            className="w-8 h-8 rounded-full grid place-items-center text-black/62 dark:text-white/65 hover:text-black dark:hover:text-white hover:bg-[#F3EDE7] dark:hover:bg-[#262422] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} noValidate className="space-y-4 pt-4">
          {/* Section 1: Identification */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider rtl:normal-case rtl:tracking-normal text-black/60 dark:text-white/60">
              {t('member_section_personal', language)}
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Full Name Field */}
              {useKineticSpring ? (
                <div>
                  <LabelInput
                    inputRef={nameInputRef}
                    id="member-fullName"
                    name="fullName"
                    field="FullName"
                    label={`${t('modal_name', language)} *`}
                    required
                    value={fullName}
                    error={errors.fullName}
                    errorId="fullName-error"
                    onChange={(val) => {
                      formDirtyRef.current = true;
                      setFullName(String(val));
                      if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: undefined }));
                    }}
                    width="100%"
                    height={40}
                    corner={12}
                  />
                </div>
              ) : (
                <div>
                  <label
                    htmlFor="member-fullName"
                    className="block text-[11px] font-bold text-black/75 dark:text-white/75 uppercase tracking-wider rtl:normal-case rtl:tracking-normal mb-1"
                  >
                    {t('modal_name', language)} *
                  </label>
                  <input
                    ref={nameInputRef}
                    id="member-fullName"
                    name="fullName"
                    type="text"
                    required
                    aria-invalid={Boolean(errors.fullName)}
                    aria-describedby={errors.fullName ? 'fullName-error' : undefined}
                    value={fullName}
                    onChange={(e) => {
                      formDirtyRef.current = true;
                      setFullName(e.target.value);
                      if (errors.fullName) setErrors((prev) => ({ ...prev, fullName: undefined }));
                    }}
                    className={`w-full h-10 px-3 rounded-xl border text-sm font-medium transition-colors bg-white dark:bg-[#262422] text-black dark:text-white placeholder:text-black/55 dark:placeholder:text-white/55 focus:outline-none ${
                      errors.fullName
                        ? 'border-[#B8321C] focus:border-[#B8321C] ring-1 ring-[#B8321C]'
                        : 'border-[#E6DED6] dark:border-[#3A3734] focus:border-[#C9441F]'
                    }`}
                    placeholder="ex: Amira Belkacem"
                  />
                  {errors.fullName && (
                    <p
                      id="fullName-error"
                      role="alert"
                      className="mt-1 text-[11.5px] font-medium text-[#B8321C] flex items-center gap-1"
                    >
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{errors.fullName}</span>
                    </p>
                  )}
                </div>
              )}

              {/* Email Field */}
              {useKineticSpring ? (
                <div>
                  <LabelInput
                    inputRef={emailInputRef}
                    id="member-email"
                    name="email"
                    type="email"
                    field="Email"
                    label={`${t('modal_email', language)} *`}
                    required
                    value={email}
                    error={errors.email}
                    errorId="email-error"
                    onChange={(val) => {
                      formDirtyRef.current = true;
                      setEmail(String(val));
                      if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                    }}
                    width="100%"
                    height={40}
                    corner={12}
                  />
                </div>
              ) : (
                <div>
                  <label
                    htmlFor="member-email"
                    className="block text-[11px] font-bold text-black/75 dark:text-white/75 uppercase tracking-wider rtl:normal-case rtl:tracking-normal mb-1"
                  >
                    {t('modal_email', language)} *
                  </label>
                  <input
                    ref={emailInputRef}
                    id="member-email"
                    name="email"
                    type="email"
                    required
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={errors.email ? 'email-error' : undefined}
                    value={email}
                    onChange={(e) => {
                      formDirtyRef.current = true;
                      setEmail(e.target.value);
                      if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                    }}
                    className={`w-full h-10 px-3 rounded-xl border text-sm font-medium transition-colors bg-white dark:bg-[#262422] text-black dark:text-white placeholder:text-black/55 dark:placeholder:text-white/55 focus:outline-none ${
                      errors.email
                        ? 'border-[#B8321C] focus:border-[#B8321C] ring-1 ring-[#B8321C]'
                        : 'border-[#E6DED6] dark:border-[#3A3734] focus:border-[#C9441F]'
                    }`}
                    placeholder="contact@domaine.com"
                  />
                  {errors.email && (
                    <p
                      id="email-error"
                      role="alert"
                      className="mt-1 text-[11.5px] font-medium text-[#B8321C] flex items-center gap-1"
                    >
                      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{errors.email}</span>
                    </p>
                  )}
                </div>
              )}

              {/* Phone Field */}
              <div>
                <LabelInput
                  field="Phone"
                  label={t('modal_phone', language)}
                  value={phoneNumber}
                  onChange={(val) => {
                    formDirtyRef.current = true;
                    setPhoneNumber(val);
                  }}
                  type="tel"
                  width="100%"
                  height={40}
                  corner={12}
                />
              </div>

              {/* Gender and Birth Date */}
              <div className="grid grid-cols-2 gap-2 items-start">
                {useKineticSpring ? (
                  <LabelSelect
                    field="Gender"
                    label={t('member_field_gender', language)}
                    value={gender}
                    onChange={(val) => {
                      formDirtyRef.current = true;
                      setGender((val?.target?.value ?? val) as Gender);
                    }}
                    options={genderOptions}
                    width="100%"
                    height={40}
                    corner={12}
                  />
                ) : (
                  <div>
                    <label className="block text-[11px] font-bold text-black/75 dark:text-white/75 uppercase tracking-wider rtl:normal-case rtl:tracking-normal mb-1">
                      {t('member_field_gender', language)}
                    </label>
                    <LiveSegmentedControl
                      fullWidth
                      size="md"
                      value={gender}
                      onValueChange={(val) => {
                        formDirtyRef.current = true;
                        setGender(val as Gender);
                      }}
                      options={genderOptions}
                      aria-label={t('member_field_gender', language)}
                    />
                  </div>
                )}

                <LabelInput
                  field="BirthDate"
                  label={t('member_field_birth_date', language)}
                  type="date"
                  value={dateOfBirth}
                  onChange={(val) => {
                    formDirtyRef.current = true;
                    setDateOfBirth(val);
                  }}
                  width="100%"
                  height={40}
                  corner={12}
                />
              </div>
            </div>
            </div>

            {/* Section 2: Membership Plan */}
            <div className="space-y-3 pt-3 border-t border-[#E6DED6] dark:border-[#3A3734]">
              <h4 className="text-xs font-bold uppercase tracking-wider rtl:normal-case rtl:tracking-normal text-black/62 dark:text-white/65">
                {t('member_section_membership', language)}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <LabelSelect
                  field="PlanPackage"
                  label={`${t('member_field_plan_package', language)} *`}
                  value={planId}
                  onChange={(val) => {
                    formDirtyRef.current = true;
                    setPlanId(val?.target?.value ?? val);
                  }}
                  options={planOptions}
                  width="100%"
                  height={40}
                  corner={12}
                />

                <LabelInput
                  field="StartDate"
                  label={t('member_field_start_date', language)}
                  type="date"
                  value={startDate}
                  onChange={(val) => {
                    formDirtyRef.current = true;
                    setStartDate(val);
                  }}
                  width="100%"
                  height={40}
                  corner={12}
                />

                <LabelInput
                  field="CardId"
                  label={t('member_field_rfid_card', language)}
                  value={cardId}
                  onChange={(val) => {
                    formDirtyRef.current = true;
                    setCardId(val);
                  }}
                  placeholder="RFID-XXXXXX"
                  width="100%"
                  height={40}
                  corner={12}
                />
              </div>
            </div>

            {/* Section 3: Emergency & Notes */}
            <div className="space-y-3 pt-3 border-t border-[#E6DED6] dark:border-[#3A3734]">
              <h4 className="text-xs font-bold uppercase tracking-wider rtl:normal-case rtl:tracking-normal text-black/62 dark:text-white/65">
                {t('member_section_emergency', language)}
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <LabelInput
                  field="EmergencyContact"
                  label={t('member_field_emergency_contact', language)}
                  value={emergencyName}
                  onChange={(val) => {
                    formDirtyRef.current = true;
                    setEmergencyName(val);
                  }}
                  placeholder="Nom du proche"
                  width="100%"
                  height={40}
                  corner={12}
                />

                <LabelInput
                  field="EmergencyPhone"
                  label={t('member_field_emergency_phone', language)}
                  type="tel"
                  value={emergencyPhone}
                  onChange={(val) => {
                    formDirtyRef.current = true;
                    setEmergencyPhone(val);
                  }}
                  placeholder="+213 555 00 00 00"
                  width="100%"
                  height={40}
                  corner={12}
                />

                <LabelSelect
                  field="AcquisitionChannel"
                  label={t('member_field_acquisition', language)}
                  value={source}
                  onChange={(val) => {
                    formDirtyRef.current = true;
                    setSource(val?.target?.value ?? val);
                  }}
                  options={sourceOptions}
                  width="100%"
                  height={40}
                  corner={12}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-black/80 dark:text-white/80 mb-1">
                  {t('member_field_private_notes', language)}
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => {
                    formDirtyRef.current = true;
                    setNotes(e.target.value);
                  }}
                  placeholder="Notes médicales, objectifs ou restrictions..."
                  className="w-full p-2.5 text-sm border rounded-xl border-[#E6DED6] dark:border-[#3A3734] bg-white dark:bg-[#262422] text-black dark:text-white placeholder:text-black/55 dark:placeholder:text-white/55 focus:outline-none focus:border-[#C9441F] resize-none"
                />
              </div>
            </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E6DED6] dark:border-[#3A3734]">
            <Button
              type="button"
              tone="soft"
              size={40}
              onClick={requestClose}
            >
              {t('action_cancel', language)}
            </Button>

            <LiquidButton
              kind={displayedEdit ? 'confirm' : 'create'}
              type="submit"
              disabled={isSubmitting}
              labels={{
                idle: displayedEdit
                  ? t('action_save', language)
                  : `Inscrire ${terminology.memberSingle.toLowerCase()}`,
              }}
            />
          </div>
        </form>
      </div>
    </div>
  );

  return typeof document !== 'undefined'
    ? createPortal(modalContent, document.body)
    : null;
});

MemberModal.displayName = 'MemberModal';
