import { Component, Input, OnInit } from '@angular/core';
import * as d3 from 'd3';
import { D3Selection, D3ScaleLinear } from 'src/types';
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

  private data: Array<Record<string, number | string>> = [
    { Framework: "Vue", Stars: 166443, Released: 2014 },
    { Framework: "React", Stars: 150793, Released: 2013 },
    { Framework: "Angular", Stars: 62342, Released: 2016 },
    { Framework: "Backbone", Stars: 27647, Released: 2010 },
    { Framework: "Ember", Stars: 21471, Released: 2011 },
  ];
  private cleanData?: Array<CleanData>;
  private svg?: D3Selection;
  private dots?: D3Selection;
  private focusedDot?: number | null;
  private margin = 50;
  private width = 750 - (this.margin * 2);
  private height = 400 - (this.margin * 2);

  constructor() { }

  ngOnInit(): void {
    this.createCleanData();
    this.createSvg();
    this.drawPlot();
  }

  private createSvg(): void {
    this.svg = d3.select("figure#scatter")
      .append("svg")
      .attr("width", this.width + (this.margin * 2))
      .attr("height", this.height + (this.margin * 2))
      .attr("tabindex", "0")
      .attr("id", "SVG")
      .on("keydown", this.svgKeyDown.bind(this))
      .append("g")
      .attr("transform", "translate(" + this.margin + "," + this.margin + ")");
  }

  private drawPlot(): void {
    if (!this.svg || !this.cleanData) return;
    // Add X axis
    const x = d3.scaleLinear()
      .domain([2009, 2017])
      .range([0, this.width]);
    this.svg.append("g")
      .attr("transform", "translate(0," + this.height + ")")
      .call(d3.axisBottom(x).tickFormat(d3.format("d")));

    // Add Y axis
    const y = d3.scaleLinear()
      .domain([0, 200000])
      .range([this.height, 0]);
    this.svg.append("g")
      .call(d3.axisLeft(y));

    // Add dots
    this.addDots(x, y);
    // Add labels
    this.dots?.selectAll("text")
      .data(this.cleanData)
      .enter()
      .append("text")
      .text((d: CleanData) => d.label)
      .attr("x", (d: CleanData) => x(d.xValue))
      .attr("y", (d: CleanData) => y(d.yValue))
      .attr("fill", "white")
  }

  private addDots(x: D3ScaleLinear, y: D3ScaleLinear): void {
    if (!this.svg || !this.cleanData) return;
    this.dots = this.svg.append('g');
    this.dots.selectAll("dot")
      .data(this.cleanData)
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

  private createCleanData(): void {
    this.cleanData = [];
    for (const d of this.data) {
      this.cleanData.push({
        label: d[this.labelKey] as string,
        xValue: d[this.xAxisKey] as number,
        yValue: d[this.yAxisKey] as number,
        ID: -1,
      });
    }
    this.cleanData = this.cleanData.sort((a: Record<string, number | string>, b: Record<string, number | string>) => {
      if (a["xValue"] < b["xValue"]) {
        return -1;
      } else if (a["xValue"] > b["xValue"]) {
        return 1;
      } else {
        if (a["yValue"] < b["yValue"]) return -1;
        if (a["yValue"] > b["yValue"]) return 1;
      }
      return -1;
    });
    for (let idx = 0; idx < this.cleanData.length; ++idx) {
      this.cleanData[idx]['ID'] = idx;
    }
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
        this.focusDot(this.cleanData.length - 1);
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
