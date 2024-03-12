import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import * as d3 from 'd3';
import * as Tone from 'tone';
import { D3ScaleLinear, D3ScaleTime, D3Selection } from 'src/types';
import { IDGenerator } from './IDGenerator';
import { CleanData, CleanDataObj, CleanDotData } from './lineTypes';
import { data as importData } from './testData';
import {
  MAX_MIDI_NOTE,
  MIDI_NOTES,
  MIN_MIDI_NOTE,
} from '../sonification/midiNotes';

enum SEARCH_MENUS {
  X,
  LABEL,
}

@Component({
  selector: 'app-line',
  templateUrl: './line.component.html',
  styleUrls: ['./line.component.css'],
})
export class LineComponent implements OnInit {
  @Input()
  labelKey: string = '';
  @Input()
  margin: number = 50;
  @Input()
  width: number = 750 - this.margin * 2;
  @Input()
  height: number = 400 - this.margin * 2;
  @Input()
  chartTitle: string = 'Line Chart';
  @Input()
  description: string = '';
  @Input()
  xAxisKey: string = '';
  @Input()
  yAxisKeys: Array<string> = [];
  @Input()
  yAxisLabel: string = '';
  @Input()
  xAxisLabel: string = '';
  @Input()
  summary: string = '';
  @Input()
  data: Array<Record<string, string | number>> = importData;
  @Input()
  yearlyDates: boolean = false;
  @Input()
  xAxisUnit: string = '';
  @Input()
  yAxisUnit: string = '';
  @Input()
  hideMenu: boolean = false;

  @ViewChild('menuButton') menuButton: ElementRef<HTMLElement> | undefined;
  @ViewChild('liveRegion') liveRegion: ElementRef<HTMLElement> | undefined;
  @ViewChild('figureElement') figureElement:
    | ElementRef<HTMLElement>
    | undefined;
  @ViewChild('menuList') menuList: ElementRef<HTMLElement> | undefined;
  @ViewChild('searchMenuList') searchMenuList:
    | ElementRef<HTMLElement>
    | undefined;
  @ViewChild('searchFieldInput') searchFieldInput:
    | ElementRef<HTMLInputElement>
    | undefined;
  @ViewChild('deleteMarksButton') deleteMarksButton:
    | ElementRef<HTMLButtonElement>
    | undefined;
  @ViewChild('cancelDeleteMarksButton') cancelDeleteMarksButton:
    | ElementRef<HTMLButtonElement>
    | undefined;
  @ViewChild('markMenuList') markMenuList: ElementRef<HTMLElement> | undefined;
  @ViewChild('markMenuButton') markMenuButton:
    | ElementRef<HTMLElement>
    | undefined;
  @ViewChild('figureContainer') figureContainer:
    | ElementRef<HTMLElement>
    | undefined;

  private svg?: D3Selection;
  private maxY: number = -1;
  private minY: number = -1;
  private cleanData: Array<CleanDataObj> = [];
  private markedData: Array<CleanDataObj> = [];
  private soniIsPlaying: boolean = false;
  dates: Array<Date> = [];
  maxMeasurement: number = -1;
  lineId: string;
  menuId: string;
  menuIsOpen: boolean;
  searchMenuIsOpen: boolean = false;
  showSearchform: boolean = false;
  searchMenuPlaceholder: string = '';
  selectedSearchMenu: SEARCH_MENUS | null = null;
  markMenuIsOpen: boolean = false;
  isFilteredByMarks: boolean = false;
  showDeleteMarksForm: boolean = false;

  constructor() {
    this.lineId = IDGenerator.getId();
    this.menuId = this.lineId + '_MENU';
    this.menuIsOpen = false;
  }

  ngOnInit(): void {
    setTimeout(() => {
      this.initCleanData();
      this.createData();

      this.drawChart();
    }, 0);
  }

  private drawChart(): void {
    this.createSvg();
    const xScale = d3.scaleTime().range([0, this.width]);
    const yScale = d3.scaleLinear().rangeRound([this.height, 0]);
    var minDate = this.dates.reduce(function (a, b) {
      return a < b ? a : b;
    });
    var maxDate = this.dates.reduce(function (a, b) {
      return a > b ? a : b;
    });
    xScale.domain([minDate, maxDate]);
    yScale.domain([0, this.maxMeasurement + 4]);

    this.createAxis(xScale, yScale);
    this.createLines(xScale, yScale);
    this.createDots(xScale, yScale);
  }

  menuKeyDown(evt: KeyboardEvent): void {
    if (evt.key === 'Escape' && this.figureContainer?.nativeElement) {
      this.figureContainer.nativeElement.focus();
    } else if (
      evt.key === 'Enter' ||
      evt.key === ' ' ||
      evt.key === 'ArrowDown' ||
      evt.key === 'ArrowUp'
    ) {
      this.menuIsOpen = true;
      setTimeout(() => {
        if (this.menuList?.nativeElement) {
          const items = this.menuList.nativeElement.querySelectorAll('li');
          let itemIdx = 0;
          if (evt.key === 'ArrowUp') {
            itemIdx = items.length - 1;
          }
          items[itemIdx].setAttribute('tabindex', '0');
          items[itemIdx].focus();
        }
      }, 0);
    }
    evt.preventDefault();
  }

  menuItemKeyDown(evt: KeyboardEvent, targetIdx: number): void {
    if (evt.key === 'Enter' || evt.key === ' ') {
      switch (targetIdx) {
        case 0:
          this.focusLine(0);
          break;
        case 1:
          if (this.liveRegion?.nativeElement) {
            this.liveRegion.nativeElement.innerHTML = '';
            const descriptionTag = document.createElement('p');
            descriptionTag.innerHTML = this.summary;
            this.liveRegion.nativeElement.appendChild(descriptionTag);
          }
          break;
        case 3:
          this.startSonification();
          break;
        case 5:
          if (this.figureElement?.nativeElement)
            this.figureElement.nativeElement.innerHTML = '';
          if (this.liveRegion?.nativeElement) {
            this.liveRegion.nativeElement.innerHTML = '';
            const descriptionTag = document.createElement('p');
            descriptionTag.innerHTML = 'Daten wurden zurückgesetzt';
            this.liveRegion.nativeElement.appendChild(descriptionTag);
          }
          this.cleanData = [];
          this.initCleanData();
          this.createData();
          this.drawChart();
          break;
      }
    } else if (evt.key === 'Escape') {
      this.menuIsOpen = false;
      if (this.menuButton?.nativeElement) {
        this.menuButton.nativeElement.focus();
      }
    } else if (evt.key === 'ArrowDown' || evt.key === 'ArrowUp') {
      const menuItems = this.menuList?.nativeElement.querySelectorAll('li');
      if (menuItems?.length) {
        let newIdx = evt.key === 'ArrowDown' ? targetIdx + 1 : targetIdx - 1;
        if (newIdx < 0) newIdx = menuItems.length - 1;
        if (newIdx >= menuItems.length) newIdx = 0;
        menuItems[targetIdx].removeAttribute('tabindex');
        menuItems[newIdx].setAttribute('tabindex', '0');
        (menuItems[newIdx] as HTMLElement).focus();
      }
    }
    evt.preventDefault();
  }

  startSonification(): void {
    if (this.cleanData && !this.soniIsPlaying) {
      for (let dataIdx = 0; dataIdx < this.cleanData.length; ++dataIdx) {
        this.playSoniForLine(
          this.cleanData[dataIdx].values,
          1 / this.cleanData.length
        );
      }
      this.soniIsPlaying = true;
      setTimeout(() => {
        this.soniIsPlaying = false;
      }, 5000);
    }
  }

  playSoniForLine(values: Array<CleanData>, gain: number = 1) {
    var context = new AudioContext();
    var osc = context.createOscillator();
    var volume = context.createGain();
    volume.connect(context.destination);
    volume.gain.value = gain;

    osc.type = 'sine';
    var now = context.currentTime;
    const timePerNote = 5 / values.length;
    for (let valueIdx = 0; valueIdx < values.length - 1; ++valueIdx) {
      const note = this.calcSoniNote(values[valueIdx].measurment);
      const hzNote = Tone.Frequency(note).toFrequency();
      osc.frequency.setValueAtTime(hzNote, now + valueIdx * timePerNote);
      const nextNote = this.calcSoniNote(values[valueIdx + 1].measurment);
      const nextHzNote = Tone.Frequency(nextNote).toFrequency();
      osc.frequency.linearRampToValueAtTime(
        nextHzNote,
        now + (valueIdx + 1) * timePerNote
      );
    }
    osc.connect(volume);
    osc.start(now);
    osc.stop(now + 5);
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

  searchMenuKeyDown(evt: KeyboardEvent, idx: number): void {
    if (evt.key === 'Enter' || evt.key === ' ') {
      this.searchMenuIsOpen = !this.searchMenuIsOpen;
      setTimeout(() => {
        if (this.searchMenuList?.nativeElement) {
          const items =
            this.searchMenuList.nativeElement.querySelectorAll('li');
          items[0].setAttribute('tabindex', '0');
          items[0].focus();
        }
      }, 0);
    } else if (evt.key === 'ArrowUp' || evt.key === 'ArrowDown') {
      if (this.menuList?.nativeElement) {
        const menuItems = this.menuList.nativeElement.querySelectorAll('li');
        let newIdx = evt.key === 'ArrowUp' ? idx - 1 : idx + 1;
        if (newIdx < 0) newIdx = menuItems.length - 1;
        if (newIdx >= menuItems.length) newIdx = 0;
        menuItems[idx].removeAttribute('tabindex');
        menuItems[newIdx].setAttribute('tabindex', '0');
        menuItems[newIdx].focus();
      }
    } else if (evt.key === 'Escape') {
      if (this.menuButton?.nativeElement) {
        this.menuButton.nativeElement.focus();
        this.menuIsOpen = false;
      }
    }
    evt.preventDefault();
  }

  searchMenuItemKeyDown(evt: KeyboardEvent, idx: number): void {
    if (evt.key === 'ArrowUp' || evt.key === 'ArrowDown') {
      if (this.searchMenuList?.nativeElement) {
        let items = this.searchMenuList.nativeElement.querySelectorAll('li');
        let newIdx = evt.key === 'ArrowUp' ? idx - 1 : idx + 1;
        if (newIdx < 0) newIdx = items.length - 1;
        if (newIdx >= items.length) newIdx = 0;
        items[idx].removeAttribute('tabindex');
        items[newIdx].setAttribute('tabindex', '0');
        items[newIdx].focus();
      }
    } else if (evt.key === 'Escape') {
      if (this.menuList?.nativeElement) {
        const menuItems = this.menuList.nativeElement.querySelectorAll('li');
        menuItems[2].setAttribute('tabindex', '0');
        menuItems[2].focus();
        this.searchMenuIsOpen = false;
      }
    } else if (evt.key === 'Enter' || evt.key === ' ') {
      if (idx === 0) {
        this.searchMenuPlaceholder = `Suchen nach ${
          this.yearlyDates ? 'Jahr' : 'Datum'
        }`;
        this.selectedSearchMenu = SEARCH_MENUS.X;
      } else if (idx === 1) {
        this.searchMenuPlaceholder = `Suchen nach Linien-Name`;
        this.selectedSearchMenu = SEARCH_MENUS.LABEL;
      } else {
        this.searchMenuPlaceholder = '';
        this.selectedSearchMenu = null;
      }
      if (this.selectedSearchMenu != null && this.searchMenuPlaceholder) {
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

  triggerSearch(evt: Event): void {
    let searchValue = this.searchFieldInput?.nativeElement.value || '';
    if (searchValue.length) {
      if (this.selectedSearchMenu === SEARCH_MENUS.X) {
        let searchOperator = 0;
        if (searchValue.startsWith('>')) {
          searchOperator = 1;
          searchValue = searchValue.substring(1);
        } else if (searchValue.startsWith('<')) {
          searchOperator = -1;
          searchValue = searchValue.substring(1);
        }
        let searchDate: Date;
        if (this.yearlyDates) {
          searchDate = new Date(parseInt(searchValue).toString());
        } else {
          searchDate = new Date(searchValue);
        }
        if (!searchDate || isNaN(searchDate.getDate())) {
          if (this.liveRegion?.nativeElement) {
            this.liveRegion.nativeElement.innerHTML = '';
            const alertTag = document.createElement('p');
            alertTag.innerHTML = `Ungültiges Datum zur Suche eingegeben. Versuchen Sie es mit dem Format ${
              this.yearlyDates ? '"YYYY"' : '"MM-TT-JJJJ"'
            }`;
            this.liveRegion.nativeElement.appendChild(alertTag);
          }
        } else {
          this.cleanData = [];
          this.initCleanData();
          this.createData();
          let stillHasValues = false;
          searchDate.setHours(0, 0, 0, 0);
          for (const cd of this.cleanData) {
            cd.values = cd.values.filter((value: CleanData) => {
              const valueDate = new Date(value.date);
              if (isNaN(valueDate.getDate())) return false;
              valueDate.setHours(0, 0, 0, 0);
              if (this.yearlyDates) {
                if (searchOperator === 1)
                  return valueDate.getFullYear() > searchDate.getFullYear();
                if (searchOperator === -1)
                  return valueDate.getFullYear() < searchDate.getFullYear();
                return valueDate.getFullYear() === searchDate.getFullYear();
              }
              if (searchOperator === 1) return valueDate > searchDate;
              if (searchOperator === -1) return valueDate < searchDate;
              return valueDate == searchDate;
            });
            if (cd.values?.length) {
              stillHasValues = true;
            }
          }
          if (this.figureElement?.nativeElement)
            this.figureElement.nativeElement.innerHTML = '';
          this.drawChart();
          if (this.liveRegion?.nativeElement) {
            this.liveRegion.nativeElement.innerHTML = '';
            const descriptionTag = document.createElement('p');
            descriptionTag.innerHTML = stillHasValues
              ? 'Daten wurden erfolgreich gefiltert und werden nun angezeigt.'
              : 'Die Suche ergab kein Ergebnis - es werden keine Daten angezeigt.';
            this.liveRegion.nativeElement.appendChild(descriptionTag);
          }
        }
      } else if (this.selectedSearchMenu === SEARCH_MENUS.LABEL) {
        let newData = [];
        this.cleanData = [];
        this.initCleanData();
        this.createData();
        for (const cd of this.cleanData) {
          if (cd.id.toUpperCase().startsWith(searchValue.toUpperCase())) {
            newData.push(cd);
          }
        }
        this.cleanData = newData;
        if (this.figureElement?.nativeElement)
          this.figureElement.nativeElement.innerHTML = '';
        this.drawChart();
        if (this.liveRegion?.nativeElement) {
          this.liveRegion.nativeElement.innerHTML = '';
          const descriptionTag = document.createElement('p');
          descriptionTag.innerHTML = this.cleanData.length
            ? `Daten wurden erfolgreich gefiltert, ${this.cleanData.length} ${
                this.cleanData.length === 1 ? 'Linie wird' : 'Linien werden'
              } angezeigt.`
            : 'Die Suche ergab kein Ergebnis - es werden keine Daten angezeigt.';
          this.liveRegion.nativeElement.appendChild(descriptionTag);
        }
      }
    }
    evt.preventDefault();
  }

  searchFieldInputKeyDown(evt: KeyboardEvent): void {
    if (evt.key === 'Escape') {
      this.goBackToSearchMenu();
    } else if (evt.key === 'Tab' && evt.shiftKey) {
      evt.preventDefault();
    }
  }

  searchFieldButtonKeyDown(evt: KeyboardEvent): void {
    if (evt.key === 'Tab' && !evt.shiftKey) {
      evt.preventDefault();
    } else if (evt.key === 'Escape') {
      this.goBackToSearchMenu();
    }
  }

  private goBackToSearchMenu(): void {
    if (this.searchMenuList?.nativeElement) {
      const items = this.searchMenuList.nativeElement.querySelectorAll('li');
      let item: HTMLElement | undefined;
      if (this.selectedSearchMenu === SEARCH_MENUS.X) {
        item = items[0];
      } else if (this.selectedSearchMenu === SEARCH_MENUS.LABEL) {
        item = items[1];
      }
      if (item) {
        item.setAttribute('tabindex', '0');
        item.focus();
        this.showSearchform = false;
      }
    }
  }

  markMenuKeyDown(evt: KeyboardEvent, idx: number): void {
    if (evt.key === 'Escape') {
      if (this.menuButton?.nativeElement) {
        this.menuButton.nativeElement.focus();
        this.menuIsOpen = false;
      }
    } else if (evt.key === 'ArrowDown' || evt.key === 'ArrowUp') {
      if (this.menuList?.nativeElement) {
        const items = this.menuList.nativeElement.querySelectorAll('li');
        let newIdx = evt.key === 'ArrowDown' ? idx + 1 : idx - 1;
        if (newIdx < 0) newIdx = items.length - 1;
        if (newIdx >= items.length) newIdx = 0;
        items[idx].removeAttribute('tabindex');
        items[newIdx].setAttribute('tabindex', '0');
        items[newIdx].focus();
      }
    } else if (evt.key === 'Enter' || evt.key === ' ') {
      this.markMenuIsOpen = !this.markMenuIsOpen;
      setTimeout(() => {
        if (this.markMenuList?.nativeElement) {
          const items = this.markMenuList.nativeElement.querySelectorAll('li');
          items[0].setAttribute('tabindex', '0');
          items[0].focus();
        }
      }, 0);
    }
    evt.preventDefault();
  }

  markMenuItemKeyDown(evt: KeyboardEvent, idx: number): void {
    if (this.markMenuList?.nativeElement) {
      if (evt.key === 'ArrowDown' || evt.key === 'ArrowUp') {
        const items = this.markMenuList.nativeElement.querySelectorAll('li');
        let newIdx = evt.key === 'ArrowDown' ? idx + 1 : idx - 1;
        if (newIdx < 0) newIdx = items.length - 1;
        if (newIdx >= items.length) newIdx = 0;
        items[idx].removeAttribute('tabindex');
        items[newIdx].setAttribute('tabindex', '0');
        items[newIdx].focus();
      } else if (evt.key === 'Escape') {
        if (this.markMenuButton?.nativeElement) {
          this.markMenuButton.nativeElement.focus();
          this.markMenuIsOpen = false;
        }
      } else if (evt.key === 'Enter' || evt.key === ' ') {
        if (idx === 0) {
          this.showDeleteMarksForm = true;
          setTimeout(() => {
            if (this.deleteMarksButton?.nativeElement) {
              this.deleteMarksButton.nativeElement.focus();
            }
          }, 0);
        } else if (idx === 1) {
          if (this.figureElement?.nativeElement)
            this.figureElement.nativeElement.innerHTML = '';
          if (this.isFilteredByMarks) {
            this.cleanData = [];
            this.initCleanData();
            this.createData();
            this.isFilteredByMarks = false;
          } else {
            this.cleanData = this.markedData;
            this.isFilteredByMarks = true;
          }
          this.drawChart();
        }
      }
    }
    evt.preventDefault();
  }

  markFormButtonKeyDown(evt: KeyboardEvent, idx: number): void {
    if (evt.key === 'Tab') {
      if ((idx === 0 && evt.shiftKey) || (idx === 1 && !evt.shiftKey))
        evt.preventDefault();
    } else if (evt.key === 'Escape') {
      if (this.markMenuList?.nativeElement) {
        const items = this.markMenuList.nativeElement.querySelectorAll('li');
        items[0].focus();
        this.showDeleteMarksForm = false;
        evt.preventDefault();
      }
    } else if (evt.key === 'Enter' || evt.key === ' ') {
      if (idx === 0) {
        const numberOfMarks = this.getCurrNumberOfMarks();
        this.markedData = [];
        if (this.figureElement?.nativeElement)
          this.figureElement.nativeElement.innerHTML = '';
        if (this.liveRegion?.nativeElement) {
          this.liveRegion.nativeElement.innerHTML = '';
          const descriptionTag = document.createElement('p');
          descriptionTag.innerHTML = `${numberOfMarks} Markierungen wurden gelöscht.`;
          this.liveRegion.nativeElement.appendChild(descriptionTag);
        }
        this.drawChart();
      } else if (idx === 1) {
        if (this.markMenuList?.nativeElement) {
          const items = this.markMenuList.nativeElement.querySelectorAll('li');
          items[0].focus();
          this.showDeleteMarksForm = false;
        }
      }
      evt.preventDefault();
    } else if (evt.key === 'ArrowLeft' || evt.key === 'ArrowRight') {
      if (idx === 0 && this.cancelDeleteMarksButton?.nativeElement)
        this.cancelDeleteMarksButton.nativeElement.focus();
      else if (idx === 1 && this.deleteMarksButton?.nativeElement)
        this.deleteMarksButton.nativeElement.focus();
    }
  }

  getCurrNumberOfMarks(): number {
    let markSum = 0;
    for (let idx = 0; idx < this.markedData.length; ++idx) {
      markSum += this.markedData[idx].values.length;
    }
    return markSum;
  }

  private initCleanData(): void {
    for (const key of this.yAxisKeys) {
      this.cleanData.push({
        id: key,
        values: [],
      });
    }
  }

  private createData(): void {
    const timeConv = d3.timeParse('%d-%b-%Y');
    this.maxY = -1;
    this.minY = -1;
    this.dates = [];
    for (const d of this.data) {
      const currValues: Array<number> = [];
      let idx = 0;
      for (const yKey of this.yAxisKeys) {
        const value = parseFloat(d[yKey] as string);
        currValues.push(value);
        this.cleanData[idx].values.push({
          date: d[this.xAxisKey] as string,
          measurment: value,
        });
        idx += 1;
        if (this.maxY === -1 || value > this.maxY) this.maxY = value;
        if (this.minY === -1 || value < this.minY) this.minY = value;
      }
      const currMax = Math.max(...currValues);
      if (currMax > this.maxMeasurement) this.maxMeasurement = currMax;
      const timeConvDate = timeConv(d[this.xAxisKey] as string);
      if (timeConvDate) this.dates.push(timeConvDate);
    }
  }

  private createSvg(): void {
    const padding = 5;
    const adj = 30;
    this.svg = d3
      .select('figure#' + this.lineId)
      .append('svg')
      .attr('preserveAspectRatio', 'xMinYMin meet')
      .attr(
        'viewBox',
        '-' +
          adj +
          ' -' +
          adj +
          ' ' +
          (this.width + adj * 3) +
          ' ' +
          (this.height + adj * 3)
      )
      .style('padding', padding)
      .style('margin', this.margin)
      .classed('svg-content', true) as any;
  }

  private createAxis(xScale: D3ScaleTime, yScale: D3ScaleLinear): void {
    if (!this.svg || !this.cleanData.length) return;
    const yaxis = d3
      .axisLeft(yScale)
      .ticks(this.cleanData[0].values.length)
      .scale(yScale);
    let xaxis = this.yearlyDates
      ? d3
          .axisBottom(xScale)
          .tickFormat(d3.timeFormat('%Y') as any)
          .scale(xScale)
      : d3
          .axisBottom(xScale)
          .ticks(d3.timeDay.every(1))
          .tickFormat(d3.timeFormat('%b %d') as any)
          .scale(xScale);
    this.svg
      .append('g')
      .attr('class', 'axis')
      .attr('transform', 'translate(0,' + this.height + ')')
      .call(xaxis)
      .append('text')
      .attr('y', 40)
      .attr('x', 40)
      .style('text-anchor', 'end')
      .text(this.xAxisLabel);

    this.svg
      .append('g')
      .attr('class', 'axis')
      .call(yaxis)
      .append('text')
      .attr('transform', 'rotate(-90)')
      .attr('dy', '.75em')
      .attr('y', 6)
      .style('text-anchor', 'end')
      .text(this.yAxisLabel);
  }

  private createLines(xScale: D3ScaleTime, yScale: D3ScaleLinear): void {
    if (!this.svg) return;
    const line = d3
      .line()
      .x(function (d: any) {
        const xValue = xScale(new Date(d.date));
        return xValue;
      })
      .y(function (d: any) {
        const yValue = yScale(d.measurment);
        return yValue;
      });

    const lines = this.svg
      .selectAll('lines')
      .data(this.cleanData)
      .enter()
      .append('g')
      .attr('id', (d: CleanDataObj) => d.id)
      .attr('aria-label', (d: CleanDataObj) => 'Linie ' + d.id)
      .attr(
        'aria-description',
        'Drücken Sie "Enter" um in die Linie zu navigieren'
      )
      .on('keydown', this.lineKeyDown.bind(this));
    lines.append('path').attr('d', function (d: any) {
      for (const value of d.values) {
        let obj = value;
        obj.measurment = parseInt(obj.measurment);
      }
      const test = line(d.values);
      return test;
    });
  }

  private dotIsMarked(d: CleanData, lineId: string): boolean {
    const markedLine = this.markedData.filter(
      (cdObj: CleanDataObj) => cdObj.id === lineId
    );
    if (markedLine.length) {
      const markedDot = markedLine[0].values.filter(
        (cd: CleanData) => cd.date === d.date
      );
      if (markedDot.length) {
        return true;
      }
    }
    return false;
  }

  private createDots(xScale: D3ScaleTime, yScale: D3ScaleLinear): void {
    if (!this.svg) return;
    const dots = this.svg.append('g');
    for (let idx = 0; idx < this.cleanData.length; ++idx) {
      dots
        .selectAll('dot')
        .data(this.cleanData[idx].values)
        .enter()
        .append('circle')
        .attr('cx', (d: CleanData) => xScale(new Date(d.date)))
        .attr('cy', (d: CleanData) => yScale(d.measurment))
        .attr('r', 3)
        .attr('data-lineid', this.cleanData[idx].id)
        .attr('data-dotIdx', (d: CleanData, dotIdx: number) => dotIdx)
        .attr(
          'aria-label',
          (d: CleanData) =>
            `${this.yAxisLabel}: ${d.measurment}${
              this.yAxisUnit ? ' ' + this.yAxisUnit : ''
            }, Datum: ${
              this.yearlyDates
                ? new Date(d.date).getFullYear()
                : new Date(d.date).toLocaleDateString('de')
            }${
              this.cleanData.length > 1
                ? ', Linie ' + this.cleanData[idx].id
                : ''
            }${this.dotIsMarked(d, this.cleanData[idx].id) ? ', Makiert' : ''}`
        )
        .attr('class', (d: CleanData) => {
          if (this.dotIsMarked(d, this.cleanData[idx].id)) {
            return 'markedDot';
          }
          return '';
        })
        .on('keydown', this.dotKeyDown.bind(this));
    }
  }

  svgKeyDown(evt: KeyboardEvent): void {
    if (evt.key === 'Enter' && this.menuButton?.nativeElement) {
      this.menuButton.nativeElement.focus();
    }
  }

  private focusLine(idx: number): void {
    const lineToFocus = this.cleanData[idx];
    if (lineToFocus && this.figureElement?.nativeElement) {
      const focusId = lineToFocus.id;
      const lineElem = this.figureElement.nativeElement.querySelector(
        '#' + focusId
      ) as HTMLElement | null;
      if (lineElem) {
        lineElem.setAttribute('tabindex', '0');
        lineElem.focus();
      }
    }
  }

  private getLineIdxById(id: string): number {
    let targetIdx = -1;
    for (let idx = 0; idx < this.cleanData.length; ++idx) {
      if (this.cleanData[idx].id === id) {
        targetIdx = idx;
        break;
      }
    }
    return targetIdx;
  }

  private lineKeyDown(evt: KeyboardEvent): void {
    if (evt.target && this.figureElement?.nativeElement) {
      const targetId = (evt.target as HTMLElement).id;
      const targetIdx = this.getLineIdxById(targetId);
      if (targetIdx != -1) {
        if (evt.key === 'ArrowDown' || evt.key === 'ArrowUp') {
          let newIdx = evt.key === 'ArrowDown' ? targetIdx + 1 : targetIdx - 1;
          if (newIdx >= this.cleanData.length) newIdx = 0;
          if (newIdx < 0) newIdx = this.cleanData.length - 1;
          const newLine = this.figureElement.nativeElement.querySelector(
            '#' + this.cleanData[newIdx].id
          ) as HTMLElement | null;
          if (newLine) {
            (evt.target as HTMLElement).removeAttribute('tabindex');
            newLine.setAttribute('tabindex', '0');
            newLine.focus();
          }
        } else if (evt.key === 'Enter') {
          const dot = this.getDotByLineIdAndIdx(
            this.cleanData[targetIdx].id,
            0
          );
          if (dot) {
            dot.setAttribute('tabindex', '0');
            dot.focus();
          }
        } else if (evt.key === 'Escape') {
          if (this.menuList?.nativeElement) {
            (evt.target as HTMLElement).removeAttribute('tabindex');
            const menuItems =
              this.menuList.nativeElement.querySelectorAll('li');
            menuItems[0].focus();
          }
        } else if (evt.key.toUpperCase() === 'M' && evt.shiftKey) {
          const lineData = this.cleanData[targetIdx];
          let markedLineIdx = -1;
          for (let idx = 0; idx < this.markedData.length; ++idx) {
            if (this.markedData[idx].id === lineData.id) {
              markedLineIdx = idx;
              break;
            }
          }
          let setMarks = false;
          if (markedLineIdx === -1) {
            setMarks = true;
            this.markedData.push(lineData);
          } else {
            if (
              this.markedData[markedLineIdx].values.length ===
              lineData.values.length
            ) {
              setMarks = false;
              this.markedData.splice(markedLineIdx, 1);
            } else {
              setMarks = true;
              this.markedData[markedLineIdx] = lineData;
            }
          }
          const dots = this.figureElement.nativeElement.querySelectorAll(
            `circle[data-lineId="${lineData.id}"]`
          );
          for (let dotIdx = 0; dotIdx < dots.length; ++dotIdx) {
            if (setMarks) {
              dots[dotIdx].setAttribute('class', 'markedDot');
            } else {
              dots[dotIdx].setAttribute('class', '');
            }
          }
        } else if (evt.key.toUpperCase() === 'S' && evt.shiftKey) {
          if (!this.soniIsPlaying) {
            this.playSoniForLine(this.cleanData[targetIdx].values);
            this.soniIsPlaying = true;
            setTimeout(() => {
              this.soniIsPlaying = false;
            }, 5000);
          }
        }
      }
    }
    evt.preventDefault();
    evt.stopPropagation();
  }

  private dotKeyDown(evt: KeyboardEvent): void {
    const target = evt.target as HTMLElement | null;
    if (target && this.figureElement?.nativeElement) {
      const currIdxStr = target.getAttribute('data-dotIdx');
      const currDotIdx = currIdxStr ? parseInt(currIdxStr) : null;
      const currLineId = target.getAttribute('data-lineid');
      const lineData = this.cleanData.filter(
        (cd: CleanDataObj) => cd.id === currLineId
      )[0];
      if (currDotIdx != null && currLineId != null && lineData) {
        if (evt.key === 'ArrowRight' || evt.key === 'ArrowLeft') {
          let newIdx =
            evt.key === 'ArrowRight' ? currDotIdx + 1 : currDotIdx - 1;
          if (newIdx < 0) newIdx = 0;
          if (newIdx >= lineData.values.length)
            newIdx = lineData.values.length - 1;
          const newDowt = this.getDotByLineIdAndIdx(currLineId, newIdx);
          if (newDowt) {
            target.removeAttribute('tabindex');
            newDowt.setAttribute('tabindex', '0');
            newDowt.focus();
          }
        } else if (evt.key === 'Escape') {
          const line =
            (this.figureElement.nativeElement.querySelector(
              '#' + currLineId
            ) as HTMLElement) || null;
          if (line) {
            target.removeAttribute('tabindex');
            line.setAttribute('tabindex', '0');
            line.focus();
          }
        } else if (evt.key.toUpperCase() === 'M' && evt.shiftKey) {
          const markedDotData = lineData.values[currDotIdx];
          let markedLineIdx = -1;
          for (let idx = 0; idx < this.markedData.length; ++idx) {
            if (this.markedData[idx].id === currLineId) {
              markedLineIdx = idx;
              break;
            }
          }
          let setMark = false;
          if (markedLineIdx === -1) {
            this.markedData.push({
              id: currLineId,
              values: [lineData.values[currDotIdx]],
            });
            setMark = true;
          } else {
            const markedValues = this.markedData[markedLineIdx];
            let markedDotIdx = -1;
            for (let idx = 0; idx < markedValues.values.length; ++idx) {
              if (markedValues.values[idx].date === markedDotData.date) {
                markedDotIdx = idx;
                break;
              }
            }
            if (markedDotIdx === -1) {
              setMark = true;
              this.markedData[markedLineIdx].values.push(markedDotData);
            } else {
              this.markedData[markedLineIdx].values.splice(markedDotIdx, 1);
              if (this.markedData[markedLineIdx].values.length === 0) {
                this.markedData.splice(markedLineIdx, 1);
              }
            }
          }
          if (setMark) {
            target?.setAttribute('class', 'markedDot');
            target?.setAttribute(
              'aria-label',
              `${this.yAxisLabel}: ${markedDotData.measurment}, Linie ${lineData.id}, Makiert`
            );
          } else {
            target?.setAttribute('class', '');
            target?.setAttribute(
              'aria-label',
              `${this.yAxisLabel}: ${markedDotData.measurment}, Linie ${lineData.id}`
            );
          }
        } else if (evt.key.toUpperCase() === 'S' && evt.shiftKey) {
          const currDot = lineData.values[currDotIdx];
          if (currDot) {
            const note = this.calcSoniNote(currDot.measurment);
            const synth = new Tone.PolySynth(Tone.Synth).toDestination();
            synth.triggerAttackRelease(note, '8n');
          }
        } else if (evt.key === 'ArrowUp' || evt.key === 'ArrowDown') {
          const targetLineIdx = this.getLineIdxById(currLineId);
          if (targetLineIdx !== -1) {
            let newLineIdx =
              evt.key === 'ArrowUp' ? targetLineIdx - 1 : targetLineIdx + 1;
            if (newLineIdx < 0) newLineIdx = this.cleanData.length - 1;
            if (newLineIdx >= this.cleanData.length) newLineIdx = 0;
            if (newLineIdx !== targetLineIdx) {
              const currLine =
                (this.figureElement.nativeElement.querySelector(
                  '#' + currLineId
                ) as HTMLElement) || null;
              const newLine =
                (this.figureElement.nativeElement.querySelector(
                  '#' + this.cleanData[newLineIdx].id
                ) as HTMLElement) || null;
              if (currLine) {
                currLine.removeAttribute('tabindex');
                target.removeAttribute('tabindex');
              }
              if (newLine) {
                newLine.setAttribute('tabindex', '0');
                const newDot = this.getDotByLineIdAndIdx(
                  this.cleanData[newLineIdx].id,
                  currDotIdx
                );
                if (newDot) {
                  newDot.setAttribute('tabindex', '0');
                  newDot.focus();
                }
              }
            }
          }
        }
      }
    }
    evt.preventDefault();
  }

  getLineIdOfDot(dot: HTMLElement): string | null {
    return dot.getAttribute('data-lineid');
  }

  getDotByLineIdAndIdx(lineId: string, dotIdx: number): HTMLElement | null {
    if (this.figureElement?.nativeElement) {
      const lineDots = this.figureElement.nativeElement.querySelectorAll(
        '[data-lineid="' + lineId + '"]'
      );
      for (let idx = 0; idx < lineDots.length; ++idx) {
        const dot = lineDots[idx] as HTMLElement;
        const currDotIdx = dot.getAttribute('data-dotIdx');
        if (currDotIdx != null && parseInt(currDotIdx) === dotIdx) {
          return dot;
        }
      }
    }
    return null;
  }
}
