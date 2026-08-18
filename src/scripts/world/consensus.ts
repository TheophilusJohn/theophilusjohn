/* §4.7 / §34 — the election, which is the one thing to get right.

   "A term ends, and the landscape a visitor is flying over rearranges
   itself because a distributed system elected a different leader." This is
   the distributed system. It is forty lines of arithmetic and it is the
   only file on this site that could not be written by someone who had not
   implemented Raft — everything else here is scaffolding for it.

   **A pure function of time, and that is a correction to §15.** The old
   field drew its next leader with `Math.random()` at the end of every term,
   and §17's brightness harness recorded what that cost: two runs of the
   same length disagreed by 1.7× on one stop's ceiling and one passed a stop
   the other failed at 4.22:1, because the worst frame is the worst over
   five placements and the tweens between them and no timed sample can
   bound it. Here `stateAt(t)` is total: the term index is `t / TERM`, the
   leader is a hash of the term index, and a harness can walk every phase of
   every term by asking for the seconds it wants. Nothing is stored, so
   nothing has to be reset either — the same second gives the same cluster
   in the page, in Node and on a reload.

   **The incumbent may not succeed itself**, which is the one Raft detail
   that shows in the picture rather than in the log: the next leader is
   drawn from the four that are not holding the term. A cluster that
   re-elects the same node looks like nothing happening, and it is also not
   what an election *for* is — the term ended because that node stopped
   being heard from.

   No three, no DOM, no imports but the field's own node ring. */

import { CLUSTER_NODES } from './height';

/** Seconds a term lasts, end to end, including the election that opens it.

    §15 ran Homonoia's at 3.4s, which was right for a field behind a
    paragraph and is wrong for a mountain: the swell moves a summit thirty
    units and a reader arriving at the station is reading a writeup while
    it happens. At 9 a reader who stops anywhere in the dwell sees one
    election inside the first nine seconds and about four in a minute's
    reading, which is often enough to be the subject and rare enough that
    the ground is *still* most of the time. */
export const TERM = 9;

/* ── The phases of a term, in seconds from its start ────────────────────
   Raft, in the order it happens, and each boundary is a thing that is
   visible in the frame rather than a state name:

   - `0 → GAP` the old leader has stopped and nothing is being heard. The
     silence is the whole reason an election happens and it is the only
     part of this a reader can read without knowing the protocol: the
     traffic stops.
   - `GAP → CALL` one follower's election timeout fires first. It becomes a
     candidate, votes for itself and sends RequestVote to the other four.
   - `CALL → WON` the votes come back. A majority of five is three, so the
     term is decided before the last of them lands — which is why the
     ground starts moving here rather than at the end.
   - `WON → TERM` steady state. AppendEntries out, acks back, and the
     summit under the new leader is where the swell has put it. */
const GAP = 0.9;
const CALL = 2.1;
const WON = 3.3;

/** How much of the distribution the leader holds in steady state. The rest
    is split evenly, so `swell`'s deviation runs from +0.4 under the leader
    to −0.1 under each follower — a summit that rises thirty units and four
    that settle six to nine. Not 1.0: a leader that took *all* the traffic
    would be a cluster with four idle nodes in it, which is neither Raft nor
    a picture of it. */
const LEAD_SHARE = 0.6;

/* Bit mixing, so consecutive term numbers give unrelated leaders. Any
   integer hash does; this is the one `height.ts` already trusts. */
function hash(k: number): number {
  let h = Math.imul(k ^ 0x9e37_79b9, 0x1657_1a2b);
  h = Math.imul(h ^ (h >>> 13), 0x4bf5_1a3d);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/* ── The succession, as a cycle ─────────────────────────────────────────
   "Not the incumbent" is a condition on consecutive terms, so the obvious
   spelling is `leaderOf(k−1)` and it is wrong twice: it recurses once per
   term elapsed — a page open for an hour would walk four hundred frames
   deep every frame, and a harness asking for term 20,000 overflows the
   stack, which is how this was found — and it makes an O(1) question O(k).

   A cycle has the property by construction and costs one modulo. The walk
   is done once at module load, over a length chosen coprime to nothing in
   particular except that the wrap is checked: entry 0 must differ from the
   last, or the seam is the one repeat the rule exists to forbid. 97 terms
   is 14.5 minutes of world, which is longer than anyone stands at a
   station, and after it the cluster repeats a sequence nobody has seen the
   start of. */
const CYCLE = 97;
const SUCCESSION = (() => {
  const seq = new Uint8Array(CYCLE);
  for (let k = 1; k < CYCLE; k++) {
    const last = seq[k - 1]!;
    const pick = Math.floor(hash(k) * (CLUSTER_NODES - 1));
    seq[k] = pick >= last ? (pick + 1) % CLUSTER_NODES : pick;
  }
  // The seam. If the walk happened to close on 0, rotate the last entry off
  // it — it is still not equal to its own predecessor, which is the rule.
  if (seq[CYCLE - 1] === seq[0]) seq[CYCLE - 1] = (seq[CYCLE - 1]! + 1) % CLUSTER_NODES;
  return seq;
})();

/** Who holds term `k`. Term 0 is node 0 so the world opens in a known
    state; after that it is one of the four that did not hold the last. */
export const leaderOf = (k: number): number =>
  SUCCESSION[((k % CYCLE) + CYCLE) % CYCLE]!;

const smoothstep = (t: number) => t * t * (3 - 2 * t);
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);
const ramp = (v: number, a: number, b: number) => smoothstep(clamp01((v - a) / (b - a)));

export type Cluster = {
  /** The term number, monotonic from 0. */
  term: number;
  /** Who is holding it, and who held the last one. */
  leader: number;
  previous: number;
  /** Seconds into the term. */
  at: number;
  /** 0 through the silence, 1 once the new leader is established — and it
      is the *only* thing the ground reads. Everything else here is what the
      five structures and the traffic between them do. */
  held: number;
  /** Which node is campaigning, and how far through its candidacy: 0 before
      it calls the election, 1 when the votes are in. −1 when nobody is. */
  candidate: number;
  campaign: number;
  /** How much traffic is flowing. 1 in steady state, 0 through the silence
      — the pause is the tell, and a cluster whose messages never stop is
      not showing an election, it is showing a busy network. */
  flow: number;
  /** The distribution `height.ts`'s swell is a deviation from. Five numbers
      summing to 1, tweened across the election. */
  shares: number[];
};

const FOLLOW = (1 - LEAD_SHARE) / (CLUSTER_NODES - 1);

/**
 * The cluster at a wall-clock second. Total, deterministic, allocation of
 * one small array — called once a frame by the world and as many times as
 * it likes by a harness.
 */
export function stateAt(t: number): Cluster {
  const term = Math.floor(t / TERM);
  const at = t - term * TERM;
  const leader = leaderOf(term);
  const previous = term > 0 ? leaderOf(term - 1) : leader;

  /* The ground follows the *votes*, not the announcement: a majority of
     five is three, so by the time the fourth reply lands the term is
     already decided. It starts moving inside the candidacy and finishes
     with it. Term 0 has no predecessor to hand over from, so it is held
     from the first frame — the world does not open mid-election. */
  const held = term === 0 ? 1 : ramp(at, CALL - 0.4, WON + 1.2);

  const candidate = at >= GAP && at < WON ? leader : -1;
  const campaign = ramp(at, GAP, WON);

  /* Out through the silence, back as the new leader starts sending. Faster
     out than in: what a reader has to notice is that it *stopped*. */
  const flow = Math.max(1 - ramp(at, GAP * 0.35, GAP), ramp(at, WON - 0.4, WON + 0.8));

  const shares: number[] = [];
  for (let i = 0; i < CLUSTER_NODES; i++) {
    const was = i === previous ? LEAD_SHARE : FOLLOW;
    const now = i === leader ? LEAD_SHARE : FOLLOW;
    shares.push(was + (now - was) * held);
  }

  return { term, leader, previous, at, held, candidate, campaign, flow, shares };
}
