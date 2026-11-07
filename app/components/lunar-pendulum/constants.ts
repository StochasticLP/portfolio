export const CANVAS_W = 2000;
export const CANVAS_H = 3000;
export const PX_PER_M = 170;
export const MOON_RADIUS = 1000;

export const CART_W = 110;
export const CART_H = 28;
export const WHEEL_R = 13;
export const WHEEL_DX = 36;

export const CART_X = CANVAS_W / 2;
export const CART_Y = CANVAS_H / 2;
export const WHEEL_Y = CART_Y + CART_H / 2;
export const SURFACE_Y = WHEEL_Y + WHEEL_R;
export const MOON_X = CART_X;
export const MOON_Y = SURFACE_Y + MOON_RADIUS;
export const PIVOT_X = CART_X;
export const PIVOT_Y = CART_Y - CART_H / 2;

export const DEFAULT_L: [number, number, number] = [0.5, 0.4, 0.3];

/** Pause at each stationary state during the auto cycle. */
export const HOLD_S = 1.2;

/** Gray code over the three links: one link flips at each step. */
export const GRAY_CYCLE = [1, 2, 4, 3, 7, 8, 6, 5];

export const MOON_SRC = "/assets/moonRealisticLossy.webp";
