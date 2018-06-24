import xs, { Stream } from 'xstream';
import { run } from '@cycle/run';
import { button, div, span, makeDOMDriver, DOMSource, VNode } from '@cycle/dom';
import onionify, { StateSource } from 'cycle-onionify';
import isolate from '@cycle/isolate';

import { modalify, ModalSource, ModalAction } from '../../../src/modalify';

interface State {
    i: number;
    child: {
        foo?: string;
    };
}
type Reducer = (s: State) => State;

interface Sources {
    DOM: DOMSource;
    modal: ModalSource;
    onion: StateSource<State>;
}

interface Sinks {
    DOM?: Stream<VNode>;
    modal?: Stream<ModalAction>;
    onion?: Stream<Reducer>;
}

function main(sources: Sources): Sinks {
    const { DOM, onion, modal } = sources;
    const isolatedModal = isolate(Modal, 'child');

    const modalSinks: Sinks = modal.sinks(['onion', 'modal']);

    return {
        DOM: onion.state$.map(state =>
            div([
                span(`My state: ${JSON.stringify(state)}`),
                button('.button', ['open modal'])
            ])
        ),
        onion: xs.merge(
            xs.of(() => ({ i: 7, child: { foo: 'something' } })),
            modalSinks.onion
        ),
        modal: xs.merge(
            DOM.select('.button')
                .events('click')
                .mapTo({
                    type: 'open',
                    component: isolatedModal,
                    sources,
                    id: 'myModal'
                } as ModalAction),
            modalSinks.modal
        )
    };
}

function Modal({ DOM, onion }: Sources): any {
    return {
        DOM: onion.state$.map(state =>
            div('.div', [
                span('.span', [
                    `This is a modal. My state: ${JSON.stringify(state)} :)`
                ]),
                button('.set', ['Set to "SOMETHING"']),
                button('.button', ['close'])
            ])
        ),
        modal: DOM.select('.button')
            .events('click')
            .mapTo({ type: 'close' } as ModalAction),
        onion: DOM.select('.set')
            .events('click')
            .mapTo(() => ({ foo: 'SOMETHING' }))
    };
}

const wrappedMain = onionify(modalify(main, { background: 'rgba(0,0,0,0.2)' }));

run(wrappedMain, {
    DOM: makeDOMDriver('#app')
});
