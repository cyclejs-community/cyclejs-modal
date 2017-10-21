import xs, { Stream } from 'xstream';
import { run } from '@cycle/run';
import { button, div, span, makeDOMDriver, DOMSource, VNode } from '@cycle/dom';
import isolate from '@cycle/isolate';

import { modalify, Message, ModalAction } from '../../../src/modalify';

interface Sources {
    DOM : DOMSource;
    modal : Stream<Message>;
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
                component: isolate(modal)
            } as ModalAction)
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
            .mapTo({ type: 'close' } as ModalAction)
    };
}

const modalifiedMain = modalify( main, {
  name : 'modal',
  DOMDriverKey : 'DOM',
  center : true,
  modalContainerClass : null,
  background : 'rgba(0,0,0,0.8)',
  zIndex : 500
});

run( modalifiedMain, {
    DOM: makeDOMDriver('#app')
});
