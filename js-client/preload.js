window.loadedScripts = 0;
window.totalScripts = 0;
window.finishedLoading = false;
window.checkFinished = (inc) => {
    window.loadedScripts = window.loadedScripts + inc;
    if (window.loadedScripts === window.totalScripts && window.finishedLoading) {
        console.log('[PRELOAD] Scripts finished loading.');
        document.dispatchEvent(new Event('preload-finished'));
    }
    else {
        console.log('[PRELOAD] Waiting for all scripts to load (' + window.loadedScripts + '/' + window.totalScripts + ')');
    }
};

let duplicateTag = (domElem, type) => {
    var script = document.createElement(type);
    for (var attr of domElem.attributes) {
        script.setAttribute(attr.name, attr.value);
    }

    script.innerHTML = domElem.innerHTML;
    if (type == "SCRIPT") {
        window.totalScripts++;
        script.innerHTML += "\window.checkFinished(1);";
    }

    return script;
}

let preload = async (elem) => {
    let url = elem.getAttribute('preload');
    let cd = url.split('/').slice(0,-1).join('/')+'/';
    let content = await fetch(url);
    let html = await content.text();

    html = html.replace(/\@\{CD\}/ig, cd);

    let div = document.createElement("div");
    div.innerHTML = html;
    let domObjects = div.querySelectorAll('script, link, style');
    for (var obj of domObjects) {
        obj.parentNode.removeChild(obj);
        document.body.appendChild(duplicateTag(obj, obj.tagName));
    }

    elem.removeAttribute('preload');
    elem.innerHTML = div.innerHTML;
};

let preloadDefaults = async () => {
    let elements = document.querySelectorAll('[preload]');
    for (var elem of elements) {
        await preload(elem);
    }

    elements = document.querySelectorAll('[preload]');
    if (elements.length) {
        console.log('[PRELOAD] Preload loaded dependencies. Running again.');
        preloadDefaults();
    }
    else {
        console.log('[PRELOAD] Preload finished.');
        window.finishedLoading = true;
        window.checkFinished(0);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('[PRELOAD] Started');
    preloadDefaults();
});

export default preload;