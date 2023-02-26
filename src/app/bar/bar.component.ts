import { Component, Input, OnInit } from '@angular/core';
import * as d3 from 'd3';
import { D3Selection } from 'src/types';
import { CleanData } from './barTypes';
import { IDGenerator } from './IDGenerator';

@Component({
  selector: 'app-bar',
  templateUrl: './bar.component.html',
  styleUrls: ['./bar.component.css']
})

export class BarComponent implements OnInit {

  @Input()
  data: Array<Record<string, string | number>> = [];
  @Input()
  yAxisKey: string = '';
  @Input()
  labelKey: string = '';
  @Input()
  margin: number = 50;
  @Input()
  width: number = 750 - (this.margin * 2);
  @Input()
  height: number = 400 - (this.margin * 2);
  @Input()
  title: string = 'Bar Chart';

  private cleanData: Array<CleanData> = [];
  private svg?: D3Selection;
  private maxY: number = -1;
  private maxId?: string;
  private minId?: string;
  private focusedBar?: string;
  barId: string;

  constructor() {
    this.barId = IDGenerator.getId();
  }

  ngOnInit(): void {
    setTimeout(() => {
      this.createCleanData();
      this.createSvg();
      this.drawBars();
    }, 0);
  }

  private createSvg(): void {
    this.svg = d3.select("figure#" + this.barId)
      .append("svg")
      .on("keydown", this.svgKeyDown.bind(this))
      .attr("id", "SVG_" + this.barId)
      .attr("tabindex", "0")
      .attr("width", this.width + (this.margin * 2))
      .attr("height", this.height + (this.margin * 2))
      .append("g")
      .attr("transform", "translate(" + this.margin + "," + this.margin + ")");
  }

  private drawBars(): void {
    if (!this.svg) return;
    // Create the X-axis band scale
    const x = d3.scaleBand()
      .range([0, this.width])
      .domain(this.cleanData.map(d => d.label))
      .padding(0.2);

    // Draw the X-axis on the DOM
    this.svg.append("g")
      .attr("transform", "translate(0," + this.height + ")")
      .call(d3.axisBottom(x))
      .selectAll("text")
      .attr("transform", "translate(-10,0)rotate(-45)")
      .style("text-anchor", "end");

    // Create the Y-axis band scale
    const y = d3.scaleLinear()
      .domain([0, Math.floor(this.maxY + 0.2 * this.maxY)])
      .range([this.height, 0]);

    // Draw the Y-axis on the DOM
    this.svg.append("g")
      .call(d3.axisLeft(y));

    // Create and fill the bars
    this.svg.selectAll("bars")
      .data(this.cleanData)
      .enter()
      .append("rect")
      .attr("x", (d: CleanData) => x(d.label) || 0)
      .attr("y", (d: CleanData) => y(d.yValue))
      .attr("width", x.bandwidth())
      .attr("height", (d: CleanData) => this.height - y(d.yValue))
      .attr("class", "bar")
      .attr("tabindex", "-1")
      .attr("id", (d: CleanData) => d.ID)
      .attr("aria-label", (d: CleanData) => d.label)
      .attr("aria-description", (d: CleanData) => this.yAxisKey + ': ' + d.yValue)
      .on("keydown", this.barKeyDown.bind(this));
  }

  private createCleanData(): void {
    this.cleanData = [];
    let minValue: number | undefined;
    let maxValue: number | undefined;
    for (const d of this.data) {
      const obj = {
        yValue: d[this.yAxisKey] as number,
        label: d[this.labelKey] as string,
        ID: d[this.labelKey] + '_' + d[this.yAxisKey]
      };
      if (obj.yValue > this.maxY) this.maxY = obj.yValue;
      if (minValue == null || obj.yValue < minValue) {
        minValue = obj.yValue;
        this.minId = obj.ID;
      }
      if (maxValue == null || obj.yValue > maxValue) {
        maxValue = obj.yValue;
        this.maxId = obj.ID;
      }
      this.cleanData.push(obj);
    }
  }

  private focusBar(id: string) {
    const selection = d3.select('[id="' + id.replaceAll('.', '\\.') + '"]');
    const node = selection.node() as HTMLElement | null;
    if (node) {
      if (this.focusedBar != null) {
        this.blurBar(this.focusedBar);
      }
      node.focus();
      node.setAttribute("tabindex", "0");
      node.setAttribute("class", "barCurrent");
      this.focusedBar = id;
    }
  }

  private blurBar(id: string) {
    const selection = d3.select('[id="' + id.replaceAll('.', '\\.') + '"]');
    const node = selection.node() as HTMLElement | null;
    if (node) {
      node.setAttribute("tabindex", "-1");
      node.blur();
      node.setAttribute("class", "bar");
    }
  }

  private barKeyDown(evt: KeyboardEvent): void {
    switch (evt.key) {
      case 'ArrowRight':
      case 'ArrowLeft':
        this.horizontalNav(evt.key === 'ArrowLeft');
        break;
      case 'End':
        this.focusBar(this.cleanData[this.cleanData.length - 1].ID);
        break;
      case 'Home':
        this.focusBar(this.cleanData[0].ID);
        break;
      case 'ArrowDown':
        if (evt.altKey && this.minId) {
          this.focusBar(this.minId);
        }
        break;
      case 'ArrowUp':
        if (evt.altKey && this.maxId) {
          this.focusBar(this.maxId);
        }
        break;
      case 'Escape':
        this.focusSvg(true);
        break;
    }
    evt.preventDefault();
  }

  private horizontalNav(toLeft: boolean): void {
    const currIdx = this.getCurrBarIdx();
    if (currIdx !== -1) {
      const newIdx = toLeft ? currIdx - 1 : currIdx + 1;
      if (newIdx >= 0 && newIdx < this.cleanData.length) {
        this.focusBar(this.cleanData[newIdx].ID);
      }
    }
  }

  private getCurrBarIdx(): number {
    if (this.focusedBar) {
      for (let idx = 0; idx < this.cleanData.length; ++idx) {
        if (this.cleanData[idx].ID === this.focusedBar) {
          return idx;
        }
      }
    }
    return -1;
  }

  private svgKeyDown(evt: KeyboardEvent): void {
    if (evt.key === 'ArrowDown') {
      if (this.focusedBar) {
        this.focusBar(this.focusedBar);
      } else {
        this.focusBar(this.cleanData[0].ID);
      }
    }
  }

  private focusSvg(blurCurrDot?: boolean): void {
    if (this.svg) {
      if (blurCurrDot && this.focusedBar != null) {
        this.blurBar(this.focusedBar);
      }
      this.svg.node()?.parentElement?.focus();
      const selection = d3.select('[id="SVG_' + this.barId + '"]');
      const node = selection.node() as HTMLElement | null;
      if (node) {
        node.focus();
      }
    }
  }

}