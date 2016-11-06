import xs, { Stream } from 'xstream';
import { VNode, div } from '@cycle/dom';
import isolate from '@cycle/isolate';

export interface ModalAction
{
    type : 'open' | 'close' | 'message';
    component? : (sources : any) => any;
    payload? : any;
}

type Sinks = any;

export function modalify(main : (s : any) => any, name = 'modal', center = true) : any
{
    return function(sources)
    {
        const modalMessageProxy$ : Stream<ModalAction> = xs.create<ModalAction>();

        const sinks : Sinks = isolate(main)(Object.assign({}, sources, { [name]: modalMessageProxy$ }));

        if(sinks[name])
        {
            const modalProxy$ : Stream<ModalAction> = xs.create<ModalAction>();

            const modalAction$ : Stream<ModalAction> = xs.merge(sinks[name], modalProxy$) as Stream<ModalAction>;

            modalMessageProxy$.imitate(modalAction$.filter(a => a.type === 'message'));

            const modalStack$ : Stream<Sinks[]> = modalAction$
                .fold((acc, curr) => {
                    if(curr.type === 'close' && acc.length > 0) {
                        return acc.slice(0, acc.length - 1);
                    }
                    if(curr.type === 'open') {
                        return [...acc, isolate(curr.component)(sources)];
                    }
                    return acc;
                }, []);

            const modalVDom$ : Stream<VNode[]> = modalStack$
                .map<Stream<VNode>[]>(arr => arr.map(s => s.DOM))
                .map<Stream<VNode[]>>(arr => xs.combine(...arr))
                .flatten();

            const mergedModalSinks$ : Stream<Sinks> = modalStack$
                .map<Sinks>(arr => {
                    return Object.keys(sinks)
                        .map<[string, Stream<any>[]]>(s => [s, arr.map(e => e[s]).filter(e => e !== undefined)]).filter(arr => arr[1].length > 0)
                        .map<[string, Stream<any>]>(arr => [arr[0], xs.merge(...arr[1])])
                        .map<{ [k : string]: Stream<any> }>(arr => ({ [arr[0]]: arr[1] }))
                        .reduce((acc, curr) => Object.assign(acc, curr), {});
                });

            const mergedVDom$ : Stream<VNode> = xs.combine(sinks.DOM, modalVDom$)
                .map(([vdom, modals]) => div('._', {
                    style: {
                        width: '100%',
                        height: '100%'
                    }
                }, [
                    vdom,
                    ...(center ? modals.map((m, i) => {
                        return div('._', {
                            style: {
                                position: 'absolute',
                                width: '100%',
                                height: '100%',
                                top: document.body.scrollTop + 'px',
                                left: '0',
                                'pointer-events': modals.length > 0 ? 'all' : 'none',
                                background: i === 0 ? 'rgba(0, 0, 0, 0.7)' : 'rgba(0, 0, 0, 0)',
                                display: 'flex',
                                'flex-direction': 'column',
                                'justify-content': 'center',
                                'align-items': 'center',
                                'z-index': i * 10 + 5,
                            }
                        }, [
                            div('._', {
                                style: {
                                    display: 'flex',
                                    'flex-direction': 'row',
                                    'justify-content': 'center',
                                    'align-items': 'center',
                                    background: 'white',
                                    'border-radius': '5px',
                                    color: 'black',
                                    padding: '20px'
                                }
                            },  [m])
                        ]);
                    }) : modals)
                ]));

            const extractedSinks : Sinks = Object.keys(sinks)
                .map(s => ({ [s]: mergedModalSinks$.map(e => e[s]).filter(e => e !== undefined).flatten() }))
                .reduce((acc, curr) => Object.assign(acc, curr), {});

            modalProxy$.imitate(extractedSinks.modal);

            const mergedSinks : Sinks = Object.keys(sinks)
                .map(s => ({ [s]: mergeTwo(sinks[s], extractedSinks[s]) }))
                .reduce((acc, curr) => Object.assign(acc, curr), {});

            return Object.assign({}, mergedSinks, {
                DOM: mergedVDom$
            });
        }
        return sinks;
    }
}

function mergeTwo(a : Stream<any>, b : Stream<any>) : Stream<any>
{
    if(a === undefined) { return b; }
    if(b === undefined) { return a; }
    return xs.merge(a, b);
}
