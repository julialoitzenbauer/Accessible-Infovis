import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import * as d3 from 'd3';
import { D3Selection } from 'src/types';
import { CleanData } from './barTypes';
import { IDGenerator } from './IDGenerator';

enum SEARCH_MENU {
  Y,
  LABEL,
}

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
  @Input()
  description: string = '';

  private cleanData: Array<CleanData> = [];
  private svg?: D3Selection;
  private maxY: number = -1;
  private maxId?: string;
  private minId?: string;
  private focusedBar?: string;
  private selectedSearchMenu?: SEARCH_MENU | null;
  barId: string;
  menuId: string;
  menuIsOpen: boolean;
  searchMenuIsOpen: boolean;
  showSearchform: boolean;
  searchMenuPlaceholder: string;

  @ViewChild('figureElement') figureElement: ElementRef<HTMLElement> | undefined;
  @ViewChild('menuButton') menuButton: ElementRef<HTMLElement> | undefined;
  @ViewChild('menuList') menuList: ElementRef<HTMLElement> | undefined;
  @ViewChild('liveRegion') liveRegion: ElementRef<HTMLElement> | undefined;
  @ViewChild('searchMenuButton') searchMenuButton: ElementRef<HTMLElement> | undefined;
  @ViewChild('searchMenuList') searchMenuList: ElementRef<HTMLElement> | undefined;
  @ViewChild('searchFieldInput') searchFieldInput: ElementRef<HTMLInputElement> | undefined;
  @ViewChild('searchFieldSubmitBtn') searchFieldSubmitBtn: ElementRef<HTMLElement> | undefined;

  constructor() {
    this.barId = IDGenerator.getId();
    this.menuId = this.barId + '_MENU';
    this.menuIsOpen = false;
    this.searchMenuIsOpen = false;
    this.showSearchform = false;
    this.searchMenuPlaceholder = '';
  }

  ngOnInit(): void {
    setTimeout(() => {
      this.createCleanData();
      this.createSvg();
      this.drawBars();
    }, 0);
  }

  menuKeyDown(evt: KeyboardEvent): void {
    if (evt.key === 'Enter' || evt.key === ' ' || evt.key === 'ArrowDown' || evt.key === 'ArrowUp') {
      this.menuIsOpen = true;
      setTimeout(() => {
        if (this.menuList?.nativeElement) {
          const items = this.menuList.nativeElement.querySelectorAll('li');
          let idx = evt.key === 'ArrowUp' ? items.length - 1 : 0;
          items[idx].setAttribute('tabindex', '0');
          items[idx].focus();
        }
      }, 0);
    } else if (evt.key === 'Escape') {
      this.focusSvg(true);
    }
    evt.preventDefault();
  }

  menuItemKeyDown(evt: KeyboardEvent, targetIdx: number): void {
    if (evt.key === 'Enter' || evt.key === ' ') {
      switch(targetIdx) {
        case 0:
          if (this.cleanData?.length) {
            this.focusBar(this.cleanData[0].ID);
          }
          break;
        case 1:
          if (this.liveRegion?.nativeElement) {
            this.liveRegion.nativeElement.innerHTML = '';
            const descriptionTag = document.createElement('p');
            descriptionTag.innerText = this.description || '';
            this.liveRegion.nativeElement.appendChild(descriptionTag);
          }
          break;
      }
    } else if (evt.key === 'Escape') {
      if (this.menuButton?.nativeElement) {
        this.menuButton.nativeElement.focus();
        this.menuIsOpen = false;
      }
    } else if (evt.key === 'ArrowDown' || evt.key === 'ArrowUp') {
      if (this.menuList?.nativeElement) {
        const items = this.menuList.nativeElement.querySelectorAll('li');
        let newIdx = evt.key === 'ArrowDown' ? targetIdx + 1 : targetIdx - 1;
        if (newIdx < 0) newIdx = items.length - 1;
        else if (newIdx >= items.length) newIdx = 0;
        items[targetIdx].removeAttribute('tabindex');
        items[newIdx].setAttribute('tabindex', '0');
        items[newIdx].focus();
      }
    }
    evt.preventDefault();
  }

  searchMenuKeyDown(evt: KeyboardEvent, idx: number): void {
    if (evt.key === 'Enter' || evt.key === ' ') {
      this.searchMenuIsOpen = true;
      setTimeout(() => {
        if (this.searchMenuList?.nativeElement) {
          const items = this.searchMenuList.nativeElement.querySelectorAll('li');
          items[0].setAttribute('tabindex', '0');
          items[0].focus();
        }
      }, 0);
    } else if (evt.key === 'ArrowDown' || evt.key === 'ArrowUp') {
      if (this.menuList?.nativeElement) {
        const items = this.menuList.nativeElement.querySelectorAll('li');
        let newIdx = evt.key === 'ArrowDown' ? idx + 1 : idx - 1;
        if (newIdx >= items?.length) newIdx = 0;
        if (newIdx < 0) newIdx = items.length - 1;
        items[idx].removeAttribute('tabindex');
        items[newIdx].setAttribute('tabindex', '0');
        items[newIdx].focus();
      }
    } else if (evt.key === 'Escape') {
      this.menuIsOpen = false;
      if (this.menuButton?.nativeElement) {
        this.menuButton.nativeElement.focus();
      }
    }
    evt.preventDefault();
  }

  searchMenuItemKeyDown(evt: KeyboardEvent, idx: number): void {
    if (evt.key === 'ArrowDown' || evt.key === 'ArrowUp') {
      if (this.searchMenuList?.nativeElement) {
        const items = this.searchMenuList.nativeElement.querySelectorAll('li');
        let newIdx = evt.key === 'ArrowDown' ? idx + 1 : idx - 1;
        if (newIdx < 0) newIdx = items.length - 1;
        if (newIdx >= items.length) newIdx = 0;
        items[idx].removeAttribute('tabindex');
        items[newIdx].setAttribute('tabindex', '0');
        items[newIdx].focus();
      }
    } else if (evt.key === 'Escape') {
      if (this.searchMenuButton?.nativeElement) {
        this.searchMenuIsOpen = false;
        this.searchMenuButton.nativeElement.focus();
      }
    } else if (evt.key === 'Enter' || evt.key === ' ') {
      if (idx === 0) {
        this.selectedSearchMenu = SEARCH_MENU.Y;
        this.searchMenuPlaceholder = 'Suchen nach y-Achsen Wert';
      } else if (idx === 1) {
        this.selectedSearchMenu = SEARCH_MENU.LABEL;
        this.searchMenuPlaceholder = 'Suchen nach Label';
      } else {
        this.selectedSearchMenu = null;
        this.searchMenuPlaceholder = '';
      }
      if (this.selectedSearchMenu != null) {
        this.showSearchform = true;
        setTimeout(() => {
          if (this.searchFieldInput?.nativeElement) {
            this.searchFieldInput.nativeElement.focus();
          }
        }, 0);
      }
    }
    evt.preventDefault();
    evt.stopPropagation();
  }

  searchFieldInputKeyDown(evt: KeyboardEvent): void {
    if (evt.key === 'Tab' && !evt.shiftKey && evt.target === this.searchFieldInput?.nativeElement) {
      if (this.searchFieldSubmitBtn?.nativeElement) {
        this.searchFieldSubmitBtn.nativeElement.focus();
      }
      evt.preventDefault();
    } else if (evt.key === 'Escape') {
      if (this.searchMenuList?.nativeElement) {
        this.showSearchform = false;
        let searchMenuIdx;
        if (this.selectedSearchMenu === SEARCH_MENU.Y) searchMenuIdx = 0;
        else if (this.selectedSearchMenu === SEARCH_MENU.LABEL) searchMenuIdx = 1;
        if (searchMenuIdx != null) {
          const items = this.searchMenuList.nativeElement.querySelectorAll('li');
          items[searchMenuIdx].focus();
        }
      }
      evt.preventDefault();
    } else if (evt.key === 'Tab') {
      evt.preventDefault();
    }
  }

  searchFieldButtonKeyDown(evt: KeyboardEvent): void {
    if (evt.key === 'Tab' && evt.shiftKey && evt.target === this.searchFieldSubmitBtn?.nativeElement) {
      if (this.searchFieldInput?.nativeElement) {
        this.searchFieldInput.nativeElement.focus();
      }
      evt.preventDefault();
    } else if (evt.key === 'Escape') {
      if (this.searchMenuList?.nativeElement) {
        this.showSearchform = false;
        let searchMenuIdx;
        if (this.selectedSearchMenu === SEARCH_MENU.Y) searchMenuIdx = 0;
        else if (this.selectedSearchMenu === SEARCH_MENU.LABEL) searchMenuIdx = 1;
        if (searchMenuIdx != null) {
          const items = this.searchMenuList.nativeElement.querySelectorAll('li');
          items[searchMenuIdx].focus();
        }
      }
      evt.preventDefault();
    } else if (evt.key === 'Tab') {
      evt.preventDefault();
    }
  }

  triggerSearch(evt: SubmitEvent): void {
    if (this.searchFieldInput?.nativeElement) {
      if (this.selectedSearchMenu === SEARCH_MENU.Y) {
        let searchInput = this.searchFieldInput.nativeElement.value;
        let compareType = 0;
        if (searchInput.startsWith('>')) {
          compareType = 1;
          searchInput = searchInput.substring(1).trim();
        } else if (searchInput.startsWith('<')) {
          compareType = -1;
          searchInput = searchInput.substring(1).trim();
        }
        let searchValue = parseFloat(searchInput);
        let filteredData: Array<CleanData> = [];
        this.createCleanData();
        if (compareType === 0) {
          filteredData = this.cleanData.filter((cd: CleanData) => cd.yValue === searchValue);
        } else if (compareType === 1) {
          filteredData = this.cleanData.filter((cd: CleanData) => cd.yValue > searchValue);
        } else if (compareType === -1) {
          filteredData = this.cleanData.filter((cd: CleanData) => cd.yValue < searchValue);
        }
        if (this.figureElement?.nativeElement) {
          if (this.cleanData.length) {
            this.cleanData = filteredData;
            this.figureElement.nativeElement.innerHTML = '';
            this.createSvg();
            this.drawBars();
            this.focusBar(this.cleanData[0].ID);
          }
        }
      } else if (this.selectedSearchMenu === SEARCH_MENU.LABEL) {
        const searchValue = this.searchFieldInput.nativeElement.value;
        this.createCleanData();
        const filteredData: Array<CleanData> = this.cleanData.filter((cd: CleanData) => cd.label.toUpperCase().startsWith(searchValue.toUpperCase()));
        if (this.figureElement?.nativeElement) {
          if (this.cleanData.length) {
            this.cleanData = filteredData;
            this.figureElement.nativeElement.innerHTML = '';
            this.createSvg();
            this.drawBars();
            this.focusBar(this.cleanData[0].ID);
          }
        }
      }
    }
    evt.preventDefault();
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
        if (this.showSearchform && this.searchFieldInput?.nativeElement) {
          if (this.figureElement?.nativeElement) {
            this.createCleanData();
            this.figureElement.nativeElement.innerHTML = '';
            this.createSvg();
            this.drawBars();
          }
          this.searchFieldInput.nativeElement.focus();
        } else if (this.menuList?.nativeElement) {
          this.menuList.nativeElement.querySelectorAll('li')[0].focus();
        }
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
    if (evt.key === 'Enter' && this.menuButton?.nativeElement) {
      this.menuButton.nativeElement.focus();
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