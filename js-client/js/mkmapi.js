function sig(str, secret) {
    let toUtf8 = (text) => {
        // might be redundant. we just ensure the text is utf8
        return CryptoJS.enc.Utf8.parse(JSON.parse(JSON.stringify(text)));
    };
    var key = toUtf8(secret);
    var prehash = toUtf8(str);
    var hash = CryptoJS.HmacSHA1(prehash, key);
    return CryptoJS.enc.Base64.stringify(hash);
}

let makeAuthHeader = (url, method, appToken, appSecret, accessToken, accessSecret) => {
    let utc = () => {
        return Math.floor((new Date().getTime())/1000);
    }

    let nonce = new Date().getTime().toString();
    let uriParts = url.split('?');
    let headers = {
        "oauth_consumer_key": appToken,
        "oauth_token": accessToken,
        "oauth_nonce": nonce,
        "oauth_timestamp": utc().toString(),
        "oauth_signature_method": "HMAC-SHA1",
        "oauth_version": "1.0",
        "realm": uriParts[0]
    };

    var requestParameters = uriParts.length > 1 ? uriParts[1].split('&') : [];
    for (var parameter of requestParameters)
    {
        var parts = parameter.split('=');
        var key = parts[0];
        var value = parts.length > 1 ? parts[1] : "";
        headers[key] = decodeURIComponent(value);
    }

    var encodedParams = [];
    for (var item of Object.entries(headers))
    {
        if (item[0] != "realm")
        {
            const key = encodeURIComponent(item[0]);
            const val = escape(item[1]);
            encodedParams.push(key + "=" + val);
        }
    }

    encodedParams.sort((a,b) => a > b ? 1 : -1);

    var paramStrings = encodedParams.join("&");
    var paramString = encodeURIComponent(paramStrings);

    var baseString = method + "&" + encodeURIComponent(uriParts[0]) + "&" + paramString;

    var signatureKey = encodeURIComponent(appSecret) + "&" + encodeURIComponent(accessSecret);

    var oAuthSignature = sig(baseString, signatureKey);

    headers["oauth_signature"] = oAuthSignature;

    var headerParamStrings = Object.entries(headers).map(x => x[0] + "=\"" + x[1] + "\"");
    var authHeader = "OAuth " + headerParamStrings.join(", ");

    return authHeader;
};

let mkmapi = (baseUrl, appToken, appSecret, accessToken, accessSecret) => {
    return ({
        send: async (options) => {
            let resource = options.resource;
            let method = options.method.toUpperCase();
            let data = options.data;

            let url = baseUrl + 'output.json/' + resource;
            let authHeader = makeAuthHeader(url, method, appToken, appSecret, accessToken, accessSecret);

            console.log('[MKMAPI] Request ' + method + ' ' + url);
            const response = await fetch(url, {
                method: method,
                // mode: 'no-cors',
                cache: 'no-cache',
                credentials: 'omit',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': authHeader,
                    'Accept': 'application/json',
                },
                redirect: 'follow',
                referrerPolicy: 'no-referrer',
                body: data ? JSON.stringify(data) : undefined
            });
            
            if (response.ok) {
                return {
                    data: await response.json()
                };
            } else {
                console.error("[MKMAPI] Error: " + response.status);
                return {
                    error: response.status || "-1",
                    header: response.header || "unexpected error",
                };
            }
        },
    });
};

export default mkmapi;