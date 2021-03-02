import mkmapi from './mkmapi.js';

let idGame = 1;
let idLanguage = 1;

window.methods = {
    ...window.methods,
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
};