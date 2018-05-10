const edn = window.jsedn;

/**
 * 
 * @param {string} ednstr - String representation of EDN
 */
export const simbaToJson = ednstr => {
  try {
    const result = {};
    const ednjson = edn.toJS(edn.parse(ednstr));
    ednjson.forEach(kv => {
      result[kv[':key']] = kv[':value'];
    });
    return result;
  } catch(err) {
    console.log(err);
    return {};
  }
}

/**
 * 
 * @param {object} json - JSON to be converted to edn string
 */
export const jsonToSimba = json => {
  try {
    let kvs = Object.keys(json).map(key => {
      return {key, value: json[key]};
    });
    return edn.encode(new edn.Vector(kvs.map(kv => new edn.Map([edn.kw(':key'), kv.key, edn.kw(':value'), kv.value]))));
  } catch(err) {
    console.log(err);
    return '';
  }
}