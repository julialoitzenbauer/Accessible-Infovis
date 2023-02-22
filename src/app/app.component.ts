import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'angular-d3';
  data = [
    { Framework: "Vue", Stars: 166443, Released: 2014 },
    { Framework: "Test", Stars: 6443, Released: 2014 },
    { Framework: "Test 2", Stars: 15443, Released: 2014 },
    { Framework: "React", Stars: 150793, Released: 2013 },
    { Framework: "Angular", Stars: 62342, Released: 2016 },
    { Framework: "Backbone", Stars: 27647, Released: 2010 },
    { Framework: "Ember", Stars: 21471, Released: 2011 },
  ];
}
