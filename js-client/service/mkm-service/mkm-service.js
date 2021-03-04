import MkmApi from './mkmapi.js';

let idGame = 1;
let idLanguage = 1;

window.methods = {
    ...window.methods,
    put: function (resource, data, queryParams = undefined) {
        return this.send('put', resource, queryParams, data);
    },
    post: function (resource, data, queryParams = undefined) {
        return this.send('post', resource, queryParams, data);
    },
    get: function (resource, queryParams = undefined, data = undefined) {
        return this.send('get', resource, queryParams, data);
    },
    delete: function (resource, queryParams = undefined, data = undefined) {
        return this.send('delete', resource, queryParams, data);
    },
    send: async function (method, resource, queryParams, data) {
        const api = new MkmApi(this.token.Url, this.token.AppToken, this.token.AppSecret, this.token.AccessToken, this.token.AccessSecret);
        return await api.send(resource, method, queryParams, data);
    },
    getProducts: async function () {
        let result = await this.get('productlist');
        this.productLoading = 'loading';
        if (result.data) {
            console.log(result.data);
            /// https://github.com/imaya/zlib.js/blob/develop/README.en.md
            const bytes = result.data.productsfile;
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
            search: name.split('//')[0].trim(),
            idGame: idGame,
            idLanguage: idLanguage,
            maxResults: 100,
            start: 0
        };
        var result = await this.get('products/find', parameters);
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
        var result = await this.get('metaproducts/find', parameters);
        return result?.data?.metaproduct || [];
    },
};