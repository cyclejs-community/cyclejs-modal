# cyclejs-modal
An easy way to open custom modals in a cyclejs app

## Use it
`npm install --save cyclejs-modal`

## Caveats

`modalify` assumes that your DOM Driver is using the `DOM` property for sink and source.

## Example

You can find the examples in the [examples/](https://github.com/cyclejs-community/cyclejs-modal/tree/master/examples) folder

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
