import xs, { Stream } from 'xstream';
import Cycle from '@cycle/xstream-run';
import { button, div, span, makeDOMDriver, DOMSource, VNode } from '@cycle/dom';

import { modalify, ModalAction } from '../../../src/modalify';

interface Sources {
    DOM : DOMSource;
    modal : Stream<ModalAction>; //Can be used for messaging the creator
}

interface Sinks {
    DOM? : Stream<VNode>;
    modal? : Stream<ModalAction>;
}

function main({ DOM } : Sources) : Sinks
{
    return {
        DOM: xs.of(button('.button', ['open modal'])),
        modal: DOM.select('.button').events('click')
            .mapTo({
                type: 'open',
                component: modal
            })
    };
}

function modal({ DOM } : Sources) : Sinks
{
    return {
        DOM: xs.of(div('.div', [
            span('.span', ['This is a modal. Yeah? :)']),
            button('.button', ['close'])
        ])),
        modal: DOM.select('.button').events('click')
            .mapTo({ type: 'close' })
    };
}

Cycle.run(modalify(main), {
    DOM: makeDOMDriver('#app')
});
