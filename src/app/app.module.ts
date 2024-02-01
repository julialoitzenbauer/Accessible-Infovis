import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BarComponent } from './bar/bar.component';
import { LineComponent } from './line/line.component';
import { ScatterComponent } from './scatter/scatter.component';
import { provideRoutes } from '@angular/router';
import { routes } from './app-routing.module';
import { QuestionAnswerComponent } from './questionAnswer/questionAnswer.component';
import { FindErrorsComponent } from './findErrors/findErrors.component';

@NgModule({
  declarations: [
    AppComponent,
    BarComponent,
    ScatterComponent,
    LineComponent,
    QuestionAnswerComponent,
    FindErrorsComponent,
  ],
  imports: [BrowserModule, AppRoutingModule],
  providers: [provideRoutes(routes)],
  bootstrap: [AppComponent],
})
export class AppModule {}
