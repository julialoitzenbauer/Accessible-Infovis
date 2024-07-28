import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import * as d3 from 'd3';
import * as Tone from 'tone';
import { D3Selection, D3ScaleLinear } from 'src/types';
import { DataIterable } from './DataIterable';
import { IDGenerator } from './IDGenerator';
import { CleanData, DataPoint } from './scatterTypes';
import {
  MAX_MIDI_NOTE,
  MIDI_NOTES,
  MIN_MIDI_NOTE,
} from '../sonification/midiNotes';

enum SEARCH_MENUS {
  X,
  Y,
  LABEL,
}

enum MENU_TYPES {
  BASE_MENU,
  MARK_MENU,
  SEARCH_MENU,
}

@Component({
  selector: 'app-scatter',
  templateUrl: './scatter.component.html',
  styleUrls: ['./scatter.component.css'],
})
export class ScatterComponent implements OnInit {
  @Input()
  title: string = '';
  @Input()
  labelKey!: string;
  @Input()
  xAxisKey!: string;
  @Input()
  yAxisKey!: string;
  @Input()
  data!: Array<Record<string, number | string>>;
  @Input()
  summary?: string;
  @Input()
  margin: number = 50;
  @Input()
  width: number = 650 - this.margin * 2;
  @Input()
  height: number = 400 - this.margin * 2;
  @Input()
  showLabel: boolean = true;
  @Input()
  radius: number = 7;
  @Input()
  formatXAxisToInt: boolean = false;
  @Input()
  xAxisUnit: string = '';
  @Input()
  yAxisUnit: string = '';
  @Input()
  hideMenu: boolean = true;

  @ViewChild('figureElement') figureElement:
    | ElementRef<HTMLElement>
    | undefined;
  @ViewChild('menuList') menuList: ElementRef<HTMLElement> | undefined;
  @ViewChild('searchMenuList') searchMenuList:
    | ElementRef<HTMLElement>
    | undefined;
  @ViewChild('markMenuList') markMenuList: ElementRef<HTMLElement> | undefined;
  @ViewChild('menuButton') menuButton: ElementRef<HTMLElement> | undefined;
  @ViewChild('liveRegion') liveRegion: ElementRef<HTMLElement> | undefined;
  @ViewChild('searchMenuButton') searchMenuButton:
    | ElementRef<HTMLElement>
    | undefined;
  @ViewChild('searchFieldInput') searchFieldInput:
    | ElementRef<HTMLInputElement>
    | undefined;
  @ViewChild('markMenuButton') markMenuButton:
    | ElementRef<HTMLElement>
    | undefined;
  @ViewChild('deleteMarksButton') deleteMarksButton:
    | ElementRef<HTMLElement>
    | undefined;
  @ViewChild('cancelDeleteMarksButton') cancelDeleteMarksButton:
    | ElementRef<HTMLElement>
    | undefined;
  @ViewChild('figureContainer') figureContainer:
    | ElementRef<HTMLElement>
    | undefined;
  @ViewChild('summaryMenu') summaryMenu: ElementRef<HTMLElement> | undefined;

  private cleanData?: Record<number, Array<CleanData>>;
  private tickData: Array<Array<CleanData>> = [];
  private markedData: Record<number, Array<CleanData>> = {};
  private svg?: D3Selection;
  private dots?: D3Selection;
  private focusedDot?: string | null;
  private cleanDescription?: string;
  private minX?: number;
  private maxX: number = 0;
  private maxY: number = 0;
  private minY?: number;
  private keys: Array<number> = [];
  private currTickIdx: number | null = null;
  private triggeredSearchElem: HTMLElement | null = null;
  private soniIsPlaying: boolean = false;
  isFilteredByMarks: boolean = false;
  scatterId: string;
  menuIsOpen: boolean;
  searchMenuIsOpen: boolean;
  markMenuIsOpen: boolean;
  menuId: string;
  showSearchform: boolean;
  showDeleteMarksForm: boolean;
  selectedSearchMenu: SEARCH_MENUS | null;
  searchMenuPlaceholder: string;
  currNumberOfMarks: number;
  summaryIsHidden: boolean = true;

  constructor() {
    this.scatterId = IDGenerator.getId();
    this.menuIsOpen = false;
    this.searchMenuIsOpen = false;
    this.markMenuIsOpen = false;
    this.menuId = this.scatterId + '_MENU';
    this.showSearchform = false;
    this.selectedSearchMenu = null;
    this.searchMenuPlaceholder = '';
    this.showDeleteMarksForm = false;
    this.currNumberOfMarks = 0;
  }

  async ngOnInit(): Promise<void> {
    setTimeout(async () => {
      this.initAria();
      this.createSvg();
      this.drawPlot();
    });
  }

  menuKeyDown(evt: KeyboardEvent): void {
    if (
      evt.key === 'Enter' ||
      evt.key === ' ' ||
      evt.key === 'ArrowDown' ||
      evt.key === 'ArrowUp'
    ) {
      this.menuIsOpen = !this.menuIsOpen;
      this.enterMenuList(MENU_TYPES.BASE_MENU, evt);
    } else if (evt.key === 'Escape') {
      this.focusSvg(true);
    }
    evt.preventDefault();
  }

  menuClick(): void {
    this.menuIsOpen = true;
    setTimeout(() => {
      const list = this.menuList;
      if (list?.nativeElement) {
        const menuItems = list.nativeElement.querySelectorAll('li');
        const itemIdx = 0;
        menuItems[itemIdx].tabIndex = 0;
        menuItems[itemIdx].focus();
      }
    }, 0);
  }

  menuItemKeyDown(evt: KeyboardEvent, targetIdx: number): void {
    if (evt.key === 'ArrowDown' || evt.key === 'ArrowUp') {
      this.navInMenuList(MENU_TYPES.BASE_MENU, evt);
    } else if (evt.key === 'Escape') {
      if (this.menuButton?.nativeElement) {
        this.menuButton.nativeElement.focus();
        this.menuIsOpen = false;
      }
    } else if (evt.key === 'Enter' || evt.key === ' ') {
      this.triggerMenuItem(evt);
    } else if (this.isMenuLetterNavigation(evt)) {
      this.focusNextMenuItemByLetter(MENU_TYPES.BASE_MENU, evt.key, targetIdx);
    }
    evt.preventDefault();
  }

  focusSummaryMenu(): void {
    if (this.summaryMenu?.nativeElement) {
      this.summaryMenu.nativeElement.focus();
    }
  }

  searchMenuKeyDown(evt: KeyboardEvent, targetIdx: number): void {
    if (evt.key === 'Enter' || evt.key === ' ') {
      this.searchMenuIsOpen = !this.searchMenuIsOpen;
      this.enterMenuList(MENU_TYPES.SEARCH_MENU, evt);
    } else if (
      evt.key === 'ArrowUp' ||
      evt.key === 'ArrowDown' ||
      evt.key === 'Escape'
    ) {
      this.menuItemKeyDown(evt, targetIdx);
    } else if (this.isMenuLetterNavigation(evt)) {
      this.focusNextMenuItemByLetter(MENU_TYPES.BASE_MENU, evt.key, targetIdx);
    }
    evt.preventDefault();
  }

  markMenuKeyDown(evt: KeyboardEvent, targetIdx: number): void {
    if (evt.key === 'Enter' || evt.key === ' ') {
      this.markMenuIsOpen = true;
      this.enterMenuList(MENU_TYPES.MARK_MENU, evt);
    } else if (
      evt.key === 'ArrowUp' ||
      evt.key === 'ArrowDown' ||
      evt.key === 'Escape'
    ) {
      this.menuItemKeyDown(evt, targetIdx);
    } else if (this.isMenuLetterNavigation(evt)) {
      this.focusNextMenuItemByLetter(MENU_TYPES.BASE_MENU, evt.key, targetIdx);
    }
    evt.preventDefault();
  }

  searchMenuItemKeyDown(evt: KeyboardEvent, targetIdx: number): void {
    if (evt.key === 'ArrowDown' || evt.key === 'ArrowUp') {
      this.navInMenuList(MENU_TYPES.SEARCH_MENU, evt);
    } else if (evt.key === 'Escape') {
      if (this.searchMenuButton?.nativeElement) {
        this.searchMenuButton.nativeElement.focus();
        this.searchMenuIsOpen = false;
      }
    } else if (this.isMenuLetterNavigation(evt)) {
      this.focusNextMenuItemByLetter(
        MENU_TYPES.SEARCH_MENU,
        evt.key,
        targetIdx
      );
    } else if (evt.key === 'Enter' || evt.key === ' ') {
      switch (targetIdx) {
        case 0:
          this.selectedSearchMenu = SEARCH_MENUS.X;
          this.searchMenuPlaceholder = `Suchen nach ${this.xAxisKey}`;
          break;
        case 1:
          this.selectedSearchMenu = SEARCH_MENUS.Y;
          this.searchMenuPlaceholder = `Suchen nach ${this.yAxisKey}`;
          break;
        case 2:
          this.selectedSearchMenu = SEARCH_MENUS.LABEL;
          this.searchMenuPlaceholder = 'Suchen nach Datenpunkt-Name';
          break;
        default:
          this.selectedSearchMenu = null;
          this.searchMenuPlaceholder = '';
          break;
      }
      if (this.selectedSearchMenu != null) {
        this.triggerSearchMenuItem();
      }
    }
    evt.stopPropagation();
    evt.preventDefault();
  }

  markMenuItemKeyDown(evt: KeyboardEvent, targetIdx: number) {
    if (evt.key === 'ArrowDown' || evt.key === 'ArrowUp') {
      this.navInMenuList(MENU_TYPES.MARK_MENU, evt);
    } else if (evt.key === 'Escape') {
      if (this.markMenuButton?.nativeElement) {
        this.markMenuButton.nativeElement.focus();
        this.markMenuIsOpen = false;
      }
    } else if (evt.key === 'Enter' || evt.key === ' ') {
      switch (targetIdx) {
        case 0:
          this.showDeleteMarksForm = true;
          setTimeout(() => {
            if (this.deleteMarksButton?.nativeElement) {
              this.deleteMarksButton.nativeElement.focus();
            }
          }, 0);
          break;
        case 1:
          if (this.isFilteredByMarks) {
            this.cleanData = this.createCleanData();
            if (this.figureElement?.nativeElement)
              this.figureElement.nativeElement.innerHTML = '';
            this.createSvg();
            this.drawPlot();
            this.isFilteredByMarks = false;
          } else {
            this.filterByMarks();
          }
          break;
      }
    } else if (this.isMenuLetterNavigation(evt)) {
      this.focusNextMenuItemByLetter(MENU_TYPES.MARK_MENU, evt.key, targetIdx);
    }
    evt.preventDefault();
  }

  filterByMarks(): void {
    this.isFilteredByMarks = true;
    this.keys = Object.keys(this.markedData).map(Number);
    this.cleanData = this.markedData;
    this.sortData(this.cleanData);
    for (const key of this.keys) {
      let data = this.cleanData[key];
      for (let idx = 0; idx < data.length; ++idx) {
        data[idx].ID = key + '_' + idx;
      }
    }
    if (this.figureElement?.nativeElement)
      this.figureElement.nativeElement.innerHTML = '';
    this.createSvg();
    this.drawPlot();
    if (this.liveRegion?.nativeElement) {
      this.liveRegion.nativeElement.innerHTML = '';
      const descriptionTag = document.createElement('p');
      descriptionTag.innerHTML =
        'Nur die markierten Datenpunkte werden angezeigt.';
      this.liveRegion.nativeElement.appendChild(descriptionTag);
    }
  }

  markFormButtonKeyDown(evt: KeyboardEvent) {
    let target;
    if (evt.target === this.deleteMarksButton?.nativeElement) {
      target = 'DELETE';
    } else if (evt.target === this.cancelDeleteMarksButton?.nativeElement) {
      target = 'CANCEL';
    }
    if (target) {
      if (
        evt.key === 'ArrowLeft' ||
        (evt.key === 'Tab' && evt.shiftKey && target === 'CANCEL')
      ) {
        if (this.deleteMarksButton?.nativeElement) {
          this.deleteMarksButton.nativeElement.focus();
        }
      } else if (
        evt.key === 'ArrowRight' ||
        (evt.key === 'Tab' && !evt.shiftKey && target === 'DELETE')
      ) {
        if (this.cancelDeleteMarksButton?.nativeElement) {
          this.cancelDeleteMarksButton.nativeElement.focus();
        }
      } else if (
        evt.key === 'Escape' ||
        ((evt.key === 'Enter' || evt.key === ' ') && target === 'CANCEL')
      ) {
        this.closeDeleteMarksForm();
      } else if (
        (evt.key === 'Enter' || evt.key === ' ') &&
        target === 'DELETE'
      ) {
        this.markedData = {};
        this.currNumberOfMarks = 0;
        const dots = this.svg?.selectAll('circle')?.nodes();
        if (dots?.length) {
          for (const dot of dots) {
            if (dot) {
              (dot as HTMLElement).classList.remove('marked');
            }
          }
        }
        this.closeDeleteMarksForm();
      }
    }
    evt.preventDefault();
  }

  deleteMarksButtonClick(): void {
    this.markedData = {};
    let notification = `${this.currNumberOfMarks} ${
      this.currNumberOfMarks === 1 ? 'Markierung wurde' : 'Markierungen wurden'
    } gelöscht.`;
    this.currNumberOfMarks = 0;
    const dots = this.svg?.selectAll('circle')?.nodes();
    if (dots?.length) {
      for (const dot of dots) {
        if (dot) {
          (dot as HTMLElement).classList.remove('marked');
        }
      }
    }
    this.closeDeleteMarksForm();
    if (this.liveRegion?.nativeElement) {
      this.liveRegion.nativeElement.innerHTML = '';
      const descriptionTag = document.createElement('p');
      descriptionTag.innerHTML = notification;
      this.liveRegion.nativeElement.appendChild(descriptionTag);
    }
  }

  cancelDeleteMarksButtonClick(): void {
    this.closeDeleteMarksForm();
  }

  searchFieldInputKeyDown(evt: KeyboardEvent): void {
    if (evt.key === 'Tab' && evt.shiftKey) {
      evt.preventDefault();
    } else if (evt.key === 'Escape') {
      this.closeSearchMenu();
    } else if (evt.key === 'Enter') {
      this.triggeredSearchElem = evt.target as HTMLElement;
    }
  }

  searchFieldButtonKeyDown(evt: KeyboardEvent): void {
    if (evt.key === 'Escape') {
      this.closeSearchMenu();
    } else if (evt.key === ' ' || evt.key === 'Enter') {
      this.triggeredSearchElem = evt.target as HTMLElement;
    } else if (evt.key === 'Tab' && !evt.shiftKey) {
      evt.preventDefault();
    }
  }

  triggerSearch(evt: Event): void {
    let numberOfDataPoints = 0;
    this.cleanData = this.createCleanData();
    if (this.searchFieldInput?.nativeElement && this.cleanData) {
      let searchInput: string = this.searchFieldInput.nativeElement.value;
      let searchValue: number | undefined;
      const foundDataPoints: Record<number, Array<CleanData>> = {};
      // -1 = smaller than, 0 = equals, 1 = greater than
      let searchType = 0;
      if (this.selectedSearchMenu !== SEARCH_MENUS.LABEL) {
        if (searchInput.startsWith('>')) {
          searchType = 1;
          searchValue = parseFloat(searchInput.substring(1).trim());
        } else if (searchInput.startsWith('<')) {
          searchType = -1;
          searchValue = parseFloat(searchInput.substring(1).trim());
        } else {
          searchValue = parseFloat(searchInput);
        }
        if (searchValue == null || isNaN(searchValue)) {
          if (this.liveRegion?.nativeElement) {
            this.liveRegion.nativeElement.innerHTML = '';
            const pTag = document.createElement('p');
            pTag.innerHTML =
              'Ungültige Sucheingabe. Bitte versuchen Sie es erneut.';
            this.liveRegion.nativeElement.appendChild(pTag);
          }
          evt.preventDefault();
          return;
        }
      }
      const keys = Object.keys(this.cleanData);
      for (const key of keys) {
        const numericKey = parseFloat(key);
        const keyData = this.cleanData[numericKey];
        let filteredData: Array<CleanData> = [];
        if (this.selectedSearchMenu === SEARCH_MENUS.X) {
          filteredData = keyData.filter((x: CleanData) => {
            if (searchType === -1) return x.xValue < (searchValue as number);
            if (searchType === 1) return x.xValue > (searchValue as number);
            else return x.xValue === searchValue;
          });
        } else if (this.selectedSearchMenu === SEARCH_MENUS.Y) {
          filteredData = keyData.filter((x: CleanData) => {
            if (searchType === -1) return x.yValue < (searchValue as number);
            if (searchType === 1) return x.yValue > (searchValue as number);
            else return x.yValue === searchValue;
          });
        } else if (this.selectedSearchMenu === SEARCH_MENUS.LABEL) {
          filteredData = keyData.filter((x: CleanData) =>
            x.label.toLowerCase().startsWith(searchInput.toLowerCase())
          );
        }
        if (filteredData.length) {
          foundDataPoints[numericKey] = filteredData;
          numberOfDataPoints += filteredData.length;
        }
      }
      this.keys = Object.keys(foundDataPoints).map(Number);
      this.cleanData = this.keys.length ? foundDataPoints : undefined;
    }
    if (this.figureElement?.nativeElement)
      this.figureElement.nativeElement.innerHTML = '';
    this.createSvg();
    this.drawPlot();
    if (this.liveRegion?.nativeElement) {
      this.liveRegion.nativeElement.innerHTML = '';
      const descriptionTag = document.createElement('p');
      if (numberOfDataPoints === 1) {
        descriptionTag.innerHTML =
          'Ein Datenpunkt gefunden. Der gefundene Datenpunkt wird angezeigt.';
      } else if (numberOfDataPoints > 1) {
        descriptionTag.innerHTML = `${numberOfDataPoints} Datenpunkte gefunden. Die gefundenen Datenpunkte werden angezeigt.`;
      } else {
        descriptionTag.innerHTML = 'Keine Datenpunkte gefunden.';
      }
      this.liveRegion.nativeElement.appendChild(descriptionTag);
    }
    evt.preventDefault();
  }

  private closeDeleteMarksForm(): void {
    this.showDeleteMarksForm = false;
    if (this.markMenuList?.nativeElement) {
      const items = this.markMenuList.nativeElement.querySelectorAll('li');
      if (items?.length) {
        items[0].focus();
      }
    }
  }

  private closeSearchMenu(): void {
    this.showSearchform = false;
    this.searchMenuPlaceholder = '';
    if (this.searchMenuList?.nativeElement) {
      const searchListItems =
        this.searchMenuList.nativeElement.querySelectorAll('li');
      let currSelectedSearchListItem;
      switch (this.selectedSearchMenu) {
        case SEARCH_MENUS.X:
          currSelectedSearchListItem = searchListItems[0];
          break;
        case SEARCH_MENUS.Y:
          currSelectedSearchListItem = searchListItems[1];
          break;
        case SEARCH_MENUS.LABEL:
          currSelectedSearchListItem = searchListItems[2];
          break;
      }
      if (currSelectedSearchListItem) {
        currSelectedSearchListItem.focus();
      }
    }
    /* this.cleanData = this.createCleanData();
      if (this.figureElement?.nativeElement) this.figureElement.nativeElement.innerHTML = '';
      this.createSvg();
      this.drawPlot(); */
  }

  private enterMenuList(menuType: MENU_TYPES, evt: KeyboardEvent): void {
    setTimeout(() => {
      const list =
        menuType === MENU_TYPES.SEARCH_MENU
          ? this.searchMenuList
          : menuType === MENU_TYPES.MARK_MENU
          ? this.markMenuList
          : this.menuList;
      if (list?.nativeElement) {
        const menuItems = list.nativeElement.querySelectorAll('li');
        const itemIdx = evt.key === 'ArrowUp' ? menuItems.length - 1 : 0;
        menuItems[itemIdx].tabIndex = 0;
        menuItems[itemIdx].focus();
      }
    }, 0);
  }

  private navInMenuList(menuType: MENU_TYPES, evt: KeyboardEvent): void {
    const target = evt.target as HTMLElement | null;
    const list =
      menuType === MENU_TYPES.SEARCH_MENU
        ? this.searchMenuList
        : menuType === MENU_TYPES.MARK_MENU
        ? this.markMenuList
        : this.menuList;
    if (target) {
      if (evt.key === 'ArrowDown' || evt.key === 'ArrowUp') {
        let next =
          evt.key === 'ArrowDown'
            ? (target.nextElementSibling as HTMLElement | null)
            : (target.previousElementSibling as HTMLElement | null);
        if (evt.key === 'ArrowUp' && !next) {
          next = list?.nativeElement.lastChild as HTMLElement | null;
        }
        if (evt.key === 'ArrowDown' && !next) {
          next = list?.nativeElement.firstChild as HTMLElement | null;
        }
        if (next) {
          target.tabIndex = -1;
          next.tabIndex = 0;
          next.focus();
        }
      }
    }
  }

  private triggerMenuItem(evt: KeyboardEvent): void {
    const target = evt.target as HTMLElement | null;
    if (target) {
      switch (target.id) {
        case 'MenuItemNavigate':
          if (this.keys.length) {
            const tickContainer =
              this.figureElement?.nativeElement?.querySelector(
                '[data-tickContainer="0"]'
              );
            if (tickContainer) {
              tickContainer.setAttribute('tabindex', '0');
              (tickContainer as HTMLElement).focus();
            }
          }
          break;
        case 'MenuItemSummary':
          this.summaryIsHidden = false;
          break;
        case 'MenuItemSonification':
          this.startSonification();
          break;
        case 'MenuItemReset':
          this.cleanData = this.createCleanData();
          if (this.figureElement?.nativeElement)
            this.figureElement.nativeElement.innerHTML = '';
          this.createSvg();
          this.drawPlot();
          break;
      }
    }
  }

  private async startSonification(): Promise<void> {
    if (this.cleanData && this.minX != null && !this.soniIsPlaying) {
      const notes: Record<number, Array<string>> = {};
      const xAxisSpan = this.maxX - this.minX;
      for (const key of this.keys) {
        const cd = this.cleanData[key];
        const dataNotes: Array<string> = [];
        for (const d of cd) {
          dataNotes.push(this.calcSoniNote(d.yValue));
        }
        const xAxisAbsoluteValue = key - this.minX;
        const xAxisRatio: number = xAxisAbsoluteValue / xAxisSpan;
        const playTime = 5 * xAxisRatio;
        notes[playTime] = dataNotes;
      }

      const synth = new Tone.PolySynth(Tone.Synth).toDestination();
      const noteKeys = Object.keys(notes).map(Number);
      noteKeys.sort((a: number, b: number) => a - b);
      for (let idx = 0; idx < noteKeys.length; ++idx) {
        const dataNotes = notes[noteKeys[idx]];
        let delay = Tone.now();
        delay += noteKeys[idx];
        synth.triggerAttackRelease(dataNotes, '8n', delay);
      }
      this.soniIsPlaying = true;
      setTimeout(() => {
        this.soniIsPlaying = false;
      }, 5000);
    }
  }

  private calcSoniNote(value: number): string {
    let note = '';
    if (this.minY != null) {
      let noteVal = Math.round(
        MIN_MIDI_NOTE +
          ((value - this.minY) / (this.maxY - this.minY)) *
            (MAX_MIDI_NOTE - MIN_MIDI_NOTE)
      );
      if (noteVal < MIN_MIDI_NOTE) noteVal = MIN_MIDI_NOTE;
      if (noteVal > MAX_MIDI_NOTE) noteVal = MAX_MIDI_NOTE;
      const midiNote = MIDI_NOTES.filter((mn) => mn.midi === noteVal);
      if (midiNote.length) note = midiNote[0].note;
    }
    return note;
  }

  private triggerSearchMenuItem(): void {
    this.showSearchform = true;
    setTimeout(() => {
      if (this.searchFieldInput?.nativeElement) {
        this.searchFieldInput.nativeElement.focus();
      }
    }, 0);
  }

  private focusNextMenuItemByLetter(
    menuType: MENU_TYPES,
    letter: string,
    targetIdx: number
  ): void {
    const list =
      menuType === MENU_TYPES.SEARCH_MENU
        ? this.searchMenuList
        : menuType === MENU_TYPES.MARK_MENU
        ? this.markMenuList
        : this.menuList;
    if (list?.nativeElement) {
      const listElements = list.nativeElement.querySelectorAll('li');
      let currIdx = targetIdx + 1;
      if (currIdx > listElements.length - 1) currIdx = 0;
      let found = false;
      while (currIdx !== targetIdx && !found) {
        const listElem = listElements[currIdx];
        if (listElem.textContent?.toLowerCase()?.startsWith(letter)) {
          found = true;
          break;
        }
        currIdx += 1;
        if (currIdx > listElements.length - 1) currIdx = 0;
      }
      if (found) {
        listElements[targetIdx].removeAttribute('tabindex');
        listElements[currIdx].setAttribute('tabindex', '0');
        listElements[currIdx].focus();
      }
    }
  }

  private initAria(): void {
    this.cleanData = this.createCleanData();
    this.cleanDescription = this.summary || '';
    if (this.cleanDescription) this.cleanDescription += ', ';
    this.cleanDescription +=
      this.xAxisKey + ' (x-Axis) has a span from 0 to ' + this.maxX;
    this.cleanDescription +=
      ', ' + this.yAxisKey + ' (y-Axis) has a span from 0 to ' + this.maxY;
  }

  private isMenuLetterNavigation(evt: KeyboardEvent): boolean {
    const regex = /[a-zA-Z]/;
    return evt.key.length === 1 && regex.test(evt.key);
  }

  private createSvg(): void {
    this.svg = d3
      .select('figure#' + this.scatterId)
      .append('svg')
      .attr('id', 'SVG_' + this.scatterId)
      .attr('width', this.width + this.margin * 2)
      .attr('height', this.height + this.margin * 2)
      .append('g')
      .attr('transform', 'translate(' + this.margin + ',' + this.margin + ')');
  }

  private drawPlot(): void {
    if (!this.svg) return;
    // Add X axis
    if (this.minX == null) this.minX = 0;
    let threshold = (this.maxX - this.minX) * 0.1;
    let minXVal = Math.floor(this.minX - threshold),
      maxXVal = Math.floor(this.maxX + threshold);
    if (minXVal < 0) minXVal = 0;
    const x = d3
      .scaleLinear()
      // .ticks(Math.floor(this.minX - threshold), Math.floor(this.maxX + threshold), 10)
      .domain([
        Math.floor(this.minX - threshold),
        Math.floor(this.maxX + threshold),
      ])
      .range([0, this.width]);
    if (this.formatXAxisToInt) {
      this.svg
        .append('g')
        .attr('transform', 'translate(0,' + this.height + ')')
        .attr('data-xAxis', true)
        .call(
          d3
            .axisBottom(x)
            .tickValues(
              d3.ticks(
                minXVal,
                maxXVal,
                maxXVal - minXVal < 10 ? maxXVal - minXVal : 10
              )
            )
            .tickFormat(d3.format('d'))
        );
    } else {
      this.svg
        .append('g')
        .attr('transform', 'translate(0,' + this.height + ')')
        .attr('data-xAxis', true)
        .call(d3.axisBottom(x).tickValues(d3.ticks(minXVal, maxXVal, 10)));
    }

    // Add Y axis
    const y = d3
      .scaleLinear()
      .domain([0, Math.floor(this.maxY + 0.2 * this.maxY)])
      .range([this.height, 0]);
    this.svg.append('g').call(d3.axisLeft(y));

    // Add dots
    this.addDots(x, y);
    this.addAxisLabels();
    this.createTickContainers();
  }

  private addAxisLabels(): void {
    if (this.svg) {
      this.svg
        .append('text')
        .text(this.xAxisKey)
        .attr('x', this.width - this.margin)
        .attr('y', this.height + 30)
        .attr('fill', 'gray')
        .attr('font-size', '12px');
      this.svg
        .append('text')
        .text(this.yAxisKey)
        .attr('x', 10)
        .attr('y', 12)
        .attr('fill', 'gray')
        .attr('font-size', '12px');
    }
  }

  private addDots(x: D3ScaleLinear, y: D3ScaleLinear): void {
    if (!this.svg || !this.cleanData) return;
    let dataIterable = new DataIterable(this.cleanData);
    this.dots = this.svg.append('g');
    this.dots
      .selectAll('dot')
      .data(dataIterable)
      .enter()
      .append('circle')
      .attr('id', (d: CleanData) => 'DOT_' + d.ID)
      .attr('cx', (d: CleanData) => x(d.xValue))
      .attr('cy', (d: CleanData) => y(d.yValue))
      .attr('r', this.radius)
      .attr('class', 'scatterCircle')
      .attr('role', 'menuitem')
      .style('opacity', 0.5)
      .attr('tabindex', '-1')
      .attr('aria-label', (d: CleanData) => d.label)
      .attr(
        'aria-description',
        (d: CleanData) =>
          this.xAxisKey +
          ': ' +
          d.xValue +
          (this.xAxisUnit ? ' ' + this.xAxisUnit : '') +
          ', ' +
          this.yAxisKey +
          ': ' +
          d.yValue +
          (this.yAxisUnit ? ' ' + this.yAxisUnit : '')
      )
      .attr('display', (d: CleanData) => (d.hidden ? 'none' : 'block'))
      .on('keydown', this.dotKeyDown.bind(this));
    if (this.showLabel) {
      dataIterable = new DataIterable(this.cleanData);
      this.dots
        .selectAll('text')
        .data(dataIterable)
        .enter()
        .append('text')
        .text((d: CleanData) => d.label)
        .attr('x', (d: CleanData) => x(d.xValue))
        .attr('y', (d: CleanData) => y(d.yValue))
        .attr('display', (d: CleanData) => (d.hidden ? 'none' : 'block'))
        .attr('fill', 'white');
    }
  }

  private createTickContainers(): void {
    this.tickData = [];
    if (this.figureElement?.nativeElement) {
      const xAxis = this.figureElement.nativeElement.querySelector(
        '[data-xAxis="true"]'
      );
      if (xAxis) {
        const ticks = xAxis.querySelectorAll('.tick');
        if (ticks.length) {
          let idx = 0;
          const figureRect =
            this.figureElement.nativeElement.getBoundingClientRect();
          while (idx < ticks.length - 1) {
            const tickLine = ticks[idx].querySelector('line');
            const nextTickLine = ticks[idx + 1].querySelector('line');
            const tickValue = parseFloat(
              ticks[idx].querySelector('text')?.textContent || ''
            );
            const nextTickValue = parseFloat(
              ticks[idx + 1].querySelector('text')?.textContent || ''
            );
            if (
              tickLine &&
              nextTickLine &&
              tickValue != null &&
              !isNaN(tickValue) &&
              nextTickValue != null &&
              !isNaN(nextTickValue)
            ) {
              const tickRect = tickLine.getBoundingClientRect();
              let leftValue = tickRect.left - figureRect.left;
              const rightValue =
                nextTickLine.getBoundingClientRect().left - figureRect.left;
              const width = rightValue - leftValue;
              const tickContainer = document.createElement('div');
              tickContainer.style.position = 'absolute';
              tickContainer.style.width = width + 'px';
              tickContainer.style.left = leftValue + 'px';
              tickContainer.style.height = this.height + 'px';
              tickContainer.style.bottom =
                figureRect.bottom - xAxis.getBoundingClientRect().top + 'px';
              tickContainer.setAttribute('data-tickContainer', idx.toString());
              tickContainer.setAttribute('role', 'menuitem');
              tickContainer.onkeydown = this.onTickContainerKeyDown.bind(this);
              this.figureElement.nativeElement.appendChild(tickContainer);
              if (this.cleanData && this.keys?.length) {
                const currTickData: Array<CleanData> = [];
                let tickKeys = [];
                if (idx === 0) {
                  tickKeys = this.keys.filter(
                    (x: number) => x <= nextTickValue
                  );
                } else {
                  tickKeys = this.keys.filter(
                    (x: number) => x > tickValue && x <= nextTickValue
                  );
                }
                for (const tickKey of tickKeys) {
                  const cd = this.cleanData[tickKey];
                  if (cd) {
                    currTickData.push(...cd);
                  }
                }
                this.tickData.push(
                  currTickData.sort(
                    (a: CleanData, b: CleanData) => a.yValue - b.yValue
                  )
                );
                if (currTickData.length) {
                  let minTickY = Math.min(
                    ...currTickData.map((item) => item.yValue)
                  );
                  let maxTickY = Math.max(
                    ...currTickData.map((item) => item.yValue)
                  );
                  tickContainer.setAttribute(
                    'aria-label',
                    `Daten von ${tickValue} ${
                      this.xAxisUnit
                    } bis inklusive ${nextTickValue} ${this.xAxisUnit} ${
                      this.xAxisKey
                    } und von ${minTickY} ${this.yAxisUnit} bis ${maxTickY} ${
                      this.yAxisUnit
                    } ${this.yAxisKey}. Enthält ${currTickData.length} ${
                      currTickData.length === 1 ? 'Datenpunkt' : 'Datenpunkte'
                    }.`
                  );
                } else {
                  tickContainer.setAttribute(
                    'aria-label',
                    `Daten von ${tickValue} ${
                      this.xAxisUnit
                    } bis inklusive ${nextTickValue} ${this.xAxisUnit} ${
                      this.xAxisKey
                    }. Enthält ${currTickData.length} ${
                      currTickData.length === 1 ? 'Datenpunkt' : 'Datenpunkte'
                    }.`
                  );
                }
                tickContainer.setAttribute(
                  'aria-description',
                  'Drücken Sie Enter um in die Daten zu navigieren'
                );
              }
            }
            idx += 1;
          }
        }
      }
    }
  }

  private onTickContainerKeyDown(evt: KeyboardEvent): void {
    if (evt.target) {
      const target = evt.target as HTMLElement;
      const currTickIdx = parseInt(
        target.getAttribute('data-tickContainer') || ''
      );
      if (evt.key === 'ArrowRight' || evt.key === 'ArrowLeft') {
        if (currTickIdx != null && !isNaN(currTickIdx)) {
          let newTickIdx =
            evt.key === 'ArrowRight' ? currTickIdx + 1 : currTickIdx - 1;
          if (newTickIdx >= this.tickData.length)
            newTickIdx = this.tickData.length - 1;
          if (newTickIdx < 0) newTickIdx = 0;
          const newTickContainer =
            this.figureElement?.nativeElement.querySelector(
              `[data-tickContainer="${newTickIdx}"`
            );
          if (newTickContainer) {
            target.removeAttribute('tabindex');
            newTickContainer.setAttribute('tabindex', '0');
            (newTickContainer as HTMLElement).focus();
          }
        }
      } else if (evt.key === 'Enter') {
        if (currTickIdx != null && !isNaN(currTickIdx)) {
          const tickToFocus = this.tickData[currTickIdx];
          if (tickToFocus?.length) {
            const dotToFocus = tickToFocus[0];
            this.focusDot(dotToFocus.ID);
            this.currTickIdx = currTickIdx;
          }
        }
      } else if (evt.key === 'Escape') {
        (evt.target as HTMLElement).removeAttribute('tabindex');
        if (this.searchFieldInput?.nativeElement) {
          if (this.triggeredSearchElem) {
            this.triggeredSearchElem.focus();
            this.triggeredSearchElem = null;
          } else {
            this.searchFieldInput.nativeElement.focus();
          }
        } else if (this.menuList?.nativeElement) {
          const items = this.menuList.nativeElement.querySelectorAll('li');
          items[2].focus();
        }
      }
    }
    evt.preventDefault();
    evt.stopPropagation();
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
      if (this.minY == null || obj.yValue < this.minY) this.minY = obj.yValue;
      if (obj.yValue > this.maxY) this.maxY = obj.yValue;
      if (!cd[xValue]) {
        cd[xValue] = [obj];
      } else {
        let insertIndex = -1;
        for (let index = 0; index < cd[xValue].length; ++index) {
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
      for (let idx = 0; idx < entry.length; ++idx) {
        entry[idx].ID = key + '_' + idx;
      }
    }
    return cd;
  }

  private sortData(
    d: Record<number, Array<CleanData>>
  ): Record<number, Array<CleanData>> {
    const ordered = Object.keys(d)
      .sort()
      .reduce((obj: Record<number, Array<CleanData>>, key: string) => {
        const numericKey = parseFloat(key);
        obj[numericKey] = d[numericKey];
        return obj;
      }, {});
    return ordered;
  }

  private dotKeyDown(evt: KeyboardEvent): void {
    if (evt.target && this.currTickIdx != null) {
      const target = evt.target as HTMLElement;
      const tickData = this.tickData[this.currTickIdx];
      if (evt.key === 'ArrowUp' || evt.key === 'ArrowDown') {
        const dataID = target.id.substring('DOT_'.length);
        const currDotIdx = this.tickData[this.currTickIdx]
          .map((cd: CleanData) => cd.ID)
          .indexOf(dataID);
        if (currDotIdx !== -1) {
          let newDotIdx =
            evt.key === 'ArrowUp' ? currDotIdx + 1 : currDotIdx - 1;
          if (newDotIdx >= tickData.length) newDotIdx = tickData.length - 1;
          if (newDotIdx < 0) newDotIdx = 0;
          target.removeAttribute('tabindex');
          this.focusDot(this.tickData[this.currTickIdx][newDotIdx].ID);
        }
      } else if (evt.key === 'Escape') {
        const tickContainer = this.figureElement?.nativeElement.querySelector(
          `[data-tickContainer="${this.currTickIdx}"]`
        );
        if (tickContainer) {
          target.removeAttribute('tabindex');
          tickContainer.setAttribute('tabindex', '0');
          (tickContainer as HTMLElement).focus();
          this.currTickIdx = null;
        }
      } else if (
        evt.key === 'M' &&
        evt.shiftKey &&
        this.cleanData &&
        !this.isFilteredByMarks
      ) {
        const dataID = target.id.substring('DOT_'.length);
        const currDotIdx = this.tickData[this.currTickIdx]
          .map((cd: CleanData) => cd.ID)
          .indexOf(dataID);
        let removeMark = false;
        if (currDotIdx !== -1) {
          const cleanDataToMark = this.tickData[this.currTickIdx][currDotIdx];
          if (!this.markedData[cleanDataToMark.xValue]) {
            this.markedData[cleanDataToMark.xValue] = [cleanDataToMark];
            target.setAttribute(
              'aria-label',
              cleanDataToMark.label + ', markiert'
            );
          } else {
            if (
              this.markedData[cleanDataToMark.xValue].includes(cleanDataToMark)
            ) {
              removeMark = true;
              let removeIdx =
                this.markedData[cleanDataToMark.xValue].indexOf(
                  cleanDataToMark
                );
              this.markedData[cleanDataToMark.xValue].splice(removeIdx, 1);
              if (this.markedData[cleanDataToMark.xValue].length === 0) {
                delete this.markedData[cleanDataToMark.xValue];
              }
              target.setAttribute('aria-label', cleanDataToMark.label);
            } else {
              this.markedData[cleanDataToMark.xValue].push(cleanDataToMark);
              target.setAttribute(
                'aria-label',
                cleanDataToMark.label + ', markiert'
              );
            }
          }
          this.currNumberOfMarks = removeMark
            ? this.currNumberOfMarks - 1
            : this.currNumberOfMarks + 1;
          this.markDot(cleanDataToMark.ID, removeMark);
        }
      } else if (evt.key.toUpperCase() === 'S' && evt.shiftKey) {
        const dataID = target.id.substring('DOT_'.length);
        const currDotIdx = this.tickData[this.currTickIdx]
          .map((cd: CleanData) => cd.ID)
          .indexOf(dataID);
        if (currDotIdx != -1) {
          const note = this.calcSoniNote(
            this.tickData[this.currTickIdx][currDotIdx].yValue
          );
          const synth = new Tone.PolySynth(Tone.Synth).toDestination();
          synth.triggerAttackRelease(note, '8n');
        }
      }
    }
    evt.preventDefault();
    evt.stopPropagation();
  }

  /* private dotKeyDown(evt: KeyboardEvent): void {
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
          if (this.markMenuIsOpen && this.markMenuList?.nativeElement) {
            this.cleanData = this.createCleanData();
            const listItems = this.markMenuList.nativeElement.querySelectorAll('li');
            listItems[listItems.length - 1].focus();
            if (this.figureElement?.nativeElement) this.figureElement.nativeElement.innerHTML = '';
            this.createSvg();
            this.drawPlot();
          } else if (this.searchFieldInput?.nativeElement) {
            this.searchFieldInput.nativeElement.focus();
          } else if (this.menuList?.nativeElement) {
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
        } else if (evt.key === 'M' && evt.shiftKey) {
          const cleanDataToMark = this.cleanData[dataPoint.key][dataPoint.idx];
          let removeMark = false;
          if (!this.markedData[dataPoint.key]) {
            this.markedData[dataPoint.key] = [cleanDataToMark];
          } else {
            if (this.markedData[dataPoint.key].includes(cleanDataToMark)) {
              removeMark = true;
              let removeIdx = this.markedData[dataPoint.key].indexOf(cleanDataToMark);
              this.markedData[dataPoint.key].splice(removeIdx, 1);
              if (this.markedData[dataPoint.key].length === 0) {
                delete this.markedData[dataPoint.key];
              }
            } else {
              this.markedData[dataPoint.key].push(cleanDataToMark);
            }
          }
          this.currNumberOfMarks = removeMark ? this.currNumberOfMarks - 1 : this.currNumberOfMarks + 1;
          this.markDot(dataPoint.key + '_' + dataPoint.idx, removeMark);
        }
      }
      if (newDataPoint) {
        this.focusDot(newDataPoint.key + '_' + newDataPoint.idx);
      }
    }
    evt.preventDefault();
  } */

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

  private horizontalNav(
    currDataPoint: DataPoint,
    toLeft: boolean
  ): DataPoint | null {
    const currKeyIdx = this.keys.indexOf(currDataPoint.key);
    if (currKeyIdx !== -1 && this.cleanData) {
      const newKeyIdx = toLeft ? currKeyIdx - 1 : currKeyIdx + 1;
      if (newKeyIdx >= 0 && newKeyIdx < this.keys.length) {
        const newKey = this.keys[newKeyIdx];
        let nearestItemIdx = -1;
        let nearesOffset = undefined;
        const currDataPointValue =
          this.cleanData[currDataPoint.key][currDataPoint.idx].yValue;
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
        };
      }
    }
    return null;
  }

  private verticalNav(currDataPoint: DataPoint, up: boolean): DataPoint | null {
    if (this.cleanData) {
      const newDataIdx = up ? currDataPoint.idx + 1 : currDataPoint.idx - 1;
      if (
        newDataIdx >= 0 &&
        newDataIdx < this.cleanData[currDataPoint.key].length
      ) {
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
      node.setAttribute('tabindex', '0');
      node.classList.add('current');
      this.focusedDot = id;
    }
  }

  private markDot(id: string, removeMark?: boolean) {
    const selection = d3.select('#DOT_' + id.replaceAll('.', '\\.'));
    const node = selection.node() as HTMLElement | null;
    if (node) {
      if (removeMark) {
        node.classList.remove('marked');
      } else {
        node.classList.add('marked');
      }
    }
  }

  private blurDot(id: string) {
    const selection = d3.select('#DOT_' + id.replaceAll('.', '\\.'));
    const node = selection.node() as HTMLElement | null;
    if (node) {
      node.setAttribute('tabindex', '-1');
      node.blur();
      node.classList.remove('current');
    }
  }

  svgKeyDown(evt: KeyboardEvent): void {
    if (evt.key === 'Enter') {
      if (this.menuButton?.nativeElement) {
        this.menuButton.nativeElement.tabIndex = 0;
        this.menuButton.nativeElement.focus();
      }
    }
  }

  private focusSvg(blurCurrDot?: boolean): void {
    if (this.figureContainer?.nativeElement) {
      if (this.menuButton?.nativeElement) {
        this.menuButton.nativeElement.tabIndex = -1;
      }
      if (blurCurrDot && this.focusedDot != null) {
        this.blurDot(this.focusedDot);
      }
      this.figureContainer.nativeElement.focus();
    }
  }
}
