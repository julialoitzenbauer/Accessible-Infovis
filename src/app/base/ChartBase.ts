import { Component, Input, OnInit } from "@angular/core";
import * as d3 from "d3";
import { D3Selection } from "src/types";

@Component({
    selector: '',
    template: '',
    styleUrls: []
})

export abstract class ChartBase<T> implements OnInit {
    @Input()
    data!: Array<Record<string, number | string>>;
    @Input()
    labelKey!: string;
    @Input()
    xAxisKey: string = '';
    @Input()
    yAxisKey: string = '';
    @Input()
    title!: string;
    @Input()
    description?: string;
    @Input()
    margin: number = 50;
    @Input()
    width: number = 750 - (this.margin * 2);
    @Input()
    height: number = 400 - (this.margin * 2);

    protected svg?: D3Selection;
    protected cleanData!: T;
    protected cleanDescription?: string;
    protected focusedElement?: string | null;
    figureId!: string;


    abstract ngOnInit(): void;
    /**
     * Interface for function which should be used to create the aria properties
     * for the specific chart.
     */
    protected abstract initAria(): void;

    protected blurElement(id: string) {
        const selection = d3.select('#ELEMENT_' + id.replaceAll('.', '\\.'));
        const node = selection.node() as HTMLElement | null;
        if (node) {
          node.setAttribute("tabindex", "-1");
          node.blur();
        }
    }
}