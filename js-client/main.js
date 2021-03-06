window.state = {};
window.methods = {};

window.getStored = (key, defaultObject) => {
    try {
        return JSON.parse(localStorage.getItem(key)) || defaultObject;
    }
    catch {
        return defaultObject;
    }
}

let main = () => {
    let data = {
        ...window.state,
        loaded: true,
    };

    console.info("[MAIN] Starting vue..");

    var app = new Vue({
        el: '#app',
        data,
        methods: {
            ...window.methods,
            save: function () {
                localStorage.setItem('stock', JSON.stringify(this.stock));
                localStorage.setItem('products', JSON.stringify(this.products));
                localStorage.setItem('metaProducts', JSON.stringify(this.metaProducts));
                localStorage.setItem('savedItems', JSON.stringify(this.savedItems));
            },
            tooltip: function (url, show) {
                if (show) {
                   var obj = document.createElement("div");
                    obj.className = "tooltip"; 
                    obj.style.top = (event.clientY + 5) + 'px';
                    obj.style.left = (event.clientX + 30) + 'px';
                    obj.innerHTML = "<img src='https:/" + url + "' />";
                    document.body.appendChild(obj);
                }
                else {
                    document.querySelector(".tooltip").remove();
                }
            },
            
        }
    });

    console.info("[MAIN] Vue app initialized");
};

document.addEventListener('preload-finished', () => {
    console.log('[MAIN] Preload finished. Enter main()');
    main();
});