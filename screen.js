const bitmapManipulation = require("bitmap-manipulation");

module.exports = class Screen {
  constructor(config) {
    this._config = config;
    this._log = [];
    this._canvas = new bitmapManipulation.canvas.RGB(
      this._config.screenWidth,
      this._config.screenHeight,
      1
    );
    this._bitmap = new bitmapManipulation.Bitmap(this._canvas);
  }

  get log() {
    return this._log;
  }

  get bitmap() {
    return this._bitmap.data();
  }

  getPixelColor(x, y) {
    return this._bitmap.getPixel(x, y);
  }

  resetCanvas() {
    this._bitmap.clear([0, 0, 0]);
  }

  writeToLog(ip) {
    this._log = [...this._log, { ip, date: new Date() }];
  }

  parseColor(color) {
    return color.match(/.{1,2}/g).map(item => parseInt(item, 16));
  }

  setDots(dots) {
    return dots.map(({ x, y, color, ip }) =>
      this.setDot(x, y, color, ip, true)
    );
  }

  setDot(x, y, color, ip, noTimeout = false) {
    if (
      this.validateDot(x, y, color) &&
      (this.validateTimeout(ip) || noTimeout)
    ) {
      this._bitmap.setPixel(x, y, this.parseColor(color));
      this.writeToLog(ip);

      if (this._config.appDebug) {
        console.log("> bitmap:", this._bitmap.data());
        console.log("> getPixel:", this.getPixelColor(x, y));
      }

      return { x, y, color };
    } else {
      return null;
    }
  }

  validateDot(x, y, color) {
    if (
      !Number.isInteger(x) ||
      !Number.isInteger(y) ||
      x < 0 ||
      x >= this._config.screenWidth || // max x value
      y < 0 ||
      y >= this._config.screenHeight || // max y value
      !/^([A-Fa-f0-9]{6})$/.test(color)
    ) {
      return false;
    }

    return true;
  }

  validateTimeout(ip) {
    if (this._config.postTimeout === 0) {
      return true;
    }

    const userEvents = this.log.filter(item => item.ip === ip);
    const curretDate = new Date();

    if (userEvents.length === 0) {
      return true;
    }

    userEvents.sort((a, b) => {
      if (a.date < b.date) {
        return 1;
      }
      if (a.date > b.date) {
        return -1;
      }
      return 0;
    });

    const delta = curretDate.getTime() - userEvents[0].date.getTime();

    if (delta < this._config.postTimeout) {
      return false;
    }

    return true;
  }
};
