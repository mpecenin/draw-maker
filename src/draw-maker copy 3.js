(function (owner) {
    "use strict";

    /*
    TODO: avaliar...
    - Já fazer a tradução a medida que monta o template.
    - Ícones dos botões
    - Options para configurações de cor, tamanho, e mover para frente/trás.
    - Criar api para objectQuantity/Count com botão alert no teste main.
    - ver se pode deixar as makers apenas como var/let da função global, deixando apenas a drawmaker no namespace.
    - ver se usa DrawMakerAPI/Controller para vincular ao elemento host.
    - ver se faz dash-lines, como uma possibilidade de configuração.
    - colocar copyright, se for o caso, no fonte/license, etc.
    - https://www.w3schools.com/css/css3_buttons.asp
    - ver se no stop, pode ser retirado o evented false, e se revolve o problema de nao imediatamente exibir/selecionar.
    - ver se melhora as setas, devido width grande aparece os cantos da linha, talvez desloca o triângulo da ponta, ou constroi com polígono.
    - ....ver problema, quando duas setas selecionadas, e muda opções, como strokeWidth para maior, e então ficam invisíveis.
    */

    let ns = owner.drawmaker || (owner.drawmaker = {});

    let tt = function (key) {
        let value = ns.textTranslation && ns.textTranslation[key];
        return value || key;
    }

    ns.DrawMaker = class {

        _NO_COLOR = null;
        _DEFAULT_COLOR = "rgb(255,0,0)";
        _DEFAULT_STROKE_WIDTH = 2;
        _STROKE_DASHARRAY = [5, 5];
        _ZOOM_SHIFT_FACTOR = 0.75;
        _MIN_ZOOM = 1;
        _MAX_ZOOM = 3.25;

        _host = null;
        _root = null;
        _selected = null;
        _making = null;

        constructor(container, options) {
            if (!container instanceof HTMLElement)
                throw new TypeError("The 'container' parameter must be an instance of a host HTML Element.");

            this._host = container;

            options = options || {};
            this.width = options.width || 400;
            this.height = options.height || 400;
            this.backgroundImage = options.backgroundImage || null;
            this.fill = options.fill || this._NO_COLOR;
            this.stroke = options.stroke || this._DEFAULT_COLOR;
            this.strokeWidth = options.strokeWidth || this._DEFAULT_STROKE_WIDTH;
            this.strokeDashArray = null;

            this._loadTemplate();
            this._host.drawmaker = this;
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
                        .dm-drawmaker-background {
                            background-color: white;
                        }

                        [data-dm-maker], [data-dm-control] {
                            background-color: transparent;
                            border: 2px solid transparent;
                            border-radius: 3px;
                            transition-duration: 0.5s;
                            cursor: pointer;
                            outline: 0;
                        }
                
                        [data-dm-maker]:hover, [data-dm-control]:hover {
                            border-color: black;
                        }
                
                        [data-dm-maker].dm-select, [data-dm-control]:active,
                        .dm-dropdown:hover [data-dm-control].dm-dropdown-trigger {
                            background-color: black;
                            border-color: black;
                            color: white;
                        }

                        [data-dm-zoom='max'] [data-dm-control='ZoomIn'],
                        [data-dm-zoom='min'] [data-dm-control='ZoomOut'],
                        [data-dm-object-select='false'] [data-dm-control='Remove'],
                        [data-dm-object-select='false'] [data-dm-control='SendBackwards'],
                        [data-dm-object-select='false'] [data-dm-control='BringForwards'] {
                            border-color: transparent;
                            color: gray;
                            cursor: not-allowed;
                        }

                        .dm-dropdown {
                            display: inline-block;
                            position: relative;
                        }

                        .dm-dropdown:hover .dm-dropdown-list {
                            display: block;
                        }

                        .dm-dropdown-list {
                            background-color: #f1f1f1;
                            position: absolute;
                            z-index: 10;
                            display: none;
                        }

                        .dm-dropdown-list button {
                            white-space: nowrap;
                        }

                        [data-dm-screen-overlay] .dm-display-flex,
                        [data-dm-screen-overlay] .dm-display-block {
                            display: none;
                        }

                        [data-dm-screen-overlay='true'] .dm-display-flex.dm-show {
                            display: flex;
                        }

                        [data-dm-screen-overlay='true'] .dm-display-block.dm-show {
                            display: block;
                        }

                        .dm-overlap * {
                            outline: 0;
                        }

                        .dm-overlap {
                            background-color: white;
                            border: 2px solid gray;
                            border-radius: 3px;
                        }

                        .dm-overlap .dm-overlap-head {
                            background-color: black;
                            color: white;
                            display: flex;
                            flex-direction: row;
                        }

                        .dm-overlap .dm-overlap-head .dm-overlap-title {
                            flex-grow: 1;
                            text-align: center;
                        }

                        .dm-overlap .dm-overlap-head button {
                            background-color: transparent;
                            border: none;
                            color: white;
                            cursor: pointer;
                        }
                        
                        .dm-overlap .dm-overlap-body {
                            padding: 15px;
                        }

                        .dm-overlap .dm-overlap-body button,
                        .dm-overlap .dm-overlap-body input[type='color'] {
                            border: 2px solid transparent;
                            border-radius: 3px;
                            transition-duration: 0.5s;
                            cursor: pointer;
                        }

                        .dm-overlap .dm-overlap-body button.dm-select,
                        .dm-overlap .dm-overlap-body button:hover,
                        .dm-overlap .dm-overlap-body input[type='color'].dm-select,
                        .dm-overlap .dm-overlap-body input[type='color']:hover {
                            border-color: black;
                            transition-duration: 0.5s;
                        }

                        /* NEW */

                        .dm-maker {
                            width: 100%;
                            height: 100%;
                            background-color: white;
                            display: flex;
                            flex-direction: column;
                            position: relative;
                        }

                        .dm-maker button {
                            outline: 0;
                            ....
                        }

                        .dm-display {
                            display: flex;
                        }

                        .dm-modal {
                            width: 100%;
                            height: 100%;
                            background-color: transparent;
                            display: none;
                            flex-direction: column;
                            align-items: center;
                            position: absolute;
                            z-index: 20;
                            padding: 2px;
                        }

                        .dm-modal-document {
                            background-color: white;
                            border: 2px solid gray;
                            border-radius: 3px;
                        }

                        .dm-modal-document .dm-modal-head {
                            background-color: black;
                            color: white;
                            display: flex;
                            flex-direction: row;
                        }

                        .dm-modal-document .dm-modal-head .dm-modal-title {
                            flex-grow: 1;
                            text-align: center;
                        }

                        .dm-modal-document .dm-modal-head button {
                            background-color: transparent;
                            border: none;
                            color: white;
                            cursor: pointer;
                        }
                        
                        .dm-modal-document .dm-modal-body {
                            padding: 15px;
                        }
                    </style>
                
                    <div id="dm-drawmaker" style="display: flex; width: 100%; height: 100%; flex-direction: column; position: relative;" class="dm-drawmaker-background" data-dm-zoom="min" data-dm-object-select="false" data-dm-screen-overlay="false">
                        <div style="margin: 2px;">
                            <button data-dm-maker="LineMaker" class="dm-stop-deselect">Line</button>
                            <button data-dm-maker="ArrowMaker" class="dm-stop-deselect">Arrow</button>
                            <button data-dm-maker="DoubleArrowMaker" class="dm-stop-deselect">DoubleArrow</button>
                            <button data-dm-maker="RectMaker" class="dm-stop-deselect">Rect</button>
                            <button data-dm-maker="CircleMaker" class="dm-stop-deselect">Circle</button>
                            <button data-dm-maker="TriangleMaker" class="dm-stop-deselect">Triangle</button>                            
                            <button data-dm-maker="TextBoxMaker" class="dm-stop-deselect">TextBox</button>
                            <button data-dm-maker="PencilBrushMaker" class="">PencilBrush</button>
                            <span>||</span>
                            <button data-dm-control="ZoomIn" class="">ZoomIn</button>
                            <button data-dm-control="ZoomOut" class="">ZoomOut</button>
                            <span>||</span>
                            <button data-dm-control="Remove" class="">Remove</button>
                            <div class="dm-dropdown">
                                <button data-dm-control="Options" class="dm-dropdown-trigger">Options</button>
                                <div class="dm-dropdown-list">
                                    <button data-dm-control="FillColor" class="">Fill/Text Color</button>
                                    <button data-dm-control="LineColor" class="">Line/Border Color</button>
                                    <button data-dm-control="LineWidth" class="">Line Width</button>
                                    <button data-dm-control="LineType" class="">Line Type</button>
                                    <button data-dm-control="LineType" class="">Line Type</button>
                                    <button data-dm-property="LineType" class="">Line Type</button>
                                    <button data-dm-control="SendBackwards" class="">Send Backwards</button>
                                    <button data-dm-control="BringForwards" class="">Bring Forwards</button>
                                </div>
                            </div>
                        </div>
                        <div style="overflow: auto; margin: 2px;">
                            <div style="display: inline-block; border: 1px solid gray;">
                                <canvas id="dm-canvas"></canvas>
                            </div>
                        </div>
                        <div class="dm-display-flex dm-show" style="width: 100%; height: 100%; flex-direction: column; align-items: center; position: absolute; z-index: 20; padding: 2px;">
                            <div id="dm-overlap-LineColor" class="dm-overlap dm-display-block">
                                <div class="dm-overlap-head">
                                    <div class="dm-overlap-title">tt('Line Color')</div>
                                    <button value="hide">X</button>
                                </div>
                                <div class="dm-overlap-body">
                                    tt('Line Color:')
                                    <input type="color" style="width: 80px; height: 24px;">
                                    <button value="null" style="height: 30px; vertical-align: bottom;">tt('Without Color')</button>
                                </div>
                            </div>
                            <div id="dm-overlap-LineWidth" class="dm-overlap dm-display-block">
                                <div class="dm-overlap-head">
                                    <div class="dm-overlap-title">tt('Line Width')</div>
                                    <button value="hide">X</button>
                                </div>
                                <div class="dm-overlap-body">
                                    tt('Line Width:')
                                    <select style="min-width: 50px;">
                                        <option value="1">1</option>
                                        <option value="2">2</option>
                                        <option value="3">3</option>
                                        <option value="4">4</option>
                                        <option value="5">5</option>
                                    </select>
                                </div>
                            </div>
                            <div id="dm-overlap-LineType" class="dm-overlap dm-display-block">
                                <div class="dm-overlap-head">
                                    <div class="dm-overlap-title">tt('Line Type')</div>
                                    <button value="hide">X</button>
                                </div>
                                <div class="dm-overlap-body">
                                    <button value="null"><svg width="100" height="5"><line fill="none" stroke="black" stroke-width="2" x1="0" y1="0" x2="100" y2="0"/></svg></button>
                                    <button value='`+ JSON.stringify(this._STROKE_DASHARRAY) + `'><svg width="100" height="5"><path fill="none" stroke="black" stroke-width="2" stroke-dasharray='` + this._STROKE_DASHARRAY + `' d="M0 1 l100 0"/></svg></button>
                                </div>
                            </div>
                        </div>
                        <!-- NEW -->
                        <div id="dm-modal-strokeDashArray" class="dm-modal">
                            <div class="dm-modal-document">
                                <div class="dm-modal-head">
                                    <div class="dm-modal-title">tt('Line Type')</div>
                                    <button value="hide">X</button>
                                </div>
                                <div class="dm-modal-body">
                                    <button value="null"><svg width="100" height="5"><line fill="none" stroke="black" stroke-width="2" x1="0" y1="0" x2="100" y2="0"/></svg></button>
                                    <button value='`+ JSON.stringify(this._STROKE_DASHARRAY) + `'><svg width="100" height="5"><path fill="none" stroke="black" stroke-width="2" stroke-dasharray='` + this._STROKE_DASHARRAY + `' d="M0 1 l100 0"/></svg></button>
                                </div>
                            </div>
                        </div>
                    </div>
                        
                </template>
            `);
        }

        _attachTemplate(textHtml) {
            this._root = this._host.attachShadow({ mode: "open" });
            this._root.innerHTML = textHtml;
            let templateEl = this._root.getElementById("dm-template");
            this._root.appendChild(templateEl.content);
            let canvasEl = this._root.getElementById("dm-canvas");

            this.canvas = new fabric.Canvas(canvasEl, {
                width: this.width,
                height: this.height,
                perPixelTargetFind: true,
                targetFindTolerance: 15,
                preserveObjectStacking: true,
                svgViewportTransformation: false,
            });
            this._setBackgroundImage();

            // ---------------------------------------------------------------------------------------

            this.canvas.on('mouse:down', options => {
                if (this._selected && !this._making) {
                    this._making = this._selected;
                    this._making.start(options);
                    this._dispatchEvent('dm:maker:start', { makerType: this._making.type });
                }
            });
            this.canvas.on('mouse:move', options => {
                if (this._making) {
                    this._making.update(options);
                }
            });
            this.canvas.on('mouse:up', options => {
                if (this._making) {
                    let makerType = this._making.type;
                    this._making.stop(options);
                    this._making = null;
                    this._dispatchEvent('dm:maker:stop', { makerType: makerType });
                }
            });

            // ---------------------------------------------------------------------------------------

            this.canvas.on('selection:created', options => {
                let objs = this.getSelectedObjects();
                if (objs.length > 0) {
                    objs.forEach(obj => {
                        obj.borderScaleFactor = 3;
                    });
                    this._attachAttribute("#dm-drawmaker", "data-dm-object-select", true);
                }
            });
            this.canvas.on('selection:cleared', options => {
                this._attachAttribute("#dm-drawmaker", "data-dm-object-select", false);
            });

            this._attachListener("[data-dm-maker]", "click", (listener, event) => {
                if (listener.classList.contains("dm-select")) {
                    return this.deselect();
                } else {
                    return this.select(listener.getAttribute("data-dm-maker"));
                }
            });
            this._attachListener("[data-dm-maker].dm-stop-deselect", "dm:maker:stop", (listener, event) => {
                if (listener.getAttribute("data-dm-maker") === event.detail.makerType) {
                    return this.deselect();
                }
            });

            this._attachListener("[data-dm-maker]", "dm:maker:select", (listener, event) => {
                if (listener.getAttribute("data-dm-maker") === event.detail.makerType) {
                    listener.classList.add("dm-select");
                }
            });
            this._attachListener("[data-dm-maker]", "dm:maker:deselect", (listener, event) => {
                if (listener.getAttribute("data-dm-maker") === event.detail.makerType) {
                    listener.classList.remove("dm-select");
                }
            });

            this._attachListener("[data-dm-control='ZoomIn']", "click", (listener, event) => {
                return this._onZoomInClick(event);
            });
            this._attachListener("[data-dm-control='ZoomOut']", "click", (listener, event) => {
                return this._onZoomOutClick(event);
            });
            this._attachListener("#dm-drawmaker", "dm:zoom:change", (listener, event) => {
                let limit = (this.canvas.getZoom() >= this._MAX_ZOOM) ? "max" : (this.canvas.getZoom() <= this._MIN_ZOOM) ? "min" : "";
                listener.setAttribute("data-dm-zoom", limit);
            });

            this._attachListener("[data-dm-control='Remove']", "click", (listener, event) => {
                let objs = this.getSelectedObjects();
                this.canvas.discardActiveObject();
                this.canvas.remove(...objs);
            });

            // ---------------------------------------------------------------------------------------

            this._attachListener("[data-dm-control='LineColor']", "click", (listener, event) => {
                this._attachAttribute("#dm-drawmaker", "data-dm-screen-overlay", true);
                this._attachClass("#dm-overlap-LineColor", "dm-show");
                this._detachClass("#dm-overlap-LineColor input[type='color']", "dm-select");
                this._detachClass("#dm-overlap-LineColor button", "dm-select");
                let currValue = this.stroke;
                let maker, objValue, first = true;
                this.getSelectedObjects().forEach(obj => {
                    maker = new ns[obj.drawmakerType](this);
                    objValue = maker.get(obj, "stroke");
                    if (first && objValue !== undefined) {
                        currValue = objValue;
                        first = false;
                    }
                    if (!first && objValue !== undefined && objValue !== currValue) {
                        currValue = undefined;
                    }
                });
                if (currValue !== undefined) {
                    if (currValue === this._NO_COLOR) {
                        this._attachClass("#dm-overlap-LineColor button[value='null']", "dm-select");
                    } else {
                        this._attachClass("#dm-overlap-LineColor input[type='color']", "dm-select");
                        this._root.querySelector("#dm-overlap-LineColor input[type='color']").value = currValue;
                    }
                }
            });
            this._attachListener("#dm-overlap-LineColor button", "click", (listener, event) => {
                if (listener.value === "hide") {
                    this._attachAttribute("#dm-drawmaker", "data-dm-screen-overlay", false);
                    this._detachClass("#dm-overlap-LineColor", "dm-show");
                } else {
                    let selectValue = this._NO_COLOR;
                    let objs = this.getSelectedObjects();
                    if (objs.length > 0) {
                        objs.forEach(obj => {
                            let maker = new ns[obj.drawmakerType](this);
                            maker.set(obj, "stroke", selectValue);
                        });
                        this.canvas.requestRenderAll();
                    } else {
                        this.stroke = selectValue;
                    }
                    this._detachClass("#dm-overlap-LineColor input[type='color']", "dm-select");
                    this._attachClass("#dm-overlap-LineColor button[value='null']", "dm-select");
                }
            });
            this._attachListener("#dm-overlap-LineColor input[type='color']", "change", (listener, event) => {
                let selectValue = listener.value;
                let objs = this.getSelectedObjects();
                if (objs.length > 0) {
                    objs.forEach(obj => {
                        let maker = new ns[obj.drawmakerType](this);
                        maker.set(obj, "stroke", selectValue);
                    });
                    this.canvas.requestRenderAll();
                } else {
                    this.stroke = selectValue;
                }
                this._detachClass("#dm-overlap-LineType button", "dm-select");
                this._attachClass("#dm-overlap-LineColor input[type='color']", "dm-select");
            });
            this._attachListener("#dm-overlap-LineColor input[type='color']", "click", (listener, event) => {
                let selectValue = listener.value;
                let objs = this.getSelectedObjects();
                if (objs.length > 0) {
                    objs.forEach(obj => {
                        let maker = new ns[obj.drawmakerType](this);
                        maker.set(obj, "stroke", selectValue);
                    });
                    this.canvas.requestRenderAll();
                } else {
                    this.stroke = selectValue;
                }
                this._detachClass("#dm-overlap-LineType button", "dm-select");
                this._attachClass("#dm-overlap-LineColor input[type='color']", "dm-select");
            });

            // ---------------------------------------------------------------------------------------

            this._attachListener("[data-dm-control='LineWidth']", "click", (listener, event) => {
                this._attachAttribute("#dm-drawmaker", "data-dm-screen-overlay", true);
                this._attachClass("#dm-overlap-LineWidth", "dm-show");
                this._detachAttribute("#dm-overlap-LineWidth option", "selected");
                let currValue = this.strokeWidth;
                let maker, objValue, first = true;
                this.getSelectedObjects().forEach(obj => {
                    maker = new ns[obj.drawmakerType](this);
                    objValue = maker.get(obj, "strokeWidth");
                    if (first && objValue !== undefined) {
                        currValue = objValue;
                        first = false;
                    }
                    if (!first && objValue !== undefined && objValue !== currValue) {
                        currValue = undefined;
                    }
                });
                if (currValue !== undefined) {
                    this._attachAttribute("#dm-overlap-LineWidth option[value='" + JSON.stringify(currValue) + "']", "selected");
                }
            });
            this._attachListener("#dm-overlap-LineWidth button", "click", (listener, event) => {
                if (listener.value === "hide") {
                    this._attachAttribute("#dm-drawmaker", "data-dm-screen-overlay", false);
                    this._detachClass("#dm-overlap-LineWidth", "dm-show");
                }
            });
            this._attachListener("#dm-overlap-LineWidth select", "change", (listener, event) => {
                let selectValue = JSON.parse(listener.value);
                let objs = this.getSelectedObjects();
                if (objs.length > 0) {
                    objs.forEach(obj => {
                        let maker = new ns[obj.drawmakerType](this);
                        maker.set(obj, "strokeWidth", selectValue);
                    });
                    this.canvas.requestRenderAll();
                } else {
                    this.strokeWidth = selectValue;
                }
                this._detachAttribute("#dm-overlap-LineWidth option", "selected");
                this._attachAttribute("#dm-overlap-LineWidth option[value='" + listener.value + "']", "selected");
            });

            // ---------------------------------------------------------------------------------------

            this._attachListener("[data-dm-control='LineType']", "click", (listener, event) => {
                this._attachAttribute("#dm-drawmaker", "data-dm-screen-overlay", true);
                this._attachClass("#dm-overlap-LineType", "dm-show");
                this._detachClass("#dm-overlap-LineType button", "dm-select");
                let currValue = this.strokeDashArray;
                let maker, objValue, first = true;
                this.getSelectedObjects().forEach(obj => {
                    maker = new ns[obj.drawmakerType](this);
                    objValue = maker.get(obj, "strokeDashArray");
                    if (first && objValue !== undefined) {
                        currValue = objValue;
                        first = false;
                    }
                    if (!first && objValue !== undefined && objValue !== currValue) {
                        currValue = undefined;
                    }
                });
                if (currValue !== undefined) {
                    this._attachClass("#dm-overlap-LineType button[value='" + JSON.stringify(currValue) + "']", "dm-select");
                }
            });
            this._attachListener("#dm-overlap-LineType button", "click", (listener, event) => {
                if (listener.value === "hide") {
                    this._attachAttribute("#dm-drawmaker", "data-dm-screen-overlay", false);
                    this._detachClass("#dm-overlap-LineType", "dm-show");
                } else {
                    let selectValue = JSON.parse(listener.value);
                    let objs = this.getSelectedObjects();
                    if (objs.length > 0) {
                        objs.forEach(obj => {
                            let maker = new ns[obj.drawmakerType](this);
                            maker.set(obj, "strokeDashArray", selectValue);
                        });
                        this.canvas.requestRenderAll();
                    } else {
                        this.strokeDashArray = selectValue;
                    }
                    this._detachClass("#dm-overlap-LineType button", "dm-select");
                    this._attachClass("#dm-overlap-LineType button[value='" + listener.value + "']", "dm-select");
                }
            });

            // ---------------------------------------------------------------------------------------
            // NEW

            this._attachListener("[data-dm-control][data-dm-property]", "click", (listener, event) => {
                let property = listener.getAttribute("data-dm-property");
                let currValue = this._onGetProperty(property);
                this._attachClass("#dm-modal-" + property, "dm-display");
                this._attachAttribute("#dm-modal-" + property + " button", "data-dm-property", property);
                this._detachClass("#dm-modal-" + property + " button", "dm-select");
                this._attachClass("#dm-modal-" + property + " button[value='" + currValue + "'", "dm-select");
            });

            this._attachListener("dm-modal button", "click", (listener, event) => {
                let property = listener.getAttribute("data-dm-property");
                let currValue = listener.value;
                this._onSetProperty(property, currValue);
                this._detachClass("#dm-modal-" + property + " button", "dm-select");
                this._attachClass("#dm-modal-" + property + " button[value='" + currValue + "'", "dm-select");
            });

            // ---------------------------------------------------------------------------------------

            this._attachListener("[data-dm-control='SendBackwards']", "click", (listener, event) => {
                this.getSelectedObjects().forEach(obj => {
                    this.canvas.sendBackwards(obj);
                });
            });

            // ---------------------------------------------------------------------------------------

            this._attachListener("[data-dm-control='BringForwards']", "click", (listener, event) => {
                this.getSelectedObjects().forEach(obj => {
                    this.canvas.bringForward(obj);
                });
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
                image.scaleToWidth(this.canvas.getWidth(), true);
                if (image.getScaledHeight() > this.canvas.getHeight()) {
                    image.scaleToHeight(this.canvas.getHeight(), true);
                }
                this.canvas.requestRenderAll();
            }, options);
        }

        _attachListener(selector, eventType, callback) {
            let isCustomEvent = eventType.includes(":");
            this._root.querySelectorAll(selector).forEach(el => {
                if (isCustomEvent)
                    this._root.addEventListener(eventType, callback.bind(this, el));
                else
                    el.addEventListener(eventType, callback.bind(this, el));
            });
        }

        _dispatchEvent(eventType, detail) {
            let customInit = { detail: detail || {} };
            let customEvent = new CustomEvent(eventType, customInit);
            return this._root.dispatchEvent(customEvent);
        }

        _attachAttribute(selector, attribute, value) {
            this._root.querySelectorAll(selector).forEach(el => {
                el.setAttribute(attribute, value);
            });
        }

        _detachAttribute(selector, attribute) {
            this._root.querySelectorAll(selector).forEach(el => {
                el.removeAttribute(attribute);
            });
        }

        _attachClass(selector, styleClass) {
            this._root.querySelectorAll(selector).forEach(el => {
                el.classList.add(styleClass);
            });
        }

        _detachClass(selector, styleClass) {
            this._root.querySelectorAll(selector).forEach(el => {
                el.classList.remove(styleClass);
            });
        }

        _resetZoom() {
            this.canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
            this.canvas.setDimensions({ width: this.width, height: this.height });
            this._dispatchEvent('dm:zoom:change', { zoomLevel: this.canvas.getZoom() });
            // To fix: after zooming, eventually not all objects are visible.
            this._dummyObjectSelection();
        }

        _onZoomInClick(event) {
            if (this.canvas.getZoom() === this._MAX_ZOOM) {
                return false;
            }
            let zoom = Math.min(this.canvas.getZoom() + this._ZOOM_SHIFT_FACTOR, this._MAX_ZOOM);
            this.canvas.setZoom(zoom);
            this.canvas.setDimensions({ width: (this.width * zoom), height: (this.height * zoom) });
            this._dispatchEvent('dm:zoom:change', { zoomLevel: this.canvas.getZoom() });
            // To fix: after zooming, eventually not all objects are visible.
            this._dummyObjectSelection();
            return true;
        }

        _onZoomOutClick(event) {
            if (this.canvas.getZoom() === this._MIN_ZOOM) {
                return false;
            }
            let zoom = Math.max(this.canvas.getZoom() - this._ZOOM_SHIFT_FACTOR, this._MIN_ZOOM);
            if (zoom <= this._MIN_ZOOM) {
                this._resetZoom();
            } else {
                this.canvas.setZoom(zoom);
                this.canvas.setDimensions({ width: (this.width * zoom), height: (this.height * zoom) });
                this._dispatchEvent('dm:zoom:change', { zoomLevel: this.canvas.getZoom() });
                // To fix: after zooming, eventually not all objects are visible.
                this._dummyObjectSelection();
            }
            return true;
        }

        _onGetProperty(property) {
            let currValue = this[property];
            let maker, objValue, first = true;
            this.getSelectedObjects().forEach(obj => {
                if (!obj.drawmakerType)
                    return;
                maker = new ns[obj.drawmakerType](this);
                objValue = maker.get(obj, property);
                if (first && objValue !== undefined) {
                    currValue = objValue;
                    first = false;
                }
                if (!first && objValue !== undefined && objValue !== currValue) {
                    currValue = undefined;
                }
            });
            return JSON.stringify(currValue);
        }

        _onSetProperty(property, value) {
            let selectValue = JSON.parse(value);
            let objs = this.getSelectedObjects();
            if (objs.length > 0) {
                objs.forEach(obj => {
                    let maker = new ns[obj.drawmakerType](this);
                    maker.set(obj, property, selectValue);
                });
                this.canvas.requestRenderAll();
            } else {
                this[property] = selectValue;
            }
        }

        clear() {
            this.canvas.clear();
            this._resetZoom();
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
            return JSON.stringify(this.canvas.toJSON(['drawmakerType']));
        }

        toSVG() {
            this._resetZoom();
            return this.canvas.toSVG({ suppressPreamble: true });
        }

        getSelectedObjects() {
            let objs = this.canvas.getActiveObjects();
            objs = objs.filter(obj => {
                return obj.drawmakerType;
            });
            return objs;
        }

        getSelectableObjects() {
            let objs = this.canvas.getObjects();
            objs = objs.filter(obj => {
                return obj.drawmakerType && obj.selectable;
            });
            return objs;
        }

        _dummyObjectSelection() {
            // For unknown reasons, some individual object selection/visibility only works after a grouping selection.
            let objs = this.getSelectableObjects();
            this.canvas.discardActiveObject();
            this.canvas.setActiveObject(new fabric.ActiveSelection(objs));
            this.canvas.discardActiveObject();
        }

        enableObjectSelection() {
            // To fix: after enable, eventually not all objects are selectable with the mouse.
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

        select(makerType) {
            if (this._making) {
                return false;
            }
            if (this._selected && !this.deselect()) {
                return false;
            }
            this._selected = new ns[makerType](this);
            this._selected.select();
            this.canvas.defaultCursor = 'crosshair';
            this.disableObjectSelection();
            this._dispatchEvent('dm:maker:select', { makerType: makerType });
            return true;
        }

        deselect() {
            if (this._making) {
                return false;
            }
            if (this._selected) {
                let makerType = this._selected.type;
                this._selected.deselect();
                this._selected = null;
                this.canvas.defaultCursor = 'default';
                this.enableObjectSelection();
                this._dispatchEvent('dm:maker:deselect', { makerType: makerType });
            }
            return true;
        }

    }

    ns.BaseMaker = class {

        type = null;
        props = [];

        constructor(dm) {
            this.dm = dm;
        }

        start(options) {
            // default
        }

        update(options) {
            // default
        }

        stop(options) {
            // default
        }

        select() {
            // default
        }

        deselect() {
            // default
        }

        get(obj, property) {
            if (!this.props.includes(property))
                return;
            return obj.get(property);
        }

        set(obj, property, value) {
            if (!this.props.includes(property))
                return;
            obj.set(property, value);
        }

        isVisibleColor(color) {
            return (!color || color === this.dm._NO_COLOR) ? false : true;
        }

        isVisibleStrokeWidth(width) {
            return (!width || width < 1) ? false : true;
        }

        assertColor(color, assert) {
            if (assert === undefined) {
                return this.isVisibleColor(color) ? color : this.dm._DEFAULT_COLOR;
            } else {
                return (assert === true) ? this.assertColor(color) : color;
            }
        }

        assertStrokeWidth(width, assert) {
            if (assert === undefined) {
                return this.isVisibleStrokeWidth(width) ? width : this.dm._DEFAULT_STROKE_WIDTH;
            } else {
                return (assert === true) ? this.assertStrokeWidth(width) : width;
            }
        }

    }

    ns.RectMaker = class extends ns.BaseMaker {

        type = "RectMaker";
        props = ["fill", "stroke", "strokeWidth", "strokeDashArray"];
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
                drawmakerType: this.type,
                left: this._startLeft,
                top: this._startTop,
                width: 1,
                height: 1,
                fill: this.dm.fill,
                stroke: this.assertColor(this.dm.stroke, !this.isVisibleColor(this.dm.fill)),
                strokeWidth: this.assertStrokeWidth(this.dm.strokeWidth, !this.isVisibleColor(this.dm.fill)),
                strokeDashArray: this.dm.strokeDashArray,
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

        type = "CircleMaker";
        props = ["fill", "stroke", "strokeWidth", "strokeDashArray"];
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
                drawmakerType: this.type,
                originX: 'center',
                originY: 'center',
                left: this._startLeft,
                top: this._startTop,
                radius: 1,
                fill: this.dm.fill,
                stroke: this.assertColor(this.dm.stroke, !this.isVisibleColor(this.dm.fill)),
                strokeWidth: this.assertStrokeWidth(this.dm.strokeWidth, !this.isVisibleColor(this.dm.fill)),
                strokeDashArray: this.dm.strokeDashArray,
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

        type = "TriangleMaker";
        props = ["fill", "stroke", "strokeWidth", "strokeDashArray"];

        constructor(dm) {
            super(dm);
        }

        start(options) {
            let pointer = this.dm.canvas.getPointer(options.e);
            this._startLeft = pointer.x;
            this._startTop = pointer.y;
            this._shape = new fabric.Triangle({
                drawmakerType: this.type,
                left: this._startLeft,
                top: this._startTop,
                width: 1,
                height: 1,
                fill: this.dm.fill,
                stroke: this.assertColor(this.dm.stroke, !this.isVisibleColor(this.dm.fill)),
                strokeWidth: this.assertStrokeWidth(this.dm.strokeWidth, !this.isVisibleColor(this.dm.fill)),
                strokeDashArray: this.dm.strokeDashArray,
                evented: false,
            });
            this._attached = false;
        }

    }

    ns.LineMaker = class extends ns.BaseMaker {

        type = "LineMaker";
        props = ["stroke", "strokeWidth", "strokeDashArray"];
        _shape = null;
        _attached = false;

        constructor(dm) {
            super(dm);
        }

        start(options) {
            let pointer = this.dm.canvas.getPointer(options.e);
            this._shape = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
                drawmakerType: this.type,
                originX: 'center',
                originY: 'center',
                fill: null,
                stroke: this.assertColor(this.dm.stroke),
                strokeWidth: this.assertStrokeWidth(this.dm.strokeWidth),
                strokeDashArray: this.dm.strokeDashArray,
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

        type = "ArrowMaker";
        props = ["stroke", "strokeWidth", "strokeDashArray"];
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
            let stroke = this.assertColor(this.dm.stroke);
            let strokeWidth = this.assertStrokeWidth(this.dm.strokeWidth);
            let lineShape = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
                originX: 'center',
                originY: 'center',
                fill: null,
                stroke: stroke,
                strokeWidth: strokeWidth,
                strokeDashArray: this.dm.strokeDashArray,
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
                fill: stroke,
                stroke: stroke,
                strokeWidth: strokeWidth,
                strokeDashArray: null,
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
                    drawmakerType: this.type,
                    evented: false,
                });
                this.dm.canvas.add(group);
            }
            this.dm.canvas.requestRenderAll();
        }

        get(obj, property) {
            if (!this.props.includes(property))
                return;
            let item = obj.getObjects("line")[0];
            return item.get(property);
        }

        set(obj, property, value) {
            if (!this.props.includes(property))
                return;
            if (property === "stroke") {
                obj.getObjects("triangle").forEach(item => {
                    item.set("fill", value);
                });
                obj.getObjects().forEach(item => {
                    item.set(property, value);
                });
            }
            else if (property === "strokeWidth") {
                let headSize = this._headSize(value);
                obj.getObjects("triangle").forEach(item => {
                    item.set("width", headSize);
                    item.set("height", headSize);
                });
                obj.getObjects().forEach(item => {
                    item.set(property, value);
                });
            }
            else if (property === "strokeDashArray") {
                obj.getObjects("line").forEach(item => {
                    item.set(property, value);
                });
            }
            // Just to update the group's bounding box, as needed.
            obj.addWithUpdate();
        }

    }

    ns.DoubleArrowMaker = class extends ns.ArrowMaker {

        type = "DoubleArrowMaker";
        props = ["stroke", "strokeWidth", "strokeDashArray"];

        constructor(dm) {
            super(dm);
        }

        start(options) {
            let pointer = this.dm.canvas.getPointer(options.e);
            let stroke = this.assertColor(this.dm.stroke);
            let strokeWidth = this.assertStrokeWidth(this.dm.strokeWidth);
            let lineShape = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
                originX: 'center',
                originY: 'center',
                fill: null,
                stroke: stroke,
                strokeWidth: strokeWidth,
                strokeDashArray: this.dm.strokeDashArray,
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
                fill: stroke,
                stroke: stroke,
                strokeWidth: strokeWidth,
                strokeDashArray: null,
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
                fill: stroke,
                stroke: stroke,
                strokeWidth: strokeWidth,
                strokeDashArray: null,
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

        type = "TextBoxMaker";
        props = ["fill"];
        _shape = null;

        constructor(dm) {
            super(dm);
        }

        start(options) {
            let pointer = this.dm.canvas.getPointer(options.e);
            this._shape = new fabric.Textbox('Text...', {
                drawmakerType: this.type,
                originX: 'center',
                originY: 'center',
                left: pointer.x,
                top: pointer.y,
                textAlign: 'left',
                lineHeight: 1,
                fontSize: 20,
                fontWeight: 'normal',
                fontStyle: 'normal',
                fill: this.assertColor(this.dm.fill),
                stroke: null,
                strokeWidth: 0,
                strokeDashArray: null,
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

        type = "PencilBrushMaker";
        props = ["stroke", "strokeWidth", "strokeDashArray"];
        _shape = null;

        constructor(dm) {
            super(dm);
        }

        select() {
            this._shape = new fabric.PencilBrush(this.dm.canvas);
            this._shape.createPath = function () {
                // Function overriding needed to add to each new pencil brush path.
                let path = Object.getPrototypeOf(this).createPath.apply(this, arguments);
                path.drawmakerType = this.drawmakerType;
                return path;
            };
            this._shape.drawmakerType = this.type;
            this._shape.color = this.assertColor(this.dm.stroke);
            this._shape.width = this.assertStrokeWidth(this.dm.strokeWidth);
            this._shape.strokeDashArray = this.dm.strokeDashArray;
            this.dm.canvas.freeDrawingBrush = this._shape;
            this.dm.canvas.isDrawingMode = true;
            this.dm.canvas.requestRenderAll();
        }

        deselect() {
            this.dm.canvas.isDrawingMode = false;
            this.dm.canvas.requestRenderAll();
        }

        get(obj, property) {
            if (!this.props.includes(property))
                return;
            if (property === "stroke")
                return obj.get("color");
            if (property === "strokeWidth")
                return obj.get("width");
            return obj.get(property);
        }

        set(obj, property, value) {
            if (!this.props.includes(property))
                return;
            if (property === "stroke") {
                obj.set("color", value);
            } else if (property === "strokeWidth") {
                obj.set("width", value);
            } else {
                obj.set(property, value);
            }
        }

    }

})(this);