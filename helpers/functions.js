exports.flattenArray = arr => {
  const result = [];
  let stack = arr;
  let first;

  while (stack.length > 0) {
    first = stack[0];
    if (Array.isArray(first)) {
      Array.prototype.splice.apply(stack, [0, 1].concat(first));
    } else {
      result.push(first);
      stack.splice(0, 1);
    }
  }
  return result;
};

exports.reorderArray = (originalArray, order) => {
  return order ? order.map(item => originalArray[item]) : originalArray;
};
