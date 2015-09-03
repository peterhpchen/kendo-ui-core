// -*- fill-column: 100 -*-

(function(f, define){
    define([], f);
})(function(){

    // WARNING: removing the following jshint declaration and turning
    // == into === to make JSHint happy will break functionality.
    /* jshint eqnull:true, laxbreak:true */

    "use strict";

    var spreadsheet = kendo.spreadsheet;
    var Class = kendo.Class;

    function columnName(colIndex) {
        var letter = Math.floor(colIndex / 26) - 1;
        return (letter >= 0 ? columnName(letter) : "") + String.fromCharCode(65 + (colIndex % 26));
    }

    function displayRef(sheet, row, col, rel) {
        var aa = "";

        ++row;

        if (!isFinite(row)) {
            row = "";
        }
        else if (rel != null && !(rel & 2)) {
            row = "$" + row;
        }

        if (!isFinite(col)) {
            col = "";
        }
        else {
            aa = columnName(col);
            if (rel != null && !(rel & 1)) {
                aa = "$" + aa;
            }
        }

        if (sheet) {
            return sheet + "!" + aa + row;
        } else {
            return aa + row;
        }
    }

    /* -----[ References ]----- */

    var Ref = Class.extend({
        type: "ref",
        hasSheet: function() {
            return this._hasSheet;
        },
        simplify: function() {
            return this;
        },
        setSheet: function(sheet, hasSheet) {
            this.sheet = sheet;
            if (hasSheet != null) {
                this._hasSheet = hasSheet;
            }
            return this;
        },
        absolute: function(){
            return this;
        },
        relative: function(){
            return this;
        },
        toString: function() {
            return this.relative(0, 0, 3).print(0, 0);
        },
        forEach: function(callback) {
            callback(this);
        },
        map: function(callback) {
            return callback(this);
        },
        isCell: function() {
            return false;
        },

        // UnionRef overrides these, to access its subranges.
        first: function() {
            return this;
        },
        lastRange: function() {
            return this;
        },
        size: function() {
            return 1;
        },
        rangeAt: function() {
            return this;
        },
        nextRangeIndex: function() {
            return 0;
        },
        previousRangeIndex: function() {
            return 0;
        },
        eq: function(reference) {
            var r1 = this;
            var r2 = reference;

            if (r1 === NULL || r2 === NULL) {
                return r1 === r2;
            }

            // make positions consistent
            if ((r2 instanceof CellRef) || (r2 instanceof RangeRef && !(r1 instanceof CellRef))) {
               r1 = reference;
               r2 = this;
            }

            if (r1 instanceof CellRef) { // cell eq *
                r2 = r2.simplify();
                return r2 instanceof CellRef && r1.row == r2.row && r1.col == r2.col && r1.sheet == r2.sheet;
            }
            else if (r1 instanceof RangeRef) { // range eq range/union
                if (r2 instanceof RangeRef) {
                    return r2.topLeft.eq(r1.topLeft) && r2.bottomRight.eq(r1.bottomRight);
                }
                if (r2 instanceof UnionRef) {
                    return r2.single() && r1.eq(r2.refs[0]);
                }
            }
            else if (r1 instanceof UnionRef && r2 instanceof UnionRef) { // union eq union
                var refs1 = r1.refs;
                var refs2 = r2.refs;
                if (refs1.length != refs2.length) {
                   return false;
                }

                for (var i = 0, len = refs1.length; i < len; i++) {
                    if (!refs1[i].eq(refs2[i])) {
                        return false;
                    }
                }

                return true;
            }

            return r1 === r2;   // XXX: possibly NameRef when we'll support it.
        },

        concat: function(ref) {
            return new UnionRef([this, ref]);
        },

        replaceAt: function(index, ref) {
            return ref;
        },

        forEachColumnIndex: function(callback) {
            this.forEachAxisIndex('col', callback);
        },

        forEachRowIndex: function(callback) {
            this.forEachAxisIndex('row', callback);
        },

        forEachAxisIndex: function(axis, callback) {
            var sorted = [];

            var method = axis === 'row' ? 'forEachRow' : 'forEachColumn';

            this[method](function(ref) {
                var index = ref.first()[axis];
                if (sorted.indexOf(index) === -1) {
                    sorted.push(index);
                }
            });

            sorted.sort().forEach(callback);
        }
    });

    Ref.display = displayRef;

    /* -----[ Null reference ]----- */

    var NULL = new (Ref.extend({
        init: function NullRef(){},
        print: function() {
            return "#NULL!";
        },
        clone: function() {
            return this;
        },
        eq: function(ref) {
            return ref === this;
        },
        forEach: function() {}
    }))();

    /* -----[ Name reference ]----- */

    var NameRef = Ref.extend({
        ref: "name",
        init: function NameRef(name){
            this.name = name;
        },
        print: function(tcol, trow) {
            var ret = this.name;
            if (this.hasSheet()) {
                ret = this.sheet + "!" + ret;
            }
            return ret;
        }
    });

    /* -----[ Cell reference ]----- */

    var CellRef = Ref.extend({
        ref: "cell",
        init: function CellRef(row, col, rel) {
            this.row = row;
            this.col = col;
            this.rel = rel || 0;
        },
        clone: function() {
            return new CellRef(this.row, this.col, this.rel)
                .setSheet(this.sheet, this.hasSheet());
        },
        intersect: function(ref) {
            if (ref instanceof CellRef) {
                if (this.eq(ref)) {
                    return this;
                } else {
                    return NULL;
                }
            }
            return ref.intersect(this);
        },
        print: function(trow, tcol) {
            var col = this.col, row = this.row, rel = this.rel;
            if (trow == null) {
                if (isFinite(col)) {
                    col = rel & 1 ? ("C[" + col + "]") : ("C" + (col + 1));
                } else {
                    col = "";
                }
                if (isFinite(row)) {
                    row = rel & 2 ? ("R[" + row + "]") : ("R" + (row + 1));
                } else {
                    row = "";
                }
                return row + col;
            } else {
                if (rel & 1) {
                    // relative col, add target
                    col += tcol;
                }
                if (rel & 2) {
                    // relative row, add target
                    row += trow;
                }
                if ((isFinite(col) && col < 0) || (isFinite(row) && row < 0)) {
                    return "#REF!";
                }
                return displayRef(this._hasSheet && this.sheet, row, col, rel);
            }
        },
        absolute: function(arow, acol) {
            if (this.rel & 3 === 0) {
                return this;    // already absolute
            }
            var ret = this.clone();
            ret.rel = 0;
            if (this.rel & 1) {
                // relative col, add anchor
                ret.col += acol;
            }
            if (this.rel & 2) {
                // relative row, add anchor
                ret.row += arow;
            }
            return ret;
        },
        toRangeRef: function() {
            return new RangeRef(this, this);
        },
        relative: function(arow, acol, rel) {
            var row = rel & 2 ? this.row - arow : this.row;
            var col = rel & 1 ? this.col - acol : this.col;
            return new CellRef(row, col, rel)
                .setSheet(this.sheet, this.hasSheet());
        },
        height: function() {
            return 1;
        },
        width: function() {
            return 1;
        },
        toString: function() {
            return displayRef(null, this.row, this.col, 3);
        },
        isCell: function() {
            return true;
        },
        simplify: function() {
            return this;
        },
        leftColumn: function() {
            return this;
        },
        rightColumn: function() {
            return this;
        },
        topRow: function() {
            return this;
        },
        bottomRow: function() {
            return this;
        },
        forEachRow: function(callback) {
            callback(this.toRangeRef());
        },
        forEachColumn: function(callback) {
            callback(this.toRangeRef());
        }
    });

    /* -----[ Range reference ]----- */

    var RangeRef = Ref.extend({
        ref: "range",
        init: function RangeRef(tl, br) {
            // we want to drop any sheet information from the cells here.
            this.topLeft = new CellRef(tl.row, tl.col, tl.rel);
            this.bottomRight = new CellRef(br.row, br.col, br.rel);
            this.normalize();
        },
        clone: function() {
            return new RangeRef(this.topLeft, this.bottomRight)
                .setSheet(this.sheet, this.hasSheet());
        },
        _containsRange: function(range) {
            return this._containsCell(range.topLeft)
                && this._containsCell(range.bottomRight);
        },
        _containsCell: function(cell) {
            return cell.sheet == this.sheet
                && cell.row >= this.topLeft.row
                && cell.col >= this.topLeft.col
                && cell.row <= this.bottomRight.row
                && cell.col <= this.bottomRight.col;
        },
        contains: function(ref) {
            if (ref instanceof CellRef) {
                return this._containsCell(ref);
            }
            if (ref instanceof RangeRef) {
                return this._containsRange(ref);
            }
            return false;
        },
        _intersectRange: function(ref) {
            if (this.sheet != ref.sheet) {
                return NULL;
            }
            var a_left    = this.topLeft.col;
            var a_top     = this.topLeft.row;
            var a_right   = this.bottomRight.col;
            var a_bottom  = this.bottomRight.row;
            var b_left    = ref.topLeft.col;
            var b_top     = ref.topLeft.row;
            var b_right   = ref.bottomRight.col;
            var b_bottom  = ref.bottomRight.row;
            if (a_left <= b_right &&
                b_left <= a_right &&
                a_top <= b_bottom &&
                b_top <= a_bottom)
            {
                return new RangeRef(
                    // topLeft
                    new CellRef(Math.max(a_top, b_top),
                                Math.max(a_left, b_left)),
                    // bottomRight
                    new CellRef(Math.min(a_bottom, b_bottom),
                                Math.min(a_right, b_right))
                ).setSheet(this.sheet, this.hasSheet());
            } else {
                return NULL;
            }
        },
        intersect: function(ref) {
            if (ref === NULL) {
                return ref;
            }
            if (ref instanceof CellRef) {
                return this._containsCell(ref) ? ref : NULL;
            }
            if (ref instanceof RangeRef) {
                return this._intersectRange(ref).simplify();
            }
            if (ref instanceof UnionRef) {
                return ref.intersect(this);
            }
            throw new Error("Unknown reference");
        },
        intersects: function(ref) {
            return this.intersect(ref) !== NULL;
        },
        simplify: function() {
            if (this.isCell()) {
                return new CellRef(
                    this.topLeft.row,
                    this.topLeft.col,
                    this.topLeft.rel
                ).setSheet(this.sheet, this.hasSheet());
            }
            return this;
        },
        normalize: function() {
            var a = this.topLeft, b = this.bottomRight;
            var r1 = a.row, c1 = a.col, r2 = b.row, c2 = b.col;
            var rr1 = a.rel & 2, rc1 = a.rel & 1;
            var rr2 = b.rel & 2, rc2 = b.rel & 1;
            var tmp, changes = false;
            if (r1 > r2) {
                changes = true;
                tmp = r1; r1 = r2; r2 = tmp;
                tmp = rr1; rr1 = rr2; rr2 = tmp;
            }
            if (c1 > c2) {
                changes = true;
                tmp = c1; c1 = c2; c2 = tmp;
                tmp = rc1; rc1 = rc2; rc2 = tmp;
            }
            if (changes) {
                this.topLeft = new CellRef(r1, c1, rc1 | rr1);
                this.bottomRight = new CellRef(r2, c2, rc2 | rr2);
            }
            return this;
        },
        print: function(trow, tcol) {
            var ret = this.topLeft.print(trow, tcol)
                + ":"
                + this.bottomRight.print(trow, tcol);
            if (this.hasSheet()) {
                ret = this.sheet + "!" + ret;
            }
            return ret;
        },
        absolute: function(arow, acol) {
            return new RangeRef(
                this.topLeft.absolute(arow, acol),
                this.bottomRight.absolute(arow, acol)
            ).setSheet(this.sheet, this.hasSheet());
        },
        relative: function(arow, acol, rel) {
            return new RangeRef(
                this.topLeft.relative(arow, acol, rel),
                this.bottomRight.relative(arow, acol, rel)
            ).setSheet(this.sheet, this.hasSheet());
        },
        height: function() {
            if (this.topLeft.rel != this.bottomRight.rel) {
                throw new Error("Mixed relative/absolute references");
            }
            return this.bottomRight.row - this.topLeft.row + 1;
        },
        width: function() {
            if (this.topLeft.rel != this.bottomRight.rel) {
                throw new Error("Mixed relative/absolute references");
            }
            return this.bottomRight.col - this.topLeft.col + 1;
        },
        collapse: function() {
            return this.topLeft.toRangeRef();
        },
        leftColumn: function() {
            return new RangeRef(this.topLeft, new CellRef(this.bottomRight.row, this.topLeft.col));
        },
        rightColumn: function() {
            return new RangeRef(new CellRef(this.topLeft.row, this.bottomRight.col), this.bottomRight);
        },
        topRow: function() {
            return new RangeRef(this.topLeft, new CellRef(this.topLeft.row, this.bottomRight.col));
        },
        bottomRow: function() {
            return new RangeRef(new CellRef(this.bottomRight.row, this.topLeft.col), this.bottomRight);
        },
        toRangeRef: function() {
            return this;
        },
        toColumn: function(col) {
            return new RangeRef(
               new CellRef(this.topLeft.row, this.topLeft.col + col),
               new CellRef(this.bottomRight.row, this.topLeft.col + col)
            );
        },
        forEachRow: function(callback) {
            var startRow = this.topLeft.row;
            var endRow = this.bottomRight.row;
            var startCol = this.topLeft.col;
            var endCol = this.bottomRight.col;

            for (var i = startRow; i <= endRow; i++) {
                callback(new RangeRef(
                    new CellRef(i, startCol),
                    new CellRef(i, endCol)
                ));
            }
        },
        forEachColumn: function(callback) {
            var startRow = this.topLeft.row;
            var endRow = this.bottomRight.row;
            var startCol = this.topLeft.col;
            var endCol = this.bottomRight.col;

            for (var i = startCol; i <= endCol; i++) {
                callback(new RangeRef(
                    new CellRef(startRow, i),
                    new CellRef(endRow, i)
                ));
            }
        },
        intersecting: function(refs) {
            return refs.filter(function(ref) {
                return ref.intersects(this);
            }, this);
        },
        union: function(refs, callback) {
            refs = this.intersecting(refs);

            var topLeftRow = this.topLeft.row;
            var topLeftCol = this.topLeft.col;
            var bottomRightRow = this.bottomRight.row;
            var bottomRightCol = this.bottomRight.col;

            refs.forEach(function(ref) {
                if (ref.topLeft.row < topLeftRow) {
                    topLeftRow = ref.topLeft.row;
                }

                if (ref.topLeft.col < topLeftCol) {
                    topLeftCol = ref.topLeft.col;
                }

                if (ref.bottomRight.row > bottomRightRow) {
                    bottomRightRow = ref.bottomRight.row;
                }

                if (ref.bottomRight.col > bottomRightCol) {
                    bottomRightCol = ref.bottomRight.col;
                }

                if (callback) {
                    callback(ref);
                }
            });

            return new RangeRef(
                new CellRef(topLeftRow, topLeftCol),
                new CellRef(bottomRightRow, bottomRightCol)
            );
        },
        resize: function(options) {
            var limit = Math.max.bind(Math, 0);
            function num(value) { return value || 0; }

            var top = this.topLeft.row + num(options.top);
            var left = this.topLeft.col + num(options.left);
            var bottom = this.bottomRight.row + num(options.bottom);
            var right = this.bottomRight.col + num(options.right);

            if (left < 0 && right < 0 || top < 0 && bottom < 0) {
                return NULL;
            } else if (top <= bottom && left <= right) {
                return new RangeRef(new CellRef(limit(top), limit(left)),
                                    new CellRef(limit(bottom), limit(right)));
            } else {
                return NULL;
            }
        },
        move: function(rows, cols) {
            return new RangeRef(
                new CellRef(this.topLeft.row + rows,
                            this.topLeft.col + cols),
                new CellRef(this.bottomRight.row + rows,
                            this.bottomRight.col + cols)
            );
        },
        first: function() {
            return this.topLeft;
        },
        isCell: function() {
            return this.topLeft.eq(this.bottomRight);
        },
        toString: function() {
            return this.topLeft + ":" + this.bottomRight;
        }
    });

    /* -----[ Union reference ]----- */

    var UnionRef = Ref.extend({
        init: function UnionRef(refs){
            this.refs = refs;
            this.length = this.refs.length;
        },
        intersect: function(ref) {
            var a = [];
            for (var i = 0; i < this.length; ++i) {
                var x = ref.intersect(this.refs[i]);
                if (x !== NULL) {
                    a.push(x);
                }
            }
            if (a.length > 0) {
                return new UnionRef(a).simplify();
            }
            return NULL;
        },
        simplify: function() {
            if (this.single()) {
                return this.refs[0].simplify();
            }
            return this;
        },
        absolute: function(arow, acol) {
            return new UnionRef(this.refs.map(function(ref){
                return ref.absolute(arow, acol);
            }));
        },
        forEach: function(callback) {
            this.refs.forEach(callback);
        },
        toRangeRef: function() {
            return this.refs[0].toRangeRef();
        },
        contains: function(theRef) {
            return this.refs.some(function(ref) { return ref.contains(theRef); });
        },
        map: function(callback) {
            return new UnionRef(this.refs.map(callback));
        },
        first: function() {
            return this.refs[0].first();
        },
        lastRange: function() {
            return this.refs[this.length - 1];
        },
        size: function() {
            return this.length;
        },
        single: function() {
            return this.length == 1;
        },
        isCell: function() {
            return this.single() && this.refs[0].isCell();
        },
        rangeAt: function(index) {
            return this.refs[index];
        },
        nextRangeIndex: function(index) {
            if (index === this.length - 1) {
                return 0;
            } else {
                return index + 1;
            }
        },
        previousRangeIndex: function(index) {
            if (index === 0) {
                return this.length - 1;
            } else {
                return index - 1;
            }
        },
        concat: function(ref) {
            return new UnionRef(this.refs.concat([ref]));
        },
        print: function() {
            return this.refs.map(function(ref) { return ref.print(); }).join(",");
        },

        replaceAt: function(index, ref) {
            var newRefs = this.refs.slice();
            newRefs.splice(index, 1, ref);
            return new UnionRef(newRefs);
        },

        leftColumn: function() {
            return this.map(function(ref) {
                return ref.leftColumn();
            });
        },
        rightColumn: function() {
            return this.map(function(ref) {
                return ref.rightColumn();
            });
        },
        topRow: function() {
            return this.map(function(ref) {
                return ref.topRow();
            });
        },
        bottomRow: function() {
            return this.map(function(ref) {
                return ref.bottomRow();
            });
        },
        forEachRow: function(callback) {
            this.forEach(function(ref) {
                ref.forEachRow(callback);
            });
        },
        forEachColumn: function(callback) {
            this.forEach(function(ref) {
                ref.forEachColumn(callback);
            });
        }
    });

    /* -----[ exports ]----- */

    spreadsheet.NULLREF = NULL;
    spreadsheet.SHEETREF = new RangeRef(new CellRef(0, 0), new CellRef(Infinity, Infinity));
    spreadsheet.FIRSTREF = new CellRef(0, 0);
    spreadsheet.Ref = Ref;
    spreadsheet.NameRef = NameRef;
    spreadsheet.CellRef = CellRef;
    spreadsheet.RangeRef = RangeRef;
    spreadsheet.UnionRef = UnionRef;

    spreadsheet.SHEETREF.print = function() {
        return "#SHEET";
    };

}, typeof define == 'function' && define.amd ? define : function(_, f){ f(); });
