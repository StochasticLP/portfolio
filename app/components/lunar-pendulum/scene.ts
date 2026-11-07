import Matter from "matter-js";
import {
  CANVAS_H,
  CANVAS_W,
  CART_H,
  CART_W,
  CART_X,
  CART_Y,
  MOON_RADIUS,
  MOON_SRC,
  MOON_X,
  MOON_Y,
  PX_PER_M,
  WHEEL_DX,
  WHEEL_R,
  WHEEL_Y,
} from "./constants";
import { jointPoints, rotate } from "./kinematics";
import type { View } from "./kinematics";

const INK = "#140e0c";

const LINK_LOOK = [
  { w0: 22, w1: 15, fill: "#ff2d55" },
  { w0: 15, w1: 10, fill: "#14b8a6" },
  { w0: 10, w1: 6, fill: "#f0b429" },
];

const JOINT_R = [12, 9, 7, 5];

type Pt = { x: number; y: number };

function bodyOpts(render: Record<string, unknown>, extra: Record<string, unknown> = {}) {
  return {
    isStatic: true,
    isSensor: true,
    friction: 0,
    frictionAir: 0,
    collisionFilter: { category: 0x0002, mask: 0, group: -1 },
    render,
    ...extra,
  };
}

function paint(fill: string, lineWidth = 2) {
  return { fillStyle: fill, strokeStyle: INK, lineWidth };
}

/** Parent edge is the wide end at local +y (down-screen at angle 0). */
function linkVerts(length: number, w0: number, w1: number): Pt[] {
  const yParent = length / 2;
  const yChild = -length / 2;
  return [
    { x: -w0 / 2, y: yParent },
    { x: w0 / 2, y: yParent },
    { x: w1 / 2, y: yChild },
    { x: -w1 / 2, y: yChild },
  ];
}

/**
 * Matter recentres a trapezoid on its centre of mass, which is not the joint midpoint.
 * Measure that offset from the created body so setPosition can put the midpoint back.
 */
function geometricMidLocal(body: any): Pt {
  const vs: Pt[] = body.vertices.map((v: Pt) => ({
    x: v.x - body.position.x,
    y: v.y - body.position.y,
  }));
  vs.sort((a, b) => b.y - a.y);
  const parent = { x: (vs[0].x + vs[1].x) / 2, y: (vs[0].y + vs[1].y) / 2 };
  const n = vs.length;
  const child = { x: (vs[n - 1].x + vs[n - 2].x) / 2, y: (vs[n - 1].y + vs[n - 2].y) / 2 };
  return { x: (parent.x + child.x) / 2, y: (parent.y + child.y) / 2 };
}

export class LunarScene {
  alive = true;
  engine: any;
  render: any;
  moon: any;
  cart: any;
  wheels: any[] = [];
  spokes: any[] = [];
  hubs: any[] = [];
  links: any[] = [];
  linkMidLocal: Pt[] = [];
  joints: any[] = [];
  lengths: [number, number, number] = [0.5, 0.4, 0.3];
  private blobUrl: string | null = null;
  private image: HTMLImageElement | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.engine = Matter.Engine.create();
    this.engine.gravity.x = 0;
    this.engine.gravity.y = 0;
    this.engine.gravity.scale = 0;
    this.engine.enableSleeping = false;

    this.render = Matter.Render.create({
      canvas,
      engine: this.engine,
      options: {
        width: CANVAS_W,
        height: CANVAS_H,
        pixelRatio: 1,
        wireframes: false,
        background: "transparent",
        wireframeBackground: "transparent",
        showSleeping: false,
        showDebug: false,
        showStats: false,
        showPerformance: false,
      },
    });

    this.moon = Matter.Bodies.circle(
      MOON_X,
      MOON_Y,
      MOON_RADIUS,
      bodyOpts({
        visible: false,
        fillStyle: "#b9b9b9",
        strokeStyle: "#b9b9b9",
        lineWidth: 0,
        sprite: { texture: "", xScale: 1, yScale: 1 },
      })
    );

    for (const side of [-1, 1]) {
      const x = CART_X + side * WHEEL_DX;
      this.wheels.push(
        Matter.Bodies.circle(x, WHEEL_Y, WHEEL_R, bodyOpts(paint("#241c16", 2)))
      );
      this.spokes.push(
        Matter.Bodies.rectangle(
          x,
          WHEEL_Y,
          3,
          WHEEL_R * 1.7,
          bodyOpts({ fillStyle: "#f0b429", strokeStyle: "#f0b429", lineWidth: 0 })
        )
      );
      this.hubs.push(
        Matter.Bodies.circle(x, WHEEL_Y, 4.5, bodyOpts(paint("#fff8ee", 1.5)))
      );
    }

    this.cart = Matter.Bodies.rectangle(
      CART_X,
      CART_Y,
      CART_W,
      CART_H,
      bodyOpts(paint("#d5dee8", 2), { chamfer: { radius: 6 } })
    );

    this.makeLinks(this.lengths);

    for (let i = 0; i < 4; i++) {
      this.joints.push(
        Matter.Bodies.circle(CART_X, CART_Y, JOINT_R[i], bodyOpts(paint("#fff8ee", 2)))
      );
    }

    this.stack();
    this.loadMoon();
  }

  private makeLinks(lengths: [number, number, number]) {
    this.links = [];
    this.linkMidLocal = [];
    for (let i = 0; i < 3; i++) {
      const L = lengths[i] * PX_PER_M;
      const look = LINK_LOOK[i];
      const body = Matter.Bodies.fromVertices(
        0,
        0,
        [linkVerts(L, look.w0, look.w1)],
        bodyOpts(paint(look.fill, 2.5)),
        false
      );
      this.links.push(body);
      this.linkMidLocal.push(geometricMidLocal(body));
    }
  }

  setLengths(lengths: [number, number, number]) {
    if (
      Math.abs(lengths[0] - this.lengths[0]) < 1e-9 &&
      Math.abs(lengths[1] - this.lengths[1]) < 1e-9 &&
      Math.abs(lengths[2] - this.lengths[2]) < 1e-9
    ) {
      return;
    }
    for (const link of this.links) Matter.Composite.remove(this.engine.world, link);
    this.lengths = [lengths[0], lengths[1], lengths[2]];
    this.makeLinks(this.lengths);
    this.stack();
  }

  private stack() {
    const ordered = [
      this.moon,
      ...this.wheels,
      ...this.spokes,
      ...this.hubs,
      this.cart,
      ...this.links,
      ...this.joints,
    ];
    const existing = this.engine.world.bodies.slice();
    for (const b of existing) Matter.Composite.remove(this.engine.world, b);
    Matter.Composite.add(this.engine.world, ordered);
  }

  private loadMoon() {
    const image = new Image();
    this.image = image;
    image.onload = () => {
      if (!this.alive) return;
      const size = MOON_RADIUS * 2;
      const off = document.createElement("canvas");
      off.width = size;
      off.height = size;
      const ctx = off.getContext("2d");
      if (!ctx) return;
      ctx.beginPath();
      ctx.arc(MOON_RADIUS, MOON_RADIUS, MOON_RADIUS, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(image, 0, 0, size, size);
      off.toBlob((blob) => {
        if (!this.alive || !blob) return;
        const url = URL.createObjectURL(blob);
        this.blobUrl = url;
        this.moon.render.sprite.texture = url;
        this.moon.render.sprite.xScale = 1;
        this.moon.render.sprite.yScale = 1;
        this.moon.render.visible = true;
      }, "image/png");
    };
    image.onerror = () => {
      if (!this.alive) return;
      this.moon.render.sprite.texture = "";
      this.moon.render.visible = true;
    };
    image.src = MOON_SRC;
  }

  apply(view: View) {
    this.setLengths(view.lengths);
    const xPx = view.x * PX_PER_M;
    const moonAngle = -xPx / MOON_RADIUS;
    Matter.Body.setAngle(this.moon, moonAngle);

    const wheelAngle = xPx / WHEEL_R;
    for (let i = 0; i < 2; i++) {
      Matter.Body.setAngle(this.wheels[i], wheelAngle);
      Matter.Body.setAngle(this.spokes[i], wheelAngle);
    }

    const pts = jointPoints(view.theta, view.lengths);
    for (let i = 0; i < this.joints.length; i++) {
      Matter.Body.setPosition(this.joints[i], pts[i]);
    }
    for (let i = 0; i < 3; i++) {
      const mid = { x: (pts[i].x + pts[i + 1].x) / 2, y: (pts[i].y + pts[i + 1].y) / 2 };
      const ang = view.theta[i];
      const shift = rotate(this.linkMidLocal[i], ang);
      Matter.Body.setAngle(this.links[i], ang);
      Matter.Body.setPosition(this.links[i], { x: mid.x - shift.x, y: mid.y - shift.y });
    }
  }

  draw() {
    const ctx = this.render.context;
    if (!ctx) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
    ctx.restore();
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    Matter.Render.world(this.render);
  }

  destroy() {
    this.alive = false;
    if (this.image) {
      this.image.onload = null;
      this.image.onerror = null;
    }
    if (this.blobUrl) URL.revokeObjectURL(this.blobUrl);
    this.blobUrl = null;
    Matter.Render.stop(this.render);
    Matter.World.clear(this.engine.world, false);
    Matter.Engine.clear(this.engine);
    if (this.render) {
      this.render.textures = {};
      this.render.canvas = null;
      this.render.context = null;
    }
  }
}
