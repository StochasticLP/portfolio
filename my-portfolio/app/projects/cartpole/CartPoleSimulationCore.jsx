import * as Matter from 'matter-js';

// Model: CartPoleSimulationCore
export class CartPoleSimulationCore {
  constructor(canvas, options = {}) {
    this.engine = Matter.Engine.create();
    this.render = Matter.Render.create({
      canvas,
      engine: this.engine,
      options: {
        width: options.width || 1200,
        height: options.height || 600,
        wireframes: false,
        background: 'transparent',
        moonRender: options.moonRender || false,
      },
    });
    this.CART = 0x0001;
    this.POLE = 0x0002;
    this.GROUND = 0x0004;
    const moonRender = this.render.options.moonRender;
    const cartY = 350;
    const cartX = this.render.options.width / 2; // Center cart horizontally

    this.cart = Matter.Bodies.rectangle(cartX, cartY, 200, 50, {
      friction: 0,
      frictionAir: 0,
      frictionStatic: 0,
      mass: 1,
      collisionFilter: {
        category: this.CART,
        mask: this.GROUND,
      },
      /*
      render: {
        sprite: {
          texture: 'assets/rover.svg',
          xScale: 1,
          yScale: 1,
        }
      },
      */
    });
    this.pole = Matter.Bodies.rectangle(cartX, cartY - 125, 10, 200, {
      collisionFilter: { group: -1 },
      friction: 0,
      frictionAir: 0,
      frictionStatic: 0,
      mass: 1,
      collisionFilter: {
        category: this.POLE,
      },
    });
    this.pivot = Matter.Constraint.create({
      bodyA: this.cart,
      pointA: { x: 0, y: -25 },
      bodyB: this.pole,
      pointB: { x: 0, y: 100 },
      length: 0,
      stiffness: 1,
    });
    const wheelOffsetX = 70;
    const wheelY = cartY + 40;
    const wheelRadius = 30;
    this.wheel1 = Matter.Bodies.circle(
      cartX - wheelOffsetX,
      wheelY,
      wheelRadius,
      {
        friction: 0,
        frictionAir: 0,
        frictionStatic: 0,
        mass: 0.5,
        collisionFilter: {
          category: this.CART,
          mask: this.GROUND,
        },
      }
    );
    this.wheel2 = Matter.Bodies.circle(
      cartX + wheelOffsetX,
      wheelY,
      wheelRadius,
      {
        friction: 0,
        frictionAir: 0,
        frictionStatic: 0,
        mass: 0.5,
        collisionFilter: {
          category: this.CART,
          mask: this.GROUND,
        },
      }
    );
    this.axle1 = Matter.Constraint.create({
      bodyA: this.cart,
      pointA: { x: -wheelOffsetX, y: 25 },
      bodyB: this.wheel1,
      pointB: { x: 0, y: 0 },
      length: 0,
      stiffness: 1,
    });
    this.axle2 = Matter.Constraint.create({
      bodyA: this.cart,
      pointA: { x: wheelOffsetX, y: 25 },
      bodyB: this.wheel2,
      pointB: { x: 0, y: 0 },
      length: 0,
      stiffness: 1,
    });

    const moonRadius = 1000;
    this.ground = Matter.Bodies.rectangle(cartX, 500, 81000, 60, {
      isStatic: true,
      collisionFilter: {
        category: this.GROUND,
        mask: this.CART,
      },
      custom: {
        sprite: new Image(),
      },
    });
    this.ground.custom.sprite.src = 'assets/moonRealistic.png';

    Matter.Composite.add(this.engine.world, [
      this.ground,
      this.wheel1,
      this.wheel2,
      this.cart,
      this.pole,
      this.pivot,
      this.axle1,
      this.axle2,
    ]);

    let offsetX = 0;
    let offsetY = 0;
    // Custom rendering
    const originalRenderBodies = Matter.Render.bodies;
    const originalRenderConstraints = Matter.Render.constraints;
    const self = this; // Capture instance context
    Matter.Render.bodies = function (render, bodies, context) {
      if (moonRender) {
        const c = context;

        // Find the cart to center the view
        const cartBody = bodies.find((b) => b === self.cart);
        if (!cartBody) {
          originalRenderBodies(render, bodies, context); // Fallback
          return;
        }

        c.save();
        // Translate scene to center the cart
        offsetX = render.options.width / 2 - cartBody.position.x;
        offsetY = render.options.height / 2 - cartBody.position.y;
        c.translate(offsetX, offsetY);

        const groundBody = bodies.find((b) => b === self.ground);
        if (
          groundBody &&
          groundBody.custom &&
          groundBody.custom.sprite.complete
        ) {
          c.save();
          const spriteSize = moonRadius * 2;
          c.translate(
            cartBody.position.x,
            groundBody.position.y + spriteSize / 2 - 40
          );
          c.rotate(-cartBody.position.x / spriteSize);
          c.drawImage(
            groundBody.custom.sprite,
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
          // Render all bodies if no sprite
          originalRenderBodies(render, bodies, context);
        }

        c.restore();
      } else {
        originalRenderBodies(render, bodies, context);
      }
    };

    Matter.Render.constraints = function (render, constraints, context) {
      // Fallback to render.context if context is not provided
      const c = context || render.context;
      if (!c) {
        // If context is still undefined, skip rendering constraints
        return;
      }
      if (moonRender) {
        c.save();
        c.translate(offsetX, offsetY);
        originalRenderConstraints(render, constraints, c);
        c.restore();
      } else {
        originalRenderConstraints(render, constraints, c);
      }
    };

    Matter.Body.rotate(this.pole, -Math.PI * 0.01);
    Matter.Render.run(this.render);
    this.runner = Matter.Runner.create();
    Matter.Runner.run(this.runner, this.engine);
  }

  step() {
    Matter.Engine.update(this.engine, 1000 / 60);
  }

  getState() {
    // Return state needed for control
    return {
      cartPosition: this.cart.position.x,
      cartVelocity: this.cart.velocity.x,
      poleAngle: Math.atan2(
        this.pole.position.x - this.cart.position.x,
        this.cart.position.y - this.pole.position.y
      ),
      poleAngularVelocity: this.pole.angularVelocity,
    };
  }

  applyForce(force) {
    Matter.Body.applyForce(
      this.cart,
      { x: this.cart.position.x, y: this.cart.position.y },
      { x: force, y: 0 }
    );
  }

  cleanup() {
    Matter.Render.stop(this.render);
    Matter.Runner.stop(this.runner);
    Matter.Engine.clear(this.engine);
  }
}
