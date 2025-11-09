import Matter from 'matter-js';

export class CartPoleRenderer {
  constructor(canvas, engine, renderOptions = {}) {
    this.engine = engine;
    this.renderMode = renderOptions.renderMode || 'default'; // Fix: Store render mode properly
    
    this.render = Matter.Render.create({
      canvas,
      engine: engine,
      options: {
        width: renderOptions.width || 1200,
        height: renderOptions.height || 600,
        wireframes: false,
        background: 'transparent',
      }
    });

    // Moon rendering setup
    const moonRadius = 1000;
    const moonSprite = new Image();
    moonSprite.src = 'assets/moonRealistic.png';

    let offsetX = 0;
    let offsetY = 0;
    
    // Store original render functions
    const originalRenderBodies = Matter.Render.bodies;
    const originalRenderConstraints = Matter.Render.constraints;
    const self = this;

    // Custom body rendering function
    Matter.Render.bodies = function (render, bodies, context) {
      if (self.renderMode === 'moon') {
        const c = context;

        // Find the cart body to center the view
        const cartBody = bodies.find((b) => b.label === 'Rectangle Body' && b.position.y < 400);
        if (!cartBody) {
          originalRenderBodies(render, bodies, context);
          return;
        }

        c.save();
        // Translate scene to center the cart
        offsetX = render.options.width / 2 - cartBody.position.x;
        offsetY = render.options.height / 2 - cartBody.position.y;
        c.translate(offsetX, offsetY);

        // Find and render the ground as moon surface
        const groundBody = bodies.find((b) => b.isStatic);
        if (groundBody && moonSprite.complete) {
          c.save();
          const spriteSize = moonRadius * 2;
          c.translate(
            cartBody.position.x,
            groundBody.position.y + spriteSize / 2 - 40
          );
          c.rotate(-cartBody.position.x / spriteSize);
          c.drawImage(
            moonSprite,
            -spriteSize / 2,
            -spriteSize / 2,
            spriteSize,
            spriteSize
          );
          c.restore();
          
          // Render other bodies except ground
          originalRenderBodies(
            render,
            bodies.filter((b) => b !== groundBody),
            context
          );
        } else {
          // Render all bodies if no sprite loaded yet
          originalRenderBodies(render, bodies, context);
        }

        c.restore();
      } else {
        // Default rendering
        originalRenderBodies(render, bodies, context);
      }
    };

    // Custom constraint rendering function
    Matter.Render.constraints = function (render, constraints, context) {
      const c = context || render.context;
      if (!c) return;
      
      if (self.renderMode === 'moon') {
        c.save();
        c.translate(offsetX, offsetY);
        originalRenderConstraints(render, constraints, c);
        c.restore();
      } else {
        originalRenderConstraints(render, constraints, c);
      }
    };

    // Start the renderer
    Matter.Render.run(this.render);
    this.runner = Matter.Runner.create();
    Matter.Runner.run(this.runner, this.engine);
  }
  
  setRenderMode(mode) { 
    this.renderMode = mode;
  }

  stop() {
    Matter.Render.stop(this.render);
    Matter.Runner.stop(this.runner);
  }

  cleanup() {
    this.stop();
    // Reset render functions to original (optional, for cleanup)
  }
}