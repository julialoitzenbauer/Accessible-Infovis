import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import * as d3 from 'd3';
import * as Tone from 'tone';
import { D3Selection } from 'src/types';
import {
  MAX_MIDI_NOTE,
  MIDI_NOTES,
  MIN_MIDI_NOTE,
} from '../sonification/midiNotes';
import { CleanData } from './barTypes';
import { IDGenerator } from './IDGenerator';

enum SEARCH_MENU {
  Y,
  LABEL,
}

@Component({
  selector: 'app-bar',
  templateUrl: './bar.component.html',
  styleUrls: ['./bar.component.css'],
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
  width: number = 750 - this.margin * 2;
  @Input()
  height: number = 400 - this.margin * 2;
  @Input()
  title: string = 'Bar Chart';
  @Input()
  description: string = '';
  @Input()
  yAxisUnit: string = '';
  @Input()
  hideMenu: boolean = true;

  private cleanData: Array<CleanData> = [];
  private svg?: D3Selection;
  private maxY: number = -1;
  private maxId?: string;
  private minId?: string;
  private focusedBar?: string;
  private selectedSearchMenu?: SEARCH_MENU | null;
  private soniIsPlaying: boolean = false;
  isFilteredByMarks: boolean = false;
  markedData: Array<CleanData> = [];
  barId: string;
  menuId: string;
  menuIsOpen: boolean;
  searchMenuIsOpen: boolean;
  showSearchform: boolean;
  searchMenuPlaceholder: string;
  markMenuIsOpen: boolean;
  showDeleteMarksForm: boolean;
  summaryIsHidden: boolean = true;

  @ViewChild('figureElement') figureElement:
    | ElementRef<HTMLElement>
    | undefined;
  @ViewChild('menuButton') menuButton: ElementRef<HTMLElement> | undefined;
  @ViewChild('menuList') menuList: ElementRef<HTMLElement> | undefined;
  @ViewChild('liveRegion') liveRegion: ElementRef<HTMLElement> | undefined;
  @ViewChild('searchMenuButton') searchMenuButton:
    | ElementRef<HTMLElement>
    | undefined;
  @ViewChild('searchMenuList') searchMenuList:
    | ElementRef<HTMLElement>
    | undefined;
  @ViewChild('searchFieldInput') searchFieldInput:
    | ElementRef<HTMLInputElement>
    | undefined;
  @ViewChild('searchFieldSubmitBtn') searchFieldSubmitBtn:
    | ElementRef<HTMLElement>
    | undefined;
  @ViewChild('markMenuButton') markMenuButton:
    | ElementRef<HTMLElement>
    | undefined;
  @ViewChild('markMenuList') markMenuList: ElementRef<HTMLElement> | undefined;
  @ViewChild('deleteMarksButton') deleteMarksButton:
    | ElementRef<HTMLElement>
    | undefined;
  @ViewChild('cancelDeleteMarksButton') cancelDeleteMarksButton:
    | ElementRef<HTMLElement>
    | undefined;
  @ViewChild('labelsContainer') labelsContainer:
    | ElementRef<HTMLElement>
    | undefined;
  @ViewChild('summaryMenu') summaryMenu: ElementRef<HTMLElement> | undefined;

  constructor() {
    this.barId = IDGenerator.getId();
    this.menuId = this.barId + '_MENU';
    this.menuIsOpen = false;
    this.searchMenuIsOpen = false;
    this.showSearchform = false;
    this.searchMenuPlaceholder = '';
    this.markMenuIsOpen = false;
    this.showDeleteMarksForm = false;
  }

  ngOnInit(): void {
    setTimeout(() => {
      this.createCleanData();
      this.createSvg();
      this.drawBars();
    }, 0);
  }

  menuKeyDown(evt: KeyboardEvent): void {
    if (
      evt.key === 'Enter' ||
      evt.key === ' ' ||
      evt.key === 'ArrowDown' ||
      evt.key === 'ArrowUp'
    ) {
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
  }

  menuClick(evt: Event): void {
    this.menuIsOpen = true;
    setTimeout(() => {
      if (this.menuList?.nativeElement) {
        const items = this.menuList.nativeElement.querySelectorAll('li');
        let idx = 0;
        items[idx].setAttribute('tabindex', '0');
        items[idx].focus();
      }
    }, 0);
  }

  menuItemKeyDown(evt: KeyboardEvent, targetIdx: number): void {
    if (evt.key === 'Enter' || evt.key === ' ') {
      switch (targetIdx) {
        case 0:
          if (this.cleanData?.length) {
            this.focusBar(this.cleanData[0].ID);
          }
          break;
        case 1:
          this.summaryIsHidden = false;
          break;
        case 3:
          this.playSonification();
          break;
        case 5:
          this.createCleanData();
          if (this.figureElement?.nativeElement) {
            this.figureElement.nativeElement.innerHTML = '';
            this.createSvg();
            this.drawBars();
            if (this.liveRegion?.nativeElement) {
              this.liveRegion.nativeElement.innerHTML = '';
              this.liveRegion.nativeElement.innerHTML =
                '<p>Daten wurden erfolgreich zurückgesetzt</p>';
            }
            if (this.markedData.length) {
              for (const mark of this.markedData) {
                const selection = d3.select(
                  '[id="' + mark.ID.replaceAll('.', '\\.') + '"]'
                );
                const node = selection.node() as HTMLElement | null;
                if (node) {
                  node.classList.add('marked');
                  node.setAttribute(
                    'aria-description',
                    this.yAxisKey +
                      ': ' +
                      mark.yValue +
                      (this.yAxisUnit ? ' ' + this.yAxisUnit : '') +
                      ', Markiert'
                  );
                }
              }
            }
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

  focusSummaryMenu(): void {
    if (this.summaryMenu?.nativeElement) {
      this.summaryMenu.nativeElement.focus();
    }
  }

  searchMenuKeyDown(evt: KeyboardEvent, idx: number): void {
    if (evt.key === 'Enter' || evt.key === ' ') {
      this.searchMenuIsOpen = true;
      setTimeout(() => {
        if (this.searchMenuList?.nativeElement) {
          const items =
            this.searchMenuList.nativeElement.querySelectorAll('li');
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

  markMenuKeyDown(evt: KeyboardEvent, idx: number): void {
    if (evt.key === 'ArrowUp' || evt.key === 'ArrowDown') {
      if (this.menuList?.nativeElement) {
        const items = this.menuList.nativeElement.querySelectorAll('li');
        let newIdx = evt.key === 'ArrowDown' ? idx + 1 : idx - 1;
        if (newIdx < 0) newIdx = items.length - 1;
        else if (newIdx >= items.length) newIdx = 0;
        items[idx].removeAttribute('tabindex');
        items[newIdx].setAttribute('tabindex', '0');
        items[newIdx].focus();
      }
    } else if (evt.key === 'Escape') {
      this.menuIsOpen = false;
      if (this.menuButton?.nativeElement) {
        this.menuButton.nativeElement.focus();
      }
    } else if (evt.key === 'Enter' || evt.key === ' ') {
      this.markMenuIsOpen = true;
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
        this.searchMenuPlaceholder = `Suchen nach ${this.yAxisKey}`;
      } else if (idx === 1) {
        this.selectedSearchMenu = SEARCH_MENU.LABEL;
        this.searchMenuPlaceholder = `Suchen nach ${this.labelKey}`;
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

  markMenuItemKeyDown(evt: KeyboardEvent, idx: number): void {
    if (evt.key === 'ArrowDown' || evt.key === 'ArrowUp') {
      if (this.markMenuList?.nativeElement) {
        const items = this.markMenuList.nativeElement.querySelectorAll('li');
        let newIdx = evt.key === 'ArrowDown' ? idx + 1 : idx - 1;
        if (newIdx < 0) newIdx = items.length - 1;
        else if (newIdx >= items.length) newIdx = 0;
        items[idx].removeAttribute('tabindex');
        items[newIdx].setAttribute('tabindex', '0');
        items[newIdx].focus();
      }
    } else if (evt.key === 'Escape') {
      this.markMenuIsOpen = false;
      if (this.markMenuButton?.nativeElement) {
        this.markMenuButton.nativeElement.focus();
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
        if (this.isFilteredByMarks) {
          this.createCleanData();
          this.isFilteredByMarks = false;
        } else {
          this.cleanData = this.markedData;
          this.isFilteredByMarks = true;
        }
        this.createLabelsAndDescriptions();
        if (this.figureElement?.nativeElement) {
          this.figureElement.nativeElement.innerHTML = '';
          this.createSvg();
          this.drawBars();
          if (this.markedData.length) {
            for (const mark of this.markedData) {
              const selection = d3.select(
                '[id="' + mark.ID.replaceAll('.', '\\.') + '"]'
              );
              const node = selection.node() as HTMLElement | null;
              if (node) {
                node.classList.add('marked');
                node.setAttribute(
                  'aria-description',
                  this.yAxisKey +
                    ': ' +
                    mark.yValue +
                    (this.yAxisUnit ? ' ' + this.yAxisUnit : '') +
                    ', Markiert'
                );
              }
            }
          }
          if (this.liveRegion?.nativeElement) {
            let notification = this.isFilteredByMarks
              ? `Es ${this.markedData.length === 1 ? 'wird' : 'werden'} nun ${
                  this.markedData.length
                } ${
                  this.markedData.length === 1
                    ? 'markierter Datenpunkt'
                    : 'markierte Datenpunkte'
                } in der Visualisierung angezeigt.`
              : 'Es werden nun wieder alle Datenpunkte angezeigt.';
            const descriptionTag = document.createElement('p');
            descriptionTag.innerHTML = notification;
            this.liveRegion.nativeElement.innerHTML = '';
            this.liveRegion.nativeElement.appendChild(descriptionTag);
          }
        }
      }
    }

    evt.preventDefault();
  }

  markFormButtonKeyDown(evt: KeyboardEvent): void {
    if (
      evt.target === this.deleteMarksButton?.nativeElement &&
      this.deleteMarksButton?.nativeElement
    ) {
      if (
        ((evt.key === 'Tab' && !evt.shiftKey) ||
          evt.key === 'ArrowLeft' ||
          evt.key === 'ArrowRight') &&
        this.cancelDeleteMarksButton?.nativeElement
      ) {
        this.cancelDeleteMarksButton.nativeElement.focus();
      } else if (evt.key === 'Escape') {
        this.showDeleteMarksForm = false;
        if (this.markMenuList?.nativeElement) {
          const items = this.markMenuList.nativeElement.querySelectorAll('li');
          items[0].focus();
        }
      } else if (evt.key === 'Enter' || evt.key === ' ') {
        this.markedData = [];
        this.createCleanData();
        if (this.figureElement?.nativeElement) {
          this.figureElement.nativeElement.innerHTML = '';
          this.createSvg();
          this.drawBars();
        }
        if (this.liveRegion?.nativeElement) {
          this.liveRegion.nativeElement.innerHTML = '';
          this.liveRegion.nativeElement.innerHTML =
            '<p>Markierungen wurden gelöscht.</p>';
        }
      }
    } else if (
      this.cancelDeleteMarksButton?.nativeElement &&
      evt.target === this.cancelDeleteMarksButton.nativeElement
    ) {
      if (
        ((evt.key === 'Tab' && evt.shiftKey) ||
          evt.key === 'ArrowLeft' ||
          evt.key === 'ArrowRight') &&
        this.deleteMarksButton?.nativeElement
      ) {
        this.deleteMarksButton.nativeElement.focus();
      } else if (
        evt.key === 'Escape' ||
        evt.key === 'Enter' ||
        evt.key === ' '
      ) {
        this.showDeleteMarksForm = false;
        if (this.markMenuList?.nativeElement) {
          const items = this.markMenuList.nativeElement.querySelectorAll('li');
          items[0].focus();
        }
      }
    }
    evt.preventDefault();
  }

  deleteMarksButtonClick(): void {
    this.markedData = [];
    this.createCleanData();
    if (this.figureElement?.nativeElement) {
      this.figureElement.nativeElement.innerHTML = '';
      this.createSvg();
      this.drawBars();
    }
    if (this.liveRegion?.nativeElement) {
      this.liveRegion.nativeElement.innerHTML = '';
      this.liveRegion.nativeElement.innerHTML =
        '<p>Markierungen wurden gelöscht.</p>';
    }
  }

  cancelDeleteMarksButtonClick(): void {
    this.showDeleteMarksForm = false;
    if (this.markMenuList?.nativeElement) {
      const items = this.markMenuList.nativeElement.querySelectorAll('li');
      items[0].focus();
    }
  }

  searchFieldInputKeyDown(evt: KeyboardEvent): void {
    if (
      evt.key === 'Tab' &&
      !evt.shiftKey &&
      evt.target === this.searchFieldInput?.nativeElement
    ) {
      if (this.searchFieldSubmitBtn?.nativeElement) {
        this.searchFieldSubmitBtn.nativeElement.focus();
      }
      evt.preventDefault();
    } else if (evt.key === 'Escape') {
      if (this.searchMenuList?.nativeElement) {
        this.showSearchform = false;
        let searchMenuIdx;
        if (this.selectedSearchMenu === SEARCH_MENU.Y) searchMenuIdx = 0;
        else if (this.selectedSearchMenu === SEARCH_MENU.LABEL)
          searchMenuIdx = 1;
        if (searchMenuIdx != null) {
          const items =
            this.searchMenuList.nativeElement.querySelectorAll('li');
          items[searchMenuIdx].focus();
        }
      }
      evt.preventDefault();
    } else if (evt.key === 'Tab') {
      evt.preventDefault();
    }
  }

  searchFieldButtonKeyDown(evt: KeyboardEvent): void {
    if (
      evt.key === 'Tab' &&
      evt.shiftKey &&
      evt.target === this.searchFieldSubmitBtn?.nativeElement
    ) {
      if (this.searchFieldInput?.nativeElement) {
        this.searchFieldInput.nativeElement.focus();
      }
      evt.preventDefault();
    } else if (evt.key === 'Escape') {
      if (this.searchMenuList?.nativeElement) {
        this.showSearchform = false;
        let searchMenuIdx;
        if (this.selectedSearchMenu === SEARCH_MENU.Y) searchMenuIdx = 0;
        else if (this.selectedSearchMenu === SEARCH_MENU.LABEL)
          searchMenuIdx = 1;
        if (searchMenuIdx != null) {
          const items =
            this.searchMenuList.nativeElement.querySelectorAll('li');
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
          filteredData = this.cleanData.filter(
            (cd: CleanData) => cd.yValue === searchValue
          );
        } else if (compareType === 1) {
          filteredData = this.cleanData.filter(
            (cd: CleanData) => cd.yValue > searchValue
          );
        } else if (compareType === -1) {
          filteredData = this.cleanData.filter(
            (cd: CleanData) => cd.yValue < searchValue
          );
        }
        if (this.figureElement?.nativeElement) {
          if (this.cleanData.length) {
            this.cleanData = filteredData;
            this.createLabelsAndDescriptions();
            this.figureElement.nativeElement.innerHTML = '';
            this.createSvg();
            this.drawBars();
            if (this.liveRegion?.nativeElement) {
              this.liveRegion.nativeElement.innerHTML = '';
              const descriptionTag = document.createElement('p');
              descriptionTag.innerHTML = `${filteredData.length} ${
                filteredData.length === 1 ? 'Datenpunkt' : 'Datenpunkte'
              } wurden gefunden. Die Datenpunkte werden nun angezeigt.`;
              this.liveRegion.nativeElement.appendChild(descriptionTag);
            }
          }
        }
      } else if (this.selectedSearchMenu === SEARCH_MENU.LABEL) {
        const searchValue = this.searchFieldInput.nativeElement.value;
        this.createCleanData();
        const filteredData: Array<CleanData> = this.cleanData.filter(
          (cd: CleanData) =>
            cd.label.toUpperCase().startsWith(searchValue.toUpperCase())
        );
        if (this.figureElement?.nativeElement) {
          if (this.cleanData.length) {
            this.cleanData = filteredData;
            this.createLabelsAndDescriptions();
            this.figureElement.nativeElement.innerHTML = '';
            this.createSvg();
            this.drawBars();
            if (this.liveRegion?.nativeElement) {
              this.liveRegion.nativeElement.innerHTML = '';
              const descriptionTag = document.createElement('p');
              descriptionTag.innerHTML = `${filteredData.length} ${
                filteredData.length === 1 ? 'Datenpunkt' : 'Datenpunkte'
              } wurden gefunden. Die Datenpunkte werden nun angezeigt.`;
              this.liveRegion.nativeElement.appendChild(descriptionTag);
            }
          }
        }
      }
    }
    evt.preventDefault();
  }

  private playSonification(): void {
    if (this.cleanData.length && !this.soniIsPlaying) {
      const notes: Array<string> = [];
      for (const cd of this.cleanData) {
        notes.push(this.calcSoniNote(cd.yValue));
      }
      let noteLength = 5 / this.cleanData.length;
      if (noteLength > 1) noteLength = 1;
      const synth = new Tone.PolySynth(Tone.Synth).toDestination();
      let idx = 0;
      for (const note of notes) {
        let delay = Tone.now();
        delay += idx * noteLength;
        idx += 1;
        synth.triggerAttackRelease(
          [note],
          noteLength > 0.5 ? 0.5 : noteLength,
          delay
        );
      }
      this.soniIsPlaying = true;
      setTimeout(() => {
        this.soniIsPlaying = false;
      }, 5000);
    }
  }

  private calcSoniNote(value: number): string {
    let note = '';
    let noteVal = Math.round(
      MIN_MIDI_NOTE + (value / this.maxY) * (MAX_MIDI_NOTE - MIN_MIDI_NOTE)
    );
    if (noteVal < MIN_MIDI_NOTE) noteVal = MIN_MIDI_NOTE;
    if (noteVal > MAX_MIDI_NOTE) noteVal = MAX_MIDI_NOTE;
    const midiNote = MIDI_NOTES.filter((mn) => mn.midi === noteVal);
    if (midiNote.length) note = midiNote[0].note;
    return note;
  }

  private createSvg(): void {
    this.svg = d3
      .select('figure#' + this.barId)
      .append('svg')
      .on('keydown', this.svgKeyDown.bind(this))
      .attr('id', 'SVG_' + this.barId)
      .attr('tabindex', '-1')
      .attr('aria-hidden', 'true')
      .attr('width', this.width + this.margin * 2)
      .attr('height', this.height + this.margin * 2)
      .append('g')
      .attr('transform', 'translate(' + this.margin + ',' + this.margin + ')');
  }

  private drawBars(): void {
    if (!this.svg) return;
    // Create the X-axis band scale
    const x = d3
      .scaleBand()
      .range([0, this.width])
      .domain(this.cleanData.map((d) => d.label))
      .padding(0.2);

    // Draw the X-axis on the DOM
    this.svg
      .append('g')
      .attr('transform', 'translate(0,' + this.height + ')')
      .call(d3.axisBottom(x))
      .selectAll('text')
      .attr('transform', 'translate(-10,0)rotate(-45)')
      .style('text-anchor', 'end');

    // Create the Y-axis band scale
    const y = d3
      .scaleLinear()
      .domain([0, Math.floor(this.maxY + 0.2 * this.maxY)])
      .range([this.height, 0]);

    // Draw the Y-axis on the DOM
    this.svg.append('g').call(d3.axisLeft(y));

    // Create and fill the bars
    this.svg
      .selectAll('bars')
      .data(this.cleanData)
      .enter()
      .append('rect')
      .attr('x', (d: CleanData) => x(d.label) || 0)
      .attr('y', (d: CleanData) => y(d.yValue))
      .attr('width', x.bandwidth())
      .attr('height', (d: CleanData) => this.height - y(d.yValue))
      .attr('class', 'bar')
      .attr('tabindex', '-1')
      .attr('id', (d: CleanData) => d.ID)
      .attr('aria-labelledby', (d: CleanData) => 'LABEL_' + d.ID)
      .attr('aria-describedby', (d: CleanData) => 'DESCR_' + d.ID)
      .attr('role', 'menuitem')
      .on('keydown', this.barKeyDown.bind(this));
  }

  private createLabelsAndDescriptions(): void {
    if (this.labelsContainer?.nativeElement) {
      this.labelsContainer.nativeElement.innerHTML = '';
      for (let idx = 0; idx < this.cleanData.length; ++idx) {
        const labelSpan = document.createElement('span');
        labelSpan.innerHTML = this.cleanData[idx].label;
        labelSpan.id = 'LABEL_' + this.cleanData[idx].ID;

        const descriptionSpan = document.createElement('span');
        descriptionSpan.innerHTML =
          this.yAxisKey +
          ': ' +
          this.cleanData[idx].yValue +
          (this.yAxisUnit ? ' ' + this.yAxisUnit : '') +
          ', Balken ' +
          (idx + 1) +
          ' von ' +
          this.cleanData.length;
        descriptionSpan.id = 'DESCR_' + this.cleanData[idx].ID;

        this.labelsContainer.nativeElement.appendChild(labelSpan);
        this.labelsContainer.nativeElement.appendChild(descriptionSpan);
      }
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
        ID: d[this.labelKey] + '_' + d[this.yAxisKey],
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
    this.createLabelsAndDescriptions();
  }

  private focusBar(id: string) {
    const selection = d3.select('[id="' + id.replaceAll('.', '\\.') + '"]');
    const node = selection.node() as HTMLElement | null;
    if (node) {
      if (this.focusedBar != null) {
        this.blurBar(this.focusedBar);
      }
      node.focus();
      node.setAttribute('tabindex', '0');
      node.classList.add('current');
      this.focusedBar = id;
    }
  }

  private blurBar(id: string) {
    const selection = d3.select('[id="' + id.replaceAll('.', '\\.') + '"]');
    const node = selection.node() as HTMLElement | null;
    if (node) {
      node.setAttribute('tabindex', '-1');
      node.blur();
      node.classList.remove('current');
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
          this.searchFieldInput.nativeElement.focus();
        } else if (this.menuList?.nativeElement) {
          this.menuList.nativeElement.querySelectorAll('li')[0].focus();
        }
        break;
      case 'm':
      case 'M':
        if (evt.shiftKey) {
          const currBarIdx = this.getCurrBarIdx();
          const bar = this.cleanData[currBarIdx];
          let remove = false;
          if (this.markedData.includes(bar)) {
            const markedIdx = this.markedData.indexOf(bar);
            this.markedData.splice(markedIdx, 1);
            remove = true;
          } else {
            this.markedData.push(bar);
          }
          const selection = d3.select(
            '[id="' + bar.ID.replaceAll('.', '\\.') + '"]'
          );
          const node = selection.node() as HTMLElement | null;
          if (node) {
            if (this.labelsContainer?.nativeElement) {
              const descriptionTag =
                this.labelsContainer.nativeElement.querySelector(
                  '[id="DESCR_' + node.id.replaceAll('.', '\\.') + '"]'
                );
              if (descriptionTag) {
                if (remove) {
                  node.classList.remove('marked');
                  descriptionTag.innerHTML = this.yAxisKey + ': ' + bar.yValue;
                } else {
                  descriptionTag.innerHTML =
                    this.yAxisKey + ': ' + bar.yValue + ', Markiert';
                  node.classList.add('marked');
                }
              }
              if (this.liveRegion?.nativeElement) {
                this.liveRegion.nativeElement.innerHTML = '';
                this.liveRegion.nativeElement.innerHTML = `<p>Markierung wurde ${
                  remove ? 'entfernt' : 'hinzugefügt'
                }</p>`;
              }
            }
          }
        }
        break;
      case 's':
      case 'S':
        if (evt.shiftKey) {
          const currBarIdx = this.getCurrBarIdx();
          const bar = this.cleanData[currBarIdx];
          if (bar) {
            const note = this.calcSoniNote(bar.yValue);
            const synth = new Tone.PolySynth(Tone.Synth).toDestination();
            synth.triggerAttackRelease(note, '8n');
          }
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
