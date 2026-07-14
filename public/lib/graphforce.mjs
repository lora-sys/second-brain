// Force-directed graph layout (v0.6.4).
// Vanilla JS implementation of Fruchterman-Reingold-style simulation.
// Renders to a 2D canvas.
//
// Forces:
// - Repulsion between all node pairs (Coulomb-like)
// - Attraction along edges (spring-like)
// - Centering force to keep graph from drifting off-screen
//
// Each tick advances by 1/60th of a second. We run 300 iterations on
// initial layout, then animate the user interaction.

const STIFFNESS = 0.05;   // spring constant
const REPULSION = 8000;   // coulomb constant
const DAMPING = 0.85;     // velocity decay
const CENTER_PULL = 0.01; // toward center
const MAX_VEL = 8;        // cap to prevent explosions

export class GraphForce {
  constructor(nodes, edges, width, height) {
    this.nodes = nodes.map(n => ({
      id: n.id,
      label: n.label,
      type: n.type,
      x: width / 2 + (Math.random() - 0.5) * width * 0.6,
      y: height / 2 + (Math.random() - 0.5) * height * 0.6,
      vx: 0, vy: 0,
      degree: 0,
    }));
    this.edges = edges.map(e => ({ from: e.from, to: e.to }));
    // Compute degrees
    for (const e of this.edges) {
      const n1 = this.nodes.find(n => n.id === e.from);
      const n2 = this.nodes.find(n => n.id === e.to);
      if (n1) n1.degree++;
      if (n2) n2.degree++;
    }
    this.width = width;
    this.height = height;
    this.hover = null;     // node id under mouse
    this.drag = null;      // node being dragged
    this.tickCount = 0;
    this.stopped = false;
  }

  // Advance one tick (returns true if anything moved significantly)
  tick() {
    if (this.stopped) return false;
    const n = this.nodes.length;
    if (n === 0) return false;
    // Reset accumulated forces
    const fx = new Float64Array(n);
    const fy = new Float64Array(n);
    // Repulsion (O(n^2) — fine for v0.6 vault sizes)
    for (let i = 0; i < n; i++) {
      const a = this.nodes[i];
      for (let j = i + 1; j < n; j++) {
        const b = this.nodes[j];
        let dx = a.x - b.x;
        let dy = a.y - b.y;
        let d2 = dx * dx + dy * dy;
        if (d2 < 0.01) d2 = 0.01; // avoid div0
        const d = Math.sqrt(d2);
        const f = REPULSION / d2;
        const ux = dx / d, uy = dy / d;
        fx[i] += ux * f; fy[i] += uy * f;
        fx[j] -= ux * f; fy[j] -= uy * f;
      }
    }
    // Attraction (springs)
    for (const e of this.edges) {
      const a = this.nodes.find(x => x.id === e.from);
      const b = this.nodes.find(x => x.id === e.to);
      if (!a || !b) continue;
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.sqrt(dx * dx + dy * dy) || 0.01;
      const f = STIFFNESS * (d - 80); // ideal edge length = 80
      const ux = dx / d, uy = dy / d;
      const ia = this.nodes.indexOf(a);
      const ib = this.nodes.indexOf(b);
      fx[ia] += ux * f; fy[ia] += uy * f;
      fx[ib] -= ux * f; fy[ib] -= uy * f;
    }
    // Center pull
    for (let i = 0; i < n; i++) {
      fx[i] += (this.width / 2 - this.nodes[i].x) * CENTER_PULL;
      fy[i] += (this.height / 2 - this.nodes[i].y) * CENTER_PULL;
    }
    // Update velocities + positions
    let maxMove = 0;
    for (let i = 0; i < n; i++) {
      const node = this.nodes[i];
      if (this.drag === node.id) continue; // pinned
      node.vx = (node.vx + fx[i]) * DAMPING;
      node.vy = (node.vy + fy[i]) * DAMPING;
      // Cap velocity
      if (node.vx > MAX_VEL) node.vx = MAX_VEL;
      if (node.vx < -MAX_VEL) node.vx = -MAX_VEL;
      if (node.vy > MAX_VEL) node.vy = MAX_VEL;
      if (node.vy < -MAX_VEL) node.vy = -MAX_VEL;
      node.x += node.vx;
      node.y += node.vy;
      // Keep within bounds
      if (node.x < 20) { node.x = 20; node.vx = -node.vx * 0.5; }
      if (node.x > this.width - 20) { node.x = this.width - 20; node.vx = -node.vx * 0.5; }
      if (node.y < 20) { node.y = 20; node.vy = -node.vy * 0.5; }
      if (node.y > this.height - 20) { node.y = this.height - 20; node.vy = -node.vy * 0.5; }
      const m = Math.abs(node.vx) + Math.abs(node.vy);
      if (m > maxMove) maxMove = m;
    }
    this.tickCount++;
    return maxMove > 0.5;
  }

  // Run a number of initial layout ticks (no animation)
  initialLayout(iters = 300) {
    for (let i = 0; i < iters; i++) {
      if (!this.tick()) break;
    }
    // Settle: dampen
    for (const n of this.nodes) { n.vx = 0; n.vy = 0; }
  }

  // Convert mouse coordinates to graph coordinates
  pickAt(mx, my) {
    for (const n of this.nodes) {
      const dx = n.x - mx;
      const dy = n.y - my;
      if (dx * dx + dy * dy < 18 * 18) return n;
    }
    return null;
  }

  startDrag(nodeId) { this.drag = nodeId; }
  moveDrag(nodeId, x, y) {
    const n = this.nodes.find(nn => nn.id === nodeId);
    if (n) { n.x = x; n.y = y; n.vx = 0; n.vy = 0; }
  }
  endDrag() { this.drag = null; }
  stop() { this.stopped = true; }

  setSize(w, h) {
    this.width = w;
    this.height = h;
  }
}
