'use strict';

/**
 * 輸入：0 跟 1 的矩陣
 * 輸出：描繪此矩陣圖形路徑的點
 * 
 * 之後便可以用來產生 SVG、Postscript 等檔案
 * PS. 填充方式使用 nonzero（evenodd 應該也可，未測試）
 * 
 * 這一開始雖然是設計來畫出 QR Code
 * 但也可以畫出任意的 01 矩陣，長寬不一定要相同
 * 
 * 使用方式：
 * pathArray = QRPath(qrData)
 */

//代表方向的常數
const DIR_UP = 2;
const DIR_RIGHT = 3;
const DIR_DOWN = 4;
const DIR_LEFT = 5;

/**
 * 對格子 (col=n, row=m)，設定牆壁的 (x,y) 座標
 * 
 * 例如設定 DIR_UP 的牆壁：
 * 1. 取 DIR_OFFSET[DIR_UP]
 * 2. 得到起始點 (x=n+DIR_OFFSET[DIR_UP][0], y=n+DIR_OFFSET[DIR_UP][1])
 * 3. 得到終點 (x=n+DIR_OFFSET[DIR_UP][2], y=n+DIR_OFFSET[DIR_UP][3])
 */
const DIR_OFFSET = [null, null,
    [0, 1, 0, 0],
    [0, 0, 1, 0],
    [1, 0, 1, 1],
    [1, 1, 0, 1]
];

/**
 * 建構函式
 * 如果直接呼叫，會自動建立此物件後再呼叫 getPath 的結果
 * 
 * @param {Object} qrData 代表二維陣列的物件，有 data 跟 size 兩個元素
 *                        size: 每列有幾行
 *                        data: 0 跟 1 的一維陣列，長度必須是 size 的整數倍
 * @returns {void|array} 如果直接呼叫，回傳 getPath 的結果
 */
function QRPath(qrData) {
    if (!(this instanceof QRPath)) {
        const obj = new QRPath(qrData);
        return obj.getPath();
    }
    this.data = qrData.data;
    this.nCols = qrData.size;
    this.nRows = parseInt(qrData.data.length / qrData.size, 10);
    this.wallCollection = [];
    this.wallStartIndexDict = {};
    this.wallEndIndexDict = {};
}

/**
 * 取得所有路徑的座標
 * 
 * @returns {array} 陣列，每個元素為「封閉路徑」
 *                  封閉路徑由一維陣列表示，其元素是有 x,y 屬性的物件
 */
QRPath.prototype.getPath = function () {
    const n = this.data.length;
    const sz = this.nCols;
    const sz_y = this.nRows;
    const arr = this.data;
    for (let i = 0; i < n; ++i) {
        if (arr[i] === 1) {
            const x = i % sz;
            const y = (i - x) / sz;
            //左
            if (x === 0 || arr[i - 1] === 0) {
                this._addWall(y, x, DIR_UP);
            }
            //上
            if (y === 0 || arr[i - sz] === 0) {
                this._addWall(y, x, DIR_RIGHT);
            }
            //右
            if (x + 1 === sz || arr[i + 1] === 0) {
                this._addWall(y, x, DIR_DOWN);

            }
            //下
            if (y + 1 === sz_y || arr[i + sz] === 0) {
                this._addWall(y, x, DIR_LEFT);
            }
        }
    }
    const wallCollection = this.wallCollection;
    let pathCollection = [];
    let path = false;
    for (let i = 0; i < wallCollection.length; ++i) {
        if (!wallCollection[i]) {
            continue;
        }
        path = [];
        const wall = wallCollection[i];
        const midArr = wall.mid;
        midArr.push(wall.start);
        let dir = getDir(wall.start, midArr[0]), t;
        for (let j = 0; j + 1 < midArr.length; ++j) {
            t = getDir(midArr[j], midArr[j + 1]);
            if (t !== dir) {
                dir = t;
                path.push({
                    x: midArr[j].x,
                    y: midArr[j].y
                });
            }
        }
        t = getDir(midArr[midArr.length - 1], midArr[0]);
        if (t !== dir) {
            dir = t;
            path.push({
                x: midArr[midArr.length - 1].x,
                y: midArr[midArr.length - 1].y
            });
        }
        pathCollection.push(path);
    }
    return pathCollection;

    function getDir(p1, p2) {
        return p1.x === p2.x ? 'v' : 'h';
    }
};

/**
 * 加入一面牆
 * 
 * @param {Integer} m 黑色格子的列數
 * @param {Integer} n 黑色格子的行數
 * @param {Integer} direction 方向，允許的值有 DIR_UP、DIR_DOWN、DIR_LEFT、DIR_RIGHT
 */
QRPath.prototype._addWall = function (m, n, direction) {
    //設定第 m 列 n 行的格子，direction 方向為牆壁
    //此 m 列 n 行的格子必須為黑色格子
    let currentWall = {
        start: {
            x: n + DIR_OFFSET[direction][0],
            y: m + DIR_OFFSET[direction][1],
            m: m,
            n: n
        },
        end: {
            x: n + DIR_OFFSET[direction][2],
            y: m + DIR_OFFSET[direction][3],
            m: m,
            n: n
        },
        mid: []
    };
    let currentIndex = this._insertToWallCollection(currentWall);
    //起始點跟先前的終點合併
    let linkedIndex = this._searchEnd(currentWall.start);
    if (linkedIndex > -1) {
        currentIndex = this._margeWall(linkedIndex, currentIndex);
        currentWall = this.wallCollection[currentIndex];
    }
    //終點跟先前的起始點合併
    linkedIndex = this._searchStart(currentWall.end);
    if (linkedIndex > -1) {
        currentIndex = this._margeWall(currentIndex, linkedIndex);
        currentWall = this.wallCollection[currentIndex];
    }
};

/**
 * 插入一面牆到 this.wallCollection
 * 
 * @param {Object} wall 牆壁
 * @returns {Integer} wallCollection 的 index
 */
QRPath.prototype._insertToWallCollection = function (wall) {
    const key1 = wall.start.x + ',' + wall.start.y;
    const key2 = wall.end.x + ',' + wall.end.y;
    const idx = this.wallCollection.length;
    this.wallCollection.push(wall);
    if (this.wallStartIndexDict[key1]) {
        this.wallStartIndexDict[key1].push(idx);
    } else {
        this.wallStartIndexDict[key1] = [idx];
    }
    if (this.wallEndIndexDict[key2]) {
        this.wallEndIndexDict[key2].push(idx);
    } else {
        this.wallEndIndexDict[key2] = [idx];
    }
    return idx;
};

/**
 * 尋找 this.wallCollection 中的牆壁
 * 其 start 可以與 endPoint 連接起來
 * 
 * @param {Object} endPoint 終點
 * @returns {Integer} 可以被連接的牆壁的 index
 */
QRPath.prototype._searchStart = function (endPoint) {
    //回傳終點與 endPoint 相同的 index of wallCollection，找不到回傳 -1
    const key = endPoint.x + ',' + endPoint.y;
    if (!this.wallStartIndexDict[key] || this.wallStartIndexDict[key].length < 1) {
        return -1;
    }
    const arr = this.wallStartIndexDict[key];
    let i;
    for (i = arr.length - 1; i >= 0; --i) {
        let wall = this.wallCollection[arr[i]];
        let p = wall.start;
        let dis = (p.n - endPoint.n) * (p.n - endPoint.n) + (p.m - endPoint.m) * (p.m - endPoint.m);
        if (dis <= 1 || (dis === 2 && (this.data[endPoint.m * this.nCols + p.n] || this.data[p.m * this.nCols + endPoint.n]))) {
            return arr[i];
        }
    }
    return -1;
};

/**
 * 尋找 this.wallCollection 中的牆壁
 * 其 end 可以與 startPoint 連接起來
 * 
 * @param {Object} startPoint 起始點
 * @returns {Integer} 可以被連接的牆壁的 index
 */
QRPath.prototype._searchEnd = function (startPoint) {
    //回傳起始點與 startPoint 相同的 index of wallCollection，找不到回傳 -1
    const key = startPoint.x + ',' + startPoint.y;
    if (!this.wallEndIndexDict[key] || this.wallEndIndexDict[key].length < 1) {
        return -1;
    }
    const arr = this.wallEndIndexDict[key];
    let i;
    for (i = arr.length - 1; i >= 0; --i) {
        let wall = this.wallCollection[arr[i]];
        let p = wall.end;
        let dis = (p.n - startPoint.n) * (p.n - startPoint.n) + (p.m - startPoint.m) * (p.m - startPoint.m);
        if (dis <= 1 || (dis === 2 && (this.data[startPoint.m * this.nCols + p.n] || this.data[p.m * this.nCols + startPoint.n]))) {
            return arr[i];
        }
    }
    return -1;
};

/**
 * 合併 this.wallCollection 中的兩面牆壁
 * 注意：牆壁 A 的終點必須跟牆壁 B 的起始點是同一個點
 * 
 * @param {*} idx1 牆壁A（起始）的 index
 * @param {*} idx2 牆壁B（結束）的 index
 * @returns 牆壁 A 的 index
 */
QRPath.prototype._margeWall = function (idx1, idx2) {
    //把 idx2 的牆壁加到 idx1，並回傳 idx1
    const wall1 = this.wallCollection[idx1];
    const wall2 = this.wallCollection[idx2];
    if (wall1.end.x !== wall2.start.x || wall1.end.y !== wall2.start.y) {
        throw 'function margeWall: 牆壁無法連結';
    }
    //移除 wall2 Dict
    removeFromDict(this.wallStartIndexDict, wall2.start.x + ',' + wall2.start.y, idx2);
    removeFromDict(this.wallEndIndexDict, wall2.end.x + ',' + wall2.end.y, idx2);
    //移除 wall1 EndDict
    removeFromDict(this.wallEndIndexDict, wall1.end.x + ',' + wall1.end.y, idx1);
    if (idx1 === idx2) { //閉合了
        return idx1;
    }
    wall1.mid.push(wall1.end);
    let n = wall2.mid.length;
    for (let i = 0; i < n; ++i) {
        wall1.mid.push(wall2.mid[i]);
    }
    wall1.end = wall2.end;

    //新增 wall1 EndDict
    const key1 = wall1.end.x + ',' + wall1.end.y;
    if (this.wallEndIndexDict[key1]) {
        this.wallEndIndexDict[key1].push(idx1);
    } else {
        this.wallEndIndexDict[key1] = [idx1];
    }
    this.wallCollection[idx2] = null;
    return idx1;

    function removeFromDict(dict, key, wallIndex) {
        if (!dict[key]) {
            return;
        }
        const arr = dict[key];
        let idx = arr.indexOf(wallIndex);
        if (idx > -1) {
            arr[arr.length - 1] = arr[idx];
            arr.pop();
        }
    }
};

module.exports = QRPath;
