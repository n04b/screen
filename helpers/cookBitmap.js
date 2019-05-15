const pipe = require("function-pipe");
const { flattenArray, reorderArray } = require("./functions");

module.exports = (
  bitmap,
  segmentSize = 8,
  bytePerPixel = 3,
  screenHeight,
  screenWidth,
  segmentOrder
) => {
  const segmentsHorizontal = Math.ceil(screenHeight / segmentSize);
  const segmentsVertical = Math.ceil(screenWidth / segmentSize);

  const segments = [...Array(segmentsHorizontal * segmentsVertical)].map(
    () => []
  );

  const spaceBtwnLines = segmentSize * (segmentsHorizontal - 1);

  for (let segment = 0; segment < segments.length; segment++) {
    const acc = [];

    const initialOffset =
      Math.floor(segment / segmentsHorizontal) *
        segmentSize *
        segmentSize *
        segmentsHorizontal +
      (segment % segmentsHorizontal) * segmentSize;

    for (let j = 0; j < segmentSize; j++) {
      const line = [];
      const cursor =
        (initialOffset + segmentSize * j + spaceBtwnLines * j) * bytePerPixel;
      const chunk = bitmap.slice(cursor, cursor + segmentSize * bytePerPixel);

      for (let k = 0; k < chunk.length; k = k + bytePerPixel) {
        if (chunk[k] || chunk[k + 1] || chunk[k + 2]) {
          line.push(1);
        } else {
          line.push(0);
        }
      }

      acc.push(line);
    }

    segments[segment].push(acc);
  }

  /*
  let resultBitmap = segments;
  resultBitmap = reorderArray(resultBitmap, segmentOrder);
  resultBitmap = flattenArray(resultBitmap);
  resultBitmap = resultBitmap.join("");
  */

  const segmentsTransformsPipe = pipe(
    item => reorderArray(item, segmentOrder),
    flattenArray,
    item => item.join("")
  );

  const resultBitmap = segmentsTransformsPipe(segments);

  return resultBitmap;
};
