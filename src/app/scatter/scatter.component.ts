import { Component, Input, OnInit } from '@angular/core';
import * as d3 from 'd3';
import { D3Selection, D3ScaleLinear } from 'src/types';
import { ChartBase } from '../base/ChartBase';
import { DataIterable } from './DataIterable';
import { IDGenerator } from '../base/IDGenerator';
import { CleanData, CleanDataItem, DataPoint } from './scatterTypes';
import { Branch, TreeData, TreeNode } from './TreeData';

@Component({
  selector: 'app-scatter',
  templateUrl: './scatter.component.html',
  styleUrls: ['./scatter.component.css']
})
export class ScatterComponent extends ChartBase<CleanData> {

  @Input()
  showLabel: boolean = true;
  @Input()
  showLabelOnHover: boolean = false;
  @Input()
  radius: number = 7;
  @Input()
  formatXAxisToInt: boolean = false;

  private dots?: D3Selection;
  private minX?: number;
  private maxX: number = 0;
  private maxY: number = 0;
  private keys: Array<number> = [];
  private treeData?: TreeData;
  private currentNode?: HTMLElement | null;
  private keyNavTimeOut?: number;

  constructor() {
    super();
    this.figureId = IDGenerator.getId('SCATTER');
  }

  ngOnInit(): void {
    setTimeout(() => {
      this.initAria();
      this.createSvg();
      this.drawPlot();
    });
  }

  protected initAria(): void {
    this.cleanData = this.createCleanData();
    this.treeData = new TreeData(this.cleanData);
    this.buildTreeNav();
    this.cleanDescription = this.description || '';
    if (this.cleanDescription) this.cleanDescription += ', ';
    this.cleanDescription += this.xAxisKey + ' (x-Axis) has a span from 0 to ' + this.maxX;
    this.cleanDescription += ', ' + this.yAxisKey + ' (y-Axis) has a span from 0 to ' + this.maxY;
  }

  private createSvg(): void {
    let description = this.treeData?.getRoot().getDescription() || this.cleanDescription || null;
    this.svg = d3.select("figure#" + this.figureId)
      .append("svg")
      .attr("id", "SVG_" + this.figureId)
      .on("keydown", this.svgKeyDown.bind(this))
      .attr("width", this.width + (this.margin * 2))
      .attr("height", this.height + (this.margin * 2))
      .attr("tabindex", "0")
      .attr("id", "SVG")
      .attr('aria-label', 'Scatterplot: ' + this.title)
      .attr('aria-description', description || null)
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
      .attr('id', (d: CleanDataItem) => d.ID)
      .attr("cx", (d: CleanDataItem) => x(d.xValue))
      .attr("cy", (d: CleanDataItem) => y(d.yValue))
      .attr("r", this.radius)
      .style("opacity", .5)
      .attr("tabindex", "-1")
      .attr("aria-label", (d: CleanDataItem) => d.label)
      .attr("aria-description", (d: CleanDataItem) => this.xAxisKey + ": " + d.xValue + ", " + this.yAxisKey + ": " + d.yValue)
      .on("keydown", this.dotKeyDown.bind(this))
      .on("mouseover", this.dotsMouseOver.bind(this))
      .on("mouseout", this.dotsMouseOut.bind(this));
    if (this.showLabel || this.showLabelOnHover) {
      dataIterable = new DataIterable(this.cleanData);
      this.dots.selectAll("text")
        .data(dataIterable)
        .enter()
        .append("text")
        .text((d: CleanDataItem) => d.label)
        .attr("x", (d: CleanDataItem) => x(d.xValue))
        .attr("y", (d: CleanDataItem) => y(d.yValue))
        .attr('id', (d: CleanDataItem) => "TEXT_" + d.ID)
        .attr("fill", "white")
        .attr("display", this.showLabelOnHover ? 'none' : 'block')
    }
  }

  private dotsMouseOut(evt: MouseEvent): void {
    const dotElement = evt.target as HTMLElement | null;
    this.toggleDotText(dotElement, false);
  }

  private dotsMouseOver(evt: MouseEvent): void {
    const dotElement = evt.target as HTMLElement | null;
    this.toggleDotText(dotElement, true);
  }

  private toggleDotText(dotElement: HTMLElement | null, show: boolean): void {
    if (dotElement) {
      const dataId = dotElement.id.substring(dotElement.id.indexOf('_') + 1);
      const textId = "TEXT_" + dataId.replaceAll('.', '\\.');
      const selection = d3.select(textId);
      const textElem = selection?.node() as HTMLElement | null;
      if (textElem) {
        textElem.setAttribute('display', show ? 'block' : 'none');
      }
    }
  }

  private createCleanData(): CleanData {
    let cd: CleanData = {};
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

  private sortData(d: CleanData): CleanData {
    const ordered = Object.keys(d).sort().reduce(
      (obj: CleanData, key: string) => {
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
          this.focusSvg(true);
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
        evt.preventDefault();
      }
    }
  }

  private getDataPointById(dataId: string): DataPoint | null {
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

  private createNode(node: TreeNode): HTMLElement {
      const nodeElem = document.createElement('div');
      nodeElem.setAttribute('aria-label', node.getDescription());
      nodeElem.setAttribute('tabindex', '-1');
      nodeElem.setAttribute('class', 'TreeNode');
      const leftData = (node as Branch).getLeftTreeNode?.();
      const rightData = (node as Branch).getRightTreeNode?.();
      const children = (node as Branch).getChildren?.();
      if (leftData) {
        const leftNode = this.createNode(leftData);
        nodeElem.appendChild(leftNode);
      }
      if (rightData) {
        const rightNode = this.createNode(rightData);
        nodeElem.appendChild(rightNode);
      }
      if (children?.length) {
        for (const child of children) {
          const childNode = this.createNode(child);
          nodeElem.appendChild(childNode);
        }
      }
      return nodeElem;
  }

  private buildTreeNav(): void {
    const navContainer = d3.select('[id="' + this.figureId.replaceAll('.', '\\.')+ '_NAV"]')?.node();
    if (navContainer && this.treeData) {
      (navContainer as HTMLElement).appendChild(this.createNode(this.treeData.getRoot()));
    }
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
    const selection = d3.select('[id="' + id.replaceAll('.', '\\.')+ '"]');
    const node = selection.node() as HTMLElement | null;
    if (node) {
      if (this.focusedElement != null) {
        this.blurElement(this.focusedElement);
      }
      node.focus();
      node.setAttribute("tabindex", "0");
      this.focusedElement = id;
    }
  }

  private setNewCurrentNode(node?: HTMLElement | null): void {
    if (node) {
      if (this.currentNode) {
        this.currentNode.setAttribute('tabindex', '-1');
        this.currentNode.setAttribute('class', 'TreeNode');
        this.currentNode.removeEventListener('keydown', this.navListener.bind(this));
      }
      if (node.classList.contains('TreeNode')) {
        this.currentNode = node;
        node.setAttribute('tabindex', '0');
        node.setAttribute('class', 'TreeNode Current');
        node.addEventListener('keydown', this.navListener.bind(this));
      } else {
        this.currentNode = null;
      }
      node.focus();
    }
  }

  private getSibling(currIdx: number, left?: boolean, siblings?: Array<HTMLElement>): HTMLElement | null {
    if (siblings?.length) {
      let newIdx = left ? currIdx - 1 : currIdx + 1;
      if (newIdx >= 0 && newIdx < siblings.length) {
        return siblings[newIdx];
      }
    }
    return null;
  }

  private navListener(evt: KeyboardEvent) {
    if (this.keyNavTimeOut) {
      clearTimeout(this.keyNavTimeOut);
    }
    this.keyNavTimeOut = window.setTimeout(() => {
      if (!this.currentNode && evt.target) {
        this.currentNode = evt.target as HTMLElement;
      }
      if (this.currentNode) {
        let siblings: Array<HTMLElement> = [];
        let siblingElements = this.currentNode.parentElement?.childNodes;
        let currIdx = -1;
        if (siblingElements?.length) {
          console.log(siblingElements);
          for (let siblingIdx = 0; siblingIdx < siblingElements.length; ++siblingIdx) {
            if ((siblingElements[siblingIdx] as HTMLElement).classList?.contains('TreeNode')) {
              siblings.push(siblingElements[siblingIdx] as HTMLElement);
            }
          }
          for (let idx = 0; idx < siblings.length; ++idx) {
            if (siblings[idx].classList.contains('Current')) {
              currIdx = idx;
              break;
            }
          }
        }
        let newNode: HTMLElement | null = null;
        if (evt.key === 'ArrowUp' || (evt.key === 'Tab' && evt.shiftKey)) {
          newNode = this.currentNode.parentElement as HTMLElement | null;
        } else if (evt.key === 'ArrowLeft') {
          newNode = this.getSibling(currIdx, true, siblings);
        } else if (evt.key === 'ArrowRight') {
          newNode = this.getSibling(currIdx, false, siblings);
        } else if (evt.key === 'Tab' && !evt.shiftKey) {
          const children = this.currentNode.querySelectorAll('.TreeNode');
          if (children.length) {
            newNode = children[0] as HTMLElement;
          }
        }
        if (newNode) {
          this.setNewCurrentNode(newNode);
        }
      }
      evt.preventDefault();
    }, 0);
  }

  private svgKeyDown(evt: KeyboardEvent): void {
    if (evt.key === 'Enter') {
      const navContainer = d3.select('[id="' + this.figureId.replaceAll('.', '\\.')+ '_NAV"]')?.node();
      if (navContainer) {
        const rootNode = (navContainer as HTMLElement).querySelector('.TreeNode') as HTMLElement | null;
        if (rootNode) {
          this.currentNode = rootNode;
          rootNode.setAttribute('tabindex', '0');
          rootNode.setAttribute('class', 'TreeNode Current');
          rootNode.addEventListener('keydown', this.navListener.bind(this));
          rootNode.focus();
        }
      }
    }
  }

}
