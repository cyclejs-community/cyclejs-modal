import { Stream } from 'xstream';
import { Observable } from 'rxjs';
import { run } from '@cycle/rxjs-run';
import { button, div, span, makeDOMDriver, DOMSource, VNode } from '@cycle/dom';
import isolate from '@cycle/isolate';

import { modalify, ModalAction } from '../../../src/modalify';

interface Sources {
    DOM: DOMSource;
}

interface Sinks {
    DOM?: Observable<VNode>;
    modal?: Stream<ModalAction>;
}

function main({ DOM }: Sources): Sinks {
    return {
        DOM: Observable.of(button('.button', ['open modal'])),
        modal: DOM.select('.button')
            .events('click')
            .mapTo({
                type: 'open',
                component: isolate(modal)
            } as ModalAction)
    };
}

function modal({ DOM }: Sources): Sinks {
    return {
        DOM: Observable.of(
            div('.div', [
                span('.span', ['This is an rxjs modal! :)']),
                button('.button', ['close'])
            ])
        ),
        modal: DOM.select('.button')
            .events('click')
            .mapTo({ type: 'close' } as ModalAction)
    };
}

run(modalify(main), {
    DOM: makeDOMDriver('#app')
});
