import mkmapi from './mkmapi.js';

let main = () => {
    let tokenStorageKey = "token";
    let baseUrl = "https://api.cardmarket.com/ws";
    let apiUrl = "v2.0/";
    let idGame = 1;
    let idLanguage = 1;

    let getStored = (key, defaultObject) => {
        try {
            return JSON.parse(localStorage.getItem(key)) || defaultObject;

        }
        catch {
            return defaultObject;
        }
    }

    let token = getStored(tokenStorageKey, {
        AppToken: '',
        AppSecret: '',
        AccessToken: '',
        AccessSecret: '',
        Url: baseUrl + '/' + apiUrl,
    });

    let data = {
        loaded: true,
        token: token,
        tokenTestResponse: null,
        tokenTestResult: null,
        active: 'token',
        tabs: [
            { key: 'token', title: 'Token setup' }, 
            { key: 'stock', title: 'Stock' },
            { key: 'products', title: 'Products' },
        ],
        stock: getStored('stock'),
        stockLoading: 'ok',
        products: getStored('products'),
        productLoading: 'ok',
        newArticle: '',
        metaProducts: getStored('metaProducts'),
    };

    const Root = { template: '<div>root</div>' }
    const Foo = { template: '<div>foo</div>' }
    const Bar = { template: '<div>bar</div>' }
    const router = new VueRouter([
        { path: '/', name: 'root', component: Root },
        { path: '/foo', name: 'foo', component: Foo },
        { path: '/bar', name: 'foo', component: Bar }
    ])

    console.info("[MAIN] Starting vue..");

    var app = new Vue({
        router,
        el: '#app',
        data,
        methods: {
            put: function (resource, data) {
                return this.send('put', resource, data);
            },
            post: function (resource, data) {
                return this.send('post', resource, data);
            },
            get: function (resource, data = undefined) {
                return this.send('get', resource, data);
            },
            delete: function (resource, data = undefined) {
                return this.send('delete', resource, data);
            },
            send: async function (method, resource, data) {
                const api = mkmapi(this.token.Url, this.token.AppToken, this.token.AppSecret, this.token.AccessToken, this.token.AccessSecret);
                return await api.send({
                    resource: resource,
                    method: method,
                    data: data
                });
            },
            saveToken: function () {
                localStorage.setItem(tokenStorageKey, JSON.stringify(this.token));
            },
            resetToken: function () {
                localStorage.removeItem(tokenStorageKey);
                window.location.reload();
            },
            testToken: async function () {
                var response = await this.get('account');
                this.tokenTestResponse = JSON.stringify(response, null, 2);
                this.tokenTestResult = !response.error;
                return this.tokenTestResult;
            },
            setActive: function (tab) {
                this.active = tab;
            },
            navigateIfValid: function () {
                this.active = 'products';
                return;

                if (this.token.Url && this.token.AppToken && this.token.AppSecret && this.token.AccessToken && this.token.AccessSecret) {
                    var valid = this.testToken();
                    if (valid) {
                        this.active = 'stock';
                    }
                }
            },
            getStock: async function () {
                let result = await this.get('stock');
                this.stockLoading = 'loading';
                if (result.data) {
                    this.stock = result.data.article;
                    this.stockLoading = 'ok';
                    this.save();
                }
                else {
                    this.stockLoading = 'error';
                }
            },
            getProducts: async function () {
                let result = await this.get('productlist');
                this.productLoading = 'loading';
                if (result.data) {
                    console.log(result.data);
                    /// https://github.com/imaya/zlib.js/blob/develop/README.en.md
                    const bytes = CryptoJS.enc.Base64.parse(result.data.productsfile);
                    var gunzip = new Zlib.Gunzip(bytes);
                    var plain = gunzip.decompress();
                    console.log('plain', plain);
                    this.products = 'see log';
                    this.productLoading = 'ok';
                }
                else {
                    this.productLoading = 'error';
                }                
            },
            search: async function (name) {
                let parameters = {
                    search: name,
                    idGame: idGame,
                    idLanguage: idLanguage,
                    maxResults: 100,
                    start: 0
                };
                var result = await this.get('products/find?' + Object.entries(parameters).map(x => x[0] + "=" + encodeURIComponent(x[1])).join('&'));
                console.log(result.data.product);
                this.productLoading = 'ok';
                this.products = result.data.product.map(x => ({ id: x.idProduct, name: x.enName, exp: x.expansionName, rarity: x.rarity, number: x.number }));
                this.save();
            },
            searchMeta: async function (name) {
                let parameters = {
                    search: name,
                    idGame: idGame,
                    idLanguage: idLanguage,
                    maxResults: 100,
                    start: 0,
                    exact: false
                };
                var result = await this.get('metaproducts/find?' + Object.entries(parameters).map(x => x[0] + "=" + encodeURIComponent(x[1])).join('&'));
                this.metaProducts = result.data.metaproduct;
                this.save();
            },
            save: function () {
                localStorage.setItem('stock', JSON.stringify(this.stock));
                localStorage.setItem('products', JSON.stringify(this.products));
                localStorage.setItem('metaProducts', JSON.stringify(this.metaProducts));
            }
        }
    });

    app.navigateIfValid();

    console.info("[MAIN] Vue app initialized");
};

document.addEventListener('preload-finished', () => {
    console.log('[MAIN] Preload finished. Enter main()');
    main();
});