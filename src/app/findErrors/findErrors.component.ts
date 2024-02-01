import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-find-errors',
  templateUrl: './findErrors.component.html',
  styleUrls: ['./findErrors.component.css'],
})
export class FindErrorsComponent implements OnInit {
  testId: string = '';

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      this.testId = params.get('testId') || '';
    });
  }
}
