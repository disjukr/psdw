if (typeof module !== 'undefined')
    module.exports = psdw;

function psdw(option) {
    var writer = new psdw.PsdWriter();
    writer.width = option.width;
    writer.height = option.height;
    writer.backgroundColor = option.backgroundColor;
    writer.layers = option.layers;
    writer.flattenedImageData = option.flattenedImageData;
    return writer;
}
psdw.PsdWriter = function PsdWriter() {
    this.layers = [];
};
psdw.blendMode = {
    'pass through': 'pass',
    'normal': 'norm',
    'dissolve': 'diss',
    'darken': 'dark',
    'multiply': 'mul ',
    'color burn': 'idiv',
    'linear burn': 'lbrn',
    'darker color': 'dkCl',
    'lighten': 'lite',
    'screen': 'scrn',
    'color dodge': 'div ',
    'linear dodge': 'lddg',
    'lighter color': 'lgCl',
    'overlay': 'over',
    'soft light': 'sLit',
    'hard light': 'hLit',
    'vivid light': 'vLit',
    'linear light': 'lLit',
    'pin light': 'pLit',
    'hard mix': 'hMix',
    'difference': 'diff',
    'exclusion': 'smud',
    'subtract': 'fsub',
    'divide': 'fdiv',
    'hue': 'hue ',
    'saturation': 'sat ',
    'color': 'colr',
    'luminosity': 'lum '
};
psdw.compression = {
    'raw': 0,
    'rle': 1,
    'zip without prediction': 2,
    'zip with prediction': 3
};
psdw.PsdWriter.pad2 = function pad2(len) {
    return len % 2;
};
psdw.PsdWriter.pad4 = function pad4(len) {
    return (4 - (len % 4)) % 4;
};
psdw.PsdWriter.pascalString = function pascalString(value) { // 1 byte length + iso-8859-1
    var charCodeArray = value.substr(0, 0xff).split('').map(function (char) {
        var charCode = char.charCodeAt();
        var alternativeCode = '?'.charCodeAt();
        return charCode > 0xff ? alternativeCode : charCode;
    });
    return new Uint8Array(
        [charCodeArray.length].concat(charCodeArray)
    );
};
psdw.PsdWriter.unicodeString = function unicodeString(value) { // 4 byte length + ucs2
    var buffer = new ArrayBuffer(4 + (value.length * 2));
    var view = new DataView(buffer);
    view.setUint32(0, value.length);
    value.split('').forEach(function (char, index) {
        view.setUint16(4 + (index * 2), char.charCodeAt());
    });
    return new Uint8Array(buffer);
};
psdw.PsdWriter.writeSignature = function writeSignature(view, byteOffset, value) {
    view.setUint8(byteOffset, value[0].charCodeAt());
    view.setUint8(byteOffset + 1, value[1].charCodeAt());
    view.setUint8(byteOffset + 2, value[2].charCodeAt());
    view.setUint8(byteOffset + 3, value[3].charCodeAt());
};
psdw.PsdWriter.imageResource = function imageResource(resourceId, resourceData) {
    if (!(resourceData instanceof Uint8Array))
        resourceData = new Uint8Array(resourceData);
    var buffer = new ArrayBuffer(12 + resourceData.length);
    var view = new DataView(buffer);
    psdw.PsdWriter.writeSignature(view, 0, '8BIM');
    view.setUint16(4, resourceId | 0);
    // two zero byte for null name
    view.setUint32(8, resourceData.length);
    var uint8array = new Uint8Array(buffer, 12);
    uint8array.set(resourceData);
    return buffer;
};
psdw.PsdWriter.channelImageData = function channelImageData(imageData, channelCount, channelOffset, compression) {
    if (compression !== psdw.compression['raw'])
        compression = psdw.compression['raw']; // TODO: support rle
    var len = (imageData.length / channelCount) | 0;
    var uint8array = new Uint8Array(2 + len);
    uint8array[1] = compression;
    for (var i = 2, j = channelOffset; j < imageData.length; ++i, j += channelCount)
        uint8array[i] = imageData[j];
    return uint8array;
};
psdw.PsdWriter.additionalLayerInformation = function additionalLayerInformation(key, data) {
    if (!(data instanceof Uint8Array))
        data = new Uint8Array(data);
    var dataLength = data.length + psdw.PsdWriter.pad2(data.length); // length of data with padding
    var buffer = new ArrayBuffer(
        4 + // signature
        4 + // key
        4 + // length of data
        dataLength
    );
    var view = new DataView(buffer);
    psdw.PsdWriter.writeSignature(view, 0, '8BIM');
    psdw.PsdWriter.writeSignature(view, 4, key);
    view.setUint32(8, dataLength);
    var uint8array = new Uint8Array(buffer, 12);
    uint8array.set(data);
    return buffer;
};
psdw.PsdWriter.layerRecord = function layerRecord(top, left, bottom, right,
                                                  name, opacity, blendMode,
                                                  rLen, gLen, bLen, aLen,
                                                  additionalLayerInformationArray) {
    var nameUint8Array = psdw.PsdWriter.pascalString(name);
    var padding = psdw.PsdWriter.pad4(nameUint8Array.length);
    var additionalLayerInformationArrayByteLength = additionalLayerInformationArray.reduce(function (prev, curr) {
        return prev + curr.byteLength;
    }, 0);
    var extraDataFieldLength = 4 + // no mask data
                               44 + // 4 byte for length + src, dst blending ranges per channel (gray + g + b + a)
                               nameUint8Array.length + padding + // name
                               additionalLayerInformationArrayByteLength;
    var buffer = new ArrayBuffer(
        16 + // top, left, bottom, right
        2 + // number of channels. 4
        24 + // channel information(6) * number of channels(4)
        4 + // signature
        4 + // blend mode key
        1 + // opacity
        1 + // clipping
        1 + // flags
        1 + // filler
        4 + // length of extra data field
        extraDataFieldLength
    );
    var view = new DataView(buffer);
    view.setUint32(0, top);
    view.setUint32(4, left);
    view.setUint32(8, bottom);
    view.setUint32(12, right);
    view.setUint16(16, 4); // number of channels
    view.setUint16(18, 0); // red
    view.setUint32(20, rLen); // red channel data length
    view.setUint16(24, 1); // green
    view.setUint32(26, gLen); // green channel data length
    view.setUint16(30, 2); // blue
    view.setUint32(32, bLen); // blue channel data length
    view.setUint16(36, -1); // alpha
    view.setUint32(38, aLen); // alpha channel data length
    psdw.PsdWriter.writeSignature(view, 42, '8BIM');
    psdw.PsdWriter.writeSignature(view, 46, psdw.blendMode[blendMode]);
    view.setUint8(50, (opacity * 0xff) | 0); // opacity
    view.setUint8(51, 0); // clipping
    view.setUint8(52, 8); // flags. TODO: visibility
    view.setUint8(53, 0); // filler
    view.setUint32(54, extraDataFieldLength);
    view.setUint32(58, 0); // no mask data
    view.setUint32(62, 40); // length of layer blending ranges data
    view.setUint32(66, 0x0000ffff); // gray src range
    view.setUint32(70, 0x0000ffff); // gray dst range
    view.setUint32(74, 0x0000ffff); // red src range
    view.setUint32(78, 0x0000ffff); // red dst range
    view.setUint32(82, 0x0000ffff); // green src range
    view.setUint32(86, 0x0000ffff); // green dst range
    view.setUint32(90, 0x0000ffff); // blue src range
    view.setUint32(94, 0x0000ffff); // blue dst range
    view.setUint32(98, 0x0000ffff); // alpha src range
    view.setUint32(102, 0x0000ffff); // alpha dst range
    var uint8array = new Uint8Array(buffer);
    uint8array.set(nameUint8Array, 106);
    var byteOffset = 106 + nameUint8Array.length + padding;
    additionalLayerInformationArray.forEach(function (additionalLayerInformation) {
        var additionalLayerInformationUint8Array = new Uint8Array(additionalLayerInformation);
        uint8array.set(additionalLayerInformationUint8Array, byteOffset);
        byteOffset += additionalLayerInformationUint8Array.length;
    });
    return buffer;
};
psdw.PsdWriter.layerInfo = function layerInfo(layers) {
    var channelImageDataArray = [];
    var layerRecordArray = layers.map(function (layer) {
        var top = layer.y | 0;
        var left = layer.x | 0;
        var bottom = top + (layer.height | 0);
        var right = left + (layer.width | 0);
        var name = layer.name + '';
        var opacity = layer.opacity !== undefined ? layer.opacity : 1;
        var blendMode = layer.blendMode || 'normal';
        var additionalLayerInformationArray = [];
        var imageData = layer.imageData;
        var compression = psdw.compression['raw'];
        var rImageData = psdw.PsdWriter.channelImageData(imageData, 4, 0, compression);
        var gImageData = psdw.PsdWriter.channelImageData(imageData, 4, 1, compression);
        var bImageData = psdw.PsdWriter.channelImageData(imageData, 4, 2, compression);
        var aImageData = psdw.PsdWriter.channelImageData(imageData, 4, 3, compression);
        channelImageDataArray.push(rImageData, gImageData, bImageData, aImageData);
        (function () {
            var data = psdw.PsdWriter.unicodeString(name);
            additionalLayerInformationArray.push(
                psdw.PsdWriter.additionalLayerInformation('luni', data)
            );
        })();
        // TODO? fx: drop shadow, glow, bevel...
        return psdw.PsdWriter.layerRecord(
            top, left, bottom, right,
            name, opacity, blendMode,
            rImageData.length, gImageData.length, bImageData.length, aImageData.length,
            additionalLayerInformationArray
        );
    });
    var layerRecordArrayByteLength = layerRecordArray.reduce(function (prev, curr) {
        return prev + curr.byteLength;
    }, 0);
    var channelImageDataArrayByteLength = channelImageDataArray.reduce(function (prev, curr) {
        return prev + curr.length;
    }, 0);
    var layerInfoLength = 2 + // layer count
                          layerRecordArrayByteLength +
                          channelImageDataArrayByteLength +
                          psdw.PsdWriter.pad2(channelImageDataArrayByteLength); // padding
    var buffer = new ArrayBuffer(
        4 + // length
        layerInfoLength
    );
    var view = new DataView(buffer);
    view.setUint32(0, layerInfoLength);
    view.setUint16(4, layers.length);
    var uint8array = new Uint8Array(buffer);
    var byteOffset = 6;
    layerRecordArray.forEach(function (layerRecord) {
        var layerRecordUint8Array = new Uint8Array(layerRecord);
        uint8array.set(layerRecordUint8Array, byteOffset);
        byteOffset += layerRecordUint8Array.length;
    });
    channelImageDataArray.forEach(function (channelImageData) {
        uint8array.set(channelImageData, byteOffset);
        byteOffset += channelImageData.length;
    });
    return buffer;
};
Object.defineProperty(psdw.PsdWriter.prototype, 'fileHeader', {
    get: function () {
        var buffer = new ArrayBuffer(4 + 2 + 6 + 2 + 4 + 4 + 2 + 2);
        var view = new DataView(buffer);
        psdw.PsdWriter.writeSignature(view, 0, '8BPS'); // 0 Signature
        view.setUint16(4, 1); // version
        view.setUint16(12, 4); // number of channels, RGBA
        view.setUint32(14, this.height | 0); // height of the image in pixels
        view.setUint32(18, this.width | 0); // width of the image in pixels
        view.setUint16(22, 8); // depth, 1 byte per channel
        view.setUint16(24, 3); // color mode, RGB
        return buffer;
    }
});
Object.defineProperty(psdw.PsdWriter.prototype, 'colorModeData', {
    get: function () {
        var buffer = new ArrayBuffer(4);
        return buffer;
    }
});
Object.defineProperty(psdw.PsdWriter.prototype, 'imageResources', {
    get: function () {
        var self = this;
        var imageResourceArray = [];
        // if (self.backgroundColor !== undefined) {
        //     (function () {
        //         var buffer = new ArrayBuffer(8);
        //         var view = new DataView(buffer);
        //         view.setUint16(0, 0); // RGB
        //         view.setUint16(2, (self.backgroundColor.r * 0xffff) | 0);
        //         view.setUint16(4, (self.backgroundColor.g * 0xffff) | 0);
        //         view.setUint16(6, (self.backgroundColor.b * 0xffff) | 0);
        //         imageResourceArray.push(psdw.PsdWriter.imageResource(0x03f2, buffer));
        //     })();
        // }
        var totalLength = imageResourceArray.reduce(function (prev, curr) {
            return prev + curr.byteLength;
        }, 0);
        var buffer = new ArrayBuffer(totalLength + 4);
        var view = new DataView(buffer);
        view.setUint32(0, totalLength);
        var uint8array = new Uint8Array(buffer, 4);
        var byteOffset = 0;
        imageResourceArray.forEach(function (imageResource) {
            uint8array.set(new Uint8Array(imageResource), byteOffset);
            byteOffset += imageResource.byteLength;
        });
        return buffer;
    }
});
Object.defineProperty(psdw.PsdWriter.prototype, 'layerAndMaskInformation', {
    get: function () {
        var layerInfo = psdw.PsdWriter.layerInfo(this.layers);
        var layerAndMaskInformationByteLength = layerInfo.byteLength +
                                                4; // no global layer mask information
        var buffer = new ArrayBuffer(
            4 + // length of the layer and mask information section
            layerAndMaskInformationByteLength
        );
        var view = new DataView(buffer);
        view.setUint32(0, layerAndMaskInformationByteLength);
        var uint8array = new Uint8Array(buffer);
        uint8array.set(new Uint8Array(layerInfo), 4);
        return buffer;
    }
});
Object.defineProperty(psdw.PsdWriter.prototype, 'imageData', {
    get: function () {
        var flattenedImageData = this.flattenedImageData;
        var compression = psdw.compression['raw'];
        var i, len = flattenedImageData.length;
        var buffer = new ArrayBuffer(
            2 + // compression
            len
        );
        var view = new DataView(buffer);
        view.setUint16(0, compression);
        var uint8array = new Uint8Array(buffer);
        var byteOffset = 2;
        for (i = 0; i < len; i += 4) uint8array[byteOffset++] = flattenedImageData[i];
        for (i = 1; i < len; i += 4) uint8array[byteOffset++] = flattenedImageData[i];
        for (i = 2; i < len; i += 4) uint8array[byteOffset++] = flattenedImageData[i];
        for (i = 3; i < len; i += 4) uint8array[byteOffset++] = flattenedImageData[i];
        return buffer;
    }
});
Object.defineProperty(psdw.PsdWriter.prototype, 'blob', {
    get: function () {
        return new Blob([
            this.fileHeader,
            this.colorModeData,
            this.imageResources,
            this.layerAndMaskInformation,
            this.imageData
        ], {
            type: 'image/vnd.adobe.photoshop'
        });
    }
});
