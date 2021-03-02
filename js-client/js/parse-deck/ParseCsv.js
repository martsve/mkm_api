import CSVToArray from './CSVToArray.js'
import CreateUuid from './CreateUuid.js';

const toKey = (val) => {
  return val?.toLowerCase().replace(/[^a-z]/ig, '');
}

const conditions = {
  "nearmint": "nm",
  "mint": "MT",
  "excellent": "ex",
  "good": "gd",
  "lightplayed": "lp",
  "played": "pl",
  "poor": "po",
};
const mapCondition = (val) => { 
  if (!val) return val;
  return (conditions[toKey(val)] || val).toUpperCase();
}

const langs = {
  "english": "en",
};
const mapLang = (val) => { 
  if (!val) return val;
  return (langs[toKey(val)] || val).toUpperCase();
}

const sets = {
  "Commander 2011": "Commander",
  "Core Set 2020": "Core 2020",
  "Rivals of Ixalan Promos": "Rivals of Ixalan: Promos",
  "Dominaria Promos": "Dominaria: Promos",
};
const mapSet = (val) => { 
  if (!val) return val;
  return (sets[val] || val);
}

const ParseCsv = (text) => {
  var firstLine = text.trim().split('\n')[0];
  var delim = firstLine.indexOf('\t') > -1 ? '\t' : undefined;
  if (delim === undefined) delim = firstLine.indexOf(';') > -1 ? ':' : undefined;
  if (delim === undefined) delim = firstLine.indexOf(',') > -1 ? ',' : undefined;

  var cards = CSVToArray(text.trim(), delim);
  
  var header = delim ? cards[0] : ['Name'];
  if (delim) {
    cards.shift();
  }

  var headerIndex = {};
  header.forEach((val) => {
    headerIndex[toKey(val)] = header.indexOf(val);
  });
  
  function lineToCard(item) {
    function get(inputKey, invoke) {
      let key = toKey(inputKey);
      var val = headerIndex[key] !== undefined && headerIndex[key] > -1 ? item[headerIndex[key]] : undefined;
      val = val?.trim();
      if (invoke && val !== undefined) val = invoke(val);
      return val;
    }

    var card = {
      errors: [],
      warnings: [],
      status: 'parsed',
      id: get("Id"),
      name: get("Name") || get("Card Name"),
      count: get("QuantityX", x => parseInt(x.replace('x', ''))) || get("Count", x => parseInt(x)) || 1,
      setCode: get("Edition code"),
      setName: get("Set Name", x => mapSet(x)),
      condition: get("Condition", x => mapCondition(x)) || "NM",
      number: get("Collector's number"),
      foil: get("Foil", x => x === "Foil" || x === "true") || false,
      lang: get("Language", x => mapLang(x)) || "EN",
      price: get("Price (total)", x => parseFloat(x)),
      currency: get("Currency"),
      multiverseId: get("MultiverseID"),
      jsonId: get("JSON ID"),
      scryfallId: get("Scryfall ID"),
      proxy: get("Tag", x => x.indexOf("Proxy") > -1),
    };

    card.uuid = CreateUuid();

    if (get("PriceUSD")) {
      card.price = card.price || get("Price USD", x => parseFloat(x));
      card.currency = "USD";
    }

    card.price = card.price || get("Price", x => parseFloat(x.split(' ')[1]));
    card.currency = card.currency || get("Price", x => x.split(' ')[0]);
    card.edition = card.edition || get("Edition");

    return card;
  }

  return cards.map(x => lineToCard(x))
};  

export default ParseCsv;