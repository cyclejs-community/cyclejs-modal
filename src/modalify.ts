import xs, { Stream } from 'xstream';
import { VNode, h } from '@cycle/dom';
import isolate from '@cycle/isolate';
import { adapt } from '@cycle/run/lib/adapt';
import { mergeSinks, extractSinks } from 'cyclejs-utils';

export type Sinks = any;
export type Sources = any;
export type Component = (s: Sources) => Sinks;

export interface Open {
    type: 'open';
    component: Component;
    sources?: Sources; //To use proper isolation scopes
    backgroundOverlayClose?: boolean; //Default is true
    id?: string; //To allow for `select(id)` on the source, will not merge sinks at top level
    namespace?: Scope[]; //used internally
}

export interface Close {
    type: 'close';
    count?: number; //Default is one
    namespace?: Scope[]; //used internally
}

export type ModalAction = Open | Close;

export interface Options {
    name?: string;
    DOMDriverKey?: string;
    center?: boolean;
    modalContainerClass?: string;
    wrapperClass?: string;
    background?: string;
    zIndex?: number;
}

export type Scope = string | number;

export interface SinksObject {
    id: string | undefined;
    namespace: Scope[];
    sinks$: Stream<any>;
}

export class ModalSource {
    constructor(
        private _namespace: Scope[],
        private _sinks$$: Stream<SinksObject> = xs.create<SinksObject>()
    ) {}

    public select(id: string): ModalSource {
        return new ModalSource(
            this._namespace,
            this._sinks$$.filter(o => o.id !== undefined && o.id === id)
        );
    }

    public sinks(): Stream<any>;
    public sinks(driverNames: string[]): any;
    public sinks(driverNames?: string[]): any | Stream<any> {
        if (driverNames) {
            return extractSinks(this.sinks(), driverNames);
        }
        return this._sinks$$.map(o => o.sinks$).flatten();
    }

    public isolateSource(source: ModalSource, scope: Scope) {
        return new ModalSource(
            (source as any)._namespace.concat(scope),
            (source as any)._sinks$$
                .filter(o => o.namespace[0] === scope)
                .map(o => ({ ...o, namespace: o.namespace.slice(1) }))
        );
    }

    public isolateSink(modal$: Stream<ModalAction>, scope: Scope) {
        return modal$.map(action => ({
            ...action,
            namespace: action.namespace
                ? action.namespace
                : this._namespace.concat(scope)
        }));
    }
}

export function modalify(
    main: Component,
    {
        name = 'modal',
        DOMDriverKey = 'DOM',
        center = true,
        wrapperClass = null,
        modalContainerClass = null,
        background = 'rgba(0,0,0,0.8)',
        zIndex = 500
    }: Options = {}
): Component {
    return function(sources: Sources): Sinks {
        const modalSource = new ModalSource([]);

        const parentSinks: Sinks = main({
            ...sources,
            [name]: modalSource
        });

        const sinks: Sinks = Object.keys(parentSinks)
            .map(k => ({ [k]: xs.fromObservable(parentSinks[k]) }))
            .reduce((prev, curr) => Object.assign(prev, curr), {});

        if (sinks[name]) {
            const modalProxy$: Stream<ModalAction> = xs.create<ModalAction>();
            const modalStack$: Stream<
                [string | undefined, Scope[], Sinks][]
            > = xs
                .merge(sinks[name] as Stream<ModalAction>, modalProxy$)
                .fold((acc, curr) => {
                    if (curr.type === 'close') {
                        const count: number = curr.count || 1;
                        for (let i = 0; i < Math.min(acc.length, count); i++) {
                            const [id, namespace, _] = acc[acc.length - i - 1];
                            (modalSource as any)._sinks$$.shamefullySendNext({
                                id,
                                namespace,
                                sinks$: xs.never()
                            });
                        }
                        return acc.slice(0, Math.max(acc.length - count, 0));
                    } else if (curr.type === 'open') {
                        const _sources: Sources =
                            curr.sources !== undefined ? curr.sources : sources;

                        let overlayClose$ = xs.never();

                        if (curr.backgroundOverlayClose !== false) {
                            overlayClose$ = xs
                                .fromObservable(
                                    sources[DOMDriverKey].select(
                                        'div.cyclejs-modal'
                                    ).events('click')
                                )
                                .map((ev: any) => {
                                    ev.stopPropagation();
                                    return ev;
                                })
                                .filter(
                                    (e: any) =>
                                        e.target ===
                                        (e.currentTarget || e.ownerTarget)
                                )
                                .mapTo({ type: 'close' });
                        }

                        const componentSinks: Sinks = curr.component(_sources);
                        const xsComponentSinks: Sinks = Object.keys(
                            componentSinks
                        )
                            .map(k => ({
                                [k]: xs.fromObservable(componentSinks[k])
                            }))
                            .reduce(
                                (prev, curr) => Object.assign(prev, curr),
                                {}
                            );

                        const domlessSinks: Sinks = { ...componentSinks };
                        delete domlessSinks[DOMDriverKey];

                        (modalSource as any)._sinks$$.shamefullySendNext({
                            id: curr.id,
                            namespace: curr.namespace || [],
                            sinks$: xs.never().startWith(domlessSinks)
                        });

                        return acc.concat([
                            [
                                curr.id,
                                curr.namespace || [],
                                {
                                    ...xsComponentSinks,
                                    modal: xs.merge(
                                        xsComponentSinks[name] || xs.never(),
                                        overlayClose$
                                    )
                                }
                            ]
                        ]);
                    }
                    return acc;
                }, []);

            const modalVDom$: Stream<VNode[]> = modalStack$
                .map<Stream<VNode>[]>(arr => arr.map(s => s[2][DOMDriverKey]))
                .map<Stream<VNode[]>>(arr => xs.combine(...arr))
                .flatten();

            const mergedVDom$: Stream<VNode> = xs
                .combine(sinks[DOMDriverKey] as Stream<VNode>, modalVDom$)
                .map<VNode>(([vdom, modals]) =>
                    h('div', { attrs: { class: wrapperClass || '' } }, [
                        vdom,
                        center && modals.length > 0
                            ? displayModals(
                                  wrapModals(modals, modalContainerClass),
                                  background,
                                  zIndex
                              )
                            : h(
                                  'div',
                                  {
                                      attrs: {
                                          class: modalContainerClass || ''
                                      }
                                  },
                                  modals
                              )
                    ])
                );

            const extractedSinks: Sinks = extractSinks(
                modalStack$
                    .map(arr =>
                        arr.filter(s => s[0] === undefined).map(s => s[2])
                    )
                    .map<Sinks>(mergeSinks),
                Object.keys(sinks)
            );

            modalProxy$.imitate(extractedSinks[name]);
            const newSinks = {
                ...mergeSinks([extractedSinks, sinks]),
                [DOMDriverKey]: mergedVDom$
            };

            return Object.keys(newSinks)
                .map(k => ({ [k]: adapt(newSinks[k]) }))
                .reduce((prev, curr) => Object.assign(prev, curr), {});
        }
        return sinks;
    };
}

export function centerHTML(children: VNode[]): VNode {
    return h(
        'div',
        {
            style: {
                width: '100%',
                height: '100%',
                position: 'relative',
                'pointer-events': 'none'
            }
        },
        children.map(child =>
            h(
                'div',
                {
                    style: {
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        '-ms-transform': 'translate(-50%, -50%)',
                        '-webkit-transform': 'translate(-50%, -50%)',
                        transform: 'translate(-50%, -50%)',
                        'pointer-events': 'auto'
                    }
                },
                [child]
            )
        )
    );
}

function displayModals(
    modals: VNode[],
    background: string = 'rgba(0,0,0,0.8)',
    zIndex = 500
): VNode {
    const processedModals: VNode[] = modals.map((m, i) =>
        addStyles(
            {
                'z-index': i * 5 + 10 + zIndex
            },
            m
        )
    );

    return addStyles(
        {
            background,
            'z-index': zIndex,
            top: '0px',
            left: '0px',
            position: 'fixed',
            width: '100%',
            height: '100%'
        },
        h('div.cyclejs-modal', {}, [centerHTML(processedModals)])
    );
}

function wrapModals(
    modals: VNode[],
    containerClass: string | null = null
): VNode[] {
    const wrapper = child =>
        h(
            'div',
            containerClass
                ? {
                      attrs: {
                          class: containerClass
                      }
                  }
                : {
                      style: {
                          display: 'block',
                          padding: '10px',
                          background: 'white',
                          width: 'auto',
                          height: 'auto',
                          'border-radius': '5px'
                      }
                  },
            [child]
        );

    return modals.map(wrapper);
}

function addStyles(styles: { [k: string]: any }, vnode: VNode): VNode {
    return {
        ...vnode,
        data: {
            ...(vnode.data || {}),
            style: {
                ...(vnode.data.style || {}),
                ...styles
            }
        }
    };
}
