import { getMouseMovement, getMousePosition, isKeyDown, isMouseDown } from "./inputs.js";
import { createSVG } from "./utils.js";
import { Vector } from "./vector.js";

const enum Scales
{
	pixelZoom = 0.001,
	lineZoom = 0.2,
	keyZoom = 0.1,

	keyMove = 30,
}

const registeredDisplays: Display[] = [];
export class Display
{
	public svg: SVGElement;
	public scale = 1;
	public prevPos = Vector.zero();
	public pos = Vector.zero();
	public fullView: Vector;
	public view: Vector;

	private style = {
		linewidth: 2,
		paramLineGap: 6,
		applicationRowGap: 10,
		applicationColGap: 10,
		pad: 2,
	};

	constructor()
	{
		registeredDisplays.push(this);

		this.fullView = new Vector(innerWidth, innerHeight);
		this.view = Vector.div(this.fullView, this.scale);

		this.svg = createSVG("svg", {
			width: innerWidth,
			height: innerHeight,
			viewBox: `${this.pos.x} ${this.pos.y} ${this.view.x} ${this.view.y}`,
			stroke: "black",
			"stroke-width": this.style.linewidth,
			"stroke-linecap": "butt",
		});

		// Event listeners
		this.svg.addEventListener("mousemove", () =>
		{
			if (!isMouseDown(4)) return;
			this.moveBy(getMouseMovement());
		});

		this.svg.addEventListener("wheel", (e) =>
		{
			let scrollAmount;
			switch (e.deltaMode)
			{
				case 0x00:
					scrollAmount = e.deltaY * Scales.pixelZoom;
					break;
				case 0x01:
				case 0x02:
				default:
					scrollAmount = Math.sign(e.deltaY) * Scales.lineZoom;
					break;
			}

			this.scaleBy(scrollAmount, getMousePosition());
		})
	}

	public listenToKeys(): void
	{
		const moveUp = isKeyDown("w");
		const moveDown = isKeyDown("s");
		const moveLeft = isKeyDown("a");
		const moveRight = isKeyDown("d");
		if (moveUp || moveDown || moveLeft || moveRight)
		{
			this.moveBy(Vector.mult({
				x: (+moveLeft + -moveRight),
				y: (+moveUp + -moveDown),
			}, Scales.keyMove));
		}

		const scaleDown = isKeyDown("-") || isKeyDown("_");
		const scaleUp = isKeyDown("=") || isKeyDown("+");
		if (scaleDown || scaleUp)
		{
			this.scaleBy((+scaleDown + -scaleUp) * Scales.keyMove, {
				x: innerWidth / 2,
				y: innerHeight / 2,
			});
		}
	}

	public addElement(elem: SVGElement): void
	{
		this.svg.append(elem);
	}

	public moveBy(dp: Vector): void
	{
		this.pos = Vector.sub(this.pos, Vector.mult(dp, this.scale));
		this.svg.setAttribute(
			"viewBox",
			`${this.pos.x} ${this.pos.y} ${this.view.x} ${this.view.y}`,
		);
	}

	public scaleBy(ds: number, center: Vector): void
	{
		this.scale = Math.max(0.1, this.scale + ds);

		const oldView = this.view;
		this.view = Vector.mult(this.fullView, this.scale);

		const proportion = Vector.sub(this.fullView, center);
		proportion.x /= this.fullView.x;
		proportion.y /= this.fullView.y;

		const offset = Vector.sub(this.view, oldView);
		offset.x *= 1 - proportion.x;
		offset.y *= 1 - proportion.y;

		this.pos = Vector.sub(this.pos, offset);

		this.svg.setAttribute(
			"viewBox",
			`${this.pos.x} ${this.pos.y} ${this.view.x} ${this.view.y}`,
		);
	}
}