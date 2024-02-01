import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-question-answer',
  templateUrl: './questionAnswer.component.html',
  styleUrls: ['./questionAnswer.component.css'],
})
export class QuestionAnswerComponent implements OnInit {
  testId: string = '';

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      this.testId = params.get('testId') || '';
    });
  }
}
