import React, { useCallback, useEffect, useRef } from 'react';

const LINK_DISTANCE = 165;
const MOUSE_RADIUS = 185;
const NODE_DENSITY = 10000;
const GLYPH_DENSITY = 42000;
const MIN_NODE_COUNT = 62;
const MAX_NODE_SPEED = 1.7;
const MAX_GLYPH_SPEED = 1.15;

const DARK_NODE_COLORS = ['#67e8f9', '#22d3ee', '#34d399', '#60a5fa', '#93c5fd'];
const LIGHT_NODE_COLORS = ['#1d4ed8', '#0f766e', '#0369a1', '#4338ca', '#0f172a'];
const GLYPHS = ['</>', '{}', 'NET', 'SEC', 'SSH', 'API', 'DB', '[]'];

class FloatingNode {
  constructor(width, height, colors) {
    this.colors = colors;
    this.reset(width, height);
  }

  reset(width, height) {
    this.x = Math.random() * width;
    this.y = Math.random() * height;
    this.vx = (Math.random() - 0.5) * 1.25;
    this.vy = (Math.random() - 0.5) * 1.25;
    this.baseRadius = Math.random() * 2.7 + 1.3;
    this.radius = this.baseRadius;
    this.color = this.colors[Math.floor(Math.random() * this.colors.length)];
  }

  update(width, height, mouse) {
    if (mouse.active) {
      const dx = this.x - mouse.x;
      const dy = this.y - mouse.y;
      const distance = Math.hypot(dx, dy);

      if (distance < MOUSE_RADIUS) {
        const safeDistance = Math.max(distance, 0.001);
        const force = ((MOUSE_RADIUS - safeDistance) / MOUSE_RADIUS) ** 1.45;
        const scale = 0.6 + force * 1.5;

        this.vx += (dx / safeDistance) * force * scale;
        this.vy += (dy / safeDistance) * force * scale;
        this.radius = this.baseRadius + force * 2.7;
      } else {
        this.radius += (this.baseRadius - this.radius) * 0.2;
      }
    } else {
      this.radius += (this.baseRadius - this.radius) * 0.2;
    }

    this.vx *= 0.986;
    this.vy *= 0.986;

    this.vx = Math.max(-MAX_NODE_SPEED, Math.min(MAX_NODE_SPEED, this.vx));
    this.vy = Math.max(-MAX_NODE_SPEED, Math.min(MAX_NODE_SPEED, this.vy));

    if (Math.abs(this.vx) < 0.08) {
      this.vx += (Math.random() - 0.5) * 0.06;
    }

    if (Math.abs(this.vy) < 0.08) {
      this.vy += (Math.random() - 0.5) * 0.06;
    }

    this.x += this.vx;
    this.y += this.vy;

    if (this.x <= 0 || this.x >= width) {
      this.vx *= -1;
      this.x = Math.max(0, Math.min(width, this.x));
    }

    if (this.y <= 0 || this.y >= height) {
      this.vy *= -1;
      this.y = Math.max(0, Math.min(height, this.y));
    }
  }
}

class FloatingGlyph {
  constructor(width, height, isDarkMode) {
    this.isDarkMode = isDarkMode;
    this.reset(width, height);
  }

  reset(width, height) {
    this.x = Math.random() * width;
    this.y = Math.random() * height;
    this.vx = (Math.random() - 0.5) * 0.95;
    this.vy = (Math.random() - 0.5) * 0.95;
    this.fontSize = Math.random() * 7 + 12;
    this.text = GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
    this.alpha = Math.random() * 0.24 + 0.14;
    this.rotation = (Math.random() - 0.5) * 0.2;
  }

  update(width, height, mouse) {
    if (mouse.active) {
      const dx = this.x - mouse.x;
      const dy = this.y - mouse.y;
      const distance = Math.hypot(dx, dy);

      if (distance < MOUSE_RADIUS * 1.05) {
        const safeDistance = Math.max(distance, 0.001);
        const force = ((MOUSE_RADIUS * 1.05 - safeDistance) / (MOUSE_RADIUS * 1.05)) ** 1.35;
        this.vx += (dx / safeDistance) * force * 0.72;
        this.vy += (dy / safeDistance) * force * 0.72;
      }
    }

    this.vx *= 0.992;
    this.vy *= 0.992;

    this.vx = Math.max(-MAX_GLYPH_SPEED, Math.min(MAX_GLYPH_SPEED, this.vx));
    this.vy = Math.max(-MAX_GLYPH_SPEED, Math.min(MAX_GLYPH_SPEED, this.vy));

    this.x += this.vx;
    this.y += this.vy;

    if (this.x <= 0 || this.x >= width) {
      this.vx *= -1;
      this.x = Math.max(0, Math.min(width, this.x));
    }

    if (this.y <= 0 || this.y >= height) {
      this.vy *= -1;
      this.y = Math.max(0, Math.min(height, this.y));
    }
  }

  draw(ctx, isDarkMode) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);
    ctx.font = `${this.fontSize}px ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = isDarkMode
      ? `rgba(226, 232, 240, ${this.alpha})`
      : `rgba(15, 23, 42, ${this.alpha})`;
    ctx.fillText(this.text, 0, 0);
    ctx.restore();
  }
}

const createNodes = (width, height, colors) => {
  const count = Math.max(MIN_NODE_COUNT, Math.floor((width * height) / NODE_DENSITY));
  return Array.from({ length: count }, () => new FloatingNode(width, height, colors));
};

const createGlyphs = (width, height, isDarkMode) => {
  const count = Math.max(18, Math.floor((width * height) / GLYPH_DENSITY));
  return Array.from({ length: count }, () => new FloatingGlyph(width, height, isDarkMode));
};

const MouseGrains = ({ isDarkMode = false }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const nodesRef = useRef([]);
  const glyphsRef = useRef([]);
  const animationRef = useRef(null);
  const mouseRef = useRef({ x: 0, y: 0, active: false });

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const width = container.offsetWidth;
    const height = container.offsetHeight;

    canvas.width = width;
    canvas.height = height;

    const colors = isDarkMode ? DARK_NODE_COLORS : LIGHT_NODE_COLORS;
    nodesRef.current = createNodes(width, height, colors);
    glyphsRef.current = createGlyphs(width, height, isDarkMode);
  }, [isDarkMode]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    resize();
    window.addEventListener('resize', resize);

    const handlePointerMove = (event) => {
      const rect = container.getBoundingClientRect();

      if (
        event.clientX < rect.left
        || event.clientX > rect.right
        || event.clientY < rect.top
        || event.clientY > rect.bottom
      ) {
        mouseRef.current.active = false;
        return;
      }

      mouseRef.current = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
        active: true,
      };
    };

    const handlePointerLeave = () => {
      mouseRef.current.active = false;
    };

    const drawLinks = (nodes) => {
      const darkModeBase = isDarkMode ? '255, 255, 255' : '15, 23, 42';
      const lineStrength = isDarkMode ? 0.36 : 0.24;

      for (let i = 0; i < nodes.length; i += 1) {
        for (let j = i + 1; j < nodes.length; j += 1) {
          const a = nodes[i];
          const b = nodes[j];
          const distance = Math.hypot(a.x - b.x, a.y - b.y);

          if (distance > LINK_DISTANCE) continue;

          let alpha = (1 - distance / LINK_DISTANCE) * lineStrength;

          if (mouseRef.current.active) {
            const mouseDistanceA = Math.hypot(a.x - mouseRef.current.x, a.y - mouseRef.current.y);
            const mouseDistanceB = Math.hypot(b.x - mouseRef.current.x, b.y - mouseRef.current.y);
            const closestToMouse = Math.min(mouseDistanceA, mouseDistanceB);

            if (closestToMouse < MOUSE_RADIUS) {
              alpha *= Math.max(0, (closestToMouse - 20) / MOUSE_RADIUS);
            }
          }

          if (alpha <= 0.01) continue;

          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.strokeStyle = `rgba(${darkModeBase}, ${alpha.toFixed(3)})`;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    };

    const drawNodes = (nodes) => {
      nodes.forEach((node) => {
        const glow = ctx.createRadialGradient(node.x, node.y, 0, node.x, node.y, node.radius * 3.2);
        glow.addColorStop(0, node.color);
        glow.addColorStop(1, 'rgba(17, 24, 39, 0)');

        ctx.beginPath();
        ctx.fillStyle = glow;
        ctx.arc(node.x, node.y, node.radius * 2.9, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.fillStyle = node.color;
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fill();
      });
    };

    const animate = () => {
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      const nodes = nodesRef.current;
      const glyphs = glyphsRef.current;

      nodes.forEach((node) => node.update(width, height, mouseRef.current));
      glyphs.forEach((glyph) => glyph.update(width, height, mouseRef.current));

      drawLinks(nodes);
      drawNodes(nodes);
      glyphs.forEach((glyph) => glyph.draw(ctx, isDarkMode));

      if (mouseRef.current.active) {
        const hole = ctx.createRadialGradient(
          mouseRef.current.x,
          mouseRef.current.y,
          0,
          mouseRef.current.x,
          mouseRef.current.y,
          MOUSE_RADIUS,
        );

        hole.addColorStop(0, isDarkMode ? 'rgba(2, 6, 23, 0.24)' : 'rgba(255, 255, 255, 0.3)');
        hole.addColorStop(0.45, isDarkMode ? 'rgba(2, 6, 23, 0.1)' : 'rgba(255, 255, 255, 0.12)');
        hole.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.beginPath();
        ctx.fillStyle = hole;
        ctx.arc(mouseRef.current.x, mouseRef.current.y, MOUSE_RADIUS, 0, Math.PI * 2);
        ctx.fill();
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    window.addEventListener('pointermove', handlePointerMove);
    container.addEventListener('pointerleave', handlePointerLeave);
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('pointerleave', handlePointerLeave);

      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isDarkMode, resize]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
        zIndex: 0,
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          opacity: 0.98,
        }}
      />
    </div>
  );
};

export default MouseGrains;
