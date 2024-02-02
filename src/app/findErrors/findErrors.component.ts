import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { testData3, testData6 } from './data';

@Component({
  selector: 'app-find-errors',
  templateUrl: './findErrors.component.html',
  styleUrls: ['./findErrors.component.css'],
})
export class FindErrorsComponent implements OnInit {
  testId: string = '';
  data3 = testData3;
  data6 = testData6;

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      this.testId = params.get('testId') || '';
    });
  }
}
