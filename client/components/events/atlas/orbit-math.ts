/**
 * Minimal camera projection and centripetal Catmull-Rom spline. These were the
 * only parts of Three.js the atlas used; reproduced here to match its output
 * to floating-point precision, without shipping a 3D library.
 */

export type Vec3 = [number, number, number];
export type Vec2 = [number, number];

export interface Projected {
  x: number;
  y: number;
  /** Apparent diameter of a world of `radius`, in px. */
  size: number;
  /** Distance from the camera. */
  depth: number;
}

export interface CameraOptions {
  position: Vec3;
  target: Vec3;
  /** Roll about the view axis, radians. */
  roll: number;
  /** Vertical field of view, degrees. */
  fov: number;
  width: number;
  height: number;
  /** Shifts the image up, like Three's setViewOffset. */
  offsetY: number;
}

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const unit = (a: Vec3): Vec3 => {
  const l = Math.hypot(...a) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

/** Perspective camera looking at a target with world-up +Y, rolled about its view axis. */
export function makeCamera({ position, target, roll, fov, width, height, offsetY }: CameraOptions) {
  const back = unit(sub(position, target));
  let right = unit(cross([0, 1, 0], back));
  let up = cross(back, right);
  const c = Math.cos(roll);
  const s = Math.sin(roll);
  [right, up] = [
    right.map((v, i) => v * c + up[i] * s) as Vec3,
    up.map((v, i) => v * c - right[i] * s) as Vec3,
  ];
  const f = 1 / Math.tan((fov * Math.PI) / 360);
  const aspect = width / height;
  const project = (p: Vec3) => {
    const d = sub(p, position);
    const z = -dot(d, back);
    return {
      x: ((dot(d, right) / z) * (f / aspect) + 1) * (width / 2),
      y: (1 - (dot(d, up) / z) * f) * (height / 2) - offsetY,
    };
  };
  return (point: Vec3, radius = 0): Projected => {
    const p = project(point);
    const edge = project(point.map((v, i) => v + right[i] * radius) as Vec3);
    return { x: p.x, y: p.y, size: Math.abs(edge.x - p.x) * 2, depth: Math.hypot(...sub(point, position)) };
  };
}

/** Closed centripetal Catmull-Rom through 2D points, sampled at `divisions` equal parameter steps. */
export function closedCatmullRom(points: readonly Vec2[], divisions: number): Vec2[] {
  const l = points.length;
  const out: Vec2[] = [];
  const gap = (a: Vec2, b: Vec2) => Math.pow((a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2, 0.25);
  for (let i = 0; i <= divisions; i++) {
    const p = l * (i / divisions);
    let k = Math.floor(p);
    const w = p - k;
    k += k > 0 ? 0 : (Math.floor(Math.abs(k) / l) + 1) * l;
    const p0 = points[(k - 1) % l];
    const p1 = points[k % l];
    const p2 = points[(k + 1) % l];
    const p3 = points[(k + 2) % l];
    let dt0 = gap(p0, p1);
    let dt1 = gap(p1, p2);
    let dt2 = gap(p2, p3);
    if (dt1 < 1e-4) dt1 = 1;
    if (dt0 < 1e-4) dt0 = dt1;
    if (dt2 < 1e-4) dt2 = dt1;
    out.push(
      [0, 1].map((a) => {
        const x0 = p0[a], x1 = p1[a], x2 = p2[a], x3 = p3[a];
        const t1 = ((x1 - x0) / dt0 - (x2 - x0) / (dt0 + dt1) + (x2 - x1) / dt1) * dt1;
        const t2 = ((x2 - x1) / dt1 - (x3 - x1) / (dt1 + dt2) + (x3 - x2) / dt2) * dt1;
        return x1 + t1 * w + (-3 * x1 + 3 * x2 - 2 * t1 - t2) * w * w + (2 * x1 - 2 * x2 + t1 + t2) * w * w * w;
      }) as Vec2,
    );
  }
  return out;
}
