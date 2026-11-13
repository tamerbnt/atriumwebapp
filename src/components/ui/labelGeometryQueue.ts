/**
 * Shared read-then-write microtask batcher for LabelInput & LabelSelect geometry sync.
 * Prevents N sequential ResizeObserver callbacks inside a modal from interleaving
 * offsetWidth reads with SVG attribute writes (eliminating N forced synchronous reflows).
 */
type GeometryEntry = {
  read: () => void;
  write: () => void;
};

const pendingWrites = new Set<() => void>();
const pendingReadWrite = new Set<GeometryEntry>();
let flushScheduled = false;

function scheduleFlush(): void {
  if (flushScheduled) return;
  flushScheduled = true;
  queueMicrotask(() => {
    flushScheduled = false;
    if (pendingReadWrite.size > 0) {
      const entries = Array.from(pendingReadWrite);
      pendingReadWrite.clear();
      // Phase 1: batch all DOM layout reads together
      for (let i = 0; i < entries.length; i++) {
        entries[i].read();
      }
      // Phase 2: batch all SVG DOM writes together
      for (let i = 0; i < entries.length; i++) {
        entries[i].write();
      }
    }
    if (pendingWrites.size > 0) {
      const writers = Array.from(pendingWrites);
      pendingWrites.clear();
      for (let i = 0; i < writers.length; i++) {
        writers[i]();
      }
    }
  });
}

export function enqueueLabelWrite(writeFn: () => void): void {
  pendingWrites.add(writeFn);
  scheduleFlush();
}

export function enqueueLabelReadWrite(entry: GeometryEntry): void {
  pendingReadWrite.add(entry);
  scheduleFlush();
}

export function cancelLabelGeometryTask(writeFn: () => void, entry?: GeometryEntry): void {
  pendingWrites.delete(writeFn);
  if (entry) pendingReadWrite.delete(entry);
}
