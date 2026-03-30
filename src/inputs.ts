import { Vector } from "./vector.js";

const observed = document.body;

const pressedKeys = new Map<string, boolean>();
let mousePos = Vector.zero(),
	prevMousePos = Vector.zero(),
	pressedMouseBtns = 0;

observed.addEventListener("mousemove", (e) =>
{
	prevMousePos = mousePos;
	mousePos = new Vector(e.x, e.y);
});

observed.addEventListener("keydown", (e) =>
{
	pressedKeys.set(e.key, true);
})
observed.addEventListener("keyup", (e) =>
{
	pressedKeys.set(e.key, false);
})

export function getMousePosition(): Vector
{
	return Vector.copy(mousePos);
}

export function getMouseMovement(): Vector
{
	return Vector.sub(mousePos, prevMousePos);
}

type PrimaryBtn = 1;
type SecondaryBtn = 2;
type AuxillaryBtn = 4;
type MouseBtn = PrimaryBtn | SecondaryBtn | AuxillaryBtn;
export function isMouseDown(btn: MouseBtn): boolean
{
	return (pressedMouseBtns & btn) !== 0;
}

export function isKeyDown(key: string): boolean
{
	return pressedKeys.get(key) ?? false;
}

observed.addEventListener("mouseup", (e) => { pressedMouseBtns = e.buttons; });
observed.addEventListener("mousedown", (e) => { pressedMouseBtns = e.buttons; });