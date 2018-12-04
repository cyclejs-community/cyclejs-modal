import { run } from '@cycle/rxjs-run';
import { Observable, of as observableOf } from 'rxjs';
import { mapTo } from 'rxjs/operators';
import { button, div, span, makeDOMDriver, VNode } from '@cycle/dom';
import { DOMSource } from '@cycle/dom/lib/cjs/rxjs';
import isolate from '@cycle/isolate';

import { modalify, ModalAction } from '../../../src/modalify';

interface Sources {
    DOM: DOMSource;
}

interface Sinks {
    DOM?: Observable<VNode>;
    modal?: Observable<ModalAction>;
}

function main({ DOM }: Sources): Sinks {
    return {
        DOM: observableOf(button('.button', ['open modal'])),
        modal: DOM.select('.button')
            .events('click')
            .pipe(
                mapTo({
                    type: 'open',
                    component: isolate(modal)
                } as ModalAction)
            )
    };
}

function modal({ DOM }: Sources): Sinks {
    return {
        DOM: observableOf(
            div('.div', [
                span('.span', ['This is an rxjs modal! :)']),
                button('.button', ['close'])
            ])
        ),
        modal: DOM.select('.button')
            .events('click')
            .pipe(mapTo({ type: 'close' } as ModalAction))
    };
}

run(modalify(main), {
    DOM: makeDOMDriver('#app')
});
