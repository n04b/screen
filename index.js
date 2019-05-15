const userConfig = require("./config.json");
const mqtt = require("mqtt");
const express = require("express");
const app = express();
const bodyParser = require("body-parser");

const Screen = require("./screen");
const cookBitmap = require("./helpers/cookBitmap");

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const defaultConfig = {
  appDebug: false,
  appPort: 1337,
  screenName: "screen",
  screenWidth: 800,
  screenHeight: 600,
  postTimeout: 1000, // in ms
  mqttEnabled: true,
  mqttHost: "localhost",
  mqttPort: 1883,
  mqttLogin: "",
  mqttPass: "",
  mqttRootTopic: "/screen"
};

const config = { ...defaultConfig, ...userConfig };

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
        `${config.mqttRootTopic}/setDot`,
        JSON.stringify(setDotResult)
      );
      mqttClient.publish(`${config.mqttRootTopic}/setCanvasBin`, screen.bitmap);

      mqttClient.publish(
        `${config.mqttRootTopic}/setCanvasProcessed`,
        cookBitmap(
          screen.bitmap,
          8,
          3,
          config.screenWidth,
          config.screenHeight,
          [2, 3, 0, 1]
        )
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
  [ ] set screen config over MQTT
 */
