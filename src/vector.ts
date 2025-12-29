export class Vector
{
	constructor(public x: number, public y: number) { }
	static zero() { return { x: 0, y: 0 } }
	static from(rad: number, mag = 1) { return { x: mag * Math.cos(rad), y: mag * Math.sin(rad) } }
	static copy(one: Vector) { return { x: one.x, y: one.y } }
	static add(one: Vector, two: Vector) { return { x: one.x + two.x, y: one.y + two.y } }
	static sub(one: Vector, two: Vector) { return { x: one.x - two.x, y: one.y - two.y } }
	static addScalar(one: Vector, scalar: number) { return { x: one.x + scalar, y: one.y + scalar } }
	static subScalar(one: Vector, scalar: number) { return { x: one.x - scalar, y: one.y - scalar } }
	static mult(one: Vector, scalar: number) { return { x: one.x * scalar, y: one.y * scalar } }
	static div(one: Vector, scalar: number) { return { x: one.x / scalar, y: one.y / scalar } }
	static mag(one: Vector) { return Math.hypot(one.x, one.y) }
	static magSqr(one: Vector) { return one.x * one.x + one.y * one.y }
	static normalize(one: Vector) { return this.div(one, this.mag(one)) }
	static dot(one: Vector, two: Vector) { return one.x * two.x + one.y * two.y }
	static project(one: Vector, two: Vector)
	{
		const dot = this.dot(one, two);
		const magSqr = this.magSqr(two);
		return {
			x: dot / magSqr * two.x,
			y: dot / magSqr * two.y,
		}
	}
	static dist(one: Vector, two: Vector) { return Math.hypot(two.x - one.x, two.y - one.y) }
	static lerp(one: Vector, two: Vector, t: number)
	{
		return {
			x: (two.x - one.x) * t + one.x,
			y: (two.y - one.y) * t + one.y,
		}
	}
	static setMag(one: Vector, magnitude: number)
	{
		const mag = Math.hypot(one.x, one.y);
		return {
			x: one.x / mag * magnitude,
			y: one.y / mag * magnitude,
		}
	}
}