(function (owner) {
    "use strict";

    let ns = owner.drawmaker || (owner.drawmaker = {});

    let DrawMakerElement = class extends HTMLElement {

        constructor() {
            super();
        }

        connectedCallback() {
            let options = this._loadOptions();
            new ns.DrawMaker(this, options);
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
            value = this.getAttribute("backgroundImage");
            if (value && value.trim() !== "") {
                options.backgroundImage = value;
            }
            return options;
        }

    }

    customElements.define("dm-drawmaker", DrawMakerElement);

})(this);