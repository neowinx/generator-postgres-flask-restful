const insertBefore = function(txt, search, insert) {
  let position = txt.indexOf(search);
  return [txt.slice(0, position), insert, txt.slice(position)].join('');
};

const insertAfter = function(txt, search, insert) {
  let position = txt.indexOf(search) + search.length;
  return [txt.slice(0, position), insert, txt.slice(position)].join('');
};

module.exports.insertBefore = insertBefore;
module.exports.insertAfter = insertAfter;
