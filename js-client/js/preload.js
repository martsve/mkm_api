let preload = async (elem) => {
    let url = elem.getAttribute('preload');
    let content = await fetch(url);
    let html = await content.text();
    elem.removeAttribute('preload');
    elem.innerHTML = html;
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
        document.dispatchEvent(new Event('preload-finished'));
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('[PRELOAD] Started');
    preloadDefaults();
});

export default preload;