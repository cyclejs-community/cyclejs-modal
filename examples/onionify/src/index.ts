import xs, { Stream } from 'xstream';
import { run } from '@cycle/run';
import { button, div, span, makeDOMDriver, DOMSource, VNode } from '@cycle/dom';
import onionify, { StateSource } from 'cycle-onionify';
import isolate from '@cycle/isolate';

import { modalify, Message, ModalAction } from '../../../src/modalify';

interface State {
    i: number;
    child: {
        foo: string;
    };
}
type Reducer = (s: State) => State;

interface Sources {
    DOM: DOMSource;
    modal: Stream<Message>;
    onion: StateSource<State>;
}

interface Sinks {
    DOM?: Stream<VNode>;
    modal?: Stream<ModalAction>;
    onion?: Stream<Reducer>;
}

function main(sources: Sources): Sinks {
    const { DOM, onion } = sources;
    const isolatedModal = isolate(modal, 'child');

    return {
        DOM: onion.state$.map(state =>
            div([
                span(`My state: ${JSON.stringify(state)}`),
                button('.button', ['open modal'])
            ])
        ),
        onion: xs.of(() => ({ i: 7, child: { foo: 'something' } })),
        modal: DOM.select('.button')
            .events('click')
            .mapTo({
                type: 'open',
                component: isolatedModal,
                sources
            } as ModalAction)
    };
}

function modal({ DOM, onion }: Sources): Sinks {
    return {
        DOM: onion.state$.map(state =>
            div('.div', [
                span('.span', [
                    `This is a modal. My state: ${JSON.stringify(state)} :)`
                ]),
                button('.button', ['close'])
            ])
        ),
        modal: DOM.select('.button')
            .events('click')
            .mapTo({ type: 'close' } as ModalAction)
    };
}

const wrappedMain = onionify(modalify(main, { background: 'rgba(0,0,0,0.2)' }));

run(wrappedMain, {
    DOM: makeDOMDriver('#app')
});
