const fs = require("fs");
const mqtt = require("mqtt");
const express = require("express");
const app = express();
const bodyParser = require("body-parser");
const { StringDecoder } = require("string_decoder");

const Screen = require("./screen");
const publishProcessedCanvas = require("./helpers/publishProcessedCanvas");

const defaultConfig = require("./defaultConfig");
const userConfig = fs.existsSync("config.json")
  ? JSON.parse(fs.readFileSync("config.json", "utf8"))
  : {};

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

let mqttClient;
const utf8Decoder = new StringDecoder("utf8");

const config = { ...defaultConfig, ...userConfig };

process.argv.forEach(item => {
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

/*
const argsConfig = process.argv.reduce((acc, item) => {
  if (/^[^=]*=[^=]*$/.test(item)) {
    const [property, value] = item.split("=");

    switch (property) {
      case "width":
        acc.screenWidth = parseInt(value);
        break;

      case "height":
        acc.screenHeight = parseInt(value);
        break;

      default:
        acc[property] =
          typeof defaultConfig[property] === "number" ? parseInt(value) : value;
        break;
    }
  }
  return acc;
}, {});

const config = { ...defaultConfig, ...userConfig, ...argsConfig };
*/

const apiPrefix = config.isMultiple ? `/${config.screenName}` : "";
const mqttRootTopic = `/${config.screenName}`;

if (config.appDebug) {
  console.log("> config:", config);
}

const screen = new Screen(config);

if (config.mqttEnabled) {
  mqttClient = mqtt.connect({
    host: config.mqttHost,
    port: config.mqttPort,
    username: config.mqttLogin,
    password: config.mqttPass
  });

  mqttClient.on("connect", () => {
    console.log("> mqttClient connected");
    mqttClient.publish(`${mqttRootTopic}/status`, "online");
    mqttClient.publish(`${mqttRootTopic}/config`, JSON.stringify(config));
  });

  mqttClient.on("error", () => {
    console.log("> mqttClient connecting error");
  });

  mqttClient.subscribe(`${mqttRootTopic}/#`);

  mqttClient.on("message", (topic, payload) => {
    const payloadText = utf8Decoder.write(payload);
    if (config.appDebug) {
      console.log(`> ${topic} says: `, payloadText);
    }

    switch (topic.split("/")[2]) {
      case "setScreenConfig":
        //...
        break;

      case "setDot":
        //...
        break;

      case "setCanvasBin":
        //...
        break;

      case "saveState":
        screen.saveState();
        break;

      case "loadState":
        screen.loadState();
        mqttClient.publish(`${mqttRootTopic}/canvasBin`, screen.bitmap);
        publishProcessedCanvas(config, mqttClient, screen);
        break;

      case "clearCanvas":
        screen.resetCanvas();
        mqttClient.publish(`${mqttRootTopic}/canvasBin`, screen.bitmap);
        publishProcessedCanvas(config, mqttClient, screen);
        break;
    }
  });
}

app.get(`${apiPrefix}/`, (req, res) => {
  res.send({
    config,
    canvas: screen.bitmap.toString("base64"),
    log: screen.log
  });
});

app.get(`${apiPrefix}/bin/dots`, (req, res) => {
  res.send(screen.bitmap);
});

app.get(`${apiPrefix}/log`, (req, res) => {
  res.send(screen.log);
});

app.post(`${apiPrefix}/dots`, (req, res) => {
  const { x, y, color } = req.body;
  const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress;

  let setDotResult;
  if (Array.isArray(req.body)) {
    setDotResult = screen.setDots(req.body);
  } else {
    setDotResult = screen.setDot(x, y, color, ip);
  }

  if (setDotResult) {
    res.send({ status: "ok", data: setDotResult });

    // update dot on screen, push to mqtt and/or websocket
    if (config.mqttEnabled) {
      mqttClient.publish(
        `${mqttRootTopic}/lastDot`,
        JSON.stringify(setDotResult)
      );
      mqttClient.publish(`${mqttRootTopic}/canvasBin`, screen.bitmap);
      publishProcessedCanvas(config, mqttClient, screen);
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
  [ ] set screen config over MQTT
  [ ] multiple screens
  [v] save and load state from file
  
  QUESTIONS:
  - как правильно организовать конфиг? разделить его или свалить
    всё в кучу?
  - вроде как передавать целый конфиг объект в функцию/экземпляр класса
    не круто
 */
