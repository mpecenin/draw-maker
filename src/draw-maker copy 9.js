(function (owner) {
    "use strict";

    /*
    TODO: avaliar...
    - Já fazer a tradução a medida que monta o template.
    - Ícones dos botões
    - Options para configurações de cor, tamanho, e mover para frente/trás.
    - Criar api para objectQuantity/Count (ou isEmpty) com botão alert no teste main.
    - ver se pode deixar as makers apenas como var/let da função global, deixando apenas a drawmaker no namespace.
    - ver se usa DrawMakerAPI/Controller para vincular ao elemento host.
    - ver se faz dash-lines, como uma possibilidade de configuração.
    - colocar copyright, se for o caso, no fonte/license, etc.
    - https://www.w3schools.com/css/css3_buttons.asp
    - ver se no stop, pode ser retirado o evented false, e se revolve o problema de nao imediatamente exibir/selecionar.
    - ver se melhora as setas, devido width grande aparece os cantos da linha, talvez desloca o triângulo da ponta, ou constroi com polígono.
    - ....ver problema, quando duas setas selecionadas, e muda opções, como strokeWidth para maior, e então ficam invisíveis.
    - substituir aspas duplas por simples.
    - testar, definir line width grande e retirar a cor da linha, para ver se a linha sem cor ainda fica ocupando espaço.
    - deixar apenas assert para sempre ter cor e espessura de linha/borda, e também checar nas alterações, só altera se tem, e sempre ter fill color no caso do texto. Assim, se quer sé preenchimento, basta deixar a borda com mesma cor. Então também pode retirar controle "Sem Cor" da linha/borda.
    - talvez colocar propriedade/parametro opacity, com alguns opção, como 25,50,75,100.
    - no lápiz, ao setar espessura da linha, está zoando o bounding box do path de seleção.
    - ao criar triângulo, as vezes não aparece os cantos, talvez seja o cálculo do width na criação.
    - talvez operação para dublicar objeto.
    - line style, ao invés de line type.
    - no final, exemplo de seta simples: https://stackoverflow.com/questions/11808860/how-to-place-arrow-head-triangles-on-svg-lines
    - head com linha e marker simples: https://vanseodesign.com/web-design/svg-markers/
    - reestruturar, fazer setas só com path, e ler objetos sempre do canvas mesmo, sem atributo adicional no json, e caso exista (defined) altera qualquer propriedade no objeto. Ao criar só coloca as padrões de interesse no objeto, mas depois pode alterar tudo.
    - http://fabricjs.com/copypaste // this should solve the unselectability
    - <path d="M0,10 L(210-10),(20-10) l0,-10 l10,10 l-10,10 l0,-10 Z"
    - https://www.w3schools.com/graphics/svg_path.asp
    - https://www.flaticon.com/free-icon/double-arrow_120833
    - ver se metodo criado roundFloat continua sendo usado.
    */

    let ns = owner.drawmaker || (owner.drawmaker = {});

    let tt = function (key) {
        let value = ns.textTranslation && ns.textTranslation[key];
        return value || key;
    }

    ns.DrawMaker = class {

        _DEFAULT_COLOR = "#ff0000";
        _DEFAULT_STROKE_WIDTH = 2;
        _MIN_ZOOM = 1;
        _MAX_ZOOM = 3.25;
        _ZOOM_SHIFT_FACTOR = 0.75;

        _host = null;
        _root = null;
        _selected = null;
        _making = null;

        constructor(container, options) {
            if (!container instanceof HTMLElement)
                throw new TypeError("Parameter container must be an instance of a host HTML Element.");

            this._host = container;
            options = options || {};

            this.width = options.width || 400;
            this.height = options.height || 400;
            this.backgroundImage = options.backgroundImage || null;

            this.fill = options.fill || null;
            this.stroke = options.stroke || this._DEFAULT_COLOR;
            this.strokeWidth = options.strokeWidth || this._DEFAULT_STROKE_WIDTH;
            this.strokeDashArray = options.strokeDashArray || null;
            this.opacity = options.opacity || 1;

            this._loadTemplate();
            this._host.drawmaker = this;
        }

        _loadTemplate() {
            this._attachTemplate(`
                <template id="dm-template">

                    <style>
                        .dm-drawmaker {
                            width: 100%;
                            height: 100%;
                            background-color: white;
                            display: flex;
                            flex-direction: column;
                            position: relative;
                        }

                        .dm-menu {
                            display: inline-block;
                            position: sticky;
                            top: 0;
                            z-index: 10;
                            margin: 2px;
                        }

                        .dm-menu-container {
                            display: inline-block;
                            background-color: #ebebeb;
                            padding-left: 2px;
                            padding-right: 2px;
                            border: 1px solid gray;
                        }

                        .dm-canvas {
                            overflow: auto;
                            margin: 2px;
                        }

                        .dm-canvas-container {
                            display: inline-block;
                            border: 1px solid gray;
                        }

                        .dm-drawmaker button {
                            margin-top: 2px;
                            margin-bottom: 2px;
                            background-color: transparent;
                            border: 2px solid transparent;
                            border-radius: 3px;
                            min-width: 30px;
                            transition-duration: 0.5s;
                            cursor: pointer;
                            outline: 0;                            
                        }

                        .dm-drawmaker .dm-menu button svg {
                            min-width: 20px;
                            height: 17px;
                            vertical-align: bottom;
                        }

                        .dm-drawmaker button:hover, .dm-drawmaker button.dm-select {
                            border-color: black;
                        }

                        .dm-drawmaker button:active,
                        .dm-drawmaker .dm-menu [data-dm-maker].dm-select,                        
                        .dm-drawmaker .dm-dropdown:hover .dm-dropdown-trigger
                        {
                            background-color: black;
                            border-color: black;
                            color: white;
                            fill: white;
                        }

                        .dm-drawmaker[data-dm-zoom-limit='max'] .dm-menu [data-dm-operation='zoomIn'],
                        .dm-drawmaker[data-dm-zoom-limit='min'] .dm-menu [data-dm-operation='zoomOut'],
                        .dm-drawmaker[data-dm-object-select='false'] .dm-menu [data-dm-operation='remove'],
                        .dm-drawmaker[data-dm-object-select='false'] .dm-menu [data-dm-operation='duplicate'],
                        .dm-drawmaker[data-dm-object-select='false'] .dm-menu [data-dm-operation='sendBackwards'],
                        .dm-drawmaker[data-dm-object-select='false'] .dm-menu [data-dm-operation='bringForwards']
                        {
                            border-color: transparent;
                            color: gray;
                            fill: gray;
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
                            display: none;
                            background-color: #f1f1f1;
                            position: absolute;
                            z-index: 20;
                        }

                        .dm-dropdown-list button {
                            margin: 5px;
                            white-space: nowrap;
                        }

                        .dm-modal {
                            display: none;
                            width: 100%;
                            height: 100%;
                            background-color: transparent;
                            flex-direction: column;
                            align-items: center;
                            position: absolute;
                            z-index: 30;
                            padding: 2px;
                        }

                        .dm-modal-display {
                            display: flex;
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
                            align-items: center;
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
                            padding: 10px;
                        }

                        .dm-modal-document .dm-modal-body button {
                            margin: 5px;
                            box-shadow: 0px 0px 5px gray;
                        }

                        .dm-modal-document .dm-modal-body button.dm-select {
                            background-color: #cccccc;
                        }
                    </style>

                    <div class="dm-drawmaker" data-dm-zoom-limit="min" data-dm-object-select="false">
                        <div class="dm-menu">
                            <div class="dm-menu-container">
                                <!-- SVG Icons - Font Awesome - https://fontawesome.com -->
                                <button data-dm-maker="RectMaker" class="dm-stop-deselect" title="tt('Draw Rectangle')"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path d="M400 32H48C21.5 32 0 53.5 0 80v352c0 26.5 21.5 48 48 48h352c26.5 0 48-21.5 48-48V80c0-26.5-21.5-48-48-48z"/></svg></button>
                                <button data-dm-maker="CircleMaker" class="dm-stop-deselect" title="tt('Draw Circle')"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M256 8C119 8 8 119 8 256s111 248 248 248 248-111 248-248S393 8 256 8z"/></svg></button>
                                <button data-dm-maker="TriangleMaker" class="dm-stop-deselect" title="tt('Draw Triangle')"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path d="M424.4 214.7L72.4 6.6C43.8-10.3 0 6.1 0 47.9V464c0 37.5 40.7 60.1 72.4 41.3l352-208c31.4-18.5 31.5-64.1 0-82.6z"/></svg></button>
                                <button data-dm-maker="LineMaker" class="dm-stop-deselect" title="tt('Draw Line')"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path d="M416 208H32c-17.67 0-32 14.33-32 32v32c0 17.67 14.33 32 32 32h384c17.67 0 32-14.33 32-32v-32c0-17.67-14.33-32-32-32z"/></svg></button>
                                <button data-dm-maker="ArrowMaker" class="dm-stop-deselect" title="tt('Draw Arrow')"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path d="M313.941 216H12c-6.627 0-12 5.373-12 12v56c0 6.627 5.373 12 12 12h301.941v46.059c0 21.382 25.851 32.09 40.971 16.971l86.059-86.059c9.373-9.373 9.373-24.569 0-33.941l-86.059-86.059c-15.119-15.119-40.971-4.411-40.971 16.971V216z"/></svg></button>
                                <button data-dm-maker="DoubleArrowMaker" class="dm-stop-deselect" title="tt('Draw Double Arrow')"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M377.941 169.941V216H134.059v-46.059c0-21.382-25.851-32.09-40.971-16.971L7.029 239.029c-9.373 9.373-9.373 24.568 0 33.941l86.059 86.059c15.119 15.119 40.971 4.411 40.971-16.971V296h243.882v46.059c0 21.382 25.851 32.09 40.971 16.971l86.059-86.059c9.373-9.373 9.373-24.568 0-33.941l-86.059-86.059c-15.119-15.12-40.971-4.412-40.971 16.97z"/></svg></button>
                                <button data-dm-maker="TextBoxMaker" class="dm-stop-deselect" title="tt('Text Box')"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path d="M432 416h-23.41L277.88 53.69A32 32 0 0 0 247.58 32h-47.16a32 32 0 0 0-30.3 21.69L39.41 416H16a16 16 0 0 0-16 16v32a16 16 0 0 0 16 16h128a16 16 0 0 0 16-16v-32a16 16 0 0 0-16-16h-19.58l23.3-64h152.56l23.3 64H304a16 16 0 0 0-16 16v32a16 16 0 0 0 16 16h128a16 16 0 0 0 16-16v-32a16 16 0 0 0-16-16zM176.85 272L224 142.51 271.15 272z"/></svg></button>
                                <button data-dm-maker="PencilBrushMaker" title="tt('Free Drawing')"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M497.9 142.1l-46.1 46.1c-4.7 4.7-12.3 4.7-17 0l-111-111c-4.7-4.7-4.7-12.3 0-17l46.1-46.1c18.7-18.7 49.1-18.7 67.9 0l60.1 60.1c18.8 18.7 18.8 49.1 0 67.9zM284.2 99.8L21.6 362.4.4 483.9c-2.9 16.4 11.4 30.6 27.8 27.8l121.5-21.3 262.6-262.6c4.7-4.7 4.7-12.3 0-17l-111-111c-4.8-4.7-12.4-4.7-17.1 0zM124.1 339.9c-5.5-5.5-5.5-14.3 0-19.8l154-154c5.5-5.5 14.3-5.5 19.8 0s5.5 14.3 0 19.8l-154 154c-5.5 5.5-14.3 5.5-19.8 0zM88 424h48v36.3l-64.5 11.3-31.1-31.1L51.7 376H88v48z"/></svg></button>
                                <span>||</span>
                                <button data-dm-operation="zoomIn" title="tt('Zoom In')"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M304 192v32c0 6.6-5.4 12-12 12h-56v56c0 6.6-5.4 12-12 12h-32c-6.6 0-12-5.4-12-12v-56h-56c-6.6 0-12-5.4-12-12v-32c0-6.6 5.4-12 12-12h56v-56c0-6.6 5.4-12 12-12h32c6.6 0 12 5.4 12 12v56h56c6.6 0 12 5.4 12 12zm201 284.7L476.7 505c-9.4 9.4-24.6 9.4-33.9 0L343 405.3c-4.5-4.5-7-10.6-7-17V372c-35.3 27.6-79.7 44-128 44C93.1 416 0 322.9 0 208S93.1 0 208 0s208 93.1 208 208c0 48.3-16.4 92.7-44 128h16.3c6.4 0 12.5 2.5 17 7l99.7 99.7c9.3 9.4 9.3 24.6 0 34zM344 208c0-75.2-60.8-136-136-136S72 132.8 72 208s60.8 136 136 136 136-60.8 136-136z"/></svg></button>
                                <button data-dm-operation="zoomOut" title="tt('Zoom Out')"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M304 192v32c0 6.6-5.4 12-12 12H124c-6.6 0-12-5.4-12-12v-32c0-6.6 5.4-12 12-12h168c6.6 0 12 5.4 12 12zm201 284.7L476.7 505c-9.4 9.4-24.6 9.4-33.9 0L343 405.3c-4.5-4.5-7-10.6-7-17V372c-35.3 27.6-79.7 44-128 44C93.1 416 0 322.9 0 208S93.1 0 208 0s208 93.1 208 208c0 48.3-16.4 92.7-44 128h16.3c6.4 0 12.5 2.5 17 7l99.7 99.7c9.3 9.4 9.3 24.6 0 34zM344 208c0-75.2-60.8-136-136-136S72 132.8 72 208s60.8 136 136 136 136-60.8 136-136z"/></svg></button>
                                <span>||</span>
                                <button data-dm-operation="remove" title="tt('Remove')"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 448 512"><path d="M432 32H312l-9.4-18.7A24 24 0 0 0 281.1 0H166.8a23.72 23.72 0 0 0-21.4 13.3L136 32H16A16 16 0 0 0 0 48v32a16 16 0 0 0 16 16h416a16 16 0 0 0 16-16V48a16 16 0 0 0-16-16zM53.2 467a48 48 0 0 0 47.9 45h245.8a48 48 0 0 0 47.9-45L416 128H32z"/></svg></button>
                                <button data-dm-operation="duplicate" title="tt('Duplicate')"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><path d="M464 0c26.51 0 48 21.49 48 48v288c0 26.51-21.49 48-48 48H176c-26.51 0-48-21.49-48-48V48c0-26.51 21.49-48 48-48h288M176 416c-44.112 0-80-35.888-80-80V128H48c-26.51 0-48 21.49-48 48v288c0 26.51 21.49 48 48 48h288c26.51 0 48-21.49 48-48v-48H176z"/></svg></button>
                                <div class="dm-dropdown">
                                    <button class="dm-dropdown-trigger" title="tt('Settings')"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 512"><path d="M96 184c39.8 0 72 32.2 72 72s-32.2 72-72 72-72-32.2-72-72 32.2-72 72-72zM24 80c0 39.8 32.2 72 72 72s72-32.2 72-72S135.8 8 96 8 24 40.2 24 80zm0 352c0 39.8 32.2 72 72 72s72-32.2 72-72-32.2-72-72-72-72 32.2-72 72z"/></svg></button>
                                    <div class="dm-dropdown-list">
                                        <button data-dm-property="fill">tt('Fill/Text Color')</button>
                                        <button data-dm-property="stroke">tt('Line/Border Color')</button>
                                        <button data-dm-property="strokeDashArray">tt('Line/Border Style')</button>
                                        <button data-dm-property="strokeWidth">tt('Line/Border Width')</button>
                                        <button data-dm-property="opacity">tt('Object Opacity')</button>
                                        <button data-dm-operation="sendBackwards">tt('Send Backwards')</button>
                                        <button data-dm-operation="bringForwards">tt('Bring Forwards')</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="dm-canvas">
                            <div class="dm-canvas-container">
                                <canvas id="dm-canvas"></canvas>
                            </div>
                        </div>
                        <div class="dm-modal" data-dm-property="fill">
                            <div class="dm-modal-document">
                                <div class="dm-modal-head">
                                    <div class="dm-modal-title">tt('Fill/Text Color')</div>
                                    <button value="__hide__">X</button>
                                </div>
                                <div class="dm-modal-body">
                                    ${this._colorTemplate()}
                                    <div style="text-align: center; margin-top: 10px;">
                                        <button value="null">tt('Without Color / Transparent')</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="dm-modal" data-dm-property="stroke">
                            <div class="dm-modal-document">
                                <div class="dm-modal-head">
                                    <div class="dm-modal-title">tt('Line/Border Color')</div>
                                    <button value="__hide__">X</button>
                                </div>
                                <div class="dm-modal-body">
                                    ${this._colorTemplate()}
                                    <div style="text-align: center; margin-top: 10px;">
                                        <button value="null">tt('Without Color / Transparent')</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div class="dm-modal" data-dm-property="strokeWidth">
                            <div class="dm-modal-document">
                                <div class="dm-modal-head">
                                    <div class="dm-modal-title">tt('Line/Border Width')</div>
                                    <button value="__hide__">X</button>
                                </div>
                                <div class="dm-modal-body">
                                    <button value="0">0</button>
                                    <button value="1">1</button><button value="2">2</button>
                                    <button value="3">3</button><button value="4">4</button>
                                    <button value="5">5</button><button value="6">6</button>
                                    <button value="7">7</button><button value="8">8</button>
                                    <button value="9">9</button><button value="10">10</button>
                                </div>
                            </div>
                        </div>
                        <div class="dm-modal" data-dm-property="strokeDashArray">
                            <div class="dm-modal-document">
                                <div class="dm-modal-head">
                                    <div class="dm-modal-title">tt('Line/Border Style')</div>
                                    <button value="__hide__">X</button>
                                </div>
                                <div class="dm-modal-body">
                                    <button value="null"><svg width="100" height="5"><line fill="none" stroke="black" stroke-width="2" x1="0" y1="0" x2="100" y2="0"/></svg></button>
                                    <button value='` + JSON.stringify([5, 5]) + `'><svg width="100" height="5"><path fill="none" stroke="black" stroke-width="2" stroke-dasharray="5, 5" d="M0 1 l100 0"/></svg></button>
                                    <button value='` + JSON.stringify([20, 10]) + `'><svg width="110" height="5"><path fill="none" stroke="black" stroke-width="2" stroke-dasharray="20, 10" d="M0 1 l110 0"/></svg></button>
                                </div>
                            </div>
                        </div>
                        <div class="dm-modal" data-dm-property="opacity">
                            <div class="dm-modal-document">
                                <div class="dm-modal-head">
                                    <div class="dm-modal-title">tt('Object Opacity')</div>
                                    <button value="__hide__">X</button>
                                </div>
                                <div class="dm-modal-body">
                                    <button value="0.1">10%</button><button value="0.2">20%</button>
                                    <button value="0.3">30%</button><button value="0.4">40%</button>
                                    <button value="0.5">50%</button><button value="0.6">60%</button>
                                    <button value="0.7">70%</button><button value="0.8">80%</button>
                                    <button value="0.9">90%</button><button value="1">100%</button>
                                </div>
                            </div>
                        </div>
                    </div>
                        
                </template>
            `);
        }

        _colorTemplate() {
            let range = ['00', '90', 'ff'];
            let template = '';
            range.forEach(g => {
                range.forEach(b => {
                    range.forEach(r => {
                        template += '<button value=\'"#' + r + g + b + '"\'><div style="background: #' + r + g + b + '; height: 10px; width: 50px; margin: 2px; border: 1px solid black;"></div></button>';
                    });
                    template += '<br>';
                });
            });
            return template;
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
                    this._attachAttribute(".dm-drawmaker", "data-dm-object-select", true);
                }
            });
            this.canvas.on('selection:cleared', options => {
                this._attachAttribute(".dm-drawmaker", "data-dm-object-select", false);
            });

            this._attachListener(".dm-drawmaker", "dm:zoom:change", (listener, event) => {
                let limit = (this.canvas.getZoom() >= this._MAX_ZOOM) ? "max" : (this.canvas.getZoom() <= this._MIN_ZOOM) ? "min" : "";
                this._attachAttribute(".dm-drawmaker", "data-dm-zoom-limit", limit);
            });

            // ---------------------------------------------------------------------------------------

            this._attachListener(".dm-menu [data-dm-maker]", "click", (listener, event) => {
                if (listener.classList.contains("dm-select")) {
                    return this._onMakerDeselect();
                } else {
                    return this._onMakerSelect(listener.getAttribute("data-dm-maker"));
                }
            });

            this._attachListener(".dm-menu [data-dm-maker].dm-stop-deselect", "dm:maker:stop", (listener, event) => {
                if (listener.getAttribute("data-dm-maker") === event.detail.makerType) {
                    return this._onMakerDeselect();
                }
            });

            this._attachListener(".dm-menu [data-dm-maker]", "dm:maker:select", (listener, event) => {
                if (listener.getAttribute("data-dm-maker") === event.detail.makerType) {
                    listener.classList.add("dm-select");
                }
            });
            this._attachListener(".dm-menu [data-dm-maker]", "dm:maker:deselect", (listener, event) => {
                if (listener.getAttribute("data-dm-maker") === event.detail.makerType) {
                    listener.classList.remove("dm-select");
                }
            });

            this._attachListener(".dm-menu [data-dm-operation='zoomIn']", "click", (listener, event) => {
                return this._onZoomIn();
            });
            this._attachListener(".dm-menu [data-dm-operation='zoomOut']", "click", (listener, event) => {
                return this._onZoomOut();
            });

            this._attachListener(".dm-menu [data-dm-operation='remove']", "click", (listener, event) => {
                let objs = this.getSelectedObjects();
                this.canvas.discardActiveObject();
                this.canvas.remove(...objs);
            });

            this._attachListener(".dm-menu [data-dm-operation='duplicate']", "click", (listener, event) => {
                this._onDuplicate();
            });

            this._attachListener(".dm-menu [data-dm-operation='sendBackwards']", "click", (listener, event) => {
                this.getSelectedObjects().forEach(obj => {
                    this.canvas.sendBackwards(obj);
                });
            });

            this._attachListener(".dm-menu [data-dm-operation='bringForwards']", "click", (listener, event) => {
                this.getSelectedObjects().forEach(obj => {
                    this.canvas.bringForward(obj);
                });
            });

            // ---------------------------------------------------------------------------------------

            this._attachListener(".dm-menu [data-dm-property]", "click", (listener, event) => {
                let property = listener.getAttribute("data-dm-property");
                let currValue = this._onGetProperty(property);
                let modal = ".dm-modal[data-dm-property='" + property + "']";
                this._attachClass(modal, "dm-modal-display");
                this._attachAttribute(modal + " button", "data-dm-property", property);
                this._detachClass(modal + " button", "dm-select");
                this._attachClass(modal + " button[value='" + currValue + "']", "dm-select");
            });

            this._attachListener(".dm-modal[data-dm-property] button", "click", (listener, event) => {
                let property = listener.getAttribute("data-dm-property");
                let selectValue = listener.value;
                let modal = ".dm-modal[data-dm-property='" + property + "']";
                if (selectValue === "__hide__") {
                    this._detachClass(modal, "dm-modal-display");
                } else {
                    this._onSetProperty(property, selectValue);
                    this._detachClass(modal + " button", "dm-select");
                    this._attachClass(modal + " button[value='" + selectValue + "']", "dm-select");
                }
            });

        }

        _setBackgroundImage() {
            if (!this.backgroundImage)
                return;
            let uri = this.backgroundImage.toString();
            let options = { excludeFromExport: true, scaleX: 1, scaleY: 1 };
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

        getSelectedObjects() {
            let objs = this.canvas.getActiveObjects();
            objs = objs.filter(obj => {
                return obj.drawmaker && obj.drawmaker.type;
            });
            return objs;
        }

        getSelectableObjects() {
            let objs = this.canvas.getObjects();
            objs = objs.filter(obj => {
                return obj.drawmaker && obj.drawmaker.type && obj.selectable;
            });
            return objs;
        }

        _dummyObjectSelection() {
            // Some individual object selection/visibility only works after a grouping selection.
            let objs = this.getSelectableObjects();
            this.canvas.discardActiveObject();
            this.canvas.setActiveObject(new fabric.ActiveSelection(objs));
            this.canvas.discardActiveObject();
        }

        enableObjectSelection() {
            this.getSelectableObjects().forEach(obj => {
                obj.set('evented', true);
            });
            this.canvas.set('selection', true);
            this.canvas.requestRenderAll();
            // After enable, eventually not all objects are selectable with the mouse.
            this._dummyObjectSelection();
        }

        disableObjectSelection() {
            this.canvas.discardActiveObject();
            this.getSelectableObjects().forEach(obj => {
                obj.set('evented', false);
            });
            this.canvas.set('selection', false);
            this.canvas.requestRenderAll();
        }

        _onMakerSelect(makerType) {
            if (this._making) {
                return false;
            }
            if (this._selected && !this._onMakerDeselect()) {
                return false;
            }
            this._selected = new ns[makerType](this);
            this._selected.select();
            this.canvas.defaultCursor = 'crosshair';
            this.disableObjectSelection();
            this._dispatchEvent('dm:maker:select', { makerType: makerType });
            return true;
        }

        _onMakerDeselect() {
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

        _resetZoom() {
            this.canvas.discardActiveObject();
            this.canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
            this.canvas.setDimensions({ width: this.width, height: this.height });
            this._dispatchEvent('dm:zoom:change', { zoomValue: this.canvas.getZoom() });
            // After zooming, eventually not all objects are visible.
            this._dummyObjectSelection();
        }

        _onZoomIn() {
            if (this.canvas.getZoom() === this._MAX_ZOOM) {
                return false;
            }
            this.canvas.discardActiveObject();
            let zoom = Math.min(this.canvas.getZoom() + this._ZOOM_SHIFT_FACTOR, this._MAX_ZOOM);
            this.canvas.setZoom(zoom);
            this.canvas.setDimensions({ width: (this.width * zoom), height: (this.height * zoom) });
            this._dispatchEvent('dm:zoom:change', { zoomValue: this.canvas.getZoom() });
            // After zooming, eventually not all objects are visible.
            this._dummyObjectSelection();
            return true;
        }

        _onZoomOut() {
            if (this.canvas.getZoom() === this._MIN_ZOOM) {
                return false;
            }
            let zoom = Math.max(this.canvas.getZoom() - this._ZOOM_SHIFT_FACTOR, this._MIN_ZOOM);
            if (zoom <= this._MIN_ZOOM) {
                this._resetZoom();
            } else {
                this.canvas.discardActiveObject();
                this.canvas.setZoom(zoom);
                this.canvas.setDimensions({ width: (this.width * zoom), height: (this.height * zoom) });
                this._dispatchEvent('dm:zoom:change', { zoomValue: this.canvas.getZoom() });
                // After zooming, eventually not all objects are visible.
                this._dummyObjectSelection();
            }
            return true;
        }

        _onDuplicate() {
            let active = this.canvas.getActiveObject();
            if (!active)
                return;
            active.clone(cloned => {
                this.canvas.discardActiveObject();
                cloned.set({
                    left: cloned.left + 10,
                    top: cloned.top + 10,
                    evented: true
                });
                if (cloned.type === "activeSelection") {
                    cloned.canvas = this.canvas;
                    cloned.forEachObject(obj => {
                        this.canvas.add(obj);
                    });
                    cloned.setCoords();
                } else {
                    this.canvas.add(cloned);
                }
                this.canvas.setActiveObject(cloned);
                this.canvas.requestRenderAll();
            }, ['drawmaker']);
        }

        _onGetProperty(property) {
            let currValue = this[property];
            let maker, objValue, first = true;
            this.getSelectedObjects().forEach(obj => {
                if (!(obj.drawmaker && obj.drawmaker.type))
                    return;
                maker = new ns[obj.drawmaker.type](this);
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
                // With active selection, group objects are shifted.
                this.canvas.discardActiveObject();
                objs.forEach(obj => {
                    if (!(obj.drawmaker && obj.drawmaker.type))
                        return;
                    let maker = new ns[obj.drawmaker.type](this);
                    maker.set(obj, property, selectValue);
                });
                this.canvas.setActiveObject(new fabric.ActiveSelection(objs));
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
            return JSON.stringify(this.canvas.toJSON(['drawmaker']));
        }

        toSVG() {
            this._resetZoom();
            return this.canvas.toSVG({ suppressPreamble: true });
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
            // Update object bounding box, as needed.
            obj.setCoords();
            this.dm.canvas.requestRenderAll();
        }

        roundFloat(floatNumber) {
            return Math.round((floatNumber + Number.EPSILON) * 100.0) / 100.0;
        }

        isVisibleColor(color) {
            return (!color || color === "") ? false : true;
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
        props = ["fill", "stroke", "strokeWidth", "strokeDashArray", "opacity"];
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
                drawmaker: { type: this.type },
                left: this._startLeft,
                top: this._startTop,
                width: 0,
                height: 0,
                fill: this.dm.fill,
                stroke: this.assertColor(this.dm.stroke, !this.isVisibleColor(this.dm.fill)),
                strokeWidth: this.assertStrokeWidth(this.dm.strokeWidth, !this.isVisibleColor(this.dm.fill)),
                strokeDashArray: this.dm.strokeDashArray,
                opacity: this.dm.opacity,
                evented: false,
            });
            this._attached = false;
        }

        update(options) {
            let pointer = this.dm.canvas.getPointer(options.e);
            let left = (pointer.x < this._startLeft) ? pointer.x : this._startLeft;
            let top = (pointer.y < this._startTop) ? pointer.y : this._startTop;
            let width = this.roundFloat(Math.abs(pointer.x - this._startLeft));
            let height = this.roundFloat(Math.abs(pointer.y - this._startTop));
            this._shape.set('left', left);
            this._shape.set('top', top);
            this._shape.set('width', width);
            this._shape.set('height', height);
            if (!this._attached) {
                this.dm.canvas.add(this._shape);
                this._attached = true;
            }
            this._shape.setCoords();
            this.dm.canvas.requestRenderAll();
        }

    }

    ns.CircleMaker = class extends ns.BaseMaker {

        type = "CircleMaker";
        props = ["fill", "stroke", "strokeWidth", "strokeDashArray", "opacity"];
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
                drawmaker: { type: this.type },
                originX: 'center',
                originY: 'center',
                left: this._startLeft,
                top: this._startTop,
                radius: 0,
                fill: this.dm.fill,
                stroke: this.assertColor(this.dm.stroke, !this.isVisibleColor(this.dm.fill)),
                strokeWidth: this.assertStrokeWidth(this.dm.strokeWidth, !this.isVisibleColor(this.dm.fill)),
                strokeDashArray: this.dm.strokeDashArray,
                opacity: this.dm.opacity,
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
            let radius = this.roundFloat(Math.sqrt(Math.pow(width, 2) + Math.pow(height, 2)));
            this._shape.set('left', centerX);
            this._shape.set('top', centerY);
            this._shape.set('radius', radius);
            if (!this._attached) {
                this.dm.canvas.add(this._shape);
                this._attached = true;
            }
            this._shape.setCoords();
            this.dm.canvas.requestRenderAll();
        }

    }

    ns.TriangleMaker = class extends ns.RectMaker {

        type = "TriangleMaker";
        props = ["fill", "stroke", "strokeWidth", "strokeDashArray", "opacity"];

        constructor(dm) {
            super(dm);
        }

        start(options) {
            let pointer = this.dm.canvas.getPointer(options.e);
            this._startLeft = pointer.x;
            this._startTop = pointer.y;
            this._shape = new fabric.Triangle({
                drawmaker: { type: this.type },
                left: this._startLeft,
                top: this._startTop,
                width: 0,
                height: 0,
                fill: this.dm.fill,
                stroke: this.assertColor(this.dm.stroke, !this.isVisibleColor(this.dm.fill)),
                strokeWidth: this.assertStrokeWidth(this.dm.strokeWidth, !this.isVisibleColor(this.dm.fill)),
                strokeDashArray: this.dm.strokeDashArray,
                opacity: this.dm.opacity,
                evented: false,
            });
            this._attached = false;
        }

    }

    ns.LineMaker = class extends ns.BaseMaker {

        type = "LineMaker";
        props = ["stroke", "strokeWidth", "strokeDashArray", "opacity"];
        _shape = null;
        _attached = false;

        constructor(dm) {
            super(dm);
        }

        start(options) {
            let pointer = this.dm.canvas.getPointer(options.e);
            this._shape = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
                drawmaker: { type: this.type },
                originX: 'center',
                originY: 'center',
                fill: null,
                stroke: this.assertColor(this.dm.stroke),
                strokeWidth: this.assertStrokeWidth(this.dm.strokeWidth),
                strokeDashArray: this.dm.strokeDashArray,
                opacity: this.dm.opacity,
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
            this._shape.setCoords();
            this.dm.canvas.requestRenderAll();
        }

    }

    ns.ArrowMaker = class extends ns.BaseMaker {

        type = "ArrowMaker";
        props = ["stroke", "strokeWidth", "strokeDashArray", "opacity"];
        _shapes = null;
        _attached = false;

        constructor(dm) {
            super(dm);
        }

        _headSize(strokeWidth) {
            let factor = 6;
            let size = Math.round(factor + (strokeWidth * (factor / 2.0)));
            return (strokeWidth > 0) ? size : 0;
        };

        _arrowAngle(x1, y1, x2, y2) {
            return this.roundFloat((Math.atan2((y2 - y1), (x2 - x1)) * (180 / Math.PI)) + 90);
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
                opacity: this.dm.opacity,
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
                stroke: null,
                strokeWidth: 0,
                strokeDashArray: null,
                opacity: this.dm.opacity,
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
            lineShape.setCoords();
            triangleShape.setCoords();
            this.dm.canvas.requestRenderAll();
        }

        stop(options) {
            if (this._attached) {
                this.dm.canvas.remove(...this._shapes);
                let group = new fabric.Group(this._shapes, {
                    drawmaker: { type: this.type },
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
                obj.getObjects("line").forEach(item => {
                    item.set(property, value);
                });
            }
            else if (property === "strokeWidth") {
                let headSize = this._headSize(value);
                obj.getObjects("triangle").forEach(item => {
                    item.set("width", headSize);
                    item.set("height", headSize);
                });
                obj.getObjects("line").forEach(item => {
                    item.set(property, value);
                });
            }
            else if (property === "strokeDashArray") {
                obj.getObjects("line").forEach(item => {
                    item.set(property, value);
                });
            }
            else {
                obj.getObjects().forEach(item => {
                    item.set(property, value);
                });
            }
            // Update the group and objects bounding box, as needed.
            obj.addWithUpdate();
            this.dm.canvas.requestRenderAll();
        }

    }

    ns.DoubleArrowMaker = class extends ns.ArrowMaker {

        type = "DoubleArrowMaker";
        props = ["stroke", "strokeWidth", "strokeDashArray", "opacity"];

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
                opacity: this.dm.opacity,
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
                stroke: null,
                strokeWidth: 0,
                strokeDashArray: null,
                opacity: this.dm.opacity,
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
                stroke: null,
                strokeWidth: 0,
                strokeDashArray: null,
                opacity: this.dm.opacity,
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
            lineShape.setCoords();
            toTriangleShape.setCoords();
            fromTriangleShape.setCoords();
            this.dm.canvas.requestRenderAll();
        }

    }

    ns.TextBoxMaker = class extends ns.BaseMaker {

        type = "TextBoxMaker";
        props = ["fill", "opacity"];
        _shape = null;

        constructor(dm) {
            super(dm);
        }

        start(options) {
            let pointer = this.dm.canvas.getPointer(options.e);
            this._shape = new fabric.Textbox('Text...', {
                drawmaker: { type: this.type },
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
                opacity: this.dm.opacity,
                evented: false,
            });
            this.dm.canvas.add(this._shape);
            this.dm.canvas.requestRenderAll();
        }

        update(options) {
            let pointer = this.dm.canvas.getPointer(options.e);
            this._shape.set('left', pointer.x);
            this._shape.set('top', pointer.y);
            this._shape.setCoords();
            this.dm.canvas.requestRenderAll();
        }

    }

    ns.PencilBrushMaker = class extends ns.BaseMaker {

        type = "PencilBrushMaker";
        props = ["stroke", "strokeWidth", "strokeDashArray", "opacity"];
        _shape = null;

        constructor(dm) {
            super(dm);
        }

        _updatePencil() {
            // Pencil to draw, but it generates Paths.
            this._shape.color = this.assertColor(this.dm.stroke);
            this._shape.width = this.assertStrokeWidth(this.dm.strokeWidth);
            this._shape.strokeDashArray = this.dm.strokeDashArray;
            this._shape.opacity = this.dm.opacity;
        }

        start(options) {
            this._updatePencil();
        }

        select() {
            this._shape = new fabric.PencilBrush(this.dm.canvas);
            this._shape.createPath = function () {
                let path = Object.getPrototypeOf(this).createPath.apply(this, arguments);
                // Function overriding needed to add to each new pencil brush path.
                path.drawmaker = this.drawmaker;
                // fabric.PencilBrush doesn't have opacity property yet, but fabric.Path has.
                path.opacity = this.opacity;
                return path;
            };
            this._shape.drawmaker = { type: this.type };
            this._updatePencil();
            this.dm.canvas.freeDrawingBrush = this._shape;
            this.dm.canvas.isDrawingMode = true;
            this.dm.canvas.requestRenderAll();
        }

        deselect() {
            this.dm.canvas.isDrawingMode = false;
            this.dm.canvas.requestRenderAll();
        }

    }

})(this);