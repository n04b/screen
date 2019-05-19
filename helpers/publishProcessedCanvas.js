const cookBitmap = require("./cookBitmap");

const targetScreenDefaultSettings = {
  bytesPerPixel: 3,
  segmentSize: 8,
  segmentsOrder: [2, 3, 0, 1]
};

module.exports = (
  config,
  mqttClient,
  screen,
  targetScreenSettings = targetScreenDefaultSettings
) => {
  const { screenWidth, screenHeight, mqttRootTopic, screenMqttTopic } = config;
  const { bytesPerPixel, segmentSize, segmentsOrder } = targetScreenSettings;

  const cookedBitmap = cookBitmap(
    screen.bitmap,
    segmentSize,
    bytesPerPixel,
    screenWidth,
    screenHeight,
    segmentsOrder
  );

  mqttClient.publish(`${mqttRootTopic}/canvasProcessed`, cookedBitmap);

  if (screenMqttTopic) {
    mqttClient.publish(screenMqttTopic, cookedBitmap);
  }
};

/*
  QUESTIONS:
  - стоит ли передавать инстанс в функцию? наверное нет)
  - и вообще как мне правильно абстрагировать это? выносить
    в отдельную функцию? 
  - и (!) как это вообще вписать эту фичу в функционал
    когда вроде как он не должен быть встроенным
  - аргумент targetScreenSettings?
 */
