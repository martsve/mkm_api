import mkmapi from './mkmapi.js';
import ParseCsv from './parse-deck/ParseCsv.js';
import matchProduct from './product-matcher.js';
import convertToStock from './convertToStock.js';

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

    let active = (window.location.hash.split('#/')[1] || 'token').split('/')[0];

    let data = {
        loaded: true,
        token: token,
        tokenTestResponse: null,
        tokenTestResult: null,
        active: active,
        tabs: [
            { key: 'token', title: 'Token setup' }, 
            { key: 'stock', title: 'Stock' },
            { key: 'products', title: 'Products' },
            { key: 'import', title: 'Import' },
        ],
        stock: getStored('stock'),
        stockLoading: 'ok',
        products: getStored('products'),
        productLoading: 'ok',
        newArticle: '',
        metaProductLoading: 'ok',
        metaProducts: getStored('metaProducts'),
        importText: '',
        parsedItem: [],
        savedItems: getStored('savedItems', []),
    };

    for (var item of data.savedItems.filter(x => x.status == 'lookup' || x.status == 'waiting' || x.status == 'ok')) {
        item.status = '';
    }

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
                this.tokenTestResult = !response.error;
                this.tokenTestResponse = JSON.stringify(response.error ? response.error : response.data.account, null, 2);
                return this.tokenTestResult;
            },
            setActive: function (tab) {
                this.active = tab;
                window.location.hash = '/' + tab;
            },
            getStock: async function () {
                let result = await this.get('stock');
                console.log(JSON.stringify(result, null, 4));
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
            productSearch: async function(name) {
                this.productLoading = 'loading';
                this.products = await this.search(name);
                console.log(JSON.stringify(this.products));
                this.productLoading = 'ok';
                this.save();
            },
            metaSearch: async function(name) {
                this.metaProductLoading = 'loading';
                this.metaProducts = await this.searchMeta(name);
                console.log(JSON.stringify(this.metaProducts));
                this.metaProductLoading = 'ok';
                this.save();
            },
            search: async function (name) {
                let parameters = {
                    search: name.split('//')[0].trim(),
                    idGame: idGame,
                    idLanguage: idLanguage,
                    maxResults: 100,
                    start: 0
                };
                var result = await this.get('products/find?' + Object.entries(parameters).map(x => x[0] + "=" + encodeURIComponent(x[1])).join('&'));
                return result.data.product.map(x => ({ id: x.idProduct, name: x.enName, exp: x.expansionName, rarity: x.rarity, number: x.number }));
            },
            searchMeta: async function (name) {
                let parameters = {
                    search: name.split('//')[0].trim(),
                    idGame: idGame,
                    idLanguage: idLanguage,
                    maxResults: 100,
                    start: 0,
                    exact: false
                };
                var result = await this.get('metaproducts/find?' + Object.entries(parameters).map(x => x[0] + "=" + encodeURIComponent(x[1])).join('&'));
                return result?.data?.metaproduct || [];
            },
            save: function () {
                localStorage.setItem('stock', JSON.stringify(this.stock));
                localStorage.setItem('products', JSON.stringify(this.products));
                localStorage.setItem('metaProducts', JSON.stringify(this.metaProducts));
                localStorage.setItem('savedItems', JSON.stringify(this.savedItems));
            },
            parseData: function(data) {
                if (!data) {
                    return [];
                }
                let val = ParseCsv(data);
                console.log('parsed', JSON.stringify(val, null, 2));
                return val;
            },
            importNew: function(items) {
                for (var item of items) {
                    this.savedItems.push(item);   
                }
                this.save();
            },
            clearUnimported: function(items) {
                this.savedItems = [];
                this.save();
            },
            clearIds: function() {
                for (var item of this.savedItems) {
                    item.id = undefined;
                }
                this.save();
            },
            lookupMissingItems: function () {
                for (var item of this.savedItems.filter(x => !x.id)) {
                    item.status = 'waiting'
                }

                for (var i = 0; i < 5; i++) {
                    this.lookupItem();
                }
            },
            lookupItem: async function () {
                let item = this.savedItems.filter(x => x.status === 'waiting')[0];
                if (!item) {
                    return;
                }

                item.status = 'lookup';
                let meta = await this.searchMeta(item.name);
                var match = matchProduct(item, meta);
                item.status = match.status;
                item.errors = match.errors;
                item.warnings = match.warnings;
                item.id = match.id;
                if (match.setName) {
                    item.oldSetName = item.setName;
                    item.setName = match.setName;
                    item.altSet = match.altSet;
                }
                if (match.name) {
                    item.oldName = item.name;
                    item.name = match.name;
                    item.altName = match.altName;
                }

                this.save();
                this.lookupItem();
            },
            resetStatus: function (item) {
                item.status = '';
                item.errors = [];
                item.warnings = [];
                this.save();
            },
            importToCardmarket: async function() {
                var items = this.savedItems.filter(x => x.id && x.errors.length == 0 && x.warnings.length == 0);
                if (!items.length) { return; }

                let ii = 0;
                let itemMap = {};
                for (var item of items) {
                    item.importId = (ii++).toString();
                    itemMap[item.importId] = item;
                    items.status = 'lookup';
                }

                var stock = convertToStock(items);
                console.log('stock', JSON.stringify(stock, null, 2));
                var result = await this.post('stock', stock);
                console.log('result', JSON.stringify(result, null, 2));
                var inserted = result?.data?.inserted || [];
                var i = 0;
                for (var item of inserted) {
                    if (item.success) {
                        let iid = item.idArticle.comments.match(/\[(\d+)\]/)[1];
                        itemMap[iid].inserted = true;
                    }
                    else {
                        let iid = item.tried.comments.match(/\[(\d+)\]/)[1];
                        itemMap[iid].status = 'error';
                        itemMap[iid].errors.push({ key: 'stock', value: item.error });
                    }
                    i++;
                }

                this.savedItems = this.savedItems.filter(x => !x.inserted);
                this.save();
            },
            lookupProduct: async function (id) {
                let data = (await this.get('products/' + id))?.data?.product;
                console.log(JSON.stringify(data));
            },
            getPrices: async function() {
                //var result = await this.get('games/1/expansions');
                //var list = result.data.expansion.map(x => ({ id: x.idExpansion, name: x.enName }));
                let expansions = new Map();
                for (let item of this.stock) {
                    expansions.set(item.product.expIcon, 'ok');
                }
                let expIds = Array.from(expansions.keys());
                let res = await this.get('expansions/' + expIds[0] + '/singles');
                console.log(res);
            }
        }
    });

    console.info("[MAIN] Vue app initialized");
};

document.addEventListener('preload-finished', () => {
    console.log('[MAIN] Preload finished. Enter main()');
    main();
});