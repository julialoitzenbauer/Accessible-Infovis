import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import * as d3 from 'd3';
import * as Tone from 'tone';
import { D3Selection, D3ScaleLinear } from 'src/types';
import { DataIterable } from './DataIterable';
import { IDGenerator } from './IDGenerator';
import { CleanData, DataPoint } from './scatterTypes';

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
  @Input()
  showLabel: boolean = true;
  @Input()
  radius: number = 7;
  @Input()
  formatXAxisToInt: boolean = false;

  @ViewChild('menuList') menuList: ElementRef<HTMLElement> | undefined;
  @ViewChild('menuButton') menuButton: ElementRef<HTMLElement> | undefined;
  @ViewChild('liveRegion') liveRegion: ElementRef<HTMLElement> | undefined;

  private cleanData?: Record<number, Array<CleanData>>;
  private svg?: D3Selection;
  private dots?: D3Selection;
  private focusedDot?: string | null;
  private cleanDescription?: string;
  private minX?: number;
  private maxX: number = 0;
  private maxY: number = 0;
  private keys: Array<number> = [];
  scatterId: string;
  menuIsOpen: boolean;
  menuId: string;

  constructor() {
    this.scatterId = IDGenerator.getId();
    this.menuIsOpen = false;
    this.menuId = this.scatterId + '_MENU';
  }

  ngOnInit(): void {
    setTimeout(() => {
      this.initAria();
      this.createSvg();
      this.drawPlot();
    });
  }

  menuKeyDown(evt: KeyboardEvent): void {
    console.log(evt.key);
    if (evt.key === 'Enter' || evt.key === ' ' || evt.key === 'ArrowDown' || evt.key === 'ArrowUp') {
      this.menuIsOpen = !this.menuIsOpen;
      setTimeout(() => {
        if (this.menuList?.nativeElement) {
          const menuItems = this.menuList.nativeElement.querySelectorAll('li');
          const itemIdx = evt.key === 'ArrowUp' ? menuItems.length - 1 : 0;
          menuItems[itemIdx].tabIndex = 0;
          menuItems[itemIdx].focus();
        }
      }, 0);
      evt.preventDefault();
    } else if (evt.key === 'Escape') {
      this.focusSvg(true);
    }
  }

  menuItemKeyDown(evt: KeyboardEvent): void {
    const target = evt.target as HTMLElement | null;
    if (target) {
      if (evt.key === 'ArrowDown' || evt.key === 'ArrowUp') {
        let next = evt.key === 'ArrowDown' ?
          target.nextElementSibling as HTMLElement | null :
          target.previousElementSibling as HTMLElement | null;
        if (evt.key === 'ArrowUp' && !next) {
          next = this.menuList?.nativeElement.lastChild as HTMLElement | null;
        }
        if (evt.key === 'ArrowDown' && !next) {
          next = this.menuList?.nativeElement.firstChild as HTMLElement | null;
        }
        if (next) {
          target.tabIndex = -1;
          next.tabIndex = 0;
          next.focus();
        }
      } else if (evt.key === 'Escape') {
        if (this.menuButton?.nativeElement) {
          this.menuButton.nativeElement.focus();
          this.menuIsOpen = false;
        }
      } else if (evt.key === 'Enter' || evt.key === ' ') {
        this.triggerMenuItem(evt);
      }
      evt.preventDefault();
    }
  }

  private triggerMenuItem(evt: KeyboardEvent): void {
    const target = evt.target as HTMLElement | null;
    if (target) {
      switch(target.id) {
        case 'MenuItemNavigate':
          if (this.keys.length) {
            this.focusDot(this.keys[0] + '_0');
          }
          break;
        case 'MenuItemSummary':
          if (this.liveRegion?.nativeElement) {
            this.liveRegion.nativeElement.innerHTML = '';
            const descriptionTag = document.createElement('p');
            descriptionTag.innerText = this.cleanDescription || '';
            this.liveRegion.nativeElement.appendChild(descriptionTag);
          }
      }
    }
  }

  private initAria(): void {
    this.cleanData = this.createCleanData();
    this.cleanDescription = this.description || '';
    if (this.cleanDescription) this.cleanDescription += ', ';
    this.cleanDescription += this.xAxisKey + ' (x-Axis) has a span from 0 to ' + this.maxX;
    this.cleanDescription += ', ' + this.yAxisKey + ' (y-Axis) has a span from 0 to ' + this.maxY;
  }

  private createSvg(): void {
    this.svg = d3.select("figure#" + this.scatterId)
      .append("svg")
      .attr("id", "SVG_" + this.scatterId)
      .on("keydown", this.svgKeyDown.bind(this))
      .attr("width", this.width + (this.margin * 2))
      .attr("height", this.height + (this.margin * 2))
      .attr("tabindex", "0")
      .attr("id", "SVG")
      .attr('aria-label', 'Scatterplot: ' + this.title)
      .attr('aria-description', this.cleanDescription || null)
      .append("g")
      .attr("transform", "translate(" + this.margin + "," + this.margin + ")");
  }

  private drawPlot(): void {
    if (!this.svg || !this.cleanData) return;
    // Add X axis
    if (this.minX == null) this.minX = 0;
    const threshold = (this.maxX - this.minX) * 0.1;
    const x = d3.scaleLinear()
      .domain([Math.floor(this.minX - threshold), Math.floor(this.maxX + threshold)])
      .range([0, this.width]);
    if (this.formatXAxisToInt) {
      this.svg.append("g")
        .attr("transform", "translate(0," + this.height + ")")
        .call(d3.axisBottom(x).tickFormat(d3.format("d")));
    } else {
      this.svg.append("g")
        .attr("transform", "translate(0," + this.height + ")")
        .call(d3.axisBottom(x));
    }

    // Add Y axis
    const y = d3.scaleLinear()
      .domain([0, Math.floor(this.maxY + 0.2 * this.maxY)])
      .range([this.height, 0]);
    this.svg.append("g")
      .call(d3.axisLeft(y));

    // Add dots
    this.addDots(x, y);
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
    let dataIterable = new DataIterable(this.cleanData);
    this.dots = this.svg.append('g');
    this.dots.selectAll("dot")
      .data(dataIterable)
      .enter()
      .append("circle")
      .attr('id', (d: CleanData) => "DOT_" + d.ID)
      .attr("cx", (d: CleanData) => x(d.xValue))
      .attr("cy", (d: CleanData) => y(d.yValue))
      .attr("r", this.radius)
      .attr("class", "scatterCircle")
      .style("opacity", .5)
      .attr("tabindex", "-1")
      .attr("aria-label", (d: CleanData) => d.label)
      .attr("aria-description", (d: CleanData) => this.xAxisKey + ": " + d.xValue + ", " + this.yAxisKey + ": " + d.yValue)
      .on("keydown", this.dotKeyDown.bind(this));
    if (this.showLabel) {
      dataIterable = new DataIterable(this.cleanData);
      this.dots.selectAll("text")
        .data(dataIterable)
        .enter()
        .append("text")
        .text((d: CleanData) => d.label)
        .attr("x", (d: CleanData) => x(d.xValue))
        .attr("y", (d: CleanData) => y(d.yValue))
        .attr("fill", "white");
    }
  }

  private createCleanData(): Record<number, Array<CleanData>> {
    let cd: Record<number, Array<CleanData>> = {};
    for (const d of this.data) {
      const xValue = parseFloat(d[this.xAxisKey] as string);
      const obj = {
        label: d[this.labelKey] as string,
        xValue: xValue,
        yValue: parseFloat(d[this.yAxisKey] as string),
        ID: '',
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
    cd = this.sortData(cd);
    this.keys = Object.keys(cd).map(Number);
    for (const key of this.keys) {
      const entry = cd[key];
      for (let idx = 0; idx < entry.length; ++ idx) {
        entry[idx].ID = key + '_' + idx;
      }
    }
    return cd;
  }

  private sortData(d: Record<number, Array<CleanData>>): Record<number, Array<CleanData>> {
    const ordered = Object.keys(d).sort().reduce(
      (obj: Record<number, Array<CleanData>>, key: string) => {
        const numericKey = parseFloat(key);
        obj[numericKey] = d[numericKey];
        return obj;
      },
      {}
    );
    return ordered;
  }

  private dotKeyDown(evt: KeyboardEvent): void {
    const targetElement = evt.target as HTMLElement;
    if (targetElement && this.cleanData) {
      const dataPoint = this.getDataPointById(targetElement.id);
      let newDataPoint: DataPoint | null = null;
      if (dataPoint) {
        if (evt.key === 'ArrowRight' || evt.key === 'ArrowLeft') {
          newDataPoint = this.horizontalNav(dataPoint, evt.key === 'ArrowLeft');
        } else if (evt.key === 'Escape') {
          if (this.focusedDot) {
            this.blurDot(this.focusedDot)
          }
          if (this.menuList?.nativeElement) {
            const menuItems = this.menuList.nativeElement.querySelectorAll('li');
            for (let idx = 0; idx < menuItems.length; ++idx) {
              const item = menuItems[idx] as HTMLElement;
              if (item.id === 'MenuItemNavigate') {
                item.tabIndex = 0;
                item.focus();
              } else {
                item.removeAttribute('tabindex');
              }
            }
          }
        } else if (evt.key === 'ArrowUp' || evt.key === 'ArrowDown') {
          newDataPoint = this.verticalNav(dataPoint, evt.key === 'ArrowUp');
        } else if (evt.key === 'Home') {
          newDataPoint = { key: this.keys[0], idx: 0 };
        } else if (evt.key === 'End') {
          const newKey = this.keys[this.keys.length - 1];
          newDataPoint = { key: newKey, idx: this.cleanData[newKey].length - 1 };
        }
      }
      if (newDataPoint) {
        this.focusDot(newDataPoint.key + '_' + newDataPoint.idx);
      }
    }
    evt.preventDefault();
  }

  private getDataPointById(id: string): DataPoint | null {
    const dataId = id.substring(id.indexOf('_') + 1);
    if (dataId) {
      const key = parseFloat(dataId.substring(0, dataId.indexOf('_')));
      const idx = parseFloat(dataId.substring(dataId.indexOf('_') + 1));
      if (key != null && idx != null && !isNaN(key) && !isNaN(idx)) {
        return {
          key,
          idx,
        };
      }
    }
    return null;
  }

  private horizontalNav(currDataPoint: DataPoint, toLeft: boolean): DataPoint | null {
    const currKeyIdx = this.keys.indexOf(currDataPoint.key);
    if (currKeyIdx !== -1 && this.cleanData) {
      const newKeyIdx = toLeft ? currKeyIdx - 1 : currKeyIdx + 1;
      if (newKeyIdx >= 0 && newKeyIdx < this.keys.length) {
        const newKey = this.keys[newKeyIdx];
        let nearestItemIdx = -1;
        let nearesOffset = undefined;
        const currDataPointValue = this.cleanData[currDataPoint.key][currDataPoint.idx].yValue;
        for (let idx = 0; idx < this.cleanData[newKey].length; ++idx) {
          let offset = this.cleanData[newKey][idx].yValue - currDataPointValue;
          if (offset < 0) offset = offset * -1;
          if (nearesOffset == null || offset < nearesOffset) {
            nearesOffset = offset;
            nearestItemIdx = idx;
          }
        }
        return {
          key: newKey,
          idx: nearestItemIdx,
        }
      }
    }
    return null;
  }

  private verticalNav(currDataPoint: DataPoint, up: boolean): DataPoint | null {
    if (this.cleanData) {
      const newDataIdx = up ? currDataPoint.idx + 1 : currDataPoint.idx - 1;
      if (newDataIdx >= 0 && newDataIdx < this.cleanData[currDataPoint.key].length) {
        return {
          key: currDataPoint.key,
          idx: newDataIdx,
        };
      }
    }
    return null;
  }

  private focusDot(id: string) {
    const selection = d3.select('#DOT_' + id.replaceAll('.', '\\.'));
    const node = selection.node() as HTMLElement | null;
    if (node) {
      if (this.focusedDot != null) {
        this.blurDot(this.focusedDot);
      }
      node.focus();
      node.setAttribute("tabindex", "0");
      node.setAttribute("class", "scatterCircleCurrent");
      this.focusedDot = id;
    }
  }

  private blurDot(id: string) {
    const selection = d3.select('#DOT_' + id.replaceAll('.', '\\.'));
    const node = selection.node() as HTMLElement | null;
    if (node) {
      node.setAttribute("tabindex", "-1");
      node.blur();
      node.setAttribute("class", "scatterCircle");
    }
  }

  private svgKeyDown(evt: KeyboardEvent): void {
    if (evt.key === 'Enter') {
      if (this.menuButton?.nativeElement) {
        this.menuButton.nativeElement.tabIndex = 0;
        this.menuButton.nativeElement.focus();
      }
    }
  }

  private focusSvg(blurCurrDot?: boolean): void {
    if (this.svg) {
      if (this.menuButton?.nativeElement) {
        this.menuButton.nativeElement.tabIndex = -1;
      }
      if (blurCurrDot && this.focusedDot != null) {
        this.blurDot(this.focusedDot);
      }
      this.svg.node()?.parentElement?.focus();
      const selection = d3.select('[id="SVG_' + this.scatterId + '"]');
      const node = selection.node() as HTMLElement | null;
      if (node) {
        node.focus();
      }
    }
  }

}
