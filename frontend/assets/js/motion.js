/* ============================================
   ToolsWala - Motion Animation Library
   Using Motion One (framework-free Framer Motion)
   ============================================ */

// Import Motion from CDN for browser usage
const motion = window.Motion || {};

// Animation presets
const animations = {
  // Fade animations
  fade: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: 0.3, ease: 'easeInOut' }
  },
  
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }
  },
  
  fadeInUp: {
    initial: { opacity: 0, y: 40 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: 40 },
    transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }
  },
  
  fadeInDown: {
    initial: { opacity: 0, y: -40 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }
  },
  
  fadeInLeft: {
    initial: { opacity: 0, x: -40 },
    animate: { opacity: 1, x: 0 },
    transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }
  },
  
  fadeInRight: {
    initial: { opacity: 0, x: 40 },
    animate: { opacity: 1, x: 0 },
    transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }
  },
  
  // Scale animations
  scaleIn: {
    initial: { opacity: 0, scale: 0.8 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.8 },
    transition: { duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }
  },
  
  scaleOut: {
    initial: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.8 },
    transition: { duration: 0.3, ease: 'easeInOut' }
  },
  
  // Slide animations
  slideUp: {
    initial: { y: '100%' },
    animate: { y: 0 },
    exit: { y: '100%' },
    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }
  },
  
  slideDown: {
    initial: { y: '-100%' },
    animate: { y: 0 },
    exit: { y: '-100%' },
    transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] }
  },
  
  // Bounce animations
  bounce: {
    initial: { scale: 0 },
    animate: { scale: 1 },
    transition: { 
      type: 'spring',
      stiffness: 400,
      damping: 10,
      mass: 1
    }
  },
  
  bounceIn: {
    initial: { opacity: 0, scale: 0.3 },
    animate: { opacity: 1, scale: 1 },
    transition: { 
      type: 'spring',
      stiffness: 400,
      damping: 10,
      mass: 1,
      delay: 0.1
    }
  },
  
  // Stagger container for lists
  staggerContainer: {
    animate: {
      transition: {
        staggerChildren: 0.08,
        delayChildren: 0.1
      }
    }
  },
  
  // Card hover lift
  cardHover: {
    initial: { y: 0, boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' },
    hover: { 
      y: -8,
      boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 0 40px rgba(99, 102, 241, 0.3)',
      transition: { duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }
    }
  },
  
  // Button press
  buttonPress: {
    tap: { 
      scale: 0.95,
      transition: { duration: 0.1 }
    }
  },
  
  // Rotate
  rotate: {
    initial: { rotate: -180, opacity: 0 },
    animate: { rotate: 0, opacity: 1 },
    transition: { duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }
  },
  
  // Flip
  flip: {
    initial: { rotateX: -90, opacity: 0 },
    animate: { rotateX: 0, opacity: 1 },
    transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }
  },
  
  // Loading spinner
  spin: {
    animate: { 
      rotate: 360,
      transition: { 
        duration: 1, 
        repeat: Infinity, 
        ease: 'linear' 
      }
    }
  }
};

// Animate elements on scroll with Intersection Observer
function animateOnScroll(selector, animation = 'fadeInUp', options = {}) {
  const elements = document.querySelectorAll(selector);
  
  if (!elements.length) return;
  
  const observerOptions = {
    root: null,
    rootMargin: '0px',
    threshold: options.threshold || 0.1,
    ...options
  };
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const element = entry.target;
        
        // Apply animation using Web Animations API
        element.animate(animationProps[animation]?.animate || animationProps.fadeInUp.animate, {
          duration: 500,
          easing: 'cubic-bezier(0.25, 0.1, 0.25, 1)',
          fill: 'forwards'
        });
        
        element.style.opacity = '1';
        
        if (options.once !== false) {
          observer.unobserve(element);
        }
      }
    });
  }, observerOptions);
  
  elements.forEach(el => {
    el.style.opacity = '0';
    observer.observe(el);
  });
}

// Parallax effect
function initParallax(selector, speed = 0.5) {
  const elements = document.querySelectorAll(selector);
  
  window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    
    elements.forEach(el => {
      const offset = el.offsetTop;
      const rate = scrolled * speed;
      el.style.transform = `translateY(${rate}px)`;
    });
  });
}

// Smooth reveal on scroll
function initScrollReveal(options = {}) {
  const defaults = {
    selector: '.reveal',
    threshold: 0.1,
    distance: '50px',
    duration: 600,
    once: true
  };
  
  const settings = { ...defaults, ...options };
  
  const reveals = document.querySelectorAll(settings.selector);
  
  const revealOnScroll = () => {
    reveals.forEach(element => {
      const elementTop = element.getBoundingClientRect().top;
      const windowHeight = window.innerHeight;
      
      if (elementTop < windowHeight * (1 - settings.threshold)) {
        element.classList.add('revealed');
        element.style.opacity = '1';
        element.style.transform = 'translateY(0)';
        
        if (settings.once) {
          window.removeEventListener('scroll', revealOnScroll);
        }
      }
    });
  };
  
  // Initial state
  reveals.forEach(el => {
    el.style.opacity = '0';
    el.style.transform = `translateY(${settings.distance})`;
    el.style.transition = `opacity ${settings.duration}ms ease, transform ${settings.duration}ms ease`;
  });
  
  window.addEventListener('scroll', revealOnScroll);
  revealOnScroll(); // Check on load
}

// Number counter animation
function animateCounter(element, end, duration = 2000, options = {}) {
  const start = options.start || 0;
  const increment = (end - start) / (duration / 16);
  let current = start;
  
  const timer = setInterval(() => {
    current += increment;
    
    if (current >= end) {
      current = end;
      clearInterval(timer);
      if (options.onComplete) options.onComplete();
    }
    
    element.textContent = Math.floor(current).toLocaleString();
  }, 16);
}

// Typewriter effect
function typeWriter(element, text, speed = 50, callback) {
  let i = 0;
  element.textContent = '';
  
  function type() {
    if (i < text.length) {
      element.textContent += text.charAt(i);
      i++;
      setTimeout(type, speed);
    } else if (callback) {
      callback();
    }
  }
  
  type();
}

// Magnetic effect for buttons/interactive elements
function initMagnetic(selector, strength = 0.5) {
  const elements = document.querySelectorAll(selector);
  
  elements.forEach(el => {
    el.addEventListener('mousemove', (e) => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      
      el.style.transform = `translate(${x * strength}px, ${y * strength}px)`;
    });
    
    el.addEventListener('mouseleave', () => {
      el.style.transform = 'translate(0, 0)';
    });
  });
}

// Ripple effect for buttons
function initRipple(selector) {
  const buttons = document.querySelectorAll(selector);
  
  buttons.forEach(btn => {
    btn.style.position = 'relative';
    btn.style.overflow = 'hidden';
    
    btn.addEventListener('click', function(e) {
      const rect = this.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      const ripple = document.createElement('span');
      ripple.className = 'ripple';
      ripple.style.cssText = `
        position: absolute;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.4);
        transform: scale(0);
        animation: ripple 0.6s linear;
        left: ${x}px;
        top: ${y}px;
        width: 100px;
        height: 100px;
        margin-left: -50px;
        margin-top: -50px;
        pointer-events: none;
      `;
      
      this.appendChild(ripple);
      
      setTimeout(() => ripple.remove(), 600);
    });
  });
  
  // Add ripple keyframes if not exists
  if (!document.getElementById('ripple-styles')) {
    const style = document.createElement('style');
    style.id = 'ripple-styles';
    style.textContent = `
      @keyframes ripple {
        to {
          transform: scale(4);
          opacity: 0;
        }
      }
    `;
    document.head.appendChild(style);
  }
}

// Initialize all animations
function initAnimations() {
  initScrollReveal();
  initRipple('.btn-primary, .btn-secondary');
  initMagnetic('.magnetic', 0.3);
  animateOnScroll('.animate-on-scroll', 'fadeInUp');
}

// Run on DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initAnimations);
} else {
  initAnimations();
}

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    animations,
    animateOnScroll,
    initParallax,
    initScrollReveal,
    animateCounter,
    typeWriter,
    initMagnetic,
    initRipple,
    initAnimations
  };
}
