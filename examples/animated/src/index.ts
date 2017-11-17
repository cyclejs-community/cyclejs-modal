import xs, { Stream } from 'xstream';
import { run } from '@cycle/run';
import { button, div, span, makeDOMDriver, DOMSource, VNode } from '@cycle/dom';

import { modalify, Message, ModalAction } from '../../../src/modalify';

interface Sources {
    DOM : DOMSource;
    modal : Stream<Message>;
}

interface Sinks {
    DOM? : Stream<VNode>;
    modal? : Stream<ModalAction>;
}

/**
 * modalAnimationWrapper - wraps the component embed in the modal
 * will handle the enter and leave animation of the modal
 *
 */
function modalAnimationWrapper(component: (s: Sources) => Sinks) {
    return function (sources: Sources) {
        const instance = component(sources);

        const animation = {
            transition: "transform 1s",
            transform: "translateY(-100%)",
            delayed: {
                transform: "translateY(0)"
            },
            remove: {
                transform: "translateY(-100%)"
            }
        }

        return {
            ...instance,
            DOM: instance
                .DOM
                .map((vnode: VNode) => div(".modal-container", { style: animation }, div(".modal-content", vnode)))
        }
    }
}

function main({ DOM } : Sources) : Sinks
{
    return {
        DOM: xs.of(button('.button', ['open modal'])),
        modal: DOM.select('.button').events('click')
            .mapTo({
                type: 'open',
                component: modalAnimationWrapper(modal)
            } as ModalAction)
    };
}

function modal({ DOM } : Sources) : Sinks
{
    return {
        DOM: xs.of(div('.div', [
            span('.span', ['This is a modal. Yeah? :)']),
            button('.close', ['close'])
        ])),
        modal: DOM.select('.close').events('click')
            .mapTo({ type: 'close' } as ModalAction)
    };
}

const modalifiedMain = modalify( main, {
  name : 'modal',
  DOMDriverKey : 'DOM',
  center : false,
});

run( modalifiedMain, {
    DOM: makeDOMDriver('#app')
});
