# cyclejs-modal
An easy way to open custom modals in a cyclejs app

Documentation is hosted on [Github Pages](https://cyclejs-community.github.io/cyclejs-modal/index.html)

## Use it
`npm install --save cyclejs-modal`

## Example

You can find the examples in the [examples/](https://github.com/cyclejs-community/cyclejs-modal/tree/master/examples) folder

Since Version 5.2.0 you can also pass the sources to the created modal. This allows the modal to access the isolation scope of its creation place. Take a look at the [onionify example](https://github.com/cyclejs-community/cyclejs-modal/blob/master/examples/onionify/src/index.ts) to see this in action.

Since Version 5.3.0 modals can be closed by clicking on the gray overlay. You can disable that in the `open` message:
```js
{
    type: 'open',
    component: MyModal,
    backgroundOverlayClose: false
}
```

```js
function main({ DOM }) {
    return {
        DOM: xs.of(button('.button', ['open modal'])),
        modal: DOM.select('.button').events('click')
            .mapTo({
                type: 'open',
                component: isolate(modal, 'myscope')
            } as ModalAction)
    };
}

function modal({ DOM }) {
    return {
        DOM: xs.of(div('.div', [
            span('.span', ['This is a modal. Yeah? :)']),
            button('.button', ['close'])
        ])),
        modal: DOM.select('.button').events('click')
            .mapTo({ type: 'close' } as ModalAction)
    };
}
```

## Try it

Clone it, run `npm i && npm run examples`
