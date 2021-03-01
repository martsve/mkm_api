import mkmapi from './mkmapi.js';

let main = () => {
    let tokenStorageKey = "token";
    let baseUrl = "https://api.cardmarket.com/ws";
    let apiUrl = "v2.0/";

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
        token: token,
    };

    var app = new Vue({
        el: '#app',
        data,
        methods: {
            saveToken: function () {
                localStorage.setItem(tokenStorageKey, JSON.stringify(this.token));
            },
            resetToken: function () {
                localStorage.removeItem(tokenStorageKey);
                window.location.reload();
            },
            testToken: async function () {
                const api = mkmapi(this.token.Url, this.token.AppToken, this.token.AppSecret, this.token.AccessToken, this.token.AccessSecret);
                var response = await api.send({
                    resource: 'account',
                    method: 'get',
                    data: undefined
                });
                console.log('got ', response);
            },
        }
    });

    console.info("[MAIN] Vue app initialized");
};

export default main;