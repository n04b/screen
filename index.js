const mqtt = require("mqtt");
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const bitmapManipulation = require("bitmap-manipulation");

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const config = {
  appDebug: true,
  appPort: 1337,
  screenName: "ScreenOne",
  screenWidth: 80,
  screenHeight: 60,
  postTimeout: 10, // in ms?
  mqttEnabled: true,
  mqttHost: "m24.cloudmqtt.com",
  mqttPort: 15933, // 1883
  mqttLogin: "ejzxcata",
  mqttPass: "QKJzdGmqYXsv",
  mqttRootTopic: "/ScreenOne"
};

process.argv.forEach((item, index, array) => {
  if (/^[^=]*=[^=]*$/.test(item)) {
    const [property, value] = item.split("=");

    switch (property) {
      case "width":
        config.screenWidth = parseInt(value);
        break;

      case "height":
        config.screenHeight = parseInt(value);
        break;

      default:
        config[property] =
          typeof config[property] === "number" ? parseInt(value) : value;
        break;
    }
  }
});

if (config.appDebug) {
  console.log("> config:", config);
}

class Screen {
  constructor(config) {
    this.config = config;
    this._log = [];
    this._canvas = new bitmapManipulation.canvas.RGB(
      config.screenWidth,
      config.screenHeight,
      1
    );
    this._bitmap = new bitmapManipulation.Bitmap(this._canvas);
  }

  get log(){
    return this._log;
  }

  get bitmap() {
    return this._bitmap.data();
  }

  getPixelColor(x, y) {
    //???
    return this._bitmap.getPixel(x, y);
  }

  resetCanvas() {
    //...
  }

  writeToLog(ip) {
    this._log = [...this._log, { ip, date: new Date() }];
  }

  parseColor(color) {
    return color.match(/.{1,2}/g).map(item => parseInt(item, 16));
  }

  setDots(dots) {
    //???
  }

  setDot(x, y, color, ip) {
    if (this.validateDot(x, y, color) && this.validateTimeout(ip)) {
      this._bitmap.setPixel(x, y, this.parseColor(color));
      this.writeToLog(ip);

      if (config.appDebug) {
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
      x >= this.config.screenWidth || // max x value
      y < 0 ||
      y >= this.config.screenHeight || // max x value
      !/^([A-Fa-f0-9]{6})$/.test(color)
    ) {
      return false;
    }

    return true;
  }

  validateTimeout(ip) {
    if (this.config.postTimeout === 0) {
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

    if (delta < this.config.postTimeout) {
      return false;
    }

    return true;
  }
}

const screen = new Screen(config);

let mqttClient;

if (config.mqttEnabled) {
  mqttClient = mqtt.connect({
    host: config.mqttHost,
    port: config.mqttPort,
    username: config.mqttLogin,
    password: config.mqttPass
  });

  mqttClient.on("connect", () => {
    console.log("> mqttClient connected");
    mqttClient.publish(`${config.mqttRootTopic}/message`, "online");
    mqttClient.publish(
      `${config.mqttRootTopic}/config`,
      JSON.stringify(config)
    );
  });

  mqttClient.on("error", () => {
    console.log("> mqttClient connecting error");
  });
}

app.get("/", (req, res) => {
  res.send({
    config,
    canvas: screen.bitmap.toString("base64"),
    log: screen.log
  });
});

app.get("/bin/dots", (req, res) => {
  res.send(screen.bitmap);
});

app.get("/log", (req, res) => {
  res.send(screen.log);
});

app.post("/dots", (req, res) => {
  const { x, y, color } = req.body;
  const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;

  const setDotResult = screen.setDot(x, y, color, ip);

  if (setDotResult) {
    res.send({ status: "ok", data: setDotResult });

    // update dot on screen, push to mqtt and/or websocket
    if (config.mqttEnabled) {
      mqttClient.publish(
        `${config.mqttRootTopic}/setDot`,
        JSON.stringify(setDotResult)
      );
      mqttClient.publish(
        `${config.mqttRootTopic}/setBitmap`,
        screen.bitmap
      );
    }
  } else {
    res.status(400).send({ status: "error" });
  }
});

app.listen(config.appPort, function() {
  console.log(`App listening on port ${config.appPort}!`);
});

/*
  TODO:
  [v] post timeout
  [v] mqtt: https://www.npmjs.com/package/mqtt
  [ ] websocket
 */
