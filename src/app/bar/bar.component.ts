import { Component, Input, OnInit } from '@angular/core';
import * as d3 from 'd3';
import { D3Selection } from 'src/types';
import { ChartBase } from '../base/ChartBase';
import { CleanData, CleanDataItem } from './barTypes';
import { IDGenerator } from '../base/IDGenerator';

@Component({
  selector: 'app-bar',
  templateUrl: './bar.component.html',
  styleUrls: ['./bar.component.css']
})

export class BarComponent extends ChartBase<CleanData> {
  private maxY: number = -1;
  private maxId?: string;
  private minId?: string;

  constructor() {
    super();
    this.figureId = IDGenerator.getId('BAR');
    this.cleanData = [] as CleanData;
  }

  ngOnInit(): void {
    setTimeout(() => {
      this.initAria();
      this.createSvg();
      this.drawBars();
    }, 0);
  }

  protected initAria(): void {
    this.createCleanData();
    this.cleanDescription = this.description || '';
    if (this.cleanDescription) this.cleanDescription += ', ';
    this.cleanDescription += 'The chart contains ' + this.cleanData.length + ' bars, ';
    this.cleanDescription += this.yAxisKey + ' (y-Axis) has a span from 0 to ' + this.maxY;
  }

  private createSvg(): void {
    this.svg = d3.select("figure#" + this.figureId)
      .append("svg")
      .on("keydown", this.svgKeyDown.bind(this))
      .attr("id", "SVG_" + this.figureId)
      .attr("tabindex", "0")
      .attr("width", this.width + (this.margin * 2))
      .attr("height", this.height + (this.margin * 2))
      .attr("aria-label", this.title)
      .attr("aria-description", "Bar Chart")
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
      .attr("x", (d: CleanDataItem) => x(d.label) || 0)
      .attr("y", (d: CleanDataItem) => y(d.yValue))
      .attr("width", x.bandwidth())
      .attr("height", (d: CleanDataItem) => this.height - y(d.yValue))
      .attr("class", "bar")
      .attr("tabindex", "-1")
      .attr("id", (d: CleanDataItem) => d.ID)
      .attr("aria-label", (d: CleanDataItem) => d.label)
      .attr("aria-description", (d: CleanDataItem) => this.yAxisKey + ': ' + d.yValue)
      .on("keydown", this.barKeyDown.bind(this));

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
      if (this.focusedElement != null) {
        this.blurBar(this.focusedElement);
      }
      node.focus();
      node.setAttribute("tabindex", "0");
      node.setAttribute("class", "barCurrent");
      this.focusedElement = id;
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
    if (this.focusedElement) {
      for (let idx = 0; idx < this.cleanData.length; ++idx) {
        if (this.cleanData[idx].ID === this.focusedElement) {
          return idx;
        }
      }
    }
    return -1;
  }

  private svgKeyDown(evt: KeyboardEvent): void {
    if (evt.key === 'ArrowDown') {
      if (this.focusedElement) {
        this.focusBar(this.focusedElement);
      } else {
        this.focusBar(this.cleanData[0].ID);
      }
    }
  }

  private focusSvg(blurCurrDot?: boolean): void {
    if (this.svg) {
      if (blurCurrDot && this.focusedElement != null) {
        this.blurBar(this.focusedElement);
      }
      this.svg.node()?.parentElement?.focus();
      const selection = d3.select('[id="SVG_' + this.figureId + '"]');
      const node = selection.node() as HTMLElement | null;
      if (node) {
        node.focus();
      }
    }
  }

}