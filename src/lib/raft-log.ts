/* Log band content, §2.

   The shape is Homonoia's simulation output: five nodes, monotonic terms
   and indexes, no leader before a quorum of votes, commit never ahead of
   the leader's own log. Someone who knows Raft should be able to read a
   band and see an election in it — so the trace is produced by walking
   the states rather than by shuffling strings, and a wrong line here is
   a wrong line about the algorithm.

   Runs at build time. Deterministic: same seed, same trace, every build,
   which keeps the emitted HTML stable across deploys.

   ASCII `->`, not `→`. The subset in §5 stops at U+2193; an arrow would
   fall out of IBM Plex Mono to whatever the OS has, mid-band. */

const NODES = ['n1', 'n2', 'n3', 'n4', 'n5'] as const;
const QUORUM = 3;

// Real keys — the cluster this site is about is the site's own contents.
const KEYS = ['philoi', 'basis', 'enargeia', 'homonoia', 'lease', 'members'];

function mulberry32(seed: number) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const at = (n: number) => String(n).padStart(4, '0');

export function raftTrace(seed: number, count: number): string[] {
  const rand = mulberry32(seed);
  const int = (lo: number, hi: number) => lo + Math.floor(rand() * (hi - lo + 1));
  const pick = <T>(xs: readonly T[]): T => xs[int(0, xs.length - 1)]!;

  const out: string[] = [];

  let term = int(3, 12);
  let log = int(96, 480); // last index in the leader's log
  let commit = log;
  let leader: string | null = null;
  let down: string | null = null;

  const reachable = () => NODES.filter((n) => n !== down);

  while (out.length < count) {
    if (!leader) {
      const prev = term;
      term += 1;

      const cand = pick(reachable());
      const peers = NODES.filter((n) => n !== cand);

      out.push(`${cand} timeout elapsed=${int(150, 300)}ms term=${prev}->${term}`);
      out.push(`${cand} state=candidate term=${term} votes=1/5`);
      for (const p of peers) {
        out.push(`${cand}->${p} requestvote term=${term} lastIdx=${at(log)} lastTerm=${prev}`);
      }

      let votes = 1;
      for (const p of peers) {
        if (p === down) {
          out.push(`${cand}->${p} requestvote dropped net=partition`);
          continue;
        }
        votes += 1;
        out.push(`${p}->${cand} vote granted term=${term}`);
        if (votes === QUORUM) {
          out.push(`${cand} state=leader term=${term} votes=${votes}/5`);
          // Raft §8: a fresh leader commits a no-op in its own term before
          // it can safely serve reads against entries it inherited.
          log += 1;
          out.push(`${cand} append idx=${at(log)} term=${term} entry=no-op`);
        }
      }

      leader = cand;

      if (down) {
        // The old leader comes back and finds the world has moved on.
        out.push(`net heal=${down} drop=0.00`);
        out.push(`${down} state=follower term=${term} stepdown`);
        down = null;
      }
      continue;
    }

    // ── Replication under a stable leader.
    const followers = NODES.filter((n) => n !== leader);
    const rounds = int(2, 4);

    for (let r = 0; r < rounds && out.length < count; r++) {
      log += 1;
      const key = pick(KEYS);
      out.push(`${leader} append k=${key} idx=${at(log)} term=${term} len=${int(24, 190)}`);

      let acks = 1;
      for (const f of followers) {
        if (acks >= QUORUM) break;

        if (rand() < 0.16) {
          // Log repair: the follower's tail disagrees, so it hands back a
          // hint and the leader backs the index up rather than decrementing
          // one at a time.
          const hint = log - int(3, 7);
          out.push(`${f}->${leader} append reject term=${term} prevIdx=${at(log - 1)} hint=${at(hint)}`);
          out.push(`${leader}->${f} appendentries term=${term} prevIdx=${at(hint)} len=${log - hint}`);
        } else {
          out.push(`${leader}->${f} appendentries term=${term} prevIdx=${at(log - 1)} len=1`);
        }

        acks += 1;
        out.push(`${f}->${leader} append ok matchIdx=${at(log)}`);
      }

      commit = log;
      out.push(`${leader} commit idx=${at(commit)} quorum=${acks}/5`);
      out.push(`${pick(followers)} state=follower applied=${at(commit)}`);
    }

    // ── Take the leader out. The next pass runs an election.
    out.push(`net isolate=${leader} drop=1.00`);
    out.push(`${pick(followers)} heartbeat missed leader=${leader} elapsed=${int(160, 340)}ms`);
    down = leader;
    leader = null;
  }

  return out.slice(0, count);
}
