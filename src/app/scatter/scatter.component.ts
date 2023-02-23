import { Component, Input, OnInit } from '@angular/core';
import * as d3 from 'd3';
import { D3Selection, D3ScaleLinear } from 'src/types';
import { DataIterable } from './DataIterable';
import { CleanData } from './scatterTypes';

@Component({
  selector: 'app-scatter',
  templateUrl: './scatter.component.html',
  styleUrls: ['./scatter.component.css']
})
export class ScatterComponent implements OnInit {

  @Input()
  labelKey!: string;
  @Input()
  xAxisKey!: string;
  @Input()
  yAxisKey!: string;
  @Input()
  data!: Array<Record<string, number | string>>;
  @Input()
  title!: string;
  @Input()
  description?: string;
  @Input()
  margin: number = 50;
  @Input()
  width: number = 650 - (this.margin * 2);
  @Input()
  height: number = 400 - (this.margin * 2);

  private cleanData?: Record<number, Array<CleanData>>;
  private svg?: D3Selection;
  private dots?: D3Selection;
  private focusedDot?: number | null;
  private cleanDescription?: string;
  private minX?: number;
  private maxX: number = 0;
  private maxY: number = 0;

  constructor() { }

  ngOnInit(): void {
    this.initAria();
    this.createSvg();
    this.drawPlot();
  }

  private initAria(): void {
    this.cleanData = this.createCleanData();
    this.cleanDescription = this.description || '';
    if (this.cleanDescription) this.cleanDescription += ', ';
    this.cleanDescription += this.xAxisKey + ' (x-Axis) has a span from 0 to ' + this.maxX;
    this.cleanDescription += ', ' + this.yAxisKey + ' (y-Axis) has a span from 0 to ' + this.maxY;
  }

  private createSvg(): void {
    this.svg = d3.select("figure#scatter")
      .append("svg")
      .attr("width", this.width + (this.margin * 2))
      .attr("height", this.height + (this.margin * 2))
      .attr("tabindex", "0")
      .attr("id", "SVG")
      .attr('aria-label', 'Scatterplot: ' + this.title)
      .attr('aria-description', this.cleanDescription || null)
      .on("keydown", this.svgKeyDown.bind(this))
      .append("g")
      .attr("transform", "translate(" + this.margin + "," + this.margin + ")");
  }

  private drawPlot(): void {
    if (!this.svg || !this.cleanData) return;
    // Add X axis
    if (this.minX == null) this.minX = 0;
    const threshold = (this.maxX - this.minX) * 0.1;
    const x = d3.scaleLinear()
      .domain([Math.floor(this.minX - threshold), Math.ceil(this.maxX + threshold)])
      .range([0, this.width]);
    this.svg.append("g")
      .attr("transform", "translate(0," + this.height + ")")
      .call(d3.axisBottom(x).tickFormat(d3.format("d")));

    // Add Y axis
    const y = d3.scaleLinear()
      .domain([0, Math.floor(this.maxY + 0.2 * this.maxY)])
      .range([this.height, 0]);
    this.svg.append("g")
      .call(d3.axisLeft(y));

    // Add dots
    this.addDots(x, y);
    const dataIterable = new DataIterable(this.cleanData);
    // Add labels
    this.dots?.selectAll("text")
      .data(dataIterable)
      .enter()
      .append("text")
      .text((d: CleanData) => d.label)
      .attr("x", (d: CleanData) => x(d.xValue))
      .attr("y", (d: CleanData) => y(d.yValue))
      .attr("fill", "white");

    this.addAxisLabels();
  }

  private addAxisLabels(): void {
    if (this.svg) {
      this.svg.append("text")
        .text(this.xAxisKey)
        .attr("x", this.width - this.margin)
        .attr("y", this.height + 30)
        .attr("fill", "gray")
        .attr("font-size", "12px");
      this.svg.append("text")
        .text(this.yAxisKey)
        .attr("x", 10)
        .attr("y", 12)
        .attr("fill", "gray")
        .attr("font-size", "12px");
    }
  }

  private addDots(x: D3ScaleLinear, y: D3ScaleLinear): void {
    if (!this.svg || !this.cleanData) return;
    const dataIterable = new DataIterable(this.cleanData);
    this.dots = this.svg.append('g');
    this.dots.selectAll("dot")
      .data(dataIterable)
      .enter()
      .append("circle")
      .attr('id', (d: CleanData) => "DOT_" + d.ID)
      .attr("cx", (d: CleanData) => x(d.xValue))
      .attr("cy", (d: CleanData) => y(d.yValue))
      .attr("r", 7)
      .attr("class", "scatterCircle")
      .style("opacity", .5)
      .attr("tabindex", "-1")
      .attr("aria-label", (d: CleanData) => d.label)
      .attr("aria-description", (d: CleanData) => this.xAxisKey + ": " + d.xValue + ", " + this.yAxisKey + ": " + d.yValue)
      .on("keydown", this.dotKeyDown.bind(this));
  }

  private createCleanData(): Record<number, Array<CleanData>> {
    let cd: Record<number, Array<CleanData>> = {};
    for (const d of this.data) {
      const xValue = d[this.xAxisKey] as number;
      const obj = {
        label: d[this.labelKey] as string,
        xValue: xValue,
        yValue: d[this.yAxisKey] as number,
        ID: -1,
      };
      if (this.minX == null || obj.xValue < this.minX) this.minX = obj.xValue;
      if (obj.xValue > this.maxX) this.maxX = obj.xValue;
      if (obj.yValue > this.maxY) this.maxY = obj.yValue;
      if (!cd[xValue]) {
        cd[xValue] = [obj];
      } else {
        let insertIndex = -1;
        for (let index = 0; index < cd[xValue].length; ++index){
          if (cd[xValue][index].yValue >= obj.yValue) {
            insertIndex = index;
            break;
          }
        }
        if (insertIndex === -1) {
          cd[xValue].push(obj);
        } else {
          cd[xValue].splice(insertIndex, 0, obj);
        }
      }

    }
    console.log(cd);
    return cd;
  }

  private dotKeyDown(evt: KeyboardEvent): void {
    const targetElement = evt.target as HTMLElement;
    if (targetElement) {
      const currIdx = parseInt(targetElement.id.substring(("DOT_").length));
      if (evt.key === 'ArrowRight') {
        this.focusDot(currIdx + 1);
      } else if (evt.key === 'ArrowLeft') {
        this.focusDot(currIdx - 1);
      } else if (evt.key === 'Escape') {
        this.focusSvg(true);
      } else if (evt.key === 'ArrowUp') {
        this.focusSvg();
      } else if (evt.key === 'Home') {
        this.focusDot(0);
      } else if (evt.key === 'End' && this.cleanData) {
        //this.focusDot(this.cleanData.length - 1);
      }
    }
  }

  private focusDot(idx: number) {
    const selection = d3.select("#DOT_" + idx);
    const node = selection.node() as HTMLElement | null;
    if (node) {
      if (this.focusedDot != null) {
        this.blurDot(this.focusedDot);
      }
      node.focus();
      node.setAttribute("tabindex", "0");
      node.setAttribute("class", "scatterCircleCurrent");
      this.focusedDot = idx;
    }
  }

  private blurDot(idx: number) {
    const selection = d3.select("#DOT_" + idx);
    const node = selection.node() as HTMLElement | null;
    if (node) {
      node.setAttribute("tabindex", "-1");
      node.blur();
      node.setAttribute("class", "scatterCircle");
    }
  }

  private svgKeyDown(evt: KeyboardEvent): void {
    if (evt.key === 'ArrowDown') {
      this.focusDot(this.focusedDot || 0);
    }
  }

  private focusSvg(blurCurrDot?: boolean): void {
    if (this.svg) {
      if (blurCurrDot && this.focusedDot != null) {
        this.blurDot(this.focusedDot);
      }
      this.svg.node()?.parentElement?.focus();
      const selection = d3.select("SVG");
      const node = selection.node() as HTMLElement | null;
      if (node) {
        node.focus();
      }
    }
  }

}
