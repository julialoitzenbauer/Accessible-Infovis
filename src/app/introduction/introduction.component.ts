import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { scatterData } from './data';

@Component({
  selector: 'app-introduction',
  templateUrl: './introduction.component.html',
  styleUrls: ['./introduction.component.css'],
})
export class IntroductionComponent implements OnInit {
  testId: string = '';
  scatterData = scatterData;

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      this.testId = params.get('testId') || '';
    });
  }
}
