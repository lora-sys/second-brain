// Canvas-based graph renderer (v0.6.4).
// Renders a graph from buildGraph() output to a 2D canvas with
// interactive node drag, hover highlight, and click-to-navigate.

import { GraphForce } from './graphforce.mjs';

const COLORS = {
  person: '#ea580c',
  task: '#0284c7',
  project: '#7c3aed',
  link: '#059669',
};

export class GraphView {
  constructor(canvas, graph) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.graph = graph;
    this.hover = null;
    this.dragging = null;
    this.dragOffset = { x: 0, y: 0 };
    this.raf = null;
    this.onNodeClick = null; // callback (entity) => void
    this.scale = 1;
    this.panX = 0;
    this.panY = 0;
    this.panning = false;
    this.panStart = { x: 0, y: 0, panX: 0, panY: 0 };
    this._setup();
  }

  _setup() {
    // Set canvas size to container size with devicePixelRatio
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.width = rect.width;
    this.height = rect.height;
    // Build force layout
    const nodes = this.graph.nodes.map(n => ({
      id: n.id,
      label: this.graph.titleOf(n),
      type: n._type,
    }));
    const edges = this.graph.edges.map(e => ({ from: e.from, to: e.to }));
    this.force = new GraphForce(nodes, edges, this.width, this.height);
    this.force.initialLayout(300);
    // Mouse events
    this.canvas.addEventListener('wheel', (e) => this._onWheel(e), { passive: false });
    this.canvas.addEventListener('mousemove', (e) => this._onMouseMove(e));
    this.canvas.addEventListener('mousedown', (e) => this._onMouseDown(e));
    this.canvas.addEventListener('mouseup', (e) => this._onMouseUp(e));
    this.canvas.addEventListener('mouseleave', () => { this.hover = null; this._render(); });
    this.canvas.addEventListener('click', (e) => this._onClick(e));
    // Resize observer
    if (window.ResizeObserver) {
      this.ro = new ResizeObserver(() => this._resize());
      this.ro.observe(this.canvas);
    }
    this._start();
  }

  _resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);
    this.width = rect.width;
    this.height = rect.height;
    this.force.setSize(this.width, this.height);
    this._render();
  }

  _onWheel(e) {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const newScale = Math.max(0.2, Math.min(3, this.scale * factor));
    this.panX = x - (x - this.panX) * (newScale / this.scale);
    this.panY = y - (y - this.panY) * (newScale / this.scale);
    this.scale = newScale;
    this._render();
  }

  _start() {
    if (this.raf) return;
    const tick = () => {
      this.force.tick();
      this._render();
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  stop() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this.raf = null;
    if (this.force) this.force.stop();
    if (this.ro) this.ro.disconnect();
  }

  _getMousePos(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    return {
      x: (x - this.panX) / this.scale,
      y: (y - this.panY) / this.scale,
    };
  }

  _onMouseMove(e) {
    if (this.panning) {
      const dx = e.clientX - this.panStart.x;
      const dy = e.clientY - this.panStart.y;
      this.panX = this.panStart.panX + dx;
      this.panY = this.panStart.panY + dy;
      this._render();
      return;
    }
    const { x, y } = this._getMousePos(e);
    if (this.dragging) {
      this.force.moveDrag(this.dragging, x - this.dragOffset.x, y - this.dragOffset.y);
      return;
    }
    const node = this.force.pickAt(x, y);
    const newHover = node ? node.id : null;
    if (newHover !== this.hover) {
      this.hover = newHover;
      this.canvas.style.cursor = node ? 'pointer' : 'default';
      this._render();
    }
  }

  _onMouseDown(e) {
    const { x, y } = this._getMousePos(e);
    const node = this.force.pickAt(x, y);
    if (node) {
      this.dragging = node.id;
      this.dragOffset = { x: x - node.x, y: y - node.y };
      this.force.startDrag(node.id);
    } else {
      this.panning = true;
      this.panStart = { x: e.clientX, y: e.clientY, panX: this.panX, panY: this.panY };
    }
  }

  _onMouseUp(e) {
    if (this.dragging) {
      this.force.endDrag();
      this.dragging = null;
    }
    if (this.panning) {
      this.panning = false;
    }
  }

  _onClick(e) {
    const { x, y } = this._getMousePos(e);
    const node = this.force.pickAt(x, y);
    if (node && this.onNodeClick) {
      this.onNodeClick(node.id);
    }
  }

  _render() {
    const ctx = this.ctx;
    const w = this.width, h = this.height;
    if (!w || !h) return;
    // Clear
    ctx.fillStyle = '#fbfaf6';
    ctx.fillRect(0, 0, w, h);
    // Apply zoom/pan transform
    ctx.save();
    ctx.translate(this.panX, this.panY);
    ctx.scale(this.scale, this.scale);
    // Edges
    ctx.lineWidth = 1;
    for (const e of this.force.edges) {
      const a = this.force.nodes.find(n => n.id === e.from);
      const b = this.force.nodes.find(n => n.id === e.to);
      if (!a || !b) continue;
      // Highlight edges connected to hovered node
      const isHovered = this.hover && (e.from === this.hover || e.to === this.hover);
      ctx.strokeStyle = isHovered ? 'rgba(124,58,237,0.6)' : 'rgba(120,120,120,0.3)';
      ctx.lineWidth = isHovered ? 2 : 1;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
      if (isHovered) {
        const mx = (a.x + b.x) / 2;
        const my = (a.y + b.y) / 2;
        ctx.fillStyle = '#7c3aed';
        ctx.font = 'bold 9px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('●', mx, my);
      }
    }
    // Nodes
    for (const n of this.force.nodes) {
      const r = 6 + Math.min(8, n.degree * 1.5);
      const color = COLORS[n.type] || '#999';
      const isHovered = this.hover === n.id;
      // Glow ring on hover
      if (isHovered) {
        ctx.fillStyle = color + '33';
        ctx.beginPath();
        ctx.arc(n.x, n.y, r + 8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      ctx.fill();
      // Label
      if (isHovered || n.degree > 0) {
        ctx.fillStyle = '#222';
        ctx.font = '11px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        const label = n.label.length > 16 ? n.label.slice(0, 14) + '…' : n.label;
        ctx.fillText(label, n.x, n.y + r + 4);
      }
    }
    ctx.restore();
    // Legend
    ctx.font = '11px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    let ly = 12;
    for (const [type, color] of Object.entries(COLORS)) {
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(16, ly, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#555';
      const labels = { person: '人物', task: '任务', project: '项目', link: '链接' };
      ctx.fillText(labels[type] || type, 26, ly);
      ly += 16;
    }
  }
}
