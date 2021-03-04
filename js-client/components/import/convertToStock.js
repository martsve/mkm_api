const toLangId = (txt) => {
    return {
        EN: 1
    }[txt] || 1;
}

export const convertToStock = (items) => {
    const date = new Date().toISOString().replace(/[^0-9]/ig,'').slice(0,8);
    return {
        request: {
            article: items.map(x => ({
                idProduct: x.id,
                count: x.count || 1,
                idLanguage: toLangId(x.lang),
                comments: (x.comment || '') + ' ['+x.importId+'] ' + date,
                price: 1000000,
                condition: x.condition || "NM",
                isFoil: !!x.foil
            }))
        }
    };
}


export default convertToStock;