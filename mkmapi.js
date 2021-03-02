function b64_hmac_sha1(k,d,_p,_z){
    if(!_p){_p='=';}if(!_z){_z=8;}function _f(t,b,c,d){if(t<20){return(b&c)|((~b)&d);}if(t<40){return b^c^d;}if(t<60){return(b&c)|(b&d)|(c&d);}return b^c^d;}function _k(t){return(t<20)?1518500249:(t<40)?1859775393:(t<60)?-1894007588:-899497514;}function _s(x,y){var l=(x&0xFFFF)+(y&0xFFFF),m=(x>>16)+(y>>16)+(l>>16);return(m<<16)|(l&0xFFFF);}function _r(n,c){return(n<<c)|(n>>>(32-c));}function _c(x,l){x[l>>5]|=0x80<<(24-l%32);x[((l+64>>9)<<4)+15]=l;var w=[80],a=1732584193,b=-271733879,c=-1732584194,d=271733878,e=-1009589776;for(var i=0;i<x.length;i+=16){var o=a,p=b,q=c,r=d,s=e;for(var j=0;j<80;j++){if(j<16){w[j]=x[i+j];}else{w[j]=_r(w[j-3]^w[j-8]^w[j-14]^w[j-16],1);}var t=_s(_s(_r(a,5),_f(j,b,c,d)),_s(_s(e,w[j]),_k(j)));e=d;d=c;c=_r(b,30);b=a;a=t;}a=_s(a,o);b=_s(b,p);c=_s(c,q);d=_s(d,r);e=_s(e,s);}return[a,b,c,d,e];}function _b(s){var b=[],m=(1<<_z)-1;for(var i=0;i<s.length*_z;i+=_z){b[i>>5]|=(s.charCodeAt(i/8)&m)<<(32-_z-i%32);}return b;}function _h(k,d){var b=_b(k);if(b.length>16){b=_c(b,k.length*_z);}var p=[16],o=[16];for(var i=0;i<16;i++){p[i]=b[i]^0x36363636;o[i]=b[i]^0x5C5C5C5C;}var h=_c(p.concat(_b(d)),512+d.length*_z);return _c(o.concat(h),512+160);}function _n(b){var t="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",s='';for(var i=0;i<b.length*4;i+=3){var r=(((b[i>>2]>>8*(3-i%4))&0xFF)<<16)|(((b[i+1>>2]>>8*(3-(i+1)%4))&0xFF)<<8)|((b[i+2>>2]>>8*(3-(i+2)%4))&0xFF);for(var j=0;j<4;j++){if(i*8+j*6>b.length*32){s+=_p;}else{s+=t.charAt((r>>6*(3-j))&0x3F);}}}return s;}function _x(k,d){return _n(_h(k,d));}return _x(k,d);
  }
  
const json2xml = (obj) => {
    var xml = '';
    for (var prop in obj) {
        xml += obj[prop] instanceof Array ? '' : "<" + prop + ">";
        if (obj[prop] instanceof Array) {
        for (var array in obj[prop]) {
            xml += "<" + prop + ">";
            xml += json2xml(new Object(obj[prop][array]));
            xml += "</" + prop + ">";
        }
        } else if (typeof obj[prop] == "object") {
        xml += json2xml(new Object(obj[prop]));
        } else {
        xml += obj[prop];
        }
        xml += obj[prop] instanceof Array ? '' : "</" + prop + ">";
    }
    var xml = xml.replace(/<\/?[0-9]{1,}>/g, '');
    return xml
}

const createXml = (obj) => {
    return '<?xml version="1.0" encoding="UTF-8" ?>' + json2xml(obj);
}

function sig(str, secret) {
    let toUtf8 = (text) => {
        // might be redundant. we just ensure the text is utf8
        return JSON.parse(JSON.stringify(text));
    };
    var key = toUtf8(secret);
    var prehash = toUtf8(str);
    var hash = b64_hmac_sha1(key, prehash);
    return hash;
}

const fixedencodeURIComponent = (str) => {
    return encodeURIComponent(str).replace(/'/g,"%27");
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
            const key = fixedencodeURIComponent(item[0]);
            const val = fixedencodeURIComponent(item[1]);
            encodedParams.push(key + "=" + val);
        }
    }

    encodedParams.sort((a,b) => a > b ? 1 : -1);

    var paramStrings = encodedParams.join("&");
    var paramString = fixedencodeURIComponent(paramStrings);

    var baseString = method + "&" + fixedencodeURIComponent(uriParts[0]) + "&" + paramString;

    var signatureKey = fixedencodeURIComponent(appSecret) + "&" + fixedencodeURIComponent(accessSecret);

    var oAuthSignature = sig(baseString, signatureKey);

    headers["oauth_signature"] = oAuthSignature;

    var headerParamStrings = Object.entries(headers).map(x => x[0] + "=\"" + fixedencodeURIComponent(x[1]) + "\"");
    var authHeader = "OAuth " + headerParamStrings.join(", ");

    return authHeader;
};

class MkmApi {
    constructor(baseUrl, appToken, appSecret, accessToken, accessSecret) {
        this.baseUrl = baseUrl;
        this.appToken = appToken;
        this.appSecret = appSecret;
        this.accessToken = accessToken;
        this.accessSecret = accessSecret;
    }

    async send(resourceString, methodString, dataObject) {
        let resource = resourceString;
        let method = methodString.toUpperCase();
        let body = dataObject ? createXml(dataObject) : undefined;

        let url = this.baseUrl + 'output.json/' + resource;
        let authHeader = makeAuthHeader(url, method, this.appToken, this.appSecret, this.accessToken, this.accessSecret);

        console.log('[MKMAPI] Request ' + method + ' ' + url);
        const response = await fetch(url, {
            method: method,
            // mode: 'no-cors',
            cache: 'no-cache',
            credentials: 'omit',
            headers: {
                'Content-Type': 'application/xml',
                'Authorization': authHeader,
                'Accept': 'application/json',
            },
            redirect: 'follow',
            referrerPolicy: 'no-referrer',
            body: body
        });
        
        if (response.ok) {
            if (response.status === 204) {
                return { data: null };
            }
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
    }
};

export default MkmApi;