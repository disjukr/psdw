# psdw
simple javascript psd writer

## usage
```js
var psdBlob = psdw({
    width/* required */: 1, // pixel unit
    height/* required */: 1, // pixel unit
    flattenedImageData/* required */: new Uint8ClampedArray([0, 0, 0, 0]),
    layers: [
        { // bottom layer (background)
            name/* required */: 'psdw layer',
            imageData/* required */: new Uint8ClampedArray([0, 0, 0, 0]),
            // like html5 canvas image data
            width/* required */: 1, // pixel unit
            height/* required */: 1, // pixel unit
            x/* optional */: 0, // pixel unit
            y/* optional */: 0, // pixel unit
            opacity/* optional */: 1, // 0(transparent) ~ 1(opaque)
            blendMode/* optional */: 'normal' // see below (blend modes)
        }, { // middle layer
            imageData: new Uint8ClampedArray([0, 0, 0, 0]),
            width: 1,
            height: 1
            // other properties...
        }, { // top layer (foreground)
            imageData: new Uint8ClampedArray([0, 0, 0, 0]),
            width: 1,
            height: 1
            // other properties...
        }
    ]
}).blob;
```

## blend modes
* pass through
* normal
* dissolve
* darken
* multiply
* color burn
* linear burn
* darker color
* lighten
* screen
* color dodge
* linear dodge
* lighter color
* overlay
* soft light
* hard light
* vivid light
* linear light
* pin light
* hard mix
* difference
* exclusion
* subtract
* divide
* hue
* saturation
* color
* luminosity
