(function (owner) {
    "use strict";

    /*
    TODO: avaliar...
    - No Maker, disparar evento ao fazer Start/Stop, assim os botões específicos da interface ficam houvindo.
    - Ex: drawmaker.on/off('draw:start/stop', ()=>{}).
    - Colocar no  mouse um texto quando objeto/maker selecionado, para todos.
    - https://developers.google.com/web/fundamentals/web-components/customelements?hl=pt-br
    - https://developers.google.com/web/fundamentals/web-components/shadowdom?hl=pt-br

var xhr = new XMLHttpRequest(); 
xhr.onreadystatechange = function () {
if (xhr.readyState === 4) {     
    //do something with xhr.responseText
}   
};      
xhr.open('GET', '/template.html');
xhr.send();          
    */

    let ns = owner.drawmaker || (owner.drawmaker = {});

    ns.DrawMaker = class {

        _DEFAULT_COLOR = "rgb(255,0,0)";
        _DEFAULT_TRANSPARENCY = null;
        _ZOOM_FACTOR = 1.3;

        _selected = null;
        _making = null;

        constructor(canvas, options) {
            options = options || {};
            let width = options.width || 400;
            let height = options.height || 400;
            let background = options.background || null;
            let json = options.json || null;
            this.fillColor = options.fillColor || this._DEFAULT_TRANSPARENCY;
            this.lineColor = options.lineColor || this._DEFAULT_COLOR;
            this.lineWidth = options.lineWidth || 2;

            this.canvas = new fabric.Canvas(canvas, {
                width: width,
                height: height,
            });

            // TODO: colocar options para json já gravado e respectivo load para o canvas ao iniciar.

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
        }

        getVisibleColor(color) {
            if (!color || color == this._DEFAULT_TRANSPARENCY)
                color = this._DEFAULT_COLOR;
            return color;
        }

        _filterSelectableObjects(objs) {
            let groups = this.canvas.getObjects('group');
            groups.forEach(group => {
                objs = objs.filter(obj => {
                    return obj.selectable && !group.getObjects().includes(obj);
                });
            });
            return objs;
        }

        getSelectedObjects() {
            // TODO: considerar ao usar que quando for para configuração, checar se tem apenas um selecionado.
            let objs = this.canvas.getActiveObjects();
            return this._filterSelectableObjects(objs);
        }

        getSelectableObjects() {
            let objs = this.canvas.getObjects();
            return this._filterSelectableObjects(objs);
        }

        _dummyObjectSelection() {
            // For unknown reasons, some individual object selections only works after a grouping selection.
            // But if grouping selection selects objects inside a group, it generates some invalid copies of it.
            let objs = this.getSelectableObjects();
            this.canvas.discardActiveObject();
            this.canvas.setActiveObject(new fabric.ActiveSelection(objs));
            this.canvas.discardActiveObject();
        }

        enableObjectSelection() {
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

    }

    ns.RectMaker = class extends ns.BaseMaker {

        _shape = null;
        _attached = false;

        constructor(dm) {
            super(dm);
        }

        start(options) {
            let pointer = this.dm.canvas.getPointer(options.e, true);
            this._shape = new fabric.Rect({
                left: pointer.x,
                top: pointer.y,
                width: 1,
                height: 1,
                fill: this.dm.fillColor,
                stroke: this.dm.lineColor,
                strokeWidth: this.dm.lineWidth,
                evented: false,
            });
            this._attached = false;
        }

        update(options) {
            let pointer = this.dm.canvas.getPointer(options.e, true);
            let width = pointer.x - this._shape.get('left');
            let height = pointer.y - this._shape.get('top');
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
            let pointer = this.dm.canvas.getPointer(options.e, true);
            this._startLeft = pointer.x;
            this._startTop = pointer.y;
            this._shape = new fabric.Circle({
                originX: 'center',
                originY: 'center',
                left: this._startLeft,
                top: this._startTop,
                radius: 1,
                fill: this.dm.fillColor,
                stroke: this.dm.lineColor,
                strokeWidth: this.dm.lineWidth,
                evented: false,
            });
            this._attached = false;
        }

        update(options) {
            let pointer = this.dm.canvas.getPointer(options.e, true);
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

    ns.TriangleMaker = class extends ns.BaseMaker {

        _shape = null;
        _attached = false;

        constructor(dm) {
            super(dm);
        }

        start(options) {
            let pointer = this.dm.canvas.getPointer(options.e, true);
            this._shape = new fabric.Triangle({
                left: pointer.x,
                top: pointer.y,
                width: 1,
                height: 1,
                fill: this.dm.fillColor,
                stroke: this.dm.lineColor,
                strokeWidth: this.dm.lineWidth,
                evented: false,
            });
            this._attached = false;
        }

        update(options) {
            let pointer = this.dm.canvas.getPointer(options.e, true);
            let width = pointer.x - this._shape.get('left');
            let height = pointer.y - this._shape.get('top');
            this._shape.set('width', width);
            this._shape.set('height', height);
            if (!this._attached) {
                this.dm.canvas.add(this._shape);
                this._attached = true;
            }
            this.dm.canvas.requestRenderAll();
        }

    }

    ns.LineMaker = class extends ns.BaseMaker {

        _shape = null;
        _attached = false;

        constructor(dm) {
            super(dm);
        }

        start(options) {
            let pointer = this.dm.canvas.getPointer(options.e, true);
            this._shape = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
                originX: 'center',
                originY: 'center',
                fill: null,
                stroke: this.dm.getVisibleColor(this.dm.lineColor),
                strokeWidth: this.dm.lineWidth,
                evented: false,
            });
            this._attached = false;
        }

        update(options) {
            let pointer = this.dm.canvas.getPointer(options.e, true);
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

        _headSize(lineWidth) {
            let sizeFactor = 5;
            return sizeFactor + (sizeFactor / 2.0 * lineWidth);
        };

        _arrowAngle(x1, y1, x2, y2) {
            return (Math.atan2((y2 - y1), (x2 - x1)) * (180 / Math.PI)) + 90;
        };

        start(options) {
            let pointer = this.dm.canvas.getPointer(options.e, true);
            let lineColor = this.dm.getVisibleColor(this.dm.lineColor);
            let lineShape = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
                originX: 'center',
                originY: 'center',
                fill: lineColor,
                stroke: lineColor,
                strokeWidth: this.dm.lineWidth,
                selectable: false,
                evented: false,
            });
            let headSize = this._headSize(this.dm.lineWidth);
            let arrowAngle = this._arrowAngle(pointer.x, pointer.y, pointer.x, pointer.y);
            let triangleShape = new fabric.Triangle({
                originX: 'center',
                originY: 'top',
                left: pointer.x,
                top: pointer.y,
                angle: arrowAngle,
                width: headSize,
                height: headSize,
                fill: lineColor,
                stroke: lineColor,
                strokeWidth: this.dm.lineWidth,
                selectable: false,
                evented: false,
            });
            this.shape = null;
            this._shapes = [lineShape, triangleShape];
            this._attached = false;
        }

        update(options) {
            let pointer = this.dm.canvas.getPointer(options.e, true);
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
            let pointer = this.dm.canvas.getPointer(options.e, true);
            let lineColor = this.dm.getVisibleColor(this.dm.lineColor);
            let lineShape = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
                originX: 'center',
                originY: 'center',
                fill: lineColor,
                stroke: lineColor,
                strokeWidth: this.dm.lineWidth,
                selectable: false,
                evented: false,
            });
            let headSize = this._headSize(this.dm.lineWidth);
            let toArrowAngle = this._arrowAngle(pointer.x, pointer.y, pointer.x, pointer.y);
            let toTriangleShape = new fabric.Triangle({
                originX: 'center',
                originY: 'top',
                left: pointer.x,
                top: pointer.y,
                angle: toArrowAngle,
                width: headSize,
                height: headSize,
                fill: lineColor,
                stroke: lineColor,
                strokeWidth: this.dm.lineWidth,
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
                fill: lineColor,
                stroke: lineColor,
                strokeWidth: this.dm.lineWidth,
                selectable: false,
                evented: false,
            });
            this._shapes = [lineShape, toTriangleShape, fromTriangleShape];
            this._attached = false;
        }

        update(options) {
            let pointer = this.dm.canvas.getPointer(options.e, true);
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
            let pointer = this.dm.canvas.getPointer(options.e, true);
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
                fill: this.dm.getVisibleColor(this.dm.lineColor),
                stroke: null,
                strokeWidth: 0,
                evented: false,
            });
            this.dm.canvas.add(this._shape);
            this.dm.canvas.requestRenderAll();
        }

        update(options) {
            let pointer = this.dm.canvas.getPointer(options.e, true);
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
            pencil.color = this.dm.getVisibleColor(this.dm.lineColor);
            pencil.width = this.dm.lineWidth;
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

    ns.DrawMakerElement = class extends HTMLElement {

        _dm = null;

        constructor() {
            super();
            this.attachShadow({ mode: "open" });
        }

        connectedCallback() {
            /*
            fetch("draw-maker.html")
                .then(response => {
                    return response.text();
                })
                .then(text => {
                    this.attachTemplate(text);
                });
            */
            this._attachTemplate(`
                <template id="drawmaker-template">

                    <style>
                    </style>
                
                    <input type="radio" name="maker" data-dm-maker="PencilBrushMaker" />
                    <label>PencilBrush</label><br />
                    <input type="radio" name="maker" data-dm-maker="TextBoxMaker" />
                    <label>TextBox</label><br />
                    <input type="radio" name="maker" data-dm-maker="LineMaker" />
                    <label>Line</label><br />
                    <input type="radio" name="maker" data-dm-maker="ArrowMaker" />
                    <label>Arrow</label><br />
                    <input type="radio" name="maker" data-dm-maker="DoubleArrowMaker" />
                    <label>DoubleArrow</label><br />
                    <input type="radio" name="maker" data-dm-maker="RectMaker" />
                    <label>Rect</label><br />
                    <input type="radio" name="maker" data-dm-maker="CircleMaker" />
                    <label>Circle</label><br />
                    <input type="radio" name="maker" data-dm-maker="TriangleMaker" />
                    <label>Triangle</label><br />
                
                    <div style="display: inline-block; border: 1px solid gray">
                        <canvas id="drawmaker-canvas"></canvas>
                    </div>
            
                </template>
            `);
        }

        _attachTemplate(textHtml) {
            this.shadowRoot.innerHTML = textHtml;
            let templateEl = this.shadowRoot.getElementById("drawmaker-template");
            this.shadowRoot.appendChild(templateEl.content);
            this.shadowRoot.querySelectorAll("[data-dm-maker]").forEach(el => {
                el.addEventListener("click", event => {
                    return this._onMakerClick(event);
                });
            });
            let canvasEl = this.shadowRoot.getElementById("drawmaker-canvas");
            this._dm = new ns.DrawMaker(canvasEl, this._loadOptions());
        }

        _loadOptions() {
            let options = {};
            let value = this.getAttribute("options");
            if (value && value.trim() !== "") {
                options = JSON.parse(value);
            }
            value = this.getAttribute("width");
            if (value && value.trim() !== "") {
                options.width = value;
            }
            value = this.getAttribute("height");
            if (value && value.trim() !== "") {
                options.height = value;
            }
            value = this.getAttribute("background");
            if (value && value.trim() !== "") {
                options.background = value;
            }
            value = this.getAttribute("json");
            if (value && value.trim() !== "") {
                options.json = value;
            }
            return options;
        }

        _onMakerClick(event) {
            let target = event.target;
            let maker = ns[target.getAttribute("data-dm-maker")];
            let selectedAttr = "data-dm-selected";
            let selectedValue = false;
            let success = false;
            if (target.getAttribute(selectedAttr) != 'true') {
                success = this._dm.select(maker);
                selectedValue = success;
            }
            if (target.getAttribute(selectedAttr) == 'true') {
                success = this._dm.deselect(maker);
                selectedValue = !success;
            }
            if (success) {
                this.shadowRoot.querySelectorAll("[data-dm-maker]").forEach(el => {
                    el.setAttribute(selectedAttr, false)
                });
                target.checked = selectedValue;
                target.setAttribute(selectedAttr, selectedValue);
            }
            return success;
        }

    }

    customElements.define("drawmaker-drawmaker", ns.DrawMakerElement);

})(this);