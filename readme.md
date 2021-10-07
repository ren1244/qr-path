## 概述

qr-path 能取得能描繪出 QR Code 路徑的座標點，供後續產生 svg 或是 PostScript 等向量圖形。

輸出的座標點會最佳化，只產生形成外框所必要的座標。

PS. 填色時使用 nonzero 模式。

## 使用方式

以下為產生 svg 圖檔的範例

```
import QRPath from 'qr-path';
//or const QRPath = require('qr-path');

let pathArray = QRPath({
    size: 4, //每列有幾行
    data: [
        1, 1, 1, 0,
        0, 1, 0, 1,
        1, 0, 1, 1,
        1, 1, 0, 1
    ] //二維矩陣資料
});

//從取得的路徑點產生 svg path 內容
let dData = pathArray.map(closePath => {
    return closePath.map((point, idx) => {
        return `${(idx === 0 ? 'M' : 'L')}${point.x} ${point.y}`;
    }).join('');
}).join('');

//產生 svg
let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 4 4">
    <path d="${dData}" fill="#000000"/>
</svg>`;
```
