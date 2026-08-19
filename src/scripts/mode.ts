/* §44 — which site this load is, as a subscription.

   The head script in `Base.astro` resolves the mode before first paint and
   writes it on the root, so the answer is already there when any of these
   modules run. What this file adds is the one transition it has, and that
   transition is the whole reason it is a subscription rather than a read:
   `world.ts` **deletes** `data-mode` when the adapter request comes back
   empty, and that load is §0.1's bottom tier reached late — a real
   document, un-inerted and scrolling, which must get everything a document
   load gets. A one-shot check at import leaves that reader looking at a
   page whose bands never drift and whose sections never pin.

   The other direction cannot happen from here: entering the world is a
   navigation and not an attribute. The observer is symmetric anyway,
   because it costs nothing and it keeps the gate true rather than true so
   far.

   Deliberately the same shape as `motion.ts` — a predicate and a
   subscription, one observer for the whole page — because it is the same
   kind of fact and every module that reads one reads the other. */

const root = document.documentElement;

export const inWorld = () => root.dataset.mode === 'world';

const listeners = new Set<(world: boolean) => void>();
let last = inWorld();

export function onModeChange(fn: (world: boolean) => void) {
  listeners.add(fn);
}

new MutationObserver(() => {
  const world = inWorld();
  if (world === last) return;
  last = world;
  for (const fn of listeners) fn(world);
}).observe(root, { attributeFilter: ['data-mode'] });
