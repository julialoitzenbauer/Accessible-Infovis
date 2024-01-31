import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-test',
  templateUrl: './test.component.html',
  styleUrls: ['./test.component.css'],
})
export class TestComponent implements OnInit {
  testId: string = '';

  constructor(private route: ActivatedRoute) {}

  ngOnInit(): void {
    console.log('INIT TEST');
    this.route.queryParamMap.subscribe((params) => {
      this.testId = params.get('testId') || '';
      console.log(this.testId);
    });
  }
}
