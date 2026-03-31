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

let focusedDisplay: Display | null = null;
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

	constructor(container: HTMLElement, public isCentered: boolean)
	{
		const containerBox = container.getBoundingClientRect();
		this.fullView = new Vector(containerBox.width, containerBox.height);
		this.view = Vector.div(this.fullView, this.scale);

		const viewPosX = this.pos.x - (isCentered ? this.fullView.x / 2 : 0);
		const viewPosY = this.pos.y - (isCentered ? this.fullView.y / 2 : 0);
		this.svg = createSVG("svg", {
			width: this.fullView.x,
			height: this.fullView.y,
			viewBox: `${viewPosX} ${viewPosY} ${this.view.x} ${this.view.y}`,
			stroke: "black",
			"stroke-width": this.style.linewidth,
			"stroke-linecap": "butt",
		});

		// Event listeners
		this.svg.addEventListener("click", () =>
		{
			focusedDisplay = this;
		})

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

			this.scaleBy(
				scrollAmount,
				getMousePosition(),
			);
		})

		container.prepend(this.svg);
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
			this.scaleBy(
				(+scaleDown + -scaleUp) * Scales.keyZoom,
				{ x: 0.5, y: 0.5 }, true
			);
		}
	}

	public addElement(elem: SVGElement): void
	{
		this.svg.append(elem);
	}

	public moveBy(dp: Vector): void
	{
		this.pos = Vector.sub(this.pos, Vector.mult(dp, this.scale));

		const viewPosX = this.pos.x - (this.isCentered ? this.fullView.x / 2 : 0);
		const viewPosY = this.pos.y - (this.isCentered ? this.fullView.y / 2 : 0);
		this.svg.setAttribute(
			"viewBox",
			`${viewPosX} ${viewPosY} ${this.view.x} ${this.view.y}`,
		);
	}

	public scaleBy(ds: number, center: Vector, isProportion = false): void
	{
		let proportion = isProportion ? center : this.getWorldProportionOfPoint(center);

		this.scale = Math.max(0.1, this.scale + ds);

		const oldView = this.view;
		this.view = Vector.mult(this.fullView, this.scale);

		const offset = Vector.sub(this.view, oldView);
		offset.x *= 1 - proportion.x;
		offset.y *= 1 - proportion.y;

		this.pos = Vector.sub(this.pos, offset);

		const viewPosX = this.pos.x - (this.isCentered ? this.fullView.x / 2 : 0);
		const viewPosY = this.pos.y - (this.isCentered ? this.fullView.y / 2 : 0);
		this.svg.setAttribute(
			"viewBox",
			`${viewPosX} ${viewPosY} ${this.view.x} ${this.view.y}`,
		);
	}

	private getWorldProportionOfPoint(point: Vector): Vector
	{
		const svgBox = this.svg.getBoundingClientRect();
		const center = Vector.sub(point, svgBox);

		if (this.isCentered)
		{
			console.log(center.x, center.y);
		}

		const proportion = Vector.sub(this.fullView, center);
		proportion.x /= this.fullView.x;
		proportion.y /= this.fullView.y;
		return proportion;
	}
}

export function updateDisplaysWithKeyboard(): void
{
	focusedDisplay?.listenToKeys();
}