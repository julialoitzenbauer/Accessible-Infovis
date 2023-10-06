import { Component } from '@angular/core';
import { bigData } from './bigData';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'angular-d3';
  data = [
    { System: "Vue", Sterne: 166443, Erscheinungsdatum: 2014 },
    { System: "Test", Sterne: 6443, Erscheinungsdatum: 2014 },
    { System: "Test 2", Sterne: 15443, Erscheinungsdatum: 2014 },
    { System: "React", Sterne: 150793, Erscheinungsdatum: 2013 },
    { System: "Angular", Sterne: 62342, Erscheinungsdatum: 2016 },
    { System: "Backbone", Sterne: 27647, Erscheinungsdatum: 2010 },
    { System: "Ember", Sterne: 21471, Erscheinungsdatum: 2011 },
  ];

  bigData = bigData;
}
