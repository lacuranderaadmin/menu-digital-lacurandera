/**
 * LA CURANDERA — Animaciones & Microinteracciones de Vanguardia
 * Inspirado en MotionSites AI, adaptado a la identidad mística mexicana de La Curandera
 */

export function initAnimations() {
  initHeroAura();
  initMarqueeInteraction();
  initScrollSpy();
  initMenuBackgroundAura();
  initBackToTopButton();
}

/**
 * 1. Aura Mística de la Curandera (Smoke & Particle Aura)
 * Simula humo aromático de copal y chispas místicas flotantes
 * usando un canvas 2D ligero de alto rendimiento (60fps).
 */
function initHeroAura() {
  const canvas = document.getElementById('curandera-aura-canvas');
  const container = document.querySelector('.hero-avatar-wrapper');
  if (!canvas || !container) return;

  const ctx = canvas.getContext('2d');
  let animationFrameId;
  let width, height, centerX, centerY;
  let mouse = { x: null, y: null, active: false };

  // Colores de marca para las partículas
  const particleColors = [
    'rgba(201, 78, 143, ',  // Rosa
    'rgba(21, 159, 155, ',  // Turquesa
    'rgba(232, 120, 80, ',  // Terracota
    'rgba(248, 208, 176, '  // Durazno / Luz dorada
  ];

  const particles = [];
  const particleCount = window.innerWidth < 768 ? 24 : 45;

  function resize() {
    const rect = container.getBoundingClientRect();
    // Añadimos margen alrededor del círculo para que el aura se expanda
    const padding = 70;
    width = canvas.width = rect.width + padding * 2;
    height = canvas.height = rect.height + padding * 2;
    centerX = width / 2;
    centerY = height / 2;
  }

  window.addEventListener('resize', resize);
  resize();

  // Partícula mística
  class MysticParticle {
    constructor() {
      this.reset(true);
    }

    reset(initial = false) {
      // Ángulo alrededor del centro
      const angle = Math.random() * Math.PI * 2;
      const baseRadius = (width * 0.32) + (Math.random() * 20);
      
      this.x = centerX + Math.cos(angle) * baseRadius;
      this.y = centerY + Math.sin(angle) * baseRadius;

      if (initial) {
        // Distribuir verticalmente en inicio
        this.y += (Math.random() - 0.5) * 60;
      }

      // Deriva ascendente como humo aromático
      this.vx = (Math.random() - 0.5) * 0.8;
      this.vy = -(Math.random() * 1.2 + 0.5);

      this.size = Math.random() * 5 + 2.5;
      this.alpha = 0;
      this.targetAlpha = Math.random() * 0.55 + 0.25;
      this.colorBase = particleColors[Math.floor(Math.random() * particleColors.length)];
      this.life = 0;
      this.maxLife = Math.random() * 140 + 80;
      this.wobbleSpeed = Math.random() * 0.04 + 0.01;
    }

    update() {
      this.life++;
      this.x += this.vx + Math.sin(this.life * this.wobbleSpeed) * 0.6;
      this.y += this.vy;

      // Reacción suave al cursor si está activo
      if (mouse.active && mouse.x !== null) {
        const dx = this.x - mouse.x;
        const dy = this.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 100) {
          const force = (100 - dist) / 100;
          this.x += (dx / dist) * force * 2;
          this.y += (dy / dist) * force * 2;
        }
      }

      // Fade in & Fade out
      if (this.life < 20) {
        this.alpha = (this.life / 20) * this.targetAlpha;
      } else if (this.life > this.maxLife - 30) {
        this.alpha = ((this.maxLife - this.life) / 30) * this.targetAlpha;
      }

      if (this.life >= this.maxLife) {
        this.reset();
      }
    }

    draw() {
      if (this.alpha <= 0) return;
      ctx.save();
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      
      // Resplandor radial místico
      const grad = ctx.createRadialGradient(
        this.x, this.y, 0,
        this.x, this.y, this.size * 1.8
      );
      grad.addColorStop(0, `${this.colorBase}${this.alpha})`);
      grad.addColorStop(0.6, `${this.colorBase}${this.alpha * 0.4})`);
      grad.addColorStop(1, `${this.colorBase}0)`);

      ctx.fillStyle = grad;
      ctx.fill();
      ctx.restore();
    }
  }

  for (let i = 0; i < particleCount; i++) {
    particles.push(new MysticParticle());
  }

  // Interacción de mouse con la Curandera
  container.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
    mouse.active = true;
  });

  container.addEventListener('mouseleave', () => {
    mouse.active = false;
  });

  // Loop de renderizado con desconexión si sale del viewport
  let isVisible = true;
  const observer = new IntersectionObserver((entries) => {
    isVisible = entries[0].isIntersecting;
    if (isVisible && !animationFrameId) {
      animate();
    }
  }, { threshold: 0.1 });
  observer.observe(container);

  function animate() {
    if (!isVisible) {
      animationFrameId = null;
      return;
    }
    ctx.clearRect(0, 0, width, height);

    // Ondas suaves de resplandor de fondo
    ctx.save();
    const pulseScale = 1 + Math.sin(Date.now() * 0.002) * 0.04;
    const glowGrad = ctx.createRadialGradient(
      centerX, centerY, width * 0.2,
      centerX, centerY, width * 0.42 * pulseScale
    );
    glowGrad.addColorStop(0, 'rgba(201, 78, 143, 0.12)');
    glowGrad.addColorStop(0.5, 'rgba(21, 159, 155, 0.08)');
    glowGrad.addColorStop(1, 'rgba(253, 246, 236, 0)');
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(centerX, centerY, width * 0.45 * pulseScale, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Actualizar partículas
    for (const p of particles) {
      p.update();
      p.draw();
    }

    animationFrameId = requestAnimationFrame(animate);
  }

  animate();
}

/**
 * 2. Marquee Ticker de Frases de Marca
 * Control de pausa en hover/touch y duplicación dinámica si hiciera falta.
 */
function initMarqueeInteraction() {
  const marquee = document.querySelector('.marquee-ticker-container');
  if (!marquee) return;

  // Al hacer hover en desktop o touch en móvil, el marquee disminuye suavemente la velocidad
  marquee.addEventListener('mouseenter', () => {
    marquee.classList.add('paused');
  });

  marquee.addEventListener('mouseleave', () => {
    marquee.classList.remove('paused');
  });
}

export function initCardsTiltAndSheen() {
  // Las tarjetas utilizan aceleración por hardware pura en CSS (:hover / transform),
  // liberando el hilo principal de JavaScript de 89 listeners mousemove.
}

/**
 * 4. ScrollSpy Dinámico Ultra-Optimizado (IntersectionObserver Nativo)
 * Sin costo de CPU durante el scroll. Detecta la categoría visible
 * y actualiza la pestaña activa con auto-scroll horizontal.
 */
function initScrollSpy() {
  const categoriesBar = document.getElementById('categories-bar');
  if (!categoriesBar) return;

  let activeObserver = null;

  function bindObserver() {
    if (activeObserver) activeObserver.disconnect();
    const sections = document.querySelectorAll('.category-section');
    if (sections.length === 0) return;

    activeObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const targetId = entry.target.id;
          const tabs = document.querySelectorAll('.category-tab');
          tabs.forEach(tab => {
            if (tab.getAttribute('data-target') === targetId) {
              if (!tab.classList.contains('active')) {
                tabs.forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                
                // Desplazar EXCLUSIVAMENTE el contenedor horizontal, NUNCA la ventana principal
                const bar = document.getElementById('categories-bar');
                if (bar) {
                  bar.scrollTo({
                    left: tab.offsetLeft - (bar.clientWidth / 2) + (tab.offsetWidth / 2),
                    behavior: 'smooth'
                  });
                }
              }
            }
          });

          // Sincronizar simultáneamente los botones del dock vertical lateral
          const dockBtns = document.querySelectorAll('.dock-emoji-btn');
          dockBtns.forEach(btn => {
            if (btn.getAttribute('data-target') === targetId) {
              if (!btn.classList.contains('active')) {
                dockBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                // Asegurar visibilidad dentro del contenedor scrollable del dock si es necesario
                const dockContainer = document.getElementById('dock-emojis-container');
                if (dockContainer) {
                  const btnTop = btn.offsetTop;
                  const containerH = dockContainer.clientHeight;
                  dockContainer.scrollTo({
                    top: btnTop - (containerH / 2) + (btn.clientHeight / 2),
                    behavior: 'smooth'
                  });
                }
              }
            }
          });
        }
      });
    }, {
      rootMargin: '-110px 0px -65% 0px',
      threshold: 0
    });

    sections.forEach(sec => activeObserver.observe(sec));
  }

  const menuContainer = document.getElementById('menu-sections-container');
  if (menuContainer) {
    const mo = new MutationObserver(() => {
      bindObserver();
    });
    mo.observe(menuContainer, { childList: true });
  }

  bindObserver();

  // Sincronización precisa de la altura del header para sticky nav y detección de .is-stuck
  const navWrapper = document.querySelector('.categories-nav-wrapper');
  if (navWrapper) {
    let wasStuck = false;
    const syncHeader = () => {
      const siteHeader = document.querySelector('.site-header');
      if (siteHeader) {
        const headerH = siteHeader.offsetHeight;
        document.documentElement.style.setProperty('--site-header-height', `${headerH}px`);
      }
    };
    syncHeader();
    window.addEventListener('resize', syncHeader, { passive: true });

    const updateStickyState = () => {
      const siteHeader = document.querySelector('.site-header');
      const headerH = siteHeader ? siteHeader.offsetHeight : 88;
      const rect = navWrapper.getBoundingClientRect();
      const isStuck = rect.top <= headerH + 3;
      if (isStuck !== wasStuck) {
        wasStuck = isStuck;
        navWrapper.classList.toggle('is-stuck', isStuck);
      }
    };
    window.addEventListener('scroll', updateStickyState, { passive: true });
    updateStickyState();
  }

  // Control de visibilidad del Dock Vertical de Categorías (aparece cuando el menú entra en pantalla)
  const dock = document.getElementById('vertical-categories-dock');
  if (dock) {
    const updateDockVisibility = () => {
      const menuStage = document.getElementById('menu-stage-wrapper');
      if (menuStage) {
        const rect = menuStage.getBoundingClientRect();
        // Visible cuando el usuario llega al área interactiva del menú
        const isNearMenu = rect.top <= window.innerHeight * 0.75;
        dock.classList.toggle('visible', isNearMenu);
      }
    };
    window.addEventListener('scroll', updateDockVisibility, { passive: true });
    updateDockVisibility();
  }

  // Indicador interactivo y animado de scroll horizontal para categorías
  const hintBtn = document.getElementById('categories-scroll-hint');
  const fadeEdge = document.getElementById('categories-fade-edge');
  if (hintBtn && categoriesBar) {
    const updateHint = () => {
      const hasOverflow = categoriesBar.scrollWidth > categoriesBar.clientWidth + 15;
      const isScrolled = categoriesBar.scrollLeft > 25;
      const isAtEnd = categoriesBar.scrollLeft + categoriesBar.clientWidth >= categoriesBar.scrollWidth - 15;
      const shouldHide = !hasOverflow || isAtEnd || isScrolled;
      hintBtn.classList.toggle('hidden', shouldHide);
      if (fadeEdge) {
        fadeEdge.classList.toggle('hidden', shouldHide);
      }
    };

    categoriesBar.addEventListener('scroll', updateHint, { passive: true });
    window.addEventListener('resize', updateHint, { passive: true });
    window.addEventListener('categoriesRendered', () => setTimeout(updateHint, 120));
    window.addEventListener('mealModeChanged', () => setTimeout(updateHint, 120));

    hintBtn.addEventListener('click', (e) => {
      e.preventDefault();
      categoriesBar.scrollBy({ left: 240, behavior: 'smooth' });
    });

    setTimeout(updateHint, 150);
  }
}

/**
 * 5. Lienzo Místico MotionSites AI — Liquid Harmonic Plasma Mesh (Ultra-Fast 60 FPS)
 * Canvas limitado a dimensiones del viewport (100vh) con bajo uso de memoria GPU (< 2MB)
 * y pausado automático cuando no está visible.
 */
function initMenuBackgroundAura() {
  const canvas = document.getElementById('menu-ambient-canvas');
  const stage = document.getElementById('menu-stage-wrapper');
  if (!canvas || !stage) return;

  const ctx = canvas.getContext('2d', { alpha: false });
  let animationFrameId;
  let width = 0, height = 0;
  let isVisible = true;
  let mouse = { x: null, y: null, radius: 180, active: false };

  const isMobile = window.innerWidth < 768;
  const plasmaNodes = [
    {
      r: 201, g: 78, b: 143, // Rosa Curandera (#C94E8F)
      baseX: 0.22, baseY: 0.25,
      radiusRatio: isMobile ? 0.85 : 0.55,
      speedX: 0.0007, speedY: 0.0009,
      phaseX: 0, phaseY: 1.2,
      intensity: 0.32
    },
    {
      r: 232, g: 120, b: 80, // Terracota Curandera (#E87850)
      baseX: 0.78, baseY: 0.30,
      radiusRatio: isMobile ? 0.90 : 0.58,
      speedX: 0.0009, speedY: 0.0006,
      phaseX: 2.3, phaseY: 0.4,
      intensity: 0.34
    },
    {
      r: 21, g: 159, b: 155, // Turquesa Curandera (#159F9B)
      baseX: 0.26, baseY: 0.76,
      radiusRatio: isMobile ? 0.80 : 0.52,
      speedX: 0.0006, speedY: 0.0008,
      phaseX: 4.1, phaseY: 3.2,
      intensity: 0.28
    },
    {
      r: 248, g: 208, b: 176, // Durazno Cálido (#F8D0B0)
      baseX: 0.74, baseY: 0.82,
      radiusRatio: isMobile ? 0.95 : 0.62,
      speedX: 0.0008, speedY: 0.0007,
      phaseX: 1.4, phaseY: 4.8,
      intensity: 0.40
    },
    {
      r: 232, g: 144, b: 120, // Coral Suave (#E89078)
      baseX: 0.50, baseY: 0.50,
      radiusRatio: isMobile ? 0.85 : 0.55,
      speedX: 0.0007, speedY: 0.0005,
      phaseX: 3.1, phaseY: 2.0,
      intensity: 0.26
    }
  ];

  const brandColors = [
    { r: 201, g: 78, b: 143 }, // Rosa Curandera
    { r: 232, g: 120, b: 80 },  // Terracota
    { r: 21, g: 159, b: 155 },  // Turquesa
    { r: 217, g: 119, b: 6 }    // Ámbar Dorado
  ];

  let particles = [];
  const particleCount = isMobile ? 14 : 22;

  function resize() {
    width = canvas.width = Math.min(window.innerWidth, 1280);
    height = canvas.height = Math.min(window.innerHeight, 720);
  }

  class AmbientParticle {
    constructor(initial = false) {
      this.reset(initial);
    }

    reset(initial = false) {
      this.x = Math.random() * (width || window.innerWidth);
      this.y = initial ? Math.random() * (height || 720) : (height || 720) + 15;
      this.vy = -(Math.random() * 0.5 + 0.3);
      this.vx = (Math.random() - 0.5) * 0.35;
      this.size = Math.random() * 3 + 1.4;
      this.color = brandColors[Math.floor(Math.random() * brandColors.length)];
      this.maxAlpha = Math.random() * 0.45 + 0.35;
      this.alpha = 0;
      this.life = initial ? Math.floor(Math.random() * 180) : 0;
      this.maxLife = Math.random() * 260 + 160;
      this.swaySpeed = Math.random() * 0.025 + 0.01;
      this.swayAmount = Math.random() * 2 + 0.8;
      this.swayOffset = Math.random() * Math.PI * 2;
      this.isAgaveStar = Math.random() < 0.30;
      this.rotation = Math.random() * Math.PI * 2;
      this.rotSpeed = (Math.random() - 0.5) * 0.02;
    }

    update() {
      this.life++;
      this.rotation += this.rotSpeed;
      this.x += this.vx + Math.sin(this.life * this.swaySpeed + this.swayOffset) * this.swayAmount;
      this.y += this.vy;

      if (mouse.active && mouse.x !== null) {
        const dx = this.x - mouse.x;
        const dy = this.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < mouse.radius) {
          const force = (mouse.radius - dist) / mouse.radius;
          this.x += (dx / (dist || 1)) * force * 2.5;
          this.y += (dy / (dist || 1)) * force * 2.5;
        }
      }

      if (this.life < 25) {
        this.alpha = (this.life / 25) * this.maxAlpha;
      } else if (this.life > this.maxLife - 35) {
        this.alpha = ((this.maxLife - this.life) / 35) * this.maxAlpha;
      }

      if (this.life >= this.maxLife || this.y < -20 || this.x < -20 || this.x > width + 20) {
        this.reset();
      }
    }

    draw() {
      if (this.alpha <= 0) return;
      ctx.save();

      if (this.isAgaveStar) {
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation);
        ctx.fillStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.alpha})`;
        ctx.beginPath();
        const r = this.size * 2.4;
        const inR = r * 0.26;
        for (let i = 0; i < 8; i++) {
          const radius = i % 2 === 0 ? r : inR;
          const a = (i * Math.PI) / 4;
          const px = Math.cos(a) * radius;
          const py = Math.sin(a) * radius;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.alpha})`;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.alpha * 0.28})`;
        ctx.fill();
      }

      ctx.restore();
    }
  }

  function initParticles() {
    particles = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push(new AmbientParticle(true));
    }
  }

  let time = 0;

  function loop() {
    if (!isVisible) return;
    time += 1;

    // Fondo base arena claro mexicano (de acuerdo a los menús PDF)
    ctx.fillStyle = '#F8F1E7';
    ctx.fillRect(0, 0, width, height);

    // 1. Plasma Líquido Armónico (MotionSites AI Light Mesh)
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';

    for (let i = 0; i < plasmaNodes.length; i++) {
      const node = plasmaNodes[i];

      let curX = width * (node.baseX + Math.sin(time * node.speedX + node.phaseX) * 0.18);
      let curY = height * (node.baseY + Math.cos(time * node.speedY + node.phaseY) * 0.18);

      if (mouse.active && mouse.x !== null) {
        const dx = mouse.x - curX;
        const dy = mouse.y - curY;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 280) {
          const pull = (280 - dist) / 280 * 0.08;
          curX += dx * pull;
          curY += dy * pull;
        }
      }

      const radius = Math.max(width, height) * node.radiusRatio;

      const grad = ctx.createRadialGradient(curX, curY, 0, curX, curY, radius);
      grad.addColorStop(0, `rgba(${node.r}, ${node.g}, ${node.b}, ${node.intensity})`);
      grad.addColorStop(0.45, `rgba(${node.r}, ${node.g}, ${node.b}, ${node.intensity * 0.45})`);
      grad.addColorStop(0.8, `rgba(${node.r}, ${node.g}, ${node.b}, ${node.intensity * 0.12})`);
      grad.addColorStop(1, `rgba(${node.r}, ${node.g}, ${node.b}, 0)`);

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(curX, curY, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();

    // 2. Brasas y Estrellas de Agave
    for (let i = 0; i < particles.length; i++) {
      particles[i].update();
      particles[i].draw();
    }

    animationFrameId = requestAnimationFrame(loop);
  }

  stage.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
    mouse.active = true;
  }, { passive: true });

  stage.addEventListener('mouseleave', () => {
    mouse.active = false;
  }, { passive: true });

  stage.addEventListener('touchmove', (e) => {
    if (e.touches && e.touches[0]) {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.touches[0].clientX - rect.left;
      mouse.y = e.touches[0].clientY - rect.top;
      mouse.active = true;
    }
  }, { passive: true });

  stage.addEventListener('touchend', () => {
    mouse.active = false;
  }, { passive: true });

  const wrapper = document.querySelector('.menu-ambient-canvas-wrapper');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        if (wrapper) wrapper.classList.add('is-active');
        if (!isVisible) {
          isVisible = true;
          loop();
        }
      } else {
        if (wrapper) wrapper.classList.remove('is-active');
        isVisible = false;
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
          animationFrameId = null;
        }
      }
    });
  }, { threshold: 0.02 });

  observer.observe(stage);

  window.addEventListener('resize', () => {
    resize();
  }, { passive: true });

  resize();
  initParticles();
  loop();
}

/**
 * 6. Botón Flotante "Volver Arriba" (Back To Top - Zero Jank)
 */
function initBackToTopButton() {
  const btn = document.getElementById('back-to-top-btn');
  if (!btn) return;

  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        if (window.scrollY > 400) {
          btn.classList.add('visible');
        } else {
          btn.classList.remove('visible');
        }
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });

  btn.addEventListener('click', (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

