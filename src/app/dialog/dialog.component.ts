import {
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  SimpleChanges,
  ViewChild,
} from '@angular/core';

@Component({
  selector: 'app-dialog',
  templateUrl: './dialog.component.html',
  styleUrls: ['./dialog.component.css'],
})
export class DialogComponent implements OnChanges {
  @Input()
  dialogTitle: String = '';
  @Input()
  content: String = '';
  @Input()
  isHidden: boolean = true;

  @ViewChild('dialogContent') dialogContent:
    | ElementRef<HTMLElement>
    | undefined;
  @ViewChild('dialogButton') dialogButton: ElementRef<HTMLElement> | undefined;

  ngOnChanges(changes: SimpleChanges) {
    if (changes['isHidden']?.currentValue === false) {
      setTimeout(() => {
        if (this.dialogContent?.nativeElement) {
          this.dialogContent?.nativeElement.focus();
        }
      }, 0);
    }
  }

  @Output() hidden = new EventEmitter<boolean>();

  constructor() {}

  closeDialog() {
    this.hidden.emit(true);
  }

  dialogKeyDown(evt: KeyboardEvent) {
    const target = evt.target as HTMLElement | null;
    if (evt.key === 'Escape') {
      this.closeDialog();
      evt.preventDefault();
    } else {
      if (
        target &&
        this.dialogContent?.nativeElement &&
        target === this.dialogContent.nativeElement
      ) {
        if (evt.key === 'Tab') {
          if (this.dialogButton?.nativeElement) {
            this.dialogButton.nativeElement.focus();
          }
          evt.preventDefault();
        }
      } else if (
        target &&
        this.dialogButton?.nativeElement &&
        target === this.dialogButton.nativeElement
      ) {
        if (evt.key === 'Tab') {
          if (this.dialogContent?.nativeElement) {
            this.dialogContent.nativeElement.focus();
          }
          evt.preventDefault();
        }
      }
    }
  }
}
