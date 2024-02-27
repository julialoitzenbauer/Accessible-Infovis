import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { scatterData } from './data';

@Component({
  selector: 'app-introduction',
  templateUrl: './introduction.component.html',
  styleUrls: ['./introduction.component.css'],
})
export class IntroductionComponent implements OnInit {
  @ViewChild('barMenu') barMenu: ElementRef<HTMLElement> | undefined;
  @ViewChild('lineMenu') lineMenu: ElementRef<HTMLElement> | undefined;
  @ViewChild('scatterMenu') scatterMenu: ElementRef<HTMLElement> | undefined;
  @ViewChild('barNavMenu') barNavMenu: ElementRef<HTMLElement> | undefined;
  @ViewChild('lineNavMenu') lineNavMenu: ElementRef<HTMLElement> | undefined;
  @ViewChild('scatterNavMenu') scatterNavMenu:
    | ElementRef<HTMLElement>
    | undefined;
  @ViewChild('barSummaryMenu') barSummaryMenu:
    | ElementRef<HTMLElement>
    | undefined;
  @ViewChild('lineSummaryMenu') lineSummaryMenu:
    | ElementRef<HTMLElement>
    | undefined;
  @ViewChild('scatterSummaryMenu') scatterSummaryMenu:
    | ElementRef<HTMLElement>
    | undefined;
  @ViewChild('barSearchMenu') barSearchMenu:
    | ElementRef<HTMLElement>
    | undefined;
  @ViewChild('lineSearchMenu') lineSearchMenu:
    | ElementRef<HTMLElement>
    | undefined;
  @ViewChild('scatterSearchMenu') scatterSearchMenu:
    | ElementRef<HTMLElement>
    | undefined;
  @ViewChild('barSonificationMenu') barSonificationMenu:
    | ElementRef<HTMLElement>
    | undefined;
  @ViewChild('lineSonificationMenu') lineSonificationMenu:
    | ElementRef<HTMLElement>
    | undefined;
  @ViewChild('scatterSonificationMenu') scatterSonificationMenu:
    | ElementRef<HTMLElement>
    | undefined;
  @ViewChild('barMarkMenu') barMarkMenu: ElementRef<HTMLElement> | undefined;
  @ViewChild('lineMarkMenu') lineMarkMenu: ElementRef<HTMLElement> | undefined;
  @ViewChild('scatterMarkMenu') scatterMarkMenu:
    | ElementRef<HTMLElement>
    | undefined;
  @ViewChild('barResetMenu') barResetMenu: ElementRef<HTMLElement> | undefined;
  @ViewChild('lineResetMenu') lineResetMenu:
    | ElementRef<HTMLElement>
    | undefined;
  @ViewChild('scatterResetMenu') scatterResetMenu:
    | ElementRef<HTMLElement>
    | undefined;

  testId: string = '';
  scatterData = scatterData;
  barNavMenuIsOpen: boolean = false;
  lineNavMenuIsOpen: boolean = false;
  scatterNavMenuIsOpen: boolean = false;
  barSummaryMenuIsOpen: boolean = false;
  lineSummaryMenuIsOpen: boolean = false;
  scatterSummaryMenuIsOpen: boolean = false;
  barSearchMenuIsOpen: boolean = false;
  lineSearchMenuIsOpen: boolean = false;
  scatterSearchMenuIsOpen: boolean = false;
  barSonificationMenuIsOpen: boolean = false;
  lineSonificationMenuIsOpen: boolean = false;
  scatterSonificationMenuIsOpen: boolean = false;
  barMarkMenuIsOpen: boolean = false;
  lineMarkMenuIsOpen: boolean = false;
  scatterMarkMenuIsOpen: boolean = false;
  barResetMenuIsOpen: boolean = false;
  lineResetMenuIsOpen: boolean = false;
  scatterResetMenuIsOpen: boolean = false;

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      this.testId = params.get('testId') || '';
    });
  }

  onMenuKeyDown(evt: KeyboardEvent, menuKey: 'bar' | 'line' | 'scatter'): void {
    if (evt.key === 'Enter' || evt.key === ' ') {
      let menu = this[`${menuKey}Menu`];
      if (menu?.nativeElement) {
        const listElements = menu.nativeElement.querySelectorAll('li');
        listElements[0].setAttribute('tabindex', '0');
        listElements[0].focus();
      }
    }
  }

  onMenuItemKeyDown(
    evt: KeyboardEvent,
    menuKey:
      | 'bar'
      | 'barNav'
      | 'barSummary'
      | 'barSearch'
      | 'barSonification'
      | 'barMark'
      | 'barReset'
      | 'line'
      | 'lineNav'
      | 'lineSummary'
      | 'lineSearch'
      | 'lineSonification'
      | 'lineMark'
      | 'lineReset'
      | 'scatter'
      | 'scatterNav'
      | 'scatterSummary'
      | 'scatterSearch'
      | 'scatterSonification'
      | 'scatterMark'
      | 'scatterReset',
    subMenuKey?:
      | 'barNavMenu'
      | 'barSummaryMenu'
      | 'barSearchMenu'
      | 'barSonificationMenu'
      | 'barMarkMenu'
      | 'barResetMenu'
      | 'lineNavMenu'
      | 'lineSummaryMenu'
      | 'lineSearchMenu'
      | 'lineSonificationMenu'
      | 'lineMarkMenu'
      | 'lineResetMenu'
      | 'scatterNavMenu'
      | 'scatterSummaryMenu'
      | 'scatterSearchMenu'
      | 'scatterSonificationMenu'
      | 'scatterMarkMenu'
      | 'scatterResetMenu'
  ): void {
    if ((evt.key === 'Enter' || evt.key === ' ') && subMenuKey) {
      this[`${subMenuKey}IsOpen`] = true;
      setTimeout(() => {
        const subMenu = this[subMenuKey];
        if (subMenu?.nativeElement) {
          const subMenuItems = subMenu.nativeElement.querySelectorAll('li');
          subMenuItems[0].setAttribute('tabindex', '0');
          subMenuItems[0].focus();
        }
      }, 0);
    } else if (evt.key === 'ArrowDown' || evt.key === 'ArrowUp') {
      const menu = this[`${menuKey}Menu`];
      const target = evt.target;
      if (menu?.nativeElement && target) {
        const menuItems = menu.nativeElement.childNodes;
        const currIdx = Array.prototype.indexOf.call(menuItems, target);
        let newIdx = evt.key === 'ArrowDown' ? currIdx + 1 : currIdx - 1;
        if (newIdx < 0) newIdx = menuItems.length - 1;
        if (newIdx >= menuItems.length) newIdx = 0;
        (target as HTMLElement).removeAttribute('tabindex');
        (menuItems[newIdx] as HTMLElement).setAttribute('tabindex', '0');
        (menuItems[newIdx] as HTMLElement).focus();
      }
    } else if (evt.key === 'Escape') {
      const parentMenu =
        menuKey === 'bar'
          ? this.barMenu?.nativeElement
          : menuKey === 'line'
          ? this.lineMenu?.nativeElement
          : menuKey === 'scatter'
          ? this.scatterMenu?.nativeElement
          : document.querySelector(`[aria-controls="${menuKey}Menu"]`);
      if (parentMenu) {
        parentMenu.setAttribute('tabindex', '0');
        (parentMenu as HTMLElement).focus();
        if ((this as any)[`${menuKey}MenuIsOpen`]) {
          (this as any)[`${menuKey}MenuIsOpen`] = false;
        }
      }
      if (evt.target) {
        (evt.target as HTMLElement).removeAttribute('tabindex');
      }
    }
    evt.preventDefault();
    evt.stopPropagation();
  }
}
