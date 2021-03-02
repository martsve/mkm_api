import json2xml from './json2xml.js';

const toLangId = (txt) => {
    return {
        EN: 1
    }[txt] || 1;
}

export const convertToStock = (items) => {
    let obj = {
        request: {
            article: items.map(x => ({
                idProduct: x.id,
                count: x.count || 1,
                idLanguage: toLangId(x.lang),
                comments: (x.comment || '') + ' ['+x.importId+']',
                price: 1000000,
                condition: x.condition || "NM",
                isFoil: !!x.foil
            }))
        }
    };

    const xml = '<?xml version="1.0" encoding="UTF-8" ?>' + json2xml(obj);

    return xml;
}


export default convertToStock;