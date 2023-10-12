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

  // Wahlbeteiligung Bundespräsidentenwahl 09. Oktober 2022
  // https://de.statista.com/statistik/daten/studie/728385/umfrage/wahlbeteiligung-an-der-bundespraesidentenwahl-in-oesterreich-nach-bundeslaendern/
  wahlbeteiligung = [
    { Bundesland: 'Niederösterreich', Wahlbeteiligung: 72.6 },
    { Bundesland: 'Burgenland', Wahlbeteiligung: 70.5 },
    { Bundesland: 'Oberösterreich', Wahlbeteiligung: 68.3 },
    { Bundesland: 'Salzburg', Wahlbeteiligung: 66.4 },
    { Bundesland: 'Steiermark', Wahlbeteiligung: 64.3 },
    { Bundesland: 'Kärnten', Wahlbeteiligung: 64.3 },
    { Bundesland: 'Wien', Wahlbeteiligung: 59.6 },
    { Bundesland: 'Tirol', Wahlbeteiligung: 56.5 },
    { Bundesland: 'Vorarlberg', Wahlbeteiligung: 56.1 },
  ];

  bigData = bigData;
}
