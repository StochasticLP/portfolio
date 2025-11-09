import Matter from 'matter-js';

export class CartPoleEngine {
  constructor(options = {}) {
    this.engine = Matter.Engine.create();
    this.options = {
        width: options.width || 1200,
        height: options.height || 600,
    }
    

    this.CART = 0x0001;
    this.POLE = 0x0002;
    this.GROUND = 0x0004;
    const cartY = 350;
    const cartX = this.options.width / 2; // Center cart horizontally

    this.cart = Matter.Bodies.rectangle(cartX, cartY, 200, 50, {
      friction: 0,
      frictionAir: 0,
      frictionStatic: 0,
      mass: 1,
      collisionFilter: {
        category: this.CART,
        mask: this.GROUND,
      },

    });
    this.pole = Matter.Bodies.rectangle(cartX, cartY - 125, 10, 200, {
      friction: 0,
      frictionAir: 0,
      frictionStatic: 0,
      mass: 1,
      collisionFilter: {
        category: this.POLE,
        group: -1,
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

    this.ground = Matter.Bodies.rectangle(cartX, 500, 81000, 60, {
      isStatic: true,
      collisionFilter: {
        category: this.GROUND,
        mask: this.CART,
      },
    });

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
}
  
  step() { /* physics step */ 
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

  reset() { 
    Matter.Body.setPosition(this.cart, { x: this.options.width / 2, y: 350 });
    Matter.Body.setAngle(this.pole, 0);
    Matter.Body.setVelocity(this.cart, { x: 0, y: 0 });
    Matter.Body.setAngularVelocity(this.pole, 0);
  }

  cleanup() {
    // Clean up the engine
    Matter.Engine.clear(this.engine);
    Matter.Composite.clear(this.engine.world, false);
  }
}