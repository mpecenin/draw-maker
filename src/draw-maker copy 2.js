(function (owner) {
    "use strict";

    /*
    TODO: avaliar...
    - No Maker, disparar evento ao fazer Start/Stop, assim os botões específicos da interface ficam houvindo.
        - Ex: drawmaker.on/off('draw:start/stop', ()=>{}).
    - Colocar no  mouse um texto quando objeto/maker selecionado, para todos.
    - Já fazer a tradução a medida que monta o template.
    - ver se pode deixar as makers apenas como var/let da função global, deixando apenas a drawmaker no namespace.
    - testar se quando tem zoom, o "scaleToWidth" da imagem de fundo, deveria receber segundo parâmetro true;
    - ver se faz dash-lines, como uma possibilidade de configuração.
    - .........fazer mouse mover canvas quando em zoom........
    - https://javascript.info/shadow-dom-events
    - document.getElementById("maker-container").shadowRoot.addEventListener('test', event => alert('listener shadowRoot: ' + event?.detail?.maker))
    - document.getElementById("maker-container").shadowRoot.dispatchEvent(new CustomEvent("test", {detail: {maker: "test detail 8"}, bubbles: false, composed: false}))
    */

    let ns = owner.drawmaker || (owner.drawmaker = {});

    let tt = function (key) {
        let value = ns.textTranslation && ns.textTranslation[key];
        return value || key;
    }

    ns.DrawMaker = class {

        _DEFAULT_COLOR = "rgb(255,0,0)";
        _DEFAULT_WIDTH = 2;
        _NO_COLOR = null;
        _ZOOM_FACTOR = 1.5;

        _container = null;
        _selected = null;
        _making = null;

        constructor(container, options) {
            this._container = container

            options = options || {};
            this.width = options.width || 400;
            this.height = options.height || 400;
            this.backgroundImage = options.backgroundImage || null;
            this.fillColor = options.fillColor || this._NO_COLOR;
            this.strokeColor = options.strokeColor || this._DEFAULT_COLOR;
            this.strokeWidth = options.strokeWidth || this._DEFAULT_WIDTH;

            this._loadTemplate();
            this._container.drawmaker = this;
        }

        _loadTemplate() {
            //fetch("draw-maker.html").then(response => {
            //    return response.text();
            //}).then(text => {
            //    this._attachTemplate(text);
            //});
            this._attachTemplate(`
                <template id="dm-template">

                    <style>
                    </style>
                
                    <input type="radio" name="maker" data-dm-maker="PencilBrushMaker">
                    <label>PencilBrush</label><br>
                    <input type="radio" name="maker" data-dm-maker="TextBoxMaker">
                    <label>TextBox</label><br>
                    <input type="radio" name="maker" data-dm-maker="LineMaker">
                    <label>Line</label><br>
                    <input type="radio" name="maker" data-dm-maker="ArrowMaker">
                    <label>Arrow</label><br>
                    <input type="radio" name="maker" data-dm-maker="DoubleArrowMaker">
                    <label>DoubleArrow</label><br>
                    <input type="radio" name="maker" data-dm-maker="RectMaker">
                    <label>Rect</label><br>
                    <input type="radio" name="maker" data-dm-maker="CircleMaker">
                    <label>Circle</label><br>
                    <input type="radio" name="maker" data-dm-maker="TriangleMaker">
                    <label>Triangle</label><br>
                
                    <button data-dm-zoom-in>ZoomIn</button>
                    <button data-dm-zoom-out>ZoomOut</button>
                    <br>
                                                    
                    <div style="display: inline-block; border: 1px solid gray">
                        <canvas id="dm-canvas"></canvas>
                    </div>
            
                </template>
            `);
        }

        _attachTemplate(textHtml) {
            const shadow = this._container.attachShadow({ mode: "open" });
            shadow.innerHTML = textHtml;
            let templateEl = shadow.getElementById("dm-template");
            shadow.appendChild(templateEl.content);
            let canvasEl = shadow.getElementById("dm-canvas");

            this.canvas = new fabric.Canvas(canvasEl, {
                width: this.width,
                height: this.height,
            });
            this._setBackgroundImage();

            this.canvas.on('mouse:down', options => {
                if (this._selected && !this._making) {
                    this._making = this._selected;
                    this._making.start(options);
                }
            });
            this.canvas.on('mouse:move', options => {
                if (this._making) {
                    this._making.update(options);
                }
            });
            this.canvas.on('mouse:up', options => {
                if (this._making) {
                    this._making.stop(options);
                    this._making = null;
                }
            });

            this._attachEvent("[data-dm-maker]", "click", event => {
                return this._onMakerClick(event);
            });
            this._attachEvent("[data-dm-zoom-in]", "click", event => {
                this._onZoomInClick(event);
            });
            this._attachEvent("[data-dm-zoom-out]", "click", event => {
                this._onZoomOutClick(event);
            });
        }

        _setBackgroundImage() {
            if (!this.backgroundImage)
                return;
            let uri = this.backgroundImage.toString();
            let options = {
                excludeFromExport: true,
                scaleX: 1,
                scaleY: 1,
            };
            this.canvas.setBackgroundImage(uri, () => {
                if (!this.canvas.backgroundImage)
                    return;
                let image = this.canvas.backgroundImage;
                image.scaleToWidth(this.canvas.getWidth());
                if (image.getScaledHeight() > this.canvas.getHeight()) {
                    image.scaleToHeight(this.canvas.getHeight());
                }
                this.canvas.requestRenderAll();
            }, options);
        }

        _attachEvent(selector, event, callback) {
            const root = this._container.shadowRoot;
            root.querySelectorAll(selector).forEach(el => {
                el.addEventListener(event, callback);
            });
        }

        _onMakerClick(event) {
            const shadow = this._container.shadowRoot;
            let target = event.target;
            let makerAttr = "data-dm-maker";
            let makerClass = ns[target.getAttribute(makerAttr)];
            let selectedAttr = "data-dm-selected";
            let selectedValue = false;
            let success = false;
            if (target.getAttribute(selectedAttr) !== true.toString()) {
                success = this.select(makerClass);
                selectedValue = success;
            }
            if (target.getAttribute(selectedAttr) === true.toString()) {
                success = this.deselect(makerClass);
                selectedValue = !success;
            }
            if (success) {
                shadow.querySelectorAll("[" + makerAttr + "]").forEach(el => {
                    el.setAttribute(selectedAttr, false)
                });
                target.checked = selectedValue;
                target.setAttribute(selectedAttr, selectedValue);
            }
            return success;
        }

        _resetZoom() {
            this.canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
        }

        _onZoomInClick(event) {
            let zoom = Math.min(this.canvas.getZoom() * this._ZOOM_FACTOR, 3);
            let center = this.canvas.getCenter();
            this.canvas.zoomToPoint(new fabric.Point(center.left, center.top), zoom);
            // To fix: after zooming, eventually not all objects are visible.
            this._dummyObjectSelection();
            console.log(this.canvas.getWidth(), this.canvas.getHeight(), this.canvas.viewportTransform);
        }

        _onZoomOutClick(event) {
            let zoom = Math.max(this.canvas.getZoom() / this._ZOOM_FACTOR, 1);
            if (zoom <= 1.2) {
                this._resetZoom();
            } else {
                let center = this.canvas.getCenter();
                this.canvas.zoomToPoint(new fabric.Point(center.left, center.top), zoom);
            }
            // To fix: after zooming, eventually not all objects are visible.
            this._dummyObjectSelection();
            console.log(this.canvas.getWidth(), this.canvas.getHeight(), this.canvas.viewportTransform);
        }

        clear() {
            this._resetZoom();
            this.canvas.clear();
            this._setBackgroundImage();
        }

        loadJSON(json) {
            this._resetZoom();
            this.canvas.loadFromJSON(json, () => {
                this.canvas.requestRenderAll();
            });
        }

        toJSON() {
            this._resetZoom();
            return JSON.stringify(this.canvas.toJSON());
        }

        toSVG() {
            this._resetZoom();
            let options = { suppressPreamble: true };
            return this.canvas.toSVG(options);
        }

        _filterSelectableObjects(objs) {
            objs = objs.filter(obj => {
                return obj.selectable && !(obj.group && obj.group.type === 'group');
            });
            return objs;
        }

        getSelectedObjects() {
            let objs = this.canvas.getActiveObjects();
            return this._filterSelectableObjects(objs);
        }

        getSelectableObjects() {
            let objs = this.canvas.getObjects();
            return this._filterSelectableObjects(objs);
        }

        _dummyObjectSelection() {
            // For unknown reasons, some individual object selection/visibility only works after a grouping selection.
            let objs = this.getSelectableObjects();
            this.canvas.discardActiveObject();
            this.canvas.setActiveObject(new fabric.ActiveSelection(objs));
            this.canvas.discardActiveObject();
        }

        enableObjectSelection() {
            // To fix: after enable, eventually not all objects are selectable.
            this._dummyObjectSelection();
            this.getSelectableObjects().forEach(obj => {
                obj.set('evented', true);
            });
            this.canvas.set('selection', true);
            this.canvas.requestRenderAll();
        }

        disableObjectSelection() {
            this.canvas.discardActiveObject();
            this.getSelectableObjects().forEach(obj => {
                obj.set('evented', false);
            });
            this.canvas.set('selection', false);
            this.canvas.requestRenderAll();
        }

        select(maker) {
            if (this._making) {
                return false;
            }
            if (this._selected) {
                this._selected.deselect();
            }
            this._selected = new maker(this);
            this._selected.select();
            return true;
        }

        deselect(maker) {
            if (this._making) {
                return false;
            }
            if (this._selected) {
                this._selected.deselect();
                this._selected = null;
            }
            return true;
        }

    }

    ns.BaseMaker = class {

        constructor(dm) {
            this.dm = dm;
        }

        start(options) {
        }

        update(options) {
        }

        stop(options) {
        }

        select() {
            this.dm.disableObjectSelection();
        }

        deselect() {
            this.dm.enableObjectSelection();
        }

        isVisibleColor(color) {
            return (!color || color == this.dm._NO_COLOR) ? false : true;
        }

        isVisibleWidth(width) {
            return (!width || width < 1) ? false : true;
        }

        assertVisibleColor(color, assert) {
            if (assert === undefined) {
                return this.isVisibleColor(color) ? color : this.dm._DEFAULT_COLOR;
            } else {
                return (assert === true) ? this.assertVisibleColor(color) : color;
            }
        }

        assertVisibleWidth(width, assert) {
            if (assert === undefined) {
                return this.isVisibleWidth(width) ? width : this.dm._DEFAULT_WIDTH;
            } else {
                return (assert === true) ? this.assertVisibleWidth(width) : width;
            }
        }

    }

    ns.RectMaker = class extends ns.BaseMaker {

        _shape = null;
        _startLeft = 0;
        _startTop = 0;
        _attached = false;

        constructor(dm) {
            super(dm);
        }

        start(options) {
            let pointer = this.dm.canvas.getPointer(options.e);
            this._startLeft = pointer.x;
            this._startTop = pointer.y;
            this._shape = new fabric.Rect({
                left: this._startLeft,
                top: this._startTop,
                width: 1,
                height: 1,
                fill: this.dm.fillColor,
                stroke: this.assertVisibleColor(this.dm.strokeColor, !this.isVisibleColor(this.dm.fillColor)),
                strokeWidth: this.assertVisibleWidth(this.dm.strokeWidth, !this.isVisibleColor(this.dm.fillColor)),
                evented: false,
            });
            this._attached = false;
        }

        update(options) {
            let pointer = this.dm.canvas.getPointer(options.e);
            let left = (pointer.x < this._startLeft) ? pointer.x : this._startLeft;
            let top = (pointer.y < this._startTop) ? pointer.y : this._startTop;
            let width = Math.abs(pointer.x - this._startLeft);
            let height = Math.abs(pointer.y - this._startTop);
            this._shape.set('left', left);
            this._shape.set('top', top);
            this._shape.set('width', width);
            this._shape.set('height', height);
            if (!this._attached) {
                this.dm.canvas.add(this._shape);
                this._attached = true;
            }
            this.dm.canvas.requestRenderAll();
        }

    }

    ns.CircleMaker = class extends ns.BaseMaker {

        _shape = null;
        _startLeft = 0;
        _startTop = 0;
        _attached = false;

        constructor(dm) {
            super(dm);
        }

        start(options) {
            let pointer = this.dm.canvas.getPointer(options.e);
            this._startLeft = pointer.x;
            this._startTop = pointer.y;
            this._shape = new fabric.Circle({
                originX: 'center',
                originY: 'center',
                left: this._startLeft,
                top: this._startTop,
                radius: 1,
                fill: this.dm.fillColor,
                stroke: this.assertVisibleColor(this.dm.strokeColor, !this.isVisibleColor(this.dm.fillColor)),
                strokeWidth: this.assertVisibleWidth(this.dm.strokeWidth, !this.isVisibleColor(this.dm.fillColor)),
                evented: false,
            });
            this._attached = false;
        }

        update(options) {
            let pointer = this.dm.canvas.getPointer(options.e);
            let width = (pointer.x - this._startLeft) / 2;
            let height = (pointer.y - this._startTop) / 2;
            let centerX = pointer.x - width;
            let centerY = pointer.y - height;
            let radius = Math.sqrt(Math.pow(width, 2) + Math.pow(height, 2));
            this._shape.set('left', centerX);
            this._shape.set('top', centerY);
            this._shape.set('radius', radius);
            if (!this._attached) {
                this.dm.canvas.add(this._shape);
                this._attached = true;
            }
            this.dm.canvas.requestRenderAll();
        }

    }

    ns.TriangleMaker = class extends ns.RectMaker {

        constructor(dm) {
            super(dm);
        }

        start(options) {
            let pointer = this.dm.canvas.getPointer(options.e);
            this._startLeft = pointer.x;
            this._startTop = pointer.y;
            this._shape = new fabric.Triangle({
                left: this._startLeft,
                top: this._startTop,
                width: 1,
                height: 1,
                fill: this.dm.fillColor,
                stroke: this.assertVisibleColor(this.dm.strokeColor, !this.isVisibleColor(this.dm.fillColor)),
                strokeWidth: this.assertVisibleWidth(this.dm.strokeWidth, !this.isVisibleColor(this.dm.fillColor)),
                evented: false,
            });
            this._attached = false;
        }

    }

    ns.LineMaker = class extends ns.BaseMaker {

        _shape = null;
        _attached = false;

        constructor(dm) {
            super(dm);
        }

        start(options) {
            let pointer = this.dm.canvas.getPointer(options.e);
            let strokeColor = this.assertVisibleColor(this.dm.strokeColor);
            let strokeWidth = this.assertVisibleWidth(this.dm.strokeWidth);
            this._shape = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
                originX: 'center',
                originY: 'center',
                fill: strokeColor,
                stroke: strokeColor,
                strokeWidth: strokeWidth,
                evented: false,
            });
            this._attached = false;
        }

        update(options) {
            let pointer = this.dm.canvas.getPointer(options.e);
            this._shape.set('x2', pointer.x);
            this._shape.set('y2', pointer.y);
            if (!this._attached) {
                this.dm.canvas.add(this._shape);
                this._attached = true;
            }
            this.dm.canvas.requestRenderAll();
        }

    }

    ns.ArrowMaker = class extends ns.BaseMaker {

        _shapes = null;
        _attached = false;

        constructor(dm) {
            super(dm);
        }

        _headSize(strokeWidth) {
            let sizeFactor = 5;
            return sizeFactor + (sizeFactor / 2.0 * strokeWidth);
        };

        _arrowAngle(x1, y1, x2, y2) {
            return (Math.atan2((y2 - y1), (x2 - x1)) * (180 / Math.PI)) + 90;
        };

        start(options) {
            let pointer = this.dm.canvas.getPointer(options.e);
            let strokeColor = this.assertVisibleColor(this.dm.strokeColor);
            let strokeWidth = this.assertVisibleWidth(this.dm.strokeWidth);
            let lineShape = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
                originX: 'center',
                originY: 'center',
                fill: strokeColor,
                stroke: strokeColor,
                strokeWidth: strokeWidth,
                selectable: false,
                evented: false,
            });
            let headSize = this._headSize(strokeWidth);
            let arrowAngle = this._arrowAngle(pointer.x, pointer.y, pointer.x, pointer.y);
            let triangleShape = new fabric.Triangle({
                originX: 'center',
                originY: 'top',
                left: pointer.x,
                top: pointer.y,
                angle: arrowAngle,
                width: headSize,
                height: headSize,
                fill: strokeColor,
                stroke: strokeColor,
                strokeWidth: strokeWidth,
                selectable: false,
                evented: false,
            });
            this.shape = null;
            this._shapes = [lineShape, triangleShape];
            this._attached = false;
        }

        update(options) {
            let pointer = this.dm.canvas.getPointer(options.e);
            let lineShape = this._shapes[0];
            lineShape.set('x2', pointer.x);
            lineShape.set('y2', pointer.y);
            let x1 = lineShape.get('x1');
            let y1 = lineShape.get('y1');
            let arrowAngle = this._arrowAngle(x1, y1, pointer.x, pointer.y);
            let triangleShape = this._shapes[1];
            triangleShape.set('left', pointer.x);
            triangleShape.set('top', pointer.y);
            triangleShape.set('angle', arrowAngle);
            if (!this._attached) {
                this.dm.canvas.add(...this._shapes);
                this._attached = true;
            }
            this.dm.canvas.requestRenderAll();
        }

        stop(options) {
            if (this._attached) {
                this.dm.canvas.remove(...this._shapes);
                let group = new fabric.Group(this._shapes, {
                    evented: false,
                });
                this.dm.canvas.add(group);
            }
            this.dm.canvas.requestRenderAll();
        }

    }

    ns.DoubleArrowMaker = class extends ns.ArrowMaker {

        constructor(dm) {
            super(dm);
        }

        start(options) {
            let pointer = this.dm.canvas.getPointer(options.e);
            let strokeColor = this.assertVisibleColor(this.dm.strokeColor);
            let strokeWidth = this.assertVisibleWidth(this.dm.strokeWidth);
            let lineShape = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
                originX: 'center',
                originY: 'center',
                fill: strokeColor,
                stroke: strokeColor,
                strokeWidth: strokeWidth,
                selectable: false,
                evented: false,
            });
            let headSize = this._headSize(strokeWidth);
            let toArrowAngle = this._arrowAngle(pointer.x, pointer.y, pointer.x, pointer.y);
            let toTriangleShape = new fabric.Triangle({
                originX: 'center',
                originY: 'top',
                left: pointer.x,
                top: pointer.y,
                angle: toArrowAngle,
                width: headSize,
                height: headSize,
                fill: strokeColor,
                stroke: strokeColor,
                strokeWidth: strokeWidth,
                selectable: false,
                evented: false,
            });
            let fromArrowAngle = toArrowAngle + 180;
            let fromTriangleShape = new fabric.Triangle({
                originX: 'center',
                originY: 'top',
                left: pointer.x,
                top: pointer.y,
                angle: fromArrowAngle,
                width: headSize,
                height: headSize,
                fill: strokeColor,
                stroke: strokeColor,
                strokeWidth: strokeWidth,
                selectable: false,
                evented: false,
            });
            this._shapes = [lineShape, toTriangleShape, fromTriangleShape];
            this._attached = false;
        }

        update(options) {
            let pointer = this.dm.canvas.getPointer(options.e);
            let lineShape = this._shapes[0];
            lineShape.set('x2', pointer.x);
            lineShape.set('y2', pointer.y);
            let x1 = lineShape.get('x1');
            let y1 = lineShape.get('y1');
            let toArrowAngle = this._arrowAngle(x1, y1, pointer.x, pointer.y);
            let toTriangleShape = this._shapes[1];
            toTriangleShape.set('left', pointer.x);
            toTriangleShape.set('top', pointer.y);
            toTriangleShape.set('angle', toArrowAngle);
            let fromArrowAngle = toArrowAngle + 180;
            let fromTriangleShape = this._shapes[2];
            fromTriangleShape.set('angle', fromArrowAngle);
            if (!this._attached) {
                this.dm.canvas.add(...this._shapes);
                this._attached = true;
            }
            this.dm.canvas.requestRenderAll();
        }

    }

    ns.TextBoxMaker = class extends ns.BaseMaker {

        _shape = null;

        constructor(dm) {
            super(dm);
        }

        start(options) {
            let pointer = this.dm.canvas.getPointer(options.e);
            this._shape = new fabric.Textbox('Text...', {
                originX: 'center',
                originY: 'center',
                left: pointer.x,
                top: pointer.y,
                textAlign: 'left',
                lineHeight: 1,
                fontSize: 20,
                fontWeight: 'normal',
                fontStyle: 'normal',
                fill: this.assertVisibleColor(this.dm.fillColor),
                stroke: this.dm._NO_COLOR,
                strokeWidth: 0,
                evented: false,
            });
            this.dm.canvas.add(this._shape);
            this.dm.canvas.requestRenderAll();
        }

        update(options) {
            let pointer = this.dm.canvas.getPointer(options.e);
            this._shape.set('left', pointer.x);
            this._shape.set('top', pointer.y);
            this.dm.canvas.requestRenderAll();
        }

    }

    ns.PencilBrushMaker = class extends ns.BaseMaker {

        constructor(dm) {
            super(dm);
        }

        select() {
            super.select();
            let pencil = new fabric.PencilBrush(this.dm.canvas);
            pencil.color = this.assertVisibleColor(this.dm.strokeColor);
            pencil.width = this.assertVisibleWidth(this.dm.strokeWidth);
            this.dm.canvas.freeDrawingBrush = pencil;
            this.dm.canvas.isDrawingMode = true;
            this.dm.canvas.requestRenderAll();
        }

        deselect() {
            super.deselect();
            this.dm.canvas.isDrawingMode = false;
            this.dm.canvas.requestRenderAll();
        }

    }

})(this);