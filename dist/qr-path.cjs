'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

class Path {
    constructor(startX, startY, endX, endY) {
        this.points = [
            { x: startX, y: startY },
            { x: endX, y: endY },
        ];
    }

    concat(path) {
        let path1End = this.points.pop();
        let path2Start = path.points[0];
        if (path1End.x !== path2Start.x || path1End.y !== path2Start.y) {
            throw `End point of path1 is not start point of path2`;
        }
        this.points = this.points.concat(path.points);
    }

    startPoint() {
        return this.points[0];
    }

    endPoint() {
        return this.points[this.points.length - 1];
    }
}

class PathCollection {
    static getKey(point) {
        return point.x + '/' + point.y;
    }

    constructor() {
        this.paths = []; // array of Path or null(for removed path)
        this.pathStart = new Map();
        this.pathEnd = new Map();
    }

    addPath(path) {
        path = this._concatToStart(path);
        path = this._concatToEnd(path);
        this._put(path);
    }

    getResult() {
        return this.paths.filter(path => path !== null).map(path => {
            // 把呈一直線的點合併
            let points = path.points;
            let result = [
                points[0],
                points[1],
            ];
            for (let i = 2; i < points.length; ++i) {
                let k = result.length;
                let p1 = result[k - 2];
                let p2 = result[k - 1];
                let p3 = points[i];
                // 三點呈一線外積為零
                if ((p1.x - p2.x) * (p3.y - p2.y) + (p1.y - p2.y) * (p3.x - p2.x) === 0) {
                    result[k-1] = p3;
                } else {
                    result.push(p3);
                }
            }
            // 若頭尾相等，移除最後一個點
            let p1 = result[0];
            let p2 = result[result.length - 1];
            if (p1.x === p2.x && p1.y === p2.y) {
                result.pop();
            }
            return result;
        });
    }

    _concatToStart(path) {
        let key = PathCollection.getKey(path.endPoint());
        let oldPath = this._take('start', key);
        if (oldPath !== null) {
            path.concat(oldPath);
        }
        return path;
    }

    _concatToEnd(path) {
        let key = PathCollection.getKey(path.startPoint());
        let oldPath = this._take('end', key);
        if (oldPath !== null) {
            oldPath.concat(path);
            return oldPath;
        }
        return path;
    }

    _take(mode, key) {
        let idx, path;
        switch (mode) {
            case 'start':
                if (!this.pathStart.has(key)) {
                    return null;
                }
                idx = this.pathStart.get(key);
                path = this.paths[idx];
                this.pathStart.delete(key);
                key = PathCollection.getKey(path.endPoint());
                this.pathEnd.delete(key);
                this.paths[idx] = null;
                return path;
            case 'end':
                if (!this.pathEnd.has(key)) {
                    return null;
                }
                idx = this.pathEnd.get(key);
                path = this.paths[idx];
                this.pathEnd.delete(key);
                key = PathCollection.getKey(path.startPoint());
                this.pathStart.delete(key);
                this.paths[idx] = null;
                return path;
            default:
                throw `_take mode must be "start" or "end"`;
        }
    }

    _put(path) {
        let idx = this.paths.length;
        this.paths.push(path);
        let sKey = PathCollection.getKey(path.startPoint());
        if (this.pathStart.has(sKey)) {
            throw `pathStart[${sKey}] 已存在`;
        }
        this.pathStart.set(sKey, idx);
        let eKey = PathCollection.getKey(path.endPoint());
        if (this.pathEnd.has(eKey)) {
            throw `pathEnd[${eKey}] 已存在`;
        }
        this.pathEnd.set(eKey, idx);
    }
}

/**
 * @typedef {object} Point
 * @property {number} x
 * @property {number} y
 */

/**
 * @typedef {Point[]} closePath
 */

/**
 * 判斷 (x, y) 的點是否填色
 * @callback isDarkCallback
 * @param {number} x x座標
 * @param {number} y y座標
 * @returns {boolean}
 */

/**
 * 從給予的圖形產生繪製此圖形所需要的路徑
 * @param {number} width 寬
 * @param {number} height 高
 * @param {isDarkCallback} isDark 
 * @returns {closePath[]} 繪製此圖形的封閉路徑資料
 */
function QrPath(width, height, isDark) {
    let collection = new PathCollection();
    for (let y = 0; y < height; ++y) {
        for (let x = 0; x < width; ++x) {
            if (isDark(x, y)) {
                if (x - 1 < 0 || !isDark(x - 1, y)) {
                    collection.addPath(new Path(x, y + 1, x, y));
                }
                if (y - 1 < 0 || !isDark(x, y - 1)) {
                    collection.addPath(new Path(x, y, x + 1, y));
                }
                if (x + 1 >= width || !isDark(x + 1, y)) {
                    collection.addPath(new Path(x + 1, y, x + 1, y + 1));
                }
                if (y + 1 >= height || !isDark(x, y + 1)) {
                    collection.addPath(new Path(x + 1, y + 1, x, y + 1));
                }
            }
        }
    }
    return collection.getResult();
}

exports.QrPath = QrPath;
